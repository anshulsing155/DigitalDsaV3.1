/**
 * GET /api/location/states
 * Returns all 36 Indian state/UT names from the full pincode dataset.
 * Used for applicant residence state dropdowns (applicant can live anywhere in India).
 *
 * Response: { success: true, data: { states: ["Andhra Pradesh", ...] } }
 *
 * Imports the pre-computed derived list (~600 bytes) instead of the full
 * 4.12 MB pincode_IN_all.json. Derivation logic lives in
 * scripts/generate-pincode-derived.cjs and is byte-equivalent to the
 * previous `Object.keys(pincode_IN_all).sort()` call.
 */
import type { RequestHandler } from './$types';
import { apiOk } from '$lib/server/apiResponse.js';
import sortedStates from '$lib/config/_generated/stateList_all.json';

export const GET: RequestHandler = async () => {
	return apiOk({ states: sortedStates });
};
