// Generate N oracle-graded fixtures across all categories, SELF-VERIFY each
// (buggy must fail, oracle must pass), and emit:
//   out/manifest.json  — full fixtures + synthesized CI log + parsed logData
//   out/prompts.jsonl  — {id, category, system, prompt} for the GPU kernel
//   out/selfcheck.json — corpus integrity summary
//
// Usage: node generate.js [count]   (default 60)

const fs = require('fs');
const path = require('path');
const { CATEGORY_NAMES, makeFixture } = require('./lib/categories');
const { buildCILog } = require('./lib/grader');
const { runTest } = require('./lib/grader');
const { SYSTEM_PROMPT, buildPatchPrompt } = require('./lib/promptlib');

// Use the REAL production parser if it loads; otherwise a faithful fallback.
let extractError;
try {
  // Prefer the real production parser. In-repo it lives at ../src/agents; fall
  // back to the standalone dev clone path when run outside the repo.
  try { ({ extractError } = require(path.join(__dirname, '..', 'src', 'agents', 'logParser'))); }
  catch (_) { ({ extractError } = require('/home/ubuntu/repos/warpfix-intelligence-cloud/backend/src/agents/logParser')); }
} catch (e) {
  extractError = (raw) => {
    const lines = (raw || '').split('\n').filter(l => /FAIL:|AssertionError|Error|failed/i.test(l));
    return { errorMessage: lines.join('\n').slice(0, 4000), stackTrace: '', rootCause: lines[0] || '', affectedFiles: [] };
  };
}

const count = parseInt(process.argv[2], 10) || 60;
const OUT = path.join(__dirname, 'out');
fs.mkdirSync(OUT, { recursive: true });

const manifest = [];
const prompts = [];
let buggyFail = 0, oraclePass = 0, bad = [];

for (let i = 0; i < count; i++) {
  const cat = CATEGORY_NAMES[i % CATEGORY_NAMES.length];
  const seed = (7919 * i + 12345) >>> 0; // unique, well-spread per fixture
  const fx = makeFixture(cat, seed);

  // Integrity gate 1: buggy must FAIL.
  const { ciLog, buggyPassed } = buildCILog(fx);
  // Integrity gate 2: oracle must PASS.
  const oracleRes = runTest(fx.oracle, fx.test);

  if (buggyPassed) bad.push({ id: fx.id, why: 'buggy_passed' });
  else buggyFail++;
  if (!oracleRes.passed) bad.push({ id: fx.id, why: 'oracle_failed', output: oracleRes.output });
  else oraclePass++;

  const logData = extractError(ciLog);
  logData.affectedFiles = Object.keys(fx.files);

  manifest.push({
    id: fx.id, category: fx.category, description: fx.description, isAsync: !!fx.isAsync,
    files: fx.files, oracle: fx.oracle, test: fx.test, ciLog, logData,
  });

  const prompt = buildPatchPrompt(
    logData,
    { type: 'test_failure', suggestedApproach: '' },
    { language: 'javascript', package_manager: 'npm' },
    fx.files,
  );
  prompts.push({ id: fx.id, category: fx.category, system: SYSTEM_PROMPT, prompt });
}

fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));
fs.writeFileSync(path.join(OUT, 'prompts.jsonl'), prompts.map(p => JSON.stringify(p)).join('\n') + '\n');
fs.writeFileSync(path.join(OUT, 'selfcheck.json'), JSON.stringify({
  count, categories: CATEGORY_NAMES.length, buggyFail, oraclePass, bad,
}, null, 2));

console.log(`Generated ${count} fixtures across ${CATEGORY_NAMES.length} categories.`);
console.log(`Integrity: buggy-fails ${buggyFail}/${count}, oracle-passes ${oraclePass}/${count}.`);
if (bad.length) {
  console.error(`INTEGRITY FAILURES (${bad.length}):`);
  for (const b of bad.slice(0, 20)) console.error('  ', JSON.stringify(b).slice(0, 300));
  process.exit(1);
}
console.log('Corpus integrity OK — every fixture fails on buggy code and passes on the oracle fix.');
