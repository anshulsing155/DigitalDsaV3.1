/**
 * GET  /api/dashboard/crm
 * ══════════════════════════════════════════════════════════════════
 * Aggregates CRM data for the authenticated DSA:
 *   - Pipeline breakdown (cases grouped by stage with summaries)
 *   - Source breakdown (lead source analysis with conversion rates)
 *   - Communication log (recent communication-related timeline events)
 *   - Metrics (aggregate stats across all cases)
 * ══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from './$types';
import { Cases, TimelineEvents } from '$lib/database/mongo.js';
import { resolveDsaId } from '$lib/server/caseHelpers.js';
import { requireRoleApi } from '$lib/server/guards.js';
import { apiOk, apiError, apiServerError } from '$lib/server/apiResponse.js';
import type { Case, CaseStage } from '$lib/types/case.js';
import type { TimelineEventType } from '$lib/types/timeline.js';

// ============================================================================
// CONSTANTS
// ============================================================================

const STAGE_LABELS: Record<string, string> = {
	intake: 'Intake',
	profiling: 'Profiling',
	file_building: 'File Building',
	submitted: 'Submitted',
	processing: 'Processing',
	query: 'Query',
	sanctioned: 'Sanctioned',
	disbursed: 'Disbursed',
	closed: 'Closed',
	rejected: 'Rejected',
	dropped: 'Dropped'
};

const ALL_STAGES: CaseStage[] = [
	'intake',
	'profiling',
	'file_building',
	'submitted',
	'processing',
	'query',
	'sanctioned',
	'disbursed',
	'closed',
	'rejected',
	'dropped'
];

/** Communication-related event types for the log */
const COMMUNICATION_EVENT_TYPES: TimelineEventType[] = [
	'message_sent',
	'query_raised',
	'query_responded',
	'query_resolved',
	'note_added',
	'stage_changed',
	'lender_status_changed',
	'sanction',
	'rejection',
	'disbursement'
];

const MAX_COMMUNICATION_LOG = 50;

// ============================================================================
// TYPES
// ============================================================================

interface CaseSummary {
	case_id: string;
	label: string;
	loan_type: string;
	loan_amount: number;
	days_in_stage: number;
	lenders: string[];
}

interface PipelineStage {
	stage: string;
	label: string;
	count: number;
	total_amount: number;
	cases: CaseSummary[];
}

interface SourceBreakdown {
	source_type: string;
	count: number;
	sanctioned_count: number;
	conversion_rate: number;
}

interface CommunicationLogEntry {
	case_id: string;
	case_label: string;
	event_type: string;
	description: string;
	created_at: string;
}

interface CRMMetrics {
	total_cases: number;
	active_cases: number;
	conversion_rate: number;
	avg_days_to_sanction: number;
	total_sanctioned_amount: number;
	this_month_cases: number;
	this_month_sanctioned: number;
}

// ============================================================================
// HELPERS
// ============================================================================

function computeDaysInStage(c: Case): number {
	const now = new Date();
	if (c.stage_history.length > 0) {
		const lastTransition = c.stage_history[c.stage_history.length - 1];
		const transitionDate = new Date(lastTransition.timestamp);
		return Math.floor((now.getTime() - transitionDate.getTime()) / (1000 * 60 * 60 * 24));
	}
	const createdDate = new Date(c.created_at);
	return Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
}

function buildCaseSummary(c: Case): CaseSummary {
	return {
		case_id: c.case_id,
		label: c.label,
		loan_type: c.loan.type,
		loan_amount: c.loan.amount_required || 0,
		days_in_stage: computeDaysInStage(c),
		lenders: c.lender_applications.map((la) => la.lender_name)
	};
}

// ============================================================================
// GET HANDLER
// ============================================================================

