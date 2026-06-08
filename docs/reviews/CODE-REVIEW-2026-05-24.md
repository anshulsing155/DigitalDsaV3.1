# Enterprise Code Review — 2026-05-24 (Delta Sweep)

**Profile:** Standard (T1–T6 + T9). 17 commits in scope; predominantly CSS/UI hygiene + operator scripts. No auth/payment changes triggering Full.
**Reviewed against:** committed `main` @ **`77341be2`** ("docs: capture text-* convention as ADR-0015 + CLAUDE.md linear-history rule"), working tree clean.
**Prior review:** [`CODE-REVIEW-2026-05-23.md`](CODE-REVIEW-2026-05-23.md) (baseline @ `c5cfeeef`).
**Delta range:** `c5cfeeef..77341be2` — 17 commits across two sessions (2026-05-23 night F1/F2/C.7 fixes + 2026-05-23 very-late-evening CSS text-* rename sweep).

---

## Header — Commands Executed

| Command | Status | Result | Delta vs `2026-05-23` |
|---------|--------|--------|------------------------|
| `pnpm check` | ✅ PASS | 0 errors, 0 warnings | unchanged ✅ |
| `pnpm test:unit -- --run` | ✅ PASS | 201 files, **11,658 tests** | 🟢 +6 tests (F1 rate-limit lock-in) |
| `pnpm test:contrast` | ✅ PASS | **456/456 pairs** | unchanged ✅ |
| `pnpm audit --prod` | — | not re-run (0 vuln baseline from -23, no dep changes except devDep tsx) | unchanged ✅ |
| `git log … co-authored-by` | ✅ PASS | 0 matches (last week) | unchanged ✅ |

---

## Commits Reviewed (17, oldest first)

### 2026-05-23 night (F1/F2 fixes + C.7 scripts + Epic D spec — 10 commits)

| SHA | Subject | Surface |
|-----|---------|---------|
| `5577be62` | fix(security): rate-limit admin impersonation start (review F1 2026-05-23) | **F1 closure** — security |
| `543c445b` | feat(C.7): sanitize-test-data backfill script (PR-2) | operator script (.ts) |
| `0ba274e3` | docs(reviews): enterprise code review 2026-05-23 | docs only |
| `7b5460fe` | docs: /end close for 2026-05-23 night | docs only |
| `6d25c826` | chore(deps): add tsx as devDependency for operator scripts | devDep only |
| `d35658d9` | feat(C.7): sanitize-test-data standalone runnable variant | operator script (.mjs) |
| `225df52f` | docs(income-form): explain why `{@html}` is required on financials-table label | **F2 closure** — 2 comment lines |
| `666d95f2` | docs(epic-d): D.1 recurring billing spec + ADR-0014 | docs only |
| `4656c38b` | docs: /end close for 2026-05-23 night (final) | docs only |
| `ac7dabb5` | docs(architecture-evolution): refresh header banner | docs only |

### 2026-05-23 very-late-evening (text-* CSS rename sweep — 7 commits)

| SHA | Subject | Surface |
|-----|---------|---------|
| `20bc0d0c` | feat(iconRegistry): add Sun + Moon for theme toggle, dedup Laptop | icon registry (+6 lines) |
| `b739b0b5` | style(form-wizard): adopt shared typography classes for context + route panels | CSS cleanup (−93 net) |
| `e89918c3` | feat(how-can-we-help): polish loan-picker UI + lucide theme toggle | UI refactor (150 ins / 108 del) |
| `936aaff6` | refactor(css): rename custom utility classes to text- prefix + camelCase | mechanical rename (547/547 symmetric, 85 files) |
| `6411c1ac` | style(css): drop legacy utility class names from app.css | CSS selector rename (18 ins / 20 del) |
| `017222d9` | docs: session close 2026-05-23 very-late-evening | docs only |
| `77341be2` | docs: capture text-* convention as ADR-0015 + CLAUDE.md linear-history rule | docs + 1-line CLAUDE.md rule |

---

## Standing Grep Rules — T1–T6 Sweep

