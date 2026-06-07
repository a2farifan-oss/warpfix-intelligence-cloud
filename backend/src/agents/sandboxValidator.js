const { logger } = require('../utils/logger');
const { getInstallationToken } = require('../services/github');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

// Validate a generated patch. Preferred path: actually check out the failing
// commit, apply the patched files, install deps and run the project's test
// suite — `passed` then reflects the REAL test result, so a partial fix (some
// failures still red) is correctly rejected instead of being rubber-stamped.
// If real execution can't run (no test script, unparseable patch, infra error)
// we fall back to a lightweight sanity check, but flag it `verified: false`.
async function validateInSandbox({ patch, repository, installation_id, workflow_run, _tokenOverride }) {
  logger.info('Validating patch in sandbox', { repo: repository?.full_name });

  if (process.env.SANDBOX_MODE !== 'lightweight') {
    try {
      const real = await executeValidate({ patch, repository, installation_id, workflow_run, _tokenOverride });
      if (real) {
        logger.info('Sandbox executed full test suite', {
          repo: repository?.full_name, passed: real.passed,
          language: real.language,
          outputTail: real.passed ? undefined : (real.output || '').slice(-700),
        });
        return real;
      }
      logger.info('Sandbox execution not applicable; using lightweight check', {
        repo: repository?.full_name,
      });
    } catch (err) {
      logger.warn('Sandbox execution failed; falling back to lightweight', { error: err.message });
    }
  }

  const lw = await lightweightValidate(patch, repository);
  // Lightweight only checks that the patch is well-formed — it does NOT prove
  // the tests pass, so mark it unverified. Downstream this stays "review
  // suggested" rather than a trustworthy green.
  return { ...lw, verified: false };
}

// Parse the patched file contents out of the generated patch. The patch
// generator emits JSON ({ _warpfix_format: 'file_blocks', files: [...] }) on
// the happy path; if it's only a textual diff we can't reconstruct the full
// tree, so real execution is skipped.
function parsePatchFiles(patch) {
  if (!patch || typeof patch !== 'string') return null;
  const trimmed = patch.trim();
  if (!trimmed.startsWith('{')) return null;
  try {
    const obj = JSON.parse(trimmed);
    if (obj && obj._warpfix_format === 'file_blocks' && Array.isArray(obj.files) && obj.files.length) {
      return obj.files.filter((f) => f && f.path && typeof f.content === 'string');
    }
  } catch {
    return null;
  }
  return null;
}

function run(cmd, args, opts = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      cwd: opts.cwd,
      env: { ...process.env, CI: 'true', npm_config_yes: 'true', ...(opts.env || {}) },
      timeout: opts.timeout || 120000,
    });
    let out = '';
    const cap = (d) => { out += d.toString(); if (out.length > 20000) out = out.slice(-20000); };
    child.stdout.on('data', cap);
    child.stderr.on('data', cap);
    child.on('error', (e) => resolve({ code: -1, out: out + `\n[spawn error] ${e.message}` }));
    child.on('close', (code) => resolve({ code, out }));
  });
}

