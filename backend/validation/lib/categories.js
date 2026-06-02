// Diverse, oracle-graded bug fixtures. Each category is PARAMETRIC: given a
// seeded RNG it emits a distinct instance (different names / values), so we can
// scale to 1000+ unique fixtures while every one ships its known-correct fix.
//
// A fixture = {
//   category, description,
//   files:  { 'index.js': <buggy source> ... },   // the broken code
//   oracle: { 'index.js': <correct source> ... },  // the known-good fix
//   test:   <full test.js content>,                // FAILS on buggy, PASSES on oracle
//   isAsync: bool
// }
//
// test.js prints "FAIL: <name>: <msg>" for each failing check and exits 1,
// else prints "All N checks passed" and exits 0 — this stdout/stderr IS the
// CI log we feed to the parser, and re-running it after applying a candidate
// patch is the oracle grade.

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const sfx = (rng) => Math.floor(rng() * 0xfffff).toString(36);
const ri = (rng, lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];

// ---- test.js templates -------------------------------------------------------
function syncTest(requires, checks) {
  return `const assert = require('assert');
${requires}
const checks = [
${checks}
];
let failed = 0;
for (const [name, fn] of checks) {
  try { fn(); } catch (e) { failed++; console.error('FAIL: ' + name + ': ' + (e && e.message ? e.message : e)); }
}
if (failed) { console.error(failed + ' check(s) failed'); process.exit(1); }
console.log('All ' + checks.length + ' checks passed');
`;
}
function asyncTest(requires, checks) {
  return `const assert = require('assert');
${requires}
const checks = [
${checks}
];
(async () => {
  let failed = 0;
  for (const [name, fn] of checks) {
    try { await fn(); } catch (e) { failed++; console.error('FAIL: ' + name + ': ' + (e && e.message ? e.message : e)); }
  }
  if (failed) { console.error(failed + ' check(s) failed'); process.exit(1); }
  console.log('All ' + checks.length + ' checks passed');
})();
`;
}

