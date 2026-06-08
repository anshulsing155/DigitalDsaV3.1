# Loan Field Nomenclature — alignment across all 6 loan products

**Status:** **Implemented 2026-05-31 via single-PR hard cutover.** Owner-directed on 2026-05-29; execution superseded the original three-phase plan after `bank-loan-management` was confirmed dead in DigitalDSA-V3 and the pre-launch context obviated the soak windows. The conceptual content of this doc (four-field model, blast-radius inventory, risks) remains the authoritative reference; the **§6 Migration strategy** is historical — see [`LOAN-FIELD-NOMENCLATURE-EXECUTION-PLAN.md`](LOAN-FIELD-NOMENCLATURE-EXECUTION-PLAN.md) for the mechanical batch-by-batch execution that landed, and [ADR-0020 §"2026-05-31 Amendment"](../adr/0020-loan-field-nomenclature.md) for the rationale of the strategy change.
**Companion memory entries:** `reference_plot_loan_field_naming.md`, `reference_plot_equity_loan_mechanics.md` — both **historical** post-rename.
**Companion spec:** `docs/specs/PLOT-EQUITY-LOAN-DESIGN.md` — its Phase 1 (schema cleanup) is absorbed by this rename; Phases 2-4 are the next sequenced work.

This doc is the multi-session driver for renaming the four loan-application fields that today carry inconsistent and overloaded meanings across the 6 loan products. Designed to be read cold by the next session opener — every decision and risk is captured here, not in memory.

---

## 1. Problem in plain English

A DSA-customer's loan-application form collects **four conceptually distinct pieces of information** before the wizard branches into product-specific questions:

1. **Product** — which umbrella loan is this? (Home Loan, LAP, Plot Loan, Personal Loan, Business Loan, Professional Loan)
2. **Scope** — fresh borrowing or migrating existing? (New Loan, Balance Transfer Only, Balance Transfer With Top-up, Top-up Only, Debt Consolidation, DC with Extra Funds)
3. **Facility structure** — how is the money structured? (Term Loan vs revolving Overdraft / DOD / Flexi DOD / Cash Credit)
4. **Variant / subproduct** — which kind of plot loan, specifically? (Plot Loan Only, Plot & Construction, Plot & Equity, Construction Only)

**Today the form jams all 4 axes into only 3 field names** — and the mapping differs per loan. Result: the same field name means different things in different contexts; identical concepts use different field names across loans; the parser spec and the engine and the external API all have to special-case Plot Loan separately from everyone else.

The most visible casualty: a teammate writing `"loanType": "Plot Loan Only"` in a bug doc and being technically right (that IS where Plot stores its variant), while every other loan uses `loanType` for scope. Same field, two different jobs.

---

## 2. Current state — the field overload, by loan

What each loan asks at "how can we help" (in the actual order shown):

| Loan | Pre-question field | What it carries | Final `loanType` field carries |
|---|---|---|---|
| **Home Loan** | *(none)* | — | **Scope** (New / BT / BT+Topup / Topup) |
| **LAP** | `LAPType` = "LAP" or "Drop-line Overdraft (DOD)" | **Facility structure** | **Scope** — but `loanType` options shown depend on `LAPType` |
| **Plot Loan** | `PlotLoanActivity` = "New Loan" or "Balance Transfer Only" | **Scope** | **Variant** (Plot Only / Plot+Const / Plot+Equity / Const Only) |
| **Personal Loan** | `unSecureLoanType` = "Term Loan" / "OD" / "DOD" / "Flexi DOD" | **Facility structure** | **Scope** with per-facility labels ("New OD Facility", "DOD Takeover", etc.) |
| **Business Loan** | `unSecureLoanType` = "Term Loan" / "OD" / "DOD" / "CC" | **Facility structure** | **Scope** with per-facility labels |
| **Professional Loan** | `unSecureLoanType` (same set as BL) | **Facility structure** | **Scope** with per-facility labels |

### `loanType` is overloaded FOUR ways across the codebase

This was the most surprising audit finding. The same word means four different things in unrelated contexts:

