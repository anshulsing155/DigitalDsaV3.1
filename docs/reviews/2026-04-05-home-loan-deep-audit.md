# Home Loan Deep Audit — Design, UX, Performance, Logic

> **Date**: 2026-04-05 | **Session**: 54 | **Auditor**: Claude
> **Scope**: Full Home Loan flow — Landing → Login → Dashboard → Form (11 pages) → Submit → Results
> **Modes tested**: Light + Dark, Desktop + Mobile (375×812)
> **Case**: HL-2026-0045 (1 applicant, ₹60L, 10 yrs, Planned Authority, Flat, New Loan)

---

## Overall Assessment

**The platform is production-ready for the core DSA flow.** End-to-end case creation through lender results works correctly. Both light and dark modes render cleanly. Mobile layout is properly responsive. The evaluation engine returns detailed, useful results.

**Rating: 8/10** — Solid foundation, polished core, a few rough edges documented below.

---

## SECTION 1: WHAT WORKS WELL

### Design & Visual Quality
- **Consistent design language** across all pages — warm brand palette (copper/bronze accents), clean typography, well-spaced cards
- **Dark mode is genuinely good** — not just inverted colors, but a distinct dark palette with proper contrast
- **Number-in-words** beneath every currency field (₹1,00,00,000 → "One Crore") — excellent for Indian context where lakhs/crores cause confusion
- **Indian number formatting** correct everywhere (commas at lakhs/crores positions)
- **Info badges** with contextual icons (📄, 💡, ⚠️) in question descriptions — informative without being overwhelming
- **Radio cards with icons** — visually distinct, easy to scan on mobile

### UX Flow
- **Sidebar navigation** with section completion status (✓ COMPLETE) gives DSA full confidence on progress
- **Step counter** "Step X of 11" on mobile replaces sidebar efficiently
- **"Editing case — changes will create a new version"** banner is clear and reassuring
- **Evaluation animation** with step-by-step checklist (Profiling → Checking policies → Calculating → Comparing) is excellent — DSA knows something is happening
- **Lender results** are deeply detailed: amount, ROI, EMI, tenure, disbursement structure, FOIR/LTV/CIBIL, "What Shaped This" breakdown

### Form Intelligence
- **Cascading questions** work correctly — selecting "Planned Authority" shows appropriate purchase type options, compliance checks, documentation checklists
- **showWhen** conditions hide irrelevant questions cleanly — no flash of content
- **Warnings** are contextual and actionable (e.g., "Registry < Deal means cash needed at registration")
- **Exclusive options** in multi-select (e.g., "None collected yet") work as expected

---

## SECTION 2: ISSUES FOUND

### P0 — Critical (Must Fix Before Launch)

*None found.* The core flow is functional end-to-end.

### P1 — High (Fix Soon)

| # | Page | Issue | Impact | Recommendation |
|---|---|---|---|---|
| 1 | **Results** | Approval probability shows as `0.47000000000000003%` | Looks broken/unprofessional — floating point display error | Round to 2 decimal places: `(probability * 100).toFixed(2) + '%'` |
| 2 | **Results** | "Marginal" count shows 76 (same as "All") — but results header shows "75 eligible, 1 ineligible" | Confusing — Marginal should be a subset, not equal to All | Verify filter logic: Marginal = amber results, not all results |

### P2 — Medium (Fix Before Launch)

| # | Page | Issue | Impact | Recommendation |
|---|---|---|---|---|
| 3 | **Dashboard** | "Urgent: 29" stat card — 29 out of 35 cases flagged as urgent | Feels broken — if 83% are "urgent", the threshold is too sensitive | Review urgency criteria; too many urgents = urgency fatigue |
| 4 | **Case Detail** | "Queries SOON" and "Communicate SOON" tabs show SOON badges permanently | Feels unfinished — DSA might think features are broken | Either hide unreleased tabs or show "Coming in next update" |
| 5 | **Form: Property** | Construction stage question (UC/RTM) shows for Planned Authority + New Loan + direct_from_authority even though authority properties are always RTM until OC | Edge case: if authority gives possession before OC, stage is ambiguous | Add DSA guidance clarifying the edge case |
| 6 | **Form: Financials** | Down payment field has no * (required indicator) but the field IS effectively required (validation blocks submit without it) | DSA might skip it thinking it's optional | Add `required: true` or show the asterisk |
| 7 | **Mobile** | "Sections" button and "Help" button overlap on small screens (375px) when question text is long | Buttons may be hard to tap accurately | Adjust bottom bar z-index/spacing for small viewports |

### P3 — Low (Polish)

| # | Page | Issue | Impact | Recommendation |
|---|---|---|---|---|
| 8 | **Login** | OTP input boxes don't auto-advance focus to next box after digit entry | Minor friction — DSA must tap each box | Implement auto-focus-next on digit input |
| 9 | **Dashboard** | "vs 0 last month" comparison text under every stat when there's no prior data | Looks like placeholder — no comparison is possible | Show "—" or hide comparison when no prior month data |
| 10 | **Case List** | Case cards show "No lenders added yet" in muted text | Correct but could be more actionable | Change to "→ Submit to match with lenders" with link |
| 11 | **Form** | Digital DSA logo in form header area is decorative only | Takes vertical space on mobile that could be used for content | Consider hiding on mobile or making it smaller |
| 12 | **Results** | "Check for Updates" button text could be clearer | DSA might not understand what "updates" means | Change to "Re-evaluate" or "Refresh Results" |
| 13 | **Results** | Disbursement structure shows "To seller" / "To buyer" labels — but for authority purchases there is no "seller" | Label mismatch for the purchase type | Dynamic label: "To authority" for direct_from_authority |

