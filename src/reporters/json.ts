import { isNew } from "./baseline.ts";
import type { Baseline, CrashReport, PatternName, ProgramResult } from "../utils/types.ts";
import { toProjectRelativePath } from "../utils/files.ts";

type JsonCommand = "doctor" | "fix" | "debt" | "baseline";

interface BuildJsonReportOptions {
  command: JsonCommand;
  crashes: CrashReport[];
  root: string;
  version: string;
  includeTests: boolean;
  failOnNew: boolean;
  baseline: Baseline | null;
  baselineMismatch: string | null;
  programResult: ProgramResult;
  savedBaseline?: Baseline | null;
}

function countByPattern(patterns: PatternName[]) {
  const counts: Partial<Record<PatternName, number>> = {};
  for (const pattern of patterns) {
    counts[pattern] = (counts[pattern] ?? 0) + 1;
  }
  return counts;
}

function makeOptionalChainSuggestion(expr: string): string {
  const lastDot = expr.lastIndexOf(".");
  const lastBracket = expr.lastIndexOf("[");
  if (lastBracket > lastDot) {
    return `${expr.slice(0, lastBracket)}?.${expr.slice(lastBracket)}`;
  }
  if (lastDot !== -1) {
    return `${expr.slice(0, lastDot)}?.${expr.slice(lastDot + 1)}`;
  }
  return expr;
}

function makeEnvSuggestion(rootExpr: string): string {
  const match = rootExpr.match(
    /process\.env(?:\.([A-Za-z_][A-Za-z0-9_]*)|\[["']([^"']+)["']\])/,
  );
  const envName = match?.[1] ?? match?.[2] ?? "VAR_NAME";
  const isIdentifier = /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(envName);
  const envAccess = isIdentifier
    ? `process.env.${envName}`
    : `process.env["${envName}"]`;
  return `const val = ${envAccess} ?? "default";`;
}

function makeOptionalAccessSuggestion(rootExpr: string, expr: string): string {
  const suffix = expr.startsWith(rootExpr) ? expr.slice(rootExpr.length) : "";
  if (suffix.startsWith(".")) {
    return `${rootExpr}?.${suffix.slice(1)}`;
  }
  if (suffix.startsWith("[")) {
    return `${rootExpr}?.${suffix}`;
  }
  return `${rootExpr}?.${suffix || "property"}`;
}

function makeFixSuggestions(crash: CrashReport): string[] {
  switch (crash.pattern) {
    case "Unsafe property access":
      return [
        makeOptionalChainSuggestion(crash.expr),
        `if (!${crash.rootExpr}) return;`,
      ];
    case "Unsafe destructuring":
      return [`if (!${crash.rootExpr}) return;`, crash.expr];
    case "Unsafe array index access":
    case "Unsafe Map/Record access":
      return [
        `const item = ${crash.rootExpr}; if (!item) return;`,
        makeOptionalAccessSuggestion(crash.rootExpr, crash.expr),
      ];
    case "Unprotected JSON.parse":
      return [`try { ${crash.expr} } catch (e) { /* handle SyntaxError */ }`];
    case "Unsafe process.env access":
      return [
        makeEnvSuggestion(crash.rootExpr),
        "Validate all env vars at startup in a dedicated config.ts",
      ];
    case "Non-null assertion on nullable":
      return [
        `Replace ! with: if (!${crash.rootExpr}) return;`,
        `${crash.rootExpr}?.yourMethod()`,
      ];
    case "Unsafe access after await":
      return [
        `await doSomething(); if (!${crash.rootExpr}) return;`,
      ];
    case "Unsafe Promise.all destructuring":
      return ["const [item] = await Promise.all([...]); if (!item) return;"];
    default:
      return [];
  }
}

export function buildJsonReport(options: BuildJsonReportOptions) {
  const effectiveBaseline =
    options.command === "baseline"
      ? options.savedBaseline ?? options.baseline
      : options.baseline;
  const effectiveMismatch =
    options.command === "baseline" && options.savedBaseline
      ? null
      : options.baselineMismatch;
  const comparableBaseline = effectiveMismatch ? null : effectiveBaseline;
  const newCrashes = comparableBaseline
    ? options.crashes.filter((crash) => isNew(crash, comparableBaseline))
    : options.crashes;
  const knownCrashes = comparableBaseline
    ? options.crashes.filter((crash) => !isNew(crash, comparableBaseline))
    : [];
  const baselinePatternCounts = countByPattern(
    comparableBaseline
      ? comparableBaseline.crashes
          .map((crash) => crash.pattern)
          .filter((pattern): pattern is PatternName => !!pattern)
      : [],
  );
  const currentPatternCounts = countByPattern(
    options.crashes.map((crash) => crash.pattern),
  );
  const debt = Object.keys({
    ...baselinePatternCounts,
    ...currentPatternCounts,
  }).map((pattern) => {
    const name = pattern as PatternName;
    const current = currentPatternCounts[name] ?? 0;
    const baselineCount = baselinePatternCounts[name] ?? 0;
    return {
      pattern: name,
      current,
      baseline: comparableBaseline ? baselineCount : null,
      delta: comparableBaseline ? current - baselineCount : null,
    };
  });

  return {
    schemaVersion: 1,
    safetsVersion: options.version,
    command: options.command,
    options: {
      includeTests: options.includeTests,
      failOnNew: options.failOnNew,
    },
    program: {
      fallback: options.programResult.fallback,
      warnings: options.programResult.warnings,
    },
    baseline: {
      present: effectiveBaseline !== null,
      compatible: effectiveBaseline !== null ? effectiveMismatch === null : null,
      mismatch: effectiveMismatch,
      crashCount: effectiveBaseline?.crashes.length ?? null,
      saved: options.savedBaseline
        ? {
            file: ".safets-baseline.json",
            crashCount: options.savedBaseline.crashes.length,
            options: options.savedBaseline.options ?? null,
          }
        : null,
    },
    summary: {
      total: options.crashes.length,
      new: newCrashes.length,
      known: knownCrashes.length,
      byPattern: currentPatternCounts,
      fallback: options.crashes.filter((crash) => crash.fallback).length,
    },
    debt,
    crashes: options.crashes.map((crash) => ({
      file: toProjectRelativePath(options.root, crash.file),
      line: crash.line,
      col: crash.col,
      expr: crash.expr,
      rootExpr: crash.rootExpr,
      type: crash.type,
      pattern: crash.pattern,
      confidence: crash.confidence,
      fallback: crash.fallback ?? false,
      status: comparableBaseline
        ? isNew(crash, comparableBaseline)
          ? "new"
          : "known"
        : "current",
      crashPath: crash.crashPath,
      suggestions: makeFixSuggestions(crash),
    })),
  };
}

export function printJsonReport(options: BuildJsonReportOptions) {
  console.log(JSON.stringify(buildJsonReport(options), null, 2));
}
