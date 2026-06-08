# D.1 Recurring Billing Spec + ADR-0014 — Sign-off Critique

**Reviewed**: 2026-05-25 against `docs/specs/D-1-RECURRING-BILLING-SPEC.md` (543 lines) + `docs/adr/0014-billing-rail-provider-agnostic.md` (106 lines).
**Reviewer**: Claude (sign-off prep, written while owner is on Yes Bank RM call).
**Verdict**: **Architecture is sound; spec is publishable after addressing P1 findings below.** No fundamental rework required. ADR-0014's Path 2 reasoning is correct.

The findings are grouped by priority. Each is concrete: what's wrong/missing, why it matters, recommended fix or wording change.

---

## P0 — Lock-down questions must be resolved before code (these are blockers)

### P0-1. Q3 (max-amount cap) — unit-of-measure is wrong

> §11 Q3: "Max-amount cap on mandates — `12 × monthly` (₹47,988 for Pro tier) OR higher..."

RBI mandates set a **per-debit** ceiling, not a cumulative annual one. `12 × monthly` as a single-debit cap means **one debit could legally pull a full year's fees**, which is exactly what max-amount is designed to prevent. The right framing is one of:

- **Single-debit cap = monthly amount + small buffer** (e.g. ₹4,500 for a ₹3,999 plan) — tight, requires re-mandate on any price increase
- **Single-debit cap = monthly amount × 1.5** — gives room for one price increase before re-mandate
- **Single-debit cap = annual amount** — only if you intend to support both monthly AND annual billing on the same mandate (Q5 outcome)

**Recommendation**: rewrite Q3 as: "Per-debit max-amount cap — `monthly + buffer` (tight, re-mandate on price increase) OR `12 × monthly` (loose, but enables annual billing on the same mandate per Q5). Decide jointly with Q5."

### P0-2. Q2 (cycle anchoring) — what happens on Jan 31?

> §11 Q2: "Subscribe-day-anchored"

The state-doc field comment already says `cycle_anchor_day?: number, // 1-28 (avoiding 29-31 for month-boundary safety)`. So someone who subscribes on Jan 31 will charge on **Feb 28**, not Feb 31. That's the right answer, but Q2 doesn't disclose this caveat. An owner picking "subscribe-day-anchored" might assume it's literal.

**Recommendation**: append to Q2: "Subscribe-day capped at 28 (subscribes on 29/30/31 → anchored to 28 of subsequent months). Surface this in the subscribe modal disclosure."

### P0-3. Q1 (money-row retention) — the two options aren't really different

> §11 Q1: "Money-row retention storage — separate `BillingAuditLogs` collection (no TTL) OR per-row TTL override on `PolicyAuditLogs`?"

Both options achieve 6-year retention. The real architectural distinction is: do you want billing audit queryable **alongside** policy audit (mixed collection, two TTLs) or **isolated** (separate collection, simpler queries, easier ops). The current framing makes it look like a retention decision when it's actually a query-locality decision.

**Recommendation**: rephrase as "Billing audit log location — isolated `BillingAuditLogs` collection (cleaner ops; admin tooling needs two queries to see full audit) OR co-located with `PolicyAuditLogs` (one query but mixed TTLs require careful aggregation). 6-year retention is identical either way."

### P0-4. The 6th lock-down (provider) needs a fallback decision today, not after the call

> §11 Q6: "Provider — decision deferred to Week 0"

If the Yes Bank call goes well, you'll pick `YesBankProvider`. If it goes poorly (high fees, long onboarding, weak sandbox), you fall back to `RazorpayProvider`. **Define the fallback threshold today** so post-call decisions are mechanical, not negotiated under pressure.

**Recommendation**: insert a §11.1 block: "Yes Bank decision rule — pick YesBankProvider IF (per-debit fee ≤ ₹15 AND sandbox supports all R11 simulation events AND onboarding ≤ 4 weeks). Otherwise default RazorpayProvider, revisit Yes Bank in 6 months."

