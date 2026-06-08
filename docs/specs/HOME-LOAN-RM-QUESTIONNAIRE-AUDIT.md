# Home Loan — RM Questionnaire Audit (Pass 1)

> **Status**: Pass 1 COMPLETE for the 10 declarative-schema pages. Pages 7–12 (Applicant / Applicant Profile / Income Profiles / Income Details / Credit Score / Obligations) are custom Svelte components and need a separate component-by-component audit sub-pass.
> **Last updated**: 2026-05-29.
> **Source of truth**: `src/lib/config/homeLoan/composer.ts` + `questionBank/*.ts` + shared `src/lib/config/schema/caseIntakeQuestions.ts`.
> **Purpose**: For every question the Home Loan form asks the DSA, derive the equivalent question we'd put in the **RM-side policy questionnaire** so the RM specifies what the lender accepts. Two-pass plan per owner direction:
>
> 1. **Pass 1 (this document)** — comprehensive raw inventory. Every question on every declarative page, verbatim, with the derived RM question and answer space. No design judgment yet.
> 2. **Pass 2 (next)** — based on Pass 1 inventory, optimise the RM form to cover the surface systematically as policy: group related rules together, dedupe where the engine reads one field across multiple branches (e.g. `propertyComplianceStatus` has 5 variants — q1a/q1b/q1c/q1d/q1e), identify Track B comment scopes, separate lender-level vs scenario-level fields.

---

## How to read this audit

Every row in the per-page tables represents one DSA question.

| Column | What it means |
|---|---|
| `#` | Page.Question reference (e.g. 4.2 = Page 4, Question 2) |
| **DSA question** | Verbatim text the DSA sees on the form |
| **bindsTo** | Form-state key where the DSA's answer lands. **Same name the rule engine reads** — so the RM-side schema field can mirror it. |
| **DSA input** | `radio` · `select` · `multi-select` · `number` · `currency` · `monthYear` · `text` · `location-picker` |
| **DSA option set / numeric range** | Exact options or numeric bounds + unit |
| **RM question (Track A)** | What we'd ask the lender's RM about this property. Always flip from *"what does the customer have?"* → *"what does the lender accept?"* |
| **RM answer space** | Exact option set the RM picks from — mirrors the DSA set wherever possible |

### Row markers

- **`— context only`** — DSA captures case context (e.g. "has this been rejected before?") that the engine does not read as a lender-policy field. RM questionnaire skips.
- **`Track B`** — DSA captures something free-form (e.g. builder name from a dynamic per-city list) that the lender expresses as scoped exceptions rather than a closed accept/reject space. RM enters as scoped free-text comment rendered on the offer card.
- **`Compound`** — DSA question expands into multiple sub-fields (e.g. property location = state + city + area + pincode). Each sub-field has its own RM treatment.
- **`branch-aware`** — same `bindsTo` is used in two or more branches with different option sets (e.g. `propertyComplianceStatus` has 5 area-specific variants). Each branch gets its own RM row.

---

## ⚠️ Critical reset before Pass 2 — multi-dimensional fields

**Owner direction (2026-05-29 session close)**: the Page 0 lender-level draft below treats ROI, tenure, FOIR, max loan amount, GPA acceptance, and guarantor criteria as **single per-lender values**. **They are not.** Each varies along multiple dimensions and Pass 2 must redesign the RM questionnaire schema to capture them as **slabs / matrices**, not flat fields.

### Multi-dimensional fields — the real shape

| Field | Varies by | Real shape |
|---|---|---|
| **ROI** | Income profile · CIBIL band · loan amount band · LTV band · location tier · applicant role (primary / co-applicant / guarantor) · NRI status · employment vintage · risk-adjusted premiums | A **multi-axis pricing matrix**. RM defines base ROI per income profile, then deltas/premiums per other dimension. |
| **Tenure** | Income profile · applicant age (max age at maturity, which varies per role) · property age · property type · loan amount · pre-sanction vs identified | A **per-profile max tenure cap**, plus a per-applicant-role age-at-maturity ceiling, plus property-age cross-cap. |
| **FOIR** | Income profile · gross monthly income band (typical lender slabs: ₹50k→50%, ₹1L→55%, ₹1.5L→60%, ₹2L+→65%) · applicant role · city tier · total assessed income | A **slab table**: profile × income-band → FOIR %. |
| **Max loan amount** | Income profile · location tier · property type · per-profile policy cap (e.g. cash income capped at ₹50L regardless of FOIR) | A **per-profile cap** + a **per-location-tier cap**, whichever binds. |
| **GPA (General Power of Attorney) acceptance** | Registered vs unregistered · specific-for-property vs general · relationship between donor & donee (some lenders accept only family GPA) · property type | A **multi-axis acceptance grid**: GPA type × donor-donee relationship × property type → accept/reject/conditional. |
| **Guarantor criteria** | Capacity % (already in Tier 3b) PLUS family vs non-family · NRI guarantor · guarantor age cap · accepted guarantor profiles · property-backed floor · GPA-based guarantor | Multiple new fields beyond `min_emi_capacity_percent` — each needs its own RM input. |

### What Pass 2 must do

1. **Redesign the RM questionnaire schema** to support slab/matrix inputs as a first-class input type — alongside the existing single/multi/boolean/number/cap types from the Track A design.
2. **Identify the dimensions per field** before drafting questions. Every multi-axis field needs an upfront "tell us which dimensions you slab on" question, then the RM fills the resulting matrix.
3. **Pre-fill common patterns** so the RM isn't entering ₹50k→50% / ₹1L→55% from scratch for every lender — offer a default slab set and the RM adjusts.
4. **Engine-side parity check**: confirm `evaluationEngine.ts` already reads ROI / tenure / FOIR / max-amount with the right dimensionality. Some it does (FOIR per `max_foir` from the rule doc; ROI per income profile via `params.roi`); some it may flatten today and need expansion.
5. **GPA section is currently a single yes/no equivalent on Page 5** (`q3_propertyAcquisitionMethod` covers `AGREEMENT_POA`; `poaRegistrationStatus` covers registered vs not). The real RM-side handling is much richer — full GPA-acceptance grid + Track B for state-specific GPA rules.
6. **Guarantor v1.1 carve-overs** captured during Tier 3b need full coverage: property-backed floor, family/non-family threshold variation, capacity-gap-based ROI premium, GPA-based guarantor, NRI guarantor.

