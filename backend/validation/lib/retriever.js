// Lightweight retrieval over a corpus of verified (error -> fix) pairs.
// Keyword (Jaccard over error+description tokens) + small same-category boost.
// Mirrors what production will use to inject few-shot examples into the patch
// prompt. No embeddings/deps so it runs anywhere (incl. the live worker).

function tokenize(s) {
  return new Set((s || '').toLowerCase().match(/[a-z0-9_]+/g) || []);
}
function jaccard(a, b) {
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const uni = a.size + b.size - inter;
  return uni ? inter / uni : 0;
}

function buildKB(entries) {
  // entries: [{ id, category, description, errorMessage, fix(filesObj) }]
  return entries.map((e) => ({
    ...e,
    _tok: tokenize(`${e.errorMessage} ${e.description}`),
  }));
}

function retrieve(kb, query, k = 3, excludeId = null) {
  const qt = tokenize(`${query.errorMessage} ${query.description || ''}`);
  const scored = kb
    .filter((e) => e.id !== excludeId)
    .map((e) => ({ e, s: jaccard(qt, e._tok) + (e.category && e.category === query.category ? 0.2 : 0) }))
    .sort((a, b) => b.s - a.s);
  return scored.slice(0, k).map((x) => x.e);
}

// Render retrieved examples as a prompt section the model can learn from.
function renderExamples(examples) {
  if (!examples || examples.length === 0) return '';
  let s = '\n----- SIMILAR FIXES THAT ALREADY PASSED CI (reference patterns, do not copy paths) -----\n';
  examples.forEach((ex, i) => {
    s += `\nExample ${i + 1} — ${ex.category}: ${ex.description}\n`;
    s += `Error: ${(ex.errorMessage || '').split('\n')[0]}\n`;
    s += `Working fix:\n`;
    for (const [path, content] of Object.entries(ex.fix || {})) {
      s += `===FILE: ${path}===\n${content}===END_FILE===\n`;
    }
  });
  s += '----- END SIMILAR FIXES -----\n';
  return s;
}

module.exports = { tokenize, jaccard, buildKB, retrieve, renderExamples };
