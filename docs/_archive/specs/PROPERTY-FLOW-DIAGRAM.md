# Property Questions — Complete Flow Diagram

> Generated: 2026-03-18 | All branching paths through property questions

## MASTER FLOW: Entry Point

```
START
  │
  ├─── Loan Type? ─────────────────────────────────────────────────────────┐
  │                                                                        │
  │    ┌──────────────┐         ┌────────────────────────────────────┐     │
  │    │  NEW LOAN    │         │  BT / BT+Top-up / Top-up Only     │     │
  │    └──────┬───────┘         └──────────────┬─────────────────────┘     │
  │           │                                │                           │
  │           ▼                                ▼                           │
  │    Property Identified?              Go to FLOW-BT ──────────────►[B] │
  │    ┌─────┴─────┐                                                      │
  │    │           │                                                      │
  │    ▼           ▼                                                      │
  │   YES          NO                                                     │
  │    │           │                                                      │
  │    │        Area Type?                                                │
  │    │        (skip purchase type,                                      │
  │    │         skip special zone,                                       │
  │    │         skip usage intent)                                       │
  │    │           │                                                      │
  │    │        Location (state/city)                                     │
  │    │           │                                                      │
  │    │        ► LIMITED FLOW — only area type                           │
  │    │          + location collected.                                    │
  │    │          Character + Compliance                                   │
  │    │          pages still visible.                                     │
  │    │                                                                  │
  │    ▼                                                                  │
  │   FLOW-NEW-LOAN ──────────────────────────────────────────────► [A]   │
  └───────────────────────────────────────────────────────────────────────┘
```

---

## [A] FLOW — NEW LOAN (Property Identified = Yes)

```
AREA TYPE? ──────────────────────────────────────────────────────────────
  │
  ├─── PLANNED_AUTHORITY (PL) ──────────────────────────────► [A1]
  │
  ├─── CONVERTED_RESIDENTIAL (CR) ──────────────────────────► [A2]
  │
  ├─── OLD_MUNICIPAL (OM) ─────────────────────────────────► [A3]
  │
  ├─── LOCAL_COLONY (LC) ──────────────────────────────────► [A4]
  │
  └─── UNKNOWN (UN) ───────────────────────────────────────► [A5]
```

---

### [A1] PLANNED AUTHORITY — New Loan

```
Area = PLANNED_AUTHORITY, Loan = New Loan
  │
  ▼
PURCHASE TYPE? (4 options)
  │
  ├─── direct_from_authority (AUTH) ───────────────────────► [A1-AUTH]
  │
  ├─── direct_from_builder (BLD) ─────────────────────────► [A1-BLD]
  │
  ├─── resale_endorsement (RE) ───────────────────────────► [A1-RE]
  │
  └─── resale_normal (RN) ────────────────────────────────► [A1-RN]
```

#### [A1-AUTH] Planned + Direct from Authority
```
Purchase = AUTH, Area = PL
  │
  ├── Location (state/city/area/pincode)
  ├── Special Zone? (Cantonment/CRZ/Tribal/None)
  ├── Usage Intent (self/investment/both)
  │
  ├── Construction Type (House/Flat/Floor)
  ├── Carpet Area
  ├── [builderRole: HIDDEN — not a builder purchase]
  ├── [reraStatus: HIDDEN — not a builder purchase]
  │
  ├── PropertyStage? ◄── user must answer
  │   ├── Under Construction ──────────────────────────► [UC-PATH]
  │   └── Ready To Move ──────────────────────────────► [RTM-PATH]
  │
  │   ── COMPLIANCE PAGE ──
  ├── Compliance: built as per authority plan? (q1a)
  │   ├── fully_compliant
  │   ├── authorized_not_per_plan ⚠️
  │   └── not_authorized 🛑
  │
  │   IF PropertyStage = RTM:
  │   ├── OC/CC available? (Flat/Floor only)
  │   ├── Municipal approval? (House only)
  │   └── Authority granted possession?
  │
  │   IF PropertyStage = UC:
  │   ├── RERA registered? (reraRegistrationStatus)
  │   ├── Construction progress %
  │   ├── Expected completion date (Flat/Floor)
  │   ├── Builder track record
  │   └── Project approvals (Flat/Floor)
  │
  ├── [RERA on Compliance: YES — Area=PL]
  ├── [Seller page: HIDDEN — not a resale]
  └── ► AUTHORITY PAGE (6 authority-specific questions)
```

