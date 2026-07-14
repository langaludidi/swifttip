import { useState, useEffect } from 'react';
import { supabase, isDemo } from '../services/supabase.js';
import { SAMPLE } from './data.js';

export function useWorkerData(userId) {
  const [data, setData] = useState(SAMPLE);
  const [loading, setLoading] = useState(!isDemo);

  useEffect(() => {
    if (isDemo || !userId) { setLoading(false); return; }
    let cancelled = false;
    let channel = null;

    async function load() {
      // workers.id is its own uuid, linked via profile_id -> profiles.id (= auth uid).
      // Everything downstream (wallets, tips, payouts) is keyed off workers.id, not the auth uid.
      const { data: workerRow, error: workerErr } = await supabase
        .from('workers')
        .select('id, slug, display_name, job_title')
        .eq('profile_id', userId)
        .single();

      if (cancelled) return;
      if (workerErr || !workerRow) {
        setData(d => ({ ...d, noProfile: true }));
        setLoading(false);
        return;
      }

      const workerId = workerRow.id;
      const [walletRes, tipsRes, profileRes] = await Promise.all([
        supabase.from('wallets').select('balance_cents').eq('owner_id', workerId).single(),
        supabase.from('tips').select('*').eq('worker_id', workerId).order('created_at', { ascending: false }).limit(20),
        supabase.from('profiles').select('full_name, phone').eq('id', userId).single(),
      ]);
      if (cancelled) return;

      const balanceCents = walletRes.data?.balance_cents ?? 0;
      const tips = (tipsRes.data ?? []).map(t => ({
        who: 'Tip from customer',
        when: formatRelative(t.created_at),
        amt: t.amount_cents / 100,
        type: 'tip',
        id: t.id,
      }));

      setData(d => ({
        ...d,
        noProfile: false,
        self: {
          ...d.self,
          workerId,
          name: profileRes.data?.full_name ?? d.self.name,
          balance: balanceCents / 100,
          slug: workerRow.slug ?? d.self.slug,
          role: workerRow.job_title ?? d.self.role,
        },
        recent: tips.length ? tips : d.recent,
      }));
      setLoading(false);

      // Real-time wallet updates
      channel = supabase
        .channel(`wallet:${workerId}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'wallets', filter: `owner_id=eq.${workerId}` },
          (payload) => {
            setData(d => ({ ...d, self: { ...d.self, balance: payload.new.balance_cents / 100 } }));
          })
        .subscribe();
    }

    load();

    return () => { cancelled = true; if (channel) supabase.removeChannel(channel); };
  }, [userId]);

  return { data, loading };
}

export function useEmployerData(employerId) {
  const [data, setData] = useState(SAMPLE);
  const [loading, setLoading] = useState(!isDemo);

  useEffect(() => {
    if (isDemo || !employerId) { setLoading(false); return; }

    async function load() {
      const { data: workers } = await supabase
        .from('workers')
        .select('id, slug, role_title, avatar_color, profiles(full_name), wallets(balance_cents)')
        .eq('employer_id', employerId)
        .eq('active', true);

      const { data: recentTips } = await supabase
        .from('tips')
        .select('*, workers(employer_id)')
        .eq('workers.employer_id', employerId)
        .order('created_at', { ascending: false })
        .limit(20);

      const mapped = (workers ?? []).map(w => ({
        name: w.profiles?.full_name ?? 'Worker',
        color: w.avatar_color ?? 'teal',
        role: w.role_title ?? 'Staff',
        rating: 4.5,
        tips: 0,
        total: (w.wallets?.balance_cents ?? 0) / 100,
        pct: 0,
        slug: w.slug,
      }));

      const totalAll = mapped.reduce((s, w) => s + w.total, 0) || 1;
      mapped.forEach(w => { w.pct = Math.round((w.total / totalAll) * 100); });

      const recent = (recentTips ?? []).map(t => ({
        who: 'Tip from customer',
        when: formatRelative(t.created_at),
        amt: t.amount_cents / 100,
        type: 'tip',
      }));

      setData(d => ({
        ...d,
        workers: mapped.length ? mapped : d.workers,
        recent: recent.length ? recent : d.recent,
      }));
      setLoading(false);
    }

    load();
  }, [employerId]);

  return { data, loading };
}

function formatRelative(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}
