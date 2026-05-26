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
    version: "0.8.0",
    includeTests: false,
    failOnNew: false,
    baseline: null,
    baselineMismatch: null,
    programResult: {
      program: null,
      fallback: false,
      warnings: [],
      includeTests: false,
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

console.log("JSON reporter checks passed.");