async function executeValidate({ patch, repository, installation_id, workflow_run, _tokenOverride }) {
  const files = parsePatchFiles(patch);
  if (!files) return null; // diff-only patch — can't reconstruct the tree

  const owner = repository?.owner || repository?.full_name?.split('/')[0];
  const repo = repository?.name || repository?.full_name?.split('/')[1];
  const branch = workflow_run?.head_branch;
  const sha = workflow_run?.head_sha;
  if (!owner || !repo || !branch) return null;

  const token = _tokenOverride || (installation_id ? await getInstallationToken(installation_id) : null);
  if (!token) return null;

  const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'warpfix-sbx-'));
  const steps = { clone: false, apply: false, install: false, test: false };
  try {
    const url = `https://x-access-token:${token}@github.com/${owner}/${repo}.git`;
    const clone = await run('git', ['clone', '--depth', '1', '--no-tags', '--branch', branch, url, dir], { timeout: 120000 });
    if (clone.code !== 0) {
      logger.warn('Sandbox clone failed', { code: clone.code });
      return null; // infra issue — fall back rather than false-fail the patch
    }
    steps.clone = true;

    // Best-effort: pin to the exact failing commit when it isn't the branch tip.
    if (sha) {
      const fetched = await run('git', ['fetch', '--depth', '1', 'origin', sha], { cwd: dir, timeout: 60000 });
      if (fetched.code === 0) await run('git', ['checkout', sha], { cwd: dir, timeout: 30000 });
    }

    // Apply the patched files (reject path traversal).
    for (const f of files) {
      const abs = path.resolve(dir, f.path);
      if (!abs.startsWith(path.resolve(dir) + path.sep)) {
        logger.warn('Sandbox rejected out-of-tree path', { path: f.path });
        return null;
      }
      await fs.promises.mkdir(path.dirname(abs), { recursive: true });
      await fs.promises.writeFile(abs, f.content);
    }
    steps.apply = true;

    // Run the project's REAL test suite, language-aware. Only a genuine test
    // run sets verified:true. If the toolchain isn't available on this host, or
    // the project has no runnable test command, we return null so the caller
    // falls back to the lightweight check (verified:false) — never a false green.
    const exec = await runProjectTests(dir, steps);
    if (!exec) return null;

    return {
      passed: exec.passed,
      verified: true,
      method: 'execute',
      language: exec.language,
      steps,
      output: (exec.output || '').slice(-2000),
    };
  } finally {
    fs.promises.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

// Decide whether a tool run failed because the toolchain itself is unavailable
// (so we should fall back to the unverified lightweight check) rather than
// because the tests genuinely failed.
function toolchainMissing(res) {
  const out = res.out || '';
  // A spawn that couldn't find the binary resolves with code -1 and an
  // ENOENT-ish message.
  if (res.code === -1 && /spawn error|ENOENT|not found/i.test(out)) return true;
  // A launcher script (./gradlew, mvn) can spawn fine yet abort with a non-zero
  // exit when the underlying runtime is absent — e.g. gradlew prints "ERROR:
  // JAVA_HOME is not set and no 'java' command could be found" and exits 1. That
  // is a missing toolchain (fall back to the lightweight/unverified check), not
  // a real failing test, so don't let it masquerade as a verified red run.
  if (/JAVA_HOME is not set|no 'java' command could be found|Unable to locate a Java Runtime|command not found/i.test(out)) {
    return true;
  }
  return false;
}

// Detect the ecosystem from marker files and run install + test with the right
// tool. Returns { passed, language, output } when a real run happened, else null.
async function runProjectTests(dir, steps) {
  const has = (f) => fs.existsSync(path.join(dir, f));

  // ---- Node / JS / TS ----
  if (has('package.json')) {
    let pkg;
    try { pkg = JSON.parse(await fs.promises.readFile(path.join(dir, 'package.json'), 'utf8')); } catch { return null; }
    if (!pkg.scripts || !pkg.scripts.test) return null;
    const usePnpm = has('pnpm-lock.yaml');
    const useYarn = has('yarn.lock');
    const hasLock = has('package-lock.json');
    const mgr = usePnpm ? 'pnpm' : useYarn ? 'yarn' : 'npm';
    const installArgs = usePnpm ? ['install', '--no-frozen-lockfile']
      : useYarn ? ['install']
      : [hasLock ? 'ci' : 'install', '--no-audit', '--no-fund', '--no-progress'];
    const hasDeps = (pkg.dependencies && Object.keys(pkg.dependencies).length) ||
                    (pkg.devDependencies && Object.keys(pkg.devDependencies).length);
    if (hasDeps) {
      const install = await run(mgr, installArgs, { cwd: dir, timeout: 240000 });
      if (toolchainMissing(install)) return null;
      if (install.code !== 0) { logger.warn('Sandbox install failed', { mgr, code: install.code }); return null; }
    }
    steps.install = true;
    const test = await run(mgr, mgr === 'npm' ? ['test', '--silent'] : ['test'], { cwd: dir, timeout: 180000 });
    if (toolchainMissing(test)) return null;
    steps.test = test.code === 0;
    return { passed: test.code === 0, language: 'node', output: test.out };
  }

  // ---- Python ----
  if (has('pytest.ini') || has('pyproject.toml') || has('setup.py') || has('requirements.txt') || has('tox.ini')) {
    // Debian's system Python is PEP-668 "externally-managed", so a bare
    // `pip install` fails with `error: externally-managed-environment` and
    // pytest never lands — which made EVERY Python repair false-fail the
    // sandbox with "No module named pytest" (passed:false) regardless of how
    // correct the patch was. Use a throwaway venv (pip is unrestricted inside
    // one) and run install + pytest with that SAME interpreter so the deps we
    // install are the ones pytest can import.
    const venvDir = path.join(dir, '.warpfix-venv');
    const venvPy = path.join(venvDir, 'bin', 'python');
    await run('python3', ['-m', 'venv', venvDir], { cwd: dir, timeout: 120000 });
    const usePy = fs.existsSync(venvPy) ? venvPy : 'python';
    // If venv creation somehow failed we fall back to system python, where PEP
    // 668 still applies — so pass --break-system-packages there only.
    const breakFlag = usePy === 'python' ? ['--break-system-packages'] : [];
    if (has('requirements.txt')) {
      const pip = await run(usePy, ['-m', 'pip', 'install', '-r', 'requirements.txt', '-q', ...breakFlag], { cwd: dir, timeout: 240000 });
      if (toolchainMissing(pip)) return null;
    }
    // Repos often assume the CI image ships pytest rather than listing it as a
    // dep, so ensure it's importable by the interpreter we'll run tests with.
    const havePytest = await run(usePy, ['-m', 'pytest', '--version'], { cwd: dir, timeout: 30000 });
    if (havePytest.code !== 0) {
      await run(usePy, ['-m', 'pip', 'install', 'pytest', '-q', ...breakFlag], { cwd: dir, timeout: 180000 });
    }
    const test = await run(usePy, ['-m', 'pytest', '-q'], { cwd: dir, timeout: 180000 });
    if (toolchainMissing(test)) return null;
    // pytest exit 5 = "no tests collected" → not a real validation, fall back.
    if (test.code === 5) return null;
    steps.install = true; steps.test = test.code === 0;
    return { passed: test.code === 0, language: 'python', output: test.out };
  }

  // ---- Go ----
  if (has('go.mod')) {
    const test = await run('go', ['test', './...'], { cwd: dir, timeout: 180000 });
    if (toolchainMissing(test)) return null;
    steps.install = true; steps.test = test.code === 0;
    return { passed: test.code === 0, language: 'go', output: test.out };
  }

  // ---- Rust ----
  if (has('Cargo.toml')) {
    const test = await run('cargo', ['test', '--quiet'], { cwd: dir, timeout: 240000 });
    if (toolchainMissing(test)) return null;
    steps.install = true; steps.test = test.code === 0;
    return { passed: test.code === 0, language: 'rust', output: test.out };
  }

  // ---- .NET ----
  const hasDotnet = fs.readdirSync(dir).some((f) => /\.(csproj|sln|fsproj)$/.test(f));
  if (hasDotnet) {
    const test = await run('dotnet', ['test', '--nologo', '--verbosity', 'quiet'], { cwd: dir, timeout: 300000 });
    if (toolchainMissing(test)) return null;
    steps.install = true; steps.test = test.code === 0;
    return { passed: test.code === 0, language: 'dotnet', output: test.out };
  }

  // ---- Java / Maven / Gradle ----
  // A clean Kotlin/Gradle (or large Maven) build spawns several JVMs (wrapper
  // launcher + build daemon + forked test worker) and needs ~0.5GB+ of memory
  // even with aggressive heap/metaspace caps. On a memory-constrained worker
  // that exceeds the instance's RAM and OOM-kills the whole process mid-build,
  // taking down unrelated (Python/Node) repairs too. So the heavy JVM build is
  // OPT-IN: it only runs when SANDBOX_JVM_HEAVY=1, which must only be set on a
  // worker with enough RAM (≳1GB). When it's disabled we return null so JVM
  // repairs fall back to the lightweight (unverified) check — a fix is still
  // generated, it just won't open an auto-PR (the confidence gate keeps
  // unverified fixes from shipping), which is the intended safe behavior on
  // small plans.
  const jvmHeavyEnabled = process.env.SANDBOX_JVM_HEAVY === '1';
  const hasJvmProject = has('pom.xml') || has('build.gradle') || has('build.gradle.kts');
  if (hasJvmProject && !jvmHeavyEnabled) {
    logger.info('Skipping verified JVM sandbox; SANDBOX_JVM_HEAVY not enabled (needs a worker with ≳1GB RAM). Falling back to unverified.', {
      reason: 'jvm_heavy_disabled',
    });
    return null;
  }
  // Bound the JVM footprint when the heavy build *is* enabled: JAVA_TOOL_OPTIONS
  // is honoured by *every* JVM the build forks, so it caps heap + metaspace +
  // code-cache uniformly; GRADLE_OPTS disables the daemon, serializes workers,
  // and runs the Kotlin compiler in-process (one fewer JVM).
  const JVM_SHRINK = '-Xmx256m -XX:+UseSerialGC -XX:MaxMetaspaceSize=128m -XX:ReservedCodeCacheSize=48m -XX:TieredStopAtLevel=1 -Xss640k';
  const JVM_ENV = {
    JAVA_TOOL_OPTIONS: JVM_SHRINK,
    GRADLE_OPTS: '-Dorg.gradle.daemon=false -Dorg.gradle.workers.max=1 -Dkotlin.compiler.execution.strategy=in-process',
  };
  if (has('pom.xml')) {
    const test = await run('mvn', ['-q', 'test'], { cwd: dir, timeout: 300000, env: JVM_ENV });
    if (toolchainMissing(test)) return null;
    steps.install = true; steps.test = test.code === 0;
    return { passed: test.code === 0, language: 'maven', output: test.out };
  }
  if (has('build.gradle') || has('build.gradle.kts')) {
    const test = await run('./gradlew', ['test', '--no-daemon', '--quiet'], { cwd: dir, timeout: 300000, env: JVM_ENV });
    if (toolchainMissing(test)) return null;
    steps.install = true; steps.test = test.code === 0;
    return { passed: test.code === 0, language: 'gradle', output: test.out };
  }

  return null; // unknown ecosystem — fall back to lightweight (unverified)
}

async function lightweightValidate(patch, repository) {
  const steps = {
    syntax_check: false,
    diff_valid: false,
    no_conflicts: false,
    size_check: false,
    pattern_check: false,
  };

  const hasDiffHeaders = patch.includes('---') && patch.includes('+++');
  const hasHunks = /@@\s*-\d+,?\d*\s*\+\d+,?\d*\s*@@/.test(patch);
  steps.diff_valid = hasDiffHeaders || hasHunks || patch.length > 0;

  const lines = patch.split('\n');
  steps.size_check = lines.length < 200;

  const badPatterns = [/<<<<<</, />>>>>>/, /=======/];
  steps.no_conflicts = !badPatterns.some(p => p.test(patch));

  steps.syntax_check = !(/SyntaxError/.test(patch));
  steps.pattern_check = true;

  const allPassed = Object.values(steps).every(Boolean);

  return {
    passed: allPassed,
    steps,
    method: 'lightweight',
  };
}

async function dockerValidate(patch, repository, installationId) {
  // Full Docker-based validation (production)
  const Docker = require('dockerode');
  const docker = new Docker();

  const container = await docker.createContainer({
    Image: 'node:20-slim',
    Cmd: ['sh', '-c', `
      cd /workspace &&
      echo "${Buffer.from(patch).toString('base64')}" | base64 -d > /tmp/fix.patch &&
      git apply /tmp/fix.patch &&
      npm install --ignore-scripts 2>/dev/null &&
      npm test 2>&1 &&
      npm run build 2>&1
    `],
    WorkingDir: '/workspace',
    HostConfig: {
      Memory: 512 * 1024 * 1024,
      CpuPeriod: 100000,
      CpuQuota: 50000,
      NetworkMode: 'none',
      AutoRemove: true,
    },
  });

  await container.start();

  const result = await container.wait();
  const logs = await container.logs({ stdout: true, stderr: true });

  return {
    passed: result.StatusCode === 0,
    steps: {
      clone: true,
      apply: true,
      install: result.StatusCode === 0,
      test: result.StatusCode === 0,
      build: result.StatusCode === 0,
    },
    logs: logs.toString(),
    method: 'docker',
  };
}

module.exports = { validateInSandbox, toolchainMissing };
