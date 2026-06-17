import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { I, Avatar } from '../../../components/ui.jsx';

const ARC = ['welcome', 'tour', 'account', 'verify', 'business', 'venue', 'team', 'plan', 'success'];
const SETUP_STEPS = ['account', 'verify', 'business', 'venue', 'team', 'plan'];
const TOUR_SLIDES = [
  { icon: I.trend, title: 'Real-time tip dashboard', body: 'See every tip your team receives the moment it happens.' },
  { icon: I.users, title: 'Manage your whole team', body: 'Add workers, set up stations, and track who earns what.' },
  { icon: I.star, title: 'Team morale insights', body: 'Ratings and compliments give you a picture of team performance.' },
];

function ProgressBar({ screen }) {
  const idx = SETUP_STEPS.indexOf(screen);
  if (idx < 0) return null;
  return (
    <div style={{ padding: '16px 22px 0' }}>
      <div style={{ display: 'flex', gap: 6 }}>
        {SETUP_STEPS.map((_, i) => (
          <div key={i} style={{ flex: 1, height: 4, borderRadius: 3, background: i <= idx ? '#2f63e0' : 'var(--line)', transition: 'background .3s' }} />
        ))}
      </div>
      <div style={{ marginTop: 6, fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>Step {idx + 1} of {SETUP_STEPS.length}</div>
    </div>
  );
}

function WelcomeScreen({ next }) {
  return (
    <div className="onb-screen screen-anim" style={{ display: 'flex', flexDirection: 'column', background: 'linear-gradient(170deg,#0d1f4c,#1a3a8a)', color: '#fff', padding: '60px 28px 36px' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 20 }}>
        <div style={{ width: 90, height: 90, borderRadius: 28, background: 'rgba(95,147,242,0.2)', border: '2px solid rgba(95,147,242,0.35)', display: 'grid', placeItems: 'center' }}>
          <I.users size={44} color="#7aaaff" />
        </div>
        <div>
          <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.6px' }}>SwiftTip for Employers</div>
          <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.65)', marginTop: 10, lineHeight: 1.55 }}>
            Manage cashless tipping across your entire team — transparent, fair, instant.
          </div>
        </div>
        {['Unified team tip dashboard', 'Automated fair distribution', 'Staff motivation analytics'].map((t, i) => (
          <div key={i} className="row gap10" style={{ width: '100%' }}>
            <div style={{ width: 28, height: 28, borderRadius: 9, background: 'rgba(95,147,242,0.18)', display: 'grid', placeItems: 'center', flex: '0 0 28px' }}>
              <I.check size={15} color="#7aaaff" stroke={3} />
            </div>
            <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>{t}</span>
          </div>
        ))}
      </div>
      <button className="btn" onClick={next} style={{ background: 'linear-gradient(150deg,#5f93f2,#2f63e0)', color: '#fff', boxShadow: '0 14px 26px -14px #2f63e0', marginTop: 20 }}>Get started</button>
    </div>
  );
}

function TourScreen({ next, back }) {
  const [slide, setSlide] = useState(0);
  const s = TOUR_SLIDES[slide];
  const Ic = s.icon;
  return (
    <div className="onb-screen screen-anim" style={{ display: 'flex', flexDirection: 'column', background: 'linear-gradient(170deg,#0d1f4c,#1a3a8a)', color: '#fff', padding: '50px 28px 36px' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 24 }}>
        <div style={{ width: 100, height: 100, borderRadius: 30, background: 'rgba(95,147,242,0.15)', border: '2px solid rgba(95,147,242,0.25)', display: 'grid', placeItems: 'center' }}>
          <Ic size={48} color="#7aaaff" />
        </div>
        <div>
          <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.5px' }}>{s.title}</div>
          <div style={{ fontSize: 14.5, color: 'rgba(255,255,255,0.65)', marginTop: 10, lineHeight: 1.6, maxWidth: 280 }}>{s.body}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {TOUR_SLIDES.map((_, i) => (
            <button key={i} onClick={() => setSlide(i)} style={{ width: i === slide ? 22 : 8, height: 8, borderRadius: 4, background: i === slide ? '#7aaaff' : 'rgba(255,255,255,0.2)', border: 0, cursor: 'pointer', transition: 'all .25s', padding: 0 }} />
          ))}
        </div>
      </div>
      <div className="row gap10">
        <button className="btn" style={{ flex: '0 0 auto', width: 'auto', padding: '16px 20px', background: 'rgba(255,255,255,0.1)', color: '#fff' }} onClick={back}>
          <I.back size={18} color="#fff" />
        </button>
        {slide < TOUR_SLIDES.length - 1
          ? <button className="btn" style={{ flex: 1, background: 'rgba(255,255,255,0.1)', color: '#fff' }} onClick={() => setSlide(s => s + 1)}>Next</button>
          : <button className="btn" onClick={next} style={{ flex: 1, background: 'linear-gradient(150deg,#5f93f2,#2f63e0)', color: '#fff' }}>Set up your account</button>
        }
      </div>
    </div>
  );
}

function AccountScreen({ next, back }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  return (
    <div className="onb-screen screen-anim" style={{ display: 'flex', flexDirection: 'column', padding: '28px 22px' }}>
      <button onClick={back} style={{ background: 0, border: 0, cursor: 'pointer', alignSelf: 'flex-start', marginBottom: 8 }}><I.back size={22} color="var(--text)" /></button>
      <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.5px', marginTop: 8 }}>Create your account</div>
      <div style={{ marginTop: 24, flex: 1 }}>
        <div className="field"><label>Work email</label><input className="input" type="email" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} autoFocus /></div>
        <div className="field">
          <label>Password</label>
          <div style={{ position: 'relative' }}>
            <input className="input" type={showPw ? 'text' : 'password'} placeholder="At least 8 characters" value={password} onChange={e => setPassword(e.target.value)} style={{ paddingRight: 44 }} />
            <button onClick={() => setShowPw(v => !v)} style={{ position: 'absolute', right: 12, top: 12, background: 0, border: 0, cursor: 'pointer' }}>
              <I.eye size={20} color="var(--muted-2)" />
            </button>
          </div>
        </div>
      </div>
      <button className={'btn ' + (email.includes('@') && password.length >= 8 ? 'btn-primary' : 'btn-disabled')}
        style={{ background: email.includes('@') && password.length >= 8 ? 'linear-gradient(150deg,#5f93f2,#2f63e0)' : undefined, boxShadow: email.includes('@') && password.length >= 8 ? '0 14px 26px -14px #2f63e0' : 'none' }}
        disabled={!email.includes('@') || password.length < 8} onClick={next}>
        Continue
      </button>
    </div>
  );
}

