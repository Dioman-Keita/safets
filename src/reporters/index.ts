import path from "path";
import { isNew } from "./baseline.ts";
import { c } from "../utils/colors.ts";
import type { Baseline, CrashReport, PatternName, ProgramResult } from "../utils/types.ts";

function makeOptionalChainSuggestion(expr: string): string {
  const lastDot = expr.lastIndexOf(".");
  if (lastDot === -1) {
    return `${expr}?`;
  }
  return `${expr.slice(0, lastDot)}?.${expr.slice(lastDot + 1)}`;
}

export function printDoctor(
  crashes: CrashReport[],
  root: string,
  failOnNew: boolean,
  base: Baseline | null,
  programResult: ProgramResult,
  baselineMismatch: string | null,
) {
  const rel = (filePath: string) => path.relative(root, filePath);
  const comparableBase = baselineMismatch ? null : base;

  if (baselineMismatch) {
    console.log(c.yellow(`  ! Baseline mismatch: ${baselineMismatch}\n`));
    if (failOnNew) {
      console.log(c.red("x Refusing --fail-on-new against an incompatible baseline.\n"));
      process.exit(1);
    }
  }

  if (programResult.warnings.length > 0) {
    console.log(c.yellow("  ! Warnings:"));
    programResult.warnings.forEach((warning) => console.log(c.dim(`    ${warning}`)));
    if (programResult.fallback) {
      console.log(c.yellow("  ! Fallback mode - partial results only\n"));
    } else {
      console.log();
    }
  }

  if (crashes.length === 0) {
    console.log(c.green("OK No potential runtime crashes found.\n"));
    if (programResult.fallback) {
      console.log(c.dim("  Note: fallback mode may miss type-dependent crashes.\n"));
    }
    return;
  }

  const newCrashes = comparableBase
    ? crashes.filter((crash) => isNew(crash, comparableBase))
    : crashes;
  const knownCrashes = comparableBase
    ? crashes.filter((crash) => !isNew(crash, comparableBase))
    : [];
  const fallbackCount = crashes.filter((crash) => crash.fallback).length;

  console.log(c.bold("SafeTS Runtime Safety Report"));
  console.log(c.dim("-".repeat(44)));
  console.log(
    comparableBase
      ? `${crashes.length} potential crashes  (${c.red(`${newCrashes.length} new`)} · ${c.dim(`${knownCrashes.length} known`)})`
      : c.red(`${crashes.length} potential crashes`),
  );

  if (fallbackCount > 0) {
    console.log(c.dim(`  ${fallbackCount} in fallback mode (lower confidence)`));
  }
  console.log();

  const grouped = new Map<string, CrashReport[]>();
  for (const crash of crashes) {
    const key = rel(crash.file);
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    const bucket = grouped.get(key);
    if (bucket) {
      bucket.push(crash);
    }
  }

  for (const [file, list] of grouped) {
    console.log(c.cyan(`  ${file}`));
    for (const crash of list) {
      const badge = comparableBase
        ? isNew(crash, comparableBase)
          ? c.red(" [NEW]   ")
          : c.dim(" [known] ")
        : "";
      const confidence =
        crash.confidence === "HIGH" ? c.red("HIGH") : c.yellow("MED ");
      const fallbackBadge = crash.fallback ? c.dim(" [fallback]") : "";

      console.log(
        `\n  ${badge} ${confidence}  Line ${crash.line}:${crash.col}  ${c.bold(crash.pattern)}${fallbackBadge}`,
      );
      console.log(c.dim(`    ${crash.expr}`));
      console.log(c.dim(`    type: ${crash.type}`));
      console.log(c.dim("\n    Crash simulation:"));
      crash.crashPath.forEach((step) => console.log(c.dim(`      -> ${step}`)));
    }
    console.log();
  }

  console.log(c.dim("-".repeat(44)));
  console.log(c.dim("  safets fix       - fix suggestions"));
  console.log(c.dim("  safets debt      - grouped debt report"));
  console.log(c.dim("  safets baseline  - record current state for CI\n"));

  if (failOnNew && newCrashes.length > 0) {
    console.log(c.red(`x ${newCrashes.length} new crash(es) - CI blocked.\n`));
    process.exit(1);
  }
}

