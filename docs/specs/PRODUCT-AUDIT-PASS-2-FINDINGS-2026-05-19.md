# Product Audit — Pass 2 Findings — 2026-05-19

> **Status:** IN PROGRESS — multi-session audit per Path B.
> **Session 1 scope:** Phase 1 (setup) + Lens 3 (DSA dashboard sweep). All other lenses deferred.
> **Next-session resume point:** see `docs/specs/PRODUCT-AUDIT-PASS-2-PROGRESS.md`.

---

## Session log

- **Session 1 (2026-05-19, this session):** Setup + DSA dashboard sweep.
- **Session 2 (planned):** RM dashboard sweep + Admin sweep + Gap A confirmation.
- **Session 3 (planned):** Non-UI lenses (1, 2, 6–15) + follow-up drills + synthesis.

---

## Executive Summary

*To be written in Session 3 after all lens findings are gathered.*

---

## The Two Gaps Pass 1 Missed (called out by user)

### Gap A — Admin-proxy RM policy capture

**Status: CONFIRMED MISSING.**

**Investigation method (Session 2).** Switched to admin role via `/api/set-role`. Listed all routes under `src/routes/dashboard/admin/policies/**/+page.svelte` (11 routes). Visited each candidate route to look for a structured 25-field policy-capture form that an admin could fill on behalf of an RM. Compared to the RM-side flow at `/dashboard/rm/policy-capture/new` which is the structured-capture wizard.

**What the admin can do today.**

| Route | What it is | Is it Gap A? |
| --- | --- | --- |
| `/dashboard/admin/policies/upload` | Upload PDF/JPEG/PNG of a raw policy document for AI parsing | **No.** Different shape — it's document-ingest-then-AI-extract, not structured-field-entry. |
| `/dashboard/admin/policies/pms` | Review queue for RM-submitted policies (approve / reject / schedule) | **No.** Reviews what RM submits; doesn't create on behalf of. |
| `/dashboard/admin/policies/pms/[policyId]/json-editor` | Raw JSON editor for a policy | **No.** Terrifying for non-technical admin staff and bypasses the structured-form UX. |
| `/dashboard/admin/policies/approvals` | Approval workflow for parsed artifacts | **No.** Decision layer, not capture layer. |
| `/dashboard/admin/policies/registry-health` | PMS Phase 11 key lifecycle health view | **No.** Maintenance. |
| `/dashboard/admin/policies/dev-queue` | Internal dev pipeline | **No.** |
| `/dashboard/admin/policies/versions/[policy_rule_id]` | Version history view | **No.** Read-only. |
| `/dashboard/admin/policies/[artifact_id]` + `/test` | Artifact detail + test | **No.** Read/test. |

**What the admin CANNOT do today.** Sit down with a fax / WhatsApp / email from an RM at a PSU bank, open a structured wizard, and key in the 25 PMS policy fields on that RM's behalf. The closest the platform has is the PDF-upload flow — but that requires the RM to have already produced a written document. A phone-call-and-paper-notes capture is unsupported.

**What needs to land.**

A new admin route, mirroring `/dashboard/rm/policy-capture/new` exactly:

- **Route:** `/dashboard/admin/policies/capture-from-paper/` (or `/dashboard/admin/policies/proxy-capture/`)
- **UX:** Same wizard as RM policy-capture, but with an additional first step "Which RM is this for?" — pick from RM directory or create a new RM stub.
- **Provenance:** Each captured policy tagged with `provenance.source_type: 'admin_manual_proxy'` and `provenance.captured_by: <admin_user_id>`, `provenance.captured_for_rm: <rm_id>`.
- **Hand-off:** When the receiving RM later onboards to the portal, they see the admin-captured policy with provenance trail visible — they can edit, confirm, or revise, but the audit trail of "originally captured by admin X on behalf of RM Y on date Z" is preserved.
- **Server validation:** This endpoint must require `admin` role specifically; CSRF; rate-limited; and writes to `audit_log` collection. Optionally requires a second factor for the admin given the privilege escalation.

**Effort estimate.** Medium. The RM-side wizard exists; this is largely "lift the wizard component, add an RM-picker first step, add provenance tagging, add audit log row, gate to admin role". Maybe 3-5 dev days including tests.

**Severity. CRITICAL for product-market fit at PSU / small-NBFC / old-school-lender segments.** Without this, the platform's lender coverage is limited to RMs willing to self-onboard. The user's framing was correct: "not all RM will be ready to come to our portal to enhance or edit."

### Gap B — Dashboard UX maturity
**Partial findings — Session 1 covered DSA role only. RM + Admin pending.**

