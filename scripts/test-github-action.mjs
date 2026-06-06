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
  'default: "true"',
  "include-tests:",
  "json:",
  "INPUT_COMMAND: ${{ inputs.command }}",
  "INPUT_VERSION: ${{ inputs.version }}",
  "INPUT_FAIL_ON_NEW: ${{ inputs.fail-on-new }}",
  "INPUT_INCLUDE_TESTS: ${{ inputs.include-tests }}",
  "INPUT_JSON: ${{ inputs.json }}",
  "npm install --prefix \"$safets_dir\" --no-save --silent \"@safets-org/cli@$INPUT_VERSION\"",
  "\"$safets_dir/node_modules/.bin/safets\" \"${args[@]}\"",
]) {
  assert(action.includes(expected), `Expected action.yml to include ${expected}`);
}

assert(
  !action.includes("args=(\"${{ inputs.command }}\")"),
  "Expected action.yml not to splice command input directly into bash",
);
assert(
  !action.includes("@safets-org/cli@${{ inputs.version }}"),
  "Expected action.yml not to splice version input directly into bash",
);
assert(
  action.includes("[[ \"$INPUT_COMMAND\" == \"doctor\" && \"$INPUT_FAIL_ON_NEW\" == \"true\" ]]"),
  "Expected action.yml to add fail-on-new only for the doctor command",
);
assert(
  action.includes("args+=(\"--fail-on-new\")"),
  "Expected action.yml to wire fail-on-new input to the CLI flag for doctor",
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
