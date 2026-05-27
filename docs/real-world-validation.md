# Real-World Validation

This document records the first SafeTS validation pass against public TypeScript repositories.

## Goal

Validate that SafeTS can run on real repositories without project-specific setup, and collect signal for follow-up hardening work.

This is not a false-positive audit yet. The goal of this pass is operational trust:

- Does SafeTS run without crashing?
- Does it avoid AST-only fallback?
- Does it produce machine-readable output across different repo shapes?
- Which patterns dominate in real projects?
- Which repo shapes should guide the next hardening work?

## Method

Validation date: 2026-05-26

SafeTS version: `0.8.0` development build

Environment:

- Windows
- Node.js `v24.14.0`
- npm `11.9.0`

Setup:

1. Built SafeTS locally with `npm run build`.
2. Cloned each target with `git clone --depth 1`.
3. Did not install target repository dependencies.
4. Ran `safets doctor --json` through the local compiled CLI.
5. Captured exit code, duration, fallback status, warnings, total findings, and pattern counts.

The validation script expects repos under `.tmp/real-world-repos/`:

```bash
mkdir -p .tmp/real-world-repos
git clone --depth 1 https://github.com/google-gemini/gemini-cli.git .tmp/real-world-repos/gemini-cli
git clone --depth 1 https://github.com/vitejs/vite.git .tmp/real-world-repos/vite
git clone --depth 1 https://github.com/prisma/prisma.git .tmp/real-world-repos/prisma
git clone --depth 1 https://github.com/supabase/supabase.git .tmp/real-world-repos/supabase
git clone --depth 1 https://github.com/vitest-dev/vitest.git .tmp/real-world-repos/vitest
git clone --depth 1 https://github.com/withastro/astro.git .tmp/real-world-repos/astro
npm run build
npm run validate:real-world
```

The validation command exits with code `1` if any target repository is missing or if SafeTS fails to produce a valid JSON report for a target.

On Windows, `google-gemini/gemini-cli` may require long path support before checkout:

```bash
git config --global core.longpaths true
```

## Results

| Repository | Commit | TS/TSX files | Strategy | Result | Duration | Fallback | Findings | Warnings | Top patterns |
| --- | --- | ---: | --- | --- | ---: | --- | ---: | ---: | --- |
| `google-gemini/gemini-cli` | `85563da` | 2108 | root-tsconfig | ok | 22s | false | 247 | 1 | Non-null assertion on nullable: 129; Unsafe access after await: 46; Unprotected JSON.parse: 34; Unsafe property access: 29; Unsafe process.env access: 7; Unsafe Promise.all destructuring: 2 |
| `vitejs/vite` | `b089c2b` | 563 | workspace-tsconfigs | ok | 28s | false | 43 | 4 | Unprotected JSON.parse: 23; Non-null assertion on nullable: 9; Unsafe process.env access: 5; Unsafe property access: 2; Unsafe destructuring: 2; Unsafe array index access: 2 |
| `prisma/prisma` | `42f9102` | 2701 | root-tsconfig | ok | 17s | false | 267 | 1 | Unsafe process.env access: 97; Non-null assertion on nullable: 67; Unsafe property access: 66; Unprotected JSON.parse: 24; Unsafe access after await: 10; Unsafe Promise.all destructuring: 1; Unsafe array index access: 1; Unsafe Map/Record access: 1 |
| `supabase/supabase` | `108a7c2c` | 6669 | root-tsconfig | ok | 25s | false | 157 | 1 | Unsafe process.env access: 110; Unprotected JSON.parse: 47 |
| `vitest-dev/vitest` | `152750e` | 2038 | workspace-tsconfigs | ok | 53s | false | 298 | 3 | Non-null assertion on nullable: 191; Unsafe process.env access: 48; Unsafe property access: 19; Unsafe access after await: 18; Unprotected JSON.parse: 16; Unsafe array index access: 5; Unsafe Promise.all destructuring: 1 |
| `withastro/astro` | `1e49163` | 2094 | workspace-tsconfigs | ok | 52s | false | 394 | 5 | Non-null assertion on nullable: 151; Unsafe property access: 119; Unsafe process.env access: 43; Unsafe array index access: 37; Unprotected JSON.parse: 23; Unsafe access after await: 16; Unsafe Map/Record access: 3; Unsafe destructuring: 2 |

## Observations

- SafeTS completed successfully on all six repositories without installing dependencies.
- No repository fell back to AST-only mode.
- Vite and Vitest do not expose a root `tsconfig.json`, so SafeTS used nested workspace tsconfig discovery for them.
- Supabase and Prisma show that `process.env` findings dominate in large real repos.
- Gemini CLI and Astro show that `Non-null assertion on nullable` and `Unsafe access after await` need careful false-positive review before teams use these patterns as hard CI gates.
- Supabase filtered 3954 generated or bundled tsconfig inputs, which confirms that generated-file filtering matters in real monorepos.
- Vite, Vitest, and Astro also scan files not covered by nested tsconfigs directly, so workspace mode does not silently skip uncovered TypeScript files.
- This validation uncovered and fixed a project-boundary bug: SafeTS previously allowed TypeScript config discovery to climb outside the requested project root, which could accidentally analyze a parent repository instead of the target project.

## Follow-Up

This pass supports moving to the next roadmap issue: harden monorepo and workspace support.

Recommended follow-ups:

- Add workspace package discovery instead of relying only on the root `tsconfig.json`.
- Record which tsconfig path was used in JSON output to make validation easier.
- Add an optional validation mode that reports analyzed file count and filtered file count.
- Run a second pass with dependencies installed only for repos where type information looks degraded.
- Sample findings from Gemini CLI, Prisma, Supabase, and Astro to classify obvious false positives separately from real risks.
