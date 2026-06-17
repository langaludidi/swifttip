import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { I, Avatar, QRCode } from '../../../components/ui.jsx';
import {
  EmpWelcomeScene, TourArtDash, TourArtTeam, TourArtMorale, EmpConfetti,
} from './EmployerArt.jsx';

const ARC = ['welcome', 'tour', 'account', 'verify', 'business', 'venue', 'team', 'plan', 'success'];
const SETUP = ['account', 'verify', 'business', 'venue', 'team', 'plan'];
const TOUR_SLIDES = [
  { art: 'dash',   title: 'Every tip, in one view',       sub: 'Track tips by worker, station and hour — live, across your whole venue.' },
  { art: 'team',   title: 'Onboard your team fast',       sub: 'Invite staff with a single link. They verify and start earning the same day.' },
  { art: 'morale', title: 'Reward your top performers',   sub: 'Spot star earners and lift morale with recognition that actually lands.' },
];
const PLANS = [
  { id: 'Free',       price: 'R0',    per: 'forever',  feats: ['1 station', 'Live dashboard', 'Up to 5 workers'] },
  { id: 'Business',   price: 'R299',  per: '/month',   feats: ['Unlimited stations', 'Analytics & heatmaps', 'Payout controls'], rec: true },
  { id: 'Enterprise', price: 'Custom', per: 'pricing', feats: ['SSO & custom reports', 'Dedicated support', 'SLAs'] },
];

function ProgressHeader({ step, onBack }) {
  const idx = SETUP.indexOf(step);
  const pct = ((idx + 1) / SETUP.length) * 100;
  return (
    <div className="onb-prog-head">
      <button className="onb-iconbtn-light" onClick={onBack} aria-label="Back"><I.back size={20} /></button>
      <div className="onb-prog-bar"><i style={{ width: pct + '%', background: 'linear-gradient(90deg,#5f93f2,#2f63e0)' }} /></div>
      <div className="onb-prog-step">Step {idx + 1} of {SETUP.length}</div>
    </div>
  );
}

function Foot({ children }) {
  return <div className="onb-foot" style={{ marginTop: 'auto' }}>{children}</div>;
}

/* ── Welcome ─────────────────────────────────────────── */
function WelcomeScreen({ next }) {
  return (
    <div className="onb-screen onb-scene" style={{ minHeight: '100vh' }}>
      <EmpWelcomeScene />
      <div className="onb-sheet">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <span style={{ fontWeight: 800, fontSize: 20, letterSpacing: '-0.4px', color: 'var(--accent)' }}>SwiftTip</span>
          <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-0.3px', color: '#2f63e0' }}>Business</span>
          <span className="badge" style={{ marginLeft: 'auto' }}>For employers</span>
        </div>
        <h2>Turn cashless into better tips for your team.</h2>
        <p>Give every worker a QR badge, see tips roll in live, and onboard your whole venue in minutes.</p>
        <button className="btn btn-primary" style={{ marginTop: 18, background: 'linear-gradient(150deg,#5f93f2,#2f63e0)', boxShadow: '0 14px 26px -14px #2f63e0' }} onClick={next}>
          Set up my business <I.chevR size={18} color="#fff" />
        </button>
        <button className="btn-link" onClick={() => {}}>I already have an account</button>
        <div className="center muted" style={{ fontSize: 11.5, marginTop: 2 }}>POPIA compliant · CIPC-verified businesses</div>
      </div>
    </div>
  );
}

