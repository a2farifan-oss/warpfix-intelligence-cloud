// Unit tests for (1) the Hugging Face provider wiring (paid `hf` + free
// `hffree`, same OpenAI-compatible router) and quota-exhaustion fall-through,
// and (2) the patch-prompt token-reduction budget. Run:
//   node validation/token_and_providers_test.js
const assert = require('assert');

let pass = 0, fail = 0;
function check(name, fn) {
  try { fn(); pass++; console.log(`  ok   ${name}`); }
  catch (e) { fail++; console.log(`  FAIL ${name}\n       ${e.message}`); }
}

const { PROVIDER_FNS, providerHasKey, isQuotaExhausted } = require('../src/services/llm');
const { buildPatchPrompt } = require('../src/agents/patchGenerator');

console.log('\n== Hugging Face provider wiring ==');

check('hf and hffree are registered providers', () => {
  assert.strictEqual(typeof PROVIDER_FNS.hf, 'function');
  assert.strictEqual(typeof PROVIDER_FNS.hffree, 'function');
});

check('providerHasKey(hf) follows HUGGINGFACE_API_KEY', () => {
  const saved = process.env.HUGGINGFACE_API_KEY;
  delete process.env.HUGGINGFACE_API_KEY;
  assert.strictEqual(providerHasKey('hf'), false);
  process.env.HUGGINGFACE_API_KEY = 'hf_paid_x';
  assert.strictEqual(providerHasKey('hf'), true);
  if (saved === undefined) delete process.env.HUGGINGFACE_API_KEY; else process.env.HUGGINGFACE_API_KEY = saved;
});

check('hffree uses the free key, else falls back to the paid key', () => {
  const sPaid = process.env.HUGGINGFACE_API_KEY;
  const sFree = process.env.HUGGINGFACE_API_KEY_FREE;
  delete process.env.HUGGINGFACE_API_KEY;
  delete process.env.HUGGINGFACE_API_KEY_FREE;
  assert.strictEqual(providerHasKey('hffree'), false);
  process.env.HUGGINGFACE_API_KEY_FREE = 'hf_free_x';
  assert.strictEqual(providerHasKey('hffree'), true);
  delete process.env.HUGGINGFACE_API_KEY_FREE;
  process.env.HUGGINGFACE_API_KEY = 'hf_paid_x'; // free falls back to paid key
  assert.strictEqual(providerHasKey('hffree'), true);
  if (sPaid === undefined) delete process.env.HUGGINGFACE_API_KEY; else process.env.HUGGINGFACE_API_KEY = sPaid;
  if (sFree === undefined) delete process.env.HUGGINGFACE_API_KEY_FREE; else process.env.HUGGINGFACE_API_KEY_FREE = sFree;
});

console.log('\n== quota-exhaustion fall-through detection ==');

check('Groq per-day cap is a quota condition', () => {
  assert.strictEqual(isQuotaExhausted('429 Rate limit reached ... tokens per day (TPD): Limit 100000'), true);
});
check('HF HTTP 402 / monthly credits exhausted is a quota condition', () => {
  assert.strictEqual(isQuotaExhausted('LLM API error: 402 - You have exceeded your monthly included credits'), true);
  assert.strictEqual(isQuotaExhausted('Payment Required'), true);
});
check('a normal code error is NOT a quota condition', () => {
  assert.strictEqual(isQuotaExhausted('TypeError: Cannot read properties of null'), false);
  assert.strictEqual(isQuotaExhausted('500 Internal Server Error'), false);
});

console.log('\n== patch-prompt token budget ==');

const cls = { type: 'test_failure', suggestedApproach: '' };

check('total reference-source content is capped to the budget', () => {
  const src = {
    'file0.js': 'A'.repeat(5000),
    'file1.js': 'A'.repeat(5000),
    'file2.js': 'A'.repeat(5000),
    'file3.js': 'A'.repeat(5000),
    'file4.js': 'A'.repeat(5000),
  };
  const prompt = buildPatchPrompt({ errorMessage: 'boom' }, cls, {}, src);
  const aCount = (prompt.match(/A/g) || []).length;
  assert.strictEqual(aCount, 12000, `expected 12000 source chars, got ${aCount}`);
});

check('per-file cap (3500) is enforced and over-budget files are dropped', () => {
  const src = {
    'file0.js': 'A'.repeat(5000),
    'file1.js': 'A'.repeat(5000),
    'file2.js': 'A'.repeat(5000),
    'file3.js': 'A'.repeat(5000),
    'file4.js': 'A'.repeat(5000),
  };
  const prompt = buildPatchPrompt({ errorMessage: 'boom' }, cls, {}, src);
  // file0..file3 fit within 12000 (3500+3500+3500+1500); file4 is dropped.
  assert.ok(prompt.includes('>>>>> BEGIN file3.js'), 'file3 should be included');
  assert.ok(!prompt.includes('>>>>> BEGIN file4.js'), 'file4 should be dropped (budget exhausted)');
});

check('stack trace is truncated to 1200 chars', () => {
  const prompt = buildPatchPrompt({ errorMessage: 'boom', stackTrace: 'S'.repeat(5000) }, cls, {}, {});
  // The longest run of the injected stack chars must be capped at 1200.
  assert.ok(prompt.includes('S'.repeat(1200)), 'expected a 1200-char stack run');
  assert.ok(!prompt.includes('S'.repeat(1201)), 'stack run must not exceed 1200');
});

console.log(`\n==== ${pass} passed, ${fail} failed ====\n`);
process.exit(fail === 0 ? 0 : 1);
