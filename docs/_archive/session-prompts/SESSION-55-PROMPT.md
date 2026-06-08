# Session 55 — Post-Testing Bug Fixes + Pre-Launch Hardening

## Quick Context

You are continuing development on DigitalDSA V3, a fintech platform for Indian loan DSAs. Session 54 was the largest ever — 18 commits spanning bug fixes, full Phase E (Billing) + F (Security) + G (Performance) implementation, form optimization, and a Home Loan deep audit. The platform is now feature-complete through Phase G.

**Read these files in order:**
1. `CLAUDE.md` — architectural truth, conventions, key file paths
2. `docs/SESSION-HANDOFF.md` — current state, what was done, what's next
3. This prompt — Session 55 priorities

**Current state:** `main` branch | 0 type errors | 9,237 tests (74 files) | Latest commit: `62b9968e`

---

## Completed Phases (for context)

| Phase | Status | What |
|---|---|---|
| A | ✅ Done (S52) | Trustworthy testing foundation (5 fixes) |
| B | ✅ Done (S53) | Director/company chain (6/7 items) |
| C | ✅ Done (S53) | Rule engine pipeline (4 items) |
| D | ✅ Done (S54) | FG-2 cascading intelligence (32/37) + form optimization (12 items) |
| E | ✅ Done (S54) | Billing security (PB-1/PB-2 price enforcement) |
| F | ✅ Core Done (S54) | 13 security items (sanitization, JWT, cookies, regex, fetch, logic) |
| G | ✅ Core Done (S54) | MongoDB resilience, 14 query projections, index audit |

---

## Session 55 Priorities

### Priority 1: Fix Bugs from Manual Testing

The user tested the platform manually on 2026-04-06. This session should start by asking:
**"What issues did you find during testing?"**

Fix any bugs reported. Follow the Issue Resolution Protocol (`docs/ISSUE-RESOLUTION-PROTOCOL.md`).

### Priority 2: Phase F/G Polish (if no critical bugs)

Lower-priority security and performance items not done in Session 54:

**Security (pick based on severity):**
| Item | What | Effort |
|---|---|---|
| CQ-6 | CSP nonce headers (needs HTTPS testing) | 2 hrs |
| CQ-9–12 | Rate coupling, billing guards | 1-2 hrs |
| CF-3 | Duplicate refresh endpoint | 30 min |
| CD-3–5 | Cascade deletions (archive, sample, account delete) | 2 hrs |
| CC-1 | Remove deprecated V1 assessor | 1 hr |

**Performance (pick based on impact):**
| Item | What | Effort |
|---|---|---|
| CP-5 | combinedAnswers memoization | 2 hrs |
| CP-4 | Schema clone caching | 1 hr |
| CP-8–14 | Lazy imports, code splitting | 2-3 hrs |

### Priority 3: Phase H — Pre-Launch (if launch is imminent)

| Item | What | Timing |
|---|---|---|
| PB-7 | Rotate ALL credentials (Atlas, Razorpay, MSG91, ImageKit, JWT, HMAC, CSRF) | Right before go-live — invalidates all active sessions |
| PB-8 | Email hardening (SES/SendGrid + SPF/DKIM/DMARC for digitaldsa.com) | 2 days before launch — DNS propagation takes 24-48 hrs |

---

## New Capabilities from Session 54

These were added and should be verified during testing:

| Capability | What to Test |
|---|---|
| **Billing price enforcement** | Try subscribing to a plan — amount should come from server, not client |
| **sanitizeHtml** | Form descriptions should render correctly (info boxes, tips, warnings) |
| **Cookie hardening** | Login/logout should work normally — cookies now have sameSite + secure flags |
| **externalFetch timeout** | OTP send/verify should work — now has 10s timeout |
| **propertyAge tenure cap** | Old property (30+) with long tenure should be capped at 40yr total life |
| **RERA gate** | Under Construction + No RERA → only NBFCs should appear in results, no banks |
| **Form optimization** | registryDateReason removed, sixMonthsPassedAfterRegistry removed, tighter financial field spacing |
| **Zero-lender guard** | If no lenders match → should show "No Matching Lenders" with guidance |
| **E11000 retry** | Concurrent evaluations should not crash — retry handles duplicate key |

---

## Key Documents

| Document | Purpose |
|---|---|
| `docs/SESSION-HANDOFF.md` | **READ FIRST** — current state, Session 54 summary |
| `docs/specs/FORM-OPTIMIZATION-SPEC.md` | Derive/remove/combine analysis (3 items remaining) |
| `docs/specs/PRIORITY-1-3-IMPLEMENTATION-PLAN.md` | 5-stream parallel plan (all completed) |
| `docs/reviews/2026-04-05-home-loan-deep-audit.md` | Home Loan audit (remaining should-fix items) |
| `docs/reviews/2026-04-04-full-platform-audit.md` | Master audit — 115+ items |
| `docs/DEVELOPMENT-ROADMAP.md` | Dependency-ordered execution plan |

---

## Audit Findings Still Open (from Home Loan Deep Audit)

**Should Fix (4 items):**
1. "SOON" badges on Queries/Communicate tabs — looks unfinished
2. Dashboard urgency threshold — 29/35 cases "urgent" is noise
3. Mobile bottom bar overlap at 375px
4. "To seller" label wrong for authority purchases in results

**Nice to Have (4 items):**
5. OTP auto-advance focus between digit boxes
6. Dashboard "vs 0 last month" comparison hiding
7. Case card "No lenders" → actionable CTA
8. "Check for Updates" → "Re-evaluate" text

---

## Coding Standards (MANDATORY)

1. **Human-readable variable names** — `maxAffordableProperty` not `mAP`
2. **Step-by-step with comments** — Comment WHY, not WHAT
3. **Small focused files** — ~200-300 lines max
4. **No unnecessary complexity** — Simple `if/else` over clever ternary chains
5. **Co-Applicant terminology** — Anyone who signed = Co-Applicant. Guarantor = separate.
6. **Never delete files** — Move to `_archive/` instead
7. **Always stay on `main` branch**
