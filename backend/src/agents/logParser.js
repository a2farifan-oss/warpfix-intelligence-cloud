const { logger } = require('../utils/logger');
const { callLLM } = require('../services/llm');

async function parseLog({ type, repository, workflow_run, installation_id, context }) {
  logger.info('Parsing logs', { type, repo: repository?.full_name });

  let rawLog = '';
  let errorMessage = '';
  let stackTrace = '';

  if (type === 'ci_failure' && workflow_run) {
    rawLog = await fetchCILogs(workflow_run, installation_id, repository);
  } else if (context?.error_output) {
    rawLog = context.error_output;
  }

  // Use LLM to extract structured error info
  if (rawLog) {
    const parsed = await callLLM({
      system: 'You are a CI log parser. Extract the error message, stack trace, and root cause from build logs. Return JSON with fields: errorMessage, stackTrace, rootCause, affectedFiles.',
      user: `Parse this CI log and extract error details:\n\n${rawLog.substring(0, 8000)}`,
      maxTokens: 1000,
    });

    try {
      const result = JSON.parse(parsed);
      errorMessage = result.errorMessage || '';
      stackTrace = result.stackTrace || '';
      return {
        rawLog: rawLog.substring(0, 10000),
        errorMessage,
        stackTrace,
        rootCause: result.rootCause || '',
        affectedFiles: result.affectedFiles || [],
      };
    } catch {
      // Fallback: extract error lines manually
      const errorLines = rawLog.split('\n').filter(line =>
        /error|fail|exception|fatal/i.test(line)
      );
      errorMessage = errorLines.slice(0, 5).join('\n');
    }
  }

  return {
    rawLog: rawLog.substring(0, 10000),
    errorMessage: errorMessage || 'Unable to parse error from logs',
    stackTrace,
    rootCause: '',
    affectedFiles: [],
  };
}

async function fetchCILogs(workflowRun, installationId, repository) {
  try {
    const { getInstallationOctokit } = require('../services/github');
    const octokit = await getInstallationOctokit(installationId);

    const owner = repository?.owner || '';
    const repo = repository?.name || '';

    const jobs = await octokit.request('GET /repos/{owner}/{repo}/actions/runs/{run_id}/jobs', {
      owner,
      repo,
      run_id: workflowRun.id,
    });

    const failedJobs = jobs.data.jobs.filter(j => j.conclusion === 'failure');
    let logs = '';

    for (const job of failedJobs.slice(0, 3)) {
      const jobLog = await fetchJobLog(octokit, owner, repo, job.id);
      if (jobLog) {
        logs += `\n--- Job: ${job.name} ---\n${jobLog}\n`;
      } else {
        logger.warn('CI job logs unavailable', { repo: `${owner}/${repo}`, job: job.name, job_id: job.id });
        logs += `\n--- Job: ${job.name} --- (logs unavailable)\n`;
      }
    }

    return logs;
  } catch (err) {
    logger.error('Failed to fetch CI logs', { error: err.message });
    return '';
  }
}

// The job-logs endpoint 302-redirects to a short-lived blob URL and may return
// the body as text or as binary depending on the Octokit build. Handle all
// cases (and the redirect surfacing as an error) so logs are actually retrieved.
async function fetchJobLog(octokit, owner, repo, jobId) {
  try {
    const resp = await octokit.request('GET /repos/{owner}/{repo}/actions/jobs/{job_id}/logs', {
      owner, repo, job_id: jobId,
    });
    return normalizeLogBody(resp);
  } catch (err) {
    const loc = err?.response?.headers?.location || err?.response?.url || err?.url;
    if (loc) {
      try {
        const r = await fetch(loc);
        if (r.ok) return await r.text();
      } catch (_) { /* fall through */ }
    }
    logger.warn('Job log fetch failed', { repo: `${owner}/${repo}`, job_id: jobId, error: err.message });
    return '';
  }
}

function normalizeLogBody(resp) {
  const data = resp?.data;
  if (typeof data === 'string' && data.trim()) return data;
  if (data instanceof ArrayBuffer) return Buffer.from(data).toString('utf8');
  if (Buffer.isBuffer(data)) return data.toString('utf8');
  if (data && typeof data === 'object' && typeof data.toString === 'function') {
    const s = data.toString('utf8');
    if (s && s !== '[object Object]') return s;
  }
  return '';
}

module.exports = { parseLog };