**Net Pass 1 unchanged below — but Pass 2 starts with a schema-design reset around these multi-dimensional fields.** The "Page 0" draft below is preserved for reference only; many of those rows will become slab/matrix inputs.

---

## Page 0 — Lender-level parameters (engine fields not asked of the DSA)

These fields are **engine inputs the DSA-facing form does NOT ask about** — they belong to the lender's policy and apply to every case at that lender regardless of scenario. Asked once per lender in the RM questionnaire, then reused across every Home Loan case.

| # | Engine field | What it controls | RM question (Track A) | RM answer space |
|---|---|---|---|---|
| 0.1 | `cibil_floor` | Minimum CIBIL score the lender will consider | What is your minimum CIBIL score? | Number 600–900 (or `null` = no fixed floor) |
| 0.2 | `cibilScope` | Whose CIBIL the lender checks | Whose CIBIL do you check? | `financial_only` · `all_co_applicants` (default) · `all_including_guarantors` |
| 0.3 | `max_foir` | Maximum FOIR % (income share that goes to EMIs) | What is your maximum FOIR? | Number 30–75 (%) |
| 0.4 | `max_ltv` *(per loan-variant: New Loan / BT-Only / BT+Topup / Top-up Only / Resale / UC)* | Maximum loan-to-value % | What is your maximum LTV for each variant? | Per-variant number 30–90 (%) · `null` = variant not offered |
| 0.5 | `max_age_at_maturity` | Maximum borrower age at loan maturity | What is the maximum borrower age at loan maturity? | Number 60–80 (years) |
| 0.6 | `max_tenure_months` | Maximum tenure | What is your maximum loan tenure? | Number 60–480 (months) |
| 0.7 | `roi` *(per income profile)* | Base interest rate offered | What is your base ROI for each income profile? | Per-profile number 6.5–18.0 (%) |
| 0.8 | `processing_fee_percent` | Processing fee as % of sanctioned amount | What is your processing fee? | Number 0–2 (%) |
| 0.9 | `hasNRIApplicant` policy (NRI premium / NRI rules) | Per-lender NRI handling | Do you accept NRI applicants? If yes, what ROI premium? | Yes/No + Number 0–2 (% premium if Yes) |
| 0.10 | `guarantor_acceptance.min_emi_capacity_percent` | Guarantor acceptance threshold (Tier 3b) | What guarantor capacity % do you require? | Number 0–100 (%) · `null` = no guarantors accepted |
| 0.11 | Deviation policies | Soft-rule waivers (per gate × probability) | Which gates can you waive with deviation approvals? | Multi-select gate IDs, per-gate probability |
| 0.12 | Obligation treatment rules (term loan count-factor / credit-line factor / closing waiver) | How existing obligations count toward FOIR | What count factor do you use for term loans / credit lines? Do you waive closing loans? | Number 0–100 (%) for each + Yes/No for waiver |

Plus **Track B** at the lender level: "What general rules or limitations apply across all your Home Loan cases that aren't covered above?" — free-text, scope `applies to: all Home Loan cases at this lender`.

---

## Page 1 — Case Intake (4 questions, shared across all 6 loan types)

**Source**: `src/lib/config/schema/caseIntakeQuestions.ts`. All 4 questions are about **case context** — what's already happened to this loan application. None drives lender policy. **RM questionnaire skips this entire page.**

| # | DSA question | bindsTo | DSA input | DSA option set | RM treatment |
|---|---|---|---|---|---|
| 1.1 | What is the current status of this case? | `assessmentStatus` | radio | `fresh` · `rejected` · `sanctioned_not_disbursed` · `unknown` | — context only |
| 1.2 | Which lender(s) rejected the application? *(shown only if 1.1 = rejected or sanctioned)* | `assessmentLenders` | multi-select | Dynamic list of all lenders | — context only |
| 1.3 | What was the reason for rejection? *(shown only if 1.1 = rejected)* | `rejectionReasons` | multi-select | `low_cibil` · `insufficient_income` · `property_issues` · `incomplete_docs` · `profile_mismatch` · `other` | — context only |
| 1.4 | Why was the sanction not accepted? *(shown only if 1.1 = sanctioned_not_disbursed)* | `sanctionNotDisbursedReasons` | multi-select | `high_interest_rate` · `low_sanction_amount` · `high_fees` · `unfavorable_terms` · `property_not_approved` · `other` | — context only |

**Pattern**: re-application rules ("we don't re-evaluate cases rejected by us in the past 6 months") → **Track B** with scope `applies to: re-application`.

---

## Page 2 — Property Location & Status (~12 questions, varies by `loanType`)

**Sources**: `propertyLocation.ts` + `intake.ts` (q2_propertyIdentified) + `btRegistry.ts` (BT/Top-up sub-block).

### Base questions

| # | DSA question | bindsTo | DSA input | DSA option set / range | RM question | RM answer space |
|---|---|---|---|---|---|---|
| 2.1 | Has the property been identified? | `propertyIdentified` | radio | Yes · No | Do you offer **pre-approval** loans (sanction before property is identified)? | Yes · No. No → engine filters lender for entire `propertyIdentified=No` flow. |
| 2.2 | What is the current status of this case (re-assessment history)? | `priorAssessmentHistory` | radio | `first_assessment` · `assessed_1_2` · `assessed_3_plus` · `previously_rejected` | — context only | — |
| 2.3 | Which type of area is this property located in? | `propertyAreaType` | select | `PLANNED_AUTHORITY` · `CONVERTED_RESIDENTIAL` · `OLD_MUNICIPAL` · `LOCAL_COLONY` *(+ DSA-only `UNKNOWN` / `NOT_DECIDED`)* | Which area types do you finance for Home Loan? | Multi-select from 4 main values. DSA-only sentinels excluded. |
| 2.4a | What is the nature of property purchase? *(PLANNED area only)* | `purchaseType` | radio | `direct_from_authority` · `direct_from_builder` · `resale_endorsement` · `resale_normal` | For PLANNED area, which purchase types do you finance? | Multi-select from same 4 |
| 2.4b | What is the nature of property purchase? *(non-PLANNED area)* | `purchaseType` | radio | `direct_from_builder` · `resale_endorsement` · `resale_normal` | For non-PLANNED area, which purchase types do you finance? | Multi-select from same 3 |
| 2.5 | Where is the property located? *(identified)* | **Compound** → `propertyStateName`, `propertyCityName`, `propertyAreaName`, `propertyPincode` | location picker | All Indian states · cities · pincodes | Which **states** + **cities** do you operate in? Pincode exclusions? | Multi-select states · per-state multi-select cities · Track B for pincode exclusions |
| 2.6 | Where is the customer searching? *(not identified)* | **Compound** → `propertyStateName`, `propertyCityName` | location picker | All states + cities | Same as 2.5 — single answer covers both branches | Same as 2.5 |
| 2.7 | What is the intended use of the property? *(New Loan branch)* | `propertyUsageIntent` | radio | `self_occupied` · `investment` · `both` | Which usage intents do you accept on New Loan? | Multi-select same 3 |
| 2.7b | What is the current occupancy status of this property? *(BT/Top-up branch — same bindsTo, different option set)* | `propertyUsageIntent` *(branch-aware)* | radio | `self_occupied` · `rented_out` · `vacant` · `both` | Which occupancy statuses do you accept on BT/Top-up? | Multi-select same 4 |

