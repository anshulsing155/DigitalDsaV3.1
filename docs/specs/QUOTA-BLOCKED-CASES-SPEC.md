# Quota-Blocked Cases — Spec

> **Status**: DRAFT (owner sign-off pending)
> **Authored**: 2026-05-29
> **Replaces**: the existing "one-extra-case GESTURE" mechanism in `/api/evaluate-and-persist`
> **Owner decisions locked**: per-plan save buffer (Basic 1, Pro 5, Enterprise N/A) · edit-button scope · localStorage-only on Save:No · FIFO at cycle reset

---

## 1. Why

Two problems today, one feature solves both:

**Problem A — Race condition.** `/api/evaluate-and-persist` reads the case count, then later inserts a new case. Two concurrent submissions at the boundary (e.g., DSA at 50/50 submits from two tabs in the same second) both pass the check, both insert — DSA ends up at 52 cases under a 51-case hard cap. Rare per individual DSA but inevitable across 1000s of DSAs over time.

**Problem B — Work lost at the cap.** A DSA who hits their plan limit mid-fill of a complex case sees `402 case_limit_reached`. The form data stays in localStorage (auto-persist), but the implied user-message is "your work is wasted, upgrade now or lose it." Hostile UX. Real DSAs in the field at this moment are mid-customer-call — they need their case to LAND, not lose 20 minutes of typing.

**One mechanism solves both:**
- An atomic counter check (race fix)
- Paired with a per-plan "save buffer" of cases that persist in DB at `stage = 'quota_blocked'` (work preserved)
- Auto-processed on plan upgrade or next cycle reset (no manual recovery)

Also resolves a UX wart: today there are TWO spinners on submit (form-page spinner during `/api/evaluate-and-persist`, then `/evaluating` page spinner). This spec moves the work behind `/evaluating` — one spinner, then either results or a save prompt.

---

## 2. The model

### 2.1 Plan-level config (additive)

Add `saveBuffer: number` to `BillingPlan` config in `src/lib/config/billing.ts`:

```ts
PLANS = {
  basic:      { caseLimit: 10,       saveBuffer: 1 },
  pro:        { caseLimit: 50,       saveBuffer: 5 },
  enterprise: { caseLimit: Infinity, saveBuffer: 0 }  // 0 = N/A; engine reads as "no buffer needed"
};
```

**Replaces the one-extra-case gesture.** Pre-spec hard cap was `caseLimit + 1` (gesture). Post-spec hard cap is `caseLimit + saveBuffer`, with the buffered cases entering `quota_blocked` state (not normal cases with a soft warning). Cleaner UX, explicit semantics. The gesture variable + warn-level math goes away.

### 2.2 DSA quota states

For any DSA at any moment, derive three numbers:

- `activeCount` — `Cases.countDocuments({ dsa_id, is_archived: false, stage: { $ne: 'quota_blocked' } })`
- `blockedCount` — `Cases.countDocuments({ dsa_id, stage: 'quota_blocked' })`
- `planLimit` / `saveBuffer` — from the DSA's active plan via `resolveActivePlanId`

Then:

| State | Condition | UI behavior |
|---|---|---|
| **Under quota** | `activeCount < planLimit` | "New Case" enabled · "Edit form" enabled · Submit → normal flow |
| **Exhausted, buffer space** | `activeCount >= planLimit AND blockedCount < saveBuffer` | "New Case" **disabled** · "Edit form" **disabled** · in-flight Submit → save-prompt |
| **Exhausted, buffer full** | `activeCount >= planLimit AND blockedCount >= saveBuffer` | "New Case" **disabled** · "Edit form" **disabled** · in-flight Submit → upgrade-required |

### 2.3 Case stages

Add new stage value: `'quota_blocked'`. Sits BEFORE all existing stages in the lifecycle:

```
quota_blocked → intake_review → policy_eval → ... → disbursed
                ↑
                auto-transition on upgrade OR cycle reset
```