| Rule | Tier | Result | Delta vs prior |
|------|------|--------|----------------|
| **A (CSRF)** — raw POST/PUT/DELETE/PATCH fetch outside `secureFetch` | T1 | 🟢 0 in `src/lib` + `src/routes` (46 total raw fetch, all GET or pre-auth) | unchanged |
| **E/E2 (XSS)** — `{@html}` outside `sanitizeHtml` | T1 | 🟢 only documented exceptions: `Toast.svelte:87`, `JsonLd.svelte:10`, `_archive/*` (3 files), `pageDescription` (4 loan pages), `how-can-we-help` (`NoteWorthyMessage`), `admin policies` (`human_readable`) | unchanged |
| **F/OBS-1 (server logger)** — bare `console.*` in server code | T1 | 🟢 5 hits all legitimate: `logger.ts` (2), `telemetry.ts` (3) | unchanged |
| **F (API routes)** — bare `console.*` in `routes/api` | T1 | 🟢 2 hits: both `// //console.log` commented-out diagnostics in `init-widget`/`resend-otp` | unchanged |
| **G (Co-Authored-By)** | T1 | 🟢 0 in last week | unchanged |
| **SEC-1 (hardcoded secrets)** | T1 | 🟢 all matches are test files (`authSchemas.test.ts`, `billingEndpoints.test.ts`) | unchanged |
| **SEC-3 (cookie security)** | T1 | 🟢 72 `cookies.set` calls; impersonation cookie at `:98` included. All use proper flags. | unchanged |
| **SEC-4 (eval/exec)** | T1 | 🟢 6 matches: 2 approved `exec()` sites (dev-only), 3 regex `.exec()`, 1 test `require('child_process')` | unchanged |
| **SEC-5 (env public exposure)** | T1 | 🟢 5 matches: all `VITE_VAPID_PUBLIC_KEY` (push notification public key, non-secret) | unchanged |
| **SEC-7 (client storage PII)** | T1 | 🟢 44 matches: theme, language, walkthrough state, form draft keys, view mode, device fingerprint. No PII. | unchanged |
| **B (Capacitor proxy at scope)** | T2 | 🟢 0 | unchanged |
| **C (window.location.reload)** | T2 | 🟢 13 instances: all in approved locations (error pages, LanguageSelector, ResetDataButton, admin testing, hooks.client.ts) | unchanged |
| **I (`typeof window` SSR guard)** — Pitfall #9 | T2 | 🟢 0 | unchanged |
| **J (module-scope `fetch`)** — Pitfall #4 | T2 | 🟢 0 | unchanged |
| **H1 (`state_referenced_locally`)** — Pitfall #10 | T3 | 🟢 0 (`pnpm check` clean) | unchanged |
| **K (JSON-Logic `!=` null)** — Pitfall #1 | T3 | 🟢 346 occurrences across 43 config files (smell-grep; all are value comparisons, not null checks) | unchanged |
| **M (`combinedAnswers` collision)** — Pitfall #13 | T3 | 🟢 0 non-whitelisted uses in components (all hits are in `src/lib/config/`) | unchanged |
| **CQ-1 (empty catch)** | T3 | 🟢 0 empty catch blocks | unchanged |
| **CQ-3 (JSON.parse(JSON.stringify))** | T3 | 🟢 5 matches, all in test files (exempt) | unchanged |
| **CQ-4 (+error.svelte coverage)** | T3 | 🟢 4 error boundaries: root, `(app)`, `(auth)`, `dashboard` | unchanged |
| **CQ-5 (TODO/FIXME/HACK/XXX)** | T3 | 🟢 35 across 13 files | unchanged |
| **S (contrast audit)** | T3 | 🟢 456/456 | unchanged |
| **PH-1 (security headers)** | T5 | 🟢 all 6 headers present in `hooks.server.ts:700-713` | unchanged |
| **PH-3 (raw Response in API)** | T5 | 141 across 47 files (~30 intentionally raw per DX-4 boundary) | unchanged |
| **PH-5 ($where/$function)** | T5 | 🟢 0 | unchanged |
| **PERF-1 (import *)** | T6 | 🟢 3 (iconRegistry, deriveFlagKeys, camera) — all acceptable | unchanged |
| **PERF-1 (heavy client imports)** | T6 | 🟢 0 server-only packages in .svelte files | unchanged |
| **PERF-3 (invalidateAll)** | T6 | 52 across 33 files | unchanged |
| **BUILD-3 (typecheck)** | T3 | 🟢 0/0 | unchanged |
| **BUILD-4 (tests)** | T3 | 🟢 11,658/11,658 | 🟢 +6 |

### T4 — Conditional Rules

| Rule | Triggered? | Result |
|------|-----------|--------|
| **Q (engines.node pin)** | ✅ (`package.json` touched by `6d25c826`) | 🟢 `"node": "22.x"` — pinned |
| **COND-4 (bundle size)** | ⚪ tsx is devDependency only — no production bundle impact | n/a |

### T9 — Cross-Team Blast Radius

