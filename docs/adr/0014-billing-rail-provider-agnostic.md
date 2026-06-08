# ADR-0014 — Recurring billing rail: provider-agnostic architecture (Path 2), Razorpay as v1 leaf

**Status**: ✅ Approved — Path 2 architecture + RazorpayProvider as v1 leaf (sign-off 2026-05-25 alongside D.1 spec sign-off; implementation cleared to start S1)
**Date**: 2026-05-23 (architecture); 2026-05-25 (leaf provider decision)
**Session**: 2026-05-23 night (architecture) + 2026-05-25 (Yes Bank evaluation outcome)

## Context

The platform launches without launch-grade recurring billing — DSAs pay manually every cycle (one-time Razorpay orders), with no auto-pay, no GST invoicing, no failed-payment escalation, no daily reconciliation. Epic D opens with **D.1 — recurring billing**, which gates D.2-D.6 (GST invoice, refund, dunning, reconcile, pricing fence).

The owner asked for the three viable architectures to be evaluated honestly, especially the "skip the 2% middleman" question.

### The regulatory floor

Recurring debits in India go through NPCI rails (eNACH for bank-account debits, UPI AutoPay for UPI mandates). Non-bank entities cannot integrate with NPCI directly — RBI gatekeeping. The merchant either:
1. Uses a payment aggregator with PA/PG license (Razorpay, Cashfree, BillDesk) — pays ~2% per transaction
2. Onboards under a sponsor bank's NPCI access (Yes Bank, HDFC, ICICI Corporate) — pays ~₹2-5 flat per debit + ops overhead

The choice is "rent the access" or "rent the access through a different intermediary with thinner margin but more operational load." Direct NPCI access without a sponsor isn't available to non-banks.

### Three paths considered

| Path | Description | Per-debit cost | Build effort | Onboarding | Lock-in |
|---|---|---:|---|---|---|
| **1** | Razorpay Subscriptions (their state machine + retries + lifecycle events) | ~2% | ~3 days | None (already integrated) | Razorpay subscription object model |
| **2** | Build orchestration ourselves; Razorpay as payment-rail only | ~2% | ~11.5 days | None | None — can swap rail later |
| **3** | Build orchestration ourselves; sponsor-bank (Yes Bank candidate) as payment rail | ~₹2-5 flat | ~11.5 days + 4-12 wk bank onboarding | Yes Bank corporate banking contract | Sponsor-bank specific |

### The Yes Bank insight

Owner is an existing Yes Bank corporate customer. Yes Bank is **first bank in India** to offer API-based digital NACH onboarding (2-day mandate registration vs 15-20 days paper). They power 12 of 37 third-party UPI apps as PSP. Fintech-pedigree partnerships (Juspay HyperUPI, BharatPe, PhonePe). Yes Bank is a genuinely viable Path 3 sponsor — the "₹15-20L/mo crossover" generic estimate may not apply because (a) onboarding leverage from existing relationship and (b) Yes Bank's API maturity reduces integration cost.

What's NOT publicly known: their per-transaction fee, setup fee, volume commitment, sandbox quality, chargeback handling. These gate the leaf provider decision.

## Decision

**Build the orchestration layer with a provider-agnostic `BillingProvider` interface (Path 2 architecture). Ship `RazorpayProvider` as the v1 leaf implementation.**

Concretely:
- Subscription state machine, retry logic, dunning escalation, reconciliation, audit, kill-switch — **all provider-independent** and shipped in slices S1-S8 of D-1 spec
- `BillingProvider` interface defined in S1 (see spec §3.1)
- First (and v1-only) leaf implementation is `RazorpayProvider` using Razorpay's standard charge/refund APIs (NOT their Subscriptions product — that's Path 1, deliberately rejected)
- Swapping providers later = implement one new file + flip an env var. The interface is the insurance policy.
- Path 1 (Razorpay Subscriptions) kept as a **kill switch** — if Path 2 build proves harder than estimated, revert to Razorpay Subscriptions in 1-2 days (subscription document shape is superset of what Subscriptions need)

## Yes Bank evaluation outcome (2026-05-25)

The Yes Bank corporate banking conversation surfaced **multiple soft disqualifiers** rather than one hard dealbreaker. No single factor was conclusive on its own; the net evaluation was that Yes Bank is **not the right v1 leaf**:

- **Per-debit fee economics didn't clear the bar.** The fee structure was not materially better than Razorpay's 2% at our v1 volume — the ~₹75K-300K/mo savings the architecture spec contemplated would not materialize at projected near-term volume.
- **Onboarding timeline pressure.** Realistic KYC + agreement + technical integration timeline would push first live mandate well past the v1 launch window. Path 2's "build orchestration now, swap rail later" optionality is the right hedge against this.
- **Sandbox / API maturity gap for R11.** Sandbox does not appear to support every synthetic failure event the R11 mitigation needs (mandate-authorized + charge-success + charge-failed + mandate-revoked all driven from one place). Without that, we cannot drive the state machine through every failure path in tests, which is the whole point of R11.
- **Operational load (chargebacks, disputes, card mandates).** Sponsor-bank model pushes more ops load onto the merchant. Card mandate support (Q10) does not cover everything we'd need long-term, which means even on a Yes Bank rail we would still need a card provider — defeating part of the cost rationale.

**This is not a permanent rejection.** Re-evaluation trigger #1 below still applies — if Yes Bank's terms improve, or if a different sponsor bank becomes a viable Path 3 candidate, the `BillingProvider` interface absorbs the swap cheaply. The Yes Bank specifics in D.1 spec §9 are preserved for any future revisit.

