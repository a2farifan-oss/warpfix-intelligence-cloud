const { logger } = require('../utils/logger');

// Prevents the #1 real-world failure mode from the audit: repair LOOPS. WarpFix
// was opening a brand-new PR every time the same CI kept failing (one repo got
// 21 identical PRs). Every WarpFix fix branch is named
// `warpfix/<fingerprintHash>-<timestamp>`, so all attempts at the SAME failure
// share the `warpfix/<hash>-` prefix. Before doing expensive LLM work or opening
// a PR we look at the repo's existing WarpFix PRs for this fingerprint and:
//   - if one is still OPEN  → skip (the fix is already on the table)
//   - if one was CLOSED without merge → skip (the customer rejected this fix;
//     re-opening it is spam)
//   - if one was MERGED     → allow (the failure recurred after acceptance — a
//     genuinely new occurrence worth a fresh attempt)

async function inspectExistingWarpfixPRs(octokit, owner, repo, fingerprintHash) {
  const prefix = `warpfix/${fingerprintHash}-`;
  const result = { open: 0, closedUnmerged: 0, merged: 0, openUrls: [] };
  try {
    // Look at recent PRs (all states). 100 is plenty — loops manifest fast.
    const resp = await octokit.request('GET /repos/{owner}/{repo}/pulls', {
      owner, repo, state: 'all', per_page: 100, sort: 'created', direction: 'desc',
    });
    for (const pr of resp.data) {
      const ref = pr.head?.ref || '';
      if (!ref.startsWith(prefix)) continue;
      if (pr.state === 'open') {
        result.open += 1;
        result.openUrls.push(pr.html_url);
      } else if (pr.merged_at) {
        result.merged += 1;
      } else {
        result.closedUnmerged += 1;
      }
    }
  } catch (err) {
    // Fail OPEN (allow the repair) — a listing error must not block a real fix.
    logger.warn('PR dedup lookup failed; allowing repair', { repo: `${owner}/${repo}`, error: err.message });
    return null;
  }
  return result;
}

// Returns { skip: true, reason } when the repair should NOT proceed.
function dedupDecision(stats) {
  if (!stats) return { skip: false };
  if (stats.open > 0) {
    return { skip: true, reason: 'duplicate_open_pr', detail: `An open WarpFix PR already addresses this failure (${stats.openUrls[0] || ''}).` };
  }
  if (stats.closedUnmerged > 0 && stats.merged === 0) {
    return { skip: true, reason: 'previously_rejected', detail: 'A WarpFix PR for this exact failure was closed without merging — not re-opening.' };
  }
  return { skip: false };
}

module.exports = { inspectExistingWarpfixPRs, dedupDecision };
