# DigitalDSA Code Audit Report — 2026-04-11

> **Input:** `docs/reviews/normalized-2026-04-11.json` (125 findings, 6 agents)
> **Process:** Clustered by pattern_key → deduplicated → severity-calibrated → prioritized

---

## 1. EXECUTIVE SUMMARY

The codebase is feature-rich and well-structured overall, but carries **5 exploitable security issues** that need immediate attention before production launch — most critically, predictable session tokens via `Math.random()` and an unvalidated role cookie. Performance is the second concern: hot authentication paths execute 2–4 sequential DB queries per request, and form rendering triggers expensive recomputation on every keystroke. The dominant systemic issue is **bare `console.*` calls** (14+ instances across auth, session, security monitoring, and income components) that bypass the structured logger, leaving production-critical failures invisible to monitoring.

---

## 2. FINDINGS TABLE

| # | Severity | Area | Scope | Issue | Fix |
|---|---|---|---|---|---|
| 1 | CRITICAL | Security | sessionService.ts | `Math.random()` session tokens | Replace with `crypto.randomUUID()` |
| 2 | HIGH | Security | hooks.server.ts | `activeRole` cookie unvalidated | Validate against `user.roles` after JWT decode |
| 3 | HIGH | Security | sanitize.ts | Regex-based HTML sanitizer | Remove; consolidate on DOMPurify `sanitizeHtml.ts` |
| 4 | HIGH | Security | 4 auth endpoints | Missing rate limiting (restore, check-email, detect-roles) | Add `rateLimit()` calls |
| 5 | HIGH | Security | admin/users/dsa | MongoDB regex injection (unescaped `$regex`) | Apply `escapeRegex()` like sibling endpoint |
| 6 | HIGH | Security | appliedApplication | Unvalidated MongoDB insert | Add Zod schema validation |
| 7 | HIGH | Security | validate-token | JWT in URL query parameter | Move to Authorization header or POST body |
| 8 | HIGH | Security | test endpoint | Command injection in dev test runner | Allowlist pattern characters |
| 9 | HIGH | Performance | hooks.server.ts (2 paths) | Sequential 2–4 findOne waterfall on every auth | `Promise.all` for independent lookups |
| 10 | HIGH | Performance | featureGate.ts | 2 uncached DB queries per feature check | In-memory TTL cache for SystemConfigs |
| 11 | HIGH | Performance | evaluationEngine.ts | Per-lender uncached DB queries | Batch query with `$in` + cache |
| 12 | HIGH | Performance | engineContext.ts (3 funcs) | 3-hop sequential RERA queries | Single aggregation or `$lookup` pipeline |
| 13 | HIGH | Performance | cases pages | Load ALL cases into memory, filter in JS | MongoDB `$skip`/`$limit` pagination |
| 14 | HIGH | Performance | wizardState.svelte.ts | Triple-nested loops on every keystroke | Memoize section completion per-page |
| 15 | HIGH | Performance | notifications/digest | N+1 sequential findOne per user | Batch with `$in` query |
| 16 | HIGH | Performance | +layout.svelte | Google Fonts render-blocking despite self-hosted WOFF2 | Remove external Google Fonts link |
| 17 | HIGH | Performance | 6 offer pages | No error state on API failure | Add error state with retry |
| 18 | HIGH | Code Quality | authService.ts | Auth errors via bare `console.error` | Replace with structured logger |
| 19 | HIGH | Code Quality | sessionService.ts | Session failures via bare `console.warn/error` | Replace with structured logger |
| 20 | HIGH | Code Quality | securityMonitor.ts | CRITICAL SECURITY ALERT via bare console | Replace with `logger.fatal()` |
| 21 | HIGH | Code Quality | homeLoanApi.ts | Submission errors via bare console | Replace with structured logger |
| 22 | HIGH | Code Quality | otpStore.ts | OTP index failure swallowed by console.error | Use logger; surface alert |
| 23 | HIGH | Code Quality | jwtService.ts | `crypto.randomUUID()` without fallback wrapper | Use `generateId()` from utils |
| 24 | HIGH | Code Quality | aiService.ts | `let parsed: any` in policy parsing (3x) | Define Zod schema for AI responses |
| 25 | HIGH | Duplication | 4 files | `isQuestionVisible` duplicated 4 times | Consolidate to single canonical export |
| 26 | HIGH | Duplication | 5 files | `resolveBindsTo` duplicated 5 times | Single canonical export |
| 27 | HIGH | Duplication | 3 files | `buildCombinedAnswers` duplicated 3 times | Keep only `combinedAnswersMemo.ts` |
| 28 | HIGH | Duplication | 4 routes | `createTransporter()` bypasses canonical `sendEmail()` | Route through `email.ts` |
| 29 | HIGH | Cross-Browser | Tiles.svelte, HeroSection.svelte | Dual touch+pointer events = double-fire on Android | Use pointer events only |
| 30 | WARNING | Security | 3 form pages | `{@html}` without DOMPurify sanitization | Wrap in `sanitizeHtml()` |
| 31 | WARNING | Security | hooks.server.ts | CSRF skipped in dev mode | Remove or scope bypass |
| 32 | WARNING | Security | delete-account | User name in email header unsanitized | Strip CRLF from name |
| 33 | WARNING | Security | 2 public endpoints | Missing rate limit (newsletter, share-link) | Add `rateLimit()` |
| 34 | WARNING | Security | securedClone.ts | Prototype pollution not applied at API boundary | Use `securedClone()` in `parseJsonBody` |
| 35 | WARNING | Security | CSP | `img-src https:` wildcard, incomplete nonce regex | Tighten CSP directives |
| 36 | WARNING | Performance | 5 files | Sequential I/O (uploads, emails, DB writes) | `Promise.all`/`Promise.allSettled` |
| 37 | WARNING | Performance | 7 files | Large monolithic components (1,100–3,100 lines) | Extract sub-components incrementally |
| 38 | WARNING | Performance | applicantFormManager | JSON-Logic showWhen evaluated on every keystroke | Debounce or memoize |
| 39 | WARNING | Performance | 4 admin pages | Unbounded `find({})` without limit | Add pagination |
| 40 | WARNING | SEO | 7 pages | Missing `<title>` and meta description | Add via `<Seo>` component |
| 41 | WARNING | SEO | 6 legal pages | Missing OG/Twitter Card meta | Add OG tags |
| 42 | WARNING | SEO | 3 pages | Missing canonical URL | Add `<link rel="canonical">` |
| 43 | WARNING | SEO | robots.txt | Sitemap.xml referenced but doesn't exist | Generate sitemap or remove reference |
| 44 | WARNING | SEO | layout + child pages | Duplicate `<title>` tags from layout + page | Remove generic layout title |
| 45 | WARNING | SEO | loan-offers | Wrong title "Personal Loan Offers" on generic route | Fix to "Loan Offers" |
| 46 | WARNING | UX | 6 offer pages | Spinners without `role="status"` or `aria-label` | Add ARIA attributes |
| 47 | WARNING | UX | 6 offer pages | Spinner without skeleton screen = CLS | Add skeleton cards |
| 48 | WARNING | UX | 3 buttons | Touch targets below 44px minimum | Increase to 44px |
| 49 | WARNING | UX | HeroSection | Hero image missing width/height attributes | Add dimensions |
| 50 | WARNING | UX | FloatingNav | `role="menubar"` on nav links (incorrect ARIA) | Use `role="navigation"` |
| 51 | WARNING | UX | dashboard layout | Delete modal is div, not `<dialog>` — no focus trap | Use `<dialog>` element |
| 52 | WARNING | UX | 3 pages | Broken heading hierarchy (no h1) | Add h1 elements |
| 53 | WARNING | UX | HeroSection | Checklist uses `<div>` instead of `<ul>/<li>` | Use semantic list |
| 54 | WARNING | Cross-Browser | 5 components | `backdrop-filter` without `-webkit-` prefix | Add vendor prefix |
| 55 | WARNING | Cross-Browser | login page | `100vh` without `dvh` fallback for iOS Safari | Add `100dvh` fallback |
| 56 | WARNING | Cross-Browser | 2 components | `color-mix()` without `@supports` fallback | Add fallback color |
| 57 | WARNING | Cross-Browser | 2 components | `:has()` selector without fallback for Firefox <121 | Add `@supports` guard |
| 58 | WARNING | Cross-Browser | 2 components | `scroll-behavior: smooth` without reduced-motion guard | Add `prefers-reduced-motion` |
| 59 | WARNING | Cross-Browser | MessageComposer | `navigator.clipboard` without null-check | Guard with feature detection |
| 60 | WARNING | Cross-Browser | app.html | Viewport missing `maximum-scale` for iOS zoom | Add to meta viewport |
| 61 | WARNING | Code Quality | 7 components | Bare console.log/warn/error in production | Replace with logger |
| 62 | WARNING | Code Quality | 13+ files | `any` type / `as any` casts in core modules | Add proper types incrementally |
| 63 | WARNING | Code Quality | 2 components | Legacy `writable` store in Svelte 5 code | Migrate to `$state` |
| 64 | WARNING | Duplication | 9 files | Entirely commented-out or dead files | Archive per convention |
| 65 | WARNING | Duplication | 10+ modules | Dead exports / never-imported modules | Archive to `_archive/` |
| 66 | WARNING | Duplication | 2 files | Filename typos (`checkGibrrish`, `visibilty`, `topUpDetailst`) | Rename with import updates |
| 67 | WARNING | Duplication | emailUtils.ts | `sanitize.ts` regex-based sanitizer still exists | Remove; use DOMPurify version |
| 68 | WARNING | Dependencies | csrf.ts + csrfClient.ts | Two CSRF client implementations | Unify to single module |
| 69 | WARNING | Dependencies | featureFlags + featureGate | Two separate feature gate systems | Consolidate |
| 70 | WARNING | Dependencies | 4 packages | Unused dependencies (pino, capacitor-secure-storage, etc.) | Remove from package.json |
| 71 | WARNING | Dependencies | 30+ config files | Relative imports instead of `$lib` alias | Convert to `$lib/` paths |
| 72 | WARNING | Dependencies | cleanPayloadStore | Deprecated bridge still imported by 6 routes | Complete migration |

