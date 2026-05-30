# How It Works

## Architecture

SafeTS is built on the TypeScript Compiler API — the same engine that powers VSCode's IntelliSense.

```
Your project
    │
    ▼
tsconfig.json ──► TypeScript Program
                        │
                        ▼
                   TypeChecker
                        │
                   AST Walker
                        │
              ┌─────────┴─────────┐
              │                   │
         9 Detectors         Fallback AST
         (typed mode)        (no tsconfig)
              │
              ▼
         CrashReport[]
              │
         ┌────┴────┐
         │         │
       doctor     debt
       fix      baseline
```

## Typed mode vs Fallback mode

**Typed mode** (default when `tsconfig.json` is found):
- Full TypeChecker available
- Knows the exact type at every AST node
- Can detect nullable access, stale narrowing after await, etc.

**Fallback mode** (when TypeChecker is unusable):
- AST-only analysis
- Detects structural patterns: `JSON.parse` without try/catch, `process.env.X!`
- Lower confidence, partial results

SafeTS always tells you which mode it's running in.

## The deduplication system

For a chain like `user.profile.email`:
- `user` is `User | undefined` — report HERE
- `user.profile` — skip, parent already reported
- `user.profile.email` — skip, root already reported

SafeTS reports only the first nullable node in a chain, not every downstream access. This keeps the report clean and actionable.

## Test file exclusion

By default SafeTS excludes:
- `*.test.ts`, `*.spec.ts`
- `/__tests__/`, `/test/`, `/tests/`, `/test-utils/`

Test files use deliberate `!` assertions and `JSON.parse` without guards as part of test infrastructure. Including them would produce mostly noise.

Use `--include-tests` to scan them explicitly.

## Bundle detection

Files over 5000 lines are automatically skipped. This prevents SafeTS from scanning compiled bundles, Prisma-generated clients, or other generated artifacts that would produce thousands of false positives on unreachable lines.
