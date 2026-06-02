require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { Worker } = require('bullmq');
const { createRedisConnection } = require('./redis');
const { logger } = require('../utils/logger');
const { query } = require('../models/database');
const { getInstallationOctokit } = require('../services/github');
const { generatePRReview, formatReviewComment } = require('../agents/reviewAgent');
const { generateInlineComments, postInlineComments } = require('../agents/inlineReviewAgent');
const { verifyFindings } = require('../agents/verificationAgent');
const { filterPRFiles, isPRReviewWorthy, computeReviewPriority } = require('../engines/gatekeeperEngine');
const { analyzeFiles } = require('../engines/staticAnalysisEngine');
const { scanForVulnerabilities } = require('../engines/securityEngine');
const { predictCIOutcome } = require('../engines/predictiveEngine');
const { analyzeTestCoverage, formatCoverageReport } = require('../engines/testCoverageEngine');
const { detectDeadCodeInDiff, formatDeadCodeReport } = require('../engines/deadCodeEngine');
const { analyzePRSize, suggestSplits, formatSplitSuggestions } = require('../engines/prSplitEngine');
const { computeDebtDelta } = require('../engines/techDebtEngine');
const { evaluateQualityGates, formatQualityGateReport } = require('../engines/qualityGateEngine');
const { fetchRepoConfig } = require('../services/configParser');
const { generateOnboardingGuide } = require('../engines/onboardingEngine');
const { recordTelemetry } = require('../services/telemetry');

