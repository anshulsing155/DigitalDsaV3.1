/**
 * Demo Data Loaders
 * ====================================================================
 * Pre-computed page data for guest demo mode. Each function returns
 * the exact same shape as the corresponding +page.server.ts load
 * function, but operates on in-memory demo data instead of MongoDB.
 * ====================================================================
 */

import { getDemoCases, getDemoTimeline, getDemoRMContacts, getDemoDsaProfile } from './demoData.js';
import { loanTypeLabel } from '$lib/config/loanTypeLabels';
import { computeCaseTriage } from '$lib/utils/caseTriage';
import { computeScorecard } from './scorecardEngine.js';
import { generatePolicyAlerts, SAMPLE_POLICY_ALERTS } from './policyAlerts.js';
import { COMMUNICATION_TEMPLATES } from './data/communicationTemplates.js';
import type { Case, CaseStage } from '$lib/types/case.js';
import type { TimelineEventType } from '$lib/types/timeline.js';

// ── Shared constants (mirror the page.server.ts files) ───────────

const PIPELINE_STAGES: CaseStage[] = [
	'intake',
	'profiling',
	'file_building',
	'submitted',
	'processing',
	'sanctioned',
	'disbursed'
];

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

const STAGE_LABELS: Record<string, string> = {
	intake: 'Intake',
	profiling: 'Profiling',
	file_building: 'Documents',
	submitted: 'Submitted',
	processing: 'Under Review',
	query: 'Query',
	sanctioned: 'Sanctioned',
	disbursed: 'Disbursed',
	rejected: 'Rejected',
	dropped: 'Dropped',
	closed: 'Closed'
};

const STAGE_COLORS_DASHBOARD: Record<string, string> = {
	intake: '#ddbea9',
	profiling: '#d6ae99',
	file_building: '#cb997e',
	submitted: '#b97550',
	processing: '#a66a42',
	query: '#8e5739',
	sanctioned: '#6b705c',
	disbursed: '#565a49',
	rejected: '#9ca3af',
	dropped: '#9ca3af',
	closed: '#6b7280'
};

const STAGE_COLORS_CRM: Record<string, string> = {
	intake: '#94a3b8',
	profiling: '#3b82f6',
	file_building: '#2563eb',
	submitted: '#6366f1',
	processing: '#9333ea',
	query: '#f97316',
	sanctioned: '#10b981',
	disbursed: '#059669',
	closed: '#6b7280',
	rejected: '#ef4444',
	dropped: '#9ca3af'
};

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

// ── Helpers ──────────────────────────────────────────────────────

function computeDaysInStage(c: Case): number {
	const now = new Date();
	if (c.stage_history.length > 0) {
		const last = c.stage_history[c.stage_history.length - 1];
		return Math.floor((now.getTime() - new Date(last.timestamp).getTime()) / (1000 * 60 * 60 * 24));
	}
	return Math.floor((now.getTime() - new Date(c.created_at).getTime()) / (1000 * 60 * 60 * 24));
}

function toISO(d: Date): string {
	return d instanceof Date && typeof d.toISOString === 'function'
		? d.toISOString()
		: new Date(d).toISOString();
}

// ====================================================================
// 1. DASHBOARD PAGE
// ====================================================================

