---
name: safets-agent
description: Use SafeTS to find TypeScript runtime crash risks in a repository. Trigger when auditing TypeScript safety, investigating possible undefined/null crashes, adding SafeTS CI/baseline checks, or reviewing SafeTS JSON/debt/fix output.
metadata:
  short-description: Run SafeTS runtime-safety checks for TypeScript
---

# SafeTS Agent

Use this skill when the user wants an AI agent to run or interpret SafeTS on a TypeScript project.

SafeTS is read-only: it reports runtime crash risks and suggestions, but does not modify source files.

## Quick Workflow

1. Detect the project root and package manager:
   - `bun.lock` or `bun.lockb` -> Bun
   - `pnpm-lock.yaml` -> pnpm
   - `package-lock.json` -> npm
   - otherwise use npm unless the user says otherwise
2. Prefer an existing local installation/script if present.
3. If SafeTS is not installed and the user wants a persistent setup, add it as a dev dependency.
4. If the user only wants an audit, run SafeTS from an isolated temporary install.
5. Run `doctor` first. Use `--json` when another tool, CI system, or bot needs to consume results.
6. Summarize findings by file, pattern, and confidence. Do not blindly apply suggestions.
7. For CI adoption, create/commit a baseline, then gate with `--fail-on-new`.

## Install Commands

Use the scoped npm package. The installed binary is still `safets`.

```bash
npm install --save-dev @safets-org/cli typescript
bun add -D @safets-org/cli typescript
pnpm add -D @safets-org/cli typescript
```

Run after installing:

```bash
npx safets doctor
bunx safets doctor
pnpm exec safets doctor
```

## Isolated One-Off Audit

Use this when you should not edit `package.json` or lockfiles.

```bash
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
npm install --prefix "$tmp" --no-save --silent @safets-org/cli@latest
"$tmp/node_modules/.bin/safets" doctor
```

On Windows PowerShell:

```powershell
$tmp = Join-Path ([System.IO.Path]::GetTempPath()) ("safets-" + [System.Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $tmp | Out-Null
try {
  npm install --prefix $tmp --no-save --silent @safets-org/cli@latest
  & "$tmp\node_modules\.bin\safets.cmd" doctor
} finally {
  Remove-Item -LiteralPath $tmp -Recurse -Force
}
```

Use the isolated pattern instead of `npx -p @safets-org/cli safets` when reliability matters, because scoped package names and binary names differ.

## Commands

```bash
safets doctor              # human-readable runtime safety report
safets doctor --json       # machine-readable report
safets fix                 # read-only fix suggestions
safets debt                # grouped debt report
safets baseline            # write .safets-baseline.json
safets doctor --fail-on-new
safets doctor --include-tests
```

Use `--include-tests` only when the user explicitly wants test files included. SafeTS excludes tests by default.

## Interpreting Results

- HIGH: likely crash risk; inspect first.
- MEDIUM: suspicious pattern; verify control flow and runtime assumptions.
- `Unsafe process.env access`: check whether the value is required, defaulted, or validated elsewhere.
- `Unsafe access after await`: verify whether narrowed values can become stale across the async boundary.
- `Non-null assertion on nullable`: do not remove blindly; replace with explicit guard, default, or invariant check.

When proposing changes, keep SafeTS read-only semantics in mind: SafeTS suggests, the agent edits only after normal code review reasoning.

## Baseline And CI

For incremental adoption:

```bash
safets baseline
git add .safets-baseline.json
git commit -m "chore: add SafeTS baseline"
safets doctor --fail-on-new
```

The baseline stores scan options such as `includeTests`. If those options differ later, regenerate the baseline intentionally.

## GitHub Action

Recommended pinned workflow:

```yaml
- uses: Dioman-Keita/safets@v1.0.2
  with:
    version: 1.0.2
    fail-on-new: "true"
```

Use `json: "true"` when a later workflow step needs structured output.

## Agent Reporting

In the final response, include:

- Command(s) run and package manager used.
- Whether the scan was local install, isolated install, or GitHub Action.
- Total findings and top patterns.
- Any warnings or fallback mode.
- Files changed, if the agent made code or CI edits.
- Verification performed.
