# ADR-0019 — Plan prices are inclusive of GST

**Status**: ✅ Approved (2026-05-28) — implementation shipped same day as part of D.2.
**Date**: 2026-05-28
**Session**: 2026-05-28 D.2 invoicing build

## Context

D.2 (GST invoicing) requires us to decide how the **displayed plan prices** relate to the **invoiceable taxable value + GST components**. Two industry conventions:

- **Inclusive**: the price the DSA sees (₹3,999/mo) is what gets debited. The invoice back-computes the taxable value (₹3,999 ÷ 1.18 = ₹3,389) + GST (₹610), reconciling to the same ₹3,999 total.
- **Exclusive**: the price the DSA sees (₹3,999/mo) is the taxable value. We debit ₹3,999 + 18% GST = ₹4,719. The invoice shows ₹3,999 + ₹720 IGST = ₹4,719 total.

The PRE-D.2 system charged a flat ₹3,999 with no invoice — so the existing implicit contract is "price displayed = price charged."

## Decision

**Plan prices are inclusive of GST.** ₹3,999 stays the debit. The invoice back-computes:

- Taxable value = round(total ÷ 1.18)
- Tax = total − taxable value (sum-invariant adjustment)
- Intra-state: CGST = round(tax ÷ 2); SGST = tax − CGST
- Inter-state: IGST = tax

For Pro at ₹3,999 (399900 paise):
- Taxable = 338898 paise (₹3,388.98)
- CGST = 30501 (₹305.01) + SGST = 30501 (₹305.01) for intra-state
- OR IGST = 61002 (₹610.02) for inter-state

Net effect: **the DSA pays exactly the displayed price. The invoice itemizes the GST share they're entitled to claim back if they're GST-registered.** Our gross revenue per DSA is the taxable value; the GST portion is collected and remitted to the government.

## Rationale (in plain English)

### Why inclusive

1. **The Subscribe page already says "₹3,999/month"** and that's what gets charged today. Switching to exclusive means every marketing surface (Subscribe CTA, trial card, disclosure modal, dunning emails, billing dashboard, blog posts, social media) has to be updated to say "+ GST" — substantial copy work and a real UX hit when DSAs see prices appear to jump 18% at checkout.
2. **Indian B2B SaaS convention.** Zoho, Freshworks, Razorpay's own product pricing all display GST-inclusive. DSAs setting up auto-pay expect the displayed price to match the bank debit.
3. **Lower DSA-side friction.** No surprise at checkout. The Razorpay disclosure modal can say "₹3,999 today, ₹3,999 every month after" without footnotes.
4. **Lower implementation cost.** Only the invoice engine needs the back-calc; plan prices, mandate caps, charge amounts, and disclosure copy all stay as-is.

### What we give up

- Gross revenue per DSA is ~15% lower than the "headline price" reads. Pro at ₹3,999 inclusive = ₹3,389 taxable. If we wanted to present the ₹3,999 as gross revenue, we'd need to switch to exclusive pricing (which then increases DSA-side cost to ₹4,719).
- A GST-registered DSA who claims input tax credit recovers the ₹610 from the government — net cost to them is still ₹3,389. So **for GST-registered DSAs, inclusive pricing actually has the same effective cost as exclusive**. The accounting just runs through them rather than through us.
- For non-registered DSAs (B2C), they bear the full ₹3,999 either way; inclusive vs exclusive only changes how we report it on the invoice.

### What we'd switch FROM if revenue projections required it

If the business ever needed to raise revenue-per-DSA without raising the headline price, the choice would be:

1. **Raise prices** (e.g., Pro ₹4,499) — the cleanest, most honest path. ADR isn't needed for that.
2. **Switch to exclusive** + reissue all marketing — possible but expensive and DSA-hostile.

Either path beats trying to retroactively reinterpret existing prices.

## Consequences

### Positives
- Zero copy changes across the product. ₹3,999/mo stays ₹3,999/mo across Subscribe, Manage, disclosure modal, emails, billing dashboard.
- Invoice generation is a back-end concern only — no client surface needs to know about tax math.
- DSAs see consistent numbers from sign-up through monthly debits.
- For GST-registered DSAs (most professional DSAs), the input tax credit path works correctly — they claim the ₹610 back, net cost is ₹3,389 (the taxable value).

### Negatives
- Our gross-revenue-per-DSA reporting must distinguish taxable value (₹3,389) from total billed (₹3,999) — internal dashboards / accounting need this column. The Invoices collection stores both `taxable_paise` and `total_paise` so the data is present.
- New plan-price changes require quoting the inclusive figure. If a partner asks "what's your headline price?" the answer is "₹3,999 inclusive of GST."

## Implementation

- `src/lib/server/billing/invoiceEngine.ts` — `computeInvoiceMoney(total_paise, taxKind)` is the back-calc. Rounding-with-adjustment: tax = total − taxable, then split for intra/inter. The sum invariant (taxable + cgst + sgst + igst == total) is locked by unit tests.
- `src/lib/config/billing.ts` — `PLANS[X].priceMonthly` is the **inclusive** price. No "ex-GST" or "incl-GST" suffix needed in the config; the comment block in the invoice engine documents the convention.
- `src/lib/server/billing/invoicePdf.ts` — the PDF header/breakdown shows the math explicitly: "Taxable Value ₹3,388.98 + CGST ₹305.01 + SGST ₹305.01 = TOTAL ₹3,999.00" so a GST-registered DSA can see immediately what they can claim.
- Invoice-ready email body explicitly notes "(inclusive of GST)" next to the amount.

## Alternatives considered

| Option | Why rejected |
|---|---|
| **Exclusive pricing** (₹3,999 + 18%) | Requires updating every marketing surface; DSA-side surprise at checkout. Industry-uncommon for B2B SaaS in India. |
| **Mixed: charge ₹3,999 but show "₹3,389 + GST" in the UI** | Sets the wrong expectation. DSAs would pay ₹3,999 but think the headline is ₹3,389; complaints inevitable. |
| **Configurable per-plan (some inclusive, some exclusive)** | No business reason to vary across plans. Adds runtime branching for zero product value. |

## References

- `src/lib/server/billing/invoiceEngine.ts` — back-calc implementation + tests
- `src/lib/server/billing/invoicePdf.ts` — visible breakdown on the PDF
- `docs/specs/POST-AUDIT-IMPLEMENTATION-MASTER-SPEC.md` §D.2 — original spec (didn't specify inclusive/exclusive)
- `docs/specs/D-1-RECURRING-BILLING-SPEC.md` R10 — gapless numbering requirement
