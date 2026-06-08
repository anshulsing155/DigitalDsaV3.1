/**
 * PATCH /api/admin/admins/[admin_id]
 * ══════════════════════════════════════════════════════════════════
 * Update admin permissions, activate/deactivate. Super admin only.
 */

import type { RequestHandler } from '@sveltejs/kit';
import { z } from 'zod';
import { requireRoleApi, requireSuperAdmin } from '$lib/server/guards.js';
import { AdminUsers, PolicyAuditLogs } from '$lib/database/mongo.js';
import { ObjectId } from 'mongodb';
import {
	apiOk,
	apiError,
	apiServerError,
	apiValidationError,
	parseJsonBody
} from '$lib/server/apiResponse.js';

// Partial-update PATCH — every field optional, but if `permissions` is provided
// each sub-flag must be a real boolean (no truthy strings sneaking through).
const patchRequestSchema = z.object({
	permissions: z
		.object({
			user_management: z.boolean().optional(),
			rule_authoring: z.boolean().optional(),
			system_settings: z.boolean().optional()
		})
		.optional(),
	is_active: z.boolean().optional()
});

export const PATCH: RequestHandler = async ({ request, locals, params }) => {
	const denied = requireRoleApi(locals, 'admin');
	if (denied) return denied;
	const superDenied = requireSuperAdmin(locals);
	if (superDenied) return superDenied;

	const adminId = params.admin_id;
	if (!adminId || !ObjectId.isValid(adminId)) {
		return apiError('Invalid admin ID', 400);
	}

	const parsed = await parseJsonBody<Record<string, unknown>>(request);
	if (!parsed.ok) return parsed.response;
	const validation = patchRequestSchema.safeParse(parsed.data);
	if (!validation.success) {
		return apiValidationError('Invalid body', validation.error.flatten());
	}
	const { permissions, is_active } = validation.data;

	try {
		const adminDoc = await AdminUsers.findOne({ _id: new ObjectId(adminId) });
		if (!adminDoc) {
			return apiError('Admin not found', 404);
		}

		// Self-protection: cannot deactivate yourself
		if (is_active === false && adminDoc._id.toString() === locals.user!.id) {
			return apiError('Cannot deactivate your own account');
		}

		const setFields: Record<string, any> = {
			updated_at: new Date()
		};

		if (permissions !== undefined) {
			if (permissions.user_management !== undefined) {
				setFields['permissions.user_management'] = permissions.user_management === true;
			}
			if (permissions.rule_authoring !== undefined) {
				setFields['permissions.rule_authoring'] = permissions.rule_authoring === true;
			}
			if (permissions.system_settings !== undefined) {
				setFields['permissions.system_settings'] = permissions.system_settings === true;
			}
		}

		if (is_active !== undefined) {
			setFields.is_active = is_active === true;
		}

		await AdminUsers.updateOne({ _id: new ObjectId(adminId) }, { $set: setFields });

		// Audit log
		await PolicyAuditLogs.insertOne({
			target_type: 'lender' as const,
			target_id: adminId,
			action: 'lender_updated' as const,
			actor_id: locals.user!.id,
			actor_name: locals.user!.name,
			actor_role: 'admin' as const,
			details: {
				event: 'admin_updated',
				admin_name: adminDoc.name,
				changes: { permissions, is_active }
			},
			created_at: new Date()
		} as any);

		return apiOk();
	} catch (err) {
		return apiServerError(err, 'Failed to update admin');
	}
};
