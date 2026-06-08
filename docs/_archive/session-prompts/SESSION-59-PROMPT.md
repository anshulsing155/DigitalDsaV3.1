# Session 59 — RM Dashboard Redesign + Landing Page

## Quick Context

Session 58 completed the DSA dashboard redesign: 3-zone home page, progressive unlock sidebar, WCAG AA adaptive tokens, and 60-30-10 color migration across ALL 88 dashboard files (DSA + RM + admin). The color tokens are in place everywhere — Session 59 focuses on **deeper layout/UX work** for the RM dashboard and the public landing page.

**Read these files in order:**
1. `CLAUDE.md` — architectural truth, conventions
2. `docs/SESSION-HANDOFF.md` — Session 58 summary, pending inventory
3. This prompt — Session 59 priorities

**Current state:** `main` branch | 0 type errors | 9,292 tests (76 files) | Latest commit: `e60cb05b`

---

## Session 58 Highlights (for context)

**1 commit (88 files, +3179/-2539 lines):**
- DSA home page: 856→300 lines, 3 new components (GlanceCard, NeedsAttentionZone, RecentCasesZone)
- Progressive sidebar: UNLOCKS LATER section, lockConfig system, caseCount from server
- Layout: Logout (door icon) top-right, Home Page + Delete Account at sidebar bottom
- 12 adaptive CSS tokens: `--dash-accent-text`, `--dash-btn-bg/text`, `--dash-contrast-*`
- 6 scheme-specific complements (bronze→steel blue, ocean→amber, etc.)
- 600+ rainbow colors → 60-30-10 tokens across all DSA/RM/admin pages
- WCAG AA: all text ≥4.5:1, font floor 12px

---

## Session 59 Priorities

### Priority 1: RM Dashboard Layout Redesign

The RM dashboard (`src/routes/dashboard/rm/+page.svelte`) already has the correct color tokens from Session 58's migration. What it needs now is a **layout overhaul** to match the Bold & Premium design direction — similar to what was done for the DSA home page.

**Current state:** Dense stat cards + DSA connections + suggested DSAs + activity feed + quick actions. Functional but not redesigned.

**Goal:** Apply the same clean, task-first approach:
- Greeting header (like DSA)
- Key stats in GlanceCard format (Cases Received, Active, Sanctioned, Response Rate)
- Recent cases / DSA connections as compact lists
- Clean section headers with the zone-title pattern

**Key files:**
- `src/routes/dashboard/rm/+page.svelte` — main RM home page
- `src/routes/dashboard/rm/+page.server.ts` — server data
- Existing components: GlanceCard, RecentCasesZone can be reused

### Priority 2: Landing Page Redesign

The public landing page needs a full redesign matching the Bold & Premium mockup.

**Mockup:** `docs/mockups/dashboard-redesign.html` (Landing Page tab)
**Reference:** `memory/reference_live_site_audit.md` — current digitaldsa.com structure

**Key sections from mockup:**
- Hero: "Know the right lender before you file" + gradient CTA
- How It Works: 3-step process cards
- Pricing: 3-tier cards (Free, Pro, Enterprise)
- Trust badges + Final CTA
- Preserve existing footer structure

**Key files:**
- `src/routes/(landing)/+page.svelte` — current landing page
- `src/routes/(landing)/+layout.svelte` — landing layout with nav/footer

### Priority 3: Mobile Polish (if time)

- Test all redesigned pages at 375px width
- Verify bottom nav with locked items
- Check glass card rendering on mobile

---

## Design System (Established in Session 58)

### CSS Tokens Available

```
/* 60% Neutral */
--dash-bg, --dash-bg-card, --dash-bg-alt, --dash-bg-elevated
--dash-text, --dash-text-secondary, --dash-text-muted
--dash-border, --dash-border-light, --dash-hover

/* 30% Brand Accent */
--dash-accent-text, --dash-accent-link
--dash-btn-ghost-bg, --dash-btn-ghost-text, --dash-btn-ghost-border

/* 10% Contrast Complement */
--dash-contrast, --dash-contrast-text, --dash-contrast-light
--dash-contrast-ghost-bg, --dash-contrast-ghost-border

/* Solid CTA */
--dash-btn-bg, --dash-btn-text

/* Glass Card */
--dash-glass-bg, --dash-glass-border, --dash-glass-hover, --dash-glass-blur
```

### Utility Classes
- `.card-glass` — frosted glass card with backdrop-filter
- `.card-surface` — standard opaque card

### Typography Scale
- 32px: Stat numbers (Poppins Bold)
- 24-28px: Page headings (Poppins Bold)
- 15px: Body text, case names
- 14px: Section titles (uppercase, tracked), labels
- 13px: Meta text, comparisons
- 12px: Minimum for any text

### 60-30-10 Badge Pattern
```
Neutral (in-progress):  bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)] border-[var(--dash-border)]
Accent (success):       bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)] border-[var(--dash-btn-ghost-border)]
Contrast (attention):   bg-[var(--dash-contrast-ghost-bg)] text-[var(--dash-contrast-text)] border-[var(--dash-contrast-ghost-border)]
```

---

## Coding Standards (MANDATORY)

1. **Human-readable variable names** — `maxAffordableProperty` not `mAP`
2. **Step-by-step with comments** — Comment WHY, not WHAT
3. **Small focused files** — ~200-300 lines max
4. **No unnecessary complexity** — Simple `if/else` over clever ternary chains
5. **Never delete files** — Move to `_archive/` instead
6. **Always stay on `main` branch**
7. **Dark mode first** — Design for dark, then verify light
8. **Mobile-first** — Test responsive layout at 375px width
9. **60-30-10 color rule** — No rainbow. Brand accent + complement only.
10. **WCAG AA** — All text ≥4.5:1 contrast ratio
