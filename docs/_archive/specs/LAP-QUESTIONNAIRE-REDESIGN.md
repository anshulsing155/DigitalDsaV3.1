# LAP Questionnaire Redesign — Independent Analysis

> **Purpose**: Ground-up analysis of what a LAP (Loan Against Property) form should ask in the Indian lending context. Not constrained by current questionnaire. For discussion before implementation.

---

## How LAP Differs from Home Loan

| Aspect             | Home Loan                          | LAP                                             |
| ------------------ | ---------------------------------- | ----------------------------------------------- |
| **Property**       | Being purchased (future/current)   | Already owned (existing asset)                  |
| **Purpose**        | Buy/construct the property         | Any purpose (business, personal, consolidation) |
| **LTV**            | 75-90%                             | 50-70% (higher risk for lender)                 |
| **Tenure**         | Up to 30 years                     | Up to 15 years                                  |
| **Rate**           | 8.5-10%                            | 9.5-12%                                         |
| **Title**          | Transferred at purchase            | Must already be clear                           |
| **Key risk**       | Property value + borrower capacity | Existing encumbrance + valuation accuracy       |
| **Property types** | Only residential                   | Residential, commercial, industrial, plot       |

**Key insight**: In LAP, the property is COLLATERAL, not the subject of the loan. The lender's concern is: "Can I recover my money if this person defaults?" So the questions focus on **recoverability** — legal clarity, marketability, valuation accuracy.

---

## Proposed Question Structure

### SECTION 1: Property Identification & Location

_Goal: Where is the property? Is the area serviceable by lenders?_

| #   | Question         | Type           | Options/Format | Required | Why It Matters                        |
| --- | ---------------- | -------------- | -------------- | -------- | ------------------------------------- |
| 1.1 | Property State   | select         | State list     | Yes      | Determines lender coverage            |
| 1.2 | Property City    | derived select | From state     | Yes      | Lender branch proximity               |
| 1.3 | Property Pincode | text (6-digit) | Typeahead      | No       | Negative area check, precise matching |

**Notes**:

- This is straightforward location. No changes needed from current.
- Pincode enables negative area filtering in rule engine.

---

### SECTION 2: Property Character

_Goal: What kind of property is this? What's its physical nature?_

| #   | Question                   | Type           | Options                                        | Required                 | Why It Matters                                                                                                             |
| --- | -------------------------- | -------------- | ---------------------------------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| 2.1 | **Category of property**   | radio          | Residential, Commercial, Industrial, Mixed-use | Yes                      | Determines LTV ratio, lender eligibility. Commercial = 50-60% LTV. Industrial = 40-55%. Mixed-use needs specific handling. |
| 2.2 | **Construction type**      | select         | See below                                      | Yes                      | Physical nature of the asset. Different valuation methods.                                                                 |
| 2.3 | **Ownership type**         | radio          | Freehold, Leasehold                            | Yes                      | Freehold preferred. Leasehold with <20yr remaining is nearly un-fundable.                                                  |
| 2.4 | **Lease remaining period** | select         | >30yr, 20-30yr, 10-20yr, <10yr                 | Yes (if leasehold)       | <20yr = most lenders reject. <10yr = unfundable.                                                                           |
| 2.5 | **Property age**           | select         | <5yr, 5-10yr, 10-20yr, 20-30yr, >30yr          | Yes                      | Old properties get lower valuation. >30yr some lenders won't touch.                                                        |
| 2.6 | **Carpet/plot area**       | number (sq ft) | —                                              | Yes                      | Primary valuation input                                                                                                    |
| 2.7 | **Built-up area**          | number (sq ft) | —                                              | No (for flats/buildings) | Secondary valuation input                                                                                                  |

**Construction type options by category:**

| Category    | Construction Types                                                 |
| ----------- | ------------------------------------------------------------------ |
| Residential | House/Villa, Independent Floor, Flat (Apartment), Row House        |
| Commercial  | Office Space, Shop/Showroom, Commercial Building, Warehouse/Godown |
| Industrial  | Factory/Manufacturing Unit, Industrial Shed, Workshop              |
| Mixed-use   | Shop + Residence (common in India), Office + Residence             |

