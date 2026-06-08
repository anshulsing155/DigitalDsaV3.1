/**
 * GET  /api/admin/admins — List all admin users
 * POST /api/admin/admins — Create a new admin user
 * ══════════════════════════════════════════════════════════════════
 * Super admin only.
 */

import type { RequestHandler } from '@sveltejs/kit';
import { requireRoleApi, requireSuperAdmin } from '$lib/server/guards.js';
import { AdminUsers, PolicyAuditLogs } from '$lib/database/mongo.js';
import type { AdminUser, AdminPermissions } from '$lib/types/adminUser.js';
import { apiOk, apiError, apiServerError, parseJsonBody } from '$lib/server/apiResponse.js';
import { ensureAdminParallelRecords } from '$lib/server/adminParallelAccess.js';
import logger from '$lib/server/logger.js';
import { findUserByMobile, decryptUserPii, encryptUserPii } from '$lib/server/csfle/index.js';

export const GET: RequestHandler = async ({ locals }) => {
	const denied = requireRoleApi(locals, 'admin');
	if (denied) return denied;
	const superDenied = requireSuperAdmin(locals);
	if (superDenied) return superDenied;

	try {
		const adminsRaw = await AdminUsers.find({})
			.project({
				name: 1,
				mobileNumber: 1,
				email: 1,
				permissions: 1,
				is_super_admin: 1,
				is_active: 1,
				last_login: 1,
				lastActiveAt: 1,
				created_at: 1
			})
			.sort({ created_at: 1 })
			.toArray();

		// SEC-2: decrypt PII per row before serializing to the response.
		const admins = await Promise.all(adminsRaw.map((a) => decryptUserPii(a)));

		return apiOk(
			admins
				.filter((a): a is NonNullable<typeof a> => a !== null)
				.map((a) => ({
					_id: a._id.toString(),
					name: a.name,
					mobileNumber: a.mobileNumber,
					email: a.email,
					permissions: a.permissions,
					is_super_admin: a.is_super_admin === true,
					is_active: a.is_active,
					last_login: a.last_login,
					lastActiveAt: a.lastActiveAt,
					created_at: a.created_at
				}))
		);
	} catch (err) {
		return apiServerError(err, 'Failed to load admin users');
	}
};

export const POST: RequestHandler = async ({ request, locals }) => {
	const denied = requireRoleApi(locals, 'admin');
	if (denied) return denied;
	const superDenied = requireSuperAdmin(locals);
	if (superDenied) return superDenied;

	const parsed = await parseJsonBody<{
		name?: string;
		mobileNumber?: number;
		permissions?: Partial<AdminPermissions>;
	}>(request);
	if (!parsed.ok) return parsed.response;
	const { name, mobileNumber, permissions } = parsed.data;

	try {
		if (!name?.trim() || !mobileNumber) {
			return apiError('Name and mobile number are required');
		}

		const mobile = Number(mobileNumber);
		if (isNaN(mobile) || String(mobile).length < 10) {
			return apiError('Invalid mobile number');
		}

		// Check duplicate — SEC-2 encrypted-first dual-query
		const existing = await findUserByMobile(AdminUsers, mobile);
		if (existing) {
			return apiError('An admin with this mobile number already exists', 409);
		}

		const adminDoc: Omit<AdminUser, '_id'> = {
			name: name.trim(),
			mobileNumber: mobile,
			permissions: {
				user_management: permissions?.user_management === true,
				rule_authoring: permissions?.rule_authoring === true,
				system_settings: permissions?.system_settings === true,
				qa_view: permissions?.qa_view === true,
				qa_write: permissions?.qa_write === true,
				qa_run: permissions?.qa_run === true
			},
			is_active: true,
			created_at: new Date(),
			updated_at: new Date()
		};

		// SEC-2: encrypt PII (name + mobileNumber) before insert.
		const encryptedAdmin = await encryptUserPii(adminDoc);
		const result = await AdminUsers.insertOne(encryptedAdmin as AdminUser);

		// Auto-create parallel DSA + RM records at the admin's mobile so the
		// admin can access DSA-only and RM-only flows without hitting
		// "DSA profile not found" or empty RM dashboards. Non-fatal — admin is
		// already inserted; if mirroring fails we log and continue.
		try {
			await ensureAdminParallelRecords({
				adminId: result.insertedId.toString(),
				mobileNumber: mobile,
				name: name.trim(),
				email: ''
			});
		} catch (mirrorErr) {
			logger.warn(
				{ err: mirrorErr, adminId: result.insertedId.toString(), mobile },
				'Failed to auto-create admin parallel records — admin can run backfill later'
			);
		}

		// Audit log
		await PolicyAuditLogs.insertOne({
			target_type: 'lender' as const,
			target_id: result.insertedId.toString(),
			action: 'lender_created' as const,
			actor_id: locals.user!.id,
			actor_name: locals.user!.name,
			actor_role: 'admin' as const,
			details: {
				event: 'admin_created',
				admin_name: name.trim(),
				admin_mobile: mobile,
				permissions: adminDoc.permissions
			},
			created_at: new Date()
		} as any);

		return apiOk(
			{
				_id: result.insertedId.toString(),
				name: name.trim(),
				mobileNumber: mobile,
				permissions: adminDoc.permissions,
				is_active: true
			},
			201
		);
	} catch (err) {
		return apiServerError(err, 'Failed to create admin user');
	}
};
