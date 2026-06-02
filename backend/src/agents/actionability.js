// Decides whether a parsed CI failure is something WarpFix should attempt a
// SOURCE-CODE repair on. The production audit found two damaging behaviours:
//   1. "Fixing" things that aren't errors — a curl flag (`--fail-with-body`),
//      an `npm warn deprecated …` line, a JSON `"errorcode": "Not Found"` blob.
//   2. Opening source patches for infra/config failures no code change can fix
//      — missing env vars, git submodule URLs, pnpm/python version not set,
//      network timeouts, dependency-resolution failures.
//
// classifyActionability() returns one of:
//   { actionable: true,  klass: 'code' }              → proceed to patch
//   { actionable: false, klass: 'infra',  reason }    → post diagnostic, no patch
//   { actionable: false, klass: 'noise',  reason }    → skip silently, no PR
//
// It is deterministic (no LLM) so a provider outage can't change the verdict.

// Infra / config / environment failures: a source patch cannot fix these, so we
// must NOT open a code PR. Each entry: a matcher + a short human reason.
const INFRA_RULES = [
  { re: /no url found for submodule|fatal:[^\n]*submodule|failed to (clone|fetch) submodule|error: pathspec .* submodule/i, reason: 'Git submodule is misconfigured (no URL). Fix `.gitmodules`/submodule setup — not a code bug.' },
  { re: /(missing|not set|undefined|empty).{0,30}(env|environment) var|environment variable .* (is )?(not set|missing|required)|process\.env\.\w+ is (undefined|not defined)/i, reason: 'A required environment variable / secret is missing in CI. Configure it in repo settings — not a code bug.' },
  { re: /\b(SUPABASE_URL|SUPABASE_ANON_KEY|API_KEY|SECRET|TOKEN|DATABASE_URL)\b.{0,30}(missing|not set|undefined|required|invalid)/i, reason: 'A required secret/credential is missing or invalid in CI. Add it as a repository/organization secret.' },
  { re: /no pnpm version is specified|specify it (via|in) .* "packageManager"|corepack/i, reason: 'Package-manager version is not pinned. Set `packageManager` in package.json or the workflow — not a code bug.' },
  { re: /(econnrefused|etimedout|enotfound|ehostunreach|socket hang up|network.*unreachable|all connection attempts failed|getaddrinfo)/i, reason: 'A network/connection failure occurred in CI (transient or firewall/DNS). Not fixable by a source patch.' },
  { re: /\b(401 unauthorized|403 forbidden|permission denied|insufficient permission|not authorized|bad credentials)\b/i, reason: 'An auth/permissions failure occurred (token/scope). Fix the credentials or permissions — not a code bug.' },
  { re: /rate limit|429 too many requests|quota exceeded|secondary rate limit/i, reason: 'A rate-limit/quota was hit in CI. Retry later or raise limits — not a code bug.' },
  { re: /could not resolve dependencies|unable to resolve dependency|peer dep|ERESOLVE|npm error code ERESOLVE|version solving failed|no matching distribution/i, reason: 'Dependency resolution failed (version conflict / unavailable package). Fix the dependency constraints/lockfile.' },
  { re: /docker.*(daemon|pull|push).*(fail|error)|manifest unknown|toomanyrequests: |denied: requested access/i, reason: 'A Docker/registry failure occurred. Not fixable by a source patch.' },
  { re: /disk quota exceeded|no space left on device|out of memory|oom-killed|killed\s*$/i, reason: 'A CI resource limit (disk/memory) was hit. Not fixable by a source patch.' },
];

// Pure noise: lines that match a generic "error" word but are NOT real failures.
// If, after stripping these, nothing real remains, the run is non-actionable.
const NOISE_LINE = /(npm warn|^\s*warning\b|deprecat|##\[warning\]|--fail-with-body|--report-error|error-format|^\s*--\w[\w-]*|"error(code|_code)"\s*:|npm notice|funding|packages are looking for funding|run `npm fund`|added \d+ packages|up to date in|found \d+ vulnerabilit)/i;

// A line that looks like a genuine compile/test/runtime error.
const REAL_ERROR_LINE = /(assertionerror|assertion failed|expect(ed)?\b.*(to (be|equal|throw)|received)|\btest(s)? failed|\d+ (failing|failed)|✕|✖|✗|cannot read propert|is not a function|is not defined|referenceerror|typeerror|syntaxerror|rangeerror|unexpected token|traceback \(most recent call last\)|panic:|segmentation fault|nullpointerexception|compilation (failed|error)|cs\d{4}|ts\d{4}|error\[E\d+\]|build failed)/i;

function stripTs(line) {
  return line.replace(/^\d{4}-\d{2}-\d{2}T[\d:.]+Z\s?/, '');
}

function classifyActionability(logData) {
  const msg = (logData?.errorMessage || '').trim();
  const rootCause = (logData?.rootCause || '').trim();
  const stack = (logData?.stackTrace || '').trim();
  const rawLog = logData?.rawLog || '';

  // 1) Infra/config failure → not a code bug.
  // Match the SPECIFIC extracted error (rootCause/errorMessage/stack) first. The
  // full CI log is noisy — GitHub Actions' checkout step logs `git submodule
  // foreach …` even when there are no submodules, so matching infra rules against
  // the whole raw log mis-classifies (and mis-explains) real failures. Only fall
  // back to the raw log when the focused error text matches nothing.
  const focused = `${rootCause}\n${msg}\n${stack}`.trim();
  for (const rule of INFRA_RULES) {
    if (rule.re.test(focused)) {
      return { actionable: false, klass: 'infra', reason: rule.reason };
    }
  }
  for (const rule of INFRA_RULES) {
    if (rule.re.test(rawLog)) {
      return { actionable: false, klass: 'infra', reason: rule.reason };
    }
  }

  // 2) Is there at least one line that is a REAL error and not pure noise?
  const lines = (msg || '').split('\n').map(stripTs).map((l) => l.trim()).filter(Boolean);
  const realLines = lines.filter((l) => REAL_ERROR_LINE.test(l) && !NOISE_LINE.test(l));

  if (realLines.length === 0) {
    // Nothing genuinely actionable. If the whole message is dominated by noise
    // (warnings/flags/JSON), say so; otherwise it's just unclassifiable.
    const noiseLines = lines.filter((l) => NOISE_LINE.test(l));
    const reason = noiseLines.length >= Math.max(1, lines.length - 1)
      ? 'The CI log contains only warnings/noise (deprecations, flags, info) — no real error to fix.'
      : 'Could not isolate a genuine compile/test/runtime error in the logs.';
    return { actionable: false, klass: 'noise', reason };
  }

  return { actionable: true, klass: 'code', realLines };
}

module.exports = { classifyActionability, INFRA_RULES, NOISE_LINE, REAL_ERROR_LINE };
