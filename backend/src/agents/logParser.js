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

// The job-logs endpoint 302-redirects to a short-lived, pre-signed blob URL.
// Auto-following the redirect re-sends the GitHub Authorization header to the
// storage backend, which the installation token gets rejected by — so the logs
// come back empty. Instead resolve the redirect manually and download the blob
// with NO auth header (the URL is already signed). Falls back to whatever the
// auto-followed response yielded for Octokit builds that return text directly.
async function fetchJobLog(octokit, owner, repo, jobId) {
  try {
    const resp = await octokit.request('GET /repos/{owner}/{repo}/actions/jobs/{job_id}/logs', {
      owner, repo, job_id: jobId,
      request: { redirect: 'manual' },
    });
    const location = resp?.headers?.location;
    if (resp.status >= 300 && resp.status < 400 && location) {
      const text = await downloadText(location);
      if (text) return text;
    }
    const body = normalizeLogBody(resp);
    if (body) return body;
    if (location) {
      const text = await downloadText(location);
      if (text) return text;
    }
    logger.warn('CI job logs empty after redirect', { repo: `${owner}/${repo}`, job_id: jobId, status: resp.status });
    return '';
  } catch (err) {
    const loc = err?.response?.headers?.location || err?.response?.url || err?.url;
    if (loc) {
      const text = await downloadText(loc);
      if (text) return text;
    }
    logger.warn('Job log fetch failed', { repo: `${owner}/${repo}`, job_id: jobId, error: err.message });
    return '';
  }
}

async function downloadText(url) {
  try {
    const r = await fetch(url); // no auth header — the blob URL is pre-signed
    if (r.ok) return await r.text();
    logger.warn('Log blob download non-OK', { status: r.status });
  } catch (err) {
    logger.warn('Log blob download threw', { error: err.message });
  }
  return '';
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
