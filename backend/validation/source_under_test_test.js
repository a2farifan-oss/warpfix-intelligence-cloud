// Regression tests for the source-under-test fix (the "verified TS sandbox
// never fires + blind placeholder" gap found in the 3-day customer audit).
//
// Root cause: a test_failure usually names only the TEST file in its stack
// trace. With just the test in context, the model either (A) emits a
// natural-language placeholder ("// I cannot see the actual source file"), or
// (B) rewrites the right source file from memory as BARE content that the
// recovery can't attribute (the file isn't in context) -> stored unparseable
// -> sandbox can't reconstruct -> UNVERIFIED -> no PR. Real customer repos
// (apkaapna007-a11y/Salam-Sons, deicer/bershub: TypeScript; Duy-Nguyen-2006/
// timetable) all hit this.
//
// Fix: resolve the failing test's local imports back to repo source paths and
// pull them into context (sourceDetection.resolveImportedSourceFiles), and
// reliably reject blind placeholder patches (patchGuards.isPlaceholderPatch).
//
// Run: node validation/source_under_test_test.js
const assert = require('assert');

let pass = 0; let fail = 0;
function check(name, fn) {
  try { fn(); pass++; console.log(`  ok   ${name}`); } catch (e) { fail++; console.log(`  FAIL ${name}\n       ${e.message}`); }
}

const {
  resolveImportedSourceFiles, extractImportSpecifiers, isLocalSpecifier,
} = require('../src/utils/sourceDetection');
const {
  isPlaceholderPatch, looksLikeBlindPlaceholder,
} = require('../src/agents/patchGuards');
const { recoverBareFileRewrite } = require('../src/agents/patchGenerator');

console.log('\n== extractImportSpecifiers: static + dynamic + CJS ==');

check('pulls import/from, side-effect import, export-from, require, dynamic import', () => {
  const src = `import React from 'react';
import { useAuth } from '../hooks/useAuth';
import '@/styles/global.css';
export { Foo } from './foo';
const cfg = require('../config/app');
const lazy = () => import('@/components/Heavy');`;
  const specs = extractImportSpecifiers(src);
  for (const s of ['react', '../hooks/useAuth', '@/styles/global.css', './foo', '../config/app', '@/components/Heavy']) {
    assert.ok(specs.includes(s), `expected specifier ${s}`);
  }
});

console.log('\n== isLocalSpecifier: first-party vs node_modules ==');

check('relative and alias paths are local; bare + scoped packages are not', () => {
  assert.ok(isLocalSpecifier('../hooks/useAuth'));
  assert.ok(isLocalSpecifier('./foo'));
  assert.ok(isLocalSpecifier('@/components/LoginForm'));
  assert.ok(isLocalSpecifier('~/lib/util'));
  assert.ok(isLocalSpecifier('src/app/router'));
  assert.ok(!isLocalSpecifier('react'));
  assert.ok(!isLocalSpecifier('react-router-dom'));
  assert.ok(!isLocalSpecifier('@chakra-ui/react')); // scoped PACKAGE, not an alias
  assert.ok(!isLocalSpecifier('@testing-library/react'));
});

console.log('\n== resolveImportedSourceFiles: source-under-test resolution ==');

check('relative import from a test resolves to the repo source file', () => {
  // Salam-Sons shape: Login.test.tsx imports ../hooks/useAuth and the component.
  const repoFiles = [
    'src/__tests__/Login.test.tsx',
    'src/hooks/useAuth.ts',
    'src/components/LoginForm.tsx',
    'src/main.tsx',
    'README.md',
  ];
  const testContents = {
    'src/__tests__/Login.test.tsx':
      `import { render } from '@testing-library/react';
import { useAuth } from '../hooks/useAuth';
import LoginForm from '../components/LoginForm';
test('logs in', () => {});`,
  };
  const out = resolveImportedSourceFiles({
    testFiles: ['src/__tests__/Login.test.tsx'], testContents, repoFiles,
  });
  assert.ok(out.includes('src/hooks/useAuth.ts'), 'resolves ../hooks/useAuth');
  assert.ok(out.includes('src/components/LoginForm.tsx'), 'resolves ../components/LoginForm');
  assert.ok(!out.includes('README.md'), 'never returns docs');
  assert.ok(!out.some((p) => /__tests__|\.test\./.test(p)), 'never returns the test itself');
});

check('@/ alias import resolves via suffix match without knowing the alias config', () => {
  const repoFiles = ['test/home.spec.ts', 'src/pages/PublicTournamentPage.tsx', 'src/app/router.tsx'];
  const testContents = {
    'test/home.spec.ts':
      `import { AppRouter } from '@/app/router';
import { PublicTournamentPage } from '@/pages/PublicTournamentPage';`,
  };
  const out = resolveImportedSourceFiles({ testFiles: ['test/home.spec.ts'], testContents, repoFiles });
  assert.ok(out.includes('src/app/router.tsx'));
  assert.ok(out.includes('src/pages/PublicTournamentPage.tsx'));
});

