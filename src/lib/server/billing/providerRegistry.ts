/**
 * D.1 Recurring Billing — Provider registry
 * ══════════════════════════════════════════════════════════════════
 * Env-driven provider selection per §3.1 of the spec. Safe default
 * is `mock` so a misconfigured env var doesn't accidentally hit
 * Razorpay in production.
 *
 * Usage:
 *   import { billingProvider } from '$lib/server/billing/providerRegistry';
 *   await billingProvider.chargeMandate({...});
 *
 * The registry is a SINGLETON instantiated at module load. SvelteKit
 * imports it once per server boot, so the underlying provider's
 * caches (e.g. MockProvider's in-memory store) persist across requests
 * within a single process — but NOT across regions / Vercel cold
 * starts. Mock is for tests only; production state lives in MongoDB.
 *
 * Spec: docs/specs/D-1-RECURRING-BILLING-SPEC.md §3.1
 * ══════════════════════════════════════════════════════════════════
 */

import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import type { BillingProvider } from './providers/BillingProvider';
import { MockProvider } from './providers/mock';
import { RazorpayProvider } from './providers/razorpay';

// SvelteKit's Vite dev server does NOT populate `process.env` from `.env`.
// Reads must go through `$env/dynamic/private` (runtime) or
// `$env/static/private` (compile-time replacement). The previous direct
// `process.env.BILLING_PROVIDER` read returned undefined under Vite SSR,
// so dev mode silently defaulted to MockProvider even with the env var
// set in .env. Surfaced during D.1 S2 smoke 2026-05-26.
//
// Priority: process.env first (so vitest tests using vi.stubEnv work —
// vitest's vite plugin does NOT propagate stubEnv into $env/dynamic/private),
// then fall back to $env/dynamic/private (the dev/prod runtime path).
// We use `hasOwnProperty` so an explicitly-empty string ('') from a test
// or operator override is honored as "unset", instead of silently falling
// through to the $env value.
function readEnv(key: string): string | undefined {
	if (Object.prototype.hasOwnProperty.call(process.env, key)) {
		return process.env[key];
	}
	// In tests, process.env is the sole source of truth (vi.stubEnv +
	// delete process.env.X). Vite still populates $env/dynamic/private from
	// .env even under vitest, so a deliberate `delete` would silently fall
	// through here and leak the real secret. Skip the fallback under vitest.
	if (process.env.NODE_ENV === 'test' || process.env.VITEST) return undefined;
	return env[key];
}

// ── Env reading ────────────────────────────────────────────────

/**
 * BILLING_PROVIDER selects the leaf implementation.
 * Valid values: 'razorpay' (production), 'mock' (tests + dev fixture).
 *
 * Default: 'mock' (defense in depth — env misconfiguration in prod
 * should NEVER silently pick up Razorpay with stale/wrong keys).
 *
 * In production, this MUST be set to 'razorpay' explicitly via Vercel
 * env vars. Boot-time validation in createBillingProvider() throws
 * with a clear message if the chosen provider can't be constructed.
 */
function resolveProviderName(): 'razorpay' | 'mock' {
	const envValue = readEnv('BILLING_PROVIDER');
	if (envValue === 'razorpay') return 'razorpay';
	if (envValue === 'mock') return 'mock';
	if (envValue && envValue !== '') {
		// Unknown value — fail loudly rather than silently default.
		throw new Error(
			`BILLING_PROVIDER env var has unknown value: '${envValue}'. Expected 'razorpay' or 'mock'.`
		);
	}
	// No env var set → default to mock in dev (safe), razorpay in prod
	// (forces explicit env config rather than fail-open).
	if (dev) return 'mock';
	// Production with no env var = configuration error.
	throw new Error(
		'BILLING_PROVIDER env var is required in production. Set to "razorpay" in Vercel env config.'
	);
}

/**
 * Construct the chosen provider with env-derived configuration.
 * Exported for tests that want to construct a fresh instance per
 * test (the default export is a singleton).
 */
export function createBillingProvider(): BillingProvider {
	const name = resolveProviderName();

	if (name === 'razorpay') {
		// validateRazorpayConfig() inside the constructor throws with a
		// missing-env-var list if any of these are absent.
		return new RazorpayProvider({
			keyId: readEnv('RAZORPAY_KEY_ID') ?? '',
			keySecret: readEnv('RAZORPAY_KEY_SECRET') ?? '',
			webhookSecret: readEnv('RAZORPAY_WEBHOOK_SECRET') ?? ''
		});
	}

	// Mock provider — for tests + dev. The webhook secret is hard-coded
	// to a constant the tests can use; do NOT use mock in production.
	return new MockProvider({
		webhookSecret: readEnv('RAZORPAY_WEBHOOK_SECRET') ?? 'mock-webhook-secret'
	});
}

/**
 * Singleton instance used by every billing API endpoint + cron.
 * Constructed lazily on first access to avoid load-time crashes
 * during tests that don't need the provider.
 */
let _instance: BillingProvider | undefined;

export function getBillingProvider(): BillingProvider {
	if (!_instance) _instance = createBillingProvider();
	return _instance;
}

/**
 * Reset the singleton — for tests only. Lets each test construct a
 * fresh provider without import-cycle hacks.
 */
export function _resetBillingProviderForTests(): void {
	_instance = undefined;
}
