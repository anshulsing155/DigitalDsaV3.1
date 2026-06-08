/**
 * POST /api/admin/migrations/backfill-admin-parallel-records
 *
 * Super-admin only. Iterates all active admins and ensures each has parallel
 * DsaApplications + rmApplications records at their mobileNumber. Idempotent
 * — running it twice does nothing on the second run.
 *
 * Use this once after deploying the auto-create-on-admin-creation hook to
 * backfill the existing admin population. New admins created after the hook
 * shipped will have their parallel records created automatically.
 */

import type { RequestHandler } from './$types';
import { requireRoleApi, requireSuperAdmin } from '$lib/server/guards.js';
import { AdminUsers } from '$lib/database/mongo.js';
import { apiOk, apiServerError } from '$lib/server/apiResponse.js';
import { ensureAdminParallelRecords } from '$lib/server/adminParallelAccess.js';
import logger from '$lib/server/logger.js';

export const POST: RequestHandler = async ({ locals }) => {
	const denied = requireRoleApi(locals, 'admin');
	if (denied) return denied;
	const superDenied = requireSuperAdmin(locals);
	if (superDenied) return superDenied;

	try {
		const admins = await AdminUsers.find(
			{ is_active: true },
			{ projection: { _id: 1, name: 1, email: 1, mobileNumber: 1 } }
		).toArray();

		let dsaCreatedCount = 0;
		let rmCreatedCount = 0;
		let lenderAssignmentsCreatedTotal = 0;
		const failures: Array<{ adminId: string; error: string }> = [];

		for (const admin of admins) {
			try {
				const result = await ensureAdminParallelRecords({
					adminId: admin._id.toString(),
					mobileNumber: Number(admin.mobileNumber),
					name: admin.name || 'Admin',
					email: admin.email || ''
				});
				if (result.dsaCreated) dsaCreatedCount++;
				if (result.rmCreated) rmCreatedCount++;
				lenderAssignmentsCreatedTotal += result.lenderAssignmentsCreated;
			} catch (err) {
				failures.push({
					adminId: admin._id.toString(),
					error: err instanceof Error ? err.message : String(err)
				});
			}
		}

		logger.info(
			{
				totalAdmins: admins.length,
				dsaCreatedCount,
				rmCreatedCount,
				lenderAssignmentsCreatedTotal,
				failureCount: failures.length
			},
			'Admin parallel-records backfill complete'
		);

		return apiOk({
			totalAdmins: admins.length,
			dsaCreated: dsaCreatedCount,
			rmCreated: rmCreatedCount,
			lenderAssignmentsCreated: lenderAssignmentsCreatedTotal,
			failures
		});
	} catch (err) {
		return apiServerError(err, 'backfill admin parallel records');
	}
};
