import path from "node:path";
import { findNewCrashes } from "../dist/reporters/baseline.js";

const root = path.resolve("/project");

function assert(condition, message, details) {
  if (!condition) {
    const extra = details ? `\n${details}` : "";
    throw new Error(`${message}${extra}`);
  }
}

function crash(overrides) {
  return {
    file: path.join(root, "app.ts"),
    line: 1,
    col: 1,
    expr: "user.profile.name",
    rootExpr: "user",
    type: "User | undefined",
    pattern: "Unsafe property access",
    confidence: "HIGH",
    crashPath: [],
    ...overrides,
  };
}

function baseline(crashes) {
  return { version: "1.0.3", date: "2026-01-01T00:00:00.000Z", options: { includeTests: false }, crashes };
}

function entry(overrides) {
  return { file: "app.ts", line: 1, expr: "user.profile.name", pattern: "Unsafe property access", ...overrides };
}

function lines(set) {
  return [...set].map((item) => `${item.pattern}@${item.line}: ${item.expr}`).join("\n");
}

function testReformattedExpressionStaysKnown() {
  const current = [crash({ expr: "user.profile.name", line: 3 })];
  const result = findNewCrashes(current, baseline([entry({ expr: "user\n  .profile\n  .name", line: 2 })]), root);
  assert(result.size === 0, "Expected a reformatted expression to match its baseline entry", lines(result));

  const spaced = findNewCrashes([crash({ expr: "user . profile . name" })], baseline([entry({})]), root);
  assert(spaced.size === 0, "Expected spacing between tokens to be ignored", lines(spaced));
}

function testLiteralContentsStaySignificant() {
  const pattern = "Unsafe Map/Record access";
  const current = [crash({ expr: 'record["ab"].name', pattern })];
  const result = findNewCrashes(current, baseline([entry({ expr: 'record["a b"].name', pattern })]), root);
  assert(result.size === 1, "Expected whitespace inside a string literal to keep expressions distinct", lines(result));

  const template = findNewCrashes(
    [crash({ expr: "lookup[`a${key}`].name", pattern })],
    baseline([entry({ expr: "lookup[`a ${key}`].name", pattern })]),
    root,
  );
  assert(template.size === 1, "Expected whitespace inside a template literal to keep expressions distinct", lines(template));

  const regexPattern = "Unsafe array index access";
  const regex = findNewCrashes(
    [crash({ expr: "/ab/.exec(input)[1].length", pattern: regexPattern })],
    baseline([entry({ expr: "/a b/.exec(input)[1].length", pattern: regexPattern })]),
    root,
  );
  assert(regex.size === 1, "Expected whitespace inside a regex literal to keep expressions distinct", lines(regex));

  const sameRegex = findNewCrashes(
    [crash({ expr: "/a b/.exec(input)[1]\n  .length", pattern: regexPattern })],
    baseline([entry({ expr: "/a b/.exec(input)[1].length", pattern: regexPattern })]),
    root,
  );
  assert(sameRegex.size === 0, "Expected a reformatted regex expression to stay known", lines(sameRegex));
}

function testMixedLegacyAndTypedEntriesCoverEverything() {
  // Legacy entry (no pattern) at line 10, typed pattern-A entry at line 20.
  // Current: pattern-A at 10, pattern-B at 20. Pairing A@10 with the legacy
  // entry would leave B uncovered; the full assignment covers both.
  const patternA = "Unsafe property access";
  const patternB = "Non-null assertion on nullable";
  const current = [crash({ line: 10, pattern: patternA }), crash({ line: 20, pattern: patternB })];
  const result = findNewCrashes(
    current,
    baseline([entry({ line: 10, pattern: undefined }), entry({ line: 20, pattern: patternA })]),
    root,
  );
  assert(result.size === 0, "Expected legacy and typed entries to cover both crashes", lines(result));
}

function testExtraOccurrenceIsNew() {
  const current = [crash({ line: 4 }), crash({ line: 30 })];
  const result = findNewCrashes(current, baseline([entry({ line: 3 })]), root);
  assert(result.size === 1, "Expected exactly one new crash", lines(result));
  assert([...result][0].line === 30, "Expected the occurrence farthest from the baseline line to be new", lines(result));
}

function testPatternMismatchIsNew() {
  const result = findNewCrashes(
    [crash({ pattern: "Non-null assertion on nullable" })],
    baseline([entry({})]),
    root,
  );
  assert(result.size === 1, "Expected a typed entry not to cover another pattern", lines(result));
}

testReformattedExpressionStaysKnown();
testLiteralContentsStaySignificant();
testMixedLegacyAndTypedEntriesCoverEverything();
testExtraOccurrenceIsNew();
testPatternMismatchIsNew();
console.log("Baseline matching checks passed.");
