// Locks: paystack-webhook's signature check actually rejects bad input.
//
// Scope note: this only tests the negative paths (unsigned, wrong signature).
// The positive path (valid signature -> settles once; replay -> no-op) was
// live-verified by hand against an isolated test clone with a known secret
// (see docs/production/09-diagnostic-report-2026-07-18.md) but isn't
// automated here, because proving it requires computing a signature with the
// real PAYSTACK_SECRET_KEY, which this suite deliberately has no access to —
// keeping that secret out of committed test code is more important than
// automating that half of the check. What matters most for regression
// purposes is exactly what's tested here: that removing or weakening the
// signature check would be caught immediately.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const url = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

async function callWebhook({ signature, body }) {
  const headers = { 'Content-Type': 'application/json' };
  if (signature !== undefined) headers['x-paystack-signature'] = signature;
  const res = await fetch(`${url}/functions/v1/paystack-webhook`, {
    method: 'POST', headers, body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

test('paystack-webhook rejects a completely unsigned request', async () => {
  const { status, body } = await callWebhook({
    body: { event: 'charge.success', data: { reference: 'regtest-unsigned', metadata: { tip_id: '00000000-0000-0000-0000-000000000000' } } },
  });
  assert.equal(status, 401);
  assert.match(body.error, /invalid signature/);
});

test('paystack-webhook rejects a garbage signature', async () => {
  const { status, body } = await callWebhook({
    signature: 'deadbeef'.repeat(16),
    body: { event: 'charge.success', data: { reference: 'regtest-wrongsig', metadata: { tip_id: '00000000-0000-0000-0000-000000000000' } } },
  });
  assert.equal(status, 401);
  assert.match(body.error, /invalid signature/);
});
