# SafeTS

<p align="center">
  <a href="https://github.com/Dioman-Keita/safets/actions/workflows/ci.yml"><img alt="Build" src="https://github.com/Dioman-Keita/safets/actions/workflows/ci.yml/badge.svg"></a>
  <a href="https://www.npmjs.com/package/@safets-org/cli"><img alt="npm" src="https://img.shields.io/npm/v/@safets-org/cli?color=cb3837&label=npm"></a>
  <a href="https://github.com/Dioman-Keita/safets/blob/main/LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-blue.svg"></a>
  <a href="https://www.typescriptlang.org/"><img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.x-3178c6.svg"></a>
  <a href="https://dioman-keita.github.io/safets/"><img alt="Docs" src="https://img.shields.io/badge/docs-GitHub%20Pages-222.svg"></a>
</p>

**Finds common runtime crashes TypeScript can't detect.**

TypeScript catches type errors at compile time, but some crash patterns slip through even with `strict: true`. SafeTS uses the TypeScript Compiler API to detect them before they hit production.

```
Cannot read properties of undefined (reading 'name')
```

---

## Install

```bash
npm install --save-dev @safets-org/cli typescript
```

With Bun:

```bash
bun add -D @safets-org/cli typescript
```

With pnpm:

```bash
pnpm add -D @safets-org/cli typescript
```

No runtime TypeScript loader is required. SafeTS uses the TypeScript compiler already in your project.

The npm package is scoped as `@safets-org/cli`, but the installed command is still `safets`.

---

## Usage

Run the installed `safets` binary with your package manager:

```bash
npx safets doctor
pnpm exec safets doctor
bunx safets doctor
```

Or add package scripts and run `safets` directly inside those scripts:

```bash
safets doctor
safets doctor --include-tests
safets fix
safets debt
safets baseline
safets doctor --fail-on-new
safets doctor --json
```

Common flags:

```bash
safets --help
safets --version
```

### GitHub Action

The Marketplace "Use latest version" button shows GitHub's minimal action snippet. For a real CI setup, use a complete workflow:

```yaml
name: SafeTS

on: [push, pull_request]

jobs:
  safets:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - uses: Dioman-Keita/safets@v1.0.2
        with:
          command: doctor
```

To block only new crashes after committing `.safets-baseline.json`:

```yaml
- uses: Dioman-Keita/safets@v1.0.2
  with:
    command: doctor
    fail-on-new: "true"
```

Action inputs:

| Input | Default | Description |
| --- | --- | --- |
| `command` | `doctor` | SafeTS command to run: `doctor`, `fix`, `debt`, or `baseline`. |
| `version` | `latest` | npm version of `@safets-org/cli` to install. |
| `working-directory` | `.` | Directory where SafeTS should run. |
| `fail-on-new` | `false` | Fail the workflow only for crashes not present in the baseline. |
| `include-tests` | `false` | Include test files in the analysis. |
| `json` | `false` | Print machine-readable JSON output. |

### JSON Output

Use `--json` when SafeTS output needs to be consumed by CI, scripts, bots, or editor integrations.

```bash
safets doctor --json
safets debt --json
safets fix --json
safets baseline --json
```

The JSON schema is versioned with `schemaVersion`. Each report includes:

- `safetsVersion`, `command`, and scan `options`
- `program.strategy`, `program.configFiles`, `program.fallback`, and `program.warnings`
- `baseline.present`, `baseline.compatible`, `baseline.mismatch`, and saved baseline metadata when relevant
- `summary.total`, `summary.new`, `summary.known`, `summary.byPattern`, and fallback count
- `debt[]` entries with current count, baseline count, and delta when a compatible baseline exists
- `crashes[]` entries with project-relative file path, location, expression, root expression, type, pattern, confidence, baseline status, crash path, and suggestions

`doctor --json --fail-on-new` still exits with code `1` when new crashes are found, but prints the JSON report first.

---

## How It Works

**SafeTS is read-only.** It never modifies your source code. `safets fix` only prints suggestions to stdout, and you apply them manually.

SafeTS scans your TypeScript files using the Compiler API, builds a type-checked program, and walks the AST looking for patterns that TypeScript's own checker allows but that can still crash at runtime.

Test files (`*.test.ts`, `*.spec.ts`, `/__tests__/`, and similar paths) are excluded by default. Use `--include-tests` to include them.

