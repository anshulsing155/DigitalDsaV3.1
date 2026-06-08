# DigitalDSA V3 — Code Audit Report
**Date:** 2026-04-09 | **Findings:** 168 raw → 38 deduplicated clusters | **Agents:** Security, Performance, Code Quality, UX/A11y, SEO, Dependencies, Cross-Browser

---

## 1. EXECUTIVE SUMMARY

The codebase has strong architectural foundations — immutable snapshots, server-side business logic, a sophisticated rule engine with 9,465+ passing tests — but carries **critical security debt** that must be resolved before any production deployment. The single most dangerous issue is **9 production credentials committed to git history** (MongoDB, JWT, Razorpay, SMTP, CSRF, ImageKit, encryption keys), giving anyone with repo access full system control. The second systemic risk is **MongoDB injection via unsanitized user input** across 4+ API routes. The third major pattern is **unbounded MongoDB queries** loading entire collections into memory on dashboard pages, which will degrade linearly as data grows.

---

## 2. FINDINGS TABLE

| # | Severity | Area | Scope | Issue | Fix |
|---|----------|------|-------|-------|-----|
| 1 | CRITICAL | Security | .env (9 keys) | All production credentials committed to git | Rotate ALL credentials, purge git history |
| 2 | HIGH | Security | 4 API routes | MongoDB regex injection via unsanitized search input | Add `escapeRegex()` utility, apply to all search params |
| 3 | HIGH | Security | walkthrough, appliedApplication | MongoDB operator injection via user-controlled field paths | Whitelist allowed field names; validate with Zod |
| 4 | HIGH | Security | appliedApplication | Unsanitized data inserted directly into MongoDB | Add Zod schema validation + field whitelist |
| 5 | HIGH | Security | update-coins | Client-controlled coin balance — user sets arbitrary values | Server-side coin arithmetic only |
| 6 | HIGH | Security | emailSend.ts | XSS via unsanitized userName in HTML email template | HTML-escape all interpolated values in email templates |
| 7 | HIGH | Security | sanitizeHtml.ts | Regex-based HTML sanitizer is bypassable | Replace with DOMPurify or a proper DOM-based sanitizer |
| 8 | HIGH | Security | hooks.server.ts | CSRF bypass for create-rm and restore-account endpoints | Add CSRF validation to all state-changing public endpoints |
| 9 | HIGH | Security | set-role | Missing auth guard — unauthenticated users can set role cookie | Add `requireAuthApi()` guard |
| 10 | HIGH | Performance | 5 dashboard pages | Unbounded MongoDB queries load ALL cases without limit | Add server-side pagination with `.limit()` and `.skip()` |
| 11 | HIGH | Performance | evaluationEngine.ts | `enrichPayload()` called N times (once per lender) instead of once | Hoist enrichment outside per-lender loop |
| 12 | HIGH | Performance | evaluationEngine.ts | N+1 query: policy resolution queries DB per-lender in a loop | Batch all lender_ids into single query |
| 13 | HIGH | Performance | payloadEnricher.ts | Shared state mutation contaminates cross-lender evaluations | Deep clone payload before per-lender mutation |
| 14 | HIGH | Performance | 2 components | Memory leaks: setInterval and MediaQueryList listener not cleaned up | Add cleanup in `onDestroy` / `$effect` return |
| 15 | HIGH | Code Quality | emailService.ts | Math.random() used for OTP generation — predictable | Use `crypto.randomInt()` |
| 16 | HIGH | Code Quality | authService.ts | `|| true` always evaluates to true (should be `?? true`) | Replace `||` with `??` |
| 17 | HIGH | Code Quality | 3+ API routes | Request body accepted as `Record<string, any>` — no validation | Add Zod schemas for all API input |
| 18 | HIGH | Cross-Browser | 7 modal components | `crypto.randomUUID()` crashes in non-HTTPS / older Android WebView | Add fallback: `crypto.randomUUID?.() \|\| uuid()` |
| 19 | HIGH | SEO | +layout.svelte | Razorpay checkout.js loaded synchronously on every page | Add `async` or `defer`; lazy-load on payment pages only |
| 20 | WARNING | Security | 10+ endpoints | Missing rate limiting on authenticated endpoints | Add `rateLimit()` calls to upload, search, and evaluation endpoints |
| 21 | WARNING | Security | rateLimiter.ts | In-memory rate limit map grows unbounded — no TTL cleanup | Add periodic cleanup of expired windows |
| 22 | WARNING | Performance | 5 server loaders | Sequential DB query waterfalls (4-12 round trips) | Parallelize independent queries with `Promise.all()` |
| 23 | WARNING | Performance | 4+ queries | Missing MongoDB projections — full documents fetched for partial use | Add projections to exclude unused nested data |
| 24 | WARNING | Performance | DirectorFormModal | `JSON.parse(JSON.stringify())` used for cloning | Replace with `structuredClone()` or `$state.snapshot()` |
| 25 | WARNING | Code Quality | 30+ files | Pervasive `as any` / `: any` usage (~100+ instances) | Add proper TypeScript interfaces; prioritize core orchestrator files |
| 26 | WARNING | Code Quality | 20+ files | Bare `console.log/error/warn` instead of Pino logger | Replace with `logger` from `$lib/server/logger` (server) or gated console (client) |
| 27 | WARNING | Code Quality | 4 files | `resolveDynamicText` implemented 4 times | Consolidate to single canonical implementation |
| 28 | WARNING | Code Quality | 3 modules | Triple email implementation (emailSend.ts, email.ts, emailService.ts) | Consolidate to one module with clear API |
| 29 | WARNING | Duplication | 7+ files | Duplicate implementations (sanitizeHtml, signature builders, scroll, visibility) | Consolidate each to single source of truth |
| 30 | WARNING | UX/A11y | 15+ components | Suppressed a11y warnings for click events without keyboard handlers | Add `on:keydown` handlers for Enter/Space |
| 31 | WARNING | UX/A11y | 5+ form components | Missing `aria-required`, `aria-labelledby`, `role="radiogroup"` | Add proper ARIA attributes to form components |
| 32 | WARNING | UX/A11y | +layout.svelte | Auth/form init delayed by arbitrary 100ms setTimeout | Remove setTimeout; use proper async initialization |
| 33 | WARNING | Cross-Browser | 10+ files | `localStorage`/`sessionStorage` accessed without try/catch | Wrap all storage access in try/catch |
| 34 | WARNING | SEO | robots.txt | Allows crawling everything including /dashboard and /api routes | Add Disallow rules for /dashboard/, /api/, /(auth)/ |
| 35 | WARNING | SEO | landing + legal pages | Missing canonical URLs across all pages | Add canonical to Seo.svelte component |
| 36 | WARNING | Dependencies | package.json | `csrf` package deprecated; adapter-auto has wrong runtime option | Migrate to csrf-csrf; fix adapter config |
| 37 | WARNING | Dependencies | app.css | Fonts served as TTF only (2-3x larger than WOFF2) | Convert to WOFF2 format |
| 38 | INFO | Various | 15+ files | Dead modules, commented-out code, unused exports (~1,500 lines) | Archive or delete dead files |

