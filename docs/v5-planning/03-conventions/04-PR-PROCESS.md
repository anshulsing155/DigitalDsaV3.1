---
type: convention
status: active
last_verified: 2026-06-02
owner: tech@digitaldsa.com
---

# PR Process — Template, Gates, Review Queue

## The PR template (auto-attached)

Every PR opens with this template filled in. Engineers cannot submit without ticking the boxes.

```markdown
## What changes
[1-2 lines — describe in plain English]

## Why
[1-2 lines — the user/business problem this solves]

## Self-verification done
- [ ] Type-check green locally (`pnpm type-check`)
- [ ] Tests pass locally (`pnpm test`)
- [ ] Lint clean (`pnpm lint`)
- [ ] Mobile + desktop layouts checked (screenshots attached below)
- [ ] Capability key declared (if new route)
- [ ] No PII in logs (manual grep)
- [ ] Aadhaar masking verified on display paths
- [ ] Migration script tested forward + back (if schema change)
- [ ] Storybook story added (if new UI component)

## Principle 12 four-question gate
**Required for every PR. If Q4 = "yes", PR cannot merge without owner approval.**

1. **Does this help the DSA earn more?** [Yes/No/N/A — explain]
   - [Your answer]

2. **Does this help the DSA work faster?**
   - [Your answer]

3. **Does this strengthen the DSA-customer relationship?**
   - [Your answer]

4. **Could this feature ever bypass the DSA?** (let a lender, builder, partner, customer, or DigitalDSA itself transact around them)
   - [Must be **No**, with reasoning]

## Risk grade
- [ ] Low — UI tweaks, copy changes, isolated bug fixes (~5 min review)
- [ ] Medium — service logic, new endpoints, dependency additions (~15 min review)
- [ ] High — schema migrations, auth changes, money flows, encryption (~30 min review + paired)

## Reviewer focus
[Tell us where to look first — saves time]

## Screenshots / videos
[Mobile viewport (375x667)]
[Desktop viewport (1440x900)]
[Video if touch interaction added]
```

## CI gates (auto-run on every push)

These run before any human review. If any gate fails, the PR is sent back to the engineer with a clear failure reason.

| Gate | What it checks | Blocks PR? |
|---|---|---|
| 1. Type-check | `tsc --noEmit` across monorepo | Yes |
| 2. Lint | ESLint + custom rules | Yes |
| 3. Tests | All Vitest tests pass | Yes |
| 4. Coverage | New service code ≥ 80% line, ≥ 90% branch | Yes |
| 5. Format | Prettier clean | Yes |
| 6. Bundle size budget | Per-route JS bundle within budget | Yes |
| 7. PII-in-logs scan | Grep + AST scan for PII patterns in logger calls | Yes |
| 8. Capability key declaration | Every new `+server.ts` / `+page.server.ts` exports `capability_required` | Yes |
| 9. Aadhaar masking lock test | If PDF/UI render touched, lock test re-runs | Yes |
| 10. PR template completeness | All boxes ticked, Principle 12 answered | Yes |
| 11. Mobile + desktop screenshots present | Image attachments detected | Yes |
| 12. Migration safety | Forward and rollback scripts both present + tested | Yes (only for schema PRs) |
| 13. Conventional commit format | `<type>(<scope>): <subject>` | Yes |
| 14. BOLA isolation | Cross-tenant test runs against new endpoints | Yes |

A PR that fails any gate gets a friendly bot comment: "Type-check failed in `domains/customers/service.ts:34` — line 34 expects `string`, got `Encrypted<string>`. Use the decrypted view via `customer.full_name.plaintext()` if you need to log."

## Self-review with `/review`

Before submitting to owner + Claude, engineer runs:

```
claude /review
```

This launches a code-review agent on the engineer's branch. The agent:
- Reads the diff
- Checks against `CONVENTIONS.md`
- Looks for missed PII, missing tests, unclear naming
- Reports findings inline as comments

