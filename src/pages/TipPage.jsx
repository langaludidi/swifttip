import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getWorkerBySlug } from '../services/workers.js';
import { SAMPLE } from '../lib/data.js';
import CustomerFlow from '../flows/customer/CustomerFlow.jsx';
import { Spinner } from '../components/ui.jsx';

export default function TipPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [worker, setWorker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [screen, setScreen] = useState('scan');

  useEffect(() => {
    getWorkerBySlug(slug === 'demo' ? 'sipho-dlamini' : slug).then(({ worker: w }) => {
      setWorker(w);
      setLoading(false);
      if (w) setScreen('profile');
    });
  }, [slug]);

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
        <button onClick={() => navigate('/')} style={{ color: 'var(--accent-600)', background: 0, border: 0, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: 15 }}>← Back</button>
      </div>
    );
  }

  const data = {
    ...SAMPLE,
    workers: [worker, ...SAMPLE.workers.filter(w => w.slug !== worker.slug)],
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f9fa' }}>
      <CustomerFlow screen={screen} nav={nav} data={data} />
    </div>
  );
}
