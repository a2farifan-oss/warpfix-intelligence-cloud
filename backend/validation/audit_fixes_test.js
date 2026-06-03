// Deterministic unit tests for the audit-remediation fixes (P0+P1). Each case
// is taken from a REAL incident found in the production audit. Run:
//   node validation/audit_fixes_test.js
const assert = require('assert');
const { classifyActionability } = require('../src/agents/actionability');
const { dedupDecision } = require('../src/agents/prDedup');
const { computeConfidence } = require('../src/agents/confidenceEngine');
const { validatePatchSafety, recoverBareFileRewrite } = require('../src/agents/patchGenerator');

let pass = 0, fail = 0;
function check(name, fn) {
  try { fn(); pass++; console.log(`  ok   ${name}`); }
  catch (e) { fail++; console.log(`  FAIL ${name}\n       ${e.message}`); }
}

console.log('\n== P0.2/P0.3 actionability (noise + infra routing) ==');

check('curl flag --fail-with-body is NOT a code bug (rebal-style)', () => {
  const r = classifyActionability({ errorMessage: 'curl: option --fail-with-body is unknown', rawLog: 'curl: option --fail-with-body is unknown' });
  assert.strictEqual(r.actionable, false);
});

check('npm warn deprecated is noise, not a fix (secure-drop-style)', () => {
  const r = classifyActionability({ errorMessage: 'npm warn deprecated domexception@4.0.0: Use your platform native DOMException', rawLog: 'npm warn deprecated domexception@4.0.0' });
  assert.strictEqual(r.actionable, false);
  assert.strictEqual(r.klass, 'noise');
});

check('JSON "errorcode":"Not Found" blob is noise', () => {
  const r = classifyActionability({ errorMessage: '{"errorcode":"Not Found","message":"resource missing"}', rawLog: '{"errorcode":"Not Found"}' });
  assert.strictEqual(r.actionable, false);
});

check('git submodule URL error routes to infra, not a patch', () => {
  const r = classifyActionability({ errorMessage: 'fatal: No url found for submodule path "vendor/lib" in .gitmodules', rawLog: 'No url found for submodule' });
  assert.strictEqual(r.actionable, false);
  assert.strictEqual(r.klass, 'infra');
});

check('missing SUPABASE_URL env var routes to infra (rebal real case)', () => {
  const r = classifyActionability({ errorMessage: 'Error: SUPABASE_URL is not set', rawLog: 'SUPABASE_URL is missing' });
  assert.strictEqual(r.actionable, false);
  assert.strictEqual(r.klass, 'infra');
});

check('no pnpm version specified routes to infra', () => {
  const r = classifyActionability({ errorMessage: 'Error: No pnpm version is specified', rawLog: 'specify it via packageManager' });
  assert.strictEqual(r.klass, 'infra');
});

check('ECONNREFUSED network failure routes to infra', () => {
  const r = classifyActionability({ errorMessage: 'connect ECONNREFUSED 127.0.0.1:5432', rawLog: 'ECONNREFUSED' });
  assert.strictEqual(r.klass, 'infra');
});

check('env-var failure is NOT mis-attributed to submodule when CI log has "git submodule foreach" (regression)', () => {
  // GitHub Actions checkout logs "git submodule foreach ..." even with submodules:false.
  const rawLog = [
    '2026-06-02T21:49:40Z /usr/bin/git submodule foreach --recursive git config --local',
    '2026-06-02T21:49:45Z   throw new Error(\'SUPABASE_URL is not set\');',
    '2026-06-02T21:49:45Z Error: SUPABASE_URL is not set',
  ].join('\n');
  const r = classifyActionability({ errorMessage: 'Error: SUPABASE_URL is not set', rootCause: 'SUPABASE_URL is not set', rawLog });
  assert.strictEqual(r.actionable, false);
  assert.ok(/secret|environment variable/i.test(r.reason), `wrong reason: ${r.reason}`);
  assert.ok(!/submodule/i.test(r.reason), `mis-attributed to submodule: ${r.reason}`);
});

