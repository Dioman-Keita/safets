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
  fs.mkdirSync(targetDir, { recursive: true });
  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);
    if (entry.isDirectory()) {
      copyDir(sourcePath, targetPath);
    } else {
      fs.copyFileSync(sourcePath, targetPath);
    }
  }
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
  testFix();
  testBaseline();
  testDebt();
  console.log("CLI integration checks passed.");
} finally {
  cleanupTempDirs();
}