---

## P1 — State machine gaps (will bite during S1/S4 implementation)

### P1-1. State diagram missing legal transitions

The ASCII diagram (§3.2) shows the happy path + dunning advance, but the following **legal transitions are written in prose but not drawn**:

- `dunning_grace → active` (retry succeeds during grace period — S4 step 5)
- `dunning_final → active` (retry succeeds during final — S4 step 5)
- `dunning_t0 → downgraded` (MANDATE_INVALID code on retry attempt — §3.3 row 2)
- `dunning_grace → downgraded` (same, on later retry)
- `pending_mandate → not_subscribed` (24h TTL expiry — implied by S2 but never stated)
- `cancelled → pending_mandate` (re-subscribe — not in diagram, but should be allowed)

**Why it matters**: §4 S1 says "every legal transition (✅), every illegal transition (throws)". Without a complete enumeration, the implementer either over-restricts (breaking valid flows) or under-restricts (allowing illegal ones). I count at least 6 missing edges.

**Recommendation**: add a "Transition table" (separate from the diagram) listing every (from, to, trigger) tuple. Use that table as the source of truth; diagram is illustrative.

### P1-2. `pending_mandate` failure handling is undefined

What happens if the user abandons authorization at the provider's hosted page? The 24h TTL handles it eventually, but during those 24h:

- Can the same DSA click "Subscribe" again? The state machine doesn't say.
- If they do, do we create a fresh `pending_mandate` (overwriting the prior token)? Or block them with "you already have a pending mandate, complete or wait 24h"?
- If we overwrite, what happens if the original mandate later authorizes asynchronously?

**Recommendation**: explicit policy: "While in `pending_mandate`, re-clicking Subscribe cancels the prior token (call `provider.queryMandateStatus` + abort if still pending; webhook for original mandate is then no-op due to mismatched token in state)."

### P1-3. R6 (retry-during-card-update) needs a UX flow

Risk register §5 R6 says "card-update flow holds advisory lock (5min)". But there's no card-update endpoint anywhere in S1-S8. If the DSA needs to change their payment method, what's the flow? Cancel + re-mandate? In-place mandate replacement? This is a missing slice.

**Recommendation**: add **S6.5 — Payment method update** (or fold into S6). Without it, R6's mitigation references a flow that doesn't exist.

### P1-4. Upgrade UX is bad with "next-cycle only" rule

R8 + §5 says "plan changes effective next cycle. No mid-cycle pro-ration in v1." That's fine for **downgrades** (DSA keeps higher-tier access through end of cycle, then steps down) — generous.

For **upgrades**, it's terrible UX: DSA pays for Pro on day 15 but waits 15 days to use Pro features. Almost no SaaS does this. Either pro-rate the upgrade now (charge immediately for the difference) or grant Pro features immediately and charge difference at next cycle.

**Recommendation**: split R8 into upgrade vs downgrade. Upgrade: immediate access, charge prorated difference now (Stripe/Razorpay convention). Downgrade: next-cycle only (your current rule).

---

## P1 — Operator/Risk gaps

### P1-5. Email deliverability is a hidden dependency on SEC-8

S5 dunning + S2 mandate auth + S6 cancel confirmations all depend on emails landing in the DSA's inbox. **Email hardening (Nodemailer → SES + SPF/DKIM/DMARC) is deferred per SEC-8** (CLAUDE.md §8 production blockers). Dunning emails sent from current Nodemailer config have a real chance of landing in spam — which means DSAs don't see the "your payment failed" warning, then get downgraded with no advance notice from their perspective.

**Recommendation**: add to §5 R-risk register as R15: "Dunning emails land in spam → silent downgrade → angry DSA. Mitigation: SEC-8 (SES + SPF/DKIM/DMARC) is a **hard prerequisite** for D.1 launch, not deferred." Bump SEC-8 from "deferred until beta" to "deferred until D.1 launch (whichever is sooner)."

