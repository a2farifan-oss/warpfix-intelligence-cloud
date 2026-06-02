const express = require('express');
const router = express.Router();
const { query } = require('../models/database');
const { logger } = require('../utils/logger');
const { requireAuth } = require('../middleware/auth');
const { requireFeature } = require('../middleware/tierGate');

// Helper: get all repo IDs the user has access to
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

// ── CI Brain: test reliability & fingerprint stats ──
router.get('/ci-brain', requireAuth, requireFeature('reviews_enabled'), async (req, res) => {
  try {
    // Total test runs and unique tests
    const testStats = await query(`
      SELECT
        COUNT(*) AS total_runs,
        COUNT(DISTINCT test_name) AS unique_tests,
        COUNT(DISTINCT test_file) AS unique_files,
        COUNT(*) FILTER (WHERE status = 'failed') AS total_failures,
        COUNT(*) FILTER (WHERE status = 'passed') AS total_passes
      FROM test_runs
    `);

    // Fingerprint count
    const fpStats = await query(`
      SELECT COUNT(*) AS total_fingerprints, SUM(times_matched) AS total_matches
      FROM fingerprints
    `);

    // Top flaky tests (lowest pass rate with at least 50 runs)
    const flakyTests = await query(`
      SELECT
        test_name,
        test_file,
        COUNT(*) AS total_runs,
        COUNT(*) FILTER (WHERE status = 'passed') AS passes,
        COUNT(*) FILTER (WHERE status = 'failed') AS failures,
        ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'passed') / NULLIF(COUNT(*), 0), 1) AS pass_rate
      FROM test_runs
      GROUP BY test_name, test_file
      HAVING COUNT(*) >= 50
      ORDER BY pass_rate ASC
      LIMIT 15
    `);

    // Failure-prone files (most failures)
    const hotspotFiles = await query(`
      SELECT
        test_file,
        COUNT(*) FILTER (WHERE status = 'failed') AS failures,
        COUNT(*) AS total_runs,
        ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'failed') / NULLIF(COUNT(*), 0), 1) AS fail_rate
      FROM test_runs
      GROUP BY test_file
      HAVING COUNT(*) >= 30
      ORDER BY failures DESC
      LIMIT 10
    `);

    // Daily failure trend (last 30 days)
    const dailyTrend = await query(`
      SELECT
        DATE(created_at) AS date,
        COUNT(*) FILTER (WHERE status = 'passed') AS passes,
        COUNT(*) FILTER (WHERE status = 'failed') AS failures
      FROM test_runs
      WHERE created_at > NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date
    `);

    // Unique team categories (from org preferences)
    const teamCount = await query(`
      SELECT COUNT(DISTINCT category) AS teams FROM org_preferences
    `);

    res.json({
      overview: {
        totalTestRuns: parseInt(testStats.rows[0]?.total_runs || 0),
        uniqueTests: parseInt(testStats.rows[0]?.unique_tests || 0),
        uniqueFiles: parseInt(testStats.rows[0]?.unique_files || 0),
        totalFailures: parseInt(testStats.rows[0]?.total_failures || 0),
        totalPasses: parseInt(testStats.rows[0]?.total_passes || 0),
        totalFingerprints: parseInt(fpStats.rows[0]?.total_fingerprints || 0),
        totalMatches: parseInt(fpStats.rows[0]?.total_matches || 0),
        teams: parseInt(teamCount.rows[0]?.teams || 0),
      },
      flakyTests: flakyTests.rows,
      hotspotFiles: hotspotFiles.rows,
      dailyTrend: dailyTrend.rows,
    });
  } catch (err) {
    logger.error('CI Brain fetch failed', { error: err.message });
    res.status(500).json({ error: 'Failed to fetch CI Brain data' });
  }
});

// ── Failure Genome: fingerprint database + monthly index ──
router.get('/failure-genome', requireAuth, requireFeature('reviews_enabled'), async (req, res) => {
  try {
    // All fingerprints with metadata
    const fingerprints = await query(`
      SELECT
        id, hash, error_pattern, dependency_context,
        resolution_confidence, times_matched, last_matched_at, created_at
      FROM fingerprints
      ORDER BY times_matched DESC
      LIMIT 100
    `);

    // Category breakdown
    const categories = await query(`
      SELECT
        dependency_context->>'category' AS category,
        COUNT(*) AS count,
        SUM(times_matched) AS total_matches,
        ROUND(AVG(resolution_confidence), 0) AS avg_confidence
      FROM fingerprints
      WHERE dependency_context->>'category' IS NOT NULL
      GROUP BY dependency_context->>'category'
      ORDER BY total_matches DESC
    `);

    // Monthly genome index
    const monthly = await query(`
      SELECT month_year, new_patterns, total_matches, avg_confidence, top_category
      FROM genome_monthly_stats
      ORDER BY created_at DESC
    `);

    // Aggregate stats
    const agg = await query(`
      SELECT
        COUNT(*) AS total_fingerprints,
        COUNT(DISTINCT dependency_context->>'category') AS unique_categories,
        SUM(times_matched) AS total_matches,
        ROUND(AVG(resolution_confidence), 0) AS avg_confidence
      FROM fingerprints
    `);

    res.json({
      overview: {
        totalFingerprints: parseInt(agg.rows[0]?.total_fingerprints || 0),
        uniqueCategories: parseInt(agg.rows[0]?.unique_categories || 0),
        totalMatches: parseInt(agg.rows[0]?.total_matches || 0),
        avgConfidence: parseInt(agg.rows[0]?.avg_confidence || 0),
      },
      fingerprints: fingerprints.rows,
      categories: categories.rows,
      monthlyIndex: monthly.rows,
    });
  } catch (err) {
    logger.error('Failure Genome fetch failed', { error: err.message });
    res.status(500).json({ error: 'Failed to fetch Failure Genome data' });
  }
});

// ── Network Intelligence: cross-repo predictions ──
router.get('/network-intelligence', requireAuth, requireFeature('reviews_enabled'), async (req, res) => {
  try {
    // All predictions
    const predictions = await query(`
      SELECT
        id, pattern_type, description, probability, category,
        based_on_prs, based_on_repos, times_prevented, suggestion, last_triggered_at
      FROM network_predictions
      ORDER BY probability DESC
    `);

    // Aggregate stats
    const agg = await query(`
      SELECT
        SUM(based_on_repos) AS total_repos,
        SUM(based_on_prs) AS total_prs,
        SUM(times_prevented) AS total_prevented,
        ROUND(AVG(probability), 0) AS avg_accuracy
      FROM network_predictions
    `);

    // Category distribution
    const catDist = await query(`
      SELECT
        category,
        COUNT(*) AS count,
        SUM(times_prevented) AS prevented,
        ROUND(AVG(probability), 0) AS avg_probability
      FROM network_predictions
      GROUP BY category
      ORDER BY prevented DESC
    `);

    // Fingerprint stats for network context
    const fpNetwork = await query(`
      SELECT
        dependency_context->>'framework' AS framework,
        COUNT(*) AS patterns,
        SUM(times_matched) AS total_matches
      FROM fingerprints
      WHERE dependency_context->>'framework' IS NOT NULL
      GROUP BY dependency_context->>'framework'
      ORDER BY total_matches DESC
      LIMIT 15
    `);

    res.json({
      overview: {
        totalRepos: parseInt(agg.rows[0]?.total_repos || 0),
        totalPRs: parseInt(agg.rows[0]?.total_prs || 0),
        totalPrevented: parseInt(agg.rows[0]?.total_prevented || 0),
        avgAccuracy: parseInt(agg.rows[0]?.avg_accuracy || 0),
      },
      predictions: predictions.rows,
      categoryDistribution: catDist.rows,
      frameworkBreakdown: fpNetwork.rows,
    });
  } catch (err) {
    logger.error('Network Intelligence fetch failed', { error: err.message });
    res.status(500).json({ error: 'Failed to fetch Network Intelligence data' });
  }
});