check('resolves a folder import to its index file', () => {
  const repoFiles = ['tests/agent.test.ts', 'src/agent/index.ts', 'src/agent/runner.ts'];
  const testContents = { 'tests/agent.test.ts': `import { runLocalAgent } from '../src/agent';` };
  const out = resolveImportedSourceFiles({ testFiles: ['tests/agent.test.ts'], testContents, repoFiles });
  assert.ok(out.includes('src/agent/index.ts'), 'folder import -> index.ts');
});

check('bare/scoped package imports never resolve to repo files', () => {
  const repoFiles = ['src/x.test.ts', 'src/react.ts'];
  const testContents = { 'src/x.test.ts': `import React from 'react';\nimport { render } from '@testing-library/react';` };
  const out = resolveImportedSourceFiles({ testFiles: ['src/x.test.ts'], testContents, repoFiles });
  assert.deepStrictEqual(out, [], 'no node_modules import is mistaken for repo source');
});

check('no repo source means no resolution (no crash, empty result)', () => {
  const out = resolveImportedSourceFiles({
    testFiles: ['a.test.ts'], testContents: { 'a.test.ts': `import { x } from './x';` }, repoFiles: [],
  });
  assert.deepStrictEqual(out, []);
});

console.log('\n== isPlaceholderPatch: blind "no source" stubs are rejected ==');

// The exact patterns observed on Duy-Nguyen-2006/timetable (6 runs, all blind).
const BLIND_SAMPLES = [
  `// This is a placeholder since the actual implementation wasn't provided\n// But based on the test failure pattern, here's what likely needs fixing:`,
  `// This is a placeholder since I cannot see the actual source file\nexport function runLocalAgent() {\n  // Implementation would be here\n}`,
  `// This is a placeholder since I don't have the actual source file\nexport async function runLocalAgent() {}`,
  `// This is a placeholder for the actual implementation\n// Since the real source file wasn't provided, I'm providing a fix`,
];

check('flags every observed timetable blind-placeholder patch', () => {
  for (const s of BLIND_SAMPLES) {
    assert.ok(looksLikeBlindPlaceholder(s), `should flag: ${s.slice(0, 50)}`);
    assert.ok(isPlaceholderPatch(s), `isPlaceholderPatch should reject: ${s.slice(0, 50)}`);
  }
});

check('flags a blind placeholder inside the JSON file_blocks shape too', () => {
  const patch = JSON.stringify({
    _warpfix_format: 'file_blocks',
    files: [{ path: 'src/agent.ts', content: '// placeholder since I cannot see the actual source file\n' }],
  });
  assert.ok(isPlaceholderPatch(patch));
});

check('does NOT flag real source that merely contains the word "placeholder"', () => {
  // A genuine LoginForm (the kind Salam-Sons produced) uses placeholder= attrs.
  const realSource = `import React, { useState } from 'react';
const LoginForm = () => {
  const [email, setEmail] = useState('');
  return (
    <form>
      <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input placeholder="Password" type="password" />
      {/* TODO: add a placeholder for analytics later */}
    </form>
  );
};
export default LoginForm;`;
  assert.ok(!looksLikeBlindPlaceholder(realSource), 'real placeholder= attr must not trip the guard');
  assert.ok(!isPlaceholderPatch(realSource));
});

check('does NOT flag a normal corrected source file', () => {
  const src = `export function merge(intervals) {
  if (!intervals.length) return [];
  const ordered = [...intervals].sort((a, b) => a[0] - b[0]);
  const out = [ordered[0]];
  for (const [s, e] of ordered.slice(1)) {
    const last = out[out.length - 1];
    if (s <= last[1]) last[1] = Math.max(last[1], e);
    else out.push([s, e]);
  }
  return out;
}`;
  assert.ok(!isPlaceholderPatch(src));
});

console.log('\n== end-to-end: resolved source enables VERIFIED-path bare-rewrite recovery ==');

check('with source-under-test in context, a bare rewrite is attributed -> JSON file_blocks (sandbox can run)', () => {
  // This is the Bug B chain: model omits ===FILE=== markers and returns the
  // corrected source as bare content. Recovery can only attribute it when the
  // file is in context -- which the new resolution step now guarantees.
  const SRC = `import { useState } from 'react';
export function useAuth() {
  const [user, setUser] = useState(null);
  const login = async (email, password) => {
    const res = await fetch('/api/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    return res.ok;
  };
  return { user, login };
}`;
  const FIXED = SRC.replace("method: 'POST'", "method: 'POST', headers: { 'Content-Type': 'application/json' }");
  // BEFORE the fix: context held only the test -> recovery has nothing to match.
  const onlyTest = { 'src/__tests__/auth.test.ts': `import { useAuth } from '../hooks/useAuth';\ntest('x', () => {});` };
  assert.strictEqual(recoverBareFileRewrite(FIXED, onlyTest), null, 'cannot attribute without the source in context');
  // AFTER the fix: source-under-test is resolved into context -> attributed.
  const withSource = { ...onlyTest, 'src/hooks/useAuth.ts': SRC };
  const r = recoverBareFileRewrite(FIXED, withSource);
  assert.ok(r && r.path === 'src/hooks/useAuth.ts', 'bare rewrite attributed to the resolved source file');
  assert.ok(/Content-Type/.test(r.content), 'recovered content keeps the fix');
});

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
