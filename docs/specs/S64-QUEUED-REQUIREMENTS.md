# Session 64 — Queued Requirements

**Status**: Requirements captured — to be implemented in future sessions
**Date**: 2026-04-08

---

## Requirement 1: Case Assessment Data → Offer Page Filtering

**Source**: Case Assessment page (Getting Started → Case Assessment)

### Context

The Case Assessment page captures three data points when a case is **not** a fresh assessment:

1. **Case Status** — Fresh Assessment / Rejected Recently / Sanctioned, Not Disbursed / Don't Know
2. **Lenders Involved** — Multi-select from 76 available banks
3. **Rejection Reason(s)** — Multi-select: Insufficient Income/High FOIR, Low CIBIL/Credit Issues, Property/Collateral Issues, Incomplete Documentation, Profile Mismatch, Other/Not Disclosed

These selections currently exist in form answers but are **not yet consumed** on the offer/assessment results page.

### What to Build

#### 1. Lender Filtering / Flagging
- **Highlight previously involved lenders** — visually flag that lender's offer card (e.g., "Previously rejected by this lender" warning badge)
- **Sort order** — Previously rejected lenders deprioritized or shown in a separate section
- **Don't auto-exclude** — DSA may still want to re-apply (different branch, different RM, changed circumstances), so show but warn

#### 2. Rejection-Reason-Based Suggestions
- **Insufficient Income / High FOIR** → Suggest lenders with higher FOIR limits, highlight income enhancement tips
- **Low CIBIL / Credit Issues** → Suggest NBFC lenders with lower CIBIL floor, show credit improvement notes
- **Property / Collateral Issues** → Flag property-related eligibility requirements prominently
- **Incomplete Documentation** → Show document checklist emphasis
- **Profile Mismatch** → Suggest lenders with more flexible profile criteria

#### 3. Smart Warnings
- "Rejected Recently" + re-applying to **same lender** → prominent warning: "This lender previously rejected this case — consider addressing: [rejection reasons]"
- "Sanctioned, Not Disbursed" → different messaging: "Previously sanctioned by [lender] — check if sanction is still valid"

### Data Flow

```
Case Assessment (form answers)
  ├── caseStatus (bindsTo key)
  ├── involvedLenders[] (bindsTo key — array of lender IDs/names)
  └── rejectionReasons[] (bindsTo key)
        ↓
  Offer/Assessment Results Page
  ├── Read from case answers
  ├── Cross-reference with generated offers
  └── Apply visual flags + sorting + suggestions
```

### Open Questions
1. Should previously-rejected lenders be sortable/filterable by the DSA, or always shown with a badge?
2. Should "Don't Know" status trigger any special behavior on the offer page?
3. Should rejection reasons influence the rule engine's discomfort analysis or stay purely presentational?

---

## Requirement 2: Location Page Flow Fix — Property Not Identified

**Source**: Property Location & Status page (Getting Started → Location)

### Current Problem

When **propertyIdentified = No**, the page still asks area type and full property location (pincode, state, city) as if the property exists. This is wrong because:

- The user is coming for **sanction/pre-approval only** — sanctions depend on conditions, not a specific property
- Asking for exact property location when no property is decided is misleading
- The DSA may not know the intended city yet

### Current Code State