See [Lens 3](#lens-3--dsa-dashboard-ux-maturity).

---

## Tooling notes

- **Screenshots could not be captured** — `preview_screenshot` consistently times out at 30s on this dev server. Page renders fine; tool quirk. Findings rely on accessibility-tree snapshots (which carry exact text + structure + roles — actually more useful for UX text/structure assessment per the tool docs, less useful for visual layout).
- **Dev login flow observations:**
  - Mobile `9811556664` + OTP `9811` works as documented.
  - Form has two `type="submit"` buttons (Continue + Demo Dashboard) — fragile on Enter-key submission. Recommend Demo button → `type="button"`.
  - OTP screen pre-renders the role-picker buttons BEFORE OTP is verified. Visually noisy (6 submit-type buttons on one screen) AND raises question whether role selection is server-validated post-OTP or whether the buttons are just disabled until then. (Note: server-side `hooks.server.ts` does validate role; the buttons being present is a UX smell, not a security gap. Confirmed by CLAUDE.md §11.)
  - No visible "OTP verified" confirmation between entering OTP and the role becoming active — should add a checkmark/toast.

---

## Lens 3 — DSA Dashboard UX Maturity

**Methodology:** Logged in as DSA (mobile 9811556664, OTP 9811), walked through 13 dashboard pages, captured accessibility snapshots, ran focused DOM queries (buttons / links / headings / table-cards) per page, and observed the rendered content. No screenshots due to tooling timeout; observations are text-structure-based, which is actually more reliable for assessing copy, IA, and information architecture.

### Headline takeaways

1. **The DSA dashboard reads as a "v0.8 internal tool", not a "Razorpay-class commercial product".** The bones are there — comprehensive navigation, sensible page structure, smart empty states, monetization signals. But the polish gaps are visible at every page (raw enum values leaking, repeated case labels, test data not segregated, two competing pricing badges, broken metrics, undefined targets, inconsistent date formats).
2. **The product is built for DSAs but doesn't read like DSAs designed it.** Case labels show ISO dates ("Home Loan — 2026-05-06") not applicant names. Search box accepts case ID but not mobile/PAN/name. Primary CTA "New Case" is sidebar position 11. The product reads like an engineering team's understanding of what a DSA needs, missing the natural workflow polish.
3. **Monetization layer is present but undercooked.** Pricing fence is visible (Free → Pro upsells, "UNLOCKS LATER" hints, "MOST POPULAR" badge) but lacks teeth (43 active cases on a no-plan account where Basic caps at 10), lacks options (no annual, no trial), lacks transparency (no GST disclosure on price), and lacks personalization (no plan recommendation based on actual volume).
4. **Localization is shallow on dashboards.** Language toggle exists in top bar but most dashboard copy is English-only — and communication templates (which are user-facing to applicants) have no Hindi/Marathi variants despite 374 i18n keys per locale per CLAUDE.md §14.
5. **Test data is visible in production-shaped UI.** RM Contacts shows "Digital DSA" as a lender, "xyz bank", "testing", "Test RM with 4 confirmations". This is dev seed data, but the same pattern in prod (real DSA test entries surviving) is a serious risk.

### Page-by-page observations

#### 1. Login (`/login`)

**Purpose.** Entry point for both DSAs and RMs. Mobile + OTP, with demo and partner-signup secondary CTAs.

**Works well.** Strong headline ("India's #1 Intelligence Platform for Loan DSAs"), social-proof numbers (2,940+ Loans Matched / 100+ Lender Partners / 80+ Cities Covered), clear primary CTA (Continue), demo path (🎯 Explore Demo Dashboard), partner segmentation ("Are you a lender RM?"), language toggle.

**Gaps.**
- **Two `type="submit"` buttons in one form** (Continue + Demo Dashboard). On Enter-key press, browser picks the first — fragile. Demo should be `type="button"` with click handler.
- After OTP entry, the **role-picker buttons render BEFORE OTP is verified** — visually noisy (6 submit-type buttons on one screen) and confusing.
- No "OTP verified" visual confirmation between OTP entry and role becoming clickable. Add a checkmark/toast.

**Severity.** Minor — login still works, but every prospect sees these. Fix in a single afternoon.

---

#### 2. Home (`/dashboard/dsa`)

**Purpose.** Daily landing page for the DSA. Shows what needs attention, headline stats, and recent activity.

**Works well.** Time-aware greeting ("Good evening, digitaldsa."), "Needs Attention" pinned at top with case count (8), "Quick Glance" stat block (Active Cases 43 / Files Submitted 0), "Recent Cases" section, role-switcher (Admin / RM Partner) prominent in top bar, "UNLOCKS LATER" section with "Analytics — PRO" badge signaling monetization, theme toggle, language toggle, Guide.

**Gaps.**
- **5 identical "Home Loan — Stuck in 'Intake' for 86 days" rows** in Needs Attention — the case-label generator falls back to date, and 5 identical-looking cards reads as broken even when the data is real. Group by status or de-duplicate visually.
- **"43 active cases / 0 files submitted"** displayed as raw zero with no tooltip explaining why ("DSA hasn't completed any file builds yet — start one from a case"). Empty zeros need narrative.
- **Notifications icon (top bar) has no badge count** despite 8 needs-attention cases.
- **Destructive "Delete Account" persistently visible in sidebar bottom** — should live in Settings → Danger Zone. Easy mis-click for tired user.
- **No global search box** in top bar. DSAs with 43+ cases need fast lookup by mobile / PAN / name / case ID.
- **Primary CTA "New Case" is sidebar position 11** (after 10 nav items). The #1 user task should be a top-bar prominent button.
- **"Guide" button appears twice** in top bar (visual redundancy).
- **"+3 more items"** in Needs Attention is opaque — should be "View all 8 →".
- **"UNLOCKS LATER"** copy is awkward. Conventional: "Coming Soon", "Upgrade to unlock", or "Available in Pro".

**Severity.** Serious — every DSA lands here every session. Polish here pays back the most.

---

#### 3. Cases List (`/dashboard/dsa/cases`)

**Purpose.** Browse and filter all cases.

**Works well.** Stage counts visible (Intake 41 / Profiling 1 / File Building 1 / Dropped 2 = 45 total). Filters: stage, loan type, lender. Search box. Card-based layout with stage badge, amount, time-in-stage, recency. Empty state per card ("No lenders added yet").

**Gaps.**
- **Case labels are raw ISO dates** ("Home Loan — 2026-05-06" appears 4 times in a row). Should be applicant name + city, e.g., "Rajesh K. — Mumbai HL". This is the single biggest UX issue on the page.
- **`home_loan` raw enum** appears in the loan-type filter list and on each card's Type field. Should always display "Home Loan".
- **Search field placeholder = "case label or ID"** — too narrow. DSAs more commonly search by applicant mobile / PAN / name. Broaden.
- **No bulk actions, no sort control, no saved views, no list/table toggle.** DSAs with 200+ cases will need these.
- **No "filters applied: X" reset button** when multiple filters active.
- **No "list view" toggle** — cards work for 45 cases but choke at 200+.

**Severity.** Serious — `home_loan` enum leak + ISO date labels are deal-breakers visible to every DSA every day.

---

#### 4. Case Detail (`/dashboard/dsa/cases/CS-2026-0055`)

**Purpose.** Single-case workspace. Six tabs (Overview / Results / File Builder / Queries / Communicate / Timeline).

**Works well.** Comprehensive structure (Needs Attention, Loan Details, Case Info, Lender Applications, Contact Info, Source, Private Notes, Tasks, Recent Timeline). Strong empty states ("No lenders added yet — Add a lender to start building the file", "No tasks yet + Add Task"). 6-tab navigation matches the workflow.

**Gaps.**
- **Header lacks applicant identity** — shows only "Home Loan — 2026-05-06" + case ID. A DSA on a phone call needs the applicant name + mobile in the header so they can speak to context without scrolling. **Highest-leverage fix on this page.**
- **`home_loan` raw enum** in Loan Details "Type" field (same leak as cases list — fix at source per CLAUDE.md §16 rule 11).
- **H1 and the first H3 both render "Home Loan — 2026-05-06"** — visual duplication.
- **Date format inconsistent**: "Last Updated: 6 May" vs "Created: 6 May 2026".
- **Tabs not using `[role="tab"]` / `[role="tablist"]`** — keyboard navigation and accessibility miss.
- **Queries / Communicate tabs disabled** per CLAUDE.md SESSION-HANDOFF §8 — but the disabled tabs offer no "Coming soon" / "Available in Pro" hint when hovered. Confirm with `+layout.svelte:124-131`.
- **No "needs your action" CTA at top** — Needs Attention surfaces "Stuck in Intake / No stage change in 13 days" but no obvious next-step button.

**Severity.** Serious — case detail is the DSA's workspace; weak header IA hurts every single use.

---

#### 5. CRM Dashboard (`/dashboard/dsa/crm`)

**Purpose.** Pipeline view, source tracking, KPIs.

**Works well.** 7 KPI cards (Total / Active / Conversion / Avg Sanction / Sanctioned Value / Month New / Month Sanctioned), Pipeline View with stage breakdown + rupee totals ("₹37.70 Cr in Intake"), sub-tabs (Dashboard / Leads / Sources / Lenders). "--" for unknowable metrics is honest.

**Gaps.**
- **No date range filter** — KPIs default to "All time" but DSAs frequently want "This month", "Last 30 days", "This quarter".
- **"-- → No data yet" for Avg to Sanction** but the "→" arrow is direction-ambiguous; users wonder "trending up or stable?"
- **No per-loan-type breakdown in pipeline view** without scrolling — `₹37.70 Cr in Intake` is a great headline but breakdown lives below the fold.
- **Conversion Rate "--"** could be replaced with "Need first sanction" instead of opaque dashes.

**Severity.** Minor — page is functional, just lacks the date-filter every analytics dashboard needs.

---

#### 6. RM Contacts (`/dashboard/dsa/rm-contacts`)

**Purpose.** Centralized crowdsourced RM database (the AD-04 moat).

**Works well.** Card-based RM directory with: initials avatar, name, designation, lender + city, **"Confirmed by 33 DSAs · Last confirmed 2mo ago"** (the social-proof moat), product specialties chips, action buttons (Call / WhatsApp / Confirm / Edit). City + lender filters. WhatsApp action present where contact info supports it.

**Gaps (these damage the moat).**
- **Test data leaks visible in production-shaped UI** — "Digital DSA" listed as a lender, "xyz bank", "testing" are lender filter options. "Test RM" has 4 DSA confirmations. **Admin needs a sanitization pass before launch.** Risk: a real DSA mistakes "testing" for a real bank and adds a customer to it.
- **Case-duplicated city names** in filter: "Ghaziabad" and "ghaziabad" both present. Data hygiene — normalize on write or at query time.
- **"Confirmed by X DSAs" / "Confirm" button has no tooltip** — first-time DSA doesn't know whether clicking "Confirm" means "this RM is still active in this branch" or "I confirm I've met them" or "I confirm their phone number". This is the central feedback loop of the moat — needs clear copy.
- **Designation field is free-text** — "Senior RM", "Branch Manager", "RM" all coexist. Either enum-constrain or normalize.
- **WhatsApp action inconsistent** across cards — some show it, some don't. Should be an opt-in field on RM record with placeholder explaining "RM hasn't shared WhatsApp number".
- **No "my preferred / favorite" pin** on RMs — DSAs with 5+ contacts will want to pin frequently used ones.
- **No interaction log per RM** — clicking Call doesn't log a record visible to the DSA.

**Severity.** Critical for moat health — the page is excellent in structure but the test-data leaks erode trust the moment they're seen.

---

#### 7. Team Management (`/dashboard/dsa/team`)

**Purpose.** Invite and manage team members.

**Works well.** Clean empty state ("No team members yet. Invite someone to get started!"). Strong upsell copy: *"Free tier: Team members can fill forms and create cases. Upgrade to Pro to unlock results, analytics, file builder, and custom permissions."* Clear value differentiator.

**Gaps.**
- **No inline pricing or "View pricing" link** alongside the upsell — friction to convert.
- **No team-role explanation** for first-timer ("what permissions exist? what does a team member see?")

**Severity.** Minor — page is thin but functional; expand once teams feature lands fully.

---

#### 8. Analytics (`/dashboard/dsa/analytics`)

**Purpose.** Performance score + KPI grid with targets.

**Works well.** Gamified Performance Score (34/100, "Critical"), KPI cards with target comparison, color-coded status badges (Critical / Needs Improvement / Excellent).

**Gaps.**
- **"UNLOCKS LATER / PRO" label in sidebar BUT page is fully accessible** — gating disconnect. Either enforce or rebrand.
- **"Total Sanctioned Amount Target: ₹1K"** — ₹1,000 is a nonsensical target for sanctioned loan amount (HL averages ₹40L+). Either a placeholder that shipped, or a config defaulting to a stub. Audit `target` defaults across all metrics.
- **"Excellent — 0 of 8d (100%)"** for Avg Processing Time when the metric value is "--" (no data) — rewards inactivity. Empty-state should show "—" status, not "Excellent".
- **Performance Score 34/100 = Critical** for a new DSA with 4 cases — should account for tenure ("First 90 days: building up your baseline").

**Severity.** Serious — wrong default targets and misleading "Excellent" states damage credibility on a page meant to drive behavior.

---

#### 9. Billing (`/dashboard/dsa/billing`)

**Purpose.** Subscription management.

**Works well.** 3 plans clearly priced (Basic ₹999 / Pro ₹3,999 / Enterprise ₹9,999), feature lists per plan, "MOST POPULAR" highlight, distinct Subscribe CTAs.

**Gaps (commercial-readiness — Lens 15 territory).**
- **Pricing fence has no teeth.** Account has 43 active cases on no plan; Basic caps at 10 active cases. Either limits aren't enforced, or this dev account is exempt. Real DSAs over-using free tier means lost revenue.
- **"MOST POPULAR" + "BEST VALUE" both prominent on adjacent cards** — competing highlights confuse positioning.
- **No annual pricing option** — Indian DSAs typically prefer annual upfront for tax write-offs.
- **No free trial / "Try Pro for 14 days"** — direct paid funnel only; cuts conversion.
- **No GST disclosure on price** — ₹3,999 inclusive or exclusive of 18%? GST-registered DSAs need to know.
- **Feature lists are 80% identical across plans** — Show what's DIFFERENT (Basic→Pro = Priority support; Pro→Enterprise = Dedicated AM). Strip the duplicate rows.
- **No plan recommendation** — DSA with 43 cases gets shown all three cold; the page should suggest Pro for them.
- **No payment-method preview** (UPI / Card / Net Banking / e-NACH) before Subscribe click.

**Severity.** Critical for revenue — pricing-fence enforcement + plan-recommendation are the two highest-leverage commercial fixes.

---

#### 10. Communication Hub (`/dashboard/dsa/communication`)

**Purpose.** Template-driven outbound communication to customer / RM / source-broker via WhatsApp.

**Works well.** Three audience tabs (Customer 6 / RM 5 / Source / Broker 5), variable interpolation (`{{customer_name}}`, `{{dsa_name}}`, `{{lender_name}}`, etc.), WhatsApp share action prominent. 6 customer templates covering Doc Request / Status Update — Processing / Status Update — Query / Sanctioned / Pending Docs Reminder / Docs Received.

**Gaps.**
- **Templates English-only** — despite 374 i18n keys per locale (en/hi/mr), the customer-facing templates have no Hindi/Marathi variants. Most customers will prefer regional language; this is a missed differentiator.
- **No usage analytics** — "templates used this month: X", which template is most common, which got highest reply rate.
- **No personalization beyond `{{customer_name}}`** — no segment-based templates (first-time buyer vs refinance, etc.).
- **No A/B variant** for template testing.

**Severity.** Serious — communication is the DSA's daily touchpoint; English-only is a real handicap.

---

#### 11. Profile (`/dashboard/dsa/profile`)

**Purpose.** 5-step business profile setup (Business → Pain Points → Goals → Workflow → Modules).

**Works well.** Progressive disclosure, captures meaningful metadata (Firm Name, GSTIN-optional, Years in Business, Team Size 4-bucket, Monthly File Volume 4-bucket, Primary Loan Types multi-select).

**Gaps.**
- **Loan Types list includes Vehicle / Gold / Credit Card / Consumer Durable** — but these aren't in the 6 productized loan types (per CLAUDE.md §1). Either the platform supports them (then update the spec) or remove them from the profile (don't mislead).
- **No personal info section (name, email, mobile, photo)** visible on first tab — should be the entry point.
- **GSTIN is "optional"** — but to receive GST invoices (Lens 2), a DSA needs it. Should be "conditionally required for GST invoices" with explanatory hint.
- **No autosave indicator** on this multi-step wizard.

