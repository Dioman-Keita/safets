import ts from "typescript";
import {
  getChainRoot,
  hasNonNullAssertion,
  isInsideTryCatch,
  isNullable,
  isOptionalAccess,
  isSubChainDuplicate,
  pos,
} from "../utils/ast.ts";
import type { CrashReport } from "../utils/types.ts";

export function detectFallbackPatterns(sf: ts.SourceFile): CrashReport[] {
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
        fallback: true,
        crashPath: [
          "JSON.parse(input) - throws SyntaxError if input is malformed",
          "Unhandled exception -> process crash",
        ],
      });
    }

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
          `process.env.${envVar}! - non-null assertion used`,
          `If ${envVar} is not set, crash is silently bypassed by compiler`,
        ],
      });
    }

    ts.forEachChild(node, visit);
  }

  visit(sf);
  return results;
}

export function detectUnsafePropertyAccess(
  sf: ts.SourceFile,
  checker: ts.TypeChecker,
): CrashReport[] {
  const results: CrashReport[] = [];

  function visit(node: ts.Node) {
    if (ts.isPropertyAccessExpression(node)) {
      if (isOptionalAccess(node) || hasNonNullAssertion(node) || isSubChainDuplicate(node, checker)) {
        ts.forEachChild(node, visit);
        return;
      }

      try {
        const objectType = checker.getTypeAtLocation(node.expression);
        if (isNullable(objectType)) {
          const { line, col } = pos(sf, node);
          const prop = node.name.getText();
          const objectExpr = node.expression.getText();
          results.push({
            file: sf.fileName,
            line,
            col,
            expr: node.getText(),
            rootExpr: getChainRoot(node.expression).getText(),
            type: checker.typeToString(objectType),
            pattern: "Unsafe property access",
            confidence: "HIGH",
            crashPath: [
              `${objectExpr} -> ${checker.typeToString(objectType)}`,
              `${objectExpr} may be undefined at runtime`,
              `${objectExpr}.${prop} -> Cannot read properties of undefined (reading '${prop}')`,
            ],
          });
        }
      } catch {
        // Ignore nodes where type resolution fails.
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sf);
  return results;
}

export function detectUnsafeDestructuring(
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
        const initialType = checker.getTypeAtLocation(node.initializer);
        if (isNullable(initialType)) {
          const { line, col } = pos(sf, node);
          const initializerText = node.initializer.getText();
          results.push({
            file: sf.fileName,
            line,
            col,
            expr: `const ${node.name.getText()} = ${initializerText}`,
            rootExpr: initializerText,
            type: checker.typeToString(initialType),
            pattern: "Unsafe destructuring",
            confidence: "HIGH",
            crashPath: [
              `${initializerText} -> ${checker.typeToString(initialType)}`,
              "Cannot destructure property of undefined",
            ],
          });
        }
      } catch {
        // Ignore nodes where type resolution fails.
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sf);
  return results;
}

export function detectUnsafeArrayAccess(
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
        const elementType = checker.getTypeAtLocation(node.expression);
        if (isNullable(elementType)) {
          const { line, col } = pos(sf, node);
          const arrayExpr = node.expression.getText();
          const prop = node.name.getText();
          results.push({
            file: sf.fileName,
            line,
            col,
            expr: node.getText(),
            rootExpr: arrayExpr,
            type: checker.typeToString(elementType),
            pattern: "Unsafe array index access",
            confidence: "HIGH",
            crashPath: [
              `${arrayExpr} -> ${checker.typeToString(elementType)} (may be out of bounds)`,
              `${arrayExpr}.${prop} -> Cannot read properties of undefined (reading '${prop}')`,
            ],
          });
        }
      } catch {
        // Ignore nodes where type resolution fails.
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sf);
  return results;
}

export function detectUnsafeJsonParse(sf: ts.SourceFile): CrashReport[] {
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
          "JSON.parse(input) - throws SyntaxError if input is malformed",
          "Unhandled exception -> process crash",
        ],
      });
    }

    ts.forEachChild(node, visit);
  }

  visit(sf);
  return results;
}

export function detectUnsafeEnvAccess(
  sf: ts.SourceFile,
  checker: ts.TypeChecker,
): CrashReport[] {
  const results: CrashReport[] = [];

  function isSafelyDefaulted(node: ts.PropertyAccessExpression): boolean {
    const parent = node.parent;
    return (
      ts.isBinaryExpression(parent) &&
      parent.left === node &&
      parent.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken
    );
  }

  function visit(node: ts.Node) {
    if (
      ts.isPropertyAccessExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.expression.getText() === "process" &&
      node.expression.name.getText() === "env" &&
      !isSafelyDefaulted(node)
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
              `process.env.${envVar} -> string | undefined`,
              "If not set in environment -> crash",
            ],
          });
        }
      } catch {
        // Ignore nodes where type resolution fails.
      }
    }

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
          `process.env.${envVar}! - non-null assertion`,
          "If missing, crash is silently bypassed by compiler",
        ],
      });
    }

    ts.forEachChild(node, visit);
  }

  visit(sf);
  return results;
}

export function detectNonNullAssertionOnNullable(
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
              `${node.expression.getText()} -> ${checker.typeToString(innerType)}`,
              "! suppresses the TypeScript error",
              "If undefined at runtime -> crash",
            ],
          });
        }
      } catch {
        // Ignore nodes where type resolution fails.
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sf);
  return results;
}

