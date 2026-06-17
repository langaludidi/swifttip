import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { I, Avatar } from '../../../components/ui.jsx';

const STEPS = ['phone', 'otp', 'profile', 'work', 'banking'];
const ARC = ['welcome', 'intro', 'phone', 'otp', 'profile', 'work', 'banking', 'permissions', 'success'];
const INTRO_SLIDES = [
  { icon: I.qr, title: 'Your own QR code', body: 'Customers scan your badge to tip you instantly — no cash, no fumbling.' },
  { icon: I.wallet, title: 'Wallet in your pocket', body: 'Tips land in your SwiftTip wallet the moment they\'re sent.' },
  { icon: I.bank, title: 'Payout any time', body: 'Request a bank transfer whenever you want — zero fees.' },
];

function ProgressBar({ screen }) {
  const idx = STEPS.indexOf(screen);
  if (idx < 0) return null;
  return (
    <div style={{ padding: '16px 22px 0' }}>
      <div style={{ display: 'flex', gap: 6 }}>
        {STEPS.map((s, i) => (
          <div key={s} style={{ flex: 1, height: 4, borderRadius: 3, background: i <= idx ? 'var(--accent)' : 'var(--line)', transition: 'background .3s' }} />
        ))}
      </div>
      <div style={{ marginTop: 6, fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>Step {idx + 1} of {STEPS.length}</div>
    </div>
  );
}

function WelcomeScreen({ next }) {
  return (
    <div className="onb-screen screen-anim" style={{ display: 'flex', flexDirection: 'column', background: 'linear-gradient(170deg,#052B36,#083C4A)', color: '#fff', padding: '60px 28px 36px' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 20 }}>
        <div style={{ width: 90, height: 90, borderRadius: 28, background: 'rgba(18,196,178,0.15)', border: '2px solid rgba(18,196,178,0.3)', display: 'grid', placeItems: 'center' }}>
          <I.wallet size={44} color="var(--accent)" />
        </div>
        <div>
          <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.6px' }}>Welcome to SwiftTip</div>
          <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.65)', marginTop: 10, lineHeight: 1.55 }}>
            The fastest way to receive tips from customers — no cash, no waiting.
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', marginTop: 8 }}>
          {['Get tipped instantly via QR', 'Free payouts to your bank', 'Your reputation, built over time'].map((t, i) => (
            <div key={i} className="row gap10">
              <div style={{ width: 28, height: 28, borderRadius: 9, background: 'rgba(18,196,178,0.15)', display: 'grid', placeItems: 'center', flex: '0 0 28px' }}>
                <I.check size={15} color="var(--accent)" stroke={3} />
              </div>
              <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>{t}</span>
            </div>
          ))}
        </div>
      </div>
      <button className="btn btn-primary" onClick={next} style={{ marginTop: 20 }}>Get started</button>
      <div style={{ textAlign: 'center', marginTop: 14, fontSize: 12.5, color: 'rgba(255,255,255,0.4)' }}>
        Takes about 3 minutes · POPIA compliant
      </div>
    </div>
  );
}

function IntroScreen({ next, back }) {
  const [slide, setSlide] = useState(0);
  const s = INTRO_SLIDES[slide];
  const Ic = s.icon;
  return (
    <div className="onb-screen screen-anim" style={{ display: 'flex', flexDirection: 'column', background: 'linear-gradient(170deg,#052B36,#083C4A)', color: '#fff', padding: '50px 28px 36px' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 24 }}>
        <div style={{ width: 100, height: 100, borderRadius: 30, background: 'rgba(18,196,178,0.12)', border: '2px solid rgba(18,196,178,0.2)', display: 'grid', placeItems: 'center' }}>
          <Ic size={48} color="var(--accent)" />
        </div>
        <div>
          <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.5px' }}>{s.title}</div>
          <div style={{ fontSize: 14.5, color: 'rgba(255,255,255,0.65)', marginTop: 10, lineHeight: 1.6, maxWidth: 280 }}>{s.body}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {INTRO_SLIDES.map((_, i) => (
            <button key={i} onClick={() => setSlide(i)} style={{ width: i === slide ? 22 : 8, height: 8, borderRadius: 4, background: i === slide ? 'var(--accent)' : 'rgba(255,255,255,0.2)', border: 0, cursor: 'pointer', transition: 'all .25s', padding: 0 }} />
          ))}
        </div>
      </div>
      <div className="row gap10">
        <button className="btn btn-dark" style={{ flex: '0 0 auto', width: 'auto', padding: '16px 20px' }} onClick={back}>
          <I.back size={18} color="#fff" />
        </button>
        {slide < INTRO_SLIDES.length - 1
          ? <button className="btn btn-dark" style={{ flex: 1 }} onClick={() => setSlide(s => s + 1)}>Next</button>
          : <button className="btn btn-primary" style={{ flex: 1 }} onClick={next}>Let's set up your account</button>
        }
      </div>
    </div>
  );
}

function PhoneScreen({ next, back }) {
  const [phone, setPhone] = useState('');
  return (
    <div className="onb-screen screen-anim" style={{ display: 'flex', flexDirection: 'column', padding: '28px 22px' }}>
      <button onClick={back} style={{ background: 0, border: 0, cursor: 'pointer', alignSelf: 'flex-start', marginBottom: 8 }}><I.back size={22} color="var(--text)" /></button>
      <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.5px', marginTop: 8 }}>What's your phone number?</div>
      <div style={{ fontSize: 14, color: 'var(--muted)', marginTop: 6, lineHeight: 1.5 }}>We'll send you a one-time code to verify your number.</div>
      <div style={{ marginTop: 28 }}>
        <div className="field">
          <label>Phone number</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ background: '#fff', border: '1.5px solid var(--line)', borderRadius: 12, padding: '13px 14px', fontWeight: 700, fontSize: 15, whiteSpace: 'nowrap' }}>🇿🇦 +27</div>
            <input className="input" type="tel" inputMode="numeric" placeholder="081 234 5678" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g,'').slice(0,10))} style={{ flex: 1 }} autoFocus />
          </div>
        </div>
      </div>
      <div style={{ flex: 1 }} />
      <button className={'btn ' + (phone.length >= 9 ? 'btn-primary' : 'btn-disabled')} disabled={phone.length < 9} onClick={next}>Send OTP</button>
      <div style={{ textAlign: 'center', marginTop: 12, fontSize: 12, color: 'var(--muted)' }}>Standard SMS rates may apply</div>
    </div>
  );
}

