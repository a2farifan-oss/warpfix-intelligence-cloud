#!/usr/bin/env node
/*
 * Regenerates src/data/sourceExtensions.json from GitHub Linguist's languages.yml.
 *
 * Linguist (https://github.com/github-linguist/linguist, MIT licensed) is the
 * canonical engine GitHub itself uses to detect repo languages. By deriving our
 * "what counts as patchable source" set from it, WarpFix recognizes every
 * language/extension GitHub knows (~600 languages, ~1000+ extensions) and stays
 * future-proof: adding a new language is a data refresh, not a code change.
 *
 * Usage:
 *   curl -sL https://raw.githubusercontent.com/github-linguist/linguist/main/lib/linguist/languages.yml -o /tmp/languages.yml
 *   node scripts/genLanguageExtensions.js /tmp/languages.yml
 *
 * Requires js-yaml (already available transitively; add as devDependency if pruned).
 */
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const src = process.argv[2] || '/tmp/languages.yml';
const doc = yaml.load(fs.readFileSync(src, 'utf8'));

// Keep languages that represent editable source/markup code a repair bot can
// patch. Exclude "data" (JSON/YAML/CSV/...) and "prose" (Markdown/text): those
// aren't code we generate source fixes for and would only add noise.
const KEEP_TYPES = new Set(['programming', 'markup']);
const exts = new Set();
for (const info of Object.values(doc)) {
  if (!info || !KEEP_TYPES.has(info.type)) continue;
  for (const e of info.extensions || []) {
    if (typeof e === 'string' && e.startsWith('.')) exts.add(e.toLowerCase());
  }
}

const sorted = Array.from(exts).sort();
const out = {
  _comment:
    'Auto-generated from GitHub Linguist languages.yml (type: programming|markup). '
    + 'Source of truth for which file extensions WarpFix treats as patchable source. '
    + 'Regenerate via scripts/genLanguageExtensions.js. Linguist is MIT licensed.',
  _source: 'https://github.com/github-linguist/linguist/blob/main/lib/linguist/languages.yml',
  generatedExtensionCount: sorted.length,
  extensions: sorted,
};
const dest = path.join(__dirname, '..', 'src', 'data', 'sourceExtensions.json');
fs.writeFileSync(dest, `${JSON.stringify(out, null, 2)}\n`);
console.log(`Wrote ${sorted.length} source extensions to ${dest}`);
