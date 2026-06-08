# Plot Loan Questionnaire Alignment — Implementation Prompt

> Copy-paste this as the opening prompt for the next Claude Code session.

---

## PROMPT START

Read `docs/SESSION-HANDOFF.md` and `docs/specs/PLOT-LOAN-QUESTIONNAIRE-ALIGNMENT.md` first. Then implement the Plot Loan questionnaire alignment.

### What We're Doing

Rebuilding the Plot Loan property pages by aligning with the Home Loan / LAP structure. Same approach we used for LAP (Session 21, commit `fd75574f`). The full spec is at `docs/specs/PLOT-LOAN-QUESTIONNAIRE-ALIGNMENT.md`.

### Current State (BEFORE)

Plot loan has 9 pages with **1 property page** (`propertyIdentification`) cramming 14 questions together. The wizard config also references a ghost `sellerInformation` page that doesn't exist in the schema.

### Target State (AFTER)

15 pages with **6 property pages**:

1. **`propertyIdentificationPage`** (6Q) — state/city/pincode for property + residence. Clone from LAP's `propertyIdentificationPage`.

2. **`propertyLocation_Plot`** (3Q) — Clone LAP's `propertyLocation_LAP` (area type + special restriction) + add NEW `landUseClassification` (Residential / Commercial / Agricultural / Industrial / Mixed Use). Agricultural triggers warning: "Agricultural land cannot be financed through standard bank loans. NA conversion must be completed first."

3. **`propertyCharacter_Plot`** (7Q):
   - NEW `plotSource` (radio): `authority_allotment` / `developer_project` / `approved_layout` / `revenue_site` / `individual_resale`. Revenue site warning: "Most nationalised banks refuse to finance revenue sites."
   - NEW `developmentAuthority` (select): DDA, HUDA, BDA, MHADA, HMDA, JDA, LDA, BIAPPA, DTCP, Other. Show when `plotSource == "authority_allotment"`
   - Keep `propertyType` (freehold/leasehold) from current schema
   - Clone `leaseRemainingPeriod` from LAP. Show when leasehold
   - Adapt `propertyAge` → `plotAge` ("When was this plot first allotted/sold?")
   - Keep `PlotArea` from current schema
   - NEW `plotBoundaryStatus` (radio): Clear demarcation / Partially demarcated / No clear boundaries / Compound wall exists. No boundaries warning.

4. **`constructionDetails_Plot`** (~7Q) — **CONDITIONAL PAGE**: entire page only visible when `loanType in ["Plot & Construction Loan", "Construction Loan Only"]`. For pure Plot Only and Plot & Equity, this page is skipped.
   - Clone `constructionType` from Home Loan — but filter options for plot context: Independent House / Villa / Row House / Farm House (no apartment/flat)
   - NEW `constructionApprovalStatus` (radio): Approved building plan obtained / Plan submitted pending / No building plan yet
   - Clone `constructionProgress` from Home Loan: Not started / Foundation / Plinth / Superstructure / Finishing / Completed
   - Clone `builtArea` from Home Loan (planned/actual built-up area)
   - Clone `ocCcAvailable` from Home Loan — show when `constructionProgress == "completed"`
   - Clone `municipalApproval` from Home Loan
   - NEW `constructorType` (radio): Self-construction / Licensed contractor / Builder
   - For BT loans: NEW `btConstructionStatus` (radio) — show when `PlotLoanActivity == "Balance Transfer Only"`: Not started / In progress / Completed. This gates `constructionProgress` and `ocCcAvailable` for BT scenarios.

5. **`propertyCondition_Plot`** (~16Q):
   - 5 area-type-specific compliance variants (same pattern as LAP/Home Loan, adapted for land):
     - planned_approved: "Is this plot in an approved layout with development authority / municipal corporation approval?"
     - converted_land: "Has this plot been fully converted from agricultural to non-agricultural (NA) use with valid conversion order?"
     - municipal_area: "Is this plot within municipal corporation limits with proper layout approval and building permission zone?"
     - colony: "Is this colony authorized by the development authority? Has the layout been approved?"
     - unknown: "Is the plot's legal status clear — does it have any form of government/municipal approval?"
   - Clone from LAP: `naConversionStatus`, `zoneClassification`, `reraRegistrationStatus` (show when developer_project), `municipalTaxStatus`, `unauthorizedAdditions`, `colonyRegularizationStatus`, `gramPanchayatPermission`
   - Clone `revenueRecordStatus` from LAP — always relevant for plot loans
   - NEW `layoutApprovalStatus` (radio): Approved by planning authority / Approved by development authority / Revenue layout (no planning approval) / Unknown
   - NEW `accessRoadStatus` (radio): Public road (12ft+ wide) / Shared/private road / Narrow lane / No proper access
   - NEW `developmentStatus` (radio): Fully developed (water, electricity, drainage) / Partially developed / Undeveloped / Under development

