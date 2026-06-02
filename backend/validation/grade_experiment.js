// Grade the retrieval-lift experiment: split completions by mode (baseline vs
// retrieval), grade each against the held-out test oracle, and print a
// per-category lift table.
//
// Usage: node grade_experiment.js <completions.jsonl> [experiment_manifest.json]

const fs = require('fs');
const path = require('path');
const { parseFileBlocks } = require('./lib/promptlib');
const { gradeCandidate } = require('./lib/grader');

const compPath = process.argv[2] || path.join(__dirname, 'experiment', 'completions.jsonl');
const manPath = process.argv[3] || path.join(__dirname, 'experiment', 'experiment_manifest.json');

const manifest = JSON.parse(fs.readFileSync(manPath, 'utf8'));
const byId = new Map(manifest.map((m) => [m.id, m]));
const completions = fs.readFileSync(compPath, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));

// stats[mode][category] = {pass,total}
const stats = { baseline: {}, retrieval: {} };
const perFixture = {}; // id -> {baseline:bool, retrieval:bool, category}

for (const c of completions) {
  const fx = byId.get(c.id);
  if (!fx || !stats[c.mode]) continue;
  const s = stats[c.mode];
  s[c.category] = s[c.category] || { pass: 0, total: 0 };
  s[c.category].total++;
  const files = parseFileBlocks(c.completion || '');
  const res = gradeCandidate(fx, files);
  if (res.passed) s[c.category].pass++;
  perFixture[c.id] = perFixture[c.id] || { category: c.category };
  perFixture[c.id][c.mode] = res.passed;
}

function overall(mode) {
  let p = 0, t = 0;
  for (const k of Object.keys(stats[mode])) { p += stats[mode][k].pass; t += stats[mode][k].total; }
  return { p, t, rate: t ? p / t : 0 };
}

const cats = [...new Set([...Object.keys(stats.baseline), ...Object.keys(stats.retrieval)])].sort();
console.log('\n=============== RETRIEVAL LIFT (baseline -> retrieval) ===============');
console.log('category'.padEnd(26), 'baseline', ' retrieval', '  lift');
console.log('-'.repeat(64));
for (const k of cats) {
  const b = stats.baseline[k] || { pass: 0, total: 0 };
  const r = stats.retrieval[k] || { pass: 0, total: 0 };
  const br = b.total ? b.pass / b.total : 0;
  const rr = r.total ? r.pass / r.total : 0;
  const lift = ((rr - br) * 100).toFixed(0);
  console.log(k.padEnd(26),
    `${b.pass}/${b.total}`.padStart(7),
    `${r.pass}/${r.total}`.padStart(9),
    `  ${lift >= 0 ? '+' : ''}${lift}pp`.padStart(7));
}
const ob = overall('baseline'), or = overall('retrieval');
console.log('-'.repeat(64));
console.log('OVERALL'.padEnd(26),
  `${ob.p}/${ob.t}`.padStart(7), `${or.p}/${or.t}`.padStart(9),
  `  ${(((or.rate - ob.rate)) * 100).toFixed(1)}pp`.padStart(7));
console.log(`baseline ${(ob.rate * 100).toFixed(1)}%  ->  retrieval ${(or.rate * 100).toFixed(1)}%`);
console.log('=====================================================================\n');

// Fixtures that flipped fail->pass thanks to retrieval
const flips = Object.entries(perFixture).filter(([, v]) => !v.baseline && v.retrieval);
console.log(`Fixtures fixed ONLY with retrieval: ${flips.length}`);
const byCat = {};
for (const [, v] of flips) byCat[v.category] = (byCat[v.category] || 0) + 1;
console.log('  by category:', JSON.stringify(byCat));

fs.writeFileSync(path.join(__dirname, 'experiment', 'lift.json'), JSON.stringify({
  baseline: stats.baseline, retrieval: stats.retrieval,
  overall: { baseline: ob, retrieval: or }, flips: flips.length, flipsByCategory: byCat,
}, null, 2));
