import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { I } from '../../../components/ui.jsx';
import { signIn, getPendingWorker, clearPendingWorker } from '../../../services/auth.js';
import { supabase, isDemo } from '../../../services/supabase.js';

export default function WorkerLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  const submit = async () => {
    setSubmitting(true); setErr('');
    const { user, error } = await signIn({ email, password });
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
            await supabase.from('workers').insert({
              profile_id: session.user.id,
              display_name: pending.fullName,
              slug: pending.slug,
              job_title: pending.roleTitle,
            });
            clearPendingWorker();
          }
        }
      }
    }

    setSubmitting(false);
    navigate('/worker');
  };

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
