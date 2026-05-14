#!/usr/bin/env node

import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const entrypoint = path.resolve(__dirname, "../src/index.ts");
const tsNodeCli = require.resolve("ts-node/dist/bin.js");

const result = spawnSync(
  process.execPath,
  [tsNodeCli, "--esm", entrypoint, ...process.argv.slice(2)],
  { stdio: "inherit" },
);

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
