#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const ROOTS = ["src", "scripts"];
const MIGRATIONS_DIR = "supabase/migrations";
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".mjs", ".cjs"]);

function walk(dir, predicate = () => true) {
  if (!fs.existsSync(dir)) return [];
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full, predicate));
    else if (predicate(full)) files.push(full);
  }
  return files;
}

const rpcCalls = new Map();
for (const root of ROOTS) {
  for (const file of walk(root, (value) => SOURCE_EXTENSIONS.has(path.extname(value)))) {
    const text = fs.readFileSync(file, "utf8");
    const regex = /\.rpc\(\s*["'`]([a-zA-Z0-9_]+)["'`]/g;
    for (const match of text.matchAll(regex)) {
      const name = match[1];
      const callers = rpcCalls.get(name) ?? [];
      callers.push(file);
      rpcCalls.set(name, callers);
    }
  }
}

const definedFunctions = new Set();
for (const file of walk(MIGRATIONS_DIR, (value) => value.endsWith(".sql"))) {
  const text = fs.readFileSync(file, "utf8");
  const regex = /create\s+(?:or\s+replace\s+)?function\s+(?:(?:public|private)\.)?([a-zA-Z0-9_]+)\s*\(/gi;
  for (const match of text.matchAll(regex)) definedFunctions.add(match[1]);
}

const missing = [...rpcCalls.entries()]
  .filter(([name]) => !definedFunctions.has(name))
  .sort(([a], [b]) => a.localeCompare(b));

if (missing.length) {
  console.error("SwiftTip DB contract check failed. Application RPCs missing from migration history:");
  for (const [name, callers] of missing) {
    console.error(`- ${name}: ${[...new Set(callers)].join(", ")}`);
  }
  process.exit(1);
}

console.log(`SwiftTip DB contract check passed: ${rpcCalls.size} referenced RPC(s) are present in migration history.`);
