/**
 * Public app base URL — single source of truth for outbound links
 * ══════════════════════════════════════════════════════════════════
 * Reads the `PUBLIC_APP_BASE_URL` env var (must be PUBLIC_ prefixed
 * per SvelteKit convention so it's available on both client + server).
 *
 * Used everywhere we generate user-facing URLs from server-side code
 * — email templates, notification digests, SEO canonicals, cron-job
 * config, etc. Without a central helper, every email had a hard-
 * coded `https://www.rinn.in/...` (or worse, `https://digitaldsa.com/...`
 * with no www) which made the rinn.in -> digitaldsa.com production
 * migration touch a dozen files.
 *
 * Default value `https://www.rinn.in` matches the current production
 * canonical so callers that don't set the env var preserve today's
 * behavior. On migration day, set `PUBLIC_APP_BASE_URL` to
 * `https://www.digitaldsa.com` in Vercel and redeploy — no code
 * changes needed.
 *
 * Canonical-host requirement: the value MUST be the www host, not the
 * apex, so external schedulers (cron-job.org) + email-client previews
 * don't choke on the apex->www 308 redirect that Vercel auto-applies.
 * Same trap caught by commit ea9ebedf 2026-05-27.
 * ══════════════════════════════════════════════════════════════════
 */

// $env/dynamic/private is server-only — every consumer of these
// constants today is in server code (email templates routed through
// API endpoints / crons). If a client component ever needs the base
// URL, that's the moment to split this into a `.server.ts` + a
// client-safe sibling reading $env/static/public. Until then, dynamic/
// private is the right choice: it (a) tolerates the env var being
// unset (returns undefined, fallback below handles it), (b) Vitest
// resolves it cleanly under the test harness, (c) Vercel reads the
// runtime value without a rebuild needed.
import { env } from '$env/dynamic/private';

/**
 * Public canonical base URL for the app. Used in every outbound
 * link in emails, push notifications, og:url meta tags, etc.
 *
 * Default: https://www.rinn.in (today's production canonical).
 * Migration: set PUBLIC_APP_BASE_URL=https://www.digitaldsa.com in
 * Vercel env (Production + Preview), redeploy. Trailing slash NOT
 * included so callers can append `/dashboard/...` directly.
 */
export const PUBLIC_APP_BASE_URL: string =
	env.PUBLIC_APP_BASE_URL || 'https://www.rinn.in';

/** Convenience: DSA billing page URL. */
export const PUBLIC_BILLING_URL: string = `${PUBLIC_APP_BASE_URL}/dashboard/dsa/billing`;

/** Convenience: DSA dashboard root. */
export const PUBLIC_DSA_DASHBOARD_URL: string = `${PUBLIC_APP_BASE_URL}/dashboard/dsa`;

/** Convenience: RM dashboard root. */
export const PUBLIC_RM_DASHBOARD_URL: string = `${PUBLIC_APP_BASE_URL}/dashboard/rm`;

/** Convenience: RM policy capture page. */
export const PUBLIC_RM_POLICIES_URL: string = `${PUBLIC_APP_BASE_URL}/dashboard/rm/policies`;

/**
 * Notification Preferences page — every transactional email footer links here
 * per the 2026-06-01 AWS SES production-access commitment (case 177987930900751,
 * 5-element footer item #2). All DigitalDSA email is transactional in v1, so the
 * page explains "to stop all email, close your account" rather than offering
 * per-category opt-outs.
 */
export const PUBLIC_NOTIFICATION_PREFERENCES_URL: string = `${PUBLIC_APP_BASE_URL}/dashboard/dsa/settings/notifications`;

/**
 * Close Account page — every transactional email footer links here per the
 * 2026-06-01 AWS SES production-access commitment (5-element footer item #3).
 * Confirming closure immediately flips email_status to suppressed_complaint
 * so subsequent sendEmail() calls drop the address.
 */
export const PUBLIC_CLOSE_ACCOUNT_URL: string = `${PUBLIC_APP_BASE_URL}/dashboard/dsa/settings/account/close`;
