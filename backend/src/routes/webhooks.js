const express = require('express');
const crypto = require('crypto');
const { logger } = require('../utils/logger');
const { enqueueRepairJob, enqueueReviewJob, enqueueChatJob } = require('../queue/producer');
const { query } = require('../models/database');
const { captureOrgPreference, detectPreferenceFromPREdit } = require('../agents/intelligenceGrowth');
const { resolveUserIdForInstallation } = require('../services/installations');
const { PLANS } = require('./billing');
const router = express.Router();

function verifyGitHubSignature(req, res, next) {
  const signature = req.headers['x-hub-signature-256'];
  const secret = process.env.GITHUB_WEBHOOK_SECRET;

  if (!secret) {
    logger.warn('GITHUB_WEBHOOK_SECRET not set, skipping verification');
    return next();
  }

  if (!signature) {
    return res.status(401).json({ error: 'Missing signature' });
  }

  const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(Buffer.isBuffer(req.body) ? req.body : body)
    .digest('hex');

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Parse raw body if needed
  if (Buffer.isBuffer(req.body)) {
    req.body = JSON.parse(req.body.toString());
  }

  next();
}

// Persist the repositories carried by an installation / installation_repositories
// webhook, honoring the owner's plan limit. Returns the number of repos saved.
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
      `INSERT INTO repositories (github_id, full_name, owner, name, default_branch, installation_id, user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (github_id) DO UPDATE SET
         full_name = EXCLUDED.full_name,
         user_id = COALESCE(repositories.user_id, EXCLUDED.user_id),
         installation_id = EXCLUDED.installation_id,
         updated_at = NOW()`,
      [repo.id, repo.full_name, repo.full_name.split('/')[0], repo.name,
       'main', String(installationId), userId]
    );
    saved++;
  }
  return saved;
}

