// Unit tests for language-agnostic source detection:
//   1. utils/sourceDetection — Linguist-derived extension set, exclude-list,
//      and the more-permissive affected-file rule.
//   2. logParser.extractError — language-agnostic affectedFiles extraction
//      across JS/Python/Go/Rust/Kotlin/Swift/C++/C#/Java.
// Run: node validation/language_detection_test.js
const assert = require('assert');

let pass = 0; let fail = 0;
function check(name, fn) {
  try { fn(); pass++; console.log(`  ok   ${name}`); } catch (e) { fail++; console.log(`  FAIL ${name}\n       ${e.message}`); }
}

const {
  SOURCE_EXTS, isSourceFile, isExcludedPath, isFetchableAffectedFile, getExtension,
  languageKey, dominantLanguage, isTestPath, isBuildFile,
} = require('../src/utils/sourceDetection');
const { extractError } = require('../src/agents/logParser');
const { retrieve } = require('../src/agents/retrieval');

console.log('\n== sourceDetection: Linguist coverage ==');

check('covers many languages beyond the old 13-ext list', () => {
  // Languages that were previously UNSUPPORTED and caused count:0.
  for (const ext of ['.kt', '.kts', '.swift', '.h', '.hpp', '.vue', '.svelte', '.scala', '.dart', '.ex', '.exs', '.m', '.mm', '.clj', '.lua', '.r', '.jl', '.zig']) {
    assert.ok(SOURCE_EXTS.has(ext), `expected ${ext} to be a known source extension`);
  }
});

check('still covers the original core languages', () => {
  for (const ext of ['.js', '.jsx', '.ts', '.tsx', '.py', '.go', '.rs', '.java', '.rb', '.php', '.c', '.cpp', '.cs']) {
    assert.ok(SOURCE_EXTS.has(ext), `expected ${ext} to be a known source extension`);
  }
});

check('extension set is large (derived from Linguist, not a tiny allowlist)', () => {
  assert.ok(SOURCE_EXTS.size > 500, `expected >500 extensions, got ${SOURCE_EXTS.size}`);
});

console.log('\n== sourceDetection: isSourceFile ==');

check('accepts real source in any supported language', () => {
  for (const p of ['app/src/main/java/com/foo/Main.kt', 'Sources/App/Server.swift', 'src/lib.rs', 'cmd/server/main.go', 'include/foo.hpp', 'components/Button.vue']) {
    assert.strictEqual(isSourceFile(p), true, `expected source: ${p}`);
  }
});

check('rejects vendored/build/generated/binary/test paths', () => {
  for (const p of [
    'node_modules/react/index.js',
    'dist/bundle.js',
    'build/out.js',
    'vendor/foo/bar.go',
    'target/debug/app.rs',
    'src/app.min.js',
    'types/index.d.ts',
    'pkg/foo.pb.go',
    'package-lock.json',
    'assets/logo.svg',
    'image.png',
    '.github/workflows/ci.yml',
    'src/__tests__/app.test.js',
    'spec/models/user_spec.rb',
  ]) {
    assert.strictEqual(isSourceFile(p), false, `expected NOT source: ${p}`);
  }
});

console.log('\n== sourceDetection: isFetchableAffectedFile (more permissive) ==');

check('fetches a failure-named file even with an unknown extension', () => {
  // A niche/new language Linguist may not list yet — but the failure named it.
  assert.strictEqual(isFetchableAffectedFile('src/handler.newlang'), true);
});

check('still refuses vendored/generated/binary affected paths', () => {
  assert.strictEqual(isFetchableAffectedFile('node_modules/x/y.js'), false);
  assert.strictEqual(isFetchableAffectedFile('dist/app.min.js'), false);
  assert.strictEqual(isFetchableAffectedFile('logo.png'), false);
});

console.log('\n== sourceDetection: test-file detection (JVM + snake conventions) ==');

