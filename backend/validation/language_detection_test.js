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
} = require('../src/utils/sourceDetection');
const { extractError } = require('../src/agents/logParser');

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

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
