# Enterprise-Grade Full Stack Code Review Protocol

> **Version:** 3.1 — 2026-05-13
> **Scope:** DigitalDSA V3 (SvelteKit 5 + MongoDB + Vercel + Capacitor)
> **Teams:** Multi-team codebase — cross-team regression detection is a first-class concern

---

## Objective

This review ensures:

- **Production-grade security** — auth, CSRF, XSS, injection, secret hygiene
- **SSR-safe architecture** — no browser-API crashes, hydration stability, load-function safety
- **Zero-regression deployments** — Vercel runtime compatibility, Node version pinning, adapter safety
- **High-performance rendering & API execution** — reactive efficiency, bundle size, network, memory
- **Secure authentication / session handling** — JWT lifecycle, cookie config, role enforcement
- **Mobile + desktop compatibility** — Capacitor guards, touch targets, viewport safety
- **Data integrity** — MongoDB atomicity, validation parity, payload consistency
- **Long-term maintainability** — pattern consistency, CLAUDE.md discipline, tech debt tracking
- **Production observability** — structured logging, error visibility, silent failure detection
- **Developer experience safety** — build reliability, test quality, dependency hygiene
- **Cross-team regression prevention** — shared module changes don't silently break other teams' flows

The reviewer validates BOTH development environment safety AND production runtime behavior.

---

## Review Cadence

Not every review needs every rule. Choose the profile that matches the day:

| Profile | Tiers | When | Est. Time |
|---------|-------|------|-----------|
| **Quick** | T1-T3 | Light commit days (icons, docs, trivial fixes) | ~15 min |
| **Standard** | T1-T6, T9 | Normal commit days | ~30 min |
| **Full** | T1-T9 + Phase 3 (build/audit) | Before deploy, weekly, or after large merges | ~60 min |
| **Incident** | T1-T2, T5, T9 (blast radius only) | After a production incident or hotfix | ~20 min |

**Always run T9 (Cross-Team Blast Radius) when any commit touches a shared module** — regardless of profile. One team's "cleanup" in `guards.ts` can 500 every API route.

---

## Phase 0 — Hard Constraints

```
DO NOT push commits
DO NOT modify source code outside docs/reviews/
DO NOT auto-fix issues
DO NOT run destructive commands (git reset, rm -rf, drop, etc.)
DO NOT delete files
DO NOT modify database state or run migrations
DO NOT deploy or change environment configuration
DO NOT modify .env* files
DO NOT expose secrets in the review report
```

**Allowed write location:** `docs/reviews/`
**Deliverable:** `docs/reviews/CODE-REVIEW-YYYY-MM-DD.md`

---

## Phase 1 — Repository Context Loading

Before reviewing commits, load context:

1. **Read:** `CLAUDE.md` (pitfalls, conventions, done checklist)
2. **Read:** Most recent `docs/reviews/CODE-REVIEW-*.md` (prior findings, known-safe inventory)
3. **Read:** `docs/SESSION-HANDOFF.md` (current state, in-flight work)
4. **Identify high-risk modules** for extra scrutiny:
   - `src/hooks.server.ts` — auth, CSRF, CSP, security headers
   - `src/lib/server/guards.ts` — authorization enforcement
   - `src/lib/ruleEngine/` — financial calculations
   - `src/lib/utils/payloadBuilder/` — form→API data pipeline
   - `src/routes/api/auth/` — JWT lifecycle
   - `src/routes/api/upload/` — file handling
   - `src/lib/server/formEngine/` — visibility/showWhen logic

**Compare all grep results against the prior review's findings.** If a known-bad call site persists, mark it "regression / unfixed" — don't rediscover it.

---

## Phase 2 — Mandatory Static Sweep

Run ALL Tier 1, 2, 3, 5, 6 rules unconditionally on every invocation.
Run Tier 4, 7, 8 rules conditionally (only when commits touch the relevant area).

---

### TIER 1 — SECURITY (always run)

#### Rule A — CSRF: raw `fetch()` on mutating endpoints

```
Grep pattern: await fetch\(
glob:        **/*.svelte
output_mode: content
-n: true
```

Also grep `.ts` files in `src/` (stores, services, utils that run in the browser).

For every match, check the HTTP method. If it's `POST`/`PUT`/`PATCH`/`DELETE`, it must use `secureFetch` from `$lib/utils/csrf.js`. `GET` is safe with raw `fetch`. FormData uploads work fine with `secureFetch` — it adds the CSRF header without touching `Content-Type`. Background: documented in `docs/reviews/2026-04-26-sweep.md` §Category 1.

#### Rule E — Unsanitized `{@html}` XSS vectors (Pitfall #15)

```
Grep pattern: \{@html
glob:        src/**/*.svelte
output_mode: content
-n: true
```

Pipe results through `| grep -v sanitizeHtml | grep -v _archive` for the delta. Every `{@html ...}` MUST use `sanitizeHtml()` from `$lib/utils/sanitizeHtml.ts` UNLESS it's one of these documented exceptions:

- `JsonLd.svelte` — JSON-LD `<script>` tag (escaped via `JSON.stringify`)
- `Toast.svelte` — internal SVG icon constants
- Form `pageDescription` — server-controlled schema strings
- Admin `policies/[artifact_id]/+page.svelte` — `a.human_readable` (admin-role only)
- `how-can-we-help/+page.svelte` — hardcoded `NoteWorthyMessage()` HTML

Any match NOT in that list and NOT wrapped in `sanitizeHtml()` is a **Critical** finding.

#### Rule E2 — XSS beyond `{@html}`: dynamic attributes & URL injection

```
Grep pattern: href=["']\{|src=["']\{|action=["']\{|on:click=.*\{.*window\.open
glob:        src/**/*.svelte
output_mode: content
-n: true
```

Review each match for user-controlled data flowing into `href`, `src`, or `action` attributes. Flag `javascript:` protocol injection risk. Check that any user-input URL is validated against an allowlist or parsed with `new URL()` before rendering.

Also check markdown/rich-text rendering pipelines:
```
Grep pattern: marked\(|markdown|renderMarkdown|DOMPurify
glob:        src/**/*.{svelte,ts}
output_mode: content
-n: true
```

#### Rule F — Bare `console.log/error/warn` in server code

```
Grep pattern: console\.(log|error|warn)\(
path:        src/lib/server/
output_mode: content
-n: true
```

Also grep `src/routes/api/`. Server code must use `logger` from `$lib/server/logger` (Pino). Bare `console` bypasses log levels and structured fields. **0 matches expected** (exception: `logger.ts` fallback lines).

#### Rule G — `Co-Authored-By` in commits (forbidden per CLAUDE.md §16)

```bash
git log --since='1 week' --pretty=format:'%B' | grep -i 'co-authored-by'
```

**0 matches expected.** Hard rule violation if any.

#### Rule SEC-1 — Hardcoded secrets / credentials in source

```
Grep pattern: (password|secret|apikey|api_key|private_key|token|bearer)\s*[:=]\s*['"][^'"]{8,}
glob:        src/**/*.{ts,svelte,js}
output_mode: content
-n: true
-i: true
```

Also check for connection strings and URLs with embedded credentials:
```
Grep pattern: mongodb(\+srv)?://[^"'\s]*:[^"'\s]*@|https?://[^"'\s]*:[^"'\s]*@
glob:        src/**/*.{ts,svelte,js}
output_mode: content
-n: true
```

Exclude `*.test.ts` and `*.example` files. Any hardcoded secret is **Critical**. All secrets must use `$env/static/private`. Cross-reference with the P0.2 production blocker (`.env` committed 19× — credentials already exposed in git history).

#### Rule SEC-2 — PII / sensitive data in logging

```bash
grep -rnE "logger\.(info|warn|error|debug)" src/lib/server/ src/routes/api/ | grep -iE "(aadhaar|pan|phone|mobile|otp|password|token|cookie|email|dob|birth)" | head -30
```

Production logs must NEVER expose PII. Review each match — structured logger context objects are the risk (e.g., `logger.info({ user }, 'login')` dumps the entire user object including PII). Correct pattern: `logger.info({ userId: user._id }, 'login')`.

Also check for raw request body logging:
```
Grep pattern: logger\..*(req\.body|request\.body|body\b)
path:        src/
output_mode: content
-n: true
```

#### Rule SEC-3 — Cookie security validation

```
Grep pattern: cookies\.set\(
glob:        src/**/*.{ts,svelte}
output_mode: content
-n: true
```

Every `cookies.set()` call must include: `httpOnly: true` (exception: `csrf-token` which must be client-readable), `secure: !dev`, `sameSite: 'lax'` or `'strict'`. Flag:
- Missing `httpOnly` on auth cookies
- Missing `secure` flag
- `sameSite: 'none'` without strong justification
- Overly long `maxAge` on session cookies (>30 days)
- Missing `path` scoping (should be `/` or route-specific)