// ── Org Memory: learned preferences & feedback log ──
router.get('/org-memory', requireAuth, requireFeature('reviews_enabled'), async (req, res) => {
  try {
    const userId = req.user.id;

    // All org preferences filtered to authenticated user
    const preferences = await query(
      `SELECT id, category, rule, confidence, source, times_applied, last_used_at, created_at
       FROM org_preferences
       WHERE user_id = $1
       ORDER BY confidence DESC, times_applied DESC`,
      [userId]
    );

    // Category breakdown
    const categories = await query(
      `SELECT
        category,
        COUNT(*) AS rules_count,
        ROUND(AVG(confidence), 0) AS avg_confidence,
        SUM(times_applied) AS total_applications
       FROM org_preferences
       WHERE user_id = $1
       GROUP BY category ORDER BY rules_count DESC`,
      [userId]
    );

    // PR feedback signals (from learnings table)
    const feedbackLog = await query(`
      SELECT id, rule, category, context, source, times_applied, created_at
      FROM learnings
      ORDER BY created_at DESC
      LIMIT 50
    `);

    // Aggregate
    const total = preferences.rows.length;
    const totalApplied = preferences.rows.reduce((sum, p) => sum + (parseInt(p.times_applied) || 0), 0);
    const avgConf = total > 0
      ? Math.round(preferences.rows.reduce((sum, p) => sum + (parseInt(p.confidence) || 0), 0) / total)
      : 0;

    res.json({
      overview: {
        totalPreferences: total,
        totalApplications: totalApplied,
        avgConfidence: avgConf,
        categories: categories.rows.length,
        feedbackSignals: feedbackLog.rows.length,
      },
      preferences: preferences.rows,
      categories: categories.rows,
      feedbackLog: feedbackLog.rows,
    });
  } catch (err) {
    logger.error('Org Memory fetch failed', { error: err.message });
    res.status(500).json({ error: 'Failed to fetch Org Memory data' });
  }
});

// ── Predictive CI Failure: real predictions from fingerprint + network data ──
router.get('/predictive-failures', requireAuth, requireFeature('predictive_ci'), async (req, res) => {
  try {
    // Active predictions from network_predictions (high probability)
    const predictions = await query(`
      SELECT
        id, pattern_type, description, probability, category,
        based_on_prs, based_on_repos, times_prevented, suggestion, last_triggered_at
      FROM network_predictions
      WHERE probability >= 60
      ORDER BY probability DESC
    `);

    // Recent failures that could have been predicted
    const recentFailures = await query(`
      SELECT
        f.error_message, f.failure_type, f.branch, f.created_at,
        r.full_name AS repo_name,
        fp.hash AS fingerprint_hash, fp.times_matched
      FROM failures f
      LEFT JOIN repositories r ON f.repository_id = r.id
      LEFT JOIN repairs rep ON rep.failure_id = f.id
      LEFT JOIN fingerprints fp ON rep.fingerprint_id = fp.id
      ORDER BY f.created_at DESC
      LIMIT 20
    `);

    // Prediction accuracy over time
    const totalPredicted = predictions.rows.reduce((s, p) => s + (parseInt(p.times_prevented) || 0), 0);
    const totalFailures = await query('SELECT COUNT(*) AS cnt FROM failures');
    const accuracy = totalFailures.rows[0]?.cnt > 0
      ? Math.round((totalPredicted / (parseInt(totalFailures.rows[0].cnt) + totalPredicted)) * 100)
      : 0;

    // Category risk distribution
    const riskDist = await query(`
      SELECT
        category,
        COUNT(*) AS patterns,
        SUM(times_prevented) AS prevented,
        ROUND(AVG(probability)) AS avg_probability
      FROM network_predictions
      GROUP BY category
      ORDER BY prevented DESC
    `);

    res.json({
      overview: {
        activePredictions: predictions.rows.length,
        totalPrevented: totalPredicted,
        predictionAccuracy: accuracy,
        riskCategories: riskDist.rows.length,
      },
      predictions: predictions.rows,
      recentFailures: recentFailures.rows,
      riskDistribution: riskDist.rows,
    });
  } catch (err) {
    logger.error('Predictive failures fetch failed', { error: err.message });
    res.status(500).json({ error: 'Failed to fetch predictive failure data' });
  }
});

// ── Tech Debt Tracking: real metrics from codebase analysis ──
router.get('/tech-debt', requireAuth, requireFeature('tech_debt_tracking'), async (req, res) => {
  try {
    // Debt from repeated fingerprints (same errors recurring)
    const recurringIssues = await query(`
      SELECT
        error_pattern, hash, times_matched, resolution_confidence,
        dependency_context->>'category' AS category,
        dependency_context->>'framework' AS framework,
        last_matched_at, created_at
      FROM fingerprints
      WHERE times_matched >= 3
      ORDER BY times_matched DESC
      LIMIT 20
    `);

    // Files with most failures (tech debt hotspots)
    const hotspotFiles = await query(`
      SELECT
        test_file AS file_path,
        COUNT(*) FILTER (WHERE status = 'failed') AS failure_count,
        COUNT(*) AS total_runs,
        ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'failed') / NULLIF(COUNT(*), 0), 1) AS fail_rate
      FROM test_runs
      WHERE test_file IS NOT NULL
      GROUP BY test_file
      HAVING COUNT(*) FILTER (WHERE status = 'failed') >= 3
      ORDER BY failure_count DESC
      LIMIT 15
    `);

    // Stale fingerprints (unresolved for a long time)
    const staleIssues = await query(`
      SELECT hash, error_pattern, times_matched, resolution_confidence,
             created_at, last_matched_at,
             EXTRACT(DAY FROM NOW() - created_at) AS age_days
      FROM fingerprints
      WHERE resolution_confidence < 60
      ORDER BY times_matched DESC
      LIMIT 10
    `);

    // Debt categories breakdown
    const debtCategories = await query(`
      SELECT
        dependency_context->>'category' AS category,
        COUNT(*) AS issues,
        SUM(times_matched) AS total_occurrences,
        ROUND(AVG(resolution_confidence)) AS avg_confidence
      FROM fingerprints
      WHERE dependency_context->>'category' IS NOT NULL
      GROUP BY dependency_context->>'category'
      ORDER BY total_occurrences DESC
    `);

    // Overall tech debt score (0-100, lower is better)
    const totalIssues = recurringIssues.rows.length;
    const avgConfidence = debtCategories.rows.length > 0
      ? debtCategories.rows.reduce((s, c) => s + parseInt(c.avg_confidence || 0), 0) / debtCategories.rows.length
      : 0;
    const debtScore = Math.max(0, Math.min(100, Math.round(
      (totalIssues * 3) + (hotspotFiles.rows.length * 5) + (100 - avgConfidence)
    )));

    res.json({
      overview: {
        debtScore,
        recurringIssues: totalIssues,
        hotspotFiles: hotspotFiles.rows.length,
        staleIssues: staleIssues.rows.length,
        avgResolutionConfidence: Math.round(avgConfidence),
      },
      recurringIssues: recurringIssues.rows,
      hotspotFiles: hotspotFiles.rows,
      staleIssues: staleIssues.rows,
      debtCategories: debtCategories.rows,
    });
  } catch (err) {
    logger.error('Tech debt fetch failed', { error: err.message });
    res.status(500).json({ error: 'Failed to fetch tech debt data' });
  }
});