**Discussion points:**

- Current schema has "Plot" as a construction type under LAP. Should we? A plot with no structure has different valuation. Some lenders fund LAP on vacant plots, most don't.
- "Built-Up" as a construction type is vague — what does it mean? Suggest removing it.
- Should we ask number of floors? Relevant for independent houses (G+1, G+2 etc.) — affects valuation.

---

### SECTION 3: Area Classification & Compliance

_Goal: Is the property in a legally recognized area? What's its regulatory status?_

This is the section that caused all the confusion. Let me break down the ACTUAL reality of Indian property areas:

#### The 5 Area Types in India (ground truth)

| Area Type                           | What It Is                                                                            | Typical Docs                                              | Banks OK?      | NBFCs OK?      |
| ----------------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------- | -------------- | -------------- |
| **Planned / Development Authority** | Properties in areas developed by government authorities (DDA, HUDA, BDA, CIDCO, etc.) | Authority allotment letter, approved layout plan, OC/CC   | Yes (all)      | Yes            |
| **Converted Residential (NA)**      | Agricultural land converted to non-agricultural (NA) and then developed               | NA order, 7/12 extract, mutation entry, layout approval   | Most banks     | Yes            |
| **Old Municipal / Corporation**     | Properties within old city limits, municipal corporation areas                        | Property tax receipts, old survey records, municipal plan | Select banks   | Yes            |
| **Local Colony / Village**          | Gram Panchayat areas, revenue villages, unplanned colonies                            | Gram Panchayat NOC, revenue records, 7/12 or Khasra       | Very few banks | Select NBFCs   |
| **Unauthorized Colony**             | Properties in unapproved colonies, encroachments                                      | Often incomplete docs                                     | No banks       | Very few NBFCs |

#### Proposed Questions

| #   | Question                                    | Type  | Options                                                                              | Required    | Why It Matters                                                                      |
| --- | ------------------------------------------- | ----- | ------------------------------------------------------------------------------------ | ----------- | ----------------------------------------------------------------------------------- |
| 3.1 | **Area classification**                     | radio | 5 options above                                                                      | Yes         | THE most important question. Determines 90% of lender eligibility.                  |
| 3.2 | **Is property built as per approved plan?** | radio | Yes / Partially (minor deviations) / No (major deviations) / No approved plan exists | Yes         | Deviations reduce LTV, may block banks                                              |
| 3.3 | **OC/CC availability**                      | radio | Both available / Only CC / Neither / Don't know                                      | Conditional | Only for Planned, Converted, Municipal areas. Not relevant for colony/unauthorized. |
| 3.4 | **RERA registration**                       | radio | Registered / Not registered / Not applicable                                         | Conditional | Only for developer projects in Planned/Converted areas                              |
| 3.5 | **Municipal tax status**                    | radio | Regularly paid / Irregular / Unpaid / Not applicable                                 | Yes         | Shows legal occupancy. Unpaid = problem.                                            |
| 3.6 | **NA conversion status**                    | radio | Complete / In progress / Not done / Not required                                     | Conditional | Only for Converted Residential areas                                                |
| 3.7 | **Colony regularization status**            | radio | Regularized / Regularization pending / Not regularized / Don't know                  | Conditional | Only for Local Colony. Some states are regularizing colonies (Delhi, MP, UP).       |

**Key insight**: The CURRENT schema asks "Is the property in a government-authorized area AND built as per approved plan?" as ONE question. This is wrong because:

1. Area type and construction compliance are **independent dimensions**
2. A property can be in a Planned area but built with deviations (common!)
3. A property can be in a Colony area but perfectly built (just no authority approval)
4. Combining them creates the contradictions we saw in testing

**Recommendation**: Split into area classification (3.1) + construction compliance (3.2). Everything else flows from area type.

---

### SECTION 4: Legal & Title Status

_Goal: Can the lender get clean security? Is the title marketable?_

