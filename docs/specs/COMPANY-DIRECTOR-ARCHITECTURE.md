# Company, Director & Business Profile — Architecture Specification

> **Created**: 2026-03-14 | **Status**: PHASES 1-3 IMPLEMENTED (Session 25-51), PHASE 4 PARKED
> **Applies to**: All 6 loan types (Home, LAP, Plot, Personal, Business, Professional)
> **Reference conversation**: Session 25 — "Applicant Type UX + Director Capture + Business Profile Redesign"
>
> ### Implementation Status (updated 2026-04-03)
> - **Section 5 (Step 0.5 — Director Cards)**: ✅ DONE — `DirectorCards.svelte`, `DirectorFormModal.svelte`, `DirectorCountPicker.svelte`, `DirectorRemovePickerModal.svelte` all implemented. UUID-keyed, cross-company matching, prefix matching for recovery, OPC auto-validation.
> - **Section 6 (Step 1 — Relationships)**: ✅ DONE — Extended family types, non-co-applicant directors in relationship graph, hasRelatedDirectors forward/reverse sync.
> - **Section 7 (Step 3 — Business Profile)**: ✅ DONE — `CompanyBusinessProfile.svelte`, GST-driven vintage, card-style UI, revenue split, 8 questions.
> - **Section 8 (Family-Run Derivation)**: ✅ DONE — `familyControlDerivation.ts`, auto-derived from relationship graph, never self-declared.
> - **Section 10 (Multiple Companies)**: ✅ DONE — Cross-company matching, identity field sharing, director restoration.
> - **Section 11 (Unsecured Dedup)**: 📋 PARKED — Removing businessProfilePage breaks Proprietorship applicants.
> - **Session 51 additions**: Director table UUID keying, onEMI/onProperty for all company types, OPC ownership lock, RestoreApplicantModal native `<dialog>`, prefix matching (min 4 chars, 75% overlap).

---

## HOW TO USE THIS DOCUMENT

This is the **single source of truth** for three interconnected changes:

1. **Step 0.5**: Director/Partner detail capture (new sub-step)
2. **Business Profile redesign**: Company financial data moves to Step 3 with card-style UI
3. **Family-run derivation**: Auto-detected from director relationships, not self-declared

**Decision markers:**

- ✅ = Explicitly decided by the user (non-negotiable)
- 📐 = Designed during conversation, reviewed and approved
- 💡 = Proposed during design (may need confirmation during implementation)

---

## TABLE OF CONTENTS

