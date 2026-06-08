/**
 * Environment variable validation
 * ════════════════════════════════════════════════════════════════════
 * Called once at server startup (from hooks.server.ts) to fail fast
 * if any required variable is missing. Without this, a deploy with a
 * missing key would serve requests until the first call hits that
 * code path, then crash mid-request — making outages harder to
 * diagnose.
 *
 * Required vars are described in docs/specs/ENV-VARIABLES.md.
 * ════════════════════════════════════════════════════════════════════
 */
import { env } from '$env/dynamic/private';
import { dev } from '$app/environment';
import logger from '$lib/server/logger.js';

/**
 * Variables we consider hard-required for the app to function safely.
 *
 * `OPENAI_API_KEY` is required because every PMS encode/delta route
 * eagerly imports the AI pipeline; missing the key only fails at first
 * AI call, but startup logging here surfaces it immediately.
 *
 * `PMS_SIGNING_SECRET` is logged as a warning (not error) — there is a
 * documented fallback to `CRON_SECRET` for environments mid-migration.
 * See ENV-VARIABLES.md "Cross-trust-domain risk".
 */
const REQUIRED_VARS = ['MONGODB_URI', 'JWT_SECRET', 'CSRF_SECRET', 'OPENAI_API_KEY'] as const;

const SOFT_REQUIRED_VARS = ['PMS_SIGNING_SECRET', 'CRON_SECRET'] as const;

let validated = false;

export function validateRequiredEnv(): void {
	if (validated) return;
	validated = true;

	const missing = REQUIRED_VARS.filter((k) => !env[k]);
	const softMissing = SOFT_REQUIRED_VARS.filter((k) => !env[k]);

	if (missing.length > 0) {
		const message = `[env] missing required: ${missing.join(', ')} — see docs/specs/ENV-VARIABLES.md`;
		logger.error({ missing }, message);
		// In dev, log only — let the developer fix without restarting.
		// In prod, throw so the platform surfaces a clear failure rather
		// than silently misbehaving on the first dependent request.
		if (!dev) {
			throw new Error(message);
		}
	} else {
		logger.info({ checked: REQUIRED_VARS.length }, '[env] required variables OK');
	}

	if (softMissing.length > 0) {
		logger.warn(
			{ missing: softMissing },
			'[env] soft-required vars unset — falling back where possible. See ENV-VARIABLES.md'
		);
	}
}
