// Oracle grader: materialize a fixture's files + test into a temp dir, run the
// test with `node`, and report pass/fail plus captured output. Used both to
// (a) synthesize the failing "CI log" from the buggy code, and (b) grade a
// candidate patch by re-running the test after applying it.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

function runTest(files, testContent) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wfx-'));
  try {
    for (const [rel, content] of Object.entries(files)) {
      const full = path.join(dir, rel);
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, content);
    }
    fs.writeFileSync(path.join(dir, 'test.js'), testContent);
    try {
      const out = execFileSync('node', ['test.js'], { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 10000 });
      return { passed: true, output: out };
    } catch (e) {
      const output = `${e.stdout || ''}${e.stderr || ''}`.trim() || (e.message || 'test failed');
      return { passed: false, output };
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// Build a realistic failing CI log from the buggy sources (jest-ish framing so
// the parser sees familiar signals).
function buildCILog(fixture) {
  const res = runTest(fixture.files, fixture.test);
  const body = res.output;
  const log = [
    '> warpfix-fixture@1.0.0 test',
    '> node test.js',
    '',
    body,
    '',
    'npm ERR! Test failed.  See above for more details.',
  ].join('\n');
  return { ciLog: log, buggyPassed: res.passed, rawOutput: body };
}

// Apply candidate files (array of {path, content}) over the fixture's file set,
// then run the test. Only files that already exist in the fixture are allowed
// to be overwritten (mirrors production: "never create new files").
function gradeCandidate(fixture, candidateFiles) {
  const merged = { ...fixture.files };
  const touched = [];
  for (const f of candidateFiles || []) {
    if (!f || !f.path) continue;
    const rel = f.path.replace(/^\.\//, '').trim();
    // Only allow overwriting known source files (not the test, not new files).
    if (Object.prototype.hasOwnProperty.call(fixture.files, rel)) {
      merged[rel] = f.content;
      touched.push(rel);
    } else {
      const base = path.basename(rel);
      if (Object.prototype.hasOwnProperty.call(fixture.files, base)) {
        merged[base] = f.content;
        touched.push(base);
      }
    }
  }
  if (touched.length === 0) {
    return { passed: false, reason: 'no_known_files_touched', touched, output: '' };
  }
  const res = runTest(merged, fixture.test);
  return { passed: res.passed, touched, output: res.output };
}

module.exports = { runTest, buildCILog, gradeCandidate };
