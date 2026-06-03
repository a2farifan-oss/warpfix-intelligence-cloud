/*
 * Tests for sandbox-driven provider fallback primitives in services/llm.js:
 *  - skipProviders excludes already-tried providers from the chain
 *  - _meta.provider reports which provider actually answered
 *  - a regeneration that skips the first provider lands on the next one
 *
 * These are the building blocks the worker uses to regenerate a patch with a
 * DIFFERENT model when the first model's patch fails the sandbox.
 */
process.env.LLM_PROVIDER = 'groq,github,hf,hffree';
process.env.GROQ_API_KEY = 'test-groq';
process.env.GITHUB_MODELS_TOKEN = 'test-gh';
process.env.HUGGINGFACE_API_KEY = 'test-hf';
process.env.HUGGINGFACE_API_KEY_FREE = 'test-hffree';

const assert = require('assert');
const llm = require('../src/services/llm');

let passed = 0;
let failed = 0;
function t(name, fn) {
  return fn().then(() => { passed += 1; console.log(`  ok   ${name}`); })
    .catch((e) => { failed += 1; console.log(`  FAIL ${name}: ${e.message}`); });
}

// Replace each provider fn with a stub that records the call and returns its name.
function stubProviders() {
  const calls = [];
  for (const p of ['groq', 'github', 'hf', 'hffree']) {
    llm.PROVIDER_FNS[p] = async () => { calls.push(p); return `out-${p}`; };
  }
  return calls;
}

(async () => {
  console.log('\n== provider fallback / skipProviders ==');

  await t('first provider answers and _meta.provider is reported', async () => {
    stubProviders();
    const meta = {};
    const out = await llm.callLLM({ system: 's', user: 'u', _meta: meta });
    assert.strictEqual(out, 'out-groq');
    assert.strictEqual(meta.provider, 'groq');
  });

  await t('skipProviders=[groq] lands on the next provider (github)', async () => {
    const calls = stubProviders();
    const meta = {};
    const out = await llm.callLLM({ system: 's', user: 'u', skipProviders: ['groq'], _meta: meta });
    assert.strictEqual(out, 'out-github');
    assert.strictEqual(meta.provider, 'github');
    assert.ok(!calls.includes('groq'), 'groq must not be called when skipped');
  });

  await t('skipping the first two lands on hf', async () => {
    stubProviders();
    const meta = {};
    const out = await llm.callLLM({ system: 's', user: 'u', skipProviders: ['groq', 'github'], _meta: meta });
    assert.strictEqual(out, 'out-hf');
    assert.strictEqual(meta.provider, 'hf');
  });

  await t('a failing provider is skipped over to the next live one', async () => {
    stubProviders();
    llm.PROVIDER_FNS.groq = async () => { const e = new Error('429 rate limit'); e.code = 'LLM_DAILY_LIMIT'; throw e; };
    const meta = {};
    const out = await llm.callLLM({ system: 's', user: 'u', _meta: meta });
    assert.strictEqual(meta.provider, 'github');
    assert.strictEqual(out, 'out-github');
  });

  await t('skipProviders is case-insensitive', async () => {
    stubProviders();
    const meta = {};
    await llm.callLLM({ system: 's', user: 'u', skipProviders: ['GROQ'], _meta: meta });
    assert.strictEqual(meta.provider, 'github');
  });

  console.log(`\n==== ${passed} passed, ${failed} failed ====\n`);
  process.exit(failed ? 1 : 0);
})();