### Builder / Project (Track B)

Builder + Project pickers (`q_builderName`, `q_builderNameManual`, `q_projectNameSelected`, `q_projectNameManual`) capture **high-cardinality dynamic data** from per-city RERA records. Lenders express preferences/exclusions as named lists, not closed accept/reject spaces.

| # | DSA capture | RM treatment |
|---|---|---|
| 2.8 | `builderName` + `builderNameManual` | **Track B** — scoped free-text: comment + scope tag `applies to: builder = <name>` + priority `preferred` · `excluded` · `neutral` |
| 2.9 | `projectNameSelected` + `projectNameManual` | **Track B** — scoped: `applies to: project = <name>` + same priority axis |
| 2.10 | `projectLenders` (crowdsourced) | — context only (lender-intelligence feature, not a per-lender policy field) |

### BT Registry sub-block (BT/Top-up only)

| # | DSA question | bindsTo | DSA input | DSA option set / range | RM question | RM answer space |
|---|---|---|---|---|---|---|
| 2.11 | Has the property registry been done in the name of the owner(s)? | `isRegistryDone` | radio | Yes · No | Do you accept BT/Top-up cases with **registry NOT YET done**? | Yes · No |
| 2.12 | Possession and builder demand status? *(if 2.11 = No)* | `bt_possessionAndDemandStatus` | radio | `POSSESSION_NO_DEMAND` · `POSSESSION_WITH_DEMAND` · `NO_POSSESSION_NO_DEMAND` · `NO_POSSESSION_WITH_DEMAND` | Which combinations of possession + builder demand do you accept on BT cases without registry? | Multi-select same 4 |
| 2.13 | Outstanding demand amount from the builder? *(if demand pending)* | `bt_outstandingDemandAmount` | currency | ₹0 to ₹999.99 Cr | Maximum outstanding builder demand you accept? | Number ₹ range OR threshold below which you don't process (the engine reads this as a cap) |

### Page-2 pattern notes for Pass 2

- `propertyUsageIntent` is **the first branch-aware field** in the audit — same `bindsTo`, different DSA options by `loanType`. The RM questionnaire needs TWO questions (New Loan branch + BT branch) bound to a single per-lender policy field that the engine reads per branch.
- `purchaseType` is similarly branch-aware (PLANNED vs non-PLANNED area).
- 2.5 and 2.6 are the **same fields under two branches** — RM answers ONCE.

---

## Page 3 — Property Character (~10 questions)

**Source**: `propertyCharacter.ts`.

| # | DSA question | bindsTo | DSA input | DSA option set / range | RM question | RM answer space |
|---|---|---|---|---|---|---|
| 3.1 | What type of construction is it? | `constructionType` | select | `House` · `Flat` · `Floor` | Which construction types do you finance? | Multi-select from same 3 |
| 3.2 | What is the carpet area of the property? | `carpetArea` | number | 100–999,999 sq ft (unit toggleable) | Minimum + maximum carpet area you accept? | Two numbers (min + max) in same unit · `null` for no limit |
| 3.3 | What is the construction stage of the property? | `PropertyStage` | radio | `Under Construction` · `Ready To Move` | Which construction stages do you finance? | Multi-select from same 2 |
| 3.4 | How old is this property? | `propertyAge` | select | `0-5` · `6-10` · `11-15` · `16-20` · `21-25` · `26-30` · `30+` *(years)* | Maximum property age you accept? | Single select of age bracket — implies cap at that bracket's upper bound |
| 3.5 | Who is the builder/promoter? *(UC + Flat + builder purchase types)* | `builderName` + `builderNameManual` | select (dynamic) + text | Per-city pre-curated list + `__other__` | Same as Page 2 — **Track B** | — |
| 3.6 | Which project is the property in? | `projectNameSelected` + `projectNameManual` | select (dynamic) + text | Per-builder list + `__other__` | Same as Page 2 — **Track B** | — |
| 3.7 | What is the builder's role in this project? | `builderRole` | radio | `developer` · `builder_contractor` · `joint_development` | Which builder roles do you accept? | Multi-select from same 3 |
| 3.8 | Is the project RERA registered? | `reraStatus` | radio | `rera_registered` · `not_registered` · `not_required` · `not_known` | Which RERA statuses do you accept on Under-Construction projects? | Multi-select from same 4 (typically all except `not_known`) |
| 3.9 | Which lenders are funding this project? *(non-RERA UC)* | `projectLenders` | multi-select | All banks + NBFCs | — context only (crowdsourced intelligence, not per-lender policy) | — |

### Page-3 pattern notes

- 3.5 + 3.6 are the **same builder/project fields as Page 2** (re-rendered on Page 3 with different `showWhen` gates). Same RM Track B handling.
- 3.4 `propertyAge` numeric ranges suggest the RM answer should be a single age cap with units in years (engine converts cap to bracket).

---

## Page 4 — Compliance & Legal Verification (~25 questions)

**Sources**: `propertyCondition.ts` + `legal.ts`. This page is **the densest** by far — combines the area-type-specific compliance questions (5 variants for `propertyComplianceStatus`), then OC/CC, municipal approval, authority possession, RERA, zone, municipal tax, unauthorized additions, revenue records, colony regularisation, gram panchayat permission, construction progress, expected completion, plus the documentation-readiness multi-checklists (5 area-specific variants) and legal questions (NOC, title chain, EC, succession, mutation).

