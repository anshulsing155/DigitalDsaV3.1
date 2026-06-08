# Code Review — 2026-04-02

**Scope**: All commits since last review (`0fd104e3` on 2026-03-31) through `4ee74ae7` (HEAD)
**Commits reviewed**: 16 feature/fix commits across 4 areas
**Author**: All commits by Prashant (team lead)

---

## Executive Summary

| Severity | Count | Areas |
|----------|-------|-------|
| CRITICAL | 2 | Billing/Razorpay |
| HIGH | 3 | Billing (2), Form Submit (1) |
| MEDIUM | 7 | Billing (3), Lender Policy (2), Director/Form (2) |
| LOW | 10 | Various |
| INFO | 4 | Various |

**Top 5 priorities:**
1. **[CRIT]** Razorpay price manipulation — client sends amount, server doesn't verify against plan price
2. **[CRIT]** Amount double-conversion — `amountPaise * 100` creates 100x overcharge
3. **[HIGH]** No error handling if `evaluateOnServer` fails during form submit
4. **[HIGH]** No case limit enforcement — Basic plan users can create unlimited cases
5. **[HIGH]** Fail-open on subscription check error (empty catch block)

---

## 1. BILLING / RAZORPAY (`a34cbbd9`)

### CRITICAL

**CRIT-1: Arbitrary Amount in Razorpay Order — Price Manipulation**
- **File**: `src/routes/api/razorpay/order/+server.ts`
- `/api/razorpay/order` accepts `amount` from the client. A user can call it with `amount: 1`, get a valid order, pay Rs 1, then call `/api/billing/subscribe` with the real plan ID. Subscribe verifies the Razorpay signature (genuine payment) but **never verifies the paid amount matches the plan price**.
- **Impact**: Enterprise plan (Rs 9,999) subscribable for Rs 1.
- **Fix**: Look up price server-side from `PLANS[plan].amountPaise` during order creation, or verify paid amount via `razorpay.payments.fetch()` before activating.

**CRIT-2: Amount Double-Conversion (100x Overcharge)**
- **Files**: `/api/razorpay/order` (does `amount * 100`) + billing page (sends `plan.amountPaise`, already in paise)
- Order endpoint converts to paise: `99900 * 100 = 9,990,000 paise = Rs 99,900` instead of Rs 999.
- **Fix**: Send `plan.priceMonthly` (rupees) to the order endpoint, OR fix the endpoint to accept paise directly.

### HIGH

**HIGH-1: No Server-Side Amount Verification After Payment**
- **File**: `src/routes/api/billing/subscribe/+server.ts`
- Signature verification proves payment is genuine, not that the correct amount was charged.
- **Fix**: Call `razorpay.payments.fetch(payment_id)` and verify `payment.amount === planConfig.amountPaise`.

**HIGH-2: No Case Limit Enforcement**
- Evaluation gate checks `isSubscriptionActive()` (expiry + status) but never checks `activeCaseCount >= case_limit`. Basic plan (10 cases) allows unlimited cases until expiry.
- **Fix**: Add count check in evaluation gate or case creation endpoint.

**HIGH-3: Fail-Open on Subscription Check Error**
- **Files**: `evaluate-and-persist/+server.ts`, `rule-engine/evaluate/+server.ts`
- Empty `catch` block — if MongoDB query fails, evaluation proceeds for free.
- **Fix**: Log the error at minimum. Consider fail-closed for billing checks.

### MEDIUM

**MED-1: No Idempotency on Subscribe Endpoint**
- Double-click or network retry can create duplicate billing transactions. No unique index on `razorpay_payment_id`.

**MED-2: BillingTransactions Collection Untyped + No Indexes**
- `Collection` declared without type parameter. No index on `{ dsa_id: 1, created_at: -1 }`.

**MED-3: Plan Downgrade Extends Expiry**
- Always sets `expires_at` to 1 month from now regardless of existing subscription. Enterprise user can "downgrade" to Basic for a fresh 30-day window.

### LOW

- `$derived` used as function instead of `$derived.by` for `daysLeft`
- `razorpay_order_id` not validated against server-created orders
- No rate limiting on subscribe endpoint
- `checkout.js` loaded globally (all pages, not just billing)
- No tests for billing logic

---

## 2. LENDER POLICY SYSTEM (`c5706a1e`, `91b37ac3`)

### HIGH

**HIGH-4: Professional/Business Loan Geo Scoring Always Returns "No Location Data"**
- **Files**: `resultBuilder.ts`, `geoFilter.ts`, `loanTransaction.ts`
- Geo scoring extracts `tx.propertyState || tx.residenceState`, but Professional Loans use `businessStateName`/`businessCityName` — these are never mapped into `LoanTransactionPayload`.
- **Impact**: Every lender shows "Available" with `geoScore: 0.5` for Professional/Business loans. Geo presence chips are meaningless for these loan types.
- **Fix**: Map `businessStateName`/`businessCityName` to payload fields in `loanTransaction.ts` and include in the fallback chain.

### MEDIUM

**MED-4: City Name Case Normalization in `classifyCityTier`**
- Geo matching uses `.toLowerCase()` but `classifyCityTier()` uses `Set.has()` against title-cased values. If form stores "mumbai" (lowercase), it classifies as `tier2` instead of `metro`.
- **Fix**: Normalize city name before checking sets.

