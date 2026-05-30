# Changelog

## v1.0.2

- Fix: `process.env.PORT` detection improved
- Fix: `isSubChainDuplicate` no longer skips `process.env.X.method()` chains

## v1.0.1

- Fix: `isOptionalAccess` false negatives on `a?.b.c` patterns (reported by Qodo Code Review)

## v1.0.0

- First public release on npm as `@safets-org/cli`
- 9 crash patterns
- Baseline & CI support with `--fail-on-new`
- `--include-tests` flag
- Bundle file detection (skip files > 5000 lines)
- JSON output with `--json`

## v0.8.0

- Refactor: split monolithic `index.ts` into `src/detectors/`, `src/reporters/`, `src/utils/`
- Baseline now stores options (`includeTests`) and warns on mismatch
- `debt` command shows delta vs baseline per category
- Added `evals/`, `integration-tests/`, `.prisma` to default exclusions

## v0.7.0

- Test files excluded by default (`*.test.ts`, `*.spec.ts`, etc.)
- `--include-tests` flag added
- `isOptionalAccess` fix (partially — completed in v1.0.1)

## v0.6.0

- 9 patterns fully implemented
- Baseline system introduced
- Tested on `google-gemini/gemini-cli` — 297 findings