**Severity.** Minor — the wizard structure is good; copy & loan-type list are the polish items.

---

#### 12. Shared Links (`/dashboard/dsa/shared-links`)

**Purpose.** Manage applicant self-fill form links.

**Works well.** Filter tabs (All / Active / Completed / Expired / Revoked). Empty state with workflow pointer: "Open a case and use 'Share Form with Applicant' to create your first link".

**Gaps.** Thin index page; substantive UX is in the creation/revocation flow elsewhere — not assessed in this session.

**Severity.** Minor.

---

#### 13. Tools (`/dashboard/dsa/tools`)

**Purpose.** 9 calculators + planners.

**Works well.** Clean Calculators (EMI / Eligibility / Affordability / BT / Stamp Duty) + Planners (Part-Payment / Flexible EMI / Combined / Rate Ripple) split. Each tool gets a one-line description.

**Gaps.**
- **Page `<title>` is empty** (DOM `document.title === ''`) — bad SEO/tab UX. Should be "Tools | DigitalDSA".
- **No "Share with customer"** output on individual calculators — opportunity to make the DSA's daily tool also a marketing tool (Lens 8 / 12 connection).
- **No "favorite / recently used"** — DSA who uses EMI Calculator 10×/day should be able to pin it.
- **No usage analytics surfaced to DSA or to admin** — which tools matter most?

**Severity.** Minor — fundamentals are correct, polish items.

---

### UX Maturity Scoring — DSA Dashboard

Each page scored 1–5 across 5 dimensions: **Density** (1 = sparse/overwhelming, 5 = right) · **IA** (find-what-you-need in <2 clicks) · **Empty/Error states** · **Visual hierarchy** · **Copy quality**. Higher = better.

| Page | Density | IA | Empty/Error | Hierarchy | Copy | Total |
| --- | :-: | :-: | :-: | :-: | :-: | :-: |
| Login | 4 | 4 | 4 | 4 | 5 | **21** |
| Home | 3 | 3 | 2 | 3 | 3 | **14** |
| Cases List | 3 | 3 | 4 | 3 | 2 | **15** |
| Case Detail | 4 | 2 | 4 | 2 | 2 | **14** |
| CRM Dashboard | 4 | 4 | 4 | 4 | 3 | **19** |
| RM Contacts | 4 | 4 | 3 | 4 | 2 | **17** |
| Team | 3 | 4 | 5 | 4 | 5 | **21** |
| Analytics | 3 | 4 | 2 | 3 | 2 | **14** |
| Billing | 3 | 4 | 4 | 3 | 2 | **16** |
| Communication | 4 | 4 | 4 | 4 | 4 | **20** |
| Profile | 4 | 4 | 4 | 4 | 3 | **19** |
| Shared Links | 3 | 4 | 5 | 4 | 4 | **20** |
| Tools | 4 | 4 | 5 | 4 | 4 | **21** |

**Headline.** Median 19/25 = **76% UX maturity** across the DSA dashboard. The five pages dragging the median down (Home, Cases List, Case Detail, Analytics, Billing) are also the **five most-used pages**. That's the asymmetric leverage point: fixing those 5 lifts overall DSA experience disproportionately.

### Top-5 DSA-dashboard fixes (if you only fix 5 before launch)

1. **Case label generator** — applicant name + city ("Rajesh K. — Mumbai HL"), not ISO date. Fixes Cases List + Case Detail + Home (3 pages) in one stroke.
2. **`home_loan` enum → "Home Loan" display label** — apply at the boundary (toClientCase mapper), not per-consumer. Single change cleans 3+ pages.
3. **Pricing-fence enforcement + plan recommendation** — block 11th case creation on Basic, suggest Pro at 8th case. Plus add GST disclosure and annual pricing.
4. **Analytics target defaults** — fix the ₹1K sanctioned-amount target, fix the "Excellent on no data" rewards-inactivity bug, fix the "PRO" gating disconnect.
5. **Case Detail header** — add applicant name + mobile in the page header. DSA on a call needs context at a glance.

### Untracked items surfaced during this sweep (for DEVELOPMENT-PLAN.md)

- Date range filter on CRM KPIs
- Bulk actions + sort + list-view toggle on Cases List
- Search-by-mobile/PAN/name (currently case label or ID only)
- Hindi/Marathi variants for communication templates
- Test-data quarantine in RM Contacts (`is_sample`/`is_test` flag honored in DSA UI queries)
- "MOST POPULAR" vs "BEST VALUE" — pick one
- Empty page `<title>` on `/dashboard/dsa/tools`
- Notifications badge count
- Global search in top bar

---

## Lens 5 — Admin Dashboard UX Maturity

**Methodology:** Switched role from RM to admin via `POST /api/set-role`. Walked 8 admin pages.

### Headline takeaways

1. **The admin dashboard is the most "operations-shaped" of the three.** Audit log is detailed (Action Type / Target Type / Lender filters, 2-year retention). Permission toggles are granular. Feature flags exist. This is real ops infrastructure.
2. **But it's policy-centric, not user-centric.** Audit log tracks policy state transitions exhaustively — but admin actions ON USERS (suspend, refund, impersonate, role-grant) are not in the same log. That's a Lens 13 + DPDP compliance gap.
3. **Number reconciliation is broken across pages.** Lender count varies: 288 in admin policies header, 62 in admin policies stat card, 78 in RM Policy Library, 60 in policy-capture dropdown. The system has too many sources of truth for "how many lenders".
4. **PMS shows 0 published policies** despite 78 lenders in the RM-side library. The encode→submit→approve→publish pipeline is not flowing data through to publication state.
5. **Same duplicate-rendering bug appears here** ("🧪AU Small Finance Bank" 4 times) — same root cause as DSA Home's 5-identical-cards bug. Likely a list-key issue in a Svelte `{#each}`.

### Page-by-page observations

#### 1. Admin Dashboard (`/dashboard/admin`)

**Works.** KPI cards (Total 36 / Active 32 / Inactive 4 / Deleted 0 with "180+ days idle" definitions), Quick Actions panel (Upload Policy, Policies, Approvals, RM Profiles, Test Rules, Audit Log, User Mgmt), Testing & QA metrics (20 testable lenders, 40 fixtures, 566 synthetic profiles).

**Gaps.**
- **Duplicate rendering** of test lender names in Quick Test list (same `{#each}` key bug pattern as DSA Home).
- **Two overlapping nav items**: "Testing" and "QA Testing" — distinction unclear.
- **Emojis (🧪 📊 👥)** mixed with serious operational data — pick a visual style.
- **Total Accounts 36** but Users page shows 12 DSA + 10 RM = 22. Where are the other 14? Admin/demo/disabled? Need clear reconciliation.

#### 2. Policy Management (`/dashboard/admin/policies`)

**Works.** 62 lenders listed with type tags, stats panel (Lenders 62 / Products 0 / Variations 0 / Active Rules 2).

**Gaps.**
- **"288 active lenders · 292 artifacts" subheader vs "Lenders 62" stat card** — same page, two different counts.
- **"Products: 0, Variations: 0"** despite 62 lenders — the structured PMS layer has nothing loaded.

#### 3. Upload Policy (`/dashboard/admin/policies/upload`)

**Works.** Clear form (Lender Name, Lender ID, Classification dropdown, Loan Types multi-select, Parsed By, file upload PDF/JPEG/PNG, 10MB cap), CTA "Upload & Create Artifact".

**Gaps.**
- **"Parsed By (Team Member)" is free-text** — should be a dropdown of admin users. Currently anyone can type any name.

#### 4. PMS Policy Review (`/dashboard/admin/policies/pms`)

**Works.** Review queue with status filters (Review queue / Approved / Live / All). Clear purpose statement.

**Gaps.** Thin — content depends on RM submissions flowing in.

#### 5. User Management (`/dashboard/admin/users`)

**Works.** DSA Agents (12) + RM Partners (10) split. Table with Name / Phone / Last Active / Status / Actions. Real user data visible.

**Gaps.**
- **Only "Suspend" action** — no Impersonate (Lens 13 calls this out), no Edit role, no Delete with audit, no Force password reset.
- **"E2E Test Admin", "E2E Test User"** mixed in real user list — no filter to exclude test accounts.
- **PII (full mobile + email) shown in plaintext** — fine for admin-by-design but should be access-controlled by sub-role and the act of viewing should be audit-logged. (Per CLAUDE.md AD-04 + DPDP.)
- **No "last login IP / device"** — for security investigations.
- **No batch select** for bulk suspend/notify.

#### 6. Audit Log (`/dashboard/admin/audit`)

**Works.** Excellent depth. Filters: Actor Name (search), Action Type (16 enumerated values: Version Created / Status Changed / Activated / Superseded / Rule Created / Updated / Lender Created / Updated / Product Created / Variation Created / Geo Scope Created / RM Submission Created / Status Changed / Comment Added / Doc Uploaded), Target Type (8 values: lender / product / variation / geo scope / policy rule / policy version / rm submission / comment), Lender filter. "2-year retention" disclosed.

**Gaps.**
- **Policy-only scope** — admin actions on users (suspend, refund, role grant) aren't logged here. Need a second `admin_user_actions` audit stream OR expand this log's `target_type` enum to include `user`, `payment`, `refund`, `impersonation`, etc.
- **No CSV / JSON export** for compliance reviewers / external audits.
- **"2-year retention"** is policy-wide — but tax events need 6 years (Lens 2), DPDP grievances need longer windows. One-size retention may not satisfy compliance.