**MED-5: `tier3_rural` Never Produced by Classifier**
- `classifyCityTier()` returns `tier2` for anything not metro/tier1. Lenders with `cityTierPresence: ['metro', 'tier1']` will incorrectly match tier2 cities.

### LOW

- `company.age` used for company vintage (semantic overload, add comment)
- Duplicate chip label constants (`geoFilter.ts` vs `LenderResultCard.svelte`)
- No SHA-256 content hash on compiled lender docs (unlike other rule docs per AD-05)
- Seed API default path vs `seedAll()` produce different database states

---

## 3. DIRECTOR / FORM BUG FIXES (`4af9c93b`, `ba86c246`, `5bd6c123`, `e35640eb`, `ce3baa4b`, `d117afc0`)

### HIGH

**HIGH-5: No Error Handling if `evaluateOnServer` Fails During Submit**
- **Files**: All 6 `+page.svelte` in `src/routes/(app)/form/`
- `handleSubmit()` calls `await evaluateOnServer()` without try/catch. Network error or 500 leaves user with no feedback — submit silently fails or uses stale completion data.
- **Fix**: Wrap in try/catch, show error: "Could not verify form completion. Please check your connection."

### MEDIUM

**MED-6: CIBIL Lookup by Name is Fragile**
- **File**: `applicantPayload.ts` lines 252-256
- Matches director to Individual by `fullNameOfApplicant.toLowerCase().trim()`. Any name divergence (extra space, middle name, honorific) causes silent CIBIL data loss — bank rules get `undefined` CIBIL.
- **Fix**: Match by linked Individual ID if available, or use `linkedCompanyIds` on the Individual side.

**MED-7: `(obl as any).loanType` Bypasses Type Safety**
- **File**: `incomeAssessor.ts` line 278
- Obligation type doesn't include `loanType` in its interface. Add `loanType` to `EnrichedObligation` type.

### LOW

- Stale comment says 25% threshold, code uses 20% (`applicantRoleUtils.ts`)
- Mutation inside `.filter()` callback in cleanup path (`directorFormUtils.ts`)
- Stale `professionType` not cleared when category changes to unmapped value
- Submit completeness check is client-side only (no server guard)

---

## 4. FIXTURES / ADMIN / CSS (`4ee74ae7`, `b15da454`, `480fd660`, `a70171cb`)

### MEDIUM

**MED-8: Unknown Relationship Types Default to "Family"**
- `isNonFamily(r.relationType as any)` — if `relationType` is not in the classifier map, `RELATIONSHIP_CATEGORIES[unknownType]` returns `undefined`, which `!== 'non_family'`. Unknown types treated as family is the wrong default for financial calculations.
- **Fix**: Default unknown types to `non_family` (conservative):
  ```ts
  const cat = RELATIONSHIP_CATEGORIES[relationType];
  return cat === 'non_family' || cat === undefined;
  ```

**MED-9: White Text on Gold-Gradient May Fail WCAG AA**
- `text-black` changed to `text-white` on gold-gradient buttons. White text on bronze/sand gradient may have marginal contrast. Verify lightest gradient stop provides 4.5:1 ratio.

### LOW

- Missing `downPayment` on EDGE-HIGH-FOIR fixture; EMI description says 82K but actual is 68K
- No female-primary fixture (stamp duty / PMAY boundary testing)
- `gray-400` and `gray-500` map to same dark mode color (collapses visual hierarchy)
- Verify seed API route has its own `requireRole('admin')` guard

### POSITIVE OBSERVATIONS

- Admin auth defense-in-depth (layout + page-level guards)
- `:where()` low-specificity dark mode safety net is well-architected
- BT + credit lines fixture exercises FOIR 5% rule correctly
- "No relation" family detection bug correctly fixed
- GST vintage parsing fails safe (returns 0 years)
- All 6 form pages implement identical submit validation pattern (no drift)

---

## Recommended Action Priority

| # | Issue | Severity | Effort |
|---|-------|----------|--------|
| 1 | Fix Razorpay price manipulation + double-conversion (CRIT-1, CRIT-2) | CRITICAL | 1-2 hrs |
| 2 | Verify paid amount via Razorpay API (HIGH-1) | HIGH | 30 min |
| 3 | Enforce case limits in evaluation gate (HIGH-2) | HIGH | 30 min |
| 4 | try/catch `evaluateOnServer` in all 6 form submit handlers (HIGH-5) | HIGH | 30 min |
| 5 | Map business location to payload for geo scoring (HIGH-4) | HIGH | 1 hr |
| 6 | Log billing check errors instead of empty catch (HIGH-3) | HIGH | 15 min |
| 7 | Add idempotency + indexes to BillingTransactions (MED-1, MED-2) | MEDIUM | 30 min |
| 8 | Fix city name normalization in `classifyCityTier` (MED-4) | MEDIUM | 15 min |
| 9 | Default unknown relationship types to non-family (MED-8) | MEDIUM | 15 min |
| 10 | Add `loanType` to obligation type interface (MED-7) | MEDIUM | 15 min |

---

## Automated Health Check — 2026-04-02 14:39:11

**HEAD**: `9bb05672 feat: two-stage E2E testing architecture — applicant setup + full path` | **Branch**: main | **Unstaged**: 5 files

| Check | Result |
|-------|--------|
| **Type Check** | 0 errors, 0 warnings |
| **Unit Tests** | 9188 passed, 0 failed (1275 files) |
| **Selector Health** | SKIPPED |
| **Accessibility Diff** | SKIPPED |


