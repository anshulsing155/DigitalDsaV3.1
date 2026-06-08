# Code Review — 2026-03-19

**Scope:** 22 commits from `4dfdf292` to `c554ba2d` (Sessions 32–33: property flow redesign, location system, BT registry, compliance/legal pages, business loan restructure)
**Reviewer:** Automated daily review

---

## Commits Reviewed

| Hash | Summary |
|------|---------|
| `4dfdf292` | Show Offers redirects to first incomplete section |
| `287cd6df` | Plot Loan duplicate question fix |
| `8cad951c` | navigateNext refactor, obligations page move, loan naming, applicant save-as-new bug |
| `2a28c3b6` | Missing CompanyFinancials.svelte placeholder |
| `789a0e35` | pnpm format + archive stale scripts |
| `aa7ee6a3` | Currency question type with auto-formatting |
| `f0918fa9` | Tenure-select and tenure-input question types |
| `beb48a4c` | Currency fields storing formatted string instead of number |
| `c8c32477` | Business loan loanRequirement — new types, remove urgency |
| `a31b6faa` | Unified LocationGroup compound component |
| `36f5b438` | Home loan property flow — resale logic, zone removal, labelDescription |
| `5d57b880` | Carpet area validation moved to client-side |
| `2e7fe8f0` | Server-side numeric validation coercion |
| `9f723049` | Phase 1 — zone removal, bug fixes, RERA dedup, AUTH compliance |
| `ca9d9ba5` | Property pages restructure (7→5 pages) |
| `29ad9506` | Phase 6-7 — wizard sections update + test fixes |
| `397d0d6e` | Null guard for compPage in schema composer tests |
| `b24cfdf1` | BT-gating showWhen for BT Registry questions |
| `e8688a50` | Authority Details page redesign |
| `c554ba2d` | Compliance/legal page — multi-select docs, title chain, NA merge, NBFC select |

Plus 3 docs-only commits (`49f72913`, `88fa8c95`, `19c363e9`) — no code issues.

---

## Findings

### HIGH

#### 1. `LocationGroup` ignores `locConfig.showArea` flag — area dropdown appears in all loan types

**File:** `src/lib/components/LocationGroup.svelte`, line ~294

The `showAreaDropdown` derived value does not check `locConfig.showArea`:

```svelte
const showAreaDropdown = $derived(
    cityValue && (areaEntries.length > 0 || loadingAreas)
);
```

Three loan types (business, professional, personal) set `showArea: false` in their location config. The server correctly passes this flag. The component ignores it — the area dropdown appears for all loan types once a city is selected.

Additionally, the restore `$effect` at line ~113 fires a wasteful `fetchAreas()` API call on back-navigation for these loan types.

**Fix:**
```svelte
const showAreaDropdown = $derived(
    locConfig.showArea && cityValue && (areaEntries.length > 0 || loadingAreas)
);
```
Gate the area restore effect with `if (!locConfig.showArea) return;`.

**Impact:** UX — unsolicited area field in 3 loan types. No data corruption.

---

#### 2. Pincode lookup race condition — stale result can overwrite user input

**File:** `src/lib/components/LocationGroup.svelte`, lines ~163–203

`handlePincodeInput` calls `doPincodeLookup(raw)` without cancellation. If the user types pincode A (lookup starts), then quickly changes to pincode B (second lookup starts), and lookup A resolves after lookup B, stale results overwrite correct state/city/area values.

**Fix:** Track most recent pincode and discard stale results:
```typescript
let lastLookupPincode = '';
async function doPincodeLookup(pincode: string) {
    lastLookupPincode = pincode;
    pincodeLoading = true;
    const result = await lookupPincode(pincode, locConfig.dataSource);
    pincodeLoading = false;
    if (lastLookupPincode !== pincode) return; // stale
    ...
}
```

**Impact:** Incorrect location data in edge case. Low frequency but high severity when it occurs.

---

### MEDIUM

#### 3. Location API does not use `apiOk()`/`apiError()` helpers

**File:** `src/routes/api/form/location/+server.ts`

Uses raw `json()` from SvelteKit instead of project-standard `apiOk()`/`apiError()` from `$lib/server/apiResponse`. This is the only new API endpoint that bypasses the centralized response helpers. Violates CLAUDE.md convention.

**Fix:** Replace `import { json } from '@sveltejs/kit'` with `apiOk`/`apiError`.

---

#### 4. Home Loan flow files reference stale page IDs after restructure

