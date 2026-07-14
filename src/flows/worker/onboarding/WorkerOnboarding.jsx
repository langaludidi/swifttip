import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { I, Avatar, QRCode } from '../../../components/ui.jsx';
import { signUp, savePendingWorker } from '../../../services/auth.js';
import { addPayoutAccount } from '../../../services/workers.js';
import { supabase, isDemo } from '../../../services/supabase.js';
import {
  WelcomeScene, IntroArtScan, IntroArtPayout, IntroArtReputation,
  PermissionArt, Confetti,
} from './WorkerArt.jsx';

const ARC = ['welcome', 'intro', 'phone', 'otp', 'profile', 'work', 'banking', 'permissions', 'success'];
const SETUP = ['phone', 'otp', 'profile', 'work', 'banking'];
const INTRO_SLIDES = [
  { art: 'scan',       title: 'Get tipped, cashless',   sub: 'Customers scan your QR badge and tip by card or instant EFT — no cash, no app for them.' },
  { art: 'payout',     title: 'Your money, fast',       sub: 'Withdraw to your bank account whenever you like. Tips arrive in under two hours.' },
  { art: 'reputation', title: 'Build your reputation',  sub: 'Earn a Verified badge, collect ratings and compliments, and stand out to every customer.' },
];

function slugify(name) {
  return name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

function ProgressHeader({ step, onBack }) {
  const idx = SETUP.indexOf(step);
  const pct = ((idx + 1) / SETUP.length) * 100;
  return (
    <div className="onb-prog-head">
      <button className="onb-iconbtn-light" onClick={onBack} aria-label="Back"><I.back size={20} /></button>
      <div className="onb-prog-bar"><i style={{ width: pct + '%' }} /></div>
      <div className="onb-prog-step">Step {idx + 1} of {SETUP.length}</div>
    </div>
  );
}

function Foot({ children }) {
  return <div className="onb-foot" style={{ marginTop: 'auto' }}>{children}</div>;
}

/* ── Welcome ───────────────────────────────────────── */
function WelcomeScreen({ next }) {
  const navigate = useNavigate();
  return (
    <div className="onb-screen onb-scene" style={{ minHeight: '100vh' }}>
      <WelcomeScene />
      <div className="onb-sheet">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <span style={{ fontWeight: 800, fontSize: 20, letterSpacing: '-0.4px', color: 'var(--accent)' }}>SwiftTip</span>
          <span className="badge" style={{ marginLeft: 'auto' }}>🇿🇦 South Africa</span>
        </div>
        <h2>Earn every tip — even when no one carries cash.</h2>
        <p>Join thousands of service workers getting tipped instantly, straight to their bank.</p>
        <button className="btn btn-primary" style={{ marginTop: 18 }} onClick={next}>
          Get started <I.chevR size={18} color="#fff" />
        </button>
        <button className="btn-link" onClick={() => navigate('/worker/login')}>I already have an account</button>
        <div className="center muted" style={{ fontSize: 11.5, marginTop: 2 }}>Banking-grade security · POPIA compliant</div>
      </div>
    </div>
  );
}

/* ── Intro carousel ────────────────────────────────── */
function IntroScreen({ slide, setSlide, next, back }) {
  const total = INTRO_SLIDES.length;
  const data = INTRO_SLIDES[Math.min(slide, total - 1)];
  const Art = data.art === 'scan' ? IntroArtScan : data.art === 'payout' ? IntroArtPayout : IntroArtReputation;
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
        <button className="btn btn-primary" onClick={advance}>
          {last ? 'Create my account' : 'Next'} <I.chevR size={18} color="#fff" />
        </button>
      </div>
    </div>
  );
}

