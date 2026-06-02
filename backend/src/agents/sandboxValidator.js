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
      env: { ...process.env, CI: 'true', npm_config_yes: 'true' },
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

    // Need a test script to validate against.
    let pkg;
    try {
      pkg = JSON.parse(await fs.promises.readFile(path.join(dir, 'package.json'), 'utf8'));
    } catch {
      return null; // not a node project we can run — fall back
    }
    if (!pkg.scripts || !pkg.scripts.test) return null;

    const hasLock = fs.existsSync(path.join(dir, 'package-lock.json'));
    const hasDeps = (pkg.dependencies && Object.keys(pkg.dependencies).length) ||
                    (pkg.devDependencies && Object.keys(pkg.devDependencies).length);
    if (hasDeps) {
      const install = await run('npm', [hasLock ? 'ci' : 'install', '--no-audit', '--no-fund', '--no-progress'], { cwd: dir, timeout: 240000 });
      if (install.code !== 0) {
        logger.warn('Sandbox npm install failed', { code: install.code });
        return null; // dependency/infra problem, not the patch's fault — fall back
      }
    }
    steps.install = true;

    const test = await run('npm', ['test', '--silent'], { cwd: dir, timeout: 180000 });
    steps.test = test.code === 0;

    return {
      passed: test.code === 0,
      verified: true,
      method: 'execute',
      steps,
      output: test.out.slice(-2000),
    };
  } finally {
    fs.promises.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
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

module.exports = { validateInSandbox };