A `quota_blocked` case:
- HAS a `FormSnapshot` (DSA's work preserved, immutable)
- HAS a `Case` row visible in dashboard (with "Awaiting processing" badge)
- HAS NO `LenderResultsSnapshot` (offers never computed — no compute burn)
- Does NOT count against `activeCount` (otherwise we'd block the unblock)

---

## 3. UI flow inversion

### 3.1 Current (two spinners)

```
DSA clicks Submit
  ↓
ConfirmModal opens, DSA clicks Confirm
  ↓
Form-page spinner shows
  ↓
POST /api/evaluate-and-persist  ← case created here
  ↓
goto('/evaluating')
  ↓
/evaluating spinner shows
  ↓
goto('/dashboard/dsa/cases/[case_id]/results')
```

### 3.2 New (one spinner, branch at /evaluating)

```
DSA clicks Submit
  ↓
ConfirmModal opens, DSA clicks Confirm
  ↓
goto('/evaluating')  ← IMMEDIATE, no API call yet
  ↓
/evaluating mounts, reads formState, fires POST /api/evaluate-and-persist
  ↓
  ├─ 200 OK → goto('/dashboard/dsa/cases/[case_id]/results')
  ├─ 402 'quota_buffer_available' → render save-prompt (Save / No)
  │     ├─ Save → POST /api/evaluate-and-persist?save_to_buffer=true → goto('/dashboard/dsa/cases')
  │     └─ No → goto back to '/form/[loanType]' (localStorage data still there)
  └─ 402 'quota_fully_exhausted' → render upgrade-required page → "Upgrade" CTA
```

### 3.3 New `/evaluating` page responsibility

`/evaluating/+page.svelte` becomes the work-orchestrator:
- Reads `formState` (already in localStorage)
- Fires the API call
- Branches on response (results / save-prompt / upgrade-required)
- Animation runs alongside (spinner unchanged — same component)

`confirmAndSubmit` in `src/lib/utils/confirmAndSubmit.ts` simplifies to: open modal → on confirm, immediately `goto('/evaluating')`. No more `await submitFormForEvaluation`.

`submitFormForEvaluation` in `src/lib/utils/formSubmitHandler.ts` moves into `/evaluating/+page.svelte` (or stays as a shared util `/evaluating` calls).

---

## 4. Data model changes

### 4.1 `BillingPlan` config

```ts
// src/lib/config/billing.ts
export interface BillingPlan {
  // ... existing fields ...
  /**
   * Maximum number of quota-blocked cases this plan allows in the save
   * buffer at any one time. 0 = N/A (used for Infinity-capacity plans
   * where the buffer concept doesn't apply). Per-plan rather than a
   * derived 10% so marketing can flex independently.
   */
  saveBuffer: number;
}
```

### 4.2 `Case.stage` enum

Add `'quota_blocked'` to the existing stage union in `src/lib/types/cases.ts` (or wherever the stage type lives). All existing queries that filter by stage need an audit — most should add `{ $ne: 'quota_blocked' }` to be safe.

### 4.3 No new collection needed

The buffer is just `Cases` filtered by `stage = 'quota_blocked'`. No `BlockedCases` or similar. Cleaner.

### 4.4 No counter field on DsaApplications

Atomic counter via `findOneAndUpdate` with conditional filter on `Cases.countDocuments` is fine for the gate check — MongoDB handles concurrent count reads consistently within a session. We don't need a denormalized counter (simpler — no reconciliation needed).

> **Note**: this is a step back from my earlier Option 1 (denormalized counter on DsaApplications). After thinking about reconciliation overhead + the fact that `countDocuments` with proper indexing is microsecond-fast on a per-DSA query, the simpler approach wins. The atomicity comes from doing the count check + insert INSIDE the same MongoDB transaction. This requires Atlas (which is replica-set, transactions supported) — already true in prod.

---

## 5. API changes

### 5.1 `/api/evaluate-and-persist` reshape

New top-of-handler logic:

```ts
const session = client.startSession();
try {
  await session.withTransaction(async () => {
    const activePlan = await resolveActivePlanId(dsaId, { session });
    const planId = activePlan?.plan_id ?? 'basic';
    const { caseLimit, saveBuffer } = PLANS[planId];

    const activeCount = await Cases.countDocuments(
      { dsa_id: dsaId, is_archived: { $ne: true }, stage: { $ne: 'quota_blocked' } },
      { session }
    );

    if (activeCount < caseLimit) {
      // Under quota — normal path
      await insertCaseAndCompute({ stage: 'intake_review', ... }, { session });
      return apiOk({ case_id, results, ... });
    }

    // Exhausted. Check buffer.
    const blockedCount = await Cases.countDocuments(
      { dsa_id: dsaId, stage: 'quota_blocked' },
      { session }
    );

    const saveToBuffer = url.searchParams.get('save_to_buffer') === 'true';

    if (blockedCount >= saveBuffer) {
      // Buffer full. Block hard.
      return apiStructuredError(
        'You have hit your monthly limit AND your save buffer is full. Upgrade your plan or wait for the next cycle.',
        { code: 'quota_fully_exhausted', upgrade: { ... } },
        402
      );
    }

    if (!saveToBuffer) {
      // Buffer available. Ask the DSA.
      return apiStructuredError(
        `You're at your monthly limit. Save this case? It'll process automatically when you upgrade or your next cycle starts (using 1 of next month's ${caseLimit} slots). ${saveBuffer - blockedCount} of ${saveBuffer} save slots remaining.`,
        {
          code: 'quota_buffer_available',
          buffer: { used: blockedCount, capacity: saveBuffer, remaining: saveBuffer - blockedCount },
          upgrade: { ... }
        },
        402
      );
    }

    // DSA confirmed save_to_buffer=true. Persist as quota_blocked.
    await insertCaseSnapshotOnly({ stage: 'quota_blocked', ... }, { session });
    return apiOk({ case_id, status: 'saved_to_buffer' });
  });
} finally {
  await session.endSession();
}
```

The transaction guarantees concurrent submissions can't both pass the `activeCount < caseLimit` check at the boundary. MongoDB serializes the conflicting transactions; whichever loses the race re-reads the updated count on retry.

### 5.2 Archive / delete decrement (none needed)

Because we count `is_archived: false` on every check, archive/delete naturally reduces `activeCount`. No counter to maintain.

---

## 6. Auto-process triggers

### 6.1 On plan upgrade

In `src/lib/server/billing/subscriptionState.ts` (or wherever the plan-change handler lives), after a successful plan upgrade:

```ts
async function processBlockedCasesOnUpgrade(dsaId: string, newPlanId: PlanId) {
  const { caseLimit } = PLANS[newPlanId];
  const activeCount = await Cases.countDocuments({ ... }); // non-blocked
  const slotsAvailable = caseLimit - activeCount;

  if (slotsAvailable <= 0) return;

  const blockedCases = await Cases
    .find({ dsa_id: dsaId, stage: 'quota_blocked' })
    .sort({ created_at: 1 })  // FIFO — oldest first
    .limit(slotsAvailable)
    .toArray();

  for (const c of blockedCases) {
    await scheduleEvaluation(c._id);  // queues async offer computation
    await Cases.updateOne(
      { _id: c._id, stage: 'quota_blocked' },  // atomic — won't double-process
      { $set: { stage: 'intake_review', unblocked_at: new Date(), unblocked_reason: 'upgrade' } }
    );
  }

  if (blockedCases.length > 0) {
    await sendDsaNotification(dsaId, {
      template: 'cases_auto_unblocked',
      count: blockedCases.length,
      reason: 'upgrade'
    });
  }
}
```

### 6.2 On monthly cycle reset

In the existing billing cron that fires monthly anchors (`/api/cron/billing-charge` or similar), after the DSA's cycle resets:

```ts
// Same logic as upgrade — just a different trigger and a different
// `unblocked_reason: 'cycle_reset'`. Notification email template
// differs ("Your saved cases from last month are being processed now").
```

### 6.3 Async offer computation

`scheduleEvaluation(case_id)` queues a job to:
1. Read the FormSnapshot
2. Run the rule engine (same `evaluateLoan` call as the synchronous path)
3. Persist the LenderResultsSnapshot
4. Update Case to `policy_eval` or similar (whatever the post-evaluation stage is)
5. Send DSA notification "Results ready for case [X]"

Implementation: a new cron `/api/cron/process-unblocked-cases` that runs every 5 min, picks up `intake_review` cases with `unblocked_at` set, processes them.

---

## 7. UI changes

### 7.1 Dashboard "New Case" button gating

`/dashboard/dsa/cases/+page.svelte` (or wherever the New Case button lives). The page-server load already fetches per-DSA case stats; extend it with:

```ts
const { caseLimit, saveBuffer } = PLANS[planId];
const activeCount = await Cases.countDocuments({ dsa_id, is_archived: false, stage: { $ne: 'quota_blocked' } });
const blockedCount = await Cases.countDocuments({ dsa_id, stage: 'quota_blocked' });

