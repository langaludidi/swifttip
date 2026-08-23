import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";

const root = process.cwd();
const sourceRoot = join(root, "src");
const forbidden = [
  { pattern: /\bwallets?\b/i, label: "wallet" },
  { pattern: /\bwithdraw(?:al|als)?\b/i, label: "withdrawal" },
  { pattern: /\bcash[ -]?out\b/i, label: "cash out" },
  { pattern: /\bpayout[ -]?(?:request|requests|batch|batches)\b/i, label: "payout request/batch" },
  { pattern: /\bavailable balance\b/i, label: "available balance" }
];

async function filesUnder(directory) {
  const output = [];
  for (const entry of await readdir(directory)) {
    const path = join(directory, entry);
    const info = await stat(path);
    if (info.isDirectory()) output.push(...await filesUnder(path));
    else if (/\.(?:ts|tsx|js|jsx)$/.test(entry)) output.push(path);
  }
  return output;
}

const failures = [];
for (const file of await filesUnder(sourceRoot)) {
  const content = await readFile(file, "utf8");
  for (const rule of forbidden) {
    if (rule.pattern.test(content)) failures.push(`${relative(root, file)}: forbidden ${rule.label} semantics`);
  }
}

if (failures.length) {
  console.error("SwiftTip MVP v3 architecture regression detected:\n" + failures.map((item) => `- ${item}`).join("\n"));
  process.exit(1);
}

console.log("SwiftTip MVP v3 architecture invariants: OK");
