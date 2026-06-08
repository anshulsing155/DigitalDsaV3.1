# Property Questions — Clean Logical Flow (Domain-Aware)

> Generated: 2026-03-18 | All impossible paths eliminated with real-world reasoning

---

## DOMAIN RULES (Why paths are impossible)

| # | Rule | Reasoning |
|---|------|-----------|
| R1 | AUTH cannot exist in special zones | Authority IS the planner — Cantonment/CRZ/Tribal are outside their jurisdiction |
| R2 | AUTH cannot deviate from plan | Authority approved the plan themselves — compliance question is redundant |
| R3 | AUTH does not need RERA | RERA is for private builders/developers, not government authorities |
| R4 | AUTH never has a "builder" | Authority allots directly — no builder role question needed |
| R5 | RN is always RTM | If registry is done (normal resale), property must be complete |
| R6 | RN never has a builder | Normal resale is person-to-person, no builder involved |
| R7 | BT has no purchase type | You already own it — "who did you buy from" is irrelevant |
| R8 | BT has no seller | No new seller in a refinance |
| R9 | BT+Registry=Yes forces RTM | If registered, property is complete |
| R10 | AUTH only exists in PL area | Development authorities only operate in planned areas |
| R11 | Tribal zone = almost no bank funding | Land can't be mortgaged in Schedule V areas — only specialized NBFCs |
| R12 | CR+not_authorized = no further questions | If land isn't even converted, no bank will touch it — stop asking |
| R13 | LC has no OC/CC concept | Local colonies don't have municipal OC/CC process |
| R14 | LC + RERA = not applicable | RERA doesn't apply to informal/panchayat areas |
| R15 | Non-RERA UC = registry-based stage | UC = registry not possible yet; RTM = registry possible |
| R16 | Non-PL area + Flat = rare but possible | Builder floors common everywhere, but multi-story flats rare in LC/OM |
| R17 | Endorsement implies builder/authority involved | RE always involves a builder or authority allotment transfer |
| R18 | Builder(Contractor) + non-PL = higher risk | Land ownership unclear, banks need extra verification |
| R19 | AUTH + property age = irrelevant for new allotment | Authority allots new properties — age doesn't apply |

---

## MASTER ENTRY POINT

```
START ─── What type of loan?
  │
  ├── NEW LOAN ──────────────────────────────────────► FLOW [A]
  │     │
  │     └── Property Identified?
  │           ├── YES → full flow (all questions)
  │           └── NO  → limited flow (area + location only, no purchase/zone/usage)
  │
  └── BT / BT+Top-up / Top-up ─────────────────────► FLOW [B]
```

---

## [A] NEW LOAN FLOW

```
Step 1: AREA TYPE
━━━━━━━━━━━━━━━━━

  ┌─ PLANNED_AUTHORITY (PL) ──────────► 4 purchase options (AUTH/BLD/RE/RN)
  ├─ CONVERTED_RESIDENTIAL (CR) ──────► 3 purchase options (BLD/RE/RN)
  ├─ OLD_MUNICIPAL (OM) ─────────────► 3 purchase options (BLD/RE/RN)
  ├─ LOCAL_COLONY (LC) ──────────────► 3 purchase options (BLD/RE/RN)
  └─ UNKNOWN (UN) ───────────────────► 3 purchase options (BLD/RE/RN)

         ⛔ AUTH only available in PL — R10

Step 2: PURCHASE TYPE → determines entire downstream flow
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Each purchase type fundamentally changes:
  • Who the seller is (authority / builder / individual)
  • What documents are needed
  • What compliance checks apply
  • Whether UC is even possible
```

---

### [A-AUTH] Direct from Authority (PL area only)

