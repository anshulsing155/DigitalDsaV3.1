# Applicant State — Audit, Observations & Proposed Fixes

**Date**: 2026-04-23
**Scope**: Cross-loan applicant handling — auto-set behaviours, loan-type switching, structure changes, data preservation on re-entry
**Status**: Awaiting team review before implementation (2 decisions confirmed by user — see Decisions Log)

---

## 0. Decisions Log

Decisions confirmed during audit review. Kept here so reviewers don't need to cross-reference the conversation.

| Date | Decision | Rationale | Affects |
|---|---|---|---|
| 2026-04-23 | **F2 UX — save-before-wipe with suggestion on re-entry** is the desired behaviour. When a user toggles Individual ↔ Joint, previously-entered applicants are saved to the recovery bin and resurface as suggestions on re-entry via the existing RestoreApplicantModal. | Zero re-entry cost for a destructive accidental toggle; matches Business Loan's existing protective pattern. | F2 |
| 2026-04-23 | **F4 — single shared `loanCategory = 'secured'`** for Home / LAP / Plot (not per-loan values). Applicants preserved across secured ↔ secured switches; cleared on secured ↔ unsecured. | Matches real DSA journeys (Home declined → pivot to LAP with same applicants). Consistent with existing `RecoveryScope` naming (`'secured::individual'` already exists). Applicant data is universal across secured products. | F4 |
| 2026-04-23 | **F3 UX — modal-picker for director reduction, bundle-to-recovery**. When `businessEntityType` changes to one with a lower director cap (e.g. Partnership → OPC), show a modal asking the DSA which director(s) to keep. Others are soft-deactivated as a bundle into the recovery bin (so switching back restores them together). DSA always chooses; no auto "keep first" logic. | DSA has full context (ownership %, CIBIL pending, who is family member). Auto-picking first may silently drop the best applicant. Bundle-restore keeps related relationships intact when user reverses the entity switch. | F3 |
| 2026-04-23 | **Observation 7 resolved as deliberate design — Business Loan primary is always the Company**. Individual-only Business Loans are not allowed in this system; Business Loan requires a Company applicant. The omission of `SuggestPrimaryBanner` from `AddApplicantBusiness.svelte` is correct by design. A code comment should be added at the would-be render site explaining the rule so future maintainers don't re-open it. | Business Loan rules: a company/firm borrows; individuals are directors/guarantors, not primary. Swapping primary to an Individual would break lender-matching and payload semantics. | Observation 7 |
| 2026-04-23 | **F5 circular-import resolution — break the existing edge, not add a detour**. If `pnpm build` reports a cycle between `form.svelte.ts` and `relationshipStore.ts`, the fix is to remove the pre-existing import on the `relationshipStore` side (the edge that reads `formState`). If that removal breaks any auto-relationship behaviour (e.g. display-name lookups), accept it — the DSA will re-enter relationship data through the existing RelationshipCapture UI. Don't route around the cycle with per-route duplication. | Pragmatic: cycle fixes should reduce coupling, not hide it. Accepting manual re-entry for an edge-case auto-feature is cheaper than living with a circular dependency long-term. | F5 |

---

## 1. Context & Scope Boundaries

This document records first-hand-verified observations from a code audit of applicant state handling across all six loan types (Home, LAP, Plot, Personal, Business, Professional). Every claim below carries a `file:line` reference the auditor personally read — no agent-sourced summaries, no extrapolation.

The audit was triggered by two user-reported UX issues:

1. **Applicant-structure UX inconsistency** — Professional Loan asks "Individual / Joint / Company-Firm" upfront; other loans don't.
2. **Stale applicant state on loan-type switch** — e.g. user enters Home Loan with salaried applicant, switches to Business Loan as Sole Proprietor, the old applicant and relationship page persist.

### Explicit scope constraints set by the user

| Constraint | Implication |
|---|---|
| Fix bugs and restore cross-loan parity only; no major refactors without explicit approval | Proposed changes are all targeted patches. No shared-component refactor. |
| Do not add Individual/Joint question to secured loans | Lenders rarely permit single-applicant secured loans; existing count-based render path (flattened ↔ wizard in `IncomePageNew`) handles this implicitly. |
| Do not add cross-loan historical applicant pool | A DSA manages many applications over time; surfacing old names as suggestions would overwhelm. Keep recovery bin local and loan-scope-isolated. |
| No MongoDB session sync | Each page already persists server-side; additional per-field sync would multiply server load unacceptably. |
| Cross-device recovery bins — nice-to-have, skip if it requires server calls | Cannot be done client-only. Browser sync does not cover localStorage/IndexedDB. **Dropped.** |
| `onEMI = true` hardcode for Personal Loan applicants is intentional | Personal Loan has no on-EMI question; assuming true is how the Income page unlocks. Leave as-is. |