---

## 3. DETAILED FINDINGS

---

### [CRITICAL] Math.random() Session Token Generation

**Scope:** `src/lib/services/sessionService.ts:49`

**Problem:**
Fallback session tokens and refresh tokens use `Math.random()` — not cryptographically secure. Combined with `Date.now()`, an attacker who observes timing can predict tokens.

**Impact:**
Session fixation attacks; an attacker who knows the approximate creation time can brute-force the 9-character base36 suffix (~4.7 billion possibilities, feasible at scale).

**Fix:**
Replace with `crypto.randomUUID()` or the existing `generateId()` wrapper with crypto fallback.

**Affected:** 1 file, 2 token generations (server + refresh).

---

### [HIGH] Unvalidated activeRole Cookie → Privilege Escalation

**Scope:** `src/hooks.server.ts:352`

**Problem:**
`activeRole` cookie is read directly without validating against the user's actual `roles` object from the database. The cookie is not httpOnly. Any authenticated user can set `activeRole=admin` in browser DevTools.

**Impact:**
Routes that trust `locals.role` without re-checking `locals.user.roles[role] === true` are bypassed. A DSA could access admin endpoints.

**Fix:**
After reading the cookie, validate: `if (!user.roles?.[activeRoleCookie]) { activeRole = defaultRole; }`. Also set `httpOnly: true` on the cookie.