// ---- categories --------------------------------------------------------------
const categories = {
  type_coercion(rng) {
    const fn = 'total_' + sfx(rng);
    const parse = 'parseAmounts_' + sfx(rng);
    const nums = [ri(rng, 5, 40), ri(rng, 5, 40), ri(rng, 5, 40)];
    const csv = nums.join(',');
    const expected = nums.reduce((a, b) => a + b, 0);
    const buggy = `function ${parse}(csv) {
  // returns the split tokens
  return csv.split(',').map(s => s.trim());
}
function ${fn}(csv) {
  return ${parse}(csv).reduce((a, b) => a + b, 0);
}
module.exports = { ${fn}, ${parse} };
`;
    const oracle = `function ${parse}(csv) {
  // tokens must be parsed to numbers so arithmetic works downstream
  return csv.split(',').map(s => Number(s.trim()));
}
function ${fn}(csv) {
  return ${parse}(csv).reduce((a, b) => a + b, 0);
}
module.exports = { ${fn}, ${parse} };
`;
    const test = syncTest(`const m = require('./index');`,
      `  ['${fn} sums numerically', () => assert.strictEqual(m.${fn}('${csv}'), ${expected})],`);
    return { category: 'type_coercion', description: 'CSV tokens left as strings cause string concatenation instead of numeric sum', files: { 'index.js': buggy }, oracle: { 'index.js': oracle }, test };
  },

  async_missing_await(rng) {
    const f = 'load_' + sfx(rng), g = 'compute_' + sfx(rng);
    const base = ri(rng, 2, 20), mult = ri(rng, 2, 6);
    const expected = base * mult;
    const buggy = `async function ${f}() { return ${base}; }
async function ${g}() {
  const v = ${f}();
  return v * ${mult};
}
module.exports = { ${f}, ${g} };
`;
    const oracle = `async function ${f}() { return ${base}; }
async function ${g}() {
  const v = await ${f}();
  return v * ${mult};
}
module.exports = { ${f}, ${g} };
`;
    const test = asyncTest(`const m = require('./index');`,
      `  ['${g} awaits the promise', async () => assert.strictEqual(await m.${g}(), ${expected})],`);
    return { category: 'async_missing_await', description: 'Missing await makes the function multiply a Promise (NaN)', files: { 'index.js': buggy }, oracle: { 'index.js': oracle }, test, isAsync: true };
  },

  null_safety(rng) {
    const f = 'firstWord_' + sfx(rng);
    const word = pick(rng, ['hello', 'devin', 'warpfix', 'engine', 'kaggle']);
    const buggy = `function ${f}(s) {
  return s.split(' ')[0];
}
module.exports = { ${f} };
`;
    const oracle = `function ${f}(s) {
  if (s == null || typeof s !== 'string') return '';
  return s.split(' ')[0];
}
module.exports = { ${f} };
`;
    const test = syncTest(`const m = require('./index');`,
      `  ['handles a normal string', () => assert.strictEqual(m.${f}('${word} world'), '${word}')],
  ['does not crash on null', () => assert.strictEqual(m.${f}(null), '')],`);
    return { category: 'null_safety', description: 'Function crashes on null/undefined input instead of guarding', files: { 'index.js': buggy }, oracle: { 'index.js': oracle }, test };
  },

  off_by_one(rng) {
    const f = 'page_' + sfx(rng);
    const size = ri(rng, 2, 4);
    const items = Array.from({ length: size * 3 }, (_, i) => i + 1);
    const firstPage = items.slice(0, size);
    const buggy = `function ${f}(arr, page, size) {
  // page is 1-based
  return arr.slice(page * size, page * size + size);
}
module.exports = { ${f} };
`;
    const oracle = `function ${f}(arr, page, size) {
  // page is 1-based
  return arr.slice((page - 1) * size, (page - 1) * size + size);
}
module.exports = { ${f} };
`;
    const test = syncTest(`const m = require('./index');`,
      `  ['page 1 returns the first chunk', () => assert.deepStrictEqual(m.${f}([${items.join(',')}], 1, ${size}), [${firstPage.join(',')}])],`);
    return { category: 'off_by_one', description: '1-based page index used as 0-based offset (off-by-one slice)', files: { 'index.js': buggy }, oracle: { 'index.js': oracle }, test };
  },

  array_mutation(rng) {
    const f = 'sortedDesc_' + sfx(rng);
    const arr = Array.from({ length: 4 }, () => ri(rng, 1, 99));
    const sorted = [...arr].sort((a, b) => b - a);
    const buggy = `function ${f}(arr) {
  return arr.sort((a, b) => b - a);
}
module.exports = { ${f} };
`;
    const oracle = `function ${f}(arr) {
  return [...arr].sort((a, b) => b - a);
}
module.exports = { ${f} };
`;
    const test = syncTest(`const m = require('./index');`,
      `  ['returns sorted descending', () => assert.deepStrictEqual(m.${f}([${arr.join(',')}]), [${sorted.join(',')}])],
  ['does not mutate the input', () => { const input = [${arr.join(',')}]; m.${f}(input); assert.deepStrictEqual(input, [${arr.join(',')}]); }],`);
    return { category: 'array_mutation', description: 'sort() mutates the caller\'s array (shared-state side effect)', files: { 'index.js': buggy }, oracle: { 'index.js': oracle }, test };
  },

  float_precision(rng) {
    const f = 'addMoney_' + sfx(rng);
    // Resample until the raw sum is NOT already equal to its 2-decimal rounding,
    // so the buggy (unrounded) version is guaranteed to fail.
    let a, b, expected;
    do {
      a = ri(rng, 1, 9) / 10;
      b = ri(rng, 1, 9) / 10;
      expected = Math.round((a + b) * 100) / 100;
    } while (a + b === expected);
    const buggy = `function ${f}(a, b) {
  return a + b;
}
module.exports = { ${f} };
`;
    const oracle = `function ${f}(a, b) {
  return Math.round((a + b) * 100) / 100;
}
module.exports = { ${f} };
`;
    const test = syncTest(`const m = require('./index');`,
      `  ['rounds to cents', () => assert.strictEqual(m.${f}(${a}, ${b}), ${expected})],`);
    return { category: 'float_precision', description: 'Floating-point sum not rounded to cents (0.1+0.2 !== 0.3)', files: { 'index.js': buggy }, oracle: { 'index.js': oracle }, test };
  },

  regex_extract(rng) {
    const f = 'digits_' + sfx(rng);
    const s = pick(rng, ['a1b2c3', 'x7y8', 'id42n9', 'p3q5r7']);
    const expected = s.replace(/\D/g, '');
    const buggy = `function ${f}(s) {
  return s.match(/\\d/)[0];
}
module.exports = { ${f} };
`;
    const oracle = `function ${f}(s) {
  return s.replace(/\\D/g, '');
}
module.exports = { ${f} };
`;
    const test = syncTest(`const m = require('./index');`,
      `  ['extracts all digits', () => assert.strictEqual(m.${f}('${s}'), '${expected}')],`);
    return { category: 'regex_extract', description: 'Regex captures only the first digit instead of all digits', files: { 'index.js': buggy }, oracle: { 'index.js': oracle }, test };
  },

  date_arithmetic(rng) {
    const f = 'addDays_' + sfx(rng);
    const n = ri(rng, 1, 9);
    const expected = n * 86400 * 1000;
    const buggy = `function ${f}(ms, n) {
  return ms + n * 86400;
}
module.exports = { ${f} };
`;
    const oracle = `function ${f}(ms, n) {
  return ms + n * 86400 * 1000;
}
module.exports = { ${f} };
`;
    const test = syncTest(`const m = require('./index');`,
      `  ['adds N days in milliseconds', () => assert.strictEqual(m.${f}(0, ${n}), ${expected})],`);
    return { category: 'date_arithmetic', description: 'Day offset computed in seconds, not milliseconds', files: { 'index.js': buggy }, oracle: { 'index.js': oracle }, test };
  },

  recursion_base(rng) {
    const f = 'fact_' + sfx(rng);
    const n = ri(rng, 4, 7);
    let expected = 1; for (let i = 2; i <= n; i++) expected *= i;
    const buggy = `function ${f}(n) {
  return n * ${f}(n - 1);
}
module.exports = { ${f} };
`;
    const oracle = `function ${f}(n) {
  if (n <= 1) return 1;
  return n * ${f}(n - 1);
}
module.exports = { ${f} };
`;
    const test = syncTest(`const m = require('./index');`,
      `  ['factorial of ${n}', () => assert.strictEqual(m.${f}(${n}), ${expected})],`);
    return { category: 'recursion_base', description: 'Missing recursion base case causes infinite recursion', files: { 'index.js': buggy }, oracle: { 'index.js': oracle }, test };
  },

  error_handling(rng) {
    const f = 'divide_' + sfx(rng);
    const a = ri(rng, 2, 20), b = ri(rng, 2, 5);
    const expected = a / b;
    const buggy = `function ${f}(a, b) {
  return a / b;
}
module.exports = { ${f} };
`;
    const oracle = `function ${f}(a, b) {
  if (b === 0) throw new Error('division by zero');
  return a / b;
}
module.exports = { ${f} };
`;
    const test = syncTest(`const m = require('./index');`,
      `  ['divides normally', () => assert.strictEqual(m.${f}(${a}, ${b}), ${expected})],
  ['throws on divide by zero', () => assert.throws(() => m.${f}(1, 0))],`);
    return { category: 'error_handling', description: 'Function returns Infinity instead of throwing on invalid input', files: { 'index.js': buggy }, oracle: { 'index.js': oracle }, test };
  },

  closure_scope(rng) {
    const f = 'makeGetters_' + sfx(rng);
    const k = ri(rng, 3, 4);
    const buggy = `function ${f}() {
  const fns = [];
  for (var i = 0; i < ${k}; i++) {
    fns.push(() => i);
  }
  return fns;
}
module.exports = { ${f} };
`;
    const oracle = `function ${f}() {
  const fns = [];
  for (let i = 0; i < ${k}; i++) {
    fns.push(() => i);
  }
  return fns;
}
module.exports = { ${f} };
`;
    const test = syncTest(`const m = require('./index');`,
      `  ['each closure captures its own index', () => { const fns = m.${f}(); assert.strictEqual(fns[0](), 0); assert.strictEqual(fns[1](), 1); }],`);
    return { category: 'closure_scope', description: 'var in loop shares one binding so all closures return the final value', files: { 'index.js': buggy }, oracle: { 'index.js': oracle }, test };
  },

  comparison_operator(rng) {
    const f = 'isAdult_' + sfx(rng);
    const threshold = pick(rng, [18, 21, 16]);
    const buggy = `function ${f}(age) {
  return age > ${threshold};
}
module.exports = { ${f} };
`;
    const oracle = `function ${f}(age) {
  return age >= ${threshold};
}
module.exports = { ${f} };
`;
    const test = syncTest(`const m = require('./index');`,
      `  ['boundary age ${threshold} is inclusive', () => assert.strictEqual(m.${f}(${threshold}), true)],
  ['below boundary is false', () => assert.strictEqual(m.${f}(${threshold - 1}), false)],`);
    return { category: 'comparison_operator', description: 'Strict > excludes the inclusive boundary; should be >=', files: { 'index.js': buggy }, oracle: { 'index.js': oracle }, test };
  },

  string_boundary(rng) {
    const f = 'lastChar_' + sfx(rng);
    const s = pick(rng, ['abc', 'devin', 'queue', 'patch']);
    const expected = s[s.length - 1];
    const buggy = `function ${f}(s) {
  return s[s.length];
}
module.exports = { ${f} };
`;
    const oracle = `function ${f}(s) {
  return s[s.length - 1];
}
module.exports = { ${f} };
`;
    const test = syncTest(`const m = require('./index');`,
      `  ['returns the last character', () => assert.strictEqual(m.${f}('${s}'), '${expected}')],`);
    return { category: 'string_boundary', description: 'Index s.length is one past the end (off-by-one on string index)', files: { 'index.js': buggy }, oracle: { 'index.js': oracle }, test };
  },

  // Two consumers, ONE shared root cause: the fix must be in the shared util only.
  multi_file_single_root(rng) {
    const tax = 'withTax_' + sfx(rng);
    const rate = pick(rng, [0.1, 0.2, 0.05]);
    const price = ri(rng, 100, 400);
    const qty = ri(rng, 2, 5);
    const expInvoice = +(price * (1 + rate)).toFixed(2);
    const expCart = +(price * qty * (1 + rate)).toFixed(2);
    const moneyBug = `function ${tax}(amount, rate) {
  // BUG: adds the rate as a flat amount instead of a percentage
  return amount + rate;
}
module.exports = { ${tax} };
`;
    const moneyFix = `function ${tax}(amount, rate) {
  return Math.round(amount * (1 + rate) * 100) / 100;
}
module.exports = { ${tax} };
`;
    const invoice = `const { ${tax} } = require('./money');
function invoiceTotal(price) { return ${tax}(price, ${rate}); }
module.exports = { invoiceTotal };
`;
    const cart = `const { ${tax} } = require('./money');
function cartTotal(price, qty) { return ${tax}(price * qty, ${rate}); }
module.exports = { cartTotal };
`;
    const test = syncTest(`const inv = require('./invoice');
const cart = require('./cart');`,
      `  ['invoice applies tax as a percentage', () => assert.strictEqual(inv.invoiceTotal(${price}), ${expInvoice})],
  ['cart applies tax as a percentage', () => assert.strictEqual(cart.cartTotal(${price}, ${qty}), ${expCart})],`);
    return { category: 'multi_file_single_root', description: 'Shared money util adds rate as flat amount; both invoice and cart fail. Fix only money.js', files: { 'money.js': moneyBug, 'invoice.js': invoice, 'cart.js': cart }, oracle: { 'money.js': moneyFix, 'invoice.js': invoice, 'cart.js': cart }, test };
  },

  // Two DISTINCT root causes in two files; the patch must edit BOTH.
  multi_file_multi_root(rng) {
    const addFn = 'add_' + sfx(rng), mulFn = 'mul_' + sfx(rng);
    const a = ri(rng, 3, 12), b = ri(rng, 3, 12);
    const buggyA = `function ${addFn}(a, b) {
  // BUG: subtraction
  return a - b;
}
module.exports = { ${addFn} };
`;
    const fixA = `function ${addFn}(a, b) {
  return a + b;
}
module.exports = { ${addFn} };
`;
    const buggyB = `function ${mulFn}(a, b) {
  // BUG: addition
  return a + b;
}
module.exports = { ${mulFn} };
`;
    const fixB = `function ${mulFn}(a, b) {
  return a * b;
}
module.exports = { ${mulFn} };
`;
    const test = syncTest(`const A = require('./mathadd');
const B = require('./mathmul');`,
      `  ['add works', () => assert.strictEqual(A.${addFn}(${a}, ${b}), ${a + b})],
  ['mul works', () => assert.strictEqual(B.${mulFn}(${a}, ${b}), ${a * b})],`);
    return { category: 'multi_file_multi_root', description: 'Two independent bugs in two files; both must be fixed in one patch', files: { 'mathadd.js': buggyA, 'mathmul.js': buggyB }, oracle: { 'mathadd.js': fixA, 'mathmul.js': fixB }, test };
  },
};

const CATEGORY_NAMES = Object.keys(categories);

function makeFixture(categoryName, seed) {
  const rng = mulberry32(seed);
  const f = categories[categoryName](rng);
  f.id = `${categoryName}_${seed}`;
  f.seed = seed;
  return f;
}

module.exports = { categories, CATEGORY_NAMES, makeFixture, mulberry32 };
