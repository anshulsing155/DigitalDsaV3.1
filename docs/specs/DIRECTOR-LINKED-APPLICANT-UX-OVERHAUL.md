# Director-Linked Applicant UX Overhaul (v2)

> **Status**: PARTIALLY IMPLEMENTED (Sessions 43-51)
> **Prerequisite**: Phase 1 (data model + cross-company matching) — implemented in Session 43
> **Created**: 2026-03-26, Session 43
> **Revised**: 2026-03-26, Session 44 — added two-tier fields, orphan logic, company delete dialog, match confirmation, NRI bug fix
>
> ### Implementation Status (updated 2026-04-03)
> - **P1 (Double Display)**: ✅ FIXED — Applicant dedup at 3 layers: `replaceApplicants()`, `commitDirectorsToApplicants()`, display-level `sortedApplicantEntries`.
> - **P2 (Unguarded Deletion)**: ✅ FIXED — `CompanyDeleteDialog.svelte` with confirmation, orphan logic, recovery bin.
> - **P3 (Auto-Created Income Entries)**: ❌ PENDING — `directorAutoIncome.ts` exists but not fully wired. Phase 3 future work.
> - **P4 (No Visual Indicator)**: ✅ FIXED — Auto-added applicants show distinct badge/indicator.
> - **P5 (Multi-Company Income)**: ❌ PENDING — Needs P3 first. Multiple locked entries per company.
> - **P6 (Identity Field Drift)**: ✅ FIXED — Two-tier field model: identity on Individual record, role per-company in `directorFormsMap`. Cross-company sync on save.
> - **P7 (Company Delete Destroys Income)**: ✅ FIXED — Entries orphaned, not deleted. `orphaned: true`, yellow highlight, fully editable.
> - **P8 (Cross-Company Match Confirmation)**: ✅ FIXED — `RestoreApplicantModal` with native `<dialog>` + `showModal()`. `crossCompanyMatch.confirmed === false` respected.
> - **P9 (NRI Salaried Professional Bug)**: ✅ FIXED — Education gate no longer conflates qualification with practice.

---

## Problem Statements

### P1: Double Display in Summary Table
Director-linked Individuals appear TWICE in the applicant summary table — once as a main table row AND again as a sub-row under their Company. This confuses DSAs about whether the person is a separate co-applicant or just a director.

### P2: Unguarded Deletion
Director-derived Individual entries can be deleted via the main table's trash button, orphaning the director data in the Company's director forms. The system has no guard preventing deletion of entries that were auto-created through the director commit flow.

