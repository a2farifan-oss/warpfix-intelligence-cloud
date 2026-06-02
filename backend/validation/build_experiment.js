// Build the retrieval-lift experiment.
//   KB        = the existing 1000-fixture corpus (oracle fixes).
//   Test set  = NEW fixtures with seeds OUTSIDE the corpus range (no overlap),
//               so retrieval can only ever pull same-category *different* bugs.
// For each test fixture we emit two prompts: baseline (no examples) and
// retrieval (top-K similar working fixes injected). One kernel runs both.
//
// Usage: node build_experiment.js [perCategory=8] [k=3]

const fs = require('fs');
const path = require('path');
const { CATEGORY_NAMES, makeFixture } = require('./lib/categories');
const { buildCILog } = require('./lib/grader');
const { SYSTEM_PROMPT, buildPatchPrompt } = require('./lib/promptlib');
const { buildKB, retrieve, renderExamples } = require('./lib/retriever');

let extractError;
try { ({ extractError } = require(path.join(__dirname, '..', 'src', 'agents', 'logParser'))); }
catch (_) {
  try { ({ extractError } = require('/home/ubuntu/repos/warpfix-intelligence-cloud/backend/src/agents/logParser')); }
  catch { extractError = (raw) => ({ errorMessage: (raw || '').split('\n').filter(l => /FAIL|Error|failed/i.test(l)).join('\n').slice(0, 4000), stackTrace: '', rootCause: '', affectedFiles: [] }); }
}

const perCat = parseInt(process.argv[2], 10) || 8;
const K = parseInt(process.argv[3], 10) || 3;
const OUT = path.join(__dirname, 'out');

const corpus = JSON.parse(fs.readFileSync(path.join(OUT, 'manifest.json'), 'utf8'));
const kb = buildKB(corpus.map((m) => ({
  id: m.id, category: m.category, description: m.description,
  errorMessage: m.logData.errorMessage, fix: m.oracle,
})));
console.log(`KB size: ${kb.length} verified pairs`);

const testManifest = [];
const prompts = [];
let idx = 0;
for (const cat of CATEGORY_NAMES) {
  for (let j = 0; j < perCat; j++) {
    // Seeds far outside the corpus's (7919*i+12345, i<1000) range.
    const seed = (50000000 + idx * 7919) >>> 0;
    idx++;
    const fx = makeFixture(cat, seed);
    const { ciLog } = buildCILog(fx);
    const logData = extractError(ciLog);
    logData.affectedFiles = Object.keys(fx.files);

    const base = buildPatchPrompt(logData, { type: 'test_failure', suggestedApproach: '' },
      { language: 'javascript', package_manager: 'npm' }, fx.files);

    const examples = retrieve(kb, { category: fx.category, description: fx.description, errorMessage: logData.errorMessage }, K, fx.id);
    const retrievalPrompt = renderExamples(examples) + '\n' + base;

    testManifest.push({ id: fx.id, category: fx.category, description: fx.description,
      files: fx.files, oracle: fx.oracle, test: fx.test, logData,
      retrievedIds: examples.map((e) => e.id) });

    prompts.push({ id: fx.id, category: fx.category, mode: 'baseline', system: SYSTEM_PROMPT, prompt: base });
    prompts.push({ id: fx.id, category: fx.category, mode: 'retrieval', system: SYSTEM_PROMPT, prompt: retrievalPrompt });
  }
}

fs.mkdirSync(path.join(__dirname, 'experiment'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'experiment', 'experiment_manifest.json'), JSON.stringify(testManifest, null, 2));
fs.writeFileSync(path.join(__dirname, 'experiment', 'experiment_prompts.jsonl'), prompts.map((p) => JSON.stringify(p)).join('\n') + '\n');
console.log(`Test fixtures: ${testManifest.length} (${perCat}/category), prompts: ${prompts.length} (baseline+retrieval), K=${K}`);
