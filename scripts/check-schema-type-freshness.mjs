#!/usr/bin/env node

import fs from "node:fs";

const TYPES_FILE = "src/types/database.ts";
const MIGRATIONS_DIR = "supabase/migrations";
const EXPECTED_PROJECT = "bxtfcfuehqljedxwykfk";

if (!fs.existsSync(TYPES_FILE)) {
  console.error(`Schema type freshness check failed: ${TYPES_FILE} is missing.`);
  process.exit(1);
}

const typeSource = fs.readFileSync(TYPES_FILE, "utf8");
const projectMatch = typeSource.match(/CANONICAL SUPABASE PROJECT\s+([a-z0-9]+)/i);
const migrationMatch = typeSource.match(/Generated after migration\s+mvp_v3_(\d{4})_[a-z0-9_]+/i);

if (!projectMatch || projectMatch[1] !== EXPECTED_PROJECT) {
  console.error("Schema type freshness check failed: generated type provenance does not identify the canonical SwiftTip Supabase project.");
  process.exit(1);
}

if (!migrationMatch) {
  console.error("Schema type freshness check failed: generated type migration provenance is missing.");
  process.exit(1);
}

const migrations = fs.readdirSync(MIGRATIONS_DIR)
  .map((name) => name.match(/^(\d{4})_[a-z0-9_]+\.sql$/i))
  .filter(Boolean)
  .map((match) => Number(match[1]));

if (!migrations.length) {
  console.error("Schema type freshness check failed: no numbered migrations found.");
  process.exit(1);
}

const latestMigration = Math.max(...migrations);
const generatedThrough = Number(migrationMatch[1]);

if (generatedThrough !== latestMigration) {
  console.error(
    `Schema type freshness check failed: database.ts is stamped through ${String(generatedThrough).padStart(4, "0")}, ` +
    `but repository migrations reach ${String(latestMigration).padStart(4, "0")}. Regenerate types from the canonical Supabase project.`
  );
  process.exit(1);
}

console.log(`SwiftTip schema type freshness check passed through migration ${String(latestMigration).padStart(4, "0")}.`);
