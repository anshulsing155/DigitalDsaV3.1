import type { PageServerLoad } from './$types';
import { requireRole } from '$lib/server/guards.js';
import { rmApplications, RmLenderAssignments } from '$lib/database/mongo.js';
import logger from '$lib/server/logger.js';

export const load: PageServerLoad = async ({ locals }) => {
	requireRole(locals, 'admin');

	try {
		// Load all RMs with their lender assignments in parallel
		const [allRms, allAssignments] = await Promise.all([
			rmApplications
				.find(
					{},
					{
						projection: {
							_id: 1,
							name: 1,
							email: 1,
							mobileNumber: 1,
							city: 1,
							state: 1,
							onboardingCompleted: 1,
							lastActiveAt: 1,
							createdAt: 1
						}
					}
				)
				.toArray(),
			RmLenderAssignments.find({}, { projection: { rmUserId: 1, lenderId: 1, lenderName: 1, status: 1 } }).toArray()
		]);

		// Group assignments by rmUserId for fast lookup
		const assignmentsByRm = new Map<string, { lenderId: string; lenderName: string; status: string }[]>();
		for (const assignment of allAssignments) {
			const key = assignment.rmUserId;
			if (!assignmentsByRm.has(key)) assignmentsByRm.set(key, []);
			assignmentsByRm.get(key)!.push({
				lenderId: assignment.lenderId,
				lenderName: assignment.lenderName,
				status: assignment.status
			});
		}

		const rms = allRms.map((rm) => ({
			id: rm._id.toString(),
			name: rm.name || 'Unknown',
			email: rm.email || '',
			mobileNumber: String(rm.mobileNumber || ''),
			city: (rm as any).city || '',
			state: (rm as any).state || '',
			onboardingCompleted: Boolean(rm.onboardingCompleted),
			lastActiveAt: (rm as any).lastActiveAt?.toISOString?.() ?? null,
			createdAt: (rm as any).createdAt?.toISOString?.() ?? null,
			lenderAssignments: assignmentsByRm.get(rm._id.toString()) ?? []
		}));

		// Derive unique filter options from data
		const states = [...new Set(rms.map((r) => r.state).filter(Boolean))].sort();
		const cities = [...new Set(rms.map((r) => r.city).filter(Boolean))].sort();
		const lenders = [
			...new Map(
				allAssignments.map((a) => [a.lenderId, { lenderId: a.lenderId, lenderName: a.lenderName }])
			).values()
		].sort((a, b) => a.lenderName.localeCompare(b.lenderName));

		return { rms, states, cities, lenders };
	} catch (err) {
		logger.error({ err }, 'Failed to load RM management page');
		return { rms: [], states: [], cities: [], lenders: [] };
	}
};
