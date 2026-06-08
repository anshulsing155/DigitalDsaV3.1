# Property Questions — Unified Audit (All 4 Pages)

> Generated: 2026-03-18 | Purpose: Single-page view of ALL property questions to decide restructuring

## Current Page Structure (6 property-related pages)

| # | Page ID | Title | When Visible |
|---|---------|-------|-------------|
| 2 | `propertyLocation_homeLoan` | Property Location & Type | Property identified OR BT/Top-up |
| 3 | `propertyCharacter_homeLoan` | Property Character | Property identified OR BT/Top-up |
| 4 | `btRegistry_homeLoan` | BT Registry & Possession | BT/Top-up only |
| 5 | `propertyCondition_homeLoan` | Property Condition & Compliance | Property identified OR BT/Top-up |
| 6 | `sellerTransaction_homeLoan` | Seller & Transaction Details | Resale (normal/endorsement) only |
| 7 | `sellerTransaction_authority_homeLoan` | Authority Details | Direct from authority, new loan only |

---

## MASTER QUESTION LIST (All Questions, Flat View)

### Legend
- **Area**: PL = Planned Authority, CR = Converted Residential, OM = Old Municipal, LC = Local Colony, UN = Unknown
- **Purchase**: BLD = Direct from Builder, AUTH = Direct from Authority, RE = Resale Endorsement, RN = Resale Normal
- **Loan**: NL = New Loan, BT = Balance Transfer, BTT = BT + Top-up, TU = Top-up Only
- **Stage**: UC = Under Construction, RTM = Ready To Move
- **R** = Required, **O** = Optional

---

### A. LOCATION & AREA IDENTIFICATION

| # | Question | bindsTo | Type | R/O | Visible When | Current Page |
|---|----------|---------|------|-----|-------------|-------------|
| 1 | What type of area is this property in? | `propertyAreaType` | select | R | Always | Location |
| 2a | Nature of purchase (planned area — 4 options incl. authority) | `purchaseType` | radio | R | Area=PL, Loan=NL, PropIdentified=Yes | Location |
| 2b | Nature of purchase (other areas — 3 options, no authority) | `purchaseType` | radio | R | Area≠PL, Loan=NL, PropIdentified=Yes | Location |
| 3 | Property location (state/city/area/pincode) | `propertyStateName` + `propertyCityName` + `propertyArea` + `pincode` | location | R | After area type or purchase type answered | Location |
| 4 | Special restricted zone? (Cantonment/CRZ/Tribal) | `specialAreaRestriction` | radio | R | PropIdentified=Yes, Area≠empty, State+City filled, Purchase≠AUTH, Loan=NL | Location |
| 5 | Intended use of property? | `propertyUsageIntent` | radio | R | PropIdentified=Yes, PurchaseType answered | Location |

---

### B. PHYSICAL PROPERTY DETAILS

| # | Question | bindsTo | Type | R/O | Visible When | Current Page |
|---|----------|---------|------|-----|-------------|-------------|
| 6 | Construction type (House/Flat/Floor) | `constructionType` | select | R | Always | Character |
| 7 | Carpet area (sq ft) | `carpetArea` | number | R | ConstructionType answered | Character |
| 8 | Property age | `propertyAge` | select | R | Purchase=RN OR (BT/Top-up + Registry=Yes) | Character |
| 9 | Project/Society name | `projectName` | text | O | UC + Flat + NL/BT | Character |

---

### C. BUILDER / DEVELOPER IDENTIFICATION (NEW — Session 32)

| # | Question | bindsTo | Type | R/O | Visible When | Current Page |
|---|----------|---------|------|-----|-------------|-------------|
| 10 | Builder's role (Developer/Contractor/JDA) | `builderRole` | radio | R | Purchase=BLD or RE | Character |
| 11 | RERA registered? | `reraStatus` | radio | R | Purchase=BLD or RE, builderRole answered | Character |
| 12 | Which lenders funding this project? | `projectLenders` | text | O | RERA ≠ registered | Character |

**OVERLAP:** Question 11 (`reraStatus`) overlaps with Question 23 (`reraRegistrationStatus`) on Compliance page. Different bindsTo keys, different showWhen scope.

---

### D. CONSTRUCTION STAGE

| # | Question | bindsTo | Type | R/O | Visible When | Current Page |
|---|----------|---------|------|-----|-------------|-------------|
| 13 | Construction stage (UC/RTM) | `PropertyStage` | radio | R | ConstructionType answered, Purchase≠RN, NOT(BT+Registry=Yes) | Character |

