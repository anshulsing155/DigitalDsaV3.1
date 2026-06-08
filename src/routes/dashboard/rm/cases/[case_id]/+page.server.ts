/**
 * RM Case Detail — +page.server.ts
 * ═══════════════════════════════════════════════════════════════════
 * Read-only case detail view for RMs. Loads case data, existing
 * accuracy ratings, and recent timeline events.
 *
 * Auth: RM must have a CommunicationThread for this case.
 * ═══════════════════════════════════════════════════════════════════
 */

import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import {
	rmApplications,
	Cases,
	CommunicationThreads,
	AccuracyRatings,
	TimelineEvents
} from '$lib/database/mongo';
import { ObjectId } from 'mongodb';
import { getLenderNameFromDomain } from '$lib/config/lenderDomains.js';

// ── Stage labels for display ─────────────────────────────────
const STAGE_LABELS: Record<string, string> = {
	intake: 'Intake',
	profiling: 'Profiling',
	file_building: 'File Building',
	submitted: 'Submitted',
	processing: 'Processing',
	query: 'Query',
	sanctioned: 'Sanctioned',
	disbursed: 'Disbursed',
	rejected: 'Rejected',
	dropped: 'Dropped',
	closed: 'Closed'
};

// ── Safe date serialization ──────────────────────────────────
function toISO(date: Date | string | undefined | null): string {
	if (!date) return '';
	try {
		const d = date instanceof Date ? date : new Date(date);
		return d.toISOString();
	} catch {
		return '';
	}
}

export const load: PageServerLoad = async ({ params, parent }) => {
	const parentData = await parent();
	const user = parentData.user;
	const caseId = params.case_id;

	if (!user?.id) {
		throw error(401, 'Authentication required');
	}

	// ── Step 1: Resolve RM ──────────────────────────────────
	let rmDoc;
	try {
		rmDoc = await rmApplications.findOne({ _id: new ObjectId(user.id) });
	} catch {
		// ObjectId parse failed — try mobile fallback
		rmDoc = await rmApplications.findOne({
			mobileNumber: { $in: [Number(user.mobileNumber), user.mobileNumber] } as any
		});
	}

	if (!rmDoc?._id) {
		throw error(404, 'RM profile not found');
	}

	const rmId = rmDoc._id;
	const officialEmail = rmDoc.rmOfficialEmail || (rmDoc as any).officialEmail || '';
	const rmBankName = rmDoc.bankName || getLenderNameFromDomain(officialEmail) || '';

	// ── Step 2: Auth — verify CommunicationThread exists ────
	const thread = await CommunicationThreads.findOne({
		rm_id: rmId,
		case_id: caseId
	});

	if (!thread) {
		throw error(403, 'Access denied: this case has not been shared with you');
	}

	const dsaName = thread.dsa_name || '';

	// ── Step 3: Load the Case document (use dsa_id from thread for compound index)
	const caseDoc = await Cases.findOne({ case_id: caseId, dsa_id: thread.dsa_id });

	if (!caseDoc) {
		throw error(404, 'Case not found');
	}

	// ── Step 4: Load existing AccuracyRatings for this RM + case ──
	const ratingsRaw = await AccuracyRatings.find({
		rm_id: rmId,
		case_id: caseId
	}).toArray();

	// Build a lookup map: lender_app_id -> rating
	const existingRatings: Record<
		string,
		{
			rating: number;
			category: string;
			comment?: string;
			created_at: string;
		}
	> = {};

	for (const r of ratingsRaw) {
		existingRatings[r.lender_app_id] = {
			rating: r.rating,
			category: r.category,
			comment: r.comment,
			created_at: toISO(r.created_at)
		};
	}

	// ── Step 5: Load recent timeline events (limit 10) ──────
	const timelineRaw = await TimelineEvents.find({ case_id: caseId })
		.sort({ created_at: -1 })
		.limit(10)
		.toArray();

	const recentTimeline = timelineRaw.map((ev) => ({
		event_type: ev.event_type,
		description: ev.description,
		created_at: toISO(ev.created_at),
		metadata: ev.metadata || {}
	}));

	// ── Step 6: Serialize case data ─────────────────────────
	const lenderApplications = caseDoc.lender_applications.map((la) => {
		// Document checklist summary
		const docTotal = la.document_checklist.length;
		const docCompleted = la.document_checklist.filter(
			(d) => d.status === 'uploaded' || d.status === 'received' || d.status === 'not_applicable'
		).length;

		// Open queries count
		const openQueries = la.queries.filter((q) => q.status === 'open').length;
		const totalQueries = la.queries.length;

		// Serialize queries
		const queries = la.queries.map((q) => ({
			query_id: q.query_id,
			query_text: q.query_text,
			category: q.category,
			status: q.status,
			raised_at: toISO(q.raised_at),
			deadline: q.deadline ? toISO(q.deadline) : undefined,
			days_open: q.days_open,
			response: q.response
				? {
						text: q.response.text,
						responded_at: toISO(q.response.responded_at)
					}
				: undefined
		}));

		return {
			lender_application_id: la.lender_application_id,
			lender_id: la.lender_id,
			lender_name: la.lender_name,
			status: la.status,
			eligibility_snapshot: la.eligibility_snapshot
				? {
						traffic_light: la.eligibility_snapshot.traffic_light,
						message: la.eligibility_snapshot.message,
						computed_at: toISO(la.eligibility_snapshot.computed_at)
					}
				: null,
			document_summary: {
				total: docTotal,
				completed: docCompleted,
				percent: docTotal > 0 ? Math.round((docCompleted / docTotal) * 100) : 0
			},
			open_queries: openQueries,
			total_queries: totalQueries,
			queries,
			sanction: la.sanction
				? {
						amount: la.sanction.amount,
						roi: la.sanction.roi,
						tenure_months: la.sanction.tenure_months,
						sanction_date: la.sanction.sanction_date ? toISO(la.sanction.sanction_date) : undefined,
						conditions: la.sanction.conditions || []
					}
				: null,
			created_at: toISO(la.created_at),
			updated_at: toISO(la.updated_at)
		};
	});

	const caseData = {
		case_id: caseDoc.case_id,
		label: caseDoc.label,
		stage: caseDoc.stage,
		stage_label: STAGE_LABELS[caseDoc.stage] || caseDoc.stage,
		loan: {
			type: caseDoc.loan.type,
			amount_required: caseDoc.loan.amount_required,
			tenure_years: caseDoc.loan.tenure_years,
			purpose: caseDoc.loan.purpose
		},
		lender_applications: lenderApplications,
		optional_contact: caseDoc.optional_contact || null,
		created_at: toISO(caseDoc.created_at),
		updated_at: toISO(caseDoc.updated_at),
		is_sample: caseDoc.is_sample,
		dsa_name: dsaName
	};

	return {
		caseData,
		existingRatings,
		recentTimeline,
		rmBankName
	};
};
