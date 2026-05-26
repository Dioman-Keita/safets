import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cliEntrypoint = path.join(repoRoot, "dist", "index.js");
const fixtureProject = path.join(repoRoot, "cases", "cli-project");
const tempDirs = new Set();

function stripAnsi(text) {
  return text.replace(/\x1b\[[0-9;]*m/g, "");
}

function assert(condition, message, details) {
  if (!condition) {
    const extra = details ? `\n${details}` : "";
    throw new Error(`${message}${extra}`);
  }
}

function runCli(args, cwd) {
  return spawnSync(process.execPath, [cliEntrypoint, ...args], {
    cwd,
    encoding: "utf8",
  });
}

function copyDir(sourceDir, targetDir) {
  fs.cpSync(sourceDir, targetDir, { recursive: true });
}

function createProjectFromFixture() {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), "safets-integration-"));
  tempDirs.add(projectDir);
  copyDir(fixtureProject, projectDir);
  return projectDir;
}

function cleanupTempDirs() {
  for (const dir of tempDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  tempDirs.clear();
}

function testDoctor() {
  const projectDir = createProjectFromFixture();
  const result = runCli(["doctor"], projectDir);
  const output = stripAnsi(`${result.stdout}${result.stderr}`);
  assert(result.status === 0, "Expected doctor to exit with code 0", output);
  assert(output.includes("SafeTS Runtime Safety Report"), "Expected doctor report header", output);
  assert(output.includes("Unsafe property access"), "Expected doctor to report unsafe property access", output);
  assert(!output.includes("Unprotected JSON.parse"), "Expected doctor to exclude test-file JSON.parse by default", output);
}

function testDoctorIncludeTests() {
  const projectDir = createProjectFromFixture();
  const result = runCli(["doctor", "--include-tests"], projectDir);
  const output = stripAnsi(`${result.stdout}${result.stderr}`);
  assert(result.status === 0, "Expected doctor --include-tests to exit with code 0", output);
  assert(output.includes("Unprotected JSON.parse"), "Expected doctor --include-tests to include test-file findings", output);
}

function testDoctorJson() {
  const projectDir = createProjectFromFixture();
  const result = runCli(["doctor", "--json"], projectDir);
  assert(result.status === 0, "Expected doctor --json to exit with code 0", result.stderr);
  assert(result.stderr === "", "Expected doctor --json not to write stderr", result.stderr);

  const report = JSON.parse(result.stdout);
  assert(report.schemaVersion === 1, "Expected JSON report schema version 1", result.stdout);
  assert(report.command === "doctor", "Expected JSON report command to be doctor", result.stdout);
  assert(report.options.includeTests === false, "Expected JSON report to include scan options", result.stdout);
  assert(report.summary.total >= 1, "Expected JSON report to include crash summary", result.stdout);
  assert(Array.isArray(report.crashes), "Expected JSON report to include crashes array", result.stdout);
  assert(report.crashes[0].file && !path.isAbsolute(report.crashes[0].file), "Expected JSON file paths to be project-relative", result.stdout);
  assert(report.crashes[0].confidence, "Expected JSON crashes to include confidence", result.stdout);
  assert(report.crashes[0].status === "current", "Expected JSON crashes to include baseline status", result.stdout);
}

function testDoctorJsonFailOnNew() {
  const projectDir = createProjectFromFixture();
  fs.writeFileSync(
    path.join(projectDir, ".safets-baseline.json"),
    JSON.stringify({
      version: "0.8.0",
      date: new Date().toISOString(),
      options: { includeTests: false },
      crashes: [],
    }, null, 2),
  );

  const result = runCli(["doctor", "--json", "--fail-on-new"], projectDir);
  assert(result.status === 1, "Expected doctor --json --fail-on-new to exit with code 1", result.stdout);

  const report = JSON.parse(result.stdout);
  assert(report.baseline.present === true, "Expected JSON report to include baseline presence", result.stdout);
  assert(report.baseline.compatible === true, "Expected JSON report to mark compatible baseline", result.stdout);
  assert(report.summary.new >= 1, "Expected JSON report to include new crash count", result.stdout);
  assert(report.crashes.every((crash) => crash.status === "new"), "Expected JSON crashes to be marked new", result.stdout);
}

function testDoctorJsonFailOnNewDoesNotSaveBaseline() {
  const projectDir = createProjectFromFixture();
  const baselinePath = path.join(projectDir, ".safets-baseline.json");
  const baselineContent = JSON.stringify({
    version: "0.8.0",
    date: new Date().toISOString(),
    options: { includeTests: false },
    crashes: [],
  }, null, 2);
  fs.writeFileSync(baselinePath, baselineContent);

  const result = runCli(["doctor", "--json", "--baseline", "--fail-on-new"], projectDir);
  assert(result.status === 1, "Expected failing JSON fail-on-new run to exit with code 1", result.stdout);
  assert(
    fs.readFileSync(baselinePath, "utf8") === baselineContent,
    "Expected failing JSON fail-on-new run not to overwrite the baseline",
    result.stdout,
  );
}

function testDebtJson() {
  const projectDir = createProjectFromFixture();
  const baselineResult = runCli(["baseline"], projectDir);
  assert(baselineResult.status === 0, "Expected setup baseline command to succeed", baselineResult.stdout);

  const result = runCli(["debt", "--json"], projectDir);
  assert(result.status === 0, "Expected debt --json to exit with code 0", result.stderr);

  const report = JSON.parse(result.stdout);
  assert(report.command === "debt", "Expected JSON report command to be debt", result.stdout);
  assert(Array.isArray(report.debt), "Expected JSON report to include debt array", result.stdout);
  assert(report.debt.some((entry) => entry.delta === 0), "Expected debt JSON to include baseline deltas", result.stdout);
}

function testFix() {
  const projectDir = createProjectFromFixture();
  const result = runCli(["fix"], projectDir);
  const output = stripAnsi(`${result.stdout}${result.stderr}`);
  assert(result.status === 0, "Expected fix to exit with code 0", output);
  assert(output.includes("SafeTS Fix Suggestions"), "Expected fix report header", output);
  assert(output.includes("SafeTS is read-only"), "Expected fix read-only note", output);
  assert(output.includes("if (!user) return;"), "Expected fix to include guard suggestion", output);
}

function testBaseline() {
  const projectDir = createProjectFromFixture();
  const result = runCli(["baseline"], projectDir);
  const output = stripAnsi(`${result.stdout}${result.stderr}`);
  const baselinePath = path.join(projectDir, ".safets-baseline.json");
  assert(result.status === 0, "Expected baseline to exit with code 0", output);
  assert(fs.existsSync(baselinePath), "Expected baseline command to create .safets-baseline.json");
  assert(output.includes("Baseline saved"), "Expected baseline saved confirmation", output);

  const baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
  assert(Array.isArray(baseline.crashes), "Expected baseline file to contain crashes array");
  assert(baseline.crashes.length >= 1, "Expected baseline file to record fixture crashes");
}

function testBaselineJson() {
  const projectDir = createProjectFromFixture();
  const result = runCli(["baseline", "--json"], projectDir);
  const baselinePath = path.join(projectDir, ".safets-baseline.json");
  assert(result.status === 0, "Expected baseline --json to exit with code 0", result.stderr);
  assert(fs.existsSync(baselinePath), "Expected baseline --json to create .safets-baseline.json");

  const report = JSON.parse(result.stdout);
  assert(report.command === "baseline", "Expected JSON report command to be baseline", result.stdout);
  assert(report.baseline.present === true, "Expected baseline --json to report saved baseline as present", result.stdout);
  assert(report.baseline.saved.crashCount >= 1, "Expected JSON report to include saved baseline state", result.stdout);
}

function testDebt() {
  const projectDir = createProjectFromFixture();
  const baselineResult = runCli(["baseline"], projectDir);
  assert(baselineResult.status === 0, "Expected setup baseline command to succeed", baselineResult.stdout);

  const result = runCli(["debt"], projectDir);
  const output = stripAnsi(`${result.stdout}${result.stderr}`);
  assert(result.status === 0, "Expected debt to exit with code 0", output);
  assert(output.includes("SafeTS Debt Report"), "Expected debt report header", output);
  assert(output.includes("Unsafe property access"), "Expected debt to group property access debt", output);
  assert(output.includes("(same)"), "Expected debt to compare against the saved baseline", output);
}

try {
  testDoctor();
  testDoctorIncludeTests();
  testDoctorJson();
  testDoctorJsonFailOnNew();
  testDoctorJsonFailOnNewDoesNotSaveBaseline();
  testFix();
  testBaseline();
  testBaselineJson();
  testDebt();
  testDebtJson();
  console.log("CLI integration checks passed.");
} finally {
  cleanupTempDirs();
}
