/**
 * GET  /api/rm-contacts/suggest
 * ======================================================================
 * Suggest RM contacts for a case.
 *
 * Loads the case by case_id, extracts lender names from
 * lender_applications, and for each lender finds the top 3
 * active RM contacts sorted by confirmation_count desc.
 * ======================================================================
 */

import type { RequestHandler } from './$types';
import { apiOk, apiError, apiServerError } from '$lib/server/apiResponse.js';
import { requireAuthApi } from '$lib/server/guards.js';
import { Cases, RMContacts } from '$lib/database/mongo.js';
import { resolveDsaId } from '$lib/server/caseHelpers.js';
import type { RMContact } from '$lib/types/rmContact.js';

// -- GET -- Suggest RM contacts for a case -----------------------------

export const GET: RequestHandler = async ({ locals, url }) => {
	const denied = requireAuthApi(locals);
	if (denied) return denied;

	try {
		const result = await resolveDsaId(locals);
		if (!result.ok) {
			return apiError(result.error, 404);
		}
		const dsaId = result.dsaId;

		// -- Parse query params ----------------------------------------
		const caseId = url.searchParams.get('case_id');
		if (!caseId) {
			return apiError('case_id query parameter is required');
		}

		// -- Load the case (query includes dsa_id for compound index) --
		const caseDoc = await Cases.findOne({ case_id: caseId, dsa_id: dsaId });
		if (!caseDoc) {
			return apiError('Case not found', 404);
		}

		// -- Extract lender names from lender_applications -------------
		const lenderNames = [
			...new Set((caseDoc.lender_applications || []).map((app) => app.lender_name))
		];

		if (lenderNames.length === 0) {
			return apiOk({ suggestions: {} });
		}

		// -- For each lender, find top 3 active RM contacts ------------
		const suggestions: Record<string, RMContact[]> = {};

		await Promise.all(
			lenderNames.map(async (lenderName) => {
				const contacts = await RMContacts.find({
					lender_name: lenderName,
					is_active: true
				})
					.sort({ confirmation_count: -1 })
					.limit(3)
					.toArray();

				suggestions[lenderName] = contacts;
			})
		);

		return apiOk({ suggestions });
	} catch (err) {
		return apiServerError(err, 'Failed to suggest RM contacts');
	}
};