6. **`propertyLegal_Plot`** (9Q):
   - Clone from LAP: `propertyAcquisitionMethod`, `successionStatus`, `originalDocumentsAvailable`, `ownershipChainComplete`, `existingEncumbrance`, `noLegalDispute`, `encumbranceCertificateVerified`
   - Keep `ifPropertyRegistered` from current schema
   - NEW `constructionTimeline` (radio): Within 1 year / 1-3 years / 3-5 years / No immediate plans. Show for Plot Loan Only / Plot & Equity (for composite loans, construction is part of the loan itself). Warning on "No immediate plans": "Most banks require construction to begin within 2-3 years."

### Questions ALWAYS REMOVED (replaced by plot-specific equivalents)

- `propertyComplianceStatus` (old generic 3-option) → replaced by 5 area-type variants
- `purchaseType` (Direct Sale/Resale) → replaced by `plotSource`
- `categoryOfProperty` → replaced by `landUseClassification`
- `PropertyStage` → not applicable
- `typeOfOccupationProperty` → not applicable (plot is vacant)
- `rentalIncome` / `rentalAgreementType` → not applicable
- Builder/seller questions → replaced by `plotSource` + `constructorType`
- `carpetArea` → use `builtArea` conditionally, `PlotArea` always

### Implementation Steps

**Step 1**: Write a Node.js script `scripts/build-plot-schema.cjs` (MUST use `.cjs` — project is ESM). The script should:

- Read `src/lib/config/LAP-schema.json` as the base (closer to what we need than Home Loan)
- Read `src/lib/config/homeLoanSchemaV2.json` for construction questions to clone
- Build 6 new property pages programmatically
- Keep all non-property pages from current `plot-loan-schema.json` (tellUsApplyingPage, applicantProfilePage, incomeProfilesPage, incomeDetailsPage, creditScorePage, obligationsPage, existingDetailsPage, loanRequirementPage)
- Also handle `creditHistoryStatus` — move to its own page or keep on identification
- Write result to `src/lib/config/plot-loan-schema.json`

**Step 2**: Sync server copy

- Copy to `src/lib/server/formEngine/schemas/plot-loan-schema.json`
- Verify match: `JSON.stringify(client) === JSON.stringify(server)`

**Step 3**: Update `src/lib/config/wizardSections/plotLoan.ts`

- Add property section with 5 subsections: area-type, plot-character, construction (conditional), condition-compliance, legal
- Construction subsection: `showWhen: (answers) => answers['loanType'] === 'Plot & Construction Loan' || answers['loanType'] === 'Construction Loan Only'`
- Remove ghost `sellerInformation` subsection
- Update all DSA guidance text for plot-specific context

**Step 4**: Update `src/lib/utils/payloadGrouping.ts`

- Add mappings for new page IDs: `propertyLocation_Plot`, `constructionDetails_Plot`, `propertyCharacter_Plot`, `propertyCondition_Plot`, `propertyLegal_Plot`

**Step 5**: Verify

- `pnpm run check` — must be 0 errors
- Verify server/client schemas match
- Start preview server, check for errors
- Walk through form pages

### Critical Rules

1. **Schema sync is MANDATORY** — update BOTH `src/lib/config/` AND `src/lib/server/formEngine/schemas/`
2. **Use `.cjs` extension** for Node.js scripts (package.json has `"type": "module"`)
3. **bindsTo_template** — all new questions must have proper `bindsTo_template`, NOT just `bindsTo`
4. **showWhen rules** — use `in` operator for array checks, never `==` with arrays
5. **All `loanType` values** in showWhen must match exactly: `"Plot Loan Only"`, `"Plot & Construction Loan"`, `"Construction Loan Only"`, `"Plot & Equity Loan"`
6. **`PlotLoanActivity`** values: `"New Loan"`, `"Balance Transfer Only"`
7. **Don't touch** non-property pages — applicant, income, credit, obligation pages are dynamic and rendered by components
8. **Keep existing `creditHistoryStatus`** question — just move to appropriate location

### Reference Files

- **LAP schema** (best starting point for cloning): `src/lib/config/LAP-schema.json`
- **Home Loan schema** (for construction questions): `src/lib/config/homeLoanSchemaV2.json`
- **Current Plot schema** (to keep non-property pages): `src/lib/config/plot-loan-schema.json`
- **LAP wizard sections** (reference for structure): `src/lib/config/wizardSections/lapLoan.ts`
- **Plot page component**: `src/routes/(app)/form/plot-loan/+page.svelte`
- **Payload grouping**: `src/lib/utils/payloadGrouping.ts`

After implementation, commit with message: "feat: Plot questionnaire redesign — aligned with Home Loan/LAP + conditional construction"

Then update docs: SESSION-HANDOFF.md, CHANGELOG.md, DEVELOPMENT-PLAN.md, MEMORY.md.

## PROMPT END
