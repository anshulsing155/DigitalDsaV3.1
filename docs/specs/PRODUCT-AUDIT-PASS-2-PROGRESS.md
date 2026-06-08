# Product Audit — Pass 2 Progress Tracker (Path B, multi-session)

> **Path B chosen:** Multi-session audit. Each session takes a slice, writes findings to `PRODUCT-AUDIT-PASS-2-FINDINGS-2026-05-19.md`, then updates this progress doc with the resume point for the next session.
> **Created:** 2026-05-19
> **Updated:** 2026-05-19 (end of Session 1)

---

## Session log

| # | Date | Scope | Status |
| --- | --- | --- | --- |
| 1 | 2026-05-19 | Phase 1 (setup) + Lens 3 (DSA dashboard sweep, 13 pages) | ✅ Complete |
| 2 | 2026-05-19 | Lens 4 (RM sweep, 13 pages) + Lens 5 (Admin sweep, 8 pages) + Gap A confirmation | ✅ Complete |
| 3 | 2026-05-20 | Lenses 1, 2, 6–15 (non-UI lenses) + follow-up drills + synthesis | ✅ Complete |

---

## AUDIT COMPLETE

All three sessions delivered. Findings doc is the authoritative deliverable:
- `docs/specs/PRODUCT-AUDIT-PASS-2-FINDINGS-2026-05-19.md`

This progress doc remains useful only as a historical record of the multi-session methodology. No further sessions planned unless the user reopens specific lenses for deeper drill.

---

## Session 1 — what got done

- ✅ Started dev server (port 5183, server name `dev`)
- ✅ Verified dev login works: mobile `9811556664`, OTP `9811`, role-picker offers Admin/DSA/RM
- ✅ Created findings doc: `docs/specs/PRODUCT-AUDIT-PASS-2-FINDINGS-2026-05-19.md`
- ✅ Logged in as DSA, swept 13 pages: Login → Home → Cases → Case Detail → CRM → RM Contacts → Team → Analytics → Billing → Communication → Profile → Shared Links → Tools
- ✅ Wrote Lens 3 into findings doc: page-by-page observations, UX maturity scoring table, top-5 priority fixes, untracked-items list

---

## Session 1 — key headlines (so Sessions 2/3 don't re-derive)

1. The DSA dashboard reads as **v0.8 internal tool, not Razorpay-class commercial product.** Bones solid; polish gaps everywhere.
2. **Case labels are raw ISO dates** instead of applicant names — single biggest UX bug, visible 3+ places.
3. **`home_loan` raw enum** leaks into the UI everywhere — fix at the boundary (CLAUDE.md §16 rule 11).
4. **Pricing fence has no teeth** — 43 active cases on a no-plan account where Basic caps at 10.
5. **Test data is visible in production-shaped UI** — "Digital DSA" as a lender, "xyz bank", "Test RM with 4 confirmations". Admin sanitization gap.
6. **Communication templates English-only** despite 374 i18n keys/locale. Localization depth gap (also Lens 10).
7. **"PRO" gating disconnect** — Analytics labeled "UNLOCKS LATER / PRO" in sidebar but fully accessible.

Sessions 2/3 should look for the same classes of issue in their scope.

---

## Session 2 — what got done

- ✅ Switched DSA → RM via `POST /api/set-role` (CSRF-protected; server validates role per `src/routes/api/set-role/+server.ts`)
- ✅ Swept 13 RM pages: Home / Cases Received / Policy Library / Encode Wizard / Policy Capture (list + new) / Submissions / Broadcasts / Communication / DSA Search / Analytics / Settings (broken) / Review (BOLA 403 confirms guard works)
- ✅ Switched RM → Admin via `/api/set-role` again
- ✅ Swept 8 admin pages: Home / Policies / Upload Policy / PMS Review / Users / Audit Log / Registry Health / Admin Settings
- ✅ Wrote Lens 4 (RM sweep) into findings doc with per-page observations, UX maturity scoring (median 78%), top-5 fixes
- ✅ Wrote Lens 5 (Admin sweep) into findings doc with same structure (median 80% — strongest of three roles, anchored by Audit Log scoring 24/25)
- ✅ **Confirmed Gap A is missing.** Listed all 11 admin/policies routes, confirmed none of them is a structured 25-field admin-proxy capture wizard. Wrote a precise spec for the new route in the Gap A section (route name, UX, provenance tagging, server validation, effort estimate).

