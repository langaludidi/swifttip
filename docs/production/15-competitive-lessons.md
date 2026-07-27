# SwiftTip — Competitive Lessons (Jul 2026)

Sources reviewed: Tipsy (tipsypay.co.za), NoCashPay, MyTip, Tipd, TopTipper, TipTopJar,
EasyTip, Instant/eTip (US), TotalEnergies Club (prior page). MVP unchanged; these are
lessons to incorporate, decisions unlocked, and deferrals with reasons.

## Decisions unlocked by market evidence

1. **Regulatory route — feed the specialist:** NoCashPay operates QR tipping with
   next-day payouts as a self-described PASA-approved Third Party Payment Provider.
   Question for the specialist is now concrete: is TPPP registration our route for the
   custody model, and what does it require? (Also validates overnight payout as market
   norm.) → append to 08-funds-model-decision.md.
2. **Fee bearer — decide before pilot pricing:** Tipd/TopTipper run tipper-pays-fees,
   worker-keeps-100%; workers publicly cite it as why they stay, and a Tipsy
   testimonial shows a worker leaving a platform over a 10% cut. Recommendation:
   customer-side fee, "100% goes to the worker" as a stated guarantee. Owner decision.

## Incorporate (cheap, in-scope)

3. **"Verified workers" as a headline feature** — no SA competitor leads with
   verification; our KYC loop is a differentiator, not plumbing. Use on tip page +
   badge ("Verified worker" chip already exists).
4. **Safety narrative for worker recruitment** — cashless = not carrying cash = not
   robbed (Tipsy testimonial). Put in worker-facing badge/marketing copy.
5. **Collect before/after earnings during pilot** — per-worker daily earnings pre/post
   (Tipsy's R150→R300 story). Design the pilot log to capture this from day 1.
6. **Tip notification SMS** — already Tier 2; market standard (NoCashPay real-time
   SMS). No change, just confirmation.

## Post-pilot roadmap (deferred, with reasons)

7. **Agent-assisted onboarding** — Tipsy's model; how informal workers actually get
   onboarded at scale. Pilot #1: owner is the agent. Pilot #2+: formalize.
8. **Worker story line on tip page** — TipTopJar: personalization lifts tips. One
   field, later.
9. **Multi-person tip / team split** — EasyTip; needs employer constructs. Pilot #2+.
10. **Refunds** — EasyTip supports; ours is an admin-ops question. Note for console
    backlog.
11. **Tax reporting for workers** — differentiator later (EasyTip/eTip pattern).
12. **USSD balance check for workers** — from TE Club review; feature-phone inclusion.

## Anti-patterns confirmed (do NOT adopt)

- **Customer wallet/app before tipping** (MyTip): loading funds before a generous
  impulse kills conversion. Our no-app flow stands.
- **Tipping gated behind loyalty membership** (TE Club: 6 gates, R10 cap).
- **Platform % cut framed opaquely** (Tipsy competitor testimonial): whatever fee
  model we choose, print it plainly.

## Strategic read

Market has converged on the core (QR, no app, ~100% to worker, next-day payout, SMS).
Core is table stakes; differentiation is trust (verification), onboarding reach
(agents), and fee transparency. Our security/KYC investment is the moat — market it.
