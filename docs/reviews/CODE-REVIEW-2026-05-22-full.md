# Enterprise Code Review — 2026-05-22 (Full Sweep, settled tree)

**Profile:** Full (T1–T9 + Phase 3).
**Reviewed against:** committed `main` @ **`a4fe2cc9`** ("session 2026-05-22 PM — DX-4 closed + B.6"), working tree clean.
**Important:** an earlier pass of this review ran while several concurrent automated DX-4 migration agents were editing the working tree. That produced a false "build blocker" (errors that only existed in half-saved files). This report supersedes it and is verified against the **settled, committed** tree only. See **§Correction log**.
**Prior full review:** [`CODE-REVIEW-2026-05-13-full.md`](CODE-REVIEW-2026-05-13-full.md) (through `c0cf8e18`).

---

## Header — Commands Executed (settled tree)

| Command | Status | Result |
|---------|--------|--------|
| `pnpm check` | ✅ **PASS** | **0 errors, 0 warnings.** Verified twice: once on the live tree and once on an isolated detached worktree at HEAD (removed afterward). |
| `pnpm test:unit -- --run` | ✅ pass | **185 files, 11,479 tests** — all pass. |
| `pnpm test:contrast` | ⚠️ **450/456** | 6 failures, all one token pair in light mode. **Real, current.** See **F1**. |
| `pnpm audit --production` | ⚠️ | **13 vulns** (1 high, 11 moderate, 1 low). Down from 24 last full review. The 1 high is `devalue` (transitive via svelte). See **F2**. |
| `git log … co-authored-by` | ✅ pass | 0 matches. |

---

## Correction log (what the first pass got wrong, and why)

| Earlier claim | Reality after deep verification | Root cause of the error |
|---------------|--------------------------------|--------------------------|
| **B1 — "13 type errors, build blocker"** | **Retracted.** Committed HEAD type-checks 0/0. The errors only ever existed in whichever route file a concurrent migration agent had half-edited at that instant (file-builder, then auth/delete-account). | I ran `pnpm check` against a working tree being mutated live by parallel agents. Verified by isolating HEAD in a detached worktree → 0 errors. |
| **H1 — "Svelte XSS, GHSA-9rmh-mm8f-r9h6, fix = bump Svelte"** | **Corrected.** The high is a **DoS** in **`devalue`** `>=5.6.3 <=5.8.0` (**GHSA-77vg-94rm-hx3p**), pulled transitively through `svelte > devalue`. Patched in `devalue >= 5.8.1`. Not XSS; different advisory; the vulnerable package is devalue, not svelte itself. | I conflated two adjacent `pnpm audit` entries on the first read and labeled the wrong one. Re-read the full high block to get package/version/GHSA exactly. |

These two corrections are the reason for this re-issue. The rest of the T1–T9 sweep below was re-confirmed against the settled tree.

---

## Standing Grep Rules — Full T1–T9 Sweep (settled tree)

Unchanged-and-clean rules are summarized; only the rules with findings or movement get detail.

**Clean / unchanged (no findings):** A (CSRF — all raw-fetch POSTs are pre-auth or `_archived`; mutations use `secureFetch`), E/E2 (XSS — documented `{@html}` exceptions only, all else `sanitizeHtml`), F/OBS-1 (no bare server `console`), G (no Co-Authored-By), SEC-1 (no hardcoded secrets), SEC-3 (auth cookies httpOnly+secure+sameSite), SEC-4 (2 known dev-only `exec`), SEC-5 (only `VITE_VAPID_PUBLIC_KEY`), B/I/J (0 capacitor-at-scope, 0 `typeof window`, 0 module-scope fetch), SSR-1/SSR-2 (clean), H1-svelte (0 `state_referenced_locally`), K/M (JSON-Logic, combinedAnswers clean), CQ-1/CQ-3 (0 empty catch, 0 banned clone in prod), O/P/Q/R (snapshot drift clean, 6-file auto-clear parity, node `22.x` pinned, toClientOption wired), COND-1/3 (upload + anti-scraping intact), PH-1 (6 security headers present), PH-5 (0 `$where`), PERF-1 (0 `import *` in svelte), BLAST-1..9 (shared-module changes additive; `apiResponse.ts` extended only with optional `context` + new `apiStructuredError`, keys spread last; types additive/optional; single-author).

