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
import { findTsConfigFiles, findTsFiles, isAnalyzableTsFile, isTestFile, normalizeFilePath } from "./utils/files.ts";
import type { CrashReport, ProgramResult } from "./utils/types.ts";

interface TsConfigProgramResult {
  program: ts.Program | null;
  options: ts.CompilerOptions;
  fileNames: string[];
  filteredFileNames: string[];
  errors: readonly unknown[];
}

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

function loadTsConfigProgram(
  configPath: string,
  createProgram = true,
): TsConfigProgramResult {
  try {
    const { config, error } = ts.readConfigFile(configPath, ts.sys.readFile);
    if (error) {
      return {
        program: null,
        options: {},
        fileNames: [],
        filteredFileNames: [],
        errors: [error],
      };
    }

    const { options, fileNames, errors } = ts.parseJsonConfigFileContent(
      config,
      ts.sys,
      path.dirname(configPath),
    );
    const filteredFileNames = filterProgramFiles(fileNames);

    if (filteredFileNames.length === 0 || !createProgram) {
      return { program: null, options, fileNames, filteredFileNames, errors };
    }

    const program = ts.createProgram(filteredFileNames, {
      ...options,
      noEmit: true,
      skipLibCheck: true,
    });

    return { program, options, fileNames, filteredFileNames, errors };
  } catch (error) {
    return {
      program: null,
      options: {},
      fileNames: [],
      filteredFileNames: [],
      errors: [error],
    };
  }
}

function uniqueFiles(fileNames: string[]): string[] {
  return [...new Set(fileNames.map((fileName) => normalizeFilePath(fileName)))];
}

