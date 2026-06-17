import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { I } from '../../../components/ui.jsx';

const ARC = ['welcome', 'invite', 'identity', 'twofa', 'security', 'tour', 'success'];
const SETUP_STEPS = ['invite', 'identity', 'twofa', 'security'];
const ACCENT = '#6366F1';
const ACCENT_2 = '#4F46E5';
const TOUR_SLIDES = [
  { icon: I.users, title: 'Worker & employer oversight', body: 'Review registrations, suspend bad actors, and manage the full network.' },
  { icon: I.flag, title: 'Fraud monitoring', body: 'Unusual tip patterns are flagged automatically for your review.' },
  { icon: I.bank, title: 'Payout console', body: 'Approve or reject payout requests with full audit trail.' },
];

function ProgressBar({ screen }) {
  const idx = SETUP_STEPS.indexOf(screen);
  if (idx < 0) return null;
  return (
    <div style={{ padding: '16px 22px 0' }}>
      <div style={{ display: 'flex', gap: 6 }}>
        {SETUP_STEPS.map((_, i) => (
          <div key={i} style={{ flex: 1, height: 4, borderRadius: 3, background: i <= idx ? ACCENT : 'var(--line)', transition: 'background .3s' }} />
        ))}
      </div>
      <div style={{ marginTop: 6, fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>Step {idx + 1} of {SETUP_STEPS.length}</div>
    </div>
  );
}

function WelcomeScreen({ next }) {
  return (
    <div className="onb-screen screen-anim" style={{ display: 'flex', flexDirection: 'column', background: 'linear-gradient(170deg,#1e1050,#2e1a6e)', color: '#fff', padding: '60px 28px 36px' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 20 }}>
        <div style={{ width: 90, height: 90, borderRadius: 28, background: 'rgba(99,102,241,0.2)', border: `2px solid rgba(99,102,241,0.35)`, display: 'grid', placeItems: 'center' }}>
          <I.shield size={44} color="#a78bfa" />
        </div>
        <div>
          <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.6px' }}>Platform Admin</div>
          <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.65)', marginTop: 10, lineHeight: 1.55 }}>
            Invite-only access. You're setting up the highest privilege account on SwiftTip.
          </div>
        </div>
        {['Full network visibility', 'Payout approval authority', 'Fraud investigation tools'].map((t, i) => (
          <div key={i} className="row gap10" style={{ width: '100%' }}>
            <div style={{ width: 28, height: 28, borderRadius: 9, background: 'rgba(99,102,241,0.2)', display: 'grid', placeItems: 'center', flex: '0 0 28px' }}>
              <I.check size={15} color="#a78bfa" stroke={3} />
            </div>
            <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>{t}</span>
          </div>
        ))}
      </div>
      <button className="btn" onClick={next} style={{ background: `linear-gradient(150deg,${ACCENT},${ACCENT_2})`, color: '#fff', boxShadow: `0 14px 26px -14px ${ACCENT_2}`, marginTop: 20 }}>Enter invite code</button>
    </div>
  );
}

function InviteScreen({ next, back }) {
  const [code, setCode] = useState(['', '', '', '']);
  const [error, setError] = useState(false);
  const refs = [useRef(), useRef(), useRef(), useRef()];
  const joined = code.join('');

  useEffect(() => {
    setTimeout(() => setCode(['S', 'W', 'T', '9']), 1200);
  }, []);

  const change = (i, v) => {
    const d = v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(-1);
    const next_ = [...code]; next_[i] = d; setCode(next_); setError(false);
    if (d && i < 3) refs[i+1].current?.focus();
  };

  const verify = () => {
    if (joined === 'SWT9') { next(); return; }
    setError(true); setCode(['','','','']); refs[0].current?.focus();
  };

  return (
    <div className="onb-screen screen-anim" style={{ display: 'flex', flexDirection: 'column', padding: '28px 22px' }}>
      <button onClick={back} style={{ background: 0, border: 0, cursor: 'pointer', alignSelf: 'flex-start', marginBottom: 8 }}><I.back size={22} color="var(--text)" /></button>
      <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.5px', marginTop: 8 }}>Enter invite code</div>
      <div style={{ fontSize: 14, color: 'var(--muted)', marginTop: 6 }}>Your 4-character admin invite code. <span style={{ color: 'var(--muted-2)', fontSize: 12 }}>(demo: SWT9)</span></div>
      <div className={'otp-row' + (error ? ' shake' : '')} style={{ display: 'flex', gap: 12, justifyContent: 'center', margin: '36px 0' }}>
        {code.map((v, i) => (
          <input key={i} ref={refs[i]} className="otp-box input" value={v} maxLength={1}
            onChange={e => change(i, e.target.value)}
            onKeyDown={e => { if (e.key === 'Backspace' && !v && i > 0) refs[i-1].current?.focus(); }}
            style={{ width: 60, height: 68, textAlign: 'center', fontSize: 28, fontWeight: 800, letterSpacing: 2, borderColor: error ? 'var(--danger)' : v ? ACCENT : undefined }} />
        ))}
      </div>
      {error && <div style={{ color: 'var(--danger)', fontSize: 13.5, fontWeight: 600, textAlign: 'center', marginBottom: 12 }}>Invalid invite code</div>}
      <div style={{ flex: 1 }} />
      <button className={'btn ' + (joined.length === 4 ? '' : 'btn-disabled')}
        style={{ background: joined.length === 4 ? `linear-gradient(150deg,${ACCENT},${ACCENT_2})` : undefined, color: '#fff', boxShadow: joined.length === 4 ? `0 14px 26px -14px ${ACCENT_2}` : 'none' }}
        disabled={joined.length < 4} onClick={verify}>Verify code</button>
    </div>
  );
}

function IdentityScreen({ next, back }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);

  const strength = (() => {
    if (!password) return 0;
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  })();
  const labels = ['Too weak', 'Weak', 'Fair', 'Strong', 'Excellent'];
  const colors = ['#EF4444', '#F59E0B', '#F59E0B', '#22C55E', '#22C55E'];

  return (
    <div className="onb-screen screen-anim" style={{ display: 'flex', flexDirection: 'column', padding: '28px 22px' }}>
      <button onClick={back} style={{ background: 0, border: 0, cursor: 'pointer', alignSelf: 'flex-start', marginBottom: 8 }}><I.back size={22} color="var(--text)" /></button>
      <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.5px', marginTop: 8 }}>Create a strong password</div>
      <div style={{ fontSize: 14, color: 'var(--muted)', marginTop: 6 }}>Admin accounts require a very strong password.</div>
      <div style={{ marginTop: 24, flex: 1 }}>
        <div className="field">
          <label>Password</label>
          <div style={{ position: 'relative' }}>
            <input className="input" type={show ? 'text' : 'password'} placeholder="Minimum 8 characters" value={password} onChange={e => setPassword(e.target.value)} style={{ paddingRight: 44 }} autoFocus />
            <button onClick={() => setShow(v => !v)} style={{ position: 'absolute', right: 12, top: 12, background: 0, border: 0, cursor: 'pointer' }}><I.eye size={20} color="var(--muted-2)" /></button>
          </div>
          {password && (
            <div style={{ marginTop: 10 }}>
              <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                {[0,1,2,3].map(i => (
                  <div key={i} style={{ flex: 1, height: 5, borderRadius: 3, background: i < strength ? colors[strength] : 'var(--line)', transition: 'background .2s' }} />
                ))}
              </div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: colors[strength] }}>{labels[strength]}</div>
            </div>
          )}
        </div>
        <div className="field">
          <label>Confirm password</label>
          <input className="input" type="password" placeholder="Re-enter password" value={confirm} onChange={e => setConfirm(e.target.value)} />
          {confirm && password !== confirm && <div style={{ fontSize: 12.5, color: 'var(--danger)', marginTop: 4 }}>Passwords don't match</div>}
        </div>
      </div>
      <button className={'btn ' + (strength >= 3 && password === confirm && confirm ? '' : 'btn-disabled')}
        style={{ background: strength >= 3 && password === confirm && confirm ? `linear-gradient(150deg,${ACCENT},${ACCENT_2})` : undefined, color: '#fff', boxShadow: strength >= 3 && password === confirm && confirm ? `0 14px 26px -14px ${ACCENT_2}` : 'none' }}
        disabled={strength < 3 || password !== confirm || !confirm} onClick={next}>Continue</button>
    </div>
  );
}

