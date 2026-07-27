// Locks: get-tip-status's short-circuit on already-resolved tips, and its
// 404 for an unrecognized reference.
//
// Scope note: the actual fix this file exists to guard — that a still-pending
// tip triggers a Paystack Verify Transaction call once it's a few seconds
// old, that a genuine 'failed' gateway status maps to tips.status='failed'
// immediately, and that an 'abandoned' gateway status (Paystack's status for
// ANY not-yet-completed checkout, including one a live customer is still
// typing card details into) only maps to 'failed' once the tip is >15
// minutes old — is NOT automated here. Exercising it for real means a live
// Paystack /transaction/initialize call (create-tip) plus a live
// /transaction/verify call (get-tip-status), which this suite deliberately
// avoids for a freely re-runnable test (same reasoning as
// amount-bounds.test.mjs's valid-amount path). It was live-verified by hand
// against the real Paystack test-mode API on 2026-07-28: a never-completed
// checkout stayed 'pending' when polled a few seconds in, stayed 'pending'
// still within the 15-minute grace window, then correctly flipped to
// 'failed' once its created_at was past the window — see
// docs/production/06-production-checklist.md.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createTestUser, deleteTestUser, callFunction, admin } from './lib.mjs';

let worker;
let workerRowId;

before(async () => {
  worker = await createTestUser({ role: 'worker' });
  const { data, error } = await admin
    .from('workers')
    .insert({ profile_id: worker.userId, display_name: 'Regression Tip-Status Worker', slug: `regtest-tipstatus-${worker.userId.slice(0, 8)}`, active: true })
    .select('id').single();
  if (error) throw error;
  workerRowId = data.id;
});

after(async () => {
  await admin.from('tips').delete().eq('worker_id', workerRowId);
  await admin.from('workers').delete().eq('id', workerRowId);
  await deleteTestUser(worker.userId);
});

test('get-tip-status 404s on an unrecognized reference (no Paystack call reachable)', async () => {
  const { status, body } = await callFunction('get-tip-status', {
    token: worker.session.access_token,
    body: { reference: `regtest-unknown-${Date.now()}` },
  });
  assert.equal(status, 404);
  assert.match(body.error, /not found/);
});

test('an already-settled tip is returned as-is, never re-verified', async () => {
  const ref = `regtest-settled-${Date.now()}`;
  const { data: tip, error } = await admin
    .from('tips')
    .insert({ worker_id: workerRowId, amount_cents: 1000, status: 'settled', gateway_ref: ref, settled_at: new Date().toISOString() })
    .select('id').single();
  if (error) throw error;

  const { status, body } = await callFunction('get-tip-status', {
    token: worker.session.access_token,
    body: { reference: ref },
  });
  assert.equal(status, 200);
  assert.equal(body.status, 'settled');
  assert.equal(body.tip_id, tip.id);
});

test('an already-failed tip is returned as-is, never re-verified', async () => {
  const ref = `regtest-failed-${Date.now()}`;
  const { error } = await admin
    .from('tips')
    .insert({ worker_id: workerRowId, amount_cents: 1000, status: 'failed', gateway_ref: ref });
  if (error) throw error;

  const { status, body } = await callFunction('get-tip-status', {
    token: worker.session.access_token,
    body: { reference: ref },
  });
  assert.equal(status, 200);
  assert.equal(body.status, 'failed');
});