1. [Problem Statement](#1-problem-statement)
2. [Design Principles](#2-design-principles)
3. [Step Architecture — Universal Flow](#3-step-architecture--universal-flow)
4. [Step 0 — Company Identity (What Changes)](#4-step-0--company-identity)
5. [Step 0.5 — Director/Partner Cards (NEW)](#5-step-05--directorpartner-cards)
6. [Step 1 — Relationships (Enhanced)](#6-step-1--relationships-enhanced)
7. [Step 3 — Company Business Profile Tab (Redesigned)](#7-step-3--company-business-profile-tab)
8. [Family-Run Derivation Logic](#8-family-run-derivation-logic)
9. [Card-Style UI Pattern](#9-card-style-ui-pattern)
10. [Secured Loans — Multiple Companies](#10-secured-loans--multiple-companies)
11. [Unsecured Loans — Business Loan Dedup Fix](#11-unsecured-loans--business-loan-dedup-fix)
12. [Data Model Changes](#12-data-model-changes)
13. [Affected Files](#13-affected-files)
14. [Implementation Sequence](#14-implementation-sequence)

---

## 1. PROBLEM STATEMENT

### 1.1 Director/Partner data is incomplete

When a Company is a co-applicant (secured loans) or primary borrower (unsecured), the system needs each director/partner's:

- Identity (name, gender, age)
- Ownership stake %
- Location relative to property/business
- Whether they're a co-applicant on the loan

Currently, `AddApplicantBusiness.svelte` captures some of this inline, but:

- Secured loans (`applicantBasicDetailsSecuredLoans.json`) have NO director capture at all
- No ownership stake % is captured anywhere
- No location-relative-to-property for directors

### 1.2 Family-run detection is missing

Lenders evaluate family-run businesses very differently:

- **Family-run**: Every director's CIBIL/income/obligations checked individually — one bad apple spoils all
- **Non-family-run**: Proportional to stake % — 51% director gets full check, 5% director gets light check

The system has no way to detect this today. A self-declaration question ("Is this family-run?") is gameable — businesses add one token non-family director. The correct approach: **derive from actual director-to-director relationships**.

### 1.3 Business profile UI is poor

The current business profile (inside income modal Step 3) uses awkward Yes/No toggle rows that feel like a compliance audit. Lenders' actual questions map naturally to card-style radio selections (entity type, industry sector, vintage range, turnover range, employee count) — same pattern already proven in the form's questionnaire pages.

### 1.4 Business loan has duplicate questions

The business loan `businessProfilePage` (Getting Started) and `AddApplicantBusiness.svelte` (Applicants) both ask entity type and director count. This will be fixed as part of the unsecured loan restructure (Section 11).

---

## 2. DESIGN PRINCIPLES

| #      | Principle                                              | Rationale                                                                                                                             |
| ------ | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| ✅ P-1 | **Step 0 = Identity only**                             | "Who is this entity?" — name, type, country. No financial data.                                                                       |
| ✅ P-2 | **Step 3 = Financial profile**                         | GST, turnover, vintage, industry, business category — all financial/operational. Same as salary/income for individuals.               |
| ✅ P-3 | **Step 0.5 = Director cards**                          | Separate sub-step between company save and relationships. Not inline.                                                                 |
| ✅ P-4 | **All fields required**                                | No "Not sure" option. DSA must know stake %, names, etc.                                                                              |
| 📐 P-5 | **Stake % ≤ 100, not = 100**                           | Not all directors may be listed. Show live indicator "X% accounted for". Block only if > 100%.                                        |
| 📐 P-6 | **Non-co-applicant directors appear in Relationships** | For family-run detection. Stored on `company.directors[]`, shown as "linked persons" in Relationship step.                            |
| ✅ P-7 | **Card-style UI for profile**                          | Replace Yes/No toggles with conversational card-radio selections. Adopt the clean pattern from businessProfilePage (Getting Started). |
| ✅ P-8 | **Derive family-run, never ask**                       | System auto-derives `familyControlled` from director relationship graph. No self-declaration.                                         |
| ✅ P-9 | **Uniform across all 6 loan types**                    | Same Company handling whether it's a co-applicant on Home Loan or primary on Business Loan.                                           |

---

## 3. STEP ARCHITECTURE — UNIVERSAL FLOW

### Secured Loans (Home / LAP / Plot)

```
Step 0:    Add Applicant (Individual OR Company identity)
Step 0.5:  Director/Partner Details (for each Company applicant)  ← NEW
Step 1:    Relationships (all Individuals + all directors including non-co-applicants)
Step 2:    GPA (NRI individuals only)
Step 3:    Income & Credit (per co-applicant — Individuals + Companies)
           • Individual: Income Profiles → Income Details → Credit → Obligations
           • Company:   Business Profile → Financials → Credit → Obligations
```

### Unsecured Loans (Personal / Business / Professional)

```
Step 0:    Add Applicant (Individual OR Company identity)
Step 0.5:  Director/Partner Details (for each Company applicant)  ← NEW
Step 1:    Relationships (all Individuals + all directors)
Step 2:    GPA (NRI individuals only)
Step 3:    Income & Credit (per co-applicant)
           • Individual: Income Profiles → Income Details → Credit → Obligations
           • Company:   Business Profile → Financials → Credit → Obligations
```

### Step flow code mapping

```
applicantPageIndex:
  0  → Step 0:   AddApplicant (Individual/Company basic identity)
  0.5 → Step 0.5: DirectorCards (for each Company) ← NEW
  1  → Step 1:   Relationships
  2  → Step 2:   GPA (NRI only)
  3  → Step 3:   Income & Credit modal
```

> **Implementation note**: `applicantPageIndex` is currently an integer. Step 0.5 can be implemented as `pageIndex = 0` with a `subStep` flag, or by inserting index 1 and shifting others. Decision deferred to implementation.

---

## 4. STEP 0 — COMPANY IDENTITY

### What Step 0 captures for Company applicants

| Field                                 | Required | Notes                                                                 |
| ------------------------------------- | -------- | --------------------------------------------------------------------- |
| Company Name                          | ✅ Yes   | As registered                                                         |
| Company Type                          | ✅ Yes   | OPC, Pvt Ltd, Partnership, LLP, Trust/Society                         |
| Registration Country                  | ✅ Yes   | India / Foreign (FEMA gate)                                           |
| Number of Directors/Partners          | ✅ Yes   | Drives Step 0.5 card count                                            |
| "Are any directors/partners related?" | ✅ Yes   | Primes DSA thinking + triggers guidance. Options: Yes / No / Not sure |
| [Secured only] Name on Property       | ✅ Yes   | Existing field                                                        |
| [Secured only] Will pay EMI           | ✅ Yes   | Existing field                                                        |

### What MOVES OUT of Step 0

These fields currently in `applicantBasicDetailsSecuredLoans.json` or `AddApplicantBusiness.svelte` Step 0 → move to Step 3:

| Field               | Current location                            | New location                 |
| ------------------- | ------------------------------------------- | ---------------------------- |
| Business Category   | Step 0 (secured JSON + unsecured component) | Step 3, Business Profile tab |
| Industry Sector     | businessProfilePage (unsecured only)        | Step 3, Business Profile tab |
| GST Registration    | businessProfilePage (unsecured only)        | Step 3, Business Profile tab |
| Annual Turnover     | businessProfilePage (unsecured only)        | Step 3, Business Profile tab |
| Business Vintage    | businessProfilePage (unsecured only)        | Step 3, Business Profile tab |
| Number of Employees | businessProfilePage (unsecured only)        | Step 3, Business Profile tab |

### "Related directors" question design

This is NOT the primary family-run detection (that comes from Relationship step derivation). This is a **priming question** that:

1. Alerts the DSA to think about family connections
2. Triggers guidance in the right panel
3. If "Yes" → guidance says "Add ALL directors. Lenders will check each individually."
4. If "No" → guidance says "Add directors with significant stake (20%+)."

```
Are any directors/partners related to each other?
(family, extended family, in-laws)

○ Yes, some or all are related
○ No, none are related
```

---

## 5. STEP 0.5 — DIRECTOR/PARTNER CARDS (NEW)

### When it appears

- After ANY Company applicant is saved in Step 0
- Shows director cards for EACH Company (secured loans can have multiple companies)
- Number of cards = `numberOfDirectorsOrPartners` from Step 0

### Card layout (2-row per director)

```
┌─ Director 1 ─────────────────────────────────────────────────┐
│  Row 1:  Full Name *              Gender *       Age *       │
│          [___________________]    [Male    ▾]    [45]        │
│                                                              │
│  Row 2:  Ownership Share % *      Location *     Co-applicant│
│          [40      ]               [Same city ▾]  ☑ Yes       │
└──────────────────────────────────────────────────────────────┘
```

### Fields per director

| Field                      | Type            | Required | Validation                               |
| -------------------------- | --------------- | -------- | ---------------------------------------- |
| Full Name                  | text (alphabet) | ✅ Yes   | Min 2 chars, max 50                      |
| Gender                     | select          | ✅ Yes   | Male / Female                            |
| Age                        | number          | ✅ Yes   | 18–80                                    |
| Ownership Share %          | number          | ✅ Yes   | 1–100. Total of all directors ≤ 100      |
| Location                   | select          | ✅ Yes   | Same city / Same state / Different state |
| Co-applicant on this loan? | checkbox        | ✅ Yes   | Default: checked for first director      |

### Member label from ENTITY_MAP

| Company Type     | Member Label | Example                    |
| ---------------- | ------------ | -------------------------- |
| Partnership Firm | Partner      | "Partner 1", "Partner 2"   |
| LLP              | Partner      | "Partner 1", "Partner 2"   |
| Private Limited  | Director     | "Director 1", "Director 2" |
| OPC              | Director     | "Director 1" (always 1)    |
| Trust / Society  | Trustee      | "Trustee 1", "Trustee 2"   |

### Ownership share validation

- Each: 1–100, required
- Total: must be ≤ 100
- Live indicator below cards: `"75% of ownership accounted for"` (informational)
- **Block** if total > 100: `"Total ownership exceeds 100% — please correct"`
- **Do NOT block** if total < 100 (not all stakeholders may be listed)

### What happens on save

**Directors marked "Co-applicant = Yes":**

- Created as Individual applicants in `formState.applicants[]`
- Auto-set: `role = 'director' | 'partner'`, `isGuarantor = 'Yes'`
- Auto-set: `linkedCompanyId = company.id`, `ownershipPercent = X`
- Flow through Relationship → GPA → Income → Credit as full applicants

**Directors marked "Co-applicant = No":**

- Stored on `company.directors[]` as metadata (NOT in `formState.applicants[]`)
- Still appear in Relationship step as "linked persons" (for family-run detection)
- Their name + stake % appear in file builder / PDF output
- Rule engine can flag: "Director with X% stake not added as co-applicant"

---

## 6. STEP 1 — RELATIONSHIPS (ENHANCED)

### Current limitation

`RelationShip.svelte` line 16 filters to `applicantType === 'Individual'` only. Companies are excluded entirely.

### Enhancement

The Relationship step shows THREE groups:

```
┌─ RELATIONSHIP CAPTURE ────────────────────────────────────────┐
│                                                               │
│  ── Applicants ──────────────────────────────────────────     │
│  Rajesh Kumar (Director of ABC Pvt Ltd, 40%)                  │
│  Sunita Kumar (Director of ABC Pvt Ltd, 35%)                  │
│  Ravi Sharma (Individual applicant)                           │
│                                                               │
│  ── Other Directors (not co-applicants) ─────────────────     │
│  Rohit Kumar (Director of ABC Pvt Ltd, 25%) — not on loan    │
│  ↳ Relationships still required for family detection          │
│                                                               │
│  ── Declare Relationships ───────────────────────────────     │
│  Rajesh ←→ Sunita:  [Wife           ▾]                       │
│  Rajesh ←→ Ravi:    [No relation    ▾]                       │
│  Rajesh ←→ Rohit:   [Son            ▾]  ← non-co-applicant  │
│  Sunita ←→ Ravi:    [No relation    ▾]                       │
│  Sunita ←→ Rohit:   [Son            ▾]                       │
│  Ravi   ←→ Rohit:   [No relation    ▾]                       │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐     │
│  │ ⚠ Family-controlled entity detected                  │     │
│  │ Directors 1, 2, 3 of ABC Pvt Ltd are related (100%)  │     │
│  │ Combined family stake: 75%                            │     │
│  └──────────────────────────────────────────────────────┘     │
└───────────────────────────────────────────────────────────────┘
```

### Relationship types (extended for Indian context)

Current types + additions needed:

**Immediate family:**

- Husband / Wife
- Father / Mother / Son / Daughter
- Brother / Sister

**Extended family (✅ NEW — required for family-run detection):**

- Father-in-law / Mother-in-law
- Brother-in-law / Sister-in-law
- Uncle / Aunt / Nephew / Niece / Cousin
- Grandfather / Grandmother / Grandson / Granddaughter

**Non-family:**

- Business Partner (existing)
- **No relation** ← must be explicitly declared, not default
- Friend (existing)

---

## 7. STEP 3 — COMPANY BUSINESS PROFILE TAB (REDESIGNED)

### Tab structure for Company applicants

```
Company in Step 3 (Income & Credit modal):
  Tab 1: Business Profile    ← NEW card-style UI (replaces Yes/No toggles)
  Tab 2: Company Financials  ← income-level details
  Tab 3: Credit Score        ← company bureau score
  Tab 4: Obligations         ← existing CC/OD/term loans on company
```

### Tab 1: Business Profile — Card-Style Questions

Each question uses the **card-radio pattern** (2-column grid, icon + label, warm selected state). Same visual language as the questionnaire pages.

#### Question 1: Industry Sector

```
Which industry sector does this business belong to?  *

┌──────────────────────┐ ┌──────────────────────┐
│ 🏭 Manufacturing     │ │ 🛒 Trading           │
└──────────────────────┘ └──────────────────────┘
┌──────────────────────┐ ┌──────────────────────┐
│ 🏢 Services          │ │ 💻 IT / Technology   │
└──────────────────────┘ └──────────────────────┘
┌──────────────────────┐ ┌──────────────────────┐
│ ❤️ Healthcare        │ │ 🏗️ Construction /    │
│                      │ │    Real Estate       │
└──────────────────────┘ └──────────────────────┘
┌──────────────────────┐ ┌──────────────────────┐
│ 🌾 Agriculture /     │ │ ⊕ Other              │
│    Agri-business     │ │                      │
└──────────────────────┘ └──────────────────────┘
```

#### Question 2: Business Category (income source type)

```
What is the primary source of business income?  *

┌──────────────────────────┐ ┌──────────────────────────┐
│ 🏭 Manufacturer/Producer │ │ 🛒 Trading / Retailer    │
└──────────────────────────┘ └──────────────────────────┘
┌──────────────────────────┐ ┌──────────────────────────┐
│ 🔧 B2B / B2C Services   │ │ 💼 Commission Based      │
└──────────────────────────┘ └──────────────────────────┘
```

#### Question 3: Business Vintage

```
How long has this business been operational?  *

┌──────────────────────┐ ┌──────────────────────┐
│ ⚠️ Less than 1 year  │ │ 🕐 1–2 years         │
└──────────────────────┘ └──────────────────────┘
┌──────────────────────┐ ┌──────────────────────┐
│ 🕑 2–3 years         │ │ 🕒 3–5 years         │
└──────────────────────┘ └──────────────────────┘
┌──────────────────────┐ ┌──────────────────────┐
│ 🕔 5–10 years        │ │ 🏛️ Over 10 years     │
└──────────────────────┘ └──────────────────────┘
```

#### Question 4: GST Registration

```
Is the business GST registered?  *

┌──────────────────────┐ ┌──────────────────────┐
│ ✅ Yes — registered  │ │ ❌ No — not registered│
└──────────────────────┘ └──────────────────────┘
┌──────────────────────┐
│ ⊘ Exempted from GST  │
└──────────────────────┘
```

**Conditional follow-up** (if "Yes"):

```
When did you register for GST?  *
[MonthYear picker — e.g. Feb 2018]
```

#### Question 5: Annual Turnover

```
What is the approximate annual turnover?  *

┌──────────────────────┐ ┌──────────────────────┐
│ 📉 Below ₹25 Lakhs  │ │ 📈 ₹25L – ₹50 Lakhs │
└──────────────────────┘ └──────────────────────┘
┌──────────────────────┐ ┌──────────────────────┐
│ 📈 ₹50L – ₹1 Crore  │ │ 📈 ₹1Cr – ₹5 Crore  │
└──────────────────────┘ └──────────────────────┘
┌──────────────────────┐
│ 📈 Above ₹5 Crore   │
└──────────────────────┘
```

#### Question 6: Employee Count

```
How many employees does the business currently have?  *

┌──────────────────────┐ ┌──────────────────────┐
│ 👤 Solo / Self       │ │ 👥 1–5 employees     │
└──────────────────────┘ └──────────────────────┘
┌──────────────────────┐ ┌──────────────────────┐
│ 👥 6–20 employees    │ │ 👥 21–50 employees   │
└──────────────────────┘ └──────────────────────┘
┌──────────────────────┐
│ 🏢 Over 50 employees │
└──────────────────────┘
```

#### Question 7: Business Activity Indicators (replaces Yes/No toggles)

Instead of 10 separate Yes/No toggles, group into meaningful card selections:

```
How does this business manage its finances?  *
(select all that apply)

☑ Files ITR regularly (min 2 years)
☑ Has active current account
☑ Has valid GST registration
☐ Taken CC/OD or loan in last 12 months
☐ More than 40% of income is in cash
```

```
What best describes the business operations?  *
(select all that apply)

☑ Most income from 1–2 key clients (reputed firms/brands)
☐ Business is seasonal in nature
☑ Owns or rents a factory, workshop or warehouse
☑ Maintains visible inventory or stock with records
☐ Has additional income sources (rent, investment, etc.)
```

> 💡 These multi-select checkboxes replace the 10 individual Yes/No rows. Grouped by theme (financial management vs operations), each group has a natural heading. The data stored is identical — just the presentation changes from "audit form" to "tell us about your business."

---

## 8. FAMILY-RUN DERIVATION LOGIC

### Input

From the Relationship step, the system has:

- All director/partner pairs
- Each pair's declared relationship type
- Each director's ownership stake %

### Algorithm

```typescript
function deriveCompanyFamilyControl(
	companyId: string,
	directors: DirectorInfo[], // all directors (co-applicant or not)
	relationships: RelationshipPair[] // from relationship step
): FamilyControlResult {
	const FAMILY_RELATIONS = [
		'Husband of',
		'Wife of',
		'Father of',
		'Mother of',
		'Son of',
		'Daughter of',
		'Brother of',
		'Sister of',
		'Father-in-law of',
		'Mother-in-law of',
		'Brother-in-law of',
		'Sister-in-law of',
		'Uncle of',
		'Aunt of',
		'Nephew of',
		'Niece of',
		'Cousin of',
		'Grandfather of',
		'Grandmother of',
		'Grandson of',
		'Granddaughter of'
	];

	// Build adjacency graph of family connections
	const familyGraph = buildGraph(directors, relationships, FAMILY_RELATIONS);

	// Find largest connected component (family cluster)
	const clusters = findConnectedComponents(familyGraph);
	const largestCluster = clusters.sort((a, b) => b.length - a.length)[0];

	// Calculate metrics
	const familyStake = largestCluster.reduce((sum, d) => sum + d.ownershipPercent, 0);
	const familyRatio = largestCluster.length / directors.length;

	return {
		familyControlled: familyRatio >= 0.5, // >= 50% of directors in family cluster
		familyStakePercent: familyStake, // combined stake of family cluster
		familyClusterSize: largestCluster.length,
		totalDirectors: directors.length,
		outsiderCount: directors.length - largestCluster.length,
		familyClusterIds: largestCluster.map((d) => d.id),
		// Severity for rule engine
		dominance: familyStake >= 75 ? 'HIGH' : familyStake >= 50 ? 'MEDIUM' : 'LOW'
	};
}
```

### Rule engine integration

```typescript
// In payloadEnricher.ts — enriched per-company
companyProfile: {
  familyControlled: true,
  familyStakePercent: 75,
  familyDominance: 'HIGH',
  familyClusterSize: 3,
  outsiderCount: 1
}
```

### DSA guidance (dynamic, shown in right panel)

**When `familyControlled = true`:**

> ⚠ **Family-controlled entity detected**
> Directors 1, 2, 3 are related (combined stake: 75%). Lenders will treat this as a family-run business.
>
> **What this means:**
>
> - Every director's CIBIL will be pulled individually
> - A default/settlement on ANY director blocks the case
> - Income of all family directors is assessed
> - Don't skip any director as co-applicant

**When `familyControlled = false`:**

> Directors with significant stake (20%+) will be individually assessed. Other stakeholders provide natural checks and balances.

---

## 9. CARD-STYLE UI PATTERN

### ✅ Adopt this pattern (from questionnaire pages)

```
┌─────────────────────────┐  ┌─────────────────────────┐
│  🏭  Manufacturing      ○│  │  🛒  Trading            ○│
└─────────────────────────┘  └─────────────────────────┘
┌─────────────────────────┐  ┌─────────────────────────┐
│  🏢  Services           ○│  │  💻  IT / Technology    ○│
└─────────────────────────┘  └─────────────────────────┘
```

- 2-column grid (mobile: 1 column)
- Each card: icon + label + optional description
- Selected state: warm amber/primary border + fill + checkmark
- Unselected: light border, hover state
- Radio (single-select) or checkbox (multi-select) depending on question

### ❌ Replace this pattern (current Yes/No toggles)

```
┌────────────────────────────────────────┬──────┬──────┐
│ ✅ Has valid GST registration          │ Yes  │  No  │
├────────────────────────────────────────┼──────┼──────┤
│ ✅ Has active current account          │ Yes  │  No  │
├────────────────────────────────────────┼──────┼──────┤
│ ✅ Files ITR regularly (min 2 years)   │ Yes  │  No  │
└────────────────────────────────────────┴──────┴──────┘
```

The Yes/No pattern survives ONLY for true binary questions where both answers are equally valid and there's no "selection from options" involved (e.g., "Name on property?" stays as boolean select).

### Component reuse

The existing `RadioIcon.svelte` component already renders card-style radio buttons. The Business Profile tab should use the same component with options configured as card data. No new UI components needed — just new question configurations.

---

## 10. SECURED LOANS — MULTIPLE COMPANIES

Home/LAP/Plot loans can have mixed applicants:

```
Applicant 1: Ravi (Individual)
Applicant 2: ABC Pvt Ltd (Company) — 3 directors
Applicant 3: XYZ LLP (Company) — 2 partners
```

### Step 0.5 shows separate blocks per company

```
┌─ Directors of ABC Pvt Limited ──────────────────────────┐
│  Director 1: [Name] [Gender] [Age] [Stake%] [Loc] [Co?]│
│  Director 2: [Name] [Gender] [Age] [Stake%] [Loc] [Co?]│
│  Director 3: [Name] [Gender] [Age] [Stake%] [Loc] [Co?]│
│                                   Total: 100% accounted │
└─────────────────────────────────────────────────────────┘

┌─ Partners of XYZ LLP ──────────────────────────────────┐
│  Partner 1:  [Name] [Gender] [Age] [Stake%] [Loc] [Co?]│
│  Partner 2:  [Name] [Gender] [Age] [Stake%] [Loc] [Co?]│
│                                    Total: 80% accounted │
└─────────────────────────────────────────────────────────┘
```

### Each block:

- Labeled with company name
- Uses correct member label (Director/Partner/Trustee from ENTITY_MAP)
- Independent stake validation per company
- Directors from different companies can also have relationships declared in Step 1

### Step 3 — each company gets its own Business Profile tab

When the modal opens for "ABC Pvt Ltd", it shows:

- Tab 1: Business Profile (industry, category, vintage, GST, turnover, employees)
- Tab 2: Company Financials
- Tab 3: Company Credit
- Tab 4: Company Obligations

When the modal opens for "XYZ LLP", same tabs, independent data.

---

## 11. UNSECURED LOANS — BUSINESS LOAN DEDUP FIX

> **Status**: Parked for later. Documenting the fix here for reference.

### Current problem

```
businessProfilePage (Getting Started):
  → Entity type, industry sector, vintage, GST, turnover, employees

AddApplicantBusiness Step 0:
  → Company type (= entity type again), director count (again)
```

### Fix

```
Getting Started:
  → ONLY loan-level: purpose, amount, tenure, urgency

Applicants Step 0 (Company):
  → Company name, type, country, director count, family-relation flag

Applicants Step 0.5:
  → Director cards

Applicants Step 3:
  → Business Profile tab (industry, category, vintage, GST, turnover, employees)
  → Financials, Credit, Obligations
```

The standalone `businessProfilePage` is absorbed into Step 3. Same for `professionalProfilePage` — professional qualifications (which are identity-level: profession type, qualification, practice mode) stay in Step 0, while operational data (practice vintage, registration status) moves to Step 3.

---

## 12. DATA MODEL CHANGES

### New type: DirectorInfo

```typescript
// In src/lib/types/form.ts

interface DirectorInfo {
	id: string; // UUID
	fullName: string;
	gender: 'male' | 'female';
	age: number;
	ownershipPercent: number; // 1–100
	location: 'same_city' | 'same_state' | 'different_state';
	isCoApplicant: boolean;
	linkedCompanyId: string; // Company applicant's ID
	role: 'director' | 'partner' | 'trustee';
}
```

### Company applicant additions

```typescript
// Added to the Company applicant object in formState.applicants[]

interface CompanyApplicant {
	// Existing
	applicantType: 'Company';
	companyName: string;
	companyType: string;
	registerationCountry: string;
	numberOfDirectorsOrPartners: number;

	// NEW — Step 0
	hasRelatedDirectors: 'yes' | 'no'; // priming question

	// NEW — Step 0.5 (stored on company, not as separate applicants)
	directors: DirectorInfo[]; // ALL directors including non-co-applicants

	// NEW — Step 3 Business Profile tab
	industrySector: string;
	businessCategory: string;
	businessVintage: string; // range value
	gstRegistered: 'yes' | 'no' | 'exempted';
	gstRegistrationDate?: string; // month-year, if registered
	annualTurnover: string; // range value
	employeeCount: string; // range value

	// NEW — Step 3 Business Activity (multi-select)
	financialIndicators: string[]; // ['itr_filed', 'active_current_account', ...]
	operationalIndicators: string[]; // ['key_clients', 'owns_premises', ...]
}
```

### Individual applicant additions (when linked to a Company)

```typescript
// Added to Individual applicants who are directors/partners

interface LinkedDirectorFields {
	linkedCompanyId?: string; // which company they're a director of
	ownershipPercent?: number; // their stake
	role?: 'director' | 'partner' | 'trustee';
	isGuarantor?: 'Yes' | 'No';
}
```

### Family control derivation (stored on Company, computed)

```typescript
interface FamilyControlResult {
	familyControlled: boolean;
	familyStakePercent: number;
	familyDominance: 'HIGH' | 'MEDIUM' | 'LOW';
	familyClusterSize: number;
	totalDirectors: number;
	outsiderCount: number;
	familyClusterIds: string[];
}
```

---

## 13. AFFECTED FILES

### New files

| File                                               | Purpose                                    |
| -------------------------------------------------- | ------------------------------------------ |
| `src/lib/components/DirectorCards.svelte`          | Step 0.5 — Director/Partner detail cards   |
| `src/lib/components/CompanyBusinessProfile.svelte` | Step 3 Tab 1 — Card-style business profile |
| `src/lib/utils/familyControlDerivation.ts`         | Family-run detection algorithm             |

### Modified files

| File                                                    | Change                                                                      |
| ------------------------------------------------------- | --------------------------------------------------------------------------- |
| `src/lib/components/ApplicantFormSecured.svelte`        | Add Step 0.5 routing, pass companies to DirectorCards                       |
| `src/lib/components/ApplicantFormUnsecured.svelte`      | Add Step 0.5 routing                                                        |
| `src/lib/components/AddApplicant.svelte`                | Add `numberOfDirectorsOrPartners` + `hasRelatedDirectors` to Company fields |
| `src/lib/components/AddApplicantBusiness.svelte`        | Remove inline director capture → replaced by Step 0.5                       |
| `src/lib/components/AddApplicantProfessional.svelte`    | Remove inline partner capture → replaced by Step 0.5                        |
| `src/lib/components/RelationShip.svelte`                | Remove Individual-only filter, add non-co-applicant director support        |
| `src/lib/components/IncomePageNew.svelte`               | Add Company detection → route to Business Profile tab                       |
| `src/lib/components/IncomeTabContent.svelte`            | Add CompanyBusinessProfile tab rendering                                    |
| `src/lib/types/form.ts`                                 | Add DirectorInfo, CompanyApplicant fields, FamilyControlResult              |
| `src/lib/config/applicantBasicDetailsSecuredLoans.json` | Add director count + related-directors questions for Company                |
| `src/lib/ruleEngine/payloadEnricher.ts`                 | Enrich company profile with family control data                             |
| `src/lib/components/relationship-capture/types.ts`      | Add extended family relationship types                                      |

### Archived (replaced by new components)

| File                                  | Replaced by                                    |
| ------------------------------------- | ---------------------------------------------- |
| `src/lib/components/Directors.svelte` | `DirectorCards.svelte` (archive, don't delete) |

---

## 14. IMPLEMENTATION SEQUENCE

### Phase 1: Foundation (Types + Director Cards)

| Step | Task                                                                                            | Depends on |
| ---- | ----------------------------------------------------------------------------------------------- | ---------- |
| 1.1  | Add `DirectorInfo`, `CompanyApplicant` fields, `FamilyControlResult` to `src/lib/types/form.ts` | —          |
| 1.2  | Build `DirectorCards.svelte` component (Step 0.5)                                               | 1.1        |
| 1.3  | Add `numberOfDirectorsOrPartners` + `hasRelatedDirectors` to secured JSON config                | —          |
| 1.4  | Wire Step 0.5 into `ApplicantFormSecured.svelte` routing                                        | 1.2, 1.3   |
| 1.5  | Wire Step 0.5 into `ApplicantFormUnsecured.svelte` routing                                      | 1.2        |
| 1.6  | Refactor `AddApplicantBusiness.svelte` — remove inline director capture, delegate to Step 0.5   | 1.4        |
| 1.7  | Refactor `AddApplicantProfessional.svelte` — same                                               | 1.5        |

### Phase 2: Relationship Enhancement

| Step | Task                                                         | Depends on |
| ---- | ------------------------------------------------------------ | ---------- |
| 2.1  | Add extended family types to `relationship-capture/types.ts` | —          |
| 2.2  | Remove Individual-only filter in `RelationShip.svelte`       | —          |
| 2.3  | Add non-co-applicant director support to Relationship step   | 1.2        |
| 2.4  | Build `familyControlDerivation.ts` utility                   | 2.1        |
| 2.5  | Show family-control banner in Relationship step              | 2.4        |

### Phase 3: Business Profile Redesign (Step 3)

| Step | Task                                                                           | Depends on |
| ---- | ------------------------------------------------------------------------------ | ---------- |
| 3.1  | Build `CompanyBusinessProfile.svelte` with card-style questions                | —          |
| 3.2  | Wire into `IncomeTabContent.svelte` as Tab 1 for Company applicants            | 3.1        |
| 3.3  | Remove `businessCategory` from `applicantBasicDetailsSecuredLoans.json` Step 0 | 3.2        |
| 3.4  | Integrate family control data into `payloadEnricher.ts`                        | 2.4        |
| 3.5  | Add DSA guidance for family-controlled entities                                | 2.4        |

### Phase 4: Business Loan Dedup (parked — do after Phases 1–3)

| Step | Task                                                                      | Depends on |
| ---- | ------------------------------------------------------------------------- | ---------- |
| 4.1  | Remove `businessProfilePage` from business loan schema                    | 3.2        |
| 4.2  | Remove duplicate entity type / director count from `AddApplicantBusiness` | 1.6        |
| 4.3  | Move professional operational data to Step 3                              | 3.2        |
| 4.4  | Clean up wizard sections for all 3 unsecured loan types                   | 4.1–4.3    |

---

## APPENDIX A: Card-Style Component Specification

The card-style radio/checkbox pattern used throughout this spec follows the existing `RadioIcon.svelte` visual language:

```
UNSELECTED STATE:
┌─────────────────────────────────┐
│  [icon]  Label Text           ○ │
│          Optional description    │
└─────────────────────────────────┘
Border: gray-300, Background: white

SELECTED STATE:
┌─────────────────────────────────┐
│  [icon]  Label Text           ✓ │   ← primary gradient fill
│          Optional description    │
└─────────────────────────────────┘
Border: transparent, Background: primary gradient
Text: white, Shadow: warm glow

HOVER STATE:
Border: primary/50, Background: gray-50
Transform: translateY(-1px)

ERROR STATE (required, nothing selected):
Border: red-400, Background: red-50
```

Grid: `grid-cols-2` desktop, `grid-cols-1` mobile.
Component: Reuse `RadioIcon.svelte` with extended options config. For multi-select (activity indicators), build `CheckboxCardGroup.svelte` with same visual pattern.

---

## APPENDIX B: Relationship Types — Complete List

```typescript
export const RELATIONSHIP_TYPES = [
	// Immediate family
	'Husband of',
	'Wife of',
	'Father of',
	'Mother of',
	'Son of',
	'Daughter of',
	'Brother of',
	'Sister of',

	// Extended family (NEW)
	'Grandfather of',
	'Grandmother of',
	'Grandson of',
	'Granddaughter of',
	'Uncle of',
	'Aunt of',
	'Nephew of',
	'Niece of',
	'Cousin of',
	'Father-in-law of',
	'Mother-in-law of',
	'Son-in-law of',
	'Daughter-in-law of',
	'Brother-in-law of',
	'Sister-in-law of',

	// Non-family
	'Business partner of',
	'Friend of',
	'No relation' // ← must be explicitly declared
] as const;
```
