# Documentation Templates & Checklists

> **Purpose**: Copy-paste templates to keep documentation synchronized with zero effort
> **Use**: Copy the relevant template section before starting work

---

## 1. Schema Question Change Template

**When**: Adding/removing/modifying a question in homeLoanSchemaV2.json

### Pre-Work Checklist
```markdown
## Before Modifying Schema Question

- [ ] Read the schema section carefully
- [ ] Verify both schema locations: `src/lib/config/` + `src/lib/server/formEngine/schemas/`
- [ ] Check existing questions to avoid duplication
- [ ] Identify all affected systems (type → payload → enricher → validator → tests)
- [ ] Create SESSION-HANDOFF.md entry with files to modify
```

### Impact Checklist (Copy-Paste)
```markdown
## Schema Question Change — Impact Checklist

**Question Changed**: [q_id: contextKey]
**Change Type**: ☐ Added | ☐ Removed | ☐ Modified
**Files to Update**:

### Schema
- [ ] src/lib/config/homeLoanSchemaV2.json — Question definition
- [ ] src/lib/server/formEngine/schemas/homeLoanSchemaV2.json — Mirror schema

### Types
- [ ] src/lib/types/form.ts — Add/remove contextKey type if needed
- [ ] src/lib/types/questionSchema.ts — Add new type if using new type

### Payload Pipeline
- [ ] src/lib/utils/payloadBuilder/types.ts — Add field to type
- [ ] src/lib/utils/payloadBuilder/loanTransaction.ts — Add extraction logic
- [ ] src/lib/utils/casePayloadBuilder.ts — Add field mapping if applicable
- [ ] src/lib/ruleEngine/payloadEnricher.ts — Add derived field if needed
- [ ] src/lib/ruleEngine/ruleValidator.ts — Add to VALID_KEYS

### Testing
- [ ] src/lib/testing/homeLoan/pageFlowMap.ts — Update question array
- [ ] src/lib/testing/homeLoan/archetypeHelpers.ts — Add fixture data if needed
- [ ] src/lib/**/__tests__/**/*.test.ts — Update/add tests

### Documentation
- [ ] docs/PAYLOAD_DOCUMENTATION.md — Document new contextKey
- [ ] docs/SESSION-HANDOFF.md — Log: "Modified homeLoanSchemaV2.json: [description]"
- [ ] docs/CHANGELOG.md — Add entry (after commit)

### Verification
- [ ] pnpm run check ✓
- [ ] pnpm run test:unit ✓
- [ ] Both schema files have matching question definitions
- [ ] git status is clean after commit
```

### Commit Message Template
```bash
git commit -m "feat: add [question name] to [page name]

Context: [why is this question needed?]

Modified:
- src/lib/config/homeLoanSchemaV2.json
- src/lib/server/formEngine/schemas/homeLoanSchemaV2.json
- src/lib/types/form.ts
- src/lib/utils/payloadBuilder/types.ts
- src/lib/utils/payloadBuilder/loanTransaction.ts
- src/lib/testing/homeLoan/pageFlowMap.ts
- docs/PAYLOAD_DOCUMENTATION.md

Impact: [question now shows for X loan type, captures Y field]"
```

---

## 2. Type Definition Change Template

**When**: Adding/modifying types in src/lib/types/

### Pre-Work Checklist
```markdown
## Before Modifying Type Definition

- [ ] Identify all files that import this type
- [ ] Run `grep -r "TypeName" src/lib --include="*.ts"` to find consumers
- [ ] Plan all updates before starting
- [ ] Note: Type changes are BREAKING if they remove fields
```

### Impact Checklist
```markdown
## Type Definition Change — Impact Checklist

**Type Changed**: [Type name]
**Change**: ☐ Added field | ☐ Removed field | ☐ Changed type

### Files Importing This Type
- [ ] src/lib/utils/payloadBuilder/** — Update builders
- [ ] src/lib/ruleEngine/** — Update enricher/validator if applicable
- [ ] src/lib/components/** — Update component props if used
- [ ] src/lib/**/__tests__/** — Update test fixtures/mocks

### Cross-Checks
- [ ] Search for `interface TypeName` — update all usages
- [ ] Search for `type TypeName` — update all usages
- [ ] Check type constructors — update return types

### Verification
- [ ] pnpm run check ✓ (type system enforces consistency)
- [ ] pnpm run test:unit ✓

### Documentation
- [ ] docs/PAYLOAD_DOCUMENTATION.md — Update if field/type is documented
- [ ] docs/ARCHITECTURE.md — Update if core type changed
- [ ] docs/SESSION-HANDOFF.md — Log change
```

