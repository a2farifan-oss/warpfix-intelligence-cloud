const { Pool } = require('pg');
const { logger } = require('../utils/logger');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  logger.error('Unexpected database pool error', { error: err.message });
});

async function query(text, params) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug('Executed query', { text: text.substring(0, 80), duration, rows: result.rowCount });
    return result;
  } catch (err) {
    logger.error('Query error', { text: text.substring(0, 80), error: err.message });
    throw err;
  }
}

async function initDatabase() {
  try {
    await pool.query('SELECT NOW()');
    logger.info('Database connection established');
    await runMigrations();
  } catch (err) {
    logger.warn('Database not available, running in degraded mode', { error: err.message });
  }
}

async function runMigrations() {
  const migrations = `
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      github_id INTEGER UNIQUE NOT NULL,
      username VARCHAR(255) NOT NULL,
      email VARCHAR(255),
      avatar_url TEXT,
      access_token TEXT,
      plan VARCHAR(50) DEFAULT 'free',
      repairs_used_this_month INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS repositories (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      github_id INTEGER UNIQUE NOT NULL,
      owner VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      full_name VARCHAR(512) NOT NULL,
      default_branch VARCHAR(255) DEFAULT 'main',
      language VARCHAR(100),
      installation_id VARCHAR(255),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS installations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      installation_id INTEGER UNIQUE NOT NULL,
      account_login VARCHAR(255) NOT NULL,
      account_type VARCHAR(50) NOT NULL,
      target_type VARCHAR(50),
      installer_github_id INTEGER,
      installer_login VARCHAR(255),
      permissions JSONB,
      events JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS failures (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      repository_id UUID REFERENCES repositories(id) ON DELETE CASCADE,
      workflow_run_id BIGINT,
      job_name VARCHAR(255),
      error_message TEXT,
      stack_trace TEXT,
      log_url TEXT,
      failure_type VARCHAR(100),
      branch VARCHAR(255),
      commit_sha VARCHAR(40),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS fingerprints (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      hash VARCHAR(64) UNIQUE NOT NULL,
      error_pattern TEXT NOT NULL,
      dependency_context JSONB,
      runtime_version VARCHAR(50),
      resolution_patch TEXT,
      resolution_confidence INTEGER,
      times_matched INTEGER DEFAULT 1,
      last_matched_at TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS repairs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      failure_id UUID REFERENCES failures(id) ON DELETE CASCADE,
      repository_id UUID REFERENCES repositories(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      fingerprint_id UUID REFERENCES fingerprints(id) ON DELETE SET NULL,
      patch_diff TEXT,
      patch_summary TEXT,
      confidence_score INTEGER,
      sandbox_passed BOOLEAN DEFAULT FALSE,
      pr_number INTEGER,
      pr_url TEXT,
      status VARCHAR(50) DEFAULT 'pending',
      engine_used VARCHAR(100),
      duration_ms INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Feedback loop: every WarpFix PR a customer actually MERGES is captured
    -- here as a verified (error -> working fix) pair. Retrieval reads from this
    -- in addition to the shipped KB, so the product genuinely learns from real
    -- accepted fixes over time instead of staying frozen at the seed corpus.
    CREATE TABLE IF NOT EXISTS learned_fixes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      repository_id UUID REFERENCES repositories(id) ON DELETE SET NULL,
      category VARCHAR(100),
      error_message TEXT NOT NULL,
      fix_json JSONB NOT NULL,
      pr_number INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      dodo_subscription_id VARCHAR(255),
      plan VARCHAR(50) NOT NULL,
      status VARCHAR(50) DEFAULT 'active',
      current_period_start TIMESTAMPTZ,
      current_period_end TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS dependency_alerts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      repository_id UUID REFERENCES repositories(id) ON DELETE CASCADE,
      package_name VARCHAR(255) NOT NULL,
      current_version VARCHAR(50),
      breaking_version VARCHAR(50),
      severity VARCHAR(50),
      description TEXT,
      resolved BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS telemetry_metrics (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      repository_id UUID REFERENCES repositories(id) ON DELETE SET NULL,
      metric_type VARCHAR(100) NOT NULL,
      metric_value JSONB NOT NULL,
      recorded_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      repository_id UUID REFERENCES repositories(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      pr_number INTEGER NOT NULL,
      pr_url TEXT,
      pr_title TEXT,
      review_data JSONB,
      inline_comments_count INTEGER DEFAULT 0,
      summary TEXT,
      risk_level VARCHAR(50),
      review_effort_level INTEGER,
      status VARCHAR(50) DEFAULT 'completed',
      duration_ms INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS review_comments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      review_id UUID REFERENCES reviews(id) ON DELETE CASCADE,
      file_path TEXT NOT NULL,
      line_number INTEGER,
      severity VARCHAR(50) NOT NULL,
      category VARCHAR(100),
      comment TEXT NOT NULL,
      suggestion TEXT,
      verified BOOLEAN DEFAULT FALSE,
      github_comment_id BIGINT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS learnings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      repository_id UUID REFERENCES repositories(id) ON DELETE CASCADE,
      rule TEXT NOT NULL,
      category VARCHAR(100) DEFAULT 'general',
      context TEXT,
      source VARCHAR(100) DEFAULT 'manual',
      active BOOLEAN DEFAULT TRUE,
      times_applied INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS repo_configs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      repository_id UUID REFERENCES repositories(id) ON DELETE CASCADE,
      config_yaml TEXT,
      config_json JSONB,
      review_profile VARCHAR(50) DEFAULT 'assertive',
      auto_review BOOLEAN DEFAULT TRUE,
      auto_repair BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_failures_repository ON failures(repository_id);
    CREATE INDEX IF NOT EXISTS idx_failures_created ON failures(created_at);
    CREATE INDEX IF NOT EXISTS idx_repairs_repository ON repairs(repository_id);
    CREATE INDEX IF NOT EXISTS idx_repairs_user ON repairs(user_id);
    CREATE INDEX IF NOT EXISTS idx_repairs_status ON repairs(status);
    CREATE INDEX IF NOT EXISTS idx_fingerprints_hash ON fingerprints(hash);
    CREATE INDEX IF NOT EXISTS idx_telemetry_user ON telemetry_metrics(user_id);
    CREATE INDEX IF NOT EXISTS idx_telemetry_type ON telemetry_metrics(metric_type);
    CREATE INDEX IF NOT EXISTS idx_dependency_alerts_repo ON dependency_alerts(repository_id);
    CREATE INDEX IF NOT EXISTS idx_reviews_repository ON reviews(repository_id);
    CREATE INDEX IF NOT EXISTS idx_reviews_pr ON reviews(pr_number);
    CREATE INDEX IF NOT EXISTS idx_review_comments_review ON review_comments(review_id);
    CREATE INDEX IF NOT EXISTS idx_learnings_user ON learnings(user_id);
    CREATE INDEX IF NOT EXISTS idx_learnings_repo ON learnings(repository_id);
    CREATE INDEX IF NOT EXISTS idx_repo_configs_repo ON repo_configs(repository_id);
    CREATE INDEX IF NOT EXISTS idx_learned_fixes_created ON learned_fixes(created_at);

    -- Admin tables
    CREATE TABLE IF NOT EXISTS admins (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name VARCHAR(255) DEFAULT '',
      role VARCHAR(50) DEFAULT 'admin',
      active BOOLEAN DEFAULT TRUE,
      last_login_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS promo_codes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code VARCHAR(100) UNIQUE NOT NULL,
      description TEXT DEFAULT '',
      discount_type VARCHAR(50) DEFAULT 'percentage',
      discount_value NUMERIC(10,2) DEFAULT 0,
      plan_override VARCHAR(50),
      max_redemptions INTEGER,
      active BOOLEAN DEFAULT TRUE,
      expires_at TIMESTAMPTZ,
      created_by UUID REFERENCES admins(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS promo_redemptions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      promo_id UUID REFERENCES promo_codes(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      applied_by UUID REFERENCES admins(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS admin_activity_log (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      admin_id UUID REFERENCES admins(id) ON DELETE SET NULL,
      action VARCHAR(100) NOT NULL,
      target_type VARCHAR(50),
      target_id UUID,
      details JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);
    CREATE INDEX IF NOT EXISTS idx_promo_redemptions_promo ON promo_redemptions(promo_id);
    CREATE INDEX IF NOT EXISTS idx_promo_redemptions_user ON promo_redemptions(user_id);
    CREATE INDEX IF NOT EXISTS idx_admin_activity_log_admin ON admin_activity_log(admin_id);

    -- CI Brain: test reliability tracking
    CREATE TABLE IF NOT EXISTS test_runs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      repository_id UUID REFERENCES repositories(id) ON DELETE CASCADE,
      test_name VARCHAR(512) NOT NULL,
      test_file VARCHAR(512),
      status VARCHAR(50) NOT NULL,
      duration_ms INTEGER,
      error_message TEXT,
      branch VARCHAR(255),
      commit_sha VARCHAR(40),
      workflow_run_id BIGINT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Org preferences learned from PR feedback
    CREATE TABLE IF NOT EXISTS org_preferences (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      category VARCHAR(100) NOT NULL,
      rule TEXT NOT NULL,
      confidence INTEGER DEFAULT 50,
      source VARCHAR(100) DEFAULT 'pr_feedback',
      times_applied INTEGER DEFAULT 0,
      last_used_at TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Network-wide aggregated prediction data
    CREATE TABLE IF NOT EXISTS network_predictions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      pattern_type VARCHAR(100) NOT NULL,
      description TEXT NOT NULL,
      probability INTEGER NOT NULL,
      category VARCHAR(100),
      based_on_prs INTEGER DEFAULT 0,
      based_on_repos INTEGER DEFAULT 0,
      times_prevented INTEGER DEFAULT 0,
      suggestion TEXT,
      last_triggered_at TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Failure genome monthly index
    CREATE TABLE IF NOT EXISTS genome_monthly_stats (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      month_year VARCHAR(20) NOT NULL,
      new_patterns INTEGER DEFAULT 0,
      total_matches INTEGER DEFAULT 0,
      avg_confidence INTEGER DEFAULT 0,
      top_category VARCHAR(100),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_test_runs_repo ON test_runs(repository_id);
    CREATE INDEX IF NOT EXISTS idx_test_runs_name ON test_runs(test_name);
    CREATE INDEX IF NOT EXISTS idx_test_runs_status ON test_runs(status);
    CREATE INDEX IF NOT EXISTS idx_org_preferences_user ON org_preferences(user_id);
    CREATE INDEX IF NOT EXISTS idx_org_preferences_category ON org_preferences(category);
    CREATE INDEX IF NOT EXISTS idx_network_predictions_type ON network_predictions(pattern_type);
    CREATE INDEX IF NOT EXISTS idx_genome_monthly_month ON genome_monthly_stats(month_year);
  `;

  try {
    await pool.query(migrations);

    // Add columns that may be missing from older schema
    await pool.query(`
      DO $$ BEGIN
        ALTER TABLE repositories ADD COLUMN IF NOT EXISTS installation_id VARCHAR(255);
        ALTER TABLE repositories ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
        ALTER TABLE installations ADD COLUMN IF NOT EXISTS installer_github_id INTEGER;
        ALTER TABLE installations ADD COLUMN IF NOT EXISTS installer_login VARCHAR(255);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS cli_api_key VARCHAR(255);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ;
        ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS duration_days INTEGER;
        -- Honest metrics: whether the sandbox pass was a REAL test run, and the
        -- real customer outcome (merged vs closed) so the dashboard can report
        -- acceptance rate instead of the internal sandbox pass rate.
        ALTER TABLE repairs ADD COLUMN IF NOT EXISTS sandbox_verified BOOLEAN DEFAULT FALSE;
        ALTER TABLE repairs ADD COLUMN IF NOT EXISTS pr_state VARCHAR(20);
        ALTER TABLE repairs ADD COLUMN IF NOT EXISTS accepted BOOLEAN;
      EXCEPTION WHEN OTHERS THEN NULL;
      END $$;
    `);

    // Seed default super admin if not exists (uses env vars for credentials)
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (adminEmail && adminPassword) {
      const bcrypt = require('bcryptjs');
      const existing = await pool.query('SELECT id FROM admins WHERE email = $1', [adminEmail]);
      if (existing.rows.length === 0) {
        const hash = await bcrypt.hash(adminPassword, 12);
        await pool.query(
          "INSERT INTO admins (email, password_hash, name, role) VALUES ($1, $2, $3, $4)",
          [adminEmail, hash, 'Super Admin', 'super_admin']
        );
        logger.info('Default super admin seeded');
      }
    }

    logger.info('Database migrations completed successfully');
  } catch (err) {
    logger.error('Migration failed', { error: err.message });
  }
}

function getPool() {
  return pool;
}

module.exports = { pool, query, initDatabase, getPool };
