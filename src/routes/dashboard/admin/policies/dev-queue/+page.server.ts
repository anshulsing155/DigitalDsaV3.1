import type { PageServerLoad } from './$types';
import { requireRole } from '$lib/server/guards.js';
import { PmsLenderPolicies } from '$lib/database/mongo.js';
import { LENDER_BY_ID } from '$lib/config/lenderPolicies/lenderDirectory.js';
import type { PolicyDocument } from '$lib/config/pms/policyTypes.js';
import logger from '$lib/server/logger.js';

export interface DevQueueEntry {
	id: string;
	text: string;
	addedBy: string;
	addedAt: string;
	policyId: string;
	lenderId: string;
	lenderName: string;
	loanProduct: string;
	policyStatus: string;
	policyVersion: number;
}

export const load: PageServerLoad = async ({ locals }) => {
	requireRole(locals, 'admin');

	try {
		// Pull bankCardNotes from all non-archived policies
		const policies = (await PmsLenderPolicies.find(
			{ status: { $ne: 'archived' }, 'bankCardNotes.0': { $exists: true } },
			{
				projection: {
					_id: 1,
					lenderId: 1,
					loanProduct: 1,
					status: 1,
					version: 1,
					bankCardNotes: 1
				}
			}
		).toArray()) as PolicyDocument[];

		const entries: DevQueueEntry[] = [];

		for (const policy of policies) {
			const lenderName = LENDER_BY_ID.get(policy.lenderId)?.lenderName ?? policy.lenderId;
			for (const note of policy.bankCardNotes) {
				entries.push({
					id: note.id,
					text: note.text,
					addedBy: note.addedBy,
					addedAt: note.addedAt instanceof Date ? note.addedAt.toISOString() : String(note.addedAt),
					policyId: policy._id.toString(),
					lenderId: policy.lenderId,
					lenderName,
					loanProduct: policy.loanProduct,
					policyStatus: policy.status,
					policyVersion: policy.version
				});
			}
		}

		// Sort: published first, then by addedAt desc
		entries.sort((a, b) => {
			const statusOrder: Record<string, number> = {
				published: 0,
				submitted: 1,
				approved: 2,
				approved_scheduled: 3,
				draft: 4
			};
			const sa = statusOrder[a.policyStatus] ?? 5;
			const sb = statusOrder[b.policyStatus] ?? 5;
			if (sa !== sb) return sa - sb;
			return b.addedAt.localeCompare(a.addedAt);
		});

		// Derive unique lenders for filter
		const lenders = [
			...new Map(entries.map((e) => [e.lenderId, { lenderId: e.lenderId, lenderName: e.lenderName }])).values()
		].sort((a, b) => a.lenderName.localeCompare(b.lenderName));

		return { entries, lenders, totalPolicies: policies.length };
	} catch (err) {
		logger.error({ err }, 'Failed to load dev queue page');
		return { entries: [], lenders: [], totalPolicies: 0 };
	}
};