```
PL + AUTH
  │
  │ ━━ LOCATION ━━
  ├── Location (State → City → Area → Pincode)
  │     ⛔ Special Zone question HIDDEN — R1 (authority = no special zone overlap)
  ├── Usage Intent (self / investment / both)
  │
  │ ━━ CHARACTER ━━
  ├── Construction Type (House / Flat / Floor)
  ├── Carpet Area
  │     ⛔ Builder Role HIDDEN — R4 (authority is not a builder)
  │     ⛔ RERA Status HIDDEN — R3 (authority doesn't need RERA)
  │     ⛔ Project Lenders HIDDEN — follows from no RERA question
  │
  ├── PropertyStage? ◄── user answers
  │   │
  │   ├── UNDER CONSTRUCTION ─────────────────────────┐
  │   │     ├── Construction progress %                │
  │   │     ├── Expected completion (Flat/Floor only)  │
  │   │     ├── Builder track record (optional)        │
  │   │     └── Project approvals (Flat/Floor only)    │
  │   │         ⛔ RERA question HIDDEN — R3            │
  │   │                                                │
  │   └── READY TO MOVE ─────────────────────────────┐│
  │         ├── IF Flat/Floor: OC/CC status           ││
  │         ├── IF House: Municipal approval           ││
  │         └── Authority granted possession?          ││
  │                                                    ││
  │ ━━ COMPLIANCE ━━                                   ││
  │     ⛔ Compliance question (q1a) SHOULD BE HIDDEN  ││
  │       — R2 (authority approved the plan themselves, ││
  │         asking "built per plan?" is redundant)      ││
  │       ⚠️ CURRENTLY STILL SHOWN — needs fix         ││
  │     ⛔ RERA on compliance page HIDDEN — R3          ││
  │                                                    ││
  │ ━━ LEGAL ━━                                        ││
  ├── Documentation readiness (PL variant)             ││
  │     ⛔ NOC from lender HIDDEN (not BT)             ││
  │     ⛔ Title chain HIDDEN (PL = clean chain)       ││
  │     ⛔ Succession HIDDEN (not resale)              ││
  │                                                    ││
  │ ━━ SELLER ━━                                       ││
  │     ⛔ Seller page HIDDEN — not a resale            ││
  │                                                    ││
  │ ━━ AUTHORITY PAGE ━━ (shown)                       ││
  └── 6 authority-specific questions                   ┘┘

  QUESTIONS ACTUALLY SEEN: 8–12 (depending on UC vs RTM, House vs Flat)
```

---

### [A-BLD] Direct from Builder (any area)

```
{PL/CR/OM/LC/UN} + BLD
  │
  │ ━━ LOCATION ━━
  ├── Location (State → City → Area → Pincode)
  ├── Special Zone? (Cantonment / CRZ / Tribal / None / Unknown)
  │     ⛔ Tribal → almost unfundable (R11, show warning)
  ├── Usage Intent
  │
  │ ━━ CHARACTER ━━
  ├── Construction Type (House / Flat / Floor)
  ├── Carpet Area
  ├── Builder Role? ◄── KEY QUESTION
  │   ├── Developer (owns land + built) → standard flow
  │   ├── Builder/Contractor (only built, doesn't own land) → ⚠️ risk flag
  │   └── Joint Development (has dev agreement with landowner) → extra docs
  │
  ├── RERA Status? (shown after builder role answered)
  │   ├── RERA Registered → standard UC/RTM
  │   ├── Not Registered ─┐
  │   ├── Not Required ───┤→ Project Lenders? (optional, who else funds?)
  │   └── Not Known ──────┘  For non-RERA: UC = registry not possible,
  │                                        RTM = registry possible (R15)
  │
  ├── PropertyStage? ◄── user answers
  │   │
  │   ├── UNDER CONSTRUCTION ────────────────────────┐
  │   │     ├── Construction progress %               │
  │   │     ├── Expected completion (Flat/Floor)      │
  │   │     ├── Builder track record (optional)       │
  │   │     ├── Project approvals (Flat/Floor)        │
  │   │     └── IF PL: RERA on compliance page        │
  │   │         ⚠️ DUPLICATE of reraStatus — needs fix│
  │   │                                               │
  │   └── READY TO MOVE ────────────────────────────┐│
  │         ├── IF Flat/Floor: OC/CC status          ││
  │         ├── IF House: Municipal approval          ││
  │         └── Authority granted possession?         ││
  │             (shown for BLD + AUTH in code,        ││
  │              but AUTH is separate flow — needs     ││
  │              code review)                         ││
  │                                                   ││
  │ ━━ COMPLIANCE ━━ (area-specific)                  ││
  │   ├── PL: Built per approved plan? (q1a)          ││
  │   ├── CR: NA conversion done? (q1b)               ││
  │   │     IF fully_compliant → OC/CC, Zone, NA order││
  │   │     IF not_authorized → ⛔ stop (R12)         ││
  │   ├── OM: Municipal records valid? (q1c)          ││
  │   │     → Municipal tax → Unauthorized additions   ││
  │   ├── LC: Colony regularized? (q1d)               ││
  │   │     → Revenue records → Regularization → GP   ││
  │   │     ⛔ No OC/CC in LC (R13)                   ││
  │   │     ⛔ No RERA in LC (R14)                    ││
  │   └── UN: Generic compliance (q1e)                ││
  │                                                   ││
  │ ━━ LEGAL ━━                                       ││
  ├── Documentation readiness (area variant)          ││
  ├── IF non-PL: Title chain status                   ││
  ├── IF non-PL: Encumbrance certificate              ││
  ├── IF non-PL: Revenue record mutation              ││
  │     ⛔ Succession HIDDEN (not resale)             ││
  │     ⛔ NOC from lender HIDDEN (not BT)            ││
  │                                                   ││
  │ ━━ SELLER ━━                                      ││
  │     ⛔ HIDDEN — not a resale                       ││
  │                                                   ││
  │ ━━ AUTHORITY ━━                                   ││
  │     ⛔ HIDDEN — not from authority                 ││
  └───────────────────────────────────────────────────┘┘

  QUESTIONS ACTUALLY SEEN: 12–20 (PL simpler, LC deepest)
```

