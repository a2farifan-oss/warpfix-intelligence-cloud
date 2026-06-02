const { Octokit } = require('octokit');
const jwt = require('jsonwebtoken');
const { logger } = require('../utils/logger');

// Honor GitHub's primary AND secondary (abuse) rate limits. WarpFix makes
// mutative calls (create branch/commit/PR/comment/labels) across many repos;
// without backoff a burst from one busy repo can trip the secondary rate limit
// and get the WHOLE App throttled — degrading every customer. The throttling
// plugin (bundled with `octokit`) waits out Retry-After and we retry a bounded
// number of times, per GitHub's REST best-practices.
const throttle = {
  onRateLimit(retryAfter, options, _octokit, retryCount) {
    logger.warn('GitHub primary rate limit hit', {
      method: options.method, url: options.url, retryAfter, retryCount,
    });
    return retryCount < 2; // retry up to twice after waiting
  },
  onSecondaryRateLimit(retryAfter, options, _octokit, retryCount) {
    logger.warn('GitHub secondary (abuse) rate limit hit', {
      method: options.method, url: options.url, retryAfter, retryCount,
    });
    return retryCount < 2;
  },
};

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

function makeOctokit(auth) {
  return new Octokit({ auth, throttle });
}

async function getInstallationOctokit(installationId) {
  try {
    const appJWT = createAppJWT();
    const appOctokit = makeOctokit(appJWT);

    const { data } = await appOctokit.request(
      'POST /app/installations/{installation_id}/access_tokens',
      { installation_id: installationId }
    );

    return makeOctokit(data.token);
  } catch (err) {
    logger.error('Failed to get installation token', { installationId, error: err.message });
    throw err;
  }
}

// Return the raw installation access token (not an Octokit). Needed for git
// operations like cloning a repo over HTTPS (x-access-token:<token>@github.com).
async function getInstallationToken(installationId) {
  const appJWT = createAppJWT();
  const appOctokit = makeOctokit(appJWT);
  const { data } = await appOctokit.request(
    'POST /app/installations/{installation_id}/access_tokens',
    { installation_id: installationId }
  );
  return data.token;
}

async function getUserOctokit(accessToken) {
  return makeOctokit(accessToken);
}

module.exports = { getInstallationOctokit, getInstallationToken, getUserOctokit, createAppJWT };