#### Rule SEC-4 — Injection vectors: eval, exec, dynamic code

```
Grep pattern: \beval\(|new Function\(|child_process|\.exec\(|\.execSync\(|\$where
glob:        src/**/*.{ts,svelte,js}
output_mode: content
-n: true
```

Any match is **High** severity. Known approved instances:
- `src/routes/api/admin/testing/e2e-runs/+server.ts` — `exec()` with enum-validated `testType`, dev-only, admin-guarded
- `src/routes/api/test/run-vitest/+server.ts` — `exec()` with strict allowlist regex, dev-only

New `exec()` calls MUST use `execFile()` with argv array (no shell parsing). MongoDB `$where` is never acceptable — use `$expr` instead.

#### Rule SEC-5 — Environment variable client exposure

```
Grep pattern: VITE_|import.*\$env/(static|dynamic)/public
glob:        src/**/*.{ts,svelte,js}
output_mode: content
-n: true
```

Any `VITE_*` or `$env/*/public` variable containing secrets, API keys, or connection strings is **Critical**. Public env vars are embedded in the client bundle. Verify each match contains only non-sensitive config (app name, public URLs, feature flags).

Also verify no server env vars leak to client:
```
Grep pattern: \$env/(static|dynamic)/private
glob:        src/**/*.svelte
output_mode: content
-n: true
```

`$env/*/private` imports in `.svelte` files (not `+page.server.ts` / `+layout.server.ts` / `+server.ts`) indicate server secrets accessible in client components — **Critical** if found.

#### Rule SEC-6 — Rate limiting coverage on mutating/expensive endpoints

```bash
# Find all POST/PUT/DELETE/PATCH handlers without rateLimit
grep -rnl "export async function POST\|export async function PUT\|export async function DELETE\|export async function PATCH" src/routes/api/ | while read f; do grep -L "rateLimit" "$f"; done 2>/dev/null | head -20
```

Every state-changing API endpoint should call `rateLimit()` from `$lib/server/rateLimiter.ts`. Priority targets:
- Auth endpoints (OTP, signup, login, refresh) — already rate-limited
- Upload endpoints — already rate-limited
- Share-link public endpoints — **gap identified in prior review**
- Any endpoint accepting user-generated content

Flag missing rate limiting as **Medium** (or **High** if the endpoint is public/unauthenticated).

#### Rule SEC-7 — Client storage PII audit

```
Grep pattern: localStorage\.setItem|sessionStorage\.setItem
glob:        src/**/*.{ts,svelte}
output_mode: content
-n: true
```

For each match, verify the stored value does NOT contain: auth tokens, JWTs, PII (Aadhaar, PAN, phone, email, DOB), passwords, or API keys. Acceptable localStorage usage: theme preference, language, walkthrough state, form draft keys (not values), device fingerprint components. Any PII in client storage = **High** (accessible via XSS, browser extensions, shared devices).

---

### TIER 2 — CRASH / SSR / 500 (always run)

#### Rule B — SSR crash: static `@capacitor/*` imports at module scope

```
Grep pattern: ^import .* from ['"]@capacitor/(?!core)
glob:        src/**/*.{ts,svelte}
output_mode: content
-n: true
```

Capacitor plugins call `window.*` / `document.*` at module load. Static module-scope `import` from any `@capacitor/*` package OTHER THAN `@capacitor/core` will execute during SSR (Vite dev + Vercel prod) and throw 500. Replace with `await import('@capacitor/<plugin>')` inside the function that needs it.

#### Rule C — `window.location.reload()` discards component state

```
Grep pattern: window\.location\.reload\(\)
glob:        src/**/*.{svelte,ts}
output_mode: content
-n: true
```