### Commit Message Template
```bash
git commit -m "types: [add/modify/remove] [field] in [TypeName]

Reason: [why this type change was needed]

Modified:
- src/lib/types/[file].ts
- [all files importing the type]

Impact: [what breaks/changes for consumers]"
```

---

## 3. API Endpoint Change Template

**When**: Adding/modifying an API route in src/routes/api/

### Pre-Work Checklist
```markdown
## Before Adding/Modifying API Endpoint

- [ ] Endpoint path is clear and follows pattern
- [ ] Request/response types are defined
- [ ] Auth requirement is identified
- [ ] Error cases are handled
- [ ] Logging is planned
- [ ] Documentation location identified (LOAN-ASSESSMENT-API-INTEGRATION.md? custom?)
```

### Impact Checklist
```markdown
## API Endpoint Change — Impact Checklist

**Endpoint**: [METHOD] /api/[path]
**Type**: ☐ New | ☐ Modified | ☐ Removed

### Code
- [ ] src/routes/api/[path]/+server.ts — Handler
- [ ] src/lib/types/formEngine.ts (or relevant) — Request/response types
- [ ] src/lib/server/guards.ts usage — Auth/permission guards
- [ ] src/lib/server/logger.ts usage — Structured logging
- [ ] src/lib/server/apiResponse.ts usage — Response formatting

### Tests
- [ ] src/lib/**/__tests__/api/** — Unit tests
- [ ] src/lib/testing/e2e/**/*.spec.ts — E2E tests (if critical path)

### Documentation
- [ ] docs/LOAN-ASSESSMENT-API-INTEGRATION.md — Document if external API
- [ ] docs/ARCHITECTURE.md Section 5 — Update if changes request lifecycle
- [ ] docs/SESSION-HANDOFF.md — Log endpoint addition

### Security Checklist
- [ ] ☐ Auth guard added? (isAuthenticated or custom)
- [ ] ☐ Permission check added? (if role-gated)
- [ ] ☐ Input validation? (parseJsonBody + validation logic)
- [ ] ☐ Error handling? (try-catch + apiError/apiServerError)
- [ ] ☐ Rate limiting? (if public/abuse-prone)
- [ ] ☐ Logging? (structured logger, not console)

### Verification
- [ ] pnpm run check ✓
- [ ] pnpm run test:unit ✓
- [ ] pnpm run test:e2e ✓ (for critical paths)
```

### Commit Message Template
```bash
git commit -m "api: [add/modify] /api/[path]

Endpoint: [METHOD] /api/[path]
Purpose: [what does it do?]
Auth: [required? which guard?]

Modified:
- src/routes/api/[path]/+server.ts
- src/lib/types/formEngine.ts
- src/lib/**/__tests__/api/**
- docs/[API_DOC].md

Impact: [consumed by which components/pages]"
```

---

## 4. Database Schema Change Template

**When**: Adding collections, fields, or indexes to MongoDB

### Pre-Work Checklist
```markdown
## Before Modifying Database Schema

- [ ] Collection/index purpose is clear
- [ ] Index will improve query performance (or required for uniqueness)
- [ ] Data type is appropriate
- [ ] Backward compatibility planned (if data already exists)
```

### Impact Checklist
```markdown
## Database Schema Change — Impact Checklist

**Collection**: [name]
**Change**: ☐ New field | ☐ New index | ☐ New collection | ☐ Modified field

### Code
- [ ] src/lib/database/mongo.ts — Schema definition
- [ ] src/lib/database/mongo.ts — Index definition (if adding index)
- [ ] src/lib/types/casePayload.ts — Add field types

### Queries
- [ ] src/lib/server/queryHelpers.ts — Add query builder if needed
- [ ] All files querying this collection — Update to use new field

### API Layer
- [ ] src/routes/api/**/+server.ts — Update handlers if needed

### Rule Engine
- [ ] src/lib/ruleEngine/payloadEnricher.ts — Update if enricher uses this
- [ ] src/lib/ruleEngine/ruleValidator.ts — Add to VALID_KEYS if needed

### Testing
- [ ] src/lib/**/__tests__/** — Update fixtures for new field

### Documentation
- [ ] docs/ARCHITECTURE.md Section 13 — Update collection inventory
- [ ] docs/SESSION-HANDOFF.md — Log change
```

