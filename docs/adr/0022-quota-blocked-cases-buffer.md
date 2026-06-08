# ADR-0022 — Per-Plan Quota-Blocked Save Buffer

**Status**: Accepted
**Date**: 2026-05-30
**Decided by**: Owner (this session)
**Supersedes**: pre-2026-05-29 one-extra-case "gesture" mechanism in `/api/evaluate-and-persist`
**Companion docs**: `docs/specs/QUOTA-BLOCKED-CASES-SPEC.md`

---

## Context

When a DSA hit their monthly case limit (Basic 10, Pro 50), the case-creation gate in `/api/evaluate-and-persist` allowed ONE MORE submission past the cap (the "gesture") as a friendly buffer, then returned 402 `case_limit_reached` with an upgrade modal. Two problems with that model:

1. **Race condition**: count check + Case insert weren't atomic. Two concurrent submissions at the boundary could both pass the check and over-fill.
2. **Hostile UX at the boundary**: a DSA mid-customer-call who'd just spent 20 minutes typing a complex case got a "wasted, upgrade now" error. Their work technically survived in localStorage but the implied loss-of-progress was demoralizing. Real DSAs in the field cannot pause to upgrade — they need the case to LAND somewhere, NOW.

A simple atomic counter fix would close the race. But the UX problem demanded a richer mechanism — give the DSA a small explicit "save buffer" that persists the case server-side without computing offers (no compute burn), auto-processed when the DSA upgrades or their next cycle resets.

## Decision

Replace the gesture with a **per-plan save buffer**:

| Plan | caseLimit | saveBuffer | Effective max storage in one cycle |
|---|---|---|---|
| Basic | 10 | 1 | 11 (10 active + 1 buffered) |
| Pro | 50 | 5 | 55 (50 active + 5 buffered) |
| Enterprise | Infinity | 0 | Unlimited (buffer concept N/A) |

The buffer is **per-plan, explicit** (not a derived percentage). Marketing can flex individual plans independently. The 1/5/0 numbers honor a rough 10% ratio of the plan's quota — small enough to feel like a courtesy, not a free upgrade.

Buffered cases enter Cases with `stage = 'quota_blocked'`. They persist FormSnapshot, skip the rule engine (no LenderResultsSnapshot, no compute burn), show in dashboard with an "Awaiting Processing" badge.

**Auto-process triggers:**
- **Plan upgrade** (S2): after `change-plan` flips `plan_id` to a higher tier, FIFO unblock until the new quota is saturated.
- **Monthly cycle reset** (S3): after `chargeEngine.handleSuccess` advances `next_charge_at` (excluding recovery and trial-end paths), same FIFO unblock for that DSA.
- **30-day archive** (S3): blocked cases sitting past 30 days are archived (DSA missed both triggers — subscription cancelled, account dormant, etc.). FormSnapshot stays intact; case is forever visible as "Awaiting Processing (archived)".

## Considered alternatives

### A. Pure atomic counter, keep gesture
Add `active_case_count` on DsaApplications with `findOneAndUpdate` + `{ $lt: hardLimit }` filter. Solves the race but doesn't address the UX problem at the boundary. A DSA still gets blocked mid-case-fill.

**Rejected** — surface fix without the depth.

### B. MongoDB transactions instead of denormalized counter
Wrap the count + insert in a `session.withTransaction`. Race closed, no schema change.

**Considered** — and actually preferred in the spec — but the existing handler's structure made a full transaction wrap intrusive (case insert happens 200 lines after the gate check). For S1 shipping we used `countDocuments` at the gate with a known small residual race; the existing reconciliation cron + future dedicated reconciliation can catch any drift. The transaction approach can be retrofitted later without touching the UX semantics.

### C. Unlimited save buffer
Just let blocked cases accumulate without cap.

**Rejected** — invites stockpiling (DSA saves 200 cases hoping for a "free" cycle reset processing them all). The 1/5/0 cap forces honest plan choices.

### D. Atomic counter as a denormalized field
Pre-spec proposed approach. Add `active_case_count` field on DsaApplications, decrement on archive/delete, reconcile cron for drift.

