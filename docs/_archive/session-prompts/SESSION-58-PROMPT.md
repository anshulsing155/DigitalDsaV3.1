# Session 58 — DSA Dashboard Redesign (Phase 1)

## Quick Context

Session 57 completed all performance polish (Cat 3) and security polish (Cat 2), plus the Risk Signals Architecture (Cat 4 Tier C). The platform is now feature-complete AND polished. The next major milestone is the Dashboard/Landing Page Redesign — a visual overhaul to match the approved "Bold & Premium" design direction.

**Read these files in order:**
1. `CLAUDE.md` — architectural truth, conventions, key file paths
2. `docs/SESSION-HANDOFF.md` — Session 57 summary, full pending inventory
3. This prompt — Session 58 priorities

**Current state:** `main` branch | 0 type errors | 9,292 tests (76 files) | Latest commit: `8d2b7e1c`

---

## Session 57 Highlights (for context)

**1 commit spanning:**
- CP-6: $effect cascade reduction (3 income components + 2 AddApplicant components)
- CP-8-14: Lazy imports (pdf-lib in emailSend, seed modules in admin endpoint)
- CQ-9-12: Rate limiting on all 3 billing endpoints (per-user)
- CD-6-8: Deterministic payload_hash (recursive key sort) + FormSnapshot created_at index
- Risk Signals: RiskSignal type + pipeline + 3 sample option tags
- CF-3: Verified NOT duplicate — intentional dual-path refresh

**Resolved categories:**
- Cat 3 Performance: ✅ COMPLETE
- Cat 2 Security: ✅ Mostly complete (CQ-6/7 CSP nonce needs HTTPS — deferred to deployment)
- Cat 4 Tier C: Risk Signals architecture complete

---

## Design Direction (Approved)

**Mockup**: `docs/mockups/dashboard-redesign.html` (3 tabs: DSA, Landing, RM)
**Memory**: `memory/project_ui_redesign.md`

### Brand Identity: Bold & Premium
- **Dark backgrounds**: `#050505` base, glass/frosted cards
- **Bronze gradient accent**: `#cb997e` (already in theme system as primary)
- **Typography**: Inter for UI, Poppins for headlines
- **Feel**: CRED meets Vercel — premium but approachable

### DSA Dashboard (Session 58 Focus)
- **Simplified, task-first** home page
- **3 sections**: Needs Attention (max 3-5 actionable items), Quick Glance (4 stat cards), Recent Cases
- **Progressive unlock sidebar**: Team/CRM locked until 5+ cases, Analytics locked until Pro plan
- **Current state**: 13+ cards, information overload — needs radical simplification

### RM Dashboard (Session 59-60)
- Same design language but denser — compact stat rows, data tables, power user layout

### Landing Page (Session 60-61)
- Full redesign: Hero, How It Works, Pricing, Testimonials, Trust, CTA
- Preserve existing footer structure + blog/About/Careers pages

---

## Session 58 Priorities

### Priority 1: DSA Dashboard Home Page Overhaul

**Goal**: Transform the current 13+ card dashboard into a clean, task-first experience.

#### Step 1: Audit Current Dashboard
- Read `src/routes/dashboard/dsa/+page.svelte` and `+page.server.ts`
- Inventory all cards/sections currently shown
- Identify which are action-driving (keep on home) vs informational (move to sub-pages)
- Review the mockup at `docs/mockups/dashboard-redesign.html` (DSA tab)

#### Step 2: Implement New Layout
The new home page should have 3 clear zones:

**Zone 1: "Needs Attention" (top)**
- Flagged cases needing action (stale, incomplete, approaching deadline)
- Max 3-5 items with clear CTAs
- Design: Compact alert-style cards with icon + title + action button

**Zone 2: "Quick Glance" (middle)**
- 4 stat cards: Active Cases, This Month's Submissions, Conversion Rate, Revenue
- Design: Glass/frosted card style, single prominent number + label + trend indicator

