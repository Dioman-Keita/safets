# What is SafeTS?

SafeTS is a static analysis CLI for TypeScript that detects runtime crash patterns the TypeScript compiler deliberately allows — even with `strict: true`.

## The gap SafeTS fills

TypeScript is excellent at catching type errors. But some patterns are structurally valid TypeScript that crash at runtime:

```ts
// TypeScript compiles this without errors
const port = process.env.PORT.toString();
//                           ^^^^^^^^^^
//                           crashes if PORT is not set
```

TypeScript knows `process.env.PORT` is `string | undefined`. It even knows `.toString()` doesn't exist on `undefined`. But it still compiles — because TypeScript's philosophy is to trust the developer's intent.

SafeTS is the second layer. It uses the TypeScript Compiler API to walk your AST with full type information and flag these patterns explicitly.

## What SafeTS is not

- **Not a TypeScript fork** — it uses your existing compiler
- **Not a runtime tool** — it runs before execution, at analysis time
- **Not a code modifier** — it never touches your source files
- **Not a replacement for TypeScript** — it's a complement

## How it works

1. Loads your `tsconfig.json` and builds a typed program
2. Walks the AST of every source file
3. For each node, checks the TypeScript type at that location
4. Reports nodes where the type is nullable but the access is unguarded
5. Simulates the crash path so you understand exactly what would happen at runtime

## Tested on real projects

SafeTS was validated against [`google-gemini/gemini-cli`](https://github.com/google-gemini/gemini-cli), a production TypeScript monorepo with 300+ source files.

**Results:** 297 findings including 10 confirmed production bugs in `clearcut-logger.ts`, `sessionSummaryUtils.ts`, `baseLlmClient.ts`, and others — patterns TypeScript 5.x with strict mode missed entirely.
