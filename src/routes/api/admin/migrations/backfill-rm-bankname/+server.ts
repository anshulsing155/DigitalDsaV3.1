/**
 * POST /api/admin/migrations/backfill-rm-bankname
 * ═══════════════════════════════════════════════════════════════════
 * One-time migration: derive bankName from officialEmail/rmOfficialEmail
 * for all existing RMs that have an empty bankName field.
 * Also normalizes officialEmail → rmOfficialEmail for backward compat.
 * Admin-only endpoint.
 * ═══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from '@sveltejs/kit';
import { rmApplications } from '$lib/database/mongo.js';
import { getLenderNameFromDomain } from '$lib/config/lenderDomains.js';
import { requireRoleApi } from '$lib/server/guards.js';
import { apiOk, apiServerError } from '$lib/server/apiResponse.js';

export const POST: RequestHandler = async ({ locals }) => {
	const denied = requireRoleApi(locals, ['admin']);
	if (denied) return denied;

	try {
		// Find all RMs missing bankName but having an official email
		const rmsToFix = await rmApplications
			.find({
				$and: [
					{ $or: [{ bankName: null as any }, { bankName: '' }, { bankName: { $exists: false } }] },
					{
						$or: [
							{ officialEmail: { $exists: true, $ne: '' } },
							{ rmOfficialEmail: { $exists: true, $ne: '' } }
						]
					}
				]
			} as any)
			.toArray();

		let updated = 0;
		let skipped = 0;
		const results: Array<{ name: string; email: string; bankName: string }> = [];

		for (const rm of rmsToFix) {
			const email = (rm as any).officialEmail || rm.rmOfficialEmail || '';
			if (!email) {
				skipped++;
				continue;
			}

			const bankName = getLenderNameFromDomain(email);
			if (!bankName) {
				skipped++;
				continue;
			}

			// Update: set bankName + normalize both email fields
			await rmApplications.updateOne(
				{ _id: rm._id },
				{
					$set: {
						bankName,
						rmOfficialEmail: email,
						officialEmail: email,
						updatedAt: new Date()
					}
				}
			);
			updated++;
			results.push({ name: rm.name, email, bankName });
		}

		return apiOk({
			total_found: rmsToFix.length,
			updated,
			skipped,
			results
		});
	} catch (error) {
		return apiServerError(error, 'Migration failed');
	}
};
