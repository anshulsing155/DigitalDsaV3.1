/**
 * Admin PMS policy review listing.
 * Default filter: status=submitted (review queue). Admin can toggle filters.
 */

import type { PageServerLoad } from './$types';
import { requireRole } from '$lib/server/guards.js';
import { PmsLenderPolicies } from '$lib/database/mongo.js';
import { LENDER_BY_ID } from '$lib/config/lenderPolicies/lenderDirectory.js';
import type { PolicyDocument } from '$lib/config/pms/policyTypes.js';

export const load: PageServerLoad = async ({ locals, url }) => {
	requireRole(locals, 'admin');

	const statusParam = url.searchParams.get('status') || 'submitted';
	const statuses: PolicyDocument['status'][] = (statusParam === 'all'
		? ['submitted', 'approved', 'approved_scheduled', 'published']
		: statusParam.split(',').filter(Boolean)) as PolicyDocument['status'][];

	const policies = (await PmsLenderPolicies.find(
		{ status: { $in: statuses } },
		{ sort: { submittedAt: -1, createdAt: -1 } }
	).toArray()) as PolicyDocument[];

	return {
		initialStatus: statusParam,
		policies: policies.map((p) => ({
			id: p._id.toString(),
			lenderId: p.lenderId,
			lenderName: LENDER_BY_ID.get(p.lenderId)?.lenderName ?? p.lenderId,
			loanProduct: p.loanProduct,
			version: p.version,
			status: p.status,
			submittedBy: p.submittedBy,
			submittedAt: p.submittedAt ? p.submittedAt.toISOString() : null,
			approvedAt: p.approvedAt ? p.approvedAt.toISOString() : null,
			scheduledPublishAt: p.scheduledPublishAt ? p.scheduledPublishAt.toISOString() : null,
			publishedAt: p.publishedAt ? p.publishedAt.toISOString() : null,
			finalScore: p.aiPipelineRun?.finalScore ?? null,
			pipelineMode: p.aiPipelineRun?.mode ?? null,
			overrideCount: p.conditionalOverrides.length,
			bankCardNoteCount: p.bankCardNotes.length,
			pendingChangeCount: (p.pendingChanges ?? []).length,
			reconciliationStatus: p.reconciliation.status
		}))
	};
};