### Commit Message Template
```bash
git commit -m "db: [add/modify] [field/index] in [collection]

Collection: [name]
Field/Index: [details]
Reason: [why this change?]
Backward Compatibility: [any migration needed?]

Modified:
- src/lib/database/mongo.ts
- src/lib/types/casePayload.ts
- [all files querying this collection]

Impact: [what queries/features depend on this]"
```

---

## 5. Component/UI Change Template

**When**: Adding/modifying dashboard pages or components

### Pre-Work Checklist
```markdown
## Before Adding Component/Page

- [ ] Route path is clear
- [ ] Component responsibility is focused (single purpose)
- [ ] Data flow is planned (what data does it need?)
- [ ] Role/permissions are clear (who can access?)
```

### Impact Checklist
```markdown
## Component/UI Change — Impact Checklist

**Path**: [src/routes/dashboard/[role]/[page]]
**Type**: ☐ New page | ☐ New component | ☐ Modified existing

### Files
- [ ] src/lib/components/**/*.svelte — Component definition
- [ ] src/routes/[path]/+page.svelte — Page file
- [ ] src/routes/[path]/+page.server.ts — Server logic
- [ ] src/lib/types/*.ts — Component/page prop types
- [ ] src/lib/config/routes.ts — Add route constant if new URL

### Data Flow
- [ ] [ ] Component props typed? (what data in?)
- [ ] Server logic queries needed? (what data from DB?)
- [ ] API calls needed? (what external data?)
- [ ] Permission checks added? (who can see this?)

### Testing
- [ ] src/lib/**/__tests__/**/*.test.ts — Unit tests
- [ ] src/lib/testing/e2e/**/*.spec.ts — E2E tests (if critical)

### Documentation
- [ ] docs/ARCHITECTURE.md Section 15 — Update component inventory
- [ ] docs/SESSION-HANDOFF.md — Log new component

### Verification
- [ ] Component renders without errors
- [ ] Permission checks prevent unauthorized access
- [ ] Data loads correctly
- [ ] pnpm run check ✓
- [ ] pnpm run test:unit ✓
- [ ] pnpm run test:e2e ✓
```

### Commit Message Template
```bash
git commit -m "feat: add [component name] dashboard

Purpose: [what does this component show/do?]
Audience: [which role?]
Data: [what data does it display?]

Created:
- src/lib/components/[ComponentName].svelte
- src/routes/dashboard/[role]/[page]/+page.svelte
- src/routes/dashboard/[role]/[page]/+page.server.ts

Impact: [where can this be accessed?]"
```

---

## 6. Documentation Update Template

**When**: Updating specs, architecture docs, or adding new documentation

### Checklist
```markdown
## Documentation Update — Checklist

**File**: [docs/[FILENAME].md]
**Type**: ☐ New doc | ☐ Update existing | ☐ Archive old

### Changes
- [ ] Content is accurate (verified against code)
- [ ] Links are correct (no broken references)
- [ ] Examples are current (not outdated)
- [ ] Format matches existing docs
- [ ] TOC updated if adding sections

### Cross-Checks
- [ ] If updating architecture → ARCHITECTURE.md in sync?
- [ ] If updating API → LOAN-ASSESSMENT-API-INTEGRATION.md in sync?
- [ ] If updating payload → PAYLOAD_DOCUMENTATION.md in sync?
- [ ] If new spec → Referenced in REFERENCE.md?

### Session Documentation
- [ ] docs/SESSION-HANDOFF.md updated
- [ ] docs/CHANGELOG.md entry ready (after commit)
- [ ] docs/MEMORY.md updated if cross-session pattern?
```

### Commit Message Template
```bash
git commit -m "docs: [update/add] [topic]

File: docs/[FILENAME].md
Changes: [what was added/fixed]
Reason: [why this documentation change?]

Impact: [which docs/processes are affected?]"
```

---

## 7. SESSION-HANDOFF Update Template

**When**: Before every context compaction or batch completion

