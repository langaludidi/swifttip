import React, { useState, useEffect, useRef } from 'react';
import { I, Header, Avatar, Stars } from '../../components/ui.jsx';
import { invokeTip } from '../../services/tips.js';
import { leaveCompliment } from '../../services/compliments.js';

function toast(msg) { console.log('[toast]', msg); }

function ProcessingScreen({ onDone }) {
  const [step, setStep] = useState(0);
  const steps = ['Connecting securely', 'Authorising payment', 'Confirming with bank'];
  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 800);
    const t2 = setTimeout(() => setStep(2), 1700);
    const t3 = setTimeout(onDone, 2700);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);
  return (
    <div className="overlay dark" style={{ position: 'static', flex: 1 }}>
      <div style={{ width: 70, height: 70, borderRadius: '50%', border: '4px solid rgba(255,255,255,0.12)', borderTopColor: 'var(--accent)' }} className="spin" />
      <div style={{ fontSize: 20, fontWeight: 700, marginTop: 28 }}>Processing payment</div>
      <div className="stack gap8" style={{ marginTop: 18 }}>
        {steps.map((s, i) => (
          <div key={i} className="row gap8" style={{ opacity: i <= step ? 1 : 0.35, fontSize: 13.5, transition: 'opacity .3s' }}>
            {i < step
              ? <I.checkC size={18} color="var(--accent)" />
              : i === step
                ? <div className="spin" style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.2)', borderTopColor: 'var(--accent)', borderRadius: '50%' }} />
                : <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.2)' }} />
            }
            <span style={{ color: '#fff' }}>{s}</span>
          </div>
        ))}
      </div>
      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12.5, marginTop: 24 }}>Do not close the app</div>
    </div>
  );
}

