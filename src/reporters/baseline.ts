import fs from "fs";
import path from "path";
import ts from "typescript";
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

// After these tokens a `/` is a division operator; anywhere else it starts a regex.
const TOKENS_BEFORE_DIVISION = new Set<ts.SyntaxKind>([
  ts.SyntaxKind.Identifier,
  ts.SyntaxKind.PrivateIdentifier,
  ts.SyntaxKind.NumericLiteral,
  ts.SyntaxKind.BigIntLiteral,
  ts.SyntaxKind.StringLiteral,
  ts.SyntaxKind.RegularExpressionLiteral,
  ts.SyntaxKind.NoSubstitutionTemplateLiteral,
  ts.SyntaxKind.TemplateTail,
  ts.SyntaxKind.CloseParenToken,
  ts.SyntaxKind.CloseBracketToken,
  ts.SyntaxKind.CloseBraceToken,
  ts.SyntaxKind.ExclamationToken,
  ts.SyntaxKind.PlusPlusToken,
  ts.SyntaxKind.MinusMinusToken,
  ts.SyntaxKind.ThisKeyword,
  ts.SyntaxKind.SuperKeyword,
  ts.SyntaxKind.TrueKeyword,
  ts.SyntaxKind.FalseKeyword,
  ts.SyntaxKind.NullKeyword,
]);

/**
 * Canonical form of a crash expression: the TypeScript tokens joined by a
 * single space. Reformatting (line breaks, spacing between tokens, comments)
 * keeps the same key, while each token's own text — including the contents of
 * string, template and regex literals — stays significant.
 */
function normalizeExpr(expr: string): string {
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, true, ts.LanguageVariant.Standard, expr);
  const tokens: string[] = [];
  // Tracks whether each open `{` belongs to a `${` template substitution.
  const braces: boolean[] = [];
  let previous: ts.SyntaxKind | undefined;

  for (let kind = scanner.scan(); kind !== ts.SyntaxKind.EndOfFileToken; kind = scanner.scan()) {
    if (kind === ts.SyntaxKind.CloseBraceToken && braces.at(-1) === true) {
      braces.pop();
      kind = scanner.reScanTemplateToken(false);
    } else if (
      (kind === ts.SyntaxKind.SlashToken || kind === ts.SyntaxKind.SlashEqualsToken) &&
      (previous === undefined || !TOKENS_BEFORE_DIVISION.has(previous))
    ) {
      kind = scanner.reScanSlashToken();
    }

    if (kind === ts.SyntaxKind.TemplateHead || kind === ts.SyntaxKind.TemplateMiddle) {
      braces.push(true);
    } else if (kind === ts.SyntaxKind.OpenBraceToken) {
      braces.push(false);
    } else if (kind === ts.SyntaxKind.CloseBraceToken) {
      braces.pop();
    }

    tokens.push(scanner.getTokenText());
    previous = kind;
  }

  return tokens.join(" ");
}

function baselineFileKey(file: string, root: string): string {
  return path.isAbsolute(file)
    ? toProjectRelativePath(root, file)
    : toPortablePath(file);
}

function matchKey(file: string, expr: string): string {
  return `${file}\0${normalizeExpr(expr)}`;
}

/**
 * Pairs each crash with at most one entry, preferring the entry on the same
 * line, then the nearest one. Every entry passed in must be compatible with
 * every crash, so the number of pairs is always min(crashes, entries): line
 * numbers only decide which crash is left over. Returns unmatched crashes.
 */
function assignByLine(crashes: CrashReport[], entries: BaselineCrash[]): CrashReport[] {
  const available = [...entries];
  const unmatched: CrashReport[] = [];

  for (const crash of crashes) {
    const exact = available.findIndex((entry) => entry.line === crash.line);
    if (exact >= 0) {
      available.splice(exact, 1);
    } else {
      unmatched.push(crash);
    }
  }

  const leftover: CrashReport[] = [];
  unmatched.sort((a, b) => a.line - b.line);
  for (const crash of unmatched) {
    let best = -1;
    let bestDistance = Infinity;
    available.forEach((entry, index) => {
      const distance = Math.abs(entry.line - crash.line);
      if (distance < bestDistance) {
        best = index;
        bestDistance = distance;
      }
    });

    if (best >= 0) {
      available.splice(best, 1);
    } else {
      leftover.push(crash);
    }
  }

  return leftover;
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
    const entries = pool.get(key) ?? [];

    // Pattern-specific entries can only cover their own pattern, so they are
    // spent first; legacy entries without `pattern` (written before it was
    // recorded) cover any pattern and absorb whatever is left. This order
    // always covers as many crashes as possible.
    const leftovers: CrashReport[] = [];
    const byPattern = new Map<string, CrashReport[]>();
    for (const crash of group) {
      const list = byPattern.get(crash.pattern);
      if (list) {
        list.push(crash);
      } else {
        byPattern.set(crash.pattern, [crash]);
      }
    }
    for (const [pattern, patternCrashes] of byPattern) {
      const specific = entries.filter((entry) => entry.pattern === pattern);
      leftovers.push(...assignByLine(patternCrashes, specific));
    }

    const legacy = entries.filter((entry) => entry.pattern === undefined);
    for (const crash of assignByLine(leftovers, legacy)) {
      newCrashes.add(crash);
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
