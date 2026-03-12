# SafeTS

Detect the most common JavaScript runtime crash before it happens.

SafeTS analyzes your TypeScript code and reports places where your app can crash at runtime — starting with `Cannot read properties of undefined`, the #1 production error in JavaScript.

---

## Try it now

No installation required. Run directly in any TypeScript project:

```bash
npx ts-node ./index.ts doctor
```

---

## Example output

```
SafeTS Runtime Safety Report
────────────────────────────
3 potential crashes

  src/api.ts

  HIGH  Line 22:14  Unsafe property access
    data.user.profile.name
    type: User | undefined

    Crash simulation:
      → data.user → User | undefined
      → data.user may be undefined at runtime
      → data.user.profile → Cannot read properties of undefined (reading 'profile')

  HIGH  Line 8:3  Unprotected JSON.parse
    JSON.parse(rawConfig)

    Crash simulation:
      → JSON.parse(input) — throws SyntaxError if input is malformed
      → Unhandled exception → process crash
```

---

## Commands

```bash
npx ts-node ./index.ts doctor              # Scan project, show crash report
npx ts-node ./index.ts fix                 # Show fix suggestions for each crash
npx ts-node ./index.ts debt                # Crash count grouped by pattern
npx ts-node ./index.ts baseline            # Record current state
npx ts-node ./index.ts doctor --fail-on-new  # CI mode — block on new crashes only
```

---

## What SafeTS detects

| Pattern | Example | Error prevented |
|---|---|---|
| Unsafe property access | `user.profile.name` | `Cannot read properties of undefined` |
| Unsafe destructuring | `const { name } = user` | `Cannot destructure property of undefined` |
| Unsafe array index | `arr[0].name` | `Cannot read properties of undefined` |
| Unprotected JSON.parse | `JSON.parse(input)` | `SyntaxError: Unexpected token` |
| Unsafe process.env | `process.env.KEY!` | Runtime crash on missing env var |
| Non-null assertion | `value!.method()` | Crash silently bypassed by compiler |
| Unsafe access after await | `await x(); value.prop` | State mutation between narrowing and access |
| Unsafe Promise.all destructuring | `const [a] = await Promise.all(...)` | Undefined element access |
| Unsafe Map/Record access | `map[key].value` | Key may not exist |

---

## Why not just use TypeScript strict mode?

TypeScript strict mode is a config option someone can forget to enable.
SafeTS is a step in your CI that finds what TypeScript misses even with strict mode on.

The key difference: TypeScript tells you a type *could* be undefined.
SafeTS simulates the exact path your code takes to crash.

---

## CI integration

```bash
# Save current state as baseline
npx ts-node ./index.ts baseline

# In CI — only block on new crashes, not existing ones
npx ts-node ./index.ts doctor --fail-on-new
```

Existing crashes are tracked in `.safets-baseline.json`.
New code must be safe. Old crashes are visible as debt and tracked over time.

---

## Install

```bash
npm install --save-dev typescript @types/node ts-node
```

---

## Philosophy

- Zero configuration — works on any TypeScript project
- No compiler fork — built on the official TypeScript Compiler API
- No TypeScript patches — does not modify your build pipeline
- SafeTS never modifies your code or your TypeScript configuration
- Graceful degradation — runs in fallback mode if the project does not compile cleanly
- Precision over recall — only reports crashes it is confident about

---

## Status

Early release — v0.6.
Tested on real TypeScript projects.
Feedback and bug reports welcome via GitHub Issues.

The #1 JavaScript runtime error is preventable.
SafeTS makes it visible before production.
