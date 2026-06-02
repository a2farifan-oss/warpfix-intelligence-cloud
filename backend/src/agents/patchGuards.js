const { logger } = require('../utils/logger');

// Sentinels emitted by the pipeline when it could NOT extract a real error.
// Repairing on top of these produces a generic fingerprint shared across
// unrelated repos, which is how a single bad patch ends up reused everywhere.
const PARSE_FAILURE_SENTINELS = [
  'unable to parse error from logs',
  'mock llm response',
  'llm not configured',
  'insufficient information to classify',
];

// Returns true when logData does not contain a real, actionable error and the
// repair should be skipped (no patch, no PR, no fingerprint stored).
function isUnparseable(logData) {
  const msg = (logData?.errorMessage || '').trim().toLowerCase();
  if (!msg) return true;
  return PARSE_FAILURE_SENTINELS.some((s) => msg.includes(s));
}

// Extract file blocks from a stored/generated patch in the _warpfix_format JSON
// shape. Returns [] for diff-only patches.
function getFileBlocks(patch) {
  if (!patch || typeof patch !== 'string') return [];
  try {
    const parsed = JSON.parse(patch);
    if (parsed && parsed._warpfix_format === 'file_blocks' && Array.isArray(parsed.files)) {
      return parsed.files;
    }
  } catch (_) {
    /* not JSON — diff format */
  }
  return [];
}

// Detects patches that are just the prompt's example placeholder (the classic
// "path/to/file.js" / "(complete new file content here)" that the LLM echoes
// back when it has no real input), or otherwise empty/degenerate.
function isPlaceholderPatch(patch) {
  if (!patch || typeof patch !== 'string' || !patch.trim()) return true;

  const PLACEHOLDER_PATH = /^path\/to\/file(\.\w+)?$/i;
  const PLACEHOLDER_CONTENT = /complete new file content here/i;

  const blocks = getFileBlocks(patch);
  if (blocks.length > 0) {
    for (const f of blocks) {
      const p = (f.path || '').trim();
      const c = (f.content || '').trim();
      if (!p || !c) return true;
      if (PLACEHOLDER_PATH.test(p)) return true;
      if (PLACEHOLDER_CONTENT.test(c)) return true;
    }
    return false;
  }

  // Diff / plain-text patch
  if (PLACEHOLDER_CONTENT.test(patch)) return true;
  if (/[+-]{3}\s+[ab]\/path\/to\/file/i.test(patch)) return true;
  return false;
}

// For a reused (fingerprinted) patch, verify the files it targets actually
// exist in THIS repository. A cached patch from another repo must never be
// applied blindly. Returns true if all targeted files resolve in the repo.
async function patchAppliesToRepo(patch, repository, installationId) {
  const blocks = getFileBlocks(patch);
  if (blocks.length === 0) {
    // Can't verify a diff-only patch cheaply; treat as not verifiable so the
    // caller regenerates rather than risking a cross-repo apply.
    return false;
  }
  if (!repository || !installationId) return false;

  try {
    const { getInstallationOctokit } = require('../services/github');
    const octokit = await getInstallationOctokit(installationId);
    const owner = repository.owner;
    const repo = repository.name;
    const branch = repository.default_branch || 'main';

    for (const f of blocks) {
      const path = (f.path || '').trim();
      if (!path) return false;
      try {
        await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
          owner, repo, path, ref: branch,
        });
      } catch (_) {
        // File does not exist in this repo → patch is from a different context.
        logger.info('Reused patch targets a file absent in repo; regenerating', {
          repo: repository.full_name, path,
        });
        return false;
      }
    }
    return true;
  } catch (err) {
    logger.warn('patchAppliesToRepo check failed; regenerating', { error: err.message });
    return false;
  }
}

module.exports = {
  isUnparseable,
  isPlaceholderPatch,
  patchAppliesToRepo,
  getFileBlocks,
  PARSE_FAILURE_SENTINELS,
};