export default function CustomerFlow({ screen, nav, data }) {
  const workers = data.workers || [];
  const [wid, setWid] = useState(0);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('card');
  const [card, setCard] = useState('');
  const [rating, setRating] = useState(5);
  const [compliment, setCompliment] = useState('');
  const [sent, setSent] = useState(false);
  const [tipId, setTipId] = useState(null);
  const w = workers[wid] || workers[0];
  const amt = Number(amount || 0);
  const go = (s) => nav(s);

  const submitTip = async () => {
    const { tip } = await invokeTip({
      workerId: w.id || w.slug,
      amountCents: Math.round(amt * 100),
      customerSession: crypto.randomUUID?.() ?? String(Date.now()),
    });
    if (tip?.id) setTipId(tip.id);
    go('success');
  };

  const submitCompliment = async () => {
    if (tipId) await leaveCompliment({ tipId, stars: rating, note: compliment });
    setSent(true);
  };

  if (screen === 'scan') return (
    <>
      <Header title="Tip a Worker" sub="Great service deserves recognition" onBack={() => nav('__home')} />
      <div className="screen-body screen-anim">
        <div className="pad stack gap16">
          <div style={{ background: 'linear-gradient(165deg,#0a2b35,#06181e)', borderRadius: 22, padding: '38px 22px', textAlign: 'center', color: '#fff', border: '1.5px dashed rgba(18,196,178,0.4)' }}>
            <I.camera size={42} color="var(--accent)" />
            <div style={{ fontWeight: 700, fontSize: 16, marginTop: 14 }}>Point camera at worker's SwiftTip badge</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', marginTop: 6 }}>Camera access · or pick below</div>
          </div>
          <button className="btn btn-ghost" onClick={() => toast('Select a QR image')}><I.download size={18} color="var(--accent-600)" /> Upload a QR image</button>
          <div>
            <div className="rail-section-label" style={{ margin: '6px 2px 10px' }}>Quick select</div>
            <div className="row gap16">
              {workers.map((x, i) => (
                <button key={i} onClick={() => { setWid(i); go('profile'); }} style={{ background: 0, border: 0, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
                  <Avatar name={x.name} color={x.color} size={56} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{x.name.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="rail-section-label" style={{ margin: '6px 2px 10px' }}>All workers · {data.employer}</div>
            <div className="stack gap12">
              {workers.map((x, i) => (
                <div key={i} className="list-card" style={{ cursor: 'pointer' }} onClick={() => { setWid(i); go('profile'); }}>
                  <Avatar name={x.name} color={x.color} size={44} />
                  <div className="lc-main">
                    <div className="row gap8"><span className="lc-title">{x.name}</span><span className="badge"><I.check size={11} stroke={3} /> Verified</span></div>
                    <div className="lc-sub">{x.role} · <I.star size={12} color="#F2A71B" /> {x.rating}</div>
                  </div>
                  <I.chevR size={20} color="var(--muted-2)" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );

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
            <div style={{ margin: '12px 0' }}><span className="badge"><I.check size={12} stroke={3} /> Verified</span></div>
            <div className="row" style={{ justifyContent: 'center', gap: 8 }}>
              <Stars value={w.rating} /> <b style={{ fontSize: 16 }}>{w.rating}</b>
              <span className="muted">· {w.tips} tips</span>
            </div>
            <div className="divider" />
            <div className="muted" style={{ fontSize: 12, fontWeight: 600 }}>Station</div>
            <div style={{ fontWeight: 700, fontSize: 16, marginTop: 2 }}>{data.employer}</div>
          </div>
          <button className="btn btn-primary" onClick={() => { setAmount(''); go('amount'); }}>
            Tip {w.name.split(' ')[0]}
          </button>
        </div>
      </div>
    </>
  );

  if (screen === 'amount') {
    const presets = [10, 15, 20, 30, 50];
    const press = (k) => {
      if (k === 'del') setAmount(a => a.slice(0, -1));
      else if (k === '.') setAmount(a => a.includes('.') ? a : (a || '0') + '.');
      else setAmount(a => (a + k).replace(/^0(?=\d)/, '').slice(0, 6));
    };
    const methods = [
      { id: 'card', label: 'Card', icon: I.card },
      { id: 'snap', label: 'SnapScan', icon: I.phone },
      { id: 'ozow', label: 'Ozow EFT', icon: I.bank },
    ];
    const layout = data.tipLayout || 'numpad';
    const cardPresets = [{ v: 10, l: 'Thanks' }, { v: 20, l: 'Generous', pop: true }, { v: 50, l: 'Amazing' }, { v: 100, l: 'VIP' }];
    const sliderMax = 200;
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

            {layout === 'numpad' && <>
              <div className="amount-display">
                <div className="amount-label">Tip amount</div>
                <div className="amount-big">R{amount || '0'}</div>
              </div>
              <div className="pill-row">
                {presets.map(p => (
                  <button key={p} className={'pill' + (amount === String(p) ? ' active' : '')} onClick={() => setAmount(String(p))}>R{p}</button>
                ))}
              </div>
              <div className="numpad">
                {['1','2','3','4','5','6','7','8','9','.','0','del'].map(k => (
                  <button key={k} className="numkey" onClick={() => press(k)}>
                    {k === 'del' ? <I.del size={24} color="var(--muted)" /> : k}
                  </button>
                ))}
              </div>
            </>}

            {layout === 'cards' && <>
              <div className="amount-display" style={{ margin: '2px 0' }}>
                <div className="amount-label">You're tipping</div>
                <div className="amount-big" style={{ fontSize: 44 }}>R{amount || '0'}</div>
              </div>
              <div className="tip-cards">
                {cardPresets.map(p => (
                  <button key={p.v} className={'tip-card' + (amount === String(p.v) ? ' active' : '')} onClick={() => setAmount(String(p.v))}>
                    {p.pop && <span className="tc-pop">POPULAR</span>}
                    <span className="tc-amt">R{p.v}</span>
                    <span className="tc-lab">{p.l}</span>
                  </button>
                ))}
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Custom amount</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 14, top: 12, fontWeight: 700, color: 'var(--muted)' }}>R</span>
                  <input className="input" inputMode="numeric" placeholder="Other" style={{ paddingLeft: 28 }}
                    value={cardPresets.some(p => String(p.v) === amount) ? '' : amount}
                    onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, '').slice(0, 6))} />
                </div>
              </div>
            </>}

            {layout === 'slider' && <>
              <div className="amount-display" style={{ margin: '6px 0 2px' }}>
                <div className="amount-label">Drag to tip</div>
                <div className="amount-big">R{amt || '0'}</div>
              </div>
              <div className="tip-slider-wrap">
                <input className="tip-slider" type="range" min="0" max={sliderMax} step="5"
                  value={Math.min(amt, sliderMax)} onChange={e => setAmount(e.target.value)}
                  style={{ background: `linear-gradient(90deg,var(--accent) 0%,var(--accent-600) ${(Math.min(amt,sliderMax)/sliderMax)*100}%,var(--line) ${(Math.min(amt,sliderMax)/sliderMax)*100}%)` }} />
                <div className="tip-ticks">
                  {[0,50,100,150,200].map(v => (
                    <button key={v} className={'tip-tick' + (amt === v ? ' active' : '')} onClick={() => setAmount(String(v))}>R{v}</button>
                  ))}
                </div>
              </div>
              <div className="pill-row" style={{ marginTop: 4 }}>
                {[10,20,50,100].map(p => (
                  <button key={p} className={'pill' + (amount === String(p) ? ' active' : '')} onClick={() => setAmount(String(p))}>R{p}</button>
                ))}
              </div>
            </>}

            <div>
              <div className="rail-section-label" style={{ margin: '0 2px 8px' }}>Pay with</div>
              <div className="row gap8">
                {methods.map(m => { const Ic = m.icon; const on = method === m.id; return (
                  <button key={m.id} onClick={() => setMethod(m.id)} className="btn btn-sm"
                    style={{ flex: 1, justifyContent: 'center', background: on ? 'linear-gradient(150deg,var(--accent),var(--accent-600))' : '#fff', color: on ? '#fff' : 'var(--text)', boxShadow: on ? 'none' : 'var(--shadow-soft)', fontSize: 13 }}>
                    <Ic size={16} color={on ? '#fff' : 'var(--accent-600)'} /> {m.label}
                  </button>
                ); })}
              </div>
            </div>
            <button className={'btn ' + (amt > 0 ? 'btn-primary' : 'btn-disabled')} disabled={amt <= 0}
              onClick={() => go(method === 'card' ? 'card' : 'processing')}>
              Tip R{amt.toFixed(2)} to {w.name.split(' ')[0]}
            </button>
          </div>
        </div>
      </>
    );
  }

  if (screen === 'card') {
    const fmt = card.replace(/\D/g,'').replace(/(.{4})/g,'$1 ').trim();
    return (
      <>
        <Header title="Card Details" onBack={() => go('amount')} />
        <div className="screen-body screen-anim">
          <div className="pad stack gap16">
            <div style={{ background: 'linear-gradient(150deg,#0c2f39,#06181e)', borderRadius: 18, padding: 22, color: '#fff', minHeight: 180, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: 'var(--shadow-card)' }}>
              <div className="between"><I.card size={30} color="var(--accent)" /><i style={{ fontWeight: 800, fontStyle: 'italic', letterSpacing: 1 }}>VISA</i></div>
              <div style={{ fontSize: 20, letterSpacing: 3, fontWeight: 600 }}>{fmt || '•••• •••• •••• ••••'}</div>
              <div><div style={{ fontSize: 9, letterSpacing: 1, opacity: 0.6 }}>VALID THRU</div><div style={{ fontWeight: 700, fontSize: 14 }}>MM/YY</div></div>
            </div>
            <div className="field">
              <label>Card number</label>
              <input className="input" inputMode="numeric" placeholder="1234 5678 9012 3456" value={fmt} onChange={e => setCard(e.target.value.replace(/\D/g,'').slice(0,16))} />
            </div>
            <div className="row gap12">
              <div className="field" style={{ flex:1, marginBottom:0 }}><label>Expiry</label><input className="input" placeholder="MM/YY" /></div>
              <div className="field" style={{ flex:1, marginBottom:0 }}><label>CVV</label><input className="input" placeholder="123" /></div>
            </div>
            <button className={'btn ' + (card.length >= 12 ? 'btn-primary' : 'btn-disabled')} disabled={card.length < 12} onClick={() => go('processing')}>
              Pay R{amt.toFixed(2)} Securely
            </button>
            <div className="center muted" style={{ fontSize: 12.5 }}><I.lock size={13} /> 256-bit SSL · POPIA compliant</div>
          </div>
        </div>
      </>
    );
  }

  if (screen === 'processing') return <ProcessingScreen onDone={submitTip} />;

  if (screen === 'success') {
    const rcpt = 'ST-' + (10000 + Math.floor((amt || 20) * 137) % 89999);
    return (
      <div className="overlay dark screen-anim" style={{ position: 'static', flex: 1, justifyContent: 'flex-start', paddingTop: 70 }}>
        <div className="success-ring" style={{ background: 'rgba(18,196,178,0.18)', color: 'var(--accent)' }}><I.check size={46} stroke={3} /></div>
        <div style={{ fontSize: 26, fontWeight: 800, color: '#fff' }}>Tip sent!</div>
        <div style={{ color: 'rgba(255,255,255,0.6)', marginTop: 6 }}>to {w.name}</div>
        <div style={{ fontSize: 52, fontWeight: 800, letterSpacing: '-1.5px', margin: '20px 0 4px', color: '#fff' }}>R{(amt || 20).toFixed(2)}</div>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>Receipt {rcpt}</div>
        <div className="row gap10" style={{ marginTop: 26 }}>
          {[['SMS', I.sms], ['Email', I.mail], ['Share', I.share]].map(([l, Ic]) => (
            <button key={l} onClick={() => toast(l + ' receipt sent')} className="btn btn-sm"
              style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', flexDirection: 'column', gap: 6, padding: '14px 20px' }}>
              <Ic size={20} color="var(--accent)" />{l}
            </button>
          ))}
        </div>
        <button className="btn btn-primary" style={{ marginTop: 'auto', maxWidth: 320 }}
          onClick={() => { setRating(5); setCompliment(''); setSent(false); go('compliment'); }}>
          Leave a compliment
        </button>
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
                    <I.star size={34} color={i <= rating ? '#F2A71B' : '#e2e8ec'} />
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
              <label>Add a message</label>
              <textarea className="input" rows={3} style={{ resize: 'none', fontFamily: 'var(--font)' }} placeholder="Write something nice…" value={compliment} onChange={e => setCompliment(e.target.value)} />
            </div>
            <button className="btn btn-primary" onClick={submitCompliment}>Send compliment</button>
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
  { id: 'card', label: 'Card details' },
  { id: 'processing', label: 'Processing' },
  { id: 'success', label: 'Payment success' },
  { id: 'compliment', label: 'Compliment' },
];
CustomerFlow.initial = 'scan';
