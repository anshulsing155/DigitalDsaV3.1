# Applicant State — Implementation Plan

**Date**: 2026-04-23
**Based on**: `docs/APPLICANT-STATE-AUDIT-2026-04-23.md` + deep code-level review of all referenced files
**Status**: Fully implemented 2026-04-24 — all items shipped. F4-C confirmed necessary (cross-loan recovery reactivates the scenario). F4-D uses per-product exclusive-key whitelist (secured↔secured preserves shared fields like propCost). NB-4 uses blank-slate reset on cross-category switch (no key-list maintenance — applicants survive via recovery bin + name matching).
**Author note**: Every decision below includes a WHY and a WHY NOT so future readers can re-evaluate trade-offs without re-reading the full conversation.

---

## 0. What changed from the audit (and why)

The audit document is correct in its observations and UX decisions. Several proposed implementations were revised after reading the actual code. This section is the most important part of this plan — it explains where the audit's implementation proposals diverge from what the code actually supports.

### Change 1 — F2: `clearAllRelationships` is not already imported

**Audit claimed**: "Imports (`applicantState`, `buildMatchSignature`, `clearAllRelationships`, `incomeProfileStore`) exist in `AddApplicantPersonal.svelte` already (verified)."

**Reality**: `clearAllRelationships` is NOT imported. Only `removeRelationshipsBatch` is imported (from the same `relationshipStore` file). If the F2 fix is copy-pasted verbatim from the audit, it will be a runtime reference error — the function call will silently fail, leaving stale relationship data in place after every toggle.

**Fix in this plan**: Add `clearAllRelationships` to the import explicitly, as the first step of F2.

---

### Change 2 — F2: Guard condition improved

**Audit used**: `formState.applicants.some((a) => a.applicantType)`

**Problem**: This is a truthy check on the `applicantType` string. It works in practice (all saved applicants have `'Individual'` as a non-empty string), but it's semantically imprecise — it looks like it's checking for a specific type, not for whether any applicants exist at all.

**Fix in this plan**: `formState.applicants.length > 0`. Same behaviour, explicit intent. A future reader won't wonder "what if applicantType is Company here?"

---

### Change 3 — F3: Do NOT make `updateFormLevelField` async

**Audit proposed**: Create a new async utility `reduceDirectorsToEntityCap.ts`, call it with `await` from inside the `businessEntityType` handler in `applicantFormManager.svelte.ts:1506`.

**Why this is wrong**:
- `updateFormLevelField` in `applicantFormManager.svelte.ts` is a synchronous function. It is passed as an `{onUpdate}` prop from `AddApplicantBusiness.svelte` and called as a regular callback from `QuestionRenderer`.
- Making it `async` means all call sites receive a `Promise<void>` and silently discard it — they don't `await` it. The `setApplicationField('applicationStructure')` call at line 1511 would run after the caller has already moved on, creating a window where `businessEntityType` is set but `applicationStructure` is not yet derived.
- The async-ness cascades: `applicantFormManager.svelte.ts` would also need `async`, then `QuestionRenderer` callbacks would need `async`, etc. This is a refactor, not a fix.

**Why this was proposed in the audit**: The audit was trying to `await` a modal result (which is inherently async). The audit's instinct to put the logic in `applicantFormManager.svelte.ts` was wrong — that file is a pure form-field-update orchestrator. It should not know about modals.

**The correct insight**: The existing `$effect` in `AddApplicantBusiness.svelte` (around line 244) already handles exactly this scenario. When `numberOfDirectorsOrPartners` is set to a value lower than `directorForms.length`, the effect detects that filled directors exceed the new count, populates `removePickerFilled`, and sets `showRemovePicker = true`. The `DirectorRemovePickerModal` opens. `handleRemovePickerConfirm` handles the result. This is already the complete async-modal pattern — we just need to trigger it from the entity-type change.

**Fix in this plan**: In `selectEntityType` (already the right function for entity-level changes in `AddApplicantBusiness.svelte`), after the entity type is committed, detect if filled directors exceed the new entity's cap and lower `numberOfDirectorsOrPartners` to the cap. The existing `$effect` takes over from there. Zero new files. Zero async plumbing. Zero changes to `applicantFormManager.svelte.ts`.

---

### Change 4 — F5: No circular import concern

**Audit's Decisions Log entry** (confirmed by team on 2026-04-23): Listed a 3-step process — add imports, run `pnpm build`, check for cycles, and if found, break the `relationshipStore → form.svelte.ts` edge.

**Reality**: `relationshipStore.ts` imports only from `svelte/store`, `_bridge.svelte`, and its own internal utilities. `incomeProfileStore.ts` imports only `svelte/store` and `_bridge.svelte`. Neither imports anything from `form.svelte.ts`. There is no cycle. There never was.

**Why this was a concern in the audit**: The audit was based partly on analysis of which files reference which — but it conflated "26 files import from relationshipStore" with "relationshipStore imports from form.svelte.ts". These are different directions.

**Fix in this plan**: Add both imports directly. Skip the 3-step ceremony. The "break the existing edge" decision is moot — there is no existing edge to break.

---

### Change 5 — F3 cancel behaviour requires a team decision

**Audit says**: "If DSA cancels: revert the `businessEntityType` change."

**Code reality**: The existing `handleRemovePickerCancel` at line 363 reverts `numberOfDirectorsOrPartners` (so the form count stays the same). But it does NOT revert `entityType` because `selectEntityType` wrote the new `entityType` to `formState.applicationData` at line 430 before the modal opened.

