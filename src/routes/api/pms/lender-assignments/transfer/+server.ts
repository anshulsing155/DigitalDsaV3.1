/**
 * POST /api/pms/lender-assignments/transfer
 * Admin: transfers a lender assignment from one RM to another.
 *
 * Sets transferredTo/transferredAt on the old assignment,
 * creates a new active assignment for the replacement RM,
 * and sends an in-app notification to the replacement RM.
 */
import type { RequestHandler } from './$types';
import { apiOk, apiError, apiServerError, parseJsonBody } from '$lib/server/apiResponse.js';
import logger from '$lib/server/logger.js';
import { requireRoleApi } from '$lib/server/guards.js';
import { RmLenderAssignments, Notifications } from '$lib/database/mongo.js';
import { ObjectId } from 'mongodb';
import type { RmLenderAssignment } from '$lib/config/pms/policyTypes.js';

export const POST: RequestHandler = async ({ locals, request }) => {
	// Admin-only operation
	const denied = requireRoleApi(locals, 'admin');
	if (denied) return denied;

	const body = await parseJsonBody<{
		assignmentId: string;
		replacementRmUserId: string;
	}>(request);
	if (!body.ok) return body.response;

	const { assignmentId, replacementRmUserId } = body.data;

	if (!assignmentId || !replacementRmUserId) {
		return apiError('assignmentId and replacementRmUserId are required', 400);
	}

	let oldAssignmentId: ObjectId;
	try {
		oldAssignmentId = new ObjectId(assignmentId);
	} catch {
		return apiError('Invalid assignmentId', 400);
	}

	const oldAssignment = await RmLenderAssignments.findOne({ _id: oldAssignmentId });
	if (!oldAssignment) {
		return apiError('Assignment not found', 404);
	}

	// Check replacement RM does not already have an active assignment for this lender
	const existingForReplacement = await RmLenderAssignments.findOne({
		rmUserId: replacementRmUserId,
		lenderId: oldAssignment.lenderId,
		status: 'active'
	});
	if (existingForReplacement) {
		return apiError('Replacement RM already has an active assignment for this lender', 409);
	}

	const now = new Date();
	const nextVerificationDueBy = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

	try {
		// Mark old assignment as transferred
		await RmLenderAssignments.updateOne(
			{ _id: oldAssignmentId },
			{
				$set: {
					status: 'suspended',
					suspendedAt: now,
					suspendedReason: 'Transferred to replacement RM',
					transferredTo: replacementRmUserId,
					transferredAt: now
				}
			}
		);

		// Create new assignment for replacement RM
		const newAssignment: Omit<RmLenderAssignment, '_id'> = {
			rmUserId: replacementRmUserId,
			lenderId: oldAssignment.lenderId,
			lenderName: oldAssignment.lenderName,
			// Replacement RM must reverify their own bank email during first login
			officialBankEmail: '',
			status: 'pending_verification',
			onboardedAt: now,
			lastMonthlyVerifiedAt: now,
			nextVerificationDueBy,
			suspendedAt: null,
			suspendedReason: null,
			transferredTo: null,
			transferredAt: null
		};

		await RmLenderAssignments.insertOne(newAssignment as RmLenderAssignment);

		// In-app notification for the replacement RM
		await Notifications.insertOne({
			user_id: replacementRmUserId,
			user_role: 'rm',
			type: 'pms_assignment_transferred',
			title: `${oldAssignment.lenderName} assigned to you`,
			message: `You have been assigned as the ${oldAssignment.lenderName} policy manager. Please verify your bank email to begin.`,
			action_url: '/dashboard/rm/policies/onboard-lender',
			read: false,
			created_at: now,
			metadata: { lenderId: oldAssignment.lenderId, fromRmUserId: oldAssignment.rmUserId }
		});
	} catch (err) {
		return apiServerError(err, 'pms lender assignment transfer');
	}

	logger.info(
		{
			adminUserId: locals.user!.id,
			fromRm: oldAssignment.rmUserId,
			toRm: replacementRmUserId,
			lenderId: oldAssignment.lenderId
		},
		'PMS lender assignment transferred'
	);

	return apiOk({
		message: `Assignment for ${oldAssignment.lenderName} transferred successfully. Replacement RM will receive a verification prompt.`
	});
};
