---
type: strategy
status: active
last_verified: 2026-06-02
owner: tech@digitaldsa.com
---

# Team Charter — Who Owns What

## The split

Two teams, one product.

- **Team of 10 engineers** owns V3. Their job is to keep V3 stable, run the Beta program, and capture customer feedback systematically.
- **Owner + Claude** owns V5. Just two of us building the new system in a fresh repo, with conviction and without coordination overhead.

The team does not write V5 code until invited. The owner is not pulled into V3 day-to-day code work. This separation is the entire point.

## The team's mission during V3 Beta

After V3 Beta launches (end of Week 6), the 10 engineers move into a steady-state mode. Their work is operational, not architectural.

### Each engineer owns ~5 Beta DSAs

10 engineers × 5 DSAs = 50 Beta cohort coverage. Each engineer:
- Onboards their 5 DSAs personally (60-min Zoom + WhatsApp follow-up)
- Watches them use the app weekly (screen-share if needed)
- Triages their bugs and feature requests
- Captures structured feedback (template below)
- Builds rapport — these DSAs are the most valuable group on the planet for the next 5 months

### The team also handles

- **V3 bug fixes.** Critical bugs only — anything user-visible affecting evaluation correctness, billing, or data integrity.
- **PMS coverage expansion.** Lender encoding continues post-Beta — target 30 lenders × 6 loan types by end of Phase 2A.
- **V3 dependency updates.** Security patches mandatory; everything else on Renovate weekly review.
- **Support inbox** (support@digitaldsa.com), status page, incident response.
- **Sales conversations** for next Beta cohort additions (if any).

### The team does not

- Write V5 code
- Architect new V3 features
- Propose new modules
- Initiate refactors

If they spot something that should be in V5, it goes in the weekly V5-input document (see [06-CUSTOMER-FEEDBACK-LOOP.md](06-CUSTOMER-FEEDBACK-LOOP.md)). Not as a PR. Not as a side project.

## Why this is firm

Splitting attention across "keep V3 alive" and "build V5" inside one team is how most rewrites die. The team either gets pulled back to V3 fires and V5 stalls, or V5 wins their attention and V3 quality drops while it's still the live system. Neither works.

The charter forces the discipline: V3 is a fully-resourced operating product, V5 is a fully-isolated construction site. They meet only through the feedback channel.

## The owner + Claude's mission

| What | When | Time budget |
|---|---|---|
| V3 close-out supervision | Weeks 1–6 | ~1 hour/day each |
| V5 Sprint 0 planning | Weeks 1–2 (parallel to V3) | ~5–7 hours/day |
| V5 Sprint 1 build start | Week 3 onward | ~5–7 hours/day |
| Weekly V5-input review (Monday) | Ongoing from Week 7 | 1–2 hours/week |
| V5 sprint planning | First Monday of each sprint | 2–3 hours |
| V5 demo to team | Last Friday of each sprint | 1 hour |
| Beta cohort visits (with team) | Monthly | 2–3 hours |

## Communication rhythms

### Daily (team internal)

- Async standup in their channel — what they did yesterday, blockers
- Owner not in this loop unless escalated

### Weekly

- **Friday afternoon: team lead files `docs/V5-INPUT/W-NN.md`** — see [06-CUSTOMER-FEEDBACK-LOOP.md](06-CUSTOMER-FEEDBACK-LOOP.md) for template
- **Monday morning: owner + Claude review V5-input.** Items get queued, deprioritised, or noted
- **Friday end-of-week: V5 demo** — 30-min walk-through of what shipped this week in V5 repo

### Monthly

- **Beta cohort retro** — owner + 2 team leads + 5 Beta DSAs on a call. What's working, what isn't, what V5 should look like.

### When something breaks

- **V3 critical incident** (data loss, security, billing failure): team lead pages owner. Owner triages within 2 hours.
- **V3 non-critical incident**: team handles, files in weekly V5-input if there's a V5 implication.
- **V5 blocker we can't resolve alone**: 30-min escalation call with team lead's input.

## Engineer rotation

To keep V3 work from getting stale and to keep skills sharp:

- **Quarterly rotation:** every 3 months, 1 engineer rotates to V5 for a 4-week embed. They contribute to V5 sprints under owner + Claude's review.
- **At GA (~Month 6):** the team migrates as a whole to V5. V3 becomes a maintenance product (bug fixes only) for the 6 months following GA.

## Beta DSA covenant (what the team promises)

In the onboarding pack we hand to each Beta DSA, this is the commitment:

1. **Your data lives in Mumbai. Always.**
2. **Your customer relationships are yours.** We never call your customers, never share their data, never let a lender or partner reach them around you.
3. **What you tell us shapes V5.** Every Friday your engineer files what you said.
4. **You get V5 free for life** for being a Beta DSA. After GA pricing kicks in, your subscription rate is locked.
5. **If we mess up, we own it loudly.** Public post-mortem, no spin.

## Related docs

- [02-PHASING.md](02-PHASING.md) — Calendar view
- [03-V3-STABILIZATION.md](03-V3-STABILIZATION.md) — The 6-week plan engineers execute
- [06-CUSTOMER-FEEDBACK-LOOP.md](06-CUSTOMER-FEEDBACK-LOOP.md) — Weekly input doc template