| #   | Question                                    | Type   | Options                                                                     | Required | Why It Matters                                                                    |
| --- | ------------------------------------------- | ------ | --------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------- |
| 4.1 | **Original property documents available?**  | radio  | Yes / Partially / No                                                        | Yes      | Lender needs originals for mortgage creation. No originals = rejected.            |
| 4.2 | **Complete ownership chain (title chain)?** | radio  | Yes, traceable / Partially / No / Not sure                                  | Yes      | Banks need unbroken chain from original allotment/land record to current owner    |
| 4.3 | **Existing encumbrance?**                   | radio  | No (free & clear) / Yes, existing mortgage / Yes, other lien                | Yes      | If existing mortgage → this is a BT case. If other lien → complication.           |
| 4.4 | **Any legal dispute on property?**          | radio  | No / Yes, active litigation / Yes, resolved                                 | Yes      | Active litigation = automatic rejection by ALL lenders                            |
| 4.5 | **Encumbrance certificate verified?**       | radio  | Yes (clean EC) / Yes (with entries) / Not yet obtained                      | No       | EC from sub-registrar. Shows 13-30 year history of transactions.                  |
| 4.6 | **How was property acquired?**              | select | Self-purchased / Inherited / Gift deed / Partition deed / Power of Attorney | Yes      | Inheritance needs succession docs. GPA transfers are risky — many lenders reject. |

**Discussion point**: Q4.6 (acquisition method) is NEW and very important. GPA (General Power of Attorney) transfers are technically not legal sales in India after the Supreme Court ruling. Many lenders reject GPA properties outright. This is a critical early filter.

---

### SECTION 5: Occupation & Income from Property

_Goal: What's the property being used for? Does it generate income?_

| #   | Question                      | Type       | Options                                                    | Required  | Why It Matters                                                                |
| --- | ----------------------------- | ---------- | ---------------------------------------------------------- | --------- | ----------------------------------------------------------------------------- |
| 5.1 | **Current occupation status** | radio      | Self-occupied / Rented out / Vacant / Mixed (partial rent) | Yes       | Rented = additional income consideration. Vacant >6 months = concern.         |
| 5.2 | **Monthly rental income**     | number (₹) | —                                                          | If rented | Adds to repayment capacity (with 30% haircut typically)                       |
| 5.3 | **Rental agreement type**     | radio      | Registered lease / Unregistered agreement / No agreement   | If rented | Registered lease is bankable income. Unregistered = most lenders won't count. |

---

### SECTION 6: Applicant Location

_Goal: Where does the applicant live? NRI handling._

| #   | Question                                | Type           | Options    | Required | Why It Matters                                   |
| --- | --------------------------------------- | -------------- | ---------- | -------- | ------------------------------------------------ |
| 6.1 | **Applicant's residence state (India)** | select         | State list | Yes      | For NRI: state where GPA holder / family resides |
| 6.2 | **Applicant's residence city**          | derived select | From state | Yes      | Processing branch location                       |
| 6.3 | **Residence pincode**                   | text (6-digit) | Typeahead  | No       | Verification                                     |

**NRI context**: The label should be clear: "If NRI, select the Indian location of your GPA holder or closest family member."

**Discussion point**: Should this be in the Property section or the Applicant section?

- **Current**: In property identification page (Section 1)
- **Argument for Applicant section**: It's about the PERSON, not the property
- **Argument for Property section**: DSA fills this early for lender matching — lender coverage depends on BOTH property location AND applicant location
- **Recommendation**: Keep in Section 1 (property identification) because it's needed early for lender filtering. But label it clearly.

---

### SECTION 7: Assessment History

_Goal: Has this property been assessed before? Intelligence for the DSA._

| #   | Question                    | Type            | Options                                                                                    | Required           | Why It Matters                                                |
| --- | --------------------------- | --------------- | ------------------------------------------------------------------------------------------ | ------------------ | ------------------------------------------------------------- |
| 7.1 | **Prior assessment status** | radio           | First assessment / Assessed before, not sanctioned / Assessed before, sanctioned elsewhere | No                 | Intelligence — if rejected before, DSA can avoid same lenders |
| 7.2 | **Which lenders assessed?** | text (freeform) | Comma-separated                                                                            | If assessed before | Avoid duplicating failed applications                         |

---

### SECTION 8: Existing Loan (BT path)

_Goal: If property already has a loan, capture current loan details for BT._