/* ── Phone ─────────────────────────────────────────── */
function PhoneScreen({ next, back, form, setForm }) {
  return (
    <div className="onb-screen" style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <ProgressHeader step="phone" onBack={back} />
      <div className="screen-body" style={{ flex: 1, overflowY: 'auto' }}>
        <div className="pad stack gap16" style={{ paddingTop: 14 }}>
          <div className="form-h">
            <h2>What's your number?</h2>
            <p>We'll send a one-time code to confirm it's you. This becomes your sign-in.</p>
          </div>
          <div>
            <label className="field" style={{ marginBottom: 8, display: 'block' }}>Mobile number</label>
            <div className="row gap10">
              <div className="country"><span className="flag">🇿🇦</span> +27</div>
              <input className="phone-input" inputMode="tel" placeholder="82 000 0000"
                value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value.replace(/\D/g,'').slice(0,10) }))} />
            </div>
          </div>
          <div className="trust-note teal">
            <span className="ic"><I.lock size={18} /></span>
            <div><div className="tt">Your number stays private</div><div className="ts">Customers never see it — only your first name and QR.</div></div>
          </div>
        </div>
      </div>
      <Foot>
        <button className={'btn ' + (form.phone.length >= 9 ? 'btn-primary' : 'btn-disabled')}
          disabled={form.phone.length < 9} onClick={next}>Send me a code</button>
        <div className="center muted" style={{ fontSize: 11.5, marginTop: 10 }}>Standard SMS rates may apply</div>
      </Foot>
    </div>
  );
}

