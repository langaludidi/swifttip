import React, { useState, useEffect, useRef } from 'react';
import { I, Header, Spinner } from '../../components/ui.jsx';
import { useSession } from '../../App.jsx';
import { getKycDocuments, uploadKycDocument, submitKycForReview } from '../../services/kyc.js';
import { KYC_DOCUMENT_TYPES, MAX_FILE_SIZE_BYTES } from '../../lib/kycDocuments.js';

function StatusNotice({ icon, iconColor, title, sub }) {
  return (
    <div className="card center" style={{ padding: '32px 22px', textAlign: 'center' }}>
      <div className="success-ring" style={{ background: 'rgba(0,0,0,0.04)', color: iconColor }}>{icon}</div>
      <div style={{ fontSize: 18, fontWeight: 800, marginTop: 14 }}>{title}</div>
      {sub && <div className="muted" style={{ fontSize: 13.5, marginTop: 6, maxWidth: 280 }}>{sub}</div>}
    </div>
  );
}

function DocumentRow({ type, uploaded, uploading, error, onPick }) {
  const inputRef = useRef(null);
  return (
    <div className="list-card">
      <div className={'icon-chip' + (uploaded ? ' gold' : '')}>
        {uploading ? <Spinner size={18} /> : uploaded ? <I.checkC size={20} /> : <I.doc size={20} />}
      </div>
      <div className="lc-main">
        <div className="lc-title">{type.label}</div>
        <div className="lc-sub">
          {uploading ? 'Uploading…' : uploaded ? 'Uploaded' : error ? error : 'Not uploaded yet'}
        </div>
      </div>
      <input ref={inputRef} type="file" accept="image/*,.pdf" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) onPick(f); e.target.value = ''; }} />
      <button className="btn btn-sm btn-ghost" disabled={uploading} onClick={() => inputRef.current?.click()}>
        {uploaded ? 'Replace' : 'Upload'}
      </button>
    </div>
  );
}

export default function KycScreen({ data, nav }) {
  const { session } = useSession();
  const workerId = data.self?.workerId;
  const status = data.self?.status;
  const [documents, setDocuments] = useState(null); // null = loading
  const [loadError, setLoadError] = useState('');
  const [uploading, setUploading] = useState({});
  const [uploadErrors, setUploadErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const loadDocuments = () => {
    setDocuments(null);
    setLoadError('');
    getKycDocuments(workerId).then(({ documents: docs, error }) => {
      if (error) { setLoadError(error.message || 'Could not load your documents'); setDocuments([]); return; }
      setDocuments(docs);
    });
  };

  useEffect(() => {
    if (workerId) loadDocuments();
  }, [workerId]);

  const handlePick = async (type, file) => {
    setUploadErrors(e => ({ ...e, [type.key]: '' }));
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setUploadErrors(e => ({ ...e, [type.key]: 'File is too large (max 10MB)' }));
      return;
    }
    setUploading(u => ({ ...u, [type.key]: true }));
    const { error } = await uploadKycDocument({
      workerId, userId: session?.user?.id, documentType: type.key, file,
    });
    setUploading(u => ({ ...u, [type.key]: false }));
    if (error) { setUploadErrors(e => ({ ...e, [type.key]: error.message || 'Upload failed' })); return; }
    loadDocuments();
  };

  const handleSubmit = async () => {
    setSubmitting(true); setSubmitError('');
    const { error } = await submitKycForReview();
    setSubmitting(false);
    if (error) { setSubmitError(error.message || 'Could not submit for review'); return; }
    nav('__refetch');
  };

  if (status === 'submitted' || status === 'under_review') {
    return (
      <>
        <Header title="Verification" onBack={() => nav('dash')} />
        <div className="screen-body screen-anim"><div className="pad">
          <StatusNotice icon={<I.clockC size={30} />} iconColor="var(--accent-600)"
            title="Your documents are under review"
            sub="This usually takes 1–2 business days. We'll let you know as soon as it's done." />
        </div></div>
      </>
    );
  }

  if (status === 'approved') {
    return (
      <>
        <Header title="Verification" onBack={() => nav('dash')} />
        <div className="screen-body screen-anim"><div className="pad">
          <StatusNotice icon={<I.checkC size={30} color="var(--success)" />} iconColor="var(--success)"
            title="You're verified" sub="Your account is fully active — customers can tip you and payouts are available." />
        </div></div>
      </>
    );
  }

  if (status === 'suspended') {
    return (
      <>
        <Header title="Verification" onBack={() => nav('dash')} />
        <div className="screen-body screen-anim"><div className="pad">
          <StatusNotice icon={<I.flag size={30} color="var(--danger)" />} iconColor="var(--danger)"
            title="Your account is suspended" sub="Contact support for details on why your account was suspended." />
        </div></div>
      </>
    );
  }

  // draft or rejected — the upload form
  return (
    <>
      <Header title="Verification" sub="Upload your documents to get verified" onBack={() => nav('dash')} />
      <div className="screen-body screen-anim">
        <div className="pad stack gap12">
          {status === 'rejected' && (
            <div className="trust-note" style={{ borderColor: 'var(--danger)' }}>
              <span className="ic"><I.flag size={18} color="var(--danger)" /></span>
              <div>
                <div className="tt">Your submission was rejected</div>
                <div className="ts">{data.self?.rejectionReason || 'Please review and resubmit your documents.'}</div>
              </div>
            </div>
          )}

          {documents === null ? (
            <div className="center" style={{ padding: '40px 0' }}><Spinner size={30} /></div>
          ) : loadError ? (
            <div className="card center" style={{ padding: 24, textAlign: 'center' }}>
              <div className="muted" style={{ marginBottom: 12 }}>{loadError}</div>
              <button className="btn btn-ghost" onClick={loadDocuments}>Try again</button>
            </div>
          ) : (
            KYC_DOCUMENT_TYPES.map(type => (
              <DocumentRow key={type.key} type={type}
                uploaded={documents.some(d => d.document_type === type.key)}
                uploading={!!uploading[type.key]}
                error={uploadErrors[type.key]}
                onPick={file => handlePick(type, file)} />
            ))
          )}

          {submitError && <div style={{ color: 'var(--danger)', fontSize: 13, fontWeight: 600 }}>{submitError}</div>}

          <button
            className={'btn ' + (documents?.length > 0 && !submitting ? 'btn-primary' : 'btn-disabled')}
            disabled={!documents?.length || submitting}
            onClick={handleSubmit}>
            {submitting ? 'Submitting…' : 'Submit for review'}
          </button>
        </div>
      </div>
    </>
  );
}