**Why this matters**: After cancel, the entity type displayed in the form picker will show "OPC" but the directors array will have 3 entries — which is inconsistent for the user.

**Team decision required**: Should cancel revert the entity type? If yes: `handleRemovePickerCancel` needs to read a stored `previousEntityType` variable and call `formState.replaceApplicationData` to restore it. If no: the entity type stays at OPC with the director count left unchanged until the next save, which is less clean but simpler to implement.

**This plan's recommendation**: Revert on cancel. The DSA never confirmed the entity type change — the modal is the confirmation step. Leaving a mis-matched state is confusing.

---

## 1. Ground truth — `onEMI` / `onProperty` flags (answer to separate question)

Before the fix plan, confirming the state of `onEMI`/`onProperty` hardcodes across all loan types.

### Current state: intact and correct

| Component | Hardcoded values | Where |
|---|---|---|
| `AddApplicantPersonal.svelte` | `onEMI = true`, `onProperty = false` | `saveApplicant()` line 390-391 |
| `AddApplicantBusiness.svelte` | `onEMI = true`, `onProperty = false` | lines 230-231, 506-507, 823-824, 912-913 |
| `AddApplicantProfessional.svelte` | `onEMI = true`, `onProperty = false` | lines 452-453, 921-922, 977-978, 1246-1247 |
| `AddApplicant.svelte` (Home/LAP/Plot) | **not hardcoded** — DSA answers explicitly | real user input |

### Why `onEMI = true` is load-bearing for unsecured loans

`IncomePageNew.svelte` uses the legacy role derivation path at line 518:

```ts
const baseRole = deriveApplicantRole(applicantType, onProperty, onEMI, linkedCompanyId);
```

`deriveIndividualRole(onProperty=false, onEMI=true)` → `'borrower'` → `getRequiredTabs('borrower')` = all 5 tabs (`profile`, `income_profiles`, `income_details`, `credit_score`, `obligations_details`).

If `onEMI` were `undefined` for a Personal Loan applicant:
- `deriveIndividualRole(false, undefined)` → `'pending'`
- `getRequiredTabs('pending')` → `[]`
- **Income page renders zero tabs. DSA cannot proceed.**

The new classification system in `applicantRoleUtils.ts:deriveApplicantClassification` correctly bypasses `onEMI`/`onProperty` for unsecured loans (returns `'co_applicant_financial'` by loan category alone). But `IncomePageNew` currently uses the legacy path. Until `IncomePageNew` is wired to the classification system, the hardcodes remain load-bearing.

**Decision**: Do not touch `onEMI`/`onProperty` hardcodes. They are correct, they are needed, and there is a latent restore-path risk that must be patched in Phase 3 (see F4-C below).

### Why `onProperty = false` specifically

Unsecured loans have no property — setting `onProperty = false` ensures `deriveIndividualRole(false, true)` = `'borrower'` (onEMI wins), not `deriveIndividualRole(true, true)` which would also be borrower but implies the person is on a property title, which is incorrect for a Personal Loan applicant.

---

## 2. Pre-conditions

None. All phases are independent except where noted. Phase 3 should not start until Phase 2 is merged and smoke-tested.

---

## Phase 0 — Foundation fix (prerequisite for F2 and F5)

### P0-A: Fix `clearAllRelationships` — missing reciprocal clear

**File**: `src/lib/components/relationship-capture/relationshipStore.ts:178-180`

**Why this is Phase 0**: F2 (Personal Loan toggle) and F5 (clearForLoanType) both call `clearAllRelationships()`. If we ship those fixes without fixing this function first, both F2 and F5 will leave `userReciprocalRelationships` populated with stale data from the previous loan/toggle. Reciprocal relationships reference applicant IDs that no longer exist. This is worse than the original bug because the fixes create a false sense of correctness.

