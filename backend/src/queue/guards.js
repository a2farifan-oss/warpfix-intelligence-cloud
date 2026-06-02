// Redis-backed runtime guards for the repair pipeline.
//
// These close two reliability gaps the audit flagged that the GitHub-PR dedup
// (prDedup.js) cannot:
//   1) A RACE: the repair worker runs with concurrency > 1 and the PR-dedup
//      check is a non-atomic GitHub lookup, so two near-simultaneous deliveries
//      of the SAME failure can both pass the check and open duplicate PRs.
//      acquireRepairLock() makes "is someone already repairing this exact
//      failure?" atomic via SET NX EX.
//   2) RUNAWAY COST: dedup only stops IDENTICAL failures. A repo emitting many
//      DISTINCT failures could still drive a large number of LLM repairs.
//      checkRepoDailyCap() is a coarse per-repo/day backstop on LLM repairs.
//
// Both fail OPEN: if Redis is unavailable they allow the repair, so a cache
// outage never blocks a genuine fix.

const { getRedisClient } = require('./redis');
const { logger } = require('../utils/logger');

// Long enough to cover a full repair (clone + install + test + LLM). The lock
// auto-expires so a crashed worker never wedges a fingerprint permanently.
const LOCK_TTL_SEC = parseInt(process.env.WARPFIX_REPAIR_LOCK_TTL, 10) || 600;

// Pure backstop against pathological loops — far above any normal repo's daily
// volume (and above the free LLM provider's own daily cap), so it never trips
// on legitimate use. Set WARPFIX_REPO_DAILY_CAP=0 to disable.
const REPO_DAILY_CAP = Number.isNaN(parseInt(process.env.WARPFIX_REPO_DAILY_CAP, 10))
  ? 200
  : parseInt(process.env.WARPFIX_REPO_DAILY_CAP, 10);

function lockKey(repoId, fingerprintHash) {
  return `warpfix:lock:repair:${repoId}:${fingerprintHash}`;
}

// Try to claim exclusive in-flight ownership of (repo, fingerprint). Returns
// { acquired, key }. When acquired is false, another worker is already handling
// this exact failure and the caller should skip. Fails OPEN on Redis error.
async function acquireRepairLock(repoId, fingerprintHash) {
  if (!repoId || !fingerprintHash) return { acquired: true, key: null };
  const key = lockKey(repoId, fingerprintHash);
  try {
    const res = await getRedisClient().set(key, String(Date.now()), 'EX', LOCK_TTL_SEC, 'NX');
    return { acquired: res === 'OK', key: res === 'OK' ? key : null };
  } catch (e) {
    logger.debug('Repair lock acquire failed; proceeding without lock', { error: e.message });
    return { acquired: true, key: null };
  }
}

async function releaseRepairLock(key) {
  if (!key) return;
  try {
    await getRedisClient().del(key);
  } catch (e) {
    // Not fatal — the TTL will expire the lock regardless.
    logger.debug('Repair lock release failed; will expire via TTL', { error: e.message });
  }
}

// Increment and check the per-repo daily LLM-repair counter. Only call this on
// the path that actually performs an LLM repair (not cache reuse), so the cap
// tracks real spend. Returns { exceeded, count, cap }. Fails OPEN on error.
async function checkRepoDailyCap(repoId) {
  if (!repoId || REPO_DAILY_CAP <= 0) return { exceeded: false, count: 0, cap: REPO_DAILY_CAP };
  const day = new Date().toISOString().slice(0, 10);
  const key = `warpfix:count:repairs:${repoId}:${day}`;
  try {
    const r = getRedisClient();
    const count = await r.incr(key);
    if (count === 1) await r.expire(key, 86400);
    return { exceeded: count > REPO_DAILY_CAP, count, cap: REPO_DAILY_CAP };
  } catch (e) {
    logger.debug('Repo daily-cap check failed; proceeding', { error: e.message });
    return { exceeded: false, count: 0, cap: REPO_DAILY_CAP };
  }
}

module.exports = { acquireRepairLock, releaseRepairLock, checkRepoDailyCap, lockKey, LOCK_TTL_SEC, REPO_DAILY_CAP };