#### [A1-BLD] Planned + Direct from Builder
```
Purchase = BLD, Area = PL
  │
  ├── Location (state/city/area/pincode)
  ├── Special Zone?
  ├── Usage Intent
  │
  ├── Construction Type
  ├── Carpet Area
  ├── Builder Role? (Developer / Contractor / JDA) ◄── NEW
  ├── RERA Status? (registered/not/not needed/unknown) ◄── NEW (on Character)
  │   └── If NOT registered → Project Lenders? ◄── NEW
  │
  ├── PropertyStage? ◄── user must answer
  │   ├── Under Construction ──────────────────────────► [UC-PATH]
  │   └── Ready To Move ──────────────────────────────► [RTM-PATH]
  │
  │   ── COMPLIANCE PAGE ──
  ├── Compliance: built as per authority plan? (q1a)
  │
  │   IF PropertyStage = RTM:
  │   ├── OC/CC available? (Flat/Floor)
  │   ├── Municipal approval? (House)
  │   └── Authority granted possession?
  │
  │   IF PropertyStage = UC:
  │   ├── RERA registered? (reraRegistrationStatus) ◄── ⚠️ DUPLICATE of reraStatus!
  │   ├── Construction progress %
  │   ├── Expected completion
  │   ├── Builder track record
  │   └── Project approvals
  │
  ├── [Seller page: HIDDEN — not a resale]
  └── [Authority page: HIDDEN — not from authority]
```

#### [A1-RE] Planned + Resale via Endorsement
```
Purchase = RE, Area = PL
  │
  ├── Location, Special Zone, Usage Intent
  │
  ├── Construction Type
  ├── Carpet Area
  ├── Builder Role? (Developer / Contractor / JDA) ◄── NEW
  ├── RERA Status? ◄── NEW
  │   └── If NOT registered → Project Lenders?
  │
  ├── PropertyStage? ◄── user must answer
  │   ├── Under Construction ─────► [UC-PATH]
  │   └── Ready To Move ─────────► [RTM-PATH]
  │
  │   ── COMPLIANCE ──
  ├── Compliance (q1a)
  ├── [RTM]: OC/CC or Municipal approval
  ├── [UC]: RERA (reraRegistrationStatus) ◄── ⚠️ DUPLICATE
  ├── [UC]: Progress, completion, track record, approvals
  │
  └── ► SELLER PAGE (9 resale seller questions)
```

#### [A1-RN] Planned + Resale Normal
```
Purchase = RN, Area = PL
  │
  ├── Location, Special Zone, Usage Intent
  │
  ├── Construction Type
  ├── Carpet Area
  ├── [builderRole: HIDDEN — not a builder purchase]
  ├── [reraStatus: HIDDEN — not a builder purchase]
  │
  ├── PropertyStage = "Ready To Move" ◄── AUTO-SET via flagKey (hidden)
  │
  ├── Property Age? ◄── ONLY shown for RN (and BT with registry)
  │   └── Options: 0-5, 6-10, 11-15, 16-20, 21-25, 26-30, 30+
  │
  │   ── COMPLIANCE ──
  ├── Compliance (q1a)
  ├── OC/CC available? (Flat/Floor)
  ├── Municipal approval? (House)
  ├── RERA registered? (reraRegistrationStatus) ◄── shown for PL area
  │
  ├── [UC questions: HIDDEN — RTM auto-set]
  │
  └── ► SELLER PAGE (9 resale seller questions)
```

---

### [A2] CONVERTED RESIDENTIAL — New Loan

