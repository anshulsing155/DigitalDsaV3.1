# Schema Remediation — Dependency & Execution Map
**Purpose:** Visualize fix dependencies, identify parallelization opportunities, understand execution paths

---

## Fix Dependency Graph

```
┌─────────────────────────────────────────────────────────────────┐
│                    PHASE 1: CRITICAL FIXES (P0)                 │
│                  (Independent, run in any order)                │
└─────────────────────────────────────────────────────────────────┘

P0-1: Delete q1b                    P0-2: Tautology            P0-3: "New Home Loan"
  propertyComplianceStatus_converted    sellerOwnershipType        sellerTransaction page
      (line ~1402)                      (line ~3003)               (line ~2909)
          ↓                                  ↓                           ↓
    Remove dead code             Fix showWhen logic          Fix enum value

P0-4: Validation "Case"            P0-5: Orphaned values         P0-6: contextKey typo
   q4_propertyStateName                purchaseType               q8_remainingTenure
      (line ~406)                   (lines 2005,4227,4809)       (line ~5502)
          ↓                                 ↓                          ↓
   Fix case typo             Fix enum references          Fix spelling

        ║
        ║ ALL PASS TESTS
        ║
        ↓
 ┌──────────────────┐
 │  COMMIT: P0 ALL  │
 └──────────────────┘


┌─────────────────────────────────────────────────────────────────┐
│              PHASE 2: HIGH PRIORITY FIXES (P1)                  │
│       (P1-3 depends on P0; others can run after P1-1)           │
└─────────────────────────────────────────────────────────────────┘

           P1-1: RERA Dedup               P1-4: Zone Warning
         propertyCondition                zoneClassification
            (lines 2031,4349)                (line ~2270)
                ↓                               ↓
         Remove q8 from Legal        Add COMMERCIAL & GREEN_BELT
      Standardize "EXEMPTED"            Fix warning condition
                ║                              ║
                ║ (Can run parallel)           ║
                ╚═══════════╤═════════════════╝
                            ↓
           P1-2: Compliance Pairing
          (Audit policy rules for
         propertyComplianceStatus usage)
                ↓
        Add validation in ruleValidator.ts
        Update rule authoring guide


                    P1-3: Page Ordering ← Depends on P0-5
                  BT_TOPUP_PAGE_ORDER
                   (Move btRegistry up)
                       (3 locations)
                       ↓
                   Test all BT flows


        ║
        ║ ALL P1 TESTS PASS
        ║
        ↓
 ┌──────────────────┐
 │  COMMIT: P1 ALL  │
 └──────────────────┘


┌──────────────────────────────────────────────────────────────────┐
│        PHASE 3: DOMAIN LOGIC (Depends on P1-1,P1-3)              │
│              (Can parallelize D1-D5 somewhat)                    │
└──────────────────────────────────────────────────────────────────┘

  D1: Hide specialAreaRestriction    D2: Reframe purchaseType
     for direct_from_authority          for BT flows
           (line ~1300)                  (lines q2a/q2b)
              ↓                               ↓
         Add purchaseType check        Add loanType description


  D3: Hide builder questions         D4: Dynamic assessment      D5: Authority seller
      for Top-up Only                    question text          (NEW page creation)
      (6 questions, various)         (priorAssessmentHistory)   (sellerTransaction_
              ↓                          (dynamicQuestionText.ts)   authority_homeLoan)
      Add loanType checks            Conditionally set by         ↓
                                      loanType during render    Add questions:
                                                                 allotmentLetter,
                                                                 authorityPayment, etc.
        ║
        ║ (D1-D4 can parallelize)
        ║ (D5 depends on overall flow understanding)
        ║
        ╚═══════════════════════════════════════════════╤════════╝
                                                        ↓
                        P1-3 (Page Ordering)
                    Must be done BEFORE domain fixes
                    (D3 references isRegistryDone)
                    (D2 depends on flow logic)


            ║
            ║ DOMAIN LOGIC TESTS PASS
            ║ (9 BT scenarios + 8 flows)
            ║
            ↓
     ┌──────────────────────────────────────────┐
     │  COMMIT: Domain Logic Gating + D5 Page   │
     └──────────────────────────────────────────┘


┌──────────────────────────────────────────────────────────────────┐
│                 PHASE 4: FULL INTEGRATION TEST                   │
│              (All prior phases must pass first)                  │
└──────────────────────────────────────────────────────────────────┘

    Unit Tests         E2E Tests          Manual Testing
   (schema fixes)    (form flows)      (9 BT scenarios
        ↓                 ↓               + 8 loan flows)
    pnpm run         pnpm run test:e2e     Walk through
    test:unit                             each flow

        ║
        ║ ALL TESTS PASSING
        ║
        ↓
   ┌────────────────────────────────┐
   │  PRODUCTION READY (P0+P1+DOM)   │
   │  Can defer P2 to next sprint    │
   └────────────────────────────────┘


┌──────────────────────────────────────────────────────────────────┐
│              PHASE 5: REFACTORING (P2) — NEXT SPRINT             │
│                  (Can be deferred, low priority)                 │
└──────────────────────────────────────────────────────────────────┘

P2-1: Strip uiMeta.icon    P2-2: Merge purchaseType    P2-3: Consolidate docs
        (80 items)              variants (q2a+q2b)        readiness variants
            ↓                        ↓                          ↓
       Script cleanup          Merge questions            Extract shared options


P2-4: Split propertyCondition    P2-5: registryDateReason    P2-6-9: Various optimizations
            ↓                          ↓                              ↓
   Compliance + Approvals        Make optional/remove          Case-by-case
   Municipal + Colony Specifics   (low impact)
   Construction Status

        ║
        ║ (Low priority, can parallelize)
        ║
        ↓
    Schedule as dedicated
    refactor sprint (1-2 weeks)
    after major release
```

