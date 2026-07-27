import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { getWorkerBySlug } from '../services/workers.js';
import { getTipStatus } from '../services/tips.js';
import { SAMPLE } from '../lib/data.js';
import CustomerFlow from '../flows/customer/CustomerFlow.jsx';
import { Spinner } from '../components/ui.jsx';

const POLL_INTERVAL_MS = 1500;
const POLL_MAX_TRIES = 14; // ~21s — covers typical Paystack webhook latency

function ConfirmingScreen() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, fontFamily: 'Inter,sans-serif' }}>
      <Spinner size={36} />
      <div style={{ fontSize: 16, fontWeight: 700 }}>Confirming your payment…</div>
    </div>
  );
}

function PendingTimeoutScreen({ onCheckAgain }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24, textAlign: 'center', fontFamily: 'Inter,sans-serif' }}>
      <div style={{ fontSize: 18, fontWeight: 700 }}>Still confirming with the bank</div>
      <div style={{ color: '#6a8492', fontSize: 14, maxWidth: 280 }}>This is taking longer than usual. If your payment went through, it'll land shortly — no need to pay again.</div>
      <button onClick={onCheckAgain} style={{ color: 'var(--brand-text, #037b7e)', background: 0, border: 0, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: 15 }}>Check again</button>
    </div>
  );
}

function FailedScreen({ onRetry }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24, textAlign: 'center', fontFamily: 'Inter,sans-serif' }}>
      <div style={{ fontSize: 18, fontWeight: 700 }}>Payment didn't go through</div>
      <div style={{ color: '#6a8492', fontSize: 14, maxWidth: 280 }}>No charge was made. You can try again.</div>
      <button onClick={onRetry} style={{ color: 'var(--brand-text, #037b7e)', background: 0, border: 0, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: 15 }}>Try again</button>
    </div>
  );
}

export default function TipPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [worker, setWorker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [screen, setScreen] = useState('scan');
  const [confirmState, setConfirmState] = useState('idle'); // idle | confirming | timeout | failed
  const [confirmed, setConfirmed] = useState(null); // { amountCents, tipId }
  const [reference] = useState(() => searchParams.get('reference') || searchParams.get('trxref'));
  const [pollNonce, setPollNonce] = useState(0);
  const pollRef = useRef(null);

  useEffect(() => {
    getWorkerBySlug(slug).then(({ worker: w }) => {
      setWorker(w);
      setLoading(false);
      if (w) setScreen('profile');
    });
  }, [slug]);

  useEffect(() => {
    if (reference) setSearchParams({}, { replace: true });
  }, []);

  // Returning from Paystack checkout: ?reference=...&trxref=...
  useEffect(() => {
    if (!reference) return;

    setConfirmState('confirming');
    let tries = 0;
    let cancelled = false;

    const poll = async () => {
      tries += 1;
      const { status, amountCents, tipId, error } = await getTipStatus(reference);
      if (cancelled) return;
      if (error) { pollRef.current = setTimeout(poll, POLL_INTERVAL_MS); return; }

      if (status === 'settled') {
        setConfirmed({ amountCents, tipId });
        setConfirmState('idle');
        setScreen('success');
        return;
      }
      if (status === 'failed') {
        setConfirmState('failed');
        return;
      }
      if (tries >= POLL_MAX_TRIES) {
        setConfirmState('timeout');
        return;
      }
      pollRef.current = setTimeout(poll, POLL_INTERVAL_MS);
    };

    poll();
    return () => { cancelled = true; clearTimeout(pollRef.current); };
  }, [reference, pollNonce]);

  const nav = (s) => {
    if (s === '__home') { navigate('/'); return; }
    setScreen(s);
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner size={36} />
      </div>
    );
  }

  if (!worker) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 14, fontFamily: 'Inter,sans-serif' }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>Worker not found</div>
        <button onClick={() => navigate('/')} style={{ color: 'var(--brand-text)', background: 0, border: 0, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: 15 }}>← Back</button>
      </div>
    );
  }

  if (confirmState === 'confirming') return <ConfirmingScreen />;
  if (confirmState === 'timeout') return <PendingTimeoutScreen onCheckAgain={() => setPollNonce(n => n + 1)} />;
  if (confirmState === 'failed') return <FailedScreen onRetry={() => { setConfirmState('idle'); setScreen('amount'); }} />;

  const data = {
    ...SAMPLE,
    workers: [worker, ...SAMPLE.workers.filter(w => w.slug !== worker.slug)],
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', background: 'var(--bg-wash)' }}>
      {/* Plain block wrapper, not a flex item — CustomerFlow returns a
          fragment with multiple top-level siblings (header, screen-body)
          for several screens, and those must stack vertically via normal
          block flow, not become row-siblings of a flex parent. */}
      <div style={{ width: '100%', maxWidth: 480 }}>
        <CustomerFlow
          screen={screen}
          nav={nav}
          data={data}
          presetAmountCents={confirmed?.amountCents}
          presetTipId={confirmed?.tipId}
        />
      </div>
    </div>
  );
}
