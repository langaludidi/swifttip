import React from 'react';
import { I, Avatar } from '../../../components/ui.jsx';

export function AdminWelcomeScene() {
  return (
    <div className="onb-scene" style={{ flex: 1, minHeight: 0, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="onb-scene-glow" style={{ top: '24%', left: '50%', transform: 'translateX(-50%)', background: 'radial-gradient(circle, rgba(99,102,241,0.28), transparent 68%)' }} />
      <div className="float" style={{ position: 'relative', zIndex: 2 }}>
        <div style={{ width: 116, height: 116, borderRadius: 30, background: 'linear-gradient(155deg,#7c83ff,#4f46e5)', display: 'grid', placeItems: 'center', color: '#fff', boxShadow: '0 28px 50px -20px rgba(79,70,229,0.85)' }}>
          <I.shield size={54} color="#fff" />
        </div>
      </div>
      <div className="float f2 tip-chip" style={{ position: 'absolute', top: '17%', left: 14 }}>
        <span className="ic" style={{ background: 'rgba(99,102,241,0.14)', color: '#4f46e5' }}><I.lock size={15} /></span>
        <div style={{ fontSize: 12.5 }}>2FA enforced</div>
      </div>
      <div className="float f3 tip-chip" style={{ position: 'absolute', top: '20%', right: 12 }}>
        <span className="ic" style={{ background: 'rgba(99,102,241,0.14)', color: '#4f46e5' }}><I.doc size={15} /></span>
        <div style={{ fontSize: 12.5 }}>Every action audited</div>
      </div>
      <div className="float f4 tip-chip" style={{ position: 'absolute', bottom: '16%', left: 26 }}>
        <span className="ic gold"><I.users size={15} /></span>
        <div style={{ lineHeight: 1.2 }}><div style={{ fontSize: 12.5 }}>3 KYC pending</div></div>
      </div>
      <div className="float f2 tip-chip" style={{ position: 'absolute', bottom: '20%', right: 22 }}>
        <span className="ic" style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}><I.flag size={15} /></span>
        <div style={{ fontSize: 12.5 }}>1 fraud flag</div>
      </div>
    </div>
  );
}

export function TourArtKyc() {
  const rows = [{ n: 'Lerato M.', c: 'gold' }, { n: 'Bongani K.', c: 'blue' }];
  return (
    <div className="intro-hero">
      <div className="card" style={{ width: 250, padding: 16 }}>
        <div className="between" style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 800, fontSize: 14 }}>KYC review</div>
          <span className="badge" style={{ background: 'rgba(242,167,27,0.14)', color: '#b9780a' }}>3 pending</span>
        </div>
        <div className="stack gap10">
          {rows.map((r, i) => (
            <div key={i} className="row gap10">
              <Avatar name={r.n} color={r.c} size={36} />
              <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 13 }}>{r.n}</div><div className="lc-sub">ID + bank submitted</div></div>
              <span style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(34,197,94,0.14)', color: 'var(--success)', display: 'grid', placeItems: 'center' }}><I.check size={15} stroke={3} /></span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function TourArtFraud() {
  return (
    <div className="intro-hero">
      <div className="card" style={{ width: 250, padding: 18 }}>
        <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 14 }}>Fraud monitor</div>
        <div style={{ textAlign: 'center' }}>
          <svg width="150" height="84" viewBox="0 0 150 84">
            <path d="M12 76 A63 63 0 0 1 138 76" fill="none" stroke="var(--line)" strokeWidth="11" strokeLinecap="round" />
            <path d="M12 76 A63 63 0 0 1 96 22" fill="none" stroke="url(#rg)" strokeWidth="11" strokeLinecap="round" />
            <defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#22C55E" /><stop offset="1" stopColor="#F59E0B" /></linearGradient></defs>
            <circle cx="96" cy="22" r="7" fill="#fff" stroke="#F59E0B" strokeWidth="3.5" />
          </svg>
          <div style={{ fontWeight: 800, fontSize: 17, marginTop: 2 }}>Low risk</div>
          <div className="lc-sub">1 transaction flagged today</div>
        </div>
      </div>
    </div>
  );
}

export function TourArtConsole() {
  const stats = [['Tips today', 'R12.4k'], ['Active', '184'], ['Disputes', '2'], ['Refunds', 'R310']];
  return (
    <div className="intro-hero">
      <div style={{ width: 250, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {stats.map(([k, v], i) => (
          <div key={i} className="card" style={{ padding: '14px 15px' }}>
            <div style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 700 }}>{k}</div>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.5px', marginTop: 3 }}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdmConfetti({ n = 26 }) {
  const colors = ['#6366F1', '#12C4B2', '#F2A71B', '#22C55E', '#a78bfa'];
  const bits = [];
  let s = 41;
  const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  for (let i = 0; i < n; i++) {
    const left = Math.round(rnd() * 100);
    const dur = 2.4 + rnd() * 2.2;
    const delay = -rnd() * 4;
    const col = colors[Math.floor(rnd() * colors.length)];
    const round = rnd() > 0.6;
    bits.push(<span key={i} className="conf" style={{ left: left + '%', background: col, animationDuration: dur + 's', animationDelay: delay + 's', borderRadius: round ? '50%' : 2, width: round ? 8 : 9, height: round ? 8 : 14, opacity: 0 }} />);
  }
  return <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 1 }}>{bits}</div>;
}