This is the **Balance Transfer** path. Only shown if `existingEncumbrance === "Yes, existing mortgage"`.

| #   | Question                      | Type            | Options                                                                              | Required | Why It Matters                         |
| --- | ----------------------------- | --------------- | ------------------------------------------------------------------------------------ | -------- | -------------------------------------- |
| 8.1 | **Current lender**            | select          | Bank list                                                                            | Yes      | Helps find better rates                |
| 8.2 | **Outstanding principal**     | number (₹)      | —                                                                                    | Yes      | Core BT amount                         |
| 8.3 | **Current interest rate**     | number (%)      | —                                                                                    | Yes      | Must beat this rate                    |
| 8.4 | **Original/remaining tenure** | number (months) | —                                                                                    | Yes      | EMI calculation                        |
| 8.5 | **Loan vintage**              | select          | <6mo, 6-12mo, 1-2yr, 2-5yr, >5yr                                                     | Yes      | Most lenders need >12mo vintage for BT |
| 8.6 | **Repayment track record**    | radio           | Clean (no missed) / Minor irregularity (1-2 missed) / Major irregularity (3+ missed) | Yes      | Clean track needed for BT              |
| 8.7 | **Current EMI amount**        | number (₹)      | —                                                                                    | Yes      | Obligation calculation                 |

---

### SECTION 9: Loan Requirement

_Goal: What does the applicant want?_

| #   | Question                     | Type       | Options                                                                                                                                                     | Required        | Why It Matters                              |
| --- | ---------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- | ------------------------------------------- |
| 9.1 | **Estimated property value** | number (₹) | —                                                                                                                                                           | Yes             | LTV calculation base                        |
| 9.2 | **Loan purpose**             | select     | Business expansion / Working capital / Personal needs / Debt consolidation / Home renovation / Property purchase / Education / Medical / Investment / Other | Yes             | Compliance + some lenders restrict purposes |
| 9.3 | **Required loan amount**     | number (₹) | —                                                                                                                                                           | Yes (if not BT) | Core requirement                            |
| 9.4 | **Top-up amount**            | number (₹) | —                                                                                                                                                           | Yes (if BT)     | Additional amount over BT                   |
| 9.5 | **Preferred tenure**         | select     | 5-15 years                                                                                                                                                  | Yes             | EMI calculation                             |
| 9.6 | **DOD monthly withdrawal**   | number (₹) | —                                                                                                                                                           | No              | If Dropline Overdraft preferred             |

---

## Current vs Proposed — Gap Analysis

### Questions we HAVE that are GOOD (keep):

1. Property location (state/city/pincode) — good
2. Ownership type (freehold/leasehold) — good
3. Lease remaining period — good
4. Category (residential/commercial/industrial) — good
5. Property age — good
6. Carpet/built-up area — good
7. Occupation type — good
8. Legal questions (title chain, encumbrance, dispute, EC) — good
9. All BT questions — good
10. Loan requirement questions — good

### Questions we HAVE that need CHANGES:

1. **`propertyComplianceStatus`** — Currently combines area authorization AND construction compliance in one question. **Split into two**: area classification + construction compliance.
2. **`propertyAreaType`** — Currently gated behind compliance status. Should be **FIRST** — area type drives everything else.
3. **`constructionType`** options — "Built-Up" is vague, "Plot" shouldn't be a LAP construction type (separate logic needed).
4. **`RERARegisterBuilder`** — "Builder" is wrong label for LAP. Should be "RERA registration status" (for the project/society, not builder).
5. **Residence questions** — Labels need NRI/GPA clarity.
6. **`ocCcAvailable`** — Should be conditional on area type (not relevant for colony/unauthorized).
7. **`municipalApproval`** — Should be conditional on area type.

### Questions we DON'T HAVE that we SHOULD:

1. **How property was acquired** (purchase/inheritance/gift/GPA) — Critical filter. GPA properties rejected by most lenders.
2. **Municipal tax status** — Shows legal occupancy, important for older properties.
3. **NA conversion status** — For converted residential areas.
4. **Colony regularization status** — For local colony properties (Delhi/MP/UP regularization schemes).
5. **Rental agreement type** (if rented) — Registered vs unregistered affects income counting.
6. **Number of owners** — Multiple owners all need to be co-applicants. Early awareness.
7. **Assessment history** follow-up (which lenders) — Already added in this session.

