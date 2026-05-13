import fs from "fs";
import path from "path";
import ts from "typescript";
import {
  detectFallbackPatterns,
  detectNonNullAssertionOnNullable,
  detectUnsafeAccessAfterAwait,
  detectUnsafeArrayAccess,
  detectUnsafeDestructuring,
  detectUnsafeEnvAccess,
  detectUnsafeJsonParse,
  detectUnsafeMapAccess,
  detectUnsafePromiseAllDestructuring,
  detectUnsafePropertyAccess,
} from "./detectors/index.ts";
import { findTsFiles, isAnalyzableTsFile, isTestFile, normalizeFilePath } from "./utils/files.ts";
import type { CrashReport, ProgramResult } from "./utils/types.ts";

function filterProgramFiles(fileNames: string[]): string[] {
  return fileNames
    .map((fileName) => normalizeFilePath(fileName))
    .filter((fileName) => isAnalyzableTsFile(fileName));
}

function isCheckerUsable(program: ts.Program): boolean {
  try {
    const checker = program.getTypeChecker();
    const sourceFiles = program.getSourceFiles();
    const firstUserFile = sourceFiles.find(
      (sf) => !sf.isDeclarationFile && !sf.fileName.includes("node_modules"),
    );

    if (!firstUserFile) {
      return false;
    }

    checker.getSymbolsInScope(firstUserFile, ts.SymbolFlags.Variable);
    return true;
  } catch {
    return false;
  }
}

export function loadProgramRobust(
  projectRoot: string,
  includeTests: boolean,
): ProgramResult {
  const warnings: string[] = [];

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
        const filteredFileNames = filterProgramFiles(fileNames);

        if (filteredFileNames.length > 0) {
          const program = ts.createProgram(filteredFileNames, {
            ...options,
            noEmit: true,
            skipLibCheck: true,
          });

          if (isCheckerUsable(program)) {
            if (errors.length > 0) {
              warnings.push(
                `tsconfig has ${errors.length} issue(s) - analysis may be partial`,
              );
            }
            if (filteredFileNames.length !== fileNames.length) {
              warnings.push(
                `Filtered ${fileNames.length - filteredFileNames.length} generated or bundled file(s) from tsconfig inputs`,
              );
            }
            return { program, fallback: false, warnings, includeTests };
          }

          warnings.push("TypeChecker built but unusable - trying fallback options");
        }
      } else {
        warnings.push("tsconfig.json found but could not be parsed");
      }
    }
  } catch (error) {
    warnings.push(`tsconfig load error: ${(error as Error).message}`);
  }

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
        warnings.push("No usable tsconfig found - scanning TypeScript files directly");
        return { program, fallback: false, warnings, includeTests };
      }

      warnings.push("Direct scan produced unusable TypeChecker");
    } else {
      warnings.push("No TypeScript files found in project");
    }
  } catch (error) {
    warnings.push(`Direct scan error: ${(error as Error).message}`);
  }

  warnings.push("Running in AST-only fallback mode - results will be partial");
  return { program: null, fallback: true, warnings, includeTests };
}

function getUserSourceFiles(
  program: ts.Program,
  includeTests: boolean,
): ts.SourceFile[] {
  try {
    return program
      .getRootFileNames()
      .map((fileName) => program.getSourceFile(fileName))
      .filter(
        (sf): sf is ts.SourceFile =>
          sf !== undefined &&
          !sf.isDeclarationFile &&
          !sf.fileName.includes("node_modules") &&
          isAnalyzableTsFile(sf.fileName) &&
          (includeTests || !isTestFile(sf.fileName)),
      );
  } catch {
    return program.getSourceFiles().filter(
      (sf) =>
        !sf.isDeclarationFile &&
        !sf.fileName.includes("node_modules") &&
        isAnalyzableTsFile(sf.fileName) &&
        (includeTests || !isTestFile(sf.fileName)),
    );
  }
}

export function analyze(programResult: ProgramResult): CrashReport[] {
  const { includeTests } = programResult;

  if (programResult.fallback || !programResult.program) {
    const files = findTsFiles(process.cwd()).filter(
      (filePath) => includeTests || !isTestFile(filePath),
    );
    const all: CrashReport[] = [];

    for (const filePath of files) {
      try {
        const content = fs.readFileSync(filePath, "utf-8");
        const sourceFile = ts.createSourceFile(
          filePath,
          content,
          ts.ScriptTarget.ESNext,
          true,
        );
        all.push(...detectFallbackPatterns(sourceFile));
      } catch {
        // Ignore unreadable files in fallback mode.
      }
    }

    return all;
  }

  const checker = programResult.program.getTypeChecker();
  const sourceFiles = getUserSourceFiles(programResult.program, includeTests);
  const all: CrashReport[] = [];

  for (const sourceFile of sourceFiles) {
    try {
      all.push(
        ...detectUnsafePropertyAccess(sourceFile, checker),
        ...detectUnsafeDestructuring(sourceFile, checker),
        ...detectUnsafeArrayAccess(sourceFile, checker),
        ...detectUnsafeJsonParse(sourceFile),
        ...detectUnsafeEnvAccess(sourceFile, checker),
        ...detectNonNullAssertionOnNullable(sourceFile, checker),
        ...detectUnsafeAccessAfterAwait(sourceFile, checker),
        ...detectUnsafePromiseAllDestructuring(sourceFile, checker),
        ...detectUnsafeMapAccess(sourceFile, checker),
      );
    } catch {
      // Skip files that fail analysis instead of crashing the CLI.
    }
  }

  return all;
}
