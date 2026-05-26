#!/usr/bin/env node

import { createRequire } from "module";
import { analyze, loadProgramRobust } from "./analyze.ts";
import { checkBaselineOptionsMismatch, isNew, loadBaseline, saveBaseline } from "./reporters/baseline.ts";
import { printBaselineMismatchWarning, printDebt, printDoctor, printFix } from "./reporters/index.ts";
import { printJsonReport } from "./reporters/json.ts";
import { c } from "./utils/colors.ts";

const COMMANDS = new Set(["doctor", "fix", "debt", "baseline"]);
const FLAGS = new Set(["--help", "--version", "--fail-on-new", "--baseline", "--include-tests", "--json"]);

function getVersion(): string {
  const require = createRequire(import.meta.url);
  const packageJson = require("../package.json") as { version?: string };
  return packageJson.version ?? "0.0.0";
}

function printBanner(version: string, includeTests: boolean) {
  console.log(c.bold(c.cyan(`\n  SafeTS v${version}`)));
  console.log(c.dim("  Finds common runtime crashes TypeScript can't detect\n"));
  if (!includeTests) {
    console.log(c.dim("  (test files excluded - use --include-tests to include them)\n"));
  }
}

function printHelp(version: string) {
  console.log(`SafeTS v${version}`);
  console.log("Finds common runtime crashes TypeScript can't detect.\n");
  console.log("Usage:");
  console.log("  safets [command] [options]\n");
  console.log("Commands:");
  console.log("  doctor    Analyze the project and print potential crashes (default)");
  console.log("  fix       Print manual fix suggestions");
  console.log("  debt      Show grouped crash debt, with baseline deltas when compatible");
  console.log("  baseline  Save the current crash snapshot to .safets-baseline.json\n");
  console.log("Options:");
  console.log("  --include-tests  Include test files in the analysis");
  console.log("  --baseline       Save a baseline after `doctor` finishes");
  console.log("  --fail-on-new    Exit with code 1 when `doctor` finds crashes not in the baseline");
  console.log("  --json           Print machine-readable JSON instead of human output");
  console.log("  --help           Show this help message");
  console.log("  --version        Show the installed SafeTS version\n");
  console.log("Exit codes:");
  console.log("  0  Successful run, including `doctor` with no blocking condition");
  console.log("  1  Invalid CLI usage, incompatible `--fail-on-new` baseline, or new crashes found\n");
  console.log("Examples:");
  console.log("  safets");
  console.log("  safets doctor --fail-on-new");
  console.log("  safets debt --include-tests");
  console.log("  safets baseline");
}

const args = process.argv.slice(2);
const version = getVersion();
const root = process.cwd();

const unknownFlags = args.filter((arg) => arg.startsWith("-") && !FLAGS.has(arg));
if (unknownFlags.length > 0) {
  console.error(c.red(`x Unknown option(s): ${unknownFlags.join(", ")}\n`));
  printHelp(version);
  process.exit(1);
}

if (args.includes("--help") || args[0] === "help") {
  printHelp(version);
  process.exit(0);
}

if (args.includes("--version") || args[0] === "version") {
  console.log(version);
  process.exit(0);
}

const nonFlagArgs = args.filter((arg) => !arg.startsWith("-"));
const command = nonFlagArgs[0] ?? "doctor";

if (!COMMANDS.has(command)) {
  console.error(c.red(`x Unknown command: ${command}\n`));
  printHelp(version);
  process.exit(1);
}

const failOnNew = args.includes("--fail-on-new");
const withBase = args.includes("--baseline");
const includeTests = args.includes("--include-tests");
const jsonOutput = args.includes("--json");

if (!jsonOutput) {
  printBanner(version, includeTests);
}

if (command !== "doctor" && failOnNew) {
  console.error(c.red("x `--fail-on-new` can only be used with `doctor`.\n"));
  process.exit(1);
}

if (command !== "doctor" && withBase) {
  console.error(c.red("x `--baseline` can only be used with `doctor`.\n"));
  process.exit(1);
}

const programResult = loadProgramRobust(root, includeTests);
const crashes = analyze(programResult);
const baseline = loadBaseline(root);
const baselineMismatch = baseline
  ? checkBaselineOptionsMismatch(baseline, includeTests)
  : null;

if (jsonOutput) {
  const comparableBase = baselineMismatch ? null : baseline;
  const newCrashes = comparableBase
    ? crashes.filter((crash) => isNew(crash, comparableBase))
    : crashes;
  const shouldSaveBaseline =
    command === "baseline" ||
    (command === "doctor" && withBase && !(failOnNew && baselineMismatch));
  const savedBaseline = shouldSaveBaseline
    ? saveBaseline(crashes, root, programResult, { quiet: true })
    : null;

  printJsonReport({
    command: command as "doctor" | "fix" | "debt" | "baseline",
    crashes,
    root,
    version,
    includeTests,
    failOnNew,
    baseline,
    baselineMismatch,
    programResult,
    savedBaseline,
  });

  if (command === "doctor" && failOnNew && (baselineMismatch || newCrashes.length > 0)) {
    process.exit(1);
  }

  process.exit(0);
}

switch (command) {
  case "debt":
    printBaselineMismatchWarning(baselineMismatch);
    printDebt(crashes, baseline, baselineMismatch);
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
