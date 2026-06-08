---
type: reference
status: active
last_verified: 2026-06-02
owner: tech@digitaldsa.com
extracted_from: CLAUDE.md
section: "§14 — Key File Paths"
---

# File Map — Where Things Live

This file holds the "I need to..." lookup table + sub-system path map that used to live in CLAUDE.md §14. Loaded on-demand when finding code; not auto-loaded (paths drift across refactors, and the lookup is mostly only needed at the start of a task).


| I need to... | Look at... |
| --- | --- |
| Understand auth flow | `src/hooks.server.ts` |
| Add/modify a form question | `src/lib/config/{loanType}/questionBank/` |
| Add new income type | All 6 files in `src/lib/config/incomeProfiles/` |
| Add rule engine feature | `src/lib/ruleEngine/evaluationEngine.ts` |
| Create new API endpoint | `src/routes/api/{domain}/+server.ts` |
| Add dashboard page | `src/routes/dashboard/{role}/{page}/+page.svelte` |
| Modify company/director flow | `src/lib/components/Director*.svelte` + `applicantFormManager.svelte.ts` |
| Modify wizard sidebar/guidance | `src/lib/config/wizardSections/{loanType}.ts` + `FormContextPanel.svelte` |
| Modify form shell/tracker | `src/lib/components/form-wizard/FormShell.svelte` |
| Find current plan / state | `docs/SESSION-HANDOFF.md` (state) + `docs/DEVELOPMENT-PLAN.md` (plan) |
| Architecture deep dive | `docs/ARCHITECTURE.md` + `docs/RULE-ENGINE-SPECIFICATION.md` |
| Form → API data mapping | `docs/PAYLOAD_DOCUMENTATION.md` |
| External API contract | `docs/LOAN-ASSESSMENT-API-INTEGRATION.md` |
| Credit risk feature design | `docs/specs/CREDIT-RISK-INTELLIGENCE-SPEC.md` |
| Bug fix protocol | `docs/ISSUE-RESOLUTION-PROTOCOL.md` |
| Anti-scraping internals | `engine.ts` (encode) · `showWhenDecoder.ts` (decode) · `showWhenEngine.ts` (wrapper) · `formGuard.ts` (budget) |

### Server Utilities (use in ALL API routes)

- `$lib/server/apiResponse.ts` — `apiOk()`, `apiError()`, `apiServerError()`, `apiOkMessage()`, `parseJsonBody()`
- `$lib/server/logger.ts` — Pino structured logger
- `$lib/server/guards.ts` — 9 auth/permission guard functions
- `$lib/server/rateLimiter.ts` — centralized rate limiting
- `$lib/server/formGuard.ts` — anti-scraping: rate limiting, trust scoring, session budget
- `$lib/config/routes.ts` — centralized route constants (single source of truth for ALL navigation paths)

### Company / Director system (high-change-frequency)

Components: `DirectorCards.svelte` · `DirectorFormModal.svelte` · `DirectorCountPicker.svelte` · `DirectorRemovePickerModal.svelte` · `CompanyBusinessProfile.svelte` · `CompanyFinancials.svelte` · `CompanyIncomeTab.svelte`
Orchestrator: `applicantFormManager.svelte.ts` — `commitDirectorsToApplicants()`, cross-company matching, dedup at 3 layers
Utilities: `directorAutoIncome.ts` · `directorFormUtils.ts` · `directorRestoreHandler.ts` · `familyControlDerivation.ts`

### Rule Engine (`src/lib/ruleEngine/`)

`evaluationEngine.ts` · `incomeAssessor.ts` · `payloadEnricher.ts` · `resultBuilder.ts` · `discomfortAnalyzer.ts` · `systemConfig.ts`

### Form Wizard (`src/lib/components/form-wizard/`)

`FormShell.svelte` · `FormContextPanel.svelte` · `CaseRouteSummary.svelte` · `FormSidebar.svelte` · `FormNavigationBar.svelte` · `MobileContextSheet.svelte`

### i18n (`src/lib/i18n/`)

374 keys each for `en.ts`, `hi.ts`, `mr.ts`. Helpers: `t()`, `tPlural()`, `formatNumber()`, `formatCurrency()` (₹12.3L / ₹1.5Cr), `formatTimeAgo()`.

### Docs (read in order)

| Doc | Purpose |
| --- | --- |
| `docs/SESSION-HANDOFF.md` | **READ FIRST** — current state, branch SHA, in-flight work |
| `docs/ARCHITECTURE-EVOLUTION.md` | Long-term architectural roadmap (consumed by `/start`, updated by `/end`) |
| `docs/DEVELOPMENT-PLAN.md` | Tactical "next up" roadmap — feature/session-level work items |
| `docs/CHANGELOG.md` | Per-session log (append-only) |
| `docs/adr/` | Architecture Decision Records (immutable; see `docs/adr/README.md`) |
| `docs/ARCHITECTURE.md` | System deep-dive (41KB) |
| `docs/RULE-ENGINE-SPECIFICATION.md` | Rule authoring/evaluation (49KB) |
| `docs/PAYLOAD_DOCUMENTATION.md` | Form→API data mapping (22KB) |
| `docs/LOAN-ASSESSMENT-API-INTEGRATION.md` | External API contract (39KB) |
| `docs/ISSUE-RESOLUTION-PROTOCOL.md` | 9-step screenshot-based bug-fix process |
| `docs/specs/` | Future feature specs (unimplemented) |
| `docs/reviews/` | Dated code reviews for the team |

### Session Lifecycle System

Slash commands: `.claude/commands/start.md` (`/start` — session opener), `.claude/commands/end.md` (`/end` — atomic close).
Per-task protocols: `.claude/protocols/{zod-migration,bola-audit,load-migration,evolution-item,code-review-fix}.md`.
Hooks: `.claude/hooks/session-state.py` (SessionStart banner), `.claude/hooks/protocol-guards.py` (PreToolUse Bash guards).
See ADR-0003 for full rationale.

---