export function detectUnsafeAccessAfterAwait(
  sf: ts.SourceFile,
  checker: ts.TypeChecker,
): CrashReport[] {
  const results: CrashReport[] = [];

  function analyzeFunction(body: ts.Block) {
    const narrowedVars = new Set<string>();
    const awaitedAfterNarrow = new Set<string>();
    const narrowedVarTypes = new Map<string, string>();

    function collectNarrowings(node: ts.Node) {
      if (ts.isIfStatement(node)) {
        const condition = node.expression;
        let varName: string | null = null;
        let originalType: string | null = null;

        if (
          ts.isPrefixUnaryExpression(condition) &&
          condition.operator === ts.SyntaxKind.ExclamationToken &&
          ts.isIdentifier(condition.operand)
        ) {
          varName = condition.operand.getText();
          try {
            originalType = checker.typeToString(
              checker.getTypeAtLocation(condition.operand),
            );
          } catch {
            originalType = null;
          }
        }

        if (ts.isBinaryExpression(condition)) {
          const op = condition.operatorToken.kind;
          if (
            (op === ts.SyntaxKind.EqualsEqualsEqualsToken ||
              op === ts.SyntaxKind.EqualsEqualsToken) &&
            ts.isIdentifier(condition.left)
          ) {
            const right = condition.right.getText();
            if (right === "null" || right === "undefined") {
              varName = condition.left.getText();
              try {
                originalType = checker.typeToString(
                  checker.getTypeAtLocation(condition.left),
                );
              } catch {
                originalType = null;
              }
            }
          }
        }

        if (varName) {
          const thenStatement = node.thenStatement;
          const firstThenStatement = ts.isBlock(thenStatement)
            ? thenStatement.statements[0]
            : undefined;
          const isEarlyReturn =
            (ts.isBlock(thenStatement) &&
              thenStatement.statements.length === 1 &&
              firstThenStatement !== undefined &&
              ts.isReturnStatement(firstThenStatement)) ||
            ts.isReturnStatement(thenStatement);

          if (isEarlyReturn) {
            narrowedVars.add(varName);
            if (originalType) {
              narrowedVarTypes.set(varName, originalType);
            }
          }
        }
      }

      ts.forEachChild(node, collectNarrowings);
    }

    function findViolations(node: ts.Node) {
      if (ts.isAwaitExpression(node)) {
        narrowedVars.forEach((varName) => awaitedAfterNarrow.add(varName));
      }

      if (ts.isPropertyAccessExpression(node) && awaitedAfterNarrow.size > 0) {
        const root = getChainRoot(node.expression);
        if (
          ts.isIdentifier(root) &&
          awaitedAfterNarrow.has(root.getText()) &&
          !isOptionalAccess(node) &&
          !hasNonNullAssertion(node) &&
          !isSubChainDuplicate(node, checker)
        ) {
          try {
            const { line, col } = pos(sf, node);
            const varName = root.getText();
            const originalType = narrowedVarTypes.get(varName) ?? "possibly nullable";
            results.push({
              file: sf.fileName,
              line,
              col,
              expr: node.getText(),
              rootExpr: varName,
              type: originalType,
              pattern: "Unsafe access after await",
              confidence: "MEDIUM",
              crashPath: [
                `${varName} narrowed from ${originalType} to defined`,
                "await suspended execution - external state may have changed",
                `${varName} may be undefined again after resuming`,
                `${node.getText()} -> Cannot read properties of undefined`,
              ],
            });
          } catch {
            // Ignore nodes where type resolution fails.
          }
        }
      }

      ts.forEachChild(node, findViolations);
    }

    collectNarrowings(body);
    findViolations(body);
  }

  function visit(node: ts.Node) {
    if (
      (ts.isFunctionDeclaration(node) ||
        ts.isMethodDeclaration(node) ||
        ts.isArrowFunction(node) ||
        ts.isFunctionExpression(node)) &&
      node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.AsyncKeyword) &&
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

export function detectUnsafePromiseAllDestructuring(
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
          const typeString = checker.typeToString(initType);
          if (isNullable(initType) || typeString.includes("undefined")) {
            const { line, col } = pos(sf, node);
            results.push({
              file: sf.fileName,
              line,
              col,
              expr: node.getText(),
              rootExpr: "Promise.all",
              type: typeString,
              pattern: "Unsafe Promise.all destructuring",
              confidence: "MEDIUM",
              crashPath: [
                "Promise.all result destructured - elements may be undefined",
                "Accessing properties on undefined -> crash",
              ],
            });
          }
        } catch {
          // Ignore nodes where type resolution fails.
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sf);
  return results;
}

export function detectUnsafeMapAccess(
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
        const containerType = checker.getTypeAtLocation(node.expression.expression);
        const containerString = checker.typeToString(containerType);
        const isMapLike =
          containerString.includes("Record<") ||
          containerString.includes("Map<") ||
          containerString.includes("{ [") ||
          containerString.includes("Index");

        if (isMapLike) {
          const elementType = checker.getTypeAtLocation(node.expression);
          if (isNullable(elementType)) {
            const { line, col } = pos(sf, node);
            const mapExpr = node.expression.getText();
            const prop = node.name.getText();
            results.push({
              file: sf.fileName,
              line,
              col,
              expr: node.getText(),
              rootExpr: mapExpr,
              type: checker.typeToString(elementType),
              pattern: "Unsafe Map/Record access",
              confidence: "HIGH",
              crashPath: [
                `${mapExpr} -> ${checker.typeToString(elementType)} (key may not exist)`,
                `${mapExpr}.${prop} -> Cannot read properties of undefined (reading '${prop}')`,
              ],
            });
          }
        }
      } catch {
        // Ignore nodes where type resolution fails.
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sf);
  return results;
}