check('detects JVM CamelCase test classes (FooTest.kt, MyTests.java, FooSpec.scala, BarIT.java)', () => {
  for (const p of ['IntervalsTest.kt', 'src/test/kotlin/com/warpfix/IntervalsTest.kt',
    'MyTests.java', 'FooSpec.scala', 'pkg/BarIT.java', 'BazITCase.groovy']) {
    assert.strictEqual(isTestPath(p), true, `expected test: ${p}`);
    assert.strictEqual(isSourceFile(p), false, `test must not be paddable source: ${p}`);
  }
});

check('does NOT misclassify words that merely end in "test"/"it" (Latest/Manifest/Greatest/Limit)', () => {
  for (const p of ['Latest.kt', 'Manifest.kt', 'Greatest.kt', 'Limit.kt', 'src/Audit.java']) {
    assert.strictEqual(isTestPath(p), false, `must NOT be a test: ${p}`);
    assert.strictEqual(isSourceFile(p), true, `expected real source: ${p}`);
  }
});

check('detects snake/dotted test conventions (foo_test.go, test_foo.py, foo_spec.rb, a.test.js)', () => {
  for (const p of ['pkg/foo_test.go', 'tests/test_foo.py', 'spec/user_spec.rb', 'src/a.test.js']) {
    assert.strictEqual(isTestPath(p), true, `expected test: ${p}`);
  }
});

console.log('\n== sourceDetection: build-file ranking ==');

check('build/packaging wrappers are flagged so they rank below real code', () => {
  for (const p of ['build.gradle.kts', 'build.gradle', 'settings.gradle.kts', 'gradlew', 'gradlew.bat',
    'pom.xml', 'build.sbt', 'Makefile', 'CMakeLists.txt', 'a/b/c.gradle']) {
    assert.strictEqual(isBuildFile(p), true, `expected build file: ${p}`);
  }
});

check('real application source is NOT a build file', () => {
  for (const p of ['src/main/kotlin/com/warpfix/Intervals.kt', 'src/index.js', 'app/main.py']) {
    assert.strictEqual(isBuildFile(p), false, `expected NOT build file: ${p}`);
  }
});

check('getExtension handles dotfiles and no-extension paths', () => {
  assert.strictEqual(getExtension('.gitignore'), '');
  assert.strictEqual(getExtension('Makefile'), '');
  assert.strictEqual(getExtension('a/b/File.KT'), '.kt');
});

console.log('\n== logParser.extractError: language-agnostic affectedFiles ==');

function affected(log) { return extractError(log).affectedFiles; }

check('JS/TS: path:line:col', () => {
  const files = affected('TypeError: x is undefined\n    at src/services/order.ts:42:13');
  assert.ok(files.includes('src/services/order.ts'), files.join(','));
});

check('Python: traceback File "path", line N', () => {
  const log = 'Traceback (most recent call last):\n  File "app/models/user.py", line 88, in get\n    return self.qty\nAttributeError: NoneType';
  const files = affected(log);
  assert.ok(files.includes('app/models/user.py'), files.join(','));
});

check('Go: panic stack frame path:line', () => {
  const log = 'panic: runtime error: invalid memory address or nil pointer dereference\n\tcmd/server/main.go:23 +0x1d';
  const files = affected(log);
  assert.ok(files.includes('cmd/server/main.go'), files.join(','));
});

check('Rust: path:line:col', () => {
  const files = affected('error[E0425]: cannot find value `x`\n  --> src/lib.rs:10:9');
  assert.ok(files.includes('src/lib.rs'), files.join(','));
});

check('Kotlin: stack frame (File.kt:line)', () => {
  const files = affected('Exception in thread "main"\n\tat com.foo.MainKt.main (Main.kt:31)');
  assert.ok(files.includes('Main.kt'), files.join(','));
});

check('Swift: path:line:col error', () => {
  const files = affected('Sources/App/Routes.swift:57:20: error: value of optional type must be unwrapped');
  assert.ok(files.includes('Sources/App/Routes.swift'), files.join(','));
});

