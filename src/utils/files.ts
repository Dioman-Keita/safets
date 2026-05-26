import fs from "fs";
import path from "path";

export const SKIP_DIRS = new Set([
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
  ".prisma",
  "evals",
  "integration-tests",
]);

const MAX_FILE_LINES = 5000;

const TEST_PATTERNS = [
  /\.test\.ts$/,
  /\.spec\.ts$/,
  /\/__tests__\//,
  /\/test\//,
  /\/tests\//,
  /\/test-utils\//,
  /\/testing\//,
  /\/fixtures\//,
  /\/mocks\//,
];

export function isTestFile(filePath: string): boolean {
  return TEST_PATTERNS.some((pattern) => pattern.test(filePath.replaceAll("\\", "/")));
}

export function normalizeFilePath(filePath: string): string {
  return path.normalize(filePath);
}

export function toPortablePath(filePath: string): string {
  return normalizeFilePath(filePath).replaceAll("\\", "/");
}

export function toProjectRelativePath(projectRoot: string, filePath: string): string {
  return toPortablePath(path.relative(projectRoot, normalizeFilePath(filePath)));
}

export function isAnalyzableTsFile(filePath: string): boolean {
  const normalizedPath = normalizeFilePath(filePath);
  const fileName = path.basename(normalizedPath);
  return (
    fileName.endsWith(".ts") &&
    !fileName.endsWith(".d.ts") &&
    !isBundleFile(normalizedPath)
  );
}

export function isBundleFile(filePath: string): boolean {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    return content.split("\n").length > MAX_FILE_LINES;
  } catch {
    return false;
  }
}

export function findTsFiles(dir: string, files: string[] = []): string[] {
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith(".")) {
        continue;
      }
      if (SKIP_DIRS.has(entry.name)) {
        continue;
      }

      const fullPath = path.join(dir, entry.name);
      try {
        if (entry.isDirectory()) {
          findTsFiles(fullPath, files);
        } else if (isAnalyzableTsFile(fullPath)) {
          files.push(normalizeFilePath(fullPath));
        }
      } catch {
        // Skip unreadable entries.
      }
    }
  } catch {
    // Skip unreadable directories.
  }

  return files;
}

export function findTsConfigFiles(dir: string, files: string[] = []): string[] {
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith(".")) {
        continue;
      }
      if (SKIP_DIRS.has(entry.name)) {
        continue;
      }

      const fullPath = path.join(dir, entry.name);
      try {
        if (entry.isDirectory()) {
          findTsConfigFiles(fullPath, files);
        } else if (entry.name === "tsconfig.json") {
          files.push(normalizeFilePath(fullPath));
        }
      } catch {
        // Skip unreadable entries.
      }
    }
  } catch {
    // Skip unreadable directories.
  }

  return files;
}
