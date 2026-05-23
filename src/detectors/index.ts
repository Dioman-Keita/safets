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

  function isEnvAccess(candidate: ts.Node): candidate is ts.PropertyAccessExpression {
    return (
      ts.isPropertyAccessExpression(candidate) &&
      ts.isPropertyAccessExpression(candidate.expression) &&
      ts.isIdentifier(candidate.expression.expression) &&
      candidate.expression.expression.text === "process" &&
      ts.isIdentifier(candidate.expression.name) &&
      candidate.expression.name.text === "env"
    );
  }

  function isSafelyDefaulted(node: ts.Node): boolean {
    let current: ts.Node = node;
    let foundDefault = false;
    let pendingNonNullWrappers: ts.NonNullExpression[] = [];
    const allowedNonNullWrappers = new Set<ts.NonNullExpression>();

    function containsEnvAccess(child: ts.Node): boolean {
      let found = false;

      function visitEnv(candidate: ts.Node) {
        if (isEnvAccess(candidate)) {
          found = true;
          return;
        }

        ts.forEachChild(candidate, visitEnv);
      }

      visitEnv(child);
      return found;
    }

    function isUnsafeNonNullEnvExpression(candidate: ts.Node): boolean {
      if (
        !ts.isNonNullExpression(candidate) ||
        !containsEnvAccess(candidate.expression) ||
        allowedNonNullWrappers.has(candidate)
      ) {
        return false;
      }

      try {
        return isNullable(checker.getTypeAtLocation(candidate.expression));
      } catch {
        return true;
      }
    }

    function hasUnsafeEnvNonNullAssertionOnPath(start: ts.Node, root: ts.Node): boolean {
      let candidate: ts.Node | undefined = start;

      while (candidate) {
        if (isUnsafeNonNullEnvExpression(candidate)) {
          return true;
        }

        if (candidate === root) {
          return false;
        }

        candidate = candidate.parent;
      }

      return false;
    }

    while (true) {
      while (
        ts.isParenthesizedExpression(current.parent) ||
        ts.isNonNullExpression(current.parent)
      ) {
        if (ts.isNonNullExpression(current.parent)) {
          pendingNonNullWrappers.push(current.parent);
        }
        current = current.parent;
      }

      const parent = current.parent;
      if (
        !ts.isBinaryExpression(parent) ||
        (parent.operatorToken.kind !== ts.SyntaxKind.QuestionQuestionToken &&
          parent.operatorToken.kind !== ts.SyntaxKind.BarBarToken)
      ) {
        break;
      }

      if (parent.left === current) {
        if (ts.isNonNullExpression(current) && isEnvAccess(current.expression)) {
          allowedNonNullWrappers.add(current);
        }
        pendingNonNullWrappers.forEach((wrapper) => allowedNonNullWrappers.add(wrapper));
        foundDefault = true;
      }
      pendingNonNullWrappers = [];
      current = parent;
    }

    if (!foundDefault || hasUnsafeEnvNonNullAssertionOnPath(node, current)) {
      return false;
    }

    try {
      return !isNullable(checker.getTypeAtLocation(current));
    } catch {
      return false;
    }
  }

  function visit(node: ts.Node) {
    if (
      isEnvAccess(node) &&
      !isSafelyDefaulted(node) &&
      !ts.isNonNullExpression(node.parent)
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
      isEnvAccess(node.expression) &&
      !isSafelyDefaulted(node)
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
    const narrowedVars = new Set<ts.Symbol>();
    const narrowedVarTypes = new Map<ts.Symbol, { name: string; type: string }>();
    const callableBodies = new Map<ts.Symbol, ts.ConciseBody>();
    const callStack = new Set<ts.Symbol>();

    function isFunctionLike(node: ts.Node): boolean {
      return (
        ts.isFunctionDeclaration(node) ||
        ts.isMethodDeclaration(node) ||
        ts.isArrowFunction(node) ||
        ts.isFunctionExpression(node)
      );
    }

    function isImmediatelyInvokedFunction(node: ts.Node): boolean {
      let current: ts.Node = node;
      while (ts.isParenthesizedExpression(current.parent)) {
        current = current.parent;
      }

      return ts.isCallExpression(current.parent) && current.parent.expression === current;
    }

    function collectCallableBodies(node: ts.Node) {
      if (ts.isFunctionDeclaration(node)) {
        const symbol = node.name ? checker.getSymbolAtLocation(node.name) : undefined;
        if (symbol && node.body) {
          callableBodies.set(symbol, node.body);
          collectCallableBodies(node.body);
        }
        return;
      }

      if (
        ts.isVariableDeclaration(node) &&
        ts.isIdentifier(node.name) &&
        node.initializer &&
        (ts.isFunctionExpression(node.initializer) || ts.isArrowFunction(node.initializer))
      ) {
        const symbol = checker.getSymbolAtLocation(node.name);
        if (symbol) {
          callableBodies.set(symbol, node.initializer.body);
          collectCallableBodies(node.initializer.body);
        }
        return;
      }

      if (isFunctionLike(node)) {
        return;
      }

      ts.forEachChild(node, collectCallableBodies);
    }

    function getEarlyReturnGuardIdentifier(node: ts.IfStatement): ts.Identifier | null {
      const condition = node.expression;
      let identifier: ts.Identifier | null = null;

      function isNullishLiteral(candidate: ts.Node): boolean {
        return (
          candidate.kind === ts.SyntaxKind.NullKeyword ||
          (ts.isIdentifier(candidate) && candidate.text === "undefined")
        );
      }

      if (
        ts.isPrefixUnaryExpression(condition) &&
        condition.operator === ts.SyntaxKind.ExclamationToken &&
        ts.isIdentifier(condition.operand)
      ) {
        identifier = condition.operand;
      }

      if (ts.isBinaryExpression(condition)) {
        const op = condition.operatorToken.kind;
        if (
          op === ts.SyntaxKind.EqualsEqualsEqualsToken ||
          op === ts.SyntaxKind.EqualsEqualsToken
        ) {
          const left = condition.left;
          const right = condition.right;
          if (ts.isIdentifier(left) && isNullishLiteral(right)) {
            identifier = left;
          } else if (ts.isIdentifier(right) && isNullishLiteral(left)) {
            identifier = right;
          }
        }
      }

      if (!identifier) {
        return null;
      }

      const isEarlyExit = (statement: ts.Statement): boolean => {
        if (ts.isReturnStatement(statement) || ts.isThrowStatement(statement)) {
          return true;
        }

        return (
          ts.isBlock(statement) &&
          statement.statements.some((child) => isEarlyExit(child))
        );
      };

      if (!isEarlyExit(node.thenStatement)) {
        return null;
      }

      return identifier;
    }

    function getNullableEarlyReturnGuard(node: ts.IfStatement) {
      const identifier = getEarlyReturnGuardIdentifier(node);
      if (!identifier) {
        return null;
      }

      try {
        const symbol = checker.getSymbolAtLocation(identifier);
        if (!symbol) {
          return null;
        }

        const type = checker.getTypeAtLocation(identifier);
        if (!isNullable(type)) {
          return null;
        }

        return {
          symbol,
          name: identifier.getText(),
          type: checker.typeToString(type),
        };
      } catch {
        return null;
      }
    }

    function getTrackedEarlyReturnGuard(node: ts.IfStatement) {
      const identifier = getEarlyReturnGuardIdentifier(node);
      const symbol = identifier ? checker.getSymbolAtLocation(identifier) : undefined;
      if (!symbol || !narrowedVarTypes.has(symbol)) {
        return null;
      }

      return symbol;
    }

    function collectNarrowings(node: ts.Node) {
      if (isFunctionLike(node)) {
        return;
      }

      if (ts.isIfStatement(node)) {
        const guard = getNullableEarlyReturnGuard(node);
        if (guard) {
          narrowedVars.add(guard.symbol);
          narrowedVarTypes.set(guard.symbol, {
            name: guard.name,
            type: guard.type,
          });
        }
      }

      ts.forEachChild(node, collectNarrowings);
    }

    function getAssignmentTarget(node: ts.Node): ts.Symbol | null {
      if (
        !ts.isBinaryExpression(node) ||
        node.operatorToken.kind < ts.SyntaxKind.FirstAssignment ||
        node.operatorToken.kind > ts.SyntaxKind.LastAssignment ||
        !ts.isIdentifier(node.left)
      ) {
        return null;
      }

      return checker.getSymbolAtLocation(node.left) ?? null;
    }

    function isOutermostPropertyAccess(node: ts.PropertyAccessExpression): boolean {
      return !(
        ts.isPropertyAccessExpression(node.parent) &&
        node.parent.questionDotToken === undefined
      );
    }

    function analyzeCalledClosure(
      symbol: ts.Symbol,
      activeAfterAwait: Set<ts.Symbol>,
      activeNarrowings: Set<ts.Symbol>,
    ) {
      const calledBody = callableBodies.get(symbol);
      if (!calledBody || callStack.has(symbol)) {
        return;
      }

      callStack.add(symbol);
      if (ts.isBlock(calledBody)) {
        findViolationsInBlock(
          calledBody,
          new Set(activeAfterAwait),
          new Set(activeNarrowings),
        );
      } else {
        findViolations(calledBody, new Set(activeAfterAwait), new Set(activeNarrowings));
      }
      callStack.delete(symbol);
    }

    function findViolations(
      node: ts.Node,
      activeAfterAwait: Set<ts.Symbol>,
      activeNarrowings: Set<ts.Symbol>,
    ) {
      if (isFunctionLike(node)) {
        if (isImmediatelyInvokedFunction(node)) {
          ts.forEachChild(node, (child) =>
            findViolations(child, new Set(activeAfterAwait), new Set(activeNarrowings)),
          );
        }
        return;
      }

      if (ts.isBlock(node)) {
        const isConditionalBranch =
          ts.isIfStatement(node.parent) &&
          (node.parent.thenStatement === node || node.parent.elseStatement === node);
        const blockAfterAwait = new Set(activeAfterAwait);
        const blockNarrowings = new Set(activeNarrowings);
        findViolationsInBlock(node, blockAfterAwait, blockNarrowings);

        if (isConditionalBranch) {
          blockAfterAwait.forEach((symbol) => activeAfterAwait.add(symbol));
          return;
        }

        activeAfterAwait.clear();
        blockAfterAwait.forEach((symbol) => activeAfterAwait.add(symbol));
        activeNarrowings.clear();
        blockNarrowings.forEach((symbol) => activeNarrowings.add(symbol));
        return;
      }

      const assignmentTarget = getAssignmentTarget(node);

      if (ts.isAwaitExpression(node)) {
        activeNarrowings.forEach((varName) => activeAfterAwait.add(varName));
      }

      if (ts.isPropertyAccessExpression(node) && activeAfterAwait.size > 0) {
        const root = getChainRoot(node.expression);
        const rootSymbol = ts.isIdentifier(root)
          ? checker.getSymbolAtLocation(root)
          : undefined;
        if (
          rootSymbol &&
          activeAfterAwait.has(rootSymbol) &&
          !isOptionalAccess(node) &&
          !hasNonNullAssertion(node) &&
          !isSubChainDuplicate(node, checker) &&
          isOutermostPropertyAccess(node)
        ) {
          try {
            const { line, col } = pos(sf, node);
            const originalType = narrowedVarTypes.get(rootSymbol);
            if (!originalType) {
              ts.forEachChild(node, (child) =>
                findViolations(child, activeAfterAwait, activeNarrowings),
              );
              return;
            }
            results.push({
              file: sf.fileName,
              line,
              col,
              expr: node.getText(),
              rootExpr: originalType.name,
              type: originalType.type,
              pattern: "Unsafe access after await",
              confidence: "MEDIUM",
              crashPath: [
                `${originalType.name} narrowed from ${originalType.type} to defined`,
                "await suspended execution - external state may have changed",
                `${originalType.name} may be undefined again after resuming`,
                `${node.getText()} -> Cannot read properties of undefined`,
              ],
            });
          } catch {
            // Ignore nodes where type resolution fails.
          }
        }
      }

      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        (activeAfterAwait.size > 0 || activeNarrowings.size > 0)
      ) {
        const symbol = checker.getSymbolAtLocation(node.expression);
        if (symbol) {
          analyzeCalledClosure(symbol, activeAfterAwait, activeNarrowings);
        }
      }

      ts.forEachChild(node, (child) =>
        findViolations(child, activeAfterAwait, activeNarrowings),
      );

      if (assignmentTarget) {
        activeNarrowings.delete(assignmentTarget);
        activeAfterAwait.delete(assignmentTarget);
      }
    }

    function findViolationsInBlock(
      block: ts.Block,
      activeAfterAwait = new Set<ts.Symbol>(),
      activeNarrowings = new Set(narrowedVars),
    ) {
      for (const statement of block.statements) {
        findViolations(statement, activeAfterAwait, activeNarrowings);

        if (ts.isIfStatement(statement)) {
          const symbol = getTrackedEarlyReturnGuard(statement);
          if (symbol && activeAfterAwait.has(symbol)) {
            activeAfterAwait.delete(symbol);
            activeNarrowings.add(symbol);
          }
        }
      }
    }

    collectCallableBodies(body);
    collectNarrowings(body);
    findViolationsInBlock(body);
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
