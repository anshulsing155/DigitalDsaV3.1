---
type: convention
status: active
last_verified: 2026-06-02
owner: tech@digitaldsa.com
---

# Code Rules — The Locked List

These are non-negotiable. Listed once, enforced by tooling where possible. Violations block CI.

## The 20 rules

| # | Rule | Why | How enforced |
|---|---|---|---|
| 1 | **One way to do each thing.** If a pattern exists, use it. Don't invent a parallel approach. | Codebase consistency | Code review |
| 2 | **No raw MongoDB queries outside `repository.ts`.** All DB access via repositories. | Testability, swappability | ESLint rule + code review |
| 3 | **No `console.log`. Use `logger`.** Logger refuses PII fields. | Data-leak prevention | ESLint rule banning `console` |
| 4 | **No raw `fetch` for POST/PUT/DELETE.** Use `secureFetch` (CSRF token, auth header). | CSRF protection | ESLint rule |
| 5 | **Every route declares `capability_required`.** | Modular switches work | Build script grep + CI check |
| 6 | **Every PII field uses `Encrypted<T>` type.** | Compile-time PII discipline | TypeScript compiler |
| 7 | **No new dependencies without a `WHY-DEP.md` line.** | Bundle and supply-chain hygiene | PR template + review |
| 8 | **Aadhaar always masked on display.** Use `<MaskedAadhaar>` component. | Compliance (SEC-1) | Lock test on PDF/UI render |
| 9 | **Every mutation writes a timeline event.** | Audit trail | Service-layer convention; lint warns |
| 10 | **Every API endpoint scoped by `org_id` by default.** | Multi-tenant isolation | Repository convention; BOLA tests |
| 11 | **Tests required for every new service method.** Coverage gate per file. | Quality | CI coverage check |
| 12 | **Migrations forward-only with rollback documented.** | Safety | Migration script template + review |
| 13 | **Mobile + desktop both shipped in every PR.** | Parity | PR checklist |
| 14 | **Commit subject under 70 chars; body explains why (not what).** Conventional commits format. | Reviewability | commitlint + review |
| 15 | **No `JSON.parse(JSON.stringify())`.** Use `structuredClone` or proper cloners. | Data integrity (Dates, Maps, Sets) | ESLint rule |
| 16 | **No `typeof window` SSR guards.** Use proper SvelteKit patterns. | SSR correctness | ESLint rule + code review |
| 17 | **No PII in URLs, headers, or query strings.** Only opaque IDs. | Data-leak prevention | Lint + code review |
| 18 | **No client-side AI / LLM calls.** If AI is used, server-side with PII redaction. | Data sovereignty | Code review + dependency ban list |
| 19 | **No emojis in code, comments, file names, or commit messages** unless explicitly requested by the user/owner. | Style preference | Lint warning |
| 20 | **One file = one concern.** When a file passes 300 lines or handles two unrelated topics, split it. | Maintainability | Code review |

## How the rules are enforced

### Compile-time (TypeScript)

- `Encrypted<T>` brand prevents PII from being assigned where strings are expected
- `Loggable` interface prevents PII from being passed to logger
- Strict mode catches null/undefined errors

### Lint-time (ESLint)

Custom rules in `packages/config/eslint/`:

- `no-raw-mongo`: bans `db.collection(...)` outside `repository.ts` files
- `no-console`: bans `console.log/warn/error`
- `no-raw-fetch-mutations`: bans `fetch()` with POST/PUT/DELETE/PATCH method outside `secureFetch`
- `require-capability`: any `+server.ts` or `+page.server.ts` under `/dashboard/` must export `capability_required`
- `no-json-stringify-parse`: bans the anti-pattern
- `no-typeof-window`: bans the SSR check anti-pattern
- `no-pii-in-url`: heuristic ban on customer/mobile/pan strings in URL constructions

### Pre-commit (Lefthook)

- Format with Prettier
- Type-check the staged files
- PII pattern scan (12-digit, mobile-shaped, PAN-shaped strings)
- Aadhaar masking lock-test on changed PDF/display paths
- Conventional Commits message format check

### CI (GitHub Actions)

- Full type-check across monorepo
- Full test run
- Lint check
- Bundle size budget enforcement
- PR checklist verification
- Migration safety (forward + rollback for schema changes)
- BOLA isolation tests on new endpoints

### Nightly

- PII audit on past 24h of logs
- Sentry event scan for PII leakage
- Dependency vulnerability scan
- Bundle size trend report

## Naming conventions

| Thing | Convention | Example |
|---|---|---|
| Files | kebab-case | `customer-card.svelte`, `find-or-create.ts` |
| Folders | kebab-case | `corp-dsas/`, `follow-ups/` |
| TypeScript types/interfaces | PascalCase | `Customer`, `CreateLeadInput` |
| Functions/methods | camelCase | `findByMobileBlindIndex`, `createLead` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_RETRY_ATTEMPTS`, `DEFAULT_PAGE_SIZE` |
| MongoDB collections | snake_case | `customers`, `case_documents` |
| Database fields | snake_case | `org_id`, `created_at`, `blind_index` |
| Capability keys | dot.case | `module.commission`, `loan.home` |
| ENV vars | SCREAMING_SNAKE_CASE | `MONGO_CONNECTION_STRING`, `JWT_SECRET` |
| Test files | `<name>.test.ts` next to source | `service.test.ts` |
| Git branches | kebab-case with prefix | `customers/add-cross-case-dedup`, `bug/aadhaar-mask-on-preview` |

## File size guideline

| Lines | Action |
|---|---|
| 0-200 | Healthy |
| 200-300 | Watch — consider splitting |
| 300-500 | Should be split unless genuinely cohesive |
| 500+ | Must be split or justified in PR |

Use directory structure to express composition. A `domains/customers/` with 8 files of 100 lines each is preferable to one 800-line file.

## Comment discipline

- **No comments that restate what the code does.** Bad: `// Increment counter`. The code already says that.
- **Comments explain why, not what.** Good: `// Use normalised mobile for blind index because formatting varies — see ADR-0003.`
- **No commented-out code.** Delete it. Git has the history.
- **No TODO without owner and date.** Bad: `// TODO: fix this later`. Good: `// TODO(amit, 2026-07-01): handle the case when the user has no employment record.`
- **No "for back-compat" comments without an ADR sunset trigger.** This is V3 lesson — vague legacy notes accumulate into months of cleanup debt.

## Imports order

```typescript
// 1. External packages
import { ObjectId } from 'mongodb';
import { z } from 'zod';

// 2. Workspace packages
import { Button } from '$ui/primitives/Button.svelte';
import type { Encrypted } from '$types/primitives';

// 3. Domain imports (closest to current file first)
import { CustomersRepository } from './repository';
import { ConversationsService } from '$domains/conversations/service';

// 4. Local relative imports
import { formatMobile } from './utils';
```

Lint-fixed automatically.

## Related docs

- [02-TYPESCRIPT-PATTERNS.md](02-TYPESCRIPT-PATTERNS.md) — Encrypted<T>, Zod patterns in depth
- [03-TESTING-STRATEGY.md](03-TESTING-STRATEGY.md)
- [04-PR-PROCESS.md](04-PR-PROCESS.md)
- [../04-security/01-PII-DISCIPLINE.md](../04-security/01-PII-DISCIPLINE.md)
