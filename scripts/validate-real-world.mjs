import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cliEntrypoint = path.join(repoRoot, "dist", "index.js");
const validationRoot = path.join(repoRoot, ".tmp", "real-world-repos");

const targets = [
  { slug: "google-gemini/gemini-cli", dir: "gemini-cli" },
  { slug: "vitejs/vite", dir: "vite" },
  { slug: "prisma/prisma", dir: "prisma" },
  { slug: "supabase/supabase", dir: "supabase" },
  { slug: "vitest-dev/vitest", dir: "vitest" },
  { slug: "withastro/astro", dir: "astro" },
];

function run(command, args, cwd, options = {}) {
  return spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    timeout: options.timeout ?? 300_000,
    maxBuffer: options.maxBuffer ?? 20 * 1024 * 1024,
  });
}

function countTsFiles(cwd) {
  const ignoredDirs = new Set([
    ".git",
    ".next",
    ".turbo",
    "coverage",
    "dist",
    "node_modules",
  ]);

  function walk(dir) {
    let total = 0;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!ignoredDirs.has(entry.name)) {
          total += walk(path.join(dir, entry.name));
        }
        continue;
      }

      if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))) {
        total += 1;
      }
    }
    return total;
  }

  return walk(cwd);
}

function getCommit(cwd) {
  const result = run("git", ["rev-parse", "--short", "HEAD"], cwd);
  return result.status === 0 ? result.stdout.trim() : "unknown";
}

function runSafeTS(cwd) {
  const started = Date.now();
  const result = run(
    process.execPath,
    [cliEntrypoint, "doctor", "--json"],
    cwd,
    { timeout: 300_000 },
  );
  const durationMs = Date.now() - started;

  if (result.error) {
    return {
      ok: false,
      durationMs,
      error: result.error.message,
      stdout: result.stdout,
      stderr: result.stderr,
    };
  }

  try {
    const report = JSON.parse(result.stdout);
    return {
      ok: result.status === 0,
      exitCode: result.status,
      durationMs,
      report,
      stderr: result.stderr,
    };
  } catch (error) {
    return {
      ok: false,
      exitCode: result.status,
      durationMs,
      error: `Invalid JSON output: ${error.message}`,
      stdout: result.stdout,
      stderr: result.stderr,
    };
  }
}

function formatPatternCounts(counts) {
  const entries = Object.entries(counts ?? {});
  if (entries.length === 0) {
    return "none";
  }

  return entries
    .sort((a, b) => b[1] - a[1])
    .map(([pattern, count]) => `${pattern}: ${count}`)
    .join("; ");
}

function markdownEscape(value) {
  return String(value).replaceAll("|", "\\|").replaceAll("\n", " ");
}

const results = [];

for (const target of targets) {
  const cwd = path.join(validationRoot, target.dir);
  if (!fs.existsSync(cwd)) {
    results.push({
      slug: target.slug,
      status: "missing clone",
    });
    continue;
  }

  const validation = runSafeTS(cwd);
  const report = validation.report;
  results.push({
    slug: target.slug,
    commit: getCommit(cwd),
    tsFiles: countTsFiles(cwd),
    status: validation.ok ? "ok" : "failed",
    exitCode: validation.exitCode ?? "n/a",
    durationMs: validation.durationMs,
    fallback: report?.program?.fallback ?? null,
    warnings: report?.program?.warnings ?? [],
    total: report?.summary?.total ?? null,
    byPattern: report?.summary?.byPattern ?? {},
    error: validation.error ?? null,
  });
}

console.log(JSON.stringify({
  generatedAt: new Date().toISOString(),
  mode: "zero-setup",
  command: "safets doctor --json",
  results,
}, null, 2));

console.log("\n--- markdown ---\n");
console.log("| Repository | Commit | TS/TSX files | Result | Duration | Fallback | Findings | Warnings | Top patterns |");
console.log("| --- | --- | ---: | --- | ---: | --- | ---: | ---: | --- |");
for (const result of results) {
  console.log(
    [
      markdownEscape(result.slug),
      markdownEscape(result.commit ?? "n/a"),
      result.tsFiles ?? "n/a",
      markdownEscape(result.status),
      `${Math.round((result.durationMs ?? 0) / 1000)}s`,
      result.fallback === null ? "n/a" : String(result.fallback),
      result.total ?? "n/a",
      result.warnings?.length ?? "n/a",
      markdownEscape(formatPatternCounts(result.byPattern)),
    ].join(" | "),
  );
}
