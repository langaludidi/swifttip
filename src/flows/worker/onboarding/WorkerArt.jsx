import React from 'react';
import { I, QRCode, Avatar, Stars } from '../../../components/ui.jsx';

export function WelcomeScene() {
  return (
    <div className="onb-scene" style={{ flex: 1, minHeight: 0, position: 'relative' }}>
      <div className="onb-scene-glow" style={{ top: -120, right: -90 }} />
      <div className="float glass-card" style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)', width: 178, padding: 16, textAlign: 'center' }}>
        <div style={{ background: '#fff', borderRadius: 14, padding: 12, display: 'inline-block' }}>
          <QRCode value="swifttip:welcome" size={120} />
        </div>
        <div style={{ marginTop: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Avatar name="Sipho Dlamini" color="red" size={26} />
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 12.5, fontWeight: 800 }}>Sipho D.</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)' }}>Verified worker</div>
          </div>
        </div>
      </div>
      <div className="float f2 tip-chip" style={{ position: 'absolute', top: '11%', left: 18 }}>
        <span className="ic"><I.card size={16} /></span>
        <div style={{ lineHeight: 1.2 }}>
          <div style={{ fontSize: 13.5 }}>+R20.00</div>
          <div style={{ fontSize: 10.5, color: 'var(--muted)', fontWeight: 600 }}>Tip received</div>
        </div>
      </div>
      <div className="float f3 tip-chip" style={{ position: 'absolute', top: '14%', right: 14 }}>
        <span className="ic gold"><I.star size={15} /></span>
        <div style={{ lineHeight: 1.2 }}>
          <div style={{ fontSize: 12.5 }}>Excellent!</div>
          <div style={{ fontSize: 10.5, color: 'var(--muted)', fontWeight: 600 }}>5-star rating</div>
        </div>
      </div>
      <div className="float f4" style={{ position: 'absolute', bottom: '14%', right: 30 }}>
        <div className="coin" style={{ width: 40, height: 40, fontSize: 15 }}>R</div>
      </div>
      <div className="float f2" style={{ position: 'absolute', bottom: '20%', left: 26 }}>
        <div className="coin" style={{ width: 30, height: 30, fontSize: 12 }}>R</div>
      </div>
    </div>
  );
}

export function IntroArtScan() {
  return (
    <div className="intro-hero">
      <div style={{ position: 'relative' }}>
        <div style={{ position: 'relative', background: '#fff', borderRadius: 22, padding: 20, boxShadow: 'var(--shadow-card)', border: '1px solid var(--line)' }}>
          <span className="scan-bracket tl" /><span className="scan-bracket tr" />
          <span className="scan-bracket bl" /><span className="scan-bracket br" />
          <QRCode value="swifttip:scan-demo" size={168} />
          <div className="scanline" style={{ left: '8%', right: '8%' }} />
        </div>
        <div className="float f2 tip-chip" style={{ position: 'absolute', bottom: -22, right: -28 }}>
          <span className="ic"><I.check size={15} stroke={3} /></span>
          <div style={{ lineHeight: 1.15 }}>
            <div style={{ fontSize: 13 }}>Paid in seconds</div>
            <div style={{ fontSize: 10.5, color: 'var(--muted)', fontWeight: 600 }}>No cash needed</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function IntroArtPayout() {
  return (
    <div className="intro-hero">
      <div style={{ position: 'relative', width: 220, height: 220, display: 'grid', placeItems: 'center' }}>
        <span className="pulse-ring" />
        <span className="pulse-ring" style={{ animationDelay: '1.3s' }} />
        <div style={{ position: 'relative', width: 132, height: 132, borderRadius: 34, background: 'linear-gradient(155deg,#0a2b35,#083C4A)', display: 'grid', placeItems: 'center', boxShadow: '0 24px 44px -20px rgba(5,43,54,0.6)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <I.bank size={48} color="#fff" />
        </div>
        <div className="float" style={{ position: 'absolute', top: 6, left: 8 }}><div className="coin">R</div></div>
        <div className="float f3" style={{ position: 'absolute', top: 30, right: 2 }}><div className="coin" style={{ width: 36, height: 36, fontSize: 14 }}>R</div></div>
        <div className="float f2 tip-chip" style={{ position: 'absolute', bottom: -10, left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap' }}>
          <span className="ic"><I.clockC size={15} /></span>
          <div style={{ fontSize: 13 }}>Arrives in &lt; 2 hours</div>
        </div>
      </div>
    </div>
  );
}

export function IntroArtReputation() {
  return (
    <div className="intro-hero">
      <div style={{ position: 'relative' }}>
        <div className="card" style={{ width: 230, textAlign: 'center', padding: '22px 18px' }}>
          <Avatar name="Sipho Dlamini" color="red" size={64} />
          <div style={{ fontWeight: 800, fontSize: 16, marginTop: 10 }}>Sipho Dlamini</div>
          <div className="lc-sub" style={{ marginTop: 1 }}>Bartender · The Grand Hotel</div>
          <div style={{ margin: '11px 0 9px' }}><span className="badge"><I.check size={12} stroke={3} /> Verified worker</span></div>
          <div style={{ display: 'flex', justifyContent: 'center' }}><Stars value={5} size={20} /></div>
          <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 6, fontWeight: 600 }}>4.9 · 320 tips received</div>
        </div>
        <div className="float f2 tip-chip" style={{ position: 'absolute', top: -18, right: -30 }}>
          <span className="ic gold"><I.heart size={15} /></span>
          <div style={{ fontSize: 12.5, maxWidth: 92, lineHeight: 1.2 }}>"So friendly!"</div>
        </div>
      </div>
    </div>
  );
}

export function PermissionArt() {
  return (
    <div style={{ position: 'relative', padding: '8px 0 4px' }}>
      <div className="perm-bell">
        <I.bell size={48} color="#fff" />
        <span className="perm-badge">3</span>
      </div>
    </div>
  );
}

export function Confetti({ n = 26 }) {
  const colors = ['#12C4B2', '#F2A71B', '#08A392', '#22C55E', '#5f93f2'];
  const bits = [];
  let s = 99;
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