/* ── Tour ────────────────────────────────────────────── */
function TourScreen({ slide, setSlide, next, back }) {
  const total = TOUR_SLIDES.length;
  const data = TOUR_SLIDES[Math.min(slide, total - 1)];
  const Art = data.art === 'dash' ? TourArtDash : data.art === 'team' ? TourArtTeam : TourArtMorale;
  const last = slide >= total - 1;
  const advance = () => { if (last) next(); else setSlide(slide + 1); };
  const goBack = () => { if (slide === 0) back(); else setSlide(slide - 1); };

  return (
    <div className="onb-screen onb-scene" style={{ minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px 0' }}>
        <button className="onb-iconbtn-light" onClick={goBack} aria-label="Back"
          style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.14)', color: '#fff' }}>
          <I.back size={20} />
        </button>
        <button className="btn-link" style={{ width: 'auto', padding: '8px 6px', color: 'rgba(255,255,255,0.7)' }} onClick={next}>Skip</button>
      </div>
      <div key={slide} style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Art />
        <div className="intro-copy">
          <h2 style={{ color: '#fff' }}>{data.title}</h2>
          <p style={{ color: 'rgba(255,255,255,0.68)' }}>{data.sub}</p>
        </div>
      </div>
      <div style={{ padding: '14px 24px 24px' }}>
        <div className="onb-dots" style={{ marginBottom: 18 }}>
          {Array.from({ length: total }).map((_, i) => (
            <span key={i} className={'onb-dot dark' + (i === slide ? ' on' : '')} />
          ))}
        </div>
        <button className="btn btn-primary" style={{ background: 'linear-gradient(150deg,#5f93f2,#2f63e0)', boxShadow: '0 14px 26px -14px #2f63e0' }} onClick={advance}>
          {last ? 'Create business account' : 'Next'} <I.chevR size={18} color="#fff" />
        </button>
      </div>
    </div>
  );
}

/* ── Account ─────────────────────────────────────────── */
function AccountScreen({ next, back }) {
  const [show, setShow] = useState(false);
  return (
    <div className="onb-screen" style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <ProgressHeader step="account" onBack={back} />
      <div className="screen-body" style={{ flex: 1, overflowY: 'auto' }}>
        <div className="pad stack gap14" style={{ paddingTop: 14 }}>
          <div className="form-h"><h2>Create your admin account</h2><p>You'll be the account owner. Add more managers later.</p></div>
          <div className="field" style={{ marginBottom: 0 }}><label>Your name</label><input className="input" defaultValue="Naledi Khumalo" /></div>
          <div className="field" style={{ marginBottom: 0 }}><label>Work email</label><input className="input" inputMode="email" defaultValue="manager@thegrand.co.za" /></div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Create password</label>
            <div style={{ position: 'relative' }}>
              <input className="input" type={show ? 'text' : 'password'} defaultValue="grandhotel" style={{ paddingRight: 44 }} />
              <button onClick={() => setShow(s => !s)} aria-label="Toggle password" style={{ position: 'absolute', right: 8, top: 7, width: 34, height: 34, border: 0, background: 'transparent', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
                <I.eye size={18} color="var(--muted-2)" />
              </button>
            </div>
          </div>
          <div className="trust-note teal">
            <span className="ic"><I.shield size={18} /></span>
            <div><div className="tt">Owner access</div><div className="ts">Full control of workers, payouts and billing. Invite teammates anytime.</div></div>
          </div>
        </div>
      </div>
      <Foot>
        <button className="btn btn-primary" style={{ background: 'linear-gradient(150deg,#5f93f2,#2f63e0)', boxShadow: '0 14px 26px -14px #2f63e0' }} onClick={next}>Continue</button>
        <div className="center muted" style={{ fontSize: 11.5, marginTop: 10 }}>By continuing you agree to the Business Terms</div>
      </Foot>
    </div>
  );
}

/* ── Verify ──────────────────────────────────────────── */
function VerifyScreen({ next, back }) {
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const fired = useRef(false);
  const filled = code.length;

  useEffect(() => {
    let i = 0; const target = '8240';
    const id = setInterval(() => { i++; setCode(target.slice(0, i)); if (i >= 4) clearInterval(id); }, 230);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (filled === 4 && !fired.current) { fired.current = true; setVerifying(true); const id = setTimeout(next, 850); return () => clearTimeout(id); }
  }, [filled]);

  const press = (k) => { if (fired.current) return; if (k === 'del') setCode(c => c.slice(0, -1)); else setCode(c => (c + k).slice(0, 4)); };

  return (
    <div className="onb-screen" style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <ProgressHeader step="verify" onBack={back} />
      <div className="screen-body" style={{ flex: 1, overflowY: 'auto' }}>
        <div className="pad stack gap16" style={{ paddingTop: 14 }}>
          <div className="form-h"><h2>Verify your email</h2><p>We sent a code to <b style={{ color: 'var(--text)' }}>manager@thegrand.co.za</b>. <span className="link" style={{ cursor: 'pointer', color: '#5f93f2' }} onClick={back}>Change</span></p></div>
          <div className="otp-row" style={{ marginTop: 6 }}>
            {[0, 1, 2, 3].map(i => {
              const isCursor = i === filled && !verifying;
              return (
                <div key={i} className={'otp-box' + (code[i] ? ' filled' : '') + (isCursor ? ' cursor' : '')}
                  style={code[i] ? { borderColor: '#5f93f2' } : undefined}>
                  {code[i] ? <span className="otp-d">{code[i]}</span> : (isCursor ? <span className="otp-caret" style={{ background: '#5f93f2' }} /> : '')}
                </div>
              );
            })}
          </div>
          <div className="center" style={{ marginTop: 2 }}>
            {verifying
              ? <span className="badge live"><span className="dot" /> Verifying…</span>
              : <span className="muted" style={{ fontSize: 13 }}>Didn't get it? <span className="link" style={{ cursor: 'pointer', color: '#5f93f2' }}>Resend email</span></span>}
          </div>
          <div className="kpad" style={{ marginTop: 8 }}>
            {['1','2','3','4','5','6','7','8','9','','0','del'].map((k, i) => (
              k === '' ? <span key={i} className="kkey blank" /> :
              <button key={i} className="kkey" onClick={() => press(k)}>
                {k === 'del' ? <I.del size={22} color="var(--muted)" /> : k}
              </button>
            ))}
          </div>
          <div className="center muted" style={{ fontSize: 11.5 }}>Demo: <b style={{ color: 'var(--text)' }}>8240</b> verifies</div>
        </div>
      </div>
    </div>
  );
}

/* ── Business ────────────────────────────────────────── */
function BusinessScreen({ next, back }) {
  const [industry, setIndustry] = useState('Hospitality');
  return (
    <div className="onb-screen" style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <ProgressHeader step="business" onBack={back} />
      <div className="screen-body" style={{ flex: 1, overflowY: 'auto' }}>
        <div className="pad stack gap14" style={{ paddingTop: 14 }}>
          <div className="form-h"><h2>About your business</h2><p>We confirm your details to keep the SwiftTip network trusted.</p></div>
          <div className="field" style={{ marginBottom: 0 }}><label>Trading name</label><input className="input" defaultValue="The Grand Hotel" /></div>
          <div className="field" style={{ marginBottom: 0 }}><label>Registered company name</label><input className="input" defaultValue="The Grand Group (Pty) Ltd" /></div>
          <div className="field" style={{ marginBottom: 0 }}><label>CIPC registration no.</label><input className="input" placeholder="2019 / 123456 / 07" /></div>
          <div>
            <label className="field" style={{ display: 'block', marginBottom: 8 }}>Industry</label>
            <div className="seg-choice">
              {['Hospitality', 'Fuel', 'Retail', 'Other'].map(o => (
                <button key={o} className={'seg-opt' + (industry === o ? ' on' : '')}
                  style={industry === o ? { borderColor: '#5f93f2', color: '#2f63e0' } : undefined}
                  onClick={() => setIndustry(o)}>{o}</button>
              ))}
            </div>
          </div>
        </div>
      </div>
      <Foot><button className="btn btn-primary" style={{ background: 'linear-gradient(150deg,#5f93f2,#2f63e0)', boxShadow: '0 14px 26px -14px #2f63e0' }} onClick={next}>Continue</button></Foot>
    </div>
  );
}

/* ── Venue ───────────────────────────────────────────── */
function VenueScreen({ next, back }) {
  const [stations, setStations] = useState(['Bar', 'Restaurant']);
  const [val, setVal] = useState('');
  const add = () => { const v = val.trim(); if (v && !stations.includes(v)) setStations(s => [...s, v]); setVal(''); };
  return (
    <div className="onb-screen" style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <ProgressHeader step="venue" onBack={back} />
      <div className="screen-body" style={{ flex: 1, overflowY: 'auto' }}>
        <div className="pad stack gap14" style={{ paddingTop: 14 }}>
          <div className="form-h"><h2>Add your first venue</h2><p>Where will your team collect tips? You can add more venues later.</p></div>
          <div className="field" style={{ marginBottom: 0 }}><label>Venue name</label><input className="input" defaultValue="The Grand Hotel — Sandton" /></div>
          <div>
            <label className="field" style={{ display: 'block', marginBottom: 8 }}>Stations</label>
            <div className="row" style={{ flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
              {stations.map(s => (
                <span key={s} className="badge" style={{ padding: '8px 12px', fontSize: 13 }}>{s}
                  <button onClick={() => setStations(st => st.filter(x => x !== s))} style={{ border: 0, background: 'transparent', cursor: 'pointer', color: 'var(--accent-600)', display: 'inline', padding: 0, marginLeft: 4 }}>✕</button>
                </span>
              ))}
            </div>
            <div className="row gap10">
              <input className="input" placeholder="Add a station (e.g. Valet)" value={val} onChange={e => setVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} />
              <button className="btn btn-ghost btn-sm" style={{ flex: '0 0 auto', padding: '13px 16px' }} onClick={add}><I.plus size={18} color="var(--accent-600)" /></button>
            </div>
          </div>
          <div className="trust-note teal">
            <span className="ic"><I.qr size={18} /></span>
            <div><div className="tt">Each station gets a QR</div><div className="ts">Print a SwiftTip code for every station so customers always find the right team.</div></div>
          </div>
        </div>
      </div>
      <Foot><button className="btn btn-primary" style={{ background: 'linear-gradient(150deg,#5f93f2,#2f63e0)', boxShadow: '0 14px 26px -14px #2f63e0' }} onClick={next}>Continue</button></Foot>
    </div>
  );
}

/* ── Team ────────────────────────────────────────────── */
function TeamScreen({ next, back }) {
  const [invited, setInvited] = useState([{ name: 'Sipho Dlamini', color: 'red' }, { name: 'Thandi Nkosi', color: 'purple' }]);
  const [val, setVal] = useState('');
  const colors = ['teal', 'gold', 'blue', 'red', 'purple'];
  const add = () => { const v = val.trim(); if (v) setInvited(list => [...list, { name: v, color: colors[list.length % colors.length] }]); setVal(''); };
  return (
    <div className="onb-screen" style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <ProgressHeader step="team" onBack={back} />
      <div className="screen-body" style={{ flex: 1, overflowY: 'auto' }}>
        <div className="pad stack gap14" style={{ paddingTop: 14 }}>
          <div className="form-h"><h2>Invite your team</h2><p>They finish their own profile &amp; banking — you just verify them.</p></div>
          <button className="list-card" onClick={() => {}} style={{ border: 0, width: '100%', cursor: 'pointer', textAlign: 'left', background: 'var(--mint)', boxShadow: 'none' }}>
            <div className="icon-chip" style={{ background: '#fff' }}><I.share size={20} /></div>
            <div className="lc-main"><div className="lc-title" style={{ fontSize: 14.5 }}>Share invite link</div><div className="lc-sub">swifttip.co.za/join/grand-sandton</div></div>
            <I.chevR size={18} color="var(--accent-600)" />
          </button>
          <div className="row gap10">
            <input className="input" placeholder="Add by name or mobile" value={val} onChange={e => setVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} />
            <button className="btn btn-primary btn-sm" style={{ flex: '0 0 auto', padding: '13px 18px', background: 'linear-gradient(150deg,#5f93f2,#2f63e0)' }} onClick={add}>Invite</button>
          </div>
          <div className="stack gap10">
            <div className="rail-section-label" style={{ margin: '2px 2px' }}>{invited.length} invited</div>
            {invited.map((w, i) => (
              <div key={i} className="list-card" style={{ boxShadow: 'var(--shadow-soft)' }}>
                <Avatar name={w.name} color={w.color} size={40} />
                <div className="lc-main"><div className="lc-title" style={{ fontSize: 14.5 }}>{w.name}</div><div className="lc-sub">Awaiting sign-up</div></div>
                <span className="badge"><I.mail size={11} /> Invite sent</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <Foot>
        <button className="btn btn-primary" style={{ background: 'linear-gradient(150deg,#5f93f2,#2f63e0)', boxShadow: '0 14px 26px -14px #2f63e0' }} onClick={next}>Continue</button>
        <button className="btn-link" onClick={next}>I'll invite them later</button>
      </Foot>
    </div>
  );
}

/* ── Plan ────────────────────────────────────────────── */
function PlanScreen({ next, back }) {
  const [plan, setPlan] = useState('Business');
  return (
    <div className="onb-screen" style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <ProgressHeader step="plan" onBack={back} />
      <div className="screen-body" style={{ flex: 1, overflowY: 'auto' }}>
        <div className="pad stack gap12" style={{ paddingTop: 14 }}>
          <div className="form-h"><h2>Choose your plan</h2><p>Start free. Upgrade anytime as your team grows.</p></div>
          {PLANS.map(p => {
            const on = plan === p.id;
            return (
              <button key={p.id} onClick={() => setPlan(p.id)}
                style={{ position: 'relative', textAlign: 'left', cursor: 'pointer', fontFamily: 'var(--font)', border: '1.5px solid ' + (on ? '#5f93f2' : 'var(--line)'), background: on ? 'linear-gradient(160deg, rgba(95,147,242,0.08), #fff)' : '#fff', borderRadius: 18, padding: '15px 16px', boxShadow: on ? '0 12px 24px -16px #5f93f2' : 'none', transition: 'all .15s' }}>
                {p.rec && <span style={{ position: 'absolute', top: -10, right: 14, background: 'var(--gold)', color: '#fff', fontSize: 10.5, fontWeight: 800, padding: '3px 9px', borderRadius: 999 }}>RECOMMENDED</span>}
                <div className="between" style={{ alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 16 }}>{p.id}</div>
                    <div style={{ marginTop: 2 }}><span style={{ fontWeight: 800, fontSize: 20, letterSpacing: '-0.5px' }}>{p.price}</span> <span className="muted" style={{ fontSize: 12.5 }}>{p.per}</span></div>
                  </div>
                  <span style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid ' + (on ? '#5f93f2' : 'var(--line)'), background: on ? '#5f93f2' : '#fff', display: 'grid', placeItems: 'center', flex: '0 0 auto', marginTop: 2 }}>{on && <I.check size={14} color="#fff" stroke={3} />}</span>
                </div>
                <div className="stack" style={{ gap: 6, marginTop: 12 }}>
                  {p.feats.map((f, i) => <div key={i} className="row gap8" style={{ fontSize: 12.8, color: 'var(--text)' }}><I.check size={14} color="#5f93f2" stroke={2.6} /> {f}</div>)}
                </div>
              </button>
            );
          })}
        </div>
      </div>
      <Foot>
        <button className="btn btn-primary" style={{ background: 'linear-gradient(150deg,#5f93f2,#2f63e0)', boxShadow: '0 14px 26px -14px #2f63e0' }} onClick={next}>
          {plan === 'Free' ? 'Start for free' : plan === 'Enterprise' ? 'Talk to sales' : 'Start 14-day free trial'}
        </button>
        <div className="center muted" style={{ fontSize: 11.5, marginTop: 10 }}>No card required for the trial · cancel anytime</div>
      </Foot>
    </div>
  );
}

/* ── Success ─────────────────────────────────────────── */
function SuccessScreen() {
  const navigate = useNavigate();
  return (
    <div className="onb-screen onb-scene" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <EmpConfetti n={28} />
      <div className="screen-body" style={{ position: 'relative', zIndex: 2, flex: 1, overflowY: 'auto' }}>
        <div className="pad stack" style={{ alignItems: 'center', textAlign: 'center', paddingTop: 28, gap: 6 }}>
          <div className="success-ring" style={{ background: 'rgba(18,196,178,0.18)', color: 'var(--accent)' }}><I.checkC size={48} /></div>
          <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.6px', color: '#fff' }}>Your business is live!</div>
          <div style={{ color: 'rgba(255,255,255,0.66)', fontSize: 14.5, maxWidth: 290, lineHeight: 1.55, marginTop: 4 }}>Print your station QR codes and watch the tips roll in.</div>
          <div className="glass-card" style={{ marginTop: 22, padding: 18, width: '100%', maxWidth: 320, textAlign: 'left', color: '#fff' }}>
            <div className="between">
              <div className="row gap10">
                <div style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(18,196,178,0.2)', display: 'grid', placeItems: 'center', flex: '0 0 38px' }}>
                  <I.users size={20} color="var(--accent)" />
                </div>
                <div><div style={{ fontWeight: 800, fontSize: 15 }}>The Grand Group</div><div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.6)' }}>Sandton · 2 stations</div></div>
              </div>
              <span className="badge live"><span className="dot" /> Active</span>
            </div>
            <div style={{ height: 1, background: 'rgba(255,255,255,0.12)', margin: '14px 0' }} />
            <div className="between" style={{ fontSize: 12.5 }}>
              <div><div style={{ color: 'rgba(255,255,255,0.55)' }}>Plan</div><div style={{ fontWeight: 800, fontSize: 14, marginTop: 2 }}>Business</div></div>
              <div><div style={{ color: 'rgba(255,255,255,0.55)' }}>Invites sent</div><div style={{ fontWeight: 800, fontSize: 14, marginTop: 2 }}>2 workers</div></div>
              <div><div style={{ color: 'rgba(255,255,255,0.55)' }}>Stations</div><div style={{ fontWeight: 800, fontSize: 14, marginTop: 2 }}>Bar · Rest.</div></div>
            </div>
          </div>
        </div>
      </div>
      <div className="onb-foot" style={{ position: 'relative', zIndex: 2 }}>
        <button className="btn btn-primary" style={{ background: 'linear-gradient(150deg,#5f93f2,#2f63e0)', boxShadow: '0 14px 26px -14px #2f63e0' }} onClick={() => navigate('/employer')}>Open my dashboard</button>
        <button className="btn-link" style={{ color: 'rgba(255,255,255,0.7)' }} onClick={() => navigate('/')}>Back to home</button>
      </div>
    </div>
  );
}

export default function EmployerOnboarding() {
  const [arcIdx, setArcIdx] = useState(0);
  const [slide, setSlide] = useState(0);
  const screen = ARC[arcIdx];
  const next = () => { if (screen === 'tour') setSlide(0); setArcIdx(i => Math.min(i + 1, ARC.length - 1)); };
  const back = () => setArcIdx(i => Math.max(i - 1, 0));

  return (
    <>
      {screen === 'welcome'  && <WelcomeScreen next={next} />}
      {screen === 'tour'     && <TourScreen slide={slide} setSlide={setSlide} next={next} back={back} />}
      {screen === 'account'  && <AccountScreen next={next} back={back} />}
      {screen === 'verify'   && <VerifyScreen next={next} back={back} />}
      {screen === 'business' && <BusinessScreen next={next} back={back} />}
      {screen === 'venue'    && <VenueScreen next={next} back={back} />}
      {screen === 'team'     && <TeamScreen next={next} back={back} />}
      {screen === 'plan'     && <PlanScreen next={next} back={back} />}
      {screen === 'success'  && <SuccessScreen />}
    </>
  );
}