**Affected:** 1 file, but every route relying on `locals.role` is downstream.

---

### [HIGH] Bare console.* in Critical Services (SYSTEMIC — 14+ instances)

**Scope:** authService.ts, sessionService.ts, securityMonitor.ts, homeLoanApi.ts, otpStore.ts, 5 income components, form engine

**Problem:**
Project mandates `logger` (Pino) for all logging. But 14+ files in security-critical paths (auth, sessions, security alerts, OTP) use bare `console.error/warn/log` — invisible to production log pipeline.

**Impact:**
Auth failures, session issues, CRITICAL SECURITY ALERTs, and OTP index failures all vanish from production monitoring. Security incidents go undetected.

**Fix:**
Bulk find-and-replace: import `logger` and replace `console.*` calls. For client-side services, create a lightweight `clientLogger` that POSTs critical events to a server endpoint.

**Affected:** 14+ files across server and client.

---

### [HIGH] Duplicate Core Logic (isQuestionVisible x4, resolveBindsTo x5, buildCombinedAnswers x3)

**Scope:** `formUtils.ts`, `firstPage/visibilty.ts`, `homeLoan/visibility.ts`, `server/formEngine/visibility.ts`, `homeLoan/schema.ts`, `firstPage/schema.ts`, `combinedAnswersMemo.ts`

**Problem:**
Three fundamental form-engine functions exist in 4–5 independent copies. A bug fix in one is missed in the others. This has already caused divergent behavior.

**Impact:**
Visibility evaluation, bindsTo resolution, and combined answers computation may silently produce different results depending on which copy is called.

**Fix:**
Keep the canonical version in `formWizardEngine.ts` or a shared `formHelpers.ts`. Replace all imports to point to the single source. Delete the others.

**Affected:** 12 files across 3 function families.

---

### [HIGH] Sequential Auth DB Waterfall on Every Request

