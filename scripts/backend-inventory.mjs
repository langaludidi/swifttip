#!/usr/bin/env node
// Static dependency inventory. Never reads environment files or database contents.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import ts from "typescript";

function filesUnder(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? filesUnder(file) : [file];
  });
}

const usages = [];
for (const file of [...filesUnder("src"), ...filesUnder("scripts"), "middleware.ts"]) {
  if (!/\.(?:tsx?|m?js)$/.test(file) || /\.test\./.test(file)) continue;
  const source = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
  function visit(node) {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const expression = node.expression.getText(source);
      const method = node.expression.name.text;
      const arg = node.arguments[0];
      const literal = arg && ts.isStringLiteralLike(arg) ? arg.text : null;
      const kind = expression.includes(".auth.") ? "auth" : expression.includes(".storage.") ? "storage" : method === "rpc" ? "rpc" : method === "from" ? "relation" : null;
      if (kind) usages.push({ file, line: source.getLineAndCharacterOfPosition(node.getStart()).line + 1, kind, expression, name: literal });
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
}

const migrations = filesUnder("supabase/migrations").filter((file) => file.endsWith(".sql")).map((file) => {
  const contents = fs.readFileSync(file, "utf8");
  const sql = contents.replace(/--[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
  return {
    file,
    sha256: createHash("sha256").update(contents).digest("hex"),
    platformReferences: [...new Set([...sql.matchAll(/\b(auth|storage)\.([a-z_][a-z_0-9]*)\s*(?=[(\s,;])/gi)].map((match) => `${match[1]}.${match[2]}`))].sort(),
    definedFunctions: [...sql.matchAll(/create\s+(?:or\s+replace\s+)?function\s+((?:public|private)\.[a-z_][a-z_0-9]*)\s*\(/gi)].map((match) => match[1]).sort(),
  };
});

if (process.argv.includes("--check-baseline")) {
  const baseline = JSON.parse(fs.readFileSync("db/neon/legacy-migrations.json", "utf8"));
  const current = new Map(migrations.map((entry) => [entry.file, entry.sha256]));
  const changed = baseline.migrations.filter((entry) => current.get(entry.file) !== entry.sha256);
  if (changed.length) {
    console.error(`Legacy migration history changed or is missing: ${changed.map((entry) => entry.file).join(", ")}. Preserve the original files and use additive migrations.`);
    process.exit(1);
  }
  console.log(`Legacy migration checksums verified for ${baseline.migrations.length} files.`);
  process.exit(0);
}

const rpcNames = [...new Set(usages.filter((use) => use.kind === "rpc").map((use) => use.name).filter(Boolean))].sort();
const relations = [...new Set(usages.filter((use) => use.kind === "relation").map((use) => use.name).filter(Boolean))].sort();
process.stdout.write(`${JSON.stringify({
  formatVersion: 1,
  scope: "Static application/tooling call sites and immutable legacy migration checksums; not runtime verification. Chained storage operations held in variables require review of their callers.",
  rpcNames,
  relations,
  usages,
  migrations,
}, null, 2)}\n`);
