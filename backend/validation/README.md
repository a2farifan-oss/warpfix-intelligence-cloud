# WarpFix validation harness + retrieval corpus

An oracle-graded validation suite for the repair engine, and the generator for
the retrieval-augmented few-shot knowledge base shipped at
`backend/src/agents/data/repair-kb.json`.

Every fixture ships its own **known-correct fix (oracle)**, so grading is 100%
deterministic — no human review, no LLM judge. A fix "passes" only if applying
it makes the fixture's real `node` test go green.

## Why this exists

1. **Validate the deterministic engine at scale, for free.** The parser, guards
   and sandbox are exercised across 1000+ diverse fixtures with zero token cost.
2. **Measure repair quality** on a diverse, categorized sample.
3. **Generate + verify the retrieval KB** that teaches the engine conventions it
   cannot infer from a CI error alone.

## Categories (15)

`type_coercion`, `async_missing_await`, `null_safety`, `off_by_one`,
`array_mutation`, `float_precision`, `regex_extract`, `date_arithmetic`,
`recursion_base`, `error_handling`, `closure_scope`, `comparison_operator`,
`string_boundary`, `multi_file_single_root`, `multi_file_multi_root`.

Fixtures are parametric (seeded RNG) so the corpus scales to thousands of unique,
reproducible cases.

## Commands

```bash
# 1) Generate + self-verify a corpus (buggy must fail, oracle must pass)
node generate.js 1000          # -> out/manifest.json, out/prompts.jsonl

# 2) Grade model completions (from the offline GPU run) against the oracle
node grade.js <completions.jsonl> out/manifest.json   # -> out/scorecard.json

# 3) Build the held-out retrieval-lift experiment (baseline vs retrieval)
node build_experiment.js 8 3   # 8/category, top-3 retrieved -> experiment/

# 4) Grade the experiment -> per-category lift table
node grade_experiment.js       # -> experiment/lift.json

# 5) Export the production KB from a generated corpus
node export_kb.js 10           # -> out/repair-kb.json (ship to src/agents/data/)
```

The harness reuses the **real** production `logParser` (`../src/agents/logParser`)
and the production patch-prompt / file-block format (`lib/promptlib.js`), so
results reflect the live engine.

## Results (committed as evidence)

- `RESULTS-pilot-scorecard.json` — Qwen2.5-Coder-7B baseline on a 60-fixture
  sample (offline GPU via Ollama), graded locally.
- `RESULTS-retrieval-lift.json` — 120 held-out fixtures (seeds outside the KB),
  each graded **baseline vs retrieval-augmented**:
  **82.5% → 100.0%** overall, biggest gains on `null_safety` (0→100%),
  `regex_extract` (12.5%→100%), `multi_file_single_root` (62.5%→100%), with
  **no category regression**.

## Notes

- Generated artifacts (`out/`, `experiment/`) are git-ignored.
- The corpus is generated offline (e.g. on free Kaggle GPU) — never used as a
  production backend.
