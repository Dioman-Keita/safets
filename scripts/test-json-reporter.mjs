import { buildJsonReport } from "../dist/reporters/json.js";

function assert(condition, message, details) {
  if (!condition) {
    const extra = details ? `\n${details}` : "";
    throw new Error(`${message}${extra}`);
  }
}

function makeCrash(overrides) {
  return {
    file: "app.ts",
    line: 1,
    col: 1,
    expr: "user.profile",
    rootExpr: "user",
    type: "{ profile: string } | undefined",
    pattern: "Unsafe property access",
    confidence: "HIGH",
    crashPath: [],
    ...overrides,
  };
}

function makeReport(crashes) {
  return buildJsonReport({
    command: "fix",
    crashes,
    root: process.cwd(),
    version: "1.0.0",
    includeTests: false,
    failOnNew: false,
    baseline: null,
    baselineMismatch: null,
    programResult: {
      program: null,
      fallback: false,
      warnings: [],
      includeTests: false,
      strategy: "direct-scan",
      configFiles: [],
      rootFileCount: crashes.length,
      filteredFileCount: 0,
    },
  });
}

const bracketReport = makeReport([
  makeCrash({
    expr: "user['profile']",
    rootExpr: "user",
  }),
]);

assert(
  bracketReport.crashes[0].suggestions.includes("user?.['profile']"),
  "Expected JSON suggestions to handle bracket notation optional chaining",
  JSON.stringify(bracketReport, null, 2),
);

const envReport = makeReport([
  makeCrash({
    expr: "process.env['API_KEY']",
    rootExpr: "process.env['API_KEY']",
    pattern: "Unsafe process.env access",
    type: "string | undefined",
  }),
]);

assert(
  envReport.crashes[0].suggestions[0] === 'const val = process.env.API_KEY ?? "default";',
  "Expected JSON suggestions to extract bracket notation env names",
  JSON.stringify(envReport, null, 2),
);

const hyphenatedEnvReport = makeReport([
  makeCrash({
    expr: "process.env['API-KEY']",
    rootExpr: "process.env['API-KEY']",
    pattern: "Unsafe process.env access",
    type: "string | undefined",
  }),
]);

assert(
  hyphenatedEnvReport.crashes[0].suggestions[0] === 'const val = process.env["API-KEY"] ?? "default";',
  "Expected JSON suggestions to use bracket notation for hyphenated env names",
  JSON.stringify(hyphenatedEnvReport, null, 2),
);

const mixedDotBracketReport = makeReport([
  makeCrash({
    expr: "user.profile['name']",
    rootExpr: "user.profile",
  }),
]);

assert(
  mixedDotBracketReport.crashes[0].suggestions.includes("user.profile?.['name']"),
  "Expected JSON suggestions to handle mixed dot and bracket notation optional chaining",
  JSON.stringify(mixedDotBracketReport, null, 2),
);

const fallbackEnvReport = makeReport([
  makeCrash({
    expr: "process.env",
    rootExpr: "process.env",
    pattern: "Unsafe process.env access",
    type: "NodeJS.ProcessEnv",
  }),
]);

assert(
  fallbackEnvReport.crashes[0].suggestions[0] === 'const val = process.env.VAR_NAME ?? "default";',
  "Expected JSON suggestions to use a safe env fallback name",
  JSON.stringify(fallbackEnvReport, null, 2),
);

const bracketArrayReport = makeReport([
  makeCrash({
    expr: "arr[0]['name']",
    rootExpr: "arr[0]",
    pattern: "Unsafe array index access",
    type: "{ name: string } | undefined",
  }),
]);

assert(
  bracketArrayReport.crashes[0].suggestions.includes("arr[0]?.['name']"),
  "Expected JSON suggestions to handle bracket notation array access",
  JSON.stringify(bracketArrayReport, null, 2),
);

console.log("JSON reporter checks passed.");
