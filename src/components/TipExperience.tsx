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
    setRuntimeMessage("Creating your SwiftTip transaction…");
    try {
      const create = await fetch("/api/tips", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ endpointToken: token, grossGratuityCents: quote.grossGratuityCents, idempotencyKey: idempotencyKey.current })
      });
      const created = await create.json();
      if (!create.ok) {
        setRuntimeMessage(created?.error?.message ?? "The tip session is not available yet.");
        setStep("blocked");
        return;
      }
      const reference = created.tip?.swifttip_reference ?? created.tip?.swifttipReference;
      if (!reference) throw new Error("Missing canonical tip reference");
      setRuntimeMessage("Preparing the payment handoff…");
      const payment = await fetch(`/api/tips/${encodeURIComponent(reference)}/payments`, { method: "POST" });
      const paymentBody = await payment.json();
      if (!payment.ok) {
        setRuntimeMessage(paymentBody?.error?.message ?? "Live payments are not enabled yet.");
        setStep("blocked");
        return;
      }
      setRuntimeMessage("Payment provider handoff ready.");
    } catch {
      setRuntimeMessage("The payment path is not available yet.");
      setStep("blocked");
    }
  };

  if (profile === null) return <section className="tip-flow loading-state"><span className="eyebrow">Checking recipient</span><h1>Confirming this worker…</h1><p className="lead">We’re loading the worker profile linked to this SwiftTip code.</p></section>;
  if (!profile.available || !profile.worker || !profile.venue) return <section className="tip-flow"><span className="eyebrow">Unavailable</span><h1>This worker profile can’t receive a tip right now.</h1><p className="lead">Check the QR or worker code and try again.</p></section>;

  return <>
    <TipProgress step={step} />
    <section className="worker-card polished-worker-card">
      <div className="worker-photo">{profile.worker.photoUrl ? <img src={profile.worker.photoUrl} alt="" /> : initials}</div>
      <div className="worker-meta"><span className="worker-card-label">You’re tipping</span><strong>{workerName}</strong><span>{profile.worker.role}</span><span>{profile.venue.name}{profile.venue.location ? ` · ${profile.venue.location}` : ""}</span></div>
      {profile.verification?.verified && <span className="verified-chip">✓ Verified</span>}
    </section>

    {step === "amount" && <section className="tip-flow amount-step"><span className="eyebrow">Choose an amount</span><h1>How much would you like to give?</h1><p className="lead">Your gratuity is voluntary. You’ll review the complete total before payment.</p><div className="amount-grid polished-amount-grid">{presets.map(v => <button key={v} className={amount===v && !custom ? "amount-button selected" : "amount-button"} onClick={() => {setAmount(v);setCustom("");}}>{formatZar(v).replace(",00","").replace(".00","")}</button>)}<button className={custom ? "amount-button other selected" : "amount-button other"} onClick={() => setCustom(custom || String(amount/100))}>Other amount</button></div>{custom !== "" && <div className="custom-field polished-custom-field"><span>R</span><input aria-label="Custom tip amount" inputMode="decimal" value={custom} onChange={e=>setCustomAmount(e.target.value)} placeholder="0.00"/></div>}{quoteState === "loading" && <p className="fee-note quote-status">Updating total…</p>}{quoteState === "error" && <p className="prototype-warning" role="alert">This amount can’t be quoted right now. Check the amount and try again.</p>}{quote && quoteState === "ready" && <MoneyBreakdown pricing={quote} workerName={workerName}/>}<button className="button button-primary button-large sticky-primary" disabled={!quote || quoteState !== "ready"} onClick={()=>setStep("confirm")}>{quote ? `Review ${formatZar(quote.customerTotalCents)} total` : "Review total"}</button></section>}

    {step === "confirm" && quote && <section className="tip-flow confirm-step"><span className="eyebrow">Review your tip</span><h1>Everything look right?</h1><div className="confirmation-recipient"><span className="worker-initial">{initials.slice(0,1)}</span><div><strong>{workerName}</strong><span>{profile.worker.role} · {profile.venue.name}</span></div></div><MoneyBreakdown pricing={quote} workerName={workerName}/><div className="confirmation-note"><span>✓</span><p>The amount below is the total you are authorising. Payment confirmation and worker settlement are recorded separately.</p></div><div className="stack-actions"><button className="button button-primary button-large" onClick={startPayment}>Continue to payment · {formatZar(quote.customerTotalCents)}</button><button className="button button-secondary" onClick={()=>setStep("amount")}>Change amount</button></div></section>}

    {step === "payment" && <section className="tip-flow payment-wait"><span className="eyebrow">Payment</span><h1>Preparing the next step…</h1><p className="lead" aria-live="polite">{runtimeMessage}</p><div className="progress-pulse" aria-hidden="true" /></section>}

    {step === "blocked" && <section className="tip-flow"><span className="eyebrow">Payments not active</span><h1>Live payment is still disabled.</h1><p className="lead">{runtimeMessage}</p>{quote && <MoneyBreakdown pricing={quote} workerName={workerName}/>}<p className="prototype-warning">This is deliberate. SwiftTip will not present a payment as successful until the approved provider, payment evidence, settlement and reconciliation controls are live.</p><button className="button button-secondary" onClick={()=>setStep("confirm")}>Back to review</button></section>}
  </>;
}

function TipProgress({ step }: { step: "amount" | "confirm" | "payment" | "blocked" }) {
  const index = step === "amount" ? 1 : step === "confirm" ? 2 : 3;
  return <div className="tip-progress" aria-label={`Tip progress, step ${index} of 3`}><span className={index >= 1 ? "active" : ""}>1</span><i className={index >= 2 ? "active" : ""}/><span className={index >= 2 ? "active" : ""}>2</span><i className={index >= 3 ? "active" : ""}/><span className={index >= 3 ? "active" : ""}>3</span><b>{index === 1 ? "Amount" : index === 2 ? "Review" : "Payment"}</b></div>;
}

function MoneyBreakdown({ pricing, workerName }: { pricing: Quote; workerName: string }) {
  return <div className="money-breakdown polished-money-breakdown"><div className="money-row"><span>Gratuity to {workerName}</span><strong>{formatZar(pricing.grossGratuityCents)}</strong></div><div className="money-row"><span>SwiftTip service fee</span><strong>{formatZar(pricing.customerFeeCents)}</strong></div><div className="money-row total"><span>Total to pay</span><strong>{formatZar(pricing.customerTotalCents)}</strong></div></div>;
}
