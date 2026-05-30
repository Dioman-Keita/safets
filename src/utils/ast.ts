import ts from "typescript";

export function isNullable(type: ts.Type): boolean {
  if (type.flags & ts.TypeFlags.Undefined) {
    return true;
  }
  if (type.flags & ts.TypeFlags.Null) {
    return true;
  }
  if (type.isUnion()) {
    return type.types.some(
      (innerType) =>
        (innerType.flags & ts.TypeFlags.Undefined) !== 0 ||
        (innerType.flags & ts.TypeFlags.Null) !== 0,
    );
  }
  return false;
}

export function isInsideTryCatch(node: ts.Node): boolean {
  let current: ts.Node | undefined = node.parent;
  while (current) {
    if (ts.isTryStatement(current)) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

export function pos(sf: ts.SourceFile, node: ts.Node) {
  const { line, character } = sf.getLineAndCharacterOfPosition(node.getStart());
  return { line: line + 1, col: character + 1 };
}

export function getChainRoot(expr: ts.Expression): ts.Expression {
  let current: ts.Expression = expr;
  while (ts.isPropertyAccessExpression(current) || ts.isElementAccessExpression(current)) {
    current = current.expression;
  }
  return current;
}

export function isSubChainDuplicate(
  node: ts.PropertyAccessExpression,
  checker: ts.TypeChecker,
): boolean {
  const parent = node.parent;
  if (!ts.isPropertyAccessExpression(parent)) {
    return false;
  }
  if (parent.expression !== node) {
    return false;
  }
  if (ts.isCallExpression(parent.parent) && parent.parent.expression === parent) {
    return false;
  }
  try {
    return isNullable(checker.getTypeAtLocation(parent.expression));
  } catch {
    return false;
  }
}

export function isOptionalAccess(node: ts.PropertyAccessExpression): boolean {
  if (node.questionDotToken !== undefined) {
    return true;
  }

  let current: ts.Node = node;
  while (ts.isPropertyAccessExpression(current) || ts.isElementAccessExpression(current)) {
    if (ts.isPropertyAccessExpression(current) && current.questionDotToken !== undefined) {
      return true;
    }
    if (ts.isElementAccessExpression(current) && current.questionDotToken !== undefined) {
      return true;
    }
    current = current.expression;
  }

  return false;
}

export function hasNonNullAssertion(node: ts.PropertyAccessExpression): boolean {
  return ts.isNonNullExpression(node.expression);
}
