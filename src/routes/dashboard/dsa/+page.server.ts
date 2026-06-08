import type { PageServerLoad } from './$types';
import { Cases, RMContacts, TimelineEvents, DsaApplications, FormSnapshots } from '$lib/database/mongo';
import type { Case, CaseStage } from '$lib/types/case';
import { DEMO_USER_ID } from '$lib/services/jwtService';
import { getDemoDashboardData } from '$lib/server/demoDataLoaders';
import { resolveEffectiveDsaId } from '$lib/server/caseHelpers';
import { resolveSnapshotPayload } from '$lib/server/csfle/index.js';
import logger from '$lib/server/logger.js';
import {
	computeAttentionItems,
	STAGE_LABELS,
	MAX_ATTENTION_ITEMS,
	type AttentionItem
} from '$lib/utils/dsaAttentionItems';

// ============================================================================
// STAGE ORDERING & LABELS (pipeline display order)
// ============================================================================

const PIPELINE_STAGES: CaseStage[] = [
	'intake',
	'profiling',
	'file_building',
	'submitted',
	'processing',
	'sanctioned',
	'disbursed'
];

// STAGE_LABELS — single source of truth in $lib/utils/dsaAttentionItems
// (imported above). The local duplicate was removed in C.8.

const STAGE_COLORS: Record<CaseStage, string> = {
	// Amber for quota_blocked — signals "waiting" without negative connotation
	// (DSA's work is preserved; just waiting for upgrade or cycle reset).
	quota_blocked: '#f59e0b',
	intake: 'var(--ddsa-primary-300)',
	profiling: 'var(--ddsa-primary-400)',
	file_building: 'var(--ddsa-primary-500)',
	submitted: 'var(--ddsa-primary-600)',
	processing: 'var(--ddsa-primary-700)',
	query: 'var(--ddsa-primary-800)',
	sanctioned: 'var(--ddsa-secondary-500)',
	disbursed: 'var(--ddsa-secondary-600)',
	rejected: '#9ca3af',
	dropped: '#9ca3af',
	closed: '#6b7280'
};

// ============================================================================
// HELPER: Compute attention-requiring cases
// ============================================================================

// Legacy local computeAttentionItems + constants moved to
// $lib/utils/dsaAttentionItems for C.8 testability and case-level dedup
// (pre-fix: 5 lenders with open queries on one case produced 5 identical
// rows; now: one item per case+type, summarised count + worst-pending
// days). AttentionItem + STAGE_LABELS + MAX_ATTENTION_ITEMS imported above.

// ============================================================================
// MAIN LOAD FUNCTION
// ============================================================================

