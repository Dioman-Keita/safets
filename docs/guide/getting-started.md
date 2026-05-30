# Getting Started

## Installation

SafeTS requires TypeScript already installed in your project.

```bash
npm install --save-dev @safets-org/cli typescript
```

## Your first scan

```bash
npx safets doctor
```

SafeTS will find your `tsconfig.json`, build a type-checked program, and report potential runtime crashes:

```
SafeTS Runtime Safety Report
────────────────────────────────────────────
3 potential crashes

  src/services/auth.ts

   HIGH  Line 12:10  Unsafe property access
    user.profile.email
    type: { email: string } | undefined

    Crash simulation:
      → user.profile → { email: string } | undefined
      → user.profile may be undefined at runtime
      → user.profile.email → Cannot read properties of undefined

   HIGH  Line 34:5  Unprotected JSON.parse
    JSON.parse(content)
    type: unknown

    Crash simulation:
      → JSON.parse(input) — throws SyntaxError if input is malformed
      → Unhandled exception → process crash
```

## Fix suggestions

```bash
npx safets fix
```

SafeTS is **read-only** — it never touches your source files. Fix suggestions are printed to stdout for you to apply manually.

## Debt overview

```bash
npx safets debt
```

Groups findings by category:

```
Unprotected JSON.parse          12
Non-null assertion on nullable  34
Unsafe property access           8
────────────────────────────────────
Total                           54
```

## Next steps

- [The 9 Patterns](/guide/patterns) — understand what SafeTS detects
- [Baseline & CI](/guide/baseline) — set up CI integration
- [CLI Reference](/guide/cli) — all available commands and flags