```
Area = CONVERTED_RESIDENTIAL, Loan = New Loan
  │
  ▼
PURCHASE TYPE? (3 options — no authority option)
  │
  ├─── direct_from_builder (BLD)
  ├─── resale_endorsement (RE)
  └─── resale_normal (RN)
```

#### [A2-BLD] Converted + Builder
```
Purchase = BLD, Area = CR
  │
  ├── Location, Usage Intent
  ├── [Special Zone: SHOWN]
  │
  ├── Construction Type, Carpet Area
  ├── Builder Role? ◄── NEW
  ├── RERA Status? ◄── NEW
  │   └── If NOT registered → Project Lenders?
  │
  ├── PropertyStage?
  │   ├── UC ─────► [UC-PATH]
  │   └── RTM ───► [RTM-PATH]
  │
  │   ── COMPLIANCE (CR-specific) ──
  ├── NA Conversion: land converted from agricultural? (q1b — binds to propertyComplianceStatus)
  │   ├── fully_compliant (NA done)
  │   ├── authorized_not_per_plan (pending) ⚠️
  │   └── not_authorized (still agricultural) 🛑 → most banks reject
  │
  ├── NA Conversion order status? (q6_naConversionStatus)
  │   ├── REGISTERED / APPLIED / NOT_STARTED / NOT_REQUIRED
  │
  ├── Zone classification? (q7 — Residential/Commercial/Mixed)
  │
  │   IF RTM:
  │   ├── OC/CC? (Flat/Floor, only if compliance = fully_compliant)
  │   └── Municipal approval? (House, only if compliance = fully_compliant)
  │
  │   IF UC:
  │   ├── Construction progress, Expected completion
  │   ├── Builder track record, Project approvals
  │
  ├── [RERA on Compliance: HIDDEN — only for PL area]
  └── [Authority page: HIDDEN]
```

#### [A2-RE] Converted + Resale Endorsement
```
Same as A2-BLD but:
  ├── Builder Role shown (RE triggers it)
  └── ► SELLER PAGE shown (resale)
```

#### [A2-RN] Converted + Resale Normal
```
Purchase = RN, Area = CR
  │
  ├── Location, Special Zone, Usage Intent
  ├── Construction Type, Carpet Area
  ├── [builderRole: HIDDEN]
  ├── PropertyStage = RTM (auto-set)
  ├── Property Age? ◄── shown (resale)
  │
  │   ── COMPLIANCE (CR) ──
  ├── NA conversion compliance (q1b)
  ├── NA conversion order (q6)
  ├── Zone classification (q7)
  ├── OC/CC? (Flat/Floor if compliant)
  ├── Municipal approval? (House if compliant)
  │
  └── ► SELLER PAGE
```

---

### [A3] OLD MUNICIPAL — New Loan

```
Area = OLD_MUNICIPAL, Loan = New Loan
  │
  ▼
PURCHASE TYPE? (3 options)
  │
  ├─── direct_from_builder (BLD)
  ├─── resale_endorsement (RE)
  └─── resale_normal (RN)
```

#### [A3-BLD] Old Municipal + Builder
```
Purchase = BLD, Area = OM
  │
  ├── Location, Usage Intent, Special Zone
  ├── Construction Type, Carpet Area
  ├── Builder Role? ◄── NEW
  ├── RERA Status? ◄── NEW
  │   └── If NOT registered → Project Lenders?
  │
  ├── PropertyStage?
  │   ├── UC ─────► [UC-PATH]
  │   └── RTM ───► [RTM-PATH]
  │
  │   ── COMPLIANCE (OM-specific) ──
  ├── Municipal records valid? (q1c — binds to propertyComplianceStatus)
  │   ├── fully_compliant / authorized_not_per_plan / not_authorized
  │
  ├── Municipal tax paid? (q8)
  │   ├── PAID_REGULAR / PAID_IRREGULAR / UNPAID / UNKNOWN
  │
  │   IF RTM:
  │   ├── Unauthorized additions? (q9 — after tax answered)
  │   │   ├── NONE / MINOR / MAJOR / UNKNOWN
  │   ├── OC/CC? (Flat/Floor)
  │   └── Municipal approval? (House)
  │
  │   IF UC:
  │   ├── Construction progress, Expected completion
  │   ├── Builder track record, Project approvals
  │
  ├── [RERA on Compliance: HIDDEN — only PL area]
  ├── [NA conversion: HIDDEN — only CR area]
  └── [Colony questions: HIDDEN — only LC area]
```