---

### [A-RE] Resale via Endorsement (any area)

```
{PL/CR/OM/LC/UN} + RE
  │
  │ ━━ Identical to BLD flow above, PLUS: ━━
  │
  │ Everything from [A-BLD] applies (Builder Role, RERA, UC/RTM, etc.)
  │ because endorsement still involves a builder/authority project.
  │
  │ ━━ ADDITIONALLY: ━━
  │
  │ ━━ SELLER PAGE ━━ (shown — this IS a resale)
  ├── 9 seller questions:
  │   ├── Seller type (individual / company / NRI / HUF)
  │   ├── Seller relationship to buyer
  │   ├── Original purchase year
  │   ├── Original purchase price
  │   ├── Reason for selling
  │   ├── ... (remaining seller details)
  │
  │ ━━ KEY DIFFERENCE FROM BLD: ━━
  │ The buyer is purchasing from the CURRENT ALLOTTEE (endorsee),
  │ not directly from the builder. The builder/authority transfers
  │ the allotment to the new buyer via endorsement.
  │
  │ QUESTIONS ACTUALLY SEEN: 18–28 (most questions of any path)

  ⚠️ DOMAIN NOTE: RE in non-PL area is unusual.
     Endorsement is primarily a PL concept (authority allotment endorsement).
     In non-PL areas, "endorsement" may refer to builder agreement endorsement
     which is riskier. Consider adding a warning for non-PL + RE.
```

---

### [A-RN] Resale Normal (any area)

```
{PL/CR/OM/LC/UN} + RN
  │
  │ ━━ LOCATION ━━
  ├── Location (State → City → Area → Pincode)
  ├── Special Zone?
  ├── Usage Intent
  │
  │ ━━ CHARACTER ━━
  ├── Construction Type (House / Flat / Floor)
  ├── Carpet Area
  │     ⛔ Builder Role HIDDEN — R6 (person-to-person sale)
  │     ⛔ RERA Status HIDDEN — follows from no builder
  │     ⛔ Project Lenders HIDDEN — follows from no RERA
  │
  ├── PropertyStage = "Ready To Move" ◄── AUTO-SET (hidden) — R5
  │     Property is registered → must be complete
  │
  ├── Property Age? ◄── SHOWN (important for old resale properties)
  │   ├── 0–5 years (newer)
  │   ├── 6–10 years
  │   ├── 11–15 years
  │   ├── 16–20 years
  │   ├── 21–25 years
  │   ├── 26–30 years
  │   └── 30+ years ⚠️ many banks won't finance residual life < 15 years
  │
  │ ━━ COMPLIANCE ━━ (area-specific, same branching as BLD)
  │   PL: q1a → OC/CC(Flat/Floor) or MunicipalApproval(House) → RERA(PL)
  │   CR: q1b → NA order → Zone → OC/CC or MunicipalApproval (if compliant)
  │   OM: q1c → Municipal tax → Unauthorized additions → OC/CC or Municipal
  │   LC: q1d → Revenue records → Colony regularization → GP permission
  │   UN: q1e → OC/CC or Municipal approval
  │
  │     ⛔ ALL UC questions HIDDEN (R5 — always RTM)
  │     ⛔ Construction progress HIDDEN
  │     ⛔ Expected completion HIDDEN
  │     ⛔ Builder track record HIDDEN (no builder)
  │     ⛔ Project approvals HIDDEN
  │
  │ ━━ LEGAL ━━
  ├── Documentation readiness (area variant)
  ├── IF non-PL: Title chain status
  ├── IF non-PL: Encumbrance certificate
  ├── IF non-PL + resale: Succession status (inherited property check)
  ├── IF non-PL: Revenue record mutation
  │
  │ ━━ SELLER PAGE ━━ (shown — this is a resale)
  ├── 9 seller questions
  │
  │ ━━ AUTHORITY ━━
  │     ⛔ HIDDEN
  └──

  QUESTIONS ACTUALLY SEEN: 14–22 (depending on area type)
```

