import type { PageServerLoad } from './$types';
import { Cases, FormSnapshots } from '$lib/database/mongo';
import { resolveSnapshotPayload } from '$lib/server/csfle/index.js';
import { resolveActiveAnswers } from '$lib/utils/caseLabel';
import { computeCaseTriage } from '$lib/utils/caseTriage';
import type { Case, CaseStage } from '$lib/types/case';
import { DEMO_USER_ID } from '$lib/services/jwtService';
import { getDemoCasesPageData } from '$lib/server/demoDataLoaders';
import { resolveEffectiveDsaId, loanTypeToFormRoute } from '$lib/server/caseHelpers';
import { escapeRegex } from '$lib/server/utils';
import { loanTypeLabel } from '$lib/config/loanTypeLabels';
import { getQuotaState, type QuotaState } from '$lib/server/billing/quotaState';
import logger from '$lib/server/logger.js';

// ============================================================================
// STAGE LABELS & COLORS (shared constants)
// ============================================================================

const STAGE_LABELS: Record<CaseStage, string> = {
	quota_blocked: 'Awaiting Processing',
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

const ALL_STAGES: CaseStage[] = [
	'intake',
	'profiling',
	'file_building',
	'submitted',
	'processing',
	'query',
	'sanctioned',
	'disbursed',
	'rejected',
	'dropped',
	'closed'
];

// ============================================================================
// HELPER: compute per-case derived fields
// ============================================================================

function computeCaseFields(c: Case) {
	const now = new Date();

	// Days in current stage
	let daysInCurrentStage = 0;
	if (c.stage_history.length > 0) {
		const lastTransition = c.stage_history[c.stage_history.length - 1];
		const transitionDate = new Date(lastTransition.timestamp);
		daysInCurrentStage = Math.floor(
			(now.getTime() - transitionDate.getTime()) / (1000 * 60 * 60 * 24)
		);
	} else {
		const createdDate = new Date(c.created_at);
		daysInCurrentStage = Math.floor(
			(now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
		);
	}

	// Open queries across all lender applications
	let totalOpenQueries = 0;
	for (const la of c.lender_applications) {
		for (const q of la.queries) {
			if (q.status === 'open') totalOpenQueries++;
		}
	}

	// Document completion per lender application
	const lenderSummaries = c.lender_applications.map((la) => {
		const total = la.document_checklist.length;
		const completed = la.document_checklist.filter(
			(d) => d.status === 'uploaded' || d.status === 'received' || d.status === 'not_applicable'
		).length;
		const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
		const openQueries = la.queries.filter((q) => q.status === 'open').length;

		return {
			lender_name: la.lender_name,
			status: la.status,
			document_total: total,
			document_completed: completed,
			document_completion_percent: percent,
			open_queries: openQueries
		};
	});

	// Overall document completion (average across lenders)
	const overallDocPercent =
		lenderSummaries.length > 0
			? Math.round(
					lenderSummaries.reduce((sum, l) => sum + l.document_completion_percent, 0) /
						lenderSummaries.length
				)
			: 0;

	// B.5 — triage: priority + "next action" so the daily list sorts the cases
	// that need the DSA to the top.
	const triage = computeCaseTriage({
		stage: c.stage,
		lendersCount: c.lender_applications.length,
		docsPercent: overallDocPercent,
		openQueryCount: totalOpenQueries,
		daysInStage: daysInCurrentStage
	});

	return {
		case_id: c.case_id,
		label: c.label,
		loan_type: c.loan.type,
		loan_type_label: loanTypeLabel(c.loan.type),
		loan_amount: c.loan.amount_required || 0,
		stage: c.stage,
		stage_label: STAGE_LABELS[c.stage] || c.stage,
		lender_summaries: lenderSummaries,
		lenders_count: c.lender_applications.length,
		document_completion_percent: overallDocPercent,
		days_in_current_stage: daysInCurrentStage,
		has_open_queries: totalOpenQueries > 0,
		open_query_count: totalOpenQueries,
		priority: triage.priority,
		priority_rank: triage.rank,
		next_action: triage.nextAction,
		is_sample: c.is_sample,
		updated_at: c.updated_at.toISOString
			? c.updated_at.toISOString()
			: new Date(c.updated_at).toISOString(),
		created_at: c.created_at.toISOString
			? c.created_at.toISOString()
			: new Date(c.created_at).toISOString()
	};
}

// ============================================================================
// SORT (B.5) — across the full filtered set so page 1 is the most urgent.
// ============================================================================

type ComputedCase = ReturnType<typeof computeCaseFields>;

/** Sort computed cases in place by the requested key (default: triage priority). */
function sortComputedCases(cases: ComputedCase[], key: string): void {
	const byUpdatedDesc = (a: ComputedCase, b: ComputedCase) =>
		new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
	const stageOrder = ALL_STAGES as readonly string[];

	switch (key) {
		case 'updated':
			cases.sort(byUpdatedDesc);
			break;
		case 'age':
			cases.sort(
				(a, b) => b.days_in_current_stage - a.days_in_current_stage || byUpdatedDesc(a, b)
			);
			break;
		case 'amount':
			cases.sort((a, b) => b.loan_amount - a.loan_amount || byUpdatedDesc(a, b));
			break;
		case 'stage':
			cases.sort(
				(a, b) => stageOrder.indexOf(a.stage) - stageOrder.indexOf(b.stage) || byUpdatedDesc(a, b)
			);
			break;
		case 'priority':
		default:
			// Needs-action first: triage rank asc → stalest (days desc) → most recent.
			cases.sort(
				(a, b) =>
					a.priority_rank - b.priority_rank ||
					b.days_in_current_stage - a.days_in_current_stage ||
					byUpdatedDesc(a, b)
			);
	}
}

// ============================================================================
// MAIN LOAD FUNCTION
// ============================================================================

export const load: PageServerLoad = async ({ parent, url, locals }) => {
	const parentData = await parent();
	const user = parentData.user;

	// ── Demo mode: return in-memory data, skip MongoDB ───────────
	if (user?.id === DEMO_USER_ID) {
		return getDemoCasesPageData(url);
	}

	// Default empty response shape
	const emptyResponse = {
		cases: [] as ReturnType<typeof computeCaseFields>[],
		quotaState: null as QuotaState | null,
		pagination: {
			page: 1,
			total: 0,
			filtered: 0,
			totalPages: 0,
			perPage: 12
		},
		quickStats: {
			total: 0,
			active: 0,
			submitted: 0,
			sanctioned: 0
		},
		filterOptions: {
			stages: [] as { value: string; label: string; count: number }[],
			loanTypes: [] as { value: string; label: string }[],
			lenders: [] as string[]
		},
		activeFilters: {
			stage: '',
			loan_type: '',
			lender: '',
			search: '',
			sort: 'priority',
			page: 1
		}
	};

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

		// ── Step 2: Parse URL search params ─────────────────────────
		const stageFilter = url.searchParams.get('stage') || '';
		const loanTypeFilter = url.searchParams.get('loan_type') || '';
		const lenderFilter = url.searchParams.get('lender') || '';
		const searchFilter = url.searchParams.get('search') || '';
		const sortKey = url.searchParams.get('sort') || 'priority';
		const currentPage = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
		const perPage = 12;

		// ── Step 3: Build MongoDB query filter from URL params ──
		// PERF-3B.1: previous implementation loaded every non-archived case
		// for the DSA into memory just to count/filter/paginate in JS — this
		// scales linearly with the DSA's total case volume. Push filter, sort,
		// and pagination into MongoDB; run the page fetch, filtered count, and
		// stats/filter-options aggregation concurrently.
		const baseFilter = {
			dsa_id: dsaId,
			is_archived: { $in: [false, null] }
		} as Record<string, unknown>;

		const filterQuery: Record<string, unknown> = { ...baseFilter };
		if (stageFilter) filterQuery.stage = stageFilter;
		if (loanTypeFilter) filterQuery['loan.type'] = loanTypeFilter;
		if (lenderFilter) filterQuery['lender_applications.lender_name'] = lenderFilter;
		if (searchFilter) {
			// escapeRegex prevents regex metachars in user input from turning
			// a plain substring search into an expensive or ambiguous pattern.
			// The DSA-scoped baseFilter keeps the scan small enough that
			// a case-insensitive regex is acceptable without a text index.
			const safePattern = escapeRegex(searchFilter);
			filterQuery.$or = [
				{ label: { $regex: safePattern, $options: 'i' } },
				{ case_id: { $regex: safePattern, $options: 'i' } }
			];
		}

		const projection = {
			_id: 1,
			case_id: 1,
			label: 1,
			stage: 1,
			stage_history: 1,
			created_at: 1,
			updated_at: 1,
			is_sample: 1,
			loan: 1,
			lender_applications: 1
		};

		// ── Step 4: Fire full filtered fetch, count, and stats aggregation in parallel ──
		type StageGroup = { _id: CaseStage; count: number };
		type FacetResult = {
			stageCounts: StageGroup[];
			loanTypes: { _id: string }[];
			lenders: { _id: string }[];
			totalCount: { count: number }[];
		};

		// B.5 — triage sort needs computed fields (priority/queries/days) that
		// aren't sortable in Mongo, so fetch the full filtered set (capped),
		// compute + sort in memory, then slice the page. Bounded by MAX_TRIAGE
		// so a huge case book can't blow up memory.
		const MAX_TRIAGE = 1000;
		const [allFilteredDocs, filteredTotal, facetResult] = await Promise.all([
			Cases.find(filterQuery, { projection }).sort({ updated_at: -1 }).limit(MAX_TRIAGE).toArray(),
			Cases.countDocuments(filterQuery),
			Cases.aggregate<FacetResult>([
				{ $match: baseFilter },
				{
					$facet: {
						stageCounts: [{ $group: { _id: '$stage', count: { $sum: 1 } } }],
						loanTypes: [{ $group: { _id: '$loan.type' } }],
						lenders: [
							{ $unwind: '$lender_applications' },
							{ $group: { _id: '$lender_applications.lender_name' } }
						],
						totalCount: [{ $count: 'count' }]
					}
				}
			]).toArray()
		]);

		const facet: FacetResult = facetResult[0] ?? {
			stageCounts: [],
			loanTypes: [],
			lenders: [],
			totalCount: []
		};
		const overallTotal = facet.totalCount[0]?.count ?? 0;

		// ── Step 5: If DSA has no cases at all, short-circuit ──
		if (overallTotal === 0) {
			return {
				...emptyResponse,
				activeFilters: {
					stage: stageFilter,
					loan_type: loanTypeFilter,
					lender: lenderFilter,
					search: searchFilter,
					sort: sortKey,
					page: currentPage
				}
			};
		}

		// ── Step 6: Derive quickStats from the stage group buckets ──
		const stageCountMap: Record<string, number> = {};
		for (const sc of facet.stageCounts) stageCountMap[sc._id] = sc.count;

		const sumStages = (stages: readonly string[]) =>
			stages.reduce((acc, s) => acc + (stageCountMap[s] ?? 0), 0);

		const ACTIVE_STAGES = ALL_STAGES.filter(
			(s) => !['closed', 'dropped', 'rejected', 'disbursed'].includes(s)
		);
		const activeCount = sumStages(ACTIVE_STAGES);
		const submittedCount = sumStages(['submitted', 'processing', 'query']);
		const sanctionedCount = sumStages(['sanctioned', 'disbursed']);

		// ── Step 7: Build filter options ──
		const stageOptions = ALL_STAGES.filter((s) => stageCountMap[s]).map((s) => ({
			value: s,
			label: STAGE_LABELS[s],
			count: stageCountMap[s] || 0
		}));

		// Filter options: keep the raw value for the query param, add a display
		// label so the dropdown never shows a raw enum (B.2).
		const loanTypes = facet.loanTypes
			.map((lt) => lt._id)
			.filter((v): v is string => typeof v === 'string')
			.sort()
			.map((value) => ({ value, label: loanTypeLabel(value) }));

		const lenders = facet.lenders
			.map((l) => l._id)
			.filter((v): v is string => typeof v === 'string')
			.sort();

		// ── Step 8: Compute fields (+ triage) for all filtered cases ──
		const allComputed = allFilteredDocs.map((c) => computeCaseFields(c as Case));

		// ── Step 8b: Sort. Default "needs-action first" (triage rank, then the
		// stalest case); or the requested column. Across the whole filtered set,
		// so the most urgent case overall lands on page 1. ──
		sortComputedCases(allComputed, sortKey);

		// ── Step 8c: Clamp page + slice ──
		const totalPages = Math.max(1, Math.ceil(allComputed.length / perPage));
		const safePage = Math.min(currentPage, totalPages);
		const pageStart = (safePage - 1) * perPage;
		const pageSlice = allComputed.slice(pageStart, pageStart + perPage);

		// ── Step 9: Enrich the page with applicant FULL name + city. These live
		// in the (CSFLE-encrypted) form snapshot, decrypted per case via
		// resolveSnapshotPayload — bounded to the page; dev CSFLE-off = passthrough.
		// Full name shows only here in the DSA's own view; the stored label stays
		// name-free for RM/share surfaces.
		const pageCaseIds = pageSlice.map((c) => c.case_id);
		const identityByCase = new Map<
			string,
			{ applicant_name: string; applicant_city: string; loan_label: string }
		>();
		if (pageCaseIds.length > 0) {
			const snaps = await FormSnapshots.find({ case_id: { $in: pageCaseIds } })
				.sort({ version: -1 })
				.toArray();
			const latestByCase = new Map<string, (typeof snaps)[number]>();
			for (const s of snaps) if (!latestByCase.has(s.case_id)) latestByCase.set(s.case_id, s);
			for (const [cid, snap] of latestByCase) {
				try {
					const payload = (await resolveSnapshotPayload(snap)) as Record<string, unknown> | null;
					const applicants = Array.isArray(payload?.applicants)
						? (payload!.applicants as Record<string, unknown>[])
						: [];
					const fullName = applicants[0]?.fullName;
					const answers = resolveActiveAnswers(payload?.loanData as Record<string, unknown>);
					const city =
						answers.propertyCityName ?? answers.residenceCityName ?? answers.businessCityName;

					// Item B (2026-06-01) — richer LOAN column label.
					// Mirrors the field-resolution rules in
					// src/lib/utils/payloadBuilder/loanTransaction.ts:22-34
					// so the cases-list label matches what the form actually
					// submitted. Format: "LoanName - FacilityType (if there) - LoanType".
					const applicationData = (payload?.applicationData as Record<string, unknown>) ?? {};
					const loanName = String(
						applicationData.loanName ?? answers.loanName ?? ''
					).trim();
					const loanTypeAnswer = String(answers.loanType ?? 'New Loan').trim();
					const facilityType = String(
						answers.facilityType ?? applicationData.facilityType ?? ''
					).trim();
					const loanLabelParts: string[] = [];
					if (loanName) loanLabelParts.push(loanName);
					if (facilityType) loanLabelParts.push(facilityType);
					if (loanTypeAnswer) loanLabelParts.push(loanTypeAnswer);
					const richLoanLabel = loanLabelParts.join(' - ');

					identityByCase.set(cid, {
						applicant_name: typeof fullName === 'string' ? fullName : '',
						applicant_city: city != null ? String(city) : '',
						loan_label: richLoanLabel
					});
				} catch {
					// Decrypt/parse failure — leave identity blank for this case.
				}
			}
		}
		const casesEnriched = pageSlice.map((c) => {
			const formRoute = loanTypeToFormRoute(c.loan_type);
			const enriched = identityByCase.get(c.case_id);
			return {
				...c,
				applicant_name: enriched?.applicant_name ?? '',
				applicant_city: enriched?.applicant_city ?? '',
				// Item B — falls back to the existing coarse label when snapshot
				// decryption fails or no richer label was produced.
				loan_type_label: enriched?.loan_label || c.loan_type_label,
				// Item 3 — Edit form URL surfaced per-row for the Cases list
				// Edit affordance. Demo/sample rows get null (intentional —
				// editing a sample case isn't a real workflow). Matches the
				// shape used by /dashboard/dsa/cases/[case_id]/+layout.server.ts.
				editFormURL: formRoute && !c.is_sample ? `${formRoute}?edit=${c.case_id}` : null
			};
		});

		// QBC — load quota state in parallel with the case-list rendering.
		// Drives the "New Case" button gating in the +page.svelte. Catches
		// errors so a billing-query failure doesn't dead-end the cases list.
		let quotaState: QuotaState | null = null;
		try {
			quotaState = await getQuotaState(dsaId);
		} catch (err) {
			logger.warn({ err, dsaId }, 'Failed to load quota state — UI will not gate buttons');
		}

		return {
			cases: casesEnriched,
			quotaState,
			pagination: {
				page: safePage,
				total: overallTotal,
				filtered: filteredTotal,
				totalPages,
				perPage
			},
			quickStats: {
				total: overallTotal,
				active: activeCount,
				submitted: submittedCount,
				sanctioned: sanctionedCount
			},
			filterOptions: {
				stages: stageOptions,
				loanTypes,
				lenders
			},
			activeFilters: {
				stage: stageFilter,
				loan_type: loanTypeFilter,
				lender: lenderFilter,
				search: searchFilter,
				sort: sortKey,
				page: safePage
			}
		};
	} catch (error) {
		logger.error({ err: error }, 'Cases page load error');
		return emptyResponse;
	}
};
