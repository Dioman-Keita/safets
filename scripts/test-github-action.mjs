import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const actionPath = path.join(repoRoot, "action.yml");
const action = fs.readFileSync(actionPath, "utf8");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

for (const expected of [
  "using: composite",
  "command:",
  "version:",
  "working-directory:",
  "fail-on-new:",
  "include-tests:",
  "json:",
  "npx --yes \"safets@${{ inputs.version }}\"",
]) {
  assert(action.includes(expected), `Expected action.yml to include ${expected}`);
}

assert(
  action.includes("args+=(\"--fail-on-new\")"),
  "Expected action.yml to wire fail-on-new input to the CLI flag",
);
assert(
  action.includes("args+=(\"--include-tests\")"),
  "Expected action.yml to wire include-tests input to the CLI flag",
);
assert(
  action.includes("args+=(\"--json\")"),
  "Expected action.yml to wire json input to the CLI flag",
);

console.log("GitHub Action metadata checks passed.");
