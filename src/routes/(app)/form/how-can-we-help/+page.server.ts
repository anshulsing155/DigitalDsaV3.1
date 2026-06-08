/**
 * "How Can We Help" — Server Loader (Loan Type Selection)
 * ══════════════════════════════════════════════════════════════════
 * This is the form entry point where the user selects their loan
 * type. It does NOT use a loan-type-specific engine since no loan
 * type has been chosen yet.
 *
 * Instead, it provides the list of available loan types so the
 * client can display the selection UI. Once a loan type is chosen,
 * the user navigates to the loan-specific route (e.g. /form/home-loan)
 * which has its own server-evaluated form engine.
 *
 * Auth is handled by the (app) layout, but we guard here too
 * for defense-in-depth.
 * ══════════════════════════════════════════════════════════════════
 */

import type { PageServerLoad } from './$types';
import { requireAuth } from '$lib/server/guards';
import { getAvailableLoanTypes } from '$lib/server/formEngine/schemaLoader';

export const load: PageServerLoad = async ({ locals }) => {
	requireAuth(locals);

	return {
		formEngine: {
			loanType: null,
			availableLoanTypes: getAvailableLoanTypes()
		}
	};
};
