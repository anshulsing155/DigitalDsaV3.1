# Home Loan V2 — Question Audit Report

**Date:** 2026-02-26
**Schema:** `homeLoanSchemaV2.json` (17 pages, 84 questions)
**Purpose:** Identify duplicates, map every contextKey's downstream usage, document assessment value

---

## 1. CONFIRMED DUPLICATE

### `propertyType` (Property Location) vs `constructionType` (Property Character)

| Attribute | `propertyType` (Location page) | `constructionType` (Character page) |
|---|---|---|
| Question ID | `q3_propertyType` | `q1_constructionType` |
| Page | `propertyLocation_homeLoan` | `propertyCharacter_homeLoan` |
| Question text | "What type of property is this?" | "What type of construction is it?" |
| Options | Flat, House, Floor | House, Flat, Floor |
| **Same options?** | **YES — identical values** | **YES — identical values** |
| Both visible? | **YES — same page showWhen** | **YES — same page showWhen** |

**Downstream usage:**

| Layer | `propertyType` | `constructionType` → `constructionStatus` |
|---|---|---|
| Payload builder (loanTransaction.ts) | ✅ → `payload.propertyType` | ✅ → `payload.constructionStatus` |
| Payload types (types.ts) | ✅ `propertyType?: string` | ✅ `constructionStatus?: string` |
| Case payload (casePayload.ts) | ❌ not present | ✅ `constructionStatus` |
| Case payload builder | ✅ `type: answers.propertyType` | ✅ `constructionStatus: answers.constructionType` |
| Rule validator | ✅ whitelisted | ✅ whitelisted |
| Payload enricher | ❌ not used | ❌ not used |
| Evaluation engine | ❌ not used | ❌ not used |
| Result builder | ❌ not used | ❌ not used |
| Bank rule docs | ❌ no rules | ❌ no rules |
| ShowWhen gates (schema) | Only gates `propertyStateName` | Gates 10+ questions (PropertyStage, propertyAge, carpetArea, projectName, ocCcAvailable, municipalApproval) |
| UI logic (+page.svelte) | ❌ not referenced | ✅ line 1039 (default "House" in assessment payload) |

**Recommendation:** Remove `propertyType` (q3) from `propertyLocation_homeLoan`. Keep `constructionType` on `propertyCharacter_homeLoan`. Update the showWhen for `q4_propertyStateName` to gate on `purchaseType != ""` instead of `propertyType != ""`.

**Status (2026-02-26):** RESOLVED. Removed duplicate `q3_propertyType` from Property Location page. Added fallback chains (`propertyType || constructionType || ''`) in payload builders for backward compatibility.

**Cross-loan-type note:** In LAP and Plot Loan schemas, `propertyType` means something DIFFERENT (Freehold / Lease Hold = ownership type). So this is a Home Loan V2-only naming collision where `propertyType` was repurposed to mean the same thing as `constructionType`.

---

## 2. INTENTIONAL SHARED CONTEXT KEYS (Not Duplicates)

These contextKeys appear on multiple pages but are on **mutually exclusive** pages (different showWhen):

| contextKey | Pages | Why not a duplicate |
|---|---|---|
| `marketValue` | dealFinancials (New Loan) + loanRequirements (BT) | Mutually exclusive: New Loan vs BT |
| `mortgageYear` | dealFinancials + loanRequirements + sanctionProfile | Three mutually exclusive flows |
| `mortgageYearCustom` | dealFinancials + loanRequirements + sanctionProfile | Companion to mortgageYear |
| `deposit` | dealFinancials (New Loan) + sanctionProfile (Pre-sanction) | Mutually exclusive |

---

## 3. COMPLETE QUESTION INVENTORY — ASSESSMENT VALUE & STATUS

### Page 1: `caseIntake_homeLoan` — Case Intake

