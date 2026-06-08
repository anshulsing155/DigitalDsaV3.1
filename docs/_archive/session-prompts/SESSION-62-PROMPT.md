# Session 62 Prompt — Mobile Responsive + i18n + Communication Polish

## Context

Read first:
1. `CLAUDE.md` — stable architectural rules
2. `docs/SESSION-HANDOFF.md` — current state from Session 61
3. `C:\Users\OJ\.claude\projects\F--TECH-DigitalDSA-REPOs-DigitalDSA-V3\memory\MEMORY.md` — standing instructions

Session 61 was massive — wired offers end-to-end for all 6 loan types, completed 3 sprints of security/quality hardening, and fixed deep audit findings. The platform is now **functionally complete** with all critical paths working. What remains is UX polish before launch.

**Current metrics**: 0 type errors | 9,343 tests passing (78 files) | 8 commits in S61

## Objective

**Polish the user experience across mobile, i18n, and communication — the last major quality pass before production.**

## Tasks (in priority order)

### Task 1: Dashboard & Results Mobile Responsive Testing (HIGH)

**Problem**: Dashboard and results pages have been redesigned (S58-S59) but never tested on mobile viewports. The landing page is confirmed responsive, but dashboard pages may overflow on 375px screens.

**Approach**:
1. Start the dev server via preview tools
2. Resize to mobile (375x812) and tablet (768x1024) viewports
3. Audit these pages for overflow, stacking, and touch targets:
   - `/dashboard/dsa` (home page — 3-zone layout from S58)
   - `/dashboard/dsa/cases/{caseId}/results` (lender result cards, sticky bar, sort/filter)
   - `/dashboard/dsa/crm` (pipeline view, stats grid)
   - `/dashboard/dsa/billing` (plan selector grid)
   - Landing page `/` (quick sanity check)
4. Fix using Tailwind responsive classes:
   - `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` for card grids
   - `text-sm md:text-base` for large numbers
   - `flex-wrap` on filter/sort bars
   - `overflow-x-auto` on horizontal tables
   - `px-4 md:px-6` for consistent mobile padding
5. Key components to check:
   - `src/lib/components/dashboard/GlanceCard.svelte`
   - `src/lib/components/dashboard/results/LenderResultCard.svelte`
   - `src/lib/components/dashboard/results/ResultsSortFilterBar.svelte`
   - `src/routes/dashboard/dsa/+page.svelte`
   - `src/routes/dashboard/dsa/cases/[case_id]/results/+page.svelte`

### Task 2: i18n Adoption Pass — Form Success Pages (MEDIUM)

**Problem**: ~70% of pages use the `t()` translation function, but form success/application pages use hardcoded English strings. These are user-facing pages that Hindi/Marathi speakers will see.

**Approach**:
1. Check `src/lib/i18n/en.ts` — are there existing keys for "Application Submitted!", "Your application has been submitted", etc.?
2. If keys exist, replace hardcoded strings in these pages with `t()` calls:
   - `src/routes/(app)/(Application)/home-loan-application/+page.svelte`
   - `src/routes/(app)/(Application)/lap-loan-application/+page.svelte`
   - `src/routes/(app)/(Application)/plot-loan-application/+page.svelte`
   - `src/routes/(app)/(Application)/personal-loan-application/+page.svelte`
   - `src/routes/(app)/(Application)/business-loan-application/+page.svelte`
   - `src/routes/(app)/(Application)/professional-loan-application/+page.svelte`
3. If keys don't exist, add them to all 3 translation files (`en.ts`, `hi.ts`, `mr.ts`)
4. Also check the evaluating animation page: `src/routes/(app)/evaluating/+page.svelte`

**Key**: Hindi/Marathi translations should be colloquial, not formal (AD-13). Use existing patterns in the i18n files.

### Task 3: Image Lazy Loading Pass (LOW)

**Problem**: ~90% of `<img>` tags lack `loading="lazy"`. Affects initial page load performance.

**Approach**:
1. Search for `<img` tags across all `.svelte` files
2. Add `loading="lazy"` to images that are NOT in the viewport on initial load:
   - Below-the-fold landing page sections (testimonials, pricing, trust)
   - Dashboard page images
   - Logo images in forms
3. Do NOT lazy-load: hero images, above-the-fold logos, critical UI elements
4. Also check for `decoding="async"` — add where missing

### Task 4: Communication Hub — Assess Scope (RESEARCH ONLY)

**Problem**: Communication hub (`/dashboard/dsa/communication/`) loads templates and case picker but has no actual send logic. This is a potentially large feature.

**Approach**: DO NOT IMPLEMENT. Just investigate and document:
1. Read `src/routes/dashboard/dsa/communication/+page.svelte` — what templates exist?
2. Read `src/lib/server/data/communicationTemplates.js` — what's the template structure?
3. What channels should be supported? (WhatsApp, SMS via MSG91, Email)
4. How does the communication log in CRM connect to sent messages?
5. Write a brief spec section in SESSION-HANDOFF.md for future implementation

## Verification

After all tasks:
1. `pnpm check` — 0 errors
2. `pnpm test:unit` — all passing
3. Visual check: dashboard at 375px viewport (no horizontal overflow)
4. Visual check: results page at 375px (cards stack vertically, sticky bar usable)

## What NOT to Do

- Don't touch the rule engine or evaluation pipeline (complete and tested)
- Don't refactor form pages (just completed massive centralization in S61)
- Don't work on CSP/HSTS (needs HTTPS deployment)
- Don't work on credential rotation or email hardening (Phase H — do LAST)
- Don't implement communication send (research only — Task 4)
- Don't change the billing flow (just fixed duration + case limits in S61)
- Don't modify the payload builder or test fixtures unless a real bug is found