### Copy-Paste Template
```markdown
---

## Current Session State (2026-02-XX)

### Active Plan
**File**: [path to plan file]
**Goal**: [goal description]
**Status**: [% complete]

### Batch Progress
| Batch | Description | Status | Commit |
|-------|-------------|--------|--------|
| **1** | [description] | [IN PROGRESS/COMPLETE] | [hash] |
| **2** | [description] | [PENDING] | — |

### Files Modified This Session
- [src/lib/file1.ts]
- [src/lib/file2.ts]
- [docs/filename.md]

### Uncommitted Work
[If any batches are incomplete]
- Agent X: [what it's working on]
- Agent Y: [what it's working on]

### Git State
**Branch**: main
**Latest commit**: [hash] — [message]
**Uncommitted changes**: [list files]

### Critical Decisions Made
- [Decision 1]: [explanation]
- [Decision 2]: [explanation]

### Deviations This Session
[If code differs from plan]
- [Deviation]: [what changed, why, impact]

---

## Next Action

[Specific, actionable next step]

Example:
"Read docs/AREA-SPECIFIC-COMPLIANCE-REDESIGN.md Sections 1-2 for context.
Then launch Batch 2 (7 parallel agents) by running: [command/file to read]"
```

---

## 8. CHANGELOG Entry Template

**When**: After committing a batch of work

### Copy-Paste Template
```markdown
### 2026-02-27 — [Batch Title]

**Commits**: [hash1], [hash2], [hash3]
**Scope**: [files touched - be specific]

**What**:
- [Change 1: specific description]
- [Change 2: specific description]
- [Change 3: specific description]

**Tests**: [count] | **Errors**: [count] | **Warnings**: [count]

**Course Correction**: [If applicable: what deviated from plan and why]
```

### Example
```markdown
### 2026-02-27 — Fixed Critical Schema + Type Definition Bugs

**Commits**: 7f632446, 738944e8
**Scope**: flowDomainLogic.ts, 2× homeLoanSchemaV2.json, questionSchema.ts, pageFlowMap.ts

**What**:
- Fixed "New Home Loan" → "New Loan" enum mismatch in D1-D5 domain logic
- Fixed missing 'month-year' type in TypeScript definitions
- All domain logic conditions now evaluate correctly at runtime

**Tests**: 7,010+ passing | **Errors**: 0 | **Warnings**: 0

**Course Correction**: None (issues were genuine bugs, not design deviations)
```

---

## 9. MEMORY.md Entry Template

**When**: Discovering a cross-session pattern or lesson learned

### Copy-Paste Template
```markdown
## [Pattern Name] (Session X)

**Context**: [When does this pattern apply?]

**Pattern**: [Description of what to do/avoid]

**Example**: [Specific code example or scenario]

**Reference**: [Link to code file or session]

**Why**: [Why is this important?]
```

### Example
```markdown
## Schema Dual-Location Update (Session 6)

**Context**: Form schemas exist in two places to support different loading strategies

**Pattern**: ALWAYS update both schema files atomically:
- src/lib/config/homeLoanSchemaV2.json (mirror for client)
- src/lib/server/formEngine/schemas/homeLoanSchemaV2.json (canonical for server)

**Why**: schemaLoader.ts loads from server location; config is mirror. If they diverge, form breaks.

**Reference**: Commit 7f632446 — schema mismatch cost 2 hours debugging
```

---

## 10. Deviation Entry Template

**When**: Code deviates from plan and you want to document it

### Copy-Paste Template
```markdown
## Deviations This Session

### D[N]: [Title]
**Planned**: [What the plan said to do]
**Actual**: [What you actually did]
**Reason**: [Why did requirements/approach change?]
**Impact**: [What's better/worse as a result?]
**Reference**: Commit [hash]
```

### Example
```markdown
## Deviations This Session

### D1: Area-Specific Schema Approach
**Planned**: 5 variants of Q1 compliance question (one per area type)
**Actual**: Single question with dynamic label based on area type
**Reason**: User feedback — simpler for DSAs, same outcome, cleaner JSON
**Impact**: Saves 40+ lines schema, reduces test fixtures by 4 files
**Reference**: Commit f47a8bc2
```

---

## Quick Start: Using These Templates

1. **Before starting work**: Copy relevant pre-work checklist
2. **During work**: Use impact checklist to track files
3. **Before commit**: Use commit message template
4. **After commit**: Use CHANGELOG entry template
5. **Before context compaction**: Use SESSION-HANDOFF template
6. **If pattern discovered**: Use MEMORY.md entry template
7. **If code deviates**: Use Deviation entry template

**Result**: Documentation stays in sync with zero extra effort. ✅
