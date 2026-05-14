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
```

---

## How It Works

**SafeTS is read-only.** It never modifies your source code. `safets fix` only prints suggestions to stdout, and you apply them manually.

SafeTS scans your TypeScript files using the Compiler API, builds a type-checked program, and walks the AST looking for patterns that TypeScript's own checker allows but that can still crash at runtime.

Test files (`*.test.ts`, `*.spec.ts`, `/__tests__/`, and similar paths) are excluded by default. Use `--include-tests` to include them.

Files over 5000 lines, such as compiled bundles or generated Prisma clients, are automatically skipped.

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

---

## License

MIT

## Roadmap

The launch plan is tracked in [ROADMAP.md](./ROADMAP.md).