### Property Compliance — 5 area-type variants (same bindsTo `propertyComplianceStatus`)

| # | DSA question | DSA option set | RM question | RM answer space |
|---|---|---|---|---|
| 4.1a *(PLANNED area)* | Is the property built as per the development authority's sanctioned building plan? | `fully_compliant` · `authorized_not_per_plan` · `not_authorized` | For PLANNED area, which compliance statuses do you accept? | Multi-select same 3 |
| 4.1b *(CONVERTED RESIDENTIAL)* | Has the land been formally converted from agricultural to residential use (NA conversion)? | `fully_compliant` · `authorized_not_per_plan` · `not_authorized` · `already_residential` | For CONVERTED area, which NA-conversion statuses do you accept? | Multi-select same 4 |
| 4.1c *(OLD MUNICIPAL)* | Is the property within municipal limits with valid municipal records? | `fully_compliant` · `authorized_not_per_plan` · `not_authorized` | For OLD MUNICIPAL area, which compliance statuses do you accept? | Multi-select same 3 |
| 4.1d *(LOCAL COLONY)* | Is the colony officially recognised or regularised by the government? | `fully_compliant` · `authorized_not_per_plan` · `not_authorized` | For LOCAL COLONY area, which regularisation statuses do you accept? | Multi-select same 3 |
| 4.1e *(UNKNOWN / blank)* | Is the property in a government-authorised area and built as per approved plan? | `fully_compliant` · `authorized_not_per_plan` · `not_authorized` | *(Same field — covered by the 4 above)* | — *(dedupe in Pass 2)* |

### Remaining Compliance questions

| # | DSA question | bindsTo | DSA input | DSA option set | RM question | RM answer space |
|---|---|---|---|---|---|---|
| 4.2 | Has the building received its OC/CC? *(Flat/Floor + RTM or BT+UC+Registry)* | `ocCcAvailable` | radio | `BOTH` · `CC_ONLY` · `NONE` · `UNKNOWN` | Which OC/CC statuses do you accept? | Multi-select same 4 |
| 4.3 | Was the house built with a sanctioned building plan from the local authority? *(House + RTM)* | `municipalApproval` | radio | `APPROVED` · `PARTIAL` · `NO_PLAN` · `UNKNOWN` | Which municipal approval statuses do you accept for independent houses? | Multi-select same 4 |
| 4.4 | Has the authority granted possession (OC/CC issued)? *(direct_from_authority + RTM)* | `isPossessionOfferedByAuthority` | radio | Yes · No | Do you require authority-issued OC/CC for direct-from-authority properties? | Yes · No |
| 4.5 | Is the project registered under RERA? *(PLANNED area, New Loan / BT)* | `reraRegistrationStatus` | radio | `REGISTERED` · `NOT_REGISTERED` · `EXEMPTED` · `UNKNOWN` | Which RERA statuses do you accept? | Multi-select same 4 |
| 4.6 | What is the zone classification of this land? *(CONVERTED area)* | `zoneClassification` | radio | `RESIDENTIAL` · `COMMERCIAL` · `MIXED_USE` | Which zones do you finance on Home Loan? | Multi-select same 3 |
| 4.7 | Is the municipal/property tax being paid regularly? *(OLD MUNICIPAL area)* | `municipalTaxStatus` | radio | `PAID_REGULAR` · `PAID_IRREGULAR` · `UNPAID` · `UNKNOWN` | Which tax payment statuses do you accept? | Multi-select same 4 |
| 4.8 | Are there any unauthorised additions or modifications? *(OLD MUNICIPAL + RTM)* | `unauthorizedAdditions` | radio | `NONE` · `MINOR` · `MAJOR` · `UNKNOWN` | Which levels of unauthorised additions do you accept? | Multi-select same 4 |
| 4.9 | Status of revenue records? *(LOCAL COLONY)* | `revenueRecordStatus` | radio | `AVAILABLE_CURRENT` · `AVAILABLE_OUTDATED` · `NOT_AVAILABLE` · `UNKNOWN` | Which revenue record statuses do you accept? | Multi-select same 4 |
| 4.10 | Has this colony/layout been regularised by the government? *(LOCAL COLONY)* | `colonyRegularizationStatus` | radio | `REGULARIZED` · `PENDING` · `NOT_REGULARIZED` · `UNKNOWN` | Which colony regularisation statuses do you accept? | Multi-select same 4 |
| 4.11 | Has the Gram Panchayat issued permission for this construction? *(LOCAL COLONY)* | `gramPanchayatPermission` | radio | `YES` · `NO` · `NOT_REQUIRED` · `UNKNOWN` | Do you require Gram Panchayat permission for panchayat-area properties? | Yes · No · No, if registered sale deed is present (3-state) |
| 4.12 | What is the current construction status? *(UC)* | `constructionProgress` | radio | `EARLY` · `MID` · `NEAR_COMPLETE` · `DONE_AWAITING_OC` | At what construction stages do you start disbursement on UC? | Multi-select same 4 |
| 4.13 | When is the project expected to be completed? *(UC + Flat/Floor)* | `expectedCompletionDate` | monthYear | Any future month | What's your maximum acceptable expected-completion timeline? | Number months from disbursement · `null` for no limit |

### Documentation Readiness — 5 area-type variants (same bindsTo `documentationReadiness`)

Each variant is a **multi-select document checklist** specific to the area type. RM-side: which documents do you **require** for each area type before disbursement.

| # | DSA question | DSA option set | RM question | RM answer space |
|---|---|---|---|---|
| 4.14a *(PLANNED)* | Which property documents are available? | `SALE_DEED` · `OC` · `CC` · `ALLOTMENT_LETTER` · `BUILDER_AGREEMENT` · `SOCIETY_CERT` · `TAX_RECEIPTS` · `EC` · `BUILDING_PLAN` · `NONE` | For PLANNED area, which documents do you **require** before disbursement? | Multi-select required + multi-select "nice-to-have" |
| 4.14b *(CONVERTED)* | Which property documents are available? | `SALE_DEED` · `NA_ORDER` · `ZONE_CERT` · `REVENUE_RECORDS` · `BUILDING_PLAN` · `TAX_RECEIPTS` · `EC` · `NONE` | Same as above for CONVERTED | Same structure |
| 4.14c *(MUNICIPAL)* | Which property documents are available? | `SALE_DEED` · `TAX_RECEIPTS` · `BUILDING_PLAN` · `PROPERTY_CARD` · `EC` · `SUCCESSION_DOCS` · `NONE` | Same for MUNICIPAL | Same structure |
| 4.14d *(LOCAL COLONY)* | Which property documents are available? | `SALE_DEED` · `REVENUE_RECORDS` · `GP_PERMISSION` · `REGULARIZATION_CERT` · `TAX_RECEIPTS` · `EC` · `NONE` | Same for LOCAL COLONY | Same structure |
| 4.14e *(UNKNOWN / blank)* | Which property documents are available? | `SALE_DEED` · `TAX_RECEIPTS` · `BUILDING_PLAN` · `EC` · `REVENUE_RECORDS` · `NONE` | *(Same field — fold into 4.14a-d in Pass 2)* | — |

