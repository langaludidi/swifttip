import { supabase, isDemo } from './supabase.js';

export async function getKycDocuments(workerId) {
  if (isDemo) return { documents: [], error: null };
  const { data, error } = await supabase
    .from('kyc_documents')
    .select('id, document_type, uploaded_at')
    .eq('worker_id', workerId);
  return { documents: data ?? [], error };
}

// userId is the auth uid (session.user.id), required as the storage path's
// first folder segment to satisfy the bucket's own-folder RLS policy — it is
// not the same as workerId (workers.id is its own uuid, see hooks.js).
export async function uploadKycDocument({ workerId, userId, documentType, file }) {
  if (isDemo) return { error: null };
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
  const path = `${userId}/${documentType}-${Date.now()}.${ext}`;

  const { error: uploadErr } = await supabase.storage.from('kyc').upload(path, file);
  if (uploadErr) return { error: uploadErr };

  const { error: insertErr } = await supabase.from('kyc_documents').insert({
    worker_id: workerId,
    document_type: documentType,
    storage_path: path,
  });
  return { error: insertErr };
}

export async function submitKycForReview() {
  if (isDemo) return { error: null };
  const { data, error } = await supabase.functions.invoke('submit-kyc');
  if (error) return { error };
  if (data?.error) return { error: new Error(data.error) };
  return { error: null };
}

// Admin-only. GET mode (no decision): fetches the worker + signed URLs for
// their documents, and — as a side effect server-side — flips submitted to
// under_review. Signed URLs are short-lived; this is the only way the kyc
// bucket's contents are ever readable, there is no client SELECT policy.
export async function getKycReview(workerId) {
  if (isDemo) return { worker: null, documents: [], error: null };
  const { data, error } = await supabase.functions.invoke('review-kyc', {
    body: { worker_id: workerId },
  });
  if (error) return { worker: null, documents: [], error };
  if (data?.error) return { worker: null, documents: [], error: new Error(data.error) };
  return { worker: data.worker, documents: data.documents ?? [], error: null };
}

// Admin-only. DECIDE mode — approve or reject. rejection_reason is required
// by decide_kyc() when decision is 'rejected'.
export async function decideKyc({ workerId, decision, rejectionReason }) {
  if (isDemo) return { error: null };
  const { data, error } = await supabase.functions.invoke('review-kyc', {
    body: { worker_id: workerId, decision, rejection_reason: rejectionReason },
  });
  if (error) return { error };
  if (data?.error) return { error: new Error(data.error) };
  return { error: null };
}
