const { query } = require('../models/database');

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

module.exports = { resolveUserIdForInstallation };