**Files:** `src/lib/config/homeLoan/flows/btOnly.ts`, `btTopup.ts`, `topupOnly.ts`, `newLoan.ts`

After page restructuring (7→5 pages), these flow files still reference deprecated page IDs:
- `btRegistry_homeLoan` → merged into `propertyLocation_homeLoan`
- `propertyCondition_homeLoan` → replaced by `complianceLegal_homeLoan`
- `legalVerification_homeLoan` → merged into `complianceLegal_homeLoan`

Not a runtime break (flow files are documentation/tooling), but misleads future developers.

**Fix:** Update all flow files with new page IDs.

---

#### 5. Stale income profiles on company sub-type switch

**File:** `src/lib/components/AddApplicantBusiness.svelte`, line ~261

The entity-type-change `$effect` clears `formState.applicants` and resets `isCompanySaved`, but does NOT call `incomeProfileStore.clearAll()` or `clearAllRelationships()`. When switching from e.g. `partnership` to `private_limited`, directors/partners are removed from `formState.applicants` but their income profiles remain in the store — a minor data leak.

**Fix:** Add `incomeProfileStore.clearAll()` and `clearAllRelationships()` to the entity-type `$effect`.

---

#### 6. `q3_bt_outstandingDemandAmount` validation fires incorrectly for zero

**File:** `src/lib/config/homeLoan/questionBank/btRegistry.ts`, line ~119

```ts
case: { '<=': [{ var: 'bt_outstandingDemandAmount' }, 12000] },
then: 'For amounts under ₹12,000, this is generally considered insignificant.'
```

Fires for `₹0`, which is misleading — zero demand isn't "insignificant," it means no demand exists. Should exclude zero or adjust messaging.

---

#### 7. `isNextEnabled` / `validateStep` question set mismatch (carried from 03-18 review)

**File:** `src/lib/components/AddApplicantBusiness.svelte`

`isNextEnabled` checks `INDIVIDUAL_QUESTIONS` (5 fields), `validateStep` checks `PROP_QUESTIONS` (6 fields, includes `businessTradeName`). Currently safe because `businessTradeName` is `required: false`, but will break silently if that changes.

**Fix:** Use the same question set in both paths.

---

### LOW

#### 8. `editingIndex` not set on back-navigation remount

**File:** `src/lib/components/AddApplicantBusiness.svelte`, line ~387

When user navigates back, `onMount` reloads the existing Individual applicant into `formApplicant` but doesn't set `editingIndex`. Could cause phantom duplicate-detection dialog if user changes the name.

---

#### 9. `composeHomeLoanSchema()` comment says "18 pages" — now 16

**File:** `src/lib/config/homeLoan/composer.ts`, line ~15

Doc comment outdated after page restructure (18→16 pages).

---

#### 10. `SHOW_WHEN_PROPERTY_LOCATION` has redundant third branch

**File:** `src/lib/config/homeLoan/pages.ts`, lines ~42–53

Branch C (`loanType in [BT values]`) is redundant — already covered by Branch B (`loanType != 'New Loan'`). Dead logic with misleading comment.

---

## Security Assessment

No security concerns found across all 22 commits:
- No new `{@html}` with user-controlled content
- No PII handling changes
- No auth/CSRF changes
- Pincode API validates with `/^\d{6}$/` server-side
- showWhen conditions compare VALUES not LABELS (verified)

---

## Summary

| # | Severity | Issue | Action |
|---|----------|-------|--------|
| 1 | **HIGH** | `showArea` flag ignored in LocationGroup | Fix `showAreaDropdown` derived + restore effect |
| 2 | **HIGH** | Pincode lookup race condition | Add stale-result guard |
| 3 | MEDIUM | Location API uses raw `json()` | Switch to `apiOk()`/`apiError()` |
| 4 | MEDIUM | Stale page IDs in flow files | Update flow definitions |
| 5 | MEDIUM | Stale income profiles on entity switch | Add clearAll to $effect |
| 6 | MEDIUM | BT demand validation fires for zero | Exclude zero or adjust message |
| 7 | MEDIUM | isNextEnabled/validateStep question mismatch | Unify question sets |
| 8 | LOW | editingIndex not set on remount | Set editingIndex in onMount |
| 9 | LOW | Stale page count in composer comment | Update to 16 |
| 10 | LOW | Redundant showWhen branch | Remove dead branch |

**Priority:** Fix items 1 and 2 first — they affect user-facing behavior in production forms.
