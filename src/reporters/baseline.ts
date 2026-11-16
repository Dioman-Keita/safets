import fs from "fs";
import path from "path";
import { c } from "../utils/colors.ts";
import { toPortablePath, toProjectRelativePath } from "../utils/files.ts";
import type { Baseline, BaselineCrash, CrashReport, ProgramResult } from "../utils/types.ts";

export const BASELINE_FILE = ".safets-baseline.json";

export function saveBaseline(
  crashes: CrashReport[],
  root: string,
  programResult: ProgramResult,
  version: string,
  options: { quiet?: boolean } = {},
): Baseline {
  const baseline: Baseline = {
    version,
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

// Whitespace-insensitive so reformatting a multi-line expression keeps its identity.
function normalizeExpr(expr: string): string {
  return expr.replace(/\s+/g, "");
}

function baselineFileKey(file: string, root: string): string {
  return path.isAbsolute(file)
    ? toProjectRelativePath(root, file)
    : toPortablePath(file);
}

function matchKey(file: string, expr: string): string {
  return `${file}\0${normalizeExpr(expr)}`;
}

function isPatternCompatible(entry: BaselineCrash, crash: CrashReport): boolean {
  // Baselines written before `pattern` was recorded match any pattern.
  return entry.pattern === undefined || entry.pattern === crash.pattern;
}

/**
 * Returns the crashes that are not covered by the baseline.
 *
 * Matching ignores line numbers so that unrelated edits (a new import, a
 * moved function) do not turn known crashes into "new" ones. A crash is
 * identified by file + pattern + expression; each baseline entry can cover
 * at most one current crash, so adding another occurrence of a known
 * expression in the same file is still reported as new. When several
 * candidates share an identity, line numbers are used only as a tiebreaker
 * (exact line first, then nearest).
 */
export function findNewCrashes(
  crashes: CrashReport[],
  baseline: Baseline,
  root: string = process.cwd(),
): Set<CrashReport> {
  const pool = new Map<string, BaselineCrash[]>();
  for (const entry of baseline.crashes) {
    const key = matchKey(baselineFileKey(entry.file, root), entry.expr);
    const bucket = pool.get(key);
    if (bucket) {
      bucket.push(entry);
    } else {
      pool.set(key, [entry]);
    }
  }

  const groups = new Map<string, CrashReport[]>();
  for (const crash of crashes) {
    const key = matchKey(toProjectRelativePath(root, crash.file), crash.expr);
    const group = groups.get(key);
    if (group) {
      group.push(crash);
    } else {
      groups.set(key, [crash]);
    }
  }

  const newCrashes = new Set<CrashReport>();
  for (const [key, group] of groups) {
    const available = [...(pool.get(key) ?? [])];
    const unmatched: CrashReport[] = [];

    for (const crash of group) {
      const exact = available.findIndex(
        (entry) => entry.line === crash.line && isPatternCompatible(entry, crash),
      );
      if (exact >= 0) {
        available.splice(exact, 1);
      } else {
        unmatched.push(crash);
      }
    }

    unmatched.sort((a, b) => a.line - b.line);
    for (const crash of unmatched) {
      let best = -1;
      let bestDistance = Infinity;
      available.forEach((entry, index) => {
        if (!isPatternCompatible(entry, crash)) {
          return;
        }
        const distance = Math.abs(entry.line - crash.line);
        if (distance < bestDistance) {
          best = index;
          bestDistance = distance;
        }
      });

      if (best >= 0) {
        available.splice(best, 1);
      } else {
        newCrashes.add(crash);
      }
    }
  }

  return newCrashes;
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