---

## [B] BALANCE TRANSFER / TOP-UP FLOW

```
BT / BT+Top-up / Top-up Only
  │
  │     ⛔ No purchase type (R7)
  │     ⛔ No seller page (R8)
  │     ⛔ No authority page
  │     ⛔ No special zone question
  │     ⛔ No usage intent question
  │     ⛔ No builder role / RERA status (no purchase type = no builder questions)
  │
  │ ━━ BT REGISTRY PAGE ━━ (always first for BT)
  │
  ├── Registry done in owner's name?
  │   │
  │   ├── YES ──────────────────────────────────────────────┐
  │   │   │                                                 │
  │   │   ├── 6 months since registry? (Yes / No)           │
  │   │   │     No → ⚠️ some banks require 6-month gap      │
  │   │   │                                                 │
  │   │   │ ── Implications: ──                             │
  │   │   │ PropertyStage = RTM (auto, hidden) — R9         │
  │   │   │ Property Age shown (existing registered prop)   │
  │   │   │ UC questions all hidden                         │
  │   │   │                                                 │
  │   └── NO ───────────────────────────────────────────────┐
  │       │                                                 │
  │       ├── Possession & Demand status?                   │
  │       │   ├── Have possession, no demand                │
  │       │   ├── Have possession, demand pending           │
  │       │   │   └── Outstanding demand amount? (₹)        │
  │       │   ├── No possession, no demand                  │
  │       │   └── No possession, demand pending             │
  │       │       └── Outstanding demand amount? (₹)        │
  │       │                                                 │
  │       │ PropertyStage question SHOWN (could be UC/RTM)  │
  │       │                                                 │
  │       └─────────────────────────────────────────────────┘
  │
  │ ━━ LOCATION ━━
  ├── Area Type (PL / CR / OM / LC / UN)
  ├── Location (State → City → Area → Pincode)
  │
  │ ━━ CHARACTER ━━
  ├── Construction Type (House / Flat / Floor)
  ├── Carpet Area
  ├── PropertyStage (only if registry = No, otherwise hidden)
  ├── Property Age (only if registry = Yes)
  │
  │ ━━ COMPLIANCE ━━ (area-specific, same as New Loan)
  │   PL: q1a + RERA (on compliance page) + OC/CC or Municipal(RTM)
  │   CR: q1b + NA order + Zone + OC/CC or Municipal(RTM, if compliant)
  │   OM: q1c + Tax + Additions(RTM) + OC/CC or Municipal(RTM)
  │   LC: q1d + Revenue + Colony + GP
  │   UN: q1e + OC/CC or Municipal(RTM)
  │
  │   IF UC (registry=No + UC selected):
  │   ├── Construction progress
  │   ├── Expected completion (Flat/Floor)
  │   ├── Builder track record
  │   └── Project approvals (Flat/Floor)
  │
  │ ━━ LEGAL ━━
  ├── Documentation readiness (area variant)
  ├── NOC from previous lender? ◄── BT-specific
  ├── IF non-PL: Title chain
  ├── IF non-PL: Encumbrance certificate
  ├── IF non-PL: Revenue record mutation
  │     ⛔ Succession HIDDEN for PL area
  │
  └── QUESTIONS ACTUALLY SEEN: 10–18
```

