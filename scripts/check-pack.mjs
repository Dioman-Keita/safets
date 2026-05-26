import { execFileSync } from "node:child_process";

const allowedPatterns = [
  /^package\.json$/,
  /^README\.md$/,
  /^LICENSE$/,
  /^dist\/.+\.(?:js|d\.ts)$/,
];

const requiredFiles = [
  "package.json",
  "README.md",
  "LICENSE",
  "dist/index.js",
];

const npmExecPath = process.env.npm_execpath;

if (!npmExecPath) {
  throw new Error("npm_execpath is not available; run this script through npm.");
}

const output = execFileSync(
  process.execPath,
  [npmExecPath, "pack", "--dry-run", "--json"],
  { encoding: "utf8" },
);

const parsed = JSON.parse(output);
const packResult = Array.isArray(parsed) ? parsed[0] : parsed;
const files = packResult.files.map((file) => file.path);
const unexpectedFiles = files.filter(
  (file) => !allowedPatterns.some((pattern) => pattern.test(file)),
);

if (unexpectedFiles.length > 0) {
  console.error("Unexpected files found in npm package:");
  for (const file of unexpectedFiles) {
    console.error(`- ${file}`);
  }
  process.exit(1);
}

const missingFiles = requiredFiles.filter((file) => !files.includes(file));

if (missingFiles.length > 0) {
  console.error("Required files missing from npm package:");
  for (const file of missingFiles) {
    console.error(`- ${file}`);
  }
  process.exit(1);
}

console.log(`npm package contents look clean (${files.length} files).`);
