#!/usr/bin/env node

import { createRequire } from "module";
import { Worker } from "node:worker_threads";
import { analyze, loadProgramRobust } from "./analyze.ts";
import { checkBaselineOptionsMismatch, isNew, loadBaseline, saveBaseline } from "./reporters/baseline.ts";
import { printBaselineMismatchWarning, printDebt, printDoctor, printFix } from "./reporters/index.ts";
import { printJsonReport } from "./reporters/json.ts";
import { c } from "./utils/colors.ts";
import type { CrashReport, ProgramResult } from "./utils/types.ts";

const COMMANDS = new Set(["doctor", "fix", "debt", "baseline"]);
const FLAGS = new Set(["--help", "--version", "--fail-on-new", "--baseline", "--include-tests", "--json"]);

type RunTimings = {
  totalMs: number;
  programMs: number;
  detectorMs: number;
};

type AnalysisResult = {
  crashes: CrashReport[];
  programResult: ProgramResult;
  timings: RunTimings;
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

const SCAN_TIPS = [
  "Use `safets baseline` once to track only new crashes in CI.",
  "Re-check narrowed values after `await`; async boundaries can make guards stale.",
  "`safets fix` is read-only and prints manual suggestions only.",
  "Use `--include-tests` when you also want test fixtures scanned.",
  "Validate `process.env` at startup to avoid late runtime crashes.",
];

function printTiming(timings: RunTimings) {
  console.log(
    c.dim(
      `  Completed in ${formatDuration(timings.totalMs)} ` +
        `(program ${formatDuration(timings.programMs)}, detectors ${formatDuration(timings.detectorMs)})\n`,
    ),
  );
}

function startProgress(command: string) {
  const startedAt = performance.now();
  let tick = 0;
  const useInlineProgress = process.stdout.isTTY;
  let renderedInline = false;

  const render = () => {
    const elapsed = formatDuration(performance.now() - startedAt);
    const tip = SCAN_TIPS[tick % SCAN_TIPS.length] ?? SCAN_TIPS[0];
    tick += 1;
    const timerLine = `  Analyzing ${command}... ${elapsed}`;
    const tipLine = `  Tip: ${tip}`;

    if (useInlineProgress) {
      if (renderedInline) {
        process.stdout.write("\x1b[2A");
      }
      process.stdout.write(`${c.dim(timerLine.padEnd(120))}\n${c.dim(tipLine.padEnd(120))}\n`);
      renderedInline = true;
    } else {
      console.log(c.dim(timerLine));
      console.log(c.dim(tipLine));
    }
  };

  render();
  const timer = setInterval(render, useInlineProgress ? 1000 : 5000);

  return () => {
    clearInterval(timer);
    if (useInlineProgress) {
      if (renderedInline) {
        process.stdout.write("\x1b[2A");
        process.stdout.write(`${" ".repeat(120)}\n${" ".repeat(120)}\n`);
        process.stdout.write("\x1b[2A");
      }
    } else {
      console.log();
    }
  };
}

function runAnalysisSync(root: string, includeTests: boolean): AnalysisResult {
  const startedAt = performance.now();
  const programStartedAt = performance.now();
  const programResult = loadProgramRobust(root, includeTests);
  const detectorStartedAt = performance.now();
  const crashes = analyze(programResult);
  const finishedAt = performance.now();

  return {
    crashes,
    programResult,
    timings: {
      totalMs: finishedAt - startedAt,
      programMs: detectorStartedAt - programStartedAt,
      detectorMs: finishedAt - detectorStartedAt,
    },
  };
}

function runAnalysisWithProgress(
  root: string,
  includeTests: boolean,
  command: string,
): Promise<AnalysisResult> {
  const stopProgress = startProgress(command);

  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./analysis-worker.js", import.meta.url), {
      workerData: { root, includeTests },
    });

    worker.once("message", (result: AnalysisResult) => {
      stopProgress();
      resolve(result);
    });
    worker.once("error", (error) => {
      stopProgress();
      reject(error);
    });
    worker.once("exit", (code) => {
      if (code !== 0) {
        stopProgress();
        reject(new Error(`Analysis worker exited with code ${code}`));
      }
    });
  });
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

const { crashes, programResult, timings } = jsonOutput
  ? runAnalysisSync(root, includeTests)
  : await runAnalysisWithProgress(root, includeTests, command);
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