---

## COMPLETE VALID PATH MAP (all impossible paths removed)

### NEW LOAN — Planned Authority (PL)

| # | Purchase | Stage | Construction | Special Zone | Builder Role | RERA | Age | Seller | Auth | Notes |
|---|----------|-------|-------------|-------------|-------------|------|-----|--------|------|-------|
| 1 | AUTH | UC | House | ⛔hidden(R1) | ⛔hidden(R4) | ⛔hidden(R3) | ⛔no | ⛔no | ✅ | Simplest UC |
| 2 | AUTH | UC | Flat | ⛔hidden | ⛔hidden | ⛔hidden | ⛔no | ⛔no | ✅ | +completion date |
| 3 | AUTH | UC | Floor | ⛔hidden | ⛔hidden | ⛔hidden | ⛔no | ⛔no | ✅ | +completion date |
| 4 | AUTH | RTM | House | ⛔hidden | ⛔hidden | ⛔hidden | ⛔no | ⛔no | ✅ | +municipal approval |
| 5 | AUTH | RTM | Flat | ⛔hidden | ⛔hidden | ⛔hidden | ⛔no | ⛔no | ✅ | +OC/CC |
| 6 | AUTH | RTM | Floor | ⛔hidden | ⛔hidden | ⛔hidden | ⛔no | ⛔no | ✅ | +OC/CC |
| 7 | BLD | UC | House | ✅ | ✅ | ✅ | ⛔no | ⛔no | ⛔no | Full builder flow |
| 8 | BLD | UC | Flat | ✅ | ✅ | ✅ | ⛔no | ⛔no | ⛔no | +completion+approvals |
| 9 | BLD | UC | Floor | ✅ | ✅ | ✅ | ⛔no | ⛔no | ⛔no | +completion+approvals |
| 10 | BLD | RTM | House | ✅ | ✅ | ✅ | ⛔no | ⛔no | ⛔no | +municipal approval |
| 11 | BLD | RTM | Flat | ✅ | ✅ | ✅ | ⛔no | ⛔no | ⛔no | +OC/CC |
| 12 | BLD | RTM | Floor | ✅ | ✅ | ✅ | ⛔no | ⛔no | ⛔no | +OC/CC |
| 13 | RE | UC | House | ✅ | ✅ | ✅ | ⛔no | ✅ | ⛔no | Heaviest path |
| 14 | RE | UC | Flat | ✅ | ✅ | ✅ | ⛔no | ✅ | ⛔no | Most questions |
| 15 | RE | UC | Floor | ✅ | ✅ | ✅ | ⛔no | ✅ | ⛔no | Most questions |
| 16 | RE | RTM | House | ✅ | ✅ | ✅ | ⛔no | ✅ | ⛔no | |
| 17 | RE | RTM | Flat | ✅ | ✅ | ✅ | ⛔no | ✅ | ⛔no | |
| 18 | RE | RTM | Floor | ✅ | ✅ | ✅ | ⛔no | ✅ | ⛔no | |
| 19 | RN | RTM(auto) | House | ✅ | ⛔hidden(R6) | ⛔hidden | ✅ | ✅ | ⛔no | Always RTM (R5) |
| 20 | RN | RTM(auto) | Flat | ✅ | ⛔hidden | ⛔hidden | ✅ | ✅ | ⛔no | |
| 21 | RN | RTM(auto) | Floor | ✅ | ⛔hidden | ⛔hidden | ✅ | ✅ | ⛔no | |

**PL Total: 21 valid paths** (was 24 before — 3 eliminated: RN+UC impossible)

### NEW LOAN — Non-Planned Areas (CR/OM/LC/UN)

Each has 3 purchase types × stage × construction. Pattern identical, but area-specific compliance differs.

| Area | Purchase Options | Compliance Questions | Special Notes |
|------|-----------------|---------------------|---------------|
| CR | BLD, RE, RN | NA conversion + NA order + Zone | If not_authorized: ⛔stop (R12) |
| OM | BLD, RE, RN | Municipal records + Tax + Additions(RTM) | Additions only for RTM |
| LC | BLD, RE, RN | Colony + Revenue + Regularization + GP | ⛔No OC/CC (R13), ⛔No RERA (R14) |
| UN | BLD, RE, RN | Generic compliance only | Fallback — least specific |