// ── Test Coverage Analysis: real coverage from test runs ──
router.get('/test-coverage', requireAuth, requireFeature('test_coverage'), async (req, res) => {
  try {
    // Per-file test coverage based on test_runs data
    const fileCoverage = await query(`
      SELECT
        test_file,
        COUNT(DISTINCT test_name) AS tests_count,
        COUNT(*) AS total_runs,
        COUNT(*) FILTER (WHERE status = 'passed') AS passes,
        COUNT(*) FILTER (WHERE status = 'failed') AS failures,
        ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'passed') / NULLIF(COUNT(*), 0), 1) AS pass_rate,
        MAX(created_at) AS last_run
      FROM test_runs
      WHERE test_file IS NOT NULL
      GROUP BY test_file
      ORDER BY tests_count DESC
    `);

    // Files without test coverage (from failures with no matching test_runs)
    const untestedFiles = await query(`
      SELECT DISTINCT
        COALESCE(f.stack_trace, f.error_message) AS context,
        f.failure_type, f.created_at,
        r.full_name AS repo_name
      FROM failures f
      LEFT JOIN repositories r ON f.repository_id = r.id
      WHERE NOT EXISTS (
        SELECT 1 FROM test_runs tr WHERE tr.repository_id = f.repository_id
      )
      ORDER BY f.created_at DESC
      LIMIT 10
    `);

    // Coverage trend (tests per day)
    const coverageTrend = await query(`
      SELECT
        DATE(created_at) AS date,
        COUNT(DISTINCT test_name) AS unique_tests,
        COUNT(*) AS total_runs,
        ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'passed') / NULLIF(COUNT(*), 0), 1) AS pass_rate
      FROM test_runs
      WHERE created_at > NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date
    `);

    // Overall stats
    const overallStats = await query(`
      SELECT
        COUNT(DISTINCT test_name) AS total_tests,
        COUNT(DISTINCT test_file) AS total_files,
        COUNT(*) AS total_runs,
        ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'passed') / NULLIF(COUNT(*), 0), 1) AS overall_pass_rate,
        COUNT(DISTINCT repository_id) AS repos_covered
      FROM test_runs
    `);

    const stats = overallStats.rows[0] || {};
    const totalTests = parseInt(stats.total_tests || 0);
    const totalFiles = parseInt(stats.total_files || 0);
    const passRate = parseFloat(stats.overall_pass_rate || 0);

    res.json({
      overview: {
        totalTests,
        totalFiles,
        totalRuns: parseInt(stats.total_runs || 0),
        overallPassRate: passRate,
        reposCovered: parseInt(stats.repos_covered || 0),
        coverageScore: Math.round(passRate * 0.7 + Math.min(totalTests, 100) * 0.3),
      },
      fileCoverage: fileCoverage.rows,
      untestedAreas: untestedFiles.rows,
      coverageTrend: coverageTrend.rows,
    });
  } catch (err) {
    logger.error('Test coverage fetch failed', { error: err.message });
    res.status(500).json({ error: 'Failed to fetch test coverage data' });
  }
});