### Legal verification

| # | DSA question | bindsTo | DSA input | DSA option set | RM question | RM answer space |
|---|---|---|---|---|---|---|
| 4.15 | Has the NOC from the previous lender been received? *(BT/Top-up)* | `nocFromPreviousLender` | radio | `Yes` · `No` · `N/A` | Do you require an NOC from the previous lender before processing BT? | Yes · No |
| 4.16 | Is the ownership chain (title chain) clear and complete? | `titleChainStatus` | radio | `CLEAR` · `CURRENT_OK_PREV_MISSING` · `CURRENT_MISSING` · `UNKNOWN` | Which title chain statuses do you accept? | Multi-select same 4 (typically `CLEAR` + sometimes `CURRENT_OK_PREV_MISSING` with riders) |
| 4.17 | How were the current ownership documents lost? *(if 4.16 = CURRENT_MISSING)* | `titleDocsMissingReason` | radio | `LOST_BY_LENDER` · `LOST_BY_OWNER` | Do you accept cases where current ownership docs are lost? If yes, only when lost by previous lender? | Yes/No + (if Yes) multi-select of accepted reasons |
| 4.18 | Has the Encumbrance Certificate been obtained and verified? | `encumbranceCertStatus` | radio | `CLEAR` · `ENCUMBERED` · `NOT_OBTAINED` · `UNKNOWN` | Which EC statuses do you accept? | Multi-select same 4 (typically `CLEAR` + sometimes `ENCUMBERED` for BT) |
| 4.19 | Is this property inherited? Succession properly documented? | `successionStatus` | radio | `NOT_INHERITED` · `SUCCESSION_COMPLETE` · `SUCCESSION_PENDING` · `UNKNOWN` | Which succession statuses do you accept? | Multi-select same 4 |
| 4.20 | Is property mutation (name transfer in revenue records) up to date? | `revenueRecordMutation` | radio | `MUTATED` · `MUTATION_PENDING` · `NOT_MUTATED` · `NOT_REQUIRED` | Which mutation statuses do you accept? | Multi-select same 4 |

### Page-4 pattern notes for Pass 2

- **5 variants of `propertyComplianceStatus`** (q1a–q1e) all bind to the same field. In Pass 2 the RM questionnaire should ask the compliance question ONCE per area type (4 RM questions covering PLANNED / CONVERTED / MUNICIPAL / LOCAL_COLONY), and the q1e UNKNOWN variant is a DSA-only fallback that doesn't need its own RM row.
- **5 variants of `documentationReadiness`** (q1a–q1e in `legal.ts`) similarly bind to the same field. Same dedupe pattern in Pass 2.
- The page is the densest by far — Pass 2 should consider grouping by area-type (one PLANNED section asking q1a + q14a + relevant docs together).

---

## Page 5 — Resale Seller (~12 questions, resale_normal / resale_endorsement only)

**Source**: `counterparty/resaleSeller.ts`. Captures seller identity, POA registration, acquisition method, the Agreement-to-Sell + POA edge case, seller's existing loan, and registry timeline.

| # | DSA question | bindsTo | DSA input | DSA option set / range | RM question | RM answer space |
|---|---|---|---|---|---|---|
| 5.1 | Who is selling the property? | `sellerOwnershipType` | radio | `SOLE_OWNER` · `JOINT_OWNERS` · `INHERITED` · `POA_HOLDER` | Which seller ownership types do you accept? | Multi-select same 4 |
| 5.2 | Is the power of attorney registered? *(if 5.1 = POA_HOLDER)* | `poaRegistrationStatus` | radio | `REGISTERED` · `NOT_REGISTERED` · `UNKNOWN` | Which POA registration statuses do you accept? | Multi-select same 3 (typically only `REGISTERED`) |
| 5.3 | How did the seller acquire this property? | `propertyAcquisitionMethod` | radio | `PURCHASED` · `INHERITED` · `GIFT_DEED` · `GOVT_ALLOTMENT` · `AGREEMENT_POA` | Which seller acquisition methods do you accept? | Multi-select same 5 |
| 5.4 | Are both seller and buyer willing to register first? *(if 5.3 = AGREEMENT_POA)* | `agreementPoaRegistryWilling` | radio | `YES` · `NO` | Do you accept Agreement-to-Sell + POA cases where parties register first? | Yes · No · Conditional |
| 5.5 | Do you know an NBFC that finances unregistered Agreement+POA? *(if 5.4 = NO)* | `agreementPoaNbfcKnown` | radio | `Yes` · `No` | — context only (DSA-side network question) | — |
| 5.6 | NBFC name *(if 5.5 = Yes)* | `agreementPoaNbfcName` | text | free text | — context only | — |
| 5.7 | Is the seller's property currently under a home loan? | `sellerOnLoan` | radio | `Yes` · `No` | Do you allow purchases where the seller's property has an existing loan? | Yes · No |
| 5.8 | Outstanding loan amount on seller's property? *(if 5.7 = Yes)* | `sellerOutstandingAmount` | currency | ₹0 to ₹999.99 Cr | — context only (engine doesn't gate on seller outstanding) | — |
| 5.9 | Which lender does the seller currently have the loan with? *(if 5.7 = Yes)* | `sellerCurrentLender` | select | All lenders | Are there specific seller-lender combinations you don't fund against? | **Track B** — `applies to: seller-lender = <name>` |
| 5.10 | Is the property registered in the name of the seller(s)? | `ifPropertyRegistered` | radio | `Yes` · `No` | Do you fund cases where the property is not registered in the seller's name? | Yes · No |
| 5.11 | When was the registry done? *(if 5.10 = Yes)* | `lastRegistryDuration` | radio | `underSixMonths` · `underOneYear` · `underTwoYears` · `moreThanTwoYears` | Do you have a minimum seller-registry vintage requirement? | Yes (specify minimum) · No |
| 5.12 | Is any builder demand pending? | `isAnyBuilderDemand` | radio | `Yes` · `No` | Do you allow cases where builder demand is pending? | Yes · No · Yes with cap (specify amount) |

