# Code Review — Commit `8f43ab2a` (2026-04-07)

**Commit:** `visual: Glassmorphism + gradients + human faces landing page upgrade`
**Author:** `tech@eyantrik.com` (our session work)
**Files changed:** 18 (699 insertions, 277 deletions)

---

## Summary

This commit bundles two categories of work:

1. **Landing page visual upgrade** — Glassmorphism tokens, frosted glass cards, ambient orbs with GSAP animation, Unsplash hero image and testimonial avatars, gradient backgrounds with noise texture
2. **Backend fixes** (from prior review C1/C2/C3 items) — `requireRoleApi` guard added to RM sample-data, `apiOk`/`apiError`/`apiServerError` migration on RM endpoints, billing audit-first ordering, rate limiter sliding-window fix, `secureFetch` migration, route constant migration, `formatTimeAgo` dedup

---

## SECURITY

### S1. RM sample-data guard — FIXED (was Critical C1)
**Status:** Resolved
`src/routes/api/rm/sample-data/+server.ts` now calls `requireRoleApi(locals, 'rm')` + `blockDemoWrite(locals)` on both DELETE and POST. Previously any authenticated user could hit these endpoints.

### S2. Billing audit-first ordering — FIXED (was Critical C2)
**Status:** Resolved
`src/routes/api/billing/subscribe/+server.ts` now inserts `BillingTransactions` record BEFORE activating the subscription. If the transaction log fails, subscription stays inactive (safe to retry). Previously the subscription could activate without an audit trail.

### S3. `secureFetch` migration — FIXED (was Critical C3)
**Status:** Resolved
RM dashboard (`+page.svelte`) now uses `secureFetch` instead of bare `fetch` for `/api/rm/sample-data` and `/api/rm/preferred-dsas` calls.

### S4. Rate limiter sliding-window fix — Good
**Status:** Clean
`rateLimiter.ts` renamed `last` → `windowStart` and stopped sliding the window on every request. Previously, a steady trickle of requests could keep the window alive indefinitely without ever hitting the limit (sliding window bypass). Now uses fixed-window correctly.

---

## BUGS / CORRECTNESS

### B1. `formatTimeAgo` signature mismatch — LOW RISK
**File:** `DSAConnectionsZone.svelte:105`, `RecentCasesZone.svelte:106`
The local `formatTimeAgo(dateStr: string)` was removed and replaced with the i18n import `formatTimeAgo(date: Date)`. The call sites now wrap with `new Date(...)`. This is correct, but if `last_shared_at` or `updated_at` is ever `null`/`undefined` from the API, `new Date(undefined)` produces `Invalid Date` → the i18n function may render "NaN" or similar. The old local function had the same issue, so this is not a regression — just an existing edge case.

### B2. `console.warn` removed from ApplicantDataStore — OK
**File:** `applicantDataStore.svelte.ts`
Two `console.warn` calls replaced with comments. This aligns with the project rule (use Pino logger, not bare console). The warnings were non-critical (sessionStorage write failures). No functional change.

---

## UX / PERFORMANCE

### U1. External Unsplash images — MEDIUM CONCERN
**Files:** `HeroSection.svelte`, `TestimonialsSection.svelte`
The hero section loads an 800px-wide Unsplash photo, and testimonials load three 150x150 face avatars directly from `images.unsplash.com`. Concerns:

- **Availability:** Unsplash CDN outage = broken hero/avatars on the landing page
- **Performance:** Extra DNS lookup + TLS handshake to Unsplash domain. No `srcset` for responsive sizes on the hero image.
- **Privacy:** Unsplash sees visitor IPs/referrers
- **Recommendation:** Download images, optimize (WebP), host on ImageKit (already in the stack). Add `loading="lazy"` to testimonial avatars (already present — good). Add `width`/`height` attributes to prevent CLS.

### U2. Three ambient orbs with infinite GSAP animations — LOW
Continuous `yoyo: true, repeat: -1` animations on three orbs. GPU-composited (transform only), so should be fine. But on low-end Android devices via Capacitor, three simultaneous infinite tweens may contribute to battery drain. The `prefers-reduced-motion` guard exists for the timeline but NOT for the orb animations — they always run.

**Fix:** Wrap the orb `gsap.to()` calls in the same `prefers-reduced-motion` check:
```js
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
```

### U3. Hardcoded route strings replaced with ROUTES constants — Good
RM dashboard now uses `ROUTES.DASHBOARD.RM.*` instead of hardcoded strings. Consistent with project convention.

---

## CODE QUALITY

### Q1. API response standardization — Good
`preferred-dsas/+server.ts` fully migrated from `json()` to `apiOk()`/`apiError()`/`apiServerError()`. Removed direct `logger.error` calls since `apiServerError` handles logging internally. Clean.

### Q2. `formatTimeAgo` deduplication — Good
Removed duplicate implementations from `DSAConnectionsZone` and `RecentCasesZone`, now using the shared `$lib/i18n` export. Reduces maintenance surface.

### Q3. Landing page CSS tokens well-structured
Glass tokens properly scoped with `--landing-` prefix, both light and dark mode variants defined, utility classes `.landing-glass` and `.landing-dark-glass` created. Good token hygiene.

### Q4. HeroSection file size — WATCH
HeroSection.svelte grew significantly with inline styles. The component is now visually complex. If it grows further, consider extracting the style block into a separate file or splitting visual sub-sections into child components.

---

## ALIGNMENT WITH PROJECT OBJECTIVES

| Objective | Status |
|---|---|
| DSA-first platform | Landing page clearly targets DSAs, "Built exclusively for loan professionals" text present |
| No customer-facing dashboards | N/A — this is landing page only |
| Role-based access server-validated | RM endpoints now properly guarded |
| Route constants centralized | RM dashboard migrated to ROUTES |
| No bare console | `console.warn` removed from applicant store |

---

## ACTION ITEMS

| Priority | Item | Effort |
|---|---|---|
| **Medium** | U1: Self-host Unsplash images on ImageKit | 30 min |
| **Low** | U2: Add `prefers-reduced-motion` guard to ambient orb animations | 5 min |
| **Low** | B1: Add null-guard in `formatTimeAgo` for invalid dates | 10 min |

No critical issues found. All prior Critical items (C1-C3) from the earlier review are resolved in this commit.