check('a genuine submodule failure still routes to infra (submodule reason)', () => {
  const r = classifyActionability({ errorMessage: 'fatal: No url found for submodule path "vendor/x" in .gitmodules', rootCause: 'No url found for submodule path "vendor/x"' });
  assert.strictEqual(r.klass, 'infra');
  assert.ok(/submodule/i.test(r.reason));
});

check('a REAL test failure IS actionable', () => {
  const r = classifyActionability({ errorMessage: 'AssertionError: expected 4 but received 5', rawLog: '1 failing' });
  assert.strictEqual(r.actionable, true);
  assert.strictEqual(r.klass, 'code');
});

check('a REAL TypeError IS actionable', () => {
  const r = classifyActionability({ errorMessage: "TypeError: Cannot read properties of null (reading 'trim')", rawLog: '' });
  assert.strictEqual(r.actionable, true);
});

console.log('\n== P0.1 dedup / loop guard ==');

check('open PR for same fingerprint => skip (cine-gratin 21x loop)', () => {
  const d = dedupDecision({ open: 1, closedUnmerged: 0, merged: 0, openUrls: ['http://x/1'] });
  assert.strictEqual(d.skip, true);
  assert.strictEqual(d.reason, 'duplicate_open_pr');
});

check('previously closed-unmerged => skip (customer rejected)', () => {
  const d = dedupDecision({ open: 0, closedUnmerged: 3, merged: 0, openUrls: [] });
  assert.strictEqual(d.skip, true);
  assert.strictEqual(d.reason, 'previously_rejected');
});

check('no prior PRs => allow', () => {
  const d = dedupDecision({ open: 0, closedUnmerged: 0, merged: 0, openUrls: [] });
  assert.strictEqual(d.skip, false);
});

check('previously merged + recurred => allow a fresh attempt', () => {
  const d = dedupDecision({ open: 0, closedUnmerged: 0, merged: 1, openUrls: [] });
  assert.strictEqual(d.skip, false);
});

console.log('\n== P1.4 verified sandbox => confidence/auto-merge ==');

check('unverified pass can never auto-merge', () => {
  const c = computeConfidence({ sandboxPassed: true, sandboxVerified: false, patchSize: 100, fingerprintReuse: true, classification: { confidence: 0.9, severity: 'low' } });
  assert.notStrictEqual(c.recommendation, 'auto_merge');
  assert.strictEqual(c.verified, false);
});

check('verified pass can auto-merge at high score', () => {
  const c = computeConfidence({ sandboxPassed: true, sandboxVerified: true, patchSize: 100, fingerprintReuse: true, classification: { confidence: 0.9, severity: 'low' } });
  assert.strictEqual(c.recommendation, 'auto_merge');
  assert.strictEqual(c.verified, true);
});

console.log('\n== P1.6 scope / diff guards ==');

function blocks(files) { return JSON.stringify({ _warpfix_format: 'file_blocks', files }); }

check('inventing a brand-new unreferenced file is rejected (cine-gratin 168-line)', () => {
  const patch = blocks([{ path: 'src/components/NewFeature.jsx', content: 'x\n'.repeat(168) }]);
  const r = validatePatchSafety(patch, { knownFiles: ['src/index.js', 'src/app.js'], sourceFiles: { 'src/index.js': 'a', 'src/app.js': 'b' } });
  assert.strictEqual(r.safe, false);
  assert.ok(r.reasons.some(x => /brand-new file/.test(x)));
});

check('gutting an existing file is rejected (deanable -177 lines)', () => {
  const original = Array.from({ length: 200 }, (_, i) => `line ${i}`).join('\n');
  const patch = blocks([{ path: 'src/ThumbnailService.cs', content: 'line 0\nline 1\nline 2' }]);
  const r = validatePatchSafety(patch, { knownFiles: ['src/ThumbnailService.cs'], sourceFiles: { 'src/ThumbnailService.cs': original } });
  assert.strictEqual(r.safe, false);
  assert.ok(r.reasons.some(x => /Over-aggressive rewrite/.test(x)));
});