**Zone 3: "Recent Cases" (bottom)**
- Last 5-8 cases with status badge, loan type, amount, last update
- Design: Clean table/list with row-level actions
- "View All" link to full cases page

#### Step 3: Progressive Unlock Sidebar
- Sidebar navigation should show locked items (grayed, with lock icon)
- Team/CRM: Locked until `caseCount >= 5` (server-computed in layout.server.ts)
- Analytics: Locked until Pro plan subscription active
- Tooltip on hover: "Complete 5 cases to unlock" / "Upgrade to Pro"

### Priority 2: Theme System Updates (if time)

#### Update Dashboard CSS Variables
- Review and update `--dash-*` CSS variables for the Bold & Premium palette
- Ensure dark mode is the **default** for dashboard (light mode as secondary option)
- Add any missing variables for glass/frosted card effects

#### Typography
- Ensure Poppins is loaded for headlines, Inter for body (check `app.css`)
- Update font-weight hierarchy: headlines bold (600-700), body regular (400)

---

## Current Dashboard Architecture

| File | Purpose |
|------|---------|
| `src/routes/dashboard/dsa/+page.svelte` | Main dashboard home |
| `src/routes/dashboard/dsa/+page.server.ts` | Server data (cases, stats) |
| `src/routes/dashboard/dsa/+layout.svelte` | Dashboard shell (sidebar + topbar) |
| `src/routes/dashboard/dsa/+layout.server.ts` | Shared layout data (user, subscription) |
| `src/lib/components/dashboard/` | 36 dashboard components |
| `src/lib/stores/theme.svelte.ts` | Theme system (6 schemes, light/dark) |
| `src/app.css` | Global styles + CSS variables |

### Key Dashboard Components (currently used)
- `StatCard` — stat display with icon
- `StatusCard` — status indicator
- `QuickActions` — action grid
- `ActivityFeed` — recent activity
- `CaseListCompact` — compact case list
- `TaskSection` — task grouping
- `AttentionCard` — attention items
- `SampleDataBanner` — demo data indicator
- `PipelineChart` / `MiniDonut` / `MiniBarChart` — charts

### Important Constraints
- **Never delete existing components** — move to `_archive/` if replacing
- **Keep all existing sub-routes functional** (cases/, crm/, team/, etc.)
- **Dark mode is primary** — design for dark first, light second
- **Mobile-first** — Capacitor Android app uses same dashboard
- **Icon pattern**: Use Lucide icons (already imported across codebase)
- **typeof guard for icons**: Always check `typeof Icon === 'string'` before rendering as component (CLAUDE.md pitfall #3)

---

## Full Pending Inventory (from Session 57)

### Dashboard/Landing Page Redesign
- **Session 58**: DSA dashboard home page + progressive sidebar
- **Session 59-60**: RM dashboard + landing page
- **Session 61**: Polish, mobile testing, dark/light consistency

### Cat 2: Security (remaining — deferred)
- CQ-6/7: CSP nonce + HSTS (needs HTTPS deployment)

### Cat 4 Tier C: Form Quality (remaining)
- Risk Signals: More options can be tagged with riskSignal as needed
- V1 schema elimination — DEFERRED to form values redesign
- AD-11: Unsecured business loan dedup

### Cat 4 Tier D: Advanced (post-launch)
- Cross-lender affordability, per-applicant PL, credit risk intelligence, AI rule parsing, variation matching

### Cat 1: Production Blockers (do LAST)
- PB-7: Credential rotation
- PB-8: Email hardening

---

## Coding Standards (MANDATORY)

1. **Human-readable variable names** — `maxAffordableProperty` not `mAP`
2. **Step-by-step with comments** — Comment WHY, not WHAT
3. **Small focused files** — ~200-300 lines max
4. **No unnecessary complexity** — Simple `if/else` over clever ternary chains
5. **Never delete files** — Move to `_archive/` instead
6. **Always stay on `main` branch**
7. **Never add Co-Authored-By lines** to commits
8. **Dark mode first** — Design for dark, then verify light
9. **Mobile-first** — Test responsive layout at 375px width