function TwoFAScreen({ next, back }) {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const r0 = useRef(), r1 = useRef(), r2 = useRef(), r3 = useRef(), r4 = useRef(), r5 = useRef();
  const refs = [r0, r1, r2, r3, r4, r5];
  const code = otp.join('');

  const change = (i, v) => {
    const d = v.replace(/\D/g,'').slice(-1);
    const n = [...otp]; n[i] = d; setOtp(n);
    if (d && i < 5) refs[i+1].current?.focus();
  };

  return (
    <div className="onb-screen screen-anim" style={{ display: 'flex', flexDirection: 'column', padding: '28px 22px' }}>
      <button onClick={back} style={{ background: 0, border: 0, cursor: 'pointer', alignSelf: 'flex-start', marginBottom: 8 }}><I.back size={22} color="var(--text)" /></button>
      <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.5px', marginTop: 8 }}>Set up two-factor auth</div>
      <div style={{ fontSize: 14, color: 'var(--muted)', marginTop: 6 }}>Scan this QR with your authenticator app, then enter the 6-digit code.</div>
      <div style={{ marginTop: 24, flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <div style={{ width: 140, height: 140, background: '#fff', borderRadius: 16, padding: 12, boxShadow: '0 4px 18px -8px rgba(8,60,74,0.3)', display: 'grid', placeItems: 'center' }}>
            <svg viewBox="0 0 100 100" width={116} height={116}>
              <rect x="5" y="5" width="30" height="30" fill="none" stroke="#1e1050" strokeWidth="4"/>
              <rect x="12" y="12" width="16" height="16" fill="#1e1050"/>
              <rect x="65" y="5" width="30" height="30" fill="none" stroke="#1e1050" strokeWidth="4"/>
              <rect x="72" y="12" width="16" height="16" fill="#1e1050"/>
              <rect x="5" y="65" width="30" height="30" fill="none" stroke="#1e1050" strokeWidth="4"/>
              <rect x="12" y="72" width="16" height="16" fill="#1e1050"/>
              {[45,50,55,60,65,70].map((x, i) =>
                [45,50,55,60,65,70].filter((_, j) => (i + j) % 2 === 0).map((y, j) => (
                  <rect key={`${i}${j}`} x={x} y={y} width="4" height="4" fill="#4F46E5" opacity={0.7} />
                ))
              )}
            </svg>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 10 }}>
          {otp.map((v, i) => (
            <input key={i} ref={refs[i]} className="input" value={v} maxLength={1} inputMode="numeric"
              onChange={e => change(i, e.target.value)}
              onKeyDown={e => { if (e.key === 'Backspace' && !v && i > 0) refs[i-1].current?.focus(); }}
              style={{ width: 44, height: 54, textAlign: 'center', fontSize: 22, fontWeight: 800, padding: '0 4px', borderColor: v ? ACCENT : undefined }} />
          ))}
        </div>
        <div style={{ textAlign: 'center', fontSize: 12.5, color: 'var(--muted)' }}>Enter any 6-digit code to proceed (demo)</div>
      </div>
      <button className={'btn ' + (code.length === 6 ? '' : 'btn-disabled')}
        style={{ background: code.length === 6 ? `linear-gradient(150deg,${ACCENT},${ACCENT_2})` : undefined, color: '#fff', boxShadow: code.length === 6 ? `0 14px 26px -14px ${ACCENT_2}` : 'none' }}
        disabled={code.length < 6} onClick={next}>Verify & enable 2FA</button>
    </div>
  );
}