function VerifyScreen({ next, back }) {
  const [otp, setOtp] = useState(['', '', '', '']);
  const [error, setError] = useState(false);
  const refs = [useRef(), useRef(), useRef(), useRef()];
  const code = otp.join('');

  useEffect(() => {
    setTimeout(() => setOtp(['8', '2', '4', '0']), 1200);
  }, []);

  const change = (i, v) => {
    const d = v.replace(/\D/g,'').slice(-1);
    const next_ = [...otp]; next_[i] = d; setOtp(next_); setError(false);
    if (d && i < 3) refs[i+1].current?.focus();
  };

  const verify = () => {
    if (code === '8240') { next(); return; }
    setError(true); setOtp(['','','','']); refs[0].current?.focus();
  };

  return (
    <div className="onb-screen screen-anim" style={{ display: 'flex', flexDirection: 'column', padding: '28px 22px' }}>
      <button onClick={back} style={{ background: 0, border: 0, cursor: 'pointer', alignSelf: 'flex-start', marginBottom: 8 }}><I.back size={22} color="var(--text)" /></button>
      <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.5px', marginTop: 8 }}>Verify your email</div>
      <div style={{ fontSize: 14, color: 'var(--muted)', marginTop: 6 }}>We emailed a 4-digit code. <span style={{ color: 'var(--muted-2)', fontSize: 12 }}>(demo: 8240)</span></div>
      <div className={'otp-row' + (error ? ' shake' : '')} style={{ display: 'flex', gap: 12, justifyContent: 'center', margin: '36px 0' }}>
        {otp.map((v, i) => (
          <input key={i} ref={refs[i]} className="otp-box input" value={v} maxLength={1} inputMode="numeric"
            onChange={e => change(i, e.target.value)}
            onKeyDown={e => { if (e.key === 'Backspace' && !v && i > 0) refs[i-1].current?.focus(); }}
            style={{ width: 60, height: 68, textAlign: 'center', fontSize: 28, fontWeight: 800, borderColor: error ? 'var(--danger)' : v ? '#5f93f2' : undefined }} />
        ))}
      </div>
      {error && <div style={{ color: 'var(--danger)', fontSize: 13.5, fontWeight: 600, textAlign: 'center', marginBottom: 12 }}>Wrong code — try again</div>}
      <div style={{ flex: 1 }} />
      <button className={'btn ' + (code.length === 4 ? '' : 'btn-disabled')}
        style={{ background: code.length === 4 ? 'linear-gradient(150deg,#5f93f2,#2f63e0)' : undefined, color: '#fff', boxShadow: code.length === 4 ? '0 14px 26px -14px #2f63e0' : 'none' }}
        disabled={code.length < 4} onClick={verify}>Verify</button>
    </div>
  );
}

