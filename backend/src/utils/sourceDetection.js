// Language-agnostic source-file detection.
//
// WarpFix used to hardcode ~13 file extensions, so any repo in a language not on
// that list (Kotlin, Swift, C/C++ headers, Vue, Scala, Dart, ...) fetched zero
// source files and got declined for the wrong reason. This module makes
// detection future-proof in three ways:
//   1. The set of "source" extensions is derived from GitHub Linguist's
//      languages.yml (the same data GitHub uses), vendored as data/sourceExtensions.json.
//      That covers every language GitHub recognizes and updates via a data refresh,
//      not a code change.
//   2. Files named directly by the failure (stack trace / compiler error) are
//      always fetchable regardless of extension — the failure already told us
//      they matter, so we never gate them behind an allowlist.
//   3. We exclude known non-first-party / generated / vendored / binary paths
//      rather than allowlisting directories, so new languages are included by default.

const { extensions } = require('../data/sourceExtensions.json');

const SOURCE_EXTS = new Set(extensions);

// Directory segments that never hold patchable first-party source.
const EXCLUDED_DIR = /(^|\/)(node_modules|bower_components|jspm_packages|vendor|third_party|external|dist|build|out|output|target|\.gradle|bin|obj|coverage|\.nyc_output|\.next|\.nuxt|\.svelte-kit|\.output|\.git|\.idea|\.vscode|__pycache__|\.venv|venv|site-packages|\.tox|\.mypy_cache|\.pytest_cache|Pods|Carthage|DerivedData)(\/|$)/i;

// CI workflow + env files are off-limits to patch and should never be fetched as
// "source to fix".
const FORBIDDEN_DIR = /(^|\/)(\.github\/workflows)(\/|$)/i;

// Generated / minified / lockfile / typings / compiled artifacts that look like
// source by extension but must not be treated as editable source.
const EXCLUDED_FILE = /(\.min\.(?:js|css)|\.bundle\.js|-lock\.json|package-lock\.json|yarn\.lock|pnpm-lock\.yaml|composer\.lock|Cargo\.lock|poetry\.lock|Gemfile\.lock|\.map|\.d\.ts|\.pb\.go|_pb2\.py|_pb2_grpc\.py|\.designer\.cs|\.g\.dart|\.freezed\.dart)$/i;

// Asset/binary extensions Linguist may label "markup" (e.g. .svg) but which we
// never patch as code.
const ASSET_EXT = /\.(?:svg|png|jpe?g|gif|ico|bmp|webp|woff2?|ttf|otf|eot|pdf|zip|gz|tgz|tar|7z|rar|mp4|mov|mp3|wav|ogg|class|jar|war|so|dylib|dll|exe|o|a|wasm|bin|lock)$/i;

// Test files: WarpFix fixes the SOURCE, not the tests, so we don't pad context
// with them. Covers dir-based layouts (test/, __tests__/, spec/), the
// JS/Python/Ruby/Go dotted & underscored conventions (foo.test.js, test_foo.py,
// foo_test.go, foo_spec.rb), and the JVM CamelCase class convention
// (FooTest.kt, FooTests.java, FooSpec.scala, FooIT.java). The JVM clause is
// case-SENSITIVE on purpose so "Latest.kt", "Manifest.kt", "Greatest.kt" (which
// merely end in a lowercase "test"/"it") are never misclassified as tests.
const TEST_PATH = /(^|\/)(tests?|__tests__|__mocks__|specs?)\/|\.(test|spec)\.\w+$|(^|\/)test\.\w+$|(^|\/)(?:test|spec)_[\w-]+\.\w+$|[\w-]+_(?:test|spec)\.\w+$/i;
const TEST_JVM = /(?:Test|Tests|Spec|IT|ITCase)\.(?:kt|kts|java|scala|groovy|clj|cljc|cljs)$/;

function isTest(filePath) {
  if (!filePath || typeof filePath !== 'string') return false;
  return TEST_PATH.test(filePath) || TEST_JVM.test(filePath);
}

// Build/packaging wrapper files. They're "source" by extension but almost never
// hold the application bug, so they must rank BELOW real code when we pad
// context — otherwise a root-level build.gradle.kts / gradlew (depth 1) crowds
// the actual src/.../Foo.kt (depth 5) out of the capped fetch budget.
const BUILD_FILE = /(^|\/)(?:build\.gradle(?:\.kts)?|settings\.gradle(?:\.kts)?|gradlew(?:\.bat)?|pom\.xml|build\.sbt|Makefile|CMakeLists\.txt|webpack\.config\.\w+|rollup\.config\.\w+|vite\.config\.\w+)$|\.(?:gradle|sbt|bat|cmd|mk)$/i;
function isBuildFile(filePath) {
  return !!filePath && typeof filePath === 'string' && BUILD_FILE.test(filePath);
}

