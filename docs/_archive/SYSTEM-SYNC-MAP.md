# System Synchronization Map

> **Purpose**: Visual map showing which files are connected and must be updated together
> **How to Use**: When you modify file X, this map shows which other files need updating

---

## 1. Form Schema Changes → Impact Map

```
homeLoanSchemaV2.json change (question added/removed/modified)
│
├─→ [MIRROR] src/lib/server/formEngine/schemas/homeLoanSchemaV2.json
│   └─ MUST be updated atomically in same commit
│
├─→ [TYPES] src/lib/types/form.ts
│   └─ Add new contextKey type if it's a new field
│
├─→ [TYPES] src/lib/types/questionSchema.ts
│   └─ Add new question type if using new type (e.g., 'month-year')
│
├─→ [TYPES] src/lib/types/formEngine.ts
│   └─ If changing page structure (RawSchemaPage format)
│
├─→ [PAYLOAD] src/lib/utils/payloadBuilder/types.ts
│   └─ Add new field to applicable type (CaseProperty, CaseLegal, etc.)
│
├─→ [PAYLOAD] src/lib/utils/payloadBuilder/loanTransaction.ts
│   └─ Add extraction logic: formData[contextKey] → payload.field
│
├─→ [PAYLOAD] src/lib/utils/casePayloadBuilder.ts
│   └─ Add field mapping if new loan type question
│
├─→ [ENRICHER] src/lib/ruleEngine/payloadEnricher.ts
│   └─ Add derived field if new derived boolean/calculation needed
│
├─→ [VALIDATOR] src/lib/ruleEngine/ruleValidator.ts
│   └─ Add contextKey to VALID_KEYS if new field
│
├─→ [TESTS] src/lib/testing/homeLoan/pageFlowMap.ts
│   └─ Add question to array if new question
│
├─→ [TESTS] src/lib/testing/homeLoan/formPathScenarios.ts
│   └─ Add test scenario if new loan type or flow
│
├─→ [TESTS] src/lib/testing/archetypeHelpers.ts
│   └─ Add fixture data for new field if needed
│
├─→ [DOCS] docs/PAYLOAD_DOCUMENTATION.md
│   └─ Document new contextKey → payload field mapping
│
├─→ [SESSION] docs/SESSION-HANDOFF.md
│   └─ Log: "Modified homeLoanSchemaV2.json: [description]"
│
└─→ [VALIDATION] pnpm run check && pnpm run test:unit
    └─ MUST PASS before commit
```

---

## 2. Type Definition Changes → Impact Map

```
src/lib/types/form.ts change (new type, new field in type)
│
├─→ [AFFECTED TYPES] src/lib/types/casePayload.ts
│   └─ Update derived types if related
│
├─→ [COMPONENTS] src/lib/components/**/*.svelte
│   └─ If type is used in component props
│
├─→ [PAYLOAD] src/lib/utils/payloadBuilder/types.ts
│   └─ Update type definitions
│
├─→ [ENRICHER] src/lib/ruleEngine/payloadEnricher.ts
│   └─ Update return types if affected
│
├─→ [TESTS] src/lib/**/__tests__/**/*.test.ts
│   └─ Update test fixtures/mocks
│
├─→ [VALIDATION] pnpm run check
│   └─ MUST PASS (type system enforces correctness)
│
└─→ [DOCS] docs/PAYLOAD_DOCUMENTATION.md + docs/ARCHITECTURE.md
    └─ Update type reference section
```

---

## 3. API Route Changes → Impact Map