---

## Page 6 — Authority Details (~9 questions, direct_from_authority + New Loan only)

**Source**: `counterparty/authority.ts`. Plus inherited `q2_ocCcAvailable` + `q3_municipalApproval` from `propertyCondition.ts`.

| # | DSA question | bindsTo | DSA input | DSA option set / range | RM question | RM answer space |
|---|---|---|---|---|---|---|
| 6.1 | Which development authority is allotting the property? | `authorityName` | select (dynamic from city) | Per-city/state authority list + `DEFENCE` + `OTHER` | Which development authorities do you finance? *(state/city-specific list)* | **Track B** — `applies to: authority = <name>` + priority `preferred` / `excluded` / `neutral` |
| 6.2 | Is the allotment letter/sanction letter available? | `allotmentLetterStatus` | radio | `ORIGINAL_AVAILABLE` · `COPY_AVAILABLE` · `PENDING_RECEIPT` · `NOT_AVAILABLE` | Which allotment letter statuses do you accept? | Multi-select same 4 |
| 6.3 | When was the property allotted? | `allotmentDate` | monthYear | Year ≥ 2000 | Maximum allotment vintage you accept? | Number years · `null` for no limit |
| 6.4 | What is the payment & dues status to the authority? | `authorityPaymentStatus` | radio | `MAJOR_PENDING` · `MINOR_DUES` · `ALL_PENDING` · `UNKNOWN` | Which payment-status combinations do you accept? | Multi-select same 4 |
| 6.5 | Has the authority handed over possession? | `possessionCertificateStatus` | radio | `POSSESSION_CERT_AVAILABLE` · `NOT_ISSUED` · `UNKNOWN` | Which possession statuses do you accept? | Multi-select same 3 |
| 6.6 | Which key documents are available for the authority property? | `documentationReadiness` *(re-used)* | radio | `ALL_KEY_DOCS` · `ALLOTMENT_AND_RECEIPTS` · `ALLOTMENT_ONLY` · `NOT_STARTED` | What's the minimum documentation set you require for authority cases? | Multi-select of acceptable sets |
| 6.7 | (inherited q2_ocCcAvailable) — OC/CC status | `ocCcAvailable` | radio | Same as Page 4 #4.2 | Already covered in 4.2 | — |
| 6.8 | (inherited q3_municipalApproval) — building plan approval | `municipalApproval` | radio | Same as Page 4 #4.3 | Already covered in 4.3 | — |

---

## Pages 7–12 — Applicant / Income / Credit / Obligations *(deferred sub-pass)*

**Sources**: Shared custom Svelte components from `src/lib/config/schema/customComponentPages.ts` → `buildApplicantPage`, `buildApplicantProfilePage`, `buildIncomeProfilesPage`, `buildIncomeDetailsPage`, `buildCreditScorePage`, `buildObligationsPage`.

These pages render IMPERATIVE Svelte components (`AddApplicantSecured`, `ApplicantProfilePage`, `IncomePageNew`, `CreditScorePage`, `ObligationCapture`) instead of the declarative `RawSchemaQuestion[]` format. Each component's form-state writes have to be extracted from the component code (e.g. `formState.applicants[i].applicantType = ...` assignments). The audit method is therefore different and slower.

### Pages covered (rough question inventory, full audit deferred to Pass 1 sub-pass)

| Page | Component | Approx. fields captured (engine-relevant) |
|---|---|---|
| 7 — Applicant Details | `AddApplicantSecured` | `applicantType` (Individual / Company), `fullName`, `gender`, `maritalStatus`, `age`, `dateOfBirth`, mobile/email, NRI flag, `onEMI` / `onProperty` (drives co-applicant vs guarantor classification), relationship-to-primary |
| 8 — Applicant Profile | `ApplicantProfilePage` | Employment type (Salaried / SEP / SENP / Pensioner / NO_CURRENT_INCOME), business vintage, residence type, residence vintage, qualification level, applicant-level NRI rules |
| 9 — Income Profiles | `IncomeProfileSelector` | Multi-select of 12 income profiles per applicant: `salaried_regular`, `salaried_irregular`, `salaried_govt`, `salaried_pvt`, `professional_practice`, `business_proprietorship`, `business_partnership`, `director_company`, `pension`, `rental_residential`, `rental_commercial`, `cash` |
| 10 — Income Details | `IncomePageNew` | Per-profile income capture: monthly amount, supporting evidence (Bank statement / ITR / Salary slip / Form 16 / CA-certified P&L), business profit-share %, rental property details, NRI overseas income |
| 11 — Credit Score | `CreditScorePage` | `creditScore` per applicant (numeric 300–900 + "not yet" / "not relevant" options) |
| 12 — Existing Obligations | `ObligationCapture` | Per-obligation: type (Home / Car / Personal / Credit Card / OD / Education / Other), EMI, principal outstanding, sanctioned amount, lender, joint/sole, applicantEmiShare, isClosing flag |

### RM-side surfaces these pages map to (preview for Pass 2)

- **Applicant page** → lender rules on which co-applicant relationships are mandatory, what constitutes a guarantor, age min/max per applicant role (already partially in Page 0 `max_age_at_maturity` + Tier 3b guarantor acceptance).
- **Applicant Profile page** → lender rules on accepted employment types per income profile; per-profile minimum business vintage; per-profile minimum residence vintage; per-profile qualification gates (rare).
- **Income Profiles page** → which of the 12 income profiles does the lender accept on Home Loan? Per-profile haircut % (already a rich rule engine surface).
- **Income Details page** → minimum monthly income per profile · acceptable evidence types per profile · maximum income contribution % from non-primary sources.
- **Credit Score page** → already covered by Page 0 #0.1 (`cibil_floor`) + #0.2 (`cibilScope`).
- **Obligations page** → already covered by Page 0 #0.12 (obligation treatment rules: term-loan count factor, credit-line factor, closing-loan waiver).

### Plan for the deferred sub-pass

