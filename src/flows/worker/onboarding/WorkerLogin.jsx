import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { I } from '../../../components/ui.jsx';
import { signIn, getPendingWorker, clearPendingWorker } from '../../../services/auth.js';
import { addPayoutAccount, createWorker } from '../../../services/workers.js';
import { supabase, isDemo } from '../../../services/supabase.js';

export default function WorkerLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');
  // Only ever entered by an account with a verified MFA factor enrolled (the
  // admin, today) — everyone else's login skips straight past this check.
  const [mode, setMode] = useState('login'); // 'login' | 'mfa-challenge'
  const [mfaFactorId, setMfaFactorId] = useState(null);
  const [mfaCode, setMfaCode] = useState('');

  const submit = async () => {
    setSubmitting(true); setErr('');
    const { error } = await signIn({ email, password });
    if (error) {
      setSubmitting(false);
      setErr(error.message || 'Login failed');
      return;
    }

    if (!isDemo) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: existing } = await supabase
          .from('workers').select('id').eq('profile_id', session.user.id).maybeSingle();
        if (!existing) {
          const pending = getPendingWorker(email);
          if (pending) {
            const { worker: newWorker } = await createWorker({
              profileId: session.user.id, displayName: pending.fullName, slug: pending.slug, jobTitle: pending.roleTitle, station: pending.station,
            });
            if (newWorker && pending.bank?.trim() && pending.accNo?.trim()) {
              await addPayoutAccount({ workerId: newWorker.id, bank: pending.bank, accNo: pending.accNo, accountType: pending.accountType });
            }
            clearPendingWorker();
          }
        }
      }

      // A password login only ever reaches aal1. If this account has a
      // verified MFA factor, Supabase reports nextLevel: 'aal2' and we must
      // collect the code before continuing — otherwise this account would be
      // stuck unable to ever reach aal2 through the app.
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal && aal.nextLevel === 'aal2' && aal.currentLevel !== aal.nextLevel) {
        const { data: factorsData } = await supabase.auth.mfa.listFactors();
        const factor = factorsData?.totp?.find(f => f.status === 'verified');
        if (factor) {
          setMfaFactorId(factor.id);
          setSubmitting(false);
          setMode('mfa-challenge');
          return;
        }
      }
    }

    setSubmitting(false);
    navigate('/worker');
  };

  const verifyChallenge = async () => {
    if (mfaCode.trim().length < 6) return;
    setSubmitting(true); setErr('');
    const { data: challenge, error: challengeErr } = await supabase.auth.mfa.challenge({ factorId: mfaFactorId });
    if (challengeErr) { setSubmitting(false); setErr(challengeErr.message || 'Could not start verification'); return; }
    const { error: verifyErr } = await supabase.auth.mfa.verify({
      factorId: mfaFactorId, challengeId: challenge.id, code: mfaCode.trim(),
    });
    setSubmitting(false);
    if (verifyErr) { setErr(verifyErr.message || 'Incorrect code — try again'); return; }
    navigate('/worker');
  };

  if (mode === 'mfa-challenge') {
    const canVerify = mfaCode.trim().length >= 6 && !submitting;
    return (
      <div className="onb-screen" style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
        <div className="screen-body" style={{ flex: 1, overflowY: 'auto' }}>
          <div className="pad stack gap16" style={{ paddingTop: 40 }}>
            <div className="form-h">
              <h2>Enter your 2FA code</h2>
              <p>Open your authenticator app and enter the 6-digit code.</p>
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Code</label>
              <input className="input" inputMode="numeric" maxLength={6} placeholder="000000"
                value={mfaCode} onChange={e => setMfaCode(e.target.value.replace(/\D/g, ''))}
                onKeyDown={e => { if (e.key === 'Enter' && canVerify) verifyChallenge(); }} />
            </div>
            {err && <div style={{ color: 'var(--danger)', fontSize: 13, fontWeight: 600 }}>{err}</div>}
          </div>
        </div>
        <div className="onb-foot" style={{ marginTop: 'auto' }}>
          <button className={'btn ' + (canVerify ? 'btn-primary' : 'btn-disabled')} disabled={!canVerify} onClick={verifyChallenge}>
            {submitting ? 'Verifying…' : 'Verify'}
          </button>
        </div>
      </div>
    );
  }

  const canSubmit = email.includes('@') && password.length >= 1 && !submitting;

  return (
    <div className="onb-screen" style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '14px 18px 0' }}>
        <button className="onb-iconbtn-light" onClick={() => navigate('/worker/onboarding')} aria-label="Back"><I.back size={20} /></button>
      </div>
      <div className="screen-body" style={{ flex: 1, overflowY: 'auto' }}>
        <div className="pad stack gap16" style={{ paddingTop: 14 }}>
          <div className="form-h">
            <h2>Welcome back</h2>
            <p>Log in to see your dashboard and tips.</p>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Email</label>
            <input className="input" type="email" placeholder="you@email.co.za"
              value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Password</label>
            <input className="input" type="password" placeholder="Your password"
              value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && canSubmit) submit(); }} />
          </div>
          {err && <div style={{ color: 'var(--danger)', fontSize: 13, fontWeight: 600 }}>{err}</div>}
        </div>
      </div>
      <div className="onb-foot" style={{ marginTop: 'auto' }}>
        <button className={'btn ' + (canSubmit ? 'btn-primary' : 'btn-disabled')} disabled={!canSubmit} onClick={submit}>
          {submitting ? 'Logging in…' : 'Log in'}
        </button>
        <button className="btn-link" onClick={() => navigate('/worker/onboarding')}>Don't have an account? Sign up</button>
      </div>
    </div>
  );
}