| Context | What `loanType` means here | Where |
|---|---|---|
| Application form (5/6 loans) | **Scope** (New / BT / Top-up) | Home Loan, LAP, PL, BL, Prof |
| Application form (Plot only) | **Variant** (Plot Only / etc.) | Plot Loan |
| Obligation entries | **Obligation product** (Home Loan, Credit Card, Personal Loan, etc.) | `types/obligation.ts`, obligation payload |
| FormSession tracking | **Same as `loanName`** — Home Loan, LAP, etc. | `types/formSession.ts` (one session per user-per-loanName) |
| QA scenarios | **Same as `loanName`** | `types/qaScenario.ts` |

**This spec only touches contexts 1 and 2.** Obligation, FormSession, and QA scenarios use `loanType` for a genuinely different concept and stay untouched — renaming those is a separate conversation if and when it comes up.

### Casing mismatch at the API boundary

`bank-loan-management/app/api/loan-offers/route.ts` reads `userData.loanTransaction.LoanName` and `LoanType` (PascalCase). DigitalDSA's form field is `loanName` and `loanType` (camelCase). Either the payloadBuilder rewrites case during request construction OR there's silent normalisation somewhere — to be traced during Phase 2. **This rename is the right moment to standardise on camelCase everywhere** since the boundary already has to translate.

### Dead-but-declared code

