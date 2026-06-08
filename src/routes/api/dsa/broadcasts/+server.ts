/**
 * GET /api/dsa/broadcasts — Fetch RM broadcasts targeting this DSA
 * ═══════════════════════════════════════════════════════════════════
 * Phase 6.18: DSA-side RM content tags/broadcasts
 */

import type { RequestHandler } from './$types';
import { requireRoleApi } from '$lib/server/guards.js';
import { apiOk, apiError, apiServerError } from '$lib/server/apiResponse.js';
import { RMBroadcasts } from '$lib/database/mongo.js';
import { ObjectId } from 'mongodb';
import { DEMO_USER_ID } from '$lib/services/jwtService.js';

export const GET: RequestHandler = async ({ locals }) => {
	const denied = requireRoleApi(locals, 'dsa');
	if (denied) return denied;

	const user = locals.user!;

	// Demo users get empty broadcasts
	if (user.id === DEMO_USER_ID) {
		return apiOk([]);
	}

	let dsaOid: ObjectId;
	try {
		dsaOid = new ObjectId(user.id);
	} catch {
		return apiError('Invalid user ID', 400);
	}

	try {
		// Find broadcasts where this DSA is a target
		const now = new Date();
		const broadcasts = await RMBroadcasts.find({
			target_dsa_ids: dsaOid,
			$or: [
				{ expires_at: { $exists: false } },
				{ expires_at: { $eq: null as unknown as Date } },
				{ expires_at: { $gt: now } }
			]
		})
			.sort({ created_at: -1 })
			.limit(20)
			.toArray();

		// Mark as read
		const unreadIds = broadcasts
			.filter((b) => !b.read_by.some((r) => r.toString() === dsaOid.toString()))
			.map((b) => b._id!);

		if (unreadIds.length > 0) {
			await RMBroadcasts.updateMany(
				{ _id: { $in: unreadIds } },
				{ $addToSet: { read_by: dsaOid } as any }
			);
		}

		const serialized = broadcasts.map((b) => ({
			_id: b._id?.toString(),
			title: b.title,
			body: b.body,
			rm_name: b.rm_name,
			lender_name: b.lender_name,
			is_read: b.read_by.some((r) => r.toString() === dsaOid.toString()),
			created_at:
				b.created_at instanceof Date
					? b.created_at.toISOString()
					: new Date(b.created_at).toISOString()
		}));

		return apiOk(serialized);
	} catch (error) {
		return apiServerError(error, 'Failed to load broadcasts');
	}
};