export const load: PageServerLoad = async ({ parent, locals }) => {
	const parentData = await parent();
	const user = parentData.user;

	// \u2500\u2500 Demo mode: return in-memory data, skip MongoDB \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
	if (user?.id === DEMO_USER_ID) {
		return getDemoDashboardData();
	}

	// Default empty response shape
	const emptyResponse = {
		dsaProfile: null as {
			name: string;
			firmName?: string;
			city?: string;
			dsaCode?: string;
			businessType?: string;
			onboarding_v2_completed?: boolean;
		} | null,
		stats: {
			totalCases: 0,
			activeCases: 0,
			filesSubmittedThisMonth: 0,
			filesSubmittedPrev: 0,
			sanctionedThisMonth: { count: 0, amount: 0 },
			sanctionedPrev: { count: 0, amount: 0 },
			avgProcessingDays: 0
		},
		pipeline: PIPELINE_STAGES.map((stage) => ({
			stage,
			label: STAGE_LABELS[stage],
			count: 0,
			color: STAGE_COLORS[stage]
		})),
		attentionItems: [] as AttentionItem[],
		recentCases: [] as Array<{
			case_id: string;
			label: string;
			loan_type: string;
			stage: CaseStage;
			stage_label: string;
			lenders: string[];
			updated_at: string;
			is_sample: boolean;
		}>,
		recentActivity: [] as Array<{
			event_type: string;
			description: string;
			created_at: string;
			case_id: string;
		}>,
		rmContacts: [] as Array<{
			rm_name: string;
			lender_name: string;
			phone?: string;
			whatsapp?: string;
			designation?: string;
		}>,
		lastUpdatedAt: new Date().toISOString(),
		hasCases: false,
		hasRealCases: false,
		hasSampleCases: false
	};

	if (!user?.id) {
		return emptyResponse;
	}

	try {
		// \u2500\u2500 Step 1: Resolve DSA profile (team-aware) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
		const dsaResult = await resolveEffectiveDsaId(locals);
		if (!dsaResult.ok) {
			return emptyResponse;
		}
		const dsaId = dsaResult.dsaId;

		// Month boundaries — computed here so they can be referenced both by
		// the stats aggregation pipeline (below) and by the attention-item /
		// derived-field consumers further down.
		const now = new Date();
		const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
		const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

		// PERF-3B.2: the four queries below only depend on `dsaId`; dispatch
		// them concurrently. The stats facet replaces the legacy in-memory
		// loops over `allCases` that computed files-submitted / sanctioned /
		// avg-processing-days / active-stage counts — that work now runs in
		// MongoDB in a single round-trip instead of being a pure JS reduce.
		type StageGroup = { _id: CaseStage; count: number };
		type SampleSplit = { _id: boolean | null; count: number };
		type FilesSubmittedFacet = { thisMonth: number; prevMonth: number };
		type SanctionedFacet = {
			thisMonthCount: number;
			thisMonthAmount: number;
			prevMonthCount: number;
			prevMonthAmount: number;
		};
		type StatsFacet = {
			total: { count: number }[];
			active: { count: number }[];
			sampleSplit: SampleSplit[];
			activeStageCounts: StageGroup[];
			filesSubmitted: FilesSubmittedFacet[];
			sanctioned: SanctionedFacet[];
			avgProcessing: { avg: number }[];
		};

		const TERMINAL_STAGES: CaseStage[] = ['closed', 'dropped', 'rejected'];
		const COMPLETED_STAGES: CaseStage[] = ['sanctioned', 'disbursed'];
		const MS_PER_DAY = 1000 * 60 * 60 * 24;

		const [dsaDoc, allCases, rmContactDocs, statsResult] = await Promise.all([
			// DSA doc for dashboard header
			DsaApplications.findOne(
				{ _id: dsaId },
				{
					projection: {
						name: 1,
						businessType: 1,
						lenderName: 1,
						workingCity: 1,
						city: 1,
						dsaCode: 1,
						onboarding_v2_completed: 1
					}
				}
			),
			// All cases — still needed for computeAttentionItems (queries,
			// document_checklist, stage_history) and for recent-case / timeline
			// derivation. Stats projections that this load previously fed are
			// now served by the parallel aggregation, not iterated in JS.
			Cases.find(
				{ dsa_id: dsaId },
				{
					projection: {
						_id: 1,
						case_id: 1,
						label: 1,
						stage: 1,
						stage_history: 1,
						created_at: 1,
						updated_at: 1,
						is_archived: 1,
						is_sample: 1,
						loan: 1,
						source: 1,
						// lender_applications subfields that computeAttentionItems
						// and recentCases touch. status_history / sanction are no
						// longer read here — the aggregation below owns them.
						'lender_applications.lender_name': 1,
						'lender_applications.status': 1,
						'lender_applications.queries': 1,
						'lender_applications.document_checklist': 1
					}
				}
			).toArray(),
			// RM contacts (moved from Step 9 — only needs dsaId)
			RMContacts.find(
				{ contributed_by: dsaId, is_active: true },
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
				.sort({ last_confirmed_at: -1 })
				.limit(3)
				.toArray(),
			// Stats aggregation — all numeric dashboard metrics in one round-trip
			Cases.aggregate<StatsFacet>([
				{ $match: { dsa_id: dsaId } },
				{
					$facet: {
						total: [{ $count: 'count' }],
						active: [
							{
								$match: {
									is_archived: { $in: [false, null] },
									stage: { $nin: TERMINAL_STAGES }
								}
							},
							{ $count: 'count' }
						],
						sampleSplit: [
							{
								$group: {
									_id: { $ifNull: ['$is_sample', false] },
									count: { $sum: 1 }
								}
							}
						],
						activeStageCounts: [
							{
								$match: {
									is_archived: { $in: [false, null] },
									stage: { $nin: TERMINAL_STAGES }
								}
							},
							{ $group: { _id: '$stage', count: { $sum: 1 } } }
						],
						filesSubmitted: [
							{ $unwind: '$lender_applications' },
							{ $unwind: '$lender_applications.status_history' },
							{ $match: { 'lender_applications.status_history.to': 'submitted' } },
							{
								$group: {
									_id: null,
									thisMonth: {
										$sum: {
											$cond: [
												{
													$gte: [
														'$lender_applications.status_history.timestamp',
														monthStart
													]
												},
												1,
												0
											]
										}
									},
									prevMonth: {
										$sum: {
											$cond: [
												{
													$and: [
														{
															$gte: [
																'$lender_applications.status_history.timestamp',
																previousMonthStart
															]
														},
														{
															$lt: [
																'$lender_applications.status_history.timestamp',
																monthStart
															]
														}
													]
												},
												1,
												0
											]
										}
									}
								}
							}
						],
						sanctioned: [
							{ $unwind: '$lender_applications' },
							{
								$match: {
									'lender_applications.status': { $in: ['sanctioned', 'disbursed'] },
									'lender_applications.sanction.sanction_date': { $ne: null }
								}
							},
							{
								$group: {
									_id: null,
									thisMonthCount: {
										$sum: {
											$cond: [
												{
													$gte: ['$lender_applications.sanction.sanction_date', monthStart]
												},
												1,
												0
											]
										}
									},
									thisMonthAmount: {
										$sum: {
											$cond: [
												{
													$gte: ['$lender_applications.sanction.sanction_date', monthStart]
												},
												{ $ifNull: ['$lender_applications.sanction.amount', 0] },
												0
											]
										}
									},
									prevMonthCount: {
										$sum: {
											$cond: [
												{
													$and: [
														{
															$gte: [
																'$lender_applications.sanction.sanction_date',
																previousMonthStart
															]
														},
														{
															$lt: [
																'$lender_applications.sanction.sanction_date',
																monthStart
															]
														}
													]
												},
												1,
												0
											]
										}
									},
									prevMonthAmount: {
										$sum: {
											$cond: [
												{
													$and: [
														{
															$gte: [
																'$lender_applications.sanction.sanction_date',
																previousMonthStart
															]
														},
														{
															$lt: [
																'$lender_applications.sanction.sanction_date',
																monthStart
															]
														}
													]
												},
												{ $ifNull: ['$lender_applications.sanction.amount', 0] },
												0
											]
										}
									}
								}
							}
						],
						avgProcessing: [
							{ $match: { stage: { $in: COMPLETED_STAGES } } },
							{
								$project: {
									processingDays: {
										$floor: {
											$divide: [
												{
													$subtract: [
														{
															$ifNull: [
																{ $arrayElemAt: ['$stage_history.timestamp', -1] },
																'$updated_at'
															]
														},
														'$created_at'
													]
												},
												MS_PER_DAY
											]
										}
									}
								}
							},
							{ $match: { processingDays: { $gte: 0 } } },
							{ $group: { _id: null, avg: { $avg: '$processingDays' } } }
						]
					}
				}
			]).toArray()
		]);

		const stats: StatsFacet = statsResult[0] ?? {
			total: [],
			active: [],
			sampleSplit: [],
			activeStageCounts: [],
			filesSubmitted: [],
			sanctioned: [],
			avgProcessing: []
		};

		if (!dsaDoc) {
			return emptyResponse;
		}
		const dsaProfile = {
			name: dsaDoc.name || user.name || '',
			firmName: dsaDoc.businessType === 'Individual' ? undefined : dsaDoc.lenderName,
			city: dsaDoc.workingCity || dsaDoc.city || '',
			dsaCode: dsaDoc.dsaCode || '',
			businessType: dsaDoc.businessType || '',
			onboarding_v2_completed: (dsaDoc as any).onboarding_v2_completed ?? false
		};

		if (allCases.length === 0) {
			return {
				...emptyResponse,
				dsaProfile
			};
		}

		// \u2500\u2500 Step 3: Unpack stats facet \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
		const totalCases = stats.total[0]?.count ?? 0;
		const activeCasesCount = stats.active[0]?.count ?? 0;
		const hasRealCases =
			(stats.sampleSplit.find((s) => s._id === false || s._id === null)?.count ?? 0) > 0;
		const hasSampleCases = (stats.sampleSplit.find((s) => s._id === true)?.count ?? 0) > 0;

		const filesSubmittedThisMonth = stats.filesSubmitted[0]?.thisMonth ?? 0;
		const filesSubmittedPrev = stats.filesSubmitted[0]?.prevMonth ?? 0;
		const sanctionedCount = stats.sanctioned[0]?.thisMonthCount ?? 0;
		const sanctionedAmount = stats.sanctioned[0]?.thisMonthAmount ?? 0;
		const sanctionedPrevCount = stats.sanctioned[0]?.prevMonthCount ?? 0;
		const sanctionedPrevAmount = stats.sanctioned[0]?.prevMonthAmount ?? 0;
		const avgProcessingDays = stats.avgProcessing[0]?.avg
			? Math.round(stats.avgProcessing[0].avg)
			: 0;

		// \u2500\u2500 Step 4: Pipeline counts (from aggregation buckets) \u2500\u2500\u2500\u2500\u2500\u2500
		// Preserve the legacy UI semantic where "query" stage rolls into
		// "processing" for pipeline display.
		const stageCountMap: Record<string, number> = {};
		for (const sc of stats.activeStageCounts) stageCountMap[sc._id] = sc.count;
		if (stageCountMap['query']) {
			stageCountMap['processing'] = (stageCountMap['processing'] || 0) + stageCountMap['query'];
		}

		const pipeline = PIPELINE_STAGES.map((stage) => ({
			stage,
			label: STAGE_LABELS[stage],
			count: stageCountMap[stage] || 0,
			color: STAGE_COLORS[stage]
		}));

		// \u2500\u2500 Step 6: Attention items \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
		const attentionItems = computeAttentionItems(allCases);

		// B.4 — enrich attention rows with the primary applicant FULL name so
		// they're distinguishable (the stored label is name-free). Bounded to the
		// ≤MAX_ATTENTION_ITEMS cases; decrypt the snapshot (dev CSFLE-off = passthrough).
		const attnIds = [...new Set(attentionItems.map((i) => i.case_id))];
		if (attnIds.length > 0) {
			const snaps = await FormSnapshots.find({ case_id: { $in: attnIds } })
				.sort({ version: -1 })
				.toArray();
			const nameByCase = new Map<string, string>();
			for (const s of snaps) {
				if (nameByCase.has(s.case_id)) continue;
				try {
					const payload = (await resolveSnapshotPayload(s)) as Record<string, unknown> | null;
					const applicants = Array.isArray(payload?.applicants)
						? (payload!.applicants as Record<string, unknown>[])
						: [];
					const fullName = applicants[0]?.fullName;
					if (typeof fullName === 'string') nameByCase.set(s.case_id, fullName);
				} catch {
					// leave blank — row falls back to the label
				}
			}
			for (const item of attentionItems) {
				const n = nameByCase.get(item.case_id);
				if (n) item.applicant_name = n;
			}
		}

		// \u2500\u2500 Step 7: Recent cases (last 5 by updated_at) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
		const recentCasesDocs = [...allCases]
			.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
			.slice(0, 5);

		const recentCases = recentCasesDocs.map((c) => ({
			case_id: c.case_id,
			label: c.label,
			loan_type: c.loan.type,
			stage: c.stage,
			stage_label: STAGE_LABELS[c.stage] || c.stage,
			lenders: c.lender_applications.map((la) => la.lender_name),
			updated_at: c.updated_at.toISOString
				? c.updated_at.toISOString()
				: new Date(c.updated_at).toISOString(),
			is_sample: c.is_sample
		}));

		// \u2500\u2500 Step 8: Recent timeline events (last 10) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
		const caseIds = allCases.map((c) => c.case_id);
		const timelineEvents = await TimelineEvents.find(
			{ case_id: { $in: caseIds } },
			{
				projection: {
					event_type: 1,
					description: 1,
					created_at: 1,
					case_id: 1
				}
			}
		)
			.sort({ created_at: -1 })
			.limit(10)
			.toArray();

		const recentActivity = timelineEvents.map((ev) => ({
			event_type: ev.event_type,
			description: ev.description,
			created_at: ev.created_at.toISOString
				? ev.created_at.toISOString()
				: new Date(ev.created_at).toISOString(),
			case_id: ev.case_id
		}));

		// rmContactDocs already loaded in the parallel Promise.all (Step 2)
		const rmContacts = rmContactDocs.map((rm) => ({
			rm_name: rm.rm_name,
			lender_name: rm.lender_name,
			phone: rm.phone,
			whatsapp: rm.whatsapp || rm.phone,
			designation: rm.designation
		}));

		// \u2500\u2500 Return all dashboard data \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
		return {
			dsaProfile,
			stats: {
				totalCases,
				activeCases: activeCasesCount,
				filesSubmittedThisMonth,
				filesSubmittedPrev,
				sanctionedThisMonth: { count: sanctionedCount, amount: sanctionedAmount },
				sanctionedPrev: { count: sanctionedPrevCount, amount: sanctionedPrevAmount },
				avgProcessingDays
			},
			pipeline,
			attentionItems,
			recentCases,
			recentActivity,
			rmContacts,
			lastUpdatedAt: now.toISOString(),
			hasCases: totalCases > 0,
			hasRealCases,
			hasSampleCases
		};
	} catch (error) {
		logger.error({ err: error }, 'DSA dashboard load error');
		return emptyResponse;
	}
};