return {
  ...existing,
  quotaState: {
    activeCount, caseLimit, blockedCount, saveBuffer,
    isExhausted: activeCount >= caseLimit,
    isBufferFull: blockedCount >= saveBuffer,
    newCaseDisabled: activeCount >= caseLimit
  }
};
```

Button binding:
```svelte
<button disabled={data.quotaState.newCaseDisabled} onclick={startNewCase}>
  New Case
</button>
{#if data.quotaState.newCaseDisabled}
  <p>Monthly limit reached. Upgrade your plan or wait for the next cycle.</p>
{/if}
```

### 7.2 Per-case "Edit form" button gating

In `/dashboard/dsa/cases/[case_id]/+page.svelte`, gate the "Edit form" button (NOT metadata buttons):
```svelte
<button disabled={data.quotaState.editFormDisabled} onclick={editForm}>
  Edit Form Data
</button>
<!-- Other buttons unchanged: -->
<button onclick={updateNotes}>Update Notes</button>
<button onclick={updateStage}>Update Stage</button>
<!-- etc. -->
```

The `editFormDisabled` flag = same as `newCaseDisabled` (active limit reached).

### 7.3 Dashboard listing "Awaiting processing" badge

Cases with `stage = 'quota_blocked'` get a distinct visual badge in the list view. They're NOT clickable through to results (no LenderResultsSnapshot exists). Clicking opens a minimal "Awaiting processing" view: case label + applicant name + "Will be processed on upgrade or next cycle (X days)."

### 7.4 `/evaluating` page save-prompt

When `/evaluating` receives `402 quota_buffer_available`, render:

```
[Spinner stops]

⚠️ You're at your monthly limit

Save this case for automatic processing?
It'll run on <next cycle date — e.g. "Dec 15"> when your next cycle
starts, OR immediately if you upgrade your plan. Using 1 of next
month's <X> slots.

<saveSlotsRemaining> of <saveBufferTotal> save slots remaining.

[Save This Case] [No, I'll Handle It]
```

**Next-cycle-date rendering rules (OQ-1):**
- Standard case: server returns `next_cycle_at` ISO date on the 402 payload, client renders as "Dec 15" (`toLocaleDateString` with day + abbreviated month).
- Edge case — no active sub or anchor not yet set: server omits `next_cycle_at`, client falls back to copy "*on your next billing date*" (no specific date).
- Edge case — anchor is in the past (cycle should've reset but cron is lagging): server omits, client falls back same as above. Reconciliation cron catches up.

`No, I'll Handle It` → `goto('/form/[loanType]')` — localStorage data is still there, DSA can pick up where they left off.

### 7.5 `/evaluating` page upgrade-required

When `/evaluating` receives `402 quota_fully_exhausted`, render:

```
🚫 Limit reached and buffer is full

You have <activeCount> active cases AND <saveBuffer> saved cases
waiting for processing. You can't save more right now.

To continue: upgrade your plan to <recommendedPlan> for <newCaseLimit>
cases. Your saved cases will process automatically.

[Upgrade to <recommendedPlan>] [Maybe Later]
```

`Maybe Later` → `goto('/dashboard/dsa/cases')`. The DSA's typed-in case is still in localStorage but they need to upgrade to make progress.

---

## 8. Edge cases

| Case | Handling |
|---|---|
| DSA at quota, archives one case → count drops 1 below limit | Next page load re-reads server state → New Case button re-enables. Real-time without push. |
| DSA upgrades while a save-prompt is showing on /evaluating | Upgrade endpoint auto-unblocks any blocked cases (per §6.1). The save-prompt's API call result is now stale, but its Save button still works — server re-checks the quota when DSA clicks Save and finds capacity. The save-prompt could even re-poll periodically (1 line of code; not in MVP scope). |
| DSA has 5 blocked cases, downgrades plan | Blocked cases stay blocked. Downgrades don't auto-process. If new plan has saveBuffer < blockedCount, the excess can't be saved further but the existing ones stay. Maybe add a warning at downgrade time: "You have N saved cases waiting; new plan supports M save slots. Existing saved cases unaffected but you can't save more until current ones process." |
| Cycle resets exactly when DSA is mid-submission | Standard race against billing cron — the transaction guarantees consistency. Whichever runs first wins. |
| Save-prompt: DSA clicks Save twice (network laggy) | Both POSTs hit `/api/evaluate-and-persist?save_to_buffer=true`. The second one's transaction reads `blockedCount` now including the first save → either still under buffer (saves) or now at buffer (rejects with 402 buffer-full). No corruption. |
| Async offer computation crashes mid-evaluation for an unblocked case | Case sits in `intake_review` with `unblocked_at` set. Reconciliation cron re-queues it. Worst case: a few hour delay. |
| Reconciliation cron itself fails | Standard cron-lock + retry pattern (same as D.1 charge cron per Pitfall #61). |

---

## 9. Migration & rollout

### 9.1 No data migration

Existing `Cases` rows don't need touching. They have stages from the current enum; none are `'quota_blocked'`. The new stage value is purely forward-looking.

### 9.2 Backwards compatibility

`Case.stage = 'quota_blocked'` won't appear in any current consumer query that filters by stage explicitly — they'd just not include these rows. Audit needed:
- Dashboard list query → must INCLUDE blocked cases (new badge)
- Case detail load → must handle `quota_blocked` gracefully (render minimal view)
- All other case-touching code (file builder, sharing, etc.) → must REJECT blocked cases (no LenderResultsSnapshot to read)

### 9.3 Removing the gesture

Today: `hardLimit = planLimit + 1` (one-extra-case gesture).
After this spec: `hardLimit` concept goes away. The buffer replaces it.

Pre-existing `case_limit_warning` payload (`warn_level: 'approaching' | 'at_gesture'`) shrinks to just `'approaching'`. `'at_gesture'` becomes unreachable. Code can be pruned.

Tests that lock the gesture behavior (`pricingFenceHelpers.test.ts`, `caseLimitWarnLevel.test.ts`) need updates. Pitfall #66 reminder: lock the new shape via USAGE patterns, not bare identifier strings.

### 9.4 Feature flag

Ship behind `FEATURE_QUOTA_BLOCKED_CASES=true` env var initially. Lets the operator roll back instantly if anything goes wrong in prod. Flip flag to default-on once a few cohorts have flowed through.

---

## 10. Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Transaction overhead on /api/evaluate-and-persist | Medium | MongoDB transactions are fast (<50ms) on Atlas; well within the existing eval window. Monitor p95 post-deploy. |
| DSAs confused by "1 of next month's slots" framing | Low-Medium | A/B test the save-prompt copy if confusion shows up in support tickets. Fallback copy ready. |
| Async offer computation backlog grows unbounded | Low | Cron runs every 5 min; per-DSA limits prevent any one DSA from monopolizing the queue. Add ops dashboard. |
| Saved cases sit forever (DSA never upgrades, never logs in past cycle reset) | Medium | Daily cron archives `quota_blocked` cases older than **30 days** (per OQ-2) with `archived_reason='quota_blocked_expired'` + notification email. 30 days = one full billing cycle, so a still-sitting blocked case means the DSA missed both auto-process triggers (upgrade + their own cycle reset). |
| Existing tests for gesture break | High (expected) | Plan covers the test updates in §9.3. Not surprising; tests track behavior change. |
| Edge: DSA on Enterprise (Infinity cap) | Low | `saveBuffer: 0` for Enterprise means buffer logic never enters (gate at `activeCount < Infinity` is always true). Verified. |

---

## 11. Tests

Per the standing test discipline:

| Test | Locks |
|---|---|
| `quotaBlockedCases.race.test.ts` | Atomic check survives N concurrent submissions at the boundary. Spin up N=10 parallel `evaluate-and-persist` calls, assert exactly `caseLimit` succeed, exactly `saveBuffer` move to buffer, rest get 402. |
| `quotaBlockedCases.bufferFlow.test.ts` | Save-prompt flow: 200 → save-prompt → save_to_buffer=true → persisted as `quota_blocked`. |
| `quotaBlockedCases.fullExhaustion.test.ts` | activeCount=cap + blockedCount=buffer → 402 quota_fully_exhausted. |
| `quotaBlockedCases.archiveDecrement.test.ts` | Archive a case → next submission succeeds. |
| `quotaBlockedCases.upgradeUnblock.test.ts` | Plan upgrade → FIFO unblock until new quota saturated → notification sent. |
| `quotaBlockedCases.cycleReset.test.ts` | Cycle anchor → FIFO unblock for that DSA → notification sent. |
| `quotaBlockedCases.editGate.test.ts` | At exhaustion, "Edit form" button disabled; metadata buttons enabled. |
| `quotaBlockedCases.newCaseGate.test.ts` | At exhaustion, "New Case" button disabled. |
| `quotaBlockedCases.dashboardBadge.test.ts` | `quota_blocked` case renders awaiting badge, not clickable to results. |
| `gestureRemovalLock.test.ts` | Negative-check (Pitfall #66 shape): no `+ 1` hard-limit math left in `evaluate-and-persist`; no `warn_level: 'at_gesture'` reachable. |

Total: ~10 new tests, ~600 lines.

---

## 12. Slice breakdown

Three sliceable commits, each independently shippable:

| Slice | Effort | What it ships |
|---|---|---|
| **S1 — Core feature** | ~2.5 hr | Atomic check + transaction wrap + `saveBuffer` config + new `quota_blocked` stage + UI flow inversion to /evaluating + save-prompt + upgrade-required pages + dashboard button gating + tests (race + buffer-flow + full-exhaustion + edit-gate + new-case-gate). Replaces gesture. |
| **S2 — Auto-unblock on upgrade** | ~1 hr | Hook into subscriptionState upgrade flow + FIFO unblock helper + notification email template + test. |
| **S3 — Auto-unblock on cycle reset + reconciliation cron** | ~1.5 hr | Hook into billing cron + offer-computation queue cron (/api/cron/process-unblocked-cases) + reconciliation cron + per-cron smoke runbook + tests. |

**S1 alone** ships the race fix + buffer save + manual recovery flow (DSAs after upgrade have to either archive a case or wait for cycle). **S2 + S3** ship the auto-unblock niceties.

Recommended order: ship all three in sequence within ~5-6 hr. Stoppable after S1 with a known follow-up.

---

## 13. Open questions — ALL RESOLVED (owner sign-off 2026-05-29)

- **OQ-1 — Show next cycle date in save-prompt copy: YES.** Save-prompt and upgrade-required pages both render the DSA's next cycle anchor date when available. Falls back gracefully ("on your next billing date") when the anchor isn't yet set (new subscriber edge case). Requires adding `next_cycle_at` to the 402 response payload — read from `BillingSubscriptions.next_charge_at` for the DSA's active sub.
- **OQ-2 — Auto-archive blocked cases sitting too long: 30 DAYS.** Cron sweeps `Cases` for `stage='quota_blocked' AND created_at < NOW() - 30 days` once daily, archives them with `archived_reason='quota_blocked_expired'`, sends DSA notification email. Rationale: monthly billing cycle is 30 days, so a blocked case still sitting at 30 days means the DSA either didn't subscribe (no cycle reset triggered) or didn't log in / read notifications across a full cycle. 30-day window also aligns with the existing 30-day delete-account recovery window for consistency.
- **OQ-3 — Telemetry on buffer-save: YES.** OTel span `app.quota_blocked.buffer_save` emitted in `/api/evaluate-and-persist` whenever a case enters the buffer. Attributes: `dsa_id` (scrubbed via PII_ATTR_KEYS per Pitfall #27), `plan_id`, `save_buffer_used_after`, `save_buffer_capacity`. Companion span `app.quota_blocked.auto_unblock` on every auto-process (FIFO upgrade + cycle reset paths) with `unblocked_reason` attribute. Gives ops the "how many DSAs are at the wall" signal without manual MongoDB queries.

---

## 14. ADR linkage

New ADR-0022 to be written alongside S1: "Per-plan quota-blocked save buffer, replacing one-extra-case gesture." Captures the decision rationale, the buffer-size choice (Basic 1 / Pro 5 / Enterprise N/A; explicit per-plan rather than a derived ratio so marketing can flex independently), and the trade-offs vs alternatives (denormalized counter, transactional snapshot reads, etc.).

(ADR-0020 is loan field nomenclature alignment; ADR-0021 is Plot & Equity Loan modeling — both shipped in commit `66abd7a6` parallel to this spec.)

---

*End of spec. Owner to sign off on this doc, then S1 begins.*
