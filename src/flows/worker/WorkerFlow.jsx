import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { I, Header, Avatar, Stars, BottomNav, QRCode } from '../../components/ui.jsx';
import { SAMPLE } from '../../lib/data.js';

const TABS = [
  { id: 'dash', label: 'Home', icon: I.home },
  { id: 'qr', label: 'My QR', icon: I.qr },
  { id: 'history', label: 'History', icon: I.clockC },
  { id: 'payout', label: 'Payout', icon: I.bank },
];

function DashScreen({ data, nav }) {
  const s = data.self;
  const recent = data.recent || [];
  return (
    <>
      <div className="app-header tall">
        <div className="header-row" style={{ paddingTop: 4 }}>
          <Avatar name={s.name} color={s.color} size={44} />
          <div style={{ flex: 1 }}>
            <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, fontWeight: 600 }}>Welcome back</div>
            <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-0.3px', color: '#fff' }}>{s.name.split(' ')[0]}</div>
          </div>
          <button className="icon-btn" onClick={() => nav('__home')} aria-label="Home">
            <I.bell size={20} color="#fff" />
          </button>
        </div>
        <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 600 }}>Available balance</div>
          <div style={{ fontSize: 46, fontWeight: 800, letterSpacing: '-1.5px', color: '#fff', lineHeight: 1.15 }}>
            R{s.balance.toFixed(2)}
          </div>
          <div style={{ marginTop: 8 }}>
            <span className="badge live"><span className="dot" />Tips live</span>
          </div>
        </div>
        <div className="stat-grid" style={{ marginTop: 18 }}>
          <div className="stat"><div className="k">This month</div><div className="v">R{s.month}</div></div>
          <div className="stat"><div className="k">This week</div><div className="v">R{s.week}</div></div>
          <div className="stat"><div className="k">Lifetime</div><div className="v">R{s.lifetime}</div></div>
          <div className="stat"><div className="k">Rating</div><div className="v">⭐ {s.rating}</div></div>
        </div>
        <div className="quick-grid" style={{ marginTop: 14 }}>
          <button className="quick" onClick={() => nav('qr')}><I.qr size={22} /><span>My QR</span></button>
          <button className="quick" onClick={() => nav('payout')}><I.bank size={22} /><span>Payout</span></button>
          <button className="quick" onClick={() => nav('history')}><I.clockC size={22} /><span>History</span></button>
        </div>
      </div>
      <div className="screen-body screen-anim">
        <div className="pad stack gap12">
          <div className="section-row" style={{ marginTop: 4 }}>
            <div className="section-title">Recent activity</div>
          </div>
          {recent.map((r, i) => (
            <div key={i} className="list-card">
              <div className={'icon-chip' + (r.type === 'payout' ? ' gold' : '')}>
                {r.type === 'payout' ? <I.bank size={20} /> : <I.heart size={20} />}
              </div>
              <div className="lc-main">
                <div className="lc-title">{r.who}</div>
                <div className="lc-sub">{r.when}</div>
              </div>
              <div className={'lc-amt ' + (r.amt >= 0 ? 'amt-pos' : 'amt-neg')}>
                {r.amt >= 0 ? '+' : ''}R{Math.abs(r.amt)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function QRScreen({ data, nav }) {
  const s = data.self;
  const slug = s.slug || s.name.toLowerCase().replace(/\s+/g, '-');
  const url = `${window.location.origin}/tip/${slug}`;
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <>
      <Header title="My QR Code" sub="Share to receive tips" />
      <div className="screen-body screen-anim">
        <div className="pad stack gap16" style={{ alignItems: 'center' }}>
          <div className="card" style={{ width: '100%', textAlign: 'center', padding: '28px 22px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
              <QRCode value={url} size={200} />
            </div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{s.name}</div>
            <div className="muted" style={{ fontSize: 14, marginTop: 3 }}>{s.role}</div>
            <div style={{ marginTop: 12, fontSize: 12, color: 'var(--muted-2)', wordBreak: 'break-all' }}>{url}</div>
          </div>
          <div className="row gap10" style={{ width: '100%' }}>
            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={copy}>
              <I.copy size={18} color="var(--accent-600)" /> {copied ? 'Copied!' : 'Copy link'}
            </button>
            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => {}}>
              <I.share size={18} color="var(--accent-600)" /> Share
            </button>
          </div>
          <button className="btn btn-ghost" onClick={() => {}}>
            <I.download size={18} color="var(--accent-600)" /> Download QR image
          </button>
          <div className="card" style={{ width: '100%' }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 8 }}>How it works</div>
            {[
              { n: '1', t: 'Customer scans your QR code or visits your tip link' },
              { n: '2', t: 'They choose an amount and pay with card or EFT' },
              { n: '3', t: 'The tip lands in your SwiftTip wallet instantly' },
            ].map(s => (
              <div key={s.n} className="row gap10" style={{ marginBottom: 10 }}>
                <div style={{ width: 26, height: 26, borderRadius: 8, background: 'var(--mint)', color: 'var(--accent-600)', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 13, flex: '0 0 26px' }}>{s.n}</div>
                <div style={{ fontSize: 13.5, color: 'var(--muted)' }}>{s.t}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function HistoryScreen({ data }) {
  const recent = data.recent || [];
  return (
    <>
      <Header title="Tip History" />
      <div className="screen-body screen-anim">
        <div className="pad stack gap12">
          <div className="row gap8" style={{ marginBottom: 4 }}>
            {['All','Tips','Payouts'].map(t => (
              <button key={t} className={'tag-tab' + (t === 'All' ? ' active' : '')} style={{ fontSize: 13 }}>{t}</button>
            ))}
          </div>
          {recent.map((r, i) => (
            <div key={i} className="list-card">
              <div className={'icon-chip' + (r.type === 'payout' ? ' gold' : '')}>
                {r.type === 'payout' ? <I.bank size={20} /> : <I.heart size={20} />}
              </div>
              <div className="lc-main">
                <div className="lc-title">{r.who}</div>
                <div className="lc-sub">{r.when}</div>
              </div>
              <div className={'lc-amt ' + (r.amt >= 0 ? 'amt-pos' : 'amt-neg')}>
                {r.amt >= 0 ? '+' : ''}R{Math.abs(r.amt)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function PayoutScreen({ data, nav }) {
  const s = data.self;
  const [amount, setAmount] = useState('');
  const [done, setDone] = useState(false);
  const amt = Number(amount || 0);
  if (done) return (
    <div className="overlay screen-anim" style={{ position: 'static', flex: 1 }}>
      <div className="success-ring"><I.check size={42} color="var(--success)" /></div>
      <div style={{ fontSize: 22, fontWeight: 800 }}>Payout requested!</div>
      <div className="muted" style={{ marginTop: 8, maxWidth: 260, textAlign: 'center' }}>
        R{amt.toFixed(2)} will arrive in your {s.bank} account within 24 hours.
      </div>
      <button className="btn btn-primary" style={{ maxWidth: 300, marginTop: 28 }} onClick={() => { setDone(false); setAmount(''); nav('dash'); }}>Back to Home</button>
    </div>
  );
  return (
    <>
      <Header title="Request Payout" sub={`Balance: R${s.balance.toFixed(2)}`} />
      <div className="screen-body screen-anim">
        <div className="pad stack gap16">
          <div className="card" style={{ background: 'linear-gradient(150deg,var(--navy-900),var(--navy-800))', color: '#fff' }}>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>Available to withdraw</div>
            <div style={{ fontSize: 38, fontWeight: 800, letterSpacing: '-1px', marginTop: 6 }}>R{s.balance.toFixed(2)}</div>
            <div style={{ marginTop: 8, fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>Linked: {s.bank}</div>
          </div>
          <div className="field">
            <label>Amount to withdraw (R)</label>
            <input className="input" inputMode="numeric" placeholder="e.g. 200" value={amount}
              onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g,'').slice(0,8))} />
          </div>
          <div className="pill-row">
            {[50,100,200,s.balance.toFixed(0)].filter((v,i,a) => a.indexOf(v) === i).map(v => (
              <button key={v} className={'pill' + (amount === String(v) ? ' active' : '')} onClick={() => setAmount(String(v))}>R{v}</button>
            ))}
          </div>
          <div className="card" style={{ padding: '14px 16px' }}>
            <div className="between"><span className="muted" style={{ fontSize: 13 }}>To account</span><span style={{ fontWeight: 700 }}>{s.bank}</span></div>
            <div className="between" style={{ marginTop: 8 }}><span className="muted" style={{ fontSize: 13 }}>Arrives within</span><span style={{ fontWeight: 700 }}>24 hours</span></div>
            <div className="between" style={{ marginTop: 8 }}><span className="muted" style={{ fontSize: 13 }}>Fee</span><span style={{ fontWeight: 700, color: 'var(--success)' }}>R0.00 Free</span></div>
          </div>
          <button className={'btn ' + (amt > 0 && amt <= s.balance ? 'btn-primary' : 'btn-disabled')}
            disabled={amt <= 0 || amt > s.balance} onClick={() => setDone(true)}>
            Withdraw R{amt > 0 ? amt.toFixed(2) : '0.00'}
          </button>
        </div>
      </div>
    </>
  );
}

export default function WorkerFlow({ screen: screenProp, nav: navProp, data: dataProp }) {
  const navigate = useNavigate();
  const isStandalone = !navProp;
  const [screen, setScreen] = useState(screenProp || 'dash');
  const data = dataProp || SAMPLE;

  useEffect(() => { if (screenProp) setScreen(screenProp); }, [screenProp]);

  const nav = (s) => {
    if (navProp) { navProp(s); return; }
    if (s === '__home') { navigate('/'); return; }
    setScreen(s);
  };

  const screens = { dash: DashScreen, qr: QRScreen, history: HistoryScreen, payout: PayoutScreen };
  const Screen = screens[screen] || DashScreen;

  return (
    <div style={isStandalone ? { minHeight: '100vh', background: 'var(--bg)' } : { flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <Screen data={data} nav={nav} />
      <BottomNav tabs={TABS} active={screen} onChange={nav} />
    </div>
  );
}

WorkerFlow.screens = [
  { id: 'dash', label: 'Dashboard' },
  { id: 'qr', label: 'My QR code' },
  { id: 'history', label: 'Tip history' },
  { id: 'payout', label: 'Request payout' },
];
WorkerFlow.initial = 'dash';
WorkerFlow.statusDark = () => true;