function BusinessScreen({ next, back }) {
  const [industry, setIndustry] = useState('');
  const [companyName, setCompanyName] = useState('');
  const industries = ['Hotel & Hospitality', 'Restaurant & Bar', 'Spa & Wellness', 'Events & Entertainment', 'Transport', 'Other'];
  return (
    <div className="onb-screen screen-anim" style={{ display: 'flex', flexDirection: 'column', padding: '28px 22px' }}>
      <button onClick={back} style={{ background: 0, border: 0, cursor: 'pointer', alignSelf: 'flex-start', marginBottom: 8 }}><I.back size={22} color="var(--text)" /></button>
      <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.5px', marginTop: 8 }}>About your business</div>
      <div style={{ marginTop: 24, flex: 1 }}>
        <div className="field"><label>Company name</label><input className="input" placeholder="e.g. The Grand Group (Pty) Ltd" value={companyName} onChange={e => setCompanyName(e.target.value)} /></div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Industry</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 4 }}>
            {industries.map(ind => (
              <button key={ind} onClick={() => setIndustry(ind)}
                style={{ padding: '11px 10px', borderRadius: 11, border: `1.5px solid ${industry === ind ? '#5f93f2' : 'var(--line)'}`, background: industry === ind ? 'rgba(95,147,242,0.1)' : '#fff', fontFamily: 'inherit', fontWeight: 600, fontSize: 13, color: industry === ind ? '#2f63e0' : 'var(--text)', cursor: 'pointer', textAlign: 'center' }}>
                {ind}
              </button>
            ))}
          </div>
        </div>
      </div>
      <button className={'btn ' + (companyName && industry ? '' : 'btn-disabled')}
        style={{ marginTop: 20, background: companyName && industry ? 'linear-gradient(150deg,#5f93f2,#2f63e0)' : undefined, color: '#fff', boxShadow: companyName && industry ? '0 14px 26px -14px #2f63e0' : 'none' }}
        disabled={!companyName || !industry} onClick={next}>Continue</button>
    </div>
  );
}

function VenueScreen({ next, back }) {
  const [venue, setVenue] = useState('');
  const [stations, setStations] = useState(['Bar', 'Restaurant']);
  const [newStation, setNewStation] = useState('');
  const addStation = () => { if (newStation.trim()) { setStations(s => [...s, newStation.trim()]); setNewStation(''); } };
  return (
    <div className="onb-screen screen-anim" style={{ display: 'flex', flexDirection: 'column', padding: '28px 22px' }}>
      <button onClick={back} style={{ background: 0, border: 0, cursor: 'pointer', alignSelf: 'flex-start', marginBottom: 8 }}><I.back size={22} color="var(--text)" /></button>
      <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.5px', marginTop: 8 }}>Your venue</div>
      <div style={{ marginTop: 24, flex: 1 }}>
        <div className="field"><label>Venue / trading name</label><input className="input" placeholder="e.g. The Grand Hotel — Bar" value={venue} onChange={e => setVenue(e.target.value)} /></div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Service stations</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
            {stations.map((s, i) => (
              <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 999, background: 'rgba(47,99,224,0.1)', color: '#2f63e0', fontWeight: 700, fontSize: 13 }}>
                {s}
                <button onClick={() => setStations(ss => ss.filter((_, j) => j !== i))} style={{ background: 0, border: 0, cursor: 'pointer', color: '#2f63e0', lineHeight: 1, padding: 0 }}>×</button>
              </span>
            ))}
          </div>
          <div className="row gap8">
            <input className="input" placeholder="Add station…" value={newStation} onChange={e => setNewStation(e.target.value)} onKeyDown={e => e.key === 'Enter' && addStation()} style={{ flex: 1 }} />
            <button onClick={addStation} className="btn btn-sm" style={{ background: 'linear-gradient(150deg,#5f93f2,#2f63e0)', color: '#fff', flex: '0 0 auto' }}><I.plus size={18} /></button>
          </div>
        </div>
      </div>
      <button className={'btn ' + (venue ? '' : 'btn-disabled')}
        style={{ marginTop: 20, background: venue ? 'linear-gradient(150deg,#5f93f2,#2f63e0)' : undefined, color: '#fff', boxShadow: venue ? '0 14px 26px -14px #2f63e0' : 'none' }}
        disabled={!venue} onClick={next}>Continue</button>
    </div>
  );
}

