#!/usr/bin/env node

import { analyze, loadProgramRobust } from "./analyze.ts";
import { checkBaselineOptionsMismatch, loadBaseline, saveBaseline } from "./reporters/baseline.ts";
import { printBaselineMismatchWarning, printDebt, printDoctor, printFix } from "./reporters/index.ts";
import { c } from "./utils/colors.ts";

const args = process.argv.slice(2);
const command = args[0] ?? "doctor";
const failOnNew = args.includes("--fail-on-new");
const withBase = args.includes("--baseline");
const includeTests = args.includes("--include-tests");
const root = process.cwd();

console.log(c.bold(c.cyan("\n  SafeTS v0.8.0")));
console.log(c.dim("  Finds common runtime crashes TypeScript can't detect\n"));
if (!includeTests) {
  console.log(c.dim("  (test files excluded - use --include-tests to include them)\n"));
}

const programResult = loadProgramRobust(root, includeTests);
const crashes = analyze(programResult);
const baseline = loadBaseline(root);
const baselineMismatch = baseline
  ? checkBaselineOptionsMismatch(baseline, includeTests)
  : null;

switch (command) {
  case "debt":
    printBaselineMismatchWarning(baselineMismatch);
    printDebt(crashes, baseline);
    break;
  case "fix":
    printFix(crashes, root);
    break;
  case "baseline":
    saveBaseline(crashes, root, programResult);
    break;
  case "doctor":
  default:
    printDoctor(
      crashes,
      root,
      failOnNew,
      baseline,
      programResult,
      baselineMismatch,
    );
    if (withBase) {
      saveBaseline(crashes, root, programResult);
    }
    break;
}