---

## Execution Matrix: Which Fixes to Run When

### Day 1: P0 Fixes (All Independent)

| Fix | Duration | Files | Risk | Can Parallelize |
|-----|----------|-------|------|-----------------|
| P0-1 | 15 min | homeLoanSchemaV2.json (both) | NONE | YES |
| P0-2 | 15 min | homeLoanSchemaV2.json (both) | NONE | YES |
| P0-3 | 5 min | homeLoanSchemaV2.json (both) | NONE | YES |
| P0-4 | 5 min | homeLoanSchemaV2.json (both) | NONE | YES |
| P0-5 | 30 min | homeLoanSchemaV2.json (both) | NONE | YES |
| P0-6 | 30 min | homeLoanSchemaV2.json (both) + audit downstream | LOW | NO* |

*P0-6 requires downstream audit; do after others if time is tight.

**Execution:** Edit both schema files, make all P0 changes (can work on different issues in parallel if you have 2 terminals), verify with diff, test together, commit once.

---

### Day 2: P1 Fixes

| Fix | Duration | Depends On | Risk | Notes |
|-----|----------|-----------|------|-------|
| P1-1 | 1 hr | Nothing | LOW | Can run anytime, but test early |
| P1-2 | 2-4 hrs | P1-1 (uses consistency requirement) | MEDIUM | Requires rule audit |
| P1-4 | 15 min | Nothing | LOW | Can run in parallel with P1-1,P1-2 |
| **P1-3** | 2-3 hrs | P0-5 fixed | MEDIUM | **MUST do after P0-5** (orphaned enum fixed) |

**Sequence:**
1. P1-1 + P1-4 (can run together, low effort)
2. P1-2 (rule audit after P1-1)
3. P1-3 (after P0-5 confirmed fixed)

---

### Days 3-4: Domain Logic

| Fix | Duration | Depends On | Risk | Parallelize |
|-----|----------|-----------|------|-------------|
| D1 | 30 min | P1-3 (flow logic working) | MEDIUM | YES (with D2, D4) |
| D2 | 30 min | P1-3 | MEDIUM | YES (with D1, D4) |
| D3 | 1 hr | P1-3 | MEDIUM | YES (with D1, D2, D4) |
| D4 | 1 hr | P1-3 | MEDIUM | YES (with D1, D2, D3) |
| D5 | 2-3 hrs | P1-3 + overall understanding | MEDIUM | NO (new page architecture) |

**Sequence:**
1. D1, D2, D3, D4 in parallel (1.5-2 hrs total)
2. D5 after others complete (requires full context)

---

### Day 5: Integration & Testing

- Unit tests (all phases)
- E2E tests (all flows)
- Manual testing (9 BT + 8 loan scenarios)
- Documentation updates

---

## Fast-Track Option (1 Day)

If timeline is critical, **minimum viable fixes only**:

```
1. P0-1 → P0-6 (2-3 hrs)
   - All critical fixes, highest ROI

2. P1-1 (1 hr)
   - RERA deduplication (prevents data overwrites)

3. Skip P1-2, P1-3, P1-4 until next sprint

4. Skip Domain Logic fixes (UX doesn't break, just awkward)

5. Test P0 + P1-1 end-to-end (1.5 hrs)

= 4.5-5 hours
= Eliminates 7 critical+high issues
= Defers 15 medium+low issues to later
```

**Result:** Production-safe but not fully optimized. Schedule full fixes for next sprint.

---

## Detailed Execution Timeline

### Option A: Full Implementation (6-10 days)

```
WEEK 1, MONDAY-WEDNESDAY (Days 1-3)
├─ Day 1 (4 hrs): P0 critical fixes + test
├─ Day 2 (5 hrs): P1 high fixes + test
├─ Day 3 (3 hrs): Integration test

WEEK 1, THURSDAY-FRIDAY (Days 4-5)
├─ Day 4 (6 hrs): Domain logic fixes + full flow test
├─ Day 5 (3 hrs): Smoke tests + documentation

WEEK 2, MONDAY-WEDNESDAY (Days 6-10) [OPTIONAL: Defer to Next Sprint]
├─ Day 6-10: P2 refactoring sprint (8-12 hrs spread across week)
```