check('C++: path:line:col error', () => {
  const files = affected('src/engine/render.cpp:120:14: error: ‘foo’ was not declared');
  assert.ok(files.includes('src/engine/render.cpp'), files.join(','));
});

check('C#: in <path>:line N', () => {
  const files = affected('Unhandled exception.\n   at App.Run() in /home/runner/work/app/app/src/Program.cs:line 18');
  assert.ok(files.includes('src/Program.cs'), files.join(','));
});

check('does NOT capture dotted class names or minified libs as files', () => {
  const files = affected('at com.foo.Bar.baz(Native Method)\nreact.production.min loaded');
  assert.ok(!files.includes('com.foo.Bar'), `unexpected class name: ${files.join(',')}`);
  assert.ok(!files.some((f) => f.includes('production.min')), `unexpected min lib: ${files.join(',')}`);
});

check('skips node_modules / site-packages frames', () => {
  const files = affected('at /home/runner/work/app/app/node_modules/express/lib/router.js:281:22\n  File "/usr/lib/python3.11/site-packages/flask/app.py", line 2');
  assert.ok(!files.some((f) => f.includes('node_modules') || f.includes('site-packages')), files.join(','));
});

console.log('\n== sourceDetection: language family ==');

check('languageKey groups JS/TS family and maps common languages', () => {
  for (const p of ['a.js', 'a.jsx', 'a.ts', 'a.tsx', 'a.mjs', 'a.vue']) {
    assert.strictEqual(languageKey(p), 'js', `${p} should be js family`);
  }
  assert.strictEqual(languageKey('src/intervals.py'), 'python');
  assert.strictEqual(languageKey('Main.kt'), 'kotlin');
  assert.strictEqual(languageKey('main.go'), 'go');
  assert.strictEqual(languageKey('lib.rs'), 'rust');
});

check('languageKey falls back to the raw extension for unknown langs (future-proof)', () => {
  assert.strictEqual(languageKey('thing.zig'), '.zig');
  assert.strictEqual(languageKey('noext'), '');
});

check('dominantLanguage ignores test files and picks the source language', () => {
  assert.strictEqual(dominantLanguage(['tests/test_intervals.py', 'src/intervals.py', 'README.md']), 'python');
  assert.strictEqual(dominantLanguage(['app/Main.kt', 'app/Util.kt']), 'kotlin');
  assert.strictEqual(dominantLanguage([]), '');
});

console.log('\n== retrieval: same-language few-shot only ==');

// The seed KB is 100% JavaScript. A non-JS repair must NOT be primed with JS
// examples — doing so drifts the model off the required ===FILE=== output
// format and toward wrong fixes (measured 5/5 -> 0/5 on a real Python bug).
const pyQuery = {
  errorMessage: 'assert merge_intervals([(1, 3), (3, 5)]) == [(1, 5)]',
  description: '', category: 'test_failure',
};

check('Python repair retrieves ZERO JS examples', () => {
  const got = retrieve({ ...pyQuery, language: 'python' });
  assert.strictEqual(got.length, 0, `expected 0, got ${got.length} (${got.map((e) => e.category)})`);
});

check('JS repair still retrieves examples (few-shot preserved where it helps)', () => {
  const got = retrieve({ ...pyQuery, language: 'js' });
  assert.ok(got.length > 0, 'expected JS examples for a JS repair');
  assert.ok(got.every((e) => Object.keys(e.fix || {}).some((p) => /\.(?:js|jsx|ts|tsx|mjs|cjs)$/i.test(p))),
    'every retrieved example should be a JS-family fix');
});

check('unknown repair language does not crash and yields no cross-language noise', () => {
  const got = retrieve({ ...pyQuery, language: '.zig' });
  assert.strictEqual(got.length, 0, 'no zig examples exist, so none should be returned');
});

check('omitting language preserves prior behavior (back-compat)', () => {
  const got = retrieve({ ...pyQuery });
  assert.ok(got.length > 0, 'no-language query should still retrieve from the pool');
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
