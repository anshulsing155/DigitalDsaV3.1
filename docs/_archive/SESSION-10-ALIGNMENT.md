# Session 10 — Alignment & Restoration Point

> **Date**: 2026-02-27
> **Status**: Pre-execution analysis complete
> **Restoration Point**: `5e76d25e` (Phase 1 archival complete)
> **Branch**: main

---

## Overview

This document serves as the **alignment checkpoint** before executing three major tasks in sequence:
1. Phase 2 Archival (Legacy store auditing)
2. Email Hardening (Production blocker #2)
3. Push Notifications (HIGH priority feature)

### Project State Understanding

**What This Project Is**:
- Fintech platform for Direct Selling Agents (DSAs) in India
- 6 loan types: home loans, LAP, plot loans, personal loans, business loans, professional loans
- 3 roles: DSA (primary), RM (bank partners), Admin
- SvelteKit 5 + Svelte 5 runes + MongoDB + Tailwind CSS 4 + TypeScript (strict)

**What's Complete** ✅:
- All 3 dashboards (DSA/RM/Admin) fully functional
- 6 loan form wizards with 100+ questions per form
- In-house rule engine (7-phase evaluation, 50+ bank policies, JSON-Logic)
- Schema composition layer (TypeScript modules + composer, 100% equivalence verified)
- Full Svelte 5 runes migration (auth.svelte.ts, form.svelte.ts, ui.svelte.ts, etc.)
- Store redesign (legacy → runes, bridges for backward compat)
- i18n (English, Hindi, Marathi — 315+ keys each)
- Dark mode + design system (6 color schemes, semantic tokens)
- CRM, team management, file builder, PDF generation, Razorpay integration
- 7,010+ tests (Vitest), 0 errors, 0 warnings
- 8-layer anti-scraping, guest demo, sample data onboarding

**What's Blocking Production**:
1. 🔴 **Credentials exposed in git** (19 commits) — User will handle separately
2. 🔴 **Email service (Nodemailer SMTP)** — Need AWS SES + SPF/DKIM/DMARC

**Next Growth Features** (HIGH priority):
3. 📱 Push notifications (Web Push + email digests)
4. 💳 Subscription/Payment UI (Razorpay wired, need plan selection + billing)
5. 📦 Capacitor APK (mobile build)

---

## Architecture — What Might Seem Wrong But Is Intentional

### 1. **Schema Duplication (47 pairs)**

**Pattern**:
- Canonical: `src/lib/server/formEngine/schemas/` (26 JSON files)
- Mirror: `src/lib/config/` (31 JSON files)

**Why**:
- Canonical is server-side only (prevents client bundling bloat)
- Mirror is imported by `optionResolver.ts` + `schemaLoader.ts` for client-side reference
- Both kept in sync manually (design limitation, but intentional for performance)

**Impact**: If you modify a question, update BOTH locations atomically.

---

### 2. **Five-Variant Compliance Questions**

**Pattern**:
- Property Condition page has 5 variants of Q1 (propertyComplianceStatus), gated by `propertyAreaType`
- Legal Verification page has 5 variants of Q1 (documentationReadiness), gated by `propertyAreaType`

**Property Area Types**:
- PLANNED_AUTHORITY — development authority allotments
- CONVERTED_RESIDENTIAL — converted/approved residential land
- OLD_MUNICIPAL — traditional city areas (municipal tax)
- LOCAL_COLONY — villages, panchayat areas (revenue records)
- UNKNOWN — fallback

**Why**:
- Each area type has different compliance requirements
- Banks ask different questions based on area type
- Only ONE variant shows per applicant (contextually appropriate)

**Impact**: Each variant has same `contextKey` (e.g., `propertyComplianceStatus`) but different questions/options. This is intentional gating, not dead code.

---

### 3. **Income Assessor V1/V2 Hybrid**

**Current State**:
- V1 functions: `determineFoirCap()`, `computeObligationLoad()` (in `incomeAssessor.ts`)
- V2: `assessIncomeV2()` (also in `incomeAssessor.ts`)
- Both actively imported and used in `evaluationEngine.ts`

**Why**:
- Migration incomplete — some flows use V1, others use V2
- Safe to keep dual imports because V1 functions are isolated, non-overlapping
- Gradual migration in progress (not blocking)

**Impact**: Don't delete either version. Both work. Migration is planned but low urgency.

---

### 4. **Stores Architecture — Legacy → Runes Transition**

**Migration Status**:
```
src/lib/state/          ← NEW (Svelte 5 runes-based — CANONICAL)
  - auth.svelte.ts      ← authState runes class
  - form.svelte.ts      ← formState runes class
  - ui.svelte.ts        ← uiState runes class
  - applicant.svelte.ts ← applicantState runes class
  - dialog.svelte.ts    ← dialogState runes class
  - walkthrough.svelte.ts
  - landingNavigation.svelte.ts

src/lib/stores/         ← OLD (legacy Svelte stores — BEING PHASED OUT)
  - stores.ts           ← barrel index (backward compat re-exports)
  - auth-bridge.svelte.ts ← bridges auth.svelte.ts → legacy stores
  - _bridge.svelte.ts   ← general rune↔store bridge
  - 14+ .ts shims       ← bridges for specific stores (mostly deprecated)
  - 10+ .svelte.ts      ← some new implementations here too (messy, needs cleanup)

src/lib/stores/_archive/legacy-shims/  ← ARCHIVED (Phase 1 complete)
  - _bridge.ts          ← Deprecated stub
  - dashboard.ts        ← Bridge for dashboardState
  - device.ts           ← Bridge for deviceState
  - emailVerificationContext.ts
  - inputErrors.ts
  - numberToWords.ts
  - restoreApplicantIntent.ts
  - theme.ts
  - userFormConformation.ts
```

**Pattern**:
- New code imports directly from `$lib/state/` (runes)
- Old code still works via `$lib/stores/` (bridges)
- Bridges use `fromRune()` to make runes subscribable as stores

**What Happened in Phase 1**:
- 9 deprecated .ts bridge files archived to `_archive/legacy-shims/`
- Deleted originals from active codebase
- .gitignore updated to version the archive

**What Phase 2 Needs**:
- Audit `stores.ts` to identify which stores are still actively imported
- Identify which can be deleted vs. which need bridges
- Document migration targets (Phase 7+ work)
- NO deletions yet — just auditing and marking

---

### 5. **No Required PII — Intentional Privacy Design**

**Pattern**:
- Customer name, PAN, Aadhaar, phone, address are OPTIONAL
- `optional_contact` is the only PII capture (voluntary)

**Why**:
- Users have agency (DSAs can submit cases without identifying customers initially)
- Banks verify PII at approval stage
- Reduces compliance burden on platform

**Impact**: Don't add required PII fields. If a requirement emerges, add as optional + educate DSAs.

---

## Three Tasks Ahead

### Task 1: Phase 2 Archival (Audit Legacy Stores) — ~2 hours

**What**: Audit `src/lib/stores/stores.ts` and related files to identify:
1. Which legacy stores are still actively imported by components
2. Which can be deleted immediately (unused)
3. Which need bridges (legacy code still using them)
4. Which can migrate to runes (no legacy deps)

**Which Files**:
- stores.ts (main barrel)
- 14 .ts shim files (bridges, mostly in _archive now)
- 10 .svelte.ts implementations (scattered across stores/)
- 11 other .ts files (modal.ts, loanData.ts, incomeProfileStore.ts, etc.)

**Output**:
- Audit report documenting each file's status
- Mark Phase 7 candidates in code comments
- NO deletions (auditing only)
- Update ARCHIVAL-STRATEGY.md with findings

**Key Principle**: Archive don't delete. If something is unused, mark it for archival with clear reasoning.

---

### Task 2: Email Hardening (Production Blocker #2) — ~5-6 hours

**Current State**:
- Email sent via Nodemailer SMTP (weak creds in .env)
- No SPF/DKIM/DMARC records on digitaldsa.com
- Deliverability low, bounce rates high

**Target**:
- AWS SES (industry-standard, $0.0001/email)
- SPF/DKIM/DMARC authentication (full chain)
- Backup to SendGrid if SES fails

**Phases**:
1. **AWS Setup** (30 mins) — Verify domain, create SMTP credentials
2. **DNS Records** (45 mins) — Add SPF, DKIM (3 CNAMEs), DMARC
3. **Code Migration** (1.5 hours) — Nodemailer → AWS SDK, error handling
4. **Testing** (1.5 hours) — Verify SPF/DKIM/DMARC, Mail Tester score
5. **Rollout** (1 hour) — SES sandbox → production, monitoring

**Files to Modify**:
- `src/lib/server/email.ts` — Main email service
- `.env.local` — Replace SMTP creds with AWS keys
- `package.json` — Remove nodemailer, add @aws-sdk/client-ses
- New tests for bounce handling

**Key Constraint**: Credentials rotation handled separately by user. We just wire the new service.

---

### Task 3: Push Notifications (HIGH Priority Feature) — ~3-4 hours

**Scope**:
- Web Push API (browser notifications)
- Email digests (daily summary of important events)
- Event aggregation (group multiple events into digest)

**Architecture**:
- Service Worker + Push API for in-app notifications
- Background job (cron) for email digest generation
- Database table for subscription tracking

**Impact**: Users get real-time alerts + daily summaries of case updates.

**Deferred**: APK building (Capacitor setup is ready, Play Store requires more work).

---

## Execution Order

1. ✅ **Restoration point**: `5e76d25e` (commit history preserved)
2. 📋 **Phase 2 Archival** — Start next
3. 🔧 **Email Hardening** — AWS setup requires API keys, can run parallel to Phase 2
4. 📱 **Push Notifications** — After email hardening (low dependency risk)

---

## Critical Gotchas to Avoid

### ❌ Don't:
1. **Delete archived code** — Archive only, git history is the restore
2. **Modify both schemas without atomicity** — Keep `src/lib/config/` and `src/lib/server/formEngine/schemas/` in sync
3. **Change question IDs** — `optionResolver.ts` has hardcoded question IDs
4. **Remove bridges** — Old code still depends on them for backward compat
5. **Add required PII** — Keep everything optional unless explicitly specified
6. **Import `$lib/server/*` in client code** — SvelteKit build guard will block it
7. **Use `console.*` directly** — Always use `logger` from `$lib/server/logger`
8. **Hardcode color values** — Use CSS var tokens (--ddsa-primary-*, --dash-text-*)

### ✅ Do:
1. **Read code before writing** — Patterns are intentional
2. **Test with**: `pnpm run check && pnpm run test:unit`
3. **Update both schema locations** — Config + server form engine
4. **Add archival headers** — Dated comments with restoration commit hash
5. **Update CLAUDE.md or docs** — Keep external documentation fresh
6. **Bridge legacy imports** — Don't break old code, use fromRune()
7. **Preserve git history** — Archive in _archive/, don't git rm

---

## Session Goals

By end of this session:
- ✅ Phase 2 Archival complete (audit report + code annotations)
- ✅ Email Hardening implemented (SES wired, tested, documented)
- ✅ Push Notifications skeleton (database schema, endpoint stubs)
- ✅ All tests passing (0 errors, 0 warnings)
- ✅ Clean git history (3-4 commits, one per major task)

---

## References

| Document | Purpose |
|----------|---------|
| `CLAUDE.md` | Project conventions, route constants, architecture decisions |
| `DEVELOPMENT-PLAN.md` | Living plan, current status, what's next |
| `SESSION-HANDOFF.md` | Automated context, previous sessions, critical decisions |
| `ARCHIVAL-STRATEGY.md` | Phased archival approach (Phases 1-4) |
| `EMAIL-HARDENING-PLAN.md` | Detailed SES migration guide (all 5 phases) |
| `CONVERSATION-CONTEXT.md` | Full session context (~15KB) |
| `ARCHITECTURE.md` | System deep-dive (41KB) |
| `RULE-ENGINE-SPECIFICATION.md` | Rule authoring (49KB) |

---

**Ready to execute all three tasks.**
