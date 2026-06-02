const express = require('express');
const { query } = require('../models/database');
const { requireAuth } = require('../middleware/auth');
const { PLANS } = require('./billing');
const router = express.Router();

// Helper: get all repo IDs the user has access to (via direct ownership or installation)
async function getUserRepoIds(userId) {
  const result = await query(
    `SELECT DISTINCT rp.id FROM repositories rp
     LEFT JOIN installations i ON i.installation_id::text = rp.installation_id
     LEFT JOIN users u
       ON u.github_id = i.installer_github_id
       OR u.username  = i.installer_login
       OR u.username  = i.account_login
     WHERE rp.user_id = $1 OR u.id = $1`,
    [userId]
  );
  return result.rows.map(r => r.id);
}

// Public stats endpoint — shows all repairs (including webhook-triggered ones without user_id)
router.get('/public-stats', async (req, res) => {
  try {
    const [repairsResult, successResult, fingerprintResult, recentResult] = await Promise.all([
      query(`SELECT COUNT(*) as total FROM repairs`),
      query(`SELECT COUNT(*) as total FROM repairs WHERE sandbox_passed = TRUE`),
      query(
        `SELECT COUNT(DISTINCT fingerprint_id) as unique_fingerprints,
                COALESCE(SUM(CASE WHEN fingerprint_id IS NOT NULL THEN 1 ELSE 0 END), 0) as reused
         FROM repairs`
      ),
      query(
        `SELECT r.id, r.status, r.confidence_score, r.sandbox_passed, r.pr_url, r.pr_number,
                r.engine_used, r.patch_summary, r.created_at, repo.full_name as repo_name
         FROM repairs r
         LEFT JOIN repositories repo ON repo.id = r.repository_id
         ORDER BY r.created_at DESC LIMIT 20`
      ),
    ]);

    const totalRepairs = parseInt(repairsResult.rows[0].total);
    const successfulRepairs = parseInt(successResult.rows[0].total);
    const successRate = totalRepairs > 0 ? Math.round((successfulRepairs / totalRepairs) * 100) : 0;

    res.json({
      stats: {
        total_repairs: totalRepairs,
        successful_repairs: successfulRepairs,
        success_rate: successRate,
        unique_fingerprints: parseInt(fingerprintResult.rows[0].unique_fingerprints),
        fingerprint_reuse_count: parseInt(fingerprintResult.rows[0].reused),
        repairs_this_month: totalRepairs,
        plan: 'FREE',
      },
      recent_repairs: recentResult.rows,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch public stats' });
  }
});

router.get('/stats', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const repoIds = await getUserRepoIds(userId);
    const repoIdList = repoIds.length > 0 ? repoIds : ['00000000-0000-0000-0000-000000000000'];

    const [repairsResult, successResult, fingerprintResult, recentResult] = await Promise.all([
      query(
        `SELECT COUNT(*) as total FROM repairs WHERE user_id = $1 OR repository_id = ANY($2::uuid[])`,
        [userId, repoIdList]
      ),
      query(
        `SELECT COUNT(*) as total FROM repairs WHERE (user_id = $1 OR repository_id = ANY($2::uuid[])) AND sandbox_passed = TRUE`,
        [userId, repoIdList]
      ),
      query(
        `SELECT COUNT(DISTINCT fingerprint_id) as unique_fingerprints,
                COALESCE(SUM(CASE WHEN fingerprint_id IS NOT NULL THEN 1 ELSE 0 END), 0) as reused
         FROM repairs WHERE user_id = $1 OR repository_id = ANY($2::uuid[])`,
        [userId, repoIdList]
      ),
      query(
        `SELECT r.*, repo.full_name as repo_name
         FROM repairs r
         LEFT JOIN repositories repo ON repo.id = r.repository_id
         WHERE r.user_id = $1 OR r.repository_id = ANY($2::uuid[])
         ORDER BY r.created_at DESC LIMIT 5`,
        [userId, repoIdList]
      ),
    ]);

    const totalRepairs = parseInt(repairsResult.rows[0].total);
    const successfulRepairs = parseInt(successResult.rows[0].total);
    const successRate = totalRepairs > 0 ? Math.round((successfulRepairs / totalRepairs) * 100) : 0;

    res.json({
      stats: {
        total_repairs: totalRepairs,
        successful_repairs: successfulRepairs,
        success_rate: successRate,
        unique_fingerprints: parseInt(fingerprintResult.rows[0].unique_fingerprints),
        fingerprint_reuse_count: parseInt(fingerprintResult.rows[0].reused),
        repairs_this_month: req.user.repairs_used_this_month,
        plan: req.user.plan,
      },
      recent_repairs: recentResult.rows,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

router.get('/stability', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const repoIds = await getUserRepoIds(userId);
    const repoIdList = repoIds.length > 0 ? repoIds : ['00000000-0000-0000-0000-000000000000'];

    const [ciTrend, repairFreq, depAlerts] = await Promise.all([
      query(
        `SELECT DATE(created_at) as day, COUNT(*) as failures
         FROM failures f
         WHERE f.repository_id = ANY($1::uuid[]) AND f.created_at > NOW() - INTERVAL '30 days'
         GROUP BY DATE(created_at) ORDER BY day`,
        [repoIdList]
      ),
      query(
        `SELECT DATE(created_at) as day, COUNT(*) as repairs
         FROM repairs
         WHERE (user_id = $1 OR repository_id = ANY($2::uuid[])) AND created_at > NOW() - INTERVAL '30 days'
         GROUP BY DATE(created_at) ORDER BY day`,
        [userId, repoIdList]
      ),
      query(
        `SELECT COUNT(*) as total FROM dependency_alerts da
         WHERE da.repository_id = ANY($1::uuid[]) AND da.resolved = FALSE`,
        [repoIdList]
      ),
    ]);

    const totalFailures30d = ciTrend.rows.reduce((sum, r) => sum + parseInt(r.failures), 0);
    const daysWithFailures = ciTrend.rows.length;
    const stabilityScore = Math.max(0, 100 - (totalFailures30d * 2) - (daysWithFailures * 3));

    res.json({
      stability_score: Math.min(100, stabilityScore),
      ci_failure_trend: ciTrend.rows,
      repair_frequency: repairFreq.rows,
      open_dependency_alerts: parseInt(depAlerts.rows[0].total),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stability data' });
  }
});

// List connected repositories for the current user
router.get('/repositories', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await query(`
      SELECT repo.id, repo.full_name, repo.language, repo.created_at,
             COUNT(DISTINCT r.id)  AS repair_count,
             COUNT(DISTINCT rv.id) AS review_count,
             MAX(r.created_at)     AS last_repair
      FROM repositories repo
      LEFT JOIN repairs r  ON r.repository_id  = repo.id
      LEFT JOIN reviews rv ON rv.repository_id = repo.id
      WHERE repo.user_id = $1
      GROUP BY repo.id, repo.full_name, repo.language, repo.created_at
      ORDER BY repo.created_at DESC
    `, [userId]);
    res.json({ repositories: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch repositories' });
  }
});

// Sync repos from GitHub installations into the DB
router.post('/repositories/sync', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const username = req.user.username;
    const plan = req.user.plan || 'free';
    const maxRepos = PLANS[plan]?.max_repos ?? 1;

    // Check current repo count against plan limit
    if (maxRepos !== -1) {
      const countResult = await query(
        'SELECT COUNT(*) AS cnt FROM repositories WHERE user_id = $1',
        [userId]
      );
      const currentCount = parseInt(countResult.rows[0].cnt);
      if (currentCount >= maxRepos) {
        return res.status(403).json({
          error: `Repository limit reached. Your ${PLANS[plan].name} plan allows ${maxRepos} repo(s). Upgrade to Pro for unlimited.`,
          limit: maxRepos,
          current: currentCount,
          plan,
        });
      }
    }

    // Find installations for this user. Match by the GitHub account that
    // installed the app (preferred) or, for personal installs, the account the
    // app sits on. Matching only on account_login broke org installs because
    // the org name never equals the user's personal username.
    const githubId = req.user.github_id;
    const instResult = await query(
      `SELECT installation_id FROM installations
        WHERE installer_github_id = $1
           OR installer_login = $2
           OR account_login = $2`,
      [githubId, username]
    );
    const installationIds = new Set(instResult.rows.map((r) => Number(r.installation_id)));

    // Backfill: ask GitHub which installations this user can access using their
    // own OAuth token. This securely links pre-existing org installs whose
    // installer was never recorded (the root cause of "no repositories
    // connected" for team accounts). Best-effort — degrades gracefully.
    if (req.user.access_token) {
      try {
        const resp = await fetch(
          'https://api.github.com/user/installations?per_page=100',
          {
            headers: {
              Authorization: `token ${req.user.access_token}`,
              Accept: 'application/vnd.github+json',
            },
          }
        );
        if (resp.ok) {
          const body = await resp.json();
          for (const inst of (body.installations || [])) {
            installationIds.add(Number(inst.id));
            // Claim the installation for this user if it is currently unlinked.
            await query(
              `INSERT INTO installations (installation_id, account_login, account_type, target_type, installer_github_id, installer_login)
               VALUES ($1, $2, $3, $4, $5, $6)
               ON CONFLICT (installation_id) DO UPDATE SET
                 installer_github_id = COALESCE(installations.installer_github_id, EXCLUDED.installer_github_id),
                 installer_login = COALESCE(installations.installer_login, EXCLUDED.installer_login),
                 updated_at = NOW()`,
              [inst.id, inst.account?.login || username, inst.account?.type || 'User',
               inst.target_type || null, githubId, username]
            );
          }
        }
      } catch (discoverErr) {
        // Token may not support /user/installations — fall back to DB matches.
      }
    }

    if (!installationIds.size) {
      return res.json({ synced: 0, repositories: [] });
    }

    const { createAppAuth } = require('@octokit/auth-app');
    const appId = process.env.GITHUB_APP_ID;
    const privateKey = (process.env.GITHUB_PRIVATE_KEY || '').replace(/\\n/g, '\n');

    if (!appId || !privateKey) {
      // Fallback: just return existing repos if we can't talk to GitHub
      const existing = await query(
        'SELECT id, full_name, language, created_at FROM repositories WHERE user_id = $1 ORDER BY created_at DESC',
        [userId]
      );
      return res.json({ synced: 0, repositories: existing.rows });
    }

    let totalSynced = 0;
    for (const installationId of installationIds) {
      try {
        const auth = createAppAuth({ appId, privateKey });
        const installationAuth = await auth({
          type: 'installation',
          installationId,
        });

        const response = await fetch(
          `https://api.github.com/installation/repositories?per_page=100`,
          {
            headers: {
              Authorization: `token ${installationAuth.token}`,
              Accept: 'application/vnd.github+json',
            },
          }
        );
        if (!response.ok) continue;
        const data = await response.json();

        for (const repo of (data.repositories || [])) {
          // Enforce max_repos limit during sync
          if (maxRepos !== -1) {
            const curCount = await query(
              'SELECT COUNT(*) AS cnt FROM repositories WHERE user_id = $1',
              [userId]
            );
            if (parseInt(curCount.rows[0].cnt) >= maxRepos) {
              break; // Stop syncing, limit reached
            }
          }
          await query(
            `INSERT INTO repositories (github_id, full_name, owner, name, default_branch, language, installation_id, user_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (github_id) DO UPDATE SET
               full_name = EXCLUDED.full_name,
               language = EXCLUDED.language,
               user_id = COALESCE(repositories.user_id, EXCLUDED.user_id),
               updated_at = NOW()`,
            [repo.id, repo.full_name, repo.owner.login, repo.name,
             repo.default_branch || 'main', repo.language,
             String(installationId), userId]
          );
          totalSynced++;
        }
      } catch (innerErr) {
        // Skip individual installation errors
      }
    }

    const repos = await query(
      'SELECT id, full_name, language, created_at FROM repositories WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    res.json({ synced: totalSynced, repositories: repos.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to sync repositories' });
  }
});

router.get('/telemetry', requireAuth, async (req, res) => {
  try {
    const result = await query(
      `SELECT metric_type, metric_value, recorded_at
       FROM telemetry_metrics
       WHERE user_id = $1
       ORDER BY recorded_at DESC LIMIT 100`,
      [req.user.id]
    );
    res.json({ metrics: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch telemetry' });
  }
});

module.exports = router;
