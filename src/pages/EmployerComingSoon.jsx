import React from 'react';
import { useNavigate } from 'react-router-dom';
import { I } from '../components/ui.jsx';

// Employer self-service is deferred to pilot #2 (CLAUDE.md) — this is the
// honest landing point for both the Launcher's employer card AND a direct
// /employer/onboarding visit, so there's exactly one "employer" destination
// today, not a real form that shouldn't be live yet sitting one URL away.
export default function EmployerComingSoon() {
  const navigate = useNavigate();
  return (
    <div style={{ minHeight: '100vh', background: '#f3f9fa', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ width: 64, height: 64, borderRadius: 18, background: 'linear-gradient(155deg,#5f93f2,#2f63e0)', display: 'grid', placeItems: 'center', marginBottom: 20 }}>
        <I.users size={30} color="#fff" />
      </div>
      <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.3px' }}>Employer tools are coming soon</div>
      <div style={{ color: '#6a8492', fontSize: 14, marginTop: 8, maxWidth: 320, lineHeight: 1.5 }}>
        Self-service employer accounts aren't live yet. If you'd like to bring SwiftTip
        to your team, get in touch and we'll set you up directly.
      </div>
      <a href="mailto:hello@swifttip.app" style={{ marginTop: 20, color: 'var(--brand-text, #037b7e)', fontWeight: 700, fontSize: 15, textDecoration: 'none' }}>
        hello@swifttip.app
      </a>
      <button onClick={() => navigate('/')} style={{ marginTop: 28, color: '#6a8492', background: 0, border: 0, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14 }}>
        ← Back
      </button>
    </div>
  );
}