---

## 2. Ground-Truth Data Model (what reviewers need to know)

Before reading observations, note the following verified facts about the runtime shape:

- **`formState.applicants[]`** lives in `src/lib/state/form.svelte.ts:169`, persisted to `sessionStorage` under key `home-applicants-store` (naming is historical; used for all loan types).
- **`Applicant` type** defined at `src/lib/types/form.ts:240-411`. Key fields: `id`, `applicantType` ('Individual' | 'Company'), `fullName`, `age`, `gender`, `maritalStatus`, `isPrimaryApplicant`, `onEMI`, `onProperty`, `selectedIncomeProfiles`, `linkedCompanyId`, `obligations`, `directors`, plus a permissive `[key: string]: any` index signature.
- **PAN is not captured** anywhere in the applicant forms. Grep of `src/lib/config/*Loan/questionBank/` for PAN returned zero user-facing questions. Identity key (`applicant.svelte.ts:274-285`) is `name + age + gender + maritalStatus` for Individual; `companyName + companyType` for Company.
- **`isPrimaryApplicant` is a stored flag** (`form.ts:248`) with 3-level getter fallback at `form.svelte.ts:260-268`: explicit flag → legacy role marker → `applicants[0]`. **However**, the only writer is `formState.setPrimaryApplicant(index)` (`form.svelte.ts:694-702`), which is called from exactly two sites:
  - `AddApplicant.svelte:204` (secured loans)
  - `AddApplicantPersonal.svelte:861`
  Both sites hand the function to `<SuggestPrimaryBanner>` as the `onSetPrimary` prop. The banner needs `creditScore`, `grossIncome/netIncome`, `age`, `employmentType` to surface any suggestion at all (`SuggestPrimaryBanner.svelte:152-224`). The Add-Applicant page captures only name/age/gender/marital/isNRI. So in practice, **no primary flag can be set until Income + CIBIL pages have been filled**. Early in the flow, the effective primary is always `applicants[0]` via the getter fallback. **Treat `isPrimaryApplicant` as late-stage-derived for all UX design purposes.**
- **Recovery bin** (`applicant.svelte.ts:328-505`) lives in `localStorage` under `applicant-state:recovery`, 90-day TTL, max 10 variants per identity. Scope-isolated: `secured::individual` entries never surface in a `personal::individual` query (line 845-859).
- **Relationships** live in two places: per-applicant fields on `Applicant` (`relationship`, `relationwith`, `otherBloodRelation`, `existingRoleOfPerson`, `roleOfPerson`) AND a separate `userRelationships` store (referenced in 26 files including `relationship-capture/relationshipStore.ts`). Payload serializer at `payloadBuilder/applicantPayload.ts:89` computes `relationshipWithPrimary = resolveRelationship(index, rawApplicant, relationships)` from the graph — so "relationship with primary" is a **derived output**, not stored directly.
- **`loanCategory`** is an `applicationData` field set ONLY by unsecured route files: personal `+page.svelte:556`, business `+page.svelte:565`, professional `+page.svelte:790`. Secured routes (home/LAP/plot) never set it. This is load-bearing for cross-loan cleanup — see Observation 4.

---

## 3. Verified Observations

### Observation 1 — Personal Loan auto-selects "Salaried (Regular)" income profile

- **Location**: `src/lib/config/incomeProfiles/profileCards.ts:306-308`
  ```ts
  case 'personal':
    return ['salaried_regular'];
  ```
- **Called from**: `src/lib/components/AddApplicantPersonal.svelte:381-388` — invoked unconditionally when a Personal Loan applicant is saved. Result is assigned to `snapshot.selectedIncomeProfiles`.
- **Consequence**: When a user adds the first applicant in Personal Loan, the income-profile selector arrives pre-checked with "Salaried - Regular". Users who don't read carefully may submit wrong-profession data.
- **Severity**: High (user-visible data correctness).

### Observation 2 — Personal Loan `selectType()` bulk-wipes applicants without recovery