function getExtension(filePath) {
  if (!filePath || typeof filePath !== 'string') return '';
  const base = filePath.split('/').pop();
  const dot = base.lastIndexOf('.');
  if (dot <= 0) return ''; // no extension, or dotfile like ".gitignore"
  return base.slice(dot).toLowerCase();
}

// Coarse language family for an extension. Used to keep retrieval few-shot
// examples in the SAME language as the repair: injecting JS examples into a
// Python (or Kotlin/Go/...) repair drifts the model off the required output
// format and toward wrong fixes (measured: 5/5 -> 0/5 on a real Python bug).
// Extensions in the same family share enough syntax that examples transfer
// (e.g. JS/TS). Unknown extensions fall back to the extension itself, so a new
// language only ever matches its own files — future-proof, no allowlist to
// maintain for detection (that still comes from Linguist via SOURCE_EXTS).
const LANG_FAMILY = {
  '.js': 'js', '.jsx': 'js', '.mjs': 'js', '.cjs': 'js',
  '.ts': 'js', '.tsx': 'js', '.mts': 'js', '.cts': 'js', '.vue': 'js', '.svelte': 'js',
  '.py': 'python', '.pyi': 'python',
  '.rb': 'ruby', '.rake': 'ruby',
  '.go': 'go',
  '.rs': 'rust',
  '.java': 'java',
  '.kt': 'kotlin', '.kts': 'kotlin',
  '.cs': 'csharp',
  '.c': 'cpp', '.cc': 'cpp', '.cpp': 'cpp', '.cxx': 'cpp', '.h': 'cpp', '.hpp': 'cpp', '.hh': 'cpp',
  '.php': 'php',
  '.swift': 'swift',
  '.scala': 'scala', '.sc': 'scala',
  '.dart': 'dart',
  '.ex': 'elixir', '.exs': 'elixir',
};

// Language family key for a single file (extension-based), or '' if no extension.
function languageKey(filePath) {
  const ext = getExtension(filePath);
  if (!ext) return '';
  return LANG_FAMILY[ext] || ext;
}

// Dominant language family across a list of paths (ignoring tests / non-source),
// or '' when none can be determined. Used to label both the repair and each
// few-shot example so we only ever pair same-language examples.
function dominantLanguage(paths) {
  const counts = {};
  for (const p of paths || []) {
    if (!p || isTest(p)) continue;
    const k = languageKey(p);
    if (!k) continue;
    counts[k] = (counts[k] || 0) + 1;
  }
  let best = '';
  let bestN = 0;
  for (const [k, n] of Object.entries(counts)) {
    if (n > bestN) { best = k; bestN = n; }
  }
  return best;
}

function isExcludedPath(filePath) {
  return EXCLUDED_DIR.test(filePath)
    || FORBIDDEN_DIR.test(filePath)
    || EXCLUDED_FILE.test(filePath)
    || ASSET_EXT.test(filePath);
}

// True if a path is a source file we can use for repo-wide context: a known
// Linguist source/markup extension that isn't excluded/generated/test.
function isSourceFile(filePath) {
  if (!filePath || isExcludedPath(filePath)) return false;
  if (isTest(filePath)) return false;
  return SOURCE_EXTS.has(getExtension(filePath));
}

// True if a file NAMED BY THE FAILURE should be fetched. More permissive than
// isSourceFile: the failure already pointed at it, so we fetch it even if the
// extension is unknown to Linguist (new/niche language) — we only refuse clearly
// non-source things (vendored dirs, generated artifacts, binaries, workflows).
function isFetchableAffectedFile(filePath) {
  if (!filePath || typeof filePath !== 'string') return false;
  if (isExcludedPath(filePath)) return false;
  return true;
}

// --- Source-under-test resolution -------------------------------------------
//
// A `test_failure` stack trace usually names only the TEST file (e.g. the
// failing assertion is in `Login.test.tsx`), not the source the test exercises.
// If we feed the model only the test, it has no real code to fix: it either
// emits a natural-language placeholder ("// I cannot see the actual source
// file") or rewrites the correct file from memory as bare content that the
// bare-rewrite recovery can't attribute (the file isn't in context) — so the
// patch is stored unparseable, the sandbox can't reconstruct it, and the repair
// stays UNVERIFIED → no PR. Resolving the test's local imports back to repo
// source paths puts the source-under-test into context, which fixes both.

// Drop a source/index suffix so a repo path can be matched against an import
// specifier that omits the extension: 'src/hooks/useAuth.ts' and
// 'src/hooks/useAuth/index.ts' both reduce to 'src/hooks/useAuth'.
function importKeyForRepoPath(p) {
  let s = String(p).replace(/\\/g, '/');
  s = s.replace(/\/index\.\w+$/i, '');
  s = s.replace(/\.\w+$/i, '');
  return s;
}