Read each of the 6 Svelte components, extract every form-state write, map to the engine fields. Estimate: ~2–3 hours of code reading. Output: rows append-only to this same document under each of Pages 7–12.

---

## Page 13 — Deal & Financials (~10 questions, New Loan + propertyIdentified=Yes)

**Source**: `dealFinancials.ts`.

| # | DSA question | bindsTo | DSA input | DSA option set / range | RM question | RM answer space |
|---|---|---|---|---|---|---|
| 13.1 | How was this property acquired? | `auctionPropertyStatus` | radio | `STANDARD` · `AUCTION_AWARE` · `AUCTION_UNAWARE` | Which acquisition methods do you finance? | Multi-select same 3 |
| 13.2 | Preferred loan term? | `mortgageYear` | radio | `10` · `15` · `20` · `25` · `30` · `MAX` · `OTHER` *(years)* | Already covered by Page 0 #0.6 (`max_tenure_months`) | — |
| 13.3 | Custom loan term *(if 13.2 = OTHER)* | `mortgageYearCustom` | number | 5–40 years | Same as above | — |
| 13.4 | Estimated current market value? | `marketValue` | currency | ₹5L–₹999.99 Cr | What's your **minimum loan amount** for Home Loan? | Currency value · default ₹10L (engine has this in `getMinimumLoanAmount`) |
| 13.5 | Agreed deal value (with seller / builder, branch-aware) | `propCost` | currency | ₹5L–₹999.99 Cr | Use Page 0 #0.4 (LTV per variant) | — |
| 13.6 | Expected registration value? | `registryValue` | currency | ₹1L–₹999.99 Cr | Used for LCR — covered by Page 0 (LCR cap, currently failsafe 90% if not set) | — |
| 13.7 | Available down payment amount? | `deposit` | currency | ₹0–₹999.99 Cr | — context only (engine consumes for LTV calc) | — |
| 13.8 | Advance already paid to seller? | `advanceInAgreement` | currency | ₹0–₹999.99 Cr (optional) | — context only | — |
| 13.9 | When is property registration planned? | `registryTimeline` | radio | `WITHIN_1_MONTH` · `1_3_MONTHS` · `3_6_MONTHS` · `SPECIFIC_DATE` | Do you have a maximum-time-to-registry SLA for sanction validity? | Number months · `null` for no limit |
| 13.10 | Planned registration month *(if 13.9 = SPECIFIC_DATE)* | `registryPlannedDate` | monthYear | Current year to current+2 | — context only | — |

### Page-13 pattern notes

