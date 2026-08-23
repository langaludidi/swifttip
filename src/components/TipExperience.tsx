"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatZar } from "@/lib/money";

const presets = [1000, 2000, 5000, 10000];

type PublicProfile = {
  available: boolean;
  worker?: { displayName: string; role: string; photoUrl?: string | null };
  venue?: { name: string; location?: string | null };
  verification?: { verified: boolean };
};

type Quote = {
  grossGratuityCents: number;
  customerFeeCents: number;
  customerTotalCents: number;
  workerFeeCents?: number;
  workerNetCents?: number;
  currency?: string;
};

function normalizeQuote(payload: any): Quote | null {
  const q = payload?.pricing ?? payload?.quote;
  if (!q) return null;
  return {
    grossGratuityCents: Number(q.grossGratuityCents ?? q.gross_gratuity_cents),
    customerFeeCents: Number(q.customerFeeCents ?? q.customer_fee_cents),
    customerTotalCents: Number(q.customerTotalCents ?? q.customer_total_cents),
    workerFeeCents: Number(q.workerFeeCents ?? q.worker_fee_cents),
    workerNetCents: Number(q.workerNetCents ?? q.worker_net_cents),
    currency: q.currency ?? "ZAR"
  };
}

export function TipExperience({ token }: { token: string }) {
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [amount, setAmount] = useState(2000);
  const [custom, setCustom] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteState, setQuoteState] = useState<"loading" | "ready" | "error">("loading");
  const [step, setStep] = useState<"amount" | "confirm" | "payment" | "blocked">("amount");
  const [runtimeMessage, setRuntimeMessage] = useState("");
  const idempotencyKey = useRef<string>("");

  useEffect(() => {
    idempotencyKey.current = globalThis.crypto?.randomUUID?.() ?? `tip-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    fetch(`/api/public/tipping-endpoint/${encodeURIComponent(token)}`)
      .then(async r => ({ ok: r.ok, body: await r.json() }))
      .then(({ ok, body }) => setProfile(ok ? body : { available: false }))
      .catch(() => setProfile({ available: false }));
  }, [token]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setQuoteState("loading");
      try {
        const res = await fetch("/api/tips/quote", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ endpointToken: token, grossGratuityCents: amount }),
          signal: controller.signal
        });
        const body = await res.json();
        const normalized = res.ok ? normalizeQuote(body) : null;
        if (!normalized || !Number.isFinite(normalized.customerTotalCents)) throw new Error("quote unavailable");
        setQuote(normalized);
        setQuoteState("ready");
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        setQuote(null);
        setQuoteState("error");
      }
    }, 180);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [amount, token]);

  const workerName = profile?.worker?.displayName ?? "Worker";
  const initials = useMemo(() => workerName.split(/\s+/).map(v => v[0]).join("").slice(0, 2).toUpperCase(), [workerName]);

  const setCustomAmount = (raw: string) => {
    setCustom(raw);
    const n = Number(raw.replace(/[^0-9.]/g, ""));
    if (Number.isFinite(n) && n > 0) setAmount(Math.round(n * 100));
  };

  const startPayment = async () => {
    if (!quote || quoteState !== "ready") return;
    setStep("payment");
    setRuntimeMessage("Creating a secure tip session…");
    try {
      const create = await fetch("/api/tips", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ endpointToken: token, grossGratuityCents: quote.grossGratuityCents, idempotencyKey: idempotencyKey.current })
      });
      const created = await create.json();
      if (!create.ok) {
        setRuntimeMessage(created?.error?.message ?? "The secure tip session is not available yet.");
        setStep("blocked");
        return;
      }
      const reference = created.tip?.swifttip_reference ?? created.tip?.swifttipReference;
      if (!reference) throw new Error("Missing canonical tip reference");
      setRuntimeMessage("Preparing secure payment…");
      const payment = await fetch(`/api/tips/${encodeURIComponent(reference)}/payments`, { method: "POST" });
      const paymentBody = await payment.json();
      if (!payment.ok) {
        setRuntimeMessage(paymentBody?.error?.message ?? "Live payments are not enabled yet.");
        setStep("blocked");
        return;
      }
      setRuntimeMessage("Payment provider handoff ready.");
    } catch {
      setRuntimeMessage("The secure payment path is not available yet.");
      setStep("blocked");
    }
  };

  if (profile === null) return <section className="tip-flow"><span className="eyebrow">SwiftTip</span><h1>Confirming this worker…</h1><p className="lead">Please wait while we verify the tipping endpoint.</p></section>;
  if (!profile.available || !profile.worker || !profile.venue) return <section className="tip-flow"><span className="eyebrow">Unavailable</span><h1>This SwiftTip profile is currently unavailable.</h1><p className="lead">Please check the worker details or try again later.</p></section>;

  return <>
    <section className="worker-card"><div className="worker-photo">{initials}</div><div className="worker-meta"><strong>{workerName}</strong><span>{profile.worker.role}</span><span>{profile.venue.name}{profile.venue.location ? ` · ${profile.venue.location}` : ""}</span></div>{profile.verification?.verified && <span className="verified-chip">✓ Verified</span>}</section>
    {step === "amount" && <section className="tip-flow"><span className="eyebrow">Your gratuity</span><h1>How much would you like to tip?</h1><p className="lead">You will see the complete amount before payment.</p><div className="amount-grid">{presets.map(v => <button key={v} className={amount===v && !custom ? "amount-button selected" : "amount-button"} onClick={() => {setAmount(v);setCustom("");}}>{formatZar(v).replace(",00","").replace(".00","")}</button>)}<button className={custom ? "amount-button other selected" : "amount-button other"} onClick={() => setCustom(custom || String(amount/100))}>Other amount</button></div>{custom !== "" && <div className="custom-field"><span>R</span><input aria-label="Custom tip amount" inputMode="decimal" value={custom} onChange={e=>setCustomAmount(e.target.value)}/></div>}{quoteState === "loading" && <p className="fee-note">Calculating the current SwiftTip price…</p>}{quoteState === "error" && <p className="prototype-warning" role="alert">This amount cannot be quoted right now. Check the amount and try again.</p>}{quote && quoteState === "ready" && <><MoneyBreakdown pricing={quote} workerName={workerName}/><p className="fee-note">The price shown here comes from the SwiftTip server. The browser does not authoritatively calculate the charge.</p></>}<button className="button button-primary button-large" disabled={!quote || quoteState !== "ready"} onClick={()=>setStep("confirm")}>Continue</button></section>}
    {step === "confirm" && quote && <section className="tip-flow"><span className="eyebrow">Almost there</span><h1>Confirm your tip.</h1><MoneyBreakdown pricing={quote} workerName={workerName}/><div className="stack-actions"><button className="button button-primary button-large" onClick={startPayment}>Pay {formatZar(quote.customerTotalCents)}</button><button className="button button-secondary" onClick={()=>setStep("amount")}>Change amount</button></div></section>}
    {step === "payment" && <section className="tip-flow"><span className="eyebrow">Secure payment</span><h1>Please wait…</h1><p className="lead">{runtimeMessage}</p></section>}
    {step === "blocked" && <section className="tip-flow"><span className="eyebrow">Build safety gate</span><h1>Live payment remains disabled.</h1><p className="lead">{runtimeMessage}</p>{quote && <MoneyBreakdown pricing={quote} workerName={workerName}/>}<p className="prototype-warning">This is deliberate. SwiftTip will not fake payment success or enable real money before the new database, approved provider, signed webhooks, settlement evidence and reconciliation path are configured.</p><button className="button button-secondary" onClick={()=>setStep("confirm")}>Back to confirmation</button></section>}
  </>;
}

function MoneyBreakdown({ pricing, workerName }: { pricing: Quote; workerName: string }) {
  return <div className="money-breakdown"><div className="money-row"><span>Tip to {workerName}</span><strong>{formatZar(pricing.grossGratuityCents)}</strong></div><div className="money-row"><span>SwiftTip service fee</span><strong>{formatZar(pricing.customerFeeCents)}</strong></div><div className="money-row total"><span>Total to pay</span><strong>{formatZar(pricing.customerTotalCents)}</strong></div></div>;
}
