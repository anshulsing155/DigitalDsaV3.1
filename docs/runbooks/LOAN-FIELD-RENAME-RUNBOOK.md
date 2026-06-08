# Loan Field Nomenclature Rename — Operator Runbook

**Purpose:** step-by-step playbook for merging the 2026-05-31 loan-field nomenclature rename worktree to `main`.

**Companion docs:**
- [ADR-0020](../adr/0020-loan-field-nomenclature.md) — decision record + 2026-05-31 amendment
- [Spec](../specs/LOAN-FIELD-NOMENCLATURE.md) — conceptual reference
- [Execution Plan](../specs/LOAN-FIELD-NOMENCLATURE-EXECUTION-PLAN.md) — batch-by-batch breakdown

**Worktree:** `.claude/worktrees/loan-field-rename` on branch `worktree-loan-field-rename` (or `claude/loan-field-rename` depending on creation).

---

## Step 1 — Pre-merge verification (15 min)

### 1a. Confirm the worktree builds clean

From the worktree directory:

```powershell
pnpm install                # if not already installed
pnpm check                  # expect 0 errors
pnpm test:unit -- --run     # expect: lock test passes; some fixture failures
                            # are documented carry-over (Batch 8c)
pnpm build                  # expect: green
```

### 1b. Run the live MongoDB rule-doc check

This confirms no active LenderRuleArtifact references the retired field names. Expected output: `Clean. No active rule doc references...`. If hits surface, **stop** — the PMS team needs to rewrite those rule docs first.

```powershell
node --env-file=.env.local scripts/check-rule-docs-field-refs.mjs
```

(Node 20.6+ syntax. If the env-file flag isn't available, set `$env:MONGODB_URI = "..."` first and drop the flag.)

Exit code 0 = clean, safe to proceed.
Exit code 1 = stop and escalate to PMS.

### 1c. Browser smoke (full path through every loan family)

In a fresh browser tab (clear sessionStorage + localStorage first), fill the entire form path for each loan family and reach the results page:

- [ ] Home Loan — New Loan
- [ ] LAP — Term Loan + DOD variants
- [ ] Plot Loan — Plot Loan Only, Plot & Construction, Plot & Equity, Construction Only
- [ ] Plot Loan — BT scope path (no variant question)
- [ ] Plot Loan — stash-and-restore: New Loan → pick variant → switch scope to BT → switch back to New Loan → variant should be pre-selected
- [ ] Personal Loan — Term Loan + OD facility variants
- [ ] Business Loan — Term Loan + OD/CC facility variants
- [ ] Professional Loan — Term Loan + OD facility variants

For each, verify on the results page that lender offers render. (Pre-launch data: this is OK to do on the shared test DB — see step 2 first to wipe stale state if needed.)

---

## Step 2 — Test-data wipe (10 min)

Pre-rename FormSnapshots / Cases / LenderResultsSnapshots have the old field shape. They won't be re-evaluable post-rename (the rule engine expects the new shape). Drop them.

**First, dry-run:**

```powershell
node scripts/wipe-pre-rename-cases.mjs
```

Output shows counts per collection. Confirm the numbers look right (rough order: hundreds of test cases is typical for pre-launch team-testing).

**Then, execute:**

```powershell
node scripts/wipe-pre-rename-cases.mjs --execute
```

The 4 demo `is_sample: true` cases are preserved automatically (they drive new-DSA onboarding and should survive the wipe).

---

## Step 3 — Team-tester browser cache flush (5 min, sync)

Anyone on the team with the app open in a browser has the old field shape in their sessionStorage / localStorage. Their next form-fill after deploy will mix old and new fields and fail validation.

Send a one-liner to the team (Slack / email):

> Loan-field rename merging now. Please close any open DigitalDSA form tabs and clear localStorage + sessionStorage before reopening. DevTools → Application → Storage → Clear site data.

---

## Step 4 — Bring the worktree to `main` (linear history, 10 min)

This repo enforces linear history on `main`. Use cherry-pick OR rebase, NOT a merge commit.

```powershell
# From the main checkout (NOT the worktree)
cd F:\TECH\DigitalDSA\REPOs\DigitalDSA-V3

# Verify nothing diverges
git fetch origin
git log HEAD..origin/main    # expect: no output (main up to date with origin)

# Cherry-pick all 12+ batch commits in order
git cherry-pick 610d81b4..bff44cc7   # adjust SHA range to actual worktree HEAD

# Or: rebase the worktree branch onto main and fast-forward
git rebase main worktree-loan-field-rename
git checkout main
git merge --ff-only worktree-loan-field-rename
```

Verify with:

```powershell
git log --oneline -15                                # confirm 12 batches landed
pnpm check                                            # 0 errors
pnpm test:unit -- --run loanFieldNomenclatureLock    # the lock test passes
```

---

## Step 5 — Push to remote (5 min)

```powershell
git fetch origin
git log HEAD..origin/main     # expect: no output (still aligned)
git push origin main
```

---

## Step 6 — Worktree cleanup (per standing rule)

```powershell
git worktree remove --force .claude\worktrees\loan-field-rename
git branch -D worktree-loan-field-rename
git worktree list             # verify removal
```

---

## Post-merge follow-ups (not blocking, do as you can)

1. **Batch 8c — finish snapshot regen.** 24 fixture / snapshot-lock test failures remain for PLOT-ONLY / PLOT-EQUITY / PLOT-CONSTRUCTION / PLOT-BT / LAP-NEW-TERM / EDGE-GOVT-SAL. Update `_regenBugAFixSnapshots.test.ts` TARGETS list (or write a new regen script) covering these fixtures, run with REGEN env var, manual-diff each updated snapshot.
2. **Archive dead bank-loan-management code.** `src/lib/services/homeLoanApi.ts` + `src/routes/(app)/(offers)/{loan-offers,topup-loan-offers,balance-transfer-offers}/+page.svelte` + the 4 dead OFFERS constants in `src/lib/config/routes.ts` + BottomTabs nav link.
3. **Plot & Equity Loan Phases 2-4.** Engine 3-cap calc + parser spec + offer-card UI per [ADR-0021](../adr/0021-plot-equity-loan-modeling.md). Phase 1 done by this rename.
4. **RM Questionnaire Pass 2.** Owner-deferred until nomenclature work completed — now unblocked.

---

## Rollback (if something breaks after merge)

The rename is bigger than a single `git revert` can cleanly handle. Rollback strategy:

1. Identify the worst-affected batch. Each commit message links to the plan-doc batch.
2. `git revert <SHA>..HEAD` to peel back the batches above the affected one.
3. Re-apply forward fixes.

Worst case (catastrophic): revert all 12 commits, restore the test-data dump if you took a backup pre-Step 2, accept the temporary form regression while a smaller fix is rebuilt.

Pre-launch, the cost of a hard rollback is contained — no live customer data, no live operator workflows affected.

---

## What this runbook does NOT do

- Update bank-loan-management repo. That repo is dead from DigitalDSA-V3's perspective. If it gets renamed separately, that's a different conversation.
- Coordinate with anyone outside the DigitalDSA team. Pre-launch context means no external API consumers, no field engineers in the field, no enterprise customers.
- Restore data. The test-data wipe is one-way. If you need a snapshot of pre-merge state, take a `mongodump` BEFORE Step 2.
