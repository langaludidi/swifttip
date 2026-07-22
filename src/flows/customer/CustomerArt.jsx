import React from 'react';
import { I, QRCode, Avatar } from '../../components/ui.jsx';

export function ScanScene({ locked, worker }) {
  return (
    <div className="cam-scene" style={{ flex: 1, minHeight: 0, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 22 }}>
      <div style={{ position: 'absolute', top: '12%', left: '50%', transform: 'translateX(-50%)', width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle, rgba(5,182,180,0.18), transparent 65%)', pointerEvents: 'none' }} />
      <div style={{ textAlign: 'center', color: '#fff', zIndex: 2 }}>
        <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.3px' }}>{locked ? 'Badge found' : 'Scan to tip'}</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>{locked ? 'Loading worker…' : "Point at the worker's SwiftTip badge"}</div>
      </div>
      <div className={'viewfinder' + (locked ? ' locked' : '')}>
        <span className="vf-corner tl" /><span className="vf-corner tr" /><span className="vf-corner bl" /><span className="vf-corner br" />
        <div style={{ background: '#fff', borderRadius: 16, padding: 12, boxShadow: '0 20px 50px -20px rgba(0,0,0,0.7)', transform: locked ? 'scale(1.02)' : 'scale(1)', transition: 'transform .3s' }}>
          <QRCode value={'swifttip:' + worker.name} size={150} />
        </div>
        {!locked && <div className="scanline" style={{ left: '4%', right: '4%' }} />}
        {locked && (
          <div className="buzz-note" style={{ position: 'absolute', bottom: -20, left: '50%', transform: 'translateX(-50%)' }}>
            <span className="tip-chip" style={{ whiteSpace: 'nowrap' }}><span className="ic"><I.check size={15} stroke={3} /></span><div style={{ fontSize: 13 }}>{worker.name}</div></span>
          </div>
        )}
      </div>
      <div style={{ height: 22 }} />
    </div>
  );
}

export function BuzzPhone({ amount, worker }) {
  return (
    <div className="buzz-phone" style={{ position: 'relative', width: 150, height: 168, margin: '0 auto' }}>
      <div style={{ position: 'absolute', inset: 0, borderRadius: 26, background: 'linear-gradient(165deg,#0c2f39,#06181e)', border: '2px solid rgba(255,255,255,0.08)', boxShadow: '0 26px 50px -24px rgba(0,0,0,0.6)' }} />
      <div style={{ position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', width: 46, height: 8, borderRadius: 8, background: 'rgba(255,255,255,0.12)' }} />
      <div className="buzz-note" style={{ position: 'absolute', top: 30, left: 12, right: 12, background: 'rgba(255,255,255,0.97)', borderRadius: 13, padding: '10px 11px', display: 'flex', gap: 9, alignItems: 'center', boxShadow: '0 14px 26px -12px rgba(0,0,0,0.5)' }}>
        <span style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(5,182,180,0.12)', display: 'grid', placeItems: 'center', flex: '0 0 30px' }}>
          <I.wallet size={16} color="var(--accent-600)" />
        </span>
        <div style={{ lineHeight: 1.25, textAlign: 'left' }}>
          <div style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--navy-900)' }}>+R{Number(amount).toFixed(0)}.00 tip</div>
          <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600 }}>Excellent service ⭐</div>
        </div>
      </div>
      <div style={{ position: 'absolute', bottom: -10, left: '50%', transform: 'translateX(-50%)' }}>
        <Avatar name={worker.name} color={worker.color} size={44} />
      </div>
    </div>
  );
}

export function CustConfetti({ n = 26 }) {
  const colors = ['#12C4B2', '#F2A71B', '#08A392', '#22C55E', '#5f93f2'];
  const bits = [];
  let s = 53;
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
