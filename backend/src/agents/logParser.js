const { logger } = require('../utils/logger');

async function parseLog({ type, repository, workflow_run, installation_id, context }) {
  logger.info('Parsing logs', { type, repo: repository?.full_name });

  let rawLog = '';

  if (type === 'ci_failure' && workflow_run) {
    rawLog = await fetchCILogs(workflow_run, installation_id, repository);
  } else if (context?.error_output) {
    rawLog = context.error_output;
  }

  logger.info('CI log fetched', {
    repo: repository?.full_name,
    rawLogLength: rawLog ? rawLog.length : 0,
  });

  // Extract the error deterministically from the raw log. The LLM is reserved
  // for classification and patch generation downstream — parsing must NOT
  // depend on it, otherwise a transient provider error (e.g. a 429 rate limit)
  // collapses every failure to an empty error and aborts the repair.
  const extracted = extractError(rawLog);

  return {
    rawLog: rawLog.substring(0, 10000),
    errorMessage: extracted.errorMessage || 'Unable to parse error from logs',
    stackTrace: extracted.stackTrace,
    rootCause: extracted.rootCause,
    affectedFiles: extracted.affectedFiles,
  };
}

// Strip the ISO-8601 timestamp prefix GitHub prepends to every Actions log line
// ("2026-06-02T16:39:00.1234567Z <text>").
function stripTimestamp(line) {
  return line.replace(/^\d{4}-\d{2}-\d{2}T[\d:.]+Z\s?/, '');
}

// Lines that signal a real failure worth repairing.
const ERROR_SIGNAL = /(assertion|assertionerror|\berror\b|exception|fail(?:ed|ure|ing)?|fatal|npm err!|panic|traceback|segfault|cannot find|is not defined|is not a function|unexpected|syntaxerror|typeerror|referenceerror|rangeerror|expected .* (?:to|but|received)|✕|✖|✗|##\[error\])/i;
// Noise we never want to treat as the primary error.
const ERROR_NOISE = /(0 error|no error|warning|deprecat|##\[warning\]|npm warn|--report-error|error-format|on error)/i;
// Stack-frame lines (JS "at ...", Python "File ...", Go ".go:NN").
const STACK_LINE = /^(\s*at\s+|\s*File\s+"|.*\.\w+:\d+:\d+|\s+#\d+\s)/;

function extractError(rawLog) {
  const empty = { errorMessage: '', stackTrace: '', rootCause: '', affectedFiles: [] };
  if (!rawLog || !rawLog.trim()) return empty;

  const lines = rawLog.split('\n').map(stripTimestamp);

  // Ignore our own "(logs unavailable)" sentinel — that means the fetch failed,
  // not that the build had no error.
  const meaningful = lines.filter((l) => l.trim() && !/\(logs unavailable\)/i.test(l));
  if (meaningful.length === 0) return empty;

  let firstIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (!l.trim()) continue;
    if (ERROR_SIGNAL.test(l) && !ERROR_NOISE.test(l)) {
      firstIdx = i;
      break;
    }
  }
  if (firstIdx === -1) return empty;

  // errorMessage: the signal line plus a few following context lines.
  const msgLines = [];
  for (let i = firstIdx; i < lines.length && msgLines.length < 6; i++) {
    const l = lines[i].trimEnd();
    if (l.trim()) msgLines.push(l);
  }
  const errorMessage = msgLines.join('\n').slice(0, 1500);

  // stackTrace: contiguous stack frames near the error.
  const stackLines = [];
  for (let i = firstIdx; i < lines.length && stackLines.length < 20; i++) {
    if (STACK_LINE.test(lines[i])) stackLines.push(lines[i].trim());
  }
  const stackTrace = stackLines.join('\n').slice(0, 2000);

  // affectedFiles: source files referenced in the stack/error (skip node_modules
  // and absolute runner paths outside the repo checkout).
  const fileRe = /([\w./-]+\.(?:js|jsx|ts|tsx|py|go|rb|java|rs|c|cpp|cs|php)):\d+/g;
  const files = new Set();
  const scanText = `${errorMessage}\n${stackTrace}`;
  let m;
  while ((m = fileRe.exec(scanText)) !== null) {
    let p = m[1];
    if (/node_modules|node:internal|\/usr\/|\.cache\//.test(p)) continue;
    // GitHub Actions checks the repo out at /home/runner/work/<repo>/<repo>/.
    p = p.replace(/^\/home\/runner\/work\/[^/]+\/[^/]+\//, '');
    // Any other absolute prefix up to a recognizable source dir.
    p = p.replace(/^.*?\/((?:src|test|tests|lib|app|cmd|pkg)\/)/, '$1').replace(/^\.\//, '');
    files.add(p);
  }

  return {
    errorMessage,
    stackTrace,
    rootCause: msgLines[0] ? msgLines[0].trim().slice(0, 300) : '',
    affectedFiles: Array.from(files).slice(0, 10),
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
