const { logger } = require('../utils/logger');

// Posts a single, deduplicated diagnostic comment on the failing commit when a
// failure is real but NOT fixable by a source patch (infra/config). This
// replaces the old behaviour of opening a useless source PR. It is best-effort
// and self-deduplicating: it tags comments with a hidden marker and never posts
// twice for the same (commit, fingerprint).
const MARKER = '<!-- warpfix-diagnostic';

async function postInfraDiagnostic(octokit, { owner, repo, sha, fingerprintHash, reason, errorSummary }) {
  if (!octokit || !owner || !repo || !sha) return false;
  const marker = `${MARKER}:${fingerprintHash} -->`;
  try {
    // Dedup: don't comment twice on the same commit for the same fingerprint.
    const existing = await octokit.request('GET /repos/{owner}/{repo}/commits/{ref}/comments', {
      owner, repo, ref: sha, per_page: 100,
    });
    if (existing.data.some((c) => (c.body || '').includes(marker))) {
      logger.info('Infra diagnostic already posted; skipping', { repo: `${owner}/${repo}`, sha });
      return false;
    }
    const body = `## 🔍 WarpFix diagnosis — no code fix opened

WarpFix detected this CI failure but did **not** open a repair PR because it is **not a source-code bug**:

> ${reason}

${errorSummary ? `<details><summary>Detected signal</summary>\n\n\`\`\`\n${String(errorSummary).slice(0, 800)}\n\`\`\`\n</details>\n\n` : ''}Fixing the configuration/environment above should resolve the build. WarpFix will not re-comment on this commit.

${marker}`;
    await octokit.request('POST /repos/{owner}/{repo}/commits/{commit_sha}/comments', {
      owner, repo, commit_sha: sha, body,
    });
    logger.info('Posted infra diagnostic comment', { repo: `${owner}/${repo}`, sha });
    return true;
  } catch (err) {
    logger.warn('Failed to post infra diagnostic', { repo: `${owner}/${repo}`, error: err.message });
    return false;
  }
}

module.exports = { postInfraDiagnostic };