**Scope:** `src/hooks.server.ts:57` and `src/hooks.server.ts:207`

**Problem:**
Two code paths in the auth hook perform sequential `findOne` across 4 collections (Applicant → DsaApplications → RmApplications → Admin) to resolve user identity. Each query waits for the previous to fail before trying the next.

**Impact:**
Every authenticated request pays 2–4 sequential DB round-trips at the hook level before any route handler executes. At 5ms per query, that's 10–20ms of pure latency on every page load.

**Fix:**
Use `Promise.all` to query all 4 collections in parallel, then pick the first non-null result. Alternatively, store `userType` in the JWT claims to skip the waterfall entirely.

**Affected:** 2 code paths in hooks.server.ts; affects every authenticated request.

---

### [HIGH] Missing Rate Limiting on Auth Enumeration Endpoints

**Scope:** `restore-account`, `check-email`, `detect-roles` (3 auth endpoints)

**Problem:**
These endpoints accept any mobile number or email and return differentiated responses revealing account existence. No `rateLimit()` call on any of them.

**Impact:**
Attacker can enumerate all registered DSA mobile numbers and emails at scale, enabling targeted phishing and credential stuffing.

**Fix:**
Add `rateLimit()` from `$lib/server/rateLimiter` with aggressive limits (e.g., 10/min per IP). Normalize response format to avoid enumeration.

**Affected:** 3 endpoint files.

---

### [HIGH] Dual Touch + Pointer Events = Double-Fire on Android

**Scope:** `src/lib/components/mobile/Tiles.svelte`, `src/lib/components/mobile/HeroSection.svelte`

**Problem:**
Both `ontouchstart/move/end` AND `onpointerdown/move/up` are registered on the same elements. On Android Chrome, both fire for finger touches.

**Impact:**
Tile swipe and carousel swipe fire twice per gesture — jittery movement, double-skips.

**Fix:**
Use pointer events only (supported by all modern browsers). Remove touch event handlers.

**Affected:** 2 mobile components.

---

### [HIGH] Google Fonts Render-Blocking Link Despite Self-Hosted WOFF2

**Scope:** `src/routes/+layout.svelte:103`

**Problem:**
A `<link>` to Google Fonts CDN loads Inter font on every page, despite self-hosted WOFF2 files already existing (converted in S71). This adds DNS lookup + connection latency.

**Impact:**
Render-blocking resource on every first load. GDPR concern for EU users (Google receives visitor IPs).

**Fix:**
Remove the Google Fonts `<link>` tag. The self-hosted WOFF2 `@font-face` declarations already handle font loading.

**Affected:** 1 file; impacts every page load.

---

### [HIGH] Uncached System Config + Feature Gate Queries

**Scope:** `src/lib/server/featureGate.ts:33`, `src/lib/server/formEngine/engineContext.ts`

**Problem:**
`isFeatureEnabled()` runs 2 sequential DB queries (SystemConfigs + DsaApplications) on every invocation. System configs are static data that never changes during runtime. RERA builder lookups require 3-hop query chains with no caching.

**Impact:**
Feature checks on every case page load add unnecessary latency. Builder dropdown renders pay 3–4 sequential round-trips.

**Fix:**
Add in-memory TTL cache for SystemConfigs (5-minute TTL). For RERA queries, use a single `$lookup` aggregation pipeline or cache results by district.

**Affected:** 2 server modules, 3 functions.

---

### [HIGH] Unbounded Case Queries — All Cases Loaded Into Memory

**Scope:** `src/routes/dashboard/dsa/cases/+page.server.ts:185`, `src/routes/dashboard/dsa/+page.server.ts:281`

**Problem:**
Cases page loads ALL non-archived cases from MongoDB into Node.js memory, then filters and paginates in JavaScript. Dashboard stats page does the same for stat computation.

**Impact:**
A DSA with 500 cases transfers all 500 documents on every page load. Memory and latency scale linearly with case count.

**Fix:**
Use MongoDB `$skip`/`$limit` for pagination. Use `$group`/`$sum` aggregation for dashboard stats instead of in-memory loops.

**Affected:** 2 page server files.

---

### [HIGH] No Error State on Offer Pages

**Scope:** 6 offer pages (home, business, personal, plot, LAP, professional)

**Problem:**
Offer pages only have loading and empty states. If the API call fails, users see the empty state ("No offers found") instead of an error message with a retry option.

**Impact:**
API failures are indistinguishable from "no offers available" — users have no recovery path and may abandon the app.

**Fix:**
Add an `error` state variable. Catch fetch errors and render an error card with a "Try Again" button.