---

## 3. DETAILED FINDINGS

─────────────────────────────────────
### [CRITICAL] #1 — Production Credentials in Git History
**Scope:** `.env` — 9 secrets (SEC-001 through SEC-009)

**Problem:**
All production credentials — MongoDB URI, JWT secrets, Razorpay live keys, MSG91 OTP keys, SMTP password, encryption/HMAC keys, CSRF secret, ImageKit private key, Google AI key — are committed to the repository. The `.env` file was committed 19 times per CLAUDE.md.

**Impact:**
Anyone with repo access (current or former collaborators, compromised accounts, repo leak) gains: full database read/write, JWT token forgery (impersonate any user including admin), payment system access, OTP bypass, email spoofing, file CDN control, and decryption of all encrypted API keys.

**Fix:**
1. Rotate ALL 9 credential sets immediately before any production launch
2. Use `git filter-repo` or BFG to purge `.env` from all git history
3. Move to environment variable injection (Vercel env, `.env.local` in `.gitignore`)

**Affected:** 9 credentials across 1 file, 19 historical commits

─────────────────────────────────────
### [HIGH] #2 — MongoDB Injection (Regex + Operator)
**Scope:** 6 API routes (SEC-010 to SEC-013, SEC-025, SEC-019, CQ-039/040)