async function processReviewJob(job) {
  const { jobId, repository, pull_request, installation_id, user_id } = job.data;
  const startTime = Date.now();

  logger.info('Processing review job', {
    jobId, repo: repository.full_name, pr: pull_request.number,
  });

  try {
    const octokit = await getInstallationOctokit(installation_id);
    const owner = repository.owner;
    const repo = repository.name;

    // Step 1: Fetch PR data and files
    job.updateProgress(5);
    const [prResponse, filesResponse] = await Promise.all([
      octokit.request('GET /repos/{owner}/{repo}/pulls/{pull_number}', {
        owner, repo, pull_number: pull_request.number,
      }),
      octokit.request('GET /repos/{owner}/{repo}/pulls/{pull_number}/files', {
        owner, repo, pull_number: pull_request.number,
      }),
    ]);
    const prData = prResponse.data;
    const files = filesResponse.data;

    // Step 2: Fetch repo config (.warpfix.yaml)
    job.updateProgress(10);
    const repoConfig = await fetchRepoConfig(octokit, owner, repo);

    if (!repoConfig.review?.auto_review) {
      logger.info('Auto-review disabled for repo', { repo: repository.full_name });
      return { status: 'skipped', reason: 'auto_review_disabled' };
    }

    // Step 3: Gatekeeper — filter noise
    job.updateProgress(15);
    const { meaningful, filtered, filterRate } = filterPRFiles(files);
    const reviewWorthy = isPRReviewWorthy(prData, files);
    if (!reviewWorthy.worthy) {
      logger.info('PR not review-worthy', { reason: reviewWorthy.reason });
      return { status: 'skipped', reason: reviewWorthy.reason };
    }

    // Step 4: Generate PR review summary
    job.updateProgress(25);
    const review = await generatePRReview({
      prData, files: meaningful, repoConfig, reviewProfile: repoConfig.review?.profile,
    });

    // Step 5: Generate inline comments
    job.updateProgress(40);
    const learnings = await fetchLearnings(repository.full_name);
    let inlineComments = await generateInlineComments({
      files: meaningful, prData, repoConfig,
      reviewProfile: repoConfig.review?.profile,
      learnings,
    });

    // Step 6: Static analysis
    job.updateProgress(50);
    const staticFindings = analyzeFiles(meaningful);
    const securityFindings = [];
    for (const file of meaningful) {
      if (file.patch) {
        const vulns = scanForVulnerabilities(file.filename, file.patch, null);
        securityFindings.push(...vulns);
      }
    }
    inlineComments = [...inlineComments, ...staticFindings, ...securityFindings];

    // Step 7: Verification agent — reduce false positives
    job.updateProgress(60);
    const fileContents = {};
    for (const f of meaningful.slice(0, 5)) {
      try {
        const resp = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
          owner, repo, path: f.filename, ref: pull_request.head_sha,
        });
        if (resp.data.content) {
          fileContents[f.filename] = Buffer.from(resp.data.content, 'base64').toString('utf8');
        }
      } catch { /* file may not exist */ }
    }
    const verifiedComments = await verifyFindings(inlineComments, fileContents);

    // Step 8: Predictive CI analysis
    job.updateProgress(70);
    let prediction = null;
    if (repoConfig.analysis?.predictive_ci) {
      prediction = await predictCIOutcome({
        prData, files: meaningful, filesMap: fileContents, historicalFailures: [],
      });
    }

    // Step 9: Additional analyses
    job.updateProgress(75);
    const [prSize, testCoverage, deadCode, debtDelta, qualityGates, onboardingGuide] = await Promise.all([
      repoConfig.analysis?.pr_splitting ? analyzePRSize(files) : null,
      repoConfig.analysis?.test_coverage ? analyzeTestCoverage({ files: meaningful, filesMap: fileContents, testFilesMap: {} }) : [],
      repoConfig.analysis?.dead_code ? detectDeadCodeInDiff(meaningful, fileContents) : [],
      repoConfig.analysis?.tech_debt ? computeDebtDelta(meaningful, {}, fileContents) : null,
      evaluateQualityGates(repoConfig.quality_gates, meaningful, fileContents),
      generateOnboardingGuide({ prData, files: meaningful }),
    ]);
    const splitSuggestions = prSize?.needs_splitting ? suggestSplits(files) : [];

    // Step 10: Post summary comment
    job.updateProgress(85);
    let summaryComment = formatReviewComment(review, prData);

    // Append additional analysis sections
    if (prediction && prediction.risk_score > 20) {
      const predIcon = prediction.risk_score > 60 ? '🔴' : prediction.risk_score > 30 ? '🟡' : '🟢';
      summaryComment += `\n\n### CI Prediction\n${predIcon} **Risk Score: ${prediction.risk_score}/100** — ${prediction.recommendation}\n`;
      if (prediction.predictions?.length) {
        for (const p of prediction.predictions.slice(0, 3)) {
          summaryComment += `- ${p.message}\n`;
        }
      }
    }

    const coverageReport = formatCoverageReport(testCoverage);
    if (coverageReport) summaryComment += '\n\n' + coverageReport;

    const deadCodeReport = formatDeadCodeReport(deadCode);
    if (deadCodeReport) summaryComment += '\n\n' + deadCodeReport;

    const splitReport = formatSplitSuggestions(prSize, splitSuggestions);
    if (splitReport) summaryComment += '\n\n' + splitReport;

    if (debtDelta) {
      summaryComment += `\n\n### Tech Debt\n${debtDelta.icon} ${debtDelta.message}\n`;
    }

    const gateReport = formatQualityGateReport(qualityGates);
    if (gateReport) summaryComment += '\n\n' + gateReport;

    // Append onboarding guide to summary if applicable
    if (onboardingGuide) {
      summaryComment += '\n\n' + onboardingGuide;
    }

    // Step 11: Post summary + inline comments as a single batched review
    job.updateProgress(90);
    const postedComments = await postInlineComments(
      octokit, owner, repo, pull_request.number, pull_request.head_sha, verifiedComments,
      { summaryBody: summaryComment, event: 'COMMENT' }
    );

    // Step 12: Store review record
    const duration = Date.now() - startTime;
    const criticalCount = verifiedComments.filter(c => c.severity === 'critical').length;
    const warningCount = verifiedComments.filter(c => c.severity === 'warning').length;
    const nitpickCount = verifiedComments.filter(c => c.severity === 'nitpick').length;

    // Auto-create repo record if needed
    let repoId = null;
    const repoResult = await query('SELECT id FROM repositories WHERE github_id = $1', [repository.id]);
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
    }

    const reviewResult = await query(
      `INSERT INTO reviews (repository_id, user_id, pr_number, pr_url, pr_title, review_data,
        inline_comments_count, summary, risk_level, review_effort_level, duration_ms)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id`,
      [repoId, user_id, pull_request.number, pull_request.html_url, pull_request.title,
       JSON.stringify({
         ...review,
         critical_count: criticalCount,
         warning_count: warningCount,
         nitpick_count: nitpickCount,
         praise_count: verifiedComments.filter(c => c.severity === 'praise').length,
         filter_rate: filterRate,
         security_issues: securityFindings.length,
         security_critical: securityFindings.filter(f => f.severity === 'critical').length,
         ci_prediction: prediction,
         quality_gates_passed: qualityGates.passed,
         pr_author: prData.user?.login,
         estimated_minutes: review.review_effort?.estimated_minutes,
         review_effort_level: review.review_effort?.level,
         risk_level: review.risk_analysis?.level,
         top_category: verifiedComments[0]?.category || null,
       }),
       postedComments.length, review.summary,
       review.risk_analysis?.level, review.review_effort?.level, duration]
    );
    const reviewId = reviewResult.rows[0]?.id;

    // Store inline comments
    if (reviewId) {
      for (const c of postedComments) {
        await query(
          `INSERT INTO review_comments (review_id, file_path, line_number, severity, category, comment, suggestion, verified)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [reviewId, c.file, c.line, c.severity, c.category, c.comment, c.suggestion, c.verified || false]
        ).catch(() => {}); // Non-critical
      }
    }

    await recordTelemetry(user_id, repoId, 'review_completed', {
      pr_number: pull_request.number,
      inline_comments: postedComments.length,
      critical: criticalCount,
      warnings: warningCount,
      duration_ms: duration,
      prediction_risk: prediction?.risk_score,
    });

    job.updateProgress(100);

    return {
      status: 'completed',
      pr_number: pull_request.number,
      inline_comments: postedComments.length,
      critical: criticalCount,
      warnings: warningCount,
      duration_ms: duration,
    };
  } catch (err) {
    logger.error('Review job failed', { jobId, error: err.message, stack: err.stack });
    throw err;
  }
}

async function fetchLearnings(repoFullName) {
  try {
    const result = await query(
      `SELECT l.rule, l.category FROM learnings l
       LEFT JOIN repositories r ON r.id = l.repository_id
       WHERE r.full_name = $1 AND l.active = true`,
      [repoFullName]
    );
    return result.rows;
  } catch {
    return [];
  }
}

// Start review worker
const reviewWorker = new Worker('review-jobs', processReviewJob, {
  connection: createRedisConnection(),
  concurrency: 2,
  limiter: { max: 5, duration: 60000 },
});

reviewWorker.on('completed', (job, result) => {
  logger.info('Review job completed', { jobId: job.id, result });
});

reviewWorker.on('failed', (job, err) => {
  logger.error('Review job failed', { jobId: job?.id, error: err.message });
});

logger.info('WarpFix review worker started');

module.exports = { reviewWorker };
