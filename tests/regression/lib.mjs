// Shared helpers for the regression suite. These tests hit the LIVE Supabase
// project directly (no local dev stack exists for this project) using
// throwaway accounts that are created and deleted within each test — the same
// pattern used by hand throughout this project's security audits, just
// scripted so it can be re-run instead of redone manually every time.
//
// Requires SUPABASE_SERVICE_ROLE_KEY as an env var, in addition to the app's
// normal VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. The service key is
// TEST-ONLY — the app itself never uses it, and it must never be committed.
import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

const url = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey || !serviceKey) {
  throw new Error(
    'Regression tests need VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, and ' +
    'SUPABASE_SERVICE_ROLE_KEY set (the last one is test-only, never used by ' +
    'the app — get it from Supabase dashboard > Settings > API, do not commit it).'
  );
}

export const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

function randomSuffix() {
  return crypto.randomBytes(4).toString('hex');
}

// Creates a confirmed auth user directly (bypasses email confirmation, same
// as the manual pattern used throughout this project's live testing) and
// returns a signed-in anon-key client for it.
export async function createTestUser({ role = 'worker' } = {}) {
  const email = `regtest+${randomSuffix()}@example.com`;
  const password = `RegTest!${randomSuffix()}`;

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
  });
  if (createErr) throw createErr;
  const userId = created.user.id;

  if (role === 'admin') {
    const { error } = await admin.from('profiles').update({ role: 'admin' }).eq('id', userId);
    if (error) throw error;
  }

  const client = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: signedIn, error: signInErr } = await client.auth.signInWithPassword({ email, password });
  if (signInErr) throw signInErr;

  return { userId, email, password, client, session: signedIn.session };
}

export async function deleteTestUser(userId) {
  await admin.auth.admin.deleteUser(userId).catch(() => {});
}

// RFC 6238 TOTP, no dependency needed for a 6-digit/30s/SHA1 code.
export function totp(secretBase32, { digits = 6, period = 30, atCounter } = {}) {
  const key = base32Decode(secretBase32);
  const counter = atCounter ?? Math.floor(Date.now() / 1000 / period);
  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac('sha1', key).update(counterBuf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = ((hmac.readUInt32BE(offset) & 0x7fffffff) % 10 ** digits).toString().padStart(digits, '0');
  return code;
}

function base32Decode(input) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const char of input.toUpperCase().replace(/=+$/, '')) {
    const idx = alphabet.indexOf(char);
    if (idx === -1) continue;
    bits += idx.toString(2).padStart(5, '0');
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}

// Enrolls TOTP for an already-signed-in client and returns a fresh aal2
// session's access token, alongside the original aal1 token for negative tests.
export async function enrollAndVerifyTotp(client) {
  const aal1Token = (await client.auth.getSession()).data.session.access_token;

  const { data: enrolled, error: enrollErr } = await client.auth.mfa.enroll({ factorType: 'totp' });
  if (enrollErr) throw enrollErr;

  const { data: challenge, error: challengeErr } = await client.auth.mfa.challenge({ factorId: enrolled.id });
  if (challengeErr) throw challengeErr;

  const code = totp(enrolled.totp.secret);
  const { data: verified, error: verifyErr } = await client.auth.mfa.verify({
    factorId: enrolled.id, challengeId: challenge.id, code,
  });
  if (verifyErr) throw verifyErr;

  return { aal1Token, aal2Token: verified.access_token, factorId: enrolled.id };
}

export async function callFunction(name, { token, body }) {
  const res = await fetch(`${url}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body ?? {}),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, body: json };
}

export function decodeJwtAal(token) {
  const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
  return payload.aal ?? null;
}