**Problem:**
User-supplied search strings are passed directly into MongoDB `$regex` operators without escaping special regex characters. Separately, user-controlled strings are used as MongoDB field paths in `$set` operations, allowing writes to arbitrary document fields.

**Impact:**
- **ReDoS:** Crafted regex patterns can hang MongoDB queries for seconds
- **Blind extraction:** Regex-based queries can extract data character-by-character
- **Field injection:** Dot-notation in walkthrough endpoint allows overwriting any field in user documents

**Fix:**
Create `escapeRegex(str)` utility (replace `[-[\]{}()*+?.,\\^$|#\s]` with `\\$&`). Apply to all 4 search endpoints. For walkthrough, whitelist valid `page_tour_completed` values against an enum.

**Affected:** `cases/+server.ts`, `rm-contacts/+server.ts`, `admin/users/dsa/+server.ts`, `rm/search-dsas/+server.ts`, `walkthrough/+server.ts`, `appliedApplication/+server.ts`

─────────────────────────────────────
### [HIGH] #3 — Client-Controlled Server State
**Scope:** `update-coins/+server.ts` (SEC-015)

**Problem:**
The coin update endpoint accepts `usedCoins` and `availableCoins` directly from the client and writes them to the database. Users can set their balance to any value.

**Impact:**
If coins gate premium features (assessments, reports), any user can bypass the payment system entirely.

**Fix:**
Server-side only: `$inc: { usedCoins: 1 }, $set: { availableCoins: computed_from_purchase_history }`. Never accept absolute coin values from client.

─────────────────────────────────────
### [HIGH] #4 — XSS in Email Templates + Bypassable HTML Sanitizer
**Scope:** `emailSend.ts` (SEC-021), `sanitizeHtml.ts` (SEC-041/042)

**Problem:**
User-supplied `userName` is interpolated directly into HTML email templates without escaping. Separately, the HTML sanitizer uses regex-based tag stripping, which is fundamentally bypassable (nested tags, encoding tricks, event handlers in allowed attributes).

**Impact:**
Stored XSS in emails. If `sanitizeHtml` output is used in `{@html}` Svelte bindings (it is, per RadioField), crafted payloads bypass filtering.

**Fix:**
1. HTML-escape all user values in email templates (`&`, `<`, `>`, `"`, `'`)
2. Replace regex sanitizer with DOMPurify (server: via jsdom, client: native)
3. Audit all `{@html}` usages — 9 components import sanitizeHtml

─────────────────────────────────────
### [HIGH] #5 — Unbounded Dashboard Queries
**Scope:** 5 dashboard pages (PERF-001, 005, 006, 007, 041)

**Problem:**
DSA and RM dashboards load ALL cases with `Cases.find({...}).toArray()` — no `.limit()`, no server-side pagination. Full `lender_applications` arrays (containing document checklists, queries, file snapshots) are included in projections.

**Impact:**
A DSA with 100+ cases loads all of them on every dashboard visit. Response size and memory usage grow linearly with case count, eventually causing timeouts.

**Fix:**
1. Add server-side pagination: `.limit(20).skip(page * 20)` with total count
2. Slim projections: exclude `lender_applications.document_checklist`, `queries`, `file_snapshots`
3. CRM pipeline: use MongoDB aggregation instead of JS-side grouping

─────────────────────────────────────
### [HIGH] #6 — Rule Engine: Redundant Enrichment + N+1 + Mutation
**Scope:** `evaluationEngine.ts`, `payloadEnricher.ts` (PERF-019, 021, 023)

**Problem:**
Three compounding issues in the hot evaluation path:
1. `enrichPayload()` runs once per lender (7x redundantly) instead of once per batch
2. `resolvePoliciesForLender()` makes one DB query per lender (N+1 pattern)
3. `payloadEnricher.ts` mutates shared obligation objects in-place — lender A's mutations contaminate lender B's evaluation

**Impact:**
Combined: ~7x redundant computation + 7 unnecessary DB round trips + correctness bugs from shared state mutation.