**Movement / findings:**

| Rule | Result | Delta vs last full review |
|------|--------|---------------------------|
| **S (contrast)** | Found **450/456** (dead-token pair, F1) → **fixed this session to 456/456** via 1-line gray-300 revert. | 🟢 resolved |
| **BUILD-2 (audit)** | 13 vulns (1H/11M/1L). 4 axios highs **resolved**; 1 new high = devalue (F2). nodemailer downgraded to low. | 🟢 24→13; 🟡 1 new high |
| **BUILD-3 (typecheck)** | 0 errors. Prior full review's C1 (`'timed_out'` union) **fixed**. | 🟢 clean |
| **BUILD-4 (tests)** | 11,479 pass. | 🟢 +915 |
| **PH-3 (`json()`)** | DX-4 **closed** this window — raw `json()` routes reduced to a small bespoke remainder (~30, intentionally kept per `90b1c002` plan note). | 🟢 major progress (was 159) |
| **CQ-4 (error boundaries)** | 3 (root, `(app)`, `dashboard`). `(auth)` gap remains. | 🟢 1→3 |
| **SEC-2 (PII in logs)** | 4 sites log `email`/`rmEmail`/`bankEmail` (F3). | 🟡 hygiene |
| **SEC-6 (rate limits)** | 54 of 205 mutating handlers; new privacy/A.2 routes mostly unguarded, server-side only, pre-UI (F4). | 🟡 carry-forward |
| **SEC-7 (client PII)** | `clientSession.ts` (prior M5) **archived** → resolved. | 🟢 resolved |

---

## Findings

### F1 — `--ddsa-gray-300` accidentally darkened (Low — **RESOLVED this session**; downgraded after physical verification)

> **Status: FIXED + verified.** Originally written up as a Medium "contrast regression." Browser screenshots in light mode downgraded it to **Low audit-hygiene**, then a one-line revert restored 456/456. See "Physical verification" and "Resolution applied" below.

**Symptom (as the tool reported it):** disabled-button text `--button-disabled-text` (`#404337`) on `--button-disabled-bg` (`#575757`) = **1.40:1**, needs 3:1. Fails in all 6 light schemes; dark mode passes. ([`app.css:942-945`](src/app.css:945), [`app.css:213`](src/app.css:213))

**Why the severity dropped — the flagged pair is dead code:** `--button-disabled-bg`/`--button-disabled-text` have **0 consumers** anywhere in the codebase (no `var(--button-disabled-*)` reference in any `.svelte`/`.css`/`.ts`). Real disabled buttons (15+ components, incl. the wizard "Next") use Tailwind `disabled:`/opacity styling — confirmed by screenshot: the disabled "Next" button renders as a legible faded-blue gradient, not the dark olive-on-grey the tool measured. So the 1.40:1 "failure" describes a pair nothing renders. No readability problem exists.

**Root cause (verified, not inferred):** commit **`b8b9e7c9`** ("style(form-ui): theme-token UI refresh", explicitly described as *presentation-only*, and which itself corrected six other accidental hand-edit drops) changed:

```
- --ddsa-gray-300: #a8ac9a;   ← light sage, fits the scale
+ --ddsa-gray-300: #575757;   ← dark neutral, breaks the scale
```

`#575757` is anomalous: it is **darker than gray-400/500/600** (scale runs gray-200 `#c5c8bc` → gray-300 should sit ~`#a8ac9a` → gray-400 `#8b9178`), and it is pure-neutral while the entire scale is sage-tinted. The author's own inline comment at [`app.css:943`](src/app.css:943) still assumes gray-300 is "pale" and expects "gray-700 → ~3.5:1" — confirming the dark value was unintended. Git history: gray-300 was `#a8ac9a` immediately before `b8b9e7c9`.

**Resolution (root-cause, controlled blast radius):** restore the light-mode value at [`app.css:213`](src/app.css:213):

```css
--ddsa-gray-300: #a8ac9a;   /* revert b8b9e7c9 accidental darkening */
```

