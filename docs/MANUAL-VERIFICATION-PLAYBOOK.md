# Manual Verification Playbook

> **Updated**: 2026-05-15 (S102 close)
> **Purpose**: Step-by-step procedures for every check that needs a human at a keyboard. Sessions ship code; this doc tells you exactly what to click, curl, or watch to confirm it actually works.
> **Scope**: Verification of features, fixes, security gates, and performance claims. Covers local dev, local preview, Vercel preview, and prod.

---

## SECTION INDEX

1. [How to use this playbook](#1-how-to-use-this-playbook)
2. [Account & environment setup](#2-account--environment-setup)
3. [Environment matrix — what works where](#3-environment-matrix)
4. [Recipe library — verification procedures](#4-recipe-library)
   - 4.1 [PERF-1 — admin dashboard SSR load (3 scenarios)](#41-perf-1--admin-dashboard-ssr-load)
   - 4.2 [PERF-4 — onboarding city dropdown chunk elimination](#42-perf-4--onboarding-city-dropdown)
   - 4.3 [OBS-1 — client error reporting](#43-obs-1--client-error-reporting)
   - 4.4 [FORM-3 — selects inside modals stay visible](#44-form-3--selects-inside-modals)
   - 4.5 [SEC-4 — auth route rate limits (8 routes)](#45-sec-4--auth-route-rate-limits)
   - 4.6 [SEC-5 — BOLA fix on apply-delta](#46-sec-5--bola-fix-on-apply-delta)
   - 4.7 [SEC-5 — deferred design call on rm/review](#47-sec-5--deferred-design-call-on-rmreview)
   - 4.8 [DX-2 — Zod boundary validation](#48-dx-2--zod-boundary-validation)
   - 4.9 [DX-4 — apiOk/apiError response-shape consistency](#49-dx-4--apiokapierror-response-shape-consistency)
   - 4.10 [L1 — apiServerError context arg](#410-l1--apiservererror-context-arg)
   - 4.11 [L2 — login error UX (validation vs rate-limit vs not-found)](#411-l2--login-error-ux)
5. [General-purpose recipes (use anytime)](#5-general-purpose-recipes)
   - 5.1 [Form parity check (single ↔ multi, individual ↔ company)](#51-form-parity-check)
   - 5.2 [Locked field pattern](#52-locked-field-pattern)
   - 5.3 [Anti-scraping detection](#53-anti-scraping-detection)
6. [When you find a regression](#6-when-you-find-a-regression)

---

## 1. How to use this playbook

- **For a specific finding/fix**: jump to the recipe in §4 — each is self-contained.
- **For a general behavior check**: §5 has reusable recipes for form parity, locked fields, etc.
- **Before reporting "verified"**: run the full recipe. Partial verification (e.g., only one of the 3 PERF-1 scenarios) is a regression risk because edge cases live in the scenarios you skipped.
- **If a recipe fails**: follow §6 — capture the state before doing anything else.

Every recipe follows the same shape:

```
**Source**: <commit SHA or session ID that shipped this>
**What it proves**: <one sentence>
**Environment**: <dev | preview | vercel | prod>
**Setup**: <accounts, fixtures, env state needed>
**Steps**: <1, 2, 3 ...>
**Expected**: <what success looks like>
**If it fails**: <how to capture state + likely root causes>
```

---

## 2. Account & environment setup

### 2.1 Local dev OTP bypass

`MSG91_DEV_BYPASS_OTP=000000` is the dev-only universal OTP. Any OTP screen accepts `000000` when `dev` mode is active.

**Verify**: open `/login` → enter any mobile → click "Send OTP" → enter `000000` → should accept. If it doesn't, dev mode isn't active.

### 2.2 Test DSA account

Quickest path:
1. Visit `/login` (or `/dsa-onboarding` for fresh account)
2. Enter a 10-digit mobile starting with 6/7/8/9 (any digits work in dev)
3. Use OTP `000000`
4. If no profile exists, you're sent to onboarding; complete minimal fields
5. Land on `/dashboard/dsa`

### 2.3 Test RM account

Per [`memory/project_pms_dev_test_rm.md`]: `testddsa@<lender-domain>` pattern + OTP `000000`.

1. Visit `/partner-signup`
2. Enter a mobile not already registered as DSA
3. OTP `000000`
4. Complete RM onboarding with an email matching a lender domain (e.g. `tester@hdfcbank.com` to be auto-assigned to HDFC)
5. Lender assignment auto-derives from email domain

### 2.4 Test Admin account

Admin bootstrap is manual — admins are created via the `admin/admins` flow by a super-admin, OR seeded directly into `AdminUsers` collection in MongoDB.

If no admin exists:
```bash
# In MongoDB shell or Compass:
db.AdminUsers.insertOne({
  mobileNumber: 9999999999,
  name: 'Test Admin',
  email: 'admin@test.local',
  is_active: true,
  is_super_admin: true,
  permissions: {
    user_management: true,
    rule_authoring: true,
    system_settings: true,
    qa_view: true,
    qa_write: true
  },
  created_at: new Date()
})
```

Then log in via `/login` with `preferredRole: 'admin'` selected.

### 2.5 Guest demo mode

For visual exploration without setting up accounts:
1. Visit `/demo` or the landing-page "Try Demo" CTA
2. Mints a demo JWT — DSA role with `usedCoins: 0, availableCoins: 999` and 4 pre-loaded sample cases
3. **Limitation**: in-memory only; data resets on restart. Use for UI smoke, not data flow.

---

## 3. Environment matrix

| Verification | Local `pnpm dev` | Local `pnpm preview` | Vercel preview | Prod |
|---|---|---|---|---|
| Type errors | ✅ `pnpm check` | ✅ via pre-push hook | ✅ via CI | n/a |
| Build compiles | n/a (Vite dev) | ✅ `pnpm build` succeeded | ✅ deploy log | already deployed |
| Bundle size / chunk split | partial (dev bundle is different) | ✅ stat output | ✅ Vercel `_app/` listing | ✅ Network tab |
| SSR errors | ✅ | ✅ | ✅ (closest to prod) | ✅ |
| CJS→ESM crossings | partial | partial | ✅ catches Vercel-specific | ✅ |
| Node version pin | ⚠️ `.nvmrc` | ⚠️ `.nvmrc` | ✅ `engines.node` enforced | ✅ |
| Rate limits (in-memory) | ✅ | ✅ | ✅ | n/a (Redis) |
| Rate limits (Redis-backed) | ⚠️ needs `REDIS_URL` | ⚠️ same | ⚠️ if `REDIS_URL` set | ✅ |
| MSG91 SMS delivery | ❌ (test mode) | ❌ | ⚠️ test mode | ✅ |
| Razorpay payments | ❌ (sandbox keys) | ❌ | ✅ sandbox | ✅ live |
| Capacitor native | ❌ | ❌ | ❌ | needs APK on device |
| BOLA cross-DSA tests | ✅ with two accounts | ✅ same | ✅ same | ⚠️ don't test on prod data |

**Rule of thumb**: if a check appears in the "Vercel preview" or "Prod" columns only, schedule it with a real Vercel preview deploy. Don't claim "verified" from local dev for those.

---

## 4. Recipe library

### 4.1 PERF-1 — admin dashboard SSR load

**Source**: `b8e5901b` (S101 — closed PERF-1)
**What it proves**: admin dashboard stats render on first paint via SvelteKit `+page.server.ts`, not after a post-mount round-trip; `Promise.allSettled` isolates per-tile failures.
**Environment**: local dev OR local preview OR Vercel preview (all work).

#### Scenario A — Super-admin sees both tiles

**Setup**: super-admin account per §2.4.

**Steps**:
1. Open Chrome DevTools → Network tab → check "Disable cache" + "Preserve log"
2. Filter Network by `api/admin`
3. Navigate to `/dashboard/admin`
4. Inspect the **first** network request — should be the page document, not any `/api/admin/account-stats` or `/api/admin/testing-activity` calls
5. Right-click the page document → "View frame source"
6. Search for `account-stats` text — should find populated numbers in the SSR HTML

**Expected**:
- ✅ No `/api/admin/account-stats` or `/api/admin/testing-activity` calls in Network panel
- ✅ Stats numbers (DSA count, RM count, etc.) appear in the page source on first load
- ✅ Page interactive without a loading spinner

**If it fails**:
- If you see API calls fire after page load → load function is NOT being used; check `+page.server.ts` exists and exports `load`
- If stats are blank → `getAccountStats()` or `getTestingActivity()` returned empty; check MongoDB connection logs

#### Scenario B — Admin without `user_management` permission

**Setup**: an admin whose `permissions.user_management === false`. Create via `/admin/admins/[admin_id]` PATCH (super-admin only) or directly in MongoDB.

**Steps**:
1. Log in as the gated admin
2. Navigate to `/dashboard/admin`
3. Locate the "Account Stats" tile

**Expected**:
- ✅ Account Stats tile renders a gated notice (not a blank/error state)
- ✅ Testing Activity tile renders normally (admin always has qa access if any qa perm is true)
- ✅ Page does NOT crash with a 500

**If it fails**:
- If you see raw stats → permission gate isn't being checked. Read `src/lib/server/adminStats.ts` and the conditional in `/dashboard/admin/+page.server.ts`
- If page crashes → `Promise.allSettled` isn't isolating; check the load function

#### Scenario C — MongoDB transient outage

**Setup**: ability to temporarily break MongoDB connection.

**Steps**:
1. Stop MongoDB (or set `MONGODB_URI` to an invalid value)
2. Restart dev server
3. Navigate to `/dashboard/admin`

**Expected**:
- ✅ Each tile shows its own error banner independently
- ✅ Page itself does NOT 500
- ✅ Other static UI (header, nav) still renders

**If it fails**:
- If page returns 500 → load function isn't using `Promise.allSettled` correctly; one rejection is bringing down the whole tree
- If only one tile errors and the other is blank → the `getAccountStats`/`getTestingActivity` helpers aren't returning the error shape the page expects

---

### 4.2 PERF-4 — onboarding city dropdown

**Source**: `129f7852` (S99 — pincode chunk elimination)
**What it proves**: the 763 KB `pincode_IN_all.js` chunk is NOT included in the client bundle for `/dsa-onboarding`; city list fetches at runtime instead.
**Environment**: **Vercel preview or prod ONLY**. Local dev bundles everything inline, so this can't be proven locally.

**Setup**: a fresh anonymous browsing session (no `/dsa-onboarding` cache).

**Steps**:
1. Open Vercel preview URL → `/dsa-onboarding`
2. DevTools → Network → Filter by "JS"
3. Hard refresh (Ctrl+Shift+R)
4. Scan the loaded chunks for any with `pincode` in the name

**Expected**:
- ✅ NO chunk named `pincode_IN_all.js` or `pincode_IN_Selected.js` in the initial JS payload
- ✅ Page renders the "Select state" dropdown without delay
- ✅ Total JS payload for `/dsa-onboarding` is well under 500 KB

**Steps continued — verify lazy fetch works**:
5. Filter Network by "Fetch/XHR"
6. Open the "Select state" dropdown, pick a state (e.g., Maharashtra)
7. Open the "Select city" dropdown

**Expected**:
- ✅ A request to `/api/location/cities?state=Maharashtra` (or similar) fires when state is selected OR when city dropdown opens
- ✅ City list populates from the response
- ✅ Response is small (~5-50 KB depending on state)

**If it fails**:
- If `pincode_IN_all.js` is in the bundle → tree-shake failed. Check `AboutYou.svelte` + `DSADetails.svelte` for static imports of the full dataset
- If runtime fetch doesn't fire → the lazy code path is broken; check the dropdown's `onOpen` / `onChange` handlers

---

### 4.3 OBS-1 — client error reporting

**Source**: `5b823d21` (S99 — SvelteKit-caught client errors forwarded)
**What it proves**: client-side errors caught by SvelteKit's `handleError` hook POST to `/api/errors/report` and email the team in production.
**Environment**: local dev (POST works) + Vercel preview/prod (email delivery works).

**Setup**: DevTools open.

**Steps**:
1. Log in as any role
2. Navigate to a page with client-side interactivity
3. Open DevTools Console
4. Trigger a synthetic error — easiest: paste in console and trigger:
   ```js
   // In a Svelte handler context, this gets caught by SvelteKit
   setTimeout(() => { throw new Error('OBS-1 verification: synthetic error'); }, 100);
   ```
5. Check Network tab for a POST to `/api/errors/report`

**Expected (dev)**:
- ✅ POST `/api/errors/report` fires with the error message + stack + URL + userId
- ✅ Response is 200 (or 204)
- ✅ Server logs show the error captured

**Expected (prod or Vercel preview with email configured)**:
- ✅ Above PLUS an email arrives at `tech@digitaldsa.com` within ~30s with the error details

**If it fails**:
- If no POST fires → SvelteKit's `handleError` hook isn't wired; check `src/hooks.client.ts`
- If POST 4xx → check the rate limit on `/api/errors/report` (if any)
- If POST 200 but no email → email service isn't configured (PB-8 is still open)

---

### 4.4 FORM-3 — selects inside modals stay visible

**Source**: `cfd23769` (S101 — Pitfall #17 fix on 3 select components)
**What it proves**: `ApplicantSelect`, `BooleanSelect`, `NewSelect` dropdowns inside `Modal`/`DirectorFormModal`/Existing Loans modal use `position: fixed` with `getBoundingClientRect`, so dropdown options aren't clipped by the modal's `overflow-y-auto` body.
**Environment**: local dev or preview.

**Setup**: log in as DSA, in the middle of a Personal Loan form, with a co-applicant added.

**Steps**:
1. Open Personal Loan flow
2. Navigate to the Income tab
3. Click "Add Existing Loan" on any applicant's obligations section
4. In the modal, click the "Loan Type" select (or any select with many options)

**Expected**:
- ✅ Dropdown options panel is fully visible — NOT clipped at the top or bottom of the modal body
- ✅ Scrolling the modal body keeps the dropdown anchored to its trigger (the dropdown follows the trigger as the modal scrolls)
- ✅ Resizing the window keeps the dropdown anchored

**Steps continued — for DirectorFormModal**:
5. From the same loan, add a Company (Business Loan flow)
6. Open the Director count picker → set to 2
7. Open one director's form modal
8. Click any select inside the modal (e.g., "Profession")

**Expected**: same as above — dropdown fully visible inside the modal.

**If it fails**:
- If options clip at modal edges → the migration isn't taking effect; check the component is one of the 4 (`CustomSelect`, `ApplicantSelect`, `BooleanSelect`, `NewSelect`) and re-check the `position: fixed` + scroll listener pattern
- If dropdown doesn't follow scroll → the capture-phase scroll listener is missing or scoped wrong

---

### 4.5 SEC-4 — auth route rate limits

**Source**: `0f3450fc` (batch 1, 5 routes) + `4c9aa35f` (batch 2, 3 routes)
**What it proves**: 8 critical auth routes return 429 after N requests in a 60-second window, with per-route identifier separation.
**Environment**: local dev (in-memory limiter) or Vercel preview/prod (Redis-backed if `REDIS_URL` set).

**Setup**: `curl` available, dev server running on port 5173.

#### Recipe — for each of the 8 routes

Replace `<ROUTE>`, `<LIMIT>`, and `<BODY>` per the table below:

```bash
for i in $(seq 1 $((LIMIT + 1))); do
  curl -s -o /dev/null -w "%{http_code} " \
    -X POST http://localhost:5173/<ROUTE> \
    -H "Content-Type: application/json" \
    -d '<BODY>'
done
echo ""
```

| Route | Limit | Identifier scope | Body |
|---|---|---|---|
| `/api/auth/check-dsa` | 10/min | IP | `{"mobileNumber": "9876543210"}` |
| `/api/auth/signup` | 5/min | IP | `{"mobileNumber": "9876543211"}` |
| `/api/auth/create-rm` | 5/min | IP | `{"mobileNumber": "9876543212"}` |
| `/api/auth/delete-account` | 3/min | per user (needs auth cookie) | `{}` |
| `/api/auth/demo-login` | 10/min | IP | `{}` |
| `/api/auth/logout` | 20/min | IP | `{}` |
| `/api/auth/register-device` | 10/min | per user (needs auth cookie) | `{"fingerprint":"test"}` |
| `/api/auth/validate-token` | 30/min | IP | `{}` |

**Expected**:
- ✅ First N requests return 200 (or 400/404 if the body is invalid for the route — the rate limiter runs first, but the route can still reject the body)
- ✅ Request N+1 returns **429** with `{"success": false, "error": "Too many ..."}`
- ✅ After waiting 60 seconds, request count resets

**Per-route identifier separation check** (proves the per-route prefix works):
1. Hit `/api/auth/login` 10 times → expect 200, 200, ..., 200, 429
2. Immediately hit `/api/auth/signup` once → expect 200 (or its own validation response), NOT 429
3. Because each route uses a distinct identifier prefix, hitting one doesn't exhaust the budget for another

**If it fails**:
- If no 429 ever → the rate limiter isn't wired into the route, or the limit is too high
- If 429 on the wrong route → identifier prefix collision
- If first request 429s → there's stale state in the in-memory bucket; restart dev server

---

### 4.6 SEC-5 — BOLA fix on apply-delta

**Source**: `c5cff697` (S102 batch 4 — found + fixed gap)
**What it proves**: an RM not assigned to a lender cannot fork that lender's published PMS policy via `/api/pms/policies/[id]/apply-delta`.
**Environment**: local dev or preview, with two test RM accounts assigned to different lenders.

**Setup**:
- **RM-A** signed up with email matching Lender X domain (e.g. `tester@hdfcbank.com`) → auto-assigned to LenderX
- **RM-B** signed up with email matching Lender Y domain (e.g. `tester@icicibank.com`) → auto-assigned to LenderY
- A published PMS policy `policy-x` exists for LenderX (admin creates it or RM-A encodes + submits + admin approves)

**Steps**:
1. Get the `_id` of `policy-x` (admin can view in PMS dashboard, or query `PmsLenderPolicies.findOne({lenderId:'<X>', status:'published'})`)
2. Log in as **RM-B** (NOT assigned to LenderX)
3. Get the CSRF token from any authenticated page (DevTools → Application → Cookies → `csrfToken` value)
4. Curl with RM-B's session cookie + CSRF token:
   ```bash
   curl -X POST http://localhost:5173/api/pms/policies/<policy-x-id>/apply-delta \
     -H "Content-Type: application/json" \
     -H "X-CSRF-Token: <token>" \
     --cookie "accessToken=<RM-B's JWT>; csrfToken=<token>" \
     -d '{"acceptedDeltas":[{"sectionKey":"eligibility","fieldKey":"minAge","newValue":18,"rmDecision":"accepted"}]}'
   ```

**Expected**:
- ✅ Response: `403 {"success": false, "error": "You are not assigned to this lender"}`
- ✅ No draft policy is created in MongoDB
- ✅ Server logs do NOT show "[PMS apply-delta] Applying delta revision" (because the gate fired before logging)

**Now confirm the legitimate path still works**:
5. Log in as **RM-A** (assigned to LenderX)
6. Same curl, with RM-A's session

**Expected**:
- ✅ Response: `200` with `{success: true, data: {draftId, lockVersion, pendingChangeCount}}`
- ✅ A new draft policy appears in MongoDB

**If it fails**:
- If RM-B's request succeeds (no 403) → the route-layer check isn't running. Re-check `src/routes/api/pms/policies/[id]/apply-delta/+server.ts` for the `isAdmin` + `RmLenderAssignments.findOne` block
- If RM-A's request 403s → the gate is too tight; check the `status: 'active'` filter on the assignment lookup

---

### 4.7 SEC-5 — deferred design call on rm/review

**Source**: `b7556a1b` (S102 batch 6 — surfaced but NOT fixed)
**What it proves / disproves**: whether an RM can read/approve a policy version for a lender they're not assigned to. Result determines whether the gap is real or intentional cross-RM peer review.
**Environment**: local dev or preview.

**Setup**: same two-RM setup as §4.6, PLUS:
- A policy version in the **legacy** policy-engine system (not PMS) in `pending_rm_review` status
- That version's `policy_rule_id` belongs to a `lender_id` that RM-B is NOT assigned to

(Legacy versions are different from PMS policies — these live in `PolicyVersions` collection. Admin creates them via `/admin/policy-engine/versions/...` flow.)

**Steps to confirm the gap exists**:
1. Get the version `_id` from MongoDB: `db.PolicyVersions.findOne({status: 'pending_rm_review'})`
2. Log in as **RM-B** (assigned to a different lender than the version's rule)
3. Curl GET:
   ```bash
   curl -X GET http://localhost:5173/api/rm/review/<version-id> \
     --cookie "accessToken=<RM-B's JWT>"
   ```
4. Curl POST respond:
   ```bash
   curl -X POST http://localhost:5173/api/rm/review/<version-id>/respond \
     -H "Content-Type: application/json" \
     -H "X-CSRF-Token: <token>" \
     --cookie "accessToken=<RM-B's JWT>; csrfToken=<token>" \
     -d '{"action":"approve","notes":"verification test"}'
   ```

**Interpret the result**:
- **If GET returns 200 + policy fields** → gap confirmed for read access. Any RM can see any lender's pending policies.
- **If POST respond returns 200 + transitions status** → gap confirmed for write access. Any RM can approve any lender's policy.
- **If either returns 403** → the gap is already plugged somewhere upstream (e.g., a hooks.server.ts middleware). Verify which layer caught it.

**Decision after running this**:

If gap confirmed → decide:
- **Tighten**: apply the fix from `docs/ARCHITECTURE-EVOLUTION.md` SEC-5 Finding M1 (5th canonical pattern). Tell me and I'll ship it.
- **Document as intentional**: add a comment to the route + close the finding.

**If it fails (i.e., produces unexpected results)**:
- If GET returns 404 → wrong version ID
- If 401 → RM-B's session expired; re-login
- If 400 "not pending RM review" → version is in wrong status; pick a different one

---

### 4.8 DX-2 — Zod boundary validation

**Source**: `a0691554` (DX-2 pilot) + `e08f4951` (auth expansion) + `5c274315` (PMS batch)
**What it proves**: 12 endpoints reject malformed bodies with a 400 + structured `apiValidationError` shape.
**Environment**: any.

#### Recipe — per route

```bash
# Pick a route + send a malformed body
curl -X POST http://localhost:5173/<ROUTE> \
  -H "Content-Type: application/json" \
  -d '<MALFORMED_BODY>'
```

| Route | Malformed body | Why it should fail |
|---|---|---|
| `/api/auth/check-dsa` | `{"mobileNumber":"abc"}` | regex `/^\d{10,15}$/` |
| `/api/auth/check-dsa` | `{"mobileNumber":"9876543210","preferredRole":"hacker"}` | enum check |
| `/api/auth/signup` | `{"mobileNumber":"123"}` | not 10 digits |
| `/api/auth/signup` | `{"mobileNumber":"5876543210"}` | starts with 5 (must be 6-9) |
| `/api/auth/register-device` | `{}` | missing fingerprint |
| `/api/auth/register-device` | `{"fingerprint":""}` | empty string fails .min(1) |
| `/api/auth/register-device` | `{"fingerprint":"x","deviceInfo":{"type":"phone"}}` | not in enum |
| `/api/auth/validate-token` | `{"token":123}` | wrong type |
| `/api/auth/create-rm` | `{"mobileNumber":12345}` | not 10-digit Indian |

**Expected for all**:
- ✅ Status `400`
- ✅ Body: `{"success": false, "error": "Invalid request body", "details": {"fieldErrors": {...}, "formErrors": [...]}}`
- ✅ Server log shows no exception (Zod caught it cleanly)

**If it fails**:
- If `200` returned → Zod schema not being applied; check the import + `safeParse` chain
- If a different shape returned → route is using `apiError` instead of `apiValidationError`

---

### 4.9 DX-4 — apiOk/apiError response-shape consistency

**Source**: 4 batches across S101+S102 — 31 routes total
**What it proves**: all migrated routes return `{success: true, data: ...}` for success and `{success: false, error: ...}` for failure (status codes appropriate).
**Environment**: any.

**Setup**: authenticated as admin (most migrated routes are admin-only).

**Spot-check recipe** — run for any migrated route:

```bash
# Success path
curl -s http://localhost:5173/<ROUTE> \
  --cookie "accessToken=<admin JWT>" | jq

# Error path (force 404 with a nonexistent ID)
curl -s http://localhost:5173/<ROUTE-WITH-BAD-ID> \
  --cookie "accessToken=<admin JWT>" | jq
```

**Examples**:
- `GET /api/admin/policy-engine/lenders` → `{success: true, data: [...]}`
- `GET /api/admin/policy-engine/lenders/nonexistent` → `{success: false, error: "Lender not found"}` (404)
- `POST /api/admin/policy-engine/versions/<bad-id>/approve` → `{success: false, error: "Invalid version_id"}` (400)

**Expected for all migrated routes**:
- ✅ Success: top-level keys are exactly `success`, `data`. No flat shapes like `{success: true, lender_id: ..., name: ...}`.
- ✅ Error: top-level keys are exactly `success`, `error`. Optional `details` for validation errors.
- ✅ HTTP status matches the shape (200/201 for success, 400/403/404/409/422/500 for errors)

**Find a migrated route quickly**:
```bash
grep -l "apiOk\|apiError" src/routes/api -r | head -20
```

**Find unmigrated routes still using raw `json()`**:
```bash
grep -l "from '@sveltejs/kit'" src/routes/api -r | xargs grep -l "import { json" | head -20
```

---

### 4.10 L1 — apiServerError context arg

**Source**: `1e57ca75` (S102 — helper enhanced + captures/activate backfilled)
**What it proves**: server errors include route-specific context (resource IDs) in log records, surviving the DX-4 migration.
**Environment**: any with access to server stdout.

**Setup**: admin session, dev server running with logs visible (`pnpm dev` shows them by default).

**Steps**:
1. Force an error on a context-rich route. Easiest: pick `captures/[capture_id]/activate` and pass a `capture_id` that triggers an internal failure (e.g., a capture in a status that the transformer can't handle, OR temporarily break MongoDB).
2. Curl:
   ```bash
   curl -X POST http://localhost:5173/api/admin/policy-engine/captures/nonexistent-id/activate \
     -H "X-CSRF-Token: <token>" \
     --cookie "accessToken=<admin JWT>; csrfToken=<token>"
   ```
3. Watch the server stdout/log.

**Expected**:
- ✅ Response: `404 {"success": false, "error": "Capture not found"}` (clean handled case, not a 500)

For a real 500 verification — pick a different route OR briefly break MongoDB and retry. The log line for a 500 should include the context:
```
[ERROR] { captureId: "nonexistent-id", err: <Error object> } Failed to activate policy capture
```

**The key check**: the log includes `captureId` as a sibling of `err`. Pre-fix it only had `err`.

**If it fails**:
- If log shows only `{err}` → backfill missing; check `src/routes/api/admin/policy-engine/captures/[capture_id]/activate/+server.ts` for the third arg to `apiServerError`
- If no log at all → server logger isn't outputting at error level

---

### 4.11 L2 — login error UX

**Source**: `54c9b540` (S102 — login distinguishes validation/rate-limit/not-found)
**What it proves**: login page shows specific error toasts for validation (400), rate-limit (429), and server errors — instead of silently redirecting to onboarding.
**Environment**: any.

**Setup**: open `/login` in a browser.

#### Test 1 — Rate limit (429) shows specific error

**Steps**:
1. Open Network tab + Console
2. Trigger rate limit on `check-dsa` via curl (run 11+ times quickly to exhaust the 10/min):
   ```bash
   for i in {1..11}; do
     curl -s -o /dev/null -X POST http://localhost:5173/api/auth/check-dsa \
       -H "Content-Type: application/json" \
       -d '{"mobileNumber":"9876543210"}'
   done
   ```
3. Now use the UI to attempt a login with the same mobile number

**Expected**:
- ✅ Toast: "Too many login attempts. Please wait a moment." (red/error variant)
- ✅ Does NOT redirect to onboarding
- ✅ User can retry after the window resets

#### Test 2 — Validation error (400) shows specific error

**Steps**:
1. Open the login form
2. Open DevTools → Console
3. Override the form mobile number with an invalid one (the UI input mask should normally prevent this, so we bypass via console):
   ```js
   // Find the form input and force-set a bad value
   document.querySelector('input[name="userMobile"]').value = '12345';
   ```
4. Submit the form

**Expected**:
- ✅ Toast: "Please check your mobile number and try again."
- ✅ Does NOT redirect to onboarding

#### Test 3 — User not found (404) STILL goes to onboarding (regression check)

**Steps**:
1. Use a mobile number that's NEVER signed up before (e.g., `6900000099`)
2. Submit the login form

**Expected**:
- ✅ Toast: "Please complete your profile setup" (info, not error)
- ✅ Redirects to `/dsa-onboarding?redirect=...`
- ✅ The L2 fix did NOT break this legitimate "go to onboarding" branch

**If it fails**:
- If Test 1 redirects to onboarding instead of showing rate-limit toast → the `!response.ok && result?.userExists !== false` guard isn't working; check `src/routes/(auth)/login/+page.svelte` around line 455
- If Test 3 shows an error instead of redirecting → the L2 fix is too aggressive; the `userExists !== false` check is wrong

---

## 5. General-purpose recipes

### 5.1 Form parity check

**When to use**: after any change to income, obligations, credit score, completion logic, or Done/Next button — for ANY of the 6 loan types.
**What it proves**: the change works in BOTH single-applicant view (tabbed inline) and multi-applicant view (card/table + modal), AND for both Individual and Company applicants.

**Setup**: a DSA account.

**Steps**:
1. Start a Personal Loan (or other unsecured), single applicant. Reach the affected screen. Verify behavior.
2. Add a co-applicant. Same screen now uses the multi-applicant rendering path. Verify the change works there too.
3. (If applicable) Switch to Business Loan (Company allowed). Add a Company applicant. Verify behavior in the Company-specific UI.
4. (If applicable) Repeat for Joint(2) Company — two directors. Verify.

**Common failure modes** (these have all happened before, per CLAUDE.md §6):
- "I fixed it in `ApplicantFormSecured` but the Personal Loan flow uses `ApplicantFormUnsecured`" — wrong-file fix
- "I added an `$effect` that doesn't run because the parent component never mounts in this view"
- "Multi-applicant cards work, but the single-applicant inline tabs use a different render path"

If the change touches `IncomePageNew`, **explicitly verify both render branches** (single-applicant tabs vs multi-applicant cards) before claiming done.

### 5.2 Locked field pattern

**When to use**: after changing how a field becomes disabled because a previous step or loan-level config set it.
**What it proves**: the field renders as a read-only badge (not a disabled radio/select), shows the inherited value, AND counts as "answered" for Next-button enablement.

**Steps**:
1. Set the upstream field (e.g., loan-level profession)
2. Navigate to the applicant profile page (or wherever the field is shared)
3. Inspect the locked field's UI

**Expected**:
- ✅ The field shows as a read-only badge with the value + "Set from loan type" (or similar) note
- ✅ NOT rendered as a disabled radio/select with all options grayed out
- ✅ The Next button is enabled (the pre-set value counts as answered)
- ✅ Co-applicants get independent selection (per CLAUDE.md Pitfall #5)

### 5.3 Anti-scraping detection

**When to use**: after changes to schema response, options resolver, or `showWhen` encoding.
**What it proves**: client-side `showWhen` decoder still works AND anti-scraping budget still trips for high-rate requests.

**Steps**:
1. Open any form page in DevTools → Network
2. Inspect a schema response (`/api/form/<loanType>/schema`)
3. Check that `showWhen` fields appear XOR-encoded (random-looking strings, not JSON-Logic objects)
4. Open the page UI — visibility rules should still trigger correctly (e.g., picking "Self-employed" reveals SE-specific questions)

**Anti-scraping budget**:
1. From a script, hit `/api/form/personal-loan/schema` 100 times in 60 seconds
2. Around request ~50, you should start seeing 429 OR a fake-schema response (the anti-scraping engine has multiple modes)

---

## 6. When you find a regression

Don't fix it immediately. Capture state first.

1. **Screenshot the failure**: visual + Network panel + Console panel.
2. **Note the exact steps**: which account, which URL, what you clicked, what you saw.
3. **Check git blame** for the relevant code:
   ```bash
   git log --oneline -- <file-path> | head -10
   ```
4. **Run the pre-flight greps** from CLAUDE.md §4 relevant to the change area:
   ```bash
   # Example: form-related regression
   pnpm check 2>&1 | grep state_referenced_locally
   pnpm test:unit -- --run numericFieldsHaveExplicitLimits
   ```
5. **File the regression** with:
   - SHA of the recent commit that likely caused it (via `git log` since last known-good)
   - Reproduction steps
   - Expected vs actual
   - Environment (dev / preview / prod)

Then either fix it yourself, ask me to fix it (I'll trace per CLAUDE.md §6 before touching code), or open it as an issue.

---

## Appendix — quick command cheatsheet

```bash
# Type-check (must be 0/0)
pnpm check

# Tests (must all pass)
pnpm test:unit -- --run

# Production build (must succeed)
pnpm build

# Local preview (closer to prod than dev)
pnpm preview      # serves at http://localhost:4173

# Network curl with auth (replace tokens)
curl http://localhost:5173/api/<route> \
  --cookie "accessToken=<JWT>; csrfToken=<token>" \
  -H "X-CSRF-Token: <token>"

# Verify your auth cookies (after logging in)
# DevTools → Application → Cookies → localhost
# Copy accessToken and csrfToken values
```
