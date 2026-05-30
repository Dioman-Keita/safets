# Baseline & CI

## The problem with existing projects

When you run SafeTS on an existing project for the first time, you may see dozens or hundreds of findings. You can't fix them all at once — and you shouldn't block your team on legacy debt.

The baseline system solves this.

## How it works

```bash
# Step 1 — snapshot current state
npx safets baseline
```

This creates `.safets-baseline.json` at the root of your project:

```json
{
  "version": "1.0.2",
  "date": "2025-03-12T13:00:00.000Z",
  "options": {
    "includeTests": false
  },
  "crashes": [
    { "file": "src/auth.ts", "line": 12, "expr": "user.profile.email" },
    ...
  ]
}
```

```bash
# Step 2 — commit the baseline
git add .safets-baseline.json
git commit -m "chore: add SafeTS baseline"
```

::: warning
The baseline file must be committed to version control so all team members and CI use the same reference point.
:::

```bash
# Step 3 — block only new crashes in CI
npx safets doctor --fail-on-new
```

- `exit 0` — no new crashes since baseline
- `exit 1` — a new crash was introduced, CI fails

## Debt tracking over time

When a baseline exists, `safets debt` shows the delta per category:

```
Unprotected JSON.parse          28  (↑2 new)
Non-null assertion on nullable  236  (same)
Unsafe process.env access        5  (↓1 fixed)
────────────────────────────────────────────
Total                           297  (+1 since baseline)
```

## Options mismatch warning

The baseline stores the options used when it was created. If you run `--fail-on-new` with different options, SafeTS warns you:

```
⚠ Baseline mismatch: baseline was saved with includeTests=false
  but current run uses includeTests=true.
  Re-run 'safets baseline' to update.
```

## GitHub Actions example

```yaml
# .github/workflows/safets.yml
name: SafeTS

on: [push, pull_request]

jobs:
  safets:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx safets doctor --fail-on-new
```