| contextKey | Status | Current Use | Assessment Value |
|---|---|---|---|
| `priorAssessmentHistory` | ✅ ACTIVE | Payload, ruleValidator | **HIGH** — DSAs can flag cases already seen by lenders. Banks care about "shopping" risk. Could drive a "case freshness" signal: first assessment = clean, 3+ lenders = red flag |
| `propertyIdentified` | ✅ ACTIVE | Payload, enricher, evaluationEngine, resultBuilder, tranche guard | **CRITICAL** — Gates entire property section. When "No", enables pre-sanction flow. Used in tranche calculation guard |

### Page 2: `propertyLocation_homeLoan` — Property Location & Type

| contextKey | Status | Current Use | Assessment Value |
|---|---|---|---|
| `propertyAreaType` | ✅ ACTIVE | Payload, enricher, ruleValidator, casePayload | **HIGH** — Gates all area-specific compliance questions. Could drive risk scoring (PLANNED_AUTHORITY = low risk, LOCAL_COLONY = high risk). Banks have area-specific policies |
| `specialAreaRestriction` | ✅ ACTIVE | Payload, ruleValidator | **HIGH** — Cantonment/CRZ/Tribal zones have lending restrictions. Most banks won't fund CRZ or Tribal areas. Could auto-reject or flag |
| `purchaseType` | ✅ ACTIVE | Payload, enricher, ruleValidator, casePayload, all loan types | **CRITICAL** — Resale vs builder affects entire flow (seller page visibility, documentation needs). Banks have different policies for resale vs new |
| `propertyType` | ✅ REMOVED (2026-02-26) | Was duplicate of `constructionType`. Fallback chains added in payload builders | **RESOLVED** — Removed from schema. See Section 1 |
| `propertyStateName` | ✅ ACTIVE | Payload, enricher, casePayload, optionResolver, location cascade, all 3 secured loans | **CRITICAL** — Primary geographic filter for lender matching. Banks operate in specific states/cities |
| `propertyCityName` | ✅ ACTIVE | Same as propertyStateName — always paired | **CRITICAL** — Same as above |
| `pincode` | ✅ ACTIVE | Payload, casePayload, typeahead validation | **MEDIUM** — Granular location. Could map to micro-markets for valuation. Currently used for pincode validation only |

### Page 3: `propertyCharacter_homeLoan` — Property Character

| contextKey | Status | Current Use | Assessment Value |
|---|---|---|---|
| `constructionType` | ✅ ACTIVE | Payload (→constructionStatus), casePayload, ruleValidator, UI default, 10+ showWhen gates | **HIGH** — Flat vs House vs Floor determines: OC/CC applicability, municipal approval flow, project name relevance. Banks have type-specific LTV limits (e.g., independent house may get lower LTV) |
| `PropertyStage` | ✅ ACTIVE | Payload (→propertyStage), casePayload, enricher, ruleValidator | **CRITICAL** — Under Construction vs Ready To Move fundamentally changes: disbursement mode (tranche vs lump sum), LTV calculation, RERA applicability. Banks offer different rates for UC vs RTM |
| `propertyAge` | ✅ ACTIVE | casePayload, ruleValidator | **HIGH** — Banks have max property age limits (e.g., max 30 years, residual life must > tenure). Could drive: age-based LTV reduction, residual life check, rejection for very old properties |
| `carpetArea` | ✅ ACTIVE | Payload (with unit conversion), casePayload, ruleValidator | **HIGH** — Used for per-sqft valuation checks. Banks have min/max area requirements (e.g., min 300 sqft). Could drive valuation reasonableness check |
| `projectName` | ⚠️ GAP | Schema only — NOT extracted to payload, casePayload, ruleValidator | **MEDIUM** — Could be used for project-approved lender matching (if project is pre-approved by specific banks, those banks get priority). Currently captured but lost downstream |

### Page 4: `btRegistry_homeLoan` — BT Registry & Possession