`PRODUCT_TYPE_MAP` in `src/lib/types/policyEngine.ts` declares (loanName × loanType-lowercase) → ProductType codes ("HL_NEW", "HL_BT", etc.). Grep returns **only the declaration** — no consumer anywhere. Decision: delete during the rename pass (or formally mark dead with a comment if there's a planned future use).

---

## 3. Target nomenclature — four-field model

| Axis | Field name | Values | Used by |
|---|---|---|---|
| **Product** | `loanName` *(unchanged)* | Home Loan / Loan Against Property / Plot Loan / Personal Loan / Business Loan / Professional Loan | All 6 |
| **Scope** | `loanType` *(consistent everywhere — Plot stops being the exception)* | New Loan / Balance Transfer Only / Balance Transfer With Top-up / Top-up Only / Debt Consolidation / DC with Extra Funds | All 6 |
| **Facility structure** | `facilityType` *(rename from `LAPType` + `unSecureLoanType`)* | Term Loan / Overdraft (OD) / Drop-line OverDraft (DOD) / Flexi Drop-line OverDraft (Flexi DOD) / Cash Credit (CC) | LAP, PL, BL, Prof. HL and Plot default to "Term Loan" implicitly (or the field is just absent for them). |
| **Variant / Subproduct** | `loanVariant` *(new field — takes Plot's old `loanType` values)* | Plot Loan Only / Plot & Construction Loan / Plot & Equity Loan / Construction Loan Only | Plot today. Field is ready for future HL variants (Bridge Loan, Self-Construction Home Loan) if ever added. |

### What disappears

- **`PlotLoanActivity`** — folded into `loanType` (Plot finally uses the same scope field as every other loan)
- **`LAPType`** — folded into `facilityType` (the value "LAP" maps to "Term Loan" since LAP itself IS a term-loan facility against property)
- **`unSecureLoanType`** — folded into `facilityType` (same axis, same values, just consistent name)
- **Plot's current `loanType`** — its values move into `loanVariant`

After the rename, every loan asks the same axis using the same field name. The parser spec becomes one-rule-fits-all. New loan products slot in just by declaring which axes they use.

### Why the names this way (and not other options)

- **`loanType` for scope** — even though `loanType` already has 4 different meanings across the codebase, restricting THIS rename to the application form (and leaving obligation/FormSession/QA contexts alone) doesn't make scope-context confusion worse. And "loanType" matches Indian banking parlance for the New/BT/Top-up axis. Alternative considered: `loanScope`. Rejected because it adds a new field name without removing existing inconsistency.
- **`facilityType` for structure** — matches Indian banking convention ("Term Loan facility", "OD facility"), AND aligns with the engine's existing `_computed._facility_type` derived field. Single name for a single concept.
- **`loanVariant` for subproduct** — clearest name, generic enough to be reused by any loan that grows variants. Alternative: `loanSubProduct`, rejected as longer with no semantic gain.

---

## 4. End-to-end field flow (current vs target)

### Current — Plot Loan Only case

```
Form (commonPage.json)
  └─> loanName: "Plot Loan"
  └─> PlotLoanActivity: "New Loan"
  └─> loanType: "Plot Loan Only"
        │
        ▼
payloadBuilder (loanTransaction.ts:64-90)
  reads both loanType AND PlotLoanActivity, writes through with same names
        │
        ▼
bank-loan-management API (route.ts:135+)
  reads LoanName (PascalCase!), PlotLoanActivity, LoanType
  branches on inputLoanName === "Plot Loan"
  branches on PlotLoanActivity === "New Loan"
  branches on LoanType === "Plot Loan Only" / "Plot & Construction Loan" / etc.
  pattern-matches productName.includes(variant) to pick rule docs
        │
        ▼
Engine evaluates JSON-Logic from selected rule docs
```

### Target — Plot Loan Only case

```
Form (commonPage.json — updated)
  └─> loanName: "Plot Loan"
  └─> loanType: "New Loan"           ← was PlotLoanActivity
  └─> loanVariant: "Plot Loan Only"  ← was loanType
        │
        ▼
payloadBuilder (loanTransaction.ts — updated)
  reads loanType + loanVariant; writes both, no overload
        │
        ▼
bank-loan-management API (route.ts — updated)
  reads loanName + loanType + loanVariant (camelCase everywhere now)
  branches on loanName === "Plot Loan"
  branches on loanType === "New Loan"
  branches on loanVariant === "Plot Loan Only" / etc.
        │
        ▼
Engine evaluates JSON-Logic
```

---

## 5. Blast radius — exhaustive file counts

From the 2026-05-29 audit. Numbers are FILES, not occurrences; many `loanType` files are in unrelated contexts (obligation / FormSession / QA / tests / docs) and need no change.

| Surface | `loanType` | `PlotLoanActivity` | `LAPType` | `unSecureLoanType` |
|---|---|---|---|---|
| `src/lib/config/` (form schemas, JSON-Logic) | 64 | 8 | 8 | 4 |
| `src/lib/ruleEngine/` | 6 | 1 | 0 | 1 |
| `src/lib/components/` (UI rendering) | 22 | 0 | 0 | 0 |
| `src/lib/utils/` (payloadBuilder, etc.) | 24 | 3 | 3 | 4 |
| `src/lib/server/` | 29 | 2 | 2 | 1 |
| `src/lib/types/` (TS type defs) | 14 | 0 | 0 | 1 |
| `src/lib/state/` (form state mgmt) | 2 | 0 | 0 | 0 |
| `src/routes/` (8 form pages + offer pages) | 58 | 3 | 3 | 4 |
| `src/lib/testing/` (tests + fixtures + snapshots) | 136 | 19 | 12 | 10 |
| `docs/` (specs, ADRs, pitfalls, audit) | 67 | 10 | 2 | 11 |

**Realistic "must-touch" count after filtering out unrelated contexts:**
- ~20-30 config files (showWhen / option declarations)
- 1 payload builder (`loanTransaction.ts`) — small surgical change
- 3-4 type definition files
- 8 route components (form pages reading formState)
- 5 plot snapshot fixtures (must regenerate)
- ~10-15 test files
- 1 migration map entry (`migrateApplicantKeys.ts`)
- 2 docs (Pitfall #33 + ADR-0016)
- bank-loan-management API: ~5 files (route.ts + types + DB schema if applicable)

---

## 6. Migration strategy — three-phase, dual-write/dual-read

### Why three phases

Production has live cases mid-flight. Browser-local form state has the old field names. Cron jobs may process stored payloads. Hard cut would break in-flight work. Three-phase rollout keeps everything working throughout.

### Phase A — Backward-compat reads (~1 day)

**Goal:** code that reads these fields tolerates BOTH old and new names. Nothing else changes. Zero behaviour change for in-flight cases.

Touch:
- `src/lib/utils/payloadBuilder/loanTransaction.ts` — dual-read: `loanAnswers.loanVariant ?? loanAnswers.loanType` for Plot variant; `loanAnswers.facilityType ?? loanAnswers.LAPType ?? loanAnswers.unSecureLoanType` for facility
- `src/lib/state/form.svelte.ts` — same dual-read pattern for any field accessors
- `src/lib/utils/migrateApplicantKeys.ts` — formal entry mapping old keys to new
- Any other consumer in `src/lib/utils/`, `src/lib/server/`, `src/lib/components/`, `src/routes/` that reads these fields

Ship Phase A as one PR. Verify in production with the existing form (still writing old names). Soak for ~3 days minimum.

### Phase B — Form writes new names + bank-loan-management API accepts both (~2 days, lockstep across both repos)

**Goal:** new fills create new-shape payloads. The API accepts both shapes during the transition.

DigitalDSA-side:
- `src/lib/config/commonPage.json` — update bindings, options, showWhens to new names
- All `src/lib/config/{loan}/questionBank/*.ts` — flip showWhen field refs
- `src/lib/config/{loan}/pages.ts` + `wizardSections/{loan}.ts` — update field references
- `src/routes/(app)/form/*/+page.svelte` (8 files) — formState reads use new keys
- Form state still writes new keys; payloadBuilder still dual-reads from Phase A so old in-flight cases keep working

bank-loan-management-side (companion PR):
- `app/api/loan-offers/route.ts` — accept both `LoanName`/`loanName`, `LoanType`/`loanType`, `PlotLoanActivity`/`loanType` (Plot scope), `loanVariant`/`LoanType` (Plot variant), `facilityType`/`LAPType`/`unSecureLoanType`
- `lib/types.ts`, `lib/schema.ts` — type updates
- Test fixtures + smoke test that hits the endpoint with both shapes

Ship as **coordinated deploy**: bank-loan-management PR merges first (server accepts both), then DigitalDSA PR merges (client sends new shape). Verify with one full case fill in each loan family.

Soak ~2 weeks (since DSA cases typically complete in days, 2 weeks ensures all in-flight cases have either submitted or expired).

### Phase C — Migrate stored data + deprecate old keys (~2 days)

**Goal:** clean end state. No more dual reads, no more old keys in storage.

- Migration script: read every stored case in MongoDB, rewrite the fields (old → new), preserve cases with the old shape for rollback for 30 days
- Remove dual-read fallbacks from Phase A
- Remove backward-compat code from bank-loan-management
- Remove old field types from `src/lib/types/`
- Delete `PRODUCT_TYPE_MAP` dead code (or document if there's a planned future use)
- Update Pitfall #33 wording, ADR-0016 if applicable
- Update `docs/PAYLOAD_DOCUMENTATION.md`, `docs/LOAN-ASSESSMENT-API-INTEGRATION.md`, `docs/specs/PLOT-EQUITY-LOAN-DESIGN.md` (Phase 1 is essentially done by this work)

### Rollback strategy

- Phase A: no rollback needed (purely additive)
- Phase B: rollback by reverting the DigitalDSA PR (form returns to writing old names). bank-loan-management still accepts both shapes, so reverting doesn't break the API. Roll back DigitalDSA first, then bank-loan-management if needed.
- Phase C: 30-day window during which migrated cases keep a `_legacyPayload` shadow field with the original shape. Rollback = stop reading new shape, point code back to reading legacy shadow.

---

## 7. Two-repo coordination — bank-loan-management

The user owns this repo (https://github.com/eYantrik-rinn/bank-loan-management). Audit findings:

### What the API does with each field today

- `userData.loanTransaction.LoanName` (PascalCase!) — branches the entire request handler into loan-family-specific code paths
- `userData.loanTransaction.LoanType` (PascalCase!) — used for both scope (HL/LAP) and variant (Plot)
- `userData.loanTransaction.PlotLoanActivity` — Plot scope ("New Loan" / "Balance Transfer Only")
- `userData.loanTransaction.LAPType` — picks LAP-term vs LAP-DOD code path
- `userData.loanTransaction.unSecureLoanType` — picks Term vs OD vs DOD vs Flexi DOD vs CC code path; for PL/BL/Prof, the API IGNORES `LoanType` and infers scope from `unSecureLoanType` alone (translated to "NEW" or "DROP_LINE_OVERDRAFT" enum)
- `userData.loanTransaction.tellUsApplying` — Individual vs Company (Non-individual entity) branching

### What changes in the API for Phase B

The route's switch logic stays semantically identical; it just reads new field names:

```js
// Before (Plot section)
} else if (inputLoanName === "Plot Loan") {
  if (userData.loanTransaction.PlotLoanActivity === "New Loan") {
    ...
    if (userData.loanTransaction.LoanType === "Plot Loan Only") {
      ...

// After (Plot section)
} else if (inputLoanName === "Plot Loan") {
  if (userData.loanTransaction.loanType === "New Loan") {  // was PlotLoanActivity
    ...
    if (userData.loanTransaction.loanVariant === "Plot Loan Only") {  // was LoanType
      ...
```

For LAP/unsecured similar: every `LAPType` read becomes `facilityType`; every `unSecureLoanType` read becomes `facilityType`.

### Casing standardisation

The API currently reads `LoanName` and `LoanType` (PascalCase) but the proposed new fields (`loanVariant`, `facilityType`) are camelCase. Without action this creates a mixed-case payload, which is worse than the current state. **Standardise on camelCase across the boundary** as part of Phase B:

- API reads `loanName`, `loanType`, `loanVariant`, `facilityType`, `unSecureLoanType`/`LAPType`/`PlotLoanActivity` (legacy, during transition)
- The PascalCase `LoanName`/`LoanType` reads in the API stay as fallbacks during Phase B, removed in Phase C
- Trace exactly where in DigitalDSA's payloadBuilder the case-conversion happens (if anywhere) so we can flip it cleanly

### bank-loan-management DB-side `loanType`

Prisma's `loanType` enum on the Product table — values "NEW" / "BALANCE_TRANSFER" / "BALANCE_TRANSFER_WITH_TOPUP" / "DROP_LINE_OVERDRAFT" — is internal to the API and **stays as-is**. It's a different concept from the form's `loanType` (it's a product attribute, not a payload field). No DB migration needed.

---

## 8. MongoDB lender rule docs (live DB) — verification needed before Phase B

Static fallback rule docs (`realBankRuleDocs.ts`, `sampleRuleDocs.ts`) have **zero** references to `loanType` / `PlotLoanActivity` / `LAPType` / `unSecureLoanType` (confirmed by grep). They don't branch on scope, variant, or facility at all — they're product-level rules tagged with `loan_types: ['Home Loan']` etc.

**Likely (but unconfirmed): live MongoDB rule docs follow the same pattern.** Verification step before Phase B:

```
# Query LenderRuleArtifacts.find({status:'active'}) and grep the json_logic
# blobs for the four field names. Expected count: zero.
# If non-zero, those rule docs need updating in lockstep with Phase B.
```

If any live rule doc DOES reference these fields, escalate to the PMS team before rolling out — those JSON-Logic conditions need to be rewritten to use new names.

---

## 9. PRODUCT_TYPE_MAP — dead code decision

`src/lib/types/policyEngine.ts:55` declares `PRODUCT_TYPE_MAP: Record<string, ProductType>` with lowercase scope keys ("new", "bt", "topup", "bt_topup"). Grep shows this map is **declared and never used** anywhere.

Three options:
- **(a) Delete** as part of this rename — cleanest, simplest. Risk: a future feature might want it (then we add it back fresh).
- **(b) Comment as dead** with a date and rationale, leaving the declaration. Risk: rot.
- **(c) Wire it up** as part of the rename — if there's a real use case for product-type codes (telemetry / analytics / api versioning), this is the moment to make it live.

Recommendation: **(a) Delete during Phase C cleanup.** Easiest to add back later than to maintain dead code.

---

## 10. Casing standardisation — fold into this work

Discovered during audit: bank-loan-management reads `LoanName`/`LoanType` (PascalCase) where DigitalDSA writes `loanName`/`loanType` (camelCase). Either there's a translation layer somewhere we haven't found, or the API has been silently accepting whatever case the client sends.

**Decision:** as part of Phase B, standardise on camelCase across both repos. The naming spec already commits to camelCase (every new field name is camelCase). Fold the LoanName → loanName / LoanType → loanType conversion into the same coordinated deploy.

Trace before Phase B:
- Search payloadBuilder for any `loanTransaction.LoanName =` write (capital L)
- Search bank-loan-management for case-insensitive normalisation (some implicit fallback)
- Decide which side does the case fix: DigitalDSA stops writing PascalCase, or bank-loan-management explicitly accepts camelCase

---

## 11. Tests, fixtures, snapshots

### Snapshots to regenerate (5)

- `src/lib/testing/__tests__/factory/__snapshots__/PLOT-ONLY.pre-migration.json`
- `.../PLOT-CONSTRUCTION.pre-migration.json`
- `.../PLOT-CONSTRUCTION-ONLY.pre-migration.json`
- `.../PLOT-EQUITY.pre-migration.json`
- `.../PLOT-BT.pre-migration.json`

Plus snapshots that include LAP or unsecured loans where `LAPType`/`unSecureLoanType` appear:
- `LAP-*.pre-migration.json` (multiple)
- `EDGE-*.pre-migration.json` (where applicable)
- `HL-BT-TOPUP.pre-migration.json` (uses PlotLoanActivity? — needs check)

Regeneration approach: run `_regenLapSnapshots.test.ts` / `_regenBugAFixSnapshots.test.ts` patterns to write fresh fixtures after Phase B is in place. Manual diff review on every regenerated snapshot before committing.

### Test files needing updates (rough list, exact count during execution)

- `src/lib/testing/__tests__/btTopupPayloadSizing.test.ts`
- `src/lib/testing/__tests__/closureOptionBtOnlyGate.test.ts`
- `src/lib/testing/__tests__/deriveFixtureName.test.ts`
- `src/lib/testing/__tests__/factory/_regenBugAFixSnapshots.test.ts`
- All `src/lib/testing/journeys/{loan}.ts` and `scenarios/formPath*.ts`
- All `src/lib/testing/e2e/{loan}.setup.ts`
- All `src/lib/testing/fixtures/fixtureProfiles.ts`, `archetypes/archetypeTemplates.ts`
- Any test that constructs a payload with these field names

### New CI lock-test

Static-scan test to prevent re-overloading:
```
// loanFieldNomenclature.test.ts
// Forbid `var: "loanType"` references resolving to plot variant values
// Forbid `LAPType` / `unSecureLoanType` / `PlotLoanActivity` in src/ outside
// of explicit transition shims marked with a "// PHASE-B-LEGACY" comment
```

Pitfall #67 pattern — the test IS the regression lock until the rename fully bakes in.

---

## 12. Documentation updates needed (in lockstep with code, NOT after)

- **`docs/PITFALLS.md` — Pitfall #33** — currently says Plot Loan's `loanType` is the SCOPE (i.e., it implies the variant lives elsewhere). After the rename, this becomes correct (variant lives in `loanVariant`). Update wording to reflect the new truth + add a note that the pre-rename history is preserved in this spec doc.
- **`docs/adr/0016-canonical-bt-loan-details-schema.md`** — review for references to old field names; update if applicable.
- **`docs/PAYLOAD_DOCUMENTATION.md`** — line 145 says `loanType` carries "purpose/variant of the loan" with scope values. Update to match new model.
- **`docs/LOAN-ASSESSMENT-API-INTEGRATION.md`** — full sweep for `LAPType` / `unSecureLoanType` / `PlotLoanActivity` references. Update payload examples (Appendix B) with new shape.
- **`docs/specs/PLOT-EQUITY-LOAN-DESIGN.md`** — Phase 1 of that spec largely overlaps with this work. Mark Phase 1 as done once this lands; the remaining Phases 2-4 (3-cap engine logic, parser spec, UI) become the next priority after this.
- **Memory files** — `reference_plot_loan_field_naming.md` becomes obsolete after rename (no more overload). Mark as historical, keep for context.

---

## 13. Risks and mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| In-flight production case payloads have old shape and break post-deploy | Medium | High | Phase A dual-read; Phase C migration script preserves legacy shadow |
| Browser-local form state has old keys when user reloads after deploy | High | Medium | Phase A dual-read in form state reader |
| MongoDB lender rule docs branch on these fields | Low (unconfirmed) | High | Verify by grep before Phase B; if any do, PMS rewrites them lockstep |
| Snapshot regeneration introduces silent value changes | Medium | Medium | Diff every regenerated snapshot; spot-check 2-3 by hand |
| bank-loan-management deploys before DigitalDSA (or vice-versa) and breaks the API | Medium | High | Coordinated deploy: API accepts both shapes BEFORE client switches; verify with 1 case in each family |
| Casing standardisation misses an edge case (a third caller still sending PascalCase) | Medium | Low | Trace exhaustively before Phase B; keep PascalCase fallbacks in API for Phase B duration |
| Tests pass but external e2e breaks | Medium | Medium | One full DSA case fill per loan family before marking Phase B done |
| Test fixtures bake in old shape (Pitfall #67 pattern) and mask regression | Low | High | Updating fixtures is part of Phase B, not a follow-up |
| Pitfall #33 wording goes out of sync with code | High | Low | Update Pitfall #33 in the SAME PR as the rename, not a follow-up |

---

## 14. Per-session execution sequence (proposed)

This is multi-session work. Suggested split:

### Session 1 — Audit verification + Phase A foundation

- Confirm MongoDB lender rule docs don't reference these fields (run the verification query)
- Decide on PRODUCT_TYPE_MAP (delete / dead-comment / wire-up)
- Identify the exact casing-translation site (where does `loanName` become `LoanName` for the API request, if anywhere)
- Implement Phase A (dual-read everywhere) — single PR, ship, soak

### Session 2 — Phase B DigitalDSA-side

- Update `commonPage.json` + all plot question banks
- Update form state + state helpers
- Update payloadBuilder
- Update 8 route components
- Regenerate plot + lap snapshots
- Update test journeys + fixtures
- DO NOT ship yet — wait for bank-loan-management API PR

### Session 3 — Phase B bank-loan-management-side

- Update route.ts to accept new names (with PascalCase + legacy fallbacks during transition)
- Update lib/types.ts, lib/schema.ts
- Add smoke tests with new payload shape
- Ship to staging; verify with one case per loan family
- Then ship to production
- Then ship DigitalDSA Phase B PR

### Session 4 — Soak + Phase C

- 2-week soak
- Write migration script for stored MongoDB cases
- Migrate cases (with 30-day legacy shadow)
- Remove dual-reads from Phase A
- Remove PascalCase + legacy fallbacks from bank-loan-management
- Update Pitfall #33, ADR-0016, PAYLOAD_DOCUMENTATION, LOAN-ASSESSMENT-API-INTEGRATION
- Add the static-scan CI lock test
- Mark `reference_plot_loan_field_naming.md` historical
- Mark `docs/specs/PLOT-EQUITY-LOAN-DESIGN.md` Phase 1 done

### Session 5+ (if needed)

- Monitor production for any caught regressions
- 30-day legacy-shadow cleanup
- Final cleanup commit removing transition code

---

## 15. Open questions / unknowns at draft time

1. **Where does `loanName` → `LoanName` case conversion happen?** Unknown at draft time. Trace during Session 1.
2. **Do MongoDB lender rule docs reference these fields?** Unknown at draft time — query expected to return zero. Verify Session 1.
3. **Is `PRODUCT_TYPE_MAP` truly dead or is there an undocumented intended use?** Owner decision needed (recommend delete).
4. **Browser local-storage form state shape** — does dual-read in form state code handle this transparently, or are there cases where a user has a half-filled form open across the deploy boundary? Test during Session 1 / Phase A.
5. **`tellUsApplying` value "Company (Non-individual entity)"** — separate concern but related; the API depends on this exact string. Not in scope for this spec but worth a follow-up audit.

---

## 16. References

- `CLAUDE.md` §16 — branch / commit / push rules
- `docs/PITFALLS.md` Pitfall #33 — current (drifted) wording on field-name overload
- `docs/PAYLOAD_DOCUMENTATION.md` — current loanType semantics doc
- `docs/LOAN-ASSESSMENT-API-INTEGRATION.md` — external API contract spec
- `docs/specs/PLOT-EQUITY-LOAN-DESIGN.md` — companion spec; Phase 1 absorbed by this work
- `reference_plot_loan_field_naming.md` (memory) — historical context
- `reference_plot_equity_loan_mechanics.md` (memory) — domain knowledge for follow-on work
- bank-loan-management repo: https://github.com/eYantrik-rinn/bank-loan-management
- Code: `src/lib/utils/payloadBuilder/loanTransaction.ts:64-90` (the current dual-read for Plot BT detection)
- Code: `src/lib/config/commonPage.json` (the form schema with the overloaded fields)
- Audit screenshot: CS-2026-0230 (Plot Loan Only Ghaziabad case showing the field shape end-to-end)