**Blast radius — fully enumerated:** `--ddsa-gray-300` (light) has exactly 4 consumers — `--trial-muted-700` ([`:251`](src/app.css:251)), `--button-disabled-bg` ([`:942`](src/app.css:942)), `--color-grayTwo` legacy alias ([`:949`](src/app.css:949)), and two component refs that carry their own fallback (`DocumentUpload.svelte` `#d1d5db`, `DSADetails.svelte`). Restoring `#a8ac9a` returns all of them to their pre-`b8b9e7c9` appearance (the intended state), and lifts the disabled-button pair to ~4:1. The dark-mode/scheme override at [`app.css:418`](src/app.css:418) (`#4d5145`) is untouched and already passes. This is a revert-to-known-good, not a new design choice.

**Physical verification (light mode, real app):**
- *Property Character* + *Existing Loans* form pages screenshotted in light mode. Standard inputs/cards use the light `--color-border` (gray-200), not `grayTwo` — borders render pale (correct), unaffected by the gray-300 value.
- A live before/after override was run in DevTools on the *Existing Loans* page (which does use `grayTwo` borders): `document.documentElement.style.setProperty('--ddsa-gray-300', '#a8ac9a')`. **The UI was visually identical before (`#575757`) and after (`#a8ac9a`)** — confirming the token's real-world footprint is negligible and the revert carries zero regression risk.
- The disabled "Next" button was legible in both states (faded-blue gradient), reconfirming the dead-token point.

**Resolution applied (this session):** restored [`app.css:213`](src/app.css:213) `--ddsa-gray-300: #575757` → `#a8ac9a` — reverting the accidental `b8b9e7c9` darkening and restoring scale monotonicity (`gray-200 #c5c8bc → gray-300 #a8ac9a → gray-400 #8b9178`). `pnpm test:contrast` now **456/456** (was 450/456). Visually inert per the verification above; the value matters only for future code that consumes gray-300, which now gets the intended sage rather than a stray dark neutral.

### F2 — High-severity DoS advisory in `devalue` (transitive via Svelte) (High, low real-world exploitability)

**Reality (verified from full audit block):**
- Package: **`devalue`**, vulnerable `>=5.6.3 <=5.8.0`, patched **`>=5.8.1`**.
- Advisory: **GHSA-77vg-94rm-hx3p** — "DoS via sparse array deserialization."
- Path: `.>@tanstack/svelte-query>svelte>devalue` — devalue is Svelte/SvelteKit's internal serializer for `load()` data.
- There is also a separate **moderate** svelte advisory (`<5.55.7`, GHSA-9rmh-mm8f-r9h6) on the same path.

**Exploitability for this app — honest assessment:** devalue deserializes data that flows **server → client** (SvelteKit `load` payloads), which the server generates — not attacker-controlled free-form input. A DoS would require an attacker to control a serialized sparse-array payload reaching `devalue.parse`. This is **low real-world risk** here; it is a defense-in-depth / clean-audit update, not an active exploit path.

**Resolution options (do NOT blind-bump — validate):**
1. **Preferred:** `pnpm update svelte` to land Svelte `>=5.55.7` (within the existing `^5.48.3` range; installed today is 5.54.1). Verify it pulls `devalue >=5.8.1` transitively — if so this clears **both** the high (devalue) and the moderate (svelte). Svelte 5.54→5.55 is a non-breaking minor.
2. **If svelte's bump doesn't move devalue:** add `pnpm.overrides: { "devalue": "^5.8.1" }`. devalue 5.6→5.8 is API-compatible (minor), so the override is safe.
3. **Mandatory validation gate after either:** `pnpm check` + `pnpm test:unit --run` + `pnpm build`. Svelte is the framework — the blast radius is theoretically wide, so it ships only behind a green suite + build, never on faith.

### F3 — Email (PII) written to production logs at 4 sites (Medium-low, hygiene)

All four log a customer/partner email in a catch block. The fix is logging-only (zero behavioral blast radius), and I verified a non-PII identifier is **already in scope** at each site:

| Site | Current | Fix (verified in-scope) |
|------|---------|--------------------------|
| [`billing/trial-reminder/+server.ts:85`](src/routes/api/billing/trial-reminder/+server.ts:85) | `{ err, email }` | `{ err, dsaId: dsa._id }` (loop var `dsa`, `_id` in default projection) |
| [`billing/trial-reminder/+server.ts:119`](src/routes/api/billing/trial-reminder/+server.ts:119) | `{ err, email }` | `{ err, dsaId: dsa._id }` |
| [`notifications/digest/+server.ts:120`](src/routes/api/notifications/digest/+server.ts:120) | `{ err, email }` | `{ err, dsaId: userGroup._id }` (`userGroup._id` set at :77) |
| [`pms/cron/renewal-check/+server.ts:123`](src/routes/api/pms/cron/renewal-check/+server.ts:123) | `{ err, rmEmail, lenderId }` | `{ err, lenderId }` (drop `rmEmail`; lenderId already logged) |
| [`pms/otp/send/+server.ts:118`](src/routes/api/pms/otp/send/+server.ts:118) | `{ err, bankEmail, lenderId }` | `{ err, lenderId }` (drop `bankEmail`) |

(`emailService.ts:111` / `emailSend.ts:76` also log `to: email` as library debug context — lower priority, same pattern if desired.)

### F4 — Rate-limiting gaps on new privacy/A.2 routes (Medium, carry-forward)

DATA-1/DATA-2 vault mutations, A.2 proxy-capture PATCH/submit + RM confirm-proxy POST have no `rateLimit()`. All are auth+ownership gated and currently have **no client UI** (server-side only), so live abuse surface is minimal. Add conservative limits before wiring UI. (Carry-forward from 2026-05-19/20.)

### F5 — `(auth)` route group has no `+error.svelte` (Low)

A crash in login/signup bubbles to the root error page. Add `src/routes/(auth)/+error.svelte` (copy the pattern from the existing 3). Low urgency.

---

## Health Snapshot (settled tree `a4fe2cc9`)

| Metric | Value | Direction |
|--------|-------|-----------|
| `pnpm check` | **0 errors / 0 warnings** | 🟢 (prior pass's "blocker" was a live-tree artifact) |
| Tests | **11,479** pass (185 files) | 🟢 +915 vs last full review |
| Contrast | **456/456** (was 450/456) | 🟢 F1 fixed this session (1-line gray-300 revert) |
| `pnpm audit` | 13 (1H/11M/1L) | 🟢 24→13; 🟡 1 devalue high (F2) |
| `json()` raw routes | ~30 bespoke remainder | 🟢 DX-4 closed (was 159) |
| Error boundaries | 3 | 🟢 1→3 |
| Prior C1 / M5 | both resolved | 🟢 |
| Co-Authored-By | 0 | 🟢 |

---

## Resolution plan — ranked, with risk

| # | Item | Action | Blast radius | Validation |
|---|------|--------|--------------|------------|
| 1 | **F1 contrast** | ✅ **DONE** — restored `--ddsa-gray-300: #a8ac9a` ([`app.css:213`](src/app.css:213)); physically verified inert | 4 known consumers, no visible change | `pnpm test:contrast` = **456/456** ✓ |
| 2 | **F3 email-in-logs** | 5 logging-field swaps (IDs verified in scope) | none (log fields only) | `pnpm check` stays 0 |
| 3 | **F2 devalue DoS** | `pnpm update svelte`; if devalue still <5.8.1, add `pnpm.overrides devalue ^5.8.1` | framework dep — theoretically wide | **gate on** `pnpm check` + `pnpm test:unit` + `pnpm build` |
| 4 | **F4 rate limits** | add `rateLimit()` to new privacy/A.2 mutations before UI | per-route | tests |
| 5 | **F5 auth boundary** | add `(auth)/+error.svelte` | none (additive) | manual |

F1 and F3 are zero/known-risk and can be applied immediately. F2 is low-exploitability but framework-touching, so it ships only behind the full validation gate. F4/F5 are deferrable hardening.

---

*Re-issued against settled `main` @ `a4fe2cc9` after concurrent DX-4 migration agents completed. No source modified outside `docs/reviews/`. No commits pushed. The temporary detached worktree used to isolate HEAD for type-checking was removed.*