- 13.2–13.6 are **all engine-derived, not policy-relevant per case**. The RM specifies max tenure (Page 0 #0.6), max LTV per variant (#0.4), and min loan amount (new — Page 0 #0.13 in Pass 2) ONCE per lender.
- 13.9 is the first "process SLA" question worth surfacing on the RM side — `time-to-registry` is a lender-level setting.

---

## Page 14 — Existing Loan Details (~10 questions, BT/Top-up only)

**Source**: `existingLoan.ts`.

| # | DSA question | bindsTo | DSA input | DSA option set / range | RM question | RM answer space |
|---|---|---|---|---|---|---|
| 14.1 | Original sanction amount? | `sanctionAmount` | currency | ₹10L–₹999.99 Cr | — context only (drives validation, not lender policy) | — |
| 14.2 | When was this loan originally disbursed? | `loanDisbursementDate` | monthYear | Year ≥ 2000 | Used to compute loan vintage. Covered by 14.3. | — |
| 14.3 | How many EMIs have been paid? | `btEmisPaid` | number | 0–480 | What's your **minimum EMIs paid** before you accept a BT? | Number 0–48 (typically 6–12) · `null` for no minimum |
| 14.4 | What type of interest rate is your current loan on? | `interestRateType` | radio | `FLOATING` · `FIXED` · `UNKNOWN` | Do you accept BT from FIXED-rate loans (which may have foreclosure penalty)? | Yes · No · Yes with rider |
| 14.5 | How many EMI bounces in the last 12 months on this loan? | `emiBounceHistory` | radio | `0` · `1` · `2` · `3+` | Maximum EMI bounces you accept on BT? | Single select 0/1/2/3+ — implies cap at that value |
| 14.6 | Outstanding principal as of today? | `principalOutstanding` | currency | ₹5L–₹999.99 Cr | — context only (engine consumes for BT amount) | — |
| 14.7 | Current interest rate with existing lender? | `existingInterestRate` | number (%) | 1–40 (%) | Do you require the existing rate to be above a threshold before you'll quote BT? | Number (%) · `null` for no floor |
| 14.8 | Remaining tenure to close the loan? | `remainingTenure` | number (months) | 12–420 (months) | What's your minimum remaining tenure to accept a BT? | Number months · `null` |
| 14.9 | Which lender is the current loan with? | `selectSingleBank` | select | All lenders | Are there any specific source-lenders you DON'T accept BT from? | **Track B** — `applies to: BT-source-lender = <name>` |
| 14.10 | Current monthly EMI? | `includedCurrentEMIsAmount` | currency | ₹1k–₹1Cr | — context only (engine validates against principal/tenure) | — |

---

## Page 15 — Loan Requirements (BT/Top-up, ~5 questions)

**Source**: `loanRequirements.ts`.

| # | DSA question | bindsTo | DSA input | DSA option set / range | RM question | RM answer space |
|---|---|---|---|---|---|---|
| 15.1 | Preferred loan term? | `mortgageYear` | radio | `10` · `15` · `20` · `25` · `MAX` · `OTHER` *(years)* | Already covered by Page 0 #0.6 | — |
| 15.2 | Custom loan term *(if 15.1 = OTHER)* | `mortgageYearCustom` | number | 5–25 (years for pre-sanction) | Same as above | — |
| 15.3 | How long would you like the top-up loan term to be? *(Top-up / BT+Topup)* | `topUpTenure` | select | `10` · `15` · `20` · `25` · `30` · `MAX` | What's your **maximum top-up tenure**? *(may differ from base tenure)* | Number years · `null` for "same as base tenure" |
| 15.4 | What is the required top-up amount? *(Top-up / BT+Topup)* | `topUpAmount` | currency | ₹1L–₹999.99 Cr (engine floor ₹5L) | What's your **minimum** and **maximum** top-up amount? | Two numbers (min + max) · `null` for either |
| 15.5 | What is the purpose of the top-up loan? *(Top-up / BT+Topup)* | `topUpPurpose` | select | `RENOVATION` · `EXTENSION` · `FURNISHING` · `MEDICAL` · `EDUCATION` · `BUSINESS` · `DEBT_CONSOLIDATION` · `WEDDING` · `PERSONAL` | Which top-up purposes do you finance? | Multi-select same 9 |

---

## Page 16 — Pre-Sanction Profile (~5 questions, New Loan + propertyIdentified=No)

**Source**: `sanctionProfile.ts`.

| # | DSA question | bindsTo | DSA input | DSA option set / range | RM question | RM answer space |
|---|---|---|---|---|---|---|
| 16.1 | Preferred loan term? | `mortgageYear` | radio | `10` · `15` · `20` · `25` · `MAX` · `OTHER` (years; capped at 25 for pre-sanction) | Do you have a **lower max-tenure cap** for pre-sanction (no-property) cases? | Number years · `null` for "same as identified-property cap" |
| 16.2 | Custom loan term *(if 16.1 = OTHER)* | `mortgageYearCustom` | number | 5–25 years | Same as 16.1 | — |
| 16.3 | How should we calculate the maximum sanctioned amount? | `sanctionType` | radio | `Based On Eligibility` · `Based on Downpayment` | — context only (DSA-side calculation method) | — |
| 16.4 | How much down payment can you make? *(if 16.3 = Based on Downpayment)* | `deposit` | currency | ₹0–₹999.99 Cr | — context only | — |
| 16.5 | Show personal loan options to bridge the gap? | `withPersonalLoan` | radio | `Yes` · `No` | Do you cross-sell PL alongside Home Loan pre-sanction? | Yes · No |

---

## Pass 1 insights — preview for Pass 2 design

### A. Branch-aware fields that collapse to a single RM question per lender

| Field | DSA branches | Pass 2 treatment |
|---|---|---|
| `propertyComplianceStatus` | 5 area-type variants (PLANNED / CONVERTED / MUNICIPAL / COLONY / UNKNOWN) | RM answers **4 area-type-specific compliance questions** (UNKNOWN is DSA-only fallback) |
| `documentationReadiness` | 5 area-type variants + 1 authority variant | RM answers **5 area-type-specific document-set questions** + 1 authority |
| `purchaseType` | PLANNED (4 options) / non-PLANNED (3 options) | RM answers **2 area-conditioned purchase-type questions** |
| `propertyUsageIntent` | New Loan (3 options) / BT-Topup (4 options) | RM answers **2 loan-type-conditioned usage-intent questions** |
| `mortgageYear` | New Loan / BT/Topup / Pre-Sanction (different option sets, different ceiling caps) | RM answers **1 max-tenure** at Page 0; pre-sanction-specific cap separately if it differs |
| `topUpTenure` | Top-up Only / BT+Topup | RM answers **1 max top-up tenure** question |

### B. Lender-level Page 0 expanded from this audit

Page 0 currently has ~12 entries. Pass 1 surfaces additional Page-0 candidates:

- **0.13** — `min_loan_amount` per loan-variant (₹10L default for HL, but lender-specific minimums)
- **0.14** — `min_emis_paid_for_bt` (the engine reads this for BT eligibility)
- **0.15** — `accepted_fixed_rate_bt` (boolean — whether the lender accepts BT from a FIXED-rate source loan)
- **0.16** — `max_emi_bounces` (the BT-source bounce cap)
- **0.17** — `time_to_registry_sla_months` (max time from sanction to registry for sanction to remain valid)
- **0.18** — `crosssell_pl_on_pre_sanction` (boolean — engine surface for the PL cross-sell flag from Page 16)

### C. Track B comment scopes surfaced

By the time the questionnaire is done, the RM should expect to answer Track B comments scoped to:

- `applies to: builder = <name>` *(many)*
- `applies to: project = <name>` *(many)*
- `applies to: development authority = <name>` *(per state)*
- `applies to: pincode = <code>` or `locality = <name>` *(rare; pincode-level negatives)*
- `applies to: BT-source-lender = <name>` *(per excluded source lender)*
- `applies to: seller-lender = <name>` *(per excluded seller lender)*
- `applies to: re-application` *(re-application policy)*
- `applies to: all Home Loan cases at this lender` *(catch-all)*

### D. Volume estimate

- **Declarative DSA questions** *(Pages 1–6 + 13–16)*: ~100 questions across 10 pages.
- **Custom-component questions** *(Pages 7–12)*: ~30–40 fields (estimate).
- **Total DSA fields**: ~130–140.
- **After Page 2 dedupe + Page 0 consolidation**: estimate ~80–100 RM-side questions for Home Loan v1.
- **Time to complete one lender's Home Loan questionnaire** *(estimate, post Pass 2)*: 45–90 minutes with an RM who knows the policy.

### E. Open questions for owner before Pass 2

1. **Page 0 lead-or-trail** — should lender-level questions be asked **first** (RM walks through the lender's overall policy, then scenario-specific questions slot in) or **last** (RM does each scenario, then we ask for the catch-all settings)? I lean **lead** — many scenario-questions have an implicit "(applies if you accept this loan variant at all)" that an upfront Page 0 short-circuits.
2. **Branch deduplication granularity** — when a field has 5 branches (e.g. `propertyComplianceStatus`), should the RM see 5 separate sections (one per area type) or one combined section with a per-area-type sub-table? Trade-off: separate is easier to fill, combined is faster to skim.
3. **Documentation requirement vs availability** — DSA captures what the customer HAS; lender wants what they REQUIRE. Should the RM answer split into "must-have" + "nice-to-have" + "not-required" buckets, or two simpler buckets ("required" + "preferred")?
4. **Pages 7–12 Pass 1 sub-pass** — should I do it now (next 2–3 hours of reading custom Svelte components) or after Pass 2 starts on the declarative pages?

---

## Status summary

| Section | Status |
|---|---|
| Pages 1–6 | ✅ Pass 1 complete |
| Pages 7–12 | ⚠️ Deferred to sub-pass (custom Svelte components — different audit method) |
| Pages 13–16 | ✅ Pass 1 complete |
| Page 0 (lender-level) | ✅ Initial set drafted; Pass 2 will refine |
| Track B taxonomy | ✅ Eight scope tags surfaced |
| Pass 2 design synthesis | ⏳ Pending owner confirmation on the four open questions above |