router.post('/github', verifyGitHubSignature, async (req, res) => {
  const event = req.headers['x-github-event'];
  const payload = req.body;

  logger.info('Webhook received', { event, action: payload.action });

  try {
    switch (event) {
      case 'workflow_run': {
        if (payload.action === 'completed' && payload.workflow_run.conclusion === 'failure') {
          const run = payload.workflow_run;
          const repo = payload.repository;

          // Skip warpfix branches to prevent repair loops
          if (run.head_branch && run.head_branch.startsWith('warpfix/')) {
            logger.info('Skipping warpfix branch failure (prevent repair loop)', {
              branch: run.head_branch,
              repo: repo.full_name,
            });
            break;
          }

          logger.info('CI failure detected', {
            repo: repo.full_name,
            workflow: run.name,
            branch: run.head_branch,
          });

          // Look up user_id from installation
          const installId = payload.installation?.id;
          const userId = await resolveUserIdForInstallation(installId);

          await enqueueRepairJob({
            type: 'ci_failure',
            repository: {
              id: repo.id,
              full_name: repo.full_name,
              owner: repo.owner.login,
              name: repo.name,
              default_branch: repo.default_branch,
            },
            workflow_run: {
              id: run.id,
              name: run.name,
              head_branch: run.head_branch,
              head_sha: run.head_sha,
              logs_url: run.logs_url,
              jobs_url: run.jobs_url,
            },
            installation_id: installId,
            user_id: userId,
          });
        }
        break;
      }

      case 'installation': {
        if (payload.action === 'created') {
          const inst = payload.installation;
          // `sender` is the GitHub user who performed the install. For org
          // installs this differs from `account.login` (the org), so we record
          // it explicitly to link the installation back to the WarpFix account.
          const sender = payload.sender || {};
          await query(
            `INSERT INTO installations (installation_id, account_login, account_type, target_type, installer_github_id, installer_login, permissions, events)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (installation_id) DO UPDATE SET
               installer_github_id = COALESCE(installations.installer_github_id, EXCLUDED.installer_github_id),
               installer_login = COALESCE(installations.installer_login, EXCLUDED.installer_login),
               permissions = EXCLUDED.permissions,
               events = EXCLUDED.events,
               updated_at = NOW()`,
            [inst.id, inst.account.login, inst.account.type, inst.target_type,
             sender.id || null, sender.login || null,
             JSON.stringify(inst.permissions), JSON.stringify(inst.events)]
          );
          logger.info('Installation created', { id: inst.id, account: inst.account.login, installer: sender.login });

          // Auto-save repos from the installation payload, linked to the
          // WarpFix user who installed the app (resolves org installs correctly).
          const userId = await resolveUserIdForInstallation(inst.id);
          const saved = await saveInstallationRepos({
            installationId: inst.id,
            userId,
            repos: payload.repositories,
          });
          logger.info('Saved repos from installation', {
            saved, total: (payload.repositories || []).length, account: inst.account.login, userId,
          });
        }
        break;
      }

      case 'installation_repositories': {
        // Fired when a user adds repos to an existing installation (the most
        // common path for "Only select repositories" installs).
        if (payload.action === 'added') {
          const inst = payload.installation;
          const userId = await resolveUserIdForInstallation(inst.id);
          const saved = await saveInstallationRepos({
            installationId: inst.id,
            userId,
            repos: payload.repositories_added,
          });
          logger.info('Saved repos added to installation', {
            saved, total: (payload.repositories_added || []).length, account: inst.account?.login, userId,
          });
        }
        break;
      }

      case 'pull_request': {
        const pr = payload.pull_request;
        const repo = payload.repository;
        const installId = payload.installation?.id;

        // Capture org preferences when a WarpFix PR is closed/merged with edits
        if (payload.action === 'closed' && pr.merged && pr.head?.ref?.startsWith('warpfix/')) {
          logger.info('WarpFix PR merged — checking for org preference signals', {
            repo: repo.full_name, pr: pr.number,
          });

          const userId = await resolveUserIdForInstallation(installId);

          if (userId) {
            const repair = await query(
              'SELECT patch_diff, engine_used FROM repairs WHERE pr_number = $1 ORDER BY created_at DESC LIMIT 1',
              [pr.number]
            );
            if (repair.rows[0]) {
              await detectPreferenceFromPREdit({
                userId,
                originalPatch: repair.rows[0].patch_diff,
                mergedPatch: pr.body || '',
                classification: { type: repair.rows[0].engine_used },
              });
            }

            await captureOrgPreference({
              userId,
              category: 'Workflow',
              rule: `Team merged WarpFix PR #${pr.number} — auto-repair accepted for ${repo.name}`,
              source: 'pr_merge',
              confidence: 60,
            });
          }
        }

        if (payload.action === 'opened' || payload.action === 'synchronize') {
          // Skip warpfix's own PRs
          if (pr.head?.ref?.startsWith('warpfix/')) {
            logger.info('Skipping review for warpfix PR', { branch: pr.head.ref });
            break;
          }

          logger.info('PR opened/updated — enqueuing review', {
            repo: repo.full_name, pr: pr.number, action: payload.action,
          });

          // Look up user_id
          const userId = await resolveUserIdForInstallation(installId);

          await enqueueReviewJob({
            type: 'pr_review',
            repository: {
              id: repo.id,
              full_name: repo.full_name,
              owner: repo.owner.login,
              name: repo.name,
              default_branch: repo.default_branch,
            },
            pull_request: {
              number: pr.number,
              title: pr.title,
              body: pr.body,
              head_ref: pr.head?.ref,
              head_sha: pr.head?.sha,
              base_ref: pr.base?.ref,
              user_login: pr.user?.login,
              html_url: pr.html_url,
            },
            installation_id: installId,
            user_id: userId,
          });
        }
        break;
      }

      case 'issue_comment': {
        // Handle @warpfix mentions in PR comments
        if (payload.action === 'created' && payload.issue?.pull_request) {
          const body = payload.comment?.body || '';
          if (/@warpfix/i.test(body)) {
            const repo = payload.repository;
            const installId = payload.installation?.id;

            logger.info('@warpfix mention detected', {
              repo: repo.full_name, pr: payload.issue.number,
            });

            await enqueueChatJob({
              type: 'chat_mention',
              repository: {
                id: repo.id,
                full_name: repo.full_name,
                owner: repo.owner.login,
                name: repo.name,
                default_branch: repo.default_branch,
              },
              issue_number: payload.issue.number,
              comment: {
                id: payload.comment.id,
                body: payload.comment.body,
                user_login: payload.comment.user?.login,
              },
              installation_id: installId,
            });
          }
        }
        break;
      }

      case 'push':
        logger.info('Push event received', { repo: payload.repository?.full_name });
        break;

      default:
        logger.debug('Unhandled event', { event });
    }

    res.status(200).json({ received: true });
  } catch (err) {
    logger.error('Webhook processing error', { error: err.message, event });
    res.status(500).json({ error: 'Processing failed' });
  }
});

module.exports = router;
