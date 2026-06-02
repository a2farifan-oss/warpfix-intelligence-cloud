// Grade a completions.jsonl (from the Kaggle kernel) against the corpus oracle.
// For each completion: parse file blocks exactly like production, apply over the
// buggy fixture, run the test. Pass = test goes green. Emits a category scorecard
// and writes verified (bug -> fix) pairs for the retrieval index.
//
// Usage: node grade.js <completions.jsonl> [manifest.json]

const fs = require('fs');
const path = require('path');
const { parseFileBlocks } = require('./lib/promptlib');
const { gradeCandidate } = require('./lib/grader');

const compPath = process.argv[2] || path.join(__dirname, 'out', 'completions.jsonl');
const manPath = process.argv[3] || path.join(__dirname, 'out', 'manifest.json');

const manifest = JSON.parse(fs.readFileSync(manPath, 'utf8'));
const byId = new Map(manifest.map((m) => [m.id, m]));
const completions = fs.readFileSync(compPath, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));

const cat = {};        // category -> {pass, total}
const verified = [];   // verified bug->fix pairs
const failures = [];   // graded failures (for inspection)
let parsedOk = 0, emptyParse = 0;

for (const c of completions) {
  const fx = byId.get(c.id);
  if (!fx) continue;
  cat[c.category] = cat[c.category] || { pass: 0, total: 0 };
  cat[c.category].total++;

  const files = parseFileBlocks(c.completion);
  if (files.length === 0) emptyParse++; else parsedOk++;

  const res = gradeCandidate(fx, files);
  if (res.passed) {
    cat[c.category].pass++;
    verified.push({
      id: fx.id, category: fx.category, description: fx.description,
      errorMessage: fx.logData.errorMessage,
      buggy: fx.files, fix: Object.fromEntries(files.map((f) => [f.path.replace(/^\.\//, ''), f.content])),
      affectedFiles: fx.logData.affectedFiles,
    });
  } else {
    failures.push({ id: fx.id, category: fx.category, reason: res.reason || 'tests_failed',
      parsedFiles: files.map((f) => f.path), touched: res.touched, output: (res.output || '').slice(0, 300) });
  }
}

const cats = Object.keys(cat).sort();
let totalPass = 0, total = 0;
console.log('\n================ WARPFIX CORPUS SCORECARD ================');
console.log('category'.padEnd(26), 'pass/total', '  rate');
console.log('-'.repeat(56));
for (const k of cats) {
  const { pass, total: t } = cat[k];
  totalPass += pass; total += t;
  const rate = ((pass / t) * 100).toFixed(0) + '%';
  console.log(k.padEnd(26), `${String(pass).padStart(3)}/${String(t).padEnd(3)}`, '   ', rate.padStart(4));
}
console.log('-'.repeat(56));
console.log('OVERALL'.padEnd(26), `${String(totalPass).padStart(3)}/${String(total).padEnd(3)}`, '   ',
  ((totalPass / total) * 100).toFixed(1) + '%');
console.log('parse: file-blocks found', parsedOk, '| empty-parse', emptyParse);
console.log('=========================================================\n');

fs.writeFileSync(path.join(__dirname, 'out', 'verified.jsonl'), verified.map((v) => JSON.stringify(v)).join('\n') + '\n');
fs.writeFileSync(path.join(__dirname, 'out', 'scorecard.json'), JSON.stringify({
  overall: { pass: totalPass, total, rate: +(totalPass / total).toFixed(4) },
  byCategory: cat, parsedOk, emptyParse, verifiedCount: verified.length,
}, null, 2));
fs.writeFileSync(path.join(__dirname, 'out', 'failures.json'), JSON.stringify(failures, null, 2));
console.log(`Wrote ${verified.length} verified pairs -> out/verified.jsonl`);
if (failures.length) console.log(`Wrote ${failures.length} failures -> out/failures.json`);
