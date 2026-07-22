import React, { useState, useEffect, useRef } from 'react';
import { I, Header, Avatar, Stars } from '../../components/ui.jsx';
import { invokeTip } from '../../services/tips.js';
import { leaveCompliment } from '../../services/compliments.js';
import { ScanScene, BuzzPhone, CustConfetti } from './CustomerArt.jsx';

function toast(msg) { console.log('[toast]', msg); }

// Real redirect is imminent once invokeTip() resolves — this just covers the
// network round-trip, not a fake payment animation.
function RedirectingScreen() {
  return (
    <div className="overlay dark" style={{ position: 'static', flex: 1 }}>
      <div style={{ width: 70, height: 70, borderRadius: '50%', border: '4px solid rgba(255,255,255,0.12)', borderTopColor: 'var(--accent)' }} className="spin" />
      <div style={{ fontSize: 20, fontWeight: 700, marginTop: 28 }}>Taking you to secure payment…</div>
      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12.5, marginTop: 24 }}>Do not close the app</div>
    </div>
  );
}

export default function CustomerFlow({ screen, nav, data, presetAmountCents, presetTipId }) {
  const workers = data.workers || [];
  const [wid, setWid] = useState(0);
  const [amount, setAmount] = useState('');
  const [payErr, setPayErr] = useState('');
  const [rating, setRating] = useState(5);
  const [compliment, setCompliment] = useState('');
  const [sent, setSent] = useState(false);
  const [tipId, setTipId] = useState(null);
  const w = workers[wid] || workers[0];
  const amt = Number(amount || 0);
  const go = (s) => nav(s);

  // Populated by TipPage after a real Paystack payment confirms — the SPA
  // reloaded on redirect, so any in-progress amount/tipId state was lost.
  useEffect(() => {
    if (presetAmountCents != null) setAmount(String(presetAmountCents / 100));
    if (presetTipId) setTipId(presetTipId);
  }, [presetAmountCents, presetTipId]);

  // Hands off to Paystack's own hosted checkout — the app never touches raw
  // card details. Paystack redirects back to callback_url with a reference
  // once the customer finishes paying (or cancels).
  const goToCheckout = async () => {
    setPayErr('');
    go('redirecting');
    const { tip, error } = await invokeTip({
      workerId: w.id,
      amountCents: Math.round(amt * 100),
      customerSession: crypto.randomUUID?.() ?? String(Date.now()),
      callbackUrl: `${window.location.origin}/tip/${w.slug}`,
    });
    if (error || !tip?.authorization_url) {
      setPayErr(error?.message || 'Could not start payment. Please try again.');
      go('amount');
      return;
    }
    window.location.href = tip.authorization_url;
  };

  const submitCompliment = async () => {
    if (tipId) await leaveCompliment({ tipId, stars: rating, note: compliment });
    setSent(true);
  };

  if (screen === 'scan') {
    const scanWorker = workers[wid] || workers[0];
    return (
      <div className="onb-screen cam-scene" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <ScanScene locked={false} worker={scanWorker} />
        <div style={{ padding: '0 22px 24px', position: 'relative', zIndex: 3 }}>
          <div className="rail-section-label" style={{ color: 'rgba(255,255,255,0.45)', margin: '0 2px 10px' }}>Or tip someone directly</div>
          <div className="row gap10">
            {workers.map((x, i) => (
              <button key={i} onClick={() => { setWid(i); go('profile'); }}
                style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 9, padding: '10px 12px', borderRadius: 14, cursor: 'pointer',
                  background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontFamily: 'var(--font)' }}>
                <Avatar name={x.name} color={x.color} size={34} />
                <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{x.name.split(' ')[0]}</div>
                  <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.55)' }}>{x.role}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'profile') return (
    <>
      <Header title="Worker Profile" onBack={() => go('scan')} />
      <div className="screen-body screen-anim">
        <div className="pad stack gap16">
          <div className="card" style={{ textAlign: 'center', padding: '26px 22px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
              <Avatar name={w.name} color={w.color} size={92} />
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px' }}>{w.name}</div>
            <div className="muted" style={{ fontSize: 14, marginTop: 3 }}>{w.role} · {data.employer}</div>
            <div style={{ margin: '12px 0' }}><span className="badge"><I.check size={12} stroke={3} /> Verified worker</span></div>
            <div className="row" style={{ justifyContent: 'center', gap: 8 }}>
              <Stars value={w.rating} /> <b style={{ fontSize: 16 }}>{w.rating}</b>
              <span className="muted">· {w.tips} tips</span>
            </div>
            <div className="divider" />
            <div className="muted" style={{ fontSize: 12, fontWeight: 600 }}>Station</div>
            <div style={{ fontWeight: 700, fontSize: 16, marginTop: 2 }}>{data.employer}</div>
          </div>
          <div className="trust-note teal">
            <span className="ic"><I.lock size={18} /></span>
            <div><div className="tt">No account needed</div><div className="ts">Tip in seconds — your card details are never stored.</div></div>
          </div>
          <button className="btn btn-primary" onClick={() => { setAmount(''); go('amount'); }}>
            Tip {w.name.split(' ')[0]} <I.heart size={17} color="var(--ink)" />
          </button>
        </div>
      </div>
    </>
  );

  if (screen === 'amount') {
    const press = (k) => {
      if (k === 'del') setAmount(a => a.slice(0, -1));
      else if (k === '.') setAmount(a => a.includes('.') ? a : (a || '0') + '.');
      else setAmount(a => (a + k).replace(/^0(?=\d)/, '').slice(0, 6));
    };
    const cardPresets = [{ v: 10, l: 'Thanks' }, { v: 20, l: 'Generous', pop: true }, { v: 50, l: 'Amazing' }];
    return (
      <>
        <Header title="Tip Amount" onBack={() => go('profile')} />
        <div className="screen-body screen-anim">
          <div className="pad stack gap14">
            <div className="list-card">
              <Avatar name={w.name} color={w.color} size={44} />
              <div className="lc-main">
                <div className="lc-title">{w.name}</div>
                <div className="lc-sub">{w.role}</div>
              </div>
            </div>

            <div className="amount-display">
              <div className="amount-label">Your tip</div>
              <div className="amount-big">R{amount || '0'}</div>
            </div>
            <div className="tip-cards">
              {cardPresets.map(p => (
                <button key={p.v} className={'tip-card' + (amount === String(p.v) ? ' active' : '')} onClick={() => setAmount(String(p.v))}>
                  {p.pop && <span className="tc-pop">MOST PICKED</span>}
                  <span className="tc-amt">R{p.v}</span>
                  <span className="tc-lab">{p.l}</span>
                </button>
              ))}
            </div>
            <div className="numpad">
              {['1','2','3','4','5','6','7','8','9','.','0','del'].map(k => (
                <button key={k} className="numkey" onClick={() => press(k)}>
                  {k === 'del' ? <I.del size={24} color="var(--muted)" /> : k}
                </button>
              ))}
            </div>

            {payErr && <div style={{ color: 'var(--danger)', fontSize: 13, fontWeight: 600 }}>{payErr}</div>}
            <button className={'btn ' + (amt > 0 ? 'btn-gold' : 'btn-disabled')} disabled={amt <= 0}
              onClick={goToCheckout}>
              Tip R{amt.toFixed(2)} to {w.name.split(' ')[0]}
            </button>
            <div className="center muted" style={{ fontSize: 12.5 }}><I.lock size={13} /> Paid via Paystack · 256-bit SSL · POPIA compliant</div>
          </div>
        </div>
      </>
    );
  }

  if (screen === 'redirecting') return <RedirectingScreen />;

  if (screen === 'success') {
    const rcpt = 'ST-' + (10000 + Math.floor((amt || 20) * 137) % 89999);
    return (
      <div className="onb-screen onb-scene" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <CustConfetti n={26} />
        <div className="screen-body" style={{ position: 'relative', zIndex: 2, flex: 1, overflowY: 'auto' }}>
          <div className="pad stack" style={{ alignItems: 'center', textAlign: 'center', paddingTop: 24, gap: 5 }}>
            <div className="success-ring" style={{ background: 'rgba(5,182,180,0.18)', color: 'var(--accent)', marginBottom: 14 }}><I.check size={44} stroke={3} /></div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>Tip sent!</div>
            <div style={{ fontSize: 50, fontWeight: 800, letterSpacing: '-1.6px', color: '#fff', margin: '6px 0 0' }}>R{(amt || 20).toFixed(2)}</div>
            <div style={{ color: 'rgba(255,255,255,0.62)', fontSize: 14, marginTop: 2 }}>to {w.name} · Receipt {rcpt}</div>
            <div className="glass-card" style={{ marginTop: 20, padding: '16px 18px', width: '100%', maxWidth: 320 }}>
              <BuzzPhone amount={amt || 20} worker={w} />
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 14.5, marginTop: 22 }}>{w.name.split(' ')[0]} just felt the buzz</div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12.5, marginTop: 3 }}>Your tip landed in their wallet instantly.</div>
            </div>
            <div className="row gap10" style={{ marginTop: 18 }}>
              {[['SMS', I.sms], ['Email', I.mail], ['Share', I.share]].map(([l, Ic]) => (
                <button key={l} onClick={() => toast(l + ' receipt sent')}
                  style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 13, padding: '11px 18px', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600 }}>
                  <Ic size={19} color="var(--accent)" /> {l}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="onb-foot" style={{ position: 'relative', zIndex: 2 }}>
          <button className="btn btn-primary" onClick={() => { setRating(5); setCompliment(''); setSent(false); go('compliment'); }}>
            Leave a compliment <I.heart size={17} color="var(--ink)" />
          </button>
        </div>
      </div>
    );
  }

  if (screen === 'compliment') {
    const presets = ['Excellent service', 'Very friendly', 'Super helpful', 'Professional'];
    if (sent) return (
      <div className="overlay screen-anim" style={{ position: 'static', flex: 1 }}>
        <div className="success-ring"><I.heart size={42} color="var(--success)" /></div>
        <div style={{ fontSize: 24, fontWeight: 800 }}>Thank you!</div>
        <div className="muted" style={{ marginTop: 6, maxWidth: 260 }}>
          Your compliment was sent to {w.name.split(' ')[0]}. It means a lot.
        </div>
        <button className="btn btn-primary" style={{ maxWidth: 300, marginTop: 28 }} onClick={() => { setWid(0); nav('__home'); }}>Done</button>
      </div>
    );
    return (
      <>
        <Header title="Leave a Compliment" sub="Optional — make their day" onBack={() => go('success')} />
        <div className="screen-body screen-anim">
          <div className="pad stack gap16">
            <div className="card center" style={{ padding: '20px' }}>
              <Avatar name={w.name} color={w.color} size={56} />
              <div style={{ fontWeight: 700, marginTop: 10 }}>How was {w.name.split(' ')[0]}'s service?</div>
              <div className="row" style={{ justifyContent: 'center', gap: 6, marginTop: 12 }}>
                {[1,2,3,4,5].map(i => (
                  <button key={i} onClick={() => setRating(i)} style={{ background: 0, border: 0, cursor: 'pointer', padding: 2 }}>
                    <I.star size={34} color={i <= rating ? 'var(--brand-text)' : '#e2e8ec'} />
                  </button>
                ))}
              </div>
            </div>
            <div className="pill-row" style={{ justifyContent: 'flex-start' }}>
              {presets.map(p => (
                <button key={p} className={'pill' + (compliment === p ? ' active' : '')} onClick={() => setCompliment(p)} style={{ fontSize: 13 }}>{p}</button>
              ))}
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Add a message <span className="muted" style={{ fontWeight: 500 }}>(optional)</span></label>
              <textarea className="input" rows={3} style={{ resize: 'none', fontFamily: 'var(--font)' }} placeholder="Write something nice…" value={compliment} onChange={e => setCompliment(e.target.value)} />
            </div>
            <button className="btn btn-primary" onClick={submitCompliment}>Send compliment</button>
            <button className="btn-link" onClick={() => { setWid(0); nav('__home'); }}>Skip</button>
          </div>
        </div>
      </>
    );
  }

  return null;
}

CustomerFlow.screens = [
  { id: 'scan', label: 'Scan / Find worker' },
  { id: 'profile', label: 'Worker profile' },
  { id: 'amount', label: 'Tip amount' },
  { id: 'redirecting', label: 'Redirecting to Paystack' },
  { id: 'success', label: 'Payment success' },
  { id: 'compliment', label: 'Compliment' },
];
CustomerFlow.initial = 'scan';
