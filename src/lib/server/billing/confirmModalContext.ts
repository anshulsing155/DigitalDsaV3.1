/**
 * Confirm-modal context loader for form-page +page.server.ts
 * ══════════════════════════════════════════════════════════════════════
 * Returns the two inputs the redesigned submit/edit ConfirmModal needs to
 * render its state-specific copy:
 *
 *   - `quotaState` — drives the badge tint + exhausted/approaching/normal copy
 *   - `inFlightCase` — drives the footer trade-off note ("you have a case still
 *                       in [stage]; submitting now uses your last save")
 *
 * Both lookups are wrapped in try/catch so a billing-query failure NEVER
 * deadends the form load — the modal simply falls back to legacy copy
 * (no badge / no footer). Demo / guest users return null for both.
 *
 * Consumed by each loan form's +page.server.ts loader; threaded through
 * page data into the +page.svelte's confirmAndSubmit call site.
 *
 * LEND-1 stack-pop, 2026-06-02.
 */

import logger from '$lib/server/logger';
import { getQuotaState, type QuotaState } from './quotaState';
import { getInFlightCase, type InFlightCaseSummary } from './getInFlightCase';
import { resolveEffectiveDsaId } from '$lib/server/caseHelpers';

export interface ConfirmModalContextData {
	quotaState: QuotaState | null;
	inFlightCase: InFlightCaseSummary | null;
}

/**
 * Load `quotaState` + `inFlightCase` in parallel for the current DSA.
 *
 * Resolves the effective DSA `_id` via `resolveEffectiveDsaId(locals)` so the
 * lookup matches the id that cases are STORED under. Using `locals.user.id`
 * directly is wrong for two cases:
 *   - team members → `locals.user.id` is the member's own user id, but cases
 *     live under the OWNER's dsa_id (resolveEffectiveDsaId returns the owner)
 *   - any user whose JWT `userId` doesn't match `findUserByMobile(...)._id`
 *     (data drift between encrypted-mobile lookup and JWT-issued id)
 *
 * Both lookups are wrapped so a billing-query failure NEVER deadends the form
 * load — the modal falls back to legacy copy (no badge / no footer).
 * Demo / guest users return null for both.
 */
export async function loadConfirmModalContext(
	locals: App.Locals
): Promise<ConfirmModalContextData> {
	const out: ConfirmModalContextData = { quotaState: null, inFlightCase: null };
	if (!locals.user?.id || locals.user.id === 'demo-guest') return out;

	const dsaResult = await resolveEffectiveDsaId(locals);
	if (!dsaResult.ok) {
		logger.warn(
			{ err: dsaResult.error, userId: locals.user.id },
			'Failed to resolve effective DSA id for confirm modal'
		);
		return out;
	}
	const dsaId = dsaResult.dsaId;

	const [quotaResult, inFlightResult] = await Promise.allSettled([
		getQuotaState(dsaId),
		getInFlightCase(dsaId)
	]);

	if (quotaResult.status === 'fulfilled') {
		out.quotaState = quotaResult.value;
	} else {
		logger.warn(
			{ err: quotaResult.reason, dsaId: dsaId.toString() },
			'Failed to load quota state for confirm modal'
		);
	}

	if (inFlightResult.status === 'fulfilled') {
		out.inFlightCase = inFlightResult.value;
	} else {
		logger.warn(
			{ err: inFlightResult.reason, dsaId: dsaId.toString() },
			'Failed to load in-flight case for confirm modal'
		);
	}

	return out;
}
