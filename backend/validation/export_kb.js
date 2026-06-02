// Export a curated retrieval KB from the verified corpus for production.
// Up to N distinct instances per category (the within-category convention is
// identical, so a handful teaches the pattern while keeping the file small).
//
// Usage: node export_kb.js [perCategory=10] [outFile]

const fs = require('fs');
const path = require('path');

const perCat = parseInt(process.argv[2], 10) || 10;
const outFile = process.argv[3] || path.join(__dirname, 'out', 'repair-kb.json');

const corpus = JSON.parse(fs.readFileSync(path.join(__dirname, 'out', 'manifest.json'), 'utf8'));
const byCat = {};
for (const m of corpus) (byCat[m.category] = byCat[m.category] || []).push(m);

const kb = [];
for (const cat of Object.keys(byCat).sort()) {
  for (const m of byCat[cat].slice(0, perCat)) {
    kb.push({
      id: m.id,
      category: m.category,
      description: m.description,
      errorMessage: m.logData.errorMessage,
      fix: m.oracle, // { path: content }
    });
  }
}

fs.writeFileSync(outFile, JSON.stringify(kb, null, 2));
const bytes = fs.statSync(outFile).size;
console.log(`Wrote KB: ${kb.length} pairs across ${Object.keys(byCat).length} categories -> ${outFile} (${(bytes / 1024).toFixed(0)} KB)`);