The engineer addresses comments, then submits. We typically receive cleaner PRs because the agent caught the obvious stuff first.

## Risk-graded review queue

`/review-queue` (a slash command in our Claude session) shows:

```
Pending PRs (8):
GREEN  #142  Amit         Customer search filter           45 LOC   self-reviewed
GREEN  #143  Priya        Follow-up snooze UX              30 LOC
YELLOW #144  Ravi         Commission state machine        320 LOC   needs eyes
RED    #145  Sara         Customer schema migration       620 LOC   paired-review required

Total review effort estimate: ~85 min
```

- **GREEN** (low-risk): owner + Claude approve in 5 min each
- **YELLOW** (medium): full read, 15-20 min
- **RED** (high): 30+ min, often a call with the engineer first

## Risky areas get paired review before owner sees them

Two engineers must sign off on PRs touching:

| Area | Why |
|---|---|
| Encryption / CSFLE | Mistake leaks all data |
| Money flows (commission, billing) | Mistake costs real money |
| Schema migrations | Mistake corrupts production |
| Auth / session | Mistake compromises everyone |
| Capability gating logic | Mistake breaks tenant isolation |

The paired engineer's name appears in the PR as a `Co-reviewed-by:` trailer. Owner + Claude then do final review.

## Conventional Commits

Every commit message follows:

```
<type>(<scope>): <subject in present tense, under 70 chars>

<body explaining WHY, not what. Wrap at 72 chars.>

<optional footer: references, breaking-change notice>
```

Types:
- `feat` — new feature
- `fix` — bug fix
- `refactor` — code change, no behaviour change
- `perf` — performance improvement
- `test` — test addition / change
- `docs` — documentation only
- `chore` — tooling, deps
- `migration` — schema change
- `ops` — infra / deploy

Examples:

```
feat(customers): add cross-case dedup on conversion

When a lead is converted to a case, look for existing customer by
blind-indexed mobile within the org. If found, link the new case to
the existing customer rather than creating a duplicate.

Closes #142.
```

```
migration(commissions): add commission_records collection

Phase 2A Sprint 6 — auto-create on case disbursed.
Forward migration: ./migrations/2026-08-15-add-commission-records.up.ts
Rollback: ./migrations/2026-08-15-add-commission-records.down.ts
Tested on staging clone of prod (2026-08-14).
```

## Pull request lifecycle

```
Engineer opens PR
   ↓
CI gates auto-run
   ↓
If green:           If red:
   |                   |
   ↓                   ↓
Risk grade auto-set   Bot comments specific failures
   ↓                   ↓
Self-review (/review)  Engineer fixes, pushes
   ↓                   |
PR ready for owner ←───┘
   ↓
Owner + Claude review (within 4 working hours during business day)
   ↓
   ├─ Approve → engineer squash-merges to main
   ├─ Request changes → engineer iterates
   └─ Reject with reasoning → engineer learns
```

## Merge strategy

- **Squash-merge** to main. One PR = one commit on main.
- **Linear history** enforced (no merge commits on main).
- **Pre-push hook** verifies the local branch is rebased on origin/main before push.

## When a PR is rejected

Owner explains in the PR comment:
1. What the issue is
2. What the correct approach is
3. Where the convention is documented (link to `CONVENTIONS.md` section)

If the same kind of rejection happens 3+ times across the team, that's a signal the convention needs a clearer example or an automated check.

## Hot-fix PRs

For production incidents:
1. Engineer creates a `hotfix/<issue>` branch from `main`
2. Same CI gates apply (no shortcuts)
3. Owner approval can be async via voice note in channel if literally unreachable
4. Post-merge: a follow-up PR adds the test that should have caught it

## Related docs

- [01-CODE-RULES.md](01-CODE-RULES.md)
- [03-TESTING-STRATEGY.md](03-TESTING-STRATEGY.md)
- [../04-security/04-PRINCIPLE-12-GATE.md](../04-security/04-PRINCIPLE-12-GATE.md)
