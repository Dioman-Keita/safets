#!/usr/bin/env node
/**
 * SafeTS v0.7
 * "Finds common runtime crashes TypeScript can't detect"
 *
 * Changelog from v0.6:
 *   - FIX: checker usability test before trusting the program
 *   - FIX: deduplicated JSON.parse detection (no double reports)
 *   - FIX: findTsFiles() ignores coverage/storybook/generated/tmp/.cache
 *   - FIX: UX wording — no more "SafeTS > TypeScript" perception
 *
 * Usage:
 *   npx ts-node index.ts doctor
 *   npx ts-node index.ts doctor --baseline
 *   npx ts-node index.ts doctor --fail-on-new
 *   npx ts-node index.ts fix
 *   npx ts-node index.ts debt
 *   npx ts-node index.ts baseline
 *
 * Install: npm install --save-dev typescript @types/node ts-node
 */

import ts from "typescript";
import path from "path";
import fs from "fs";

// ─────────────────────────────────────────
// Types
// ─────────────────────────────────────────

interface CrashReport {
  file: string;
  line: number;
  col: number;
  expr: string;
  rootExpr: string;
  type: string;
  pattern: PatternName;
  confidence: "HIGH" | "MEDIUM";
  crashPath: string[];
  fallback?: boolean;
}

type PatternName =
  | "Unsafe property access"
  | "Unsafe destructuring"
  | "Unsafe array index access"
  | "Unprotected JSON.parse"
  | "Unsafe process.env access"
  | "Non-null assertion on nullable"
  | "Unsafe access after await"
  | "Unsafe Promise.all destructuring"
  | "Unsafe Map/Record access";

interface Baseline {
  version: string;
  date: string;
  crashes: { file: string; line: number; expr: string }[];
}

interface ProgramResult {
  program: ts.Program | null;
  fallback: boolean;
  warnings: string[];
  includeTests: boolean;
}

// ─────────────────────────────────────────
// Terminal colors
// ─────────────────────────────────────────

const c = {
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
};

// ─────────────────────────────────────────
// File scanning — performance safe
// Skips all generated/tool directories
// ─────────────────────────────────────────

const SKIP_DIRS = new Set([
  "node_modules",
  "dist",
  "build",
  "out",
  ".next",
  ".nuxt",
  "coverage",
  ".storybook",
  ".generated",
  "generated",
  "tmp",
  ".cache",
  "__generated__",
  ".turbo",
  ".vercel",
]);

// Test file patterns — excluded by default, included with --include-tests
const TEST_PATTERNS = [
  /\.test\.ts$/,
  /\.spec\.ts$/,
  /\/__tests__\//,
  /\/test\//,
  /\/tests\//,
];

function isTestFile(filePath: string): boolean {
  return TEST_PATTERNS.some((p) => p.test(filePath));
}

function findTsFiles(dir: string, files: string[] = []): string[] {
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith(".") && entry.name !== ".") continue;
      if (SKIP_DIRS.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      try {
        if (entry.isDirectory()) findTsFiles(full, files);
        else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".d.ts"))
          files.push(full);
      } catch {
        /* skip unreadable */
      }
    }
  } catch {
    /* skip unreadable dirs */
  }
  return files;
}

// ─────────────────────────────────────────
// Checker usability test
//
// createProgram() can succeed but produce a broken TypeChecker.
// We verify the checker actually works before trusting it.
// ─────────────────────────────────────────

