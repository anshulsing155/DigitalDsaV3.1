# Dashboard Fix Log — Running Reference

> **Started**: 2026-02-19
> **Objective**: Fix all three dashboards (RM, DSA, Admin) completely — logic, data, validations, tours
> **Approach**: Wear each role's shoes, identify pain areas, fix on the spot

---

## Phase 1: RM Dashboard — COMPLETED

### RM Role Context
An RM is a bank employee (e.g., HDFC Bank credit manager). They:
- Work at ONE specific bank/NBFC/HFC
- Receive loan files from DSAs for processing
- Upload their bank's policy documents for DSAs to reference
- Broadcast policy changes to connected DSAs
- Track accuracy of DSA-submitted files
- Want to see their bank identity front and center

### Issues Found & Fixed

| # | Issue | Severity | File(s) | Status |
|---|---|---|---|---|
| RM-1 | bankName never extracted from officialEmail during onboarding | CRITICAL | `api/onboarding/rm-onboarding/+server.ts` | DONE |
| RM-2 | getLenderNameFromDomain covers only 19/75+ domains | HIGH | `lib/config/lenderDomains.ts` | DONE |
| RM-3 | Settings page shows empty bank (field name mismatch) | HIGH | `dashboard/rm/settings/+page.server.ts` | DONE |
| RM-4 | Policy upload saves empty lender_name | HIGH | `api/rm/policies/+server.ts` | DONE |
| RM-5 | Sample data seeder receives empty bankName | MEDIUM | `server/rmSampleDataSeeder.ts` | DONE |
| RM-6 | No backfill for existing RMs with empty bankName | MEDIUM | `api/admin/migrations/backfill-rm-bankname/+server.ts` (NEW) | DONE |
| RM-7 | Submissions page lets RM pick any lender (should auto-lock to their bank) | HIGH | `dashboard/rm/submissions/new/+page.server.ts` + `.svelte` | DONE |
| RM-8 | Dashboard home shows empty bankName | HIGH | `dashboard/rm/+page.server.ts` | DONE |
| RM-9 | Case detail page shows empty rmBankName | MEDIUM | `dashboard/rm/cases/[case_id]/+page.server.ts` | DONE |
| RM-10 | Analytics page uses empty bankName for lender_name | MEDIUM | `dashboard/rm/analytics/+page.server.ts` | DONE |
| RM-11 | Broadcasts page shows empty lenderName | MEDIUM | `dashboard/rm/broadcasts/+page.server.ts` | DONE |
| RM-12 | Broadcasts API saves empty lender_name | MEDIUM | `api/rm/broadcasts/+server.ts` | DONE |
| RM-13 | Submissions API uses empty bankName as fallback name | LOW | `api/rm/submissions/+server.ts` | DONE |
| RM-14 | Review/respond API uses empty bankName as fallback | LOW | `api/rm/review/[version_id]/respond/+server.ts` | DONE |
| RM-15 | Sample data API doesn't derive bankName from email | MEDIUM | `api/rm/sample-data/+server.ts` | DONE |
| RM-16 | DSA suggestions scoring uses empty rmLender | LOW | `dashboard/rm/+page.server.ts` (line 572) | DONE |
| RM-17 | No tour guides for RM dashboard | MEDIUM | walkthrough config (NEW files) | DONE |

### RM bankName Fix Pattern Applied Everywhere
Every file reading `rmDoc.bankName` now follows:
```typescript
import { getLenderNameFromDomain } from '$lib/config/lenderDomains.js';
const officialEmail = rmDoc.rmOfficialEmail || (rmDoc as any).officialEmail || '';
const bankName = rmDoc.bankName || getLenderNameFromDomain(officialEmail) || '';
```

---

## Phase 2: DSA Dashboard — COMPLETED

| # | Issue | Severity | File(s) | Status |
|---|---|---|---|---|
| DSA-1 | RM Contacts quick action disabled with "SOON" badge | MEDIUM | `dashboard/dsa/+page.svelte` | DONE |

---

## Phase 3: Tour Guides — COMPLETED