**Affected:** 6 offer page components.

---

### [HIGH] Email Bypass — 4 Routes Skip Canonical sendEmail()

**Scope:** `src/lib/server/emailUtils.ts` → 4 API routes

**Problem:**
Four routes (admin/inactive-report, auth/delete-account, cases/share-with-rm, rm/threads/messages) create their own Nodemailer transporter via `createTransporter()` instead of using the canonical `sendEmail()` from `email.ts`.

**Impact:**
These routes bypass error handling, retry logic, bounce tracking, and structured logging that `sendEmail()` provides.

**Fix:**
Refactor the 4 routes to use `sendEmail()`. Then deprecate/remove `emailUtils.ts`.

**Affected:** 4 route files + 1 utility file.

---

## 4. PRIORITY ACTION PLAN

### Fix Immediately (before any production exposure)

1. **SEC-009:** Replace `Math.random()` session tokens with `crypto.randomUUID()`
2. **SEC-016:** Validate `activeRole` cookie against `user.roles`; set `httpOnly`
3. **SEC-005/006/018:** Add rate limiting to 3 auth enumeration endpoints
4. **SEC-002/025:** Apply `escapeRegex()` to admin DSA search query
5. **SEC-004:** Add Zod validation to `appliedApplication` insert
6. **SEC-013:** Delete regex-based `sanitizeHtml` in `sanitize.ts` (DOMPurify version is canonical)

### This Sprint

7. **PERF-005/006:** Parallelize auth hook DB waterfall
8. **PERF-007:** Cache SystemConfigs in featureGate.ts
9. **PERF-014/015:** Add MongoDB `$skip`/`$limit` to cases queries
10. **UX-016:** Remove Google Fonts render-blocking link
11. **CQ-008/009/010/011/039:** Replace bare console in auth/session/security services
12. **XBROW-015/016:** Fix dual touch+pointer events on mobile components
13. **DUP-003/004/005/006/007:** Consolidate `isQuestionVisible`, `resolveBindsTo`, `buildCombinedAnswers`
14. **DUP-021:** Route all email sending through canonical `sendEmail()`
15. **XBROW-001–005:** Add `-webkit-backdrop-filter` prefix (5 components)
16. **CQ-029:** Use `generateId()` wrapper in jwtService.ts

### Backlog

17. SEO fixes: titles, OG tags, canonical URLs, sitemap generation
18. UX fixes: ARIA labels, skeleton screens, heading hierarchy, touch targets
19. Cross-browser: `dvh` fallback, `color-mix` fallbacks, reduced-motion guards
20. Dead code cleanup: archive ~15 commented-out/dead files
21. `any` type cleanup: continue incremental typing (13+ files)
22. Dependency cleanup: remove unused packages (pino, capacitor-secure-storage, cross-env, express)
23. Component splitting: break up 3,000+ line form components (long-term)

---

## 5. SYSTEMIC PATTERNS

| Pattern | Count | Root Cause |
|---|---|---|
| **Bare `console.*` in production** | 14+ files | No client-side logger; server rule not enforced in services |
| **`any` / `as any` casts** | 20+ instances | Missing collection/interface types for MongoDB + form state |
| **Missing rate limiting** | 5 endpoints | No middleware-level default; each route must opt-in |
| **Sequential DB queries** | 8 patterns | No `Promise.all` convention; waterfall is the default |
| **Dead/commented-out files** | 15+ files | Archive convention exists but not enforced |
| **Duplicate core functions** | 3 families, 12 copies | Grew organically across loan types; never consolidated |
| **Missing `-webkit-` prefix** | 7 CSS properties | No PostCSS autoprefixer in build pipeline |
| **Missing ARIA attributes** | 10+ components | No a11y linting rule; component templates lack roles |

---

## 6. POSITIVE SIGNALS

- **Immutable snapshot architecture** with SHA-256 versioning is exceptionally well-implemented
- **Rate limiting already exists** on 6 endpoints (S70) — the infrastructure is there, just not universally applied
- **DOMPurify adoption** is already the primary sanitizer — only the legacy regex version needs removal
- **WOFF2 self-hosting** (S71) is done correctly; just needs the old Google Fonts link removed
- **9,700+ tests** across 87 files demonstrate strong testing discipline
- **`securedClone`** with prototype pollution defense exists — just needs wiring at API boundaries
- **Classification system overhaul** (S72) shows clean reactive architecture with proper `$derived` chains
- **Anti-scraping** (8 layers) is comprehensive and production-grade
