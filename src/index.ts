#!/usr/bin/env node

import { createRequire } from "module";
import { analyze, loadProgramRobust } from "./analyze.ts";
import { checkBaselineOptionsMismatch, isNew, loadBaseline, saveBaseline } from "./reporters/baseline.ts";
import { printBaselineMismatchWarning, printDebt, printDoctor, printFix } from "./reporters/index.ts";
import { printJsonReport } from "./reporters/json.ts";
import { c } from "./utils/colors.ts";

const COMMANDS = new Set(["doctor", "fix", "debt", "baseline"]);
const FLAGS = new Set(["--help", "--version", "--fail-on-new", "--baseline", "--include-tests", "--json"]);

type RunTimings = {
  totalMs: number;
  programMs: number;
  detectorMs: number;
};

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

function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
}

function printScanTips(command: string) {
  const tips = [
    "Tip: Use `safets baseline` once to track only new crashes in CI.",
    "Tip: Re-check narrowed values after `await`; async boundaries can make guards stale.",
    "Tip: `safets fix` is read-only and prints manual suggestions only.",
  ];

  console.log(c.dim(`  Running ${command} analysis...`));
  for (const tip of tips) {
    console.log(c.dim(`  ${tip}`));
  }
  console.log();
}

function printTiming(timings: RunTimings) {
  console.log(
    c.dim(
      `  Completed in ${formatDuration(timings.totalMs)} ` +
        `(program ${formatDuration(timings.programMs)}, detectors ${formatDuration(timings.detectorMs)})\n`,
    ),
  );
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
  printScanTips(command);
}

if (command !== "doctor" && failOnNew) {
  console.error(c.red("x `--fail-on-new` can only be used with `doctor`.\n"));
  process.exit(1);
}

if (command !== "doctor" && withBase) {
  console.error(c.red("x `--baseline` can only be used with `doctor`.\n"));
  process.exit(1);
}

const startedAt = performance.now();
const programStartedAt = performance.now();
const programResult = loadProgramRobust(root, includeTests);
const detectorStartedAt = performance.now();
const crashes = analyze(programResult);
const finishedAt = performance.now();
const timings: RunTimings = {
  totalMs: finishedAt - startedAt,
  programMs: detectorStartedAt - programStartedAt,
  detectorMs: finishedAt - detectorStartedAt,
};
const baseline = loadBaseline(root);
const baselineMismatch = baseline
  ? checkBaselineOptionsMismatch(baseline, includeTests)
  : null;

if (jsonOutput) {
  const comparableBase = baselineMismatch ? null : baseline;
  const newCrashes = comparableBase
    ? crashes.filter((crash) => isNew(crash, comparableBase))
    : crashes;
  const failOnNewWillFail =
    command === "doctor" &&
    failOnNew &&
    (baselineMismatch !== null || newCrashes.length > 0);
  const shouldSaveBaseline =
    command === "baseline" ||
    (command === "doctor" && withBase && !failOnNewWillFail);
  const savedBaseline = shouldSaveBaseline
    ? saveBaseline(crashes, root, programResult, version, { quiet: true })
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

  if (failOnNewWillFail) {
    process.exit(1);
  }

  process.exit(0);
}

switch (command) {
  case "debt":
    printBaselineMismatchWarning(baselineMismatch);
    printDebt(crashes, baseline, baselineMismatch);
    printTiming(timings);
    break;
  case "fix":
    printFix(crashes, root);
    printTiming(timings);
    break;
  case "baseline":
    saveBaseline(crashes, root, programResult, version);
    printTiming(timings);
    break;
  case "doctor":
  default: {
    const exitCode = printDoctor(
      crashes,
      root,
      failOnNew,
      baseline,
      programResult,
      baselineMismatch,
    );
    if (withBase && exitCode === 0) {
      saveBaseline(crashes, root, programResult, version);
    }
    printTiming(timings);
    if (exitCode !== 0) {
      process.exit(exitCode);
    }
    break;
  }
}