export function getDemoDashboardData() {
	const allCases = getDemoCases();
	const timeline = getDemoTimeline();
	const rmContacts = getDemoRMContacts();
	const dsaProfile = getDemoDsaProfile();

	const now = new Date();
	const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
	const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

	// Active cases (non-terminal)
	const activeCases = allCases.filter(
		(c) => !c.is_archived && !['closed', 'dropped', 'rejected'].includes(c.stage)
	);

	// Files submitted this month + previous month
	let filesSubmittedThisMonth = 0;
	let filesSubmittedPrev = 0;
	for (const c of allCases) {
		for (const la of c.lender_applications) {
			for (const sh of la.status_history) {
				if (sh.to === 'submitted') {
					const ts = new Date(sh.timestamp);
					if (ts >= monthStart) {
						filesSubmittedThisMonth++;
					} else if (ts >= previousMonthStart && ts < monthStart) {
						filesSubmittedPrev++;
					}
				}
			}
		}
	}

	// Sanctioned this month + previous month
	let sanctionedCount = 0;
	let sanctionedAmount = 0;
	let sanctionedPrevCount = 0;
	let sanctionedPrevAmount = 0;
	for (const c of allCases) {
		for (const la of c.lender_applications) {
			if (la.status === 'sanctioned' || la.status === 'disbursed') {
				const sd = la.sanction?.sanction_date ? new Date(la.sanction.sanction_date) : null;
				if (sd) {
					if (sd >= monthStart) {
						sanctionedCount++;
						sanctionedAmount += la.sanction?.amount || 0;
					} else if (sd >= previousMonthStart && sd < monthStart) {
						sanctionedPrevCount++;
						sanctionedPrevAmount += la.sanction?.amount || 0;
					}
				}
			}
		}
	}

	// Avg processing days
	const completedCases = allCases.filter((c) => ['sanctioned', 'disbursed'].includes(c.stage));
	let totalDays = 0;
	let processedCount = 0;
	for (const c of completedCases) {
		const created = new Date(c.created_at);
		const lastStage =
			c.stage_history.length > 0
				? new Date(c.stage_history[c.stage_history.length - 1].timestamp)
				: new Date(c.updated_at);
		const days = Math.floor((lastStage.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
		if (days >= 0) {
			totalDays += days;
			processedCount++;
		}
	}

	// Pipeline
	const stageCounts: Record<string, number> = {};
	for (const c of activeCases) {
		stageCounts[c.stage] = (stageCounts[c.stage] || 0) + 1;
	}
	if (stageCounts['query']) {
		stageCounts['processing'] = (stageCounts['processing'] || 0) + stageCounts['query'];
	}
	const pipeline = PIPELINE_STAGES.map((stage) => ({
		stage,
		label: STAGE_LABELS[stage],
		count: stageCounts[stage] || 0,
		color: STAGE_COLORS_DASHBOARD[stage]
	}));

	// Attention items
	const attentionItems: Array<{
		type: 'open_query' | 'expiring_document' | 'stuck_stage';
		case_id: string;
		label: string;
		description: string;
		severity: 'warning' | 'critical';
		days: number;
		stage: string;
		stage_label: string;
	}> = [];

	for (const c of allCases) {
		if (['closed', 'dropped', 'rejected', 'disbursed'].includes(c.stage)) continue;

		// Open queries > 3 days
		for (const la of c.lender_applications) {
			for (const q of la.queries) {
				if (q.status === 'open') {
					const daysOpen = Math.floor(
						(now.getTime() - new Date(q.raised_at).getTime()) / (1000 * 60 * 60 * 24)
					);
					if (daysOpen >= 3) {
						attentionItems.push({
							type: 'open_query',
							case_id: c.case_id,
							label: c.label,
							description: `Open query from ${la.lender_name} \u2014 ${daysOpen} days pending`,
							severity: daysOpen >= 7 ? 'critical' : 'warning',
							days: daysOpen,
							stage: c.stage,
							stage_label: STAGE_LABELS[c.stage]
						});
					}
				}
			}
		}

		// Expiring documents
		for (const la of c.lender_applications) {
			for (const doc of la.document_checklist) {
				if (doc.validity?.valid_until) {
					const daysUntil = Math.floor(
						(new Date(doc.validity.valid_until).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
					);
					if (daysUntil <= 15 && daysUntil >= 0) {
						attentionItems.push({
							type: 'expiring_document',
							case_id: c.case_id,
							label: c.label,
							description: `${doc.doc_name} expires in ${daysUntil} day${daysUntil === 1 ? '' : 's'}`,
							severity: daysUntil <= 5 ? 'critical' : 'warning',
							days: daysUntil,
							stage: c.stage,
							stage_label: STAGE_LABELS[c.stage]
						});
					}
				}
			}
		}

		// Stuck > 7 days
		const daysInStage = computeDaysInStage(c);
		if (daysInStage >= 7) {
			attentionItems.push({
				type: 'stuck_stage',
				case_id: c.case_id,
				label: c.label,
				description: `Stuck in "${STAGE_LABELS[c.stage]}" for ${daysInStage} days`,
				severity: daysInStage >= 14 ? 'critical' : 'warning',
				days: daysInStage,
				stage: c.stage,
				stage_label: STAGE_LABELS[c.stage]
			});
		}
	}

	attentionItems.sort((a, b) => {
		if (a.severity !== b.severity) return a.severity === 'critical' ? -1 : 1;
		return b.days - a.days;
	});

	// Recent cases
	const recentCases = [...allCases]
		.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
		.slice(0, 5)
		.map((c) => ({
			case_id: c.case_id,
			label: c.label,
			loan_type: c.loan.type,
			stage: c.stage,
			stage_label: STAGE_LABELS[c.stage] || c.stage,
			lenders: c.lender_applications.map((la) => la.lender_name),
			updated_at: toISO(c.updated_at),
			is_sample: true
		}));

	// Recent activity (last 10)
	const recentActivity = [...timeline]
		.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
		.slice(0, 10)
		.map((ev) => ({
			event_type: ev.event_type,
			description: ev.description,
			created_at: toISO(ev.created_at),
			case_id: ev.case_id
		}));

	// RM contacts (top 3)
	const rmContactsFormatted = rmContacts.slice(0, 3).map((rm) => ({
		rm_name: rm.rm_name,
		lender_name: rm.lender_name,
		phone: rm.phone,
		whatsapp: rm.phone,
		designation: rm.designation
	}));

	return {
		dsaProfile,
		stats: {
			totalCases: allCases.length,
			activeCases: activeCases.length,
			filesSubmittedThisMonth,
			filesSubmittedPrev,
			sanctionedThisMonth: { count: sanctionedCount, amount: sanctionedAmount },
			sanctionedPrev: { count: sanctionedPrevCount, amount: sanctionedPrevAmount },
			avgProcessingDays: processedCount > 0 ? Math.round(totalDays / processedCount) : 0
		},
		pipeline,
		attentionItems,
		recentCases,
		recentActivity,
		rmContacts: rmContactsFormatted,
		hasCases: true,
		hasRealCases: false,
		hasSampleCases: true,
		lastUpdatedAt: now.toISOString(),
		isDemo: true
	};
}

// ====================================================================
// 2. CASES PAGE
// ====================================================================

export function getDemoCasesPageData(url: URL) {
	const allCases = getDemoCases();

	// Parse URL params
	const stageFilter = url.searchParams.get('stage') || '';
	const loanTypeFilter = url.searchParams.get('loan_type') || '';
	const lenderFilter = url.searchParams.get('lender') || '';
	const searchFilter = url.searchParams.get('search') || '';
	const currentPage = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
	const perPage = 12;

	// Quick stats
	const activeCases = allCases.filter(
		(c) => !['closed', 'dropped', 'rejected', 'disbursed'].includes(c.stage)
	);
	const submittedCases = allCases.filter((c) =>
		['submitted', 'processing', 'query'].includes(c.stage)
	);
	const sanctionedCases = allCases.filter((c) => ['sanctioned', 'disbursed'].includes(c.stage));

	// Filter options
	const stageCounts: Record<string, number> = {};
	const loanTypesSet = new Set<string>();
	const lendersSet = new Set<string>();
	for (const c of allCases) {
		stageCounts[c.stage] = (stageCounts[c.stage] || 0) + 1;
		loanTypesSet.add(c.loan.type);
		for (const la of c.lender_applications) lendersSet.add(la.lender_name);
	}

	const stageOptions = ALL_STAGES.filter((s) => stageCounts[s]).map((s) => ({
		value: s,
		label: STAGE_LABELS[s],
		count: stageCounts[s] || 0
	}));

	// Apply filters
	let filtered = allCases;
	if (stageFilter) filtered = filtered.filter((c) => c.stage === stageFilter);
	if (loanTypeFilter) filtered = filtered.filter((c) => c.loan.type === loanTypeFilter);
	if (lenderFilter)
		filtered = filtered.filter((c) =>
			c.lender_applications.some((la) => la.lender_name === lenderFilter)
		);
	if (searchFilter) {
		const sl = searchFilter.toLowerCase();
		filtered = filtered.filter(
			(c) => c.label.toLowerCase().includes(sl) || c.case_id.toLowerCase().includes(sl)
		);
	}

	// Sort + paginate
	filtered.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
	const totalPages = Math.ceil(filtered.length / perPage);
	const safePage = Math.min(currentPage, Math.max(1, totalPages));
	const skip = (safePage - 1) * perPage;
	const paginated = filtered.slice(skip, skip + perPage);

	// Compute derived fields
	const cases = paginated.map((c) => {
		let totalOpenQueries = 0;
		for (const la of c.lender_applications) {
			for (const q of la.queries) {
				if (q.status === 'open') totalOpenQueries++;
			}
		}

		const lenderSummaries = c.lender_applications.map((la) => {
			const total = la.document_checklist.length;
			const completed = la.document_checklist.filter(
				(d) => d.status === 'uploaded' || d.status === 'received' || d.status === 'not_applicable'
			).length;
			return {
				lender_name: la.lender_name,
				status: la.status,
				document_total: total,
				document_completed: completed,
				document_completion_percent: total > 0 ? Math.round((completed / total) * 100) : 0,
				open_queries: la.queries.filter((q) => q.status === 'open').length
			};
		});

		const overallDocPercent =
			lenderSummaries.length > 0
				? Math.round(
						lenderSummaries.reduce((s, l) => s + l.document_completion_percent, 0) /
							lenderSummaries.length
					)
				: 0;

		return {
			case_id: c.case_id,
			label: c.label,
			loan_type: c.loan.type,
			loan_type_label: loanTypeLabel(c.loan.type),
			loan_amount: c.loan.amount_required || 0,
			// B.5 — table columns; demo cases carry identity on optional_contact.
			applicant_name: c.optional_contact?.full_name || '',
			applicant_city: '',
			stage: c.stage,
			stage_label: STAGE_LABELS[c.stage] || c.stage,
			lender_summaries: lenderSummaries,
			lenders_count: c.lender_applications.length,
			document_completion_percent: overallDocPercent,
			days_in_current_stage: computeDaysInStage(c),
			has_open_queries: totalOpenQueries > 0,
			open_query_count: totalOpenQueries,
			...(() => {
				const t = computeCaseTriage({
					stage: c.stage,
					lendersCount: c.lender_applications.length,
					docsPercent: overallDocPercent,
					openQueryCount: totalOpenQueries,
					daysInStage: computeDaysInStage(c)
				});
				return { priority: t.priority, priority_rank: t.rank, next_action: t.nextAction };
			})(),
			is_sample: true,
			updated_at: toISO(c.updated_at),
			created_at: toISO(c.created_at)
		};
	});

	return {
		cases,
		// Demo mode: no real subscription, so quotaState is null. The +page.svelte
		// branches on `data.quotaState?.newCaseDisabled` and falls through to
		// the always-enabled link. Demo users never hit the API gate anyway.
		quotaState: null as null | import('$lib/server/billing/quotaState').QuotaState,
		pagination: {
			page: safePage,
			total: allCases.length,
			filtered: filtered.length,
			totalPages,
			perPage
		},
		quickStats: {
			total: allCases.length,
			active: activeCases.length,
			submitted: submittedCases.length,
			sanctioned: sanctionedCases.length
		},
		filterOptions: {
			stages: stageOptions,
			loanTypes: Array.from(loanTypesSet)
				.sort()
				.map((value) => ({ value, label: loanTypeLabel(value) })),
			lenders: Array.from(lendersSet).sort()
		},
		activeFilters: {
			stage: stageFilter,
			loan_type: loanTypeFilter,
			lender: lenderFilter,
			search: searchFilter,
			sort: 'priority',
			page: safePage
		}
	};
}

// ====================================================================
// 3. CRM PAGE
// ====================================================================

export function getDemoCRMData() {
	const allCases = getDemoCases();
	const timeline = getDemoTimeline();
	const now = new Date();
	const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

	// Pipeline
	const stageGroups: Record<string, Case[]> = {};
	for (const stage of ALL_STAGES) stageGroups[stage] = [];
	for (const c of allCases) {
		if (!stageGroups[c.stage]) stageGroups[c.stage] = [];
		stageGroups[c.stage].push(c);
	}

	const pipeline = ALL_STAGES.map((stage) => {
		const cases = stageGroups[stage] || [];
		return {
			stage,
			label: STAGE_LABELS[stage] || stage,
			count: cases.length,
			total_amount: cases.reduce((s, c) => s + (c.loan.amount_required || 0), 0),
			color: STAGE_COLORS_CRM[stage] || '#94a3b8',
			cases: cases.map((c) => ({
				case_id: c.case_id,
				label: c.label,
				loan_type: c.loan.type,
				loan_amount: c.loan.amount_required || 0,
				days_in_stage: computeDaysInStage(c),
				lenders: c.lender_applications.map((la) => la.lender_name)
			}))
		};
	});

	// Source breakdown
	const sourceGroups: Record<string, { total: number; sanctioned: number }> = {};
	for (const c of allCases) {
		const src = c.source?.type || 'unknown';
		if (!sourceGroups[src]) sourceGroups[src] = { total: 0, sanctioned: 0 };
		sourceGroups[src].total++;
		if (['sanctioned', 'disbursed', 'closed'].includes(c.stage)) sourceGroups[src].sanctioned++;
	}
	const sourceBreakdown = Object.entries(sourceGroups)
		.map(([source_type, data]) => ({
			source_type,
			count: data.total,
			sanctioned_count: data.sanctioned,
			conversion_rate: data.total > 0 ? Math.round((data.sanctioned / data.total) * 100) : 0
		}))
		.sort((a, b) => b.count - a.count);

	// Communication log
	const caseLabelMap: Record<string, string> = {};
	for (const c of allCases) caseLabelMap[c.case_id] = c.label;

	const communicationLog = timeline
		.filter((ev) => COMMUNICATION_EVENT_TYPES.includes(ev.event_type as TimelineEventType))
		.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
		.slice(0, 50)
		.map((ev) => ({
			case_id: ev.case_id,
			case_label: caseLabelMap[ev.case_id] || ev.case_id,
			event_type: ev.event_type,
			description: ev.description,
			created_at: toISO(ev.created_at)
		}));

	// Metrics
	const activeCases = allCases.filter(
		(c) => !c.is_archived && !['closed', 'dropped', 'rejected'].includes(c.stage)
	);
	const sanctionedCases = allCases.filter((c) =>
		['sanctioned', 'disbursed', 'closed'].includes(c.stage)
	);

	let totalSanctionedAmount = 0;
	for (const c of allCases) {
		for (const la of c.lender_applications) {
			if ((la.status === 'sanctioned' || la.status === 'disbursed') && la.sanction?.amount) {
				totalSanctionedAmount += la.sanction.amount;
			}
		}
	}

	let totalDaysToSanction = 0;
	let sanctionComputed = 0;
	for (const c of sanctionedCases) {
		const created = new Date(c.created_at);
		const sanctionTransition = c.stage_history.find((t) => t.to === 'sanctioned');
		if (sanctionTransition) {
			const days = Math.floor(
				(new Date(sanctionTransition.timestamp).getTime() - created.getTime()) /
					(1000 * 60 * 60 * 24)
			);
			if (days >= 0) {
				totalDaysToSanction += days;
				sanctionComputed++;
			}
		}
	}

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

	return {
		pipeline,
		sourceBreakdown,
		communicationLog,
		metrics: {
			total_cases: allCases.length,
			active_cases: activeCases.length,
			conversion_rate:
				allCases.length > 0 ? Math.round((sanctionedCases.length / allCases.length) * 100) : 0,
			avg_days_to_sanction:
				sanctionComputed > 0 ? Math.round(totalDaysToSanction / sanctionComputed) : 0,
			total_sanctioned_amount: totalSanctionedAmount,
			this_month_cases: thisMonthCases,
			this_month_sanctioned: thisMonthSanctioned
		}
	};
}

// ====================================================================
// 4. ANALYTICS PAGE
// ====================================================================

export function getDemoAnalyticsData() {
	const allCases = getDemoCases();

	// Mock DSA profile for scorecard (it reads goals from business_profile)
	const demoDsaDoc = {
		_id: null,
		name: 'Demo DSA Agent',
		goals: {
			files_per_month: { current: 3, target: 10 },
			disbursement_volume: { current: 2000000, target: 5000000 },
			active_lender_count: { current: 3, target: 5 },
			repeat_referral_rate: { current: 20, target: 40 },
			avg_processing_days: { current: 25, target: 21 }
		}
	};

	const scorecard = computeScorecard(allCases, demoDsaDoc);
	const activeCases = allCases.filter((c) => !c.is_archived);
	const policyAlerts = generatePolicyAlerts(activeCases, SAMPLE_POLICY_ALERTS);

	return {
		scorecard,
		policyAlerts,
		hasData: true
	};
}

// ====================================================================
// 5. COMMUNICATION PAGE
// ====================================================================

export function getDemoCommunicationData() {
	const allCases = getDemoCases();
	const dsaProfile = getDemoDsaProfile();

	const templates = COMMUNICATION_TEMPLATES.map((t) => ({
		template_id: t.template_id,
		name: t.name,
		category: t.category,
		channel: t.channel,
		subject: t.subject,
		body: t.body,
		variables: t.variables,
		trigger_stage: t.trigger_stage || null
	}));

	const recentCases = allCases
		.filter((c) => !c.is_archived)
		.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
		.slice(0, 20)
		.map((c) => ({
			case_id: c.case_id,
			label: c.label,
			loan_type: c.loan.type,
			stage: c.stage
		}));

	return {
		templates,
		recentCases,
		dsaProfile: {
			name: dsaProfile.name,
			firmName: dsaProfile.firmName,
			phone: '9999999999'
		}
	};
}
