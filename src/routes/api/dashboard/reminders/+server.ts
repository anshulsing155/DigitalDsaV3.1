/**
 * GET  /api/dashboard/reminders
 * ══════════════════════════════════════════════════════════════════
 * Aggregates smart reminders across ALL active (non-archived) cases
 * for the authenticated DSA. Returns max 50 reminders sorted by
 * priority (high first), then by created_at.
 * ══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from './$types';
import { Cases } from '$lib/database/mongo.js';
import { resolveDsaId } from '$lib/server/caseHelpers.js';
import { requireRoleApi } from '$lib/server/guards.js';
import { apiOk, apiError, apiServerError } from '$lib/server/apiResponse.js';
import { generateReminders } from '$lib/server/reminderEngine.js';
import type { Reminder } from '$lib/server/reminderEngine.js';

const MAX_REMINDERS = 50;

/** Priority sort weight: lower = higher priority */
const PRIORITY_WEIGHT: Record<Reminder['priority'], number> = {
	high: 0,
	medium: 1,
	low: 2
};

export const GET: RequestHandler = async ({ locals }) => {
	// Auth + role guard
	const denied = requireRoleApi(locals, 'dsa');
	if (denied) return denied;

	try {
		const result = await resolveDsaId(locals);
		if (!result.ok) {
			return apiError(result.error, 404);
		}

		// Load all active (non-archived) cases for this DSA (projected to reminder-used fields)
		const cases = await Cases.find(
			{
				dsa_id: result.dsaId,
				is_archived: { $in: [false, null] } as any
			},
			{
				projection: {
					_id: 1,
					case_id: 1,
					label: 1,
					stage: 1,
					stage_history: 1,
					is_archived: 1,
					lender_applications: 1
				}
			}
		).toArray();

		// Generate reminders for each case and aggregate
		const allReminders: Reminder[] = [];
		const now = new Date();

		for (const caseDoc of cases) {
			const caseReminders = generateReminders(caseDoc, now);
			allReminders.push(...caseReminders);
		}

		// Sort by priority (high first), then by created_at (oldest first)
		allReminders.sort((a, b) => {
			const pDiff = PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
			if (pDiff !== 0) return pDiff;
			return a.created_at.getTime() - b.created_at.getTime();
		});

		// Limit to MAX_REMINDERS
		const limited = allReminders.slice(0, MAX_REMINDERS);

		return apiOk({
			reminders: limited,
			total: allReminders.length,
			returned: limited.length,
			cases_scanned: cases.length
		});
	} catch (err) {
		return apiServerError(err, 'Failed to generate dashboard reminders');
	}
};