function SecurityScreen({ next, back }) {
  const [checked, setChecked] = useState([false, false, false]);
  const duties = [
    { title: 'Data protection responsibility', body: 'I understand I am responsible for protecting user data under POPIA.' },
    { title: 'Payout authority', body: 'I will only approve payouts after verifying worker identity and bank details.' },
    { title: 'Access control', body: 'I will not share my admin credentials or invite codes.' },
  ];
  const allChecked = checked.every(Boolean);
  const toggle = (i) => setChecked(c => c.map((v, j) => j === i ? !v : v));
  return (
    <div className="onb-screen screen-anim" style={{ display: 'flex', flexDirection: 'column', padding: '28px 22px' }}>
      <button onClick={back} style={{ background: 0, border: 0, cursor: 'pointer', alignSelf: 'flex-start', marginBottom: 8 }}><I.back size={22} color="var(--text)" /></button>
      <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.5px', marginTop: 8 }}>Security responsibilities</div>
      <div style={{ fontSize: 14, color: 'var(--muted)', marginTop: 6 }}>Please confirm you understand your duties as a platform admin.</div>
      <div style={{ marginTop: 24, flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {duties.map((d, i) => (
          <button key={i} onClick={() => toggle(i)}
            style={{ padding: 16, borderRadius: 14, border: `1.5px solid ${checked[i] ? ACCENT : 'var(--line)'}`, background: checked[i] ? 'rgba(99,102,241,0.07)' : '#fff', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ width: 24, height: 24, borderRadius: 7, border: `2px solid ${checked[i] ? ACCENT : 'var(--line)'}`, background: checked[i] ? ACCENT : 'transparent', display: 'grid', placeItems: 'center', flex: '0 0 24px', marginTop: 1, transition: 'all .15s' }}>
              {checked[i] && <I.check size={13} color="#fff" stroke={3} />}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{d.title}</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4, lineHeight: 1.45 }}>{d.body}</div>
            </div>
          </button>
        ))}
      </div>
      <button className={'btn ' + (allChecked ? '' : 'btn-disabled')}
        style={{ marginTop: 20, background: allChecked ? `linear-gradient(150deg,${ACCENT},${ACCENT_2})` : undefined, color: '#fff', boxShadow: allChecked ? `0 14px 26px -14px ${ACCENT_2}` : 'none' }}
        disabled={!allChecked} onClick={next}>I understand — continue</button>
    </div>
  );
}