### P1-6. R14 (cron region duplicate) — TTL is too long

> §5 R14: "`cronLocks` collection with TTL acquires global lock at start"

§4 S3 says TTL is 30 min. If region A acquires the lock, processes 50 of 100 subscriptions, then crashes, the lock is held for 30 minutes before region B can pick up — that's 30 minutes of stalled billing recovery.

**Recommendation**: shorter TTL (5 min) + heartbeat extension (cron extends lock every 60s while running). Or: per-batch claim instead of global lock (each cron run claims N subscriptions atomically, processes, releases — naturally resumable).

### P1-7. R11 dev/prod gating is fragile

> §5 R11: "Build `/api/test/billing/simulate-event` (dev-only, 404 in prod)"

The dev/prod gate must use the right detection mechanism. SvelteKit/Vercel preview deploys run in production mode (`NODE_ENV=production`) even though they're not real production. The `$app/environment` `dev` boolean is the safe gate; `NODE_ENV` is not.

**Recommendation**: add to §6 security checklist: "Test endpoints gated on `import { dev } from '$app/environment'`, not `process.env.NODE_ENV`. Preview deploys must NOT expose simulation endpoints."

### P1-8. Reconcile timezone is underspecified

§4 S7 says "fetch provider's settlement report for prior day" at 04:00 IST. But settlements at the provider may roll over at midnight UTC, midnight IST, or per their batch close (Razorpay's is 23:30 IST). "Prior day" is ambiguous: prior calendar day in IST? In UTC? In settlement-batch terms?

**Recommendation**: define explicitly. "Settlement window = prior IST calendar day [00:00–23:59:59 IST]; fetch provider's settlement reports that fall within. Reconcile only after the provider's last batch of that window has closed (verify Razorpay/Yes Bank batch-close time during S7 build)."

### P1-9. Invoice numbering for refunds (D.3) — credit-note sequence not addressed

> §5 R10: "Gapless counter via atomic findOneAndUpdate"

R10 covers invoices for **charges**. GST regs require **credit notes for refunds** to have their own gapless sequence (CN-FY2026-NNNN). This isn't mentioned in D.1 spec or risk register, even though D.3 is downstream.

**Recommendation**: add R10b: "GST credit-note numbering for refunds (D.3) follows same gapless-counter pattern, separate counter doc `{_id: 'cn_fy_2026'}`. Reconcile cross-checks credit-note count vs refund count."

### P1-10. "Day N" of dunning is not defined as IST or business days

§4 S5 says "days_since_failure ≥ 3", "≥ 7", "≥ 8". Question: is "day" a 24h period, a calendar day, an IST calendar day, or a business day? If the first failure is at 23:55 IST on Tuesday, when is "day 3"? 23:55 IST Friday (3 × 24h)? Friday at 00:00 IST (calendar day 3)? Following Monday (3 business days)?

**Recommendation**: "Day N = `floor((now - first_failure_at) / 24h)` in IST. No business-day calculation; weekends/holidays count." Document in S5.

---

## P1 — Mobile / Capacitor (the platform target you keep forgetting)

### P1-11. Authorization URL handling on Android (Capacitor) is unaddressed

The platform ships Capacitor 7 Android per CLAUDE.md §7. Hosted authorization pages (Razorpay or Yes Bank) need to either:

- Open in the in-app WebView (and return via a deep-link callback) — needs URL whitelisting in `capacitor.config.ts`
- Open in the system browser (Custom Tabs) — needs Capacitor Browser plugin + deep-link return

Neither is in S2. The web flow assumes desktop browser redirect.

**Recommendation**: add S2.5 — Capacitor mandate-auth bridge. Defines deep-link callback URL, browser plugin usage, fallback if user closes the browser without completing authorization.

---

## P2 — Spec hygiene / wording

### P2-1. "5 lock-down questions" vs "6 lock-down questions" inconsistency

ADR-0014 line 96 says "6 lock-down questions for owner decision". Spec §1 line 3 says "5 lock-down questions in §11". Spec §11 table has 6 rows. Pick one and use it everywhere.

### P2-2. The spec/ADR cross-references the wrong session date for the CHANGELOG entry

§12 references "`docs/CHANGELOG.md` — 2026-05-23 late-evening (Pitfall #47 billing UX) + 2026-05-23 night (this planning conversation)". The 2026-05-23 night CHANGELOG entry should exist; verify and link by line if possible.

### P2-3. R11 says "Build /api/test/billing/simulate-event" but no slice owns it

Which slice ships the test simulator? Implied to be S1 or S2 (needs to exist for testing S3+), but not explicitly assigned. Without an owner, this slips.

**Recommendation**: assign to S1 ("ships alongside the state model so subsequent slices can drive it").

### P2-4. Subscription state list in the doc shape doesn't match the diagram

State enum (§3.2 lines 200-204) includes `'pending_mandate'` — good. But the diagram and prose use `dunning_t0` / `dunning_grace` / `dunning_final` while the doc says `'dunning_t0' | 'dunning_grace' | 'dunning_final'`. Consistent. Just confirm no other states slipped (e.g. `pending_cancel` for the cancel-at-cycle-end flag — currently it's a separate boolean, not a state). Worth a quick audit pass after edits.

### P2-5. ADR-0014 doesn't list "no card-mandate support in v1" as a trade-off

If Q10 (Yes Bank doesn't offer card mandates) lands "no", the v1 product **requires two providers** (Yes Bank for eNACH + Razorpay for cards). That's a real architectural commitment hidden inside an ADR consequence section. Surface it.

---

## P3 — Things to consider but not blockers

### P3-1. Successful-charge notification email

S3 emits invoice generation for D.2 but doesn't send a "you've been charged" email. Silent debits surprise users → support tickets. Industry standard is a charge receipt email at every successful debit.

**Recommendation**: S3 acceptance includes "DSA receives charge confirmation email within 5 min of cron-run." Cheap to add now; expensive to retrofit.

### P3-2. Operator §7 missing healthy baselines

§7 lists abnormal-condition thresholds (>2% timeouts, >3× cancel baseline) but doesn't define the healthy baseline. First operator wakeup will be: "is this normal or bad?" Hard to answer without baselines.

**Recommendation**: capture v1 baselines after first 7 days of production traffic; bake into runbook.

### P3-3. Webhook idempotency TTL of 90 days is short for disaster recovery

§6 says `processedWebhookEvents` has 90-day TTL. In a true DR scenario (e.g., 6 months later, replay provider's webhook history to reconstruct state), we'd reprocess older events without dedup protection. Bump to 18 months unless there's a storage cost concern.

### P3-4. The kill-switch is well-planned but missing a rehearsal

§8 says "revert procedure" but no rehearsal/test plan. Without a documented "we ran this drill on date X" entry, the kill-switch is theoretical.

**Recommendation**: S7 acceptance includes "kill-switch dry-run executed against staging, full revert in <2h verified." Otherwise the "1-2 days" estimate is hopeful.

---

## P3 — Yes Bank call agenda — one missing question

The 10 questions in §9 cover the architecture well, but one omission: **Q11 (suggested) — chargeback liability split**. Who bears the cost of a chargeback — sponsor bank, merchant, or shared? Razorpay absorbs most chargeback ops; sponsor banks often push them back to the merchant. This affects ops staffing more than per-debit cost.

Worth asking on the call if there's time.

---

## What's missing entirely from the spec

These aren't gaps in existing sections — they're full topics not addressed:

1. **GDPR/RBI data-locality for mandate tokens**. RBI requires payment data stored in India. Where do MongoDB Atlas + provider PII (mandate_token, email, mobile) live? Atlas region matters.
2. **Provider sandbox parity tests for `MockProvider`**. The mock needs to behave like Razorpay's sandbox so tests written against it don't break when hitting real sandbox. No contract tests defined.
3. **DSA-facing transaction history page**. Where does the DSA see their billing history? "Manage subscription" panel mentioned (S6) but no transaction list. Operator needs this too for support tickets.
4. **Pricing-change communication flow**. If you change Pro tier from ₹3,999 to ₹4,499, what's the legal notification window? RBI mandate re-authorization needed? UX flow?

These can be follow-up sub-specs, but flag them now so they're not "discovered" mid-build.

---

## Summary — what to do before approving spec

1. **P0 fixes (4 items)** — rewrite Q1, Q2, Q3, add §11.1 fallback rule. ~20 minutes of doc edit. **Do before owner sign-off.**
2. **P1 fixes (11 items)** — significant; add transition table, S2.5 Capacitor flow, S6.5 card update, R15 email deliverability, tighten S7 timezone + R14 TTL + R11 dev/prod gate. ~2-3 hours of doc work. **Do before S1 starts.**
3. **P2 hygiene (5 items)** — wording. ~30 minutes.
4. **P3 considerations (4 items + Yes Bank Q11)** — note in spec, defer decisions to first build session.

If you address P0 + the top 6 P1 (transition table, Capacitor flow, card update, email deliverability, dev/prod gate, dunning day definition), this spec is publishable.

**The architecture itself doesn't need to change.** Path 2 is the right choice; the `BillingProvider` interface is well-shaped; the state machine is fundamentally correct (with the noted edge gaps); the risk register is unusually thorough. This is a solid piece of planning work; the findings above are sharpening, not rebuild.

---

## Findings dispatched to action

| # | Priority | Action | Owner |
|---|---|---|---|
| P0-1 | Before sign-off | Rewrite §11 Q3 to per-debit unit | Owner |
| P0-2 | Before sign-off | Append Jan-31 caveat to §11 Q2 | Owner |
| P0-3 | Before sign-off | Reframe §11 Q1 as query-locality, not retention | Owner |
| P0-4 | Before sign-off | Add §11.1 Yes Bank fallback rule | Owner |
| P1-1 | Before S1 | Add complete transition table | Spec author |
| P1-2 | Before S1 | Pending_mandate re-subscribe policy | Spec author |
| P1-3 | Before S2 | Add S6.5 card-update flow | Spec author |
| P1-4 | Before S6 | Split R8 upgrade vs downgrade UX | Spec author |
| P1-5 | Before launch | Bump SEC-8 to D.1-launch dependency | Owner + ops |
| P1-6 | Before S3 | TTL+heartbeat or per-batch claim for cronLocks | Implementer |
| P1-7 | Before S3 | Use `$app/environment.dev` not NODE_ENV | Implementer |
| P1-8 | Before S7 | Define IST settlement window | Implementer |
| P1-9 | Before D.3 | Credit-note counter for refunds | Spec author |
| P1-10 | Before S5 | Define "day N" as IST 24h windows | Spec author |
| P1-11 | Before S2 | S2.5 Capacitor auth bridge | Spec author |
| P2-* | Hygiene | Wording fixes | Spec author |
| P3-1 | Nice-to-have | Charge confirmation email in S3 | Spec author |
| P3-2 | Post-launch | Capture v1 baselines after 7 days | Ops |
| P3-3 | Hygiene | Bump webhook idempotency TTL to 18mo | Spec author |
| P3-4 | Before S7 | Kill-switch dry-run on staging | Implementer |
| YB-Q11 | Yes Bank call | Add chargeback liability question | Owner |
| MISS-1 | Before launch | RBI data-locality audit (Atlas region) | Owner + ops |
| MISS-2 | Before S2 | Contract tests for MockProvider | Implementer |
| MISS-3 | Before launch | DSA transaction history UI | Spec author |
| MISS-4 | Before first price change | Pricing-change comms flow | Owner |
