"use client";

import { useMemo, useState } from "react";
import { calculateTipPricing, formatZar, WORKING_PRICING } from "@/lib/money";

const presets = [1000, 2000, 5000, 10000];

export function TipExperience({ token }: { token: string }) {
  const [amount, setAmount] = useState(2000);
  const [custom, setCustom] = useState("");
  const [step, setStep] = useState<"amount" | "confirm" | "blocked">("amount");
  const pricing = useMemo(() => { try { return calculateTipPricing(amount); } catch { return null; } }, [amount]);

  const setCustomAmount = (raw: string) => {
    setCustom(raw);
    const n = Number(raw.replace(/[^0-9.]/g, ""));
    if (Number.isFinite(n) && n > 0) setAmount(Math.round(n * 100));
  };

  if (!pricing) return <div className="tip-flow"><h1>Choose a valid tip amount.</h1><p className="lead">The current build accepts {formatZar(WORKING_PRICING.minimumGratuityCents)} to {formatZar(WORKING_PRICING.maximumGratuityCents)}.</p></div>;

  return <>
    <section className="worker-card"><div className="worker-photo">TM</div><div className="worker-meta"><strong>Thando</strong><span>Fuel Attendant</span><span>Riverside Service Station · Midrand</span></div><span className="verified-chip">✓ Verified</span></section>
    {step === "amount" && <section className="tip-flow"><span className="eyebrow">Your gratuity</span><h1>How much would you like to tip?</h1><p className="lead">The worker and venue are confirmed before payment.</p><div className="amount-grid">{presets.map(v => <button key={v} className={amount===v && !custom ? "amount-button selected" : "amount-button"} onClick={() => {setAmount(v);setCustom("");}}>{formatZar(v).replace(",00","").replace(".00","")}</button>)}<button className={custom ? "amount-button other selected" : "amount-button other"} onClick={() => setCustom(custom || String(amount/100))}>Other amount</button></div>{custom !== "" && <div className="custom-field"><span>R</span><input aria-label="Custom tip amount" inputMode="decimal" value={custom} onChange={e=>setCustomAmount(e.target.value)}/></div>}<MoneyBreakdown pricing={pricing}/><p className="fee-note">The current working hypothesis is a customer service fee of R1 + 3% of the tip, capped at R5. Pricing remains versioned and server-authoritative in production.</p><button className="button button-primary button-large" onClick={()=>setStep("confirm")}>Continue</button></section>}
    {step === "confirm" && <section className="tip-flow"><span className="eyebrow">Almost there</span><h1>Confirm your tip.</h1><MoneyBreakdown pricing={pricing}/><div className="stack-actions"><button className="button button-primary button-large" onClick={()=>setStep("blocked")}>Pay {formatZar(pricing.customerTotalCents)}</button><button className="button button-secondary" onClick={()=>setStep("amount")}>Change amount</button></div><p className="prototype-warning">This build deliberately refuses to simulate a real successful payment. Payment activation remains disabled until the approved provider, split-at-source model, webhook verification and settlement/reconciliation paths are configured.</p></section>}
    {step === "blocked" && <section className="tip-flow"><span className="eyebrow">Build safety gate</span><h1>Payment is not enabled yet.</h1><p className="lead">The customer journey is built, but real money remains intentionally blocked until the provider and production financial gates are approved.</p><div className="money-breakdown"><div className="money-row"><span>Tip reference context</span><strong>{token}</strong></div><div className="money-row total"><span>Would charge</span><strong>{formatZar(pricing.customerTotalCents)}</strong></div></div><button className="button button-secondary" onClick={()=>setStep("confirm")}>Back to confirmation</button></section>}
  </>;
}

function MoneyBreakdown({ pricing }: { pricing: ReturnType<typeof calculateTipPricing> }) {
  return <div className="money-breakdown"><div className="money-row"><span>Tip to Thando</span><strong>{formatZar(pricing.grossGratuityCents)}</strong></div><div className="money-row"><span>SwiftTip service fee</span><strong>{formatZar(pricing.customerFeeCents)}</strong></div><div className="money-row total"><span>Total to pay</span><strong>{formatZar(pricing.customerTotalCents)}</strong></div></div>;
}
