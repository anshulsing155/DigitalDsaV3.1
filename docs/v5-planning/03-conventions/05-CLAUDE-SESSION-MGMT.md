---
type: convention
status: active
last_verified: 2026-06-02
owner: tech@digitaldsa.com
---

# Claude Session Management

## Why this is its own doc

V3 grew to ~50KB of auto-loaded documentation across CLAUDE.md, MEMORY.md, and various sidecars. Every Claude session paid that cost. With just two of us building V5 and the team running V3, session efficiency matters even more — we operate Claude all day.

V5 starts with deliberate session discipline.

## The four kinds of docs

| Kind | Lives in | Loaded by Claude when |
|---|---|---|
| **Always-on** | `CLAUDE.md` at root | Every session, automatically |
| **Domain-specific** | `domains/<x>/CLAUDE.md` | Only when working in that domain (nested CLAUDE.md is auto-loaded by Claude when files in that path are touched) |
| **Spec docs** | `docs/SPECS/SPRINT-X.md` | Read on demand by us or by `/spec` |
| **Reference** | `docs/PITFALLS.md`, `docs/FILE-MAP.md` | Never auto-loaded; read on demand only |

## Auto-load budget

| Doc | Target | Hard limit |
|---|---|---|
| `CLAUDE.md` (root) | 15 KB | 25 KB |
| `CLAUDE.md` (domain) | 5 KB | 10 KB |
| `docs/SESSIONS/CURRENT.md` (handoff) | 3 KB | 5 KB |
| **Total auto-load per session** | **23 KB** | **40 KB** |

This is the discipline. CLAUDE.md doesn't accumulate "everything ever decided" — it carries the always-on rules. Decisions land in ADRs; historical patterns go in PITFALLS. CLAUDE.md just points.

## Slash commands

V5 ships with these commands in `.claude/commands/`:

### `/start`

Opens a session. Reads `docs/SESSIONS/CURRENT.md` (the current handoff), summarises:
- Branch SHA
- In-flight work
- Open decisions waiting
- Top 3 next actions

Then presents a numbered menu: "What do you want to do?"

### `/end`

Closes a session. Audits work done in the session:
- Files changed
- Decisions made
- ADRs that should be created
- Drift from docs

Proposes updates to:
- `docs/SESSIONS/CURRENT.md` (new state)
- `docs/CHANGELOG.md` (session entry)
- Any domain `CLAUDE.md` that needs a new pitfall
- `docs/SPECS/...` (sprint progress)

Applies on approval.

### `/sync`

Pulls latest from main and summarises new commits since last session. Useful when restarting after a few days away.

### `/review-queue`

Shows pending PRs with risk grades. Walks through approve / request-changes / reject per PR.

### `/spec [sprint-name]`

Drafts a sprint spec doc from template + recent planning conversation.

### `/principle12 [feature]`

Runs the four-question gate on a proposed feature. Used at design time, not just PR time.

### `/handoff`

Writes a session handoff for the next person (or next us-session).

### `/new-domain [name]`

Scaffolds a new `domains/<name>/` folder with all 5 layers stubbed (schema, types, repository, service, routes), tests directory, and CLAUDE.md template.

### `/migrate-collection [name]`

Generates a migration script template (forward + rollback) for a MongoDB collection change.

## Skills

Reusable workflows committed to `.claude/skills/`:

| Skill | What it does |
|---|---|
| `add-domain-method` | Walks through adding a new service method end-to-end: schema → repo → service → route → tests |
| `add-route` | Scaffolds a new route with capability key + handlers + tests |
| `audit-pii` | Scans codebase for PII handling issues |
| `migrate-data` | Helps design a forward + rollback migration |
| `review-pr` | Performs a code review of the current branch |
| `daily-review` | Runs the daily tier-1/2/3/4 grep rules |
| `claude-code-guide` | Helps with Claude Code itself (hooks, slash commands, etc.) |

## Per-domain CLAUDE.md

Each `domains/<name>/CLAUDE.md` is small (target 5KB) and explains:
- What this domain is responsible for
- Key entities and relationships
- Common pitfalls when working here
- Cross-domain dependencies
- Where the tests live

Auto-loaded when Claude reads/edits files in that domain.

Example:

```markdown
---
domain: customers
auto-load: true
---

# Customers Domain — Claude Execution Context

## What this domain owns
The Customer master entity. One Customer has many Cases, many Conversations, many Documents.

## What this domain does NOT own
- Cases themselves (see domains/cases)
- The Conversation entity (see domains/conversations)
- KYC document storage (see domains/documents)

## Key invariants
- A Customer is uniquely keyed by (org_id, mobile.blind_index)
- A Customer is never deleted — only marked archived
- KYC reuse across cases requires explicit consent (see DPDP doc)

## Common pitfalls
- Don't query the Mongo collection directly — go through CustomersRepository
- Don't compare customer mobiles as strings — compare blind indexes
- Cross-org access must always return null, never throw

## Where to add things
- New schema field: `schema.ts` then update `repository.ts.create()`
- New service method: `service.ts` with `Result<T, E>` return
- New API surface: register in `routes.ts` with `capability_required`
- New test: `__tests__/<area>.test.ts`
```

## Session handoff

`docs/SESSIONS/CURRENT.md` is the always-current handoff. Updated automatically by git hooks on every commit. Read first thing every session.

Format:

```markdown
---
last_updated: 2026-09-15T16:42:00+05:30
last_commit_sha: abc1234
branch: main
---

# Current Session State

## Branch
main @ abc1234

## In-flight work
- Sprint 1 Day 3: Customer entity migration script
- Open PR #142 (Customer search filter) waiting for review

## Last completed
- Sprint 1 Day 2: CustomersRepository.findByMobileBlindIndex shipped

## Next 3 actions
1. Finish migration script (~2 hours)
2. Review PR #142 (~10 min)
3. Start Sprint 1 Day 4: Customer profile page UI

## Open decisions
- D-7 (DPDP consent wording) — legal review pending Friday
- D-9 (Editorial review window) — owner sign-off needed

## Things to watch
- ClickHouse self-host setup in Sprint 7 needs prep work — book ops time
```

## Reactive doc updates

Git hooks keep docs synced:

| Trigger | What updates |
|---|---|
| Every commit | `docs/SESSIONS/CURRENT.md` (SHA, files changed) |
| Every PR merge | `docs/CHANGELOG.md` (session entry); sprint spec marked progress |
| New ADR file | `docs/ADR/INDEX.md` regenerated |
| New spec file | `docs/SPECS/INDEX.md` regenerated |
| New domain folder | Root `CLAUDE.md` domain-list updated |

When next session starts, `/start` reads docs that are **already current**. No manual sync. No drift.

## Token-efficient patterns

### Use `Explore` agent for lookups

"Where is X defined?" type questions: launch the `Explore` agent. It's cheaper than letting the main session read files.

### Use background agents for long tasks

Migration script generation, test-suite running, large refactors: spawn as a background agent. Main session continues with other work.

### Sub-agent code review

After writing significant code, run `/review` on it. Catches mistakes before they reach a real review.

### Use `claude --headless` for batch repetitive tasks

Linting fixes, batch type updates, codemod runs: headless mode is cheaper than interactive.

### Pick the right model per task

- **Sonnet** for most coding, review, and planning
- **Opus** reserved for hard reasoning (architecture decisions, complex debugging)
- **Haiku** for batch lookups, simple transformations

## When CLAUDE.md is approaching the budget

CLAUDE.md naturally grows. When it crosses 22KB:

1. Identify the biggest section
2. Move its content to a sidecar (e.g., `docs/PITFALLS.md`)
3. Leave a one-line pointer: "Pitfalls catalog: see `docs/PITFALLS.md`"
4. Sidecars don't auto-load

This keeps the auto-load lean while the knowledge stays accessible.

## What goes in CLAUDE.md vs. where

| Content | Lives in |
|---|---|
| 20 code rules summary | CLAUDE.md (full list in `03-conventions/01-CODE-RULES.md`) |
| Done checklist | CLAUDE.md (pointer to PR template) |
| Domain inventory (one line each) | CLAUDE.md (pointer to per-domain docs) |
| Current branch state | `docs/SESSIONS/CURRENT.md` |
| Pitfalls catalog | `docs/PITFALLS.md` (sidecar) |
| File map | `docs/FILE-MAP.md` (sidecar) |
| User preferences | MEMORY.md (user's auto-memory) |

## Related docs

- [01-CODE-RULES.md](01-CODE-RULES.md)
- [../../CLAUDE.md] — the always-on doc (will live at V5 repo root)
