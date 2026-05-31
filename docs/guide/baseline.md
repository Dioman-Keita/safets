# Baseline & CI

## The problem with existing projects

When you run SafeTS on an existing project for the first time, you may see dozens or hundreds of findings. You cannot fix them all at once, and you should not block your team on legacy debt.

The baseline system solves this.

## How it works

Step 1 - snapshot current state:

<PackageManagerTabs mode="baseline" />

This creates `.safets-baseline.json` at the root of your project:

```json
{
  "version": "1.0.2",
  "date": "2025-03-12T13:00:00.000Z",
  "options": {
    "includeTests": false
  },
  "crashes": [
    { "file": "src/auth.ts", "line": 12, "expr": "user.profile.email" }
  ]
}
```

Step 2 - commit the baseline:

```bash
git add .safets-baseline.json
git commit -m "chore: add SafeTS baseline"
```

::: warning
The baseline file must be committed to version control so all team members and CI use the same reference point.
:::

Step 3 - block only new crashes in CI:

<PackageManagerTabs mode="ci" />

- `exit 0` - no new crashes since baseline
- `exit 1` - a new crash was introduced, CI fails

## Debt tracking over time

When a baseline exists, `safets debt` shows the delta per category:

```text
Unprotected JSON.parse          28  (2 new)
Non-null assertion on nullable  236  (same)
Unsafe process.env access        5  (1 fixed)
--------------------------------------------
Total                           297  (+1 since baseline)
```

## Options mismatch warning

The baseline stores the options used when it was created. If you run `--fail-on-new` with different options, SafeTS warns you:

```text
Baseline mismatch: baseline was saved with includeTests=false
  but current run uses includeTests=true.
  Re-run 'safets baseline' to update.
```

## GitHub Actions example

<PackageManagerTabs mode="ciWorkflow" />
