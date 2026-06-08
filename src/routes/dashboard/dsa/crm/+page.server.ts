/**
 * CRM Dashboard — Server Load
 * ══════════════════════════════════════════════════════════════════
 * Loads CRM data (pipeline, source analysis, communication log,
 * metrics) directly from MongoDB for the authenticated DSA.
 * ══════════════════════════════════════════════════════════════════
 */

import type { PageServerLoad } from './$types';
import { Cases, TimelineEvents, Leads, Sources, CRMLenders } from '$lib/database/mongo';
import type { Case, CaseStage } from '$lib/types/case';
import type { TimelineEventType } from '$lib/types/timeline';
import { DEMO_USER_ID } from '$lib/services/jwtService';
import { getDemoCRMData } from '$lib/server/demoDataLoaders';
import { resolveEffectiveDsaId } from '$lib/server/caseHelpers';
import { requireRole } from '$lib/server/guards';
import logger from '$lib/server/logger.js';

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

const STAGE_COLORS: Record<string, string> = {
	intake: 'var(--ddsa-primary-300)',
	profiling: 'var(--ddsa-primary-400)',
	file_building: 'var(--ddsa-primary-500)',
	submitted: 'var(--ddsa-primary-600)',
	processing: 'var(--ddsa-primary-700)',
	query: 'var(--ddsa-primary-800)',
	sanctioned: 'var(--ddsa-secondary-500)',
	disbursed: 'var(--ddsa-secondary-600)',
	closed: '#6b7280',
	rejected: '#9ca3af',
	dropped: '#9ca3af'
};

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
	color: string;
	cases: CaseSummary[];
}

interface SourceBreakdownItem {
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
// EMPTY RESPONSE SHAPE
// ============================================================================

const emptyResponse = {
	pipeline: ALL_STAGES.map((stage) => ({
		stage,
		label: STAGE_LABELS[stage] || stage,
		count: 0,
		total_amount: 0,
		color: STAGE_COLORS[stage] || '#94a3b8',
		cases: [] as CaseSummary[]
	})) as PipelineStage[],
	sourceBreakdown: [] as SourceBreakdownItem[],
	communicationLog: [] as CommunicationLogEntry[],
	metrics: {
		total_cases: 0,
		active_cases: 0,
		conversion_rate: 0,
		avg_days_to_sanction: 0,
		total_sanctioned_amount: 0,
		this_month_cases: 0,
		this_month_sanctioned: 0
	} as CRMMetrics,
	crmCounts: { leads: 0, sources: 0, lenders: 0 }
};

// ============================================================================
// MAIN LOAD FUNCTION
// ============================================================================

export const load: PageServerLoad = async ({ parent, locals }) => {
	requireRole(locals, 'dsa');
	const parentData = await parent();
	const user = parentData.user;

	// ── Demo mode: return in-memory data, skip MongoDB ───────────
	if (user?.id === DEMO_USER_ID) {
		return getDemoCRMData();
	}

	if (!user?.id) {
		return emptyResponse;
	}

	try {
		// ── Step 1: Resolve DSA _id (team-aware) ────────────────────
		const dsaResult = await resolveEffectiveDsaId(locals);
		if (!dsaResult.ok) {
			return emptyResponse;
		}
		const dsaId = dsaResult.dsaId;

		// ── Step 2: Load all cases for this DSA (projected — excludes heavy blobs) ──
		// INTERIM SAFETY CAP — 5,000 most-recent cases.
		// Prevents heap pressure / OOM for DSAs with massive case histories.
		// Typical DSAs today have <500 cases.
		//
		// TODO (planned, dedicated session): replace with proper case archive
		// system. Cases will get `is_archived` + `archived_at` fields; daily
		// cron auto-archives anything older than the DSA's threshold (default
		// 12 months, user-configurable 2–12 months; absolute hard cap 5–6
		// months for forced auto-archive in v1). All CRM/Cases queries will
		// filter `is_archived: false` by default with an opt-in archived view
		// + restore action. Once the archive feature ships this `.limit()`
		// becomes obsolete and should be removed.
		const CASE_FETCH_LIMIT = 5000;
		const allCases = await Cases.find(
			{ dsa_id: dsaId },
			{
				projection: {
					// Exclude heavy nested fields not needed for CRM view
					'lender_applications.document_checklist': 0,
					'lender_applications.file_config': 0,
					'lender_applications.file_snapshots': 0,
					'lender_applications.eligibility_snapshot': 0,
					'lender_applications.offer_details': 0,
					'lender_applications.payout_info': 0,
					'lender_applications.lender_tracking': 0,
					'lender_applications.queries': 0,
					lender_selections: 0,
					form_snapshot_version: 0,
					form_snapshot_hash: 0,
					results_snapshot_version: 0,
					results_snapshot_hash: 0,
					notes: 0,
					optional_contact: 0
				}
			}
		)
			.sort({ created_at: -1 })
			.limit(CASE_FETCH_LIMIT)
			.toArray();

		if (allCases.length === 0) {
			return emptyResponse;
		}

		const now = new Date();
		const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

		// ── Step 3: Pipeline — Group cases by stage ──────────────────
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
				color: STAGE_COLORS[stage] || '#94a3b8',
				cases: cases.map(buildCaseSummary)
			};
		});

		// ── Step 4: Source Breakdown ─────────────────────────────────
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

		const sourceBreakdown: SourceBreakdownItem[] = Object.entries(sourceGroups)
			.map(([source_type, data]) => ({
				source_type,
				count: data.total,
				sanctioned_count: data.sanctioned,
				conversion_rate: data.total > 0 ? Math.round((data.sanctioned / data.total) * 100) : 0
			}))
			.sort((a, b) => b.count - a.count);

		// ── Step 5: Communication Log ────────────────────────────────
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
				.limit(50)
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

		// ── Step 6: Metrics ─────────────────────────────────────────
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
		let sanctionComputed = 0;
		for (const c of sanctionedCases) {
			const created = new Date(c.created_at);
			const sanctionTransition = c.stage_history.find((t) => t.to === 'sanctioned');
			if (sanctionTransition) {
				const sanctionDate = new Date(sanctionTransition.timestamp);
				const days = Math.floor(
					(sanctionDate.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
				);
				if (days >= 0) {
					totalDaysToSanction += days;
					sanctionComputed++;
				}
			}
		}
		const avgDaysToSanction =
			sanctionComputed > 0 ? Math.round(totalDaysToSanction / sanctionComputed) : 0;

		// This month
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

		// ── CRM Expansion counts ─────────────────────────────────
		const [leadCount, sourceCount, lenderCount] = await Promise.all([
			Leads.countDocuments({ dsa_id: dsaId, is_archived: false }),
			Sources.countDocuments({ dsa_id: dsaId, is_active: true }),
			CRMLenders.countDocuments({ dsa_id: dsaId, is_active: true })
		]);

		return {
			pipeline,
			sourceBreakdown,
			communicationLog,
			metrics,
			crmCounts: { leads: leadCount, sources: sourceCount, lenders: lenderCount }
		};
	} catch (error) {
		logger.error({ err: error }, 'CRM dashboard load error');
		return emptyResponse;
	}
};
