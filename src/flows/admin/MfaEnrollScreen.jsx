import React, { useState, useEffect } from 'react';
import { I, Header, Spinner } from '../../components/ui.jsx';
import { supabase, isDemo } from '../../services/supabase.js';

// Admin-only screen for enrolling a TOTP factor on the CALLER's own account —
// this is a per-user action (supabase.auth.mfa.enroll uses the caller's own
// session), never something one admin does to another. No invite/role-grant
// system involved; unrelated to the deferred admin-onboarding flow.
export default function MfaEnrollScreen() {
  const [loading, setLoading] = useState(true);
  const [verifiedFactor, setVerifiedFactor] = useState(null);
  const [enrollData, setEnrollData] = useState(null); // { factorId, qrCode, secret }
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  // Pulled live from the SDK, not assumed — this is the actual proof that a
  // "verified" code produced a real aal2 session, not just a correct guess.
  const [aal, setAal] = useState(null);

  const loadFactors = async () => {
    if (isDemo) { setLoading(false); return; }
    setLoading(true);
    const [{ data, error: err }, { data: aalData }] = await Promise.all([
      supabase.auth.mfa.listFactors(),
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    ]);
    setLoading(false);
    if (err) { setError(err.message || 'Could not load MFA status'); return; }
    const verified = (data?.totp || []).find(f => f.status === 'verified');
    setVerifiedFactor(verified || null);
    setAal(aalData?.currentLevel ?? null);
  };

  useEffect(() => { loadFactors(); }, []);

  const startEnroll = async () => {
    setBusy(true); setError('');
    const { data, error: err } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
    setBusy(false);
    if (err) { setError(err.message || 'Could not start enrollment'); return; }
    setEnrollData({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret });
  };

  const verifyEnroll = async () => {
    if (!enrollData || code.trim().length < 6) return;
    setBusy(true); setError('');
    const { data: challenge, error: challengeErr } = await supabase.auth.mfa.challenge({ factorId: enrollData.factorId });
    if (challengeErr) { setBusy(false); setError(challengeErr.message || 'Could not create challenge'); return; }
    const { error: verifyErr } = await supabase.auth.mfa.verify({
      factorId: enrollData.factorId, challengeId: challenge.id, code: code.trim(),
    });
    setBusy(false);
    if (verifyErr) { setError(verifyErr.message || 'Incorrect code — try again'); return; }
    setDone(true);
    loadFactors();
  };

  return (
    <>
      <Header title="Two-factor authentication" sub="Required for KYC and payout actions" />
      <div className="screen-body screen-anim">
        <div className="pad stack gap14">
          {loading ? (
            <div className="center" style={{ padding: '60px 0' }}><Spinner size={30} /></div>
          ) : verifiedFactor && !enrollData ? (
            <div className="card" style={{ padding: 20, textAlign: 'center' }}>
              <I.checkC size={32} color="var(--success)" />
              <div style={{ fontWeight: 800, fontSize: 16, marginTop: 10 }}>2FA is enabled</div>
              <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                Enrolled {new Date(verifiedFactor.created_at).toLocaleDateString()}. Admin actions (KYC review, payouts)
                now require a verified code from this device.
              </div>
              <div style={{ marginTop: 14, padding: '8px 12px', borderRadius: 999, display: 'inline-block',
                background: aal === 'aal2' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.1)',
                color: aal === 'aal2' ? 'var(--success)' : 'var(--danger)', fontWeight: 700, fontSize: 12.5 }}>
                Current session: {aal ? aal.toUpperCase() : '—'}
                {aal !== 'aal2' && ' — log out and back in to complete the code challenge'}
              </div>
            </div>
          ) : !enrollData ? (
            <div className="card" style={{ padding: 20 }}>
              <div style={{ fontWeight: 800, fontSize: 16 }}>Enable an authenticator app</div>
              <div className="muted" style={{ fontSize: 13, marginTop: 6, marginBottom: 16 }}>
                Approving KYC and marking payouts paid will require a 6-digit code from an app like Google
                Authenticator or 1Password, in addition to your password.
              </div>
              {error && <div style={{ color: 'var(--danger)', fontSize: 13, fontWeight: 600, marginBottom: 12 }}>{error}</div>}
              <button className={'btn ' + (busy ? 'btn-disabled' : 'btn-primary')} disabled={busy} onClick={startEnroll}>
                {busy ? 'Starting…' : 'Enable 2FA'}
              </button>
            </div>
          ) : done ? (
            <div className="card" style={{ padding: 20, textAlign: 'center' }}>
              <I.checkC size={32} color="var(--success)" />
              <div style={{ fontWeight: 800, fontSize: 16, marginTop: 10 }}>2FA enabled</div>
              <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                Your session is now verified at the higher assurance level. Admin actions will work normally for
                the rest of this session — you'll be asked for a code again on future logins.
              </div>
              <div style={{ marginTop: 14, padding: '8px 12px', borderRadius: 999, display: 'inline-block',
                background: aal === 'aal2' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.1)',
                color: aal === 'aal2' ? 'var(--success)' : 'var(--danger)', fontWeight: 700, fontSize: 12.5 }}>
                Current session, per the SDK: {aal ? aal.toUpperCase() : '— checking'}
              </div>
            </div>
          ) : (
            <div className="card" style={{ padding: 20 }}>
              <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 12 }}>Scan this QR code</div>
              {enrollData.qrCode?.startsWith('data:') ? (
                <img src={enrollData.qrCode} alt="TOTP QR code" style={{ width: 200, height: 200, margin: '0 auto', display: 'block' }} />
              ) : (
                <div style={{ width: 200, height: 200, margin: '0 auto' }} dangerouslySetInnerHTML={{ __html: enrollData.qrCode }} />
              )}
              <div className="muted" style={{ fontSize: 12, marginTop: 10, textAlign: 'center', wordBreak: 'break-all' }}>
                Can't scan? Enter this key manually: <b>{enrollData.secret}</b>
              </div>
              <div className="field" style={{ marginTop: 16, marginBottom: 0 }}>
                <label>6-digit code from your app</label>
                <input className="input" inputMode="numeric" maxLength={6} placeholder="000000"
                  value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} />
              </div>
              {error && <div style={{ color: 'var(--danger)', fontSize: 13, fontWeight: 600, marginTop: 10 }}>{error}</div>}
              <button className={'btn ' + (code.trim().length >= 6 && !busy ? 'btn-primary' : 'btn-disabled')}
                style={{ marginTop: 14 }} disabled={code.trim().length < 6 || busy} onClick={verifyEnroll}>
                {busy ? 'Verifying…' : 'Verify and enable'}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
