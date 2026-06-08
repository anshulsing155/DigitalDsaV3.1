# DigitalDSA — Claude Execution Context

This file is the **technical source of truth** for the codebase. It is checked into the repo and read by every session. Pair it with `~/.claude/.../MEMORY.md` (user preferences) and `docs/SESSION-HANDOFF.md` (current state).

---

## SECTION INDEX

1. [Execution Kernel](#1-execution-kernel) — what this system is, read order
2. [Non-Negotiable Invariants](#2-non-negotiable-invariants) — locked decisions
3. [Critical Pitfalls](#3-critical-pitfalls) — patterns that have caused real failures
4. [Pre-Flight Grep Checks](#4-pre-flight-grep-checks) — one-line scans before claiming done
5. [Done Checklist](#5-done-checklist) — verification rubric
6. [Execution Path Verification](#6-execution-path-verification) — trace before fixing
7. [Tech Stack](#7-tech-stack)
8. [Production Blockers](#8-production-blockers)
9. [Rule Engine](#9-rule-engine)
10. [Form System](#10-form-system)
11. [Permissions & Roles](#11-permissions--roles)
12. [Data Cloning](#12-data-cloning)
13. [Architecture Decisions (Locked)](#13-architecture-decisions-locked)
14. [Key File Paths](#14-key-file-paths)
15. [Tooling Conventions](#15-tooling-conventions)
16. [Hard Rules (Process)](#16-hard-rules-process)
17. [Doc Hygiene Meta-Rules](#17-doc-hygiene-meta-rules)

---

## 1. EXECUTION KERNEL

**System**: Multi-lender loan orchestration platform for DSAs (India)
**Roles**: DSA (primary), RM (bank partners), Admin
**Scope**: 6 loan types (Home, LAP, Plot, Personal, Business, Professional) + BT / top-up
**Constraint**: No customer-facing dashboards

**Read order for every session:**
1. This file (CLAUDE.md) — stable architectural truth
2. `docs/SESSION-HANDOFF.md` — current branch state, in-flight work, next steps
3. `~/.claude/projects/.../MEMORY.md` — user preferences (already auto-loaded)
4. Relevant module doc only when scoped to that module

**Check current state with commands, not memory.** Test count, branch SHA, warning count change every session — read them live (`git log -1 --oneline`, `pnpm check`, `pnpm test:unit -- --run --reporter=basic`) rather than trusting any number written in any doc.

**Session lifecycle**: two project-local slash commands govern every session — full protocols in `.claude/commands/start.md` and `.claude/commands/end.md`. The user types `/start` to open (reads docs + presents a plain-English menu of next actions) and `/end` to close (audits work, proposes doc updates, applies on approval). Natural-language wrap-up phrases ("let's stop", "are we done", "till tomorrow") trigger a pre-close audit per the MEMORY.md "Session Lifecycle" section. Per-task protocols live in `.claude/protocols/` (Zod migration, BOLA audit, load-function migration, code-review fix, generic evolution-item executor). The long-term roadmap is `docs/ARCHITECTURE-EVOLUTION.md`; ADRs are in `docs/adr/`. See ADR-0003 for the full design rationale.

### Deployment context (TEMPORARY — until DigitalDSA Vercel migration)

Production currently lives on the **`rinn` Vercel project** (project id `prj_vvnjpRpjNYjPGJ0UmG6ZprycfRkJ`, team id `team_5C73bEbccxEYCQtLNuQeCPml`). Domain: `www.rinn.in`.

**When mentioning Vercel-side operator actions — env vars, redeploys, deployment logs, cron-job.org target hosts — always specify the `rinn` team/project so the owner doesn't fumble the right dashboard.** This is a temp state pending migration to a `digitaldsa` Vercel team. When migration lands, the `.vercel/project.json` orgId changes — at that point this whole section gets removed from CLAUDE.md.

If a session is about to suggest a Vercel command without naming the project, that's a regression; correct yourself and say "in the `rinn` Vercel project."

---

## 2. NON-NEGOTIABLE INVARIANTS

These are locked. Do not propose alternatives.

- **All business logic runs server-side only** — client renders only
- **Immutable snapshots** — form edits create new versions (SHA-256), never overwrite
- **Income profiling (12 types, multi-source, haircut-based) MUST NOT be simplified** — competitive moat
- **File Builder is derived** — auto-generated from form + rules; DSA controls presentation, never financial numbers
- **No PII in v1 PDF** — system-enforced, not a toggle
- **Role-based access strictly server-validated** — `activeRole` cookie resolved in `hooks.server.ts` only
- **Centralized RM database** — crowdsourced from all DSAs, shared globally, non-competitive
- **Every edit = new version** — audit trail mandatory, snapshots never deleted
- **Anti-scraping always active in production** (8 layers, gated behind `dev === false`)
- **Existing patterns > new abstractions** — check `src/lib/components/_archive/` (16 archived) before creating new components
- **Branch `main` only** — never create or switch branches without explicit user request

---

## 3. CRITICAL PITFALLS

**Catalog** (full bodies): [`docs/PITFALLS.md`](docs/PITFALLS.md)  ·  **Index** (78 rows): [`docs/PITFALLS-INDEX.md`](docs/PITFALLS-INDEX.md)  ·  **Greps**: [`docs/PREFLIGHT-GREPS.md`](docs/PREFLIGHT-GREPS.md)

Sidecars are loaded on-demand when working in the relevant area. NOT auto-loaded into every session — that's a deliberate cache-discipline choice (edits to PITFALLS-INDEX.md or PREFLIGHT-GREPS.md don't bust CLAUDE.md's prompt cache).

When you suspect a pitfall is no longer applicable, mark it `(verified obsolete YYYY-MM-DD)` in PITFALLS.md rather than deleting. Add new pitfalls there following the existing template (wrong → right → why → detection → enforcement → last verified).


## 4. PRE-FLIGHT GREP CHECKS

Full catalog at [`docs/PREFLIGHT-GREPS.md`](docs/PREFLIGHT-GREPS.md) (extracted 2026-06-02 to keep CLAUDE.md cache-warm). Each grep is paired with a pitfall in [`docs/PITFALLS-INDEX.md`](docs/PITFALLS-INDEX.md).

Before claiming "done" on a non-trivial change, run the greps scoped to your change area. `/end` fans these out as part of its verification Workflow (planned).

Add a new grep when you add a new pitfall. The grep IS the pitfall's regression test until a CI lock test exists.


## 5. DONE CHECKLIST

Before saying "done" on any code change, walk through this list. **Type-check + tests passing is necessary but not sufficient** — the other steps catch the bugs that survive both.

1. **Type check**: `pnpm check` — 0 errors, warnings did not increase
2. **Tests**: `pnpm test:unit -- --run` — all green; if snapshots changed, you regenerated them intentionally (Pitfall #11)
3. **Render-tree trace**: confirm the file you changed is actually mounted for the affected flow. *Which `.svelte` actually mounts? Grep imports up to the route.* (See Section 6.)
4. **Parity check**: does this fix apply to other loan types / Individual & Company / single & multi applicant? If yes, propagate. If no, document why not.
5. **Greps from §4** relevant to the change area
6. **Behavioral verification**: would this code path actually execute in the user's reported scenario? Trace inputs end-to-end at least once mentally before claiming success.
7. **Commit message**: one-line subject + multi-paragraph body explaining *why* (not what — the diff shows what). Reference session ID if the change relates to a tracked issue.
8. **Push**: `git fetch origin && git log HEAD..origin/main` — confirm no divergence before push (multi-agent push protocol).

If any step fails, the work is not done. Tell the user explicitly — don't quietly skip.

---

## 6. EXECUTION PATH VERIFICATION

The most expensive class of bug is the "fix in the wrong file" — code that type-checks, tests, and ships but never executes in the user's actual flow. Before writing ANY non-trivial fix:

1. **Find the entry point.** Which route loads for this scenario? `src/routes/(app)/form/{loanType}/+page.svelte` is usually it — but multi-applicant routes through `IncomePageNew.svelte` have **two render branches** (single-applicant tabs vs multi-applicant cards), and you must verify which one the user is hitting.

2. **Trace the render tree.** Grep the suspect file/component back to the route. If it's not in the import chain, your fix won't run. Examples that have burned us:
   - Editing `IncomePageNew` single-applicant branch when the user was in multi-applicant view
   - Adding `$effect` to `ApplicantFormSecured` for a Personal Loan flow (Personal uses `ApplicantFormUnsecured`)
   - Fixing `BasicInfoFields` for a Director scenario when `DirectorFormModal` renders its own copy

3. **Confirm data flow.** Which file *sets* the value you're reading? Which file *reads* what you're writing? Are they in the same component tree, or routed through `formState` / `applicantDataStore` / `userRelationships` store?

4. **For reactive logic** (`$effect`, `$derived`): confirm the component it lives in is mounted for the specific loan type / applicant type / flow being fixed. An `$effect` in `ApplicantProfilePage` only runs when that page is visible.

5. **Before claiming done**: do a static trace in plain English. *"This function is called from X → mounted by Y → renders for loan type Z + applicantType=Individual."* If you can't say this in one sentence, you haven't traced.

**E2E testing is expensive** — the user manually navigates 5+ minutes per scenario. Every false "fix is done" wastes that. Treat premature done-claims as serious failures.

---

## 7. TECH STACK

| Layer | Choice |
| --- | --- |
| Framework | SvelteKit 5 + Svelte 5 Runes (`$state`, `$derived`, `$effect`) |
| Language | TypeScript strict |
| Database | MongoDB native driver (no ORM) — 46 collections, 108 indexes |
| CSS | Tailwind CSS 4 |
| Mobile | Capacitor 7 (Android) |
| Auth | JWT (15m access + 7d refresh) + OTP via MSG91 |
| Uploads | ImageKit |
| PDF | pdf-lib (server-side) |
| Payments | Razorpay |
| Email | Nodemailer (see §8) |
| Logging | Pino via `$lib/server/logger` |
| Package manager | pnpm |

**Svelte 5**: always use `$state`, `$derived`, `$effect` in new components. No legacy stores. Bridge for legacy compat: `fromRune()` in `$lib/stores/_bridge.svelte.ts`.

---

## 8. PRODUCTION BLOCKERS

⚠️ Resolve before production launch. SEC-7 (credential rotation) deferred until beta per user decision (2026-04-22 — beta first, tighten ~10 days after). SEC-8 (email hardening) **bumped from beta-deferral to D.1-launch hard prerequisite** on 2026-05-25 per D.1 spec risk R15.

| # | Blocker | Required action | Gating event |
| --- | --- | --- | --- |
| 1 | Credentials in git history (SEC-7) | `.env` committed 19×. Rotate ALL credentials: Atlas, Razorpay, MSG91, ImageKit, JWT, HMAC, CSRF | Beta launch |
| 2 | Email service weak (SEC-8) — **FUNCTIONALLY LIVE 2026-05-27; AWS production-access pending** | Code: AWS SES v2 adapter + provider-routing facade + 12 tests (`src/lib/server/emailProviders/sesProvider.ts`, `src/lib/server/email.ts`). Operator setup ✅ complete end-to-end: SES identity verified (digitaldsa.com, ap-south-1), DKIM/SPF/DMARC DNS published in Vercel, IAM user + access key + policy (with `Resource: "*"` — see SES v2 IAM quirk in runbook Phase 3 Step 3.1), Vercel env vars set, first send confirmed 2026-05-27 16:18 IST. Currently in SES sandbox (verified recipients only); AWS Support case **177987930900751** open for production access (24-72hr review). Runbook: [`docs/runbooks/SEC-8-EMAIL-HARDENING-SETUP.md`](docs/runbooks/SEC-8-EMAIL-HARDENING-SETUP.md). | **D.1 recurring-billing launch** (S5 dunning can ship sandbox-test mode immediately; real-recipient sends gated on AWS approval) |

**Do not raise SEC-7 as a blocker during normal feature work** — user has explicitly deferred. **SEC-8 is functionally live**; D.1 S5 dunning is unblocked for sandbox-test work and ships fully when AWS approves production access (case 177987930900751).

---

## 9. RULE ENGINE

The core differentiator. 50+ bank policies evaluated via JSON-Logic.

**Components (7):**
- Eligibility gates
- Income assessment (12 types, multi-source, per-type haircuts: salaried 0%, self-employed 30%, rental 30%, etc.)
- EMI / FOIR / LTV calculations
- Deviation recovery (red → amber)
- Discomfort analysis

**Policy resolution**: 2-axis (product × geography), CSS-specificity model — most specific rule wins.
**Versioning**: SHA-256 hash, immutable, new versions never overwrite.

**NEVER simplify income profiling.** It is the business moat.
Deep dive: `docs/RULE-ENGINE-SPECIFICATION.md` (49KB) + `docs/ARCHITECTURE.md` Section 9.

---

## 10. FORM SYSTEM

### Structure

```
WizardSection → WizardSubsection → pageIds → Questions
```

### bindsTo Key Pattern (CRITICAL)

Form data is stored under **bindsTo keys**, NOT question IDs.

- `q4_propertyStateName` with `bindsTo_template: "propertyStateName"` → stored at `answers['propertyStateName']`
- `combinedAnswers` creates shorthand aliases (splits on `_`, takes last segment) — see Pitfall #13 for collision risk
- Always use the full bindsTo key in `getDynamicGuidance`, `caseRouteData`, showWhen lookups

### Multi-Select Auto-Clear Pattern

All 6 form pages have an `$effect` that auto-clears stale values when option-level `showWhen` hides selected options (see Pitfall #12 for parity rule):

- `multiple-select`: filter stale items from array (keep items whose options have no `showWhen` or whose `showWhen` still matches)
- `radio` / `select`: clear to empty string if selected value no longer visible
- `exclusive: true` on option: component enforces mutual exclusivity via `$effect` + `toggleOption()`
- `exclusive` field must exist on `Option`, `ClientOption`, AND `RawSchemaOption`, AND passed through `toClientOption()`

### Form Question System (TS Composition)

Each loan type: `src/lib/config/{loanType}/composer.ts` (assembles schema) → `pages.ts` (page definitions) → `questionBank/*.ts` (questions by page).
Shared: `src/lib/config/schema/` — `jsonLogicHelpers.ts` (`jl()` builder), `schemaTypes.ts` (`RawSchemaQuestion`, etc.).
Loader: `schemaLoader.ts` maps loan type → `compose{LoanType}Schema()`.

### DSA Guidance Format

```typescript
dsaGuidance: {
  summary: string;       // What this section does from DSA perspective
  keyPoints: string[];   // Key operational points
  watchFor: string[];    // Common pitfalls / red flags
  proTips: string[];     // Experienced DSA tips
}
```

Legacy format (`description` / `whyImportant` / `tips`) still works via fallback in `FormContextPanel`.

### Case Route Tracker Keys

- **Secured** (Home/LAP/Plot): `propertyStateName`, `propertyCityName`, `propCost`, `PropertyStage` (home only)
- **Unsecured** (Personal/Business): `residenceStateName`, `residenceCityName`, `loanAmount`
- **Professional**: `businessStateName`, `businessCityName`, `loanAmount`
- **Universal**: `loanName`, `__applicantCount`, `loanType`

---

## 11. PERMISSIONS & ROLES

| Role | Access |
| --- | --- |
| DSA | Owns cases, initiates all flows |
| RM | Partner access, full portal (16+5 features), does not initiate cases |
| Admin | System control |

- `activeRole` managed via cookie, resolved in `hooks.server.ts`
- Server-side validation only — client selection is advisory
- **Never delete role code** — soft-disable in UI only

---

## 12. DATA CLONING

| Scenario | Use | Why |
| --- | --- | --- |
| User-submitted / untrusted data | `securedClone()` from `$lib/utils/securedClone` | Prototype pollution defense, circular ref, depth limiting |
| Reactive `$state` → plain object | `$state.snapshot()` | Native Svelte 5, zero overhead |
| Trusted defaults / reset values | `structuredClone()` | Native JS, good for internal safe data |
| Shallow copy | Spread `{ ...obj }` | Simple, no deep nesting needed |
| Immutable audit snapshot | `securedFreeze()` from `$lib/utils/securedClone` | Deep clone + `Object.freeze` |
| Deep equality check | `securedEquals()` from `$lib/utils/securedClone` | Handles nested objects, Dates, Maps, Sets |

**Never:**
- `JSON.parse(JSON.stringify())` — loses Dates, Maps, Sets, undefined
- Mix cloning with PII stripping — PII filtering is at output boundaries (`fileConfigurator.ts`)

---

## 13. ARCHITECTURE DECISIONS (LOCKED)

| # | Decision | What it means |
| --- | --- | --- |
| AD-01 | DSA primary, RM passive intake | DSAs own cases. RMs are bank partners with full portal, don't initiate. |
| AD-02 | Cases wrap immutable snapshots | Form edits = new versions (SHA-256), never overwrite. Full audit trail. |
| AD-03 | File Builder is derived | DSA controls show/hide/reorder, NOT financial numbers. |
| AD-04 | RM database centralized | Crowdsourced from all DSAs, shared globally. Not competitive. |
| AD-05 | Every edit = new version | Immutable. Snapshots never deleted. |
| AD-06 | v1 PDF never has PII | System-enforced. Name/PAN/Aadhaar/address always redacted. |
| AD-07 | CRM optional | Platform usable without CRM features. |
| AD-08 | Sample data on onboarding | 4 demo cases (`is_sample: true`) pre-loaded for new DSAs. |
| AD-09 | Guest demo mode | In-memory, no MongoDB needed. |
| AD-10 | RM Portal full-featured | 16+5 features, not just a data viewer. |
| AD-11 | Disclaimers server-enforced | 7 points in PDF footer. Not optional. |
| AD-12 | RM value screens | 4 pre-onboarding screens showing RM benefits. |
| AD-13 | Language: English default | Native Devanagari for Hindi/Marathi. Colloquial, not formal. |
| AD-14 | Anti-scraping (8 layers) | Silent fingerprinting, session tracking, trust scoring, honeypots, XOR `showWhen` encoding. |

---

## 14. KEY FILE PATHS

Full lookup at [`docs/FILE-MAP.md`](docs/FILE-MAP.md) (extracted 2026-06-02). Covers the "I need to..." table + sub-system path maps (server utilities, company/director, rule engine, form wizard, i18n, docs read order, session lifecycle).

Read FILE-MAP.md when you need to find WHERE something lives. Paths drift across refactors, so prefer this lookup over memorized paths.


## 15. TOOLING CONVENTIONS

When writing API routes (`+server.ts`):
- **Always use `apiOk()` / `apiError()` / `apiServerError()`** — never `new Response(JSON.stringify(...))`
- **Always use `logger`** from `$lib/server/logger` — never bare `console.log/error/warn`
- **Always use guards** from `$lib/server/guards` for auth/permission (`requireAuth`, `requireRole`, `requireAuthApi`)
- **Always use `parseJsonBody()`** for request body parsing — handles malformed JSON cleanly
- **Always use the rate limiter** from `$lib/server/rateLimiter` for state-changing or expensive endpoints

When writing client code (`.svelte`, `.svelte.ts`, `lib/utils/`):
- **State-changing requests** (POST/PUT/DELETE/PATCH) must use `secureFetch` from `$lib/utils/csrf` — raw `fetch` will 403 on the CSRF check (burned us 4× across S88/S89)
- **No `fetch` at module scope** (Pitfall #4)
- **No `typeof window` guard** (Pitfall #9)
- **No `JSON.parse(JSON.stringify())`** (see §12)
- **`$state(propX)` requires `$derived` or `// svelte-ignore`** (Pitfall #10)

When writing tests (`*.test.ts`):
- All tests live under `src/lib/testing/__tests__/` (vitest config glob)
- Snapshot fixtures: `src/lib/testing/__tests__/factory/__snapshots__/*.pre-migration.json` — see Pitfall #11
- Run subset: `pnpm test:unit -- --run path/to/file.test.ts`

### Commands

```bash
pnpm dev
pnpm check                      # type check (svelte-check)
pnpm test:unit                  # vitest
pnpm test:unit -- --run         # vitest single-pass
pnpm test:e2e                   # playwright
pnpm build
pnpm preview                    # http://localhost:4173
```

---

## 16. HARD RULES (PROCESS)

These are non-technical operational rules. Violating any of these is a serious failure.

1. **Branch `main` only** — never create or switch branches without explicit user request
2. **Never add `Co-Authored-By` lines** to commits
3. **Never modify `.git/config`** — use inline `git -c user.name='...' user.email='...'` if needed
4. **Never delete files** — move to `_archive/` instead (CLAUDE.md `_archive/` for old components, `_archived/` for routes)
5. **Never delete multi-role code** — soft-disable in UI only (preserves DSA/RM/Admin path coverage)
6. **Never use `git push --force` to `main`** — warn the user, require explicit acknowledgement
7. **Always `git fetch origin && git log HEAD..origin/main`** before push (multi-agent push protocol — teammate stale clones have resurrected old commits 3×)
8. **Always update `docs/DEVELOPMENT-PLAN.md`** after completing a tracked task
9. **Always update `docs/CHANGELOG.md`** with a session entry after any non-trivial commit
10. **Numbers are immutable in the file builder** — DSA controls presentation, never financial values
11. **Fix at source, not in consumers** — when a field key is renamed, do it in one canonical place rather than sprinkling fallbacks across consumers. The original applicant-record migration helper (`src/lib/utils/_archive/migrateApplicantKeys.ts`) was archived as part of the 2026-05-31 loan-field nomenclature rename. For form-level field renames going forward, do a hard-cut at the canonical write+read sites in one PR (see ADR-0020 + `docs/specs/LOAN-FIELD-NOMENCLATURE-EXECUTION-PLAN.md` for the pattern), not a sprinkled-fallback retrofit.
12. **Explain before coding** — for any non-trivial change, describe what/why/how in plain English before writing code
13. **`main` requires linear history** — no merge commits allowed (enforced by pre-push husky hook in `.husky/pre-push`). Use `git cherry-pick` or `git rebase` instead of `git merge` when bringing branches in. The hook's `SKIP_PUSH_GUARD=1` bypass exists but is admin-only — never use without explicit owner approval.
14. **No new files without justification** — before creating any `.ts` / `.svelte` / `.json` / `.md` file, answer "Why doesn't this fit in an existing file?" If the answer is just "cleaner as its own file" without a specific architectural reason (separate concern, separate test scope, separate import boundary), add to an existing file instead. Legitimate exceptions (document in commit body): new lock tests that replace recurring manual audit work, new ADRs that codify sunset triggers, new modules representing a genuinely new architectural concern. The repo accumulates debt one "small extra file" at a time; this rule keeps the file count honest.
15. **No "kept for back-compat" comments without a dated ADR sunset trigger** — every `// legacy`, `// pre-rename`, `// for back-compat`, `// kept for X` is the next maintenance burden when context has decayed. If you can't delete the legacy path in the current change, write an ADR with a concrete sunset trigger (specific date or specific event) and reference it from the comment. Vague back-compat comments are how this codebase accumulated the 2026-05-31 cleanup debt; don't reintroduce that pattern. Example of the wrong form: `// legacy value, kept for backward compat`. Example of the right form: `// Sunset when bank-loan-management API resumes — see ADR-NNNN`.
16. **Lock tests guard the canonical state, not the current state** — when adding a regression-lock test (e.g., a test that asserts a specific string / pattern survives across changes), confirm the assertion matches what the code SHOULD do after cleanup, not just what it does today. A lock test that ratifies a transitional or patched state gives false confidence — it makes the bug into a feature. The 2026-05-31 audit found `dualTenureBTTopup.test.ts` had locked `'BT + Top-up'` while the canonical value was `'Balance Transfer With Top-up'`; the engine gate silently never fired in production for months because the test ratified the broken string. Before writing a lock test, ask: "If I clean this up six months from now, does this assertion still hold?"

---

## 17. DOC HYGIENE META-RULES

**These rules exist to prevent CLAUDE.md and MEMORY.md from drifting into bloat, contradiction, or staleness over time.**

### Single source of truth — what lives where

| Category | Lives in |
| --- | --- |
| Technical patterns / pitfalls / grep recipes | **CLAUDE.md** (this file) |
| User process preferences (PowerShell, never delete, etc.) | **MEMORY.md** |
| Current branch state, test counts, in-flight work | **`docs/SESSION-HANDOFF.md`** |
| Pending work / roadmap | **`docs/DEVELOPMENT-PLAN.md`** |
| Per-session detailed log | **`docs/CHANGELOG.md`** |
| Long-form architecture / spec docs | **`docs/*.md`** and **`docs/specs/*.md`** |

If a fact appears in two places, the table above decides which is canonical. The other is a one-line *pointer*, not a copy.

### When to ADD a pitfall to §3

A new pitfall earns inclusion only if all four of these are true:
1. **It actually happened** — caused a real bug, not a hypothetical
2. **It's recurrent or class-wide** — likely to happen again in similar code
3. **It has a grep pattern** — there's a 5-second scan to detect new occurrences
4. **It has a wrong/right code example** — concrete, copy-pasteable

If any of those are missing, it's not a pitfall yet — it's a one-off. Put it in `docs/CHANGELOG.md` and revisit if it recurs.

### When to REMOVE a pitfall from §3

Never delete. Mark obsolete:
```markdown
### #N. <title>  (verified obsolete YYYY-MM-DD — <reason>)
```

The mechanism may be gone, but the institutional memory of why it was a problem helps future reviewers understand similar patterns.

### When to UPDATE a pitfall

Each pitfall has a `**Last verified**: YYYY-MM-DD` line. Whenever you confirm the pattern is still active (e.g., it bit you again, or you ran the grep and found new instances), update that date. Pitfalls without a verification date in 6+ months should be re-checked.

### CLAUDE.md size limits

CLAUDE.md auto-loads on every session — every byte here is a byte unavailable for session work. Claude Code has no documented hard limit, so the discipline is purely about signal/noise and token economy.

- **Soft target: 1,200 lines / 60 KB.** When approaching this, propose splitting `§3 Critical Pitfalls` (now in [`docs/PITFALLS.md`](docs/PITFALLS.md)) or `§14 Key File Paths` into sub-docs — don't just keep growing inline.
- **Suggestion, not blocker.** A 5-10% breach for a single well-justified addition is fine; recurring breaches mean it's time to split.
- **§3 was split into `docs/PITFALLS.md` on 2026-05-16** when CLAUDE.md exceeded 1,790 lines (~50% over target). The §3 stub now carries only the indexed table of titles + a pointer; the catalog (full wrong/right/why/detection bodies) lives in PITFALLS.md and is read on-demand. **Add new pitfalls to `docs/PITFALLS.md` and append a row to the §3 table here** — keep the index in lockstep.
- **No "current state" or counts** in CLAUDE.md — those go in `SESSION-HANDOFF.md`. CLAUDE.md is durable architectural truth.
- **No per-session changelog entries** — those go in `CHANGELOG.md`.
- **No project-specific feature roadmaps** — those go in `DEVELOPMENT-PLAN.md` or `docs/specs/`.

### MEMORY.md size limits

Claude Code auto-loads the first **200 lines / 25 KB** of MEMORY.md — past that, content is silently dropped from the startup load (topic files still work on-demand).

- **Soft target: 200 lines / 20 KB.** Leaves a ~20% buffer below the actual harness limit. Past 25 KB, rules silently stop loading.
- **Suggestion, not blocker.** Brief excursions are fine. When you cross 22 KB regularly, consider moving rule sets into topic files (`feedback_*.md` / `project_*.md` / `reference_*.md`) and replacing the MEMORY.md entry with a one-line pointer.
- MEMORY.md owns standing user preferences ONLY. State, history, plans → other docs.

### Cross-reference, don't copy

If a rule belongs in CLAUDE.md, MEMORY.md should say *"see CLAUDE.md Pitfall #N"* — never restate the rule. When the rule changes, you only edit CLAUDE.md.

### Adding a new memory file under `~/.claude/.../memory/`

OK to add a new specific-topic memory file when:
- Topic is large enough to deserve its own file (>1 KB of content)
- You'll reference it from MEMORY.md's "Memory Files" index with a one-line description
- It's prefixed: `feedback_*` (user preference), `project_*` (active project notes), `reference_*` (reference data)

Not OK:
- Creating a new file for content that fits in MEMORY.md
- Forgetting to index the new file from MEMORY.md

### Frontmatter convention for specs / ADRs / reviews / runbooks

Every NEW doc under `docs/specs/`, `docs/adr/`, `docs/reviews/`, or `docs/runbooks/` MUST start with YAML frontmatter:

```yaml
---
type: spec | adr | review | runbook
epic: <epic id like D-1, E-2, SEC-8 — or "none">
status: draft | proposed | active | shipped | superseded | obsolete | abandoned
last_verified: YYYY-MM-DD
related_specs: [<filename or slug>, ...]   # optional
related_adrs: [ADR-NNNN, ...]              # optional
test_coverage: [<test file path>, ...]     # optional
owner: tech@digitaldsa.com
---
```

Only `type` + `status` are required. Empty arrays may be omitted.

`docs/specs/INDEX.md` and `docs/reviews/INDEX.md` are regenerated at `/end` from frontmatter blocks. Files without frontmatter fall back to file mtime + first H1 — lossy but functional. Backfill is **opportunistic**: add frontmatter the next time you touch the file, not in a sweep.

ADRs that ship a code pattern MUST link their lock test in `test_coverage:` before `status:` can move past `proposed`. This is the §17 enforcement of CLAUDE.md §13 ADR durability.
