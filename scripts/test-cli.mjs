import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cliEntrypoint = path.join(repoRoot, "dist", "index.js");
const packageJson = JSON.parse(
  fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"),
);
const packageVersion = packageJson.version;
const tempDirs = new Set();

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
  tempDirs.add(projectDir);
  for (const [fileName, content] of Object.entries(files)) {
    const filePath = path.join(projectDir, fileName);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content);
  }
  return projectDir;
}

function cleanupTempDirs() {
  for (const dir of tempDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  tempDirs.clear();
}

function testHelp() {
  const result = runCli(["--help"]);
  const output = stripAnsi(`${result.stdout}${result.stderr}`);
  assert(result.status === 0, "Expected --help to exit with code 0", output);
  assert(output.includes("Usage:"), "Expected --help output to include Usage", output);
  assert(output.includes("Exit codes:"), "Expected --help output to include exit code documentation", output);
  assert(output.includes("--json"), "Expected --help output to document JSON output", output);
}

function testVersion() {
  const result = runCli(["--version"]);
  const output = stripAnsi(`${result.stdout}${result.stderr}`).trim();
  assert(result.status === 0, "Expected --version to exit with code 0", output);
  assert(output === packageVersion, "Expected --version to print package version", output);
}

function testUnknownCommand() {
  const result = runCli(["wat"]);
  const output = stripAnsi(`${result.stdout}${result.stderr}`);
  assert(result.status === 1, "Expected unknown command to exit with code 1", output);
  assert(output.includes("Unknown command: wat"), "Expected unknown command message", output);
}

function testHelpRejectsUnknownOptions() {
  const result = runCli(["--help", "--bogus"]);
  const output = stripAnsi(`${result.stdout}${result.stderr}`);
  assert(result.status === 1, "Expected --help with an unknown option to exit with code 1", output);
  assert(output.includes("Unknown option(s): --bogus"), "Expected unknown option message", output);
}

function testFailOnNew() {
  const projectDir = createProject({
    "tsconfig.json": JSON.stringify({ compilerOptions: { strict: true } }),
    "app.ts": "const user: { name: string } | undefined = undefined;\nconsole.log(user.name);\n",
    ".safets-baseline.json": JSON.stringify({
      version: packageVersion,
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
      version: packageVersion,
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

function testFixNoSuggestionsMessage() {
  const projectDir = createProject({
    "tsconfig.json": JSON.stringify({ compilerOptions: { strict: true } }),
    "app.ts": "const user = { name: 'Ada' };\nconsole.log(user.name);\n",
  });

  const result = runCli(["fix"], projectDir);
  const output = stripAnsi(`${result.stdout}${result.stderr}`);
  assert(result.status === 0, "Expected fix to exit with code 0 when no suggestions exist", output);
  assert(output.includes("No manual fixes to suggest right now."), "Expected fix to explain empty suggestions", output);
  assert(
    output.includes("SafeTS did not find any supported runtime-crash patterns"),
    "Expected fix to describe why no suggestions were printed",
    output,
  );
}

function testDoesNotUseParentTsconfig() {
  const parentDir = createProject({
    "tsconfig.json": JSON.stringify({
      compilerOptions: { strict: true },
      files: ["safe.ts"],
    }),
    "safe.ts": "const user = { name: 'Ada' };\nconsole.log(user.name);\n",
    "child/app.ts": "const user: { name: string } | undefined = undefined;\nconsole.log(user.name);\n",
  });
  const childDir = path.join(parentDir, "child");

  const result = runCli(["doctor", "--json"], childDir);
  assert(result.status === 0, "Expected child project scan to exit with code 0", result.stderr);

  const report = JSON.parse(result.stdout);
  assert(report.summary.total >= 1, "Expected child project files to be analyzed", result.stdout);
  assert(
    report.crashes.some((crash) => crash.file === "app.ts"),
    "Expected SafeTS not to use parent tsconfig outside the project root",
    result.stdout,
  );
}

function testUsesNestedTsconfig() {
  const projectDir = createProject({
    "packages/app/tsconfig.json": JSON.stringify({
      compilerOptions: { strict: true },
      include: ["src/**/*.ts"],
    }),
    "packages/app/src/app.ts": "const user: { name: string } | undefined = undefined;\nconsole.log(user.name);\n",
  });

  const result = runCli(["doctor", "--json"], projectDir);
  assert(result.status === 0, "Expected nested tsconfig project scan to exit with code 0", result.stderr);

  const report = JSON.parse(result.stdout);
  assert(report.program.strategy === "workspace-tsconfigs", "Expected nested tsconfig strategy", result.stdout);
  assert(
    report.program.configFiles.includes("packages/app/tsconfig.json"),
    "Expected JSON output to include nested tsconfig path",
    result.stdout,
  );
  assert(report.summary.total >= 1, "Expected nested tsconfig files to be analyzed", result.stdout);
}

function testScansUncoveredFilesWhenNestedTsconfigsHaveLowCoverage() {
  const projectDir = createProject({
    "packages/fixture/tsconfig.json": JSON.stringify({
      compilerOptions: { strict: true },
      include: ["src/**/*.ts"],
    }),
    "packages/fixture/src/safe.ts": "const user = { name: 'Ada' };\nconsole.log(user.name);\n",
    "src/app-a.ts": "JSON.parse('{}');\n",
    "src/app-b.ts": "JSON.parse('{}');\n",
    "src/app-c.ts": "JSON.parse('{}');\n",
    "src/app-d.ts": "JSON.parse('{}');\n",
  });

  const result = runCli(["doctor", "--json"], projectDir);
  assert(result.status === 0, "Expected low coverage workspace scan to exit with code 0", result.stderr);

  const report = JSON.parse(result.stdout);
  assert(report.program.strategy === "workspace-tsconfigs", "Expected workspace strategy with direct scan coverage for uncovered files", result.stdout);
  assert(
    report.program.warnings.some((warning) => warning.includes("scanning 4 uncovered file(s) directly")),
    "Expected uncovered file coverage warning",
    result.stdout,
  );
  assert(report.summary.total >= 4, "Expected direct scan to analyze files outside low coverage tsconfig", result.stdout);
  assert(
    report.crashes.some((crash) => crash.file === "src/app-a.ts"),
    "Expected direct scan findings to include files outside the low coverage tsconfig",
    result.stdout,
  );
}

function testSkipsTestTsconfigsByDefault() {
  const projectDir = createProject({
    "test/tsconfig.json": JSON.stringify({
      compilerOptions: { strict: true },
      include: ["**/*.ts"],
    }),
    "test/app.test.ts": "JSON.parse('{}');\n",
    "src/app.ts": "JSON.parse('{}');\n",
  });

  const result = runCli(["doctor", "--json"], projectDir);
  assert(result.status === 0, "Expected default scan to exit with code 0", result.stderr);

  const report = JSON.parse(result.stdout);
  assert(report.program.strategy === "direct-scan", "Expected test-only tsconfig to be skipped by default", result.stdout);
  assert(
    !report.program.configFiles.includes("test/tsconfig.json"),
    "Expected JSON output not to include skipped test tsconfig",
    result.stdout,
  );
  assert(report.summary.total === 1, "Expected default scan to exclude test findings", result.stdout);
  assert(
    report.crashes.every((crash) => crash.file === "src/app.ts"),
    "Expected only source findings when test files are excluded",
    result.stdout,
  );
}

try {
  testHelp();
  testVersion();
  testUnknownCommand();
  testHelpRejectsUnknownOptions();
  testFailOnNew();
  testMismatchFailOnNew();
  testInvalidFlagCombination();
  testFixNoSuggestionsMessage();
  testDoesNotUseParentTsconfig();
  testUsesNestedTsconfig();
  testScansUncoveredFilesWhenNestedTsconfigsHaveLowCoverage();
  testSkipsTestTsconfigsByDefault();
  console.log("CLI contract checks passed.");
} finally {
  cleanupTempDirs();
}
