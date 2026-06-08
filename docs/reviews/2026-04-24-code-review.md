# Code Review — 2026-04-24

**Scope**: 16 commits since last review (2026-04-23), covering `4be2057d..7be6d7ef`
**Reviewer**: Automated daily review (Claude Code)
**Focus**: Security, bugs, UX issues, codebase alignment

---

## Previous Review Follow-Up

The 2026-04-23 review raised 7 findings (S1, S2, B1, C1–C5). Status:

| Finding | Status | Commit |
|---------|--------|--------|
| S1 — CSRF bypass on QA endpoints | **FIXED** | `6cff2c52` — all 5 `fetch()` → `secureFetch()`, plus batching (chunks of 10) and 100-scenario cap |
| S2 — Unbounded parallel scenario run | **FIXED** | `6cff2c52` — batching + limit added in same commit |
| B1 — Applicant reorder breaks state | **ADDRESSED** | `8eb7e88a` — `isPrimaryApplicant` flag replaces array reorder (see B1 below for gap) |
| C1 — `extractMeta()` duplicated | **FIXED** | `1e697b87` — extracted to `qaHelpers.ts` |
| C3 — `toObjectId()` duplicated 3× | **FIXED** | `1e697b87` + `924ded40` — consolidated in `qaHelpers.ts` |
| C4 — QA page direct lucide imports | **FIXED** | `4d0dc739` — migrated to `iconRegistry` |
| C5 — Legacy `get()` in FormShell | Not addressed (low priority, OK to defer) |

---

## Commits Reviewed

| Commit | Description | Risk |
|--------|-------------|------|
| `8eb7e88a` | isPrimaryApplicant flag replaces array reorder | MEDIUM |
| `05e32f9a` | CIBIL mismatch warning for impossible combos | LOW |
| `02dcd1c0` | GPA completion check — wizard checked wrong field | LOW |
| `6cff2c52` | secureFetch on QA endpoints + batching + limit | LOW (fix) |
| `b9de99f0` | Resolve 10 Svelte state_referenced_locally warnings | LOW |
| `5b1af288` | AddApplicantBusiness lint cleanup | TRIVIAL |
| `19f2cc73` | Husky git hooks (pnpm guard, linear history) | LOW |
| `55663e9c` | Relax hooks — keep pnpm guard + linear history only | LOW |
| `7be6d7ef` | Pin Node engine to 24.x | LOW |
| `662fd712` | Remove engines.pnpm for Vercel compat | LOW |
| Others (6) | Docs, dedup refactors, commit-msg hook, setup script | TRIVIAL |

---

## Findings

### B1 — BUG: `isPrimaryApplicant` flag not consumed by key systems (MEDIUM)

**Commit**: `8eb7e88a`

`setPrimaryApplicant()` correctly sets the `isPrimaryApplicant` flag on the chosen applicant and clears it on others. The array is no longer reordered — good. However, the flag is only read by two UI components:

- `ApplicantSummaryTable.svelte:149` — shows "Primary" badge
- `SuggestPrimaryBanner.svelte:200` — uses flag to find current primary

**These systems still ignore the flag and use `applicants[0]` or `index === 0`:**

1. **`form.svelte.ts:255-260`** — `primaryApplicant` getter checks `existingRoleOfPerson === 'primary'`, falls back to `applicants[0]`. Does NOT check `isPrimaryApplicant`.
2. **`ApplicantProfilePage.svelte:670`** — hardcodes `isPrimaryApplicant = index === 0` (local variable shadows the actual flag). Professional loan locked-field logic uses this, so if a co-applicant at index 1 is marked primary, they still won't get the profession lock.
3. **`wizardState.svelte.ts:403,411`** — completion checks use `applicants[0]` for BasicInfoFields and custom pages.
4. **Rule engine** — `variationMatcher.ts:42`, `payloadEnricher.ts`, `applicantSelectors.ts` all reference `applicants[0]` (some via selectors, some directly). Already documented as pending item #36 in MEMORY.md.

**Impact**: The "Set as Primary" button changes the badge and banner, but does NOT change who the rule engine evaluates as primary, who gets the profession lock, or who the wizard validates first. The feature is cosmetic-only right now.

**Recommendation**: Either (a) update `primaryApplicant` getter and wizard/engine consumers to check `isPrimaryApplicant` first, or (b) document this as a phase-1 UI-only feature with engine integration planned for item #36.

---

### C1 — CODE QUALITY: `setup.sh` modifies global git config (LOW)

**File**: `scripts/setup.sh:70-71`

```bash
git config --global pull.rebase true
git config --global rebase.autoStash true
```