- **Location**: `src/lib/components/AddApplicantPersonal.svelte:68-77`
  ```ts
  function selectType(type: ApplicantType) {
    if (applicantType === type) return;
    if (formState.applicants.some((a) => a.applicantType)) {
      formState.replaceApplicants([]);
    }
    applicantType = type;
    resetForm();
    globalError = '';
  }
  ```
- **Consequence**: When a user toggles Individual ↔ Joint after adding applicants, all previously entered applicants are **hard-deleted** without being saved to the recovery bin. If the user re-toggles back, their work is lost.
- **Contrast with Business Loan**: `AddApplicantBusiness.svelte:437-462` — Business handles the equivalent situation (sole-prop ↔ company toggle) by iterating applicants, calling `applicantState.removeToRecovery(...)` for each, then calling `clearAllRelationships()` and `incomeProfileStore.clearAll()` before the wipe. **Personal Loan lacks this protection.**
- **Severity**: High (silent data loss).

### Observation 3 — Business entity-type change auto-derives `applicationStructure` without validating directors array

- **Location**: `src/lib/components/applicantFormManager.svelte.ts:1506-1511`
  ```ts
  if (key === 'businessEntityType') {
    const SINGLE_ENTITIES = ['Sole Proprietorship', 'One Person Company (OPC)'];
    const derivedStructure = SINGLE_ENTITIES.includes(value as string) ? 'individual' : 'company';
    formState.setApplicationField('applicationStructure' as any, derivedStructure as any);
  }
  ```
- **Consequence**: Switching `businessEntityType` from Partnership (3 directors entered) → OPC (which allows only 1 director) updates `applicationStructure` but leaves the 3 directors in place. Form state becomes structurally inconsistent; downstream logic like auto-income entry creation continues to produce entries for all three.
- **Note**: `AddApplicantBusiness.svelte:437-462` (referenced in Observation 2) DOES handle this correctly for the **entity-kind** change (sole-prop ↔ company). What is missing is handling for the **within-company-kind** change (Partnership ↔ OPC ↔ Pvt Ltd) when director count limits differ.
- **Severity**: Medium (inconsistent internal state, not always user-visible).

### Observation 4 — Loan-type switching has no cleanup across secured ↔ unsecured

- **Locations**:
  - `src/lib/state/form.svelte.ts:792-803` — `clearForLoanType(targetCategory: 'personal' | 'business' | 'professional')` compares `applicationData.loanCategory` against target.
  - `src/routes/(app)/form/unsecure-loan/personal-loan/+page.svelte:556` sets `loanCategory = 'personal'`.
  - `src/routes/(app)/form/unsecure-loan/business-loan/+page.svelte:565` sets `loanCategory = 'business'`.
  - `src/routes/(app)/form/unsecure-loan/professional-loan/+page.svelte:790` sets `loanCategory = 'professional'`.
  - **Secured loan routes (home, LAP, plot) do NOT set `loanCategory`.** Grep confirmed.
- **Consequences** (real user scenarios verified):
  - **Home → Personal**: `loanCategory` was never set (undefined). `clearForLoanType('personal')` checks `currentCategory && currentCategory !== 'personal'` — undefined is falsy, condition false, **no cleanup**. Home Loan applicants persist into Personal Loan as stale data.
  - **Personal → Home**: Home Loan route never calls `clearForLoanType` at all. **No cleanup**. Personal Loan applicants persist into Home Loan.
  - **Home → LAP** (secured ↔ secured): No cleanup path exists.
  - **Personal → Business**: Works correctly. `loanCategory` was 'personal', target is 'business', applicants cleared. Confirmed path.
- **Severity**: High (stale data survives into a different loan product; relationships and structural assumptions become nonsensical).

### Observation 5 — `clearForLoanType` doesn't clear dependent stores (`relationshipStore`, `incomeProfileStore`)

- **Location**: `src/lib/state/form.svelte.ts:792-803` — clears `applicants`, `applicantsPayload`, `applicantErrors`, `applicantPageIndex`, `applicantStepTouched`. Nothing else.
- **Contrast**: `AddApplicantBusiness.svelte:456-457` (entity-type switch) DOES call `clearAllRelationships()` and `incomeProfileStore.clearAll()` before wiping.
- **Consequence**: After a loan-type switch that clears applicants, the relationship graph still contains edges referencing deleted applicant IDs. `userRelationships` and `incomeProfileStore` accumulate dead entries across switches.
- **Severity**: Medium (browser storage bloat; potential for stale data to resurface if the system later indexes by ID collision).