**Auto-set rules:**
- `resale_normal` → auto-sets PropertyStage = "Ready To Move" via flagKey
- `direct_from_builder` / `resale_endorsement` / `direct_from_authority` → clears PropertyStage (user must answer)
- BT/Top-up with registry done → PropertyStage hidden (implied RTM)

---

### E. BT / TOP-UP SPECIFIC

| # | Question | bindsTo | Type | R/O | Visible When | Current Page |
|---|----------|---------|------|-----|-------------|-------------|
| 14 | Registry done in owner's name? | `isRegistryDone` | radio | R | Loan=BT/BTT/TU | BT Registry |
| 15 | Possession & builder demand status | `bt_possessionAndDemandStatus` | radio | R | Registry=No | BT Registry |
| 16 | Outstanding demand amount from builder | `bt_outstandingDemandAmount` | currency | R | Registry=No + Demand pending | BT Registry |
| 17 | 6 months passed since registry? | `sixMonthsPassedAfterRegistry` | radio | R | Registry=Yes | BT Registry |

---

### F. COMPLIANCE STATUS (5 area-type variants → same bindsTo key)

Only ONE of these 5 appears per form — mutually exclusive based on `propertyAreaType`.

| # | Question | bindsTo | Type | R/O | Visible When | Current Page |
|---|----------|---------|------|-----|-------------|-------------|
| 18a | Built as per authority's plan? | `propertyComplianceStatus` | radio | R | Area=PL, Type=Flat/House | Compliance |
| 18b | Land converted from agricultural? (NA) | `propertyComplianceStatus` | radio | R | Area=CR, Type=Flat/House | Compliance |
| 18c | Within municipal limits with records? | `propertyComplianceStatus` | radio | R | Area=OM, Type=Flat/House | Compliance |
| 18d | Colony officially recognised/regularized? | `propertyComplianceStatus` | radio | R | Area=LC | Compliance |
| 18e | In government-authorized area? (fallback) | `propertyComplianceStatus` | radio | R | Area=UN or empty | Compliance |

---

### G. CERTIFICATES & APPROVALS (Ready To Move)

| # | Question | bindsTo | Type | R/O | Visible When | Current Page |
|---|----------|---------|------|-----|-------------|-------------|
| 19 | OC/CC available? | `ocCcAvailable` | radio | R | Stage=RTM, Type=Flat/Floor, Compliance≠not_authorized | Compliance |
| 20 | House built with sanctioned plan? | `municipalApproval` | radio | R | Stage=RTM, Type=House, Compliance≠not_authorized | Compliance |
| 21 | Authority granted possession (OC/CC)? | `isPossessionOfferedByAuthority` | radio | R | Stage=RTM, Purchase=BLD/AUTH, Loan=NL | Compliance |

---

### H. AREA-SPECIFIC DEEP COMPLIANCE

#### Planned Authority (PL)
| # | Question | bindsTo | Type | R/O | Visible When | Current Page |
|---|----------|---------|------|-----|-------------|-------------|
| 22 | RERA registered? | `reraRegistrationStatus` | radio | R | Area=PL, Loan=NL/BT/BTT | Compliance |

#### Converted Residential (CR)
| # | Question | bindsTo | Type | R/O | Visible When | Current Page |
|---|----------|---------|------|-----|-------------|-------------|
| 23 | NA conversion order status? | `naConversionStatus` | radio | R | Area=CR | Compliance |
| 24 | Zone classification? (Residential/Commercial/Mixed) | `zoneClassification` | radio | R | Area=CR, Loan=NL/BT/BTT | Compliance |

#### Old Municipal (OM)
| # | Question | bindsTo | Type | R/O | Visible When | Current Page |
|---|----------|---------|------|-----|-------------|-------------|
| 25 | Municipal tax paid regularly? | `municipalTaxStatus` | radio | R | Area=OM, Compliance answered, Type=Flat/House | Compliance |
| 26 | Unauthorized additions/modifications? | `unauthorizedAdditions` | radio | R | Area=OM, Tax answered, Stage=RTM | Compliance |

#### Local Colony (LC)
| # | Question | bindsTo | Type | R/O | Visible When | Current Page |
|---|----------|---------|------|-----|-------------|-------------|
| 27 | Revenue records status? | `revenueRecordStatus` | radio | R | Area=LC, Compliance answered | Compliance |
| 28 | Colony regularized? | `colonyRegularizationStatus` | radio | R | Area=LC, Revenue answered | Compliance |
| 29 | Gram Panchayat permission? | `gramPanchayatPermission` | radio | R | Area=LC, Colony status answered | Compliance |

---

### I. CONSTRUCTION PROGRESS (Under Construction only)