export function printDebt(
  crashes: CrashReport[],
  base: Baseline | null,
  baselineMismatch: string | null,
) {
  const comparableBase = baselineMismatch ? null : base;
  const currentCounts = new Map<PatternName, number>();
  for (const crash of crashes) {
    currentCounts.set(crash.pattern, (currentCounts.get(crash.pattern) ?? 0) + 1);
  }

  const baselineCounts = new Map<PatternName, number>();
  if (comparableBase) {
    for (const entry of comparableBase.crashes) {
      if (entry.pattern) {
        baselineCounts.set(entry.pattern, (baselineCounts.get(entry.pattern) ?? 0) + 1);
      }
    }
  }

  console.log(c.bold("SafeTS Debt Report"));
  console.log(c.dim("-".repeat(50)));

  const patterns = new Set<PatternName>([
    ...currentCounts.keys(),
    ...baselineCounts.keys(),
  ]);

  for (const pattern of patterns) {
    const currentCount = currentCounts.get(pattern) ?? 0;
    if (!comparableBase) {
      console.log(`  ${pattern.padEnd(40)} ${c.red(String(currentCount))}`);
      continue;
    }

    const baselineCount = baselineCounts.get(pattern) ?? 0;
    const delta = currentCount - baselineCount;
    let deltaText = c.dim("  (same)");
    if (delta > 0) {
      deltaText = c.red(`  (↑${delta} new)`);
    } else if (delta < 0) {
      deltaText = c.green(`  (↓${Math.abs(delta)} fixed)`);
    }

    console.log(`  ${pattern.padEnd(40)} ${c.red(String(currentCount))}${deltaText}`);
  }

  console.log(c.dim("-".repeat(50)));
  const total = crashes.length;
  if (comparableBase) {
    const delta = total - comparableBase.crashes.length;
    let deltaText = c.dim(" (same as baseline)");
    if (delta > 0) {
      deltaText = c.red(` (+${delta} since baseline)`);
    } else if (delta < 0) {
      deltaText = c.green(` (-${Math.abs(delta)} since baseline)`);
    }
    console.log(`  ${"Total".padEnd(40)} ${c.red(String(total))}${deltaText}`);
  } else {
    console.log(`  ${"Total".padEnd(40)} ${c.red(String(total))}`);
    if (baselineMismatch) {
      console.log(c.dim("\n  Showing current debt only because baseline comparison was skipped."));
      console.log(c.dim("  Re-run 'safets baseline' with matching options to track debt deltas."));
    } else {
      console.log(c.dim("\n  Run 'safets baseline' to track debt over time."));
    }
  }
  console.log();
}

export function printBaselineMismatchWarning(baselineMismatch: string | null) {
  if (baselineMismatch) {
    console.log(c.yellow(`  ! Baseline mismatch: ${baselineMismatch}\n`));
  }
}

export function printFix(crashes: CrashReport[], root: string) {
  const rel = (filePath: string) => path.relative(root, filePath);

  console.log(c.bold("SafeTS Fix Suggestions"));
  console.log(c.dim("-".repeat(44)));
  console.log(c.dim("  SafeTS is read-only - it never modifies your source code."));
  console.log(c.dim("  Apply these suggestions manually.\n"));

  for (const crash of crashes) {
    console.log(c.cyan(`\n  ${rel(crash.file)}:${crash.line}  ${crash.pattern}`));
    console.log(c.dim(`  ${crash.expr}`));

    switch (crash.pattern) {
      case "Unsafe property access":
        console.log(c.green(`\n  -> ${makeOptionalChainSuggestion(crash.expr)}`));
        console.log(c.green(`  -> if (!${crash.rootExpr}) return;`));
        break;
      case "Unsafe destructuring":
        console.log(c.green(`\n  -> if (!${crash.rootExpr}) return;\n     ${crash.expr}`));
        break;
      case "Unsafe array index access":
      case "Unsafe Map/Record access":
        console.log(c.green(`\n  -> const item = ${crash.rootExpr}; if (!item) return;`));
        console.log(c.green(`  -> ${crash.rootExpr}?.${crash.expr.split(".").pop()}`));
        break;
      case "Unprotected JSON.parse":
        console.log(c.green(`\n  -> try { ${crash.expr} } catch (e) { /* handle SyntaxError */ }`));
        break;
      case "Unsafe process.env access":
        console.log(
          c.green(`\n  -> const val = process.env.${crash.rootExpr.split(".")[2]} ?? "default";`),
        );
        console.log(c.green("  -> Validate all env vars at startup in a dedicated config.ts"));
        break;
      case "Non-null assertion on nullable":
        console.log(c.green(`\n  -> Replace ! with: if (!${crash.rootExpr}) return;`));
        console.log(c.green(`  -> Or: ${crash.rootExpr}?.yourMethod()`));
        break;
      case "Unsafe access after await":
        console.log(
          c.green(`\n  -> Re-check after await:\n     await doSomething();\n     if (!${crash.rootExpr}) return;`),
        );
        break;
      case "Unsafe Promise.all destructuring":
        console.log(
          c.green(`\n  -> const [item] = await Promise.all([...]);\n     if (!item) return;`),
        );
        break;
    }
  }

  console.log();
}
