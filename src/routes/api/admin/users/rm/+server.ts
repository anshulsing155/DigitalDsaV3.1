/**
 * GET/PATCH /api/admin/users/rm
 * Admin API for RM user management.
 */

import type { RequestHandler } from '@sveltejs/kit';
import { rmApplications } from '$lib/database/mongo.js';
import { requireRoleApi, requireAdminPermission } from '$lib/server/guards.js';
import { ObjectId } from 'mongodb';
import { apiOk, apiError, apiServerError, parseJsonBody } from '$lib/server/apiResponse.js';
import { getLenderNameFromDomain } from '$lib/config/lenderDomains.js';
import { escapeRegex } from '$lib/server/utils.js';
import { decryptUserPii, encryptMobileForQuery } from '$lib/server/csfle/index.js';
import { writeAuditLog } from '$lib/server/auditLog.js';

export const GET: RequestHandler = async ({ locals, url }) => {
	const denied = requireRoleApi(locals, 'admin');
	if (denied) return denied;
	const permDenied = requireAdminPermission(locals, 'user_management');
	if (permDenied) return permDenied;

	try {
		const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
		const limit = 25;
		const skip = (page - 1) * limit;
		const search = (url.searchParams.get('q') || '').trim();

		// SEC-2: same dual-match pattern as admin/users/dsa — encrypted
		// mobile added to the $in array; name regex matches plaintext only
		// (documented limitation after backfill).
		const encSearchMobile = search ? await encryptMobileForQuery(search) : null;
		const filter = search
			? {
					$or: [
						{ name: { $regex: escapeRegex(search), $options: 'i' } },
						{
							mobileNumber: {
								$in: [search, Number(search), ...(encSearchMobile ? [encSearchMobile] : [])]
							}
						}
					]
				}
			: {};

		const [docsRaw, total] = await Promise.all([
			rmApplications
				.find(filter as any)
				.project({
					name: 1,
					mobileNumber: 1,
					email: 1,
					lastActiveAt: 1,
					onboardingCompleted: 1,
					is_suspended: 1,
					bankName: 1,
					rmOfficialEmail: 1,
					officialEmail: 1,
					createdAt: 1
				})
				.sort({ lastActiveAt: -1 })
				.skip(skip)
				.limit(limit)
				.toArray(),
			rmApplications.countDocuments(filter as any)
		]);

		// SEC-2: decrypt PII per row before serializing.
		const docs = await Promise.all(docsRaw.map((d) => decryptUserPii(d)));

		return apiOk({
			users: docs
				.filter((d): d is NonNullable<typeof d> => d !== null)
				.map((d) => ({
					_id: d._id.toString(),
					name: d.name || '',
					mobileNumber: String(d.mobileNumber || ''),
					email: d.email || '',
					bankName:
						(d as any).bankName ||
						getLenderNameFromDomain(
							(d as any).rmOfficialEmail || (d as any).officialEmail || ''
						) ||
						'',
					lastActiveAt: d.lastActiveAt ? new Date(d.lastActiveAt).toISOString() : null,
					onboardingCompleted: Boolean(d.onboardingCompleted),
					is_suspended: Boolean(d.is_suspended)
				})),
			total,
			page,
			limit
		});
	} catch (err) {
		return apiServerError(err, 'Failed to fetch RM users');
	}
};

export const PATCH: RequestHandler = async ({ request, locals }) => {
	const denied = requireRoleApi(locals, 'admin');
	if (denied) return denied;
	const permDenied = requireAdminPermission(locals, 'user_management');
	if (permDenied) return permDenied;

	const parsed = await parseJsonBody<{ userId: string; is_suspended: boolean }>(request);
	if (!parsed.ok) return parsed.response;
	const { userId, is_suspended } = parsed.data;

	try {
		if (!userId || typeof is_suspended !== 'boolean') {
			return apiError('userId and is_suspended (boolean) required', 400);
		}

		const result = await rmApplications.updateOne(
			{ _id: new ObjectId(userId) },
			{ $set: { is_suspended, updatedAt: new Date() } }
		);

		if (result.matchedCount === 0) {
			return apiError('RM user not found', 404);
		}

		// C.5 — parity with DSA suspend audit.
		await writeAuditLog({
			target_type: 'user',
			target_id: userId,
			action: is_suspended ? 'user_suspended' : 'user_reactivated',
			actor_id: locals.user!.id,
			actor_name: locals.user!.name || '',
			actor_role: 'admin',
			details: { targetRole: 'rm', is_suspended }
		});

		return apiOk({ is_suspended });
	} catch (err) {
		return apiServerError(err, 'Failed to update RM user');
	}
};