function isCheckerUsable(program: ts.Program): boolean {
  try {
    const checker = program.getTypeChecker();
    const sourceFiles = program.getSourceFiles();
    const firstUserFile = sourceFiles.find(
      (sf) => !sf.isDeclarationFile && !sf.fileName.includes("node_modules"),
    );
    if (!firstUserFile) return false;
    // Lightweight usability probe
    checker.getSymbolsInScope(firstUserFile, ts.SymbolFlags.Variable);
    return true;
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────
// Robust program loading — 3 attempts, never throws
// ─────────────────────────────────────────

function loadProgramRobust(
  projectRoot: string,
  includeTests: boolean,
): ProgramResult {
  const warnings: string[] = [];

  // Attempt 1: tsconfig.json with relaxed options
  try {
    const configPath = ts.findConfigFile(
      projectRoot,
      ts.sys.fileExists,
      "tsconfig.json",
    );
    if (configPath) {
      const { config, error } = ts.readConfigFile(configPath, ts.sys.readFile);
      if (!error) {
        const { options, fileNames, errors } = ts.parseJsonConfigFileContent(
          config,
          ts.sys,
          path.dirname(configPath),
        );
        if (fileNames.length > 0) {
          const program = ts.createProgram(fileNames, {
            ...options,
            noEmit: true,
            skipLibCheck: true,
          });
          if (isCheckerUsable(program)) {
            if (errors.length > 0) {
              warnings.push(
                `tsconfig has ${errors.length} issue(s) — analysis may be partial`,
              );
            }
            return { program, fallback: false, warnings, includeTests };
          }
          warnings.push(
            "TypeChecker built but unusable — trying fallback options",
          );
        }
      } else {
        warnings.push("tsconfig.json found but could not be parsed");
      }
    }
  } catch (e) {
    warnings.push(`tsconfig load error: ${(e as Error).message}`);
  }

  // Attempt 2: direct file scan with permissive options
  try {
    const files = findTsFiles(projectRoot);
    if (files.length > 0) {
      const program = ts.createProgram(files, {
        target: ts.ScriptTarget.ESNext,
        module: ts.ModuleKind.CommonJS,
        strict: true,
        noUncheckedIndexedAccess: true,
        skipLibCheck: true,
        noEmit: true,
      });
      if (isCheckerUsable(program)) {
        warnings.push(
          "No usable tsconfig found — scanning TypeScript files directly",
        );
        return { program, fallback: false, warnings, includeTests };
      }
      warnings.push("Direct scan produced unusable TypeChecker");
    } else {
      warnings.push("No TypeScript files found in project");
    }
  } catch (e) {
    warnings.push(`Direct scan error: ${(e as Error).message}`);
  }

  // Attempt 3: AST-only fallback
  warnings.push("Running in AST-only fallback mode — results will be partial");
  return { program: null, fallback: true, warnings, includeTests };
}

function getUserSourceFiles(
  program: ts.Program,
  includeTests: boolean,
): ts.SourceFile[] {
  try {
    return program
      .getRootFileNames()
      .map((f) => program.getSourceFile(f))
      .filter(
        (sf): sf is ts.SourceFile =>
          sf !== undefined &&
          !sf.isDeclarationFile &&
          !sf.fileName.includes("node_modules") &&
          (includeTests || !isTestFile(sf.fileName)),
      );
  } catch {
    return program
      .getSourceFiles()
      .filter(
        (sf) =>
          !sf.isDeclarationFile &&
          !sf.fileName.includes("node_modules") &&
          (includeTests || !isTestFile(sf.fileName)),
      );
  }
}

// ─────────────────────────────────────────
// Type helpers
// ─────────────────────────────────────────

function isNullable(type: ts.Type): boolean {
  if (type.flags & ts.TypeFlags.Undefined) return true;
  if (type.flags & ts.TypeFlags.Null) return true;
  if (type.isUnion()) {
    return type.types.some(
      (t) =>
        (t.flags & ts.TypeFlags.Undefined) !== 0 ||
        (t.flags & ts.TypeFlags.Null) !== 0,
    );
  }
  return false;
}

function isInsideTryCatch(node: ts.Node): boolean {
  let cur: ts.Node | undefined = node.parent;
  while (cur) {
    if (ts.isTryStatement(cur)) return true;
    cur = cur.parent;
  }
  return false;
}

function pos(sf: ts.SourceFile, node: ts.Node) {
  const { line, character } = sf.getLineAndCharacterOfPosition(node.getStart());
  return { line: line + 1, col: character + 1 };
}

function getChainRoot(expr: ts.Expression): ts.Expression {
  let cur: ts.Expression = expr;
  while (
    ts.isPropertyAccessExpression(cur) ||
    ts.isElementAccessExpression(cur)
  )
    cur = cur.expression;
  return cur;
}

function isSubChainDuplicate(
  node: ts.PropertyAccessExpression,
  checker: ts.TypeChecker,
): boolean {
  const parent = node.parent;
  if (!ts.isPropertyAccessExpression(parent)) return false;
  try {
    return isNullable(checker.getTypeAtLocation(parent.expression));
  } catch {
    return false;
  }
}

function isOptionalAccess(node: ts.PropertyAccessExpression): boolean {
  // Direct optional chaining: a?.b
  if (node.questionDotToken !== undefined) return true;
  // Parent is optional: a?.b.c — the .c access is safe because ?.b already guards the chain
  let cur: ts.Node = node;
  while (
    ts.isPropertyAccessExpression(cur) ||
    ts.isElementAccessExpression(cur)
  ) {
    if (
      ts.isPropertyAccessExpression(cur) &&
      cur.questionDotToken !== undefined
    )
      return true;
    if (ts.isElementAccessExpression(cur) && cur.questionDotToken !== undefined)
      return true;
    cur = cur.expression;
  }
  return false;
}

function hasNonNullAssertion(node: ts.PropertyAccessExpression): boolean {
  return ts.isNonNullExpression(node.expression);
}

// ─────────────────────────────────────────
// FALLBACK DETECTORS — AST only, no TypeChecker
// Runs ONLY when fallback=true (no duplication with typed detectors)
// ─────────────────────────────────────────

function detectFallbackPatterns(sf: ts.SourceFile): CrashReport[] {
  const results: CrashReport[] = [];

  function visit(node: ts.Node) {
    // JSON.parse without try/catch
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.getText() === "parse" &&
      node.expression.expression.getText() === "JSON" &&
      !isInsideTryCatch(node)
    ) {
      const { line, col } = pos(sf, node);
      results.push({
        file: sf.fileName,
        line,
        col,
        expr: node.getText(),
        rootExpr: "JSON.parse",
        type: "unknown",
        pattern: "Unprotected JSON.parse",
        confidence: "HIGH",
        fallback: true,
        crashPath: [
          "JSON.parse(input) — throws SyntaxError if input is malformed",
          "Unhandled exception → process crash",
        ],
      });
    }

    // process.env.X! non-null assertion
    if (
      ts.isNonNullExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      ts.isPropertyAccessExpression(node.expression.expression) &&
      node.expression.expression.expression.getText() === "process" &&
      node.expression.expression.name.getText() === "env"
    ) {
      const envVar = node.expression.name.getText();
      const { line, col } = pos(sf, node);
      results.push({
        file: sf.fileName,
        line,
        col,
        expr: node.getText(),
        rootExpr: `process.env.${envVar}`,
        type: "string | undefined",
        pattern: "Unsafe process.env access",
        confidence: "HIGH",
        fallback: true,
        crashPath: [
          `process.env.${envVar}! — non-null assertion used`,
          `If ${envVar} is not set, crash is silently bypassed by compiler`,
        ],
      });
    }

    ts.forEachChild(node, visit);
  }

  visit(sf);
  return results;
}

// ─────────────────────────────────────────
// TYPED DETECTORS — require working TypeChecker
// Only called when fallback=false
// ─────────────────────────────────────────

function detectUnsafePropertyAccess(
  sf: ts.SourceFile,
  checker: ts.TypeChecker,
): CrashReport[] {
  const results: CrashReport[] = [];
  function visit(node: ts.Node) {
    if (ts.isPropertyAccessExpression(node)) {
      if (isOptionalAccess(node)) {
        ts.forEachChild(node, visit);
        return;
      }
      if (hasNonNullAssertion(node)) {
        ts.forEachChild(node, visit);
        return;
      }
      if (isSubChainDuplicate(node, checker)) {
        ts.forEachChild(node, visit);
        return;
      }
      try {
        const objType = checker.getTypeAtLocation(node.expression);
        if (isNullable(objType)) {
          const { line, col } = pos(sf, node);
          const prop = node.name.getText();
          const obj = node.expression.getText();
          results.push({
            file: sf.fileName,
            line,
            col,
            expr: node.getText(),
            rootExpr: getChainRoot(node.expression).getText(),
            type: checker.typeToString(objType),
            pattern: "Unsafe property access",
            confidence: "HIGH",
            crashPath: [
              `${obj} → ${checker.typeToString(objType)}`,
              `${obj} may be undefined at runtime`,
              `${obj}.${prop} → Cannot read properties of undefined (reading '${prop}')`,
            ],
          });
        }
      } catch {
        /* skip nodes where type resolution fails */
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
  return results;
}

function detectUnsafeDestructuring(
  sf: ts.SourceFile,
  checker: ts.TypeChecker,
): CrashReport[] {
  const results: CrashReport[] = [];
  function visit(node: ts.Node) {
    if (
      ts.isVariableDeclaration(node) &&
      node.initializer &&
      ts.isObjectBindingPattern(node.name)
    ) {
      try {
        const t = checker.getTypeAtLocation(node.initializer);
        if (isNullable(t)) {
          const { line, col } = pos(sf, node);
          const initText = node.initializer.getText();
          results.push({
            file: sf.fileName,
            line,
            col,
            expr: `const ${node.name.getText()} = ${initText}`,
            rootExpr: initText,
            type: checker.typeToString(t),
            pattern: "Unsafe destructuring",
            confidence: "HIGH",
            crashPath: [
              `${initText} → ${checker.typeToString(t)}`,
              `Cannot destructure property of undefined`,
            ],
          });
        }
      } catch {
        /* skip */
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
  return results;
}

function detectUnsafeArrayAccess(
  sf: ts.SourceFile,
  checker: ts.TypeChecker,
): CrashReport[] {
  const results: CrashReport[] = [];
  function visit(node: ts.Node) {
    if (
      ts.isPropertyAccessExpression(node) &&
      ts.isElementAccessExpression(node.expression) &&
      node.questionDotToken === undefined
    ) {
      try {
        const t = checker.getTypeAtLocation(node.expression);
        if (isNullable(t)) {
          const { line, col } = pos(sf, node);
          const arrExpr = node.expression.getText();
          const prop = node.name.getText();
          results.push({
            file: sf.fileName,
            line,
            col,
            expr: node.getText(),
            rootExpr: arrExpr,
            type: checker.typeToString(t),
            pattern: "Unsafe array index access",
            confidence: "HIGH",
            crashPath: [
              `${arrExpr} → ${checker.typeToString(t)} (may be out of bounds)`,
              `${arrExpr}.${prop} → Cannot read properties of undefined (reading '${prop}')`,
            ],
          });
        }
      } catch {
        /* skip */
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
  return results;
}

// NOTE: JSON.parse detector only runs in typed mode here.
// Fallback mode has its own copy to avoid double reporting.
function detectUnsafeJsonParse(sf: ts.SourceFile): CrashReport[] {
  const results: CrashReport[] = [];
  function visit(node: ts.Node) {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.getText() === "parse" &&
      node.expression.expression.getText() === "JSON" &&
      !isInsideTryCatch(node)
    ) {
      const { line, col } = pos(sf, node);
      results.push({
        file: sf.fileName,
        line,
        col,
        expr: node.getText(),
        rootExpr: "JSON.parse",
        type: "unknown",
        pattern: "Unprotected JSON.parse",
        confidence: "HIGH",
        crashPath: [
          "JSON.parse(input) — throws SyntaxError if input is malformed",
          "Unhandled exception → process crash",
        ],
      });
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
  return results;
}

function detectUnsafeEnvAccess(
  sf: ts.SourceFile,
  checker: ts.TypeChecker,
): CrashReport[] {
  const results: CrashReport[] = [];
  function visit(node: ts.Node) {
    if (
      ts.isPropertyAccessExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.expression.getText() === "process" &&
      node.expression.name.getText() === "env"
    ) {
      try {
        const envVar = node.name.getText();
        const envType = checker.getTypeAtLocation(node);
        if (isNullable(envType)) {
          const { line, col } = pos(sf, node);
          results.push({
            file: sf.fileName,
            line,
            col,
            expr: node.getText(),
            rootExpr: `process.env.${envVar}`,
            type: checker.typeToString(envType),
            pattern: "Unsafe process.env access",
            confidence: "HIGH",
            crashPath: [
              `process.env.${envVar} → string | undefined`,
              `If not set in environment → crash`,
            ],
          });
        }
      } catch {
        /* skip */
      }
    }
    // Also catch process.env.X! with type checker
    if (
      ts.isNonNullExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      ts.isPropertyAccessExpression(node.expression.expression) &&
      node.expression.expression.expression.getText() === "process" &&
      node.expression.expression.name.getText() === "env"
    ) {
      const envVar = node.expression.name.getText();
      const { line, col } = pos(sf, node);
      results.push({
        file: sf.fileName,
        line,
        col,
        expr: node.getText(),
        rootExpr: `process.env.${envVar}`,
        type: "string | undefined",
        pattern: "Unsafe process.env access",
        confidence: "HIGH",
        crashPath: [
          `process.env.${envVar}! — non-null assertion`,
          `If missing, crash silently bypassed by compiler`,
        ],
      });
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
  return results;
}

function detectNonNullAssertionOnNullable(
  sf: ts.SourceFile,
  checker: ts.TypeChecker,
): CrashReport[] {
  const results: CrashReport[] = [];
  function visit(node: ts.Node) {
    if (ts.isNonNullExpression(node)) {
      if (node.expression.getText().startsWith("process.env")) {
        ts.forEachChild(node, visit);
        return;
      }
      try {
        const innerType = checker.getTypeAtLocation(node.expression);
        if (isNullable(innerType)) {
          const { line, col } = pos(sf, node);
          results.push({
            file: sf.fileName,
            line,
            col,
            expr: node.getText(),
            rootExpr: node.expression.getText(),
            type: checker.typeToString(innerType),
            pattern: "Non-null assertion on nullable",
            confidence: "MEDIUM",
            crashPath: [
              `${node.expression.getText()} → ${checker.typeToString(innerType)}`,
              `! suppresses the TypeScript error`,
              `If undefined at runtime → crash`,
            ],
          });
        }
      } catch {
        /* skip */
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
  return results;
}

function detectUnsafeAccessAfterAwait(
  sf: ts.SourceFile,
  checker: ts.TypeChecker,
): CrashReport[] {
  const results: CrashReport[] = [];

  function analyzeFunction(fnBody: ts.Block) {
    const narrowedVars = new Set<string>();
    const awaitedAfterNarrow = new Set<string>();

    function collectNarrowings(node: ts.Node) {
      if (ts.isIfStatement(node)) {
        const cond = node.expression;
        let varName: string | null = null;
        if (
          ts.isPrefixUnaryExpression(cond) &&
          cond.operator === ts.SyntaxKind.ExclamationToken
        ) {
          if (ts.isIdentifier(cond.operand)) varName = cond.operand.getText();
        }
        if (ts.isBinaryExpression(cond)) {
          const op = cond.operatorToken.kind;
          if (
            op === ts.SyntaxKind.EqualsEqualsEqualsToken ||
            op === ts.SyntaxKind.EqualsEqualsToken
          ) {
            const right = cond.right.getText();
            if (
              (right === "null" || right === "undefined") &&
              ts.isIdentifier(cond.left)
            ) {
              varName = cond.left.getText();
            }
          }
        }
        if (varName) {
          const thenStmt = node.thenStatement;
          const isEarlyReturn =
            (ts.isBlock(thenStmt) &&
              thenStmt.statements.length === 1 &&
              ts.isReturnStatement(thenStmt.statements[0])) ||
            ts.isReturnStatement(thenStmt);
          if (isEarlyReturn) narrowedVars.add(varName);
        }
      }
      ts.forEachChild(node, collectNarrowings);
    }

    function findViolations(node: ts.Node) {
      if (ts.isAwaitExpression(node)) {
        narrowedVars.forEach((v) => awaitedAfterNarrow.add(v));
      }
      if (ts.isPropertyAccessExpression(node) && awaitedAfterNarrow.size > 0) {
        const root = getChainRoot(node.expression);
        if (ts.isIdentifier(root) && awaitedAfterNarrow.has(root.getText())) {
          if (
            !isOptionalAccess(node) &&
            !hasNonNullAssertion(node) &&
            !isSubChainDuplicate(node, checker)
          ) {
            try {
              const origType = checker.getTypeAtLocation(root);
              if (isNullable(origType)) {
                const { line, col } = pos(sf, node);
                const varName = root.getText();
                results.push({
                  file: sf.fileName,
                  line,
                  col,
                  expr: node.getText(),
                  rootExpr: varName,
                  type: checker.typeToString(origType),
                  pattern: "Unsafe access after await",
                  confidence: "MEDIUM",
                  crashPath: [
                    `${varName} narrowed from ${checker.typeToString(origType)} to defined`,
                    `await suspended execution — external state may have changed`,
                    `${varName} may be undefined again after resuming`,
                    `${node.getText()} → Cannot read properties of undefined`,
                  ],
                });
              }
            } catch {
              /* skip */
            }
          }
        }
      }
      ts.forEachChild(node, findViolations);
    }

    collectNarrowings(fnBody);
    findViolations(fnBody);
  }

  function visit(node: ts.Node) {
    if (
      (ts.isFunctionDeclaration(node) ||
        ts.isMethodDeclaration(node) ||
        ts.isArrowFunction(node) ||
        ts.isFunctionExpression(node)) &&
      node.modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword) &&
      node.body &&
      ts.isBlock(node.body)
    ) {
      analyzeFunction(node.body);
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
  return results;
}

function detectUnsafePromiseAllDestructuring(
  sf: ts.SourceFile,
  checker: ts.TypeChecker,
): CrashReport[] {
  const results: CrashReport[] = [];
  function visit(node: ts.Node) {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isArrayBindingPattern(node.name) &&
      node.initializer &&
      ts.isAwaitExpression(node.initializer)
    ) {
      const awaitedExpr = node.initializer.expression;
      if (
        ts.isCallExpression(awaitedExpr) &&
        ts.isPropertyAccessExpression(awaitedExpr.expression) &&
        awaitedExpr.expression.name.getText() === "all" &&
        awaitedExpr.expression.expression.getText() === "Promise"
      ) {
        try {
          const initType = checker.getTypeAtLocation(node.initializer);
          const typeStr = checker.typeToString(initType);
          if (isNullable(initType) || typeStr.includes("undefined")) {
            const { line, col } = pos(sf, node);
            results.push({
              file: sf.fileName,
              line,
              col,
              expr: node.getText(),
              rootExpr: "Promise.all",
              type: typeStr,
              pattern: "Unsafe Promise.all destructuring",
              confidence: "MEDIUM",
              crashPath: [
                "Promise.all result destructured — elements may be undefined",
                "Accessing properties on undefined → crash",
              ],
            });
          }
        } catch {
          /* skip */
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
  return results;
}

function detectUnsafeMapAccess(
  sf: ts.SourceFile,
  checker: ts.TypeChecker,
): CrashReport[] {
  const results: CrashReport[] = [];
  function visit(node: ts.Node) {
    if (
      ts.isPropertyAccessExpression(node) &&
      ts.isElementAccessExpression(node.expression) &&
      node.questionDotToken === undefined
    ) {
      try {
        const containerType = checker.getTypeAtLocation(
          node.expression.expression,
        );
        const containerStr = checker.typeToString(containerType);
        const isMapLike =
          containerStr.includes("Record<") ||
          containerStr.includes("Map<") ||
          containerStr.includes("{ [") ||
          containerStr.includes("Index");
        if (isMapLike) {
          const elemType = checker.getTypeAtLocation(node.expression);
          if (isNullable(elemType)) {
            const { line, col } = pos(sf, node);
            const mapExpr = node.expression.getText();
            const prop = node.name.getText();
            results.push({
              file: sf.fileName,
              line,
              col,
              expr: node.getText(),
              rootExpr: mapExpr,
              type: checker.typeToString(elemType),
              pattern: "Unsafe Map/Record access",
              confidence: "HIGH",
              crashPath: [
                `${mapExpr} → ${checker.typeToString(elemType)} (key may not exist)`,
                `${mapExpr}.${prop} → Cannot read properties of undefined (reading '${prop}')`,
              ],
            });
          }
        }
      } catch {
        /* skip */
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
  return results;
}

// ─────────────────────────────────────────
// Analyze — routes to typed or fallback detectors
// No duplication: each detector runs in exactly one mode
// ─────────────────────────────────────────

function analyze(programResult: ProgramResult): CrashReport[] {
  const { includeTests } = programResult;

  // FALLBACK MODE: AST-only patterns, no TypeChecker
  if (programResult.fallback || !programResult.program) {
    const files = findTsFiles(process.cwd()).filter(
      (f) => includeTests || !isTestFile(f),
    );
    const all: CrashReport[] = [];
    for (const filePath of files) {
      try {
        const content = fs.readFileSync(filePath, "utf-8");
        const sf = ts.createSourceFile(
          filePath,
          content,
          ts.ScriptTarget.ESNext,
          true,
        );
        all.push(...detectFallbackPatterns(sf));
      } catch {
        /* skip */
      }
    }
    return all;
  }

  // TYPED MODE: full analysis with TypeChecker
  const checker = programResult.program.getTypeChecker();
  const sourceFiles = getUserSourceFiles(programResult.program, includeTests);
  const all: CrashReport[] = [];

  for (const sf of sourceFiles) {
    try {
      all.push(
        ...detectUnsafePropertyAccess(sf, checker),
        ...detectUnsafeDestructuring(sf, checker),
        ...detectUnsafeArrayAccess(sf, checker),
        ...detectUnsafeJsonParse(sf), // no checker needed
        ...detectUnsafeEnvAccess(sf, checker),
        ...detectNonNullAssertionOnNullable(sf, checker),
        ...detectUnsafeAccessAfterAwait(sf, checker),
        ...detectUnsafePromiseAllDestructuring(sf, checker),
        ...detectUnsafeMapAccess(sf, checker),
      );
    } catch {
      /* skip files that cause analysis to fail */
    }
  }
  return all;
}

// ─────────────────────────────────────────
// Baseline
// ─────────────────────────────────────────

const BASELINE_FILE = ".safets-baseline.json";

function saveBaseline(crashes: CrashReport[], root: string) {
  const b: Baseline = {
    version: "0.7",
    date: new Date().toISOString(),
    crashes: crashes.map((cr) => ({
      file: cr.file,
      line: cr.line,
      expr: cr.expr,
    })),
  };
  fs.writeFileSync(path.join(root, BASELINE_FILE), JSON.stringify(b, null, 2));
  console.log(
    c.green(`\n✓ Baseline saved — ${crashes.length} known crash(es) recorded.`),
  );
  console.log(c.dim(`  File: ${BASELINE_FILE}\n`));
}

function loadBaseline(root: string): Baseline | null {
  try {
    const p = path.join(root, BASELINE_FILE);
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, "utf-8")) as Baseline;
  } catch {
    return null;
  }
}

function isNew(cr: CrashReport, base: Baseline): boolean {
  return !base.crashes.some(
    (b) => b.file === cr.file && b.line === cr.line && b.expr === cr.expr,
  );
}

// ─────────────────────────────────────────
// Output
// ─────────────────────────────────────────

function printDoctor(
  crashes: CrashReport[],
  root: string,
  failOnNew: boolean,
  base: Baseline | null,
  pr: ProgramResult,
) {
  const rel = (f: string) => path.relative(root, f);

  if (pr.warnings.length > 0) {
    console.log(c.yellow("  ⚠ Warnings:"));
    pr.warnings.forEach((w) => console.log(c.dim(`    ${w}`)));
    if (pr.fallback)
      console.log(c.yellow("  ⚠ Fallback mode — partial results only\n"));
    else console.log();
  }

  if (crashes.length === 0) {
    console.log(c.green("✓ No potential runtime crashes found.\n"));
    if (pr.fallback)
      console.log(
        c.dim("  Note: fallback mode may miss type-dependent crashes.\n"),
      );
    return;
  }

  const newCrashes = base ? crashes.filter((cr) => isNew(cr, base)) : crashes;
  const knownCrashes = base ? crashes.filter((cr) => !isNew(cr, base)) : [];
  const fallbackCount = crashes.filter((cr) => cr.fallback).length;

  console.log(c.bold("SafeTS Runtime Safety Report"));
  console.log(c.dim("─".repeat(44)));
  console.log(
    base
      ? `${crashes.length} potential crashes  (${c.red(`${newCrashes.length} new`)} · ${c.dim(`${knownCrashes.length} known`)})`
      : c.red(`${crashes.length} potential crashes`),
  );
  if (fallbackCount > 0)
    console.log(
      c.dim(`  ${fallbackCount} in fallback mode (lower confidence)`),
    );
  console.log();

  const grouped = new Map<string, CrashReport[]>();
  for (const cr of crashes) {
    const key = rel(cr.file);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(cr);
  }

  for (const [file, list] of grouped) {
    console.log(c.cyan(`  ${file}`));
    for (const cr of list) {
      const badge = base
        ? isNew(cr, base)
          ? c.red(" [NEW]   ")
          : c.dim(" [known] ")
        : "";
      const conf = cr.confidence === "HIGH" ? c.red("HIGH") : c.yellow("MED ");
      const fbBadge = cr.fallback ? c.dim(" [fallback]") : "";
      console.log(
        `\n  ${badge} ${conf}  Line ${cr.line}:${cr.col}  ${c.bold(cr.pattern)}${fbBadge}`,
      );
      console.log(c.dim(`    ${cr.expr}`));
      console.log(c.dim(`    type: ${cr.type}`));
      console.log(c.dim(`\n    Crash simulation:`));
      cr.crashPath.forEach((step) => console.log(c.dim(`      → ${step}`)));
    }
    console.log();
  }

  console.log(c.dim("─".repeat(44)));
  console.log(c.dim("  safets fix       — fix suggestions"));
  console.log(c.dim("  safets debt      — grouped debt report"));
  console.log(c.dim("  safets baseline  — record current state for CI\n"));

  if (failOnNew && newCrashes.length > 0) {
    console.log(c.red(`✗ ${newCrashes.length} new crash(es) — CI blocked.\n`));
    process.exit(1);
  }
}

function printDebt(crashes: CrashReport[]) {
  const m = new Map<string, number>();
  for (const cr of crashes) m.set(cr.pattern, (m.get(cr.pattern) ?? 0) + 1);
  console.log(c.bold("SafeTS Debt Report"));
  console.log(c.dim("─".repeat(44)));
  for (const [p, n] of m) console.log(`  ${p.padEnd(38)} ${c.red(String(n))}`);
  console.log(c.dim("─".repeat(44)));
  console.log(`  ${"Total".padEnd(38)} ${c.red(String(crashes.length))}\n`);
}

function printFix(crashes: CrashReport[], root: string) {
  const rel = (f: string) => path.relative(root, f);
  console.log(c.bold("SafeTS Fix Suggestions"));
  console.log(c.dim("─".repeat(44)));
  for (const cr of crashes) {
    console.log(c.cyan(`\n  ${rel(cr.file)}:${cr.line}  ${cr.pattern}`));
    console.log(c.dim(`  ${cr.expr}`));
    switch (cr.pattern) {
      case "Unsafe property access":
        console.log(
          c.green(
            `\n  → ${cr.rootExpr}?.${cr.expr.replace(cr.rootExpr + ".", "")}`,
          ),
        );
        console.log(c.green(`  → if (!${cr.rootExpr}) return;`));
        break;
      case "Unsafe destructuring":
        console.log(
          c.green(`\n  → if (!${cr.rootExpr}) return;\n     ${cr.expr}`),
        );
        break;
      case "Unsafe array index access":
      case "Unsafe Map/Record access":
        console.log(
          c.green(`\n  → const item = ${cr.rootExpr}; if (!item) return;`),
        );
        console.log(c.green(`  → ${cr.rootExpr}?.${cr.expr.split(".").pop()}`));
        break;
      case "Unprotected JSON.parse":
        console.log(
          c.green(
            `\n  → try { ${cr.expr} } catch (e) { /* handle SyntaxError */ }`,
          ),
        );
        break;
      case "Unsafe process.env access":
        console.log(
          c.green(
            `\n  → const val = process.env.${cr.rootExpr.split(".")[2]} ?? "default";`,
          ),
        );
        console.log(
          c.green(
            `  → Validate all env vars at startup in a dedicated config.ts`,
          ),
        );
        break;
      case "Non-null assertion on nullable":
        console.log(
          c.green(`\n  → Replace ! with: if (!${cr.rootExpr}) return;`),
        );
        console.log(c.green(`  → Or: ${cr.rootExpr}?.yourMethod()`));
        break;
      case "Unsafe access after await":
        console.log(
          c.green(
            `\n  → Re-check after await:\n     await doSomething();\n     if (!${cr.rootExpr}) return;`,
          ),
        );
        break;
      case "Unsafe Promise.all destructuring":
        console.log(
          c.green(
            `\n  → const [item] = await Promise.all([...]);\n     if (!item) return;`,
          ),
        );
        break;
    }
  }
  console.log();
}

// ─────────────────────────────────────────
// CLI entry point
// ─────────────────────────────────────────

const args = process.argv.slice(2);
const command = args[0] ?? "doctor";
const failOnNew = args.includes("--fail-on-new");
const withBase = args.includes("--baseline");
const includeTests = args.includes("--include-tests");
const root = process.cwd();

console.log(c.bold(c.cyan("\n  SafeTS v0.7")));
console.log(c.dim("  Finds common runtime crashes TypeScript can't detect\n"));
if (!includeTests)
  console.log(
    c.dim("  (test files excluded — use --include-tests to include them)\n"),
  );

const programResult = loadProgramRobust(root, includeTests);
const crashes = analyze(programResult);
const baseline = loadBaseline(root);

switch (command) {
  case "debt":
    printDebt(crashes);
    break;
  case "fix":
    printFix(crashes, root);
    break;
  case "baseline":
    saveBaseline(crashes, root);
    break;
  case "doctor":
  default:
    printDoctor(crashes, root, failOnNew, baseline, programResult);
    if (withBase) saveBaseline(crashes, root);
    break;
}
