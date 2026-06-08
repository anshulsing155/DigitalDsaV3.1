/**
 * POST /api/pms/cron/publish-scheduled
 * Frequent cron (every minute): promotes approved_scheduled policies to published
 * when their scheduledPublishAt has passed.
 *
 * Protected by x-cron-secret header.
 */
import type { RequestHandler } from './$types';
import { apiOk, apiError, apiServerError } from '$lib/server/apiResponse.js';
import logger from '$lib/server/logger.js';
import { PmsLenderPolicies } from '$lib/database/mongo.js';
import { env } from '$env/dynamic/private';

const CRON_SECRET = env.CRON_SECRET || '';

export const POST: RequestHandler = async ({ request }) => {
	const authHeader = request.headers.get('x-cron-secret') || '';
	if (!CRON_SECRET || authHeader !== CRON_SECRET) {
		return apiError('Unauthorized', 401);
	}

	const now = new Date();

	try {
		// Fetch the policies about to be promoted so we can invalidate their cache entries
		const toPromote = await PmsLenderPolicies.find(
			{ status: 'approved_scheduled', scheduledPublishAt: { $lte: now } },
			{ projection: { lenderId: 1, loanProduct: 1 } }
		).toArray();

		if (toPromote.length === 0) {
			return apiOk({ promoted: 0 });
		}

		// Promote all due policies to published in one bulk write
		const result = await PmsLenderPolicies.updateMany(
			{
				status: 'approved_scheduled',
				scheduledPublishAt: { $lte: now }
			},
			{
				$set: {
					status: 'published',
					publishedAt: now,
					publishedBy: 'cron:publish-scheduled',
					validFrom: now
				},
				$inc: { lockVersion: 1 }
			}
		);

		const promoted = result.modifiedCount;

		if (promoted > 0) {
			logger.info({ promoted, ranAt: now }, 'PMS cron: promoted scheduled policies to published');

			// Invalidate per-lender PMS eval cache for each promoted policy
			try {
				const { invalidatePmsCache } = await import('$lib/ruleEngine/evaluationEngine.js');
				for (const policy of toPromote) {
					invalidatePmsCache(
						(policy as import('$lib/config/pms/policyTypes.js').PolicyDocument).lenderId,
						String((policy as import('$lib/config/pms/policyTypes.js').PolicyDocument).loanProduct)
					);
				}
			} catch {
				// Non-fatal — cache expires via TTL
			}
		}

		return apiOk({ promoted });
	} catch (err) {
		return apiServerError(err, 'pms cron publish-scheduled');
	}
};