**Deliverable:** Production-ready schema with all known issues resolved + refactoring complete

---

### Option B: Minimum Viable (1 Day)

```
WEEK 1, MONDAY (Single Day)
├─ 2-3 hrs: P0 fixes (all 6)
├─ 1 hr: P1-1 (RERA)
├─ 1.5 hrs: Integration test + documentation
└─ TOTAL: ~5 hours

LATER (Next Sprint):
├─ P1-2, P1-3, P1-4
├─ Domain Logic (D1-D5)
├─ P2 Refactoring
```

**Deliverable:** Critical issues resolved, deferred work documented for later

---

### Option C: Phased (2-3 Days)

```
WEEK 1, MONDAY-TUESDAY (Days 1-2)
├─ Day 1 (2-3 hrs): P0 fixes
├─ Day 2 (3 hrs): P1-1,P1-4 + test

WEEK 1, WEDNESDAY
├─ Day 3 (1.5 hrs): P1-2,P1-3 if time, else defer

WEEK 2 (Following Week)
├─ Days 4-5: Domain Logic
├─ Days 6-10: P2 Refactoring
```

**Deliverable:** Phased shipping; ready for each phase independently

---

## Risk Mitigation Timeline

| Phase | Risk | Mitigation | Timeline |
|-------|------|-----------|----------|
| P0 | NONE | Each fix is isolated; test after commit | 1 hr/fix |
| P1 | MEDIUM | Rule audit before commit; extensive flow testing | +1-2 hrs post-commit |
| Domain | MEDIUM | Full E2E test matrix; UX review before deploy | +1.5-2 hrs post-commit |
| P2 | LOW | Can run in background; no blocking | Can defer indefinitely |

**Rollback Window:** Each phase has clear rollback procedure. P0/P1 can be reverted in <5 min if issues.

---

## Resource Allocation

### Solo Developer
- Recommended: Option A (full implementation) or Option B (fast-track)
- 1 day = P0 only (5-6 hrs)
- 2 days = P0 + P1-1 (6-7 hrs)
- 3 days = P0 + P1 (10 hrs, can defer P2)

### Pair (Developer + QA)
- Developer does fixes (P0, P1, Domain)
- QA runs test matrix in parallel
- Both collaborate on domain logic review
- Recommended: Option A (full, compressed to 4 days)

---

## Success Checkpoints

| Checkpoint | Phase | Success Criteria | Action if Failed |
|------------|-------|------------------|------------------|
| **P0 Complete** | 1 | All 6 P0 tests pass + schema validates | Rollback commit, fix, re-test |
| **P1 Complete** | 2 | All 4 P1 tests pass + flow tests clean | Rollback commit, fix, re-test |
| **Domain Complete** | 3 | 9 BT scenarios + 8 flows all pass | Rollback commit, review domain logic |
| **Full Integration** | 4 | Unit + E2E suite passing, 0 regressions | Investigate test failures, fix code |
| **Documentation** | 5 | MEMORY.md, DEVELOPMENT-PLAN.md updated | Update before merge to main |

---

## Key Decision Points

### Before Starting P1-3 (Page Ordering)
- **Decision:** Confirm P0-5 (enum fix) is complete and tested
- **Why:** P1-3 depends on valid purchaseType values being in schema
- **If not ready:** Skip P1-3 (it's lower priority than P1-1,P1-2), move to P2 sprint

### Before Starting Domain Logic
- **Decision:** Confirm all P1 tests passing
- **Why:** Domain logic builds on fixed schema structure
- **If not ready:** Test P1 more thoroughly before touching domain flow

### Before Deferring P2
- **Decision:** Is P0+P1 complete + tested?
- **Why:** P2 is optimization only; doesn't block production use
- **If uncertain:** Ship P0+P1, demo to team, plan P2 sprint

---

## Summary: Recommended Path

**Start here → Most efficient way to completion:**

```
1️⃣  Day 1 (4-5 hrs):  P0 Fixes (all 6)
    └─ Result: Critical bugs eliminated

2️⃣  Day 2 (5-6 hrs):  P1 Fixes (all 4)
    └─ Result: High-priority issues resolved

3️⃣  Day 3 (6-7 hrs):  Domain Logic (D1-D5)
    └─ Result: All flow logic domain-appropriate

4️⃣  Day 4-5 (2-3 hrs):  Full Testing + Docs
    └─ Result: Production-ready, documented

5️⃣  Week 2+:  P2 Refactoring (if time)
    └─ Result: Code quality optimizations

✅ TOTAL: 6-10 days (or 5 days if p2 deferred)
```

**Checkpoint:** After Day 2, you have a production-safe schema. Can deploy and schedule Domain Logic + P2 for later if needed.
