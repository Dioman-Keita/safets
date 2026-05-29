# Detector Authoring Guide

This guide explains how to add or improve SafeTS detectors without relying on tribal knowledge.

## Detector Architecture

SafeTS analysis flows through these layers:

- `src/index.ts`: CLI entry point, argument parsing, command selection, and output mode.
- `src/analyze.ts`: TypeScript program loading, workspace handling, and detector orchestration.
- `src/detectors/index.ts`: all runtime-crash detectors.
- `src/utils/ast.ts`: shared AST and type helpers such as `isNullable`, `isOptionalAccess`, `getChainRoot`, and `pos`.
- `src/utils/types.ts`: shared report types such as `CrashReport` and `PatternName`.
- `src/reporters/`: human, JSON, baseline, debt, and fix suggestion output.

Each detector receives a `ts.SourceFile` and, when needed, a `ts.TypeChecker`. It returns `CrashReport[]`.

```ts
export function detectSomeRuntimeRisk(
  sf: ts.SourceFile,
  checker: ts.TypeChecker,
): CrashReport[] {
  const results: CrashReport[] = [];

  function visit(node: ts.Node) {
    // Inspect AST nodes, use checker.getTypeAtLocation when type information matters.
    ts.forEachChild(node, visit);
  }

  visit(sf);
  return results;
}
```

## Crash Report Contract

Every detector finding must produce a `CrashReport` with:

- `file`: source file name from `sf.fileName`.
- `line` and `col`: use `pos(sf, node)`.
- `expr`: the risky expression shown to users.
- `rootExpr`: the root expression responsible for the risk.
- `type`: the relevant TypeScript type as a string, or `"unknown"` for syntax-only checks.
- `pattern`: one of the names in `PatternName`.
- `confidence`: `HIGH` for direct runtime-crash risks, `MEDIUM` for heuristic or flow-sensitive risks.
- `crashPath`: short explanation steps showing how the runtime crash can happen.

If you add a new pattern, update `PatternName` in `src/utils/types.ts`, ensure reporters still group and display it correctly, and add any corresponding fix suggestions in `src/reporters/`.

## Quality Bar

New detectors should be narrow before they are broad.

- Prefer a few high-signal findings over noisy coverage.
- Do not report when optional chaining, explicit guards, default values, or safe try/catch handling already protect the code.
- Use symbols from the TypeScript checker when identity matters; do not rely only on identifier text when shadowing is possible.
- Avoid duplicate sub-chain reports. For property-chain logic, check helpers such as `isSubChainDuplicate`.
- Catch type-checker failures inside detector traversal and skip that node instead of crashing the CLI.
- Keep fallback-mode behavior conservative. `detectFallbackPatterns` should only include syntax-only risks that remain meaningful without type information.

## Adding Or Updating A Detector

1. Add or update the detector function in `src/detectors/index.ts`.
2. Register it in `analyzeProgram()` in `src/analyze.ts` if it is a new detector.
3. Add the pattern name to `src/utils/types.ts` if needed.
4. Add unsafe fixtures under `cases/detectors-project/unsafe-*.ts`.
5. Add safe fixtures under `cases/detectors-project/safe-*.ts`.
6. Update `scripts/test-detectors.mjs`:
   - Add expected unsafe fixture and pattern to `expectedPositiveFindings`.
   - Add safe fixtures to `safeFiles`.
   - Add targeted assertions for edge cases that could regress.
7. Run the full local validation.

```bash
npm run build
npm run typecheck
npm test
npm run pack:check
```

For detector changes that could affect broad output or performance, also run:

```bash
npm run validate:real-world
```

## Fixture Guidelines

Fixtures are the strongest guardrail against false positives and false negatives.

- Name unsafe fixtures after the risk, for example `unsafe-map-record-access.ts`.
- Name safe fixtures after the safe pattern, for example `safe-map-record-access.ts`.
- Keep each fixture focused on one behavior.
- Include at least one safe counterpart for every unsafe fixture.
- Add regression fixtures for review feedback, not just happy-path examples.
- Prefer realistic TypeScript over synthetic AST puzzles unless the bug itself is parser-specific.

## Review Checklist

Before opening a detector PR, confirm:

- The detector reports the intended unsafe fixture.
- The detector does not report the safe counterpart.
- Existing detector fixtures still pass.
- JSON output still includes useful `pattern`, `confidence`, `crashPath`, and suggestions when applicable.
- The finding is explainable to a developer in one or two sentences.
- Real-world validation does not show an obvious explosion in findings or runtime.

## When Not To Add A Detector

Do not add a detector when:

- The pattern is primarily style, not runtime safety.
- TypeScript already catches the risk reliably under `strict`.
- The detector requires whole-program dataflow that SafeTS cannot model yet.
- The safe/unsafe boundary cannot be documented with fixtures.
- The expected output would be too noisy for `doctor` or `--fail-on-new`.
