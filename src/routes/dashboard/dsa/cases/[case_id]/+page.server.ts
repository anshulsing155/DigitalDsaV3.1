import type { PageServerLoad } from './$types';
import { TimelineEvents, RMContacts } from '$lib/database/mongo';
import { DEMO_USER_ID } from '$lib/services/jwtService';
import { getDemoTimeline, getDemoRMContacts } from '$lib/server/demoData.js';
import logger from '$lib/server/logger.js';

// ============================================================================
// OVERVIEW PAGE LOAD — additional data for the overview tab
// ============================================================================

interface AttentionItem {
	type: 'open_query' | 'expiring_document' | 'stuck_stage';
	label: string;
	description: string;
	severity: 'warning' | 'critical';
	lender_name?: string;
}

function toISO(d: Date | string): string {
	return d instanceof Date ? d.toISOString() : new Date(d).toISOString();
}

function computeAttentionItems(caseData: any): AttentionItem[] {
	const items: AttentionItem[] = [];
	const now = new Date();

	if (['closed', 'dropped', 'rejected', 'disbursed'].includes(caseData.stage)) {
		return items;
	}

	// 1. Open queries
	for (const la of caseData.lender_applications) {
		for (const q of la.queries) {
			if (q.status === 'open') {
				const raisedAt = new Date(q.raised_at);
				const daysOpen = Math.floor((now.getTime() - raisedAt.getTime()) / (1000 * 60 * 60 * 24));
				items.push({
					type: 'open_query',
					label: `Open query from ${la.lender_name}`,
					description: `${q.query_text.substring(0, 100)}${q.query_text.length > 100 ? '...' : ''} (${daysOpen} days)`,
					severity: daysOpen >= 7 ? 'critical' : 'warning',
					lender_name: la.lender_name
				});
			}
		}
	}

	// 2. Expiring documents
	for (const la of caseData.lender_applications) {
		for (const doc of la.document_checklist) {
			if (doc.validity?.valid_until) {
				const expiry = new Date(doc.validity.valid_until);
				const daysUntilExpiry = Math.floor(
					(expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
				);
				if (daysUntilExpiry <= 15 && daysUntilExpiry >= 0) {
					items.push({
						type: 'expiring_document',
						label: `${doc.doc_name} expiring`,
						description: `Expires in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? '' : 's'} (${la.lender_name})`,
						severity: daysUntilExpiry <= 5 ? 'critical' : 'warning',
						lender_name: la.lender_name
					});
				}
			}
		}
	}

	// 3. Stuck in stage
	const stageHistory = caseData.stage_history || [];
	let daysInStage = 0;
	if (stageHistory.length > 0) {
		const lastTransition = stageHistory[stageHistory.length - 1];
		const transitionDate = new Date(lastTransition.timestamp);
		daysInStage = Math.floor((now.getTime() - transitionDate.getTime()) / (1000 * 60 * 60 * 24));
	} else {
		const createdDate = new Date(caseData.created_at);
		daysInStage = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
	}

	if (daysInStage >= 7) {
		items.push({
			type: 'stuck_stage',
			label: `Stuck in ${caseData.stage_label || caseData.stage}`,
			description: `No stage change in ${daysInStage} days`,
			severity: daysInStage >= 14 ? 'critical' : 'warning'
		});
	}

	return items;
}

export const load: PageServerLoad = async ({ parent }) => {
	const parentData = await parent();
	const caseData = parentData.caseData;
	const user = parentData.user;

	if (!caseData) {
		return {
			recentTimeline: [],
			rmContacts: [],
			attentionItems: []
		};
	}

	// ── Demo mode: return in-memory timeline + RM contacts ──────
	if (user?.id === DEMO_USER_ID) {
		const allTimeline = getDemoTimeline();
		const recentTimeline = allTimeline
			.filter((ev) => ev.case_id === caseData.case_id)
			.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
			.slice(0, 10)
			.map((ev) => ({
				event_type: ev.event_type,
				description: ev.description,
				created_at: toISO(ev.created_at),
				metadata: ev.metadata
			}));

		const lenderNames = caseData.lender_applications.map((la: any) => la.lender_name);
		const allRMs = getDemoRMContacts();
		const rmContacts = allRMs
			.filter((rm) => lenderNames.includes(rm.lender_name))
			.slice(0, 10)
			.map((rm) => ({
				rm_name: rm.rm_name,
				lender_name: rm.lender_name,
				phone: rm.phone,
				whatsapp: rm.phone,
				designation: rm.designation
			}));

		return {
			recentTimeline,
			rmContacts,
			attentionItems: computeAttentionItems(caseData)
		};
	}

	try {
		// ── Load recent timeline events (last 10) ───────────────
		const timelineEvents = await TimelineEvents.find(
			{ case_id: caseData.case_id },
			{
				projection: {
					event_type: 1,
					description: 1,
					created_at: 1,
					metadata: 1
				}
			}
		)
			.sort({ created_at: -1 })
			.limit(10)
			.toArray();

		const recentTimeline = timelineEvents.map((ev) => ({
			event_type: ev.event_type,
			description: ev.description,
			created_at: ev.created_at.toISOString
				? ev.created_at.toISOString()
				: new Date(ev.created_at).toISOString(),
			metadata: ev.metadata
		}));

		// ── Load RM contacts for lenders in this case ───────────
		const lenderNames = caseData.lender_applications.map((la: any) => la.lender_name);

		let rmContacts: Array<{
			rm_name: string;
			lender_name: string;
			phone?: string;
			whatsapp?: string;
			designation?: string;
		}> = [];

		if (lenderNames.length > 0) {
			// Load RM contacts that match any of the lenders
			const rmDocs = await RMContacts.find(
				{
					lender_name: { $in: lenderNames },
					is_active: true
				},
				{
					projection: {
						rm_name: 1,
						lender_name: 1,
						phone: 1,
						whatsapp: 1,
						designation: 1
					}
				}
			)
				.limit(10)
				.toArray();

			rmContacts = rmDocs.map((rm) => ({
				rm_name: rm.rm_name,
				lender_name: rm.lender_name,
				phone: rm.phone,
				whatsapp: rm.whatsapp || rm.phone,
				designation: rm.designation
			}));
		}

		return {
			recentTimeline,
			rmContacts,
			attentionItems: computeAttentionItems(caseData)
		};
	} catch (error) {
		logger.error({ err: error }, 'Case overview load error');
		return {
			recentTimeline: [],
			rmContacts: [],
			attentionItems: []
		};
	}
};
