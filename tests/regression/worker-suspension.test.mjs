// Locks the approved<->suspended lifecycle (migration 0015): valid
// transitions require a reason and write an audit_logs row, invalid
// transitions are rejected, and a suspended worker is actually un-tippable
// — not just flagged in a UI a customer never sees. Runs the full round trip
// end to end through the real admin path (review-kyc, aal2-gated) rather
// than calling decide_kyc directly, so this also re-proves H2's aal2 gate
// still covers the new decisions.
//
// Scope note: two steps here (approve, reinstate) make a real Paystack
// /transaction/initialize call via create-tip, deliberately — "the worker is
// actually tippable again" is the whole point of the reinstatement half of
// this test, unlike amount-bounds.test.mjs's rejection-only paths. The
// suspended-worker create-tip call is free of any Paystack call: it 404s
// before ever reaching Paystack.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createTestUser, deleteTestUser, enrollAndVerifyTotp, callFunction, admin } from './lib.mjs';
import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
const anon = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });

let adminUser;
let tokens;
let workerRowId;
let workerSlug;
let tipIds = [];

async function latestAuditAction(workerId) {
  const { data } = await admin
    .from('audit_logs')
    .select('action, detail')
    .eq('target_type', 'worker')
    .eq('target_id', workerId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  return data;
}

async function isPubliclyVisible(slug) {
  const { data } = await anon.from('workers').select('id').eq('slug', slug).eq('active', true).maybeSingle();
  return !!data;
}

before(async () => {
  adminUser = await createTestUser({ role: 'admin' });
  tokens = await enrollAndVerifyTotp(adminUser.client);

  workerSlug = `regtest-suspend-${adminUser.userId.slice(0, 8)}`;
  const { data: worker, error } = await admin
    .from('workers')
    .insert({ display_name: 'Regression Suspension Worker', slug: workerSlug, status: 'submitted', submitted_at: new Date().toISOString() })
    .select('id').single();
  if (error) throw error;
  workerRowId = worker.id;
});

after(async () => {
  await admin.from('tips').delete().in('id', tipIds);
  await admin.from('audit_logs').delete().eq('target_id', workerRowId);
  await admin.from('wallets').delete().eq('owner_id', workerRowId);
  await admin.from('workers').delete().eq('id', workerRowId);
  await deleteTestUser(adminUser.userId);
});

test('approve: submitted -> approved, active=true, tippable, audited', async () => {
  const { status } = await callFunction('review-kyc', {
    token: tokens.aal2Token,
    body: { worker_id: workerRowId, decision: 'approved' },
  });
  assert.equal(status, 200);

  const { data } = await admin.from('workers').select('status,active').eq('id', workerRowId).single();
  assert.equal(data.status, 'approved');
  assert.equal(data.active, true);

  const audit = await latestAuditAction(workerRowId);
  assert.equal(audit.action, 'kyc_approved');

  assert.equal(await isPubliclyVisible(workerSlug), true);

  const tip = await callFunction('create-tip', {
    token: anonKey,
    body: { worker_id: workerRowId, amount_cents: 500, callback_url: 'https://example.com' },
  });
  assert.equal(tip.status, 200);
  tipIds.push(tip.body.tip_id);
});

test('suspend without a reason is rejected, worker stays approved', async () => {
  const { status, body } = await callFunction('review-kyc', {
    token: tokens.aal2Token,
    body: { worker_id: workerRowId, decision: 'suspended' },
  });
  assert.equal(status, 422);
  assert.match(body.error, /reason/);

  const { data } = await admin.from('workers').select('status,active').eq('id', workerRowId).single();
  assert.equal(data.status, 'approved');
  assert.equal(data.active, true);
});

test('suspend with a reason: approved -> suspended, active=false, invisible, un-tippable, audited', async () => {
  const { status } = await callFunction('review-kyc', {
    token: tokens.aal2Token,
    body: { worker_id: workerRowId, decision: 'suspended', rejection_reason: 'fraud investigation' },
  });
  assert.equal(status, 200);

  const { data } = await admin.from('workers').select('status,active').eq('id', workerRowId).single();
  assert.equal(data.status, 'suspended');
  assert.equal(data.active, false);

  const audit = await latestAuditAction(workerRowId);
  assert.equal(audit.action, 'kyc_suspended');
  assert.equal(audit.detail.reason, 'fraud investigation');

  // Tooth 1: gone from any public/anon read (RLS `active = true`), not just
  // the app's own listing query — no cache to expire, this is instant.
  assert.equal(await isPubliclyVisible(workerSlug), false);

  // Tooth 2: create-tip rejects server-side, before ever reaching Paystack.
  const tip = await callFunction('create-tip', {
    token: anonKey,
    body: { worker_id: workerRowId, amount_cents: 500, callback_url: 'https://example.com' },
  });
  assert.equal(tip.status, 404);
  assert.match(tip.body.error, /not found|inactive/);
});

test('a suspended worker cannot be rejected (invalid transition, not a scale)', async () => {
  const { status, body } = await callFunction('review-kyc', {
    token: tokens.aal2Token,
    body: { worker_id: workerRowId, decision: 'rejected', rejection_reason: 'irrelevant' },
  });
  assert.equal(status, 422);
  assert.match(body.error, /cannot go from suspended to rejected/);

  const { data } = await admin.from('workers').select('status').eq('id', workerRowId).single();
  assert.equal(data.status, 'suspended');
});

test('reinstate without a reason is rejected, worker stays suspended', async () => {
  const { status, body } = await callFunction('review-kyc', {
    token: tokens.aal2Token,
    body: { worker_id: workerRowId, decision: 'approved' },
  });
  assert.equal(status, 422);
  assert.match(body.error, /reason/);

  const { data } = await admin.from('workers').select('status,active').eq('id', workerRowId).single();
  assert.equal(data.status, 'suspended');
  assert.equal(data.active, false);
});

test('reinstate with a reason: suspended -> approved, active=true, visible, tippable again, audited', async () => {
  const { status } = await callFunction('review-kyc', {
    token: tokens.aal2Token,
    body: { worker_id: workerRowId, decision: 'approved', rejection_reason: 'investigation cleared, no wrongdoing found' },
  });
  assert.equal(status, 200);

  const { data } = await admin.from('workers').select('status,active').eq('id', workerRowId).single();
  assert.equal(data.status, 'approved');
  assert.equal(data.active, true);

  const audit = await latestAuditAction(workerRowId);
  assert.equal(audit.action, 'kyc_reinstated');
  assert.equal(audit.detail.reason, 'investigation cleared, no wrongdoing found');

  assert.equal(await isPubliclyVisible(workerSlug), true);

  const tip = await callFunction('create-tip', {
    token: anonKey,
    body: { worker_id: workerRowId, amount_cents: 500, callback_url: 'https://example.com' },
  });
  assert.equal(tip.status, 200);
  tipIds.push(tip.body.tip_id);
});

test('a draft/submitted worker cannot be suspended directly (only approved can be)', async () => {
  const { data: freshWorker, error } = await admin
    .from('workers')
    .insert({ display_name: 'Regression Suspension Worker 2', slug: `${workerSlug}-b`, status: 'submitted', submitted_at: new Date().toISOString() })
    .select('id').single();
  if (error) throw error;

  const { status, body } = await callFunction('review-kyc', {
    token: tokens.aal2Token,
    body: { worker_id: freshWorker.id, decision: 'suspended', rejection_reason: 'irrelevant' },
  });
  assert.equal(status, 422);
  assert.match(body.error, /cannot go from submitted to suspended/);

  await admin.from('wallets').delete().eq('owner_id', freshWorker.id);
  await admin.from('workers').delete().eq('id', freshWorker.id);
});
