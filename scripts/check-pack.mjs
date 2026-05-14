import { execFileSync } from "node:child_process";

const blockedPatterns = [
  /^files\.zip$/,
  /^\.github\//,
  /^\.safets-baseline\.json$/,
  /^ROADMAP\.md$/,
];

const output =
  process.platform === "win32"
    ? execFileSync(
        process.env.ComSpec ?? "cmd.exe",
        ["/d", "/s", "/c", "npm.cmd pack --dry-run --json"],
        { encoding: "utf8" },
      )
    : execFileSync("npm", ["pack", "--dry-run", "--json"], {
        encoding: "utf8",
      });

const parsed = JSON.parse(output);
const packResult = Array.isArray(parsed) ? parsed[0] : parsed;
const files = packResult.files.map((file) => file.path);
const blockedFiles = files.filter((file) =>
  blockedPatterns.some((pattern) => pattern.test(file)),
);

if (blockedFiles.length > 0) {
  console.error("Blocked files found in npm package:");
  for (const file of blockedFiles) {
    console.error(`- ${file}`);
  }
  process.exit(1);
}

console.log("npm package contents look clean.");