Acceptable uses (don't flag): `+error.svelte` retry, `LanguageSelector`, admin-only seeding pages, `ResetDataButton`, `hooks.client.ts` auth-failure path. Anything else: prefer `invalidateAll()` from `$app/navigation`. Inventory tracked in `docs/reviews/2026-04-26-sweep.md` §Category 3.

#### Rule D — Async function returning a Capacitor proxy (Pitfall #8)

```
Grep pattern: return\s+(mod|module|m)\.\w+\s*;?\s*$
glob:        src/**/*.ts
output_mode: content
-n: true
```

For each match, check if the file imports from `@capacitor/*` or any Proxy-based API. Fix: wrap in a plain object envelope `return { Plugin: mod.Plugin }`. See CLAUDE.md Pitfall #8.

#### Rule I — `typeof window !== 'undefined'` SSR guard (Pitfall #9)

```
Grep pattern: typeof window !== 'undefined'
glob:        src/**/*.{svelte,ts}
output_mode: content
-n: true
```

Vite 7 exposes a partial `window` object in SSR. Use `import { browser } from '$app/environment'`. **0 matches expected** — any new match is a regression.

#### Rule J — Module-scope `fetch` (Pitfall #4)

```
Grep pattern: ^(let|const|export).* = (await )?fetch\(
glob:        src/**/*.{ts,svelte}
output_mode: content
-n: true
```

SvelteKit warns: "Avoid calling fetch eagerly during server-side rendering." Wrap in `onMount`, event handlers, or `load` functions. **0 matches expected.**

#### Rule SSR-1 — Hydration mismatch: non-deterministic render output

```
Grep pattern: Math\.random\(\)|crypto\.randomUUID\(\)|Date\.now\(\)
glob:        src/**/*.svelte
output_mode: content
-n: true
```

Values that differ between SSR and client hydration cause mismatch warnings and UI flicker. Acceptable ONLY inside `onMount`, event handlers, or `$effect` blocks (client-only execution). Flag if used in:
- Template expressions (`{Math.random()}`)
- `$derived` computations
- Component-level `let` initializers (outside `onMount`)
- `id` attributes (use deterministic IDs instead)

Also check for browser-only APIs used outside guards:
```
Grep pattern: \b(localStorage|sessionStorage|navigator\.|matchMedia|ResizeObserver|IntersectionObserver|FileReader|Notification)\b
glob:        src/**/*.svelte
output_mode: content
-n: true
```

Each match must be inside `onMount()`, `$effect()`, an event handler, or guarded by `if (browser)`. Module-scope or `$derived` usage crashes SSR.

#### Rule SSR-2 — Unhandled promise rejections in load functions

```
Grep pattern: \.then\([^)]*\)(?!\s*\.catch)
glob:        src/routes/**/*.{server.ts,ts}
output_mode: content
-n: true
```

Load functions (`+page.server.ts`, `+layout.server.ts`) that use `.then()` without `.catch()` can produce unhandled rejections → 500 errors in production. Prefer `async/await` with try/catch. Also check for fire-and-forget promises:

```
Grep pattern: ^\s+\w+\.\w+\(.*\)(?!\s*;?\s*(\.then|\.catch|await|//))
```

This is a heuristic — manual review of load functions for proper error handling is more reliable.

---

### TIER 3 — CORRECTNESS & QUALITY (always run)

#### Rule H — Svelte 5 `$state` reactivity traps (Pitfall #10)

**H1 — `state_referenced_locally` warning:**

```bash
pnpm check 2>&1 | grep state_referenced_locally
```

**0 matches expected.** Fix: use `$derived(prop)` if the value is a view of the prop, or add `// svelte-ignore state_referenced_locally` with a WHY comment if seeded-then-mutated.

**H2 — `$state` variable read+written inside same `$effect`:**

Manual review pattern — for every commit that adds/modifies a `$effect` block, check whether the effect body assigns to a `$state` variable that the same effect also reads. This is NOT caught by svelte-check.

#### Rule K — JSON-Logic `!=` broken for null checks (Pitfall #1)

```
Grep pattern: '!=':\s*\[
path:        src/lib/config/
output_mode: content
-n: true
```

In the custom JSON-Logic implementation, `!=`/`!==` have "unanswered = hide" semantics. Use `!` for unset/falsy checks instead.

#### Rule L — Numeric fields without explicit `minLimit` (Pitfall #14)

```bash
pnpm test:unit -- --run numericFieldsHaveExplicitLimits 2>&1 | grep -E "FAIL|missing"
```

**0 FAIL expected.** Without explicit `minLimit`, `isFieldAnswered()` defaults to 1, blocking 0 as valid.

#### Rule M — `combinedAnswers` alias collision (Pitfall #13)

```
Grep pattern: combinedAnswers\.
path:        src/lib/components/
output_mode: content
-n: true
```

Pipe through: `grep -vE "(propertyStateName|residenceStateName|businessStateName|loanName|loanType)"`. Always use full bindsTo key.

#### Rule S — Color token contrast audit (WCAG AA)

```bash
pnpm test:contrast
```

Compare against prior day's report. Any NEW failure → finding. Any REMOVED failure → progress note. When new color tokens are added, verify their fg/bg pair is declared in `scripts/contrast/pairs.mjs`.

#### Rule CQ-1 — Swallowed errors / empty catch blocks

```
Grep pattern: catch\s*\([^)]*\)\s*\{\s*\}
glob:        src/**/*.{ts,svelte}
output_mode: content
-n: true
```

Also check for catch blocks that only log without re-throwing or returning error state:
```
Grep pattern: catch\s*\(\w+\)\s*\{[^}]*console
glob:        src/**/*.{ts,svelte}
output_mode: content
-n: true
```

Empty catches hide bugs. Acceptable ONLY when the error is genuinely expected and documented (e.g., `try { JSON.parse(x) } catch { /* optional field */ }`). Every other catch must either: (a) log with `logger`, (b) return an error to the caller, or (c) set error UI state.

#### Rule CQ-2 — Memory leaks: uncleaned intervals, listeners, observers

```
Grep pattern: setInterval\(|addEventListener\(
glob:        src/**/*.svelte
output_mode: content
-n: true
```

Every `setInterval` in a Svelte component must have a corresponding `clearInterval` in `onDestroy` or the `$effect` return function. Every `addEventListener` must have a corresponding `removeEventListener`. In Svelte 5, the `$effect` cleanup pattern is preferred:

```ts
$effect(() => {
  const id = setInterval(fn, 1000);
  return () => clearInterval(id);  // cleanup on destroy/re-run
});
```

Also check for stores/subscriptions without unsubscribe:
```
Grep pattern: \.subscribe\(
glob:        src/**/*.svelte
output_mode: content
-n: true
```

In Svelte 5, prefer `$derived` or `$effect` over manual store subscriptions. Legacy `.subscribe()` must call the returned unsubscribe function.

#### Rule CQ-3 — Banned cloning pattern: `JSON.parse(JSON.stringify())`

```
Grep pattern: JSON\.parse\(JSON\.stringify
glob:        src/**/*.{ts,svelte}
output_mode: content
-n: true
```

**0 matches expected** in non-test files. CLAUDE.md §12 explicitly bans this — it loses Dates, Maps, Sets, undefined values, and circular references. Use `structuredClone()` for trusted data, `$state.snapshot()` for reactive→plain, or `securedClone()` for untrusted input. Test files (`*.test.ts`) are exempt (snapshot comparison is acceptable there).

#### Rule CQ-4 — Error boundary coverage gaps

```
Grep pattern: \+error\.svelte
path:        src/routes/
output_mode: files_with_matches
```

The app currently has only **one** `+error.svelte` at the root. When a nested route (e.g., `(app)/form/home-loan/`) throws, the error bubbles up and replaces the entire page — sidebar, nav, wizard state, all gone. The user loses their form progress and context.

**Expected:** at minimum, route-group-level boundaries:
- `src/routes/(app)/+error.svelte` — contains crash within the authenticated shell
- `src/routes/(auth)/+error.svelte` — contains crash within the login/signup flow
- `src/routes/dashboard/+error.svelte` — contains crash within admin/RM/DSA dashboards

Track the count vs prior review. If a new route group is added without its own `+error.svelte`, flag as **Medium**.

#### Rule CQ-5 — TODO / FIXME / HACK accumulation

```
Grep pattern: TODO|FIXME|HACK|XXX
glob:        src/**/*.{ts,svelte}
output_mode: count
```

Track total count vs prior review. Currently ~35 across 13 files. Flag:
- **Count increased by >5** in a single review window = **Medium** (tech debt growing faster than it's resolved)
- **New HACK or FIXME** in production-critical code (ruleEngine, guards, hooks) = **High**
- **TODO older than 30 days** without a linked issue/plan = note in observations

This is a leading indicator of team velocity problems — when TODOs accumulate, it means teams are deferring fixes that create problems for other teams later.

---

### TIER 4 — CONDITIONAL RULES (run only when commits touch the relevant area)

#### Rule O — Payload snapshot drift (Pitfall #11)

**Run when:** commits touch `src/lib/utils/payloadBuilder/` or any `questionBank/*.ts` that changes field structure.

```bash
pnpm test:unit -- --run schemaFixtureFactory 2>&1 | grep -E "FAIL|toEqual"
```

**0 FAIL expected.**

#### Rule P — Auto-clear parity across 6 form pages (Pitfall #12)

**Run when:** commits touch any form `+page.svelte`, `formWizardEngine.ts`, or add/modify `showWhen` on options.

```
Grep pattern: clearStaleOptionValues|shouldShow.*answersContext
path:        src/routes/(app)/form/
output_mode: files_with_matches
```

**6 files expected** (one per loan type).

#### Rule Q — Vercel `engines.node` pin (Pitfall #7)

**Run when:** commits touch `package.json`.

```
Grep pattern: "engines"
path:        package.json
output_mode: content
-A: 2
```

Must show a **pinned major** like `"22.x"`. Open-ended ranges deploy on latest Node (breaking gsap CJS interop).

#### Rule R — Server→client field forwarding (Pitfall #2)

**Run when:** commits add fields to `RawSchemaQuestion` or `RawSchemaOption` types.

```
Grep pattern: toClientOption|toClientQuestion
path:        src/lib/server/formEngine/
output_mode: content
-n: true
```

New schema fields are silently `undefined` on the client unless plumbed through `toClientOption()` / `toClientQuestion()`.

#### Rule COND-1 — Upload security validation

**Run when:** commits touch `src/routes/api/upload/` or `src/routes/api/share-link/upload/`.

Verify:
```bash
# MIME allowlist still restrictive
grep -n "allowedMimeTypes\|allowedTypes\|MIME" src/routes/api/upload/+server.ts src/routes/api/share-link/upload/+server.ts

# Size limits enforced
grep -n "MAX_FILE_SIZE\|maxSize\|10.*MB\|10485760" src/routes/api/upload/+server.ts

# Filename sanitization active
grep -n "replace.*[\\/]\|replace.*[^a-zA-Z]\|randomUUID" src/routes/api/upload/+server.ts
```

Flag: trusting client MIME type without server validation, unrestricted file sizes, path traversal in filenames, missing `crypto.randomUUID()` for storage names.

#### Rule COND-2 — Financial calculation changes

**Run when:** commits touch `src/lib/ruleEngine/` or income/EMI/FOIR/LTV calculations.

Manual review checklist:
- [ ] Rounding consistency (use `Math.round`, not `Math.floor`/`Math.ceil` for currency)
- [ ] No floating-point comparison (`===` on decimals) — use epsilon or round-then-compare
- [ ] NaN/Infinity guards on division operations
- [ ] Negative value handling (negative income, negative EMI should be rejected)
- [ ] Haircut percentages match spec (salaried 0%, self-employed 30%, rental 30%, etc.)
- [ ] Results match backend AND frontend (no client-side recalculation divergence)

#### Rule COND-3 — Anti-scraping layer integrity

**Run when:** commits touch `engine.ts` (encode), `showWhenDecoder.ts` (decode), `showWhenEngine.ts` (wrapper), `formGuard.ts` (budget), or any anti-scraping infrastructure.

```bash
# Verify all 8 anti-scraping layers are still wired
grep -c "fingerprint\|trustScore\|sessionBudget\|honeypot\|rateLimit\|xorEncode\|formGuard\|obfuscate" src/lib/server/formEngine/engine.ts src/lib/server/formGuard.ts src/lib/components/form/HoneypotField.svelte 2>/dev/null
```

The 8-layer system (CLAUDE.md §13 AD-14) is a locked architectural decision. Verify:
- XOR encoding of `showWhen` rules is still active (not bypassed for debugging)
- Trust scoring accumulates correctly across requests
- Session budget tracking prevents bulk enumeration
- Honeypot field is present in all form pages
- All layers are gated behind `dev === false` (disabled in dev, active in prod)

Any layer removed or weakened without explicit architectural decision is **Critical**.

#### Rule COND-4 — Vercel function size / cold-start risk

**Run when:** commits add new dependencies, or weekly.

```bash
pnpm build 2>&1 | grep -E "\.func|serverless|size|chunks"
```

After build, check output size:
```bash
# If .vercel/output exists after build
du -sh .vercel/output/functions/ 2>/dev/null || echo "No .vercel output (adapter-auto)"
```

Vercel serverless functions have a **50MB uncompressed limit**. Cold starts degrade noticeably above ~10MB. Flag:
- New heavyweight dependencies (`sharp`, `canvas`, `puppeteer`) added to server bundle
- `ssr.noExternal` additions that pull large packages into the function
- Build output size increase >20% vs prior review

---

### TIER 5 — PRODUCTION HARDENING (always run)

#### Rule PH-1 — Security headers validation

```bash
grep -n "X-Frame-Options\|X-Content-Type-Options\|Referrer-Policy\|Permissions-Policy\|Strict-Transport-Security\|Content-Security-Policy" src/hooks.server.ts
```

Expected headers (all set in `hooks.server.ts`):
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains` (prod only)
- CSP with nonce-based `script-src` (no `unsafe-eval`)

**Flag if any header is missing or weakened.** Note: `style-src 'unsafe-inline'` is a known trade-off for Tailwind — document but don't flag.

#### Rule PH-2 — Authorization guard coverage on API routes

```bash
# Find API handlers missing auth guards
grep -rnl "export async function (POST|PUT|DELETE|PATCH|GET)" src/routes/api/ | while read f; do grep -L "requireAuth\|requireRole\|requireAdmin\|requireTeam\|blockDemoWrite" "$f"; done 2>/dev/null | head -20
```

Every API route MUST call at least one guard function from `$lib/server/guards.ts`. Exceptions: auth endpoints (`/api/auth/*`), public share-link read endpoints, health checks. Any unguarded mutating endpoint is **High**.

#### Rule PH-3 — API response consistency

```
Grep pattern: new Response\(JSON\.stringify|json\(
glob:        src/routes/api/**/*.ts
output_mode: content
-n: true
```

All API routes must use `apiOk()`, `apiError()`, `apiServerError()`, `apiValidationError()` from `$lib/server/apiResponse.ts` — never `new Response(JSON.stringify(...))` or SvelteKit's `json()`. Consistent error shape is required for client-side error handling.

#### Rule PH-4 — External API timeout and error handling

```
Grep pattern: fetch\(.*https?://|externalFetch\(
glob:        src/lib/server/**/*.ts
output_mode: content
-n: true
```

Also check `src/routes/api/`:
```
Grep pattern: fetch\(.*https?://
glob:        src/routes/api/**/*.ts
output_mode: content
-n: true
```

All external API calls (MSG91, Razorpay, OpenAI, ImageKit) must:
- Use `externalFetch()` wrapper from `$lib/server/externalFetch.ts` (timeout + retry + logging)
- OR have explicit `AbortController` timeout
- Have error handling (no unhandled rejections)
- NOT log response bodies containing user data

#### Rule PH-5 — MongoDB query safety

```
Grep pattern: \$where|\$function|\$accumulator
glob:        src/**/*.ts
output_mode: content
-n: true
```

**0 matches expected.** These MongoDB operators execute arbitrary JavaScript — injection risk.

Also verify parameterized queries (no string interpolation in filters):
```
Grep pattern: \.(find|findOne|updateOne|deleteOne|aggregate)\(\s*\{[^}]*\$\{
glob:        src/**/*.ts
output_mode: content
-n: true
```

Template literal interpolation inside MongoDB query objects is injection-prone. All user input must flow through typed filter objects, not string building.

#### Rule PH-6 — Cache-Control on sensitive responses

```
Grep pattern: Cache-Control|cache-control|s-maxage|stale-while-revalidate
glob:        src/routes/**/*.{server.ts,ts}
output_mode: content
-n: true
```

Verify:
- Auth-related responses have `Cache-Control: no-store, no-cache, must-revalidate`
- User-specific data responses are NOT publicly cacheable
- CDN `s-maxage` is NOT set on authenticated endpoints
- Static assets have appropriate cache headers

**Critical** if auth tokens or user data are cacheable by CDN/browser.

#### Rule PH-7 — API input validation: `parseJsonBody` coverage

```bash
# Find POST/PUT/DELETE/PATCH handlers NOT using parseJsonBody (unsafe JSON parsing)
grep -rnl "export const POST\|export const PUT\|export const DELETE\|export const PATCH" src/routes/api/ | while read f; do grep -L "parseJsonBody" "$f"; done 2>/dev/null | head -30
```

Every API route accepting a JSON body must use `parseJsonBody()` from `$lib/server/apiResponse.ts` — not raw `await request.json()`. Raw `.json()` throws 500 on malformed input instead of returning a clean 400. Currently ~50 of ~189 handlers use `parseJsonBody` — track coverage increase over time.

For routes that DON'T need a body (query-param or path-param only), this is expected. But any POST handler that calls `await request.json()` directly is a **Medium** finding.

---

### TIER 6 — PERFORMANCE & OBSERVABILITY (always run)

#### Rule PERF-1 — Heavy / unnecessary imports

```
Grep pattern: import \* as
glob:        src/**/*.{ts,svelte}
output_mode: content
-n: true
```

`import *` pulls entire module — prefer named imports. Also check for known heavy packages imported client-side:

```
Grep pattern: import.*from ['"](lodash|moment|luxon|date-fns|chart\.js|d3|pdf-lib|sharp|pino)['"]
glob:        src/**/*.svelte
output_mode: content
-n: true
```

Server-only packages (`pdf-lib`, `sharp`, `pino`) must NEVER be imported in `.svelte` files (they'll be bundled into client). Client-side alternatives: `date-fns` → tree-shakeable named imports, `lodash` → `lodash-es` or inline.

#### Rule PERF-2 — Reactive churn: `$effect` writing to `$state` it reads

```
Grep pattern: \$effect\(
glob:        src/**/*.{svelte,svelte.ts}
output_mode: content
-n: true
```

For high-frequency files (form pages, applicant components), manually check each `$effect` for:
- Writing to a `$state` variable that the same effect reads (infinite loop risk)
- Cascading effects (effect A writes X → triggers effect B which writes Y → triggers effect A)
- Effects that should be `$derived` (pure computation, no side effects)
- Effects without cleanup that set up listeners/intervals

Count total `$effect` calls — sudden spikes (>5 new effects in a single commit) warrant architectural review.

#### Rule PERF-3 — Duplicate network requests

```
Grep pattern: invalidateAll\(\)|invalidate\(
glob:        src/**/*.{svelte,ts}
output_mode: content
-n: true
```

`invalidateAll()` refetches ALL load functions on the page — expensive. Check if a targeted `invalidate('/api/specific')` would suffice. Flag `invalidateAll()` called inside loops or rapid-fire event handlers.

Also check for multiple fetches to the same endpoint:
```
Grep pattern: secureFetch\(['"](/api/\w+)
glob:        src/**/*.{svelte,ts}
output_mode: content
-n: true
```

Group by URL path — if the same endpoint is called from multiple components on the same page without deduplication, flag as **Medium**.

#### Rule PERF-4 — Event loop blocking: synchronous heavy operations

```
Grep pattern: JSON\.parse\(|JSON\.stringify\(|structuredClone\(
glob:        src/routes/api/**/*.ts
output_mode: content
-n: true
```

In API routes (request path), `JSON.parse/stringify` on large payloads (form data, full case objects) can block the event loop. Flag if:
- Called inside a loop
- Operating on unbounded user input (no size limit checked first)
- Called on the full database document without projection

Also check for synchronous crypto:
```
Grep pattern: crypto\.(createHash|pbkdf2Sync|scryptSync|randomBytes)
glob:        src/**/*.ts
output_mode: content
-n: true
```

`pbkdf2Sync` and `scryptSync` block the event loop — use async variants. `createHash` and `randomBytes` are fast enough for normal use.

#### Rule PERF-5 — Image & asset optimization

```
Grep pattern: <img
glob:        src/**/*.svelte
output_mode: content
-n: true
```

Every `<img>` tag should have:
- `loading="lazy"` (except above-the-fold hero images)
- Explicit `width` and `height` attributes (prevents layout shift / CLS)
- `alt` text (accessibility)

Currently only 4 files use `loading="lazy"`. Track count vs prior review — new images without lazy loading degrade mobile page load.

Also check for oversized inline SVGs or base64 images:
```
Grep pattern: data:image/|<svg.*viewBox
glob:        src/**/*.svelte
output_mode: count
```

Large inline SVGs (>5KB) should be extracted to components or assets.

#### Rule PERF-6 — NaN / Infinity guards in financial calculations

```
Grep pattern: /\s|/ [^/]
glob:        src/lib/ruleEngine/**/*.ts
output_mode: content
-n: true
```

Also check with a broader pattern:
```bash
grep -rnE "\/ [a-zA-Z]|\/\s*[a-zA-Z]" src/lib/ruleEngine/ | grep -v "\/\/" | grep -v "\/\*" | head -20
```

Every division in the rule engine (EMI formulas, FOIR, LTV, affordability) must guard against divide-by-zero. Currently only 7 NaN/Infinity guard sites exist. For each division, verify:
- Divisor is checked for zero BEFORE the division
- Result is checked with `isFinite()` or `Number.isFinite()` AFTER
- NaN doesn't propagate into downstream calculations or client display

Division producing `NaN` or `Infinity` in a financial calculation = **High** (silent corruption of eligibility/EMI results).

#### Rule OBS-1 — Structured logging compliance

```bash
# Server files using console instead of logger
grep -rnE "console\.(log|error|warn|info|debug)\(" src/routes/api/ src/lib/server/ | grep -v "logger.ts" | grep -v "test" | grep -v "_archive" | head -20
```

**0 matches expected** (mirrors Rule F but broader scope). All server-side code must use `logger` from `$lib/server/logger.ts` for:
- Request ID correlation
- Structured context fields
- Log level filtering in production
- Vercel log aggregation compatibility

#### Rule OBS-2 — Silent failure detection

```
Grep pattern: catch\s*\(\w*\)\s*\{[^}]*(return;|return undefined|return null|//|/\*)
glob:        src/routes/api/**/*.ts
output_mode: content
-n: true
```

API routes that catch errors and return `undefined`/`null` without logging or returning an error response create invisible failures. The client gets a 200 with empty/partial data, never knowing something went wrong.

Also check for `.catch(() => {})` (promise swallowing):
```
Grep pattern: \.catch\(\s*\(\s*\)\s*=>\s*\{\s*\}\s*\)
glob:        src/**/*.{ts,svelte}
output_mode: content
-n: true
```

---

### TIER 7 — BUILD & DEPENDENCY SAFETY (run when dependencies or config change, or weekly)

#### Rule BUILD-1 — Production build verification

```bash
pnpm build 2>&1 | tail -20
```

If the build fails, the deployment will fail. Capture the error. If it passes, note the build time and output size. Flag significant size increases (>10% vs prior review).

#### Rule BUILD-2 — Dependency vulnerability audit

```bash
pnpm audit --production 2>&1 | head -40
```

Report:
- **Critical/High** vulnerabilities → **High** finding with CVE numbers
- **Moderate** vulnerabilities → **Medium** finding
- **Low** → note in observations

If `pnpm audit` is not available, check `package.json` for known problematic packages:
```
Grep pattern: "node-fetch"|"axios"|"express"|"body-parser"
path:        package.json
output_mode: content
-n: true
```

Flag abandoned/deprecated packages that have known replacements.

#### Rule BUILD-3 — TypeScript strict mode compliance

```bash
pnpm check 2>&1 | tail -20
```

Capture full output. Report:
- **0 errors** — required
- **Warning count** — must not increase vs prior review. Note new warnings by file.
- `state_referenced_locally` — must be 0 (covered by Rule H1, but captured here too)

#### Rule BUILD-4 — Test suite health

```bash
pnpm test:unit -- --run --reporter=basic 2>&1 | tail -30
```

Report: total tests, pass/fail count, test file count. Flag:
- Any failures → **High** (blocking)
- Skipped tests (`test.skip`, `test.todo`) → note count, flag if increasing
- Flaky tests (pass inconsistently) → **Medium**
- Test count decrease without corresponding code deletion → **Medium** (tests were removed)

---

### TIER 8 — UX, MOBILE & ACCESSIBILITY (run when UI commits are present)

#### Rule UX-1 — Loading state on async actions

Manual review: for each commit that adds a button/form handler calling `secureFetch`:
- [ ] Button shows loading state during fetch (disabled + spinner)
- [ ] Form inputs are disabled during submission
- [ ] Error state is shown on failure (not silent)
- [ ] Success state provides feedback (toast, redirect, or UI update)
- [ ] Double-submit protection (button stays disabled until response)

Grep for async handlers without loading state:
```
Grep pattern: async.*click|async.*submit|async.*handleSave|async.*handleDelete
glob:        src/**/*.svelte
output_mode: content
-n: true
```

#### Rule UX-2 — Mobile safety: overflow and touch targets

**Run when:** commits modify layout components, forms, modals, or navigation.

```
Grep pattern: overflow-x-auto|overflow-hidden|overflow-scroll|truncate
glob:        src/**/*.svelte
output_mode: content
-n: true
```

Check that `overflow-hidden` doesn't clip important content on mobile. Check that interactive elements meet minimum 44×44px touch target (WCAG 2.5.5).

Also check for fixed/sticky positioning issues:
```
Grep pattern: fixed|sticky
glob:        src/**/*.svelte
output_mode: content
-n: true
```

Mobile keyboards push fixed-bottom elements off-screen. Verify `dvh` / `svh` viewport units are used instead of `vh` where applicable.

#### Rule UX-3 — Form draft preservation

**Run when:** commits modify form pages or wizard navigation.

Verify:
- Browser refresh does NOT lose partially filled form data (check `$effect` persistence to store/URL)
- Navigation between wizard steps preserves all prior answers
- Modal close doesn't discard unsaved changes without confirmation
- Upload progress survives navigation (or warns before leaving)

#### Rule UX-4 — Accessibility baseline

```bash
pnpm test:contrast
```

Additionally check for:
```
Grep pattern: aria-label|aria-describedby|role=|tabindex
glob:        src/**/*.svelte
output_mode: count
```

Track count vs prior review. Decreasing aria-label count without UI simplification is a regression.

For keyboard navigation, verify:
```
Grep pattern: on:keydown|onkeydown|on:keyup|onkeyup|tabindex="-1"
glob:        src/**/*.svelte
output_mode: content
-n: true
```

`tabindex="-1"` removes from tab order — acceptable for decorative elements, problematic for interactive ones.

---

### TIER 9 — CROSS-TEAM BLAST RADIUS (always run when shared modules change)

> **Why this tier exists:** In a multi-team codebase, one team's "quick fix" or "cleanup refactor" in a shared module can silently break every other team's code. The fix passes CI locally because the author only tests their own flow. This tier catches those cross-team regressions before they reach production.

#### Shared Module Registry (blast radius map)

These files are imported by 100+ other files. **Any commit touching them triggers mandatory Tier 9 review.**

| File | Importers | Impact |
|------|-----------|--------|
| `src/lib/database/mongo.ts` | 272 | Every DB operation fails |
| `src/lib/server/guards.ts` | 247 | Every protected route/API 401s or 403s |
| `src/lib/server/logger.js` | 209 | All server logging breaks |
| `src/lib/server/apiResponse.ts` | 186+ | Every API response shape changes |
| `src/lib/types/` (index + subfiles) | 486 | Type changes cascade everywhere |
| `src/lib/config/routes.ts` | 100+ | Navigation breaks across all dashboards |
| `src/lib/config/schema/schemaTypes.ts` | 100+ | Form schema breaks across all loan types |
| `src/lib/utils/formWizardEngine.ts` | 50+ | All 6 loan form pages break |
| `src/lib/stores/*.svelte.ts` | 50+ | Shared state shape changes ripple |
| `src/lib/state/*.svelte.ts` | 50+ | Auth/UI/form state changes ripple |
| `src/hooks.server.ts` | — | Auth, CSRF, CSP, headers — every request |
| `src/lib/utils/csrf.ts` | 50+ | Every mutating API call breaks |

#### Rule BLAST-1 — Shared module change detection

```bash
# Check if any commit in the review window touches a high-blast-radius file
git diff --name-only <prior-review-SHA>..HEAD | grep -E "(mongo\.ts|guards\.ts|logger\.(ts|js)|apiResponse\.ts|hooks\.server\.ts|csrf\.ts|formWizardEngine\.ts|schemaTypes\.ts|routes\.ts)" | head -20
```

If ANY match: escalate the commit to **mandatory deep review**. The reviewer must:
1. Read the full diff of the shared file (not just the changed lines — context matters)
2. Identify all importers (`grep -rl "from.*<changed-module>" src/`)
3. Verify the change is backward-compatible OR all consumers are updated
4. Check that the author tested at least 2 different flows that use the shared module

#### Rule BLAST-2 — Type/interface breaking changes

```bash
# Get changed .ts files in types/
git diff --name-only <prior-review-SHA>..HEAD | grep "src/lib/types/" | head -10
```

For each changed type file, check:
```bash
# What changed in the type definition?
git diff <prior-review-SHA>..HEAD -- src/lib/types/<file>
```

Flag as **High** if any of these patterns appear in the diff:
- **Removed property** from an exported interface/type (breaks all consumers reading that property)
- **Changed property type** (e.g., `string` → `string | null`, `number` → `string`)
- **Renamed property** without adding to `LEGACY_KEY_MAP` in `migrateApplicantKeys.ts`
- **Made optional→required** (breaks consumers that don't set it)
- **Removed export** (breaks all importers)

Check impact:
```bash
# How many files import the changed type?
grep -rl "import.*from.*types/<changed-file>" src/ | wc -l
```

If >10 importers and a breaking change: **Critical**. If 5-10: **High**. If <5: **Medium**.

#### Rule BLAST-3 — API response shape changes

```bash
# Check if apiResponse.ts or any API route changed its response shape
git diff <prior-review-SHA>..HEAD -- src/lib/server/apiResponse.ts
```

Also check individual API routes for response shape changes:
```bash
git diff <prior-review-SHA>..HEAD -- src/routes/api/ | grep -E "apiOk\(|apiError\(|return.*\{" | head -20
```

Flag if:
- `apiOk()` / `apiError()` wrapper adds/removes/renames fields — **every client consumer breaks**
- An API route changes its response shape without updating all client callers
- A field is renamed in the response (grep the old field name in `.svelte` files to find broken consumers)

Verify client-side impact:
```bash
# Find all client files that call the changed API endpoint
grep -rn "secureFetch.*<endpoint-path>\|fetch.*<endpoint-path>" src/**/*.svelte src/**/*.ts | head -10
```

#### Rule BLAST-4 — Guard/auth logic changes

```bash
git diff <prior-review-SHA>..HEAD -- src/lib/server/guards.ts src/hooks.server.ts | head -80
```

Changes to guards or auth hooks affect **every protected route**. Verify:
- [ ] No permission was accidentally removed or weakened
- [ ] New permission checks don't lock out existing valid users
- [ ] Admin bypass paths still work
- [ ] Demo user bypass still works
- [ ] Team permission inheritance unchanged
- [ ] Cookie names/paths unchanged (changing a cookie name silently logs out all users)

Test mentally: "If I'm a DSA sub-member with `['cases_view', 'cases_edit']` permissions, does this change still let me do what I did yesterday?"

#### Rule BLAST-5 — Store/state shape changes

```bash
git diff --name-only <prior-review-SHA>..HEAD | grep -E "\.(svelte\.ts|store)" | head -10
```

For each changed store/state file:
```bash
# Find all consumers
grep -rl "import.*from.*<changed-store>" src/ | head -20
```

Flag if:
- A `$state` or `$derived` property is renamed — all template bindings using the old name silently read `undefined`
- A store's exported function signature changes (new required param, changed return type)
- A store's initialization logic changes (components may depend on the initial value)
- A writable store becomes derived (or vice versa) — consumers that `.set()` on a derived store crash

#### Rule BLAST-6 — Route constant changes

```bash
git diff <prior-review-SHA>..HEAD -- src/lib/config/routes.ts | head -40
```

Route constants from `routes.ts` are used across dashboards, navigation, redirects, and `goto()` calls. Changing a route path without updating all references:
- Breaks navigation links (user clicks → 404)
- Breaks `goto()` redirects (silent failure — page just doesn't navigate)
- Breaks `invalidate()` calls (data doesn't refresh)

```bash
# If a route constant was renamed or its value changed, find all usages
grep -rn "ROUTES\.<old-name>\|'<old-path>'" src/ | head -20
```

#### Rule BLAST-7 — Form schema/config changes ripple

```bash
git diff --name-only <prior-review-SHA>..HEAD | grep -E "src/lib/config/(schema|wizardConfigs|.*composer)" | head -10
```

Schema changes affect all 6 loan types, the rule engine, payload builder, and file builder. Verify:
- [ ] If a question's `bindsTo` key changed → update `LEGACY_KEY_MAP` in `migrateApplicantKeys.ts`
- [ ] If a new `showWhen` rule uses `!=` → **blocked** (Pitfall #1)
- [ ] If option-level `showWhen` added → verify auto-clear parity (Rule P, Pitfall #12)
- [ ] If a question is removed → check `getDynamicGuidance`, `caseRouteData`, `combinedAnswers` for dead references
- [ ] If a section/subsection is renamed → check sidebar, wizard navigation, page descriptions

```bash
# Find all consumers of a changed bindsTo key
grep -rn "<old-bindsTo-key>" src/lib/config/ src/lib/components/ src/lib/utils/ | head -15
```

#### Rule BLAST-8 — Database collection/index changes

```bash
git diff <prior-review-SHA>..HEAD -- src/lib/database/ | head -60
```

Changes to MongoDB collection helpers, indexes, or query patterns affect every API route that reads/writes that collection. Verify:
- [ ] Index additions won't cause write-lock contention on high-traffic collections
- [ ] Field renames include migration for existing documents (not just new writes)
- [ ] Query filter changes don't accidentally widen/narrow result sets
- [ ] Projection changes don't strip fields that downstream code expects
- [ ] Collection name changes are updated in ALL routes that access the collection

```bash
# Find all routes using a changed collection
grep -rl "collections\.<collection-name>\|db\.collection.*<name>" src/routes/ | head -15
```

#### Rule BLAST-9 — Cross-team commit attribution & notification

```bash
# List authors in the review window
git log --format='%an' <prior-review-SHA>..HEAD | sort -u
```

When multiple authors committed in the same window:
1. **Map each author to their domain** (forms, dashboard, API, rule engine, etc.)
2. **Check for cross-domain edits** — did Author A (who owns forms) edit a file that Author B (who owns dashboard) also imports?
3. **Check for sequential overwrites** — did Author B's commit modify something Author A just changed? (`git log --follow -p <file>` to trace)
4. **Flag "cleanup" commits that touch shared modules** — these are the #1 source of cross-team regressions. A developer who sees "messy code" in a shared file and "cleans it up" often removes guards or changes behavior they don't understand.

Multi-author days ALWAYS get the **Standard** review profile minimum, even if the commit count is low.

---

## Phase 3 — Build & Test Verification

Run these commands and capture full output:

```bash
# Required — always run
pnpm check                          # TypeScript + Svelte check
pnpm test:unit -- --run             # Unit tests (single pass)
pnpm test:contrast                  # WCAG AA contrast audit

# Run when available / relevant
pnpm build                          # Production build (catches SSR-only failures)
pnpm lint                           # Linting (if configured)
pnpm audit --production             # Dependency vulnerabilities (if pnpm supports)
```

If any command fails for reasons unrelated to the review scope, note it as a **blocker finding** rather than silently skipping. Never skip a failed health check.

---

## Phase 4 — Commit Review

After the static sweep:

1. **Identify commit range:** `git log --oneline` — find commits since the last review's cutoff SHA.

2. **Triage commits:** Give extra scrutiny to:
   - **Teammate commits** (anyone other than primary author + Claude) — their work hasn't been through the same review loop
   - **Large commits** (>200 LOC changed) — higher regression surface
   - **Auth/payment/rule-engine commits** — business-critical
   - **Schema/payload commits** — data integrity risk

3. **For each commit, check:**

   **Security:**
   - Auth bypass, CSRF hole, injection, secret exposure, unsanitized HTML
   - New API routes without guards
   - New external API calls without timeout/retry
   - Cookie changes without proper flags

   **Bugs:**
   - Off-by-one, missing null checks, wrong types
   - Reactive self-tracking (Rule H2)
   - Division by zero, NaN propagation
   - Promise chains without error handling

   **SSR Safety:**
   - Browser-only API usage outside guards
   - Module-scope side effects
   - Non-deterministic render output

   **UX Regressions:**
   - Unexpected hides/shows, lost state, disabled-but-empty fields
   - Missing loading/error states on new async actions
   - Mobile layout breaks

   **CLAUDE.md Rule Violations:**
   - Bare `console`, raw `fetch`, missing `apiOk`/`apiError`
   - `typeof window` guard, `JSON.parse(JSON.stringify())`
   - Missing `secureFetch` on POST
   - New file instead of editing existing (check `_archive/`)

   **Svelte 5 Reactivity:**
   - `$state(prop)` without `$derived` or svelte-ignore
   - `$state` variable read+written in same `$effect`
   - `$effect` that should be `$derived`

   **Parity Gaps:**
   - Fix applied to one loan type but not others
   - Single-applicant but not multi
   - Individual but not Company
   - Light mode but not dark
   - Desktop but not mobile

   **Regression of Prior Intentional Work:**
   - When a commit refactors/cleans code introduced by an earlier bug fix: check the original commit message (`git show <sha> --format=%B`) to understand WHY the code existed
   - Flag as **High** if: (a) original was a bug fix with specific reproduction, (b) refactor deletes logic without equivalent replacement, (c) refactor moves logic but call sites pass different inputs
   - A refactor that preserves all guards/conditions/side-effects is fine — note as verified

   **Performance:**
   - New `$effect` blocks in high-frequency components
   - Large data structures cloned in render path
   - New `invalidateAll()` where targeted invalidation would work
   - Unbounded loops or recursion

   **Data Integrity:**
   - Multi-step writes without transaction safety
   - Missing validation on user input before DB write
   - Stale data overwrites (last-write-wins without conflict check)
   - `combinedAnswers` alias collision on new keys

   **Cross-Team Regression (MOST IMPORTANT IN MULTI-TEAM):**
   - Does this commit change a shared module from the Tier 9 registry?
   - Did the author test flows OUTSIDE their own domain?
   - Does a "refactor" or "cleanup" commit remove code that another team's fix relies on?
   - Does a type change break consumers the author may not know about?
   - Did the author update ALL callers when changing a function signature?
   - Is there a sequential overwrite — Author A changes file, then Author B changes same file without knowing A's intent?

4. **Spawn parallel review agents** for commits >200 LOC or touching auth/payment/eval-engine. Limit to 3 agents in parallel.

---

## Phase 5 — Output Format

Write findings to `docs/reviews/CODE-REVIEW-YYYY-MM-DD.md`. If `pnpm daily-review` already populated an "Automated Health Check" section, append manual findings ABOVE it.

### Finding Classification

| Severity | Confidence | Examples |
|----------|-----------|----------|
| **Critical** | ≥90% | Auth bypass, XSS, CSRF hole, exposed secrets, SSR crash in production, data leakage |
| **High** | ≥80% | Silent data corruption, race conditions, broken reactivity, incorrect financial calculations, deployment-breaking behavior, dangerous refactor regression |
| **Medium** | ≥60% | Fragile patterns, missing cleanup, inconsistent UX, parity gaps, maintainability risks, missing loading states |
| **Low** | Any | Naming, style inconsistencies, future cleanup suggestions |

### Report Structure

```markdown
# Daily Code Review — YYYY-MM-DD

## Header
- Scope (commit range, authors, session IDs)
- Prior review reference
- Contrast audit link
- Commands executed (with pass/fail status)
- Blocked checks (commands that failed for unrelated reasons)

## Commits Reviewed
| SHA | Subject | Files | +/- |

## Standing Grep Rules — Full Sweep
| Rule | Tier | Result | Delta vs prior |

## Critical Findings
(confidence ≥90%, exploitability, affected scope, reproduction, impacted files)

## High-Priority Findings
(confidence ≥80%, root cause, impacted files, suggested fix)

## Medium Findings
(pattern description, affected files, recommendation)

## Low Findings / Observations

## Commit-Level Analysis
(detailed per-commit breakdown for non-trivial commits)

## Security Surface Summary
- New attack surface introduced
- Attack surface reduced
- Outstanding security debt

## Performance Impact Summary
- Bundle size delta
- New reactive effects count
- Network request changes

## Cross-Team Blast Radius Summary
- Shared modules changed (from Tier 9 registry)
- Breaking type/interface changes
- API response shape changes
- Number of downstream consumers affected
- Authors who need to re-test their flows

## Known-Safe Inventory Updates

### Rule A: Raw fetch() Inventory
(carry forward with additions/removals)

### Rule E: {@html} Exception Inventory
(carry forward with additions/removals)

### Rule C: window.location.reload() Inventory
(carry forward with additions/removals)

## Observations
- Good practices worth highlighting
- Architecture improvements noticed
- Risk reductions

## Top 5 Actions for Next Session
1. Security (most urgent)
2. Data integrity
3. SSR stability
4. Performance
5. Maintainability
```

Format file paths as markdown links: `[src/lib/foo.ts:42](src/lib/foo.ts:42)`.

---

## Reviewer Mindset

The reviewer must assume:

- Users upload malformed files
- Attackers manipulate payloads and headers
- SSR executes unexpected code paths
- Mobile devices are slow with limited memory
- Networks fail unpredictably mid-request
- Users refresh mid-flow and resume later
- Multiple applicants edit simultaneously
- APIs timeout and return partial data
- State becomes stale between tabs
- Deployments happen under live traffic
- Retries cause duplicate writes
- Production traffic exposes race conditions invisible locally
- Low-memory devices behave differently than dev machines
- Third-party services partially fail (200 status, error in body)

The reviewer thinks as:
- **Security engineer** — what can be exploited?
- **Performance engineer** — what blocks the event loop or wastes bandwidth?
- **SSR/runtime engineer** — what crashes on server but works in browser?
- **SvelteKit expert** — what violates framework contracts?
- **Product owner** — does the UX match intent?
- **QA engineer** — what edge case was missed?
- **Production incident responder** — what pages me at 2am?
- **Malicious attacker** — what's the cheapest attack vector?

The goal is NOT just passing CI. The goal is:
- Production survivability under adversarial conditions
- Correctness under concurrent stress
- Secure-by-default architecture
- Predictable user experience across devices
- Operational reliability with graceful degradation
- Prevention of silent business logic corruption
- Safe scaling from beta to production traffic
- Minimizing future debugging cost

---

## Quick Reference: All Rules by ID

| ID | Tier | Category | Detection | Auto? |
|----|------|----------|-----------|-------|
| A | T1 | CSRF | grep `await fetch(` | ✅ |
| E | T1 | XSS | grep `{@html` | ✅ |
| E2 | T1 | XSS | grep dynamic attrs | ✅ |
| F | T1 | Logging | grep `console.` in server | ✅ |
| G | T1 | Process | git log grep | ✅ |
| SEC-1 | T1 | Secrets | grep hardcoded creds | ✅ |
| SEC-2 | T1 | PII | grep logger + PII terms | ✅ |
| SEC-3 | T1 | Cookies | grep `cookies.set` | ✅ |
| SEC-4 | T1 | Injection | grep eval/exec | ✅ |
| SEC-5 | T1 | Env vars | grep VITE_/$env/public | ✅ |
| SEC-6 | T1 | Rate limit | grep POST without rateLimit | ✅ |
| SEC-7 | T1 | PII | grep localStorage/sessionStorage | ✅ |
| B | T2 | SSR | grep @capacitor imports | ✅ |
| C | T2 | State | grep reload() | ✅ |
| D | T2 | Capacitor | grep async proxy return | ✅ |
| I | T2 | SSR | grep typeof window | ✅ |
| J | T2 | SSR | grep module-scope fetch | ✅ |
| SSR-1 | T2 | Hydration | grep Math.random/Date.now in .svelte | ✅ |
| SSR-2 | T2 | Errors | grep .then without .catch | ✅ |
| H1 | T3 | Reactivity | pnpm check | ✅ |
| H2 | T3 | Reactivity | manual $effect review | ❌ |
| K | T3 | Logic | grep != in JSON-Logic | ✅ |
| L | T3 | Validation | pnpm test:unit | ✅ |
| M | T3 | Collision | grep combinedAnswers | ✅ |
| S | T3 | A11y | pnpm test:contrast | ✅ |
| CQ-1 | T3 | Errors | grep empty catch | ✅ |
| CQ-2 | T3 | Memory | grep setInterval/addEventListener | ✅ |
| CQ-3 | T3 | Cloning | grep JSON.parse(JSON.stringify) | ✅ |
| CQ-4 | T3 | Errors | grep +error.svelte coverage | ✅ |
| CQ-5 | T3 | Tech debt | grep TODO/FIXME/HACK count | ✅ |
| O | T4 | Snapshot | pnpm test:unit | ✅ |
| P | T4 | Parity | grep clearStaleOptionValues | ✅ |
| Q | T4 | Vercel | grep engines.node | ✅ |
| R | T4 | Mapping | grep toClientOption | ✅ |
| COND-1 | T4 | Upload | manual upload route review | ❌ |
| COND-2 | T4 | Finance | manual calc review | ❌ |
| COND-3 | T4 | Anti-scrape | grep 8 layers intact | ✅ |
| COND-4 | T4 | Vercel | pnpm build + size check | ✅ |
| PH-1 | T5 | Headers | grep security headers | ✅ |
| PH-2 | T5 | Auth | grep API routes without guards | ✅ |
| PH-3 | T5 | API | grep raw Response in API routes | ✅ |
| PH-4 | T5 | External | grep external fetch calls | ✅ |
| PH-5 | T5 | MongoDB | grep $where/$function | ✅ |
| PH-6 | T5 | Cache | grep Cache-Control | ✅ |
| PH-7 | T5 | Validation | grep parseJsonBody coverage | ✅ |
| PERF-1 | T6 | Bundle | grep import * / heavy packages | ✅ |
| PERF-2 | T6 | Reactive | grep $effect | ✅ |
| PERF-3 | T6 | Network | grep invalidateAll | ✅ |
| PERF-4 | T6 | CPU | grep JSON.parse in API routes | ✅ |
| OBS-1 | T6 | Logging | grep console in server | ✅ |
| OBS-2 | T6 | Errors | grep silent catch returns | ✅ |
| PERF-5 | T6 | Images | grep <img> lazy/alt/dimensions | ✅ |
| PERF-6 | T6 | Finance | grep division in ruleEngine | ✅ |
| BUILD-1 | T7 | Build | pnpm build | ✅ |
| BUILD-2 | T7 | Deps | pnpm audit | ✅ |
| BUILD-3 | T7 | Types | pnpm check | ✅ |
| BUILD-4 | T7 | Tests | pnpm test:unit | ✅ |
| UX-1 | T8 | Loading | grep async handlers | ✅ |
| UX-2 | T8 | Mobile | grep overflow/fixed/sticky | ✅ |
| UX-3 | T8 | Drafts | manual form review | ❌ |
| UX-4 | T8 | A11y | pnpm test:contrast + aria count | ✅ |
| BLAST-1 | T9 | Blast radius | git diff shared modules | ✅ |
| BLAST-2 | T9 | Types | git diff types/ + importer count | ✅ |
| BLAST-3 | T9 | API shape | git diff apiResponse + routes | ✅ |
| BLAST-4 | T9 | Auth | git diff guards + hooks | ✅ |
| BLAST-5 | T9 | Stores | git diff *.svelte.ts + consumers | ✅ |
| BLAST-6 | T9 | Routes | git diff routes.ts + usages | ✅ |
| BLAST-7 | T9 | Schema | git diff config/schema + parity | ✅ |
| BLAST-8 | T9 | Database | git diff database/ + consumers | ✅ |
| BLAST-9 | T9 | Multi-author | git log authors + cross-domain | ✅ |

**Total: 66 rules (62 automated, 4 manual)**

---

## Appendix A — Carry-Forward Inventories

These inventories track known-safe exceptions that should NOT be flagged on every review. Update when instances are added/removed.

### Rule A — Known-Safe Raw `fetch()` Calls
Maintain a table of approved raw `fetch()` (non-secureFetch) calls with justification:
- Pre-auth flows (login, signup, OTP) — no CSRF token available yet
- Public share-link reads — GET only, no mutation
- Auth service internal calls (token refresh) — CSRF not applicable
- Read-only public API calls — GET method only

### Rule E — Known `{@html}` Exceptions
See CLAUDE.md Pitfall #15 for the approved list. Any new exception requires security review.

### Rule C — Known `window.location.reload()` Sites
Tracked in `docs/reviews/2026-04-26-sweep.md` §Category 3. HIGH-priority sites are candidates for `invalidateAll()` migration.

### Rule SEC-4 — Known `exec()` Sites
- `src/routes/api/admin/testing/e2e-runs/+server.ts` — dev-only, admin-only, enum-validated
- `src/routes/api/test/run-vitest/+server.ts` — dev-only, regex-allowlisted

---

## Appendix B — Prior Review Comparison Protocol

For every rule result, compare against the most recent `CODE-REVIEW-*.md`:

| Delta | Action |
|-------|--------|
| **New violation** | Report as finding at appropriate severity |
| **Violation removed** | Note as progress in Observations |
| **Count increased** | Flag the specific new instances |
| **Count decreased** | Note as progress |
| **Unchanged** | Report as "Unchanged" in sweep table |
| **Previously flagged, still unfixed** | Mark as "carry-forward / unfixed (first flagged YYYY-MM-DD)" |

Carry-forward items that persist >7 days get escalated one severity level in the report.

---

## Appendix C — Pre-Commit Hook Recommendations

The following Tier 1-2 rules can be automated as `pre-commit` hooks to catch violations BEFORE they land. This is especially important in multi-team environments — catching a CSRF violation at commit time saves a full review cycle.

**Recommended hooks** (add to `.husky/pre-commit` or equivalent):

```bash
# Block typeof window SSR guard (Pitfall #9) — instant regression
grep -rn "typeof window !== 'undefined'" src/ && echo "ERROR: Use browser from \$app/environment" && exit 1

# Block module-scope fetch (Pitfall #4)
grep -rnE "^(let|const|export).* = (await )?fetch\(" src/ && echo "ERROR: No fetch at module scope" && exit 1

# Block JSON.parse(JSON.stringify()) in non-test files
grep -rn "JSON\.parse(JSON\.stringify" src/lib/ src/routes/ && echo "ERROR: Use structuredClone/securedClone" && exit 1

# Block eval/exec without review
grep -rnE "\beval\(|new Function\(" src/lib/ src/routes/ && echo "ERROR: eval/new Function not allowed" && exit 1

# Block bare console in server code
grep -rnE "console\.(log|error|warn)\(" src/lib/server/ src/routes/api/ | grep -v logger.ts | grep -v test && echo "ERROR: Use logger, not console" && exit 1
```

**Not recommended as pre-commit** (too slow or requires build):
- `pnpm check` (~30s) — run in CI instead
- `pnpm test:unit` (~20s) — run in CI
- `pnpm build` (~60s) — run in CI or pre-push

---

## Appendix D — Protocol Maintenance

This protocol is a living document. It must be maintained to stay useful.

### When to add a new rule

A new rule earns inclusion when ALL of these are true:
1. **It caught (or would have caught) a real bug** — not hypothetical
2. **It's recurring** — the same class of bug can happen again
3. **It has a concrete detection method** — grep pattern, bash command, or specific manual checklist
4. **It maps to this codebase** — not a generic best practice from a blog post

### When to retire a rule

Mark as `(retired YYYY-MM-DD — reason)` when:
- The rule has produced zero findings for 60+ consecutive days
- The underlying pattern was architecturally eliminated (e.g., all `typeof window` guards removed)
- A CI check now covers the same detection automatically

Never delete — mark retired. The history of what we watched for is valuable context.

### When to update the blast radius registry (Tier 9)

Update the shared module table when:
- A new file reaches >50 importers (check with `grep -rl "from.*<module>" src/ | wc -l`)
- A file on the registry is refactored/renamed
- A file on the registry is split into multiple files (add all fragments)

### Review protocol review (meta)

**Monthly:** The reviewer (or team lead) should spend 15 minutes on:
1. Which rules fired in the past month? Which never did?
2. Did any bug slip through that a new rule would have caught?
3. Are carry-forward items accumulating without resolution? (>5 items older than 14 days = process problem)
4. Is the review taking too long? (>90 min consistently = rules need pruning or automation)
5. Update the shared module registry importers count

### CI integration roadmap

Priority order for automating rules into CI (saves reviewer time):

| Priority | Rules | CI mechanism |
|----------|-------|-------------|
| **P0** | I, J, CQ-3, SEC-4 | Pre-commit hook (instant, blocks commit) |
| **P1** | A, E, F, SEC-1, SEC-5 | CI job on PR (grep-based, <30s) |
| **P2** | H1, L, BUILD-3, BUILD-4 | CI job on PR (pnpm check + test, ~2min) |
| **P3** | BUILD-1, BUILD-2 | CI job on PR (build + audit, ~3min) |
| **P4** | BLAST-1 through BLAST-9 | CI job that flags shared module changes for mandatory review |

Once a rule is in CI, the daily review only checks "did CI pass?" instead of running the grep manually. The rule stays in the protocol as documentation of what CI enforces.

---

## Appendix E — Known Limitations

This protocol catches pattern-level bugs through static analysis. It CANNOT catch:

| Limitation | What slips through | Mitigation |
|-----------|-------------------|------------|
| **Business logic errors** | Incorrect eligibility formula, wrong haircut percentage | Manual domain expert review + golden-path E2E tests |
| **Race conditions** | Concurrent form saves overwriting each other | Load testing, multi-tab manual testing |
| **Visual regressions** | CSS breaks, layout shifts, dark mode gaps | Screenshot diffing (Percy, Chromatic) or manual visual QA |
| **Accessibility beyond contrast** | Screen reader flow, focus trap behavior | Manual a11y testing with screen reader |
| **Mobile-specific issues** | Touch interactions, keyboard overlap, viewport bugs | Real device testing (not just responsive dev tools) |
| **Performance under load** | Memory leaks over time, GC pauses, connection pool exhaustion | Load testing (k6, Artillery) |
| **Third-party service behavior** | Razorpay webhook failures, MSG91 OTP delays | Integration testing against staging environments |
| **Data migration correctness** | Existing documents missing new required fields | Migration scripts + spot-check production data |

The protocol is one layer of defense. Pair it with:
- **E2E tests** for golden-path flows (Playwright)
- **Manual QA** for visual and interaction quality
- **Load testing** before major releases
- **Production monitoring** (error rates, latency, 5xx spikes) after deploy
- **Incident retrospectives** that feed new rules back into this protocol
