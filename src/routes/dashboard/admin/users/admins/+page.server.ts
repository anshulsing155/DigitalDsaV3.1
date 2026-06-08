/**
 * Admin Management Page — Server Load
 * ══════════════════════════════════════════════════════════════════
 * Lists all admin users. Super admin only.
 */

import type { PageServerLoad } from './$types';
import { requireRole, requireSuperAdminPage } from '$lib/server/guards.js';
import { AdminUsers } from '$lib/database/mongo.js';

export const load: PageServerLoad = async ({ locals }) => {
	requireRole(locals, 'admin');
	requireSuperAdminPage(locals);

	const admins = await AdminUsers.find({})
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

	return {
		admins: admins.map((a) => ({
			_id: a._id.toString(),
			name: a.name,
			mobileNumber: a.mobileNumber,
			email: a.email || '',
			permissions: a.permissions,
			is_super_admin: a.is_super_admin === true,
			is_active: a.is_active,
			last_login: a.last_login?.toISOString() ?? null,
			lastActiveAt: a.lastActiveAt?.toISOString() ?? null,
			created_at: a.created_at.toISOString()
		})),
		currentAdminId: locals.user!.id
	};
};
