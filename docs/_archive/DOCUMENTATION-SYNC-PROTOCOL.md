# Documentation Synchronization Protocol

> **Purpose**: Enterprise-grade system for keeping CLAUDE.md, MEMORY.md, SESSION-HANDOFF.md, DEVELOPMENT-PLAN.md, CHANGELOG.md, and code in perfect sync
> **Version**: 1.0 | **Effective**: 2026-02-27
> **Owner**: Claude Code Agent (automated)

---

## 1. The 5-Layer Documentation System

### Layer 0: CLAUDE.md (The Constitution)

**Owner**: User (code repository, part of git history)
**Updates**: Rarely (only when architecture decisions change)
**Content**:

- Standing instructions (NEVER add Co-Authored-By, always stay on main, etc.)
- Non-negotiable architectural decisions (14 locked items)
- Tech stack, conventions, key patterns
- Role definitions (DSA, RM, Admin)

**Guardrails**:

- ❌ Don't add session-specific context here
- ❌ Don't reference specific commits
- ❌ Don't list incomplete features

**When to Update CLAUDE.md**:

- ✅ User changes a standing instruction
- ✅ New architectural decision is made (locked in for all future work)
- ✅ Tech stack changes (e.g., switch from Nodemailer to SendGrid)
- ✅ New convention is established (e.g., "always use flowDomainLogic.ts helpers")

**Verification**:

```bash
# After updating CLAUDE.md, verify:
1. All references are timeless (no dates, no commit hashes)
2. All conventions have examples in the codebase
3. All architectural decisions are actually locked
4. Run: git log --oneline CLAUDE.md (should be < 1 update per sprint)
```

---

### Layer 1: MEMORY.md (Personal Context Memory)

