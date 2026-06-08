/**
 * Professional Loan Form — Server Loader
 * ══════════════════════════════════════════════════════════════════
 * Evaluates page 0 of the Professional Loan schema with empty
 * answers (initial load). Subsequent page evaluations happen via
 * /api/form/evaluate with client-side answers from sessionStorage.
 *
 * Auth is handled by the (app) layout, but we guard here too
 * for defense-in-depth.
 * ══════════════════════════════════════════════════════════════════
 */

import type { PageServerLoad } from './$types';
import { requireAuth } from '$lib/server/guards';
import { createFormEngine } from '$lib/server/formEngine/engine';
import { getEngineOptions } from '$lib/server/formEngine/engineContext';
import { loadConfirmModalContext } from '$lib/server/billing/confirmModalContext';

export const load: PageServerLoad = async ({ locals }) => {
	requireAuth(locals);

	const loanType = 'Professional Loan';
	const engine = createFormEngine(loanType);
	const options = getEngineOptions();

	const [initialPage, confirmModalCtx] = await Promise.all([
		engine.evaluatePage(0, {}, options),
		loadConfirmModalContext(locals)
	]);

	return {
		formEngine: {
			loanType,
			initialPage
		},
		confirmModalCtx
	};
};
