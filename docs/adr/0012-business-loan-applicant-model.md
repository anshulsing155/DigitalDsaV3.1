# ADR-0012 — Business Loan applicant model (company = multi; directors are non-financial co-applicants)

**Status**: Accepted
**Date**: 2026-05-22
**Session**: form-fix batch (P1–P16)

## Context

The Business Loan form was "broken" in ways that kept recurring across sessions. Root cause: the single-vs-multi applicant view was decided by **applicant count** (`applicants.length === 1`). A company keeps its directors/partners **nested inside the company record**, so a company case is one entry — and was wrongly routed into the **single-applicant inline flow**. That flow (a) mounted `Company.svelte` with a **dead Submit** (no `onSubmit`), and (b) duplicated the company applicant modal with separate flattened wizard pages (`businessProfilePage`, `companyFinancialsPage`) that wrote **divergent, dead keys** the rule engine never reads.

Investigation established those flattened pages were an earlier **AI over-engineering** addition — created with a "recommended" tag and agreed to despite being known-useless. A consumer-grep confirmed their keys (`annualTurnoverRange`, `companyAnnualTurnover`, `gstRegistrationStatus`, `companyOwnedProperties`, …) are read by nothing in `ruleEngine/`; the engine uses the company applicant's `companyIncome` + `gstStatus` + `businessVintage`, captured in the modal.

The owner confirmed the intended domain model, which the code did not match.

## Decision

**A Business Loan is for exactly one company OR a sole proprietor — never a joint of companies, never company + individual.**

- **Company applicant (Pvt Ltd / OPC / Partnership / LLP) ⇒ always the multi-applicant cards + modal view.** Even though directors/partners are nested (one applicant entry), a company is never treated as a "single person." All company data (Identity / Character / Income / CIBIL / Obligations) is captured **once, in the applicant modal**.
- **Directors / partners are NON-financial co-applicants** — they are on the loan (liable), but the **company pays the EMI** and the company's financials are the income basis. (`onEMI`: company = true, directors = false — pre-existing, from Session 67.) **⚠️ Refined by Amendment 2026-05-22 below — "non-financial" is no longer blanket; it now depends on stake/family, and "financial" never means pooled.**
- **Sole proprietor ⇒ single-applicant flattened flow** (income profiles/details, credit, obligations as pages).
- The single/multi decision lives in **one shared helper**, `rendersAsSingleApplicant(applicants)` (`single ⟺ length ≤ 1 && applicants[0]?.applicantType !== 'Company'`), used by both `IncomePageNew` and the loan `+page.svelte` so the two surfaces cannot drift.
- The flattened `businessProfilePage` + `companyFinancialsPage` are **retired** from the Business Loan schema (the modal captures them).

**Scope guard:** the "directors are non-financial" rule is **business-loan-specific**. Companies also appear in secured loans (Home/LAP/Plot) and must also render multi, but their director financial/role treatment is different — that model is NOT defined here and must be handled separately.

## Consequences

- Fixes the dead company Submit, the duplicated "Business Profile" questions (Problem D), and the count-based mis-route — at the root, in one place.
- Removes a class of recurring breakage: any future `applicants.length === 1` single/multi check is now a pitfall (CLAUDE.md Pitfall #45), enforced by `applicantViewMode.test.ts` + `businessLoanPageVisibility.test.ts`.
- Company test journeys had to drop the dead `businessProfilePage` page-tags (they referenced removed pages); company-profile generation was restored without changing engine results (the keys were unused).
- Trade-off accepted: directors remain **nested** (Option B) rather than promoted to separate applicant entries (Option A) — less data-model churn; the multi cards render the company, and director management stays on the applicant-details step.
- A consequence to watch: a Partnership/LLP "borrowing-firm declaration" check now runs on the partner's income step (before-navigate), not on "Who's Applying" — see CHANGELOG 2026-05-22 (P13).

## Alternatives Considered

- **Option A — promote directors to separate co-applicant entries** (so `length > 1` makes the case multi by construction). Cleanest match to "directors are always co-applicants," but touches the director-storage model broadly; rejected for churn/risk.
- **Keep the flattened single-company flow, just fix its dead Submit.** Rejected — it perpetuates the duplicate capture (Problem D) and divergent keys.
- **Change the global `__multiApplicantMode` flag to include companies.** Rejected for this session — it would change secured-loan page visibility too, and secured is intentionally deferred.

## Amendment 2026-05-22 — director financial classification (stake + family; never pooled)

The original Decision said directors/partners are *blanket* "non-financial co-applicants." The owner refined this same day. Two clarifications drove the change:

1. **Eligibility is computed ENTIRELY on the company entity** — its income, obligations, and CIBIL. The company applicant carries its own poolable income (`extractGrossMonthlyIncome` / `extractApplicantGrossMonthly` have an `applicantType === 'Company'` branch). **Director/partner personal financials NEVER pool into eligibility** — they are captured only for income validation / fraud checks.
2. The financial/non-financial split therefore governs **how much director data we capture**, not income-pooling. It is driven by stake and family:
   - **≥20% individual stake (substantial interest, IT Act §2(32) — owner-confirmed line, not 25%) OR any family member → `non_applicant_full_financial`**: full personal financials captured for validation/fraud, **assessed independently, income not pooled**.
   - **<20% AND non-family → `co_applicant_non_financial`**: on the loan (liable), KYC + CIBIL only.
   - **Explicit guarantor designation → `guarantor_financial`** (preserved; not pooled).
   - **Sole Proprietorship → `co_applicant_financial`** (the proprietor *is* the entity, so they pool — unchanged).
   - Missing relationship data ⇒ treated as **non-family** (owner-accepted default).

**Applies to BOTH Business and Professional Loan company cases** (the prior blanket `loanCategory === 'Professional Loan' → co_applicant_non_financial` short-circuit was removed; Professional now uses the same stake/family split).

**Latent bug this corrected:** previously, ≥20% family PvtLtd directors and *all* Partnership/LLP/OPC partners were `co_applicant_financial` → their personal income **pooled on top of** the company's income (double-counting / inflated eligibility). The amendment routes them to non-pooled classifications. Secured loans (Home/LAP/Plot) are untouched — there a co-applicant's financial status is chosen via onEMI/onProperty.

Implementation: `deriveDirectorClassification` in `src/lib/utils/applicantRoleUtils.ts` (unsecured branch keyed off `!isSecuredLoan`; family already wired at the canonical `classifyForCompany` call site, `applicantFormManager.svelte.ts:1891`). Tests: `applicantClassification.test.ts` ("unsecured company directors/partners").

## References

- CLAUDE.md Pitfall #45 (count-based single/multi mistake) + Pitfalls #43/#44
- docs/CHANGELOG.md — 2026-05-22 "Form-fix batch (P1–P16)"
- User memory `feedback_no_overengineering.md` (the over-engineered flattened flow)
- `src/lib/utils/applicantViewMode.ts`, `src/lib/config/businessLoan/pages.ts`
- Prior: Session 67 "Company Co-Applicant Fix" (companies not auto-created as financial co-applicants)