Files over 5000 lines, such as compiled bundles or generated Prisma clients, are automatically skipped.

---

## Real-World Validation

SafeTS v1.0.0 was tested in zero-setup mode against public TypeScript repositories: clone, build SafeTS, then run `safets doctor --json` without installing each target repo's dependencies. Test files and test-only tsconfigs are excluded by default, matching normal SafeTS CLI behavior.

| Repository | TS/TSX files | Strategy | Result | Duration | Perf | Fallback | Findings |
| --- | ---: | --- | --- | ---: | --- | --- | ---: |
| `google-gemini/gemini-cli` | 2108 | root-tsconfig | ok | 16s | ok | false | 247 |
| `vitejs/vite` | 563 | workspace-tsconfigs | ok | 21s | ok | false | 43 |
| `prisma/prisma` | 2701 | root-tsconfig | ok | 15s | ok | false | 267 |
| `supabase/supabase` | 6669 | root-tsconfig | ok | 24s | ok | false | 157 |
| `vitest-dev/vitest` | 2038 | workspace-tsconfigs | ok | 35s | ok | false | 298 |
| `withastro/astro` | 2094 | workspace-tsconfigs | ok | 24s | ok | false | 394 |

No target fell back to AST-only mode. The current public documentation lives at https://dioman-keita.github.io/safets/.

---

## Documentation

- [SafeTS docs](https://dioman-keita.github.io/safets/)
- [Local VitePress source](./docs/index.md)
- [Getting started](./docs/guide/getting-started.md)

---

## The 9 Patterns

| Pattern | Confidence | Example |
| --- | --- | --- |
| Unsafe property access | HIGH | `user.profile.name` when `user` is `User \| undefined` |
| Unsafe destructuring | HIGH | `const { name } = user` when `user` is nullable |
| Unsafe array index access | HIGH | `arr[0].name` when `arr[0]` may be `undefined` |
| Unprotected JSON.parse | HIGH | `JSON.parse(input)` without `try/catch` |
| Unsafe process.env access | HIGH | `process.env.API_KEY` used directly |
| Non-null assertion on nullable | MEDIUM | `value!.method()` when `value` may be `undefined` |
| Unsafe access after await | MEDIUM | narrowing becomes stale after an `await` boundary |
| Unsafe Promise.all destructuring | MEDIUM | `const [a] = await Promise.all([...])` when result may be `undefined` |
| Unsafe Map/Record access | HIGH | `map[key].value` when key may not exist |

---

## Baseline And CI

The baseline system lets you track debt without blocking existing work.

```bash
safets baseline
# creates .safets-baseline.json at the project root

git add .safets-baseline.json
git commit -m "chore: add SafeTS baseline"

safets doctor --fail-on-new
```

`.safets-baseline.json` should be committed to version control so every teammate and CI job compares against the same snapshot.

The baseline stores scan options such as `includeTests`. If you run `doctor --fail-on-new` with different options than the saved baseline, SafeTS will refuse the comparison and ask you to regenerate the baseline.

See the [GitHub Action](#github-action) section above or the [Baseline & CI guide](./docs/guide/baseline.md) for workflow setup.

### Debt Tracking

```bash
safets debt
```

When a baseline exists, `debt` shows the delta per category since the snapshot.

## Exit Codes

- `0`: successful run
- `1`: invalid CLI usage, incompatible `doctor --fail-on-new` baseline, or new crashes found with `--fail-on-new`

---

## License

MIT

## Releases

SafeTS releases are published on [GitHub Releases](https://github.com/Dioman-Keita/safets/releases) and npm.

## Contributing

Detector behavior is documented in the [patterns guide](./docs/guide/patterns.md).

## AI Agent Skill

SafeTS includes an installable skill for agents that support the `skills` CLI:

```bash
npx skills add Dioman-Keita/safets
```

For a non-interactive install, pass the target agent explicitly. For Codex:

```bash
npx skills add Dioman-Keita/safets --skill safets-agent -a codex -g -y
```

The skill is not coupled to Codex; Codex is only one supported target. After installation, restart the agent and invoke `$safets-agent` when an agent should run or interpret SafeTS on a TypeScript project.

## Roadmap

The launch plan is tracked in [ROADMAP.md](./ROADMAP.md).
