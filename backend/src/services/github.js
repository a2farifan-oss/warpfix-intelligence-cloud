const { Octokit } = require('octokit');
const jwt = require('jsonwebtoken');
const { logger } = require('../utils/logger');

function createAppJWT() {
  const appId = process.env.GITHUB_APP_ID;
  const privateKey = process.env.GITHUB_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!appId || !privateKey) {
    throw new Error('GitHub App credentials not configured');
  }

  const now = Math.floor(Date.now() / 1000);
  return jwt.sign(
    {
      iat: now - 60,
      exp: now + 600,
      iss: appId,
    },
    privateKey,
    { algorithm: 'RS256' }
  );
}

async function getInstallationOctokit(installationId) {
  try {
    const appJWT = createAppJWT();
    const appOctokit = new Octokit({ auth: appJWT });

    const { data } = await appOctokit.request(
      'POST /app/installations/{installation_id}/access_tokens',
      { installation_id: installationId }
    );

    return new Octokit({ auth: data.token });
  } catch (err) {
    logger.error('Failed to get installation token', { installationId, error: err.message });
    throw err;
  }
}

// Return the raw installation access token (not an Octokit). Needed for git
// operations like cloning a repo over HTTPS (x-access-token:<token>@github.com).
async function getInstallationToken(installationId) {
  const appJWT = createAppJWT();
  const appOctokit = new Octokit({ auth: appJWT });
  const { data } = await appOctokit.request(
    'POST /app/installations/{installation_id}/access_tokens',
    { installation_id: installationId }
  );
  return data.token;
}

async function getUserOctokit(accessToken) {
  return new Octokit({ auth: accessToken });
}

module.exports = { getInstallationOctokit, getInstallationToken, getUserOctokit, createAppJWT };
