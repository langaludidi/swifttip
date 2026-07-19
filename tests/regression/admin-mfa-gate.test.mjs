// Locks H2: review-kyc and set-payout-status must require an aal2 session,
// not just role='admin'. An aal1 admin token (e.g. a hijacked session that
// never completed the MFA challenge) must be denied on both.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createTestUser, deleteTestUser, enrollAndVerifyTotp, callFunction, decodeJwtAal, admin } from './lib.mjs';

let adminUser;
let tokens;
let workerRowId;
let payoutRowId;

before(async () => {
  adminUser = await createTestUser({ role: 'admin' });
  tokens = await enrollAndVerifyTotp(adminUser.client);

  assert.equal(decodeJwtAal(tokens.aal1Token), 'aal1');
  assert.equal(decodeJwtAal(tokens.aal2Token), 'aal2');

  const { data: worker, error: workerErr } = await admin
    .from('workers')
    .insert({ display_name: 'Regression MFA Worker', slug: `regtest-mfa-${adminUser.userId.slice(0, 8)}`, status: 'submitted', submitted_at: new Date().toISOString() })
    .select('id').single();
  if (workerErr) throw workerErr;
  workerRowId = worker.id;

  const { data: payout, error: payoutErr } = await admin
    .from('payouts')
    .insert({ worker_id: workerRowId, amount_cents: 5000, status: 'requested' })
    .select('id').single();
  if (payoutErr) throw payoutErr;
  payoutRowId = payout.id;
});

after(async () => {
  await admin.from('payouts').delete().eq('id', payoutRowId);
  await admin.from('audit_logs').delete().eq('target_id', workerRowId);
  await admin.from('wallets').delete().eq('owner_id', workerRowId);
  await admin.from('workers').delete().eq('id', workerRowId);
  await deleteTestUser(adminUser.userId);
});

test('review-kyc denies an aal1 admin session', async () => {
  const { status, body } = await callFunction('review-kyc', {
    token: tokens.aal1Token,
    body: { worker_id: workerRowId, decision: 'approved' },
  });
  assert.equal(status, 403);
  assert.match(body.error, /aal2/);

  const { data } = await admin.from('workers').select('status,active').eq('id', workerRowId).single();
  assert.equal(data.status, 'submitted');
  assert.equal(data.active, false);
});

test('review-kyc allows an aal2 admin session and actually approves', async () => {
  const { status, body } = await callFunction('review-kyc', {
    token: tokens.aal2Token,
    body: { worker_id: workerRowId, decision: 'approved' },
  });
  assert.equal(status, 200);
  assert.equal(body.status, 'approved');

  const { data } = await admin.from('workers').select('status,active').eq('id', workerRowId).single();
  assert.equal(data.status, 'approved');
  assert.equal(data.active, true);
});

test('set-payout-status denies an aal1 admin session', async () => {
  const { status, body } = await callFunction('set-payout-status', {
    token: tokens.aal1Token,
    body: { payout_id: payoutRowId, status: 'paid' },
  });
  assert.equal(status, 403);
  assert.match(body.error, /aal2/);

  const { data } = await admin.from('payouts').select('status').eq('id', payoutRowId).single();
  assert.equal(data.status, 'requested');
});

test('set-payout-status allows an aal2 admin session and actually marks paid', async () => {
  const { status, body } = await callFunction('set-payout-status', {
    token: tokens.aal2Token,
    body: { payout_id: payoutRowId, status: 'paid' },
  });
  assert.equal(status, 200);
  assert.equal(body.status, 'paid');

  const { data } = await admin.from('payouts').select('status').eq('id', payoutRowId).single();
  assert.equal(data.status, 'paid');
});