### P3: No Auto-Created Income Entries
Directors/partners should automatically get locked income entries (one per company they're linked to). Currently, after `commitDirectorsToApplicants()` creates Individual entries, no income profile or entries are set up. The DSA must manually navigate to the income tab, select the right profile type, and create entries — error-prone and redundant since the system already knows the company type and ownership %.

### P4: No "Auto-added" Visual Indicator
There is no visual signal that an Individual applicant was auto-created from a Company's director list. They look identical to manually-added co-applicants in the table.

### P5: Multi-Company Income Gap
A director serving on 3 company boards needs 3 separate locked income entries (one per company). The income system already supports multiple entries of the same profile type per applicant (via `entityName`), but nothing auto-creates them.

### P6: Identity Field Drift Across Companies (NEW)
When the same person is a director at Company A, partner at Company B, and OPC owner at Company C — their identity fields (age, gender, maritalStatus, isNRI, onEMI, onProperty) exist in 3 separate director forms in `directorFormsMap`. These can drift out of sync. Editing age from Company A's form doesn't reliably update Company B and C's forms. The current `handleDirectorSave()` sync (L411-426) only syncs on save, not on load/read.

### P7: Company Deletion Destroys Valid Income Data (NEW)
When a Company is deleted from the loan, the original spec proposed auto-deleting the director's income entries from that company (`removeAutoIncomeForCompany`). This is wrong — removing a company from the loan doesn't mean the director stopped earning from it. The income is real; only the company's loan participation changed.

### P8: No Explicit Cross-Company Match Confirmation (NEW)
When `findCrossCompanyDirectorMatch()` finds a name match across companies, it auto-locks identity fields. But two directors named "Raj Kumar" at different companies might be different people. There's no explicit "Is this the same person?" confirmation step.

### P9: NRI Salaried Professional Education Bug (NEW)
An NRI with professional education (e.g., CA working as salaried at Deloitte Dubai) gets blocked because `professional_practice` income profile has `showWhen: { and: [NRI=No, education=professional] }`. The education gate conflates "has a professional qualification" with "runs a private practice." Additionally, Professional Loan auto-forces `education='professional'` for ALL applicants (including co-applicants who may not be professionals).

---

## Architecture Decisions

### Two-Tier Field Model

Director/partner data is split into two tiers:

| Tier | Fields | Storage | Editable From |
|------|--------|---------|---------------|
| **Identity** (person-level) | fullName, age, gender, maritalStatus, isNRI, onEMI, onProperty, education | Individual applicant record (single copy in `formState.applicants[]`) | Any company's sub-row pencil OR Individual's own profile — all write to same record |
| **Role** (company-level) | ownershipPercent, designation, loanRole, directorType, DIN, dateOfAppointment | Per-company in `directorFormsMap[companyId][]` | Only that company's director form |

**Why**: Once a person is confirmed as the same across companies, there should be ONE source of truth for identity fields. The current approach of syncing on save is fragile — any missed sync creates drift.

**How it works**:
1. When `DirectorFormModal` opens for a confirmed cross-company director, identity fields are **read from** the Individual applicant record
2. Identity field inputs show a subtle indicator: "Shared across all companies"
3. Saving writes identity fields back to the Individual record; role fields to the per-company director form
4. All other companies' sub-rows instantly reflect changes (they read from the same record)

### Income Entry Lifecycle

```
Company Added → commitDirectors → Auto-create locked income entries
                                    ↓
                              [Normal Operation]
                              Entry locked: entityName, specifics (stake/type) read-only
                              Income amounts: editable by DSA
                                    ↓
Company Deleted → Entries ORPHANED (not deleted)
                   - autoCreated flipped to false
                   - orphaned: true, orphanedCompanyName set
                   - Entry becomes FULLY editable + deletable
                   - Yellow highlight: "Company removed from application"
```

### Company Deletion Flow

When DSA deletes a Company, show a confirmation dialog:

```
┌──────────────────────────────────────────────────────────┐
│  Delete "DGS Pvt Ltd"?                                   │
│                                                          │
│  This company has 2 directors:                           │
│                                                          │
│  Rani (also in: ABC LLP, Rani Consulting OPC)            │
│  → Will remain as applicant                              │
│  → Income from DGS will be kept but highlighted          │
│                                                          │
│  Trinsh (only in this company)                           │
│  ☑ Keep as standalone applicant                          │
│  → If removed, all income entries will be deleted        │
│                                                          │
│                    [Cancel]  [Delete Company]             │
└──────────────────────────────────────────────────────────┘
```

**Three categories of directors on deletion:**

| Director Status | Default Action | Income |
|---|---|---|
| **Multi-linked** (has other company links) | Stays automatically, `linkedCompanyIds` updated | Entries from deleted company **orphaned** (kept, highlighted, unlocked) |
| **Single-linked, DSA keeps** (checkbox checked) | Stays as standalone Individual, `linkedCompanyId` cleared | Entries **orphaned** (kept, highlighted, unlocked) |
| **Single-linked, DSA removes** (checkbox unchecked = default) | Person + all data removed | All entries deleted with applicant |

### Cross-Company Match Confirmation

When `findCrossCompanyDirectorMatch()` finds a name match:

```
┌──────────────────────────────────────────────────────────┐
│  "Rani" already exists as a director in DGS Pvt Ltd      │
│                                                          │
│  Is this the same person?                                │
│                                                          │
│  [Yes, same person]        [No, different person]        │
│                                                          │
│  If same: Identity fields will be shared across          │
│  companies. Stake and role set independently.            │
└──────────────────────────────────────────────────────────┘
```

- **Yes**: Link via `linkedCompanyIds`, identity fields locked to shared Individual record
- **No**: Create separate Individual (shown in table with disambiguation: "Rani (ABC LLP)")

---

## Current System Understanding

### How Directors Become Individual Applicants
1. DSA adds Company applicants and fills director forms via `DirectorFormModal`
2. Director data is stored in `directorFormsMap` (Map<companyId, DirectorForm[]>) in `applicantFormManager.svelte.ts`
3. On "Next" navigation, `validateStep()` calls `commitDirectorsToApplicants()` for each Company
4. `commitDirectorsToApplicants()` (in `directorFormUtils.ts` L495-583) converts director forms → Individual applicant entries in `formState.applicants`
5. Each converted Individual gets `linkedCompanyId` (primary) and `linkedCompanyIds` (all companies)

### Key Files and Their Roles

| File | Role | Key Lines |
|------|------|-----------|
| `src/lib/utils/directorFormUtils.ts` | Director→Individual conversion, cross-company matching, name matching | `commitDirectorsToApplicants()` (L495), `findCrossCompanyDirectorMatch()` (L422), `findNameMatchInApplicants()` (L301) |
| `src/lib/components/applicantFormManager.svelte.ts` | Orchestrator — manages director forms, table data, delete, validate | `sortedApplicantEntries` (L1622), `deleteApplicant()` (L1416), `validateStep()` (L1311), `directorRowsMap` (L358), `handleDirectorSave()` (L404) |
| `src/lib/components/ApplicantSummaryTable.svelte` | Renders applicant table + director sub-rows | `DirectorDisplayRow` (L9), sub-rows (L219-308), delete button (L194) |
| `src/lib/components/IncomePageNew.svelte` | Income tab — profile selection, entries, add/edit/delete | `lockedProfiles` (L151), `handleDeleteEntry()` (L506) |
| `src/lib/components/IncomeSourceEntries.svelte` | Renders income entry rows with edit/delete buttons | `disabled` prop (L32), delete button (L272) |
| `src/lib/components/IncomeSourceForm.svelte` | Income entry creation/editing form | No `readOnly` mode exists |
| `src/lib/types/incomeProfile.ts` | `IncomeSourceEntry` type | L108-127 |
| `src/lib/config/incomeProfiles/profileCards.ts` | Profile type definitions, auto-selection, showWhen gates | `professional_practice` showWhen (L80-81), `getAutoSelectedProfiles()` (L290) |
| `src/lib/utils/crossStepValidator.ts` | Contradiction detection between applicant fields and income profiles | `detectIncomeProfileContradictions()` (L129), education check (L190-204) |

### Company-Type to Income-Profile Mapping

| Company Type | Profile Type | Specifics Key |
|-------------|-------------|---------------|
| Private Limited | `director_company` | `shareholding` (0-100%) |
| OPC | `director_company` | `shareholding` (always 100%) |
| Public Limited | `director_company` | `shareholding` (0-100%) |
| Section 8 | `director_company` | `shareholding` (0-100%) |
| Partnership | `business_partnership` | `capitalContribution` (0-100%) |
| LLP | `business_partnership` | `capitalContribution` (0-100%) |
| Trust | — (no auto-income) | — |
| Society | — (no auto-income) | — |

---

## Solutions

### S1: Type Extensions

**File**: `src/lib/types/incomeProfile.ts` (L108)

Add fields to `IncomeSourceEntry`:
```typescript
/** true = system-generated from director data, non-deletable while company active */
autoCreated?: boolean;
/** Which company created this entry (for multi-company directors) */
sourceCompanyId?: string;
/** true = source company was deleted from application; entry becomes fully editable */
orphaned?: boolean;
/** Preserved company name for display when company record is gone */
orphanedCompanyName?: string;
```

### S2: Auto-Income Utility Functions

**File**: `src/lib/utils/directorAutoIncome.ts` (NEW)

**`COMPANY_TYPE_TO_PROFILE`** — Maps company type strings to `IncomeProfileType`:
- `'Private Limited' | 'One Person Company (OPC)' | 'Public Limited' | 'Section 8'` → `'director_company'`
- `'Partnership Firm' | 'LLP'` → `'business_partnership'`
- Trust/Society → not mapped (no auto-income)

**`createDirectorIncomeEntry(companyId, companyName, companyType, ownershipPercent)`** → `IncomeSourceEntry`
- Sets `autoCreated: true`, `sourceCompanyId: companyId`
- Sets `entityName` to company name
- Pre-fills `specifics` based on profile type:
  - `director_company`: `{ companyType, shareholding: ownershipPercent }`
  - `business_partnership`: `{ firmType: companyType, capitalContribution: ownershipPercent }`
- Leaves income amount fields empty (DSA fills manually)

**`createDirectorIncomeEntries(linkedCompanyIds, applicants, existingEntries)`** → `IncomeSourceEntry[]`
- For each company in `linkedCompanyIds`, creates an entry if one doesn't already exist (checks `sourceCompanyId` match)
- Looks up company name/type from `applicants` array
- Returns array of NEW entries only (caller appends to existing)

**`orphanIncomeForCompany(incomeEntries, companyId, companyName)`** → `IncomeSourceEntry[]`
- For entries where `autoCreated === true && sourceCompanyId === companyId`:
  - Sets `autoCreated = false`, `orphaned = true`, `orphanedCompanyName = companyName`
- Returns full array with orphaned entries (nothing removed)

**`syncAutoIncomeEntries(linkedCompanyIds, applicants, existingEntries)`** → `IncomeSourceEntry[]`
- Orphans auto-entries for companies no longer in `linkedCompanyIds`
- Adds new auto-entries for companies not yet represented
- Preserves all manual entries and orphaned entries untouched
- Returns the reconciled full array

### S3: Hide Linked Individuals from Main Table + Enrich Sub-Rows

**File**: `src/lib/components/applicantFormManager.svelte.ts` (L1622)

Filter `sortedApplicantEntries` to exclude applicants with `linkedCompanyId`:
```typescript
.filter(({ applicant }) => !applicant.linkedCompanyId)
```

They appear ONLY as sub-rows under their Company. But sub-rows must be enriched:

**File**: `src/lib/components/ApplicantSummaryTable.svelte`

Extend `DirectorDisplayRow` interface:
```typescript
export interface DirectorDisplayRow {
	// ... existing fields
	/** Income completion indicator */
	incomeStatus?: 'pending' | 'partial' | 'complete';
	/** Formatted income amount for display (e.g., "₹4.2L") */
	incomeDisplay?: string;
	/** Whether this director has a linked Individual applicant */
	hasLinkedApplicant?: boolean;
	/** The linked Individual's applicant index (for editing profile/income) */
	linkedApplicantIndex?: number;
}
```

Sub-row rendering changes:
- Show "Auto-added" chip (violet) after name+role
- Show income status indicator (pending/partial/complete)
- Pencil icon opens Individual's profile/income (not just director form)
- NO delete button on sub-rows (removal only via director management)
- Status column shows completion same as main rows

### S4: Company Delete Confirmation Dialog

**File**: `src/lib/components/CompanyDeleteDialog.svelte` (NEW)

Props:
```typescript
interface Props {
	companyName: string;
	companyId: string;
	directors: Array<{
		name: string;
		isMultiLinked: boolean;
		otherCompanies: string[];  // names of other linked companies
	}>;
	onConfirm: (keepSingleLinked: Map<string, boolean>) => void;
	onCancel: () => void;
}
```

Renders:
- Company name + warning
- For each multi-linked director: "Will remain as applicant" (no checkbox — automatic)
- For each single-linked director: checkbox "Keep as standalone applicant" (default: unchecked)
- Note about income entries being kept/highlighted
- Cancel + Delete Company buttons

**Wire into `deleteApplicant()`** (applicantFormManager.svelte.ts L1416):
- When deleting a Company applicant, instead of immediate deletion:
  1. Check if company has directors in `directorFormsMap`
  2. If yes → show `CompanyDeleteDialog` instead of direct delete
  3. Dialog's `onConfirm` callback receives keep/remove decisions per director
  4. Execute deletion with orphan logic based on decisions

### S5: Wire Auto-Income into `validateStep()`

**File**: `src/lib/components/applicantFormManager.svelte.ts` — in `validateStep()` (L1380)

After all companies have been committed via `commitDirectorsToApplicants()` and before `formState.replaceApplicants()`:

```typescript
// Auto-create/sync income entries for linked Individuals
latestApplicants = latestApplicants.map(a => {
    const ids = (a.linkedCompanyIds as string[]) ?? [];
    if (a.applicantType !== 'Individual' || ids.length === 0) return a;
    const existingEntries = (a.incomeEntries as IncomeSourceEntry[]) ?? [];
    const synced = syncAutoIncomeEntries(ids, latestApplicants, existingEntries);
    if (synced === existingEntries) return a;
    return { ...a, incomeEntries: synced };
});
```

In `deleteApplicant()` — when Company is deleted and director kept:
```typescript
// Orphan income entries (don't delete)
survivor.incomeEntries = orphanIncomeForCompany(
    survivor.incomeEntries, companyId, companyName
);
```

### S6: Income Page Locking + Orphan Highlighting

**File**: `src/lib/components/IncomePageNew.svelte`

**Extend `lockedProfiles`** (L151): For secured loans, lock profile types that have auto-created entries:
```typescript
if (isSecuredLoan) {
    const autoTypes = (currentApplicant?.incomeEntries ?? [])
        .filter((e: IncomeSourceEntry) => e.autoCreated)
        .map((e: IncomeSourceEntry) => e.profileType);
    return [...new Set(autoTypes)] as IncomeProfileType[];
}
```

**Guard `handleDeleteEntry()`** (L506): Skip deletion if entry has `autoCreated` (not orphaned):
```typescript
if (entry?.autoCreated && !entry?.orphaned) return;
```

**Banners per entry state**:
- `autoCreated && !orphaned`: "Auto-created from [Company Name] — fill in income amounts" (blue info)
- `orphaned`: "Company removed from application — you can edit or remove this entry" (yellow warning)

**File**: `src/lib/components/IncomeSourceEntries.svelte`

New prop: `getEntryFlags?: (entryId: string) => { autoCreated?: boolean; orphaned?: boolean; companyName?: string }`

Per-entry rendering:
- `autoCreated && !orphaned` → Lock icon + "Auto" chip, no delete button
- `orphaned` → Yellow dot + company name, delete button enabled
- Manual entries → normal delete button

**File**: `src/lib/components/IncomeSourceForm.svelte`

New prop: `autoCreatedFields?: string[]` (field names that are locked)

When entry is `autoCreated && !orphaned`:
- `entityName` field: disabled (locked to company name)
- Pre-filled specifics (`shareholding`/`capitalContribution`, `companyType`/`firmType`): disabled
- Income amount fields: **editable** (DSA fills these)
- Banner: "Auto-created from director data. Fill in income amounts."

When entry is `orphaned`:
- All fields editable (lock released)
- Banner: "Source company removed. Edit or delete as needed."

### S7: Cross-Company Match Confirmation in DirectorFormModal

**File**: `src/lib/components/DirectorFormModal.svelte`

Replace the current `isPrimaryElsewhere` info banner with an explicit confirmation step.

When `findCrossCompanyDirectorMatch()` returns a match in `handleNameBlur()`:

**If not yet confirmed**: Show confirmation dialog inline:
```
"Rani" already exists as a director in DGS Pvt Ltd.
Is this the same person?

[Yes, same person]  [No, different person]
```

- **Yes**: Set `confirmedSamePerson = true`, lock identity fields to shared record, set `linkedCompanyIds`
- **No**: Set `confirmedDifferentPerson = true`, clear match, allow independent identity fields

Store confirmation state on the director form:
```typescript
// Add to DirectorForm interface
crossCompanyMatch?: {
    confirmed: boolean;       // true = same person, false = different person
    matchedCompanyId: string;
    matchedDirectorId: string;
};
```

### S8: NRI Salaried Professional Bug Fix

**Three files, ~15 lines total:**

**File 1**: `src/lib/config/incomeProfiles/profileCards.ts` (L80-81)

Change `professional_practice` showWhen from:
```typescript
// CURRENT (broken)
showWhen: {
    and: [{ '==': ['isApplicantNRI', 'No'] }, { '==': ['education', 'professional'] }]
}
```
to:
```typescript
// FIXED — education is a qualification, not an employment gate
showWhen: {
    '==': ['isApplicantNRI', 'No']
}
```

**Why safe**: DSA manually selects income profiles. If someone with "Graduate" education runs an unregistered consulting practice, they should still be able to select `professional_practice`. The education gate was never a real business rule.

**File 2**: `src/lib/utils/crossStepValidator.ts` (L190-204)

Remove the education-specific error message for `professional_practice`. After removing the education gate from showWhen, the contradiction detector will no longer flag NRI + professional education as incompatible with salaried income.

**File 3**: `src/lib/components/AddApplicantProfessional.svelte` (~L915)
and `src/lib/components/ApplicantProfilePage.svelte` (~L516-517)

Change education auto-set to only apply to the PRIMARY (first) applicant:
```typescript
// Only auto-set for main applicant, not co-applicants
if (applicantIndex === 0 && a.applicantType === 'Individual' && a.education !== 'professional') {
    updateApplicant(i, 'education', 'professional');
}
```

**Why**: The primary applicant in a Professional Loan must be a professional. Co-applicants (spouse, parent) may have any education level and any employment type.

### S9: Tests

**File**: `src/lib/testing/__tests__/directorAutoIncome.test.ts` (NEW)

Test groups:

**A. Auto-Income Creation:**
1. `createDirectorIncomeEntry` — correct profile type per company type (Pvt Ltd → director_company, LLP → business_partnership)
2. `createDirectorIncomeEntries` — one entry per company, skips existing
3. Trust/Society → no auto-income created
4. Multi-company: 3 companies → 3 entries with correct `sourceCompanyId`

**B. Orphan Logic:**
5. `orphanIncomeForCompany` — sets orphaned flags, preserves manual entries
6. Orphaned entries become editable (autoCreated=false)
7. `orphanedCompanyName` preserved for display

**C. Sync:**
8. `syncAutoIncomeEntries` — adds new, orphans stale, preserves manual
9. Manual entries with same `sourceCompanyId` NOT orphaned (only auto-created ones)

**D. Two-Tier Fields:**
10. Identity fields write to Individual record (not director form)
11. Role fields write to per-company director form
12. Cross-company identity sync via shared Individual record

**E. NRI Bug:**
13. NRI + professional education + salaried_regular → no contradiction
14. NRI + professional education → professional_practice hidden (correct)
15. Non-NRI + any education → professional_practice visible
16. Professional Loan: primary auto-set education=professional, co-applicant NOT auto-set

---

## Implementation Order

1. **Phase 1**: NRI bug fix (profileCards.ts, crossStepValidator.ts, AddApplicantProfessional, ApplicantProfilePage) — smallest, unblocks users
2. **Phase 2**: Type extensions (`incomeProfile.ts` + `DirectorForm` interface) — foundation for everything else
3. **Phase 3**: Auto-income utilities (`directorAutoIncome.ts`) — pure functions, testable in isolation
4. **Phase 4**: Table changes — hide linked Individuals from main rows, enrich sub-rows
5. **Phase 5**: Company delete dialog (`CompanyDeleteDialog.svelte`) + wire into `deleteApplicant()`
6. **Phase 6**: Wire auto-income into `validateStep()` + orphan logic in delete
7. **Phase 7**: Income page locking + orphan highlighting (IncomePageNew, IncomeSourceEntries, IncomeSourceForm)
8. **Phase 8**: Cross-company match confirmation in DirectorFormModal
9. **Phase 9**: Tests
10. **Phase 10**: Type check + full test run

---

## Verification Checklist

### Core Functionality
- [ ] `pnpm run check` — 0 errors
- [ ] `pnpm run test:unit` — all tests pass
- [ ] Single company director: auto-income entry created, locked, deletable only via company
- [ ] Multi-company director (2+ companies): separate entries per company, all locked
- [ ] Same person across 3 companies: identity fields shared, role fields independent

### Table Display
- [ ] Linked Individuals hidden from main rows
- [ ] Visible only as enriched sub-rows under Company with "Auto-added" badge
- [ ] Sub-row shows income status + completion
- [ ] Sub-row pencil opens Individual profile/income
- [ ] No delete button on sub-rows

### Company Deletion
- [ ] Confirmation dialog shows director impact
- [ ] Multi-linked directors: auto-kept, income orphaned
- [ ] Single-linked directors: checkbox to keep/remove
- [ ] Orphaned income entries: yellow highlight, fully editable, deletable
- [ ] Removed directors: all data deleted

### Income Management
- [ ] Auto-created entries: entityName locked, specifics locked, amounts editable
- [ ] Orphaned entries: all fields unlocked, yellow highlight
- [ ] Delete blocked on active auto-created entries
- [ ] Delete allowed on orphaned entries
- [ ] DSA can add manual income profiles alongside auto-created ones

### Cross-Company
- [ ] Name match triggers explicit "Same person?" confirmation
- [ ] Confirmed same: identity fields shared via single Individual record
- [ ] Confirmed different: separate Individuals, disambiguated in table
- [ ] Identity edit from any company's sub-row updates all appearances

### NRI Bug
- [ ] NRI + professional education + salaried income → no error
- [ ] NRI + professional_practice → still blocked (correct business rule)
- [ ] Professional Loan primary: education auto-set to professional
- [ ] Professional Loan co-applicant: education NOT auto-set
- [ ] Standalone Individuals: completely unaffected by all changes