## Session 2 — key headlines (so Session 3 doesn't re-derive)

1. **Gap A definitively missing.** Confirmed empirically. Spec written in findings doc's Gap A section. Admin can upload policy PDFs (AI-parse), can review RM submissions, can edit JSON — but cannot do structured 25-field capture-on-behalf-of-RM. ~3–5 dev days to build.
2. **RM Settings page broken** — "Profile not found / Unable to load your profile" for any RM without admin-pre-seeded profile. Auto-provisioning missing. Launch-blocking for self-onboard RMs.
3. **BOLA security works.** `/dashboard/rm/review/[someone-elses-version-id]` returns clean 403 page. Pass 1's claim of 147 BOLA-audited routes holds up.
4. **Lender count reconciliation broken** across pages: 288 / 78 / 62 / 60 / 0-published. Pick a canonical source and surface its definition.
5. **Audit Log is the strongest single page across all three dashboards** (24/25). But scope is policy-only — admin actions on users (suspend, impersonate, refund) need to join the same log.
6. **Test data leaks systemic, not page-specific.** Confirmed pattern: "Sample GOV Bank", "SEC-5 R1 Test Lender A", "E2E Test User" appearing across RM and Admin surfaces. Admin sanitization is one task spanning multiple collections.
7. **Encode wizard (RM) sets the bar** at 25/25 — the rest of RM dashboard could be brought to that level by applying its design language (6-step breadcrumb, locked context fields with explanatory hints, AI-pipeline progress messaging).
8. **"0 published PMS policies"** despite 78 lenders — either the publish pipeline is stuck or Registry Health counts incorrectly. Needs diagnostic.

Combined UX maturity medians across all three roles:

| Role | Median Score | Notable Outlier |
| --- | :-: | :-: |
| DSA | 76% (19/25) | Login = 21/25 (best) |
| RM | 78% (19.5/25) | Encode Wizard = 25/25, Settings = 6/25 (broken) |
| Admin | 80% (20/25) | Audit Log = 24/25 (best single page in audit) |

Translation: **admin tools are most mature, RM workflows have the standout page but inconsistent floor, DSA dashboard has the most surface area but the most polish gaps.** Suggests the team has been building outward from operations, which is normal for early-stage but means the customer-facing surface needs disproportionate Session 3 attention.

---

## Session 3 — resume here

### Setup
- Dev server: `preview_start name=dev` (port 5183). Should reuse existing server if still running.
- Login is already established via cookies if the same browser session persists. If logged out: mobile `9811556664`, OTP `9811`, pick **RM Partner Dashboard** at the role picker.
- Alternative role switch (without re-login): `POST /api/set-role` with `{ role: 'rm' }` — `secureFetch` required for CSRF.

### Pages to sweep (RM role) — same observation methodology as Session 1

In this order:
1. `/dashboard/rm` (home)
2. `/dashboard/rm/cases` + drill into 1-2 cases
3. `/dashboard/rm/policies` + drill into `/policies/[lenderId]/[product]/encode` (the wizard) + `/policies/[lenderId]/[product]/delta` + `/policies/[lenderId]/[product]/edit` + `/policies/[lenderId]/[product]/suggestions`
4. `/dashboard/rm/policy-capture` + `/policy-capture/new` + `/policy-capture/[capture_id]`
5. `/dashboard/rm/review/[version_id]` (pick any version_id)
6. `/dashboard/rm/submissions` + `/submissions/new` + `/submissions/[submission_id]`
7. `/dashboard/rm/broadcasts`
8. `/dashboard/rm/communication`
9. `/dashboard/rm/dsa-search`
10. `/dashboard/rm/analytics`
11. `/dashboard/rm/settings`