#### [A3-RN] Old Municipal + Resale Normal
```
Purchase = RN, Area = OM
  │
  ├── Location, Special Zone, Usage Intent
  ├── Construction Type, Carpet Area
  ├── [builderRole: HIDDEN]
  ├── PropertyStage = RTM (auto-set)
  ├── Property Age?
  │
  │   ── COMPLIANCE (OM) ──
  ├── Municipal records? (q1c)
  ├── Municipal tax? (q8)
  ├── Unauthorized additions? (q9) ◄── RTM, so shown
  ├── OC/CC? (Flat/Floor)
  ├── Municipal approval? (House)
  │
  └── ► SELLER PAGE
```

---

### [A4] LOCAL COLONY — New Loan

```
Area = LOCAL_COLONY, Loan = New Loan
  │
  ▼
PURCHASE TYPE? (3 options)
  │
  ├─── direct_from_builder (BLD)
  ├─── resale_endorsement (RE)
  └─── resale_normal (RN)
```

#### [A4-BLD] Local Colony + Builder
```
Purchase = BLD, Area = LC
  │
  ├── Location, Usage Intent, Special Zone
  ├── Construction Type, Carpet Area
  ├── Builder Role? ◄── NEW
  ├── RERA Status? ◄── NEW
  │   └── If NOT registered → Project Lenders?
  │
  ├── PropertyStage?
  │   ├── UC ─────► [UC-PATH]
  │   └── RTM ───► [RTM-PATH]
  │
  │   ── COMPLIANCE (LC-specific) ──
  ├── Colony recognised/regularized? (q1d — binds to propertyComplianceStatus)
  │   ├── fully_compliant / authorized_not_per_plan / not_authorized
  │
  ├── Revenue records status? (q10)
  │   ├── AVAILABLE_CURRENT / AVAILABLE_OUTDATED / NOT_AVAILABLE / UNKNOWN
  │
  ├── Colony regularization status? (q11)
  │   ├── REGULARIZED / PENDING / NOT_REGULARIZED / UNKNOWN
  │
  ├── Gram Panchayat permission? (q12)
  │   ├── YES / NO / NOT_REQUIRED / UNKNOWN
  │
  │   IF UC:
  │   ├── Construction progress, Expected completion
  │   ├── Builder track record, Project approvals
  │
  │   IF RTM:
  │   ├── [OC/CC: HIDDEN — LC area typically doesn't have OC/CC]
  │   └── [Municipal approval: HIDDEN — not municipal area]
  │
  ├── [RERA on Compliance: HIDDEN]
  ├── [NA conversion: HIDDEN]
  └── [Municipal tax/additions: HIDDEN]
```

#### [A4-RN] Local Colony + Resale Normal
```
Purchase = RN, Area = LC
  │
  ├── Location, Special Zone, Usage Intent
  ├── Construction Type, Carpet Area
  ├── [builderRole: HIDDEN]
  ├── PropertyStage = RTM (auto-set)
  ├── Property Age?
  │
  │   ── COMPLIANCE (LC) ──
  ├── Colony recognised? (q1d)
  ├── Revenue records? (q10)
  ├── Colony regularization? (q11)
  ├── Gram Panchayat? (q12)
  │
  └── ► SELLER PAGE
```

---

### [A5] UNKNOWN AREA — New Loan