- `q1_propertyAreaType` — Always shown when property not identified. Dynamic question text changes to "What is the planning status of this property's area and location?" but options remain the same 4 area types
- `q_propertyLocation` — Shows when `propertyIdentified == No` AND `propertyAreaType != ''` — full pincode/state/city/area compound question
- "Not sure" option for area type only shows when `propertyIdentified == Yes` (correct — it's about a real property)
- Purchase type questions correctly hidden when `propertyIdentified == No`

### What to Change

#### A. Area Type Question — Reframe for Pre-Approval Context

**Current (wrong)**: "What is the planning status of this property's area and location?"
**New**: "What type of area is the customer looking to buy in?"

This is a preference question, not a fact about an existing property. The DSA is capturing the customer's intent to help narrow down lender options.

**Options when `propertyIdentified = No`:**

| Option | Value | Helper Text |
|---|---|---|
| Planned / Development Authority Area | `PLANNED_AUTHORITY` | Approved layout, township, large housing society |
| Converted Land / Approved Residential Use | `CONVERTED_RESIDENTIAL` | Earlier agricultural or village land, now residential |
| Old Municipal Area / Traditional Mohalla | `OLD_MUNICIPAL` | Inside city limits, older houses, narrow streets |
| Local Colony / Village / Panchayat Area | `LOCAL_COLONY` | Non-planned or organic development |
| **Not Decided Yet** | `NOT_DECIDED` | Customer hasn't decided on a specific type of area |

- "Not sure" (existing, `propertyIdentified = Yes` only) = property exists but DSA can't classify the area
- "Not Decided Yet" (new, `propertyIdentified = No` only) = no property chosen yet, area type unknown
- When "Not Decided Yet" is selected → skip all further property-specific questions, move to location intent

**DSA Guidance for area type when `propertyIdentified = No`:**
> "The customer is coming for sanction/pre-approval — sanctions are conditional. Knowing the intended area type helps narrow down which lenders are likely to approve. If the area isn't decided yet, select 'Not Decided Yet' and we'll show all eligible lenders."

#### B. Location — "Has the intended city been decided?"

**New question** (only when `propertyIdentified = No`):

> **"Has the customer decided on a city to buy in?"**

| Option | Value | Helper Text |
|---|---|---|
| Yes, city is decided | `Yes` | We know which city/town the customer is looking in |
| No, still exploring | `No` | City hasn't been finalized yet |

**If Yes** → Show simplified location picker:
- State + City only (no pincode, no area — there's no specific property to pinpoint)
- Question text: "Which city is the customer looking to buy in?"
- Helper: "Knowing the intended city helps identify which lenders operate there and which branches can process the application"

**If No** → Skip location entirely
- DSA guidance: "No problem — we'll show all lenders eligible based on the applicant's profile. You can update the intended location later once the customer narrows it down."

#### C. What NOT to Ask When Property = No

These questions should remain hidden (already correctly hidden via showWhen):
- Purchase type (direct from builder / resale / etc.) — no property = no purchase type
- Builder name / project name — no property identified
- Property usage intent (self-use / investment) — can be asked but is speculative
- Pincode — no specific property location
- Area within city — too granular for pre-approval

#### D. Page Title & Context Panel Updates

**Page title when `propertyIdentified = No`**: "Intended Location" (instead of "Property Location & Status")

**Context panel key points when `propertyIdentified = No`:**
- "Customer is coming for pre-approval/sanction — property not yet finalized"
- "Sanction is conditional — lender will re-evaluate once property is identified"
- "Knowing intended city and area type helps narrow down eligible lenders and branch assignment"
- "You can update the exact property details later when the customer finds a property"

### Data Flow Impact

```
propertyIdentified = No
  ├── propertyAreaType → "NOT_DECIDED" (new) or one of 4 existing types
  ├── intendedCityDecided → Yes / No (new question)
  │     ├── Yes → show state + city picker (binds to propertyStateName / propertyCityName)
  │     └── No → skip location entirely
  └── No pincode / area needed (no specific property to locate)
```

### Why This Matters for Offers
- **Area = "Not Decided Yet"** → offers generated on applicant profile only; property-specific filtering (negative areas, CRZ zones, etc.) is skipped; note shown: "Property location pending — lender list may change once location is confirmed"
- **City decided** → lender availability checked for that city; branch assignment possible
- **City not decided** → show all profile-eligible lenders regardless of geography; note: "Lender availability may vary by location — update once the customer decides"

### Implementation Notes
- File to modify: `src/lib/config/homeLoan/questionBank/propertyLocation.ts`
- New question (`intendedCityDecided`) goes after `q1_propertyAreaType`, with `showWhen: { '==': [{ var: 'propertyIdentified' }, 'No'] }`
- New option "Not Decided Yet" (`NOT_DECIDED`) added to `q1_propertyAreaType.options` with `showWhen: { '==': [{ var: 'propertyIdentified' }, 'No'] }`
- `q_propertyLocation` showWhen updated: when `propertyIdentified = No`, only show if `intendedCityDecided = Yes`
- Potentially suppress pincode/area sub-fields from compound location when `propertyIdentified = No` (state + city sufficient)
- Check if LAP and Plot loan types have similar location flows that need the same treatment
- Dynamic `dsaGuidance` in wizardSections config for the location page based on `propertyIdentified`

---

## Requirement 3: Applicant Profile Restoration — Overhaul

**Source**: Applicant Details page → "Previous Record Found" modal
**Priority**: High — reported multiple times by users

### Current System Summary

The restoration system has two phases:
- **Phase 1 (Prefill)**: Basic identity fields (name, gender, age, marital status) via `prefillApplicantRestore()`
- **Phase 2 (Commit)**: Financial data (income profiles, obligations, CIBIL) via `commitApplicantRestore()`

Recovery bin is stored in localStorage (90 days TTL, max 10 variants per identity). Name matching uses bidirectional prefix matching with 3-char minimum in `findRecoverableByName()`.

### Problem Areas (Reported Repeatedly)

#### P1. Name Matching Is Too Loose
**Current**: Bidirectional prefix match — typing "Pra" matches "Pramod", "Pradeep", "Prashant" but also "nidhi", "ravi", "fasf" appear in results (as seen in screenshot — 17 matching records for "Pra" includes completely unrelated names)
**Root cause**: `findRecoverableByName()` matches on `entryName.startsWith(currentName) || currentName.startsWith(entryName)` — the second condition is the problem. A 3-letter typed name "pra" doesn't cause "nidhi" to match, so the issue is likely that ALL recovery bin entries are shown when detection triggers, not just prefix matches.
**Expected**: Only show profiles whose name **starts with** the typed characters. Typing "Pra" should show Pramod, Pradeep, Prashant — NOT nidhi, ravi, fasf.

#### P2. "Check for Previous Records" Link Not Reliably Shown After Cancel
**Current**: Link appears when `hasDeniedUUIDs()` is true, but conditions include `!isEditing` and name must have 2+ chars. Sometimes the link doesn't appear.
**Expected**: After user clicks "Not this person", the "Check for previous records" link MUST appear immediately and unconditionally (as long as name has 2+ chars). No edge cases where it disappears.

#### P3. Restoration Is Incomplete
**Current**: Phase 1 only fills basic identity. Phase 2 wires income/obligations from `_structured` JSON. But gaps exist.
**Expected**: Full restoration must populate ALL of the following (see detailed breakdown below).

#### P4. Company-Individual Cross-Linking Not Dynamic
**Current**: `relinkDirectorsAndCompanies()` runs once during restore. If a company is added LATER as a co-applicant, existing individuals who are directors/partners of that company are not auto-linked.
**Expected**: Dynamic linking — whenever a company is added/removed as co-applicant, scan all individuals for matching director/partner relationships.

#### P5. Director/Partner Income Profile Lock
**Current**: When restoring an individual who was previously a director/partner, their income profile carries over with the company link intact.
**Expected**: If an individual is being suggested FROM a director/partner context, the company link should be **broken** on restore, letting the user freely change income profiles. The previous director income data is still available but not locked.

---

### Detailed Requirements

#### 3.1 Strict Name Matching

**Rule**: Suggestions MUST be strictly filtered by typed initials/prefix. This applies to ALL applicant types:

| Applicant Type | Match Field | Match Rule |
|---|---|---|
| Individual | `fullName` | Typed text must be a prefix of `fullName` (case-insensitive) |
| Company | `companyName` | Typed text must be a prefix of `companyName` (case-insensitive) |
| Director/Partner | `directorName` | Typed text must be a prefix of `directorName` (case-insensitive) |

**Implementation**:
```
// CORRECT — one-directional prefix only
currentName.length >= 2 && entryName.startsWith(currentName)

// WRONG — bidirectional allows short stored names to match anything
currentName.startsWith(entryName)  // ← REMOVE THIS
```

**Edge cases**:
- If user types "Pr" → show all names starting with "Pr" (Pramod, Pradeep, Priya, etc.)
- If recovery has a stored name "Ra" (2 chars) → do NOT match when user types "Rajesh" (the old bidirectional logic would match this)
- Minimum typed chars: 2 for triggering, but matching is always prefix-based
- For companies: "Inf" → "Infosys Technologies", "Infinity Corp" — NOT "TCS", "Wipro"

#### 3.2 "Check for Previous Records" — Guaranteed Visibility

**After cancel** (`handleRestoreModalCancel`):
1. Deny all match UUIDs (current behavior — keep)
2. Immediately show "Check for previous records" link in the form card
3. Link MUST be visible whenever:
   - Name field has 2+ characters
   - User previously denied matches for this detection key
4. Link MUST NOT disappear due to:
   - Form editing state changes
   - Scrolling or re-rendering
   - Other applicants being added/removed
5. Clicking the link clears denied UUIDs and re-triggers detection

**Visual treatment**: The link should be noticeable — not a subtle text link that can be missed. Consider a small banner or highlighted text below the name field: "Previous records found — click to review"

#### 3.3 Complete Restoration — All Pages Must Populate

When user confirms restoration, ALL applicable data must be restored across all form pages:

##### Page 1: Basic Profile (Applicants page)
| Field | Restore From | Required |
|---|---|---|
| Full Name | `fullName` / `applicantName` | Yes |
| Gender | `gender` | Yes |
| Age / DOB | `age` / `dateOfBirth` | Yes |
| Marital Status | `maritalStatus` | Yes |
| Applicant Category | `applicantCategory` (Person/HUF) | Yes |
| Employment Type | `employmentType` | If available |
| Education | `education` | If available |
| Relationship to primary | `relationship` | If co-applicant |
| Name on Property | `nameOnProperty` | If available |
| Will Pay EMI | `willPayEMI` | If available |
| Contact (phone/email) | `phone` / `email` | If available (no PII concern for DSA's own data) |
| Residence location | `residenceState` / `residenceCity` | If available |

##### Page 2: Profile & Financial — Income Profiles
| Data | Restore From | Notes |
|---|---|---|
| Selected income profiles | `_structured.incomeProfiles.selectedProfiles` | Full list of active profiles |
| All income entries per profile | `_structured.incomeEntries.active[profileType]` | Each entry with amounts, entity names, periods |
| Deleted/deselected entries | `_structured.incomeEntries.deleted[profileType]` | Available for re-activation |
| Salary income (salaried) | Per-entry: `basicSalary`, `hra`, `specialAllowance`, `otherAllowance`, `annualBonus` etc. | |
| Business income (self-employed) | Per-entry: `grossReceipts`, `netProfit`, `profitPeriod`, `itrFiled` etc. | |
| Professional income | Per-entry: `grossReceipts`, `professionalCategory` etc. | |
| Rental income | Per-entry: `monthlyRent`, `propertyLocation`, `leaseAgreement` etc. | |
| Agriculture income | Per-entry: `landArea`, `annualIncome` etc. | |
| All 12 income types | Restore whatever was saved | Never simplify or skip types |

##### Page 3: Profile & Financial — Obligations
| Data | Restore From | Notes |
|---|---|---|
| All obligation entries | `_structured.obligations.active` | Full array |
| Per obligation: bank, type, EMI, outstanding, tenure | Each field from structured data | |
| BT obligations (if applicable) | Flagged entries | Marked for balance transfer |

##### Page 4: Profile & Financial — Credit Score
| Data | Restore From | Notes |
|---|---|---|
| CIBIL score | `_structured.creditScore.cibil` | |
| Other bureau scores (if any) | `_structured.creditScore.*` | |

##### Company-Specific Restoration
| Data | Restore From | Notes |
|---|---|---|
| Company name | `companyName` | |
| Company type | `companyType` (Pvt Ltd / LLP / Partnership / OPC etc.) | |
| Business type | `businessType` | |
| Business vintage | `businessVintage` | |
| Company financials | `_structured` company financials | Revenue, profit, ITR data |
| Director/partner list | `directors[]` array | Names + ownership % |
| Director auto-income entries | Per-director income from `directorAutoIncome.ts` | |

#### 3.4 Post-Restoration Updates — Latest Values Persist

**Rule**: After restoration, if the user modifies ANY data (income profiles, amounts, obligations, etc.), the **latest values** are what get stored. The restored data is a starting point, not immutable.

**Implementation**:
- On restore: set `__restoredFrom` tag with UUID + timestamp (current behavior)
- On any field edit after restore: standard form reactivity handles this naturally
- Recovery bin entry: When applicant is deleted again, the NEW data (post-edit) is what goes into recovery — not the original restored data
- `__restoredFrom` tag helps identify that this applicant was restored (for audit trail), but does NOT prevent edits

**Specific scenarios**:
- User restores "Pramod" with Salaried income of 5L → changes to 6L → if deleted and re-added, recovery shows 6L
- User restores with 3 income profiles → removes one → recovery saves only 2
- User restores with CIBIL 720 → updates to 750 → recovery saves 750

#### 3.5 Individual-Company Cross-Linking — Auto-Derive from Income Data

**Core principle**: The DSA already enters company details (name, type, financials) inside the individual's income profile. Use that data to **automatically create** the company co-applicant — no "go back", no duplicate data entry.

**Current gap**: Linking only happens during restore via `relinkDirectorsAndCompanies()`. If a company is added later, no link is established. More importantly, the system never auto-creates a company co-applicant from income data.

**Required behavior**:

##### A. Auto-Create Company from Income Profile Data

When an individual's income entry contains company details (via "Director in Company", "Partner in Firm", or "Business Owner" profiles), the system should:

1. Collect company data already entered in the income form: company name, company type, business type, vintage, revenue, profit, ITR details
2. After the DSA saves/completes the income entry, show a confirmation:
   > "[ABC Pvt Ltd] needs to be a co-applicant for lender assessment. Add automatically?"
   > **[Yes, Add]** / **[Not Now]**
3. On "Yes, Add":
   - Auto-create a company applicant entry in the applicant list (pre-filled from income data)
   - Establish `linkedCompanyId` link between individual and company
   - Company appears in the sidebar under Applicants — DSA can review/complete later
   - No navigation needed — stays on current page
4. On "Not Now":
   - Store `__pendingCompanyLink` with company details
   - Show persistent banner: "Company financials pending — [ABC Pvt Ltd] not added yet. [Add now]"
   - Block offer generation with clear message: "Cannot assess without company financials"

##### B. OPC vs Pvt Ltd / Public Ltd — Different Treatment

| Company Type | What Happens | Why |
|---|---|---|
| **OPC (One Person Company)** | Do NOT create separate company co-applicant. Individual's income tab captures all company financials directly. | Director IS the company — one person, one entity. Separate co-applicant would be redundant. |
| **Pvt Ltd / Public Ltd** | Auto-create company co-applicant from income data | Company is a separate legal entity with independent financials. Multiple directors possible. |
| **Partnership / LLP** | Auto-create company co-applicant from income data | Firm has its own books (ITR-5, P&L). Multiple partners possible. |
| **Sole Proprietorship** | Do NOT create separate company co-applicant. Business income = individual income. | No separate legal entity. ITR-4 covers everything. |

**Implementation**: Split the current "Director in Company" income profile card into sub-types, or ask a follow-up question after selection:
- "What type of company?" → OPC / Pvt Ltd / Public Ltd / Section 8
- Based on answer, either capture company financials inline (OPC) or trigger co-applicant creation (Pvt Ltd/Public Ltd)

##### C. Dedup — Multiple Directors, Same Company

If two individuals both list "Director in ABC Pvt Ltd":
1. First director's income entry → auto-creates company co-applicant "ABC Pvt Ltd"
2. Second director's income entry → detects "ABC Pvt Ltd" already exists in applicant list
3. Auto-links second director to same company (no duplicate company created)
4. Company's `directors[]` array updated with both names

##### D. Dynamic Monitoring (Reactive)

Use a `$effect` that watches the applicant list and income entries:

- **Individual income saved with company name** → scan applicant list for matching company → link or prompt to create
- **Company added manually** → scan all individuals for matching company name in income entries → auto-link
- **Company removed** → break links to individuals, but keep their income data intact (they still earn from that company)
- **Individual removed** → if they were the only director, show warning on company card: "No linked directors — company may need at least one individual linked"

This MUST work for:
- Company created after individual (via auto-derive from income)
- Individual added after company (manual add → auto-link)
- Multiple individuals linked to same company
- Individual linked to multiple companies

#### 3.6 Director/Partner Income Profile — Break Link on Restore

**Scenario**: Recovery bin has "Pramod" who was previously a director of "ABC Pvt Ltd" with director salary income. When restoring Pramod as an individual applicant (not as part of company flow), the director link should NOT be forced.

**Required behavior**:
1. Show the recovery match with context badge: "Previously: Director of ABC Pvt Ltd"
2. On restore: populate basic profile + income data
3. BUT: income profiles are **unlocked** — DSA can freely change, add, or remove profiles
4. The director-linked income is restored as regular income entries (not locked to company)
5. If DSA wants to re-establish company link → they can do so manually or when the company is added as co-applicant (per 3.5.B)
6. Income profile selector is fully editable — no "locked by company" restriction after restore

**Why**: The person may be applying in a different capacity this time (e.g., was director last time, now applying as salaried individual for a personal loan).

#### 3.7 Loan Type Context — Secured vs Unsecured Differences

Restoration must respect the current loan type's validation rules:

| Aspect | Secured (Home/LAP/Plot) | Unsecured (Personal/Business/Professional) |
|---|---|---|
| **Name on Property** | Required for primary applicant | Not applicable — hide/skip |
| **Will Pay EMI** | Required — affects classification | Required — affects classification |
| **Property ownership questions** | Relevant | Not applicable |
| **Employment validation** | Standard (all types) | Professional Loan: locked to professional category |
| **FOIR limits** | Typically 50-65% | Typically 40-50% |
| **Minimum applicants** | 1 (but property must have an owner) | 1 |
| **Guarantor handling** | Financial guarantors need property backing | Financial guarantors need income proof |
| **Obligation relevance** | All types | All types |
| **CIBIL floor** | Varies by lender (650-750) | Typically higher (700-750) |

**On restore across loan types**:
- If restoring a profile from a secured loan into an unsecured loan context (or vice versa):
  - Basic identity: always restore
  - Income profiles: restore, but re-validate against current loan type rules
  - Obligations: always restore (universal)
  - Property-specific fields: skip if not applicable to current loan type
  - Employment type: restore, but check if current loan type locks it (e.g., Professional Loan)
  - Show warning if significant mismatch: "This profile was previously used for a Home Loan — some fields may not apply to this Personal Loan"

#### 3.8 Role-Based Restoration Context

| Role | Restore Behavior |
|---|---|
| **Co-Applicant (Financial)** | Full restore: income + obligations + CIBIL mandatory |
| **Co-Applicant (Non-Financial)** | Basic profile only. Income/obligations optional — don't force restore of financial data |
| **Guarantor (Financial)** | Full restore: income + CIBIL required. CIBIL floor applies per lender |
| **Guarantor (Non-Financial)** | Basic profile only. Minimal financial data needed |

**On restore**: If the classification role differs from the original:
- Show info: "Previously added as Co-Applicant (Financial). Currently being added as Guarantor."
- Restore all data regardless — let the classification system determine what's needed
- Don't block restore based on role mismatch

---

### Additional Enhancements (System-Identified)

#### 3.9 Recovery Bin Summary in Modal — Richer Display

Current modal shows name, age, gender, marital status, and sometimes employment type. Enhance with:

| Field | Display Format | Why |
|---|---|---|
| Income sources | "Salaried (2) + Self-Employed (1)" | Helps DSA identify the right match |
| Total monthly income | "~4.2L/month" | Quick identification |
| Obligation count | "3 obligations, EMI: 45K" | Context for the right person |
| CIBIL score | "CIBIL: 720" | Already partially shown |
| Last case type | "Home Loan — Bhilai" | Disambiguates across loan types |
| Last updated | "Saved 3 days ago" | Recency helps choose the right variant |

#### 3.10 Duplicate Detection on Restore

Before committing restoration, check:
1. Is this person already in the current applicant list? (by match signature)
2. If yes → show "Already added" with option to "Edit Existing" instead of duplicating
3. This already exists partially via live match detection, but should be enforced at commit time too

#### 3.11 Restoration Validation Summary

After Phase 2 commit, show a brief validation summary:
- "Restored: Basic profile, 3 income profiles, 2 obligations, CIBIL 720"
- "Skipped: Name on Property (not applicable for Personal Loan)"
- "Warning: Employment type was 'Salaried' in previous record but current loan requires 'Professional' — please verify"

This gives the DSA confidence that restoration worked and flags anything that needs attention.

#### 3.12 Recovery Bin Cleanup & Integrity

- **Dedup on save**: Before adding to recovery bin, check if an entry with the same match signature already exists. If yes, update it instead of adding a new variant (prevent bloat)
- **Stale data pruning**: Entries older than 90 days are already pruned (keep). Consider reducing to 60 days for bin hygiene.
- **Max entries per DSA**: Cap total recovery bin at ~100 entries (across all loan types) to prevent localStorage bloat on low-end Android devices via Capacitor

---

### Implementation Files

| File | Changes |
|---|---|
| `src/lib/utils/applicantRecoveryDetector.ts` | Fix `findRecoverableByName()` — strict prefix only |
| `src/lib/components/RestoreApplicantModal.svelte` | Richer summary display, role context |
| `src/lib/components/ApplicantFormCard.svelte` | Guaranteed "Check for previous records" link |
| `src/lib/utils/applicantRestoreHandler.ts` | Complete restoration across all pages, cross-loan validation |
| `src/lib/utils/directorRestoreHandler.ts` | Break link on standalone restore |
| `src/lib/state/applicant.svelte.ts` | Dynamic company-individual linking reactive effect |
| `src/lib/stores/applicantFormManager.svelte.ts` | Reactive watcher for company add/remove → individual scan |
| `src/lib/components/form-wizard/FormShell.svelte` | Post-restore validation summary |

#### 3.13 Director/Partner Modal — Recovery Detection Missing (BUG)

**Current**: Recovery detection (`findRecoverableByName()`) only runs in `ApplicantFormCard.svelte` — the main applicant name field. The `DirectorFormModal.svelte` is a separate component with its own name input that has NO recovery detection wired up.

**Observed**: User types "prasha" in Partner name field inside DirectorFormModal → no "Previous Record Found" modal appears, even though matching records exist in the recovery bin.

**Required**: Recovery detection must work for ALL name entry points:

| Entry Point | Component | Currently Has Detection? | Fix |
|---|---|---|---|
| Main applicant (Individual) | `ApplicantFormCard.svelte` | Yes | Already working |
| Main applicant (Company) | `ApplicantFormCard.svelte` | Yes | Already working |
| Director in Company modal | `DirectorFormModal.svelte` | **No** | Wire up `findRecoverableByName()` on name input |
| Partner in Firm modal | `DirectorFormModal.svelte` | **No** | Same — shares component |
| Trustee in Trust modal | `DirectorFormModal.svelte` | **No** | Same |

**Implementation**:
1. Add debounced name detection to `DirectorFormModal.svelte` name field (same pattern as `ApplicantFormCard`)
2. On match found → show `RestoreApplicantModal` (or a simpler inline suggestion)
3. On restore → pre-fill the director/partner form fields (name, gender, age, marital status, NRI status)
4. Recovery scope filter: match by `Individual` type only (directors/partners are always individuals)
5. After restore into director modal → data flows into the company's `directors[]` array on save

**Edge case**: If the partner was previously a standalone individual applicant in a different loan, their full profile (income, obligations) is in the recovery bin. When restored into a director modal, only the basic identity fields are relevant. Income/obligations will be handled separately when/if this person is also added as an individual co-applicant.

### Testing Requirements

- Strict prefix matching: typed "Pra" shows only Pramod/Pradeep/Prashant, NOT nidhi/ravi
- Cancel → "Check for previous records" appears immediately
- Full restore populates: basic profile + all income profiles + obligations + CIBIL
- Post-restore edit: changed values persist in recovery on next delete
- Director income entry with Pvt Ltd → company co-applicant auto-created
- OPC director income → NO separate company co-applicant created
- Two directors, same company → only one company entry, both linked
- Director restore as standalone → income profiles unlocked
- Cross-loan-type restore: Home Loan profile into Personal Loan → correct field skipping
- Role-based: Financial vs Non-Financial co-applicant restore differences
- Mobile (Capacitor): localStorage size stays under control with recovery bin cap
- **Director/Partner modal**: typing name triggers recovery detection, matching records suggested

---

## Requirement 4: Company-Individual Income Intelligence — Per-Entry Qualifying + Auto-Derive

**Source**: Income Profiles page (Profile & Financial → Employment & Income)
**Priority**: High — core flow improvement, eliminates "go back to add company" problem
**Key insight**: One person can be director/partner in MULTIPLE companies of different types. Qualifying questions must be asked **per income entry**, not once globally.

---

### The Real-World Complexity

A single individual can simultaneously be:

| Entry # | Role | Company | Country | Equity? | Co-App Needed? |
|---|---|---|---|---|---|
| 1 | Promoter Director | ABC Pvt Ltd | India | Yes, 45% | **Yes** |
| 2 | Professional Director | XYZ Ltd (Listed) | India | No | **No** — just salary |
| 3 | Director | GHI Inc | Dubai/USA | No | **No** — foreign entity |
| 4 | Partner | DEF LLP | India | Yes, 30% | **Yes** |
| 5 | Sleeping Partner | MNO & Co | India | Yes, 10% | **No** — minor passive income |

Each income entry is independent. The system must evaluate EACH entry separately and make the right call.

---

### Per-Entry Qualifying Questions (Inside Income Details Form)

When an individual adds an income entry under "Director in Company" or "Partner in Firm", the income details form for THAT entry includes these qualifying questions before the financial fields:

#### For "Director in Company" — Each Entry

```
Entry: Director Income — [Entry #1]

Q1: "Is this company registered in India?"
  ○ Yes, registered in India
  ○ No, it's a foreign company
        → If foreign:
          Q1a: "Which country?"  [dropdown / text]
          Then capture: Company name, annual director salary (INR),
                        appointment basis
          Label entry as: "Foreign Director Salary"
          DSA guidance: "Foreign company income is verified via ITR
                        and bank credit statements. No company
                        co-applicant needed."
          → DONE for this entry (no further qualifying questions)

  → If Indian company, continue:

Q2: "What type of company?"
  ○ OPC (One Person Company)
        → Capture financials inline (revenue, profit, ITR)
        → Label: "OPC Director (self = company)"
        → No co-applicant needed
        → DONE

  ○ Private Limited
  ○ Public Limited (Unlisted)
  ○ Section 8 (Non-Profit)
        → Continue to Q3

  ○ Listed / Large Public Company
        → Treat as salaried employment
        → Capture: Company name, designation, annual CTC
        → Label: "Director Salary — [Company Name]"
        → No co-applicant needed
        → DONE

Q3: "Do you hold equity / ownership in this company?"
  ○ Yes, I'm a promoter / shareholder
        → Q3a: "What is your ownership percentage?"  [number input]
        → COMPANY CO-APPLICANT NEEDED
        → Capture full financials: company name, type, revenue,
           profit, ITR status, business type, vintage
        → After save → trigger auto-create flow (see below)

  ○ No, I'm a professional / independent director
        → Treat as salaried employment
        → Capture: Company name, annual remuneration, sitting fees
        → Label: "Professional Director — [Company Name]"
        → No co-applicant needed
        → DONE
```

#### For "Partner in Firm" — Each Entry

```
Entry: Partner Income — [Entry #1]

Q1: "Is this firm registered in India?"
  ○ Yes → continue
  ○ No (foreign) → same as foreign director flow above

Q2: "What type of firm?"
  ○ Partnership Firm
  ○ LLP (Limited Liability Partnership)
        → Continue to Q3

Q3: "What is your role?"
  ○ Active / Working Partner
        → COMPANY CO-APPLICANT NEEDED
        → Q3a: "What is your profit-sharing ratio?"  [% input]
        → Capture: firm name, remuneration, profit share, firm
           turnover, net profit, ITR-5 status
        → After save → trigger auto-create flow

  ○ Sleeping / Inactive Partner
        → Q3a: "Is profit share from this firm a major income
                source (>30% of your total income)?"
          ○ Yes → COMPANY CO-APPLICANT NEEDED (same as active)
          ○ No  → Treat as passive/investment income
                → Capture: firm name, annual profit share amount
                → Label: "Passive Partner Income — [Firm Name]"
                → No co-applicant needed
                → DONE
```

#### For "Business Owner" — Each Entry

```
Entry: Business Income — [Entry #1]

Q1: "What type of business entity?"
  ○ Sole Proprietorship / Individual Business
        → No co-applicant needed
        → Capture: business name, turnover, profit, ITR-4
        → Label: "Proprietorship — [Business Name]"
        → DONE

  ○ HUF (Hindu Undivided Family)
        → Capture: HUF name, turnover, profit
        → Special treatment (HUF can be separate applicant)
        → Prompt: "Add HUF as separate applicant?"
        → DONE

  (If they select Pvt Ltd/LLP etc. → redirect to Director/Partner
   profile — business owner implies individual ownership)
```

---

### Decision Summary Table

| Profile | Company Type | Equity? | Role | Co-App? | Income Treatment |
|---|---|---|---|---|---|
| Director | Foreign (any) | Any | Any | **No** | Foreign salary in ITR |
| Director | OPC | Yes (100%) | Sole | **No** | Inline — individual = company |
| Director | Listed/Large Public | No | Board member | **No** | Salaried employment |
| Director | Indian Pvt Ltd | **No** | Professional/hired | **No** | Salaried employment |
| Director | Indian Pvt Ltd | **Yes** | Promoter | **Yes** | Company financials needed |
| Director | Indian Public (unlisted) | **Yes** | Promoter | **Yes** | Company financials needed |
| Partner | Indian LLP/Partnership | Active | Working | **Yes** | Firm financials needed |
| Partner | Indian LLP/Partnership | Sleeping | <30% income | **No** | Passive income |
| Partner | Indian LLP/Partnership | Sleeping | >30% income | **Yes** | Firm financials needed |
| Partner | Foreign firm | Any | Any | **No** | Foreign income in ITR |
| Business Owner | Sole Proprietorship | N/A | Owner | **No** | Individual = business |
| Business Owner | HUF | N/A | Karta | **Maybe** | HUF as separate applicant |

---

### Auto-Create Company Co-Applicant (When Needed)

When a qualifying income entry determines "Company Co-Applicant Needed":

#### Step 1 — Check if Company Already Exists

Scan current applicant list for a company with matching name (case-insensitive):
- **Found** → Auto-link individual to existing company. Show: "Linked to [ABC Pvt Ltd] — already a co-applicant"
- **Not found** → Proceed to Step 2

#### Step 2 — Prompt to Add

Show inline confirmation (NOT a modal — stays in income form context):

> **[ABC Pvt Ltd] should be added as a co-applicant** — lenders require company financials for assessment.
> **[Add as Co-Applicant]** &nbsp; [Skip for Now]

#### Step 3a — "Add as Co-Applicant"

1. Auto-create company entry in applicant list with pre-filled data:

| Field | Pre-filled From |
|---|---|
| Company Name | Income entry `companyName` / `entityName` |
| Company Type | Income entry company type answer |
| Business Type | Income entry `businessType` |
| Business Vintage | Income entry `businessVintage` (if captured) |
| Revenue / Turnover | Income entry `grossReceipts` / `turnover` |
| Net Profit | Income entry `netProfit` |
| ITR Filed Status | Income entry `itrFiled` |
| Directors/Partners list | Current individual's name + ownership % |

2. Establish link: `individual.linkedCompanyId` ↔ `company.directors[]`
3. Company appears in sidebar under Applicants
4. DSA stays on current page — no navigation
5. Show success: "ABC Pvt Ltd added as co-applicant. You can review company details later."

#### Step 3b — "Skip for Now"

1. Store `__pendingCompanyLink` with company name + type + source entry ID
2. Show persistent banner on income page: "Company financials pending — ABC Pvt Ltd not added. [Add now]"
3. Validation impact (see Validation section below)

---

### Multi-Company Director — Each Entry Independent

When the DSA adds multiple income entries, each runs independently:

**Example: Pramod Kumar has 3 director entries**

| Entry | Company | Qualifying Result | Action |
|---|---|---|---|
| #1 | ABC Pvt Ltd (India, 45% equity) | Co-app needed | Auto-create ABC Pvt Ltd |
| #2 | XYZ Ltd (Listed, no equity) | Just salary | No action — treated as salaried |
| #3 | GHI Inc (Dubai, director salary) | Foreign salary | No action — ITR income only |

- Entry #1 triggers company co-applicant creation
- Entries #2 and #3 are self-contained income sources
- All three contribute to total income assessment independently
- Income summary shows: "Director Salary: 3 entries (1 company-linked, 1 listed company, 1 foreign)"

---

### Dedup — Multiple Directors, Same Company

| Event | Action |
|---|---|
| Pramod adds Director income for "ABC Pvt Ltd" | Company created, Pramod linked as director (45%) |
| Nidhi adds Director income for "ABC Pvt Ltd" | Company already exists → auto-link Nidhi as director (30%). Update company's `directors[]` |
| Ravi adds Director income for "ABC Pvt Ltd" | Same → auto-link Ravi (25%). Company now has 3 linked directors |
| Nidhi removes her Director income entry | Break Nidhi's link to ABC Pvt Ltd. Company still has Pramod + Ravi |
| Pramod AND Ravi both remove Director income | Company has 0 linked directors → show warning on company card |

---

### Dynamic Monitoring (Reactive)

`$effect` watches both the applicant list AND income entries:

| Trigger | Reactive Action |
|---|---|
| Income entry saved with company needing co-app | Scan applicant list → link or prompt to create |
| Company added manually on Applicants page | Scan all individuals' income entries → auto-link matches |
| Company removed from applicants | Break all individual links. Income data stays. Show warning. |
| Individual removed | If last linked director, warn on company card |
| Income entry deleted/profile deselected | Break link for that specific entry. Other entries unaffected. |

---

### Validation & Blocking

| Stage | Check | Message |
|---|---|---|
| **Income page** | Pvt Ltd director income saved but company not added | Banner: "Company financials pending — [ABC Pvt Ltd] [Add now]" |
| **Income page** | Multiple entries, some need co-app, some don't | Per-entry indicators (green check / amber warning) |
| **Loan Details page** | Any pending company co-applicant | Soft block: "Add [Company] as co-applicant for complete assessment" |
| **Offer generation** | Company co-applicant missing | Generate partial offers + clear indicator: "Offers may change once company financials are available" |
| **Assessment results** | Company present | Full assessment with company-backed income validated |
| **Assessment results** | Company missing | Partial assessment. Company-linked income shown with asterisk: "* Pending company verification" |

---

### Data Sync — Income Entry ↔ Company Applicant

Financial data is **copied at creation time**, not live-linked. After creation:

- **Income entry financials** = source of truth for individual's income calculation (haircuts, FOIR)
- **Company applicant financials** = source of truth for company-level assessment (can be edited independently on company's Profile page)
- Initial creation pre-fills from income data to avoid double entry
- If DSA later updates company financials on the company's page → does NOT change individual's income entry
- They serve different purposes: individual income vs company health assessment

---

### DSA Guidance Per Scenario

| Scenario | Guidance Text |
|---|---|
| Foreign director | "Foreign company income is verified via ITR and bank credit statements. No company co-applicant needed." |
| OPC director | "As the sole director of an OPC, you and the company are one entity. All financials are captured here." |
| Listed company director | "Director salary from a listed company is treated as regular employment income." |
| Professional director (no equity) | "Appointed director without ownership — treated as salaried employment. Company financials not required." |
| Promoter director (equity) | "Company financials are required for lender assessment. The company will be added as a co-applicant for proper evaluation." |
| Active partner | "Firm financials (ITR-5, P&L) are required. The firm will be added as co-applicant." |
| Sleeping partner (minor) | "Minor profit share treated as passive income. Firm financials not required for this entry." |
| Sleeping partner (major) | "Significant profit share from this firm — firm financials needed for proper assessment." |

---

### Implementation Files

| File | Changes |
|---|---|
| `src/lib/config/incomeProfiles/directorIncome.ts` (or equivalent) | Per-entry qualifying questions: Indian/foreign, company type, equity, role |
| `src/lib/config/incomeProfiles/partnerIncome.ts` (or equivalent) | Per-entry qualifying: firm type, active/sleeping, income significance |
| `src/lib/config/incomeProfiles/businessOwnerIncome.ts` (or equivalent) | Entity type question: sole prop / HUF / redirect to director-partner |
| `src/lib/stores/applicantFormManager.svelte.ts` | `autoCreateCompanyFromIncomeEntry()` — per-entry evaluation + creation |
| `src/lib/state/applicant.svelte.ts` | Reactive watcher for income entries with company references |
| `src/lib/components/IncomePageNew.svelte` | Per-entry qualifying form fields + post-save trigger |
| `src/lib/components/ApplicantFormCard.svelte` | "Linked to [Company]" badge, multi-company badges |
| `src/lib/utils/directorAutoIncome.ts` | Update for OPC/foreign/listed/professional director branches |
| `src/lib/components/form-wizard/FormShell.svelte` | Pending company warning banner (per-company) |
| `src/lib/utils/companyAutoDerive.ts` | **New** — logic for evaluating entries, dedup, auto-create, linking |

---

### Testing Requirements

**Per-entry qualifying:**
- Director entry: Indian Pvt Ltd + equity → prompted to add company
- Director entry: Indian Pvt Ltd + no equity (professional) → no prompt, treated as salary
- Director entry: OPC → no prompt, financials inline
- Director entry: Listed company → no prompt, treated as salary
- Director entry: Foreign company → no prompt, captured as foreign salary
- Partner entry: Active partner in LLP → prompted to add firm
- Partner entry: Sleeping partner, <30% income → no prompt, passive income
- Partner entry: Sleeping partner, >30% income → prompted to add firm
- Business Owner: Sole prop → no prompt

**Multi-company:**
- Same person, 3 entries (Pvt Ltd + Listed + Foreign) → only Pvt Ltd triggers co-app
- Two individuals, same Pvt Ltd company → one company entry, both linked
- Add entry → remove entry → link breaks cleanly, other entries unaffected

**Dynamic:**
- Company added manually first → director income entry auto-links
- Company removed → links break, income stays, warning shown
- Income entry deleted → company stays but director link removed

**Cross-flow:**
- Skip "Add now" → banner persists through page changes
- Offer generation with pending company → partial offers + clear indicator
- Restored individual with director income → qualifying questions re-evaluated fresh

---

## Requirement 5: Plot Loan Form — Conditional Flow Fixes + Missing Questions

**Source**: Plot loan form review (PDF: "Plot Loan Structured — Original Questions Preserved")
**Priority**: High — wrong questions shown in wrong contexts, missing critical resale flow questions

---

### 5.1 Current State — What Exists

**Plot Loan Variants** (after selecting "New Loan"):
- Plot Loan Only
- Plot & Construction Loan
- Plot & Equity Loan
- Construction Loan Only
- Balance Transfer Only (separate from "New Loan")

**Key files**:
- Variant selector: `src/lib/config/commonPage.json`
- Pages: `src/lib/config/plotLoan/pages.ts`
- Property legal: `src/lib/config/plotLoan/questionBank/propertyLegal_Plot.ts`
- Construction details: `src/lib/config/plotLoan/questionBank/constructionDetails_Plot.ts`
- Loan requirement + ATS: `src/lib/config/plotLoan/questionBank/loanRequirement.ts`

---

### 5.2 Questions Shown in Wrong Context

#### A. "Is there any existing loan / mortgage on this property?" (`q5_existingEncumbrance`)

**Current showWhen**: `ownershipChainComplete != ''` — shows for ALL purchase types after ownership chain question
**Problem**: For direct sale (from authority/developer), the property has no prior owner — there CAN'T be an existing loan on it. This question only makes sense for resale.

**Fix**:
```
showWhen: {
  and: [
    { '!=': [{ var: 'ownershipChainComplete' }, ''] },
    { '==': [{ var: 'purchaseType' }, 'resale_normal'] }   // ← add this
  ]
}
```

For `direct_from_authority` and `direct_from_developer` → skip this question, default answer = No.

#### B. "When do you plan to start construction on this plot?" (`q9_constructionTimeline`)

**Current showWhen**: `loanType IN ['Plot Loan Only', 'Plot & Equity Loan']`
**Problem**: For "Plot Loan Only", the customer may be buying JUST the plot with no construction intent. The question is still useful (banks care about construction intent for assessment), but:
- Current question text "When do you plan to start construction?" assumes construction IS planned
- For pure plot purchase, better framing: "Do you plan to construct on this plot?"

**Fix**: Add a preliminary question before the timeline:

**New question**: "Are there any construction plans for this plot?"
- Yes, construction planned → show `q9_constructionTimeline` (existing)
- No, buying plot only → skip timeline, flag to lender: "Plot purchase only, no construction plans"
- Not decided yet → show timeline with "no_plans" pre-context

**Why this matters**: Banks treat "plot only" vs "plot + future construction" differently for tenure, interest rates, and disbursement structure.

#### C. "Is the plot registered in the name of the seller(s)?" (`q2_ifPropertyRegistered`)

**Current showWhen**: `encumbranceCertificateVerified != ''` — shows for all purchase types
**Problem**: For direct sale from authority/developer, there is no "seller" in the traditional sense. The authority IS the owner. This question is only relevant for resale (individual purchase).

**Fix**:
- **Resale**: Show as-is — "Is the plot registered in the name of the seller(s)?"
- **Direct from authority**: Skip OR reframe — "Has the plot been allotted / registered by the authority?" (different concept)
- **Direct from developer**: Skip OR reframe — "Has the developer executed the sale deed?"

**Current dynamic text already partially handles this** (different text for BT/Construction), but needs a purchase-type branch too:
```
question: {
  switch: [
    { case: { '==': [{ var: 'purchaseType' }, 'resale_normal'] },
      then: 'Is the plot registered in the name of the seller(s)?' },
    { case: { '==': [{ var: 'purchaseType' }, 'direct_from_authority'] },
      then: 'Has the authority issued the allotment letter / lease deed?' },
    { case: { '==': [{ var: 'purchaseType' }, 'direct_from_developer'] },
      then: 'Has the developer executed the agreement to sell?' },
    // BT/Construction existing text remains
  ],
  default: 'Is the plot registered in the name of the owner(s)?'
}
```

---

### 5.3 Missing Questions — Resale Property Flow

When the plot is a **resale purchase** and the **seller has an existing loan** on it, the following questions are critically missing:

#### New Q: "Which lender holds the seller's existing loan?"
- **Type**: Select (from bank list)
- **bindsTo**: `sellerLoanLender`
- **showWhen**: `existingEncumbrance == 'Yes'` AND `purchaseType == 'resale_normal'`
- **Why**: The buyer's bank needs to know who holds the lien. Some banks won't process if the seller's loan is with certain lenders. The foreclosure process depends on the seller's lender.

#### New Q: "What is the approximate foreclosure / payoff amount?"
- **Type**: Number input (₹)
- **bindsTo**: `sellerForeclosureAmount`
- **showWhen**: `existingEncumbrance == 'Yes'` AND `purchaseType == 'resale_normal'`
- **Helper**: "The outstanding loan amount the seller needs to pay off before or during the sale. This amount will be deducted from the sale proceeds."
- **Why**: Affects the net proceeds to seller and the buyer's bank's disbursement plan. Banks often pay the foreclosure amount directly to the seller's lender.

#### New Q: "Is the seller or any co-owner an NRI?"
- **Type**: Radio (Yes / No)
- **bindsTo**: `sellerIsNRI`
- **showWhen**: `purchaseType == 'resale_normal'`
- **Why**: NRI sellers have special TDS requirements (Section 195 — 20-30% TDS vs 1% for residents). The buyer's bank needs to handle this. Missing this causes last-minute transaction blocks.
- **If Yes, follow-up**: "Which country does the NRI seller reside in?" — affects FEMA compliance and documentation requirements.

#### New Q: "Has the seller obtained a No-Objection Certificate (NOC) from their lender?"
- **Type**: Radio (Yes / No / Not Yet)
- **bindsTo**: `sellerLenderNOC`
- **showWhen**: `existingEncumbrance == 'Yes'` AND `purchaseType == 'resale_normal'`
- **Why**: Without NOC, the sale can't proceed. Banks need confirmation that the lien will be released.

---

### 5.4 Variant-Specific Logic

#### Plot Loan Only (New Loan)

| Question | Direct Sale | Resale |
|---|---|---|
| Nature of purchase | Asked (authority/developer) | Asked (resale) |
| Existing loan on property | **Skip** | Show |
| Seller's lender / foreclosure | **Skip** | Show (if loan exists) |
| Seller NRI status | **Skip** | Show |
| Seller lender NOC | **Skip** | Show (if loan exists) |
| Construction timeline | Ask with "Do you plan to construct?" pre-question | Same |
| Plot registered in seller name | **Skip** (authority allotment instead) | Show |

#### Plot & Equity Loan (New Loan)

Same as Plot Loan Only — the "equity" component is about using existing property as additional collateral, doesn't change the plot purchase flow.

Add purchase type branching:
- Direct from authority → skip seller questions, ask about ownership registry
- Direct from developer → skip seller questions, ask about agreement
- Resale → full seller flow (existing loan, foreclosure, NRI, NOC)

#### Plot & Construction Loan (New Loan)

Same purchase type branching as above. Construction questions additionally shown.

#### Construction Loan Only (New Loan)

**Different case** — the plot is ALREADY owned. No purchase happening. So:
- "Nature of plot purchase" → **NOT asked** (already owns the plot)
- Instead, existing questions already handle this: `q0_plotCurrentState` (vacant/partial/existing) and `q0b_plotMortgageStatus` (free/has_loan)
- If has_loan → `q0c_plotLoanLender` already exists
- **No seller questions** — there's no seller
- This is currently correct in the code

#### Balance Transfer Only

- "Nature of plot purchase" → **NOT asked** — property already purchased, loan already exists
- This is flagged correctly in the PDF
- **Current code check needed**: Verify that `purchaseType` question has `showWhen` excluding BT

---

### 5.5 ATS Page — Match Home Loan Structure

**Current**: Plot Loan has its own ATS questions (`q5_differentATSandPV`, `q5_ATSReady`, `q5_ATSvalue`) embedded in `loanRequirement.ts`
**Required**: ATS page should match Home Loan's ATS structure for consistency

**What Home Loan ATS has that Plot Loan should adopt:**
- Structured ATS section with clear flow
- Registry value vs agreement value comparison
- Stamp duty calculation guidance
- Circle rate / DLC rate comparison
- Standardized output format for lender submission

**Action**: Audit Home Loan ATS questions, identify gaps in Plot Loan ATS, align the structure. Keep plot-specific differences (no builder, no project — just plot seller/authority).

---

### 5.6 Complete Flow Diagram

```
Plot Loan → New Loan
  ↓
Q: "What is the nature of plot purchase?"
  ├── Direct from Development Authority
  │     → Skip seller questions
  │     → Ask: "Has authority issued allotment?"
  │     → Ask: "Original documents available?"
  │     → Construction timeline (with pre-question)
  │     → ATS flow
  │
  ├── Direct from Developer / Township
  │     → Skip seller questions
  │     → Ask: "Has developer executed agreement?"
  │     → Ask: "Original documents available?"
  │     → Construction timeline (with pre-question)
  │     → ATS flow
  │
  └── Resale / Individual Purchase
        → Ask: "Plot registered in seller's name?"
        → Ask: "Existing loan on property?"
        │   ├── Yes → Seller's lender? Foreclosure amount? Seller lender NOC?
        │   └── No → Continue
        → Ask: "Is seller / any co-owner NRI?"
        │   ├── Yes → NRI country? (FEMA/TDS implications)
        │   └── No → Continue
        → Ask: "Original documents available?"
        → Construction timeline (with pre-question)
        → ATS flow

Plot Loan → Balance Transfer Only
  → Skip "nature of purchase" entirely
  → Existing BT flow (lender, outstanding, tenure, rate)
  → No seller questions
```

---

### Implementation Files

| File | Changes |
|---|---|
| `src/lib/config/plotLoan/questionBank/propertyLegal_Plot.ts` | Fix showWhen for `q5_existingEncumbrance`, `q2_ifPropertyRegistered`; add seller lender/foreclosure/NRI/NOC questions |
| `src/lib/config/plotLoan/questionBank/loanRequirement.ts` | ATS restructure to match Home Loan pattern |
| `src/lib/config/plotLoan/questionBank/constructionDetails_Plot.ts` | Add "Do you plan to construct?" pre-question before timeline |
| `src/lib/config/plotLoan/pages.ts` | Page-level showWhen adjustments if needed |
| `src/lib/config/commonPage.json` | Verify purchaseType question excludes BT variant |

### Testing Requirements

- Plot Loan Only + Direct from authority → no seller questions shown
- Plot Loan Only + Resale → full seller flow (existing loan, foreclosure, NRI, NOC)
- Plot Loan Only + Resale + seller has loan → seller lender + foreclosure amount + NOC questions appear
- Plot & Equity + Direct from developer → skip seller questions, ask ownership registry
- Plot & Construction + Resale → seller flow + construction questions
- Construction Loan Only → no purchase type question, no seller questions (already owns plot)
- Balance Transfer → no "nature of purchase" question
- Construction timeline → preceded by "Do you plan to construct?" for Plot Loan Only
- ATS questions → consistent structure with Home Loan ATS

---

## Requirement 6: Professional Loan — Applicant Type First, Then Professional Category

**Source**: Professional Loan → Loan Requirements page (screenshot annotation)
**Priority**: High — fundamental flow reorder + missing company support

### Current Problem

**Flow is backwards.** Currently:
1. Loan Requirements page → asks "What type of professional?" (Doctor/CA/Lawyer/Architect)
2. Applicants page (later) → asks "Who is applying?" (Individual/Company)

The professional category question has NO idea whether an Individual or Company is applying, so it only shows individual categories. But companies (law firms, clinics, CA firms) also apply for Professional Loans.

### Required Flow — Applicant Type FIRST

```
Getting Started (Page 1 or early in flow)
  ↓
Q1: "Who is applying for this Professional Loan?"
  ○ Individual Professional (Doctor, CA, Lawyer, Architect)
  ○ Professional Firm / Practice (Clinic, Law Firm, CA Firm, etc.)
  ↓
Q2: Professional Category (options based on Q1 answer)
  ↓
Q3: Amount, terms, other loan requirement questions
  ↓
Applicants page — pre-configured based on Q1 answer
  ↓
Remaining pages adapt accordingly
```

### Detailed Question Flow

#### Q1: "Who is applying for this Professional Loan?"

| Option | Value | Description |
|---|---|---|
| Individual Professional | `individual` | A single professional (doctor, CA, lawyer, architect) applying in personal capacity |
| Professional Firm / Practice | `company` | A registered firm, clinic, hospital, or practice applying as an entity |

**Where to ask**: On the Loan Requirements page, BEFORE the professional category question. This becomes the first question — everything else flows from it.

#### Q2: Professional Category — Dynamic Based on Q1

**When Q1 = Individual** (current options — keep as-is):

| Category | Value |
|---|---|
| Doctor / Medical | `doctor` |
| Chartered Accountant / CA | `ca` |
| Lawyer / Advocate | `lawyer` |
| Architect | `architect` |

**When Q1 = Company** (NEW options):

| Category | Value | Examples |
|---|---|---|
| Medical Clinic / Hospital | `clinic_hospital` | Clinic, nursing home, diagnostic center, hospital, pathology lab |
| Law Firm | `law_firm` | Legal practice, advocates' firm, solicitors' firm |
| CA / Accounting Firm | `ca_firm` | CA practice, tax consultancy, audit firm |
| Architecture / Design Firm | `architecture_firm` | Architecture practice, interior design firm, town planning |
| Engineering Consultancy | `engineering_firm` | Structural, civil, MEP, environmental consultancy |
| Other Professional Practice | `other_professional` | Any registered professional services entity |

### What Changes Downstream Based on Applicant Type

| Aspect | Individual Professional | Professional Firm / Practice |
|---|---|---|
| **Applicants page** | Pre-set to Individual. Add co-applicants normally. | Pre-set to Company. Company form shown (firm name, type, registration). Directors/partners added as stakeholders. |
| **Professional category lock** | Locks individual's employment type to selected profession | Locks company's business type to selected practice category. Directors' professions are NOT locked (a CA firm can have a non-CA admin partner). |
| **Income profiles** | Professional Practice income expected | Company financials (turnover, profit, ITR-5/ITR-6). Directors get separate individual income. |
| **Documentation** | Individual registration certificate, degree, practice proof | Firm registration + professional license of at least one partner/director. Company ITR, P&L, balance sheet. |
| **Lender eligibility** | All professional loan lenders | Some banks only lend to individual professionals — filter these out for company applicants. |
| **Loan limits** | Typically up to 50L (varies by lender) | May be higher for established firms with strong financials |
| **FOIR treatment** | Individual FOIR | Company DSCR (Debt Service Coverage Ratio) — different calculation |

### Applicants Page Pre-Configuration

Based on Q1 answer, the Applicants page should be **pre-configured**:

**If Individual Professional**:
- Primary applicant type = Individual (pre-selected, can't change to Company)
- "Who is applying?" section skipped or pre-filled
- DSA proceeds directly to entering individual details
- Co-applicants can be added as usual (Individual or Company)

**If Professional Firm / Practice**:
- Primary applicant type = Company (pre-selected)
- Company form shown first: firm name, company type (LLP/Partnership/Pvt Ltd/OPC), registration details
- Directors/partners added via stakeholder modal
- At least ONE director/partner must have the matching professional qualification (e.g., a CA firm must have at least one CA as partner)
- Individual co-applicants (guarantors, other professionals) can be added separately

### Company Type → Expected Firm Types

| Professional Category | Likely Company Types |
|---|---|
| Medical Clinic / Hospital | Trust, Pvt Ltd, LLP, OPC, Partnership |
| Law Firm | LLP, Partnership (law firms can't be Pvt Ltd in India) |
| CA / Accounting Firm | LLP, Partnership, Proprietorship |
| Architecture / Design Firm | LLP, Partnership, Pvt Ltd |
| Engineering Consultancy | LLP, Partnership, Pvt Ltd |
| Other Professional | Any |

### Cross-References

- **Requirement 4** (Company-Individual Income Intelligence): When a professional firm applies, its directors/partners will have income entries. The per-entry qualifying questions (Req 4) apply — but the professional context simplifies things (directors of a CA firm are likely CAs with professional income).
- **Requirement 3** (Restoration): When restoring a company applicant that was previously in a Professional Loan context, the professional category should also restore.
- **CLAUDE.md pitfall #5** (locked field pattern): The `isProfLockedByLoan` check needs to distinguish:
  - Individual applicant → profession locked to loan-level category
  - Company applicant → company type locked to firm category, but individual directors' professions are NOT locked

### Implementation Notes

- Move "Who is applying?" (Individual/Company) question to Loan Requirements page, before professional category
- Add company-specific professional category options with `showWhen: { '==': [{ var: 'professionalApplicantType' }, 'company'] }`
- Update Applicants page to read `professionalApplicantType` and pre-configure the primary applicant type
- Update rule engine: `professionalCategory` mappings need to include company categories
- The `isProfLockedByLoan` pattern needs an update: lock company business type, not individual director profession
- Consider: should the company type dropdown on the Applicants page be filtered based on professional category? (e.g., law firms can't be Pvt Ltd)

### Testing Requirements

- Select "Individual Professional" → existing 4 categories shown → Applicants page defaults to Individual
- Select "Professional Firm" → company categories shown → Applicants page defaults to Company form
- Company (CA Firm) selected → at least one partner must be a CA → validation enforced
- Company (Law Firm LLP) → directors' individual professions NOT locked to "Lawyer"
- Professional category lock still works for Individual applicants
- Rule engine evaluates company professional categories correctly
- Restoration: company with professional category restores correctly
- Switching from Individual to Company (or vice versa) → clears downstream answers, resets flow

---

## Requirement 7: Remove Existing Facility Lender Question → Replace with Current Account Capture

**Source**: Professional Loan → Loan Requirements page (Debt Consolidation variant)
**Priority**: Medium — applies to all Debt Consolidation flows across loan types

### Current Problem

"Which bank/NBFC is the existing facility with?" asks for a SINGLE lender. But in Debt Consolidation:
- There may be **multiple** CC (Cash Credit) / OD (Overdraft) accounts running across different banks
- These are already captured individually in the **Obligations** section (each with its own lender, EMI, outstanding)
- Asking for one lender here is redundant and incomplete

### What to Change

#### Remove
- Remove "Which bank/NBFC is the existing facility with?" from the Loan Requirements page for Debt Consolidation variants
- The Obligations section already captures per-loan lender details — this is the correct place for it

#### Replace with: Current Account Information

Current accounts are critical for lender assessment (banking relationship, turnover analysis, avg balance) but are NOT captured anywhere currently.

**For Company applicants** — ask directly (companies always have current accounts):

> **"Which banks does the company hold current accounts with?"**
> - Multi-select from bank list
> - At least one required
> - Helper: "Current account banking relationship and turnover history are key factors in lender assessment. List all active current accounts."

**For Individual applicants** (and jointly with company) — ask a gate question first:

> **"Does the applicant have any current / savings accounts used for business?"**
> - Yes → show bank multi-select: "Which banks?"
> - No → skip
> - Helper: "Banks assess account turnover and average balance. Business-linked accounts strengthen the application."

### Why Current Accounts Matter

| Factor | Why Lenders Care |
|---|---|
| **Banking relationship** | Existing relationship with a bank = faster processing, better terms |
| **Account turnover** | Monthly credits/debits in current account validate declared income |
| **Average balance** | Shows financial discipline and liquidity |
| **Cheque bounces** | High bounce rate = red flag (CIBIL also reflects this) |
| **Primary operating account** | Banks prefer applicants who route business through their accounts |
| **CC/OD limit utilization** | Already in obligations — but knowing WHICH bank has the current account helps pair with existing CC/OD |

### Scope — Not Just Professional Loan

This applies to **all Debt Consolidation variants** across loan types:
- Professional Loan → Debt Consolidation / Debt Consolidation with Extra Funds
- Business Loan → Debt Consolidation variants
- Personal Loan → Debt Consolidation variants (if applicable)

And also useful for **all non-DC loan types** — current account info helps lenders everywhere, not just consolidation. Consider adding this to the shared questions or applicant profile.

### Data Model

```typescript
// New fields on applicant
currentAccounts: {
  hasBankingAccounts: 'Yes' | 'No';   // gate question (Individual only)
  banks: string[];                      // array of bank names
  primaryBank?: string;                 // which is the main operating account
}
```

### Implementation Notes

- Remove the existing facility lender question from Debt Consolidation flow in loan requirement pages
- Add current account question to applicant profile or a shared section
- For Company applicants: always ask (no gate question)
- For Individual applicants: gate question first, then bank list
- Multi-select bank picker can reuse existing `bankData` from `$lib/config/bankSelection/bankName`
- Current account data feeds into the offer page: "Applicant has accounts with [SBI, HDFC] — these lenders may offer preferential terms"

### Testing Requirements

- Debt Consolidation variant → "Which bank is existing facility with?" NOT shown
- Company applicant → current account bank picker shown directly
- Individual applicant → "Do you have current/savings for business?" → Yes → bank picker shown
- Individual → No → bank picker skipped
- Selected banks appear in case route / offer page context
- Multiple banks can be selected
- Obligations section still captures per-loan lender independently (no duplication)