### Then switch to Admin role and sweep:
1. Use role-switcher button "Admin" in top bar.
2. Walk all `/dashboard/admin/*` pages — specifically hunt for:
   - **Gap A confirmation: is there an "admin captures policy on behalf of RM" entry point?** Look at `/dashboard/admin/policies/` and any "capture-from-paper" or "manual-entry" sub-route.
   - PMS approval flow clarity
   - User-management screens (find/impersonate/modify DSA or RM)
   - Audit log queryability

### Findings doc — append into these sections (already stubbed):
- **Lens 4 — RM Dashboard UX Maturity** (mirror Lens 3 structure: per-page observations, scoring table, top-5 fixes, untracked items)
- **Lens 5 — Admin Dashboard UX Maturity** (same structure)
- **Gap A section** — confirmation or denial, with file paths to where admin-proxy capture would need to live if missing

### Time budget
- ~60 min for RM sweep (10 pages × 5 min average)
- ~45 min for Admin sweep
- ~15 min appending findings
- **Total: ~2 hours for Session 2**

---

## Session 3 — resume here (after Session 2)

### Non-UI lenses
Audit by code-grep + spec-read (not by clicking through UI). Each lens needs:
- "Does the feature exist?" — grep / read code
- "If yes, is it complete?" — what's the gap?
- "If no, what's the simplest sufficient build?"

Order suggestion (highest leverage first):
1. **Lens 2 — Operational & financial (CFO lens)**: GST invoicing, TDS, refunds, dunning, e-NACH, reconciliation, commission tracking, 6-yr retention. Start at `src/lib/server/billing/` + `src/routes/api/billing/` + `src/lib/server/razorpay/`.
2. **Lens 1 — Admin-proxy workflows (broadened)**: refund processing, stuck-case closure, demo-case pre-population, CSV migration, sanction letter on behalf of RM. Start at `src/routes/dashboard/admin/`.
3. **Lens 6 — Data portability (DPDP §11)**: "Download my data" button. Grep `data-export`, `download-data`, `gdpr`, `dpdp-export`.
4. **Lens 7 — Account lifecycle edges**: recovery if mobile lost, 2FA for sensitive actions, session mgmt, DSA/RM erasure (DPDP §13), account transfer. Grep `delete-account`, `restore-account`, `2fa`, `session-management`.
5. **Lens 14 — PMS Phase 9-11**: DSA suggestion flow UI+API+RM review, form key lifecycle mgmt, `admin/policies/registry-health`. Read PMS-IMPLEMENTATION-PLAN.md phases 9-11.
6. **Lens 13 — Power-admin tooling**: impersonation, audit log queryability, cross-DSA search, bulk admin operations, CSV policy import, system health dashboard.
7. **Lens 15 — Commercial readiness (my addition)**: pricing page coherence (already partially covered by Lens 3 Billing observations), onboarding-to-first-value, DSA acquisition funnel, retention/churn signals, NPS, win/loss reasons, competitive messaging, PLG hooks.
8. **Lens 12 — Sales & growth surface**: referral codes, UTM/campaign tracking, free-trial funnel, landing pages, embeddable widgets, public anonymous eligibility check.
9. **Lens 8 — Integration ecosystem**: webhooks, public API, embeddable widgets, AA, CIBIL, NSDL/UIDAI, WhatsApp Business, DigiLocker. Grep `webhook`, `api-key`, `partner-api`.
10. **Lens 9 — Power-user workflows**: bulk ops (some surfaced in Lens 3), saved searches, tags, global search, shortcuts, drag-drop, clone-to-lender, print views, multi-tab safety.
11. **Lens 11 — Customer success surface**: in-app help, KB, chat widget, video tutorials, community, status page, self-serve troubleshooting.
12. **Lens 10 — Localization depth**: dashboards translated? Indian number formatting, dates DD/MM/YYYY, +91 phone, language toggle scope, Devanagari mobile rendering, RTL. Some surfaced in Lens 3 (Communication templates English-only).

