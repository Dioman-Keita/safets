# SafeTS

**Finds common runtime crashes TypeScript can't detect.**

TypeScript catches type errors at compile time, but some crash patterns slip through even with `strict: true`. SafeTS uses the TypeScript Compiler API to detect them before they hit production.

```
Cannot read properties of undefined (reading 'name')
```

---

## Install

```bash
npm install --save-dev safets typescript
```

No runtime TypeScript loader is required. SafeTS uses the TypeScript compiler already in your project.

---

## Usage

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
- `program.fallback` and `program.warnings`
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

SafeTS v0.8.0 was tested in zero-setup mode against public TypeScript repositories: clone, build SafeTS, then run `safets doctor --json` without installing each target repo's dependencies.

| Repository | TS/TSX files | Result | Duration | Fallback | Findings |
| --- | ---: | --- | ---: | --- | ---: |
| `google-gemini/gemini-cli` | 2108 | ok | 11s | false | 247 |
| `vitejs/vite` | 563 | ok | 5s | false | 342 |
| `prisma/prisma` | 2701 | ok | 8s | false | 267 |
| `supabase/supabase` | 6669 | ok | 13s | false | 157 |
| `vitest-dev/vitest` | 2038 | ok | 10s | false | 378 |
| `withastro/astro` | 2094 | ok | 10s | false | 394 |

No target fell back to AST-only mode. See [docs/real-world-validation.md](./docs/real-world-validation.md) for commits, pattern breakdowns, methodology, and follow-up notes.

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

## Roadmap

The launch plan is tracked in [ROADMAP.md](./ROADMAP.md).