## Consequences

### Positive

- **Optionality.** We can ship Razorpay-first for time-to-market, then migrate to Yes Bank when their terms or our volume justify, without rewriting the orchestration.
- **Future-proof against rail changes.** If Razorpay ever materially changes terms or Yes Bank's terms become favorable, we swap one file.
- **No subscription-model lock-in.** Path 1 ties pricing model to whatever Razorpay's subscription object supports. Path 2 lets us build usage-based pricing (per-case rather than per-month) or hybrid plans if growth requires.
- **Path 3 cost savings are recoverable.** At ~₹15-20L/mo GMV (or sooner if Yes Bank's terms are favorable), direct sponsor-bank integration saves ~₹75K-300K/mo vs Razorpay's 2%.
- **Cleaner test surface.** A `MockProvider` lets us drive the state machine through every failure path without provider sandboxes.

### Negative

- **+8.5 days build effort** vs Path 1 (~11.5 days vs ~3 days).
- **More owned code** in a regulatory-sensitive domain (money path). Mitigated by 14-risk register in spec §5, each with built-in mitigation + regression test.
- **State machine maintenance burden.** Razorpay would have maintained their subscription state machine for us; now we own it.
- **Webhook handling complexity.** We process raw provider events into normalized state transitions rather than just consuming Razorpay's pre-normalized events.

### Trade-offs accepted

- **Effort vs optionality.** Spec quoted 8-10 days; "nothing-unattended" rigor (R1-R14 mitigations + reconcile coverage + kill switch) added 1.5 days. Worth it for the optionality.
- **2% fee paid in v1 even if Path 3 is goal.** Razorpay-first is acceptable as the rented runway while orchestration is proven; sponsor-bank swap is a follow-up program, not a prerequisite for v1.
- **No mid-cycle pro-ration in v1.** Plan changes effective next cycle. Matches Razorpay Subscriptions' default; simplifies S3 cycle math; revisitable post-v1.

## Re-evaluation triggers

This ADR should be revisited if any of:

1. **Yes Bank (or another sponsor bank) improves terms** — per-transaction fee materially below Razorpay's 2% (e.g. < ₹10 flat), sandbox supports all R11 simulated events, onboarding ≤ 4 weeks, ops load comparable to Razorpay. → swap leaf to `YesBankProvider` (or new sponsor); keep Razorpay for cards if their card-mandate gap persists.
2. **Volume crosses ~₹15L/month sustained GMV** — direct sponsor-bank savings become material enough to justify any remaining ops overhead, even at parity-ish per-debit fees.
3. **RBI advisory** changes mandate language or origination requirements in a way that breaks our state machine.
4. **Razorpay terms or service degrade** (pricing change, service issue, contract dispute) — `BillingProvider` interface should absorb a swap cleanly; if not, the interface design itself is wrong and this ADR is superseded.

## Alternatives Considered

### Path 1 — Razorpay Subscriptions

Rejected. **Lock-in to Razorpay's subscription model** is the dealbreaker. Razorpay Subscriptions handles standard fixed-tier monthly/annual cleanly; future requirements (per-case usage-based pricing, hybrid plans, mid-cycle changes with custom rules) don't fit. Migration off later = full rewrite of state + retry + dunning. Builds in 3 days but commits us for years.

### Path 3 v1 — Yes Bank direct from day 0

Rejected as v1 starting point. **Bank onboarding timeline is uncertain** (4-12 weeks realistic). Delays launch. Better to ship orchestration with Razorpay-as-rail first, prove the state machine in production, then swap to Yes Bank when their contract is in place. The `BillingProvider` interface (Path 2 architecture) makes this swap cheap.

### Hybrid (Razorpay for cards + Yes Bank for bank debits)

Rejected for v1. Only justified at scale (~₹2Cr+/mo GMV). Adds complexity (two providers, two reconciliation flows, two webhook secrets) without saving meaningful money at launch volume. **Moot for v1 since Yes Bank wasn't pursued** (see "Yes Bank evaluation outcome" above) — but the concern would apply to any future sponsor-bank hybrid attempt. Reconsider per re-evaluation trigger #2.

### Customer-initiated standing instructions (no eNACH at all)

Rejected. DSA tells their bank "debit ₹X to digitaldsa every month" — opt-in at customer's bank, no merchant API. Operationally unworkable: no way to detect failed standing instructions, no way to enforce timing, no way to handle plan changes. Manual reconciliation only. Fine for invoicing models but not for SaaS subscription.

## Implementation pointer

Full architecture, slice breakdown (S1-S8), risk register (R1-R14), security checklist, operator runbook outline, kill-switch revert procedure, 10-question Yes Bank RM agenda, and 6 lock-down questions for owner decision: see [`docs/specs/D-1-RECURRING-BILLING-SPEC.md`](../specs/D-1-RECURRING-BILLING-SPEC.md).

## References

- `docs/specs/D-1-RECURRING-BILLING-SPEC.md` — full spec (this ADR's implementation)
- `docs/specs/POST-AUDIT-IMPLEMENTATION-MASTER-SPEC.md` §3 + §D.1 (original Path 1/2 outline — Path 3 added in this work)
- `docs/CHANGELOG.md` — 2026-05-23 night planning entry
- `src/lib/server/auditLog.ts` (C.5 helper — consumed by money-row retention path)
- Sources for Yes Bank capability claims: linked in spec §9