/* ── OTP ───────────────────────────────────────────── */
function OtpScreen({ next, back }) {
  const [code, setCode] = useState('');
  const [status, setStatus] = useState('idle');
  const [secs, setSecs] = useState(30);
  const manual = useRef(false);
  const fired = useRef(false);
  const filled = code.length;

  useEffect(() => {
    const id = setInterval(() => setSecs(s => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let i = 0;
    const start = setTimeout(() => {
      const id = setInterval(() => {
        if (manual.current) { clearInterval(id); return; }
        i++; setCode('4321'.slice(0, i));
        if (i >= 4) clearInterval(id);
      }, 220);
    }, 1500);
    return () => clearTimeout(start);
  }, []);

  useEffect(() => {
    if (filled !== 4 || fired.current) return;
    if (code === '4321') {
      fired.current = true;
      setStatus('verifying');
      const id = setTimeout(next, 850);
      return () => clearTimeout(id);
    }
    setStatus('error');
    const id = setTimeout(() => { setCode(''); setStatus('idle'); }, 900);
    return () => clearTimeout(id);
  }, [filled]);

  const press = (k) => {
    if (fired.current || status === 'verifying') return;
    manual.current = true;
    if (status === 'error') { setStatus('idle'); setCode(k === 'del' ? '' : k); return; }
    if (k === 'del') setCode(c => c.slice(0, -1));
    else setCode(c => (c + k).slice(0, 4));
  };

  const error = status === 'error';

  return (
    <div className="onb-screen" style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <ProgressHeader step="otp" onBack={back} />
      <div className="screen-body" style={{ flex: 1, overflowY: 'auto' }}>
        <div className="pad stack gap16" style={{ paddingTop: 14 }}>
          <div className="form-h">
            <h2>Enter your code</h2>
            <p>We sent a 4-digit code to your mobile number. <span className="link" onClick={back} style={{ cursor: 'pointer', color: 'var(--accent-600)' }}>Change</span></p>
          </div>
          <div className={'otp-row' + (error ? ' shake' : '')} style={{ marginTop: 6 }}>
            {[0, 1, 2, 3].map(i => {
              const isCursor = i === filled && status === 'idle';
              return (
                <div key={i} className={'otp-box' + (code[i] ? ' filled' : '') + (isCursor ? ' cursor' : '')}
                  style={error ? { borderColor: 'var(--danger)', color: 'var(--danger)' } : undefined}>
                  {code[i] ? <span className="otp-d">{code[i]}</span> : (isCursor ? <span className="otp-caret" /> : '')}
                </div>
              );
            })}
          </div>
          <div className="center" style={{ marginTop: 2 }}>
            {status === 'verifying'
              ? <span className="badge live"><span className="dot" /> Verifying…</span>
              : error
                ? <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--danger)' }}>Incorrect code — check your SMS and try again</span>
                : secs > 0
                  ? <span className="muted" style={{ fontSize: 13 }}>Auto-detecting… · Resend in 0:{String(secs).padStart(2, '0')}</span>
                  : <span className="muted" style={{ fontSize: 13 }}>Didn't get it? <span className="link" style={{ cursor: 'pointer', color: 'var(--accent-600)' }} onClick={() => { setSecs(30); setCode(''); setStatus('idle'); fired.current = false; }}>Resend code</span></span>}
          </div>
          <div className="kpad" style={{ marginTop: 8 }}>
            {['1','2','3','4','5','6','7','8','9','','0','del'].map((k, i) => (
              k === '' ? <span key={i} className="kkey blank" /> :
              <button key={i} className="kkey" onClick={() => press(k)}>
                {k === 'del' ? <I.del size={22} color="var(--muted)" /> : k}
              </button>
            ))}
          </div>
          <div className="center muted" style={{ fontSize: 11.5 }}>Demo: <b style={{ color: 'var(--text)' }}>4321</b> verifies</div>
        </div>
      </div>
    </div>
  );
}

/* ── Profile ───────────────────────────────────────── */
function ProfileScreen({ next, back, form, setForm }) {
  return (
    <div className="onb-screen" style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <ProgressHeader step="profile" onBack={back} />
      <div className="screen-body" style={{ flex: 1, overflowY: 'auto' }}>
        <div className="pad stack gap14" style={{ paddingTop: 14 }}>
          <div className="form-h"><h2>Tell us about you</h2><p>This is how customers and your employer recognise you.</p></div>
          <div className="photo-pick" onClick={() => {}}>
            <I.camera size={26} color="var(--accent-600)" />
            <span className="cam-badge"><I.plus size={16} color="#fff" /></span>
          </div>
          <div className="center muted" style={{ fontSize: 12, marginTop: -4 }}>Add a profile photo</div>
          <div className="row gap12">
            <div className="field" style={{ flex: 1, marginBottom: 0 }}>
              <label>First name</label>
              <input className="input" placeholder="Sipho"
                value={form.fullName.split(' ')[0] || ''}
                onChange={e => setForm(f => ({ ...f, fullName: e.target.value + (f.fullName.includes(' ') ? ' ' + f.fullName.split(' ').slice(1).join(' ') : '') }))} />
            </div>
            <div className="field" style={{ flex: 1, marginBottom: 0 }}>
              <label>Last name</label>
              <input className="input" placeholder="Dlamini"
                value={form.fullName.split(' ').slice(1).join(' ') || ''}
                onChange={e => setForm(f => ({ ...f, fullName: (f.fullName.split(' ')[0] || '') + ' ' + e.target.value }))} />
            </div>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Email</label>
            <input className="input" type="email" placeholder="you@email.co.za"
              value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Password</label>
            <input className="input" type="password" placeholder="At least 8 characters"
              value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
          </div>
        </div>
      </div>
      <Foot>
        <button className={'btn ' + (form.fullName.trim().length >= 2 && form.email.includes('@') && form.password.length >= 8 ? 'btn-primary' : 'btn-disabled')}
          disabled={form.fullName.trim().length < 2 || !form.email.includes('@') || form.password.length < 8}
          onClick={next}>Continue</button>
      </Foot>
    </div>
  );
}

/* ── Work ──────────────────────────────────────────── */
function WorkScreen({ next, back, form, setForm }) {
  return (
    <div className="onb-screen" style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <ProgressHeader step="work" onBack={back} />
      <div className="screen-body" style={{ flex: 1, overflowY: 'auto' }}>
        <div className="pad stack gap14" style={{ paddingTop: 14 }}>
          <div className="form-h"><h2>Where do you work?</h2><p>Your employer confirms your role to give you the Verified badge.</p></div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Employer</label>
            <input className="input" placeholder="The Grand Hotel" value={form.employer} onChange={e => setForm(f => ({ ...f, employer: e.target.value }))} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Job title</label>
            <input className="input" placeholder="e.g. Bartender" value={form.roleTitle} onChange={e => setForm(f => ({ ...f, roleTitle: e.target.value }))} />
          </div>
          <div className="trust-note teal">
            <span className="ic"><I.shield size={18} /></span>
            <div><div className="tt">Verification pending</div><div className="ts">You can start receiving tips right away — the badge appears once your manager approves.</div></div>
          </div>
        </div>
      </div>
      <Foot>
        <button className={'btn ' + (form.employer && form.roleTitle ? 'btn-primary' : 'btn-disabled')}
          disabled={!form.employer || !form.roleTitle} onClick={next}>Continue</button>
      </Foot>
    </div>
  );
}

/* ── Banking ───────────────────────────────────────── */
function BankingScreen({ next, back, form, setForm }) {
  const acct = form.accountType;
  return (
    <div className="onb-screen" style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <ProgressHeader step="banking" onBack={back} />
      <div className="screen-body" style={{ flex: 1, overflowY: 'auto' }}>
        <div className="pad stack gap14" style={{ paddingTop: 14 }}>
          <div className="form-h"><h2>Where should we pay you?</h2><p>Your tips land here whenever you withdraw. Add it now or later.</p></div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Bank</label>
            <input className="input" placeholder="Choose your bank" value={form.bank} onChange={e => setForm(f => ({ ...f, bank: e.target.value }))} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Account number</label>
            <input className="input" inputMode="numeric" placeholder="0000 0000 00"
              value={form.accNo} onChange={e => setForm(f => ({ ...f, accNo: e.target.value.replace(/\D/g,'').slice(0,11) }))} />
          </div>
          <div>
            <label className="field" style={{ display: 'block', marginBottom: 8 }}>Account type</label>
            <div className="seg-choice">
              {['Savings', 'Cheque', 'Transmission'].map(o => (
                <button key={o} className={'seg-opt' + (acct === o ? ' on' : '')} onClick={() => setForm(f => ({ ...f, accountType: o }))}>{o}</button>
              ))}
            </div>
          </div>
          <div className="trust-note">
            <span className="ic"><I.lock size={18} /></span>
            <div><div className="tt">Bank-grade encryption</div><div className="ts">Encrypted at rest, never shared. POPIA &amp; PCI-DSS compliant.</div></div>
          </div>
        </div>
      </div>
      <Foot>
        <button className="btn btn-primary" onClick={next}>Continue</button>
        <button className="btn-link" onClick={next}>Skip for now</button>
      </Foot>
    </div>
  );
}

/* ── Permissions ───────────────────────────────────── */
function PermissionsScreen({ next, back }) {
  const rows = [
    { ic: I.card,  t: 'Instant tip alerts',    s: 'Know the moment a customer tips you.' },
    { ic: I.heart, t: 'Compliments & ratings', s: 'See the kind words customers leave.' },
    { ic: I.bank,  t: 'Payout confirmations',  s: 'A nudge when your money lands.' },
  ];
  return (
    <div className="onb-screen" style={{ minHeight: '100vh', background: 'radial-gradient(620px 440px at 50% -6%, #e3f6f2, transparent 62%), var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '14px 18px 0' }}>
        <button className="onb-iconbtn-light" onClick={back} aria-label="Back"><I.back size={20} /></button>
      </div>
      <div className="screen-body" style={{ flex: 1, overflowY: 'auto' }}>
        <div className="pad stack gap16" style={{ paddingTop: 18 }}>
          <PermissionArt />
          <div className="form-h" style={{ textAlign: 'center' }}>
            <h2>Never miss a tip</h2>
            <p style={{ maxWidth: 280, margin: '0 auto' }}>Turn on notifications so you feel every buzz the instant a customer tips you.</p>
          </div>
          <div className="card stack gap16" style={{ padding: '18px 18px' }}>
            {rows.map((r, i) => { const Ic = r.ic; return (
              <div key={i} className="val-row">
                <span className="vic"><Ic size={19} /></span>
                <div><div className="vt">{r.t}</div><div className="vs">{r.s}</div></div>
              </div>
            ); })}
          </div>
        </div>
      </div>
      <Foot>
        <button className="btn btn-primary" onClick={next}>Allow notifications</button>
        <button className="btn-link" onClick={next}>Maybe later</button>
      </Foot>
    </div>
  );
}

/* ── Success ───────────────────────────────────────── */
function SuccessScreen({ form }) {
  const navigate = useNavigate();
  const [status, setStatus] = useState('registering');
  const slug = slugify(form.fullName) || 'worker';
  const first = form.fullName.split(' ')[0] || 'there';

  useEffect(() => {
    async function register() {
      if (isDemo) { setStatus('done'); return; }
      try {
        const { error } = await signUp({
          email: form.email,
          password: form.password,
          fullName: form.fullName,
          phone: '+27' + form.phone,
          role: 'worker',
        });
        if (error) { setStatus('error:' + error.message); return; }

        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data: newWorker, error: insertErr } = await supabase.from('workers').insert({
            profile_id: session.user.id,
            display_name: form.fullName,
            slug,
            job_title: form.roleTitle,
          }).select('id').single();
          if (insertErr) { setStatus('error:' + insertErr.message); return; }

          if (form.bank.trim() && form.accNo.trim()) {
            await addPayoutAccount({ workerId: newWorker.id, bank: form.bank, accNo: form.accNo, accountType: form.accountType });
          }
          setStatus('done');
        } else {
          // No session yet — this project requires email confirmation. Save the
          // profile fields so WorkerLogin can finish creating the worker row
          // (and its payout account, if provided) right after the user confirms
          // and signs in for the first time.
          savePendingWorker({
            email: form.email, fullName: form.fullName, slug, roleTitle: form.roleTitle,
            bank: form.bank, accNo: form.accNo, accountType: form.accountType,
          });
          setStatus('confirm');
        }
      } catch (e) {
        setStatus('error:' + (e.message || 'Something went wrong'));
      }
    }
    register();
  }, []);

  if (status === 'registering') return (
    <div className="onb-screen onb-scene" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <div className="spin" style={{ width: 48, height: 48, borderRadius: '50%', border: '4px solid rgba(18,196,178,0.2)', borderTopColor: 'var(--accent)' }} />
      <div style={{ fontSize: 16, fontWeight: 600, color: '#fff' }}>Creating your account…</div>
    </div>
  );

  if (status === 'confirm') return (
    <div className="onb-screen onb-scene" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, textAlign: 'center' }}>
      <div className="success-ring" style={{ background: 'rgba(18,196,178,0.18)', color: 'var(--accent)' }}><I.mail size={40} /></div>
      <div style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>Check your email, {first}</div>
      <div style={{ color: 'rgba(255,255,255,0.66)', fontSize: 14.5, maxWidth: 300, lineHeight: 1.55 }}>
        We sent a confirmation link to {form.email}. Confirm it, then log in — your wallet and QR badge will be ready.
      </div>
      <button className="btn btn-primary" style={{ maxWidth: 280, marginTop: 8 }} onClick={() => navigate('/worker/login')}>Go to login</button>
      <button className="btn-link" style={{ color: 'rgba(255,255,255,0.7)' }} onClick={() => navigate('/')}>Back to home</button>
    </div>
  );

  if (status.startsWith('error')) return (
    <div className="onb-screen onb-scene" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, textAlign: 'center' }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>Something went wrong</div>
      <div style={{ color: 'rgba(239,68,68,0.85)', fontSize: 14, maxWidth: 300 }}>{status.replace('error:', '')}</div>
      <button className="btn btn-primary" style={{ maxWidth: 280 }} onClick={() => navigate('/worker/onboarding')}>Try again</button>
    </div>
  );

  return (
    <div className="onb-screen onb-scene" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Confetti n={28} />
      <div className="screen-body" style={{ position: 'relative', zIndex: 2, flex: 1, overflowY: 'auto' }}>
        <div className="pad stack" style={{ alignItems: 'center', textAlign: 'center', paddingTop: 30, gap: 6 }}>
          <div className="success-ring" style={{ background: 'rgba(18,196,178,0.18)', color: 'var(--accent)' }}><I.checkC size={48} /></div>
          <div style={{ fontSize: 27, fontWeight: 800, letterSpacing: '-0.6px', color: '#fff' }}>You're all set, {first}!</div>
          <div style={{ color: 'rgba(255,255,255,0.66)', fontSize: 14.5, maxWidth: 290, lineHeight: 1.55, marginTop: 4 }}>Your wallet, worker ID and QR badge are ready. Display your QR and start earning.</div>
          <div className="glass-card" style={{ marginTop: 24, padding: 18, width: '100%', maxWidth: 320, display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ background: '#fff', padding: 9, borderRadius: 14, flex: '0 0 auto' }}>
              <QRCode value={'swifttip:' + slug} size={78} />
            </div>
            <div style={{ textAlign: 'left', color: '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Avatar name={form.fullName || 'New Worker'} color="red" size={26} />
                <div style={{ fontWeight: 800, fontSize: 14 }}>{form.fullName || 'New Worker'}</div>
              </div>
              <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.6)', margin: '9px 0 1px' }}>Worker ID</div>
              <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: '0.5px' }}>ST-2050-{slug.slice(0,2).toUpperCase()}</div>
              <span className="badge" style={{ marginTop: 8 }}><I.check size={11} stroke={3} /> Wallet active</span>
            </div>
          </div>
        </div>
      </div>
      <div className="onb-foot" style={{ position: 'relative', zIndex: 2 }}>
        <button className="btn btn-primary" onClick={() => navigate('/worker')}>Go to my dashboard</button>
        <button className="btn-link" style={{ color: 'rgba(255,255,255,0.7)' }} onClick={() => navigate('/')}>Back to home</button>
      </div>
    </div>
  );
}