| Check | Result |
|-------|--------|
| **BLAST-1 (shared module changes)** | 🟢 0 shared modules touched |
| **BLAST-2 (type file changes)** | 🟢 0 type files touched |
| **BLAST-5 (store/state changes)** | 🟢 0 stores touched |
| **BLAST-9 (multi-author)** | 🟢 single author (Prashant) |

---

## Findings

### No new findings.

All prior findings from `CODE-REVIEW-2026-05-23.md` are now **closed**:

| ID | Finding | Closure commit |
|----|---------|----------------|
| F1 (–23) | Impersonate `/start` has no rate-limit | `5577be62` — `rateLimit()` wired at 30/hour per admin user ID. New `impersonateStartRateLimit.test.ts` (+6 static-scan cases) locks the wiring. |
| F2 (–23) | `IncomeSourceForm.svelte:1688/1692` missing WHY comment on `{@html}` | `225df52f` — two one-line `<!-- {@html} required: ... -->` comments added above both directives. Preempts future "simplify to `{label}`" regression. |

---

## Commit-Level Analysis (non-trivial commits)

### `5577be62` — fix(security): rate-limit admin impersonation start

🟢 **Clean closure of F1.** `rateLimit` imported from `$lib/server/rateLimiter.js` at line 17. Called early in the POST handler with `key: \`impersonate-start:${adminId}\`, max: 30, windowMs: 60 * 60 * 1000` (30/hour per admin user). Returns 429 with user-readable message. The `/exit` companion intentionally remains un-rate-limited — reasoning documented in test file. New `impersonateStartRateLimit.test.ts` with 6 cases locks: import presence, rateLimit call presence, key pattern, max value, window value, exit intentionally exempt. Follows the same static-scan pattern as `directorAutoIncomeWiring.test.ts` and `preSubmitConfirmWiring.test.ts`.

### `e89918c3` — feat(how-can-we-help): polish loan-picker UI + lucide theme toggle

🟢 **Largest code commit in this delta (258 lines changed).** Replaces inline SVG Sun/Moon/Laptop icons with lucide imports (from icon registry additions in `20bc0d0c`). Welcome modal restructured with semantic CSS vars. "Case" label hidden below `sm` breakpoint. Resume / Load Previous / Next buttons gain `text-buttonText` typography class. Next button switches from `NavigationButton` wrapper to a local `nav-btn-next` style. **No behavioral logic changes** — purely presentational. `sessionStorage.setItem('__resumeHandledHere', '1')` at lines 210/219 stores only a boolean flag (no PII). Two `await fetch()` calls at lines ~320/340 are GETs (form schema + session check) — no CSRF concern.

### `936aaff6` — refactor(css): rename custom utility classes to text-* prefix + camelCase

🟢 **Perfect symmetry (547 ins / 547 del)** confirms this is a pure mechanical rename with zero logic changes. 85 files touched. Renames: `sectionHeadingText` → `text-sectionHeadingText`, `subTitleText` → `text-subTitleText`, `regularText` → `text-regularText`, `titleText` → `text-titleText`, `labelText` → `text-labelText`, `label-question` → `text-labelQuestion`, `font-title-bold` → `font-titleBold`, `font-title-medium` → `font-titleMedium`. Executed via PowerShell `-creplace` with negative lookbehind to prevent double-prefixing. Browser-smoke verified in dev server before push. **ADR-0015** documents the convention for the team.

### `543c445b` + `d35658d9` — C.7 sanitize-test-data scripts

🟢 **Operator scripts, not production code paths.** The `.ts` variant (`543c445b`) is the type-checked declarative contract; the `.mjs` shadow (`d35658d9`) is the standalone Node-runnable form (same pattern as `sec2-init-deks-standalone.mjs`). Both are: dry-run by default, idempotent (every filter excludes `is_test:true`), no deletes, `BACKFILL_TARGET_ENV` foot-shooting guard. RMContacts intentionally LOG-ONLY (human review required). The `.mjs` includes a manual `.env` loader (no dotenv dep) — correct for operator scripts that run outside SvelteKit's env system. **Neither script affects production runtime.**

### `6d25c826` — chore(deps): add tsx as devDependency

🟢 **DevDependency only.** Enables `pnpm tsx scripts/*.ts` for operator scripts. No production bundle impact. `pnpm-lock.yaml` diff is large (378 lines) but expected for a new dev tool. Node engine pin remains `"22.x"` — verified.

### `6411c1ac` — style(css): drop legacy utility class names from app.css

🟢 **Companion to `936aaff6`.** After the rename sweep renamed all consumer references, this commit updates the CSS selectors themselves. 18 ins / 20 del — small diff because rule bodies didn't change, only selector names. Descendant selectors (`.text-labelText strong/em`) renamed in lockstep.