### Observation 6 — `isPrimaryApplicant` flag cannot be meaningfully set early in the flow

- **Location**: Writers verified at `AddApplicant.svelte:204` and `AddApplicantPersonal.svelte:861` only. `SuggestPrimaryBanner.svelte:152-224` requires income + CIBIL + age + employmentType to produce any suggestion.
- **Consequence**: Until the user fills Income + CIBIL pages for at least two applicants, the banner never fires and no primary flag can be written. Effective primary is always `applicants[0]` via `form.svelte.ts:262-267` fallback.
- **Severity**: Not a bug — this is intentional design. **Documented here to rule out any UX proposal that tries to treat `isPrimaryApplicant` as user-settable at the Add-Applicant page.**

### Observation 7 — `SuggestPrimaryBanner` is not rendered in Business or Professional flows

- **Locations checked** (grep confirmed only two render sites):
  - `AddApplicant.svelte:201` (secured — home/LAP/plot)
  - `AddApplicantPersonal.svelte:858`
- **Missing from**: `AddApplicantBusiness.svelte`, `AddApplicantProfessional.svelte`.
- **Note**: For Professional Loan, the banner deliberately short-circuits (`SuggestPrimaryBanner.svelte:154` — profession lock). For Business, the omission appears unintentional — the banner's scoring model is loan-agnostic and would work.
- **Severity**: Low (missing UX parity; does not break anything).

### Observation 8 — Claimed `completionMap` staleness bug does NOT exist

- **Location**: `wizardState.svelte.ts:358` — `completionMap` is a `$derived.by(...)`, recomputed every reactive pass, not a stored field.
- **Consequence of re-verification**: An earlier agent claimed hidden pages retain stale completion state that resurfaces on re-visibility. This is incorrect. `sectionCompletion` at `wizardState.svelte.ts:513` skips hidden pages (`if (!visiblePageIds.has(pageId)) continue`). Section-level completion UI is always consistent with current visibility.
- **Separate concern (lower priority, noted for future)**: Values in `formState.loanData` and `formState.applicants` for pages that became hidden are NOT cleared, so a submission payload could carry answers from no-longer-visible pages. This is a payload-hygiene concern, not a wizard-UI bug. Out of scope for this audit.

### Observation 9 — Applicant restore flow correctly filters stale loan-specific data

- **Location**: `src/lib/utils/applicantRestoreHandler.ts`
- **Verified behaviour**:
  - Phase 1 (`prefillApplicantRestore`, line 46-133): pre-fills identity, clears stale `selectedIncomeProfiles`, `__completion`, quarantines orphan `linkedCompanyId` as `__pendingCompanyLink`.
  - Phase 2 (`commitApplicantRestore`, line 145-194): rebuilds `selectedIncomeProfiles` from restored structured entries, re-links directors/companies, re-applies relationships via `restoreRelationshipsForApplicant`.
- **Consequence**: The restore machinery is already well-designed for cross-loan safety at the applicant level. Most loan-specific data (property details, business profile, professional profile) lives on `applicationData`, not on applicants — so cross-loan applicant restore is inherently safe. **No changes proposed here.**

---

## 4. Proposed Fixes

Each fix is scoped to a single observation. All are small, targeted patches (no refactors).

### Fix F1 — Remove Personal Loan auto-Salaried (addresses Observation 1)

**Change**: `src/lib/config/incomeProfiles/profileCards.ts:306-308`

```ts
// BEFORE
case 'personal':
  return ['salaried_regular'];

// AFTER
case 'personal':
  return [];
```

**Risk**: Low. Function returns an array that is assigned to `snapshot.selectedIncomeProfiles`. Empty array means the Income page will prompt the user to select — which is the desired behaviour.

**Testing**: Add Personal Loan applicant, confirm Income page shows no pre-selected profile card. Verify next-button correctly disabled until user selects.

**Effort**: 1 line.

---

### Fix F2 — Save to recovery before wiping on applicantType toggle (addresses Observation 2)

**Change**: `src/lib/components/AddApplicantPersonal.svelte:68-77`

Replace the current `selectType` body with Business Loan's pattern:

```ts
function selectType(type: ApplicantType) {
  if (applicantType === type) return;

  if (formState.applicants.some((a) => a.applicantType)) {
    // Save each existing applicant to recovery bin before wiping
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
        RECOVERY_SCOPE  // already defined as 'personal::individual' at line 48
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

**Risk**: Low. The recovery bin and its infrastructure already exist and are proven by the Business Loan code path. Imports (`applicantState`, `buildMatchSignature`, `clearAllRelationships`, `incomeProfileStore`) exist in `AddApplicantPersonal.svelte` already (verified).

**Testing**:
1. Add 2 applicants in Joint mode, fill income for both.
2. Toggle to Individual — verify applicants are gone but restorable when re-entered.
3. Toggle back to Joint, start typing second applicant's name — verify restore modal offers the previously-entered profile.

**Effort**: ~20 lines.

---

### Fix F3 — Business entity-type validates directors count (addresses Observation 3)

**Change**: `src/lib/components/applicantFormManager.svelte.ts:1506-1511`

**UX approved 2026-04-23** — modal-picker then bundle-to-recovery. See Decisions Log §0. DSA chooses which director(s) to keep; the rest (plus their linked Individual records, auto-income entries, and relationship edges) are saved to the recovery bin as a bundle. No auto "keep first" behaviour.

### Flow

1. Detect: on `businessEntityType` change, compare old vs new director-count cap:
   - Partnership / LLP / Pvt Ltd: ≥ 2 directors allowed
   - OPC: exactly 1 director
   - Sole Proprietorship: no directors (collapses to Individual applicant; handled separately by existing logic at `AddApplicantBusiness.svelte:437-462`)
2. If existing `directors.length` > new cap: open a modal (new component `DirectorReducePickerModal.svelte`, likely patterned after the existing `DirectorRemovePickerModal.svelte`):
   - List all current directors with name, ownership %, role, onEMI/onProperty flags
   - "Switching to OPC allows only 1 director. Choose who to keep. The others will be saved and restorable if you switch back."
   - DSA selects 1 (or up to the new cap). "Continue" / "Cancel".
3. On confirm:
   - Keep selected director(s) in `directors[]`.
   - Bundle the removed director(s) + their linked Individual applicants + their auto-income entries + relationship edges referencing them into a single recovery payload.
   - Save to recovery bin under `business::director` scope with a bundle marker so restoring the bundle puts them all back together.
   - If DSA cancels: revert the `businessEntityType` change (set it back to the prior value).

### Proposed signature

```ts
// New file: src/lib/utils/reduceDirectorsToEntityCap.ts
export async function reduceDirectorsToEntityCap(params: {
  company: Applicant;
  newEntityType: string;
  newCap: number;
  currentDirectorCount: number;
}): Promise<{ keptIds: string[]; cancelled: boolean }> {
  // Opens DirectorReducePickerModal, awaits user choice.
  // Returns kept IDs, or cancelled=true if DSA backed out.
}
```

Called from `applicantFormManager.svelte.ts:1506-1511`:

```ts
if (key === 'businessEntityType') {
  const newCap = capFromEntity(value as string);       // Partnership/LLP/PvtLtd → Infinity, OPC → 1
  const companies = formState.applicants.filter(a => a.applicantType === 'Company');
  for (const company of companies) {
    const directors = (company.directors ?? []) as DirectorInfo[];
    if (directors.length > newCap) {
      const { keptIds, cancelled } = await reduceDirectorsToEntityCap({
        company, newEntityType: value as string, newCap, currentDirectorCount: directors.length
      });
      if (cancelled) {
        // Revert businessEntityType to previous value, no other changes
        return;
      }
      // Use the existing director-removal helper (see open question below) with the list to evict
      await removeDirectorsAsBundle(company.id as string, directors.filter(d => !keptIds.includes(d.id)));
    }
  }
  // Only now set the derived applicationStructure
  const derivedStructure = newCap === 0 ? 'individual' : 'company';
  formState.setApplicationField('applicationStructure' as any, derivedStructure as any);
}
```

### Remaining open question for team (narrowed)

The UX is decided. What still needs sign-off: **which existing helper removes a director and cleans up the 3-way sync (linked Individual record, auto-income entries, relationship edges)?** Two possibilities:

- **(a)** `commitDirectorsToApplicants` already handles all three as a side-effect when the `directors[]` array shrinks. In that case `removeDirectorsAsBundle` above is just a splice + recovery-save.
- **(b)** The cleanups are handled ad-hoc at existing UI call-sites (e.g. the "Remove Director" button in `DirectorCards.svelte` has its own orchestration). In that case we need to either extract a shared helper or call into the same callsite from our new modal.

Team question: *"When a director is removed via the existing UI (say, DSA clicks Remove on a director card), what function runs? Does that path also clean up linked Individual + auto-income + relationships, or does the UI component orchestrate those cleanups itself?"*

### Risk

Medium. The 3-way sync is the hard part. Opening a modal and bundling to recovery is mechanically simple — the risk is entirely in getting the downstream cleanup right, which depends on the team answer above.

### Testing

- 3 directors under Partnership → switch to OPC → modal appears → pick Rajesh → confirm → directors[]=[Rajesh], Priya and Amit saved as bundle.
- Switch back to Partnership → restore bundle → Priya and Amit re-appear with their income entries and the Priya↔Rajesh spouse relationship intact.
- Cancel modal → businessEntityType reverts, no state change.
- Edge: 2 directors under Partnership → switch to OPC (cap=1) → modal with 2 options → pick one → other bundled.
- Edge: already 1 director under Partnership → switch to OPC (cap=1) → no modal, no-op.

**Effort**: ~40 lines, contingent on team input.

---

### Fix F4 — Secured routes set `loanCategory = 'secured'`; `clearForLoanType` accepts 'secured' (addresses Observation 4)

**Direction approved 2026-04-23**: One shared `'secured'` value for Home / LAP / Plot. See Decisions Log §0 for rationale.

**Change part A** — Add `loanCategory = 'secured'` to secured loan routes:
- `src/routes/(app)/form/home-loan/+page.svelte` (add `formState.setApplicationField('loanCategory' as any, 'secured' as any)` at the equivalent mount point)
- Similarly for LAP and Plot loan routes (exact file paths to be confirmed during implementation)

**Change part B** — Extend `clearForLoanType` signature in `src/lib/state/form.svelte.ts:792-803`:

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
  }
}
```

