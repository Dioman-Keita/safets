import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const repoRoot = path.resolve(import.meta.dirname, "..");
const cliEntrypoint = path.join(repoRoot, "dist", "index.js");

function stripAnsi(text) {
  return text.replace(/\x1b\[[0-9;]*m/g, "");
}

function runCli(args, cwd = repoRoot) {
  return spawnSync(process.execPath, [cliEntrypoint, ...args], {
    cwd,
    encoding: "utf8",
  });
}

function assert(condition, message, details) {
  if (!condition) {
    const extra = details ? `\n${details}` : "";
    throw new Error(`${message}${extra}`);
  }
}

function createProject(files) {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), "safets-cli-"));
  for (const [fileName, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(projectDir, fileName), content);
  }
  return projectDir;
}

function testHelp() {
  const result = runCli(["--help"]);
  const output = stripAnsi(`${result.stdout}${result.stderr}`);
  assert(result.status === 0, "Expected --help to exit with code 0", output);
  assert(output.includes("Usage:"), "Expected --help output to include Usage", output);
  assert(output.includes("Exit codes:"), "Expected --help output to include exit code documentation", output);
}

function testVersion() {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"),
  );
  const result = runCli(["--version"]);
  const output = stripAnsi(`${result.stdout}${result.stderr}`).trim();
  assert(result.status === 0, "Expected --version to exit with code 0", output);
  assert(output === packageJson.version, "Expected --version to print package version", output);
}

function testUnknownCommand() {
  const result = runCli(["wat"]);
  const output = stripAnsi(`${result.stdout}${result.stderr}`);
  assert(result.status === 1, "Expected unknown command to exit with code 1", output);
  assert(output.includes("Unknown command: wat"), "Expected unknown command message", output);
}

function testFailOnNew() {
  const projectDir = createProject({
    "tsconfig.json": JSON.stringify({ compilerOptions: { strict: true } }),
    "app.ts": "const user: { name: string } | undefined = undefined;\nconsole.log(user.name);\n",
    ".safets-baseline.json": JSON.stringify({
      version: "0.8.0",
      date: new Date().toISOString(),
      options: { includeTests: false },
      crashes: [],
    }, null, 2),
  });

  const result = runCli(["doctor", "--fail-on-new"], projectDir);
  const output = stripAnsi(`${result.stdout}${result.stderr}`);
  assert(result.status === 1, "Expected doctor --fail-on-new to exit with code 1 when new crashes exist", output);
  assert(output.includes("CI blocked"), "Expected fail-on-new output to mention CI blocked", output);
}

function testMismatchFailOnNew() {
  const projectDir = createProject({
    "tsconfig.json": JSON.stringify({ compilerOptions: { strict: true } }),
    "app.ts": "const user: { name: string } | undefined = undefined;\nconsole.log(user.name);\n",
    ".safets-baseline.json": JSON.stringify({
      version: "0.8.0",
      date: new Date().toISOString(),
      options: { includeTests: true },
      crashes: [],
    }, null, 2),
  });

  const result = runCli(["doctor", "--fail-on-new"], projectDir);
  const output = stripAnsi(`${result.stdout}${result.stderr}`);
  assert(result.status === 1, "Expected incompatible fail-on-new baseline to exit with code 1", output);
  assert(output.includes("Refusing --fail-on-new against an incompatible baseline"), "Expected mismatch refusal message", output);
}

function testInvalidFlagCombination() {
  const result = runCli(["debt", "--fail-on-new"]);
  const output = stripAnsi(`${result.stdout}${result.stderr}`);
  assert(result.status === 1, "Expected invalid flag combination to exit with code 1", output);
  assert(output.includes("`--fail-on-new` can only be used with `doctor`"), "Expected invalid flag combination message", output);
}

testHelp();
testVersion();
testUnknownCommand();
testFailOnNew();
testMismatchFailOnNew();
testInvalidFlagCombination();

console.log("CLI contract checks passed.");