```
Area = UNKNOWN, Loan = New Loan
  │
  ├── Location, Special Zone, Usage Intent
  │
  ├── Purchase Type (3 options — same as non-PL)
  │   ├── BLD → Builder Role, RERA, PropertyStage?
  │   ├── RE  → Builder Role, RERA, PropertyStage? + SELLER PAGE
  │   └── RN  → PropertyStage auto-set RTM, Age + SELLER PAGE
  │
  ├── Construction Type, Carpet Area
  │
  │   ── COMPLIANCE ──
  ├── Generic compliance check (q1e — fallback)
  │   ├── fully_compliant / authorized_not_per_plan / not_authorized
  │
  │   IF UC: progress, completion, builder, approvals
  │   IF RTM: OC/CC (Flat/Floor), Municipal approval (House)
  │
  └── [No area-specific deep compliance questions]
```

---

## [B] FLOW — BALANCE TRANSFER / TOP-UP

```
Loan = BT / BT+Top-up / Top-up Only
  │
  ▼
  ── BT REGISTRY PAGE (always shown for BT) ──
  │
  ├── Registry done in owner's name?
  │   │
  │   ├── YES ──────────────────────────────────────────┐
  │   │   │                                             │
  │   │   ├── 6 months since registry?                  │
  │   │   │   ├── Yes                                   │
  │   │   │   └── No ⚠️                                │
  │   │   │                                             │
  │   │   ├── PropertyStage = HIDDEN                    │
  │   │   │   (auto: RTM implied by registry done)      │
  │   │   │                                             │
  │   │   └── Property Age? ◄── shown (registry = yes)  │
  │   │                                                 │
  │   └── NO ───────────────────────────────────────────┐
  │       │                                             │
  │       ├── Possession & demand status?               │
  │       │   ├── POSSESSION_NO_DEMAND                  │
  │       │   ├── POSSESSION_WITH_DEMAND                │
  │       │   │   └── Outstanding demand amount?        │
  │       │   ├── NO_POSSESSION_NO_DEMAND               │
  │       │   └── NO_POSSESSION_WITH_DEMAND             │
  │       │       └── Outstanding demand amount?        │
  │       │                                             │
  │       └── PropertyStage? ◄── user must answer       │
  │           ├── UC ──► [UC-PATH]                      │
  │           └── RTM ─► [RTM-PATH]                     │
  │                                                     │
  ▼                                                     │
  ── LOCATION PAGE ──                                   │
  │                                                     │
  ├── Area Type?                                        │
  │   ├── PL / CR / OM / LC / UN                        │
  │                                                     │
  ├── [Purchase Type: HIDDEN — BT has no purchase type] │
  ├── Location (state/city/area/pincode)                │
  ├── [Special Zone: HIDDEN — only for NL]              │
  ├── [Usage Intent: HIDDEN — only for NL with propId]  │
  │                                                     │
  ▼                                                     │
  ── CHARACTER PAGE ──                                  │
  │                                                     │
  ├── Construction Type                                 │
  ├── Carpet Area                                       │
  ├── [builderRole: HIDDEN — no purchase type for BT]   │
  ├── [reraStatus: HIDDEN — no purchase type for BT]    │
  │                                                     │
  ├── PropertyStage (if registry=No)                    │
  │   OR hidden (if registry=Yes, implied RTM)          │
  │                                                     │
  ├── Property Age (if registry=Yes)                    │
  │                                                     │
  ▼                                                     │
  ── COMPLIANCE PAGE ──                                 │
  │  (same area-based branching as New Loan)            │
  │                                                     │
  ├── Area=PL → q1a compliance + RERA                   │
  ├── Area=CR → q1b compliance + NA + Zone              │
  ├── Area=OM → q1c compliance + Tax + Additions        │
  ├── Area=LC → q1d compliance + Revenue + Colony + GP  │
  ├── Area=UN → q1e generic compliance                  │
  │                                                     │
  ├── IF UC: progress, completion, builder, approvals   │
  ├── IF RTM: OC/CC, Municipal approval                 │
  │                                                     │
  └── [Seller page: HIDDEN — BT has no seller]          │
      [Authority page: HIDDEN — BT has no authority]    │
```