```
src/routes/api/[domain]/+server.ts change (new endpoint or modify)
│
├─→ [HANDLER] src/routes/api/[domain]/+server.ts
│   └─ Add/modify request handler
│
├─→ [TYPES] src/lib/types/formEngine.ts (or relevant types file)
│   └─ Add request/response types
│
├─→ [GUARDS] src/lib/server/guards.ts usage
│   └─ Add auth/permission guards to handler
│
├─→ [LOGGER] src/lib/server/logger.ts usage
│   └─ Add structured logging to handler
│
├─→ [TESTS] src/lib/**/__tests__/**/*.test.ts
│   └─ Add unit tests for new endpoint
│
├─→ [E2E] src/lib/testing/e2e/**/*.spec.ts
│   └─ Add Playwright tests if critical path
│
├─→ [DOCS] docs/LOAN-ASSESSMENT-API-INTEGRATION.md
│   └─ Document new endpoint if external API
│
├─→ [DOCS] docs/ARCHITECTURE.md Section 5 (Request Lifecycle)
│   └─ Update if changes major request flow
│
├─→ [SESSION] docs/SESSION-HANDOFF.md
│   └─ Log: "Added API endpoint [path]"
│
└─→ [VALIDATION] pnpm run check && pnpm run test:unit && pnpm run test:e2e
    └─ MUST PASS before commit
```

---

## 4. Database Schema Changes → Impact Map

```
src/lib/database/mongo.ts change (new collection, new index, new field)
│
├─→ [SCHEMA] src/lib/database/mongo.ts
│   └─ Update collection definition
│
├─→ [INDEX] src/lib/database/mongo.ts
│   └─ Add/modify index if new query pattern
│
├─→ [TYPES] src/lib/types/casePayload.ts (or relevant types)
│   └─ Add field types if schema changed
│
├─→ [QUERIES] src/lib/server/queryHelpers.ts
│   └─ Add query builder functions if needed
│
├─→ [API] src/routes/api/**/+server.ts
│   └─ Update API handlers that touch this collection
│
├─→ [ENRICHER] src/lib/ruleEngine/payloadEnricher.ts
│   └─ Update if enricher reads this collection
│
├─→ [TESTS] src/lib/**/__tests__/**/*.test.ts
│   └─ Add test fixtures for new schema
│
├─→ [DOCS] docs/ARCHITECTURE.md Section 13 (Database)
│   └─ Update collection inventory
│
├─→ [SESSION] docs/SESSION-HANDOFF.md
│   └─ Log: "Modified [collection] schema"
│
└─→ [VALIDATION] pnpm run check && pnpm run test:unit
    └─ MUST PASS before commit
```

---

## 5. Component/UI Changes → Impact Map

```
src/routes/dashboard/[role]/[page]/+page.svelte change (new page, new component)
│
├─→ [COMPONENT] src/lib/components/**/*.svelte
│   └─ Create/modify component
│
├─→ [PAGE] src/routes/dashboard/[role]/[page]/+page.svelte
│   └─ Wire component + handle data flow
│
├─→ [SERVER] src/routes/dashboard/[role]/[page]/+page.server.ts
│   └─ Add server logic (queries, auth checks, permissions)
│
├─→ [TYPES] src/lib/types/*.ts
│   └─ Add types for component props + page data
│
├─→ [ROUTES] src/lib/config/routes.ts
│   └─ Add route constant if new URL pattern
│
├─→ [TESTS] src/lib/**/__tests__/**/*.test.ts
│   └─ Add unit tests for logic
│
├─→ [E2E] src/lib/testing/e2e/**/*.spec.ts
│   └─ Add Playwright tests if critical user flow
│
├─→ [DOCS] docs/ARCHITECTURE.md Section 15 (Components)
│   └─ Update component inventory
│
├─→ [SESSION] docs/SESSION-HANDOFF.md
│   └─ Log: "Added dashboard page [path]"
│
└─→ [VALIDATION] pnpm run check && pnpm run test:unit && pnpm run test:e2e
    └─ MUST PASS before commit
```

---

## 6. Rule Engine Changes → Impact Map

