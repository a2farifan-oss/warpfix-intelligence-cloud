const { query } = require('../models/database');
const { logger } = require('../utils/logger');
const { PLANS } = require('../routes/billing');

// Resolve the WarpFix user that owns a GitHub App installation.
//
// Historically this was keyed on `users.username === installations.account_login`,
// which only works when the app is installed on the user's *personal* account.
// For organization installs the account login is the org name, so that match
// fails and repos end up with a NULL user_id (invisible in the dashboard).
//
// We now prefer the GitHub id of the user who performed the install
// (`installer_github_id`), then their login, and finally fall back to the
// account login for backwards compatibility with older rows.
async function resolveUserIdForInstallation(installationId) {
  if (!installationId) return null;
  const result = await query(
    `SELECT u.id,
            CASE
              WHEN u.github_id = i.installer_github_id THEN 1
              WHEN u.username  = i.installer_login      THEN 2
              ELSE 3
            END AS priority
       FROM installations i
       JOIN users u
         ON u.github_id = i.installer_github_id
         OR u.username  = i.installer_login
         OR u.username  = i.account_login
      WHERE i.installation_id = $1
      ORDER BY priority ASC
      LIMIT 1`,
    [installationId]
  );
  return result.rows[0]?.id || null;
}

// Persist a list of repositories carried by an installation /
// installation_repositories webhook, honoring the owner's plan limit.
// Returns the number of repos saved.
async function saveInstallationRepos({ installationId, userId, repos }) {
  if (!repos || !repos.length) return 0;

  let userPlan = 'free';
  if (userId) {
    const u = await query('SELECT plan FROM users WHERE id = $1', [userId]);
    userPlan = u.rows[0]?.plan || 'free';
  }
  const maxRepos = PLANS[userPlan]?.max_repos ?? 1;

  let saved = 0;
  for (const repo of repos) {
    if (maxRepos !== -1 && userId) {
      const curCount = await query(
        'SELECT COUNT(*) AS cnt FROM repositories WHERE user_id = $1',
        [userId]
      );
      if (parseInt(curCount.rows[0].cnt) >= maxRepos) {
        logger.info('Repo limit reached during install', { plan: userPlan, max: maxRepos });
        break;
      }
    }
    await query(
      `INSERT INTO repositories (github_id, full_name, owner, name, default_branch, language, installation_id, user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (github_id) DO UPDATE SET
         full_name = EXCLUDED.full_name,
         language = COALESCE(EXCLUDED.language, repositories.language),
         user_id = COALESCE(repositories.user_id, EXCLUDED.user_id),
         installation_id = EXCLUDED.installation_id,
         updated_at = NOW()`,
      [repo.id, repo.full_name, repo.owner?.login || repo.full_name.split('/')[0], repo.name,
       repo.default_branch || 'main', repo.language || null, String(installationId), userId]
    );
    saved++;
  }
  return saved;
}

// Fetch the repositories an installation can access, using app (installation)
// auth. Returns null when app credentials are missing or GitHub rejects the
// request. Independent of any user token, so it is unaffected by org SSO.
async function fetchInstallationRepos(installationId) {
  const appId = process.env.GITHUB_APP_ID;
  const privateKey = (process.env.GITHUB_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  if (!appId || !privateKey) return null;

  try {
    const { createAppAuth } = require('@octokit/auth-app');
    const auth = createAppAuth({ appId, privateKey });
    const installationAuth = await auth({
      type: 'installation',
      installationId: Number(installationId),
    });
    const resp = await fetch(
      'https://api.github.com/installation/repositories?per_page=100',
      {
        headers: {
          Authorization: `token ${installationAuth.token}`,
          Accept: 'application/vnd.github+json',
        },
      }
    );
    if (!resp.ok) return null;
    const data = await resp.json();
    return data.repositories || [];
  } catch (err) {
    logger.error('Failed to fetch installation repos', { installationId, error: err.message });
    return null;
  }
}

// Fetch + persist an installation's repos for a given owner, plan-limited.
// Returns the number of repos saved (0 when nothing could be synced).
async function syncInstallationRepos({ installationId, userId }) {
  const repos = await fetchInstallationRepos(installationId);
  if (!repos) return 0;
  return saveInstallationRepos({ installationId, userId, repos });
}

module.exports = {
  resolveUserIdForInstallation,
  saveInstallationRepos,
  fetchInstallationRepos,
  syncInstallationRepos,
};