// ── Org Stability Score: composite score from all data sources ──
router.get('/org-stability', requireAuth, requireFeature('quality_gates'), async (req, res) => {
  try {
    // Test reliability component
    const testReliability = await query(`
      SELECT
        ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'passed') / NULLIF(COUNT(*), 0), 1) AS pass_rate,
        COUNT(*) AS total_runs
      FROM test_runs
    `);

    // Repair success rate
    const repairSuccess = await query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'completed' AND sandbox_passed = true) AS successes,
        COUNT(*) AS total_repairs,
        ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'completed' AND sandbox_passed = true) / NULLIF(COUNT(*), 0), 1) AS success_rate
      FROM repairs
    `);

    // Fingerprint reuse rate (how often known patterns are matched)
    const fpReuse = await query(`
      SELECT
        ROUND(AVG(times_matched), 1) AS avg_reuse,
        ROUND(AVG(resolution_confidence), 0) AS avg_confidence,
        COUNT(*) AS total_fingerprints
      FROM fingerprints
    `);

    // Org preferences maturity
    const orgMaturity = await query(`
      SELECT
        COUNT(*) AS total_preferences,
        ROUND(AVG(confidence), 0) AS avg_confidence,
        SUM(times_applied) AS total_applications
      FROM org_preferences
    `);

    // Failure trend (are failures decreasing?)
    const failureTrend = await query(`
      SELECT
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') AS last_week,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '14 days' AND created_at <= NOW() - INTERVAL '7 days') AS prev_week
      FROM failures
    `);

    const passRate = parseFloat(testReliability.rows[0]?.pass_rate || 0);
    const repairRate = parseFloat(repairSuccess.rows[0]?.success_rate || 0);
    const fpConfidence = parseInt(fpReuse.rows[0]?.avg_confidence || 0);
    const orgConf = parseInt(orgMaturity.rows[0]?.avg_confidence || 0);
    const lastWeek = parseInt(failureTrend.rows[0]?.last_week || 0);
    const prevWeek = parseInt(failureTrend.rows[0]?.prev_week || 0);
    const trendImproving = lastWeek <= prevWeek;

    // Composite stability score (0-100)
    const stabilityScore = Math.round(
      (passRate * 0.30) +
      (repairRate * 0.25) +
      (fpConfidence * 0.20) +
      (orgConf * 0.15) +
      (trendImproving ? 10 : 0)
    );

    res.json({
      overview: {
        stabilityScore: Math.min(100, stabilityScore),
        testPassRate: passRate,
        repairSuccessRate: repairRate,
        fingerprintConfidence: fpConfidence,
        orgMemoryStrength: orgConf,
        failureTrend: trendImproving ? 'improving' : 'declining',
      },
      components: {
        testReliability: {
          score: Math.round(passRate),
          weight: '30%',
          totalRuns: parseInt(testReliability.rows[0]?.total_runs || 0),
        },
        repairEfficiency: {
          score: Math.round(repairRate),
          weight: '25%',
          totalRepairs: parseInt(repairSuccess.rows[0]?.total_repairs || 0),
          successes: parseInt(repairSuccess.rows[0]?.successes || 0),
        },
        patternIntelligence: {
          score: fpConfidence,
          weight: '20%',
          totalFingerprints: parseInt(fpReuse.rows[0]?.total_fingerprints || 0),
          avgReuse: parseFloat(fpReuse.rows[0]?.avg_reuse || 0),
        },
        orgMemory: {
          score: orgConf,
          weight: '15%',
          totalPreferences: parseInt(orgMaturity.rows[0]?.total_preferences || 0),
          totalApplications: parseInt(orgMaturity.rows[0]?.total_applications || 0),
        },
        failureTrend: {
          score: trendImproving ? 100 : 0,
          weight: '10%',
          lastWeekFailures: lastWeek,
          prevWeekFailures: prevWeek,
        },
      },
    });
  } catch (err) {
    logger.error('Org stability fetch failed', { error: err.message });
    res.status(500).json({ error: 'Failed to fetch org stability data' });
  }
});

// ── Autopsy Reports: failure analysis with root cause ──
router.get('/autopsy', requireAuth, requireFeature('reviews_enabled'), async (req, res) => {
  try {
    const reports = await query(`
      SELECT f.id, f.error_message, f.failure_type, f.branch, f.stack_trace,
             f.workflow_name, f.created_at,
             r.full_name AS repo_name,
             fp.hash AS fingerprint_hash, fp.times_matched AS historical_matches,
             fp.error_pattern, fp.resolution_confidence,
             fp.dependency_context->>'category' AS category,
             rep.patch_summary, rep.status AS repair_status
      FROM failures f
      LEFT JOIN repositories r ON f.repository_id = r.id
      LEFT JOIN repairs rep ON rep.failure_id = f.id
      LEFT JOIN fingerprints fp ON rep.fingerprint_id = fp.id
      ORDER BY f.created_at DESC
      LIMIT 50
    `);

    const autoResolved = reports.rows.filter(r => r.repair_status === 'completed').length;
    const uniqueCauses = new Set(reports.rows.map(r => r.fingerprint_hash).filter(Boolean)).size;

    res.json({
      overview: {
        totalReports: reports.rows.length,
        uniqueRootCauses: uniqueCauses,
        autoResolved: reports.rows.length > 0
          ? Math.round((autoResolved / reports.rows.length) * 100)
          : 0,
      },
      reports: reports.rows,
    });
  } catch (err) {
    logger.error('Autopsy fetch failed', { error: err.message });
    res.status(500).json({ error: 'Failed to fetch autopsy data' });
  }
});

// ── Flaky Tests: non-deterministic test detection ──
router.get('/flaky-tests', requireAuth, requireFeature('reviews_enabled'), async (req, res) => {
  try {
    const flakyTests = await query(`
      SELECT
        test_name, test_file,
        COUNT(*) AS total_runs,
        COUNT(*) FILTER (WHERE status = 'passed') AS passes,
        COUNT(*) FILTER (WHERE status = 'failed') AS failures,
        ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'failed') / NULLIF(COUNT(*), 0), 1) AS flake_rate,
        MAX(created_at) FILTER (WHERE status = 'failed') AS last_flake
      FROM test_runs
      GROUP BY test_name, test_file
      HAVING COUNT(*) FILTER (WHERE status = 'passed') > 0
        AND COUNT(*) FILTER (WHERE status = 'failed') > 0
      ORDER BY flake_rate DESC
      LIMIT 20
    `);

    const totalFlakeEvents = flakyTests.rows.reduce((s, t) => s + parseInt(t.failures || 0), 0);
    const avgFlakeRate = flakyTests.rows.length > 0
      ? (flakyTests.rows.reduce((s, t) => s + parseFloat(t.flake_rate || 0), 0) / flakyTests.rows.length).toFixed(1)
      : 0;

    res.json({
      overview: {
        flakyCount: flakyTests.rows.length,
        totalFlakeEvents,
        avgFlakeRate: parseFloat(avgFlakeRate),
      },
      tests: flakyTests.rows,
    });
  } catch (err) {
    logger.error('Flaky tests fetch failed', { error: err.message });
    res.status(500).json({ error: 'Failed to fetch flaky tests data' });
  }
});

// ── Runbook Agent: automation playbooks from org preferences ──
router.get('/runbook', requireAuth, requireFeature('reviews_enabled'), async (req, res) => {
  try {
    const userId = req.user.id;
    const playbooks = await query(
      `SELECT id, category AS trigger, rule AS name, confidence,
              times_applied AS runs, last_used_at AS last_run, source, created_at
       FROM org_preferences
       WHERE user_id = $1
       ORDER BY times_applied DESC`,
      [userId]
    );

    const totalRuns = playbooks.rows.reduce((s, p) => s + parseInt(p.runs || 0), 0);

    const recentActivity = await query(
      `SELECT id, rule, category, context, source, times_applied, created_at
       FROM learnings
       ORDER BY created_at DESC
       LIMIT 20`
    );

    res.json({
      overview: {
        totalPlaybooks: playbooks.rows.length,
        totalRuns,
        eventsProcessed: recentActivity.rows.length,
      },
      playbooks: playbooks.rows,
      recentActivity: recentActivity.rows,
    });
  } catch (err) {
    logger.error('Runbook fetch failed', { error: err.message });
    res.status(500).json({ error: 'Failed to fetch runbook data' });
  }
});

// ── PR Reviewer: code review stats ──
router.get('/pr-reviewer', requireAuth, requireFeature('reviews_enabled'), async (req, res) => {
  try {
    const userId = req.user.id;
    const reviews = await query(
      `SELECT id, pr_number, pr_title, pr_url, summary, risk_level,
              review_effort_level, inline_comments_count, review_data,
              created_at, repo_name
       FROM reviews
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 20`,
      [userId]
    );

    const totalReviews = reviews.rows.length;
    const issueBreakdown = reviews.rows.reduce((acc, r) => {
      const data = r.review_data || {};
      acc.critical += parseInt(data.critical_count || 0);
      acc.warnings += parseInt(data.warning_count || 0);
      acc.nitpicks += parseInt(data.nitpick_count || 0);
      return acc;
    }, { critical: 0, warnings: 0, nitpicks: 0 });

    const autoFixed = reviews.rows.filter(r =>
      r.review_data && r.review_data.auto_fixed
    ).length;

    res.json({
      overview: {
        totalReviews,
        totalIssues: issueBreakdown.critical + issueBreakdown.warnings + issueBreakdown.nitpicks,
        autoFixed,
        issueBreakdown,
      },
      reviews: reviews.rows,
    });
  } catch (err) {
    logger.error('PR Reviewer fetch failed', { error: err.message });
    res.status(500).json({ error: 'Failed to fetch PR reviewer data' });
  }
});

// ── Simulation Mode: dry-run repairs ──
router.get('/simulation', requireAuth, requireFeature('reviews_enabled'), async (req, res) => {
  try {
    const userId = req.user.id;
    const repoIds = await getUserRepoIds(userId);
    const repoIdList = repoIds.length > 0 ? repoIds : ['00000000-0000-0000-0000-000000000000'];

    const repairs = await query(
      `SELECT r.id, r.error_message, r.patch_summary, r.confidence_score,
              r.sandbox_passed, r.engine_used, r.status, r.created_at,
              repo.full_name AS repo_name
       FROM repairs r
       LEFT JOIN repositories repo ON repo.id = r.repository_id
       WHERE r.user_id = $1 OR r.repository_id = ANY($2::uuid[])
       ORDER BY r.created_at DESC
       LIMIT 20`,
      [userId, repoIdList]
    );

    res.json({
      overview: {
        totalSimulations: repairs.rows.length,
        passRate: repairs.rows.length > 0
          ? Math.round((repairs.rows.filter(r => r.sandbox_passed).length / repairs.rows.length) * 100)
          : 0,
      },
      repairs: repairs.rows,
    });
  } catch (err) {
    logger.error('Simulation fetch failed', { error: err.message });
    res.status(500).json({ error: 'Failed to fetch simulation data' });
  }
});

// ── Insights: combined analytics dashboard ──
router.get('/insights', requireAuth, requireFeature('reviews_enabled'), async (req, res) => {
  try {
    const fingerprints = await query(`
      SELECT hash, error_pattern AS pattern, times_matched AS count,
             last_matched_at AS last_seen, resolution_confidence AS confidence
      FROM fingerprints
      ORDER BY times_matched DESC LIMIT 10
    `);

    const flakyTests = await query(`
      SELECT test_name AS name, test_file AS file,
             ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'failed') / NULLIF(COUNT(*), 0), 1) AS flake_rate,
             COUNT(*) AS runs,
             MAX(created_at) FILTER (WHERE status = 'failed') AS last_flake
      FROM test_runs
      GROUP BY test_name, test_file
      HAVING COUNT(*) FILTER (WHERE status = 'failed') > 0
      ORDER BY flake_rate DESC LIMIT 5
    `);

    const failureFiles = await query(`
      SELECT test_file AS path,
             COUNT(*) FILTER (WHERE status = 'failed') AS failures,
             ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'failed') / NULLIF(COUNT(*), 0), 1) AS pct,
             MAX(created_at) FILTER (WHERE status = 'failed') AS last_fail
      FROM test_runs
      WHERE test_file IS NOT NULL
      GROUP BY test_file
      HAVING COUNT(*) FILTER (WHERE status = 'failed') > 0
      ORDER BY failures DESC LIMIT 5
    `);

    res.json({
      fingerprints: fingerprints.rows,
      flakyTests: flakyTests.rows,
      failureFiles: failureFiles.rows,
    });
  } catch (err) {
    logger.error('Insights fetch failed', { error: err.message });
    res.status(500).json({ error: 'Failed to fetch insights data' });
  }
});

// ── Static Auto-Fixes: repair engine stats ──
router.get('/static-fixes', requireAuth, requireFeature('dead_code_detection'), async (req, res) => {
  try {
    const engineStats = await query(`
      SELECT engine_used AS name,
             COUNT(*) AS fixes,
             COUNT(*) FILTER (WHERE sandbox_passed = true) AS successes,
             MAX(created_at) AS last_run
      FROM repairs
      WHERE engine_used IS NOT NULL
      GROUP BY engine_used
      ORDER BY fixes DESC
    `);

    res.json({
      tools: engineStats.rows,
      overview: {
        totalTools: engineStats.rows.length,
        totalFixes: engineStats.rows.reduce((s, t) => s + parseInt(t.fixes || 0), 0),
      },
    });
  } catch (err) {
    logger.error('Static fixes fetch failed', { error: err.message });
    res.status(500).json({ error: 'Failed to fetch static fixes data' });
  }
});

// ── Cookbook: repair patterns & recipes from fingerprints ──
router.get('/cookbook', requireAuth, requireFeature('custom_rules'), async (req, res) => {
  try {
    const recipes = await query(`
      SELECT hash, error_pattern AS title,
             dependency_context->>'framework' AS framework,
             dependency_context->>'category' AS category,
             resolution_confidence AS confidence,
             times_matched AS uses,
             last_matched_at AS last_used
      FROM fingerprints
      WHERE resolution_confidence >= 70
      ORDER BY times_matched DESC
      LIMIT 20
    `);

    const categories = await query(`
      SELECT dependency_context->>'category' AS category,
             COUNT(*) AS count
      FROM fingerprints
      WHERE dependency_context->>'category' IS NOT NULL
      GROUP BY dependency_context->>'category'
      ORDER BY count DESC
    `);

    res.json({
      overview: {
        totalRecipes: recipes.rows.length,
        categories: categories.rows.length,
      },
      recipes: recipes.rows,
      categories: categories.rows,
    });
  } catch (err) {
    logger.error('Cookbook fetch failed', { error: err.message });
    res.status(500).json({ error: 'Failed to fetch cookbook data' });
  }
});

// ── Seed endpoint: populate intelligence data (call once) ──
router.post('/seed', async (req, res) => {
  try {
    // Check if already seeded
    const fpCount = await query('SELECT COUNT(*) AS count FROM fingerprints');
    if (parseInt(fpCount.rows[0].count) > 10) {
      return res.json({ message: 'Already seeded', fingerprints: parseInt(fpCount.rows[0].count) });
    }

    const userRes = await query('SELECT id FROM users LIMIT 1');
    const repoRes = await query('SELECT id FROM repositories LIMIT 1');
    const userId = userRes.rows[0]?.id;
    const repoId = repoRes.rows[0]?.id;

    if (!userId) {
      return res.status(400).json({ error: 'No user found. Login first.' });
    }

    // Fingerprints
    const FINGERPRINTS = [
      { hash: 'ts2345-arg-type-mismatch', pattern: "TS2345: Argument of type '{A}' is not assignable to parameter of type '{B}'", confidence: 96, times: 2847, context: { framework: 'typescript', category: 'type_error' } },
      { hash: 'ts2322-type-not-assignable', pattern: "TS2322: Type '{A}' is not assignable to type '{B}'", confidence: 94, times: 3201, context: { framework: 'typescript', category: 'type_error' } },
      { hash: 'ts2339-property-not-exist', pattern: "TS2339: Property '{prop}' does not exist on type '{T}'", confidence: 91, times: 1893, context: { framework: 'typescript', category: 'type_error' } },
      { hash: 'ts2307-module-not-found', pattern: "TS2307: Cannot find module '{module}' or its corresponding type declarations", confidence: 89, times: 1456, context: { framework: 'typescript', category: 'import_error' } },
      { hash: 'ts7006-implicit-any', pattern: "TS7006: Parameter '{param}' implicitly has an 'any' type", confidence: 97, times: 2103, context: { framework: 'typescript', category: 'type_error' } },
      { hash: 'ts2614-module-no-export', pattern: "TS2614: Module '{module}' has no exported member '{member}'", confidence: 88, times: 987, context: { framework: 'typescript', category: 'import_error' } },
      { hash: 'ts18046-unknown-type', pattern: "TS18046: '{var}' is of type 'unknown'", confidence: 92, times: 756, context: { framework: 'typescript', category: 'type_error' } },
      { hash: 'ts2554-expected-args', pattern: "TS2554: Expected {n} arguments, but got {m}", confidence: 95, times: 1678, context: { framework: 'typescript', category: 'type_error' } },
      { hash: 'eslint-no-unused-vars', pattern: "'{var}' is defined but never used (@typescript-eslint/no-unused-vars)", confidence: 99, times: 4521, context: { framework: 'eslint', category: 'lint_error' } },
      { hash: 'eslint-import-no-unresolved', pattern: "Unable to resolve path to module '{module}' (import/no-unresolved)", confidence: 87, times: 1234, context: { framework: 'eslint', category: 'lint_error' } },
      { hash: 'eslint-react-hooks-deps', pattern: "React Hook {hook} has a missing dependency: '{dep}' (react-hooks/exhaustive-deps)", confidence: 83, times: 2345, context: { framework: 'eslint', category: 'lint_error' } },
      { hash: 'prettier-format-diff', pattern: "Code style issues found in {n} files. Run Prettier to fix.", confidence: 99, times: 5678, context: { framework: 'prettier', category: 'lint_error' } },
      { hash: 'eslint-no-explicit-any', pattern: "Unexpected any. Specify a different type (@typescript-eslint/no-explicit-any)", confidence: 90, times: 1890, context: { framework: 'eslint', category: 'lint_error' } },
      { hash: 'jest-expect-received', pattern: "expect(received).toBe(expected) // Object.is equality", confidence: 78, times: 3456, context: { framework: 'jest', category: 'test_failure' } },
      { hash: 'jest-snapshot-mismatch', pattern: "Snapshot Summary: {n} snapshots failed from {m} test suites", confidence: 85, times: 1567, context: { framework: 'jest', category: 'test_failure' } },
      { hash: 'jest-timeout', pattern: "Exceeded timeout of {ms}ms for a test.", confidence: 72, times: 2890, context: { framework: 'jest', category: 'test_failure' } },
      { hash: 'jest-cannot-find-module', pattern: "Cannot find module '{module}' from '{file}'", confidence: 91, times: 1234, context: { framework: 'jest', category: 'test_failure' } },
      { hash: 'vitest-assertion-failed', pattern: "AssertionError: expected {a} to deeply equal {b}", confidence: 80, times: 987, context: { framework: 'vitest', category: 'test_failure' } },
      { hash: 'cypress-element-not-found', pattern: "Timed out retrying after {ms}ms: Expected to find element: '{selector}'", confidence: 68, times: 2345, context: { framework: 'cypress', category: 'test_failure' } },
      { hash: 'playwright-locator-timeout', pattern: "locator.click: Timeout {ms}ms exceeded.", confidence: 70, times: 1456, context: { framework: 'playwright', category: 'test_failure' } },
      { hash: 'next-build-page-error', pattern: "Build error occurred: Export encountered errors on following paths", confidence: 82, times: 1678, context: { framework: 'nextjs', category: 'build_error' } },
      { hash: 'webpack-module-not-found', pattern: "Module not found: Can't resolve '{module}' in '{dir}'", confidence: 90, times: 2567, context: { framework: 'webpack', category: 'build_error' } },
      { hash: 'vite-resolve-failed', pattern: 'Failed to resolve import "{module}" from "{file}"', confidence: 88, times: 1234, context: { framework: 'vite', category: 'build_error' } },
      { hash: 'docker-build-failed', pattern: "ERROR: failed to solve: process did not complete successfully", confidence: 76, times: 1567, context: { framework: 'docker', category: 'build_error' } },
      { hash: 'go-build-undefined', pattern: "{file}: undefined: {symbol}", confidence: 93, times: 1345, context: { framework: 'go', category: 'build_error' } },
      { hash: 'rust-cargo-compile', pattern: "error[E{code}]: {message}", confidence: 87, times: 978, context: { framework: 'rust', category: 'build_error' } },
      { hash: 'npm-peer-dep-conflict', pattern: "npm ERR! Could not resolve dependency: peer {dep} from {pkg}", confidence: 84, times: 3456, context: { framework: 'npm', category: 'dependency_error' } },
      { hash: 'npm-enoent', pattern: "npm ERR! enoent ENOENT: no such file or directory", confidence: 92, times: 1234, context: { framework: 'npm', category: 'dependency_error' } },
      { hash: 'yarn-resolution-fail', pattern: 'error Couldn\'t find any versions for "{package}"', confidence: 86, times: 1678, context: { framework: 'yarn', category: 'dependency_error' } },
      { hash: 'pnpm-peer-dep-issue', pattern: "ERR_PNPM_PEER_DEP_ISSUES Unmet peer dependencies", confidence: 81, times: 2345, context: { framework: 'pnpm', category: 'dependency_error' } },
      { hash: 'pip-no-matching-dist', pattern: "ERROR: No matching distribution found for {package}=={version}", confidence: 88, times: 1567, context: { framework: 'pip', category: 'dependency_error' } },
      { hash: 'go-mod-tidy-sum', pattern: "verifying {module}: checksum mismatch", confidence: 90, times: 789, context: { framework: 'go', category: 'dependency_error' } },
      { hash: 'node-cannot-read-null', pattern: "TypeError: Cannot read properties of null (reading '{prop}')", confidence: 79, times: 4567, context: { framework: 'node', category: 'runtime_error' } },
      { hash: 'node-cannot-read-undefined', pattern: "TypeError: Cannot read properties of undefined (reading '{prop}')", confidence: 78, times: 5234, context: { framework: 'node', category: 'runtime_error' } },
      { hash: 'node-not-a-function', pattern: "TypeError: {expr} is not a function", confidence: 82, times: 2345, context: { framework: 'node', category: 'runtime_error' } },
      { hash: 'python-import-error', pattern: "ModuleNotFoundError: No module named '{module}'", confidence: 91, times: 1890, context: { framework: 'python', category: 'runtime_error' } },
      { hash: 'python-attribute-error', pattern: "AttributeError: '{type}' object has no attribute '{attr}'", confidence: 83, times: 2456, context: { framework: 'python', category: 'runtime_error' } },
      { hash: 'java-null-pointer', pattern: 'java.lang.NullPointerException', confidence: 77, times: 3123, context: { framework: 'java', category: 'runtime_error' } },
      { hash: 'ruby-no-method', pattern: "NoMethodError: undefined method '{method}'", confidence: 80, times: 1234, context: { framework: 'ruby', category: 'runtime_error' } },
      { hash: 'gh-actions-timeout', pattern: "The job running on runner has exceeded the maximum execution time", confidence: 65, times: 1890, context: { framework: 'github_actions', category: 'infra_error' } },
      { hash: 'gh-actions-rate-limit', pattern: "API rate limit exceeded for installation ID {id}", confidence: 71, times: 1234, context: { framework: 'github_actions', category: 'infra_error' } },
      { hash: 'docker-pull-rate-limit', pattern: "toomanyrequests: You have reached your pull rate limit", confidence: 88, times: 2567, context: { framework: 'docker', category: 'infra_error' } },
      { hash: 'oom-killed', pattern: "Process completed with exit code 137 (OOMKilled)", confidence: 73, times: 1678, context: { framework: 'ci', category: 'infra_error' } },
      { hash: 'disk-space-exhausted', pattern: "No space left on device", confidence: 85, times: 1456, context: { framework: 'ci', category: 'infra_error' } },
      { hash: 'npm-audit-critical', pattern: "{n} critical severity vulnerabilities found", confidence: 92, times: 2345, context: { framework: 'npm', category: 'security_error' } },
      { hash: 'snyk-vuln-found', pattern: "Tested {n} dependencies for known vulnerabilities, found {m}", confidence: 86, times: 1567, context: { framework: 'snyk', category: 'security_error' } },
      { hash: 'trivy-cve-detected', pattern: "Total: {n} (CRITICAL: {c}, HIGH: {h})", confidence: 89, times: 890, context: { framework: 'trivy', category: 'security_error' } },
      { hash: 'next-server-component-client', pattern: 'Error: useState only works in Client Components. Add the "use client" directive', confidence: 96, times: 2567, context: { framework: 'nextjs', category: 'build_error' } },
      { hash: 'next-dynamic-server-usage', pattern: "Error: Dynamic server usage. This page could not be rendered statically", confidence: 87, times: 1678, context: { framework: 'nextjs', category: 'build_error' } },
      { hash: 'ruff-lint-errors', pattern: "Found {n} errors. [{codes}]", confidence: 98, times: 3456, context: { framework: 'ruff', category: 'lint_error' } },
      { hash: 'mypy-type-error', pattern: "error: {msg} [type-arg]", confidence: 87, times: 1890, context: { framework: 'mypy', category: 'type_error' } },
      { hash: 'pytest-assertion-error', pattern: "AssertionError: assert {actual} == {expected}", confidence: 79, times: 2345, context: { framework: 'pytest', category: 'test_failure' } },
      { hash: 'black-format-diff', pattern: "Oh no! {n} files would be reformatted", confidence: 99, times: 4567, context: { framework: 'black', category: 'lint_error' } },
      { hash: 'terraform-plan-error', pattern: "Error: {msg} on {file} line {n}", confidence: 81, times: 1234, context: { framework: 'terraform', category: 'build_error' } },
      { hash: 'helm-lint-error', pattern: "Error: {n} chart(s) linted, {m} chart(s) failed", confidence: 84, times: 678, context: { framework: 'helm', category: 'lint_error' } },
    ];

    for (const fp of FINGERPRINTS) {
      await query(`
        INSERT INTO fingerprints (hash, error_pattern, dependency_context, resolution_confidence, times_matched, last_matched_at, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW() - (random() * interval '30 days'), NOW() - (random() * interval '180 days'))
        ON CONFLICT (hash) DO UPDATE SET
          times_matched = EXCLUDED.times_matched,
          resolution_confidence = EXCLUDED.resolution_confidence,
          dependency_context = EXCLUDED.dependency_context
      `, [fp.hash, fp.pattern, JSON.stringify(fp.context), fp.confidence, fp.times]);
    }

    // Test runs
    const TEST_PATTERNS = [
      { name: 'should process payment correctly', file: 'src/payments/__tests__/process.test.ts', passRate: 0.992 },
      { name: 'renders user profile card', file: 'src/components/__tests__/profile.test.tsx', passRate: 0.978 },
      { name: 'handles WebSocket reconnection', file: 'src/ws/__tests__/reconnect.test.ts', passRate: 0.85 },
      { name: 'concurrent file upload tracking', file: 'src/upload/__tests__/concurrent.test.ts', passRate: 0.823 },
      { name: 'dashboard data aggregation', file: 'src/api/__tests__/aggregate.test.ts', passRate: 0.775 },
      { name: 'E2E checkout flow', file: 'tests/e2e/checkout.spec.ts', passRate: 0.715 },
      { name: 'SSR hydration consistency', file: 'tests/ssr/hydration.test.tsx', passRate: 0.96 },
      { name: 'validates email format correctly', file: 'src/utils/__tests__/validation.test.ts', passRate: 0.998 },
      { name: 'handles rate limiting gracefully', file: 'src/middleware/__tests__/rateLimit.test.ts', passRate: 0.912 },
      { name: 'database connection pool management', file: 'src/db/__tests__/pool.test.ts', passRate: 0.945 },
      { name: 'JWT token refresh flow', file: 'src/auth/__tests__/refresh.test.ts', passRate: 0.889 },
      { name: 'handles concurrent API requests', file: 'src/api/__tests__/concurrent.test.ts', passRate: 0.834 },
      { name: 'image resize and optimization', file: 'src/media/__tests__/resize.test.ts', passRate: 0.956 },
      { name: 'search indexing pipeline', file: 'src/search/__tests__/index.test.ts', passRate: 0.901 },
      { name: 'notification delivery reliability', file: 'src/notifications/__tests__/deliver.test.ts', passRate: 0.867 },
      { name: 'renders data table with pagination', file: 'src/components/__tests__/DataTable.test.tsx', passRate: 0.973 },
      { name: 'handles form submission with validation', file: 'src/components/__tests__/Form.test.tsx', passRate: 0.981 },
      { name: 'cron job scheduling accuracy', file: 'src/cron/__tests__/scheduler.test.ts', passRate: 0.756 },
      { name: 'cache invalidation on data change', file: 'src/cache/__tests__/invalidation.test.ts', passRate: 0.893 },
      { name: 'GraphQL resolver N+1 query prevention', file: 'src/graphql/__tests__/resolvers.test.ts', passRate: 0.921 },
      { name: 'handles timezone conversions', file: 'src/utils/__tests__/timezone.test.ts', passRate: 0.943 },
      { name: 'PDF report generation', file: 'src/reports/__tests__/pdf.test.ts', passRate: 0.878 },
      { name: 'webhook retry with exponential backoff', file: 'src/webhooks/__tests__/retry.test.ts', passRate: 0.812 },
      { name: 'OAuth2 PKCE flow', file: 'src/auth/__tests__/oauth-pkce.test.ts', passRate: 0.934 },
      { name: 'CSV import with large files', file: 'src/import/__tests__/csv.test.ts', passRate: 0.789 },
      { name: 'renders chart with real-time updates', file: 'src/components/__tests__/Chart.test.tsx', passRate: 0.967 },
      { name: 'handles multi-tenant data isolation', file: 'src/tenant/__tests__/isolation.test.ts', passRate: 0.978 },
      { name: 'Stripe webhook signature verification', file: 'src/billing/__tests__/webhook.test.ts', passRate: 0.995 },
      { name: 'database migration rollback safety', file: 'src/db/__tests__/migration.test.ts', passRate: 0.856 },
      { name: 'Redis pub/sub message ordering', file: 'src/pubsub/__tests__/ordering.test.ts', passRate: 0.823 },
    ];

    if (repoId) {
      await query('DELETE FROM test_runs WHERE repository_id = $1', [repoId]);
      let testRunCount = 0;
      for (const test of TEST_PATTERNS) {
        const totalRuns = Math.floor(80 + Math.random() * 420);
        for (let i = 0; i < totalRuns; i++) {
          const passed = Math.random() < test.passRate;
          const ts = new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000);
          await query(`
            INSERT INTO test_runs (repository_id, test_name, test_file, status, duration_ms, created_at)
            VALUES ($1, $2, $3, $4, $5, $6)
          `, [repoId, test.name, test.file, passed ? 'passed' : 'failed', Math.floor(50 + Math.random() * 5000), ts.toISOString()]);
          testRunCount++;
        }
      }
      logger.info(`Seeded ${testRunCount} test runs`);
    }

    // Org preferences
    const ORG_PREFS = [
      { category: 'Package Manager', rule: 'Always prefer pnpm over npm for dependency fixes', confidence: 98, source: 'pr_feedback', times: 12 },
      { category: 'Linting', rule: 'Use --fix for ESLint errors, never --disable-next-line', confidence: 95, source: 'pr_rejection', times: 8 },
      { category: 'Testing', rule: 'Jest tests use describe/it pattern with explicit assertions', confidence: 89, source: 'config_import', times: 5 },
      { category: 'Docker', rule: 'Dockerfile base image updates require manual sign-off', confidence: 100, source: 'pr_rejection', times: 3 },
      { category: 'TypeScript', rule: 'Prefer explicit return types on exported functions', confidence: 82, source: 'pr_feedback', times: 4 },
      { category: 'CI Config', rule: 'GitHub Actions should use pinned action versions (not @latest)', confidence: 91, source: 'pr_feedback', times: 2 },
      { category: 'Flaky Tests', rule: 'Tests in DatePicker.test.tsx are known flaky — skip quarantine', confidence: 100, source: 'team_annotation', times: 1 },
      { category: 'Dependencies', rule: 'Always run pnpm audit fix after dependency updates', confidence: 87, source: 'pr_feedback', times: 6 },
      { category: 'Git', rule: 'Commit messages follow Conventional Commits format', confidence: 94, source: 'config_import', times: 15 },
      { category: 'Code Style', rule: 'Max line length 100 chars, 2-space indentation, trailing commas', confidence: 96, source: 'config_import', times: 20 },
      { category: 'Testing', rule: 'E2E tests should use data-testid attributes, not CSS selectors', confidence: 88, source: 'pr_feedback', times: 4 },
      { category: 'Security', rule: 'Never commit .env files or hardcoded secrets', confidence: 100, source: 'pr_rejection', times: 7 },
      { category: 'API Design', rule: 'REST endpoints return 204 for empty responses', confidence: 79, source: 'pr_feedback', times: 3 },
      { category: 'Error Handling', rule: 'Always use structured error types, never throw raw strings', confidence: 86, source: 'pr_feedback', times: 5 },
      { category: 'Database', rule: 'PostgreSQL migrations use IF NOT EXISTS to be idempotent', confidence: 93, source: 'pr_feedback', times: 9 },
      { category: 'React', rule: 'Prefer named exports over default exports for components', confidence: 81, source: 'pr_feedback', times: 4 },
      { category: 'React', rule: 'Use React.memo() only when profiler shows render bottleneck', confidence: 77, source: 'pr_feedback', times: 2 },
      { category: 'TypeScript', rule: 'Avoid enums; prefer const objects with as const', confidence: 84, source: 'pr_feedback', times: 6 },
      { category: 'Testing', rule: 'Mock external APIs at the HTTP boundary, not function level', confidence: 90, source: 'pr_feedback', times: 7 },
      { category: 'CI Config', rule: 'Cache node_modules with pnpm store path', confidence: 88, source: 'pr_feedback', times: 3 },
      { category: 'Monitoring', rule: 'Add structured logging with correlation IDs for all API endpoints', confidence: 85, source: 'pr_feedback', times: 4 },
      { category: 'Dependencies', rule: 'Pin major versions in package.json', confidence: 97, source: 'config_import', times: 11 },
      { category: 'Docker', rule: 'Use multi-stage builds for production Docker images', confidence: 91, source: 'pr_feedback', times: 5 },
      { category: 'Terraform', rule: 'Always run terraform plan before apply in CI', confidence: 100, source: 'config_import', times: 8 },
    ];

    await query('DELETE FROM org_preferences WHERE user_id = $1', [userId]);
    for (const pref of ORG_PREFS) {
      await query(`
        INSERT INTO org_preferences (user_id, category, rule, confidence, source, times_applied, last_used_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW() - (random() * interval '7 days'))
      `, [userId, pref.category, pref.rule, pref.confidence, pref.source, pref.times]);
    }

    // Network predictions
    const PREDICTIONS = [
      { type: 'build_error', desc: "Touching next.config.js with output: 'export' + API routes", prob: 87, cat: 'Build Error', prs: 2400, repos: 340, prevented: 142, suggestion: "API routes are incompatible with static export." },
      { type: 'dependency_conflict', desc: 'Upgrading react to 19.x without updating react-dom', prob: 94, cat: 'Dependency Conflict', prs: 1823, repos: 289, prevented: 231, suggestion: 'Always upgrade react and react-dom together.' },
      { type: 'runtime_error', desc: 'Adding new env var in code without updating CI workflow', prob: 73, cat: 'Runtime Error', prs: 3156, repos: 521, prevented: 89, suggestion: 'Add the new environment variable to your GitHub Actions workflow.' },
      { type: 'test_failure', desc: 'Jest config change with --coverage flag on Node 20+', prob: 68, cat: 'Test Failure', prs: 892, repos: 156, prevented: 67, suggestion: 'Node 20 changed V8 coverage internals.' },
      { type: 'infra_error', desc: 'Terraform provider version constraint change without lock file update', prob: 91, cat: 'Infrastructure Error', prs: 1234, repos: 198, prevented: 178, suggestion: 'Run terraform init -upgrade && terraform providers lock.' },
      { type: 'build_error', desc: 'Adding Server Component import to Client Component file', prob: 89, cat: 'Build Error', prs: 1567, repos: 234, prevented: 112, suggestion: "Add 'use client' directive to the imported module." },
      { type: 'dependency_conflict', desc: 'Updating TypeScript to 5.x without updating @types/node', prob: 82, cat: 'Dependency Conflict', prs: 1345, repos: 201, prevented: 98, suggestion: 'Run: pnpm add -D @types/node@latest.' },
      { type: 'test_failure', desc: 'Changing database schema without updating test fixtures', prob: 76, cat: 'Test Failure', prs: 2890, repos: 412, prevented: 156, suggestion: 'Update test fixtures and factory functions.' },
      { type: 'security_error', desc: 'Introducing eval() or Function() constructor in PR diff', prob: 95, cat: 'Security Error', prs: 567, repos: 123, prevented: 45, suggestion: 'Replace eval() with safer alternatives.' },
      { type: 'build_error', desc: 'Webpack 5 migration with deprecated CommonsChunkPlugin', prob: 84, cat: 'Build Error', prs: 890, repos: 167, prevented: 73, suggestion: 'Replace CommonsChunkPlugin with optimization.splitChunks.' },
      { type: 'runtime_error', desc: 'Using optional chaining on method call without null check', prob: 71, cat: 'Runtime Error', prs: 4567, repos: 678, prevented: 234, suggestion: 'Add explicit null guard before method invocation.' },
      { type: 'dependency_conflict', desc: 'Mixing ESM and CJS imports in the same module', prob: 79, cat: 'Dependency Conflict', prs: 2345, repos: 345, prevented: 167, suggestion: 'Standardize on ESM or CJS.' },
    ];

    await query('DELETE FROM network_predictions');
    for (const pred of PREDICTIONS) {
      await query(`
        INSERT INTO network_predictions (pattern_type, description, probability, category, based_on_prs, based_on_repos, times_prevented, suggestion, last_triggered_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW() - (random() * interval '3 days'))
      `, [pred.type, pred.desc, pred.prob, pred.cat, pred.prs, pred.repos, pred.prevented, pred.suggestion]);
    }

    // Monthly genome stats
    const MONTHS = [
      { month: 'Apr 2026', np: 342, matches: 8921, conf: 87, top: 'type_error' },
      { month: 'Mar 2026', np: 298, matches: 7843, conf: 85, top: 'build_error' },
      { month: 'Feb 2026', np: 267, matches: 6512, conf: 83, top: 'runtime_error' },
      { month: 'Jan 2026', np: 231, matches: 5234, conf: 81, top: 'lint_error' },
      { month: 'Dec 2025', np: 214, matches: 4890, conf: 80, top: 'dependency_error' },
      { month: 'Nov 2025', np: 198, matches: 4321, conf: 78, top: 'test_failure' },
      { month: 'Oct 2025', np: 187, matches: 3876, conf: 77, top: 'type_error' },
      { month: 'Sep 2025', np: 165, matches: 3234, conf: 75, top: 'build_error' },
      { month: 'Aug 2025', np: 143, matches: 2789, conf: 73, top: 'runtime_error' },
      { month: 'Jul 2025', np: 128, matches: 2345, conf: 71, top: 'lint_error' },
      { month: 'Jun 2025', np: 112, matches: 1890, conf: 69, top: 'dependency_error' },
      { month: 'May 2025', np: 98, matches: 1456, conf: 67, top: 'test_failure' },
    ];

    await query('DELETE FROM genome_monthly_stats');
    for (const s of MONTHS) {
      await query(`
        INSERT INTO genome_monthly_stats (month_year, new_patterns, total_matches, avg_confidence, top_category)
        VALUES ($1, $2, $3, $4, $5)
      `, [s.month, s.np, s.matches, s.conf, s.top]);
    }

    res.json({
      message: 'Seed complete',
      fingerprints: FINGERPRINTS.length,
      orgPreferences: ORG_PREFS.length,
      networkPredictions: PREDICTIONS.length,
      monthlyStats: MONTHS.length,
      testPatterns: TEST_PATTERNS.length,
    });
  } catch (err) {
    logger.error('Seed failed', { error: err.message });
    res.status(500).json({ error: 'Seed failed: ' + err.message });
  }
});

module.exports = router;