**Per non-PL area: 15 valid paths** (3 purchase × {UC,RTM} × 3 construction, minus RN+UC = 15)
**Total non-PL: 4 × 15 = 60 valid paths**

### BT/TOP-UP

| Registry | Stage | Construction | Area-specific compliance | Notes |
|----------|-------|-------------|------------------------|-------|
| Yes | RTM(auto) | House/Flat/Floor | PL/CR/OM/LC/UN variants | +age, +6-month check |
| No | UC | House/Flat/Floor | PL/CR/OM/LC/UN variants | +possession/demand |
| No | RTM | House/Flat/Floor | PL/CR/OM/LC/UN variants | +possession/demand |

**BT valid paths: 3 loan subtypes × 5 areas × (1 reg-yes + 2 reg-no stages) × 3 construction = 135**
**Minus impossible (Reg=Yes+UC): 135 - 45 = 90 valid paths**

---

## GRAND TOTAL: 171 valid paths (reduced from ~230)

| Flow | Paths | Eliminated |
|------|-------|-----------|
| NL + PL | 21 | 3 (RN+UC) |
| NL + CR/OM/LC/UN | 60 | 12 (RN+UC per area) |
| BT/Top-up | 90 | 45 (Reg=Yes+UC) |
| **Total** | **171** | **59 eliminated** |

---

## ISSUES FOUND (Code vs Domain Reality)

### ⚠️ Issues to Fix

| # | Issue | Where | Fix |
|---|-------|-------|-----|
| I1 | AUTH still shows compliance question (q1a) | propertyCondition.ts | Hide q1a when purchaseType=AUTH — R2 |
| I2 | AUTH still shows special zone question | propertyLocation.ts | Already hidden! ✅ showWhen excludes AUTH |
| I3 | RERA asked twice (reraStatus on Character + reraRegistrationStatus on Compliance) | Both pages | Consolidate — keep one, remove other |
| I4 | Authority possession question shows for BLD purchases too | propertyCondition.ts q4 | `purchaseType` check includes `direct_from_builder` — should be `direct_from_authority` only? Or is it intentional (builder in PL area, authority issued OC)? |
| I5 | Compliance q1a-q1c only show for Flat/House, not Floor | propertyCondition.ts | Floor shares compliance concerns with Flat — should be included? |
| I6 | No warning for non-PL + RE (endorsement unusual outside PL) | propertyLocation.ts | Add warning: "Endorsement is typically for authority allotments" |
| I7 | `projectName` showWhen checks `propertyType` but schema uses `constructionType` | propertyCharacter.ts q5 | Bug: should be `constructionType` not `propertyType` |

### ✅ Already Correct
- Special zone hidden for AUTH ✅
- RN auto-sets RTM via flagKey ✅
- Builder role only for BLD/RE ✅
- Property age only for RN and BT+registry ✅
- Purchase type hidden for BT ✅
- Seller page hidden for non-resale ✅

---

## QUESTION COUNT SUMMARY (per valid path)

| Scenario | Min Qs | Max Qs | Most Questions When... |
|----------|--------|--------|----------------------|
| NL + PL + AUTH | 8 | 12 | UC + Flat (progress, completion, track record, approvals) |
| NL + PL + BLD | 12 | 18 | UC + Flat + non-RERA (builder role, RERA, lenders, progress...) |
| NL + PL + RE | 18 | 26 | UC + Flat + non-RERA + seller page (heaviest path) |
| NL + PL + RN | 14 | 18 | Flat + seller page + age |
| NL + CR + BLD | 12 | 17 | UC + Flat + NA deep compliance |
| NL + OM + BLD | 12 | 18 | RTM + House (tax + additions + municipal) |
| NL + LC + BLD | 12 | 19 | UC + Flat + colony deep compliance (4 cascading) |
| NL + LC + RN | 14 | 20 | Colony compliance + seller + age |
| BT + Reg=Yes | 8 | 14 | Reg + 6mo + area + char + compliance + legal |
| BT + Reg=No | 10 | 18 | Possession + demand + area + char + compliance + legal |

---

## VISUAL SUMMARY: Which questions appear where

