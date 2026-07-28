// Locks two things from the same bug cluster.
//
// Scope note: signUp() itself is frontend-only (no edge function to call
// over HTTP), and calling the real signUp() endpoint for a genuinely NEW
// email sends a real confirmation email on every run — this project
// requires email confirmation, and Supabase's own project-level email-send
// rate limit is real and low (confirmed live: a second such call within the
// same test run hit `over_email_send_rate_limit`, 429 — the exact risk
// already flagged, unverified, in 06-production-checklist.md's pre-pilot
// gate). A test that isn't safely re-runnable is the same mistake
// amount-bounds.test.mjs deliberately avoids for Paystack calls. So: the
// signOut-clears-session step and the already-registered-email detection
// are tested against the real signUp() endpoint (neither sends a new
// email — nothing to confirm in either case); the "genuinely new identity,
// zero contamination" proof uses admin.auth.admin.createUser() (as
// createTestUser does everywhere else in this suite) to create the new
// identity without touching the rate-limited path, since what actually
// matters for that proof is the workers-attachment isolation, not
// re-exercising Supabase's own email-sending mechanics.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createTestUser, deleteTestUser, admin } from './lib.mjs';
import crypto from 'node:crypto';

let userA; // stands in for "whoever is already logged in on the device"
let userB; // the genuinely new identity
let workerRowId;

before(async () => {
  userA = await createTestUser({ role: 'worker' });
  userB = await createTestUser({ role: 'worker' });
});

after(async () => {
  if (workerRowId) await admin.from('workers').delete().eq('id', workerRowId);
  await deleteTestUser(userA.userId);
  await deleteTestUser(userB.userId);
});

test('signOut() actually clears an active session on the client', async () => {
  const client = userA.client;
  const before = await client.auth.getSession();
  assert.equal(before.data.session.user.id, userA.userId);

  await client.auth.signOut();
  const after = await client.auth.getSession();
  assert.equal(after.data.session, null);
});

test('signUp() with an already-registered, already-confirmed email returns an empty identities array (the silent no-op signUp() must detect)', async () => {
  const client = userA.client;
  // userA is already signed out from the previous test; sign back in first
  // so this test doesn't depend on execution order for its precondition.
  await client.auth.signInWithPassword({ email: userA.email, password: userA.password });

  await client.auth.signOut();
  const { data, error } = await client.auth.signUp({
    email: userA.email, // already exists and is already confirmed
    password: userA.password,
  });
  assert.equal(error, null, 'Supabase never errors signUp() for an existing email, by design');
  assert.equal(data.user.identities.length, 0, 'this is the exact signal signUp() in services/auth.js checks for');
});

test('a genuinely distinct identity never contaminates, and never gets contaminated by, another', async () => {
  // Mirrors createWorker() — attach a worker row to userB specifically.
  const { data: worker, error: workerErr } = await admin
    .from('workers')
    .insert({ profile_id: userB.userId, display_name: 'Regression New Worker', slug: `regtest-identity-${userB.userId.slice(0, 8)}` })
    .select('id').single();
  assert.equal(workerErr, null);
  workerRowId = worker.id;

  const { data: forB } = await admin.from('workers').select('id').eq('profile_id', userB.userId);
  assert.equal(forB.length, 1);
  assert.equal(forB[0].id, workerRowId);

  // The decisive check: userA's identity has zero workers rows. No
  // contamination happened in either direction.
  const { data: forA } = await admin.from('workers').select('id').eq('profile_id', userA.userId);
  assert.equal(forA.length, 0);
});

test('workers_profile_id_unique: a second worker row for the same identity fails fast, not a silent pile-up', async () => {
  const { error } = await admin
    .from('workers')
    .insert({ profile_id: userB.userId, display_name: 'Duplicate Attempt', slug: `regtest-identity-dup-${userB.userId.slice(0, 8)}` });

  assert.ok(error, 'expected a constraint violation');
  assert.equal(error.code, '23505');
  assert.match(error.message, /workers_profile_id_unique/);

  // Still exactly one row for this identity — the failure didn't leave a
  // partial row behind, and nothing piled up.
  const { data } = await admin.from('workers').select('id').eq('profile_id', userB.userId);
  assert.equal(data.length, 1);
  assert.equal(data[0].id, workerRowId);
});