export function loadProgramRobust(
  projectRoot: string,
  includeTests: boolean,
): ProgramResult {
  const warnings: string[] = [];

  const rootConfigPath = path.join(projectRoot, "tsconfig.json");

  try {
    if (ts.sys.fileExists(rootConfigPath)) {
      const result = loadTsConfigProgram(rootConfigPath);

      if (result.program && isCheckerUsable(result.program)) {
        if (result.errors.length > 0) {
          warnings.push(
            `tsconfig has ${result.errors.length} issue(s) - analysis may be partial`,
          );
        }
        if (result.filteredFileNames.length !== result.fileNames.length) {
          warnings.push(
            `Filtered ${result.fileNames.length - result.filteredFileNames.length} generated or bundled file(s) from tsconfig inputs`,
          );
        }
        return {
          program: result.program,
          fallback: false,
          warnings,
          includeTests,
          strategy: "root-tsconfig",
          configFiles: [rootConfigPath],
          rootFileCount: result.filteredFileNames.length,
          filteredFileCount: result.fileNames.length - result.filteredFileNames.length,
        };
      }

      warnings.push(
        result.errors.length > 0
          ? "tsconfig.json found but could not be parsed"
          : "TypeChecker built but unusable - trying fallback options",
      );
    }
  } catch (error) {
    warnings.push(`tsconfig load error: ${(error as Error).message}`);
  }

  try {
    const workspaceConfigPaths = findTsConfigFiles(projectRoot)
      .filter((configPath) => normalizeFilePath(configPath) !== normalizeFilePath(rootConfigPath))
      .sort();
    const allFileNames: string[] = [];
    const allFilteredFileNames: string[] = [];
    const workspaceResults: {
      configPath: string;
      result: TsConfigProgramResult;
    }[] = [];
    let totalErrors = 0;

    for (const configPath of workspaceConfigPaths) {
      const result = loadTsConfigProgram(configPath, false);
      totalErrors += result.errors.length;
      if (result.filteredFileNames.length > 0) {
        allFileNames.push(...result.fileNames);
        allFilteredFileNames.push(...result.filteredFileNames);
        workspaceResults.push({ configPath, result });
      }
    }

    const uniqueFilteredFileNames = uniqueFiles(allFilteredFileNames);
    const directFiles = findTsFiles(projectRoot);

    if (uniqueFilteredFileNames.length > 0) {
      const coveredFiles = new Set(uniqueFilteredFileNames);
      const uncoveredFiles = directFiles.filter(
        (fileName) => !coveredFiles.has(normalizeFilePath(fileName)),
      );
      const programInputs: NonNullable<ProgramResult["programInputs"]> = workspaceResults.map(
        ({ configPath, result }) => ({
          configFile: configPath,
          fileNames: result.filteredFileNames,
          options: {
            ...result.options,
            noEmit: true,
            skipLibCheck: true,
          },
          rootFileCount: result.filteredFileNames.length,
          filteredFileCount: result.fileNames.length - result.filteredFileNames.length,
        }),
      );

      if (uncoveredFiles.length > 0) {
        warnings.push(
          `Nested tsconfig files cover ${uniqueFilteredFileNames.length}/${directFiles.length} TypeScript file(s) - scanning ${uncoveredFiles.length} uncovered file(s) directly`,
        );
        programInputs.push({
          configFile: null,
          fileNames: uncoveredFiles,
          options: {
            target: ts.ScriptTarget.ESNext,
            module: ts.ModuleKind.CommonJS,
            strict: true,
            noUncheckedIndexedAccess: true,
            skipLibCheck: true,
            noEmit: true,
          },
          rootFileCount: uncoveredFiles.length,
          filteredFileCount: 0,
        });
      }

      if (programInputs.length > 0) {
        warnings.push(
          `No root tsconfig.json found - using ${workspaceResults.length} nested tsconfig.json file(s)`,
        );
        if (totalErrors > 0) {
          warnings.push(
            `Nested tsconfig files have ${totalErrors} issue(s) - analysis may be partial`,
          );
        }
        if (allFilteredFileNames.length !== allFileNames.length) {
          warnings.push(
            `Filtered ${allFileNames.length - allFilteredFileNames.length} generated or bundled file(s) from nested tsconfig inputs`,
          );
        }
        return {
          program: null,
          programInputs,
          fallback: false,
          warnings,
          includeTests,
          strategy: "workspace-tsconfigs",
          configFiles: workspaceResults.map(({ configPath }) => configPath),
          rootFileCount: uniqueFiles([...uniqueFilteredFileNames, ...uncoveredFiles]).length,
          filteredFileCount: allFileNames.length - allFilteredFileNames.length,
        };
      } else {
        warnings.push("Nested tsconfig scan produced unusable TypeChecker");
      }
    }
  } catch (error) {
    warnings.push(`Nested tsconfig scan error: ${(error as Error).message}`);
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
        return {
          program,
          fallback: false,
          warnings,
          includeTests,
          strategy: "direct-scan",
          configFiles: [],
          rootFileCount: files.length,
          filteredFileCount: 0,
        };
      }

      warnings.push("Direct scan produced unusable TypeChecker");
    } else {
      warnings.push("No TypeScript files found in project");
    }
  } catch (error) {
    warnings.push(`Direct scan error: ${(error as Error).message}`);
  }

  warnings.push("Running in AST-only fallback mode - results will be partial");
  return {
    program: null,
    fallback: true,
    warnings,
    includeTests,
    strategy: "fallback",
    configFiles: [],
    rootFileCount: 0,
    filteredFileCount: 0,
  };
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

  if (programResult.programInputs && programResult.programInputs.length > 0) {
    const seen = new Set<string>();
    const all: CrashReport[] = [];

    for (const entry of programResult.programInputs) {
      try {
        const program = ts.createProgram(entry.fileNames, entry.options);
        for (const crash of analyzeProgram(program, includeTests)) {
          const key = [
            normalizeFilePath(crash.file),
            crash.line,
            crash.col,
            crash.expr,
            crash.pattern,
          ].join("\0");
          if (!seen.has(key)) {
            seen.add(key);
            all.push(crash);
          }
        }
      } catch {
        // Skip workspace slices that fail analysis instead of aborting the scan.
      }
    }

    return all;
  }

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

  return analyzeProgram(programResult.program, includeTests);
}

function analyzeProgram(program: ts.Program, includeTests: boolean): CrashReport[] {
  const checker = program.getTypeChecker();
  const sourceFiles = getUserSourceFiles(program, includeTests);
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
