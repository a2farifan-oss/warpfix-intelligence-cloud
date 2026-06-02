// Feedback loop: turn customer-MERGED WarpFix PRs into verified (error -> fix)
// pairs that retrieval can reuse. A merge is the strongest possible signal that
// a fix was correct, so these are higher-value than the shipped seed corpus.
//
// captureLearnedFix() runs (best-effort) when a WarpFix PR is merged.
// loadRecentLearnedFixes() is read by retrieval.js to augment the static KB.

const { query } = require('../models/database');
const { logger } = require('../utils/logger');

// Parse the file-blocks patch the generator stores in repairs.patch_diff into a
// { path: content } map. Returns null for diff-only/unparseable patches.
function patchToFileMap(patchDiff) {
  if (!patchDiff || typeof patchDiff !== 'string') return null;
  const t = patchDiff.trim();
  if (!t.startsWith('{')) return null;
  try {
    const obj = JSON.parse(t);
    if (obj && obj._warpfix_format === 'file_blocks' && Array.isArray(obj.files)) {
      const map = {};
      for (const f of obj.files) {
        if (f && f.path && typeof f.content === 'string') map[f.path] = f.content;
      }
      return Object.keys(map).length ? map : null;
    }
  } catch {
    return null;
  }
  return null;
}

// Best-effort capture on PR merge. Looks up the repair + its failure by
// (repository github_id, pr_number), and stores the verified pair. Idempotent:
// skips if a learned fix for this (repo, pr) already exists.
async function captureLearnedFix({ repoGithubId, prNumber }) {
  if (!repoGithubId || !prNumber) return { stored: false, reason: 'missing_args' };
  try {
    const res = await query(
      `SELECT r.id, r.repository_id, r.patch_diff, f.error_message, f.failure_type
         FROM repairs r
         LEFT JOIN failures f ON f.id = r.failure_id
        WHERE r.pr_number = $1
          AND r.repository_id = (SELECT id FROM repositories WHERE github_id = $2)
        ORDER BY r.created_at DESC
        LIMIT 1`,
      [prNumber, repoGithubId]
    );
    if (res.rows.length === 0) return { stored: false, reason: 'repair_not_found' };
    const row = res.rows[0];
    const fix = patchToFileMap(row.patch_diff);
    if (!fix) return { stored: false, reason: 'unparseable_patch' };
    if (!row.error_message) return { stored: false, reason: 'no_error_message' };

    const dup = await query(
      `SELECT 1 FROM learned_fixes WHERE repository_id = $1 AND pr_number = $2 LIMIT 1`,
      [row.repository_id, prNumber]
    );
    if (dup.rows.length > 0) return { stored: false, reason: 'already_captured' };

    await query(
      `INSERT INTO learned_fixes (repository_id, category, error_message, fix_json, pr_number)
       VALUES ($1, $2, $3, $4, $5)`,
      [row.repository_id, row.failure_type || null, row.error_message, JSON.stringify(fix), prNumber]
    );
    logger.info('Captured learned fix from merged PR', { prNumber, category: row.failure_type });
    return { stored: true };
  } catch (e) {
    // Never let learning break the webhook path.
    logger.debug('captureLearnedFix failed', { error: e.message });
    return { stored: false, reason: 'error' };
  }
}

// Load the most recent learned fixes, shaped like the retrieval KB entries.
async function loadRecentLearnedFixes(limit = 500) {
  try {
    const res = await query(
      `SELECT category, error_message, fix_json
         FROM learned_fixes
        ORDER BY created_at DESC
        LIMIT $1`,
      [limit]
    );
    return res.rows.map((r) => ({
      category: r.category || 'learned',
      errorMessage: r.error_message,
      description: 'Verified fix accepted (merged) by a real customer',
      fix: typeof r.fix_json === 'string' ? JSON.parse(r.fix_json) : r.fix_json,
      _source: 'learned',
    }));
  } catch (e) {
    logger.debug('loadRecentLearnedFixes failed', { error: e.message });
    return [];
  }
}

module.exports = { captureLearnedFix, loadRecentLearnedFixes, patchToFileMap };
