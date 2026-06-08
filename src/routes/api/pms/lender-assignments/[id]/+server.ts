/**
 * DELETE /api/pms/lender-assignments/[id]
 * Admin: removes a lender assignment without transfer (sets status: 'suspended').
 */
import type { RequestHandler } from './$types';
import { apiOk, apiError, apiServerError } from '$lib/server/apiResponse.js';
import logger from '$lib/server/logger.js';
import { requireRoleApi } from '$lib/server/guards.js';
import { RmLenderAssignments } from '$lib/database/mongo.js';
import { ObjectId } from 'mongodb';

export const DELETE: RequestHandler = async ({ locals, params }) => {
	const denied = requireRoleApi(locals, 'admin');
	if (denied) return denied;

	let assignmentId: ObjectId;
	try {
		assignmentId = new ObjectId(params.id);
	} catch {
		return apiError('Invalid assignment ID', 400);
	}

	const assignment = await RmLenderAssignments.findOne({ _id: assignmentId });
	if (!assignment) {
		return apiError('Assignment not found', 404);
	}

	try {
		await RmLenderAssignments.updateOne(
			{ _id: assignmentId },
			{
				$set: {
					status: 'suspended',
					suspendedAt: new Date(),
					suspendedReason: 'Removed by admin'
				}
			}
		);
	} catch (err) {
		return apiServerError(err, 'pms lender assignment delete');
	}

	logger.info(
		{
			adminUserId: locals.user!.id,
			assignmentId: params.id,
			rmUserId: assignment.rmUserId,
			lenderId: assignment.lenderId
		},
		'PMS lender assignment suspended by admin'
	);

	return apiOk({ message: 'Assignment suspended successfully' });
};