function OtpScreen({ next, back }) {
  const [otp, setOtp] = useState(['', '', '', '']);
  const [error, setError] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const refs = [useRef(), useRef(), useRef(), useRef()];
  const code = otp.join('');

  useEffect(() => {
    setTimeout(() => {
      setOtp(['4', '3', '2', '1']);
    }, 1200);
  }, []);

  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [countdown]);

  const change = (i, v) => {
    const d = v.replace(/\D/g,'').slice(-1);
    const next_ = [...otp];
    next_[i] = d;
    setOtp(next_);
    setError(false);
    if (d && i < 3) refs[i + 1].current?.focus();
  };

  const verify = () => {
    if (code === '4321') { next(); return; }
    setError(true);
    setOtp(['', '', '', '']);
    refs[0].current?.focus();
  };

  return (
    <div className="onb-screen screen-anim" style={{ display: 'flex', flexDirection: 'column', padding: '28px 22px' }}>
      <button onClick={back} style={{ background: 0, border: 0, cursor: 'pointer', alignSelf: 'flex-start', marginBottom: 8 }}><I.back size={22} color="var(--text)" /></button>
      <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.5px', marginTop: 8 }}>Enter the code</div>
      <div style={{ fontSize: 14, color: 'var(--muted)', marginTop: 6 }}>We sent a 4-digit code to your number. <span style={{ color: 'var(--muted-2)', fontSize: 12 }}>(demo: 4321)</span></div>
      <div className={'otp-row' + (error ? ' shake' : '')} style={{ display: 'flex', gap: 12, justifyContent: 'center', margin: '36px 0' }}>
        {otp.map((v, i) => (
          <input key={i} ref={refs[i]} className="otp-box input" value={v} maxLength={1} inputMode="numeric"
            onChange={e => change(i, e.target.value)}
            onKeyDown={e => { if (e.key === 'Backspace' && !v && i > 0) refs[i-1].current?.focus(); }}
            style={{ width: 60, height: 68, textAlign: 'center', fontSize: 28, fontWeight: 800, borderColor: error ? 'var(--danger)' : v ? 'var(--accent)' : undefined }} />
        ))}
      </div>
      {error && <div style={{ color: 'var(--danger)', fontSize: 13.5, fontWeight: 600, textAlign: 'center', marginBottom: 12 }}>Wrong code — try again</div>}
      <div style={{ flex: 1 }} />
      <button className={'btn ' + (code.length === 4 ? 'btn-primary' : 'btn-disabled')} disabled={code.length < 4} onClick={verify}>Verify</button>
      <button style={{ background: 0, border: 0, cursor: countdown > 0 ? 'default' : 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, color: countdown > 0 ? 'var(--muted-2)' : 'var(--accent-600)', marginTop: 14, textAlign: 'center' }}
        disabled={countdown > 0} onClick={() => setCountdown(30)}>
        {countdown > 0 ? `Resend in ${countdown}s` : 'Resend code'}
      </button>
    </div>
  );
}

