# CLI Reference

## Commands

### `safets doctor`

Scan your project and report potential runtime crashes.

```bash
npx safets doctor [options]
```

| Option | Description |
|--------|-------------|
| `--fail-on-new` | Exit with code 1 if new crashes found since baseline |
| `--include-tests` | Include test files (`*.test.ts`, `*.spec.ts`, etc.) |
| `--baseline` | Scan and save baseline in one command |
| `--json` | Output results as JSON |

---

### `safets fix`

Print fix suggestions to stdout. **Never modifies source files.**

```bash
npx safets fix [--include-tests]
```

---

### `safets debt`

Show crash counts grouped by pattern. Displays delta vs baseline if one exists.

```bash
npx safets debt [--include-tests]
```

---

### `safets baseline`

Snapshot the current state for use with `--fail-on-new`.

```bash
npx safets baseline [--include-tests]
```

Creates `.safets-baseline.json` at the project root. Commit this file.

---

## Exit codes

| Code | Meaning |
|------|---------|
| `0` | No crashes, or no new crashes vs baseline |
| `1` | New crashes detected (only with `--fail-on-new`) |

---

## Excluded by default

SafeTS automatically skips:

**Directories:** `node_modules`, `dist`, `build`, `out`, `.next`, `coverage`, `generated`, `evals`, `integration-tests`, `.prisma`

**File patterns:** `*.test.ts`, `*.spec.ts`, `/__tests__/`, `/test/`, `/tests/`, `/test-utils/`

**Large files:** Files over 5000 lines (compiled bundles, generated clients)

Use `--include-tests` to include test file patterns.
