// Unit tests for sandbox toolchain-availability detection. A run that fails
// because the toolchain is absent must fall back to the lightweight/unverified
// check rather than be reported as a genuinely failing (verified) test run.
// Run: node validation/sandbox_toolchain_test.js
const assert = require('assert');
const { toolchainMissing } = require('../src/agents/sandboxValidator');

let pass = 0, fail = 0;
function check(name, fn) {
  try { fn(); pass++; console.log(`  ok   ${name}`); }
  catch (e) { fail++; console.log(`  FAIL ${name}\n       ${e.message}`); }
}

console.log('\n== toolchainMissing ==');

check('binary not found (spawn ENOENT, code -1) => missing', () => {
  assert.strictEqual(toolchainMissing({ code: -1, out: 'spawn go ENOENT' }), true);
  assert.strictEqual(toolchainMissing({ code: -1, out: 'cargo: not found' }), true);
});

check('./gradlew with no JVM (exit 1, JAVA_HOME message) => missing', () => {
  const out = "ERROR: JAVA_HOME is not set and no 'java' command could be found in your PATH.\nPlease set the JAVA_HOME variable in your environment.";
  // gradlew spawns fine (code 1, not -1) but the JVM is absent — must be treated
  // as a missing toolchain so we fall back to unverified instead of a false red.
  assert.strictEqual(toolchainMissing({ code: 1, out }), true);
});

check('macOS-style "Unable to locate a Java Runtime" => missing', () => {
  assert.strictEqual(toolchainMissing({ code: 1, out: 'Unable to locate a Java Runtime.' }), true);
});

check('shell "command not found" (exit 127) => missing', () => {
  assert.strictEqual(toolchainMissing({ code: 127, out: 'bash: mvn: command not found' }), true);
});

check('genuine failing test run => NOT missing', () => {
  const out = '> Task :test FAILED\nIntervalsTest > merges touching intervals into one() FAILED\n    org.opentest4j.AssertionFailedError at IntervalsTest.kt:10\n3 tests completed, 1 failed';
  assert.strictEqual(toolchainMissing({ code: 1, out }), false);
});

check('clean passing run => NOT missing', () => {
  assert.strictEqual(toolchainMissing({ code: 0, out: 'BUILD SUCCESSFUL' }), false);
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