| # | Issue | File(s) | Status |
|---|---|---|---|
| TOUR-1 | RM intro tour (9 steps) | `lib/config/walkthrough/rm/rmIntroTour.ts` (NEW) | DONE |
| TOUR-2 | Admin intro tour (8 steps) | `lib/config/walkthrough/admin/adminIntroTour.ts` (NEW) | DONE |
| TOUR-3 | Universal walkthrough API | `api/walkthrough/+server.ts` (NEW) | DONE |
| TOUR-4 | State manager role-aware | `lib/state/walkthrough.svelte.ts` | DONE |
| TOUR-5 | WalkthroughDriver accepts role | `lib/components/walkthrough/WalkthroughDriver.svelte` | DONE |
| TOUR-6 | TourLauncher hides Full Guide for non-DSA | `lib/components/walkthrough/TourLauncher.svelte` | DONE |
| TOUR-7 | RM layout.svelte + layout.server.ts (walkthrough) | `dashboard/rm/+layout.svelte` (NEW) + `+layout.server.ts` | DONE |
| TOUR-8 | Admin layout.svelte + layout.server.ts (walkthrough) | `dashboard/admin/+layout.svelte` (NEW) + `+layout.server.ts` | DONE |
| TOUR-9 | walkthroughId on RM nav items (9 items) | `dashboard/+layout.svelte` | DONE |
| TOUR-10 | walkthroughId on Admin nav items (7 items) | `dashboard/+layout.svelte` | DONE |
| TOUR-11 | TourLauncher enabled for all roles | `dashboard/+layout.svelte` | DONE |

### Admin bankName Display Fix
| # | Issue | File(s) | Status |
|---|---|---|---|
| ADMIN-1 | Admin RM user list shows empty bankName | `api/admin/users/rm/+server.ts` | DONE |
| ADMIN-2 | Admin user detail shows empty bankName | `dashboard/admin/users/[user_id]/+page.server.ts` | DONE |

---

## Type Check Status
- **0 errors, 0 warnings** after all changes

## Files Modified (Total: 25+)
### New Files (7):
- `src/lib/config/walkthrough/rm/rmIntroTour.ts`
- `src/lib/config/walkthrough/admin/adminIntroTour.ts`
- `src/routes/api/walkthrough/+server.ts`
- `src/routes/api/admin/migrations/backfill-rm-bankname/+server.ts`
- `src/routes/dashboard/rm/+layout.svelte`
- `src/routes/dashboard/admin/+layout.svelte`

### Modified Files (18+):
- `src/lib/config/lenderDomains.ts` — Expanded from 19 to 100+ domain mappings
- `src/lib/state/walkthrough.svelte.ts` — Role-aware state manager
- `src/lib/components/walkthrough/WalkthroughDriver.svelte` — Role prop
- `src/lib/components/walkthrough/TourLauncher.svelte` — Conditional Full Guide
- `src/routes/api/onboarding/rm-onboarding/+server.ts` — bankName extraction
- `src/routes/dashboard/rm/+page.server.ts` — bankName email fallback
- `src/routes/dashboard/rm/settings/+page.server.ts` — Field name fix + import
- `src/routes/dashboard/rm/analytics/+page.server.ts` — bankName email fallback
- `src/routes/dashboard/rm/broadcasts/+page.server.ts` — bankName email fallback
- `src/routes/dashboard/rm/cases/[case_id]/+page.server.ts` — bankName email fallback
- `src/routes/dashboard/rm/submissions/new/+page.server.ts` — Auto-lock lender
- `src/routes/dashboard/rm/submissions/new/+page.svelte` — Locked lender UI
- `src/routes/dashboard/rm/+layout.server.ts` — Walkthrough state loading
- `src/routes/dashboard/admin/+layout.server.ts` — Walkthrough state loading
- `src/routes/dashboard/+layout.svelte` — walkthroughId + TourLauncher all roles
- `src/routes/dashboard/dsa/+layout.svelte` — Pass role to WalkthroughDriver
- `src/routes/dashboard/dsa/+page.svelte` — RM Contacts enabled
- `src/routes/api/rm/policies/+server.ts` — lender_name email fallback
- `src/routes/api/rm/broadcasts/+server.ts` — lender_name email fallback
- `src/routes/api/rm/submissions/+server.ts` — rm_name email fallback
- `src/routes/api/rm/sample-data/+server.ts` — bankName email fallback
- `src/routes/api/rm/review/[version_id]/respond/+server.ts` — rmName email fallback
- `src/routes/api/admin/users/rm/+server.ts` — bankName email fallback
- `src/routes/dashboard/admin/users/[user_id]/+page.server.ts` — bankName email fallback
- `src/lib/server/rmSampleDataSeeder.ts` — bankName fallback in text

---

## Upcoming
- Cross-dashboard validation checks (input/select combinations)
- Playwright visual verification
- DEVELOPMENT-PLAN.md comprehensive status update
