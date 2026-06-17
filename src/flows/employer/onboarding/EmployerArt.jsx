import React from 'react';
import { I, Avatar } from '../../../components/ui.jsx';

export function MiniDonut({ size = 96 }) {
  const r = 40, c = 2 * Math.PI * r;
  const segs = [{ pct: 66, color: 'var(--accent)' }, { pct: 34, color: 'var(--gold)' }];
  let off = 0;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="12" />
      {segs.map((s, i) => {
        const len = (s.pct / 100) * c;
        const el = <circle key={i} cx="50" cy="50" r={r} fill="none" stroke={s.color} strokeWidth="12" strokeLinecap="round"
          strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-off} transform="rotate(-90 50 50)" />;
        off += len; return el;
      })}
    </svg>
  );
}

export function Bars({ data, accentFrom = 4, h = 96 }) {
  const max = Math.max(...data.map(d => d[1]));
  return (
    <div className="row" style={{ alignItems: 'flex-end', gap: 7, height: h }}>
      {data.map(([d, v], i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
          <div style={{ width: '100%', height: (v / max) * 100 + '%', minHeight: 6, borderRadius: 6, background: i >= accentFrom ? 'linear-gradient(180deg,var(--accent),var(--accent-600))' : 'var(--mint)' }} />
          <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)' }}>{d}</span>
        </div>
      ))}
    </div>
  );
}

export function EmpWelcomeScene() {
  return (
    <div className="onb-scene" style={{ flex: 1, minHeight: 0, position: 'relative' }}>
      <div className="onb-scene-glow" style={{ top: -120, right: -90 }} />
      <div className="float glass-card" style={{ position: 'absolute', top: '17%', left: '50%', transform: 'translateX(-50%)', width: 210, padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <MiniDonut size={86} />
          <div style={{ color: '#fff' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>Tips today</div>
            <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.6px' }}>R143</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5, fontSize: 11.5 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--accent)' }} /> Sipho
              <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--gold)', marginLeft: 6 }} /> Thandi
            </div>
          </div>
        </div>
      </div>
      <div className="float f2 tip-chip" style={{ position: 'absolute', top: '11%', left: 16 }}>
        <span className="ic"><I.card size={16} /></span>
        <div style={{ lineHeight: 1.2 }}>
          <div style={{ fontSize: 13.5 }}>+R20.00</div>
          <div style={{ fontSize: 10.5, color: 'var(--muted)', fontWeight: 600 }}>Bar · just now</div>
        </div>
      </div>
      <div className="float f3 tip-chip" style={{ position: 'absolute', bottom: '20%', right: 14 }}>
        <span className="ic"><I.users size={15} /></span>
        <div style={{ lineHeight: 1.2 }}>
          <div style={{ fontSize: 13 }}>2 active</div>
          <div style={{ fontSize: 10.5, color: 'var(--muted)', fontWeight: 600 }}>workers</div>
        </div>
      </div>
      <div className="float f4 tip-chip" style={{ position: 'absolute', bottom: '15%', left: 24 }}>
        <span className="ic gold"><I.trend size={15} /></span>
        <div style={{ fontSize: 12.5 }}>+18% this week</div>
      </div>
    </div>
  );
}

export function TourArtDash() {
  return (
    <div className="intro-hero">
      <div style={{ position: 'relative' }}>
        <div className="card" style={{ width: 248, padding: 16 }}>
          <div className="between" style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 800, fontSize: 14 }}>Tips by day</div>
            <span className="badge live"><I.trend size={11} color="#16a34a" /> +18%</span>
          </div>
          <Bars data={[['M', 35], ['T', 42], ['W', 38], ['T', 64], ['F', 92], ['S', 100], ['S', 58]]} accentFrom={4} h={104} />
        </div>
        <div className="float f2 glass-card" style={{ position: 'absolute', top: -26, right: -34, background: '#fff', padding: '10px 13px', boxShadow: 'var(--shadow-card)' }}>
          <div style={{ fontSize: 10.5, color: 'var(--muted)', fontWeight: 700 }}>Avg tip</div>
          <div style={{ fontSize: 19, fontWeight: 800, color: 'var(--text)' }}>R23.83</div>
        </div>
      </div>
    </div>
  );
}

export function TourArtTeam() {
  const people = [
    { n: 'Sipho Dlamini', r: 'Bartender', c: 'red' },
    { n: 'Thandi Nkosi', r: 'Waitress', c: 'purple' },
  ];
  return (
    <div className="intro-hero">
      <div style={{ position: 'relative', width: 254 }}>
        <div className="card stack gap10" style={{ padding: 14 }}>
          {people.map((p, i) => (
            <div key={i} className="row gap10">
              <Avatar name={p.n} color={p.c} size={38} />
              <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 13.5 }}>{p.n}</div><div className="lc-sub">{p.r}</div></div>
              <span className="badge"><I.check size={10} stroke={3} /> Joined</span>
            </div>
          ))}
          <div className="row gap10" style={{ opacity: 0.55 }}>
            <div style={{ width: 38, height: 38, borderRadius: '50%', border: '2px dashed var(--muted-2)', display: 'grid', placeItems: 'center', color: 'var(--muted-2)' }}><I.plus size={18} /></div>
            <div style={{ flex: 1, fontWeight: 700, fontSize: 13.5, color: 'var(--muted)' }}>Invite more…</div>
          </div>
        </div>
        <div className="float f2 tip-chip" style={{ position: 'absolute', bottom: -18, right: -26 }}>
          <span className="ic"><I.share size={15} /></span>
          <div style={{ fontSize: 12.5 }}>Link copied</div>
        </div>
      </div>
    </div>
  );
}

export function TourArtMorale() {
  const rows = [['🥇', 'Sipho', 100], ['🥈', 'Thandi', 62], ['🥉', 'Lerato', 40]];
  return (
    <div className="intro-hero">
      <div className="card" style={{ width: 250, padding: 16 }}>
        <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 14 }}>Top earners</div>
        <div className="stack gap14">
          {rows.map(([m, n, w], i) => (
            <div key={i}>
              <div className="between" style={{ marginBottom: 6 }}>
                <div className="row gap8"><span style={{ fontSize: 14 }}>{m}</span><b style={{ fontSize: 13.5 }}>{n}</b></div>
              </div>
              <div className="bar"><i style={{ width: w + '%' }} /></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function EmpConfetti({ n = 26 }) {
  const colors = ['#12C4B2', '#F2A71B', '#08A392', '#22C55E', '#5f93f2'];
  const bits = [];
  let s = 71;
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