**Owner**: Claude Code agent (in user's .claude/projects folder)
**Updates**: Before every context compaction (~90% usage)
**Content**:

- Current session number and date
- Working tree status (CLEAN/DIRTY)
- Latest commit and branch
- Session-specific discoveries and lessons learned
- Persistent project knowledge (patterns, gotchas, key files)

**Guardrails**:

- ✅ Keep it under 200 lines (move long content to separate files)
- ✅ Only persist across-session insights
- ❌ Don't duplicate what's in SESSION-HANDOFF
- ❌ Don't add tasks/todos (goes in SESSION-HANDOFF)

**When to Update MEMORY.md**:

- ✅ Context compaction (~90% usage)
- ✅ After discovering a recurring bug pattern
- ✅ After establishing a new code pattern
- ✅ After user explicitly requests "remember this"

**Sample Entry Format**:

```markdown
## Critical Pattern (Session 7)

When updating schema, ALWAYS update both locations atomically:

- src/lib/config/homeLoanSchemaV2.json
- src/lib/server/formEngine/schemas/homeLoanSchemaV2.json
  Reason: schemaLoader.ts loads from server location; config is mirror
```

---

### Layer 2: SESSION-HANDOFF.md (Active Plan & Batch Progress)

**Owner**: Claude Code agent (auto-updated)
**Updates**: After every major batch completion + before context compaction
**Content**:

- Active batch progress (which agents running, what files created)
- Uncommitted work description
- Next immediate steps (exact command or file to read)
- Critical decisions made THIS session
- Git state (commits, uncommitted changes)

**Guardrails**:

- ✅ This is the ONLY place for current batch status
- ✅ Must include "Next Action" that's actionable (not vague)
- ❌ Don't duplicate historical information (goes to CHANGELOG)
- ❌ Don't add standing instructions (goes to CLAUDE.md)

**When to Update SESSION-HANDOFF.md**:

- ✅ After each completed batch (before launching next)
- ✅ Before context compaction (summary of all work done)
- ✅ After critical discovery (e.g., "found root cause of bug X")
- ✅ When abandoning a path ("tried approach A, switching to B")

**Verification**:

```bash
# After updating, verify:
1. "Next Action" section is specific and actionable
2. All in-progress agents listed with their status
3. All uncommitted files listed
4. Commit history shows all work done
```

---

### Layer 3: DEVELOPMENT-PLAN.md (Living Roadmap)

**Owner**: Claude Code agent (auto-updated after sessions)
**Updates**: After every task completion
**Content**:

- Where we are (current phase, completion %)
- What's next (task list with priorities)
- What's blocked (with reason)
- Historical phases (marked COMPLETE with commit refs)

**Guardrails**:

- ✅ Keep priorities fresh (HIGH/MEDIUM/LATER)
- ✅ Reference real commits and files
- ❌ Don't remove completed items (move to CHANGELOG)
- ❌ Don't add session-specific details (goes to SESSION-HANDOFF)

**When to Update DEVELOPMENT-PLAN.md**:

- ✅ After completing a task (move to done, link commit)
- ✅ After discovering a new blocker (add to BLOCKED section)
- ✅ After user changes priorities (reorder tasks)
- ✅ After architecture decision affects roadmap

**Verification**:

```bash
# After updating, verify:
1. All COMPLETE items have commit references
2. Priorities match actual user priority
3. No items are both TODO and BLOCKED (resolve one)
4. Test counts are current
```

---

### Layer 4: CHANGELOG.md (Append-Only History)

**Owner**: Claude Code agent (append only, never edit)
**Updates**: After each major commit batch
**Content**:

- Date and batch title
- Scope (files touched)
- What was changed
- Test status
- Any course corrections discovered

**Guardrails**:

- ✅ Append only (never edit old entries)
- ✅ Use consistent format for every entry
- ❌ Don't move items (just keep adding)
- ❌ Don't remove entries (keep for audit trail)

**When to Update CHANGELOG.md**:

- ✅ After each commit batch (even 1-commit batches)
- ✅ Include test counts, errors, warnings
- ✅ Note if a deviation happened

**Sample Entry**:

```markdown
### 2026-02-27 — Fixed Critical Schema Mismatch + Type Definition Bugs

**Commits**: 7f632446, 738944e8 (2 critical fixes)
**Scope**: flowDomainLogic.ts, 2× homeLoanSchemaV2.json, 2× type definition files
**What**:

- Fixed "New Home Loan" → "New Loan" enum mismatch (broke all D1-D5 domain logic)
- Fixed missing 'month-year' type in TypeScript definitions
  **Tests**: 7,010+ passing | **Errors**: 0 | **Warnings**: 0
  **Course Correction**: None (issues were genuine bugs, not design deviations)
```

---

## 2. Cross-System Synchronization (The Hard Problem)

Every code change affects multiple systems. Here's how to keep them all documented:

### 2.1 Form Schema Changes → Everywhere

**When you add/remove/modify a question in homeLoanSchemaV2.json**:

```
Schema Change
    ↓
├─ Update BOTH schema files (config + server)
├─ Update types (form.ts, questionSchema.ts, formEngine.ts)
├─ Update payload builders (loanTransaction.ts, casePayloadBuilder.ts)
├─ Update enricher (payloadEnricher.ts for derived fields)
├─ Update rule validator (ruleValidator.ts for valid keys)
├─ Update test fixtures (pageFlowMap.ts, archetypeHelpers.ts)
├─ Update type definition docs (PAYLOAD_DOCUMENTATION.md)
└─ Log in SESSION-HANDOFF.md under "Files Modified"
```

**Verification Checklist** (MUST pass before committing):

```markdown
## Before Committing Schema Changes

- [ ] Both schema files updated atomically (config + server)?
- [ ] Type definitions updated (types/form.ts, types/questionSchema.ts)?
- [ ] Payload builders updated (payloadBuilder/loanTransaction.ts)?
- [ ] Enricher updated if new derived field (payloadEnricher.ts)?
- [ ] Validator updated (ruleValidator.ts)?
- [ ] Test fixtures updated (pageFlowMap.ts)?
- [ ] PAYLOAD_DOCUMENTATION.md updated with new contextKeys?
- [ ] pnpm run check passes?
- [ ] pnpm run test:unit passes?
- [ ] SESSION-HANDOFF.md updated with all files touched?
```

### 2.2 Type Definition Changes → Everywhere

**When you add a new type or modify an existing one**:

```
Type Change
    ↓
├─ Update main type file (form.ts, questionSchema.ts, etc.)
├─ Update server-side consumers (payloadBuilder, enricher)
├─ Update client-side consumers (components, validation)
├─ Update test fixtures/mocks
├─ Update ARCHITECTURE.md or PAYLOAD_DOCUMENTATION.md
└─ Log in SESSION-HANDOFF.md
```

### 2.3 API Endpoint Changes → Everywhere

**When you add/modify an API route**:

```
API Change
    ↓
├─ Update route (+server.ts)
├─ Update request/response types
├─ Update LOAN-ASSESSMENT-API-INTEGRATION.md (external APIs)
├─ Update e2e tests (Playwright)
├─ Update API response examples in PAYLOAD_DOCUMENTATION.md
├─ Verify guards (auth, permission checks)
└─ Log in SESSION-HANDOFF.md
```

### 2.4 Database Changes → Everywhere

**When you add/modify MongoDB schema**:

```
Database Change
    ↓
├─ Update collection definition (mongo.ts)
├─ Update indexes (add/modify in mongo.ts)
├─ Update types (types/casePayload.ts, etc.)
├─ Update payload builders
├─ Update Mongoose-free access patterns
├─ Update ARCHITECTURE.md Section 13
└─ Log in SESSION-HANDOFF.md
```

### 2.5 Dashboard/UI Changes → Everywhere

**When you add/modify dashboard pages**:

```
Dashboard Change
    ↓
├─ Update component (src/routes/dashboard/...)
├─ Update server logic (+page.server.ts)
├─ Update API endpoints (if needed)
├─ Update types (form.ts)
├─ Add e2e test (if critical path)
├─ Update ARCHITECTURE.md Section 15 if structural
└─ Log in SESSION-HANDOFF.md
```

---

## 3. Handling Deviations (When Code ≠ Docs)

**Deviations happen.** Requirements change, bugs are found, priorities shift. Here's how to handle them:

### 3.1 Detect a Deviation

You're implementing Task X but discover:

- ✗ The spec assumes feature Y exists (it doesn't)
- ✗ The implementation would break feature Z
- ✗ Requirements changed mid-sprint
- ✗ A simpler approach emerged

### 3.2 Document the Deviation

**Add an entry to SESSION-HANDOFF.md immediately**:

```markdown
## Deviations This Session

### D1: Area-Specific Schema (2026-02-27)

**Planned**: Add 5 Q1 variants + 7 new questions
**Actual**: Changed approach — using single dynamic label instead of 5 variants
**Reason**: User preference — simpler for DSAs, same outcome
**Impact**: Saves 40+ lines JSON, reduces test fixtures
**Reference**: Commit abc1234
```

### 3.3 Update Affected Docs

1. **DEVELOPMENT-PLAN.md**: Update task description to reflect actual approach
2. **CHANGELOG.md**: Note the deviation in the commit batch entry
3. **CLAUDE.md**: If it changes a standing decision, document it
4. **Relevant spec doc**: If it's in AREA-SPECIFIC-COMPLIANCE-REDESIGN.md, update it

### 3.4 Verify the Deviation is Intentional

Before committing, ask:

- ✅ Is this intentional or a mistake?
- ✅ Does the user know about it?
- ✅ Are all affected systems updated?
- ✅ Will this decision hold (or is it temporary)?

---

## 4. Synchronization Checklist (Do Before Every Commit)

```markdown
## Before Committing Code

### Documentation Sync (5 min)

- [ ] SESSION-HANDOFF.md: Updated with files changed?
- [ ] CHANGELOG.md: Ready for append-only entry?
- [ ] DEVELOPMENT-PLAN.md: Task status updated?
- [ ] Affected spec docs: Updated with any deviations?
- [ ] MEMORY.md: Any cross-session patterns to record?

### Cross-System Verification (5 min)

- [ ] Schema changes: Both config + server updated?
- [ ] Type changes: All consumers updated?
- [ ] API changes: Tests + docs updated?
- [ ] Database changes: Indexes + types updated?
- [ ] Dashboard changes: Server logic + types updated?

### Code Quality (5 min)

- [ ] pnpm run check passes?
- [ ] pnpm run test:unit passes?
- [ ] No console.error/console.log (use logger)?
- [ ] All new files documented in SESSION-HANDOFF?

### Git Safety (2 min)

- [ ] Branch is main?
- [ ] No Co-Authored-By in commit message?
- [ ] Commit message references files changed?
- [ ] git status clean after commit?
```

---

## 5. Automation Strategy (Keep Synchronized Automatically)

### 5.1 What to Automate

**Pre-commit Hook** (`.husky/pre-commit`):

```bash
# 1. Type check
pnpm run check

# 2. Test run
pnpm run test:unit

# 3. Lint docs
# Check SESSION-HANDOFF has "Next Action"
# Check CHANGELOG last entry is not > 2 days old
```

### 5.2 What to Manual Check (Cannot Automate)

- ✓ Deviations documented (intentional, not accidental)
- ✓ All affected systems covered
- ✓ DEVELOPMENT-PLAN.md reflects actual priorities
- ✓ CLAUDE.md decisions haven't drifted

---

## 6. Quarterly Audit (System Health Check)

**Do this every 3 months or before major release**:

```markdown
## Documentation Audit Checklist

### 1. Consistency Check

- [ ] CLAUDE.md decisions match actual code patterns?
- [ ] DEVELOPMENT-PLAN.md tasks match what was actually done?
- [ ] CHANGELOG.md covers all significant commits?
- [ ] MEMORY.md patterns show up in actual code?

### 2. Completeness Check

- [ ] All 6 loan types documented in PAYLOAD_DOCUMENTATION.md?
- [ ] All API endpoints in LOAN-ASSESSMENT-API-INTEGRATION.md?
- [ ] All database collections in ARCHITECTURE.md Section 13?
- [ ] All dashboard pages in ARCHITECTURE.md Section 15?
- [ ] All test files in test count (check test:unit output)?

### 3. Freshness Check

- [ ] CLAUDE.md < 3 months old?
- [ ] DEVELOPMENT-PLAN.md < 2 weeks old?
- [ ] SESSION-HANDOFF.md updated after last commit?
- [ ] CHANGELOG.md has entry for every major batch?
- [ ] MEMORY.md < 1 month old?

### 4. Deviation Check

- [ ] All deviations documented in SESSION-HANDOFF?
- [ ] No undocumented architectural changes?
- [ ] No "temporary" code that became permanent?

### 5. Output

Create `docs/AUDIT-REPORT.md`:
```

# Documentation Audit — Q1 2026

**Date**: 2026-03-31
**Auditor**: Claude Code Agent
**Status**: ✅ PASS / ⚠️ WARNINGS / ❌ FAIL

## Findings

1. ...
2. ...

## Recommendations

1. ...

```

```

---

## 7. File Ownership Matrix

| File                                | Owner  | Updates                | Frequency                | Approval                 |
| ----------------------------------- | ------ | ---------------------- | ------------------------ | ------------------------ |
| **CLAUDE.md**                       | User   | Standing decisions     | Rarely (<1/sprint)       | User approval            |
| **MEMORY.md**                       | Claude | Cross-session patterns | ~90% token usage         | Auto (user can review)   |
| **SESSION-HANDOFF.md**              | Claude | Active batch progress  | After each batch         | Auto (informational)     |
| **DEVELOPMENT-PLAN.md**             | Claude | Task status            | After task completion    | Auto (user can override) |
| **CHANGELOG.md**                    | Claude | Work log               | After each commit batch  | Auto (append-only)       |
| **ARCHITECTURE.md**                 | Claude | System docs            | When major feature ships | Auto (update on change)  |
| **Spec docs** (AREA-SPECIFIC-\*.md) | Claude | Feature specs          | During feature work      | Auto (updated per plan)  |

---

## 8. Emergency Protocol (When Sync is Lost)

**If you suspect documentation drift**:

1. **Check the truth source** (actual code)

   ```bash
   grep -r "contextKey.*propertyAreaType" src/lib --include="*.ts" --include="*.json"
   ```

2. **Compare with docs**
   - Check PAYLOAD_DOCUMENTATION.md
   - Check ARCHITECTURE.md
   - Check SESSION-HANDOFF.md

3. **If drift detected**:
   - Fix the docs (not the code)
   - Add entry to SESSION-HANDOFF.md: "Sync Recovery: [what was fixed]"
   - Run audit: `pnpm run check && pnpm run test:unit`

4. **Prevent future drift**:
   - Add verification to next SESSION-HANDOFF
   - Document the pattern in MEMORY.md

---

## 9. Quick Reference: Which File for What?

```
"I need to..."                              → Read/Update...
────────────────────────────────────────────────────────────
Understand the system architecture          → ARCHITECTURE.md
Check what was done last session            → SESSION-HANDOFF.md
See all work ever done                      → CHANGELOG.md
Know current priorities                     → DEVELOPMENT-PLAN.md
Understand a specific component pattern     → ARCHITECTURE.md + MEMORY.md
Know form→API field mapping                 → PAYLOAD_DOCUMENTATION.md
Understand how rule engine works            → RULE-ENGINE-SPECIFICATION.md
Find what commit fixed a bug                → CHANGELOG.md (search)
Know standing conventions                   → CLAUDE.md
Resume work mid-sprint                      → SESSION-HANDOFF.md
Understand payload schema                   → PAYLOAD_DOCUMENTATION.md
Know about past bugs/lessons                → MEMORY.md
```

---

## 10. Implementation Checklist (Deploy This Protocol)

```markdown
## Deploy Documentation Sync Protocol

### 1. Update CLAUDE.md

- [ ] Add reference to this protocol
- [ ] Clarify MEMORY.md role
- [ ] Link to SESSION-HANDOFF.md

### 2. Create Documentation Templates

- [ ] SESSION-HANDOFF.md format (copy from Section 1)
- [ ] CHANGELOG.md entry format (copy from Section 1)
- [ ] DEVIATION format (copy from Section 3)

### 3. Set Up Pre-Commit Hook

- [ ] Create .husky/pre-commit with checks
- [ ] Test it runs before commits

### 4. Create Quarterly Audit Template

- [ ] Create AUDIT-REPORT.md template
- [ ] Schedule first audit (if needed)

### 5. Document in MEMORY.md

- [ ] Add "Sync Protocol Active" note
- [ ] Link to this file for future sessions

### 6. First Verification

- [ ] Audit current state (CLAUDE.md, MEMORY.md, SESSION-HANDOFF.md in sync?)
- [ ] Fix any drift
- [ ] Commit: "docs: implement documentation synchronization protocol"
```

---

## Conclusion

This protocol ensures:

- ✅ **CLAUDE.md** = unchanging constitution
- ✅ **MEMORY.md** = cross-session context
- ✅ **SESSION-HANDOFF** = active batch status (auto-updated)
- ✅ **DEVELOPMENT-PLAN** = living roadmap (auto-updated)
- ✅ **CHANGELOG** = immutable audit trail (append-only)
- ✅ **Code** = source of truth (if drift, docs corrected)
- ✅ **All systems** = dashboards, tests, APIs, databases documented
- ✅ **Deviations** = explicitly tracked and approved

**Result**: Future Claude sessions always know exactly what's happening and what to do next.