```
src/lib/ruleEngine/*.ts change (new evaluation, new policy)
│
├─→ [ENGINE] src/lib/ruleEngine/evaluationEngine.ts
│   └─ Add new evaluation phase or modify existing
│
├─→ [ENRICHER] src/lib/ruleEngine/payloadEnricher.ts
│   └─ Add derived fields if new policy requires context
│
├─→ [VALIDATOR] src/lib/ruleEngine/ruleValidator.ts
│   └─ Add valid keys if new payload field
│
├─→ [TESTS] src/lib/ruleEngine/__tests__/**/*.test.ts
│   └─ Add test cases with sample payloads
│
├─→ [DOCS] docs/RULE-ENGINE-SPECIFICATION.md
│   └─ Document new evaluation phase
│
├─→ [DOCS] docs/ARCHITECTURE.md Section 9 (Rule Engine)
│   └─ Update rule engine architecture
│
├─→ [SESSION] docs/SESSION-HANDOFF.md
│   └─ Log: "Modified rule engine [phase]"
│
└─→ [VALIDATION] pnpm run check && pnpm run test:unit
    └─ MUST PASS before commit
```

---

## 7. Testing Changes → Impact Map

```
src/lib/testing/homeLoan/pageFlowMap.ts change (add question, add page)
│
├─→ [TEST MAP] src/lib/testing/homeLoan/pageFlowMap.ts
│   └─ Add/update question definition or page
│
├─→ [SCHEMA] src/lib/config/homeLoanSchemaV2.json (or mirror)
│   └─ MUST be updated already (this follows schema change)
│
├─→ [FIXTURES] src/lib/testing/homeLoan/fixtures/**/*.ts
│   └─ Add fixture data for new question if needed
│
├─→ [SCENARIOS] src/lib/testing/homeLoan/formPathScenarios.ts
│   └─ Add scenario if new loan type or flow
│
├─→ [E2E] src/lib/testing/e2e/**/*.spec.ts
│   └─ Add Playwright test if new critical flow
│
├─→ [TESTS] Run test suite
│   └─ pnpm run test:unit && pnpm run test:e2e
│
└─→ [SESSION] docs/SESSION-HANDOFF.md
    └─ Log: "Updated test fixtures [details]"
```

---

## 8. Documentation Changes → Impact Map

```
docs/*.md change (spec update, new architecture doc)
│
├─→ [REFERENCE] docs/REFERENCE.md (if it exists)
│   └─ Update index if adding new doc
│
├─→ [SESSION] docs/SESSION-HANDOFF.md
│   └─ Log: "Updated docs/[filename]"
│
├─→ [MEMORY] C:\Users\OJ\.claude\projects\F--TECH-DigitalDSA-REPOs-DigitalDSA-V3\memory\MEMORY.md
│   └─ Add cross-session note if pattern/decision important
│
├─→ [CLAUDE] CLAUDE.md (if documentation protocol affects code)
│   └─ Update conventions if new standard established
│
└─→ [CHANGELOG] docs/CHANGELOG.md (after committing)
    └─ Add entry: "docs: [what changed]"
```

---

## 9. Quick Lookup: "I Changed X, Update Y"

| I Changed... | Must Also Update... | Why |
|---|---|---|
| **homeLoanSchemaV2.json** | Mirror schema + types + payload + enricher + validator + tests | Schema is foundation |
| **contextKey name** | All files that reference it (payload, enricher, validator) | Key is the contract |
| **Question type** | questionSchema.ts + pageFlowMap.ts + any enums | Type system must match |
| **Loan type enum** | flowDomainLogic.ts + schema showWhen + tests | Must be consistent |
| **Purchase type** | All schema showWhen + enricher normalization + tests | Fundamental to flows |
| **API endpoint** | Types + guards + logger + tests + docs | API is contract |
| **Database collection** | Types + queries + indexes + tests | Schema is foundation |
| **Component** | Page + server logic + types + tests + routes | Component is display |
| **Derived field logic** | enricher.ts + types + validator + tests + docs | Logic is calculation |
| **Page order/visibility** | visibility.ts (both client + server) + tests + docs | Visibility is control flow |

---

## 10. Danger Zones (High-Impact Changes)

These changes require careful synchronization:

### 🔴 Highest Risk
| Change | Scope | Why | Mitigation |
|--------|-------|-----|-----------|
| **Remove a question** | Schema + all validators + all consumers | Data loss risk | Keep question, hide it; notify users |
| **Rename contextKey** | Schema + payload + enricher + validator + ALL code using it | Breaks entire pipeline | Atomic update, update in all 5+ files simultaneously |
| **Change loan type enum** | Schema + flowDomainLogic.ts + visibility + all tests | Breaks all flows | Test all 4 loan types explicitly |
| **Modify core type** | Payloads + enricher + validators + components | Cascading failures | Update 4+ files in one commit |

