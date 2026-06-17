import React from 'react';
import { useNavigate } from 'react-router-dom';
import { I } from '../components/ui.jsx';

const CARDS = [
  { id: 'worker',   t: 'I am a worker',   s: 'Receive & withdraw tips',  icon: I.wallet, grad: 'linear-gradient(155deg,#1fd0bd,#0a9d8d)', shadow: '0 16px 30px -18px rgba(10,157,141,0.9)',   to: '/worker/onboarding' },
  { id: 'customer', t: 'I want to tip',   s: 'Tip a worker securely',    icon: I.heart,  grad: 'linear-gradient(155deg,#f9b65a,#ef843a)', shadow: '0 16px 30px -18px rgba(239,132,58,0.9)',  to: '/tip/demo' },
  { id: 'employer', t: 'I am an employer', s: 'Manage your team',         icon: I.users,  grad: 'linear-gradient(155deg,#5f93f2,#2f63e0)', shadow: '0 16px 30px -18px rgba(47,99,224,0.85)',  to: '/employer/onboarding' },
  { id: 'admin',    t: 'Platform admin',  s: 'Operate the network',      icon: I.shield, grad: 'linear-gradient(155deg,#9f72f2,#7344e3)', shadow: '0 16px 30px -18px rgba(115,68,227,0.85)', to: '/admin/onboarding' },
];

export default function Launcher() {
  const navigate = useNavigate();
  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(600px 360px at 50% -6%,#e3f6f2,transparent 60%),radial-gradient(500px 400px at 100% 100%,#fdeed6,transparent 55%),#f3f9fa', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 20px 40px' }}>
      <img src="/logo-mark-t.png" alt="SwiftTip" style={{ height: 60, width: 'auto' }} onError={e => { e.target.style.display='none'; }} />
      <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.8px', marginTop: 16, fontFamily: 'Inter, sans-serif' }}>SwiftTip</div>
      <div style={{ color: '#6a8492', fontSize: 15, marginTop: 4, fontFamily: 'Inter, sans-serif' }}>Cashless tipping, made simple.</div>

      <div style={{ width: '100%', maxWidth: 520, marginTop: 40 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.7px', textTransform: 'uppercase', color: '#93a8b3', marginBottom: 14, fontFamily: 'Inter, sans-serif' }}>Choose your space</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {CARDS.map(c => {
            const Ic = c.icon;
            return (
              <button key={c.id} onClick={() => navigate(c.to)}
                style={{ position: 'relative', overflow: 'hidden', border: 0, cursor: 'pointer', textAlign: 'left', borderRadius: 22, padding: 18, minHeight: 170, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', color: '#fff', background: c.grad, boxShadow: c.shadow, fontFamily: 'Inter, sans-serif' }}>
                <span style={{ position: 'absolute', top: -28, right: -28, width: 110, height: 110, borderRadius: '50%', background: 'radial-gradient(circle at 32% 32%,rgba(255,255,255,0.38),transparent 70%)', pointerEvents: 'none' }} />
                <div style={{ width: 46, height: 46, borderRadius: 14, background: 'rgba(255,255,255,0.22)', display: 'grid', placeItems: 'center' }}>
                  <Ic size={24} color="#fff" />
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.3px' }}>{c.t}</div>
                  <div style={{ fontSize: 12.5, fontWeight: 500, color: 'rgba(255,255,255,0.9)', marginTop: 4, lineHeight: 1.35 }}>{c.s}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
      <div style={{ marginTop: 40, fontSize: 12, color: '#6a8492', fontFamily: 'Inter, sans-serif', textAlign: 'center' }}>
        Banking-grade security · POPIA compliant · 🇿🇦 Made for South Africa
      </div>
    </div>
  );
}