**Considered and reversed** — the schema addition has ongoing reconciliation cost (any case-archive path that forgets to decrement leaks drift). Plain `countDocuments` on a per-DSA query is microsecond-fast on the existing index. The race window is small enough to address with a reconciliation pass later.

## Trade-offs

**Wins:**
- DSA's work is never lost at the cap boundary (FormSnapshot persisted, case visible in dashboard).
- Explicit, predictable: DSA knows they have N save slots, plain copy in the save-prompt.
- Auto-process means no manual recovery dance after upgrade.
- 30-day archive prevents stale blocked queues from accumulating forever.
- Telemetry signal (log events `quota_blocked.buffer_save` + `quota_blocked.auto_unblock` + `quota_blocked.archive_expired`) gives ops the "DSAs at the wall" view.

**Trade-offs accepted:**
- Residual race window on the count check (until reconciliation cron is added — see Considered C). Practically: only fires when one DSA submits from 2 tabs in the same second at the exact cap. Rare; reconcilable.
- Buffered cases consume a slot from NEXT cycle's quota when they auto-process. Save prompt copy makes this explicit ("using 1 of next month's 10 slots") so DSAs understand.
- No offer computation cron yet — unblocked cases sit at `stage='intake'` without offers. DSA must open the case manually to trigger the rule engine. Follow-up: dedicated cron that runs the engine on cases with recently-set unblock timestamp.
- No notification email yet on upgrade-unblock / cycle-unblock / archive — log events emitted in place. Templates following the dunning-email pattern are a 30-min follow-up.

## Implementation reference

- `src/lib/config/billing.ts` — `BillingPlan.saveBuffer` field
- `src/lib/types/case.ts` — `'quota_blocked'` added to `CaseStage` union
- `src/lib/server/stagePipeline.ts` — `quota_blocked → intake` (system-only)
- `src/lib/server/billing/quotaState.ts` — UI gating helper (`getQuotaState`)
- `src/lib/server/billing/quotaUnblock.ts` — `processBlockedCasesAfter` FIFO engine
- `src/routes/api/evaluate-and-persist/+server.ts` §5b — gate + branches
- `src/lib/utils/formSubmitHandler.ts` + `confirmAndSubmit.ts` — client wiring + modals
- `src/routes/dashboard/dsa/cases/+page.svelte` — New Case button gating
- `src/routes/api/billing/subscription/change-plan/+server.ts` — upgrade hook (S2)
- `src/lib/server/billing/chargeEngine.ts` `handleSuccess` — cycle-reset hook (S3)
- `src/routes/api/cron/quota-blocked-archive/+server.ts` — 30-day archive cron (S3)

## Open follow-ups

- Offer-computation cron for unblocked cases (`/api/cron/process-unblocked-cases`) — every 5 min, runs the rule engine for cases with recently-set unblock timestamp.
- Notification email templates for the three telemetry events.
- Dedicated reconciliation cron to recompute `active_case_count` via `countDocuments` and surface drift (drift presence implies the gate's race window fired).
- Edit-form button gating on case detail page — helper (`getQuotaState`) is ready; case-detail layout server load needs to read + expose it, and the Svelte page needs the same `{#if editFormDisabled}` branching as the dashboard cases page.
- OTel spans for the three log events (when an ops dashboard is built).

## Owner-locked decisions captured

- **OQ-1** (next-cycle date in save-prompt copy): YES. Server returns `next_cycle_at` on the 402 payload; client renders as "Dec 15".
- **OQ-2** (30-day auto-archive): 30 days (NOT the 90-day default originally proposed). Matches one full billing cycle + the existing 30-day delete-account recovery window.
- **OQ-3** (OTel spans on buffer-save + auto-unblock): YES — log events emitted in S1/S2/S3; promotion to OTel spans is a follow-up.
- Edit-button scope at exhaustion: block form-edit (re-eval burns compute), allow metadata edits.
- Save:No fallback: localStorage-only (existing formState persistence, no new code).
- FIFO at cycle reset: oldest first, until new quota saturated.

---

*ADR locked 2026-05-30. Spec §13 reflects the same decisions.*