### Questions we HAVE that are UNNECESSARY:

1. None identified — all current questions serve a purpose. Some just need restructuring.

---

## Recommended Page Flow

```
Page 1: Property Location
  → State, City, Pincode
  → Applicant residence (State, City, Pincode)

Page 2: Property Character
  → Category (Residential/Commercial/Industrial/Mixed)
  → Construction type (dynamic options based on category)
  → Ownership (Freehold/Leasehold)
  → Lease remaining (if leasehold)
  → Property age
  → Area (carpet/built-up)

Page 3: Area & Compliance
  → Area classification (5 types — THIS FIRST)
  → Construction vs approved plan (compliance)
  → OC/CC (conditional)
  → RERA (conditional)
  → Municipal tax status
  → NA conversion (conditional)
  → Colony regularization (conditional)

Page 4: Legal & Title
  → How acquired (purchase/inherit/gift/GPA)
  → Original documents available
  → Title chain complete
  → Existing encumbrance (YES → triggers BT path)
  → Legal disputes
  → EC verified

Page 5: Occupation
  → Occupation status
  → Rental income (if rented)
  → Rental agreement type (if rented)

Page 6+: [Applicants, Income, Credit — same as now]

Page N-1: BT Details (if encumbrance = existing mortgage)
  → Current lender, outstanding, rate, tenure, vintage, track, EMI

Page N: Loan Requirement
  → Property value, purpose, amount/top-up, tenure
```

---

## Key Design Decisions for Discussion

### 1. Area Type FIRST or Compliance FIRST?

- **Current**: Compliance first ("Is it in authorized area?") → then area type
- **Proposed**: Area type FIRST → then compliance flows naturally
- **Why**: Area type is objective fact. Compliance is subjective assessment. DSA knows the area type; compliance requires interpretation.

### 2. Should "Plot" be a LAP option?

- LAP on vacant plot is RARE. Most lenders only do LAP on constructed property.
- Some NBFCs do fund LAP on plots (Tata Capital, Bajaj).
- **Option A**: Include with warning ("Very few lenders fund LAP on vacant plots")
- **Option B**: Exclude — if they have a plot, they should use Plot Loan form
- **Recommendation**: Option A — include but with clear warning. Let rule engine handle eligibility.

### 3. How to handle "acquisition method" for existing owners?

- This is NEW and important. GPA transfers are a minefield.
- **Recommendation**: Add as first question in Legal section. If GPA → show warning about limited lender options.

### 4. Single vs Multi-property LAP?

- Some applicants want LAP on multiple properties combined.
- **Current**: Not supported (single property assumed)
- **Recommendation**: Keep single property for V1. Multi-property is rare and complex.

### 5. Where to ask about number of property owners?

- If property has 3 owners, all 3 must be co-applicants.
- **Option A**: Ask in property section (early awareness)
- **Option B**: Handle during applicant registration (current approach)
- **Recommendation**: Add a note/tooltip in applicant section, not a separate question.

---

## Summary of Changes Needed

| Change                                                    | Effort | Impact                                        |
| --------------------------------------------------------- | ------ | --------------------------------------------- |
| Split compliance into area type + construction compliance | Medium | HIGH — fixes root cause of all contradictions |
| Reorder: area type FIRST                                  | Low    | HIGH — better logic flow                      |
| Add "How acquired" question                               | Low    | HIGH — GPA filter                             |
| Add municipal tax status                                  | Low    | Medium                                        |
| Add conditional compliance questions (NA, regularization) | Medium | Medium — area-type-specific                   |
| Fix construction type options per category                | Medium | Medium                                        |
| Add rental agreement type                                 | Low    | Low                                           |
| Update all showWhen gates to use new structure            | High   | Required — cascading change                   |
| Update wizard sections                                    | Low    | Required                                      |
| Update payload grouping                                   | Low    | Required                                      |

**Total estimated effort**: 1-2 sessions depending on discussion outcomes.