These modify the developer's **global** git config, affecting ALL repositories on their machine. A developer who prefers merge-based pull in other projects will be surprised.

**Fix**: Use `--local` instead of `--global`, or at minimum warn the developer before changing global settings.

---

### C2 — CODE QUALITY: `pre-push` hook suggests interactive rebase (LOW)

**File**: `.husky/pre-push:77`

```
echo "   git rebase -i origin/$branch"
```

Interactive rebase (`-i`) opens an editor, which fails in non-interactive terminals (CI, Claude Code sandbox). The suggestion is fine for human developers reading the message, but if any automation parses hook output and tries to execute the suggestion, it would hang.

**Impact**: Negligible — the message is advisory, not executed. Just a note for awareness.

---

### C3 — CONFIG: `.nvmrc` and `engines.node` disagree (LOW)

**Files**: `.nvmrc` (contains `20`), `package.json` (`"node": "24.x"`), `.npmrc` (`engine-strict=true`)

The three files give contradictory instructions to a new developer:

- `.nvmrc` → "use Node 20" (nvm/fnm auto-switch lands here)
- `package.json` engines → "must be Node 24.x"
- `.npmrc` `engine-strict=true` → enforces the engines field as a hard block

A developer with nvm auto-switch will land on Node 20 via `.nvmrc`, then `pnpm install` will fail with `ERR_PNPM_UNSUPPORTED_ENGINE`. They need to either ignore `.nvmrc` or manually run `nvm install 24`.

**Fix**: Update `.nvmrc` to `24` (or `24.13.0` to match the author's local). The setup.sh should also check Node version, not just pnpm.

---

### I1 — INFO: Svelte warning fixes are correct (OK)

**Commit**: `b9de99f0`

- `MonthYearModal.svelte` — `maxYear` changed from `const` to `$derived` so prop changes propagate. Correct fix.
- 6 loan form pages — `svelte-ignore state_referenced_locally` on `prevSingleApplicant` change-detector pattern. Intentional, well-documented.
- QA admin page — `$effect.pre` re-syncs filter state from `$page.url.searchParams` on navigation. Fixes a real stale-filter UX bug.

---

### I2 — INFO: CIBIL mismatch warning (OK)

**Commit**: `05e32f9a`

Adds derived `mismatchWarnings` that flag impossible score/answer combos (e.g., CIBIL 800 + "currently a defaulter"). These are soft warnings, not blockers — correct for DSA guidance. Logic is sound, thresholds are reasonable.

---

### I3 — INFO: GPA completion fix (OK)

**Commit**: `02dcd1c0`

Wizard was checking `applicants[i].gpaName` for GPA step completion, but GPA data lives in `formState.applicationData.gpaProfiles`. Fix adds `getGpaValidate` callback to wizardState. Applied to all 3 secured loan pages (home, LAP, plot). Correct fix.

---

### I4 — INFO: Deploy config changes (OK)

**Commits**: `7be6d7ef`, `662fd712`

- Node engine pinned to `24.x` (was `>=20`) — prevents accidental major version jumps on Vercel. Good practice.
- `engines.pnpm` removed — Vercel ships pnpm 9.x which can't satisfy `>=10`. Local dev still enforces v10.30.0 via `packageManager` field. Pragmatic fix.

---

### I5 — INFO: Husky hooks iteration (OK)

**Commits**: `19f2cc73`, `55663e9c`, `b36d5066`

Three-commit iteration: added full hooks → relaxed to essentials → dropped stale lint-staged call. Final state:
- `pre-commit`: blocks `package-lock.json` / `yarn.lock` (pnpm guard)
- `commit-msg`: no-op (exit 0)
- `pre-push`: fetch + behind/diverged check + linear history on protected branches + admin bypass

Clean, minimal, correct. The `SKIP_PUSH_GUARD=1` escape hatch is good for owner workflows.

---

## Summary

| Severity | Count | Items |
|----------|-------|-------|
| MEDIUM | 1 | B1 (isPrimaryApplicant flag not consumed by engine/wizard/profile) |
| LOW | 3 | C1 (global git config), C2 (interactive rebase suggestion), C3 (.nvmrc vs engines.node conflict) |
| INFO | 5 | I1–I5 (no action needed) |

### Recommended Priority

1. **B1** — Decide: expand flag consumption to engine + wizard, or document as UI-only phase 1 (~2–4 hrs if expanding)
2. **C3** — Update `.nvmrc` to `24` to match pinned engine (~1 min) — blocks new devs today
3. **C1** — Change `setup.sh` from `--global` to `--local` (~2 min)

### Previous Review Remediation Rate

6 of 7 findings from the 2026-04-23 review were addressed within 24 hours. Strong follow-through.
