import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { I, Header, Avatar, BottomNav } from '../../components/ui.jsx';
import { SAMPLE } from '../../lib/data.js';

const TABS = [
  { id: 'dash', label: 'Overview', icon: I.home },
  { id: 'team', label: 'Team', icon: I.users },
  { id: 'tips', label: 'Tips', icon: I.heart },
  { id: 'payouts', label: 'Payouts', icon: I.bank },
];

function DashScreen({ data, nav }) {
  const workers = data.workers || [];
  const totalToday = data.recent?.filter(r => r.type === 'tip' && r.when.includes('h ago')).reduce((s, r) => s + r.amt, 0) || 0;
  return (
    <>
      <div className="app-header tall">
        <div className="header-row">
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>{data.company}</div>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.3px', color: '#fff' }}>{data.employer}</div>
          </div>
          <button className="icon-btn"><I.bell size={20} color="#fff" /></button>
        </div>
        <div className="stat-grid" style={{ marginTop: 16 }}>
          <div className="stat"><div className="k">Today</div><div className="v">R{totalToday}</div></div>
          <div className="stat"><div className="k">This month</div><div className="v">R{workers.reduce((s, w) => s + (w.total || 0), 0)}</div></div>
          <div className="stat"><div className="k">Team size</div><div className="v">{workers.length}</div></div>
          <div className="stat"><div className="k">Avg rating</div><div className="v">⭐ {(workers.reduce((s,w) => s + w.rating, 0) / Math.max(workers.length,1)).toFixed(1)}</div></div>
        </div>
      </div>
      <div className="screen-body screen-anim">
        <div className="pad stack gap12">
          <div className="section-row" style={{ marginTop: 4 }}>
            <div className="section-title">Tip split this month</div>
            <button className="link" onClick={() => nav('team')}>Team →</button>
          </div>
          {workers.map((w, i) => (
            <div key={i} className="list-card">
              <Avatar name={w.name} color={w.color} size={44} />
              <div className="lc-main">
                <div className="lc-title">{w.name}</div>
                <div className="lc-sub">{w.role} · {w.tips} tips</div>
                <div className="bar" style={{ marginTop: 8 }}><i style={{ width: w.pct + '%' }} /></div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="lc-amt amt-pos">R{w.total}</div>
                <div className="lc-sub">{w.pct}%</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function TeamScreen({ data, nav }) {
  const workers = data.workers || [];
  return (
    <>
      <Header title="Team" sub={`${workers.length} workers`} />
      <div className="screen-body screen-anim">
        <div className="pad stack gap12">
          {workers.map((w, i) => (
            <div key={i} className="list-card">
              <Avatar name={w.name} color={w.color} size={44} />
              <div className="lc-main">
                <div className="lc-title">{w.name}</div>
                <div className="lc-sub">{w.role} · ⭐ {w.rating}</div>
              </div>
              <span className="badge live"><span className="dot" />Active</span>
            </div>
          ))}
          <button className="btn btn-ghost"><I.plus size={18} color="var(--accent-600)" /> Invite worker</button>
        </div>
      </div>
    </>
  );
}

function TipsScreen({ data }) {
  const recent = (data.recent || []).filter(r => r.type === 'tip');
  return (
    <>
      <Header title="Tips Feed" />
      <div className="screen-body screen-anim">
        <div className="pad stack gap12">
          {recent.map((r, i) => (
            <div key={i} className="list-card">
              <div className="icon-chip"><I.heart size={20} /></div>
              <div className="lc-main">
                <div className="lc-title">{r.who}</div>
                <div className="lc-sub">{r.when}</div>
              </div>
              <div className="lc-amt amt-pos">+R{r.amt}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function PayoutsScreen({ data }) {
  return (
    <>
      <Header title="Payouts" />
      <div className="screen-body screen-anim">
        <div className="pad stack gap12">
          <div className="card" style={{ textAlign: 'center', padding: 28 }}>
            <I.bank size={36} color="var(--muted-2)" />
            <div style={{ marginTop: 12, fontWeight: 700 }}>No pending payouts</div>
            <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>Payout requests from your team will appear here.</div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function EmployerFlow({ screen: screenProp, nav: navProp, data: dataProp }) {
  const navigate = useNavigate();
  const [screen, setScreen] = useState(screenProp || 'dash');
  const data = dataProp || SAMPLE;

  useEffect(() => { if (screenProp) setScreen(screenProp); }, [screenProp]);

  const nav = (s) => {
    if (navProp) { navProp(s); return; }
    if (s === '__home') { navigate('/'); return; }
    setScreen(s);
  };

  const screens = { dash: DashScreen, team: TeamScreen, tips: TipsScreen, payouts: PayoutsScreen };
  const Screen = screens[screen] || DashScreen;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <Screen data={data} nav={nav} />
      <BottomNav tabs={TABS} active={screen} onChange={nav} />
    </div>
  );
}

EmployerFlow.screens = [
  { id: 'dash', label: 'Team overview' },
  { id: 'team', label: 'Team roster' },
  { id: 'tips', label: 'Tips feed' },
  { id: 'payouts', label: 'Pending payouts' },
];
EmployerFlow.initial = 'dash';
EmployerFlow.statusDark = () => true;