| # | Question | bindsTo | Type | R/O | Visible When | Current Page |
|---|----------|---------|------|-----|-------------|-------------|
| 30 | Construction progress % | `constructionProgress` | select | R | Stage=UC | Compliance |
| 31 | Expected completion date | `expectedCompletionDate` | month-year | O | Stage=UC, Type=Flat/Floor | Compliance |
| 32 | Builder track record? | `builderTrackRecord` | select | O | Stage=UC | Compliance |
| 33 | All project approvals in place? | `projectApprovals` | radio | O | Stage=UC, Type=Flat/Floor | Compliance |

---

### J. SELLER / COUNTERPARTY

| # | Question | bindsTo | Type | R/O | Visible When | Current Page |
|---|----------|---------|------|-----|-------------|-------------|
| — | Resale seller questions (9 questions) | various | various | mixed | Purchase=RN or RE | Seller Transaction |
| — | Authority questions (6 questions) | various | various | mixed | Purchase=AUTH, Loan=NL | Authority Details |

*(Seller/Authority pages not expanded here — separate concern)*

---

## IDENTIFIED ISSUES

### 1. RERA Duplication
- **`reraStatus`** (Character page) — for builder purchases in ANY area
- **`reraRegistrationStatus`** (Compliance page) — for PLANNED_AUTHORITY only
- Different bindsTo keys, different values, partially overlapping scope
- **Fix needed:** Merge into one or clearly delineate scope

### 2. `propertyType` Bug
- `q5_projectName` showWhen references `propertyType` which doesn't exist
- Should likely be `constructionType`

### 3. Builder Questions Scattered
- `builderRole` → Character page (new)
- `builderTrackRecord` → Compliance page (existing)
- `projectApprovals` → Compliance page (existing)
- `reraStatus` → Character page (new)
- `reraRegistrationStatus` → Compliance page (existing)
- **These should be consolidated**

### 4. Construction Stage Semantics
- For RERA projects: UC = No OC/CC, RTM = OC/CC received
- For non-RERA projects: UC = Registry not possible, RTM = Registry possible
- The `labelDescription` on PropertyStage is static — doesn't adapt to RERA status
- **Consider:** Dynamic description or separate question for non-RERA

### 5. Missing Questions (Identified in Discussion)
- **Development agreement status** — for builder_contractor / joint_development scenarios
- **Sale deed executor** — who will execute: builder, landowner, or both?
- **Registry/mutation status** — for resale_normal (parked for seller page)

### 6. Questions That May Be Redundant
- `isPossessionOfferedByAuthority` (q4) — overlaps with OC/CC question for authority purchases
- `specialAreaRestriction` — zone question was removed from Location page but still exists in JSON schema

---

## VISIBILITY MATRIX: How Many Questions Per Scenario

| Scenario | Location | Character | BT Registry | Compliance | Total |
|----------|----------|-----------|-------------|------------|-------|
| **NL + PL + BLD + UC + Flat** | 4 | 6 (incl. builder role, RERA) | 0 | ~8 | ~18 |
| **NL + PL + AUTH + RTM + House** | 4 | 2 | 0 | ~5 | ~11 |
| **NL + PL + RN + RTM + Flat** | 4 | 3 (incl. age) | 0 | ~5 | ~12 |
| **NL + CR + BLD + UC + Flat** | 3 | 6 | 0 | ~6 | ~15 |
| **NL + OM + RN + RTM + House** | 3 | 3 | 0 | ~6 | ~12 |
| **NL + LC + BLD + RTM + House** | 3 | 5 | 0 | ~5 | ~13 |
| **BT + PL + RTM + Flat** | 3 | 2 | 2 | ~5 | ~12 |
| **BT + OM + RTM + House (no registry)** | 3 | 2 | 3 | ~6 | ~14 |

---

## DECISION NEEDED

The current 4-page structure splits property questions by concern:
1. **Where** is it? (Location)
2. **What** is it? (Character)
3. **Registry/BT** status (BT-specific)
4. **Is it compliant?** (Compliance)

**Problems:**
- Builder-related questions are split across Character + Compliance
- RERA asked twice with different keys
- DSA has to navigate 4 pages for one property
- Compliance page has 20 questions but most users see only 5-8

**Options:**
- **A: Keep 4 pages** — fix overlaps, consolidate builder questions to one page
- **B: Merge to 2 pages** — "Property Info" (location + character + builder) + "Compliance & Legal" (condition + BT)
- **C: Merge to 1 page** — all property questions, rely on showWhen to show only relevant ones (could be 18+ questions on one page)
- **D: Smart 3 pages** — "Property Identity" (location + type + builder) → "Property Status" (stage + compliance + RERA) → "Transaction" (BT/seller/authority)
