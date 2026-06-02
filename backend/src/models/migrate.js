require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { pool } = require('./database');
const { logger } = require('../utils/logger');

const migrations = `
-- Users table
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

-- Repositories table
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

-- GitHub App Installations
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

-- Failures table
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

-- Fingerprints table
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

-- Repairs table
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

-- Feedback loop: merged WarpFix fixes captured as verified (error -> fix) pairs
-- that retrieval reads alongside the shipped KB so the product learns over time.
CREATE TABLE IF NOT EXISTS learned_fixes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id UUID REFERENCES repositories(id) ON DELETE SET NULL,
  category VARCHAR(100),
  error_message TEXT NOT NULL,
  fix_json JSONB NOT NULL,
  pr_number INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscriptions table
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

-- Dependency alerts table
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

-- Telemetry metrics table
CREATE TABLE IF NOT EXISTS telemetry_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  repository_id UUID REFERENCES repositories(id) ON DELETE SET NULL,
  metric_type VARCHAR(100) NOT NULL,
  metric_value JSONB NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Schema migrations (add columns that may not exist yet)
DO $$ BEGIN
  ALTER TABLE repositories ADD COLUMN IF NOT EXISTS installation_id VARCHAR(255);
  ALTER TABLE repositories ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
  ALTER TABLE installations ADD COLUMN IF NOT EXISTS installer_github_id INTEGER;
  ALTER TABLE installations ADD COLUMN IF NOT EXISTS installer_login VARCHAR(255);
  -- Honest metrics: whether the sandbox pass was a REAL test run, and whether
  -- the customer actually accepted (merged) the PR vs closed/ignored it.
  ALTER TABLE repairs ADD COLUMN IF NOT EXISTS sandbox_verified BOOLEAN DEFAULT FALSE;
  ALTER TABLE repairs ADD COLUMN IF NOT EXISTS pr_state VARCHAR(20);
  ALTER TABLE repairs ADD COLUMN IF NOT EXISTS accepted BOOLEAN;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_failures_repository ON failures(repository_id);
CREATE INDEX IF NOT EXISTS idx_failures_created ON failures(created_at);
CREATE INDEX IF NOT EXISTS idx_repairs_repository ON repairs(repository_id);
CREATE INDEX IF NOT EXISTS idx_repairs_user ON repairs(user_id);
CREATE INDEX IF NOT EXISTS idx_repairs_status ON repairs(status);
CREATE INDEX IF NOT EXISTS idx_fingerprints_hash ON fingerprints(hash);
CREATE INDEX IF NOT EXISTS idx_telemetry_user ON telemetry_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_type ON telemetry_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_dependency_alerts_repo ON dependency_alerts(repository_id);
`;

async function migrate() {
  try {
    await pool.query(migrations);
    logger.info('Database migration completed successfully');
  } catch (err) {
    logger.error('Migration failed', { error: err.message });
    throw err;
  } finally {
    await pool.end();
  }
}

migrate().catch(() => process.exit(1));