function TourScreen({ next, back }) {
  const [slide, setSlide] = useState(0);
  const s = TOUR_SLIDES[slide];
  const Ic = s.icon;
  return (
    <div className="onb-screen screen-anim" style={{ display: 'flex', flexDirection: 'column', background: 'linear-gradient(170deg,#1e1050,#2e1a6e)', color: '#fff', padding: '50px 28px 36px' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 24 }}>
        <div style={{ width: 100, height: 100, borderRadius: 30, background: 'rgba(99,102,241,0.15)', border: '2px solid rgba(99,102,241,0.25)', display: 'grid', placeItems: 'center' }}>
          <Ic size={48} color="#a78bfa" />
        </div>
        <div>
          <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.5px' }}>{s.title}</div>
          <div style={{ fontSize: 14.5, color: 'rgba(255,255,255,0.65)', marginTop: 10, lineHeight: 1.6, maxWidth: 280 }}>{s.body}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {TOUR_SLIDES.map((_, i) => (
            <button key={i} onClick={() => setSlide(i)} style={{ width: i === slide ? 22 : 8, height: 8, borderRadius: 4, background: i === slide ? '#a78bfa' : 'rgba(255,255,255,0.2)', border: 0, cursor: 'pointer', transition: 'all .25s', padding: 0 }} />
          ))}
        </div>
      </div>
      <div className="row gap10">
        <button className="btn" style={{ flex: '0 0 auto', width: 'auto', padding: '16px 20px', background: 'rgba(255,255,255,0.1)', color: '#fff' }} onClick={back}>
          <I.back size={18} color="#fff" />
        </button>
        {slide < TOUR_SLIDES.length - 1
          ? <button className="btn" style={{ flex: 1, background: 'rgba(255,255,255,0.1)', color: '#fff' }} onClick={() => setSlide(s => s + 1)}>Next</button>
          : <button className="btn" onClick={next} style={{ flex: 1, background: `linear-gradient(150deg,${ACCENT},${ACCENT_2})`, color: '#fff', boxShadow: `0 14px 26px -14px ${ACCENT_2}` }}>Enter the console</button>
        }
      </div>
    </div>
  );
}

function SuccessScreen() {
  const navigate = useNavigate();
  return (
    <div className="onb-screen screen-anim" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '40px 28px', background: 'linear-gradient(170deg,#1e1050,#2e1a6e)', color: '#fff' }}>
      <div style={{ width: 100, height: 100, borderRadius: 50, background: 'rgba(99,102,241,0.2)', display: 'grid', placeItems: 'center', marginBottom: 24 }}>
        <I.shield size={52} color="#a78bfa" />
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.6px' }}>Access granted.</div>
      <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.65)', marginTop: 10, lineHeight: 1.6, maxWidth: 280 }}>
        Welcome to the SwiftTip platform console. Use your powers wisely.
      </div>
      <div style={{ marginTop: 32, width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button className="btn" onClick={() => navigate('/admin')} style={{ background: `linear-gradient(150deg,${ACCENT},${ACCENT_2})`, color: '#fff', boxShadow: `0 14px 26px -14px ${ACCENT_2}` }}>Open admin console</button>
        <button className="btn" onClick={() => navigate('/')} style={{ background: 'rgba(255,255,255,0.1)', color: '#fff' }}>Back to home</button>
      </div>
    </div>
  );
}

export default function AdminOnboarding() {
  const [arcIdx, setArcIdx] = useState(0);
  const screen = ARC[arcIdx];
  const next = () => setArcIdx(i => Math.min(i + 1, ARC.length - 1));
  const back = () => setArcIdx(i => Math.max(i - 1, 0));
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', '--accent': ACCENT, '--accent-600': ACCENT_2 }}>
      {!['welcome', 'tour', 'success'].includes(screen) && <ProgressBar screen={screen} />}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {screen === 'welcome' && <WelcomeScreen next={next} />}
        {screen === 'invite' && <InviteScreen next={next} back={back} />}
        {screen === 'identity' && <IdentityScreen next={next} back={back} />}
        {screen === 'twofa' && <TwoFAScreen next={next} back={back} />}
        {screen === 'security' && <SecurityScreen next={next} back={back} />}
        {screen === 'tour' && <TourScreen next={next} back={back} />}
        {screen === 'success' && <SuccessScreen />}
      </div>
    </div>
  );
}