// Resolve a relative specifier ('../hooks/useAuth') against the importing file's
// directory, collapsing '.' and '..' segments. Returns a normalized repo-style
// key with no extension.
function resolveRelative(fromDir, spec) {
  const parts = fromDir ? fromDir.split('/').filter(Boolean) : [];
  for (const seg of spec.split('/')) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') { parts.pop(); continue; }
    parts.push(seg);
  }
  return parts.join('/');
}

// Extract every module specifier a JS/TS file imports (static + dynamic + CJS).
function extractImportSpecifiers(content) {
  if (!content || typeof content !== 'string') return [];
  const specs = new Set();
  const patterns = [
    /\bimport\b[^'"]*?\bfrom\s*['"]([^'"]+)['"]/g, // import x from 'y'
    /\bimport\s*['"]([^'"]+)['"]/g, //               import 'y' (side-effect)
    /\bexport\b[^'"]*?\bfrom\s*['"]([^'"]+)['"]/g, // export ... from 'y'
    /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g, //     require('y')
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g, //      import('y')
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(content)) !== null) specs.add(m[1]);
  }
  return [...specs];
}

// A LOCAL (first-party) import we may resolve to repo source. Bare package
// names (react, lodash) and scoped packages (@chakra-ui/react) live in
// node_modules and aren't patchable; relative paths and common path aliases
// (@/, ~/, src/, app/, lib/, ...) are local.
function isLocalSpecifier(spec) {
  if (!spec || typeof spec !== 'string') return false;
  if (spec.startsWith('.') || spec.startsWith('/')) return true;
  if (/^[~@]\//.test(spec)) return true; // alias root '@/x', '~/x' (NOT '@scope/pkg')
  if (/^(?:src|app|lib|components|hooks|pages|utils|services|store|modules|features)\//.test(spec)) return true;
  return false;
}

// Map one import specifier to the concrete repo source path(s) it refers to.
// Prefers an exact import-key match (handles file + /index); falls back to a
// suffix match so unknown alias roots / monorepo prefixes still resolve, taking
// the single closest (shortest) hit to avoid mis-attribution.
function matchSpecifierToRepo(spec, fromDir, repoKeyMap, repoKeys) {
  let key;
  if (spec.startsWith('.')) {
    key = resolveRelative(fromDir, spec);
  } else {
    key = spec.replace(/^[~@]\//, '').replace(/^\//, ''); // '@/x'->'x', '/x'->'x'
  }
  key = importKeyForRepoPath(key); // strip a trailing extension if the import included one
  if (!key) return [];
  if (repoKeyMap.has(key)) return repoKeyMap.get(key).slice();
  const suffix = '/' + key;
  const cand = repoKeys.filter((ik) => ik === key || ik.endsWith(suffix));
  if (!cand.length) return [];
  cand.sort((a, b) => a.length - b.length);
  return (repoKeyMap.get(cand[0]) || []).slice();
}

// Given the failing TEST files (+ their fetched contents) and the repo's known
// source files, return the repo source paths the tests import — i.e. the
// source-under-test we should pull into the model's context. Pure + offline.
function resolveImportedSourceFiles({ testFiles = [], testContents = {}, repoFiles = [] } = {}) {
  const repoSources = (repoFiles || []).filter((p) => isSourceFile(p));
  if (!repoSources.length) return [];
  const repoKeyMap = new Map();
  for (const p of repoSources) {
    const k = importKeyForRepoPath(p);
    if (!repoKeyMap.has(k)) repoKeyMap.set(k, []);
    repoKeyMap.get(k).push(p);
  }
  const repoKeys = [...repoKeyMap.keys()];
  const out = new Set();
  for (const tf of testFiles || []) {
    const content = testContents[tf];
    if (!content) continue;
    const fromDir = tf.includes('/') ? tf.slice(0, tf.lastIndexOf('/')) : '';
    for (const spec of extractImportSpecifiers(content)) {
      if (!isLocalSpecifier(spec)) continue;
      for (const m of matchSpecifierToRepo(spec, fromDir, repoKeyMap, repoKeys)) {
        if (isSourceFile(m) && !isTest(m)) out.add(m);
      }
    }
  }
  return [...out];
}

module.exports = {
  SOURCE_EXTS,
  getExtension,
  languageKey,
  dominantLanguage,
  isExcludedPath,
  isSourceFile,
  isFetchableAffectedFile,
  isBuildFile,
  isTestPath: isTest,
  extractImportSpecifiers,
  isLocalSpecifier,
  resolveImportedSourceFiles,
};