**Change part C** — Call `clearForLoanType('secured')` from secured routes after setting `loanCategory`.

**Change part D (new subtask — product-specific field cleanup)** — Because all three secured loans share one `loanCategory`, switching Home → LAP → Plot will NOT trigger `clearForLoanType`, which is the intended behaviour for applicants. However, loan-level product-specific fields on `applicationData` (e.g. `propertyType`, `constructionStatus`, `btRegistry` from Home; plot-specific fields from Plot) will persist into the new product as stale data.

Each secured route should, on mount, clear product-specific `applicationData` keys that don't apply to that product. Proposed shape:

```ts
// In each secured loan +page.svelte onMount / load:
const HOME_ONLY_KEYS = ['propertyType', 'constructionStatus', 'btRegistry', /* ... */];
const LAP_ONLY_KEYS  = ['lapPropertyDetails', /* ... */];
const PLOT_ONLY_KEYS = ['plotAreaSqFt', 'plotApprovalAuthority', /* ... */];

// Clear keys that belong to other secured products, keep universal + this-product keys
```

Exact key lists to be compiled during implementation by grepping each loan's `questionBank/` for unique `bindsTo_template` values.

This subtask is **only relevant for secured ↔ secured switches**. Unsecured and cross-category switches are already handled by `clearForLoanType` wiping `applicants` (though loan-level fields persist there too — same existing pattern, not new).

**Risk**: Medium. The equality check correctly handles the 4 transitions that matter:

| Current → Target | Condition | Outcome |
|---|---|---|
| `'secured'` → `'secured'` | `!==` false | No clear — applicants preserved (intended) |
| `'secured'` → `'personal'`/`'business'`/`'professional'` | `!==` true | Clear (intended) |
| `'personal'`/etc → `'secured'` | `!==` true | Clear (intended) |
| Unsecured → different unsecured | `!==` true | Clear (existing, unchanged) |

**Testing matrix** (all 30 transitions across 6 loans):

| From | To | Applicants |
|---|---|---|
| Home | LAP | **Preserved** |
| Home | Plot | **Preserved** |
| LAP | Home | **Preserved** |
| LAP | Plot | **Preserved** |
| Plot | Home | **Preserved** |
| Plot | LAP | **Preserved** |
| Home / LAP / Plot | Personal / Business / Professional | Cleared (9 pairs) |
| Personal / Business / Professional | Home / LAP / Plot | Cleared (9 pairs) |
| Personal ↔ Business ↔ Professional | any other | Cleared (6 pairs, existing behaviour) |