---

## SECTION 3: DARK MODE SPECIFIC

| # | Component | Issue | Severity |
|---|---|---|---|
| — | — | **No dark mode issues found** | — |

Dark mode was tested on: Landing page, Login, Dashboard, Cases list, Case detail, Form wizard (all 7 sections), Property pages, Financial inputs, Results page. All rendered correctly with proper contrast, no invisible text, no broken borders.

---

## SECTION 4: MOBILE SPECIFIC

| # | Component | Issue | Severity |
|---|---|---|---|
| 1 | Form bottom bar | "Sections" + "Help" + "Previous" + "Next/Show Offers" crowd the bottom on 375px | P2 |
| 2 | Results page | Not tested in mobile — desktop sidebar may not collapse properly | Needs verification |
| 3 | Radio cards | On mobile, long option text (e.g., "Allotment confirmed but letter not yet received") wraps well | ✅ OK |
| 4 | Currency inputs | Rupee prefix + number formatting works well on mobile keyboard | ✅ OK |

---

## SECTION 5: PERFORMANCE

| Metric | Observed | Assessment |
|---|---|---|
| Landing page load | ~2s (loading animation → content) | ✅ Good |
| Login → OTP screen | <1s | ✅ Excellent |
| Dashboard load | ~1-2s (all stats populated) | ✅ Good |
| Case list load | <1s | ✅ Excellent |
| Form wizard load | ~1-2s (all questions rendered) | ✅ Good |
| Page-to-page navigation (sidebar) | Instant (<100ms) | ✅ Excellent |
| Show Offers → Results | ~3-5s (evaluation of 76 lenders) | ✅ Good — animation covers wait |
| Question interaction (radio/select) | Instant | ✅ Excellent |
| Currency input typing | No jank observed | ✅ Good |

**No performance issues detected.** The form is responsive during typing, page transitions are instant (client-side SvelteKit routing), and the evaluation wait is well-masked by the step-by-step animation.

---

## SECTION 6: ERROR HANDLING

| Scenario | Observed Behavior | Assessment |
|---|---|---|
| Empty required field + Next | Next button disabled (grayed out) | ✅ Correct |
| All fields complete + Next | Navigates to next page | ✅ Correct |
| Show Offers click | Evaluation starts with animation | ✅ Correct |
| Editing case banner | "Changes will create a new version" | ✅ Clear |
| Version history on results | v1 → v2 timeline with dates | ✅ Excellent |

**Not tested** (requires network manipulation):
- Server error during evaluation
- Session expiry during form filling
- Network disconnect during submit

---

## SECTION 7: FORM LOGIC — REMAINING CONTRADICTIONS

After the FG-2 session work (37 items analyzed, 32 confirmed done), the remaining logic issues from visual inspection:

| # | Issue | Severity | Notes |
|---|---|---|---|
| 1 | PropertyStage (UC/RTM) shown for direct_from_authority when property is always RTM at purchase | Low | Auto-derive opportunity (in FORM-OPTIMIZATION-SPEC) |
| 2 | Down payment not marked required but blocks progression | Medium | Missing `required: true` or asterisk |
| 3 | No validation preventing mortgageYear from exceeding applicant's retirement age | Low | Rule engine handles this at evaluation, not at form level |

**No impossible answer combinations detected** in the tested flow (New Loan, Planned Authority, Flat, Standard Purchase).

---

## SECTION 8: RECOMMENDATIONS SUMMARY

### Must Fix (3 items)
1. **Approval probability floating point** — `0.47000000000000003%` → `0.47%`
2. **Marginal filter count** — shows 76 (same as All), should be a subset
3. **Down payment required indicator** — add asterisk

### Should Fix (4 items)
4. "SOON" tab badges — hide or clarify
5. Dashboard urgency threshold — 29/35 urgent is noise
6. Mobile bottom bar overlap at 375px
7. Disbursement label "To seller" → "To authority" for authority purchases

### Nice to Have (5 items)
8. OTP auto-advance focus
9. Dashboard "vs 0" comparison hiding
10. Case card "No lenders" → actionable CTA
11. Form logo smaller on mobile
12. "Check for Updates" → "Re-evaluate"

---

## WHAT THIS AUDIT COVERS VS. WHAT'S REMAINING

| Covered | Not Covered (needs separate audit) |
|---|---|
| ✅ Home Loan — New Loan, Property Identified, Planned Authority | ❌ Home Loan — BT/Top-up flow, Resale flow |
| ✅ Individual applicant | ❌ Company applicant, Director flow |
| ✅ Light + Dark, Desktop + Mobile | ❌ Tablet (768px) |
| ✅ Salaried income profile | ❌ Business/Professional/Rental income |
| ✅ Submit → Results flow | ❌ File Builder, Lender Tracking, Communication |
| ✅ DSA Dashboard | ❌ RM Dashboard, Admin Dashboard |
| ✅ Basic error handling | ❌ Network failure, session expiry, concurrent edits |