---

## COMMON SUB-FLOWS

### [UC-PATH] Under Construction Questions
```
PropertyStage = Under Construction
  │
  ├── Construction progress % (0-25 / 25-50 / 50-75 / 75-90 / 90-99)
  ├── Expected completion date (Flat/Floor only)
  ├── Builder track record (optional)
  ├── Project approvals in place? (Flat/Floor only)
  │
  └── IF Area = PL:
      └── RERA registered? (reraRegistrationStatus)
          ├── REGISTERED
          ├── NOT_REGISTERED ⚠️ "Banks won't finance UC without RERA"
          ├── EXEMPTED
          └── UNKNOWN
```

### [RTM-PATH] Ready To Move Questions
```
PropertyStage = Ready To Move
  │
  ├── IF constructionType = Flat/Floor:
  │   └── OC/CC available? (BOTH / CC_ONLY / NONE / UNKNOWN)
  │
  ├── IF constructionType = House:
  │   └── House built with sanctioned plan? (APPROVED / PARTIAL / NO_PLAN / UNKNOWN)
  │
  └── IF purchase = BLD/AUTH + Loan = NL + Stage = RTM:
      └── Authority granted possession? (Yes / No)
```

---

## COMPLETE SCENARIO COUNT

```
LOAN TYPE (4) × AREA (5) × PURCHASE (4) × STAGE (2) × CONSTRUCTION (3) × REGISTRY (2)

But most combinations are invalid. Valid paths:

NEW LOAN paths:
  PL  × (AUTH, BLD, RE, RN) × (UC, RTM*) × (House, Flat, Floor) = 4×2×3 = 24
  CR  × (BLD, RE, RN)       × (UC, RTM*) × (House, Flat, Floor) = 3×2×3 = 18
  OM  × (BLD, RE, RN)       × (UC, RTM*) × (House, Flat, Floor) = 3×2×3 = 18
  LC  × (BLD, RE, RN)       × (UC, RTM*) × (House, Flat, Floor) = 3×2×3 = 18
  UN  × (BLD, RE, RN)       × (UC, RTM*) × (House, Flat, Floor) = 3×2×3 = 18
                                                                    ────────
  * RN auto-sets RTM, so effectively 1 stage option              Total: 96 paths

BT/TOP-UP paths:
  (BT, BTT, TU) × (PL, CR, OM, LC, UN) × (Reg Yes/No) × (UC, RTM) × (H, Fl, Fl)
  = 3 × 5 × 2 × 2 × 3 = 180 paths (but Reg=Yes forces RTM, so ~135 effective)

GRAND TOTAL: ~230 unique valid paths
```

---

## QUESTION COUNT PER SCENARIO (Representative)

| Scenario | Loc | Char | BT | Compl | Seller/Auth | TOTAL |
|----------|-----|------|----|-------|-------------|-------|
| NL + PL + AUTH + UC + Flat | 4 | 3 | 0 | 7 | 6 | **20** |
| NL + PL + AUTH + RTM + House | 4 | 3 | 0 | 5 | 6 | **18** |
| NL + PL + BLD + UC + Flat | 4 | 6 | 0 | 7 | 0 | **17** |
| NL + PL + BLD + RTM + Flat | 4 | 6 | 0 | 5 | 0 | **15** |
| NL + PL + RE + UC + Flat | 4 | 6 | 0 | 7 | 9 | **26** |
| NL + PL + RN + RTM + Flat | 4 | 4 | 0 | 4 | 9 | **21** |
| NL + CR + BLD + UC + Flat | 3 | 6 | 0 | 5 | 0 | **14** |
| NL + CR + RN + RTM + House | 3 | 4 | 0 | 5 | 9 | **21** |
| NL + OM + BLD + RTM + House | 3 | 6 | 0 | 5 | 0 | **14** |
| NL + OM + RN + RTM + Flat | 3 | 4 | 0 | 4 | 9 | **20** |
| NL + LC + BLD + UC + House | 3 | 6 | 0 | 7 | 0 | **16** |
| NL + LC + RN + RTM + House | 3 | 4 | 0 | 5 | 9 | **21** |
| BT + PL + RegY + RTM + Flat | 3 | 3 | 2 | 4 | 0 | **12** |
| BT + CR + RegN + UC + House | 3 | 3 | 3 | 5 | 0 | **14** |
| BT + OM + RegY + RTM + House | 3 | 3 | 2 | 5 | 0 | **13** |
| BT + LC + RegN + UC + Flat | 3 | 3 | 3 | 7 | 0 | **16** |