export const GET: RequestHandler = async ({ locals }) => {
	// Auth + role guard
	const denied = requireRoleApi(locals, 'dsa');
	if (denied) return denied;

	try {
		const result = await resolveDsaId(locals);
		if (!result.ok) {
			return apiError(result.error, 404);
		}
		const dsaId = result.dsaId;

		// ── Load all cases for this DSA (projected to CRM-used fields) ──
		const allCases = await Cases.find(
			{ dsa_id: dsaId },
			{
				projection: {
					_id: 1,
					case_id: 1,
					label: 1,
					stage: 1,
					stage_history: 1,
					created_at: 1,
					is_archived: 1,
					loan: 1,
					lender_applications: 1,
					source: 1
				}
			}
		).toArray();

		const now = new Date();
		const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

		// ── 1. Pipeline: Group cases by stage ────────────────────────
		const stageGroups: Record<string, Case[]> = {};
		for (const stage of ALL_STAGES) {
			stageGroups[stage] = [];
		}
		for (const c of allCases) {
			if (!stageGroups[c.stage]) {
				stageGroups[c.stage] = [];
			}
			stageGroups[c.stage].push(c);
		}

		const pipeline: PipelineStage[] = ALL_STAGES.map((stage) => {
			const cases = stageGroups[stage] || [];
			return {
				stage,
				label: STAGE_LABELS[stage] || stage,
				count: cases.length,
				total_amount: cases.reduce((sum, c) => sum + (c.loan.amount_required || 0), 0),
				cases: cases.map(buildCaseSummary)
			};
		});

		// ── 2. Source Breakdown ──────────────────────────────────────
		const sourceGroups: Record<string, { total: number; sanctioned: number }> = {};
		for (const c of allCases) {
			const srcType = c.source?.type || 'unknown';
			if (!sourceGroups[srcType]) {
				sourceGroups[srcType] = { total: 0, sanctioned: 0 };
			}
			sourceGroups[srcType].total++;
			if (['sanctioned', 'disbursed', 'closed'].includes(c.stage)) {
				sourceGroups[srcType].sanctioned++;
			}
		}

		const sourceBreakdown: SourceBreakdown[] = Object.entries(sourceGroups)
			.map(([source_type, data]) => ({
				source_type,
				count: data.total,
				sanctioned_count: data.sanctioned,
				conversion_rate: data.total > 0 ? Math.round((data.sanctioned / data.total) * 100) : 0
			}))
			.sort((a, b) => b.count - a.count);

		// ── 3. Communication Log ────────────────────────────────────
		const caseIds = allCases.map((c) => c.case_id);
		const caseLabelMap: Record<string, string> = {};
		for (const c of allCases) {
			caseLabelMap[c.case_id] = c.label;
		}

		let communicationLog: CommunicationLogEntry[] = [];
		if (caseIds.length > 0) {
			const events = await TimelineEvents.find(
				{
					case_id: { $in: caseIds },
					event_type: { $in: COMMUNICATION_EVENT_TYPES }
				},
				{
					projection: {
						case_id: 1,
						event_type: 1,
						description: 1,
						created_at: 1
					}
				}
			)
				.sort({ created_at: -1 })
				.limit(MAX_COMMUNICATION_LOG)
				.toArray();

			communicationLog = events.map((ev) => ({
				case_id: ev.case_id,
				case_label: caseLabelMap[ev.case_id] || ev.case_id,
				event_type: ev.event_type,
				description: ev.description,
				created_at: ev.created_at.toISOString
					? ev.created_at.toISOString()
					: new Date(ev.created_at).toISOString()
			}));
		}

		// ── 4. Metrics ──────────────────────────────────────────────
		const activeCases = allCases.filter(
			(c) => !c.is_archived && !['closed', 'dropped', 'rejected'].includes(c.stage)
		);

		const sanctionedCases = allCases.filter((c) =>
			['sanctioned', 'disbursed', 'closed'].includes(c.stage)
		);

		// Total sanctioned amount
		let totalSanctionedAmount = 0;
		for (const c of allCases) {
			for (const la of c.lender_applications) {
				if ((la.status === 'sanctioned' || la.status === 'disbursed') && la.sanction?.amount) {
					totalSanctionedAmount += la.sanction.amount;
				}
			}
		}

		// Average days to sanction
		let totalDaysToSanction = 0;
		let sanctionCount = 0;
		for (const c of sanctionedCases) {
			const created = new Date(c.created_at);
			// Find the stage transition to sanctioned
			const sanctionTransition = c.stage_history.find((t) => t.to === 'sanctioned');
			if (sanctionTransition) {
				const sanctionDate = new Date(sanctionTransition.timestamp);
				const days = Math.floor(
					(sanctionDate.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
				);
				if (days >= 0) {
					totalDaysToSanction += days;
					sanctionCount++;
				}
			}
		}
		const avgDaysToSanction =
			sanctionCount > 0 ? Math.round(totalDaysToSanction / sanctionCount) : 0;

		// This month metrics
		const thisMonthCases = allCases.filter((c) => new Date(c.created_at) >= monthStart).length;

		let thisMonthSanctioned = 0;
		for (const c of allCases) {
			for (const la of c.lender_applications) {
				if (
					(la.status === 'sanctioned' || la.status === 'disbursed') &&
					la.sanction?.sanction_date &&
					new Date(la.sanction.sanction_date) >= monthStart
				) {
					thisMonthSanctioned++;
				}
			}
		}

		const conversionRate =
			allCases.length > 0 ? Math.round((sanctionedCases.length / allCases.length) * 100) : 0;

		const metrics: CRMMetrics = {
			total_cases: allCases.length,
			active_cases: activeCases.length,
			conversion_rate: conversionRate,
			avg_days_to_sanction: avgDaysToSanction,
			total_sanctioned_amount: totalSanctionedAmount,
			this_month_cases: thisMonthCases,
			this_month_sanctioned: thisMonthSanctioned
		};

		return apiOk({
			pipeline,
			sourceBreakdown,
			communicationLog,
			metrics
		});
	} catch (err) {
		return apiServerError(err, 'Failed to load CRM data');
	}
};