function ProfileScreen({ next, back }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  return (
    <div className="onb-screen screen-anim" style={{ display: 'flex', flexDirection: 'column', padding: '28px 22px' }}>
      <button onClick={back} style={{ background: 0, border: 0, cursor: 'pointer', alignSelf: 'flex-start', marginBottom: 8 }}><I.back size={22} color="var(--text)" /></button>
      <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.5px', marginTop: 8 }}>Your profile</div>
      <div style={{ fontSize: 14, color: 'var(--muted)', marginTop: 6 }}>Customers will see this when they tip you.</div>
      <div style={{ marginTop: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <div style={{ position: 'relative' }}>
            <Avatar name={name || 'You'} color="teal" size={80} />
            <button style={{ position: 'absolute', bottom: -4, right: -4, width: 28, height: 28, borderRadius: 9, background: 'var(--accent)', border: '2px solid #fff', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
              <I.camera size={14} color="#fff" />
            </button>
          </div>
        </div>
        <div className="field"><label>Full name</label><input className="input" placeholder="e.g. Sipho Dlamini" value={name} onChange={e => setName(e.target.value)} autoFocus /></div>
        <div className="field"><label>Email (optional)</label><input className="input" type="email" placeholder="sipho@example.com" value={email} onChange={e => setEmail(e.target.value)} /></div>
      </div>
      <div style={{ flex: 1 }} />
      <button className={'btn ' + (name.length >= 2 ? 'btn-primary' : 'btn-disabled')} disabled={name.length < 2} onClick={next}>Continue</button>
    </div>
  );
}

function WorkScreen({ next, back }) {
  const [role, setRole] = useState('');
  const [employer, setEmployer] = useState('');
  const roles = ['Bartender', 'Waiter / Waitress', 'Receptionist', 'Housekeeper', 'Porter', 'Other'];
  return (
    <div className="onb-screen screen-anim" style={{ display: 'flex', flexDirection: 'column', padding: '28px 22px' }}>
      <button onClick={back} style={{ background: 0, border: 0, cursor: 'pointer', alignSelf: 'flex-start', marginBottom: 8 }}><I.back size={22} color="var(--text)" /></button>
      <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.5px', marginTop: 8 }}>Where do you work?</div>
      <div style={{ fontSize: 14, color: 'var(--muted)', marginTop: 6 }}>This helps customers find you.</div>
      <div style={{ marginTop: 24, flex: 1 }}>
        <div className="field"><label>Employer / venue name</label><input className="input" placeholder="e.g. The Grand Hotel" value={employer} onChange={e => setEmployer(e.target.value)} /></div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Your role</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 2 }}>
            {roles.map(r => (
              <button key={r} onClick={() => setRole(r)}
                style={{ padding: '12px 10px', borderRadius: 12, border: `1.5px solid ${role === r ? 'var(--accent)' : 'var(--line)'}`, background: role === r ? 'rgba(18,196,178,0.08)' : '#fff', fontFamily: 'inherit', fontWeight: 600, fontSize: 13.5, color: role === r ? 'var(--accent-600)' : 'var(--text)', cursor: 'pointer', textAlign: 'center' }}>
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>
      <button className={'btn ' + (role && employer ? 'btn-primary' : 'btn-disabled')} disabled={!role || !employer} onClick={next} style={{ marginTop: 20 }}>Continue</button>
    </div>
  );
}

function BankingScreen({ next, back }) {
  const [bank, setBank] = useState('');
  const [accNo, setAccNo] = useState('');
  const banks = ['Capitec', 'FNB', 'Standard Bank', 'ABSA', 'Nedbank', 'Tyme Bank'];
  return (
    <div className="onb-screen screen-anim" style={{ display: 'flex', flexDirection: 'column', padding: '28px 22px' }}>
      <button onClick={back} style={{ background: 0, border: 0, cursor: 'pointer', alignSelf: 'flex-start', marginBottom: 8 }}><I.back size={22} color="var(--text)" /></button>
      <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.5px', marginTop: 8 }}>Payout account</div>
      <div style={{ fontSize: 14, color: 'var(--muted)', marginTop: 6 }}>Where should we send your tips?</div>
      <div style={{ marginTop: 24, flex: 1 }}>
        <div className="field">
          <label>Bank</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {banks.map(b => (
              <button key={b} onClick={() => setBank(b)}
                style={{ padding: '9px 16px', borderRadius: 999, border: `1.5px solid ${bank === b ? 'var(--accent)' : 'var(--line)'}`, background: bank === b ? 'var(--accent-600)' : '#fff', fontFamily: 'inherit', fontWeight: 700, fontSize: 13, color: bank === b ? '#fff' : 'var(--text)', cursor: 'pointer' }}>
                {b}
              </button>
            ))}
          </div>
        </div>
        <div className="field"><label>Account number</label><input className="input" inputMode="numeric" placeholder="1234567890" value={accNo} onChange={e => setAccNo(e.target.value.replace(/\D/g,'').slice(0,11))} /></div>
        <div style={{ padding: 14, borderRadius: 12, background: 'rgba(18,196,178,0.07)', border: '1px solid rgba(18,196,178,0.2)', fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>
          <I.lock size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />Your banking details are encrypted and never shared with employers.
        </div>
      </div>
      <button className={'btn ' + (bank && accNo.length >= 8 ? 'btn-primary' : 'btn-disabled')} disabled={!bank || accNo.length < 8} onClick={next}>Save & continue</button>
    </div>
  );
}

function PermissionsScreen({ next, back }) {
  const [perms, setPerms] = useState({ camera: false, notifications: false });
  const toggle = (k) => setPerms(p => ({ ...p, [k]: !p[k] }));
  return (
    <div className="onb-screen screen-anim" style={{ display: 'flex', flexDirection: 'column', padding: '28px 22px' }}>
      <button onClick={back} style={{ background: 0, border: 0, cursor: 'pointer', alignSelf: 'flex-start', marginBottom: 8 }}><I.back size={22} color="var(--text)" /></button>
      <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.5px', marginTop: 8 }}>A couple of permissions</div>
      <div style={{ fontSize: 14, color: 'var(--muted)', marginTop: 6 }}>These make SwiftTip work best for you.</div>
      <div style={{ marginTop: 28, flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {[
          { k: 'notifications', icon: I.bell, title: 'Push notifications', body: 'Get alerted the moment a tip lands — real time.' },
          { k: 'camera', icon: I.camera, title: 'Camera access', body: 'Scan QR codes quickly when tipping others.' },
        ].map(p => {
          const Ic = p.icon; const on = perms[p.k];
          return (
            <div key={p.k} className="card" style={{ display: 'flex', gap: 14, alignItems: 'center', padding: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: on ? 'rgba(18,196,178,0.12)' : '#f3f9fa', display: 'grid', placeItems: 'center', flex: '0 0 48px' }}>
                <Ic size={24} color={on ? 'var(--accent-600)' : 'var(--muted)'} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{p.title}</div>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>{p.body}</div>
              </div>
              <button onClick={() => toggle(p.k)} style={{ width: 50, height: 28, borderRadius: 999, border: 0, cursor: 'pointer', background: on ? 'var(--accent)' : 'var(--line)', position: 'relative', transition: 'background .2s' }}>
                <span style={{ position: 'absolute', top: 3, left: on ? 24 : 3, width: 22, height: 22, borderRadius: '50%', background: '#fff', transition: 'left .2s', boxShadow: '0 2px 6px rgba(0,0,0,0.15)' }} />
              </button>
            </div>
          );
        })}
      </div>
      <button className="btn btn-primary" onClick={next}>Continue</button>
      <button style={{ background: 0, border: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, color: 'var(--muted)', marginTop: 12, textAlign: 'center' }} onClick={next}>Skip for now</button>
    </div>
  );
}

function SuccessScreen() {
  const navigate = useNavigate();
  return (
    <div className="onb-screen screen-anim" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '40px 28px', background: 'linear-gradient(170deg,#052B36,#083C4A)', color: '#fff' }}>
      <div style={{ width: 100, height: 100, borderRadius: 50, background: 'rgba(18,196,178,0.18)', display: 'grid', placeItems: 'center', marginBottom: 24 }}>
        <I.check size={52} color="var(--accent)" stroke={3} />
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.6px' }}>You're all set!</div>
      <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.65)', marginTop: 10, lineHeight: 1.6, maxWidth: 280 }}>
        Your SwiftTip profile is live. Share your QR code to start receiving tips instantly.
      </div>
      <div style={{ marginTop: 32, width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button className="btn btn-primary" onClick={() => navigate('/worker')}>Go to my dashboard</button>
        <button className="btn btn-dark" onClick={() => navigate('/')}>Back to home</button>
      </div>
    </div>
  );
}

export default function WorkerOnboarding() {
  const [arcIdx, setArcIdx] = useState(0);
  const screen = ARC[arcIdx];
  const next = () => setArcIdx(i => Math.min(i + 1, ARC.length - 1));
  const back = () => setArcIdx(i => Math.max(i - 1, 0));

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      {!['welcome', 'intro', 'success'].includes(screen) && <ProgressBar screen={screen} />}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {screen === 'welcome' && <WelcomeScreen next={next} />}
        {screen === 'intro' && <IntroScreen next={next} back={back} />}
        {screen === 'phone' && <PhoneScreen next={next} back={back} />}
        {screen === 'otp' && <OtpScreen next={next} back={back} />}
        {screen === 'profile' && <ProfileScreen next={next} back={back} />}
        {screen === 'work' && <WorkScreen next={next} back={back} />}
        {screen === 'banking' && <BankingScreen next={next} back={back} />}
        {screen === 'permissions' && <PermissionsScreen next={next} back={back} />}
        {screen === 'success' && <SuccessScreen />}
      </div>
    </div>
  );
}
