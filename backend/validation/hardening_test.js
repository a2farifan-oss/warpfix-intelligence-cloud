// Unit tests for the reliability/set-and-forget hardening fixes. Each maps to a
// concrete gap found in the deep audit (cross-checked with GitHub/BullMQ best
// practices). Run: node validation/hardening_test.js
const assert = require('assert');

let pass = 0, fail = 0;
function check(name, fn) {
  try { fn(); pass++; console.log(`  ok   ${name}`); }
  catch (e) { fail++; console.log(`  FAIL ${name}\n       ${e.message}`); }
}
async function checkAsync(name, fn) {
  try { await fn(); pass++; console.log(`  ok   ${name}`); }
  catch (e) { fail++; console.log(`  FAIL ${name}\n       ${e.message}`); }
}

// Stub the redis client so guards can be tested without a live Redis.
async function withFakeRedis(fakeClient, fn) {
  const redisPath = require.resolve('../src/queue/redis');
  const guardsPath = require.resolve('../src/queue/guards');
  const orig = require.cache[redisPath];
  require.cache[redisPath] = {
    id: redisPath, filename: redisPath, loaded: true,
    exports: { getRedisClient: () => fakeClient, createRedisConnection: () => fakeClient },
  };
  delete require.cache[guardsPath];
  try { return await fn(require('../src/queue/guards')); }
  finally {
    if (orig) require.cache[redisPath] = orig; else delete require.cache[redisPath];
    delete require.cache[guardsPath];
  }
}