### `77341be2` — docs: capture text-* convention as ADR-0015 + CLAUDE.md linear-history rule

🟢 **Clean documentation.** ADR-0015 (114 lines) documents the `text-*` utility class naming convention and rationale. CLAUDE.md gains 1 line in §16 Hard Rules: "main requires linear history — no merge commits allowed" (formally documenting the pre-push hook behavior that was already enforced). ADR README updated with 3 new ADR entries (0013, 0014, 0015).

---

## Security Surface Summary

| Surface | This delta | Notes |
|---------|-----------|-------|
| New endpoints | 0 | Scripts are operator-only, not deployed routes |
| Rate-limit gaps closed | 1 (impersonate/start) | F1 from prior review, now locked by static-scan test |
| New operator scripts | 2 (.ts + .mjs sanitize-test-data) | Dry-run by default, not in production path |
| CSFLE / PII boundary | Unchanged | No new plaintext storage |
| Anti-scraping budget | Unchanged | n/a |

---

## Performance Impact Summary

| Surface | Notes |
|---------|-------|
| CSS rename (85 files) | Zero runtime impact — class names are static strings resolved at build time |
| Loan-picker UI polish | Replaces inline SVGs with lucide imports (tree-shaken). Net bundle impact: marginal decrease (inline SVG bytes removed > import overhead) |
| tsx devDependency | DevDep only — not in production bundle |

---

## Cross-Team Blast Radius Summary

**No shared modules changed in this delta.** All changes are:
- CSS class renames (additive then remove-legacy — consumers updated in lockstep)
- Operator scripts (not imported by any production code)
- Documentation (ADRs, specs, session docs)
- One small security fix on an admin-only endpoint

Single-author delta. No cross-team regression risk.

---

## Known-Safe Inventory Updates

No changes to any inventory. All carry forward from prior review:

- **`{@html}` allowlist** unchanged. F2 comment added at `IncomeSourceForm.svelte:1688/1692` (documents WHY, doesn't change behavior).
- **Server `console.*` allowlist** unchanged: `logger.ts` (2) + `telemetry.ts` (3); `auth/init-widget` + `auth/resend-otp` (commented-out).
- **`window.location.reload()` inventory** unchanged: 13 instances across approved locations.
- **Raw `json()` route inventory** unchanged (~30 routes, intentionally bespoke per DX-4 boundary).
- **`exec()` allowlist** unchanged: 2 approved dev-only sites + 1 test file.

---

## Observations

- **Both prior review findings (F1 + F2) closed in this delta.** F1 was the rate-limit gap on impersonate/start (now locked by static-scan test); F2 was the missing WHY comment on `{@html}` directives (now present). Zero carry-forward findings for the first time in 3 review cycles.
- **CSS rename sweep was the dominant commit by file count (85 files)** but is mechanically verifiable: perfect 547/547 ins/del symmetry, browser-smoke verified, no logic changes. The negative-lookbehind regex approach (`(?<!text-)\b…\b`) is documented in the session handoff and ADR-0015 as the canonical technique for prefix-add renames.
- **Operator scripts follow the established pattern** (`.ts` contract + `.mjs` standalone runner). The manual `.env` loader in the `.mjs` avoids a `dotenv` dependency — acceptable for operator scripts but would be fragile for production code.
- **ADR-0015 formally documents the text-* convention.** This is good hygiene — the next team member who touches CSS will know the naming rule without reading the git log.
- **CLAUDE.md §16 now explicitly documents the linear-history rule** (no merge commits on main). This was already enforced by the pre-push husky hook but wasn't written in the rules section. The session that discovered the enforcement the hard way (`263397c6` blocked) prompted the documentation.

---

## Top 5 Actions for Next Session

1. **Browser-smoke the text-* rename** — while the dev server was smoke-tested before push, the other 84 files weren't individually verified. Spot-check 2-3 major surfaces (income form, applicant cards, offers pages) to confirm no class name orphans.
2. **C.7 PR-2 dry-run** — `scripts/sanitize-test-data-standalone.mjs` is now runnable with `node`. Execute against dev MongoDB in dry-run mode to validate the filter patterns match expected rows.
3. **Epic D planning decisions** — Yes Bank RM call (D-1 spec §9) + 6 lock-down decisions (D-1 spec §11) remain the primary next-session action per SESSION-HANDOFF.
4. **Pre-existing `/form/how-can-we-help` 500** — per-user data condition for un-onboarded DSA account. Not caused by any recent commit but persists.
5. **Begin Epic D implementation** — D.1 S1-S8 after spec sign-off (~11.5 days sequenced).
