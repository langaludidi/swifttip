#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const DIR = "supabase/migrations";
const APPROVAL_MARKER = "SWIFTTIP-DESTRUCTIVE-REVIEW: APPROVED";
const destructivePatterns = [
  { label: "DROP TABLE", regex: /\bdrop\s+table\b/i },
  { label: "DROP SCHEMA", regex: /\bdrop\s+schema\b/i },
  { label: "TRUNCATE", regex: /\btruncate\b/i },
  { label: "DROP COLUMN", regex: /\balter\s+table[\s\S]{0,500}?\bdrop\s+column\b/i }
];

function stripComments(sql) {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/--.*$/gm, " ");
}

if (!fs.existsSync(DIR)) {
  console.error(`Migration safety check failed: ${DIR} does not exist.`);
  process.exit(1);
}

const files = fs.readdirSync(DIR)
  .filter((name) => /^\d{4}_[a-z0-9_]+\.sql$/i.test(name))
  .sort();

if (!files.length) {
  console.error("Migration safety check failed: no numbered migration files were found.");
  process.exit(1);
}

const seenNumbers = new Set();
const failures = [];
let previous = 0;

for (const file of files) {
  const number = Number(file.slice(0, 4));
  if (seenNumbers.has(number)) failures.push(`${file}: duplicate migration number ${String(number).padStart(4, "0")}`);
  seenNumbers.add(number);
  if (number <= previous) failures.push(`${file}: migration numbers are not strictly increasing`);
  previous = number;

  const raw = fs.readFileSync(path.join(DIR, file), "utf8");
  const sql = stripComments(raw);
  const findings = destructivePatterns.filter(({ regex }) => regex.test(sql)).map(({ label }) => label);
  if (findings.length && !raw.includes(APPROVAL_MARKER)) {
    failures.push(`${file}: destructive SQL detected (${findings.join(", ")}); add an independently reviewed '${APPROVAL_MARKER}' marker only after backup/forward-recovery planning`);
  }
}

if (failures.length) {
  console.error("SwiftTip migration safety check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`SwiftTip migration safety check passed for ${files.length} migration(s).`);