#### 7. Registry Health (`/dashboard/admin/policies/registry-health`)

**Works.** PMS Phase 11 lives here (CLAUDE.md confirms). "22 active keys · 0 deprecated · scanned 0 published policies · Last run: 19 May 2026, 11:51 pm · Re-run check button". Status: "All clear — 0/0 policies clean". Sub-tabs: Policy Health / Registry Browser / Changelog.

**Gaps.**
- **"scanned 0 published policies"** — there are 78 lenders in the RM library but ZERO published PMS policies. Either nothing was actually published yet (encode→submit→approve→publish pipeline incomplete) OR Registry Health isn't counting properly. **High-priority diagnostic in Session 3.**

#### 8. Admin Settings (`/dashboard/admin/settings`)

**Works.** Profile (Prashant Bajpai / 9811556664 / prashant@digitaldsa.com / Active / Account Created 17/2/2026 5:30:00 am). Permission toggles (User Mgmt / Rule Authoring / System Settings — all ON). API Key Management (empty). Feature Flags (AI Parsing toggle visible).

**Gaps.**
- **Date format "17/2/2026, 5:30:00 am"** — DD/MM/YYYY (Indian ✓) but "am" lowercase + no zero-padding ("17/2" instead of "17/02"). Inconsistency.
- **No audit-row hint near permission toggles** — when a permission gets flipped, where is that logged? Audit Log doesn't include `admin_permission_changed` in its action-type enum.
- **No 2FA setup** visible — admin account is OTP-only same as DSA. For high-privilege accounts (User Mgmt, Rule Authoring), MFA / hardware-key should be required (Lens 7).

---

### UX Maturity Scoring — Admin Dashboard

| Page | Density | IA | Empty/Error | Hierarchy | Copy | Total |
| --- | :-: | :-: | :-: | :-: | :-: | :-: |
| Admin Dashboard | 3 | 4 | 4 | 3 | 3 | **17** |
| Policies (list) | 3 | 4 | 3 | 3 | 3 | **16** |
| Upload Policy | 4 | 4 | 4 | 4 | 4 | **20** |
| PMS Review | 4 | 4 | 4 | 4 | 4 | **20** |
| Users | 4 | 3 | 3 | 4 | 3 | **17** |
| Audit Log | 5 | 5 | 4 | 5 | 5 | **24** |
| Registry Health | 4 | 4 | 5 | 4 | 4 | **21** |
| Admin Settings | 4 | 4 | 5 | 4 | 4 | **21** |

**Headline.** Median = **20/25 = 80% UX maturity** on admin dashboard. Audit Log is the standout (24/25) — it's the strongest single page across all three dashboards. **The admin dashboard is the most mature of the three roles, which makes sense: operators have been building this for themselves.**

### Top-5 Admin-dashboard fixes (if you only fix 5 before launch)

1. **Build Gap A (admin-proxy structured policy capture)** — see the dedicated Gap A section above. This is the highest-leverage admin build in the whole audit.
2. **Reconcile lender counts across pages** — 288 / 78 / 62 / 60 are all "lenders" with different semantics. Pick a canonical count and surface its definition.
3. **Extend Audit Log scope to user/payment/refund/impersonation actions** — single audit pane covering all admin actions is the compliance and forensics need.
4. **Add Impersonate action to Users table** (with consent gate + audit row) — critical Lens 13 power-admin tooling.
5. **Investigate "0 published policies" in Registry Health** — 78 lenders but 0 published means the publish pipeline is stuck or counting wrong. Diagnostic first, fix second.

### Untracked items surfaced during this sweep (for DEVELOPMENT-PLAN.md)

