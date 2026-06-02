const express = require('express');
const passport = require('passport');
const { logger } = require('../utils/logger');
const { query } = require('../models/database');
const { resolveUserIdForInstallation, syncInstallationRepos } = require('../services/installations');
const router = express.Router();

router.get('/github', passport.authenticate('github', { scope: ['repo'] }));

router.get('/github/callback', (req, res, next) => {
  passport.authenticate('github', (err, user, info) => {
    if (err) {
      logger.error('OAuth callback error', { error: err.message, stack: err.stack, code: err.code, statusCode: err.statusCode, oauthError: err.oauthError });
      return res.redirect(
        `${process.env.APP_BASE_URL || 'http://localhost:3000'}/auth-error?error=oauth_error&detail=${encodeURIComponent(err.message || 'unknown')}`
      );
    }
    if (!user) {
      logger.warn('OAuth callback: no user returned', { info });
      return res.redirect(
        `${process.env.APP_BASE_URL || 'http://localhost:3000'}/auth-error?error=authentication_failed`
      );
    }
    req.login(user, (loginErr) => {
      if (loginErr) {
        logger.error('Session login error', { error: loginErr.message, stack: loginErr.stack });
        return res.redirect(
          `${process.env.APP_BASE_URL || 'http://localhost:3000'}/auth-error?error=session_error`
        );
      }
      logger.info('OAuth login successful', { userId: user.id, username: user.username });
      const appBase = process.env.APP_BASE_URL || 'http://localhost:3000';
      let postLogin = req.session.postLoginRedirect;
      delete req.session.postLoginRedirect;
      if (typeof postLogin !== 'string' || !postLogin.startsWith('/') || postLogin.startsWith('//')) {
        postLogin = '/dashboard';
      }
      res.redirect(`${appBase}${postLogin}`);
    });
  })(req, res, next);
});

// GitHub App "Setup URL" callback. GitHub redirects the installing user here
// after install/reconfigure with ?installation_id=...&setup_action=... Because
// the user arrives authenticated (same browser session), we link the install
// to them and sync repos immediately — so org/enterprise installs show repos
// without the user having to click "Sync Repos". The repo sync uses app
// (installation) auth, so it works even when org SSO blocks the user's token.
router.get('/github/setup', async (req, res) => {
  const appBase = process.env.APP_BASE_URL || 'http://localhost:3000';
  const dest = `${appBase}/dashboard/repositories?installed=1`;
  const installationId = req.query.installation_id;

  try {
    // Not logged in: start GitHub OAuth on this API host (the frontend has no
    // /login route — login is initiated via /auth/github). Remember where to
    // land so repos show right after authenticating; the webhook links the
    // install by its sender in the meantime.
    if (!req.user) {
      req.session.postLoginRedirect = '/dashboard/repositories?installed=1';
      return res.redirect('/auth/github');
    }
    if (!installationId) {
      return res.redirect(dest);
    }

    // Authoritative ownership comes from the webhook sender (set on the
    // installations row). Only act when this install resolves to *this* user.
    let ownerId = await resolveUserIdForInstallation(installationId);

    // Webhook may not have arrived yet. Fall back to verifying via the user's
    // own OAuth token, then claim the (still-unlinked) install for them.
    if (!ownerId && req.user.access_token) {
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
          const match = (body.installations || []).find(
            (i) => Number(i.id) === Number(installationId)
          );
          if (match) {
            await query(
              `INSERT INTO installations (installation_id, account_login, account_type, target_type, installer_github_id, installer_login)
               VALUES ($1, $2, $3, $4, $5, $6)
               ON CONFLICT (installation_id) DO UPDATE SET
                 installer_github_id = COALESCE(installations.installer_github_id, EXCLUDED.installer_github_id),
                 installer_login = COALESCE(installations.installer_login, EXCLUDED.installer_login),
                 updated_at = NOW()`,
              [match.id, match.account?.login || req.user.username,
               match.account?.type || 'User', match.target_type || null,
               req.user.github_id, req.user.username]
            );
            ownerId = req.user.id;
          }
        }
      } catch (verifyErr) {
        logger.warn('Setup: /user/installations verification failed', { error: verifyErr.message });
      }
    }

    if (ownerId === req.user.id) {
      const synced = await syncInstallationRepos({ installationId, userId: ownerId });
      logger.info('Setup callback synced installation', { installationId, userId: ownerId, synced });
    } else {
      // Either unresolved (webhook will link by sender shortly) or owned by a
      // different user — never link someone else's install from a query param.
      logger.info('Setup callback: install not linked to current user yet', {
        installationId, ownerId, userId: req.user.id,
      });
    }
  } catch (err) {
    logger.error('Setup callback error', { error: err.message });
  }

  return res.redirect(dest);
});

router.get('/me', (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const { access_token, ...safeUser } = req.user;
  res.json({ user: safeUser });
});

router.post('/cli-key', (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const crypto = require('crypto');
  const { query } = require('../models/database');
  const key = `wf_${crypto.randomBytes(24).toString('hex')}`;
  query('UPDATE users SET cli_api_key = $1 WHERE id = $2', [key, req.user.id])
    .then(() => res.json({ cli_api_key: key }))
    .catch(() => res.status(500).json({ error: 'Failed to generate key' }));
});

router.get('/cli-key', (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const { query } = require('../models/database');
  query('SELECT cli_api_key FROM users WHERE id = $1', [req.user.id])
    .then(r => res.json({ cli_api_key: r.rows[0]?.cli_api_key || null }))
    .catch(() => res.status(500).json({ error: 'Failed to fetch key' }));
});

router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) return res.status(500).json({ error: 'Logout failed' });
    res.json({ message: 'Logged out' });
  });
});

router.get('/failure', (req, res) => {
  res.status(401).json({ error: 'GitHub authentication failed' });
});

module.exports = router;
