import React, { useState, useEffect } from 'react';
import { I, Header, Spinner } from '../../components/ui.jsx';
import { getWorkers } from '../../services/workers.js';
import { getKycReview, decideKyc } from '../../services/kyc.js';
import { KYC_DOCUMENT_TYPES } from '../../lib/kycDocuments.js';

function labelFor(documentType) {
  return KYC_DOCUMENT_TYPES.find(t => t.key === documentType)?.label || documentType;
}

function QueueList({ onSelect }) {
  const [workers, setWorkers] = useState(null); // null = loading
  const [error, setError] = useState('');

  const load = () => {
    setWorkers(null);
    setError('');
    getWorkers({ statusIn: ['submitted', 'under_review'] }).then(({ workers: rows, error: err }) => {
      if (err) { setError(err.message || 'Could not load the review queue'); setWorkers([]); return; }
      setWorkers(rows);
    });
  };

  useEffect(load, []);

  if (workers === null) return <div className="center" style={{ padding: '60px 0' }}><Spinner size={30} /></div>;
  if (error) return (
    <div className="card center" style={{ padding: 24, margin: 16, textAlign: 'center' }}>
      <div className="muted" style={{ marginBottom: 12 }}>{error}</div>
      <button className="btn btn-ghost" onClick={load}>Try again</button>
    </div>
  );
  if (workers.length === 0) return (
    <div className="card" style={{ textAlign: 'center', padding: 28, margin: 16 }}>
      <I.shield size={36} color="var(--muted-2)" />
      <div style={{ marginTop: 12, fontWeight: 700 }}>Nothing to review</div>
      <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>Submitted KYC documents will queue up here.</div>
    </div>
  );

  return (
    <div className="pad stack gap12">
      {workers.map(w => (
        <button key={w.id} className="list-card" style={{ width: '100%', textAlign: 'left', border: 0, cursor: 'pointer' }}
          onClick={() => onSelect(w.id)}>
          <div className="icon-chip"><I.doc size={20} /></div>
          <div className="lc-main">
            <div className="lc-title">{w.display_name || 'Worker'}</div>
            <div className="lc-sub">{w.job_title || 'Staff'}{w.station ? ` · ${w.station}` : ''} · {w.status === 'under_review' ? 'Under review' : 'Submitted'}</div>
          </div>
          <I.chevR size={18} color="var(--muted-2)" />
        </button>
      ))}
    </div>
  );
}

function ReviewDetail({ workerId, onBack, onDecided }) {
  const [worker, setWorker] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState('');
  const [decideError, setDecideError] = useState('');

  useEffect(() => {
    setLoading(true);
    setLoadError('');
    getKycReview(workerId).then(({ worker: w, documents: docs, error }) => {
      setLoading(false);
      if (error) { setLoadError(error.message || 'Could not load this submission'); return; }
      setWorker(w);
      setDocuments(docs);
    });
  }, [workerId]);

  const decide = async (decision) => {
    if (decision === 'rejected' && !reason.trim()) { setDecideError('A reason is required to reject.'); return; }
    setSubmitting(decision);
    setDecideError('');
    const { error } = await decideKyc({ workerId, decision, rejectionReason: reason.trim() || undefined });
    setSubmitting('');
    if (error) { setDecideError(error.message || 'Could not submit decision'); return; }
    onDecided();
  };

  return (
    <>
      <Header title="Review submission" onBack={onBack} />
      <div className="screen-body screen-anim">
        <div className="pad stack gap14">
          {loading ? (
            <div className="center" style={{ padding: '60px 0' }}><Spinner size={30} /></div>
          ) : loadError ? (
            <div className="card center" style={{ padding: 24, textAlign: 'center' }}>
              <div className="muted" style={{ marginBottom: 12 }}>{loadError}</div>
            </div>
          ) : (
            <>
              <div className="card" style={{ padding: 16 }}>
                <div style={{ fontWeight: 800, fontSize: 16 }}>{worker.display_name || 'Worker'}</div>
                <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>
                  {worker.job_title || 'Staff'}{worker.station ? ` · ${worker.station}` : ''}
                </div>
              </div>

              <div className="section-title">Documents ({documents.length})</div>
              {documents.length === 0 ? (
                <div className="muted" style={{ fontSize: 13 }}>No documents were uploaded.</div>
              ) : documents.map(d => (
                <div key={d.id} className="list-card">
                  <div className="icon-chip"><I.doc size={20} /></div>
                  <div className="lc-main">
                    <div className="lc-title">{labelFor(d.document_type)}</div>
                    <div className="lc-sub">Uploaded {new Date(d.uploaded_at).toLocaleDateString()}</div>
                  </div>
                  {d.signed_url ? (
                    <button className="btn btn-sm btn-ghost" onClick={() => window.open(d.signed_url, '_blank', 'noopener,noreferrer')}>View</button>
                  ) : <span className="muted" style={{ fontSize: 12 }}>Unavailable</span>}
                </div>
              ))}

              <div className="field" style={{ marginBottom: 0 }}>
                <label>Rejection reason <span className="muted" style={{ fontWeight: 500 }}>(required only to reject)</span></label>
                <textarea className="input" rows={3} style={{ resize: 'none', fontFamily: 'var(--font)' }}
                  placeholder="e.g. ID photo is blurry, please resubmit"
                  value={reason} onChange={e => setReason(e.target.value)} />
              </div>

              {decideError && <div style={{ color: 'var(--danger)', fontSize: 13, fontWeight: 600 }}>{decideError}</div>}

              <div className="row gap10">
                <button className={'btn ' + (submitting ? 'btn-disabled' : 'btn-primary')} style={{ flex: 1 }}
                  disabled={!!submitting} onClick={() => decide('approved')}>
                  {submitting === 'approved' ? 'Approving…' : 'Approve'}
                </button>
                <button className="btn btn-ghost" style={{ flex: 1, color: 'var(--danger)' }}
                  disabled={!!submitting} onClick={() => decide('rejected')}>
                  {submitting === 'rejected' ? 'Rejecting…' : 'Reject'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default function KycReviewScreen() {
  const [selected, setSelected] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  if (selected) {
    return (
      <ReviewDetail workerId={selected}
        onBack={() => setSelected(null)}
        onDecided={() => { setSelected(null); setRefreshKey(k => k + 1); }} />
    );
  }

  return (
    <>
      <Header title="KYC Review" sub="Approve or reject submitted documents" />
      <div className="screen-body screen-anim">
        <QueueList key={refreshKey} onSelect={setSelected} />
      </div>
    </>
  );
}