async function main() {
  console.log('\n== idempotent job IDs (collapse webhook redeliveries) ==');
  const { repairJobId, reviewJobId } = require('../src/queue/producer');

  check('ci_failure job id is deterministic from repo.id + workflow_run.id', () => {
    const data = { type: 'ci_failure', repository: { id: 42 }, workflow_run: { id: 999 } };
    assert.strictEqual(repairJobId(data), 'repair-42-999');
    assert.strictEqual(repairJobId({ ...data }), 'repair-42-999'); // redelivery => same id
  });

  check('repair job id falls back to a random uuid when ids are missing', () => {
    const a = repairJobId({ type: 'ci_failure', repository: {}, workflow_run: {} });
    const b = repairJobId({ type: 'ci_failure', repository: {}, workflow_run: {} });
    assert.notStrictEqual(a, b);
    assert.ok(/^[0-9a-f-]{36}$/.test(a));
  });

  check('review job id includes head_sha so a new push re-reviews but a dup does not', () => {
    const d1 = { repository: { id: 7 }, pull_request: { number: 3, head_sha: 'aaa' } };
    const d2 = { repository: { id: 7 }, pull_request: { number: 3, head_sha: 'bbb' } };
    assert.strictEqual(reviewJobId(d1), 'review-7-3-aaa');
    assert.strictEqual(reviewJobId({ ...d1 }), 'review-7-3-aaa');
    assert.notStrictEqual(reviewJobId(d1), reviewJobId(d2));
  });

  console.log('\n== redis guards (atomic dedup lock + per-repo daily cap) ==');

  await checkAsync('acquireRepairLock: true first time, false while held, true after release', async () => {
    const store = new Map();
    const fake = {
      set: async (k, v) => (store.has(k) ? null : (store.set(k, v), 'OK')),
      del: async (k) => store.delete(k),
    };
    await withFakeRedis(fake, async (guards) => {
      const first = await guards.acquireRepairLock(1, 'hash');
      assert.strictEqual(first.acquired, true);
      const second = await guards.acquireRepairLock(1, 'hash');
      assert.strictEqual(second.acquired, false);
      await guards.releaseRepairLock(first.key);
      const third = await guards.acquireRepairLock(1, 'hash');
      assert.strictEqual(third.acquired, true);
    });
  });

  await checkAsync('acquireRepairLock fails OPEN when redis throws (never blocks a real fix)', async () => {
    const fake = { set: async () => { throw new Error('redis down'); }, del: async () => {} };
    await withFakeRedis(fake, async (guards) => {
      const r = await guards.acquireRepairLock(1, 'hash');
      assert.strictEqual(r.acquired, true);
      assert.strictEqual(r.key, null);
    });
  });

  await checkAsync('checkRepoDailyCap trips only after exceeding the cap', async () => {
    process.env.WARPFIX_REPO_DAILY_CAP = '3';
    const counts = new Map();
    const fake = {
      incr: async (k) => { const n = (counts.get(k) || 0) + 1; counts.set(k, n); return n; },
      expire: async () => 1,
    };
    await withFakeRedis(fake, async (guards) => {
      assert.strictEqual((await guards.checkRepoDailyCap(5)).exceeded, false);
      await guards.checkRepoDailyCap(5);
      await guards.checkRepoDailyCap(5);
      assert.strictEqual((await guards.checkRepoDailyCap(5)).exceeded, true); // 4 > 3
    });
    delete process.env.WARPFIX_REPO_DAILY_CAP;
  });

  console.log('\n== learned-fix patch parsing (feedback loop) ==');
  const { patchToFileMap } = require('../src/agents/learnedFixes');

  check('file_blocks patch parses to a {path: content} map', () => {
    const patch = JSON.stringify({ _warpfix_format: 'file_blocks', files: [{ path: 'src/a.js', content: 'x' }] });
    assert.deepStrictEqual(patchToFileMap(patch), { 'src/a.js': 'x' });
  });

  check('diff-only / non-json patch returns null (not stored as a learned fix)', () => {
    assert.strictEqual(patchToFileMap('--- a/x\n+++ b/x\n'), null);
    assert.strictEqual(patchToFileMap(''), null);
    assert.strictEqual(patchToFileMap(null), null);
  });

  console.log('\n== auto-PR gate is VERIFIED-only (the 137-unverified-PR regression) ==');
  const { shouldAutoOpenPR, computeConfidence } = require('../src/agents/confidenceEngine');

  check('verified pass at score>=40 opens a PR (Python/Node happy path)', () => {
    assert.strictEqual(shouldAutoOpenPR({ score: 65, sandboxPassed: true, sandboxVerified: true }), true);
    assert.strictEqual(shouldAutoOpenPR({ score: 40, sandboxPassed: true, sandboxVerified: true }), true);
  });

  check('UNVERIFIED pass NEVER opens a PR, even at high score (Swift/Kotlin/structural)', () => {
    // This is exactly how 137 PRs opened: bonuses pushed an unverified patch >= 40.
    assert.strictEqual(shouldAutoOpenPR({ score: 70, sandboxPassed: true, sandboxVerified: false }), false);
    assert.strictEqual(shouldAutoOpenPR({ score: 95, sandboxPassed: true, sandboxVerified: false }), false);
  });

  check('a failing sandbox never opens a PR regardless of score/verified', () => {
    assert.strictEqual(shouldAutoOpenPR({ score: 90, sandboxPassed: false, sandboxVerified: true }), false);
    assert.strictEqual(shouldAutoOpenPR({ score: 90, sandboxPassed: false, sandboxVerified: false }), false);
  });

  check('verified pass below the score gate (39) does not open a PR', () => {
    assert.strictEqual(shouldAutoOpenPR({ score: 39, sandboxPassed: true, sandboxVerified: true }), false);
  });

  check('an unverified fix can still numerically reach >=40 (proves the gate is what protects us)', () => {
    // sandbox(unverified)=20 + fingerprint=25 = 45 >= 40, but unverified => no PR.
    const c = computeConfidence({
      sandboxPassed: true, sandboxVerified: false, patchSize: 9000,
      fingerprintReuse: true, classification: { confidence: 0.3, severity: 'medium' },
    });
    assert.ok(c.score >= 40, `expected unverified score >=40, got ${c.score}`);
    assert.strictEqual(shouldAutoOpenPR({ score: c.score, sandboxPassed: true, sandboxVerified: false }), false);
  });

  console.log('\n== octokit throttling config constructs cleanly ==');
  check('Octokit accepts throttle handlers (secondary-rate-limit guard)', () => {
    const { Octokit } = require('octokit');
    const o = new Octokit({
      auth: 'test',
      throttle: { onRateLimit: () => false, onSecondaryRateLimit: () => false },
    });
    assert.ok(o.request);
  });

  console.log(`\n==== ${pass} passed, ${fail} failed ====\n`);
  process.exit(fail ? 1 : 0);
}

main();