### Follow-up drills (handoff §8, 10 items)
Walk through each, add to findings doc:
- Queries/Communicate disabled tabs (Pitfall: data models exist, UI gap only — `src/routes/(app)/dashboard/dsa/cases/[case_id]/+layout.svelte:124-131`)
- Notifications: enumerate the 2 wired triggers, propose 5-8 more
- Web Push UI vs delivery code gap
- SMS hub readiness post-DLT
- Anti-scraping `dev === false` gating verification
- Sample data `is_sample` audit
- Razorpay subscription edge cases (card expiry, grace, dunning, lockout)
- `engines.node` pin specificity
- Capacitor APK build status
- Vercel preview env separation

### Synthesis
Write into the findings doc:
- **Executive Summary** (15 lines max — the 5-7 most important things)
- **The Two Gaps Section** — finalize Gap A + Gap B with concrete fix paths
- **Recommended Fix Priority** — N=3 / N=5 / N=10 ordered lists
- **Out of Scope (and why)** — what wasn't investigated and the reason

### Time budget for Session 3
- ~90 min on non-UI lenses (code-grep + spec-read across 12 lenses)
- ~45 min on follow-up drills
- ~30 min on synthesis
- **Total: ~2.5–3 hours for Session 3**

---

## Cross-session standing rules

- **Never delete files** — every observation goes into the findings doc; nothing in this audit gets deleted.
- **Plain English** — see `feedback_plain_english_updates.md`. No engineering jargon dumps.
- **Surface as I go** — don't batch findings until the end of session.
- **Branch `main` only** — no branch creation for audit work.
- **Screenshot tool is flaky** — `preview_screenshot` timed out repeatedly in Session 1. Snapshot-only is acceptable and arguably more useful for text/structure UX assessment. If next session needs visual artifacts, try `preview_screenshot` once early; if it works, capture freely; if not, proceed snapshot-only and note in findings.
- **Test data leaks already documented** — when Sessions 2/3 see "xyz bank", "Test RM", "Digital DSA as lender", these are known from Session 1. Just note "same pattern as Session 1" in findings to avoid bloating the doc.

---

## State of repo at end of Session 2

- **Branch:** main, no commits made this session (audit is doc-only; no code touched)
- **Working tree:** unchanged from Session 1 (pre-existing M-files still present; sameCompanySync work, form pages)
- **Files updated this session:**
  - `docs/specs/PRODUCT-AUDIT-PASS-2-FINDINGS-2026-05-19.md` — Lens 4 + Lens 5 + Gap A spec appended
  - `docs/specs/PRODUCT-AUDIT-PASS-2-PROGRESS.md` — Session 2 status added
- **Dev server:** running on port 5183 (left up; `preview_list` should reuse)
- **Logged-in state:** **Admin role active** (cookie `activeRole=admin`). Same account (mobile 9811556664). To resume in DSA or RM, call `POST /api/set-role` with `{ role: 'dsa' }` or `{ role: 'rm' }` plus CSRF header.

---

## How to resume next session in 60 seconds

1. Open this file (`PRODUCT-AUDIT-PASS-2-PROGRESS.md`).
2. Read "Session 1 — key headlines" (~30 sec).
3. Jump to "Session 2 — resume here" → follow the page-sweep list.
4. Append findings into `PRODUCT-AUDIT-PASS-2-FINDINGS-2026-05-19.md` under the appropriate Lens section (skeleton already in place).
5. At end of Session 2, update this progress doc with what got done + next-session resume.