| contextKey | Status | Current Use | Assessment Value |
|---|---|---|---|
| `isRegistryDone` | ✅ ACTIVE | Payload, casePayload, ruleValidator, showWhen gates (BT flow) | **CRITICAL** — BT with registry done = simpler process. Without registry = additional tranche complexity. Gates sixMonthsPassedAfterRegistry |
| `bt_possessionAndDemandStatus` | ✅ ACTIVE | Payload, ruleValidator | **HIGH** — "No possession + demand pending" = highest risk for BT. Banks want to know if builder disputes exist. Could drive risk adjustment |
| `bt_outstandingDemandAmount` | ✅ ACTIVE | Payload, ruleValidator | **HIGH** — Outstanding builder demand reduces net disbursal. Should be factored into LCR calculation as a deduction |
| `sixMonthsPassedAfterRegistry` | ✅ ACTIVE | Payload, casePayload, ruleValidator | **HIGH** — Many banks require 6 months post-registry for BT. Pre-6-months = limited lender options. Could auto-filter lenders |

### Page 5: `propertyCondition_homeLoan` — Property Condition & Compliance

| contextKey | Status | Current Use | Assessment Value |
|---|---|---|---|
| `propertyComplianceStatus` | ✅ ACTIVE | Payload, enricher (→approvedByAuthority, asPerMap), casePayload, ruleValidator | **CRITICAL** — "not_authorized" = most banks will reject. "authorized_not_per_plan" = limited lenders. Drives the core compliance signal for underwriting |
| `ocCcAvailable` | ✅ ACTIVE | Payload, enricher, casePayload, ruleValidator | **CRITICAL** — No OC/CC = many banks won't fund (legal risk). "CC_ONLY" = some banks accept. Could auto-reject for "NONE" with certain banks |
| `municipalApproval` | ✅ ACTIVE | Payload, casePayload, ruleValidator | **HIGH** — House without building plan = major red flag. "NO_PLAN" could auto-reject or severely limit options |
| `isPossessionOfferedByAuthority` | ✅ ACTIVE | Payload, enricher (→possessionByAuthority), ruleValidator, UI conditional | **HIGH** — For new direct-from-builder RTM properties. "No" = builder hasn't delivered = risk |
| `reraRegistrationStatus` | ✅ ACTIVE | Payload, casePayload, ruleValidator | **HIGH** — Under Construction + not RERA registered = illegal in many states post-2016. "NOT_REGISTERED" could auto-reject for compliant banks |
| `naConversionStatus` | ✅ ACTIVE | Payload, enricher (→naConversionComplete), casePayload, ruleValidator | **HIGH** — Converted residential land without NA order = agricultural land, banks won't fund. "NOT_STARTED" = rejection risk |
| `zoneClassification` | ✅ ACTIVE | Payload, enricher (→isResidentialZone), casePayload, ruleValidator | **HIGH** — GREEN_BELT or non-residential zone = most banks won't fund residential property there. Could auto-filter |
| `municipalTaxStatus` | ✅ ACTIVE | Payload, enricher (→hasMunicipalTaxRecords), casePayload, ruleValidator | **MEDIUM** — "UNPAID" = title risk indicator. Some banks require current tax receipts. Could flag as documentation gap |
| `unauthorizedAdditions` | ✅ ACTIVE | Payload, enricher (→hasUnauthorizedConstruction), casePayload, ruleValidator | **HIGH** — "MAJOR" unauthorized construction = valuation mismatch, legal risk. Banks may reduce LTV or reject |
| `revenueRecordStatus` | ✅ ACTIVE | Payload, enricher (→hasRevenueRecords), casePayload, ruleValidator | **HIGH** — For local colony/village properties. "NOT_AVAILABLE" = no legal proof of ownership. Major rejection risk |
| `colonyRegularizationStatus` | ✅ ACTIVE | Payload, enricher (→isColonyRegularized), casePayload, ruleValidator | **HIGH** — "NOT_REGULARIZED" = informal settlement. Most mainstream banks won't fund. Only niche lenders might consider |
| `gramPanchayatPermission` | ✅ ACTIVE | Payload, casePayload, ruleValidator | **MEDIUM** — For village/panchayat area properties. "NO" = construction without local authority permission. Risk factor |

