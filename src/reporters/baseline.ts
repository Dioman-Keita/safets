import fs from "fs";
import path from "path";
import { c } from "../utils/colors.ts";
import { normalizeFilePath, toProjectRelativePath } from "../utils/files.ts";
import type { Baseline, CrashReport, ProgramResult } from "../utils/types.ts";

export const BASELINE_FILE = ".safets-baseline.json";

export function saveBaseline(
  crashes: CrashReport[],
  root: string,
  programResult: ProgramResult,
  options: { quiet?: boolean } = {},
): Baseline {
  const baseline: Baseline = {
    version: "0.8.0",
    date: new Date().toISOString(),
    options: { includeTests: programResult.includeTests },
    crashes: crashes.map((crash) => ({
      file: toProjectRelativePath(root, crash.file),
      line: crash.line,
      expr: crash.expr,
      pattern: crash.pattern,
    })),
  };

  fs.writeFileSync(
    path.join(root, BASELINE_FILE),
    JSON.stringify(baseline, null, 2),
  );

  if (!options.quiet) {
    console.log(c.green(`\nOK Baseline saved - ${crashes.length} known crash(es) recorded.`));
    console.log(c.dim(`  File: ${BASELINE_FILE}`));
    console.log(c.dim(`  Options: includeTests=${programResult.includeTests}`));
    console.log(c.dim("  Commit this file to version control for CI to work correctly.\n"));
  }

  return baseline;
}

export function loadBaseline(root: string): Baseline | null {
  try {
    const filePath = path.join(root, BASELINE_FILE);
    if (!fs.existsSync(filePath)) {
      return null;
    }

    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as Baseline;
  } catch {
    return null;
  }
}

export function isNew(crash: CrashReport, baseline: Baseline): boolean {
  const absoluteCrashPath = normalizeFilePath(crash.file);
  return !baseline.crashes.some(
    (entry) =>
      (entry.file === absoluteCrashPath || entry.file === toProjectRelativePath(process.cwd(), crash.file)) &&
      entry.line === crash.line &&
      entry.expr === crash.expr,
  );
}

export function checkBaselineOptionsMismatch(
  baseline: Baseline,
  includeTests: boolean,
): string | null {
  if (!baseline.options) {
    return null;
  }

  if (baseline.options.includeTests !== includeTests) {
    return `baseline was saved with includeTests=${baseline.options.includeTests} but current run uses includeTests=${includeTests}. Re-run 'safets baseline' first.`;
  }

  return null;
}
