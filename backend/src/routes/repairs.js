const express = require('express');
const { query } = require('../models/database');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await query(
      `SELECT r.*, f.error_message, f.failure_type, repo.full_name as repo_name
       FROM repairs r
       LEFT JOIN failures f ON f.id = r.failure_id
       LEFT JOIN repositories repo ON repo.id = r.repository_id
       WHERE r.user_id = $1
          OR r.repository_id IN (
            SELECT rp.id FROM repositories rp
            JOIN installations i ON i.installation_id::text = rp.installation_id
            JOIN users u ON u.github_id = i.installer_github_id
                         OR u.username = i.installer_login
                         OR u.username = i.account_login
            WHERE u.id = $1
          )
       ORDER BY r.created_at DESC
       LIMIT 50`,
      [req.user.id]
    );
    res.json({ repairs: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch repairs' });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const result = await query(
      `SELECT r.*, f.error_message, f.stack_trace, f.failure_type, f.log_url,
              repo.full_name as repo_name, fp.hash as fingerprint_hash, fp.times_matched
       FROM repairs r
       LEFT JOIN failures f ON f.id = r.failure_id
       LEFT JOIN repositories repo ON repo.id = r.repository_id
       LEFT JOIN fingerprints fp ON fp.id = r.fingerprint_id
       WHERE r.id = $1 AND (r.user_id = $2 OR r.repository_id IN (
            SELECT rp.id FROM repositories rp
            JOIN installations i ON i.installation_id::text = rp.installation_id
            JOIN users u ON u.github_id = i.installer_github_id
                         OR u.username = i.installer_login
                         OR u.username = i.account_login
            WHERE u.id = $2
          ))`,
      [req.params.id, req.user.id]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Repair not found' });
    }
    res.json({ repair: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch repair' });
  }
});

module.exports = router;