**Why `userReciprocalRelationships` was missed originally**: The store at line 22 (`sessionPersisted('home-user-reciprocal-relationships', [])`) was added separately from `userRelationships`. The `clearAllRelationships` function was written to clear only `userRelationships`, and the oversight was never caught because no existing flow currently clears relationships via this function in a way that would surface the reciprocal data (Business Loan's `clearAllRelationships` call on entity switch clears both at the UI level — but the bug is masked because the UI re-derives reciprocals from scratch).

**Current code**:
```ts
export function clearAllRelationships(): void {
    userRelationships.set([]);
}
```

**Fixed code**:
```ts
export function clearAllRelationships(): void {
    userRelationships.set([]);
    userReciprocalRelationships.set([]);
}
```

**Why not also clear `inferredRelationships`**: `inferredRelationships` is a `derived` store — it is computed reactively from `userRelationships`. When `userRelationships` is set to `[]`, `inferredRelationships` recomputes to `[]` automatically. No explicit clear needed.

**Risk**: Zero. This is purely additive — it makes an existing clear function more complete.
**Effort**: 1 line.
**Test**: Call `clearAllRelationships()` in a test. Assert both `get(userRelationships)` and `get(userReciprocalRelationships)` are empty arrays.

---

## Phase 1 — Safe 1-5 line fixes (parallel, ship first)

### F1: Remove Personal Loan auto-Salaried

**File**: `src/lib/config/incomeProfiles/profileCards.ts:306-308`

**The bug**: `getAutoSelectedProfiles({ loanCategory: 'personal', applicantType: 'Individual' })` returns `['salaried_regular']`. This value is assigned to `snapshot.selectedIncomeProfiles` in `AddApplicantPersonal.svelte:387` before the applicant is saved. When the DSA opens the Income page, "Salaried - Regular" is already checked. A self-employed DSA adding their client as a business owner will miss this pre-selection.

**The fix**: Delete the `case 'personal':` block entirely.

```ts
// DELETE these 2 lines (the surrounding switch statement stays):
case 'personal':
    return ['salaried_regular'];
```

**Why delete rather than `return []`**: An explicit `return []` implies a deliberate decision to return empty. Deleting the case makes the fall-through to `default: return []` clear — Personal Loan is just not in the auto-select list, same as all other loans that don't have a default. Any future maintainer reading the switch will correctly understand "personal was never supposed to be here."

**Why it was `['salaried_regular']` originally**: Personal Loan has historically been associated with salaried applicants. This was a product assumption baked into code. The assumption is wrong — any income type can apply for a personal loan.

**IncomePageNew downstream check**: `getAutoSelectedProfiles` is also called in `IncomePageNew.svelte:428` to derive `unsecuredLocked`. This boolean locks income profile cards (DSA cannot deselect the auto-selected one). With Personal Loan returning `[]`, `unsecuredLocked` becomes `false` for Personal Loan, meaning all cards are freely selectable. **Verify** that `unsecuredLocked` in `IncomePageNew.svelte` has no other downstream effect beyond locking the UI — if it gates any completion logic or payload field, returning `[]` changes that gate's behaviour.

**Test impact**: No test asserts `getAutoSelectedProfiles` returns `['salaried_regular']` for personal. Zero breakage confirmed.

**Effort**: 2 line deletion.

---

### F6: Business Loan primary-is-always-Company code comment

**File**: `src/lib/components/AddApplicantBusiness.svelte` — at the company summary table render block (around line 1094 where `ApplicantSummaryTable` renders for company path).

**Why this comment matters**: Observation 7 in the audit was initially flagged as "Business Loan missing `SuggestPrimaryBanner` — appears unintentional." It was resolved as deliberate design: Business Loan always has a Company as primary applicant. Individual-only Business Loans are not allowed. Without a comment here, every future code reviewer will re-open this question.

**What to add**:
```svelte
<!--
    No SuggestPrimaryBanner here — intentional design.
    Business Loan requires a Company applicant as primary. Individuals are
    directors/guarantors, not primary. Swapping primary to an Individual would
    break lender-matching (lenders assess firms, not individuals, for business loans)
    and payload semantics (Company fields are required at index 0).
    Individual-only Business Loans are not supported in this system.
    Rule confirmed 2026-04-23. See docs/APPLICANT-STATE-AUDIT-2026-04-23.md §0.
-->
```

**Risk**: Zero.
**Effort**: 1 min.

---

### NB-3: Remove dead `clearForLoanTypeKey` from wizard configs

**Files**:
- `src/lib/types/wizardConfig.ts` — `LoanWizardConfig` type definition
- All 6 loan wizard config files (grep `clearForLoanTypeKey` to find all)

**The problem**: `clearForLoanTypeKey` is declared on `LoanWizardConfig` and populated in all 6 configs (e.g., `clearForLoanTypeKey: 'personal'` in the personal loan config). But zero runtime code reads this field. The actual `clearForLoanType` calls in each route file use hardcoded string literals.

**Why it's dangerous to leave it**: A future developer sees `clearForLoanTypeKey: 'personal'` in the config and assumes the wizard engine uses it to handle loan switching. They might then NOT add a `clearForLoanType` call in a new route because "the config already declares it." Or they might look for the runtime code that reads this key and conclude the feature isn't wired yet — then wire it wrong.

**Why it was added originally**: Likely added with the intent to wire it into the wizard engine ("the config should declare its own clear key"). The wiring was never completed. The routes call `clearForLoanType` directly instead.

**Why not wire it up instead of deleting**: The routes call `clearForLoanType` at a specific point in their `onMount` sequence with specific ordering constraints (clear before setting new loanCategory). Moving this into the wizard engine config would require the engine to know about this ordering. That's a refactor. The current pattern (direct call in route) is clear, explicit, and already works. Deleting the dead property costs nothing and removes misleading documentation.

**Risk**: TypeScript will catch any missed deletion (the property no longer exists on the type, so any object still declaring it will error). Safe.
**Effort**: 7 deletions across 7 files.

---

## Phase 2 — Data-preservation fixes

### F2: Personal Loan applicantType toggle — save to recovery before wipe

**File**: `src/lib/components/AddApplicantPersonal.svelte:68-77`

**Pre-condition**: P0-A must be merged first (so `clearAllRelationships` correctly clears both stores).

**The bug**: When a DSA toggles Individual ↔ Joint after entering applicants, `formState.replaceApplicants([])` is called with no recovery save, no relationship cleanup, no income profile cleanup. The work is silently destroyed.

**Why Business Loan handles it correctly but Personal Loan doesn't**: Business Loan's `selectEntityType` (line 425) was written later and with more care. It saves each applicant to the recovery bin before clearing. Personal Loan's `selectType` predates this pattern.

**Step 1 — Add missing import** (this is the critical gap the audit missed):

Find the existing import line from `relationshipStore` (currently only imports `removeRelationshipsBatch` and `userRelationships`). Add `clearAllRelationships`:

```ts
// Find the exact current import line — it will look like:
import { userRelationships, removeRelationshipsBatch } from '$lib/components/relationship-capture/relationshipStore';

// Change to:
import { userRelationships, removeRelationshipsBatch, clearAllRelationships } from '$lib/components/relationship-capture/relationshipStore';
```

**Step 2 — Replace `selectType` body**:

```ts
// BEFORE (lines 68-77):
function selectType(type: ApplicantType) {
    if (applicantType === type) return;
    if (formState.applicants.some((a) => a.applicantType)) {
        formState.replaceApplicants([]);
    }
    applicantType = type;
    resetForm();
    globalError = '';
}

// AFTER:
function selectType(type: ApplicantType) {
    if (applicantType === type) return;

    if (formState.applicants.length > 0) {
        // Save each existing applicant to the recovery bin before clearing.
        // This mirrors AddApplicantBusiness.svelte:437-462 (selectEntityType gold standard).
        // When the DSA re-enters the applicant's name, RestoreApplicantModal will offer
        // the previously-entered profile as a suggestion — zero re-entry cost.
        for (const applicant of formState.applicants) {
            if (!applicant.applicantType || !applicant.id) continue;
            const matchSignature = buildMatchSignature(applicant);
            if (!matchSignature) continue;
            const displayName = (applicant.fullName as string) || 'Unnamed';
            applicantState.removeToRecovery(
                applicant.id as string,
                $state.snapshot(applicant) as Record<string, unknown>,
                displayName,
                matchSignature,
                RECOVERY_SCOPE   // 'personal::individual' — defined at line 48
            );
        }
        formState.replaceApplicants([]);
        clearAllRelationships();
        incomeProfileStore.clearAll();
    }

    applicantType = type;
    resetForm();
    globalError = '';
}
```

**Why `length > 0` instead of `some((a) => a.applicantType)`**: The old guard checked whether any applicant has a truthy `applicantType` string. `'Individual'` is always truthy, so the guard fires whenever there are saved applicants — which is the same condition as `length > 0`. The new form is explicit about what it's checking: "are there any applicants at all?"

**Why call order matters**: `replaceApplicants([])` must come AFTER the recovery save loop, not before. Calling it first would empty the array before you can iterate it.

**Verify these imports already exist before implementing** (confirmed in the code):
- `buildMatchSignature` — line 23 ✓
- `applicantState` — line 32 ✓
- `incomeProfileStore` — line 35 ✓
- `$state` — Svelte 5 rune, no import needed ✓
- `RECOVERY_SCOPE` — line 48, value `'personal::individual'` ✓
- `clearAllRelationships` — **NOT present, must be added in Step 1** ✗

**Test**:
1. Personal Loan → add 2 Joint applicants, fill names → toggle to Individual → applicants gone from UI
2. Toggle back to Joint → start typing first applicant's name → `RestoreApplicantModal` appears offering the saved profile
3. Confirm restore → applicant re-appears with prior data intact
4. Toggle to Individual again → same applicants re-saved to recovery bin (deduplicated by identity signature)

**Effort**: ~20 lines + 1 import addition.

---

### NB-2: Director removal — add recovery save

**File**: `src/lib/components/AddApplicantBusiness.svelte:349-361` (`handleRemovePickerConfirm`)

**The bug**: The existing `DirectorRemovePickerModal` lets the DSA choose which directors to keep when reducing the count. But `handleRemovePickerConfirm` discards the removed directors with no recovery save. If the DSA accidentally removes a director who had income data, CIBIL, and relationships filled, that data is permanently gone.

**Why this is Phase 2 (not Phase 4 with F3)**: This bug exists today in the director count-picker, independent of F3's entity-type cap feature. It affects any flow that opens `DirectorRemovePickerModal`. Fixing it here means F3 also gets recovery-save behaviour for free when F3 is implemented.

**Fixed `handleRemovePickerConfirm`**:

```ts
function handleRemovePickerConfirm(keepIndexes: number[]) {
    const kept = keepIndexes.map((i) => removePickerFilled[i]);

    // Save each discarded director's linked Individual applicant to the recovery bin.
    // The director form (DirectorForm) holds the DSA-entered data.
    // The linked Individual in formState.applicants holds income + CIBIL + relationships.
    // We save the Individual (which carries all financial data) — not the DirectorForm.
    const keepSet = new Set(keepIndexes);
    const company = formState.applicants.find((a) => a.applicantType === 'Company');
    const companyId = company?.id as string | undefined;

    for (let i = 0; i < removePickerFilled.length; i++) {
        if (keepSet.has(i)) continue;
        const director = removePickerFilled[i];
        if (!director.id || !director.fullName?.trim()) continue;

        // Find the linked Individual applicant by name + company link
        const linkedApplicant = companyId
            ? formState.applicants.find(
                (a) =>
                    a.applicantType === 'Individual' &&
                    a.linkedCompanyId === companyId &&
                    (a.fullName as string)?.trim().toLowerCase() ===
                        director.fullName.trim().toLowerCase()
              )
            : undefined;

        if (linkedApplicant?.id) {
            const matchSignature = buildMatchSignature(linkedApplicant);
            if (matchSignature) {
                applicantState.removeToRecovery(
                    linkedApplicant.id as string,
                    $state.snapshot(linkedApplicant) as Record<string, unknown>,
                    director.fullName.trim(),
                    matchSignature,
                    'business::director'
                );
            }
        }
    }

    const createOpts = entityConfig
        ? { isOPC: !!entityConfig.isOPC, companyType: entityConfig.companyType }
        : undefined;
    while (kept.length < removePickerTargetCount) {
        kept.push(createEmptyDirectorForm(true, createOpts));
    }
    directorForms = kept;
    showRemovePicker = false;
    removePickerFilled = [];
}
```

**Why we save the `linkedApplicant` (Individual), not the `DirectorForm`**: The `DirectorForm` is the local editing buffer. The `Individual` entry in `formState.applicants` is what carries financial data (income profiles, CIBIL, obligations). The recovery bin restore path (`applicantRestoreHandler.ts`) is designed to receive applicant records, not `DirectorForm` objects. Saving the `Individual` means the full restore machinery works when the DSA switches back.

**Why name-matching is used to find the linked Individual**: The `DirectorForm` holds `id` but it's the form's own ID, not necessarily the `linkedApplicant.id`. The reliable link is the company ID + name match. This is the same matching strategy used in `commitDirectorsToApplicants`.

**Note on bundle restore** (audit's Phase 2 requirement): This fix saves directors individually, one recovery bin entry each. The audit requested bundle restore (restore all removed directors together when switching entity type back). Individual entries are the correct foundation — bundle grouping can be added later by tagging entries with a shared bundle ID. Do not block this fix on bundle restore.

**Effort**: ~25 lines.

---

## Phase 3 — Cross-loan cleanup (coordinated, test as a unit)

### F4-A: Widen `clearForLoanType` TypeScript signature

**File**: `src/lib/state/form.svelte.ts:792`

**Must be done before F4-B** — otherwise secured routes calling `clearForLoanType('secured')` will be TypeScript errors and `pnpm check` fails.

```ts
// BEFORE:
clearForLoanType(targetCategory: 'personal' | 'business' | 'professional'): void {

// AFTER:
clearForLoanType(targetCategory: 'personal' | 'business' | 'professional' | 'secured'): void {
```

**Why `'secured'` is one value for all three secured loans**: All three (Home, LAP, Plot) share a single category value. Applicants are preserved across secured ↔ secured switches because `currentCategory === targetCategory` (both `'secured'`). This was an explicit product decision on 2026-04-23: a DSA working on Home Loan who pivots to LAP for the same client should not lose their applicant data. The pattern matches real DSA journeys.

**Why not separate `'home'`, `'lap'`, `'plot'`**: That would require clearing applicants on every secured ↔ secured switch, destroying the DSA's work when they pivot from Home to LAP for the same client. The whole point of the `'secured'` umbrella is applicant sharing within the secured product family.

**Effort**: 1 line.

---

### F4-B: Add `loanCategory` and `clearForLoanType` to secured routes

**Files**: Home, LAP, and Plot loan `+page.svelte` route files. Find their exact paths with:
```bash
find src/routes -name "+page.svelte" | grep -E "home|lap|plot"
```

In each, add the following two lines at the same point in the mount sequence as the unsecured routes (after `selectedLoan` is set):

```ts
formState.clearForLoanType('secured');
formState.setApplicationField('loanCategory' as any, 'secured' as any);
```

**Why this specific order** (clear THEN set): `clearForLoanType` reads `applicationData.loanCategory` (the current/old value) and compares it to the target. If the new value is written first, the function reads `'secured'` and compares it to `'secured'` — they match, so nothing is cleared. The function must read the old value to decide whether to clear. Call `clearForLoanType` first, then overwrite `loanCategory`.

This is the same order used in `personal-loan/+page.svelte:554-556`:
```ts
formState.clearForLoanType('personal');   // reads old loanCategory, decides whether to clear
formState.setApplicationField('loanCategory', 'personal');  // writes new value
```

**Why this was missing originally**: Secured loan routes predate the `clearForLoanType` system. That function was added for unsecured loans only. Secured routes had no equivalent because they didn't set `loanCategory` at all, so the function couldn't detect cross-category switches originating from secured loans.

**Result after this fix** (all 4 switch directions now work correctly):

| From | To | loanCategory before | Outcome |
|---|---|---|---|
| Home/LAP/Plot | Home/LAP/Plot | `'secured'` | `'secured' === 'secured'` → no clear → **applicants preserved** ✓ |
| Home/LAP/Plot | Personal/Business/Professional | `'secured'` | `'secured' !== 'personal'` → **applicants cleared** ✓ |
| Personal/Business/Professional | Home/LAP/Plot | `'personal'`/etc | `'personal' !== 'secured'` → **applicants cleared** ✓ |
| Personal/Business/Professional | different unsecured | `'personal'` | `'personal' !== 'business'` → **applicants cleared** ✓ (unchanged) |

**Effort**: ~4 route edits, 2 lines each.

---

### F4-C: Patch `applicantRestoreHandler.ts` — reset `onEMI`/`onProperty` for unsecured restores ✅ DONE (S84)

> **Note (2026-04-24)**: A post-implementation audit flagged F4-C as "unreachable — scope isolation prevents cross-scope restores, so this fix is unnecessary." That reasoning was valid for the pre-S84 architecture. S84 shipped cross-loan recovery (`recoveryCompatibility.ts`), which surfaces secured-scoped applicants in unsecured restore modals when compatibility is strong (e.g. `salaried_regular` from Home Loan → Personal Loan). F4-C is therefore correctly implemented and necessary. Do not remove it.

**File**: `src/lib/utils/applicantRestoreHandler.ts` — in `prefillApplicantRestore`, Phase 1, after the existing field resets.

**Why this fix is in Phase 3** (not in the audit at all): This bug only becomes reachable after F4-B ships. Before F4-B, secured and unsecured loans never share a recovery bin — their scopes are different (`'secured::individual'` vs `'personal::individual'`). After F4-B + S84 cross-loan recovery, a secured loan applicant can be restored into an unsecured loan. The restore path bypasses `saveApplicant()` in `AddApplicantPersonal.svelte` — so the `onEMI = true` hardcode never runs for restored applicants.

**The specific failure scenario**: A secured loan applicant who answered `onEMI = false`, `onProperty = false` (i.e., they were a guarantor) is restored into Personal Loan. Their `onEMI` stays `false`. `deriveIndividualRole(false, false)` → `'not_on_loan'`. `getRequiredTabs('not_on_loan')` → `[]`. The income page renders zero tabs. The DSA cannot enter income for this applicant.

**Why `onEMI`/`onProperty` are secured-loan-specific**: For secured loans these flags capture real product questions ("Is this person on the property title?" / "Is this person repaying the EMI?"). For unsecured loans these questions don't exist — `onEMI` is hardcoded true and `onProperty` is hardcoded false at save time. They are implementation details, not user answers.

**The fix** — add to `prefillApplicantRestore` after existing clears:

```ts
// Reset secured-loan participation flags when restoring into unsecured loans.
// onEMI/onProperty are explicit DSA answers for secured loans.
// For unsecured loans, onEMI is always true (all applicants participate fully)
// and onProperty is always false (no property). The saveApplicant() path in each
// unsecured AddApplicant component sets these — but the restore path bypasses
// saveApplicant(). We pre-set them here so the income page activates correctly.
if (!isSecuredLoan) {
    prefilled.onEMI = true;
    prefilled.onProperty = false;
}
```

Check `prefillApplicantRestore`'s parameter list — if `isSecuredLoan` is not already a parameter, it needs to be added and threaded through from the call site.

**Effort**: ~5 lines + possible parameter addition.

---

### F5: `clearForLoanType` clears dependent stores

**File**: `src/lib/state/form.svelte.ts`

**Pre-condition**: P0-A must be merged first.

**Why this is needed**: `clearForLoanType` wipes `formState.applicants[]`. But two stores hold data keyed by applicant IDs: `userRelationships` (relationship graph edges referencing applicant IDs) and `incomeProfileStore` (income profile entries keyed by applicant ID). After a loan-type switch that clears applicants, these stores retain entries pointing to deleted IDs. The next loan's relationship and income pages may surface ghost data if a new applicant happens to receive a matching ID (unlikely with UUID but possible) or if the stale entries are shown in UI that renders "all existing profiles".

**Why the circular import concern from the audit is moot** (confirmed by code):
- `relationshipStore.ts` imports: `svelte/store`, `_bridge.svelte`, `inferenceEngine`, `graphConnectivity`, `categoryClassifier`. No import from `form.svelte.ts`.
- `incomeProfileStore.ts` imports: `svelte/store`, `_bridge.svelte`. No import from `form.svelte.ts`.
- There is no cycle. Both imports can be added directly.

**Step 1 — Add imports to `form.svelte.ts`**:
```ts
import { clearAllRelationships } from '$lib/components/relationship-capture/relationshipStore';
import { incomeProfileStore } from '$lib/stores/incomeProfileStore';
```

**Step 2 — Extend `clearForLoanType`**:

```ts
clearForLoanType(targetCategory: 'personal' | 'business' | 'professional' | 'secured'): void {
    const currentCategory = (this.applicationData as any)?.loanCategory as string | undefined;
    if (currentCategory && currentCategory !== targetCategory) {
        this.applicants = [];
        this.applicantsPayload = [];
        this.applicantErrors = {};
        this.applicantPageIndex = 0;
        this.applicantStepTouched = false;
        this.isDirty = true;
        this._scheduleSave();
        // Clear stores that hold references to the now-deleted applicant IDs.
        // Without this, relationship edges and income profile entries from the
        // previous loan accumulate in sessionStorage and can surface as ghost
        // data in the new loan's UI.
        clearAllRelationships();
        incomeProfileStore.clearAll();
    }
}
```

**Why not clear `loanData` here** (form wizard answers):  `loanData` contains answers like `loanAmount`, `propertyStateName`, `loanType`. Clearing it on a loan switch would wipe data the DSA typed — including `loanAmount`, which they often reuse across products. The answers are keyed by question `bindsTo` names and are product-specific at the schema level (different pages render different questions). A Personal Loan answer sitting in a Home Loan form is invisible to the UI and is filtered by the payload builder. It is storage noise, not a functional bug. This is tracked as NB-4 but deliberately deferred.

**Effort**: 2 imports + 2 lines.

---

### F4-D: Product-specific `applicationData` key cleanup (secured ↔ secured switches) ✅ DONE (S86)

**Implemented**: `src/lib/config/securedLoanKeys.ts` — compiled HOME_ONLY_KEYS (54 keys), LAP_ONLY_KEYS (21 keys), PLOT_ONLY_KEYS (34 keys) from actual questionBank grep. `FormState.clearApplicationFields()` method added to `form.svelte.ts`. Each secured route's `onMount` calls `clearApplicationFields([...OTHER_A_KEYS, ...OTHER_B_KEYS])`.

**Why needed**: After F4, switching Home → LAP preserves applicants (correct). But `applicationData` fields specific to Home Loan (`builderName`, `PropertyStage`, `reraStatus`, etc.) survived into the LAP form as invisible payload noise. Keys shared between two or more secured products are intentionally preserved.

---

## Phase 4 — Requires one team decision before implementing

### F3: Business entity-type enforces director-count cap

**Pre-condition**: NB-2 (recovery save in `handleRemovePickerConfirm`) must be merged first. F3 benefits from that fix automatically.

**Team decision required before starting**:

> When the DSA opens the director-reduction modal (triggered by switching from Partnership → OPC) and clicks Cancel — should the `businessEntityType` selection revert back to Partnership, or stay on OPC with the director count unchanged?

**Recommendation: revert on cancel.** The DSA did not confirm the entity type change — the modal is the confirmation step. Leaving the form in a state where `businessEntityType = OPC` but `directorForms.length = 3` is inconsistent and will confuse the DSA.

**Implementation** (revert on cancel requires storing `previousEntityType`):
```ts
// Add at component level:
let previousEntityType = $state<string>('');

// In selectEntityType, capture the previous type before changing:
previousEntityType = entityType;  // store before updating

// In handleRemovePickerCancel, revert both the count AND the entity type:
function handleRemovePickerCancel() {
    companyForm = { ...companyForm, numberOfDirectorsOrPartners: String(directorForms.length) };
    // Revert entity type:
    formState.replaceApplicationData({ ...formState.applicationData, businessEntityType: previousEntityType });
    entityType = previousEntityType;
    showRemovePicker = false;
    removePickerFilled = [];
}
```

---

**Architecture** (corrected from audit — no new files, no async):

The existing `$effect` in `AddApplicantBusiness.svelte` (around line 244) already handles the full director-reduction-modal flow:
1. Watches `companyForm.numberOfDirectorsOrPartners` and `entityConfig`
2. Calls `resizeDirectorForms(directorForms, count, true)`
3. If `needsUserChoice.length > 0` → populates `removePickerFilled`, sets `showRemovePicker = true`
4. `DirectorRemovePickerModal` renders
5. `handleRemovePickerConfirm(keepIndexes)` handles the result

The only missing piece: when `businessEntityType` changes from Partnership to OPC, the `$effect` doesn't fire because `numberOfDirectorsOrPartners` (which the DSA set to `'3'`) still reads as `3` — it overrides `getMinDirectors(entityConfig.companyType)`.

**Fix**: In `selectEntityType`, after the entity type is written, detect cap violations and lower `numberOfDirectorsOrPartners`. The `$effect` takes over from there.

**Step 1 — Define cap helper** (add near `ENTITY_MAP`):
```ts
function getEntityDirectorCap(entityType: string): number {
    const config = ENTITY_MAP[entityType];
    if (!config) return Infinity;
    if (config.isOPC) return 1;
    // Sole Prop handled separately by the existing wasSoleProp ↔ isSolePropNow logic
    if (entityType === 'proprietorship') return 0;
    // Partnership, LLP, Pvt Ltd — no enforced cap
    return Infinity;
}
```

**Step 2 — Add cap check to `selectEntityType`** (after the role-label sync block, before "Initialize company form"):

```ts
// Enforce the new entity type's max-director cap.
// Example: Partnership (3 directors) → OPC (max 1 director).
// We lower numberOfDirectorsOrPartners to the cap, which triggers the existing
// $effect (line ~244). That $effect calls resizeDirectorForms, detects filled
// directors exceed the new count, and opens DirectorRemovePickerModal.
// The DSA always chooses — no auto "keep first" behaviour.
const newCap = getEntityDirectorCap(type);
if (
    newCap !== Infinity &&
    !wasSoleProp &&
    !isSolePropNow
) {
    const filledCount = directorForms.filter((d) => d.fullName?.trim()).length;
    if (filledCount > newCap) {
        companyForm = { ...companyForm, numberOfDirectorsOrPartners: String(newCap) };
        // $effect fires → resizeDirectorForms → needsUserChoice.length > 0 → modal opens
        // If cancelled, handleRemovePickerCancel reverts numberOfDirectorsOrPartners AND entityType
    }
}
```

**Why this is better than `applicantFormManager.svelte.ts`**: `applicantFormManager` is a form-field-update orchestrator — it processes key-value changes to form fields. It should not know about modals. `AddApplicantBusiness.svelte` is the component that owns the modal state and director form state. Entity-type-level concerns belong there.

**Why the existing `$effect` is the right trigger**: The `$effect` already has the full resizing and modal logic. Duplicating that logic in `selectEntityType` would create two code paths doing the same thing. Triggering via `numberOfDirectorsOrPartners` reuses the proven path.

**Effort**: ~30 lines in `selectEntityType` + `handleRemovePickerCancel` update.

---

## New bugs tracked (out of scope for this plan)

### NB-4: `loanData` not cleared on loan-type switch

`clearForLoanType` clears `applicants[]` but not `loanData` (form answers: `residenceStateName`, `loanAmount`, etc.). After a Personal → Home switch, old answers persist in `applicationData`. They are invisible in the new loan's UI and filtered by the payload builder, but they are storage noise.

**Why deferred**: Clearing `loanData` on switch would wipe `loanAmount`, which DSAs often reuse. The risk of confusing UX outweighs the storage noise. Track as a payload-hygiene item for a future payload-builder review.

---

## Build order

```
Phase 0  ──────────────────────────────────────────────────────
  P0-A   Fix clearAllRelationships (add userReciprocalRelationships.set([]))   [1 line]

Phase 1  ──────────────────────────────────────────────────────  (parallel)
  F1     Delete 'personal' case from getAutoSelectedProfiles                   [2 lines deleted]
  F6     Business Loan code comment at AddApplicantBusiness.svelte             [5 lines]
  NB-3   Remove dead clearForLoanTypeKey from type + 6 configs                 [7 deletions]

Phase 2  ──────────────────────────────────────────────────────  (parallel, after Phase 1)
  F2     Personal Loan selectType → save to recovery + add missing import      [~20 lines + 1 import]
  NB-2   handleRemovePickerConfirm → save removed directors to recovery bin    [~25 lines]

Phase 3  ──────────────────────────────────────────────────────  (coordinated, test as a unit)
  F4-A   Widen clearForLoanType signature to include 'secured'                 [1 line]
  F4-B   Secured routes: add clearForLoanType + setApplicationField calls      [~4 route edits]
  F4-C   applicantRestoreHandler: reset onEMI/onProperty for unsecured restore [~5 lines]
  F5     clearForLoanType: add clearAllRelationships + incomeProfileStore.clearAll [2 imports + 2 lines]
  F4-D   Product-specific key cleanup (Home/LAP/Plot only keys)                [~1.5 hrs, after matrix]

Phase 4  ──────────────────────────────────────────────────────  (after team answers cancel-revert question)
  F3     selectEntityType director-cap → trigger existing modal via count set  [~30 lines]
         handleRemovePickerCancel → revert entityType on cancel                [~5 lines]
```

---

## Files touched (complete list)

| File | Phase | Change summary |
|---|---|---|
| `src/lib/components/relationship-capture/relationshipStore.ts` | P0-A | Add `userReciprocalRelationships.set([])` to `clearAllRelationships` |
| `src/lib/config/incomeProfiles/profileCards.ts` | F1 | Delete `case 'personal': return ['salaried_regular'];` |
| `src/lib/components/AddApplicantBusiness.svelte` | F6, NB-2, F3 | Add comment; fix `handleRemovePickerConfirm`; add `getEntityDirectorCap` + cap check in `selectEntityType`; update `handleRemovePickerCancel` |
| `src/lib/types/wizardConfig.ts` | NB-3 | Remove `clearForLoanTypeKey` from `LoanWizardConfig` type |
| All 6 wizard config files | NB-3 | Remove `clearForLoanTypeKey` property from each config object |
| `src/lib/components/AddApplicantPersonal.svelte` | F2 | Add `clearAllRelationships` import; replace `selectType` body |
| `src/lib/state/form.svelte.ts` | F4-A, F5 | Widen signature; add 2 imports; extend `clearForLoanType` body |
| `src/routes/(app)/form/home-loan/+page.svelte` | F4-B | Add `clearForLoanType('secured')` + `setApplicationField('loanCategory', 'secured')` |
| `src/routes/(app)/form/lap/+page.svelte` (confirm path) | F4-B | Same |
| `src/routes/(app)/form/plot-loan/+page.svelte` (confirm path) | F4-B | Same |
| `src/lib/utils/applicantRestoreHandler.ts` | F4-C | Reset `onEMI`/`onProperty` when restoring into unsecured loan |
| `src/lib/components/IncomePageNew.svelte` | — | No changes. `onEMI = true` hardcodes are correct and load-bearing. |
| `src/lib/components/applicantFormManager.svelte.ts` | — | No changes. F3 does not touch this file. |
| `src/lib/components/DirectorRemovePickerModal.svelte` | — | No changes. Existing interface is sufficient. |

---

## What will NOT change (and why)

| Component | Why unchanged |
|---|---|
| `applicantFormManager.svelte.ts` | F3 no longer touches this. Making `updateFormLevelField` async would break all call sites. |
| `onEMI`/`onProperty` hardcodes in 4 AddApplicant components | Correct, intentional, load-bearing for income page tabs via legacy `deriveApplicantRole` path. |
| `incomeProfileStore.ts` | No changes needed to its interface — `clearAll()` already works correctly. |
| `applicantRoleUtils.ts` | No changes. The classification system correctly handles unsecured loans without `onEMI`/`onProperty`. |
| Test files | None of the changed code paths are currently tested. Zero breakage. New tests should be added per the test plan. |

---

## Testing strategy

### Unit tests (new, one per fix)

| Fix | Test | Location |
|---|---|---|
| P0-A | `clearAllRelationships()` empties both `userRelationships` and `userReciprocalRelationships` | Extend relationship store test |
| F1 | `getAutoSelectedProfiles({ loanCategory: 'personal', applicantType: 'Individual' })` returns `[]` | `incomeProfiles.test.ts` — add one `it()` block |
| F4-A/B/F5 | `clearForLoanType('secured')` when `loanCategory = 'personal'` → clears applicants + relationship store + income store | Extend `formState` tests |

### Integration test — 30-transition matrix (Phase 3)

A single new test file covering all loan-type transitions. For each transition:
1. Set `applicationData.loanCategory` to source value
2. Add 1 mock applicant to `formState.applicants`
3. Call `clearForLoanType(targetCategory)`
4. Assert applicants preserved (secured ↔ secured) or cleared (cross-category)

### Manual E2E (pre-merge, per phase)

**Phase 1**: Add Personal Loan applicant → Income page shows no pre-selected profile, Next disabled until selection.

**Phase 2**: Personal Loan Joint → 2 applicants → toggle Individual → both gone → toggle back to Joint → type first name → restore modal appears → confirm → data intact.

**Phase 3**: Home Loan → 2 applicants → switch to Personal Loan → fresh list, no ghost data. Personal Loan → switch to LAP → list cleared. Home → LAP → applicants preserved.

**Phase 4**: Business Loan → Partnership → 3 directors (2 named) → switch OPC → modal lists both named directors → pick 1 → confirm → 1 remains, 2 in recovery → switch back to Partnership → restore both.

---

**End of plan**