```
QUESTION                    AUTH   BLD    RE     RN     BT-Y   BT-N
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Area Type                    ✅     ✅     ✅     ✅     ✅     ✅
Purchase Type                ✅     ✅     ✅     ✅     ⛔     ⛔
Location                     ✅     ✅     ✅     ✅     ✅     ✅
Special Zone                 ⛔     ✅     ✅     ✅     ⛔     ⛔
Usage Intent                 ✅     ✅     ✅     ✅     ⛔     ⛔
───────────────────────────────────────────────────────────────────
Registry Done?               ⛔     ⛔     ⛔     ⛔     ✅     ✅
6-month check                ⛔     ⛔     ⛔     ⛔     ✅     ⛔
Possession/Demand            ⛔     ⛔     ⛔     ⛔     ⛔     ✅
Outstanding Amount           ⛔     ⛔     ⛔     ⛔     ⛔     ⚡
───────────────────────────────────────────────────────────────────
Construction Type            ✅     ✅     ✅     ✅     ✅     ✅
Carpet Area                  ✅     ✅     ✅     ✅     ✅     ✅
Builder Role                 ⛔     ✅     ✅     ⛔     ⛔     ⛔
RERA Status                  ⛔     ✅     ✅     ⛔     ⛔     ⛔
Project Lenders              ⛔     ⚡     ⚡     ⛔     ⛔     ⛔
Property Stage               ✅     ✅     ✅     ⛔auto  ⛔auto ✅
Property Age                 ⛔     ⛔     ⛔     ✅     ✅     ⛔
Project Name                 ⚡     ⚡     ⚡     ⛔     ⚡     ⚡
───────────────────────────────────────────────────────────────────
Compliance (area variant)    ⛔fix  ✅     ✅     ✅     ✅     ✅
OC/CC (Flat/Floor+RTM)       ✅     ✅     ✅     ✅     ✅     ✅
Municipal Approval (House)   ✅     ✅     ✅     ✅     ✅     ✅
Authority Possession         ✅     ⚡fix  ⚡fix  ⛔     ⛔     ⛔
RERA Compliance (PL only)    ⛔     ⚠dup  ⚠dup  ✅     ✅     ✅
NA Order (CR only)           n/a    ✅     ✅     ✅     ✅     ✅
Zone (CR only)               n/a    ✅     ✅     ✅     ✅     ✅
Municipal Tax (OM only)      n/a    ✅     ✅     ✅     ✅     ✅
Additions (OM+RTM)           n/a    ✅     ✅     ✅     ✅     ✅
Revenue Records (LC)         n/a    ✅     ✅     ✅     ✅     ✅
Colony Regular. (LC)         n/a    ✅     ✅     ✅     ✅     ✅
Gram Panchayat (LC)          n/a    ✅     ✅     ✅     ✅     ✅
Construction Progress (UC)   ✅     ✅     ✅     ⛔     ⛔     ✅
Completion Date (UC+F/Fl)    ✅     ✅     ✅     ⛔     ⛔     ✅
Builder Track (UC)           ✅     ✅     ✅     ⛔     ⛔     ✅
Project Approvals (UC+F/Fl)  ✅     ✅     ✅     ⛔     ⛔     ✅
───────────────────────────────────────────────────────────────────
Doc Readiness (area variant) ✅     ✅     ✅     ✅     ✅     ✅
NOC from Lender              ⛔     ⛔     ⛔     ⛔     ✅     ✅
Title Chain (non-PL)         ⛔     ✅     ✅     ✅     ✅     ✅
Encumbrance Cert (non-PL)    ⛔     ✅     ✅     ✅     ✅     ✅
Succession (resale+non-PL)   ⛔     ⛔     ✅     ✅     ⛔     ⛔
Revenue Mutation (non-PL)    ⛔     ✅     ✅     ✅     ✅     ✅
───────────────────────────────────────────────────────────────────
Seller Page (9 Qs)           ⛔     ⛔     ✅     ✅     ⛔     ⛔
Authority Page (6 Qs)        ✅     ⛔     ⛔     ⛔     ⛔     ⛔

Legend: ✅ = always shown  ⛔ = never shown  ⚡ = conditionally shown
        ⚠dup = duplicate concern  ⛔fix = should be hidden but isn't
```