### 🟠 Medium Risk
| Change | Scope | Why | Mitigation |
|--------|-------|-----|-----------|
| **Add derived field** | Enricher + validator + tests + docs | Silent failures if missed | Add to validator.ts VALID_KEYS first, test fails explicitly |
| **Add API endpoint** | Route + types + guards + tests + docs | Security risk if guards missed | Checklist: [auth] [permission] [validation] [error handling] |
| **Add database index** | mongo.ts + queries + tests | Performance or silent failures | Benchmark before/after, test query patterns |
| **Add new component** | Page + types + routes + tests | Orphaned code if wiring missed | Route must exist, page must wire it |

---

## 11. Verification Scripts

### Before Every Commit (5 minutes)

```bash
#!/bin/bash
# docs/VERIFY-SYNC.sh

echo "=== Type Check ==="
pnpm run check || exit 1

echo "=== Unit Tests ==="
pnpm run test:unit --run || exit 1

echo "=== E2E Tests (critical only) ==="
# pnpm run test:e2e --grep "critical"  # Optional, slower

echo "=== Documentation Checks ==="

# Check SESSION-HANDOFF has Next Action
if ! grep -q "## Next Action" docs/SESSION-HANDOFF.md; then
  echo "⚠️  SESSION-HANDOFF.md missing 'Next Action' section"
  exit 1
fi

# Check git status is clean
if ! git diff --quiet; then
  echo "⚠️  Uncommitted changes exist"
  git status
  exit 1
fi

echo "✅ All checks passed!"
```

---

## 12. Cross-System Consistency Matrix

| System | Owns | Affected By | Check Point |
|--------|------|-------------|------------|
| **Schema** | homeLoanSchemaV2.json (both) | Nothing | `pnpm run check` |
| **Types** | src/lib/types/*.ts | Schema + API + Payload | `pnpm run check` |
| **Payload** | payloadBuilder/*.ts | Schema + Types | `pnpm run test:unit` |
| **Enricher** | payloadEnricher.ts | Schema + Payload | `pnpm run test:unit` |
| **Validator** | ruleValidator.ts | Schema + Enricher | `pnpm run test:unit` |
| **API** | src/routes/api/** | Types + Guards | `pnpm run check + test` |
| **Dashboard** | src/routes/dashboard/** | Types + Routes | `pnpm run check + e2e` |
| **Tests** | src/lib/testing/** | Schema + All code | `pnpm run test:unit/e2e` |
| **Docs** | docs/*.md | Everything | Manual review |

---

## Quick Start: After Making a Change

1. **Identify what you changed**
   - Schema question? → Go to Section 1
   - Type definition? → Go to Section 2
   - API endpoint? → Go to Section 3
   - Database? → Go to Section 4
   - Component? → Go to Section 5
   - Rule logic? → Go to Section 6
   - Tests? → Go to Section 7
   - Docs? → Go to Section 8

2. **Follow the impact map**
   - Update all files listed in the section

3. **Run verification**
   ```bash
   pnpm run check && pnpm run test:unit
   ```

4. **Update SESSION-HANDOFF.md**
   ```markdown
   ### Files Modified This Session
   - [ ] homeLoanSchemaV2.json + mirror
   - [ ] src/lib/types/form.ts
   - [ ] src/lib/utils/payloadBuilder/types.ts
   - [ ] src/lib/utils/payloadBuilder/loanTransaction.ts
   - [ ] src/lib/testing/homeLoan/pageFlowMap.ts
   - [ ] docs/PAYLOAD_DOCUMENTATION.md
   ```

5. **Commit with full file list**
   ```bash
   git add -A
   git commit -m "feat/fix: [description]

   Modified: [all affected files]
   Impact: [what changed, why, what breaks/improves]"
   ```

Done! ✅
