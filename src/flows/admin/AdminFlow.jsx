import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { I, Header, Avatar, BottomNav, Spinner } from '../../components/ui.jsx';
import { SAMPLE } from '../../lib/data.js';
import { getWorkers } from '../../services/workers.js';
import { decideKyc } from '../../services/kyc.js';
import KycReviewScreen from './KycReviewScreen.jsx';
import MfaEnrollScreen from './MfaEnrollScreen.jsx';

const TABS = [
  { id: 'dash', label: 'Dashboard', icon: I.home },
  { id: 'kyc', label: 'KYC', icon: I.shield },
  { id: 'workers', label: 'Workers', icon: I.users },
  { id: 'payouts', label: 'Payouts', icon: I.bank },
  { id: 'fraud', label: 'Fraud', icon: I.flag },
  { id: 'mfa', label: '2FA', icon: I.lock },
];

function DashScreen() {
  const kpis = [
    { k: 'Active workers', v: '142' },
    { k: 'Tips today', v: 'R4 820' },
    { k: 'Employers', v: '18' },
    { k: 'Pending payouts', v: '7' },
  ];
  return (
    <>
      <div className="app-header tall" style={{ background: 'linear-gradient(165deg,#2e1a6e,#1e1050)' }}>
        <div className="header-row">
          <I.shield size={28} color="#a78bfa" />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>Platform Admin</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.3px' }}>SwiftTip Console</div>
          </div>
        </div>
        <div className="stat-grid" style={{ marginTop: 16 }}>
          {kpis.map((k, i) => <div key={i} className="stat"><div className="k">{k.k}</div><div className="v">{k.v}</div></div>)}
        </div>
      </div>
      <div className="screen-body screen-anim">
        <div className="pad stack gap12">
          <div className="section-title" style={{ marginBottom: 4 }}>Recent platform events</div>
          {[
            { t: 'New worker registered', s: 'Lerato Mokoena · 2m ago', ic: I.user, col: 'teal' },
            { t: 'Payout approved', s: 'R500 → Sipho Dlamini · 14m ago', ic: I.bank, col: 'gold' },
            { t: 'Fraud flag raised', s: 'Unusual tip pattern · 1h ago', ic: I.flag, col: 'danger' },
          ].map((e, i) => {
            const Ic = e.ic;
            return (
              <div key={i} className="list-card">
                <div className={'icon-chip' + (e.col === 'gold' ? ' gold' : e.col === 'danger' ? ' danger' : '')}>
                  <Ic size={20} />
                </div>
                <div className="lc-main">
                  <div className="lc-title">{e.t}</div>
                  <div className="lc-sub">{e.s}</div>
                </div>
                <I.chevR size={18} color="var(--muted-2)" />
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

// Suspend/reinstate are the only two actions this screen can take, and both
// go through decide_kyc (via review-kyc) with a required reason — there is
// no quick toggle anymore, because a reason-less flip is exactly what the
// admin-side integrity gap looked like. Approve/reject for new submissions
// stays KycReviewScreen's job; this list only ever acts on already-approved
// or already-suspended workers.
function WorkerActionRow({ worker, onChanged }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const actionable = worker.status === 'approved' || worker.status === 'suspended';
  const nextDecision = worker.status === 'approved' ? 'suspended' : 'approved';
  const actionLabel = worker.status === 'approved' ? 'Suspend' : 'Reinstate';

  const confirm = async () => {
    if (!reason.trim()) { setError('A reason is required.'); return; }
    setSubmitting(true); setError('');
    const { error: err } = await decideKyc({ workerId: worker.id, decision: nextDecision, rejectionReason: reason.trim() });
    setSubmitting(false);
    if (err) { setError(err.message || 'Could not submit'); return; }
    setOpen(false);
    setReason('');
    onChanged();
  };

  return (
    <div className="list-card" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
      <div className="row" style={{ alignItems: 'center' }}>
        <Avatar name={worker.display_name || 'Worker'} color="teal" size={44} />
        <div className="lc-main">
          <div className="lc-title">{worker.display_name || 'Worker'}</div>
          <div className="lc-sub">
            {worker.job_title || 'Staff'}{worker.station ? ` · ${worker.station}` : ''} · {worker.status}
          </div>
        </div>
        {actionable && (
          <button onClick={() => { setOpen(o => !o); setError(''); }}
            style={{ padding: '7px 14px', borderRadius: 9, border: 0, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: 12.5,
              background: worker.status === 'approved' ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
              color: worker.status === 'approved' ? 'var(--danger)' : 'var(--success)' }}>
            {actionLabel}
          </button>
        )}
      </div>
      {open && (
        <div className="stack gap8" style={{ marginTop: 10 }}>
          <textarea className="input" rows={2} style={{ resize: 'none', fontFamily: 'var(--font)' }}
            placeholder={`Reason to ${actionLabel.toLowerCase()} this worker`}
            value={reason} onChange={e => setReason(e.target.value)} />
          {error && <div style={{ color: 'var(--danger)', fontSize: 12.5, fontWeight: 600 }}>{error}</div>}
          <div className="row gap8">
            <button className={'btn btn-sm ' + (submitting ? 'btn-disabled' : 'btn-primary')} disabled={submitting} onClick={confirm}>
              {submitting ? 'Submitting…' : `Confirm ${actionLabel.toLowerCase()}`}
            </button>
            <button className="btn btn-sm btn-ghost" disabled={submitting} onClick={() => { setOpen(false); setReason(''); setError(''); }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function WorkersScreen() {
  const [workers, setWorkers] = useState(null); // null = loading
  const [error, setError] = useState('');

  const load = () => {
    setWorkers(null);
    setError('');
    getWorkers({}).then(({ workers: rows, error: err }) => {
      if (err) { setError(err.message || 'Could not load workers'); setWorkers([]); return; }
      setWorkers(rows);
    });
  };

  useEffect(load, []);

  return (
    <>
      <Header title="Workers" sub={workers ? `${workers.length} registered` : undefined} />
      <div className="screen-body screen-anim">
        {workers === null ? (
          <div className="center" style={{ padding: '60px 0' }}><Spinner size={30} /></div>
        ) : error ? (
          <div className="card center" style={{ padding: 24, margin: 16, textAlign: 'center' }}>
            <div className="muted" style={{ marginBottom: 12 }}>{error}</div>
            <button className="btn btn-ghost" onClick={load}>Try again</button>
          </div>
        ) : workers.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 28, margin: 16 }}>
            <I.users size={36} color="var(--muted-2)" />
            <div style={{ marginTop: 12, fontWeight: 700 }}>No workers yet</div>
          </div>
        ) : (
          <div className="pad stack gap12">
            {workers.map(w => <WorkerActionRow key={w.id} worker={w} onChanged={load} />)}
          </div>
        )}
      </div>
    </>
  );
}

function PayoutsScreen() {
  const [payouts, setPayouts] = useState([
    { id: '1', name: 'Sipho Dlamini', amt: 347.50, bank: 'Capitec ****3421', status: 'requested' },
    { id: '2', name: 'Thandi Nkosi', amt: 120.00, bank: 'FNB ****7890', status: 'requested' },
  ]);
  const approve = (id) => setPayouts(ps => ps.map(p => p.id === id ? { ...p, status: 'approved' } : p));
  const reject = (id) => setPayouts(ps => ps.map(p => p.id === id ? { ...p, status: 'rejected' } : p));
  return (
    <>
      <Header title="Payout Queue" />
      <div className="screen-body screen-anim">
        <div className="pad stack gap12">
          {payouts.map(p => (
            <div key={p.id} className="card" style={{ padding: 16 }}>
              <div className="between">
                <div style={{ fontWeight: 700 }}>{p.name}</div>
                <div className="lc-amt amt-pos">R{p.amt.toFixed(2)}</div>
              </div>
              <div className="muted" style={{ fontSize: 13, marginTop: 3 }}>{p.bank}</div>
              {p.status === 'requested' ? (
                <div className="row gap8" style={{ marginTop: 12 }}>
                  <button className="btn btn-sm btn-primary" style={{ flex: 1 }} onClick={() => approve(p.id)}>Approve</button>
                  <button className="btn btn-sm btn-ghost" style={{ flex: 1, color: 'var(--danger)' }} onClick={() => reject(p.id)}>Reject</button>
                </div>
              ) : (
                <div style={{ marginTop: 10, fontWeight: 700, fontSize: 13, color: p.status === 'approved' ? 'var(--success)' : 'var(--danger)', textTransform: 'capitalize' }}>
                  {p.status}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function FraudScreen() {
  return (
    <>
      <Header title="Fraud Monitor" />
      <div className="screen-body screen-anim">
        <div className="pad stack gap12">
          <div className="card" style={{ textAlign: 'center', padding: 28 }}>
            <I.flag size={36} color="var(--muted-2)" />
            <div style={{ marginTop: 12, fontWeight: 700 }}>No active fraud flags</div>
            <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>Suspicious activity will be flagged here for review.</div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function AdminFlow({ screen: screenProp, nav: navProp, data: dataProp }) {
  const navigate = useNavigate();
  const [screen, setScreen] = useState(screenProp || 'dash');

  useEffect(() => { if (screenProp) setScreen(screenProp); }, [screenProp]);

  const nav = (s) => {
    if (navProp) { navProp(s); return; }
    if (s === '__home') { navigate('/'); return; }
    setScreen(s);
  };

  const screens = { dash: DashScreen, kyc: KycReviewScreen, workers: WorkersScreen, payouts: PayoutsScreen, fraud: FraudScreen, mfa: MfaEnrollScreen };
  const Screen = screens[screen] || DashScreen;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <Screen nav={nav} />
      <BottomNav tabs={TABS} active={screen} onChange={nav} />
    </div>
  );
}

AdminFlow.screens = [
  { id: 'dash', label: 'Platform dashboard' },
  { id: 'kyc', label: 'KYC review' },
  { id: 'workers', label: 'Worker management' },
  { id: 'payouts', label: 'Payout queue' },
  { id: 'fraud', label: 'Fraud monitor' },
  { id: 'mfa', label: 'Two-factor authentication' },
];
AdminFlow.initial = 'dash';
AdminFlow.statusDark = () => true;