const BLANK_FORM = { phone: '', fullName: '', email: '', password: '', roleTitle: '', employer: '', bank: '', accNo: '', accountType: 'Savings' };

export default function WorkerOnboarding() {
  const [arcIdx, setArcIdx] = useState(0);
  const [slide, setSlide] = useState(0);
  const [form, setForm] = useState(BLANK_FORM);
  const screen = ARC[arcIdx];
  const next = () => { if (screen === 'intro') setSlide(0); setArcIdx(i => Math.min(i + 1, ARC.length - 1)); };
  const back = () => setArcIdx(i => Math.max(i - 1, 0));
  const props = { next, back, form, setForm };

  return (
    <>
      {screen === 'welcome'     && <WelcomeScreen next={next} />}
      {screen === 'intro'       && <IntroScreen slide={slide} setSlide={setSlide} next={next} back={back} />}
      {screen === 'phone'       && <PhoneScreen {...props} />}
      {screen === 'otp'         && <OtpScreen next={next} back={back} />}
      {screen === 'profile'     && <ProfileScreen {...props} />}
      {screen === 'work'        && <WorkScreen {...props} />}
      {screen === 'banking'     && <BankingScreen {...props} />}
      {screen === 'permissions' && <PermissionsScreen next={next} back={back} />}
      {screen === 'success'     && <SuccessScreen form={form} />}
    </>
  );
}
