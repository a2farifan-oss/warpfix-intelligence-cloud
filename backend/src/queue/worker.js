require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { Worker } = require('bullmq');
const { createRedisConnection } = require('./redis');
const { logger } = require('../utils/logger');
const { query } = require('../models/database');

// Agent pipeline
const { parseLog } = require('../agents/logParser');
const { classifyError } = require('../agents/classifier');
const { generateFingerprint } = require('../agents/fingerprint');
const { lookupFingerprint, storeFingerprint } = require('../agents/fingerprintStore');
const { generatePatch } = require('../agents/patchGenerator');
const { validateInSandbox } = require('../agents/sandboxValidator');
const { computeConfidence } = require('../agents/confidenceEngine');
const { createPullRequest } = require('../agents/pullRequestAgent');
const { recordTelemetry } = require('../services/telemetry');
const { getInstallationOctokit } = require('../services/github');
const { generatePRReview, formatReviewComment } = require('../agents/reviewAgent');
const { generateInlineComments, postInlineComments } = require('../agents/inlineReviewAgent');
const { processMention } = require('../agents/chatAgent');
const { recordTestResults, checkCrossRepoPattern, aggregateMonthlyStats } = require('../agents/intelligenceGrowth');

async function processRepairJob(job) {
  const { jobId, type, repository, workflow_run, installation_id, user_id, context } = job.data;
  const startTime = Date.now();

  logger.info('Processing repair job', { jobId, type });

  try {
    // Step 1: Parse logs
    job.updateProgress(10);
    const logData = await parseLog({
      type,
      repository,
      workflow_run,
      installation_id,
      context,
    });

    // Step 2: Classify error
    job.updateProgress(20);
    const classification = await classifyError(logData);

    // Step 3: Generate fingerprint
    job.updateProgress(30);
    const fingerprint = generateFingerprint(logData, classification);

    // Step 4: Check fingerprint DB
    job.updateProgress(40);
    const existingFix = await lookupFingerprint(fingerprint.hash);

    let patch;
    if (existingFix && existingFix.resolution_patch) {
      logger.info('Fingerprint match found, reusing patch', { hash: fingerprint.hash });
      patch = existingFix.resolution_patch;
    } else {
      // Step 5: Generate patch via LLM
      job.updateProgress(50);
      patch = await generatePatch({
        logData,
        classification,
        repository,
        context,
        installation_id,
      });
    }

    // Step 6: Validate patch in sandbox
    job.updateProgress(70);
    const sandboxResult = await validateInSandbox({
      patch,
      repository,
      installation_id,
    });

    // Step 7: Compute confidence
    job.updateProgress(80);
    const confidence = computeConfidence({
      sandboxPassed: sandboxResult.passed,
      patchSize: patch.length,
      fingerprintReuse: !!existingFix,
      classification,
    });

    // Step 8: Store failure record (auto-create repo if missing)
    let failureId = null;
    let repoId = null;
    if (repository) {
      const repoResult = await query(
        'SELECT id FROM repositories WHERE github_id = $1',
        [repository.id]
      );
      repoId = repoResult.rows[0]?.id;

      if (!repoId) {
        const insertRepo = await query(
          `INSERT INTO repositories (github_id, full_name, owner, name, default_branch, installation_id, user_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (github_id) DO UPDATE SET
             updated_at = NOW(),
             user_id = COALESCE(repositories.user_id, EXCLUDED.user_id)
           RETURNING id`,
          [repository.id, repository.full_name, repository.owner, repository.name,
           repository.default_branch, installation_id, user_id || null]
        );
        repoId = insertRepo.rows[0]?.id;
        logger.info('Auto-created repository record', { repoId, full_name: repository.full_name });
      }

      if (repoId) {
        const failureResult = await query(
          `INSERT INTO failures (repository_id, workflow_run_id, error_message, stack_trace, failure_type, branch, commit_sha)
           VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
          [repoId, workflow_run?.id, logData.errorMessage, logData.stackTrace,
           classification.type, workflow_run?.head_branch, workflow_run?.head_sha]
        );
        failureId = failureResult.rows[0].id;
      }
    }

    // Step 9: Create PR if confidence is sufficient
    let prUrl = null;
    let prNumber = null;
    if (confidence.score >= 40 && sandboxResult.passed) {
      job.updateProgress(90);
      const prResult = await createPullRequest({
        patch,
        repository,
        installation_id,
        classification,
        confidence,
        fingerprint,
      });
      prUrl = prResult.url;
      prNumber = prResult.number;
    }

    // Step 10: Store fingerprint (always — grows the CI Failure Genome regardless of PR)
    let fingerprintId = null;
    try {
      fingerprintId = await storeFingerprint(fingerprint, patch, confidence.score);
    } catch (fpErr) {
      logger.debug('Fingerprint storage failed', { error: fpErr.message });
    }

    // Step 10b: Record test results from CI logs (auto-grows CI Brain data)
    if (repoId && logData.rawLog) {
      try {
        await recordTestResults({
          rawLog: logData.rawLog,
          repoId,
          branch: workflow_run?.head_branch,
          commitSha: workflow_run?.head_sha,
          workflowRunId: workflow_run?.id,
        });
      } catch (e) {
        logger.debug('Test result recording failed', { error: e.message });
      }
    }

    // Step 10c: Check cross-repo patterns (auto-grows Network Intelligence)
    if (fingerprint?.hash) {
      try {
        await checkCrossRepoPattern(fingerprint.hash, classification);
      } catch (e) {
        logger.debug('Cross-repo pattern check failed', { error: e.message });
      }
    }

    // Step 10d: Aggregate monthly genome stats
    try {
      await aggregateMonthlyStats();
    } catch (e) {
      logger.debug('Monthly stats aggregation failed', { error: e.message });
    }

    // Step 11: Store repair record
    const duration = Date.now() - startTime;
    await query(
      `INSERT INTO repairs (failure_id, repository_id, user_id, fingerprint_id,
        patch_diff, patch_summary, confidence_score, sandbox_passed,
        pr_number, pr_url, status, engine_used, duration_ms)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [failureId, repoId, user_id, fingerprintId, patch, classification.summary,
       confidence.score, sandboxResult.passed, prNumber, prUrl,
       sandboxResult.passed ? 'completed' : 'failed',
       classification.type, duration]
    );

    // Step 12: Increment usage
    if (user_id) {
      await query(
        'UPDATE users SET repairs_used_this_month = repairs_used_this_month + 1 WHERE id = $1',
        [user_id]
      );
    }

    // Step 13: Record telemetry
    await recordTelemetry(user_id, null, 'repair_completed', {
      type,
      confidence: confidence.score,
      sandbox_passed: sandboxResult.passed,
      duration_ms: duration,
      fingerprint_reused: !!existingFix,
    });

    job.updateProgress(100);

    return {
      status: 'completed',
      confidence: confidence.score,
      sandbox_passed: sandboxResult.passed,
      pr_url: prUrl,
      duration_ms: duration,
    };
  } catch (err) {
    logger.error('Repair job failed', { jobId, error: err.message, stack: err.stack });
    throw err;
  }
}

// ========== Review Job Processor ==========
async function processReviewJob(job) {
  const { jobId, repository, pull_request, installation_id, user_id } = job.data;
  const startTime = Date.now();

  logger.info('Processing review job', { jobId, pr: pull_request?.number });

  try {
    const octokit = await getInstallationOctokit(installation_id);
    const owner = repository.owner;
    const repo = repository.name;
    const prNumber = pull_request.number;

    // Fetch PR details and files
    job.updateProgress(10);
    const { data: prData } = await octokit.request('GET /repos/{owner}/{repo}/pulls/{pull_number}', {
      owner, repo, pull_number: prNumber,
    });

    job.updateProgress(20);
    const { data: files } = await octokit.request('GET /repos/{owner}/{repo}/pulls/{pull_number}/files', {
      owner, repo, pull_number: prNumber, per_page: 100,
    });

    // Generate PR review summary
    job.updateProgress(40);
    const review = await generatePRReview({ prData, files, repoConfig: null, reviewProfile: 'assertive' });

    // Post review summary + inline comments as a single batched review
    job.updateProgress(60);
    const reviewComment = formatReviewComment(review, prData);

    job.updateProgress(75);
    const inlineComments = await generateInlineComments({
      files, prData, repoConfig: null, reviewProfile: 'assertive', learnings: [],
    });

    job.updateProgress(85);
    await postInlineComments(octokit, owner, repo, prNumber, prData.head.sha, inlineComments, {
      summaryBody: reviewComment, event: 'COMMENT',
    });

    // Store review in database
    const duration = Date.now() - startTime;
    const criticalCount = inlineComments.filter(c => c.severity === 'critical').length;
    const warningCount = inlineComments.filter(c => c.severity === 'warning').length;
    const nitpickCount = inlineComments.filter(c => c.severity === 'nitpick').length;
    const praiseCount = inlineComments.filter(c => c.severity === 'praise').length;

    try {
      const reviewData = {
        file_changes: review.file_changes,
        sequence_diagram: review.sequence_diagram,
        risk_factors: review.risk_analysis?.factors,
        inline_breakdown: { critical: criticalCount, warning: warningCount, nitpick: nitpickCount, praise: praiseCount },
        files_reviewed: files.length,
      };
      await query(
        `INSERT INTO reviews (repository_id, user_id, pr_number, pr_title, pr_url,
          summary, review_effort_level, risk_level, inline_comments_count,
          review_data, duration_ms, status)
         VALUES (
           (SELECT id FROM repositories WHERE github_id = $1),
           $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'completed'
         )`,
        [repository.id, user_id, prNumber, prData.title, prData.html_url,
         review.summary, review.review_effort?.level || 3, review.risk_analysis?.level || 'medium',
         inlineComments.length, JSON.stringify(reviewData), duration]
      );
    } catch (dbErr) {
      logger.warn('Failed to store review in DB', { error: dbErr.message });
    }

    job.updateProgress(100);
    logger.info('Review completed', {
      pr: prNumber, comments: inlineComments.length,
      critical: criticalCount, duration,
    });

    return {
      status: 'completed',
      pr_number: prNumber,
      inline_comments: inlineComments.length,
      duration_ms: duration,
    };
  } catch (err) {
    logger.error('Review job failed', { jobId, error: err.message, stack: err.stack });
    throw err;
  }
}

// ========== Chat Job Processor ==========
async function processChatJob(job) {
  const { jobId, repository, issue_number, comment, installation_id } = job.data;
  const startTime = Date.now();

  logger.info('Processing chat job', { jobId, issue: issue_number });

  try {
    const octokit = await getInstallationOctokit(installation_id);
    const owner = repository.owner;
    const repo = repository.name;

    // Fetch PR files for context
    const { data: prData } = await octokit.request('GET /repos/{owner}/{repo}/pulls/{pull_number}', {
      owner, repo, pull_number: issue_number,
    });
    const { data: files } = await octokit.request('GET /repos/{owner}/{repo}/pulls/{pull_number}/files', {
      owner, repo, pull_number: issue_number, per_page: 50,
    });

    // Process mention through chat agent
    const response = await processMention({
      comment: { body: comment.body },
      prData,
      files,
      context: { owner, repo, prNumber: issue_number },
    });

    // Post response as comment (only if we got a valid response)
    if (response) {
      await octokit.request('POST /repos/{owner}/{repo}/issues/{issue_number}/comments', {
        owner, repo, issue_number,
        body: response,
      });
    }

    const duration = Date.now() - startTime;
    logger.info('Chat response posted', { issue: issue_number, duration });

    return { status: 'completed', duration_ms: duration };
  } catch (err) {
    logger.error('Chat job failed', { jobId, error: err.message, stack: err.stack });
    throw err;
  }
}

// ========== Start Workers ==========
const repairWorker = new Worker('repair-jobs', processRepairJob, {
  connection: createRedisConnection(),
  concurrency: 3,
  limiter: { max: 10, duration: 60000 },
});

const reviewWorker = new Worker('review-jobs', processReviewJob, {
  connection: createRedisConnection(),
  concurrency: 2,
  limiter: { max: 5, duration: 60000 },
});

const chatWorker = new Worker('chat-jobs', processChatJob, {
  connection: createRedisConnection(),
  concurrency: 3,
  limiter: { max: 20, duration: 60000 },
});

[repairWorker, reviewWorker, chatWorker].forEach((w, i) => {
  const names = ['repair', 'review', 'chat'];
  w.on('completed', (job, result) => {
    logger.info(`${names[i]} job completed`, { jobId: job.id, result });
  });
  w.on('failed', (job, err) => {
    logger.error(`${names[i]} job failed`, { jobId: job?.id, error: err.message });
  });
  w.on('error', (err) => {
    logger.error(`${names[i]} worker error`, { error: err.message });
  });
});

logger.info('WarpFix workers started (repair + review + chat)');

module.exports = { repairWorker, reviewWorker, chatWorker };
