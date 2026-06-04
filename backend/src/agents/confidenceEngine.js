function computeConfidence({ sandboxPassed, sandboxVerified, patchSize, fingerprintReuse, classification }) {
  let score = 0;

  // Sandbox result is the strongest signal — but ONLY when it was a REAL test
  // run (verified). A lightweight/structural pass (non-Node, or toolchain
  // unavailable) is a weak signal and must never earn an auto-merge.
  if (sandboxPassed && sandboxVerified) {
    score += 50;
  } else if (sandboxPassed) {
    score += 20; // unverified — well-formed patch, but tests were not run
  }

  // Fingerprint reuse means this fix has worked before
  if (fingerprintReuse) {
    score += 25;
  }

  // Smaller patches are more likely to be correct
  if (patchSize < 500) {
    score += 10;
  } else if (patchSize < 2000) {
    score += 5;
  }

  // Classification confidence bonus
  if (classification.confidence > 0.8) {
    score += 10;
  } else if (classification.confidence > 0.5) {
    score += 5;
  }

  // Severity adjustment
  const severityBonus = {
    low: 5,
    medium: 0,
    high: -5,
    critical: -10,
  };
  score += severityBonus[classification.severity] || 0;

  score = Math.max(0, Math.min(100, score));

  // An unverified sandbox result can never recommend auto-merge, regardless of
  // the numeric score — we did not actually prove the tests pass.
  let recommendation = score >= 70 ? 'auto_merge' : score >= 40 ? 'review_suggested' : 'manual_review_required';
  if (!(sandboxPassed && sandboxVerified) && recommendation === 'auto_merge') {
    recommendation = 'review_suggested';
  }

  return {
    score,
    verified: !!(sandboxPassed && sandboxVerified),
    breakdown: {
      sandbox: sandboxPassed && sandboxVerified ? 50 : sandboxPassed ? 20 : 0,
      fingerprint: fingerprintReuse ? 25 : 0,
      patch_size: patchSize < 500 ? 10 : patchSize < 2000 ? 5 : 0,
      classification: classification.confidence > 0.8 ? 10 : classification.confidence > 0.5 ? 5 : 0,
      severity: severityBonus[classification.severity] || 0,
    },
    recommendation,
  };
}

// The auto-PR gate. A repair PR may ONLY be opened when the sandbox actually RAN
// the repo's real test suite (verified) AND it passed. A lightweight/structural
// pass (unverified — no test runner for the language, or the toolchain was
// unavailable) is NOT sufficient: shipping unverified "fixes" is precisely what
// produced 137 opened PRs with 0 merges. Gating on `passed` alone let an
// unverified patch clear the bar whenever bonuses (fingerprint reuse, small
// patch, classification) pushed the numeric score >= 40. Requiring `verified`
// makes "we actually proved the tests pass" the permanent, non-bypassable bar.
function shouldAutoOpenPR({ score, sandboxPassed, sandboxVerified }) {
  return !!(sandboxPassed && sandboxVerified && score >= 40);
}

module.exports = { computeConfidence, shouldAutoOpenPR };