**Fix:**
1. Hoist `enrichPayload()` call above the `filteredDocs.map()` loop
2. Batch policy resolution: `resolvePoliciesForLenders([...allLenderIds])` in single query
3. Deep clone enriched payload before passing to each `evaluateLender()` call

─────────────────────────────────────
### [HIGH] #7 — crypto.randomUUID() Without Fallback
**Scope:** 7 modal components (CB-001 to CB-007)

**Problem:**
`crypto.randomUUID()` is called in client-side components. This API requires a secure context (HTTPS) and is not available in Android WebView < 105 or any HTTP deployment.

**Impact:**
All modals crash on HTTP localhost development, Android WebView on older devices (your Capacitor target), and any non-HTTPS staging environment.

**Fix:**
Create a `generateId()` utility:
```ts
const generateId = () => crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
```
Replace all 7 call sites.

─────────────────────────────────────
### [HIGH] #8 — Weak Random for Security-Sensitive Operations
**Scope:** 5 files (CQ-001, CQ-008, CQ-032, CQ-055, CQ-056)

**Problem:**
`Math.random()` used for OTP generation, session tokens, applicant IDs, and security event IDs. `Math.random()` is not cryptographically secure — output is predictable.

**Impact:**
OTPs can be predicted. Security event IDs are guessable. Session fallback tokens can be forged.

**Fix:**
- OTP: `crypto.randomInt(100000, 999999)` (Node.js native)
- IDs: `crypto.randomUUID()` (server-side, always available)
- Tokens: `crypto.randomBytes(32).toString('hex')`

─────────────────────────────────────
### [WARNING] #9 — Pervasive TypeScript `any` Usage (SYSTEMIC)
**Scope:** 30+ files, 100+ instances (CQ-005 through CQ-063)

**Problem:**
Core modules use `as any` casts and `: any` parameter types extensively. The applicant form manager alone has 45+ `as any` casts. Rule engine enrichment, PDF generation, file configurator, and validation functions all operate without type safety.

**Impact:**
Type errors in the core business logic pipeline (form → enrichment → evaluation → PDF) are invisible at compile time. Bugs surface only at runtime, in production.

**Fix:**
Prioritize by business impact:
1. `payloadEnricher.ts` — define `EnrichedPayload` type
2. `applicantFormManager.svelte.ts` — define `ApplicantData` interface
3. `fileConfigurator.ts` — define `FileConfig` and `SectionData` types
4. Form validation files — use proper `RawSchemaQuestion` types

─────────────────────────────────────
### [WARNING] #10 — A11y Suppressions Across 15+ Components (SYSTEMIC)
**Scope:** Modal, ApplicantModal, CommandPalette, EmailOtpModal, NumberField, LocationGroup, + 10 more (UX-004 through UX-048)

**Problem:**
Svelte a11y warnings are suppressed with `svelte-ignore` directives instead of being fixed. The most common: click events without keyboard equivalents, missing `aria-labelledby`/`aria-required`, missing `role="radiogroup"`.

**Impact:**
Keyboard-only users and screen reader users cannot operate modals, select fields, radio groups, or navigation. This affects ~20% of Indian internet users who rely on assistive technology.

**Fix:**
1. Add `on:keydown` for Enter/Space on all interactive elements with suppressed click warnings
2. Add `aria-labelledby` to all `<dialog>` elements pointing to their title
3. Add `aria-required` to InputField, RadioField, SelectField, MultipleSelectField, CheckboxField
4. Wrap radio options in `<div role="radiogroup" aria-labelledby={labelId}>`

─────────────────────────────────────
### [WARNING] #11 — localStorage Without Try/Catch (SYSTEMIC)
**Scope:** 10+ files, 15+ call sites (CB-009 through CB-025)

**Problem:**
`localStorage` and `sessionStorage` are accessed without try/catch. Safari private browsing (pre-iOS 14), full storage quota, and corporate browser policies all cause these calls to throw.

**Impact:**
Dashboard initialization, theme loading, form persistence, and loan offer storage all crash instead of gracefully degrading.

**Fix:**
Create `safeStorage` utility:
```ts
export const safeStorage = {
  get: (key: string) => { try { return localStorage.getItem(key); } catch { return null; } },
  set: (key: string, val: string) => { try { localStorage.setItem(key, val); } catch {} },
  remove: (key: string) => { try { localStorage.removeItem(key); } catch {} }
};
```

