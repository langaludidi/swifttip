#!/usr/bin/env node

const rawBaseUrl = process.argv[2] || process.env.PREPILOT_BASE_URL;

if (!rawBaseUrl) {
  console.error('Usage: npm run prepilot:runtime -- https://<preview-host>');
  console.error('   or: PREPILOT_BASE_URL=https://<preview-host> npm run prepilot:runtime');
  process.exit(2);
}

const baseUrl = rawBaseUrl.replace(/\/+$/, '');
const healthUrl = `${baseUrl}/api/health`;

let response;
try {
  response = await fetch(healthUrl, {
    headers: { accept: 'application/json' },
    redirect: 'follow'
  });
} catch (error) {
  console.error(`PRE-PILOT RUNTIME: FAIL — could not reach ${healthUrl}`);
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

let health;
try {
  health = await response.json();
} catch {
  console.error(`PRE-PILOT RUNTIME: FAIL — ${healthUrl} did not return JSON (HTTP ${response.status}).`);
  process.exit(1);
}

const failures = [];

if (!response.ok) failures.push(`health endpoint returned HTTP ${response.status}`);
if (health?.ok !== true) failures.push('health.ok is not true');
if (health?.environment !== 'staging') failures.push(`environment must be staging, got ${String(health?.environment)}`);
if (health?.databaseConfigured !== true) failures.push('databaseConfigured must be true');
if (health?.hasSupabaseUrl !== true) failures.push('Supabase URL is not present');
if (health?.hasSupabasePublishableKey !== true) failures.push('Supabase publishable key is not present');
if (health?.supabaseConfigSource !== 'environment') {
  failures.push(`Supabase config must come from explicit environment variables, got ${String(health?.supabaseConfigSource)}`);
}
if (health?.paymentsEnabled !== false) failures.push('paymentsEnabled must remain false during pre-pilot readiness');
if (health?.liveMoneyReady !== false) failures.push('liveMoneyReady must remain false during pre-pilot readiness');

const safeSummary = {
  version: health?.version ?? null,
  environment: health?.environment ?? null,
  databaseConfigured: health?.databaseConfigured === true,
  supabaseConfigSource: health?.supabaseConfigSource ?? null,
  paymentProviderConfigured: health?.paymentProviderConfigured === true,
  paymentsEnabled: health?.paymentsEnabled === true,
  liveMoneyReady: health?.liveMoneyReady === true
};

console.log(JSON.stringify(safeSummary, null, 2));

if (failures.length) {
  console.error('\nPRE-PILOT RUNTIME: FAIL');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('\nPRE-PILOT RUNTIME: PASS');
