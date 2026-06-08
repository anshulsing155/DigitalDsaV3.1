---
type: strategy
status: active
last_verified: 2026-06-02
owner: tech@digitaldsa.com
---

# Customer Feedback Loop — How Beta Feedback Shapes V5

The team runs V3 Beta and talks to 50 DSAs every week. Owner + Claude build V5 in parallel. The two streams meet through a single weekly document. This is how V5 stays connected to reality without the team writing V5 code.

## The rhythm

| When | Who | What |
|---|---|---|
| **Friday 4pm** | Team lead | Files `docs/V5-INPUT/W-NN.md` for the week |
| **Monday 10am** | Owner + Claude | Open file, review, queue items into V5 backlog or note for later |
| **Monday 11am** | Owner | Replies in team channel — top 3 items getting prioritised, why |
| **Friday end-of-sprint** | Owner | Demo to team — what's shipped in V5 this sprint |

## The weekly V5-input template

`docs/V5-INPUT/W-NN.md` follows this template — engineers fill it in collaboratively across the week, lead finalises Friday afternoon.

```markdown
---
week: 23
date_range: 2026-03-15 to 2026-03-21
filed_by: team_lead_name
beta_dsas_active: 38
cases_created_v3_this_week: 127
---

# Week 23 V5 Input

## Top customer asks (ranked by frequency)

1. **"I need to see all loans by the same customer."** — 12 mentions
   - Example: Rahul has Priya as a customer; she's taken HL last year and now LAP through him. He has two separate cases. He wants one customer view.
   - Severity: high (mentioned by majority of multi-case DSAs)
   - V5 status: confirmed for Sprint 1 (Customer entity)

2. **"Where do I track commission?"** — 9 mentions
   - Example: Most DSAs maintain Excel sheets separately. They want it in the app.
   - Severity: high
   - V5 status: confirmed for Sprint 6 (Commission machine)

3. **"Send WhatsApp from inside the app."** — 7 mentions
   - Example: wa.me link opens the user's WhatsApp, breaking flow. They want to send from within DigitalDSA.
   - Severity: high
   - V5 status: confirmed for Sprint 5 (WhatsApp Business API)

4. **"Reminders for follow-ups."** — 5 mentions
   - Severity: medium
   - V5 status: confirmed for Sprint 4 (Follow-up engine)

5. **"Show me which lender pays the most for this file."** — 3 mentions
   - Severity: medium (will grow as DSAs do more cases)
   - V5 status: confirmed for Sprint 10 (CorpDSA payouts, Phase 2B)

## Bugs filed on V3 this week

| # | Bug | Severity | Status |
|---|---|---|---|
| 142 | LAP eligibility wrong for self-employed in tier-2 | high | Fixed by Eng 4 |
| 143 | PDF page 3 line wraps badly | low | In queue |
| 144 | Login session expires too fast | medium | Fixed |
| 145 | Aadhaar masking missed on one form preview | high (security) | Fixed Mon, audit log clean |
| 146 | File upload >5MB fails silently | medium | In progress |

## Engine result issues

| Loan type | Lender | Issue | Action |
|---|---|---|---|
| LAP | HDFC | Wrong eligibility for self-employed > 5Cr business | Investigate — flagged Eng 4 |
| Business Loan | Axis | Missing rate band for ₹50L+ | PMS encoding gap, Eng 6 closing |

## DSA dropouts this week

- 1 DSA (Mumbai, solo, 6 cases on V3) stopped using V3 after 3 weeks.
- Reason: "Too clicky for me — I do everything on phone, this needs too many taps."
- V5 implication: mobile UX must be one-handed first. This becomes a hard constraint on Sprint 4 (Work Queue) UI.

## Lender PMS coverage delta

| Loan type | Last week green cells | This week green cells | Delta |
|---|---|---|---|
| Home Loan | 14 | 16 | +2 |
| LAP | 10 | 11 | +1 |
| Plot | 8 | 8 | 0 |
| Personal | 12 | 14 | +2 |
| Business | 9 | 11 | +2 |
| Professional | 7 | 7 | 0 |
| **Total** | **60** | **67** | **+7** |

Target by end of Phase 2A: 30 lenders × 6 loan types = 180 cells, ≥ 150 green.

## Operational notes

- Status page: 99.7% uptime this week. One 4-minute Mongo failover incident, no data loss.
- Sentry: 23 errors total, all triaged. No PII pattern leaks.
- Support inbox: 41 tickets, median response time 6 hours.

## Asks for owner

1. Sign-off on the LAP self-employed eligibility rule — engineering not confident the encoded policy matches lender's current practice.
2. Decision on Aadhaar masking for the form preview path (was missed; we patched, but need an ADR locking the universal masker as the only display path).
3. Beta cohort: 4 DSAs have asked us to onboard their team-members. Capacity OK to expand cohort by 8? (Total would go from 38 → 46.)
```

## How V5 backlog adjusts

Each Monday morning, owner reads the V5-input and updates the V5 backlog:

| Frequency in V5-input | Backlog action |
|---|---|
| Top-3 ask three weeks in a row | Pull forward 1-2 sprints if possible |
| Asked frequently but already in plan | Confirm timing in team reply |
| Asked once or twice | Note in domain doc; revisit if frequency grows |
| Asked and we won't build | Reply with reasoning so team can communicate |

**Sprint planning is dynamic.** The initial sprint sequence ([02-PHASING.md](02-PHASING.md)) is the starting plan. Real customer signal can reorder Phase 2B sprints freely, but Phase 2A sprints (1-8) are locked because they're foundational dependencies.

## When customer feedback contradicts the plan

Sometimes Beta DSAs ask for something that violates a V5 principle. Example: "Can you let me share my customer's mobile with a builder so they call them directly?"

That's a Principle 12 Q4 violation (lets a builder bypass the DSA). The reply is **no**, and the reasoning gets surfaced in the team reply — so the engineer can explain it back to the DSA without sounding evasive.

Recording the "no" matters too. It goes in `docs/V5-INPUT/REJECTED.md` with the date and reason. If a request gets rejected 5+ times across weeks, the rejection note is reviewed in case the principle interpretation needs revisiting (rarely, but possible).

## Related docs

- [04-TEAM-CHARTER.md](04-TEAM-CHARTER.md) — Team's role in feedback collection
- [../04-security/04-PRINCIPLE-12-GATE.md](../04-security/04-PRINCIPLE-12-GATE.md) — Why we reject some asks
- [../09-sprints/](../09-sprints/) — Where backlog items go