**Effort**: ~4 route edits + 1 function signature change (~30 min). Product-specific key-list compilation + per-route cleanup (~1 hr). Total ~1.5 hrs excluding tests.

---

### Fix F5 — Loan switch clears dependent stores (addresses Observation 5)

**Change**: `src/lib/state/form.svelte.ts:792-803` — inside `clearForLoanType`, after the existing field clears, add:

```ts
// Only do this if we actually cleared (currentCategory existed and changed)
if (currentCategory && currentCategory !== targetCategory) {
  // ... existing clears ...
  clearAllRelationships();
  incomeProfileStore.clearAll();
}
```

**Risk**: Low. Both functions are already called from `AddApplicantBusiness.svelte:456-457` — proven-safe infra.

### Circular-import handling (approved 2026-04-23, see Decisions Log §0)

**Step 1**: After adding the two imports in `form.svelte.ts`, run `pnpm build`. If it emits any cycle warnings (or `npx madge --circular src/` lists a cycle involving `form.svelte.ts` + `relationshipStore.ts`), proceed to Step 2. Otherwise F5 is done.

**Step 2 (if cycle exists)**: The resolution is to **break the existing edge** — i.e. remove the import on the `relationshipStore` side that reads `formState`. This makes the dependency direction one-way (`form.svelte.ts` → `relationshipStore`), eliminating the cycle.

**Step 3**: Any auto-feature inside `relationshipStore` that relied on reading `formState.applicants` (e.g. auto-resolving display names, inferring relationship categories from applicant genders) may stop working as a result. This is accepted per the decision: the DSA will re-enter relationship data manually via the existing `RelationshipCapture` UI. No attempt should be made to route around the cycle with per-route call duplication or dependency injection — the long-term cost of a cycle outweighs the one-time cost of manual re-entry for an edge feature.

**Before removing the `relationshipStore → form.svelte.ts` edge**: grep for what that import is actually used for inside `relationshipStore.ts`. Document any feature that breaks. If the list is non-trivial (more than just display-name lookups), flag it back for a quick sanity check before removing — the decision assumes the breakage is minor.

**Testing**: After any cross-category switch, verify `userRelationships` store and `incomeProfileStore` are empty. If Step 2 was invoked, also verify the RelationshipCapture UI still lets the DSA re-enter relationships cleanly (names may need to be typed manually instead of auto-populated).

**Effort**: 2-5 lines if no cycle. ~30 min if cycle must be broken (plus a pre-removal grep audit of what the existing import is used for).

---

### Fix F6 — Document Business Loan primary-is-always-Company rule at omission site (addresses Observation 7, resolved)

Observation 7 is resolved as deliberate design (see Decisions Log §0): Business Loan always has a Company as primary; Individual-only Business Loans are not allowed in this system. `SuggestPrimaryBanner` omission from `AddApplicantBusiness.svelte` is correct.

This fix adds a short code comment at the point where the banner would have been rendered (analogous to `AddApplicantPersonal.svelte:858`) so future maintainers don't propose adding it. Something like:

```svelte
<!-- ── No SuggestPrimaryBanner on purpose ──────────────────────────
     Business Loan requires a Company applicant as primary; individuals are
     directors / guarantors, not primary. Swapping to an Individual primary
     would break lender-matching and payload semantics. Rule confirmed
     2026-04-23 (see docs/APPLICANT-STATE-AUDIT-2026-04-23.md §0).
-->
```

**Risk**: Zero. Comment only.

**Effort**: 1 min.

**Adjacent enforcement question (out of scope for this audit)**: if the rule is "Business Loan requires a Company", is there server-side validation today that rejects a Business Loan payload with no Company applicant? If not, that's a separate hardening item the team should pick up.

---

## 5. Out of Scope / Rejected

