/**
 * POST /api/pms/lender-assignments/onboard
 * Creates a new RmLenderAssignment after OTP verification.
 *
 * Prerequisites:
 *   - RM is authenticated
 *   - RM has no existing active assignment for this lender
 *   - OTP was verified successfully (pmsOtpToken header required)
 */
import type { RequestHandler } from './$types';
import { apiOk, apiError, apiServerError, parseJsonBody } from '$lib/server/apiResponse.js';
import logger from '$lib/server/logger.js';
import { requireRoleApi, requirePmsOtpToken } from '$lib/server/guards.js';
import { RmLenderAssignments } from '$lib/database/mongo.js';
import { LENDER_BY_ID } from '$lib/config/lenderPolicies/lenderDirectory.js';
import { getPmsSigningKey } from '$lib/server/pms/signingKey.js';
import type { RmLenderAssignment } from '$lib/config/pms/policyTypes.js';

export const POST: RequestHandler = async ({ locals, request }) => {
	const denied = requireRoleApi(locals, 'rm');
	if (denied) return denied;

	const body = await parseJsonBody<{
		lenderId: string;
		bankEmail: string;
	}>(request);
	if (!body.ok) return body.response;

	const { lenderId, bankEmail } = body.data;

	if (!lenderId || !bankEmail) {
		return apiError('lenderId and bankEmail are required', 400);
	}

	// Verify OTP token — bound to onboarding (no policyId/draftHash for onboarding)
	let signingKey: string;
	try {
		signingKey = getPmsSigningKey();
	} catch (err) {
		logger.error({ err }, 'PMS signing key unavailable on onboard');
		return apiError('Server configuration error', 500);
	}

	const tokenDenied = requirePmsOtpToken(
		request,
		locals.user!.id,
		lenderId,
		'',
		'',
		signingKey
	);
	if (tokenDenied) return tokenDenied;

	// Verify lender exists
	const lender = LENDER_BY_ID.get(lenderId);
	if (!lender) {
		return apiError(`Lender '${lenderId}' not found`, 404);
	}

	// Strict one-lender rule (2026-05-31): an RM has authority for a single
	// lender at any point in time — identity is bound to one bank email.
	// Job change → new lender email → effectively a new RM record. Block
	// any attempt to add a second active assignment to the same RM. Admin
	// 'transfer' is the legitimate path for changing assignments.
	//
	// Reactivation of a SUSPENDED assignment (e.g. admin transferred a
	// lender TO this RM) is still allowed below — that's a different code
	// path and the suspended row is what this same RM previously owned.
	const otherActive = await RmLenderAssignments.findOne({
		rmUserId: locals.user!.id,
		status: 'active',
		lenderId: { $ne: lenderId }
	});
	if (otherActive) {
		return apiError(
			`You already have an active assignment for ${otherActive.lenderName}. ` +
				`An RM can hold only one lender at a time — contact admin to transfer.`,
			409
		);
	}

	// Check for existing active assignment
	const existingAssignment = await RmLenderAssignments.findOne({
		rmUserId: locals.user!.id,
		lenderId
	});

	if (existingAssignment) {
		if (existingAssignment.status === 'active') {
			return apiError(`You already have an active assignment for ${lender.lenderName}`, 409);
		}
		// Suspended assignment — reactivate it
		const nextVerificationDueBy = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
		await RmLenderAssignments.updateOne(
			{ _id: existingAssignment._id },
			{
				$set: {
					status: 'active',
					officialBankEmail: bankEmail,
					lastMonthlyVerifiedAt: new Date(),
					nextVerificationDueBy,
					suspendedAt: null,
					suspendedReason: null
				}
			}
		);

		logger.info(
			{ rmUserId: locals.user!.id, lenderId, lenderName: lender.lenderName },
			'PMS lender assignment reactivated'
		);

		return apiOk({
			message: `Successfully reactivated assignment for ${lender.lenderName}`,
			nextVerificationDueBy
		});
	}

	// Create new assignment
	const now = new Date();
	const nextVerificationDueBy = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

	const assignment: Omit<RmLenderAssignment, '_id'> = {
		rmUserId: locals.user!.id,
		lenderId,
		lenderName: lender.lenderName,
		officialBankEmail: bankEmail,
		status: 'active',
		onboardedAt: now,
		lastMonthlyVerifiedAt: now,
		nextVerificationDueBy,
		suspendedAt: null,
		suspendedReason: null,
		transferredTo: null,
		transferredAt: null
	};

	try {
		await RmLenderAssignments.insertOne(assignment as RmLenderAssignment);
	} catch (err) {
		return apiServerError(err, 'pms lender assignment onboard');
	}

	logger.info(
		{ rmUserId: locals.user!.id, lenderId, lenderName: lender.lenderName },
		'PMS lender assignment created'
	);

	return apiOk({
		message: `Successfully assigned to ${lender.lenderName}`,
		nextVerificationDueBy
	});
};
