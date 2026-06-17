import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { I, QRCode } from '../../../components/ui.jsx';
import { AdminWelcomeScene, TourArtKyc, TourArtFraud, TourArtConsole, AdmConfetti } from './AdminArt.jsx';

const ARC = ['welcome', 'invite', 'identity', 'twofa', 'security', 'tour', 'success'];
const SETUP = ['invite', 'identity', 'twofa', 'security'];
const ACCENT = '#6366F1';
const ACCENT_2 = '#4F46E5';

const TOUR = [
  { art: 'kyc',     title: 'Approve workers fast',    sub: 'Review KYC documents and verify identities so workers can start earning.' },
  { art: 'fraud',   title: 'Catch fraud early',        sub: 'A live risk view flags suspicious activity before it costs anyone.' },
  { art: 'console', title: 'Run the whole network',   sub: 'Disputes, refunds and platform health — every lever in one console.' },
];
const DUTIES = [
  { t: 'Handle data lawfully',  s: 'Access personal & banking data only as needed, per POPIA.' },
  { t: 'Least privilege',       s: 'Use the minimum access required for each task.' },
  { t: 'Everything is audited', s: 'Every privileged action is logged and reviewable.' },
];

function ProgressHeader({ step, onBack }) {
  const idx = SETUP.indexOf(step);
  const pct = ((idx + 1) / SETUP.length) * 100;
  return (
    <div className="onb-prog-head">
      <button className="onb-iconbtn-light" onClick={onBack} aria-label="Back"><I.back size={20} /></button>
      <div className="onb-prog-bar"><i style={{ width: pct + '%', background: `linear-gradient(90deg,${ACCENT},${ACCENT_2})` }} /></div>
      <div className="onb-prog-step">Step {idx + 1} of {SETUP.length}</div>
    </div>
  );
}

function WelcomeScreen({ next }) {
  return (
    <div className="onb-screen onb-scene screen-anim" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AdminWelcomeScene />
      <div className="onb-sheet">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: '-0.3px', color: '#fff' }}>SwiftTip</span>
          <span style={{ fontWeight: 800, fontSize: 16, color: 'rgba(165,180,252,1)' }}>Admin</span>
          <span className="badge" style={{ marginLeft: 'auto', background: 'rgba(99,102,241,0.22)', color: '#c7d2fe', border: '1px solid rgba(99,102,241,0.3)' }}>Invite only</span>
        </div>
        <h2 style={{ color: '#fff', fontSize: 22, fontWeight: 800, letterSpacing: '-0.4px', marginBottom: 8 }}>You've been invited to operate SwiftTip.</h2>
        <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 14, lineHeight: 1.55, marginBottom: 20 }}>
          You're joining as a <b style={{ color: '#fff' }}>Platform Admin</b> — invited by Naledi Khumalo. Let's secure your access.
        </p>
        <button className="btn" onClick={next} style={{ background: `linear-gradient(150deg,${ACCENT},${ACCENT_2})`, color: '#fff', boxShadow: `0 14px 26px -14px ${ACCENT_2}` }}>
          Accept invitation <I.chevR size={18} color="#fff" />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontSize: 11.5, color: 'rgba(255,255,255,0.5)', marginTop: 12 }}>
          <I.lock size={12} color="rgba(255,255,255,0.5)" /> Invitation expires in 24 hours
        </div>
      </div>
    </div>
  );
}

