/**
 * NBFC Deal Capabilities API
 *
 * GET  /api/nbfc-capabilities?city=Delhi&riskType=AGREEMENT_POA
 *   → { found: true, nbfcName: "Aavas", contributedBy: "DSA Name" }
 *   → { found: false }
 *
 * POST /api/nbfc-capabilities
 *   Body: { city, riskType, nbfcName }
 *   → { success: true, id: "..." }
 *
 * Crowdsources NBFC knowledge: when a DSA knows which NBFC handles
 * a risky deal type (Agreement+POA, unregistered POA, non-NA land, etc.)
 * in a specific city, that knowledge is saved for future DSAs.
 */
import type { RequestHandler } from './$types';
import { apiOk, apiError, apiServerError, parseJsonBody } from '$lib/server/apiResponse.js';
import { NbfcDealCapabilities } from '$lib/database/mongo.js';
import logger from '$lib/server/logger.js';
import { ObjectId } from 'mongodb';

/** Valid risk types that can be queried/contributed */
const VALID_RISK_TYPES = new Set([
	'AGREEMENT_POA',
	'UNREGISTERED_POA',
	'NON_NA_LAND',
	'UNDER_LITIGATION'
]);

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user?.id) {
		return apiError('Unauthorized', 401);
	}

	const city = url.searchParams.get('city');
	const riskType = url.searchParams.get('riskType');

	if (!city || !riskType) {
		return apiError('city and riskType query params required');
	}

	if (!VALID_RISK_TYPES.has(riskType)) {
		return apiError(`Invalid riskType. Valid: ${[...VALID_RISK_TYPES].join(', ')}`);
	}

	try {
		const capability = await NbfcDealCapabilities.findOne(
			{ city, riskType, isActive: true },
			{ sort: { contributedAt: -1 } }
		);

		if (capability) {
			return apiOk({
				found: true,
				nbfcName: capability.nbfcName,
				contributedBy: capability.contributedByName || 'A DSA',
				contributedAt: capability.contributedAt
			});
		}

		return apiOk({ found: false });
	} catch (error) {
		return apiServerError(error, 'Failed to check NBFC capabilities');
	}
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user?.id) {
		return apiError('Unauthorized', 401);
	}

	const parsed = await parseJsonBody<{
		city: string;
		riskType: string;
		nbfcName: string;
	}>(request);
	if (!parsed.ok) return parsed.response;

	const { city, riskType, nbfcName } = parsed.data;

	if (!city || typeof city !== 'string' || city.trim().length === 0) {
		return apiError('city is required');
	}
	if (!riskType || !VALID_RISK_TYPES.has(riskType)) {
		return apiError(`Invalid riskType. Valid: ${[...VALID_RISK_TYPES].join(', ')}`);
	}
	if (!nbfcName || typeof nbfcName !== 'string' || nbfcName.trim().length < 2) {
		return apiError('nbfcName is required (min 2 characters)');
	}

	try {
		const doc = {
			city: city.trim(),
			riskType,
			nbfcName: nbfcName.trim(),
			contributedBy: new ObjectId(locals.user.id),
			contributedByName: locals.user.name || locals.user.mobileNumber || 'Unknown',
			contributedAt: new Date(),
			isActive: true
		};

		const result = await NbfcDealCapabilities.insertOne(doc);

		logger.info(
			{ city, riskType, nbfcName: nbfcName.trim(), userId: locals.user.id },
			'NBFC capability contributed'
		);

		return apiOk({ id: result.insertedId.toString() });
	} catch (error) {
		return apiServerError(error, 'Failed to save NBFC capability');
	}
};