---

## 4. PRIORITY ACTION PLAN

### Fix Immediately (Before Production)
1. **Rotate all 9 credential sets** — MongoDB, JWT, Razorpay, MSG91, SMTP, encryption, CSRF, ImageKit, AI key
2. **Purge `.env` from git history** — BFG or git filter-repo
3. **Add `escapeRegex()` to 4 search endpoints** — prevents ReDoS
4. **Fix coin update endpoint** — server-side arithmetic only
5. **Replace `Math.random()` in OTP generation** — use `crypto.randomInt()`
6. **Fix `|| true` logic bug** in authService.ts — change to `?? true`
7. **HTML-escape email template interpolations** — prevents XSS

### This Sprint
8. Add MongoDB `.limit()` to all 5 unbounded dashboard queries
9. Fix rule engine: hoist enrichment, batch policy queries, clone before mutation
10. Add `crypto.randomUUID()` fallback for 7 modal components
11. Add rate limiting to upload, search, and evaluation endpoints
12. Replace regex HTML sanitizer with DOMPurify
13. Add CSRF validation to create-rm and restore-account endpoints
14. Add auth guard to set-role endpoint
15. Wrap all localStorage/sessionStorage access in try/catch
16. Add `async`/`defer` to Razorpay script; lazy-load on payment pages
17. Fix robots.txt — disallow /dashboard/, /api/, /(auth)/

### Backlog
18. Parallelize sequential DB query waterfalls (5 server loaders)
19. Add MongoDB projections to exclude unused nested data
20. Consolidate duplicate implementations (resolveDynamicText, email modules, sanitizeHtml, visibility)
21. Clean up dead code (~1,500 lines across 15+ files)
22. Add proper TypeScript types to replace `any` usage (prioritize by business impact)
23. Fix a11y suppressions — add keyboard handlers and ARIA attributes
24. Add page titles to all dashboard/onboarding pages
25. Add canonical URLs via Seo.svelte
26. Convert fonts from TTF to WOFF2
27. Replace `JSON.parse(JSON.stringify())` with `structuredClone()`
28. Replace bare `console` calls with Pino logger (server) or gated console (client)
29. Move @types/* and @capacitor/cli to devDependencies
30. Migrate from deprecated `csrf` package to `csrf-csrf`

---

## 5. SYSTEMIC PATTERNS

| Pattern | Count | Root Cause |
|---------|-------|------------|
| Credentials in source | 9 keys | `.env` not in `.gitignore` early enough |
| MongoDB injection (regex + operator) | 6 routes | No shared `escapeRegex()` utility or input validation middleware |
| Unbounded queries | 5 pages | Client-side pagination pattern; no server-side limit discipline |
| `as any` / `: any` type bypasses | 100+ instances | Rapid iteration without defining interfaces; types lag behind data shapes |
| Bare console logging | 25+ files | No lint rule enforcing Pino logger usage |
| Suppressed a11y warnings | 15+ components | Easier to suppress than fix; no a11y testing in CI |
| localStorage without try/catch | 15+ call sites | No shared safe storage utility |
| Dead/commented-out code | 15+ files, ~1,500 lines | No dead code detection in CI; history preserved in code instead of git |

---

## 6. POSITIVE SIGNALS

- **9,465+ tests passing across 82 files** — strong test discipline for a project of this size
- **Immutable snapshot architecture** — SHA-256 versioned edits with full audit trail is production-grade
- **Server-side business logic enforcement** — client is rendering only, as designed
- **Centralized auth guards** (`$lib/server/guards.ts`) — 9 guard functions with consistent pattern
- **Structured API responses** (`apiOk`/`apiError`) — good pattern, needs wider adoption (47 of 158 routes)
- **Anti-scraping system** — 8-layer defense with trust scoring is sophisticated
- **Comprehensive rule engine** — 50+ bank policies, income profiling with 12 types, deviation recovery
- **Centralized rate limiter** exists — just needs broader deployment and TTL cleanup
- **`securedClone()` utility** — proper deep clone with prototype pollution defense already built
