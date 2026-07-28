import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { I, Spinner } from '../components/ui.jsx';
import { getWorkerBySlug } from '../services/workers.js';
import { signOut } from '../services/auth.js';
import { useSession } from '../App.jsx';
import stMark from '../assets/logo/ST-01.svg';

// Customer-first: "Tip a worker" is the hero, not one of four equal cards.
// There is deliberately no "Scan QR" button here — a physical QR badge is
// scanned with the phone's own camera app, which deep-links straight to
// /tip/:slug and never touches this screen at all. The only interactive
// element this screen needs for tipping is the manual fallback: a worker
// code, for when scanning isn't practical (camera trouble, code read aloud,
// etc). Resolving it through getWorkerBySlug means it inherits the exact
// same active=true gate a QR scan would hit — no separate check to keep in sync.
function TipHero() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    const slug = code.trim().toLowerCase().replace(/\s+/g, '-');
    if (!slug) return;
    setBusy(true); setError('');
    const { worker, error: err } = await getWorkerBySlug(slug);
    setBusy(false);
    if (err || !worker) { setError("We couldn't find a worker with that code — check it and try again."); return; }
    navigate(`/tip/${worker.slug}`);
  };

  return (
    <div style={{
      width: '100%', maxWidth: 420, borderRadius: 26, padding: '30px 24px', textAlign: 'center',
      background: 'linear-gradient(150deg, var(--brand), var(--brand-deep))', boxShadow: '0 20px 40px -20px rgba(4,160,164,0.5)',
      color: 'var(--ink)', position: 'relative', overflow: 'hidden',
    }}>
      <span style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle at 32% 32%,rgba(255,255,255,0.35),transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(255,255,255,0.32)', display: 'grid', placeItems: 'center', margin: '0 auto 14px' }}>
        <I.heart size={28} color="var(--ink)" />
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.4px' }}>Tip a worker</div>
      <div style={{ fontSize: 13.5, color: 'rgba(2,2,10,0.72)', marginTop: 6, lineHeight: 1.4 }}>
        Scan the QR code on their badge with your camera — no app needed.
      </div>

      <div style={{ marginTop: 22, background: 'rgba(255,255,255,0.94)', borderRadius: 16, padding: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(2,2,10,0.7)', marginBottom: 8 }}>
          No camera handy? Enter their code
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={code}
            onChange={e => setCode(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !busy) submit(); }}
            placeholder="e.g. thabo-m4k2"
            style={{ flex: 1, border: 0, borderRadius: 12, padding: '11px 13px', fontSize: 14.5, fontFamily: 'inherit', outline: 'none' }}
          />
          <button onClick={submit} disabled={busy || !code.trim()}
            style={{ border: 0, borderRadius: 12, padding: '0 16px', background: 'var(--ink)', color: '#fff', fontWeight: 800, fontSize: 14, cursor: busy || !code.trim() ? 'not-allowed' : 'pointer', opacity: busy || !code.trim() ? 0.6 : 1 }}>
            {busy ? <Spinner size={16} /> : 'Go'}
          </button>
        </div>
        {error && <div style={{ marginTop: 10, fontSize: 12.5, color: 'var(--danger)', textAlign: 'left', fontWeight: 600 }}>{error}</div>}
      </div>
    </div>
  );
}

const SECONDARY = [
  { id: 'worker', t: "I'm a worker", icon: I.wallet, to: '/worker/login' },
  { id: 'employer', t: "I'm an employer", icon: I.users, to: '/employer/onboarding' },
];

export default function Launcher() {
  const navigate = useNavigate();
  const { session } = useSession();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
    setSigningOut(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-wash)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 20px 32px' }}>
      <img src={stMark} alt="SwiftTip" style={{ height: 56, width: 56 }} />
      <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.7px', marginTop: 14, fontFamily: 'Inter, sans-serif' }}>SwiftTip</div>
      <div style={{ color: '#6a8492', fontSize: 14, marginTop: 4, fontFamily: 'Inter, sans-serif' }}>Cashless tipping, made simple.</div>

      <div style={{ marginTop: 36 }}>
        <TipHero />
      </div>

      <div style={{ width: '100%', maxWidth: 420, marginTop: 36 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.7px', textTransform: 'uppercase', color: '#93a8b3', marginBottom: 12, fontFamily: 'Inter, sans-serif' }}>
          Already use SwiftTip?
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {SECONDARY.map(s => {
            const Ic = s.icon;
            return (
              <button key={s.id} onClick={() => navigate(s.to)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, border: '1px solid #e7eef1', background: '#fff', borderRadius: 16, padding: '14px 16px', cursor: 'pointer', textAlign: 'left', fontFamily: 'Inter, sans-serif' }}>
                <div style={{ width: 38, height: 38, borderRadius: 11, background: 'var(--mint)', display: 'grid', placeItems: 'center', flex: '0 0 auto' }}>
                  <Ic size={19} color="var(--brand-text)" />
                </div>
                <div style={{ fontSize: 14.5, fontWeight: 700, color: '#102a43' }}>{s.t}</div>
                <I.chevR size={17} color="#93a8b3" style={{ marginLeft: 'auto' }} />
              </button>
            );
          })}
        </div>
      </div>

      {/* A signed-in session must always have a visible way out here — the
          launcher is the one screen everyone passes through, and it's what a
          shared/owner device returns to between uses. Its absence is what let
          an admin's warm session silently attach to another worker's signup. */}
      {session ? (
        <div style={{ marginTop: 28, display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'Inter, sans-serif' }}>
          <span style={{ color: '#93a8b3', fontSize: 12.5 }}>Signed in as {session.user?.email}</span>
          <button onClick={handleSignOut} disabled={signingOut}
            style={{ color: 'var(--danger)', background: 0, border: 0, fontWeight: 700, cursor: signingOut ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontSize: 12.5 }}>
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      ) : (
        <button onClick={() => navigate('/worker/login')} style={{ marginTop: 28, color: '#93a8b3', background: 0, border: 0, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 12.5 }}>
          Staff admin
        </button>
      )}

      <div style={{ marginTop: 16, fontSize: 12, color: '#6a8492', fontFamily: 'Inter, sans-serif', textAlign: 'center' }}>
        Secure payments via Paystack · 🇿🇦 Made for South Africa
      </div>
    </div>
  );
}