check('a minimal edit to an existing file is allowed', () => {
  const original = 'function f(s){ return s.trim(); }\n';
  const patch = blocks([{ path: 'src/util.js', content: "function f(s){ if(s==null) return ''; return s.trim(); }\n" }]);
  const r = validatePatchSafety(patch, { knownFiles: ['src/util.js'], sourceFiles: { 'src/util.js': original } });
  assert.strictEqual(r.safe, true);
});

check('touching too many files is rejected', () => {
  const files = Array.from({ length: 12 }, (_, i) => ({ path: `src/f${i}.js`, content: 'x' }));
  const known = files.map(f => f.path);
  const r = validatePatchSafety(blocks(files), { knownFiles: known, sourceFiles: Object.fromEntries(known.map(p => [p, 'orig'])) });
  assert.strictEqual(r.safe, false);
  assert.ok(r.reasons.some(x => /too many files/.test(x)));
});

console.log('\n== bare full-file rewrite recovery (model omits ===FILE=== markers) ==');

// Real prod failure mode on warpfix-python-e2e: the model returns the complete
// corrected src/intervals.py as bare content (no ===FILE=== wrapper), so it was
// dropped -> sandbox "not applicable" -> confidence 35 -> no PR.
const PY_SRC = `from typing import List, Tuple

Interval = Tuple[int, int]


def merge_intervals(intervals: List[Interval]) -> List[Interval]:
    if not intervals:
        return []
    ordered = sorted(intervals, key=lambda pair: pair[0])
    merged = [list(ordered[0])]
    for start, end in ordered[1:]:
        last = merged[-1]
        if start < last[1]:
            last[1] = max(last[1], end)
        else:
            merged.append([start, end])
    return [(lo, hi) for lo, hi in merged]
`;
const PY_TEST = `from src.intervals import merge_intervals


def test_touch():
    assert merge_intervals([(1, 3), (3, 5)]) == [(1, 5)]
`;
const PY_FIXED = PY_SRC.replace('start < last[1]', 'start <= last[1]');
const srcFiles = { 'tests/test_intervals.py': PY_TEST, 'src/intervals.py': PY_SRC, 'README.md': '# docs\nsome prose\n' };

check('bare corrected file is attributed to the source file it rewrites', () => {
  const r = recoverBareFileRewrite(PY_FIXED, srcFiles);
  assert.ok(r, 'expected a recovered block');
  assert.strictEqual(r.path, 'src/intervals.py');
  assert.ok(/start <= last\[1\]/.test(r.content), 'recovered content keeps the fix');
});

check('bare rewrite wrapped in a ```python fence is still recovered', () => {
  const r = recoverBareFileRewrite('```python\n' + PY_FIXED + '\n```', srcFiles);
  assert.ok(r && r.path === 'src/intervals.py');
});

check('never attributes a rewrite to a test or doc file', () => {
  // Output that looks like the TEST file must NOT be recovered (we never "fix"
  // by editing tests). Only the test+README are offered as context here.
  const r = recoverBareFileRewrite(PY_TEST, { 'tests/test_intervals.py': PY_TEST, 'README.md': '# docs\n' });
  assert.strictEqual(r, null);
});

check('prose / unrelated output is not mis-attributed to a file', () => {
  const r = recoverBareFileRewrite('Looking at the error, the bug is an off-by-one in the comparison. You should change < to <=.', srcFiles);
  assert.strictEqual(r, null);
});

check('proper ===FILE=== output is left to the normal parser (no recovery)', () => {
  const r = recoverBareFileRewrite('===FILE: src/intervals.py===\n' + PY_FIXED + '\n===END_FILE===', srcFiles);
  assert.strictEqual(r, null);
});

check('recovered block passes the existing scope/safety guard', () => {
  const patch = blocks([recoverBareFileRewrite(PY_FIXED, srcFiles)]);
  const r = validatePatchSafety(patch, { knownFiles: Object.keys(srcFiles), sourceFiles: srcFiles });
  assert.strictEqual(r.safe, true);
});

console.log(`\n==== ${pass} passed, ${fail} failed ====\n`);
process.exit(fail === 0 ? 0 : 1);
