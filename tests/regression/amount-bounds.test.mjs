// Locks: create-tip's server-side amount bounds (R5-R1000, in cents).
// Scope note: only the rejection paths are tested here. A valid-amount request
// would proceed to a real Paystack /transaction/initialize call on every test
// run, which isn't appropriate for a suite meant to be re-run freely — that
// path is exercised manually/in the Tier 1 audit instead.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createTestUser, deleteTestUser, callFunction } from './lib.mjs';
import { admin } from './lib.mjs';

let worker;
let workerRowId;

before(async () => {
  worker = await createTestUser({ role: 'worker' });
  const { data, error } = await admin
    .from('workers')
    .insert({ profile_id: worker.userId, display_name: 'Regression Bounds Worker', slug: `regtest-bounds-${worker.userId.slice(0, 8)}`, active: true })
    .select('id').single();
  if (error) throw error;
  workerRowId = data.id;
});

after(async () => {
  await admin.from('workers').delete().eq('id', workerRowId);
  await deleteTestUser(worker.userId);
});

test('create-tip rejects an amount below R5 (499 cents)', async () => {
  const { status, body } = await callFunction('create-tip', {
    token: worker.session.access_token,
    body: { worker_id: workerRowId, amount_cents: 499, callback_url: 'https://example.com' },
  });
  assert.equal(status, 400);
  assert.match(body.error, /R5/);
});

test('create-tip rejects an amount above R1000 (100001 cents)', async () => {
  const { status, body } = await callFunction('create-tip', {
    token: worker.session.access_token,
    body: { worker_id: workerRowId, amount_cents: 100001, callback_url: 'https://example.com' },
  });
  assert.equal(status, 400);
  assert.match(body.error, /R1000/);
});

test('create-tip rejects a zero or negative amount', async () => {
  const { status, body } = await callFunction('create-tip', {
    token: worker.session.access_token,
    body: { worker_id: workerRowId, amount_cents: 0, callback_url: 'https://example.com' },
  });
  assert.equal(status, 400);
  assert.match(body.error, /positive/);
});