function InviteScreen({ next, back }) {
  const [code, setCode] = useState('');
  const fired = useRef(false);
  const [verifying, setVerifying] = useState(false);
  const filled = code.length;

  useEffect(() => {
    let i = 0; const target = 'SWT9';
    const id = setInterval(() => { i++; setCode(target.slice(0, i)); if (i >= 4) clearInterval(id); }, 230);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (filled === 4 && !fired.current) {
      fired.current = true; setVerifying(true);
      const id = setTimeout(next, 850); return () => clearTimeout(id);
    }
  }, [filled]);

  const press = (k) => {
    if (fired.current) return;
    if (k === 'del') setCode(c => c.slice(0, -1));
    else setCode(c => (c + k).slice(0, 4));
  };

  return (
    <div className="onb-screen screen-anim" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg)' }}>
      <ProgressHeader step="invite" onBack={back} />
      <div style={{ flex: 1, padding: '14px 24px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 6 }}>Accept your invitation</h2>
          <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.5 }}>
            Enter the 4-character code from your invite email to <b style={{ color: 'var(--text)' }}>ops@swifttip.co.za</b>.
          </p>
        </div>
        <div className="otp-row" style={{ marginTop: 6 }}>
          {[0, 1, 2, 3].map(i => {
            const cur = i === filled && !verifying;
            return (
              <div key={i} className={'otp-box' + (code[i] ? ' filled' : '') + (cur ? ' cursor' : '')} style={{ fontSize: 24 }}>
                {code[i] ? <span className="otp-d">{code[i]}</span> : (cur ? <span className="otp-caret" /> : '')}
              </div>
            );
          })}
        </div>
        <div style={{ textAlign: 'center' }}>
          {verifying
            ? <span className="badge live"><span className="dot" /> Verifying invite…</span>
            : <span style={{ color: 'var(--muted)', fontSize: 13 }}>Reading from email link…</span>}
        </div>
        <div className="kpad" style={{ marginTop: 8 }}>
          {['1','2','3','4','5','6','7','8','9','','0','del'].map((k, i) => (
            k === '' ? <span key={i} className="kkey blank" /> :
            <button key={i} className="kkey" onClick={() => press(k)}>
              {k === 'del' ? <I.del size={22} color="var(--muted)" /> : k}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function IdentityScreen({ next, back }) {
  const [pw, setPw] = useState('Sw1ftAdmin!');
  const [show, setShow] = useState(false);
  const score = Math.min(4, (pw.length >= 8 ? 1 : 0) + (/[A-Z]/.test(pw) ? 1 : 0) + (/[0-9]/.test(pw) ? 1 : 0) + (/[^A-Za-z0-9]/.test(pw) ? 1 : 0));
  const labels = ['Too weak', 'Weak', 'Fair', 'Strong', 'Excellent'];
  const colors = ['#EF4444', '#F59E0B', '#F2A71B', '#22C55E', '#16a34a'];

  return (
    <div className="onb-screen screen-anim" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg)' }}>
      <ProgressHeader step="identity" onBack={back} />
      <div style={{ flex: 1, padding: '14px 24px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 6 }}>Secure your account</h2>
          <p style={{ fontSize: 14, color: 'var(--muted)' }}>Admin accounts require a strong, unique password.</p>
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Full name</label>
          <input className="input" defaultValue="Thabo Mokoena" />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Work email</label>
          <input className="input" defaultValue="ops@swifttip.co.za" disabled style={{ color: 'var(--muted)', background: '#f1f6f7' }} />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Create password</label>
          <div style={{ position: 'relative' }}>
            <input className="input" type={show ? 'text' : 'password'} value={pw} onChange={e => setPw(e.target.value)} style={{ paddingRight: 44 }} />
            <button onClick={() => setShow(s => !s)} style={{ position: 'absolute', right: 8, top: 7, width: 34, height: 34, border: 0, background: 'transparent', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
              <I.eye size={18} color="var(--muted-2)" />
            </button>
          </div>
          <div className="row gap8" style={{ marginTop: 10 }}>
            {[0,1,2,3].map(i => <div key={i} style={{ flex: 1, height: 5, borderRadius: 3, background: i < score ? colors[score] : 'var(--line)', transition: 'background .2s' }} />)}
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: colors[score], marginTop: 6 }}>{labels[score]}</div>
        </div>
      </div>
      <div className="onb-foot">
        <button className="btn" onClick={next} style={{ background: `linear-gradient(150deg,${ACCENT},${ACCENT_2})`, color: '#fff', boxShadow: `0 14px 26px -14px ${ACCENT_2}` }}>Continue</button>
      </div>
    </div>
  );
}

function TwoFAScreen({ next, back }) {
  const [code, setCode] = useState('');
  const fired = useRef(false);
  const [verifying, setVerifying] = useState(false);
  const filled = code.length;

  useEffect(() => {
    if (filled === 6 && !fired.current) {
      fired.current = true; setVerifying(true);
      const id = setTimeout(next, 850); return () => clearTimeout(id);
    }
  }, [filled]);

  const press = (k) => {
    if (fired.current) return;
    if (k === 'del') setCode(c => c.slice(0, -1));
    else setCode(c => (c + k).slice(0, 6));
  };

  return (
    <div className="onb-screen screen-anim" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg)' }}>
      <ProgressHeader step="twofa" onBack={back} />
      <div style={{ flex: 1, padding: '14px 24px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 6 }}>Set up two-factor</h2>
          <p style={{ fontSize: 14, color: 'var(--muted)' }}>Scan with your authenticator app, then enter the 6-digit code.</p>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div style={{ display: 'inline-block', padding: 12, background: '#fff', borderRadius: 16, boxShadow: '0 4px 18px -8px rgba(8,60,74,0.18)', border: '1px solid var(--line)' }}>
            <QRCode value="otpauth://swifttip-admin" size={132} fg="#1e1b4b" />
          </div>
        </div>
        <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--muted)' }}>
          Or enter key: <span style={{ fontWeight: 700, color: 'var(--text)', letterSpacing: 1 }}>JBSW Y3DP EHPK</span>
        </div>
        <div className="otp-row" style={{ gap: 7 }}>
          {[0,1,2,3,4,5].map(i => {
            const cur = i === filled && !verifying;
            return (
              <div key={i} className={'otp-box' + (code[i] ? ' filled' : '') + (cur ? ' cursor' : '')} style={{ width: 44, height: 54, fontSize: 22, borderRadius: 12 }}>
                {code[i] ? <span className="otp-d">{code[i]}</span> : (cur ? <span className="otp-caret" style={{ height: 24 }} /> : '')}
              </div>
            );
          })}
        </div>
        <div style={{ textAlign: 'center' }}>
          {verifying
            ? <span className="badge live"><span className="dot" /> Verifying…</span>
            : <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>Enter the rotating code from your app</span>}
        </div>
        <div className="kpad" style={{ marginTop: 2 }}>
          {['1','2','3','4','5','6','7','8','9','','0','del'].map((k, i) => (
            k === '' ? <span key={i} className="kkey blank" /> :
            <button key={i} className="kkey" style={{ padding: '11px 0' }} onClick={() => press(k)}>
              {k === 'del' ? <I.del size={20} color="var(--muted)" /> : k}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function SecurityScreen({ next, back }) {
  const [checked, setChecked] = useState([false, false, false]);
  const allChecked = checked.every(Boolean);
  const toggle = (i) => setChecked(c => c.map((v, j) => j === i ? !v : v));

  return (
    <div className="onb-screen screen-anim" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg)' }}>
      <ProgressHeader step="security" onBack={back} />
      <div style={{ flex: 1, padding: '14px 24px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 6 }}>Your responsibilities</h2>
          <p style={{ fontSize: 14, color: 'var(--muted)' }}>Admin access is powerful. Confirm you understand the ground rules.</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {DUTIES.map((d, i) => (
            <button key={i} onClick={() => toggle(i)}
              style={{ textAlign: 'left', cursor: 'pointer', fontFamily: 'var(--font)', border: `1.5px solid ${checked[i] ? ACCENT_2 : 'var(--line)'}`, background: checked[i] ? 'linear-gradient(160deg,rgba(99,102,241,0.07),#fff)' : '#fff', borderRadius: 15, padding: '14px 15px', display: 'flex', gap: 13, alignItems: 'flex-start', transition: 'all .14s' }}>
              <span style={{ width: 24, height: 24, flex: '0 0 24px', borderRadius: 7, border: `2px solid ${checked[i] ? ACCENT_2 : 'var(--line)'}`, background: checked[i] ? ACCENT_2 : '#fff', display: 'grid', placeItems: 'center', marginTop: 1 }}>
                {checked[i] && <I.check size={14} color="#fff" stroke={3} />}
              </span>
              <span>
                <span style={{ fontWeight: 700, fontSize: 14, display: 'block' }}>{d.t}</span>
                <span style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2, lineHeight: 1.45, display: 'block' }}>{d.s}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="onb-foot">
        <button className={'btn ' + (allChecked ? '' : 'btn-disabled')} disabled={!allChecked} onClick={next}
          style={{ background: allChecked ? `linear-gradient(150deg,${ACCENT},${ACCENT_2})` : undefined, color: '#fff', boxShadow: allChecked ? `0 14px 26px -14px ${ACCENT_2}` : 'none' }}>
          {allChecked ? 'I understand — continue' : 'Acknowledge all to continue'}
        </button>
      </div>
    </div>
  );
}

function TourScreen({ next, back }) {
  const [slide, setSlide] = useState(0);
  const data = TOUR[slide];
  const Art = data.art === 'kyc' ? TourArtKyc : data.art === 'fraud' ? TourArtFraud : TourArtConsole;
  const last = slide >= TOUR.length - 1;
  const advance = () => { if (last) next(); else setSlide(s => s + 1); };
  const goBack = () => { if (slide === 0) back(); else setSlide(s => s - 1); };

  return (
    <div className="onb-screen onb-scene screen-anim" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px 0' }}>
        <button className="onb-iconbtn-light" onClick={goBack} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.14)', color: '#fff' }}><I.back size={20} /></button>
        <button style={{ border: 0, background: 'transparent', color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }} onClick={next}>Skip</button>
      </div>
      <div key={slide} style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Art />
        <div style={{ padding: '0 28px', textAlign: 'center' }}>
          <h2 style={{ color: '#fff', fontSize: 22, fontWeight: 800, letterSpacing: '-0.4px', marginBottom: 8 }}>{data.title}</h2>
          <p style={{ color: 'rgba(255,255,255,0.68)', fontSize: 14.5, lineHeight: 1.6, maxWidth: 280, margin: '0 auto' }}>{data.sub}</p>
        </div>
      </div>
      <div style={{ padding: '14px 24px 36px' }}>
        <div className="onb-dots" style={{ marginBottom: 18 }}>
          {TOUR.map((_, i) => <span key={i} className={'onb-dot dark' + (i === slide ? ' on' : '')} />)}
        </div>
        <button className="btn" onClick={advance} style={{ background: `linear-gradient(150deg,${ACCENT},${ACCENT_2})`, color: '#fff', boxShadow: `0 14px 26px -14px ${ACCENT_2}` }}>
          {last ? 'Enter the console' : 'Next'} <I.chevR size={18} color="#fff" />
        </button>
      </div>
    </div>
  );
}

function SuccessScreen() {
  const navigate = useNavigate();
  return (
    <div className="onb-screen onb-scene screen-anim" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AdmConfetti n={28} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '40px 28px 0', position: 'relative', zIndex: 2, gap: 8 }}>
        <div style={{ width: 96, height: 96, borderRadius: 48, background: 'rgba(99,102,241,0.2)', display: 'grid', placeItems: 'center', marginBottom: 8 }}>
          <I.shield size={50} color="#a5b4fc" />
        </div>
        <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.6px', color: '#fff' }}>Admin access granted</div>
        <div style={{ color: 'rgba(255,255,255,0.66)', fontSize: 14.5, maxWidth: 290, lineHeight: 1.55, marginTop: 4 }}>
          You're secured with 2FA and ready to operate the SwiftTip network.
        </div>
        <div className="glass-card" style={{ marginTop: 22, padding: 18, width: '100%', maxWidth: 320, textAlign: 'left', color: '#fff' }}>
          <div className="between">
            <div className="row gap10">
              <div style={{ width: 38, height: 38, borderRadius: 11, background: `linear-gradient(135deg,${ACCENT},${ACCENT_2})`, display: 'grid', placeItems: 'center', flex: '0 0 38px' }}>
                <I.shield size={20} color="#fff" />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 14 }}>Thabo Mokoena</div>
                <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.6)' }}>Platform Admin</div>
              </div>
            </div>
            <span className="badge" style={{ background: 'rgba(99,102,241,0.18)', color: '#c7d2fe' }}><I.lock size={11} /> 2FA on</span>
          </div>
          <div style={{ height: 1, background: 'rgba(255,255,255,0.12)', margin: '14px 0' }} />
          <div className="row gap8" style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.7)' }}>
            <I.doc size={14} color="#a5b4fc" /> All actions logged to the audit trail
          </div>
        </div>
      </div>
      <div className="onb-foot" style={{ position: 'relative', zIndex: 2 }}>
        <button className="btn" onClick={() => navigate('/admin')} style={{ background: `linear-gradient(150deg,${ACCENT},${ACCENT_2})`, color: '#fff', boxShadow: `0 14px 26px -14px ${ACCENT_2}` }}>Open the console</button>
        <button className="btn" onClick={() => navigate('/')} style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', marginTop: 10 }}>Back to home</button>
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
      {screen === 'welcome' && <WelcomeScreen next={next} />}
      {screen === 'invite' && <InviteScreen next={next} back={back} />}
      {screen === 'identity' && <IdentityScreen next={next} back={back} />}
      {screen === 'twofa' && <TwoFAScreen next={next} back={back} />}
      {screen === 'security' && <SecurityScreen next={next} back={back} />}
      {screen === 'tour' && <TourScreen next={next} back={back} />}
      {screen === 'success' && <SuccessScreen />}
    </div>
  );
}
