import path from "node:path";
import { pathToFileURL } from "node:url";

const repoRoot = path.resolve(import.meta.dirname, "..");
const fixturesRoot = path.join(repoRoot, "cases", "detectors-project");

const { analyze, loadProgramRobust } = await import(
  pathToFileURL(path.join(repoRoot, "dist", "analyze.js")).href
);

function assert(condition, message, details) {
  if (!condition) {
    const extra = details ? `\n${details}` : "";
    throw new Error(`${message}${extra}`);
  }
}

function fileName(filePath) {
  return path.basename(filePath);
}

const expectedPositiveFindings = [
  ["unsafe-property-access.ts", "Unsafe property access"],
  ["unsafe-destructuring.ts", "Unsafe destructuring"],
  ["unsafe-array-index-access.ts", "Unsafe array index access"],
  ["unprotected-json-parse.ts", "Unprotected JSON.parse"],
  ["unsafe-process-env-access.ts", "Unsafe process.env access"],
  ["unsafe-process-env-nullish-undefined.ts", "Unsafe process.env access"],
  ["unsafe-process-env-chain-without-default.ts", "Unsafe process.env access"],
  ["non-null-assertion-on-nullable.ts", "Non-null assertion on nullable"],
  ["unsafe-access-after-await.ts", "Unsafe access after await"],
  ["unsafe-conditional-guard-after-await.ts", "Unsafe access after await"],
  ["unsafe-after-await-conditional-exit-guard.ts", "Unsafe access after await"],
  ["unsafe-await-inside-conditional-block.ts", "Unsafe access after await"],
  ["unsafe-after-await-property-chain.ts", "Unsafe access after await"],
  ["unsafe-assignment-rhs-after-await.ts", "Unsafe access after await"],
  ["unsafe-guard-return-expression-after-await.ts", "Unsafe access after await"],
  ["unsafe-closure-after-await.ts", "Unsafe access after await"],
  ["unsafe-promise-all-destructuring.ts", "Unsafe Promise.all destructuring"],
  ["unsafe-map-record-access.ts", "Unsafe Map/Record access"],
];

const safeFiles = [
  "safe-property-access.ts",
  "safe-destructuring.ts",
  "safe-array-index-access.ts",
  "safe-json-parse.ts",
  "safe-process-env-access.ts",
  "safe-process-env-parenthesized-default.ts",
  "safe-process-env-chained-default.ts",
  "safe-process-env-or-default.ts",
  "safe-process-env-non-null-default.ts",
  "safe-non-null-assertion.ts",
  "safe-access-after-await.ts",
  "safe-access-after-await-throw.ts",
  "safe-access-after-await-log-return.ts",
  "safe-access-after-await-reversed-null-check.ts",
  "safe-nonnullable-guard-after-await.ts",
  "safe-nested-function-after-await.ts",
  "safe-reassigned-before-await.ts",
  "safe-reassigned-after-await.ts",
  "safe-promise-all-destructuring.ts",
  "safe-map-record-access.ts",
];

const withoutTests = analyze(loadProgramRobust(fixturesRoot, false));
const withTests = analyze(loadProgramRobust(fixturesRoot, true));

for (const [fixture, pattern] of expectedPositiveFindings) {
  const match = withoutTests.some(
    (crash) => fileName(crash.file) === fixture && crash.pattern === pattern,
  );
  assert(match, `Expected ${fixture} to trigger ${pattern}`);
}

for (const fixture of safeFiles) {
  const match = withoutTests.some((crash) => fileName(crash.file) === fixture);
  assert(!match, `Expected ${fixture} to remain free of detector findings`);
}

const ignoredWithoutTests = withoutTests.some(
  (crash) => fileName(crash.file) === "ignored.spec.ts",
);
assert(!ignoredWithoutTests, "Expected ignored.spec.ts to be excluded by default");

const includedWithTests = withTests.some(
  (crash) =>
    fileName(crash.file) === "ignored.spec.ts" &&
    crash.pattern === "Unprotected JSON.parse",
);
assert(includedWithTests, "Expected ignored.spec.ts to be analyzed with --include-tests");

const propertyChainReports = withoutTests.filter(
  (crash) =>
    fileName(crash.file) === "unsafe-after-await-property-chain.ts" &&
    crash.pattern === "Unsafe access after await",
);
assert(
  propertyChainReports.length === 1,
  `Expected unsafe-after-await-property-chain.ts to report once, got ${propertyChainReports.length}`,
);

console.log("Detector fixture checks passed.");
