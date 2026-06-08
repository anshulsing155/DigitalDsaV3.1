# Schema Remediation — Quick Start Guide
**Version 1.0** | For: `docs/INTEGRATED-REMEDIATION-PLAN.md`

---

## What You Need to Know (60 Seconds)

**Problem:** 22 fixable schema issues across 4 tiers + 8 flow domain logic gaps

**Solution:** Phased approach (P0→P1→Domain→Testing→P2 refactor)

**Timeline:** 6-10 days for critical fixes; P2 can defer to next sprint

**Risk:** Low if following atomic update checklist

---

## What Gets Fixed

### Critical (P0) — Do First ✅
- ❌ Delete dead compliance question (dead code, not in use anyway)
- ❌ Fix tautological `A OR NOT A` condition (cleanup)
- ❌ Fix typo `"New Home Loan"` → `"New Loan"` (enum mismatch)
- ❌ Fix typo `"Case"` → `"case"` in validation (key mismatch)
- ❌ Fix orphaned `"Resale"`, `"Direct Sale"` references (dead branches)
- ❌ Fix typo `orignalRemaningTenure` → `remainingTenure` (data access)

**Effort:** 2-3 hours | **Risk:** NONE (they're all clearly broken)

### High (P1) — Do Second ⚠️
- ❌ Deduplicate RERA question (asked twice with different values)
- ❌ Audit compliance value meanings (same value = different risk per area type)
- ❌ Fix BT page ordering (registry question asked too late)
- ❌ Fix zone warning (references non-existent option)

**Effort:** 5-7 hours | **Risk:** MEDIUM (requires domain knowledge + rule audit)

### Domain Logic — Do Third 🎯
- Hide questions irrelevant for top-up (purchaseType, specialAreaRestriction, builder questions)
- Hide questions irrelevant for direct authority purchase (all seller questions)
- Show sellerOnLoan for endorsement (currently hidden, but critical)
- Add authority-specific seller transaction page
- Reframe purchaseType for BT: "How was property originally acquired?"
- Reframe priorAssessmentHistory per loan type

**Effort:** 6-7 hours | **Risk:** MEDIUM (changes user flows)

### Medium (P2) — Do Later (Next Sprint) 📅
- Remove redundant `uiMeta.icon` from 80+ radio options (~400 lines saved)
- Merge purchaseType variants (q2a + q2b)
- Consolidate documentationReadiness variants
- Split propertyCondition page (too many questions)
- Other minor optimizations

**Effort:** 8-12 hours | **Risk:** LOW (optimizations only)

---

## Files You'll Touch

### Must Modify (Atomic Together)
```
src/lib/config/homeLoanSchemaV2.json                    ← Mirror
src/lib/server/formEngine/schemas/homeLoanSchemaV2.json ← Canonical
(Update these TOGETHER for every change)
```

### Update When Ready
```
src/lib/types/form.ts                    ← Type definitions
src/lib/ruleEngine/ruleValidator.ts      ← Validation rules
src/lib/ruleEngine/payloadEnricher.ts    ← Derivation logic
src/lib/testing/homeLoan/pageFlowMap.ts  ← Question registry
```

### Create
```
src/lib/config/flowDomainLogic.ts                           ← NEW (domain gating)
src/lib/testing/homeLoan/__tests__/schemaFixes.test.ts      ← NEW (unit tests)
src/lib/testing/homeLoan/__tests__/e2e/schemaFlows.spec.ts ← NEW (E2E tests)
```

### Documentation
```
docs/INTEGRATED-REMEDIATION-PLAN.md  ← Read this first (detailed)
docs/REMEDIATION-QUICK-START.md      ← You are here
docs/DEVELOPMENT-PLAN.md             ← Update after each phase
MEMORY.md                            ← Session notes
```

---

## Step-by-Step Execution

### Phase 1: P0 Fixes (2-3 hours, 1 day)

```bash
# 1. Read both schema files to understand current state
# 2. For each P0 fix:
#    a. Edit src/lib/config/homeLoanSchemaV2.json
#    b. Edit src/lib/server/formEngine/schemas/homeLoanSchemaV2.json
#    c. Verify they match: diff -u [file1] [file2]
#    d. Commit: git commit -m "fix: P0-X [brief description]"

# P0-1: Delete q1b_propertyComplianceStatus_converted (line ~1402)
# P0-2: Fix tautology showWhen at q1_sellerOwnershipType (line ~3003)
# P0-3: Fix "New Home Loan" → "New Loan" at sellerTransaction_homeLoan page (line ~2909)
# P0-4: Fix "Case" → "case" at q4_propertyStateName validation (line ~406)
# P0-5: Fix "Resale" and "Direct Sale" references (lines ~2005, ~4227, ~4809)
# P0-6: Fix contextKey typo in q8_remainingTenure (line ~5502)

# 3. Run tests
pnpm run test:unit
pnpm run check  # Type check

# 4. Commit all P0 fixes
git add src/lib/config/homeLoanSchemaV2.json src/lib/server/formEngine/schemas/homeLoanSchemaV2.json
git commit -m "fix: P0 critical schema issues (6 fixes)"
```

### Phase 2: P1 Fixes (5-7 hours, 1-2 days)

```bash
# P1-1: Deduplicate RERA question
#   - Keep q5_reraRegistrationStatus in propertyCondition_homeLoan
#   - Delete q8_reraRegistrationStatus from legalVerification_homeLoan
#   - Standardize value to "EXEMPTED" (not "EXEMPT")
#   - Audit policy rules

# P1-2: Audit compliance value pairing
#   - Check rule docs for propertyComplianceStatus usage
#   - Add validation in ruleValidator.ts to enforce area type pairing
#   - Document in rule authoring guide

# P1-3: Fix BT page ordering
#   - Move btRegistry_homeLoan from position 4 to position 2
#   - Update BT_TOPUP_PAGE_ORDER in 3 locations:
#     grep -rn "BT_TOPUP_PAGE_ORDER" src/
#   - Test all BT flows

# P1-4: Fix zone classification warning
#   - Add "COMMERCIAL" and "GREEN_BELT" to zoneClassification options
#   - Update warning condition to match

pnpm run test:unit
git commit -m "fix: P1 high-priority schema fixes (4 issues)"
```

### Phase 3: Domain Logic (6-7 hours, 1-2 days)

```bash
# Create flowDomainLogic.ts module
# Implement flow-aware hiding for:
#   - D1: Hide specialAreaRestriction for direct_from_authority
#   - D2: Reframe purchaseType for BT flows
#   - D3: Hide builder/RERA questions for Top-up Only
#   - D4: Dynamic priorAssessmentHistory description
#   - D5: Add authority-specific seller transaction page

pnpm run test:unit
git commit -m "feat: domain-aware question gating (5 changes)"
```

### Phase 4: Testing (5-6 hours, 1-1.5 days)

```bash
# Run complete test matrix
pnpm run test:unit      # All tests
pnpm run test:e2e       # Full E2E suite

# Manual test 9 critical flows from INTEGRATED-REMEDIATION-PLAN.md
# - New Loan (4 area types)
# - BT Only (registry done / not done)
# - BT + Top-up
# - Top-up Only

# Update documentation
# - docs/DEVELOPMENT-PLAN.md (add "Phase 5: Schema Remediation")
# - Rule authoring guide (add compliance pairing requirement)
# - MEMORY.md (session notes)
```

### Phase 5: Defer to Next Sprint

```
P2 Medium optimizations (8-12 hours)
- Remove redundant uiMeta.icon
- Consolidate question variants
- Split property condition page
- Other refactoring

Can skip for now if timeline is tight.
```

---

## Safety Checklist (Before Each Commit)

```
[ ] Both schema files match exactly
    diff -q src/lib/config/homeLoanSchemaV2.json src/lib/server/formEngine/schemas/homeLoanSchemaV2.json

[ ] Type checking passes
    pnpm run check

[ ] Unit tests pass
    pnpm run test:unit

[ ] No orphaned references
    grep -n "New Home Loan" src/lib/
    grep -n "Resale\|Direct Sale" src/lib/

[ ] Smoke test at least 1 flow
    Visit http://localhost:5173/form/home-loan
    Fill case intake + property location for P0/P1 fixes
    Fill relevant flow for domain logic fixes
```

---

## Critical Points

### Atomic Updates
- **ALWAYS** update both schema files together
- Use `diff` to verify they match after each edit
- One logical change = one commit

### Testing
- P0 fixes: Minimal testing (they're clearly broken)
- P1 fixes: Comprehensive testing (rule engine impact)
- Domain fixes: Full flow testing (UX impact)
- Use testing checklist from INTEGRATED-REMEDIATION-PLAN.md

### Rollback (If Needed)
```bash
# Single commit
git revert [commit-hash]

# Multiple commits
git checkout [last-good-commit-hash]
git push origin main
```

---

## Questions? Reference

| Question | Answer |
|----------|--------|
| Why are there 2 schema files? | Mirror pattern: canonical in server/, mirror in config/ for fast load |
| How do I know which fixes break things? | P0 & P1 are safe (low risk). Domain logic might change UX (medium risk). All have test scenarios. |
| What if I only have 1 day? | Do P0 fixes only (2-3 hrs). Highest ROI, zero risk. |
| Can I do these in parallel? | P0 & P1 can't (they're dependencies). Domain logic can start after P1-1 (RERA dedup). |
| Which files matter most? | `homeLoanSchemaV2.json` (both locations). Everything else flows from it. |

---

## Success Criteria

After completing all phases:

- ✅ 0 schema issues (P0+P1 fixed)
- ✅ All 8 flows domain-appropriate
- ✅ Test suite passing (0 regressions)
- ✅ Type checking: 0 errors
- ✅ All 9 BT scenarios tested
- ✅ Documentation updated

---

## Next Action

1. **Read:** `docs/INTEGRATED-REMEDIATION-PLAN.md` (Parts 2-3 for detailed fixes)
2. **Start:** Phase 1 (P0 fixes) — P0-1 first (delete dead question)
3. **Test:** Run after each P0 fix
4. **Commit:** Atomic commits with clear messages
5. **Progress:** Update `docs/DEVELOPMENT-PLAN.md` as you go