### Page 6: `sellerTransaction_homeLoan` — Seller & Transaction Details

| contextKey | Status | Current Use | Assessment Value |
|---|---|---|---|
| `sellerOnLoan` | ✅ ACTIVE | Payload, ruleValidator, enricher | **HIGH** — If seller has existing loan, buyer's bank must coordinate payoff. Adds complexity. Could flag for inter-bank coordination needs |
| `sellerOutstandingAmount` | ✅ ACTIVE | Payload, ruleValidator | **HIGH** — Reduces net disbursal to buyer (bank pays off seller's loan first). Should be factored into disbursement planning |
| `sellerCurrentLender` | ✅ ACTIVE | Payload, ruleValidator, optionResolver | **MEDIUM** — Same-bank BT for seller is simpler. Cross-bank needs NOC. Could influence lender preference |
| `ifPropertyRegistered` | ✅ ACTIVE | Payload, casePayload, ruleValidator | **HIGH** — Resale without seller registry = agreement-to-sell only = higher risk. Banks may require different documentation |
| `lastRegistryDuration` | ✅ ACTIVE | Payload, ruleValidator | **HIGH** — Recent registry (<6 months) may raise "flipping" concerns. Very old registry is safer. Could influence scrutiny level |
| `isAnyBuilderDemand` | ✅ ACTIVE | Payload, ruleValidator | **MEDIUM** — Builder demand on resale = unusual situation (usually builder-to-buyer, not resale). Could flag for additional verification |

### Page 7: `legalVerification_homeLoan` — Legal Verification

| contextKey | Status | Current Use | Assessment Value |
|---|---|---|---|
| `documentationReadiness` | ✅ ACTIVE | Payload, enricher, casePayload, ruleValidator | **HIGH** — "NOT_STARTED" or "ISSUES_FOUND" = processing delays. Could estimate timeline for the DSA |
| `propertyDisputeStatus` | ⚠️ PARTIAL | enricher, ruleValidator (but NOT in payloadBuilder or casePayload) | **CRITICAL** — "ACTIVE_DISPUTE" or "LITIGATION" = absolute rejection by all banks. Must be fully wired. Currently a gap in payload pipeline |
| `nocFromPreviousLender` | ⚠️ GAP | Schema only — NOT extracted anywhere | **HIGH** — For BT cases, no NOC = can't close existing loan = deal blocker. Should be extracted and flagged |
| `titleChainStatus` | ✅ ACTIVE | Payload, enricher (→ownershipChainComplete), casePayload, ruleValidator | **CRITICAL** — "UNCLEAR" or "PARTIAL_GAPS" = legal risk. Banks require clear title chain. Drives legal verification urgency |
| `encumbranceCertStatus` | ✅ ACTIVE | Payload, enricher (→encumbranceCertificateVerified), casePayload, ruleValidator | **CRITICAL** — "ENCUMBERED" = existing mortgage/lien = can't fund (or needs payoff). "NOT_OBTAINED" = must be obtained before processing |
| `successionStatus` | ✅ ACTIVE | Payload, casePayload, ruleValidator | **HIGH** — Inherited property with incomplete succession = legal minefield. "SUCCESSION_PENDING" = processing blocked until court order/family settlement |
| `revenueRecordMutation` | ✅ ACTIVE | Payload, casePayload, ruleValidator | **HIGH** — Revenue records showing previous owner = name mismatch risk. "NOT_MUTATED" could delay processing significantly |

### Page 8-13: Component-Rendered Pages (Applicant, Income, Credit)

These pages have `questions: []` in the schema. All data is managed by Svelte components:

| Page | Component | Assessment Notes |
|---|---|---|
| `tellUs_homeLoan` | ApplicantFormSecured | Applicant demographics, company details — fully wired via applicant store |
| `applicantProfilePage` | ApplicantProfilePage | Education, religion, SC/ST category, disability, residence, properties — see below |
| `incomeProfilesPage` | IncomeProfileSelector | 12 income types — the competitive moat. Fully wired |
| `incomeDetailsPage` | IncomeSourceForm | Per-source amounts with haircuts. Fully wired |
| `creditScorePage` | CreditScoreSection | CIBIL score + factors. Fully wired |
| `obligationsPage` | UnsecuredObligation | Running loans/limits. Fully wired for FOIR calculation |

### Applicant Profile Page — Detailed Question Inventory (Added 2026-02-26)

These questions are rendered by `ApplicantProfilePage.svelte` (component-rendered, not schema-driven). Individual applicants only unless noted.

| contextKey | Visibility | Options | Pipeline Status | Assessment Value |
|---|---|---|---|---|
| `education` | Always (Individual) | 10th Pass, 12th Pass, Graduate+, Professional | form.ts → payloadBuilder → casePayload → ruleValidator | **MEDIUM** — Some banks correlate education with income stability |
| `religion` | Always (Individual) | Hindu, Muslim, Christian, Sikh, Buddhist, Jain | form.ts → payloadBuilder → casePayload → ruleValidator | **LOW** — Gates SC/ST question. Not used in bank rules directly |
| `casteCategory` | Hindu only (Individual) | General, OBC, SC, ST | form.ts → payloadBuilder → casePayload → ruleValidator → enricher (`isSCST`) | **HIGH** — SBI, PNB, BOB offer reduced interest rates for SC/ST applicants. Case-level `isSCST` = true if ANY applicant is SC or ST |
| `hasDisability` | Always (Individual) | No, Yes | form.ts → payloadBuilder → casePayload → ruleValidator → enricher (`hasDisabledApplicant`) | **HIGH** — PMAY and some banks offer interest rate concessions for persons with disabilities. Case-level `hasDisabledApplicant` = true if ANY applicant says Yes |
| `ownedResidentialProperties` | Always (Individual) | None, 1, 2, 3+ | form.ts → payloadBuilder → casePayload → ruleValidator | **HIGH** — Affects LTV limits (first home vs second home). PMAY eligibility requires no existing property |
| `residencePattern` | Always (Individual) | Same city, Different city same state, Different state | form.ts → payloadBuilder → casePayload → ruleValidator | **MEDIUM** — Non-local applicants may face different verification requirements |
| `residenceState` / `residenceCity` / `residencePincode` | When residence != same city | Cascade (state → city → pincode) | form.ts → payloadBuilder → casePayload | **MEDIUM** — Location verification. Pincode validates against city |
| `nriCountry` | When NRI detected | Text input | form.ts → payloadBuilder → casePayload | **HIGH** — Country of residence affects NRI documentation requirements |
| `companyOwnedProperties` | Company applicants | — | form.ts → payloadBuilder → casePayload | **MEDIUM** — Asset backing for company applicants |
| `companyOfficeProximity` | Company applicants | — | form.ts → payloadBuilder → casePayload | **MEDIUM** — Proximity to property for company applicants |

**Enricher Derivations (case-level aggregation):**

| Derived Key | Source | Logic | Assessment Value |
|---|---|---|---|
| `isSCST` | `casteCategory` per applicant | `Yes` if ANY applicant has `casteCategory` = `SC` or `ST` | **HIGH** — Unlocks SC/ST rate concessions from SBI, PNB, BOB |
| `hasDisabledApplicant` | `hasDisability` per applicant | `Yes` if ANY applicant has `hasDisability` = `Yes` | **HIGH** — Unlocks PMAY and bank disability concessions |

### Page 14: `dealFinancials_homeLoan` — Deal & Financials (New Loan Only)

| contextKey | Status | Current Use | Assessment Value |
|---|---|---|---|
| `auctionPropertyStatus` | ✅ ACTIVE | Payload, enricher, ruleValidator | **HIGH** — Auction properties have title risks and different documentation needs. Some banks won't fund auction purchases. Could auto-filter |
| `mortgageYear` | ✅ ACTIVE | Payload, casePayload, ruleValidator, UI logic, all 6 loan types | **CRITICAL** — Drives EMI calculation, total interest, and eligibility (age + tenure must not exceed bank's max) |
| `mortgageYearCustom` | ✅ ACTIVE | Companion to mortgageYear when "OTHER" selected | **LOW** — Just the custom input for mortgageYear |
| `marketValue` | ✅ ACTIVE | Payload, enricher, evaluationEngine (LTV calc), resultBuilder | **CRITICAL** — Core of LTV calculation. LTTV = Loan / Market Value. RBI caps at specific ratios |
| `propCost` / `propertyCost` | ✅ ACTIVE | Payload (V1/V2 fallback), enricher (hasBlackMoney), evaluationEngine, resultBuilder (tranche calc) | **CRITICAL** — Deal value. When registryValue < propCost = black money signal. Tranche = registryValue × LCR% |
| `registryValue` | ✅ ACTIVE | Payload, enricher (hasBlackMoney), evaluationEngine (LCR calc), resultBuilder (tranche calc) | **CRITICAL** — Core of LCR calculation. registryValue × LCR% = loan tranche at/before registry |
| `deposit` | ✅ ACTIVE | Payload (→downPayment), ruleValidator, UI (downpaymentPercentage), offers page | **CRITICAL** — Down payment determines loan amount needed. deposit/(propCost) = down payment % |
| `advanceInAgreement` | ✅ ACTIVE | Payload, enricher, evaluationEngine (LCR factor) | **HIGH** — Already-paid advance affects net disbursement. Factored into LCR calculation |
| `registryTimeline` | ✅ ACTIVE | Payload, ruleValidator, resultBuilder (urgency calc) | **HIGH** — Drives urgency sorting of lenders. WITHIN_1_MONTH = highest priority for fast-processing banks |
| `registryPlannedDate` | ✅ ACTIVE | Payload, ruleValidator | **MEDIUM** — Specific date when SPECIFIC_DATE selected. Could drive processing timeline estimates |
| `registryDateReason` | ✅ ACTIVE | Payload, ruleValidator | **LOW** — Nice-to-have context. Auspicious date vs tax planning could indicate flexibility |

### Page 15: `btExistingLoan_homeLoan` — Existing Loan Details (BT Only)

| contextKey | Status | Current Use | Assessment Value |
|---|---|---|---|
| `sanctionAmount` | ✅ ACTIVE | Payload, casePayload, ruleValidator | **HIGH** — Original sanction vs current outstanding shows repayment discipline |
| `loanAccountNumber` | ⚠️ GAP | Schema only — NOT extracted | **LOW** — Reference number for tracking. Not assessment-relevant but useful for operations. Could be extracted to case payload |
| `loanDisbursementDate` | ✅ ACTIVE | Payload, enricher (calculates EMI age in months), ruleValidator | **HIGH** — Loan vintage = time since first EMI. Banks require minimum vintage (typically 12 months) for BT. Enricher calculates this |
| `interestRateType` | ✅ ACTIVE | Payload, casePayload, ruleValidator | **MEDIUM** — Fixed vs floating affects BT benefit calculation. Floating rate customers are easier to BT |
| `emiBounceHistory` | ✅ ACTIVE | Payload, casePayload, ruleValidator | **CRITICAL** — 0 bounces = clean track record → FOIR waiver for BT. 3+ bounces = near-certain rejection. Key eligibility gate |
| `principalOutstanding` | ✅ ACTIVE | Payload, casePayload, ruleValidator, all loan types | **CRITICAL** — Current outstanding determines BT loan amount needed. Must be < property value × LTV |
| `existingInterestRate` | ✅ ACTIVE | Payload (→currentInterestRate), casePayload, ruleValidator | **CRITICAL** — BT is only beneficial if new rate < existing rate. Drives the "savings" calculation shown on offer cards |
| `orignalRemaningTenure` | ✅ ACTIVE | Payload (→remainingTenure), casePayload, ruleValidator, evaluationEngine | **HIGH** — Remaining tenure affects EMI restructuring options. New tenure can be shorter or longer |
| `selectSingleBank` | ✅ ACTIVE | Payload (→currentBank), ruleValidator, optionResolver, offers page | **HIGH** — Current lender. Same-bank top-up is simpler. Cross-bank BT needs NOC + more docs |
| `includedCurrentEMIsAmount` | ✅ ACTIVE | Payload (→currentEMI), ruleValidator | **HIGH** — Current EMI is excluded from FOIR calculation (it will be replaced by new EMI). Critical for correct eligibility |

### Page 16: `loanRequirements_homeLoan` — Loan Requirements (BT Only)

| contextKey | Status | Current Use | Assessment Value |
|---|---|---|---|
| `marketValue` | ✅ ACTIVE | (Same as dealFinancials — mutually exclusive page) | **CRITICAL** — Same assessment value |
| `mortgageYear` | ✅ ACTIVE | (Same as dealFinancials — mutually exclusive page) | **CRITICAL** — Same assessment value |
| `mortgageYearCustom` | ✅ ACTIVE | Companion | Same |
| `showResultOfBtWithTopUp` | ✅ ACTIVE | Payload, ruleValidator | **HIGH** — Gates the top-up flow within BT. When "No", top-up details are skipped |
| `topUpTenure` | ✅ ACTIVE | Payload, ruleValidator | **HIGH** — Top-up tenure can differ from BT tenure. Affects top-up EMI calculation |
| `topUpAmount` | ✅ ACTIVE | Payload, ruleValidator, resultBuilder | **CRITICAL** — The additional loan amount requested beyond BT. Subject to available equity check |
| `topUpPurpose` | ✅ ACTIVE | Payload, ruleValidator | **MEDIUM** — Some purposes (renovation, business) may need additional documentation. Banks may restrict certain purposes |

### Page 17: `sanctionProfile_homeLoan` — Pre-Sanction Profile (New Loan, Property Not Identified)

| contextKey | Status | Current Use | Assessment Value |
|---|---|---|---|
| `mortgageYear` | ✅ ACTIVE | Same as dealFinancials | **CRITICAL** — Same |
| `mortgageYearCustom` | ✅ ACTIVE | Companion | Same |
| `sanctionType` | ✅ ACTIVE | Payload, ruleValidator | **HIGH** — "Based On Eligibility" = max possible loan. "Based on Downpayment" = budget-driven. Different calculation approaches |
| `deposit` | ✅ ACTIVE | Same as dealFinancials (mutually exclusive) | **CRITICAL** — Same |
| `withPersonalLoan` | ✅ ACTIVE | Payload, ruleValidator | **MEDIUM** — Cross-sell opportunity. If down payment is short, personal loan can bridge the gap. Shows personal loan offers alongside |

---

## 4. GAP KEYS — Captured but Not Fully Wired

| contextKey | Where Captured | What's Missing | Priority to Wire |
|---|---|---|---|
| `projectName` | Property Character page | Not in payloadBuilder, casePayload, ruleValidator | **MEDIUM** — Could enable project-approved lender matching |
| `propertyDisputeStatus` | Legal Verification page | In enricher + ruleValidator, but NOT in payloadBuilder or casePayload | **HIGH** — Active disputes = absolute rejection. Must reach case payload |
| `nocFromPreviousLender` | Legal Verification page (BT only) | NOT extracted anywhere downstream | **HIGH** — BT deal blocker. Should be in payloadBuilder + casePayload |
| `loanAccountNumber` | BT Existing Loan page | NOT extracted anywhere | **LOW** — Operational reference only. Nice to have in case payload |

---

## 5. NAME MAPPING TABLE (contextKey → Payload Field)

These keys have different names in the schema vs the payload system:

| Schema contextKey | Payload Field (types.ts) | Reason |
|---|---|---|
| `constructionType` | `constructionStatus` | Historical naming |
| `PropertyStage` | `propertyStage` | Capital P → lowercase |
| `existingInterestRate` | `currentInterestRate` | Historical naming |
| `selectSingleBank` | `currentBank` | Historical naming |
| `includedCurrentEMIsAmount` | `currentEMI` | Historical naming |
| `deposit` (V2) / `downPayment` (V1) | `downPayment` | V1/V2 migration |
| `orignalRemaningTenure` | `remainingTenure` | Typo in contextKey preserved |

---

## 6. ORPHANED KEY

| Key | Status | Action |
|---|---|---|
| `typeOfProperty` | Zero matches anywhere in codebase | Can be ignored — not in any schema or code |

---

## 7. ASSESSMENT VALUE SUMMARY

### Currently Unused in Evaluation but Available for Bank Rules

These keys are fully wired through the payload pipeline and whitelisted in `ruleValidator.ts`, meaning bank rule documents can reference them immediately with no code changes:

| Key | Assessment Use Case |
|---|---|
| `propertyAreaType` | Risk tier by area type (planned = low, colony = high) |
| `specialAreaRestriction` | Auto-reject for CRZ/Tribal zones |
| `constructionType` / `constructionStatus` | Type-specific LTV limits, type-specific documentation checklists |
| `propertyAge` | Max age limits, residual life validation |
| `carpetArea` | Min/max area requirements, per-sqft valuation reasonableness |
| `auctionPropertyStatus` | Auto-flag for additional legal scrutiny |
| `bt_possessionAndDemandStatus` | BT risk classification |
| `bt_outstandingDemandAmount` | Net disbursal reduction |
| `reraRegistrationStatus` | Under Construction compliance gate |
| All area-specific keys | Area-specific compliance scoring |
| `registryTimeline` | Urgency-based lender sorting (deferred — Step 6) |

### Keys Already Used in Evaluation Engine

| Key | How It's Used |
|---|---|
| `propertyIdentified` | Tranche guard — must be "Yes" for tranche calculation |
| `marketValue` | LTV = loanAmount / marketValue |
| `registryValue` | LCR = loan / registryValue (capped at max_ltv) |
| `propertyCost` | hasBlackMoney = registryValue < propertyCost |
| `deposit` / `downPayment` | Down payment % calculation |
| `advanceInAgreement` | LCR calculation factor |
| `mortgageYear` | Tenure for EMI calculation |
| `emiBounceHistory` | FOIR waiver eligibility for BT |
| `principalOutstanding` | BT loan amount |
| `existingInterestRate` | BT savings calculation |
| `remainingTenure` | EMI restructuring |

---

## 8. ACTION ITEMS

1. ~~**Remove `propertyType` from `propertyLocation_homeLoan`**~~ — **DONE (2026-02-26)**. Removed from schema, fallback chains added in payload builders.
2. **Wire `propertyDisputeStatus`** to payloadBuilder + casePayload — it's a critical rejection signal that currently doesn't reach persistence.
3. **Wire `nocFromPreviousLender`** to payloadBuilder + casePayload — BT deal blocker.
4. **Wire `projectName`** to casePayload (at minimum) — enables future project-approved matching.
5. **Keep `loanAccountNumber` as-is** — low priority, operational only.