function TeamScreen({ next, back }) {
  const [workers, setWorkers] = useState([{ name: 'Sipho Dlamini', role: 'Bartender' }]);
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('');
  const inviteLink = `${window.location.origin}/worker/onboarding?employer=grand-hotel`;
  const [copied, setCopied] = useState(false);
  const copyLink = () => { navigator.clipboard.writeText(inviteLink).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div className="onb-screen screen-anim" style={{ display: 'flex', flexDirection: 'column', padding: '28px 22px' }}>
      <button onClick={back} style={{ background: 0, border: 0, cursor: 'pointer', alignSelf: 'flex-start', marginBottom: 8 }}><I.back size={22} color="var(--text)" /></button>
      <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.5px', marginTop: 8 }}>Build your team</div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14, marginTop: 20 }}>
        <div className="card" style={{ padding: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>Share invite link</div>
          <div style={{ fontSize: 12.5, color: 'var(--muted)', wordBreak: 'break-all', marginBottom: 10 }}>{inviteLink}</div>
          <button className="btn btn-sm" style={{ background: 'linear-gradient(150deg,#5f93f2,#2f63e0)', color: '#fff' }} onClick={copyLink}><I.copy size={15} />{copied ? 'Copied!' : 'Copy link'}</button>
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>Add manually</div>
          <div className="row gap8" style={{ marginBottom: 8 }}>
            <input className="input" placeholder="Worker name" value={newName} onChange={e => setNewName(e.target.value)} style={{ flex: 1 }} />
            <input className="input" placeholder="Role" value={newRole} onChange={e => setNewRole(e.target.value)} style={{ flex: 1 }} />
          </div>
          <button className="btn btn-ghost" onClick={() => { if (newName) { setWorkers(w => [...w, { name: newName, role: newRole }]); setNewName(''); setNewRole(''); } }}>
            <I.plus size={16} color="var(--accent-600)" /> Add worker
          </button>
        </div>
        <div className="stack gap8">
          {workers.map((w, i) => (
            <div key={i} className="list-card" style={{ padding: '10px 14px' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(47,99,224,0.1)', display: 'grid', placeItems: 'center', flex: '0 0 36px' }}>
                <I.user size={18} color="#2f63e0" />
              </div>
              <div className="lc-main">
                <div className="lc-title" style={{ fontSize: 14 }}>{w.name}</div>
                <div className="lc-sub">{w.role}</div>
              </div>
              <button onClick={() => setWorkers(ws => ws.filter((_, j) => j !== i))} style={{ background: 0, border: 0, cursor: 'pointer', padding: 4 }}>
                <I.x size={16} color="var(--danger)" />
              </button>
            </div>
          ))}
        </div>
      </div>
      <button className="btn" onClick={next} style={{ background: 'linear-gradient(150deg,#5f93f2,#2f63e0)', color: '#fff', boxShadow: '0 14px 26px -14px #2f63e0', marginTop: 12 }}>Continue</button>
    </div>
  );
}

function PlanScreen({ next, back }) {
  const [plan, setPlan] = useState('business');
  const plans = [
    { id: 'free', name: 'Free', price: 'R0', features: ['Up to 3 workers', 'Basic dashboard', 'Email support'] },
    { id: 'business', name: 'Business', price: 'R199/mo', features: ['Unlimited workers', 'Full analytics', 'Priority support', 'Custom QR branding'], pop: true },
    { id: 'enterprise', name: 'Enterprise', price: 'Custom', features: ['All Business features', 'Dedicated account manager', 'SLA guarantee', 'API access'] },
  ];
  return (
    <div className="onb-screen screen-anim" style={{ display: 'flex', flexDirection: 'column', padding: '28px 22px' }}>
      <button onClick={back} style={{ background: 0, border: 0, cursor: 'pointer', alignSelf: 'flex-start', marginBottom: 8 }}><I.back size={22} color="var(--text)" /></button>
      <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.5px', marginTop: 8 }}>Choose a plan</div>
      <div style={{ fontSize: 14, color: 'var(--muted)', marginTop: 6 }}>Start free, upgrade any time.</div>
      <div style={{ marginTop: 20, flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {plans.map(p => (
          <button key={p.id} onClick={() => setPlan(p.id)}
            style={{ position: 'relative', padding: 16, borderRadius: 16, border: `2px solid ${plan === p.id ? '#5f93f2' : 'var(--line)'}`, background: plan === p.id ? 'rgba(95,147,242,0.07)' : '#fff', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
            {p.pop && <span style={{ position: 'absolute', top: 12, right: 12, fontSize: 10, fontWeight: 800, background: '#2f63e0', color: '#fff', padding: '3px 8px', borderRadius: 999 }}>POPULAR</span>}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
              <span style={{ fontWeight: 800, fontSize: 16 }}>{p.name}</span>
              <span style={{ fontWeight: 800, fontSize: 18, color: plan === p.id ? '#2f63e0' : 'var(--text)' }}>{p.price}</span>
            </div>
            {p.features.map((f, i) => (
              <div key={i} className="row gap6" style={{ marginBottom: 4 }}>
                <I.check size={14} color={plan === p.id ? '#2f63e0' : 'var(--muted)'} stroke={2.5} />
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>{f}</span>
              </div>
            ))}
          </button>
        ))}
      </div>
      <button className="btn" onClick={next} style={{ background: 'linear-gradient(150deg,#5f93f2,#2f63e0)', color: '#fff', boxShadow: '0 14px 26px -14px #2f63e0', marginTop: 16 }}>
        Start with {plans.find(p => p.id === plan)?.name}
      </button>
    </div>
  );
}

function SuccessScreen() {
  const navigate = useNavigate();
  return (
    <div className="onb-screen screen-anim" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '40px 28px', background: 'linear-gradient(170deg,#0d1f4c,#1a3a8a)', color: '#fff' }}>
      <div style={{ width: 100, height: 100, borderRadius: 50, background: 'rgba(95,147,242,0.2)', display: 'grid', placeItems: 'center', marginBottom: 24 }}>
        <I.check size={52} color="#7aaaff" stroke={3} />
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.6px' }}>You're ready to go!</div>
      <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.65)', marginTop: 10, lineHeight: 1.6, maxWidth: 280 }}>
        Your employer account is live. Invite your team and start tracking tips today.
      </div>
      <div style={{ marginTop: 32, width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button className="btn" onClick={() => navigate('/employer')} style={{ background: 'linear-gradient(150deg,#5f93f2,#2f63e0)', color: '#fff', boxShadow: '0 14px 26px -14px #2f63e0' }}>Open my dashboard</button>
        <button className="btn" onClick={() => navigate('/')} style={{ background: 'rgba(255,255,255,0.1)', color: '#fff' }}>Back to home</button>
      </div>
    </div>
  );
}

export default function EmployerOnboarding() {
  const [arcIdx, setArcIdx] = useState(0);
  const screen = ARC[arcIdx];
  const next = () => setArcIdx(i => Math.min(i + 1, ARC.length - 1));
  const back = () => setArcIdx(i => Math.max(i - 1, 0));
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      {!['welcome', 'tour', 'success'].includes(screen) && <ProgressBar screen={screen} />}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {screen === 'welcome' && <WelcomeScreen next={next} />}
        {screen === 'tour' && <TourScreen next={next} back={back} />}
        {screen === 'account' && <AccountScreen next={next} back={back} />}
        {screen === 'verify' && <VerifyScreen next={next} back={back} />}
        {screen === 'business' && <BusinessScreen next={next} back={back} />}
        {screen === 'venue' && <VenueScreen next={next} back={back} />}
        {screen === 'team' && <TeamScreen next={next} back={back} />}
        {screen === 'plan' && <PlanScreen next={next} back={back} />}
        {screen === 'success' && <SuccessScreen />}
      </div>
    </div>
  );
}