---

## OVERLAP / DUPLICATION MAP

```
RERA Question appears in TWO places:
  ┌─────────────────────────────────────────────────────────────┐
  │ CHARACTER PAGE (new q1d_reraStatus)                         │
  │   bindsTo: reraStatus                                       │
  │   Values: rera_registered, not_registered, not_required,    │
  │           not_known                                         │
  │   Visible: purchaseType IN [BLD, RE] + builderRole answered │
  │   Scope: ALL area types                                     │
  └───────────────────┬─────────────────────────────────────────┘
                      │ ⚠️ OVERLAP
  ┌───────────────────┴─────────────────────────────────────────┐
  │ COMPLIANCE PAGE (existing q5_reraRegistrationStatus)        │
  │   bindsTo: reraRegistrationStatus                           │
  │   Values: REGISTERED, NOT_REGISTERED, EXEMPTED, UNKNOWN     │
  │   Visible: Area=PL + Loan=NL/BT/BTT                        │
  │   Scope: PLANNED_AUTHORITY only                             │
  └─────────────────────────────────────────────────────────────┘

BUILDER Questions appear in TWO places:
  Character: builderRole (Developer/Contractor/JDA)
  Compliance: builderTrackRecord (excellent/good/fair/poor/unknown)
  Compliance: projectApprovals (Yes/No/Unknown)

These are NOT duplicates — different concerns:
  builderRole = WHO is selling (transaction nature)
  builderTrackRecord = HOW reliable (risk assessment)
  projectApprovals = WHAT approvals exist (compliance)
```

---

## IMPOSSIBLE / INVALID COMBINATIONS

These combinations CANNOT occur due to showWhen logic:

| Combination | Why Invalid |
|-------------|------------|
| RN + UC | Resale normal auto-sets RTM via flagKey |
| AUTH + non-PL area | Authority option only in planned area |
| BT + purchaseType | BT has no purchase type question |
| BT + specialAreaRestriction | Only for NL |
| BT + usageIntent | Only for NL with propIdentified |
| BT + sellerPage | No seller in BT |
| BT + authorityPage | No authority in BT |
| Registry=Yes + PropertyStage question | Hidden (implied RTM) |
| Registry=Yes + UC | Can't be UC if registry done |
| propertyComplianceStatus=not_authorized + OC/CC | OC/CC hidden |
| Area=CR + compliance=not_authorized + OC/CC | Blocked (need NA first) |
| Area=LC + OC/CC question | OC/CC requires Flat/Floor + specific compliance — LC typically won't trigger |
| propertyAge + (NL + non-RN + non-BT) | Age only for RN and BT-with-registry |

---

## NOTES FOR RESTRUCTURING

1. **Character page does too much now** — physical details + builder identity + RERA + construction stage
2. **Compliance page is the right place for RERA** — but currently scoped to PL area only
3. **Builder role is a transaction concern** — closer to purchase type than compliance
4. **Property age is a physical concern** — but gated by transaction type (RN/BT)
5. **The 5 compliance variants (q1a-q1e)** work well — they're mutually exclusive
6. **LC area has the most deep compliance questions** (4 cascading: colony → revenue → regularization → panchayat)
7. **UC path always needs**: progress, completion date, builder track record, approvals + RERA (if PL)
8. **RTM path always needs**: OC/CC (Flat/Floor) OR municipal approval (House)
