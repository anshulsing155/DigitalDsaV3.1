/**
 * POST /api/pms/policies/[id]/qa-run
 * Admin-only. Runs the 296-profile QA impact report for a submitted or
 * published PMS policy draft and stores the result on the policy document.
 *
 * The run is CPU-only (no network calls) and completes in ~2–5s.
 * Results are stored in PolicyDocument.qaRun for the Impact Report tab.
 */
import type { RequestHandler } from './$types';
import { apiOk, apiError, apiServerError } from '$lib/server/apiResponse.js';
import { requireRoleApi } from '$lib/server/guards.js';
import { rateLimit } from '$lib/server/rateLimiter.js';
import { PmsLenderPolicies } from '$lib/database/mongo.js';
import { ObjectId } from 'mongodb';
import { runQa } from '$lib/server/pms/qaRunner.js';
import logger from '$lib/server/logger.js';
import type { PolicyDocument } from '$lib/config/pms/policyTypes.js';

export const POST: RequestHandler = async ({ locals, params }) => {
	const denied = requireRoleApi(locals, ['admin']);
	if (denied) return denied;

	// QA runs are CPU-bound and stack on Vercel — without a limit, rapid clicks
	// or an automated caller can pile up concurrent invocations. The browser
	// `running` flag in ImpactTab guards single-user double-click but offers no
	// server-side protection. Two runs / minute / admin is generous given a
	// typical run is 2-5 seconds.
	const adminId = locals.user!.id;
	const limited = await rateLimit(adminId, {
		maxRequests: 2,
		windowMs: 60_000,
		identifier: `pms_qa_run:${adminId}`
	});
	if (limited) {
		return apiError('Rate limit: please wait a minute before re-running QA.', 429);
	}

	const { id } = params;
	if (!id || !ObjectId.isValid(id)) return apiError('Invalid policy ID', 400);

	let policy: PolicyDocument | null;
	try {
		policy = (await PmsLenderPolicies.findOne({ _id: new ObjectId(id) })) as PolicyDocument | null;
	} catch (err) {
		return apiServerError(err, 'qa-run fetch policy');
	}

	if (!policy) return apiError('Policy not found', 404);

	// QA is only meaningful on submitted/published drafts — not raw drafts
	const allowedStatuses = ['submitted', 'approved', 'approved_scheduled', 'published'];
	if (!allowedStatuses.includes(policy.status)) {
		return apiError(
			`QA can only be run on submitted or published policies (current status: ${policy.status})`,
			422
		);
	}

	try {
		const qaResult = await runQa(policy);

		await PmsLenderPolicies.updateOne(
			{ _id: new ObjectId(id) },
			{ $set: { qaRun: qaResult, updatedAt: new Date() } }
		);

		logger.info(
			{
				policyId: id,
				lenderId: policy.lenderId,
				loanProduct: policy.loanProduct,
				testedProfiles: qaResult.testedProfiles,
				changedProfiles: qaResult.changedProfiles,
				flippedEligibility: qaResult.flippedEligibility
			},
			'PMS QA run complete'
		);

		// Serialize dates for JSON response
		return apiOk({
			ranAt: qaResult.ranAt.toISOString(),
			totalProfiles: qaResult.totalProfiles,
			testedProfiles: qaResult.testedProfiles,
			changedProfiles: qaResult.changedProfiles,
			flippedEligibility: qaResult.flippedEligibility,
			hadBaseline: qaResult.hadBaseline,
			results: qaResult.results
		});
	} catch (err) {
		return apiServerError(err, 'qa-run execute');
	}
};