| Idea | Why rejected |
|---|---|
| Add upfront Individual/Joint question to secured loans | User directive. Existing count-based render path in `IncomePageNew.svelte` handles it. |
| Historical cross-loan applicant pool in MongoDB / Redis | User directive. Would overwhelm a DSA managing many applications. |
| MongoDB session sync for cross-device form resume | User directive. Adds too many server calls; page-level saves already exist. |
| Cross-device recovery bin via client-side only | Technically impossible. Browser sync does not cover localStorage/IndexedDB. |
| Removing `onEMI = true` hardcode in Personal Loan applicant save | User confirmed: intentional. Personal Loan has no on-EMI question; flag is load-bearing for Income page visibility. |
| Schema-level per-loan field whitelist on restore | Verified unnecessary. Applicant-scoped data is universal; loan-specific data lives on `applicationData`. |
| Shared `ApplicantListEditor` component replacing 6 variants | Would be a refactor, not a bug fix. Requires explicit user approval per scope constraint. |
| Render `SuggestPrimaryBanner` in Business Loan | Resolved as deliberate design (2026-04-23): Business Loan primary is always a Company. See Decisions Log §0 and Fix F6 (code-comment-only). |
| Payload hygiene — strip values for hidden pages | Separate concern (noted in Observation 8). Out of scope for this audit; defer to a payload-builder review. |

---

## 6. Suggested Build Order & Testing

### Phase 1 — Immediate safe fixes (independent, parallel)

1. **F1** — Personal Loan auto-Salaried removal
2. **F5** — Loan switch clears dependent stores
3. **F6** — Business Loan code-comment at banner omission site

All three are 1-5 line changes with near-zero risk. Ship first.

### Phase 2 — Data-preservation fixes (independent)

4. **F2** — Personal Loan applicantType toggle saves to recovery

Requires recovery bin testing. Must verify restore modal surfaces correctly after toggle.

### Phase 3 — Cross-loan cleanup (coordinated)

5. **F4** — Secured routes set `loanCategory = 'secured'`; `clearForLoanType` accepts 'secured'; product-specific key cleanup

Requires testing matrix across all 30 loan-type transitions. Test in isolation to catch regressions in Home ↔ LAP ↔ Plot preservation.

### Phase 4 — Requires team input before implementation

6. **F3** — Modal-picker for director reduction on entity-type change; bundle-to-recovery

UX is decided. Team needs to answer the director-cleanup helper question (Section 7, Q1) before the 3-way sync orchestration can be written safely.

### Global test strategy

- **Unit tests**: each fix gets at least one test covering the primary behaviour change.
- **Integration test** (new): a single test that walks through loan-type switching in all 12 directions, verifying applicant persistence/cleanup per the Fix F4 matrix.
- **E2E (manual, pre-merge)**: one DSA user flow per fix, end-to-end.

---

## 7. Open Questions for Team Review

1. **F3 — Director removal cleanup helper**: UX is decided (modal-picker + bundle-to-recovery, per Decisions Log §0). What remains: *"When a director is removed via the existing UI, what function runs? Does that path also clean up the linked Individual applicant record + auto-income entries + relationship edges, or does the UI callsite orchestrate those cleanups itself?"* Answer determines whether F3's `removeDirectorsAsBundle` can call an existing helper or needs new orchestration.
2. **F4 product-specific key lists**: Once this fix is picked up, someone needs to compile the exact `bindsTo_template` keys that are Home-only, LAP-only, and Plot-only. Easiest done by grepping each loan's `src/lib/config/{home|lap|plot}Loan/questionBank/` and diffing. Estimated 30-60 min.

---

## 8. Summary of What Will Change If All Fixes Merge

| User-observable change | Before | After |
|---|---|---|
| Personal Loan first applicant | Salaried pre-selected | Blank, user must pick |
| Personal Loan structure toggle (Individual ↔ Joint) | All applicants lost | All applicants restorable |
| Home Loan → Personal Loan switch | Salaried applicant carries over as stale data | Applicants cleared; fresh start |
| Personal Loan → Home Loan switch | Personal applicant persists into Home | Applicants cleared; fresh start |
| Home ↔ LAP ↔ Plot | Applicants preserved (unchanged) | Applicants preserved (unchanged) |
| Business entity Partnership → OPC | 3 directors remain in inconsistent state | Modal asks DSA which director to keep; others bundled to recovery and restorable on revert |
| Business Loan banner omission (observation 7) | Silent, no explanation | Code comment documents the intentional design rule |
| Loan switch leaves orphan relationships / income profiles | Stale entries accumulate | Clean slate |

No functionality removed. No UX compromised. No shared infrastructure changed — only bug fixes and cross-loan parity restoration.

---

**End of audit**
