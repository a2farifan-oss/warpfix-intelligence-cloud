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
// with them (kept from the original behavior).
const TEST_PATH = /(^|\/)(tests?|__tests__|__mocks__|spec)\/|\.(test|spec)\.\w+$|(^|\/)test\.\w+$/i;

function getExtension(filePath) {
  if (!filePath || typeof filePath !== 'string') return '';
  const base = filePath.split('/').pop();
  const dot = base.lastIndexOf('.');
  if (dot <= 0) return ''; // no extension, or dotfile like ".gitignore"
  return base.slice(dot).toLowerCase();
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
  if (TEST_PATH.test(filePath)) return false;
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

module.exports = {
  SOURCE_EXTS,
  getExtension,
  isExcludedPath,
  isSourceFile,
  isFetchableAffectedFile,
  isTestPath: (p) => TEST_PATH.test(p),
};
