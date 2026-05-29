# GitHub Action

SafeTS ships a composite GitHub Action for CI adoption.

## Minimal Workflow

```yaml
name: SafeTS

on:
  pull_request:
  push:
    branches:
      - main

jobs:
  safets:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
      - uses: Dioman-Keita/safets@v1.0.0
```

The default action command is `safets doctor`.

## Baseline CI

To block only newly introduced crashes, commit a SafeTS baseline first:

```bash
npx @safets-org/cli baseline
git add .safets-baseline.json
git commit -m "chore: add SafeTS baseline"
```

Then enable `fail-on-new` in CI:

```yaml
name: SafeTS

on:
  pull_request:

jobs:
  safets:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
      - uses: Dioman-Keita/safets@v1.0.0
        with:
          fail-on-new: "true"
```

## Inputs

| Input | Default | Description |
| --- | --- | --- |
| `command` | `doctor` | SafeTS command to run: `doctor`, `debt`, `fix`, or `baseline`. |
| `version` | `latest` | SafeTS npm version executed through `npx`. |
| `working-directory` | `.` | Project directory where SafeTS should run. |
| `fail-on-new` | `false` | Adds `--fail-on-new` for baseline-aware CI gating. |
| `include-tests` | `false` | Adds `--include-tests`. |
| `json` | `false` | Adds `--json` for machine-readable output. |

For reproducible CI, pin both the action ref and npm package version:

```yaml
- uses: Dioman-Keita/safets@v1.0.0
  with:
    version: 1.0.0
    fail-on-new: "true"
```