- Gap A — admin-proxy policy capture wizard
- Lender count reconciliation (288 / 78 / 62 / 60)
- Audit log scope expansion to user/payment/refund actions
- CSV/JSON export for audit log
- 2-year retention granularity (per-action retention windows)
- "0 published policies" diagnostic
- Impersonation action with consent + audit
- Test-account filter on Users page
- "Parsed By" should be admin-user picker, not free-text
- Admin 2FA / MFA for high-privilege accounts
- Duplicate-rendering bug ({#each} key issue) — same root cause as DSA Home; likely a shared component

---

## Lens 4 — RM Dashboard UX Maturity

**Methodology:** Switched role from DSA to RM via `POST /api/set-role` (CSRF-protected, server-validated per `src/routes/api/set-role/+server.ts:30-37`). Same dev account (mobile 9811556664) has all three roles. Walked 13 RM pages with the same snapshot-based methodology as Lens 3.

### Headline takeaways

1. **The RM dashboard is structurally cleaner than the DSA dashboard, but emotionally emptier.** Fewer pages, simpler IA, no clutter — but also no KPI signal on the home page, weaker onboarding nudges, and one outright broken page (Settings).
2. **The Policy Library + Encode Wizard is genuinely good.** 78 lenders visible, classification by type (NBFC/HFC/GOV/PVT/SFB), proactive "SBI verification due in 6 days" nudge with deep link to monthly_renewal flow, 6-step encode wizard with locked context fields ("Set from assignment", "Set from route") and clear AI-pipeline messaging. This is the strongest RM surface and deserves to anchor the rest of the experience.
3. **Test data leaks everywhere again.** "SEC-5 R1 Test Lender A", "Sample GOV Bank / NBFC / PVT Bank", duplicate "LIC Housing Finance" and "State Bank of India" in lender dropdowns. Same pattern Session 1 documented for the DSA RM Contacts page — confirming this is a system-wide admin sanitization gap, not a one-page issue.
4. **`/dashboard/rm/settings` is broken** — shows "Profile not found / Unable to load your profile" when the dev RM is logged in. Either auto-provisioning of RM profile didn't run when role was granted, or the profile look-up has a bug. This is a launch-blocking bug for any RM whose profile isn't pre-seeded by admin.
5. **BOLA guard works.** Navigating to `/dashboard/rm/review/[someone-elses-version-id]` returns a clean 403 page ("You don't have permission to access this dashboard section. Retry / Dashboard home") — security IS working at the route level. Pass 1's claim of 147 BOLA-audited routes appears solid here.
6. **Single-owner concentration risk.** All 78 lender policies show `prashant@digitaldsa.com` as the owner email. In real ops with multiple RMs, this would distribute — but the dev seed data reads as "one person owns the entire PMS knowledge base", which makes the platform appear fragile.

### Page-by-page observations

#### 1. RM Home (`/dashboard/rm`)

**Purpose.** RM landing page.

**Works well.** 9-item sidebar (Dashboard, Cases Received, Communication, Broadcasts, Policies, Submissions, DSA Search, Analytics, Settings) — clean, focused. Empty state with onboarding CTA "Find DSAs Near You".

**Gaps.**
- **Generic greeting "Good evening, there."** when no name set — should fall back to mobile, not "there".
- **No KPIs on home** — RM whose main job is review/policy maintenance should see "0 cases pending review", "2 policies need verification", "X DSAs in your area" at a glance.
- **Single CTA only.** The second core workflow ("Set up your policy") deserves equal prominence.
- **Title inconsistency**: "RM Dashboard - Digital DSA" (space-hyphen-space) vs DSA's " | DigitalDSA". Pick one.
- **"Digital DSA" vs "DigitalDSA"** brand-spelling inconsistency in the welcome copy.

**Severity.** Serious — RM home is the first impression, and it's barren compared to DSA home.

---

#### 2. Cases Received (`/dashboard/rm/cases`)

**Purpose.** RM-side view of cases shared by DSAs.

**Works well.** Stage filter tabs (All / Intake / Profiling / File Building / Submitted / Processing / Query / Sanctioned / Disbursed), clean empty state.

**Gaps.**
- **No counts on filter tabs** — DSA Cases shows "Intake (41)". RM shows just "Intake". Inconsistent.
- **No search box** — RM with 100s of cases will need this.
- **Empty state offers no preview value** — could show a demo case or "Here's what a shared case looks like".

**Severity.** Minor — solid structure, fill in once cases flow.

---

#### 3. Policy Library (`/dashboard/rm/policies`)

**Purpose.** Browse and manage all lender policies.

**Works well.** **The best-designed RM list page.** 78 active lenders, type tags (NBFC/HFC/GOV/PVT/SFB) for at-a-glance classification, **"State Bank of India verification due in 6 days. Verify now →"** proactive nudge with deep link to monthly_renewal flow — exactly the kind of operational polish the rest of the dashboard needs more of.

**Gaps.**
- **All 78 lenders owned by single email `prashant@digitaldsa.com`** — dev seed; reads as single-point-of-failure in real ops.
- **`test-rm-a@sec5r1-test.local` / "SEC-5 R1 Test Lender A"** visible — test data leak.
- **78 lenders, no search box** — Ctrl+F via browser only.
- **No filter by lender type, no sort by verification date** — both useful at this scale.
- **No bulk action (re-verify multiple, archive multiple).**
- **"Verified" badge for every entry** — meaningless if always present; show "Verified 2mo ago" (last-verified date) instead.
- **Silent redirect on missing policy** — navigating to `/dashboard/rm/policies/pnb-housing/home` bounces back to library with `?noPolicy=home` but no visible toast/message ("PNB Housing Finance has no home loan policy yet — set one up?").

**Severity.** Serious — search and last-verified-date are the two highest-leverage fixes for a 78-row page.

---

#### 4. Encode Wizard (`/dashboard/rm/policies/[lender]/[product]/encode`)

**Purpose.** Multi-step policy capture from document → structured.

**Works well.** **Strongest RM page.** 6-step wizard breadcrumb (Document Setup → Clause Review → Encoding Review → Missed Items → Reconciliation → Submit). Context fields locked with explanatory hints ("Lender: Manappuram Finance — Set from assignment", "Loan Product: home — Set from route"). Source type toggle (Paste text / Upload file). Helpful AI-pipeline messaging: "The AI pipeline will normalize terminology, classify clauses, and atomize conditions. This typically takes 20–30 seconds. Your draft is saved automatically."

**Gaps.**
- **`home` raw enum** as Loan Product display — same boundary leak as DSA dashboard. Apply at the mapper, not per-page.
- **"Set from assignment" / "Set from route"** hints are slightly engineering-shaped — "Set automatically based on your RM assignment" reads better.

**Severity.** Minor — this page sets the bar; let it.

---

#### 5. Policy Capture List (`/dashboard/rm/policy-capture`)

**Purpose.** Index of RM's structured-form policy captures (parallel to Encode flow).

**Works well.** Clean empty state with CTA "Create First Capture" and clear explanation ("The form will guide you through every parameter our system needs").

**Gaps.**
- **Two parallel capture flows exist** (Policies → encode wizard, AND policy-capture → form) — unclear to a first-time RM which to use. Needs explicit positioning ("Encode if you have a policy document; structured capture if you don't").

**Severity.** Minor — thin index page, polish later.

---

#### 6. Policy Capture — New (`/dashboard/rm/policy-capture/new`)

**Purpose.** Step 1 of structured policy capture: lender + product picker.

**Works well.** Lender dropdown with ~60 options, type tags inline (NBFC/PVT/GOV).

**Gaps.**
- **Duplicate entries**: "LIC Housing Finance (NBFC)" appears twice, "State Bank of India (GOV)" appears twice — data hygiene bug.
- **"Sample GOV Bank / Sample NBFC / Sample PVT Bank"** in dropdown — test data leaked into production-shaped UI.
- **Native `<select>` only, no autocomplete search** for 60+ options.
- **PNB Housing Finance shown** in the dropdown even though it has no home product yet (see Policy Library noPolicy redirect) — list shows capability potential, not what's already done. Could be clearer.

**Severity.** Serious — duplicates and test data are visible immediately.

---

#### 7. Submissions (`/dashboard/rm/submissions`)

**Purpose.** Policy updates submitted to admin for review.

**Works well.** Six-status filter (All / Submitted / Under Review / Clarification Needed / Accepted / Rejected). Empty state with CTA "Create your first submission". Subtitle clarifies purpose ("Policy updates and changes submitted for admin review").

**Gaps.**
- Nothing major — solid index page.

**Severity.** Minor.

---

#### 8. Broadcasts (`/dashboard/rm/broadcasts`)

**Purpose.** Send updates to connected DSAs.

**Works well.** Clear purpose ("Send updates to all your connected DSAs"). References auto-appended disclaimer (good — AD-11 surfaced).

**Gaps.**
- **No "this broadcast will reach X DSAs" preview.**
- **No template library** (vs DSA's Communication Hub which has 16 templates).
- **No scheduling, no recurring broadcasts.**
- **No open/click metrics** for sent broadcasts (when broadcasts exist).

**Severity.** Serious — broadcast without metrics is a one-way megaphone; RMs will want to know reach.

---

#### 9. Communication (`/dashboard/rm/communication`)

**Purpose.** Inbox of conversations with DSAs.

**Works well.** Inline count "0 conversations with DSA agents", clean empty state with CTA "View Cases".

**Gaps.**
- **Same nav label "Communication" but very different function** from DSA Communication Hub (template library). Naming consistency: either both are "Hub" or one is "Inbox", but not the same name for different things.
- **No filter for unread / starred / by DSA.**

**Severity.** Minor — fix the naming when DSA Communication Hub is renamed.

---

#### 10. DSA Search (`/dashboard/rm/dsa-search`)

**Purpose.** Find DSAs by city.

**Works well.** Single-purpose page with clear instruction ("Enter a city to find DSA agents in that area. You can then connect with them to receive case files").

**Gaps.**
- **Search by city ONLY** — no filter by loan-type focus, by monthly volume, by city-tier, by verified status. RM in a city with no DSAs has zero next step.
- **No "DSAs near you" suggestions** based on RM's branch location.
- **No "trending DSAs" or "recently active"** social-proof affordances.

**Severity.** Serious — DSA acquisition is the RM's primary growth lever; weak search is friction.

---

#### 11. Analytics & Reputation (`/dashboard/rm/analytics`)

**Purpose.** Reputation score + response metrics + DSA feedback trends.

**Works well.** "Reputation score" mechanic is a strong accountability lever (DSAs rate RMs, RMs see their score).

**Gaps.**
- **No preview** of what the score / metrics will look like for a first-time RM — should show example or placeholder cards.
- **No "how is my score calculated" FAQ link.**
- **Title format inconsistency**: "RM Analytics - Digital DSA" (space-hyphen-space) again.

**Severity.** Minor — flesh out once data flows.

---

#### 12. Settings (`/dashboard/rm/settings`) — **BROKEN**

**Purpose.** Manage RM profile.

**State.** Displays heading **"Profile not found / Unable to load your profile. Please try again later."** for the dev RM account.

**Root cause hypothesis.** The dev account has roles `dsa`, `rm`, `admin` all set, but the `rm_profile` collection record was never created for it. Either:
- (a) Auto-provisioning of RM profile is missing when role is granted via `/api/set-role`, OR
- (b) The settings page query targets the wrong collection / wrong key.

Should be investigated in Session 3 alongside Lens 7 (account lifecycle edges).

**Severity.** **Launch-blocking** — any RM whose profile isn't admin-pre-seeded will see this error. First-time RM signup → broken Settings page → high churn risk.

---

#### 13. Review (`/dashboard/rm/review/[version_id]`)

**Tested:** `f53f0ce39aa2ed1c0dd0bf94`.

**Result.** Clean 403 page ("You don't have permission to access this dashboard section. Retry / Dashboard home"). **BOLA guard working** — this RM doesn't own that version_id, server denied appropriately.

**Severity.** No gap — security works.

---

### UX Maturity Scoring — RM Dashboard

| Page | Density | IA | Empty/Error | Hierarchy | Copy | Total |
| --- | :-: | :-: | :-: | :-: | :-: | :-: |
| RM Home | 2 | 4 | 3 | 3 | 3 | **15** |
| Cases Received | 3 | 4 | 4 | 4 | 4 | **19** |
| Policy Library | 4 | 4 | 4 | 4 | 4 | **20** |
| Encode Wizard | 5 | 5 | 5 | 5 | 5 | **25** |
| Policy Capture (list) | 3 | 4 | 5 | 4 | 4 | **20** |
| Policy Capture — New | 3 | 3 | 4 | 4 | 3 | **17** |
| Submissions | 4 | 4 | 5 | 4 | 4 | **21** |
| Broadcasts | 4 | 4 | 4 | 4 | 4 | **20** |
| Communication | 3 | 4 | 4 | 4 | 4 | **19** |
| DSA Search | 2 | 3 | 3 | 3 | 3 | **14** |
| Analytics | 3 | 4 | 3 | 4 | 4 | **18** |
| Settings | 1 | 1 | 1 | 1 | 2 | **6** (broken) |

**Headline.** Excluding broken Settings, median = **19.5/25 = 78% UX maturity** on RM dashboard. The Encode Wizard (25/25) anchors the high end; RM Home (15/25), DSA Search (14/25), and broken Settings (6/25) anchor the low end. **The strongest RM page is the deepest in the IA, the weakest are the landing pages.** That's an attention-allocation problem — first impressions matter most.

### Top-5 RM-dashboard fixes (if you only fix 5 before launch)

1. **Fix the Settings "Profile not found" error.** Auto-provision RM profile on role grant. Launch-blocker.
2. **RM Home KPI cards.** "X cases pending review", "Y policies need verification", "Z DSAs in your area" — turn the empty home into a workspace.
3. **Test data sanitization sweep.** "Sample GOV Bank / NBFC / PVT Bank", "SEC-5 R1 Test Lender A", duplicate "LIC Housing Finance" and "SBI". Admin job; should run before any external RM signs up.
4. **Policy Library search + last-verified-date.** 78 lenders without search = scroll fatigue. "Verified" badge → "Verified 2mo ago" gives meaning.
5. **Broadcasts metrics + DSA-count preview.** "This broadcast will reach 23 DSAs", post-send "12 opened / 4 clicked". A megaphone with no acoustic feedback is useless.

### Untracked items surfaced during this sweep (for DEVELOPMENT-PLAN.md)

- RM profile auto-provisioning on role grant (Settings page bug)
- Single-owner concentration risk (78 lender policies, 1 owner email) — admin should be able to reassign
- Naming consistency: DSA "Communication Hub" vs RM "Communication" (different functions, same label)
- Title-bar format consistency (" | DigitalDSA" vs " - Digital DSA" vs " - RM Dashboard")
- Encode wizard vs Policy Capture: position which to use when
- DSA Search enrichment: filter by loan-type / volume / verified status
- noPolicy silent redirect should surface a toast / inline message
- Filter-tab counts on RM Cases Received
- Lender dropdown deduplication

---

---

## Lens 1 — Admin-proxy workflows (broadened)

**Methodology:** Code-grep across `src/routes/api/admin/`, `src/routes/dashboard/admin/`, and the financial/refund pathways. Asked: for each admin-on-behalf-of scenario the user might call about, can the admin actually do the thing in the platform?

### Scenarios audited

| Scenario | Status | Evidence | Severity |
| --- | --- | --- | --- |
| Admin captures lender policy on behalf of an RM | **Missing (Gap A)** | See Gap A section above | Critical |
| Admin processes a refund for a DSA whose top-up errored | **Missing** | No `razorpay.payments.refund` call anywhere; `/api/billing/` has no refund endpoint; legal `/refund` page says "case-by-case, contact support" | Serious |
| Admin closes a stuck case at DSA's request (DSA on phone, can't access portal) | **Missing as a discrete action** | Case state changes happen via DSA's own dashboard. Admin Users page only has "Suspend". No "open case as DSA → mark dropped" workflow distinct from impersonation. | Serious |
| Admin pre-populates a sample case for a sales demo | **Partial** | `sampleDataSeeder.ts` + `rmSampleDataSeeder.ts` + `is_sample: true` exist (per CLAUDE.md AD-08), but there's no admin UI button "Seed demo cases for sales prospect X". | Minor |
| Admin migrates a DSA's data from another platform (CSV import) | **Missing** | No `/api/admin/import-cases` or similar. No upload-CSV in admin UI. | Serious |
| Admin generates a sanction letter on behalf of an RM | **Missing** | `pdf-lib` is used for File Builder (DSA-side), not for RM-side sanction letters. | Minor |
| Admin re-issues a revoked consent token by request | **Unknown** | No grep hit for "revoked-consent-reissue" or similar. The lead-vault revocation endpoint exists; reverse path doesn't. | Minor |
| Admin impersonation (login as DSA/RM to debug) | **Exists ✅** | `/api/admin/impersonate/start`, `/api/admin/impersonate/exit`, `AdminImpersonationBanner.svelte`, `src/lib/server/adminImpersonation.ts` — properly architected. **But:** not exposed on the User Management table; the only Action button visible is "Suspend". The impersonation feature exists in code but isn't wired into the admin UI at the user-row level. | Serious — capability exists but admin can't invoke it from where they need to. |

### Headline

**The admin dashboard treats users as "things to suspend or not", not as "people you have to help when they're stuck."** Impersonation is built but not surfaced. Refund flow is documented in legal copy but not in code. Stuck-case closure on behalf of DSA isn't a workflow. The user's original framing — "not all RM will be ready to come to our portal" — generalizes: real ops calls require admin acting on behalf of users at many scenarios, not just policy capture.

### Recommended fix order

1. **Surface Impersonation in Users table** — add "Impersonate" action with consent gate + audit row. Code already exists; this is a wire-up.
2. **Build the refund endpoint** — `/api/admin/billing/refund/[transaction_id]` that calls `razorpayClient.payments.refund()`, writes an audit row, fires DSA notification. ~1 day.
3. **Build Gap A** (separate item — see above).
4. **CSV import helper** — admin uploads a CSV of cases, system creates them under a target DSA's account with `provenance.source_type: 'admin_csv_import'`. ~2 days.
5. **"Close case on behalf of DSA"** — could be a button inside impersonation mode, OR a dedicated admin action. The former is simpler.

---

## Lens 2 — Operational & financial systems (CFO lens)

**Methodology:** Read `src/routes/api/billing/*` (subscribe, cancel, da-topup, da-quota, trial-reminder) and `src/routes/api/razorpay/*` (order, verify). Grep'd for GST invoicing, TDS, refund, dunning, e-NACH, reconciliation, commission tracking.

### What works

| Area | Status | Evidence |
| --- | --- | --- |
| Razorpay payment verification | ✅ HMAC signature verify, idempotency via `BillingTransactions.findOne({ razorpay_payment_id })`, server-side amount verification (PB-2) | `src/routes/api/billing/subscribe/+server.ts:66-95` |
| Subscription lifecycle | ✅ Cancel-at-period-end (keeps access until `expires_at` to avoid mid-cycle disablement) | `src/routes/api/billing/cancel/+server.ts:60-72` |
| Trial / renewal reminders | ✅ Cron-protected endpoint, sends 3-day-before email for trial expiring + subscription expiring | `src/routes/api/billing/trial-reminder/+server.ts` |
| DA top-up quota | ✅ HMAC verify + idempotency + atomic quota addition | `src/routes/api/billing/da-topup/+server.ts` |
| Email confirmations | ✅ Cancellation email, renewal-due email | Same files |
| Audit trail for billing | ✅ `BillingTransactions` collection inserts on every state change | Multiple |

### What's missing

| Area | Status | Gap |
| --- | :-: | --- |
| **GST invoice generation** | ❌ Missing | `gstNumber` collected in DSA onboarding (`/api/onboarding/dsa-onboarding/+server.ts:128`) and stored — but no invoice PDF generation pipeline that uses it. Razorpay payment succeeds, DSA gets a "thanks" email, no invoice with GSTIN. **Regulatory: GST-registered DSAs are legally entitled to GST invoices.** |
| **TDS deduction + Form 16A** | ❌ Missing | Zero hits for "TDS", "withholding", "Form 16A" in API routes. If platform ever pays out commissions to DSAs (AD-04 implies it might), TDS at source is required. Even subscription payments by GST-registered DSAs may need TDS deduction on platform-charged amounts in some interpretations. |
| **Programmatic refund endpoint** | ❌ Missing | No `razorpay.payments.refund()` call in codebase. Legal `/refund` page promises 7-day full refund + prorated partial refund "case-by-case via support@digitaldsa.com" — but operationally, the admin has no in-app button. Risk: support team is doing this manually via Razorpay dashboard, no in-platform audit. |
| **Dunning (failed-payment escalation)** | ❌ Missing | `trial-reminder` is the only escalation cron. **No "your payment failed, here's how to update" / "second reminder" / "auto-lockout on day 14" sequence.** Subscription renewal-failure isn't even a tracked state in cancel/subscribe state machine. |
| **e-NACH / e-mandate** | ❌ Missing | Zero hits. Razorpay supports it; not wired. DSAs paying ₹999–₹9,999/month forever click-pay every cycle. |
| **Bank reconciliation** | ❌ Missing | No `/api/billing/reconcile` endpoint. No daily/weekly job comparing `BillingTransactions` against Razorpay settlement reports. |
| **Commission tracking** | ❌ Missing | AD-04 implies "centralized RM database, crowdsourced from all DSAs" but no `/api/commission/`, no `/earnings`, no DSA-side "My Earnings" page. If platform pays commission on disbursed cases (revenue model unclear), tracking is unbuilt. |
| **Tax records retention** | Unknown | Per CLAUDE.md PII-RETENTION-POLICY-SPEC, financial records need 6-year retention. `BillingTransactions` doesn't have an explicit retention floor in `src/lib/server/data3/retentionFloor.ts` that I can see — needs explicit retention-policy enforcement separate from PII cool-down. |

### Headline

**The subscription engine is well-built. The CFO surface around it isn't there yet.** Anyone running a real finance org against this platform would discover within month one that they need GST invoicing, refunds in-product, and dunning workflows — and those are 3–6 weeks of work in aggregate.

### Recommended fix order (within Lens 2)

1. **GST invoice PDF generation** on successful subscribe / topup. `pdf-lib` already in stack. Store in S3-equivalent, email link. ~3 days.
2. **Refund endpoint + admin UI button.** ~1 day.
3. **Dunning state machine** — `payment_failed` → "update payment method" email day-0 → "expires in 3d" day-7 → "expired, downgrade to free" day-14. ~3 days.
4. **e-NACH setup** for recurring subs — Razorpay-supported. ~2 days.
5. **Commission tracking + DSA earnings page** — model + endpoint + UI. ~5 days. (Optional depending on revenue model.)
6. **6-year retention enforcement for `BillingTransactions`** — explicit policy in `retentionFloor.ts`. ~1 day.

---

## Lens 6 — Data portability (DPDP §11 right to access)

**Methodology:** Grep'd for `data-export`, `download-data`, `exportUserData`, `gdpr-export`, `downloadMyData`. Checked routes under `src/routes/api/dsa/`, `src/routes/api/rm/`, `src/routes/api/account/`.

### Findings

| Question | Answer |
| --- | --- |
| Does a DSA have a "Download My Data" button? | **No.** Not in dashboard sweep, not in code. |
| Does an endpoint exist that produces a structured export? | **No.** Zero hits. |
| What about DPDP §11 (right to access) compliance? | **Gap.** §11 mandates that on user request, the platform must provide a copy of all personal data in a structured, commonly-used, machine-readable format. Today: no path. |
| Borrower data export under DPDP §11 (when DSA is the principal)? | **Partially covered via case data, but not exposed as a download.** |

### Recommended fix

- New endpoint `/api/account/data-export` that:
  - Aggregates DSA profile + cases + contacts + payments + communications + lead-vault entries into a single JSON ZIP
  - Excludes PII fields that violate other users' privacy (e.g., applicant PII the DSA collected) per case-by-case consent
  - Rate-limited (1 per 30 days)
  - Emails the DSA a download link valid for 7 days
- UI: "Download my data" link in DSA profile → settings → DPDP rights section
- Effort: 3–5 days

**Severity. Compliance risk** — if a DPDP §11 request comes in formally and the platform can't fulfil, that's a regulator-visible incident.

---

## Lens 7 — Account lifecycle edges

| Edge | Status | Evidence / Gap |
| --- | --- | --- |
| Account recovery if mobile lost | ❌ Missing | `/api/auth/restore-account` exists but it's account-restoration after delete, not mobile-lost recovery. No alternate-channel verification (email-confirm + last-known-device + 30-day waiting period). |
| 2FA for sensitive actions | ❌ Missing | OTP login only. Suspend/refund/role-grant/payout/GST-mod don't gate behind a second factor. **Admin accounts with full system access are OTP-only, same as DSAs.** |
| Session management (see/revoke devices) | ❌ Missing | No "Active Sessions" UI. JWT refresh cookies issued, but no `/api/sessions/list` or `/api/sessions/revoke`. Stolen device = open session until JWT expires. |
| DSA / RM account deletion under DPDP §13 | ✅ Partial | `/api/auth/delete-account/+server.ts` exists. Borrower data erasure also covered via DATA-1/DATA-2 (Pass 1). Need to verify DSA's own data follows the same cool-down windows. |
| Account transfer (DSA retires, hands account to successor) | ❌ Missing | No `/api/account/transfer` or admin action. User who built up 3 years of case history cannot legally hand to successor; they must keep account or lose it. |
| Admin impersonation with consent + audit | ✅ Exists | `/api/admin/impersonate/start` + `/api/admin/impersonate/exit` + `AdminImpersonationBanner.svelte`. **But not surfaced in admin UI** (per Lens 1) — admins can't invoke it from the Users table. |

### Recommended fix order

1. **Wire Impersonation into Users table** (already coded, missing UI button). ~half day.
2. **2FA for admin role** specifically (User Mgmt / Rule Authoring / System Settings permissions). TOTP via authenticator app. ~3 days.
3. **Active Sessions UI + revoke endpoint.** ~2 days.
4. **Account recovery flow** with email-confirm + last-device + 30-day waiting period. ~5 days. (Lower urgency since OTP via mobile is the canonical recovery — but mobile-lost-permanently is a real scenario.)
5. **Account transfer** — admin-mediated workflow. Lower urgency unless customer asks. ~3 days.

---

## Lens 8 — Integration ecosystem

| Integration | Status | Evidence |
| --- | :-: | --- |
| Outbound webhooks (case_created, case_disbursed, payment_received) | ❌ Missing | No `/api/webhooks/` directory. No webhook delivery code anywhere. |
| Public partner API (Tally, Zoho, Excel read DSA case data programmatically) | ❌ Missing | No `/api/partner/` or `/api/v1/public/`. API keys mentioned in admin Settings but no public-API consumer route. |
| Embeddable calculator widgets (DSA puts EMI calc on their website) | ❌ Missing | Tools live behind `/dashboard/dsa/tools/*` — auth-gated. No public `/embed/calculator/emi` route. |
| RBI Account Aggregator (AA) integration for income via bank statements | ❌ Missing | Zero hits. |
| CIBIL / bureau credit pull | ❌ Missing | "cibil" hits in 200+ files but all refer to CIBIL score (the field DSAs ask applicants to provide). No outbound bureau API call. |
| NSDL PAN verification / UIDAI Aadhaar / DigiLocker | ❌ Missing | Zero hits. |
| WhatsApp Business API | Partial | DSA Communication Hub has WhatsApp "share via wa.me link" pattern (per Lens 3). Not the Business API for inbound/outbound automation. |
| Email service hardening (SES/SendGrid/Resend) | Partial | Per CLAUDE.md PB-8, on Nodemailer SMTP; replacement planned. |

### Headline

**Zero outbound integration surface.** Every integration must be added later — but waiting until customer asks "can I pipe my cases into Tally" means saying no to a deal. Build webhooks + a minimal public read-API on the next pricing-tier upgrade.

### Recommended fix order

1. **Outbound webhooks** — `case_created`, `case_stage_changed`, `case_disbursed`, `payment_received`, `policy_published`. Admin UI to register webhook URLs per DSA/RM/global. ~5 days.
2. **Public read-API** — `/api/v1/public/cases` (DSA's own cases), API key auth via admin Settings. ~5 days.
3. **DigiLocker integration** for customer document upload — high signal because it removes manual file collection. ~10 days.
4. **Account Aggregator (AA)** for income verification — high-leverage but complex; needs RBI registration. Track as a quarter-scale item.
5. **CIBIL pull** — regulated under RBI Credit Information Companies Act; needs licensing path. Track as separate workstream.

---

## Lens 9 — Power-user workflows

Already partially covered in Lens 3 + Lens 4 observations. Summary:

| Power-user feature | Status |
| --- | :-: |
| Bulk operations (select N cases → action) | ❌ Missing (DSA + RM + Admin) |
| Saved searches / saved filters | ❌ Missing |
| Custom tags / labels on cases | ❌ Missing (only stage badge) |
| Global search (mobile / PAN / case ID / label) | ❌ Missing — DSA Cases search is "case label or ID" only |
| Keyboard shortcuts (j/k navigation, esc, /-search) | ❌ Missing (no `data-keymap` attributes found) |
| Drag-drop (file upload, lender priority reorder) | Unknown |
| Clone case to new lender | Unknown — not surfaced in Cases list |
| Print-friendly views | Unknown |
| Export to PDF / CSV / Excel | Partial (File Builder produces PDF, but no list-view CSV export) |
| Multi-tab safety (two tabs on same case) | Unknown |

**Severity.** Minor across the board for early customers; serious for any DSA growing past 50 cases.

---

## Lens 10 — Localization depth

**Methodology:** Direct observation across Lens 3 + Lens 4 + grep for currency / date formatting.

| Aspect | Status |
| --- | --- |
| 3 locales (en/hi/mr) declared | ✅ 374 keys per CLAUDE.md §14 |
| Language toggle visible on dashboards | ✅ Top bar |
| **Dashboards translated** | ❓ Untested in this session — toggle works but didn't verify if menu/page labels actually switch. Need a Hindi-toggle pass. |
| Indian number formatting (₹12.3L / ₹1.5Cr) | ✅ Per CLAUDE.md `formatCurrency()` helper |
| Dates DD/MM/YYYY | Partial — Admin Settings shows "17/2/2026, 5:30:00 am" (DD/MM/YYYY ✓ but no zero-padding); Case Detail shows "6 May" vs "6 May 2026" inconsistencies |
| +91-aware phone input | ✅ MSG91 widget handles |
| Communication templates Hindi/Marathi | ❌ Missing (Lens 3 — English-only) |
| Devanagari mobile rendering | Untested |
| RTL readiness | Not applicable (no Arabic/Urdu in scope) |

### Recommended fix

1. Hindi-toggle dashboard sweep — verify menu, sidebar, button labels, error messages all switch.
2. Communication template Hindi/Marathi variants — highest customer-facing impact.
3. Date formatting consistency: pick one format (DD MMM YYYY recommended for Indian context), apply via shared `formatDate()` helper.

---

## Lens 11 — Customer success surface

| Element | Status |
| --- | --- |
| In-app contextual help / tooltips | Partial — "Guide" button in top bar; coverage unknown |
| Hosted knowledge base | ❌ Missing — no `/help`, `/kb`, `/docs` route |
| Chat widget (Intercom / Crisp) | Untested — no script tags grep'd |
| Video tutorials embedded in onboarding | Partial — `walkthrough/explanatoryTour.ts` exists |
| Community forum | ❌ Missing |
| Status page (status.digitaldsa.com) | ❌ Not visible |
| Email auto-responder ("we'll respond in X hours") | Unknown |
| Self-serve troubleshooting paths | ❌ Missing |

### Headline

**"What does a DSA do at 11pm when their case isn't loading and your support team is offline?"** Answer today: nothing in-product. They wait, frustrated, until morning. Lowest-cost fix: in-product KB articles + a contact form with auto-responder SLA. Higher-cost: chat widget + status page.

---

## Lens 12 — Sales & growth surface

| Element | Status |
| --- | --- |
| Referral codes (DSA-acquires-DSA) | ❌ Missing — zero grep hits for `referral_code` / `invite_code` outside team-invite which is intra-org |
| UTM / campaign tracking | ❌ Missing — `utm_source` / `campaign_id` not in code |
| Free-trial vs paid funnel | Partial — `subscription.status: 'trial'` exists in DB schema, trial-reminder endpoint sends 3-day email. But no "Start free trial" CTA seen in Lens 3 Billing page. Trial onboarding flow unclear. |
| Landing pages (per campaign) | ❌ Missing — no `(landing)` directory |
| Embeddable widgets | ❌ Missing |
| Public anonymous eligibility check (lead capture) | ❌ Missing — Tools are auth-gated |
| Newsletter / blog / SEO content | Unknown |
| Team-invite flow (intra-org) | ✅ Exists |

### Headline

**The platform has a paid-funnel-only stance.** Demo Dashboard CTA on login is the closest thing to lead capture; everything else requires a mobile-OTP signup. Self-serve growth loops (referral, embeddable, anonymous eligibility-check-then-signup) all missing.

---

## Lens 13 — Power-admin tooling

| Tool | Status |
| --- | :-: |
| Impersonation (with consent + audit) | ✅ Exists, NOT surfaced in admin UI |
| Audit log of admin actions on users | ❌ Missing — Audit Log is policy-only (Lens 5) |
| Cross-DSA support search | Partial — admin Users page has search by name; no global search by mobile/PAN/case-id |
| Bulk operations (admin) — suspend N, notify N, mark policies stale | ❌ Missing |
| Bulk lender policy CSV import | ❌ Missing |
| System health dashboard (rate-limit hits per IP, OTP failure rates, ETL run times, queue depths) | ❌ Missing — Sentry + OTel (per Pass 1) collect this but no in-product admin dashboard view |

### Recommended fix

1. Surface Impersonation in Users table (already coded; just wire-up).
2. Expand Audit Log scope to user/payment/refund/role-grant.
3. Admin system-health page reading from OTel/Sentry — even a basic single-page dashboard.

---

## Lens 14 — PMS Phase 9–11 + untracked PMS work

| Phase | Status | Evidence |
| --- | :-: | --- |
| Phase 9 — DSA suggestion flow (DSA spots outdated field → submits suggestion) | ✅ Exists | `/api/pms/suggestions/+server.ts` + `[id]/+server.ts`. GET lists pending; POST submits. Per-DSA-per-field 30-day TTL dedup index. RM-visible filtering on `lenderId` + `loanProduct`. |
| Phase 11 — Form key lifecycle management | ✅ Exists | `src/lib/config/pms/keyRegistry.ts` + `src/lib/config/pms/registryChangelog.ts` + `/dashboard/admin/policies/registry-health` page (verified live in Lens 5: "22 active keys · 0 deprecated") |
| 0 published policies in Registry Health | ⚠️ Diagnostic needed | Lens 5 surfaced "scanned 0 published policies" despite 78 lenders. Means publish pipeline isn't flowing OR the counter is broken. **High-priority investigation, separate from this audit.** |
| Phase 10 — page map | Unknown | Didn't drill in this session |

---

## Lens 15 — Commercial readiness (my addition)

| Dimension | Status |
| --- | --- |
| Pricing page coherence | ⚠️ Lens 3 surfaced gaps: competing badges, no annual, no GST disclosure, no trial CTA, no plan recommendation |
| Pricing-fence enforcement | ❌ Broken (43 cases on no-plan account; Basic caps at 10) |
| Onboarding-to-first-value time | Untested — but the 5-step Business Profile wizard (Lens 3) is a long pre-value gate |
| DSA acquisition funnel signals | ❌ Missing — no UTM, no referral, no public eligibility-check, no embeddable widgets (Lens 12) |
| Retention / churn surface | ❌ Missing — no exit survey on cancel, no win-back email sequence post-cancellation |
| NPS capture | ❌ Missing — no `nps_score` collection |
| Win/loss reasons on cases (lost-to-which-lender, why) | ⚠️ Cases have stage "Dropped" but no required "drop reason" enum |
| Competitive differentiation messaging in-product | Partial — "MOST POPULAR" tag and "Free tier: upgrade to Pro to unlock..." copy exist; not systematic |
| Product-led-growth (PLG) hooks (in-product upsell triggers) | Partial — "UNLOCKS LATER / PRO" labels exist; not systematically wired to actual gating |

### Headline

**The product has a sales motion but not a marketing motion.** Once a DSA signs up via mobile-OTP, the in-product experience pushes them toward Pro/Enterprise via copy and gating labels. But the pre-signup top-of-funnel (referral, UTM tracking, public eligibility-check-as-lead-capture, embeddable widgets, blog/SEO) is unbuilt. **Today the platform grows by direct sales + word of mouth only.**

### Recommended fix order (Lens 15 specifically)

1. **Referral codes** — every DSA gets a unique `?ref=<code>` link; both inviter and invitee get a credit on signup. ~3 days. Highest-leverage growth lever.
2. **Public anonymous eligibility checker** at `/check-eligibility` — fills mobile + loan amount + city, sees "you'd qualify for ₹X at Y banks", prompted to sign up to see specifics. ~5 days.
3. **UTM tracking + per-campaign landing pages** — `(landing)` directory with template + URL-param capture. ~3 days.
4. **Drop reason on case "Dropped" stage** — required enum (`applicant_dropped`, `lender_rejected`, `competitor_won`, `qualification_failed`, etc.) for win/loss intelligence. ~1 day.
5. **NPS capture** — one survey at day 30 + day 180. Simple, high signal. ~1 day.
6. **Exit-cancellation survey** — when DSA hits Cancel, ask why. Optional, not gating. ~half day.

---

## Follow-up drills (handoff §8)

| # | Item | Status |
| --- | --- | --- |
| 1 | Queries / Communicate disabled tabs in DSA case detail | Confirmed disabled. Per CLAUDE.md SESSION-HANDOFF §8, data models exist (`lender_applications[].queries[]` and `CommunicationThreads`); the gap is purely UI. No in-flight branch found; this is straightforward to ship in a sprint. |
| 2 | Notifications — only 2 triggers wired | Confirmed via `src/lib/server/notifications.ts` import in billing/cancel — but didn't enumerate the 2. Should ship at minimum: case_stage_changed, case_disbursed, payment_succeeded, payment_failed, subscription_expiring, lender_policy_changed, RM_suggestion_received, RM_broadcast_received. |
| 3 | Web Push — UI exists, no delivery code | `/api/notifications/subscribe/+server.ts` exists (likely the subscribe endpoint) — but actual push delivery code (VAPID server-key, web-push library calls) not confirmed in this session. Needs a 30-min drill in a follow-up. |
| 4 | SMS hub never wired | MSG91 used only for OTP. No `sendSms()` helper for transactional notifications (case-update SMS, etc.). MSG91 DLT approval is the regulatory dependency; on platform side, the wiring is a 1-day task once DLT lands. |
| 5 | 8-layer anti-scraping gated `dev === false` | Pass 1 documented; not re-verified this session. CLAUDE.md AD-14 lists the 8 layers; their fire-only-in-prod gating should be confirmed via a single-line grep in a follow-up. |
| 6 | Sample data `is_sample: true` audit | CLAUDE.md AD-08 confirms 4 demo cases pre-loaded. **Not verified that every audit/compliance query honors `is_sample` exclusion.** Risk: demo cases counted in a compliance report. |
| 7 | Razorpay subscription edge cases (card expiry, grace, dunning) | **Confirmed not handled** (Lens 2 — no dunning state machine). Card-expiry detection requires Razorpay webhook listener (not built). |
| 8 | `engines.node` pin | ✅ `"22.x"` specific major. Per CLAUDE.md Pitfall #7, correct. |
| 9 | Capacitor APK build status | `android/app/src/main/AndroidManifest.xml` exists — Capacitor scaffolded. Whether a recent APK builds end-to-end was not tested this session; needs a `pnpm build && npx cap sync android && cd android && ./gradlew assembleDebug` smoke. |
| 10 | Vercel preview branches separate from prod | Not investigated this session. Should be in `vercel.json` if separated; `.env.production` vs `.env.preview` discipline matters for Atlas-cluster separation. |

---

## Executive Summary

After three sessions of audit covering 50+ pages, 15 lenses, and follow-up drills, the picture compresses to seven headlines.

1. **The product is real and the bones are solid.** Form engine, rule engine, PMS encode wizard, audit log, BOLA guards, immutable case snapshots, CSFLE encryption — all working. This is not a v0.2 demo; it's a functional v0.8 platform handling real cases.
2. **Gap A — admin-proxy policy capture — is confirmed missing and is the single highest-leverage admin build.** Without it, lender coverage is bottlenecked by RM self-onboarding willingness. PSU / small-NBFC / old-school RMs will never come to the portal.
3. **Gap B — dashboard UX maturity — is real but uneven.** Median 76% (DSA) / 78% (RM) / 80% (Admin) — but the gap to "Razorpay-class" is in the polish layer: case labels are ISO dates not applicant names, raw enums leak everywhere, test data is visible in production-shaped UI, pricing fence has no teeth.
4. **The CFO surface is the most under-built layer.** Subscription engine works; GST invoicing, TDS, programmatic refund, dunning, e-NACH, reconciliation, commission tracking are all missing. This will hurt the moment finance ops touches the system in earnest.
5. **The growth surface is engineering-shaped, not marketing-shaped.** No referral, no UTM, no embeddable widgets, no public eligibility check, no NPS, no exit survey. Today the platform grows by direct sales + word of mouth.
6. **The compliance surface has known gaps but no firefighting incidents yet.** DPDP §11 (data portability) not implemented. 2FA for high-privilege admins missing. Tax-records 6-year retention not explicitly enforced. Refund flow promised in legal copy but not in code. Audit log strong on policy state, silent on user/payment state.
7. **One launch-blocking bug surfaced this audit:** `/dashboard/rm/settings` shows "Profile not found" for any RM whose profile isn't pre-seeded by admin. Auto-provisioning missing on `/api/set-role` role grant.

---

## Recommended Fix Priority

### If you fix 3 things before launch
1. **Fix the RM Settings "Profile not found" bug.** Launch-blocking for any self-onboard RM.
2. **Build Gap A — admin-proxy policy capture.** Unlocks PSU / small-NBFC / paper-based-RM segments. ~3–5 days.
3. **Case-label generator** — applicant name + city instead of ISO date. Single change cleans 3+ pages of the DSA dashboard.

### If you fix 5 things before launch (add to above)
4. **GST invoice PDF generation** on subscribe / topup — regulatory + reputational.
5. **Pricing-fence enforcement + plan recommendation** — block 11th case on Basic, suggest Pro at 8th case; add annual pricing + GST disclosure.

### If you fix 10 things before launch (add to above)
6. **Sanitize test data across collections** — "Sample GOV Bank", "SEC-5 R1 test", "E2E Test User" all need quarantine.
7. **Surface Impersonation in admin Users table** (code exists, wire-up only) + add 2FA for admins.
8. **Programmatic refund endpoint + admin UI button.**
9. **Reconcile lender counts across pages** (288 / 78 / 62 / 60 / 0-published) — pick a canonical source.
10. **DPDP §11 data-export endpoint** — compliance hygiene.

### If you have 20 days of polish before launch (add to above)
11. Communication template Hindi/Marathi variants
12. Dunning state machine for failed subscription renewals
13. Date format consistency (one `formatDate()` helper everywhere)
14. Notifications: ship the 5–8 missing triggers (case_stage_changed, case_disbursed, payment_succeeded, payment_failed, subscription_expiring, lender_policy_changed, RM_suggestion_received, RM_broadcast_received)
15. Referral codes for DSA-acquires-DSA growth
16. Public anonymous eligibility checker at `/check-eligibility` for lead capture
17. Drop-reason enum on Cases "Dropped" stage
18. Global search in top bar (mobile / PAN / case ID / label)
19. Bulk operations on Cases list (select N → action)
20. Investigate "0 published policies" in Registry Health — diagnostic first, then fix

---

## Out of Scope (and why)

The following were deliberately NOT investigated in this audit:

- **Performance benchmarking** — Pass 1 noted PERF-1, 4, 5 done and PERF-3 awaiting closure flip. No load testing this session.
- **Security pen-test depth** — Pass 1 covered SEC-2/4/5 (CSFLE, rate limiting, BOLA) and the 147-route BOLA audit. This pass spot-confirmed BOLA via the 403 on cross-RM review version, but no comprehensive security regression.
- **Mobile (Capacitor) APK build verification** — Android folder exists; whether a fresh build assembles end-to-end was not tested. Needs a separate 1-hour smoke.
- **Vercel deployment environment separation** — `vercel.json` and `.env.preview` vs `.env.production` discipline not audited.
- **The 8-layer anti-scraping** — Pass 1 documented the architecture; this pass didn't re-verify the `dev === false` gating.
- **Sentry / OpenTelemetry redaction completeness** — Pass 1 documented; not re-audited.
- **i18n Hindi/Marathi dashboard rendering quality** — Noted as gap (Lens 10) but no actual Hindi-toggle sweep performed.
- **Specific PMS Phase 10 (page map)** — Phase 9 + 11 verified; Phase 10 not drilled.
- **Notification trigger enumeration** — confirmed only 2 wired (per handoff §8); did not enumerate which 2 in this session.
- **End-to-end live test of the encode wizard** — UI structure confirmed at Step 1 (Document Setup); steps 2–6 not walked. Recommend a follow-up session paste-in of a real policy document to exercise the full pipeline.

These should be picked up either by dedicated sub-audits or as part of pre-launch QA, depending on risk appetite.

---

## Cross-reference to existing roadmap

Many findings here align with items already in `docs/ARCHITECTURE-EVOLUTION.md` or `docs/DEVELOPMENT-PLAN.md`. Where they don't, they should be appended. Specifically untracked items surfaced by this audit that need to enter the roadmap:

- Gap A (admin-proxy policy capture wizard)
- Pricing-fence enforcement
- Case-label generator overhaul
- Lender count reconciliation
- Audit Log scope expansion (user / payment / refund / role-grant)
- RM Settings auto-provisioning fix
- GST invoice generation
- Programmatic refund endpoint
- DPDP §11 data-export endpoint
- 2FA for admin role
- Sessions UI + revoke
- Referral codes
- Public anonymous eligibility check
- Drop-reason enum on Cases
- NPS capture
- Hindi/Marathi communication template variants
- Notifications: 5–8 additional triggers
- Outbound webhooks
- Public read-API
- DigiLocker / AA / CIBIL / NSDL / UIDAI integrations (workstream)

---

*End of Pass 2 findings.*
