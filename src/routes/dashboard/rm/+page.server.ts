import type { PageServerLoad } from './$types';
import {
	rmApplications,
	Cases,
	CommunicationThreads,
	TimelineEvents,
	RMSubmissions,
	PolicyVersions,
	PolicyRules,
	Lenders,
	LenderProducts,
	ProductVariations,
	DsaApplications,
	RmLenderAssignments
} from '$lib/database/mongo.js';
import { ObjectId } from 'mongodb';
import type { Case, CaseStage } from '$lib/types/case.js';
import { PRODUCT_TYPE_LABELS } from '$lib/types/policyEngine.js';
import logger from '$lib/server/logger.js';
import { getLenderNameFromDomain } from '$lib/config/lenderDomains.js';

// ============================================================================
// PIPELINE CONFIGURATION
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

const STAGE_COLORS: Record<CaseStage, string> = {
	quota_blocked: '#f59e0b',
	intake: '#64748b',
	profiling: '#8b5cf6',
	file_building: '#3b82f6',
	submitted: '#0ea5e9',
	processing: '#d4a84e',
	query: '#ef4444',
	sanctioned: '#10b981',
	disbursed: '#059669',
	rejected: '#dc2626',
	dropped: '#9ca3af',
	closed: '#6b7280'
};

// ============================================================================
// ATTENTION ITEMS
// ============================================================================

interface AttentionItem {
	type: 'open_query' | 'expiring_document' | 'stuck_stage';
	case_id: string;
	label: string;
	description: string;
	severity: 'warning' | 'critical';
	days: number;
}

// Maximum attention items to return — prevents dashboard noise when many cases are stale
const MAX_ATTENTION_ITEMS = 8;

// Threshold constants — tuned so only genuinely actionable items surface
const OPEN_QUERY_WARNING_DAYS = 5; // queries pending 5+ days deserve attention
const OPEN_QUERY_CRITICAL_DAYS = 10; // 10+ days is genuinely critical
const EXPIRING_DOC_WARNING_DAYS = 7; // documents expiring within 7 days
const EXPIRING_DOC_CRITICAL_DAYS = 3; // 3 days or less is critical
const STUCK_STAGE_WARNING_DAYS = 10; // 10+ days in same stage is noteworthy
const STUCK_STAGE_CRITICAL_DAYS = 21; // 3+ weeks stuck is critical

function computeAttentionItems(cases: Case[]): AttentionItem[] {
	const items: AttentionItem[] = [];
	const now = new Date();

	for (const c of cases) {
		// Skip terminal stages and sample/demo cases (sample data is always stale)
		if (['closed', 'dropped', 'rejected', 'disbursed'].includes(c.stage)) continue;
		if (c.is_sample) continue;

		// 1. Open queries that have been pending too long
		for (const la of c.lender_applications) {
			for (const q of la.queries) {
				if (q.status === 'open') {
					const raisedAt = new Date(q.raised_at);
					const daysOpen = Math.floor((now.getTime() - raisedAt.getTime()) / (1000 * 60 * 60 * 24));
					if (daysOpen >= OPEN_QUERY_WARNING_DAYS) {
						items.push({
							type: 'open_query',
							case_id: c.case_id,
							label: c.label,
							description: `Open query from ${la.lender_name} — ${daysOpen} days pending`,
							severity: daysOpen >= OPEN_QUERY_CRITICAL_DAYS ? 'critical' : 'warning',
							days: daysOpen
						});
					}
				}
			}
		}

		// 2. Documents expiring within 7 days (not 15 — only flag what needs immediate action)
		for (const la of c.lender_applications) {
			for (const doc of la.document_checklist) {
				if (doc.validity?.valid_until) {
					const expiry = new Date(doc.validity.valid_until);
					const daysUntilExpiry = Math.floor(
						(expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
					);
					if (daysUntilExpiry <= EXPIRING_DOC_WARNING_DAYS && daysUntilExpiry >= 0) {
						items.push({
							type: 'expiring_document',
							case_id: c.case_id,
							label: c.label,
							description: `${doc.doc_name} expires in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? '' : 's'}`,
							severity: daysUntilExpiry <= EXPIRING_DOC_CRITICAL_DAYS ? 'critical' : 'warning',
							days: daysUntilExpiry
						});
					}
				}
			}
		}

		// 3. Cases stuck in same stage for an unusually long time
		if (c.stage_history.length > 0) {
			const lastTransition = c.stage_history[c.stage_history.length - 1];
			const transitionDate = new Date(lastTransition.timestamp);
			const daysInStage = Math.floor(
				(now.getTime() - transitionDate.getTime()) / (1000 * 60 * 60 * 24)
			);
			if (daysInStage >= STUCK_STAGE_WARNING_DAYS) {
				items.push({
					type: 'stuck_stage',
					case_id: c.case_id,
					label: c.label,
					description: `Stuck in "${STAGE_LABELS[c.stage]}" for ${daysInStage} days`,
					severity: daysInStage >= STUCK_STAGE_CRITICAL_DAYS ? 'critical' : 'warning',
					days: daysInStage
				});
			}
		} else {
			const createdDate = new Date(c.created_at);
			const daysInStage = Math.floor(
				(now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
			);
			if (daysInStage >= STUCK_STAGE_WARNING_DAYS) {
				items.push({
					type: 'stuck_stage',
					case_id: c.case_id,
					label: c.label,
					description: `Stuck in "${STAGE_LABELS[c.stage]}" for ${daysInStage} days`,
					severity: daysInStage >= STUCK_STAGE_CRITICAL_DAYS ? 'critical' : 'warning',
					days: daysInStage
				});
			}
		}
	}

	// Sort: critical first, then by days descending
	items.sort((a, b) => {
		if (a.severity !== b.severity) return a.severity === 'critical' ? -1 : 1;
		return b.days - a.days;
	});

	// Cap at MAX_ATTENTION_ITEMS to prevent dashboard noise
	return items.slice(0, MAX_ATTENTION_ITEMS);
}

// ============================================================================
// LOAD FUNCTION
// ============================================================================

export const load: PageServerLoad = async ({ parent }) => {
	const parentData = await parent();
	const user = parentData.user;

	const emptyResponse = {
		rmProfile: null as {
			name: string;
			bankName?: string;
			city?: string;
			designation?: string;
		} | null,
		stats: {
			casesReceived: 0,
			activeCases: 0,
			dsaConnections: 0,
			openQueries: 0,
			sanctionedThisMonth: { count: 0, amount: 0 },
			initialReviewCount: 0,
			finalReviewCount: 0,
			// C.1 — KPIs for "the RM's two core workflows": cases AND policies.
			// Pre-C.1 the home surfaced only case stats; lender/policy work was
			// invisible from the home page even though "maintaining policies" is
			// half the job.
			lendersOwned: 0,
			policiesNeedVerify: 0
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
			dsa_name: string;
		}>,
		recentActivity: [] as Array<{
			event_type: string;
			description: string;
			created_at: string;
			case_id: string;
		}>,
		dsaConnections: [] as Array<{
			dsa_id: string;
			dsa_name: string;
			case_count: number;
			last_shared_at: string;
		}>,
		hasCases: false,
		hasRealCases: false,
		hasSampleCases: false,
		needsEmailVerification: false,
		rmEmail: '',
		actionRequired: [] as Array<{
			type: 'clarification_needed' | 'pending_review';
			id: string;
			title: string;
			subtitle: string;
			urgency?: string;
			updated_at: string;
			link: string;
		}>,
		recentlyApproved: [] as Array<{
			version_id: string;
			lender_name: string;
			product_label: string;
			variation_label: string;
			version_number: number;
			activated_at: string;
		}>,
		suggestedDsas: [] as Array<{
			dsa_id: string;
			dsa_name: string;
			city: string;
			score: number;
			reasons: string[];
		}>,
		preferredDsaIds: [] as string[]
	};

	if (!user?.id) return emptyResponse;

	try {
		// Step 1: Resolve RM profile
		let rmDoc;
		try {
			rmDoc = await rmApplications.findOne(
				{ _id: new ObjectId(user.id) },
				{
					projection: {
						name: 1,
						bankName: 1,
						workingCity: 1,
						city: 1,
						designation: 1,
						rmOfficialEmail: 1,
						officialEmail: 1,
						email_verified_at: 1,
						preferred_dsa_ids: 1
					}
				}
			);
		} catch {
			// Fallback: match by mobile
			rmDoc = await rmApplications.findOne(
				{
					mobileNumber: { $in: [Number(user.mobileNumber), user.mobileNumber] } as any
				},
				{
					projection: {
						name: 1,
						bankName: 1,
						workingCity: 1,
						city: 1,
						designation: 1,
						rmOfficialEmail: 1,
						officialEmail: 1,
						email_verified_at: 1,
						preferred_dsa_ids: 1
					}
				}
			);
		}

		if (!rmDoc) return emptyResponse;

		const rmId = rmDoc._id!;
		const officialEmail = rmDoc.rmOfficialEmail || (rmDoc as any).officialEmail || '';
		const rmProfile = {
			name: rmDoc.name || user.name || '',
			bankName: rmDoc.bankName || getLenderNameFromDomain(officialEmail) || '',
			city: rmDoc.workingCity || rmDoc.city || '',
			designation: rmDoc.designation || ''
		};

		// Email verification check: needs verification if never verified or > 30 days ago
		const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
		let needsEmailVerification = false;
		const rmEmail = officialEmail;
		if (rmEmail) {
			if (!rmDoc.email_verified_at) {
				needsEmailVerification = true;
			} else {
				const verifiedAt = new Date(rmDoc.email_verified_at).getTime();
				if (Date.now() - verifiedAt > THIRTY_DAYS_MS) {
					needsEmailVerification = true;
				}
			}
		}

		// Step 2 + 11: Load threads, policy items, and lender assignments in
		// parallel. RmLenderAssignments added C.1 — feeds the two new KPI
		// cards (Lenders Owned, Policies Need Verify) so the home surfaces
		// the policy-maintenance side of the RM's job, not only the case-
		// review side.
		const rmIdStr = rmId.toString();
		const [
			allThreads,
			clarificationSubs,
			pendingReviewVersions,
			recentActiveVersions,
			lenderAssignments
		] = await Promise.all([
			CommunicationThreads.find(
				{ rm_id: rmId },
				{
					projection: {
						case_id: 1,
						dsa_id: 1,
						dsa_name: 1,
						created_at: 1
					}
				}
			).toArray(),
			RMSubmissions.find(
				{ rm_id: rmIdStr, status: 'clarification_needed' },
				{
					projection: {
						submission_id: 1,
						lender_name: 1,
						description: 1,
						urgency: 1,
						updated_at: 1
					}
				}
			)
				.sort({ updated_at: -1 })
				.limit(10)
				.toArray(),
			PolicyVersions.find(
				{
					status: 'pending_rm_review',
					'provenance.source_rm_id': rmIdStr
				},
				{
					projection: {
						policy_rule_id: 1,
						version_number: 1,
						updated_at: 1
					}
				}
			)
				.sort({ updated_at: -1 })
				.limit(10)
				.toArray(),
			// Audit fix (RM dashboard audit 2026-05-30, B1): scope active versions
			// to THIS rm via provenance.source_rm_id so "Recently Approved" doesn't
			// leak other RMs' approvals onto this dashboard.
			PolicyVersions.find(
				{ status: 'active', 'provenance.source_rm_id': rmIdStr },
				{
					projection: {
						policy_rule_id: 1,
						version_number: 1,
						effective_from: 1,
						updated_at: 1
					}
				}
			)
				.sort({ updated_at: -1 })
				.limit(10)
				.toArray(),
			RmLenderAssignments.find(
				{ rmUserId: rmIdStr, status: 'active' },
				{ projection: { lenderId: 1, nextVerificationDueBy: 1 } }
			).toArray()
		]);

		// C.1 — policy-maintenance KPI counts. "Needs verify" = active
		// assignments whose verification due-date is within the same 7-day
		// window the policy library highlights with the amber "Verify soon"
		// chip (matches the existing renewalDueSoon threshold for parity).
		const PRE_C1_NOW = new Date();
		const VERIFY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
		const lendersOwned = lenderAssignments.length;
		const policiesNeedVerify = lenderAssignments.filter((a) => {
			if (!a.nextVerificationDueBy) return false;
			const due = new Date(a.nextVerificationDueBy).getTime();
			return due - PRE_C1_NOW.getTime() <= VERIFY_WINDOW_MS;
		}).length;

		if (allThreads.length === 0) {
			// Audit fix (RM dashboard audit 2026-05-30, B2): a new RM with
			// lender assignments but no case threads must still see correct
			// policy-maintenance KPIs. Pre-fix, lendersOwned/policiesNeedVerify
			// were computed above but discarded by the empty-response spread.
			return {
				...emptyResponse,
				rmProfile,
				needsEmailVerification,
				rmEmail,
				stats: { ...emptyResponse.stats, lendersOwned, policiesNeedVerify }
			};
		}

		// Step 3 + 9: Load cases and timeline events in parallel (both need caseIds)
		const caseIds = [...new Set(allThreads.map((t) => t.case_id))];
		const [allCases, timelineEvents] = await Promise.all([
			Cases.find(
				{ case_id: { $in: caseIds } },
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
						// Only lender_applications subfields needed for stats
						'lender_applications.lender_name': 1,
						'lender_applications.status': 1,
						'lender_applications.status_history': 1,
						'lender_applications.sanction': 1
					}
				}
			).toArray(),
			TimelineEvents.find(
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
				.toArray()
		]);

		if (allCases.length === 0) {
			return { ...emptyResponse, rmProfile, needsEmailVerification, rmEmail };
		}

		// Build a map: case_id -> dsa_name (from threads)
		const caseIdToDsaName: Record<string, string> = {};
		for (const t of allThreads) {
			caseIdToDsaName[t.case_id] = t.dsa_name;
		}

		// Step 4: Classify cases
		const realCases = allCases.filter((c) => !c.is_sample);
		const sampleCases = allCases.filter((c) => c.is_sample);
		const hasRealCases = realCases.length > 0;
		const hasSampleCases = sampleCases.length > 0;

		// Step 5: Compute stats
		const activeCases = allCases.filter(
			(c) => !c.is_archived && !['closed', 'dropped', 'rejected'].includes(c.stage)
		);

		// Open queries count
		let openQueries = 0;
		for (const c of allCases) {
			for (const la of c.lender_applications) {
				for (const q of la.queries) {
					if (q.status === 'open') openQueries++;
				}
			}
		}

		// DSA connections (distinct dsa_ids from threads)
		const dsaIdSet = new Set(allThreads.map((t) => t.dsa_id.toString()));

		// Sanctioned this month
		const now = new Date();
		const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
		let sanctionedCount = 0;
		let sanctionedAmount = 0;
		for (const c of allCases) {
			for (const la of c.lender_applications) {
				if (la.status === 'sanctioned' || la.status === 'disbursed') {
					const sanctionDate = la.sanction?.sanction_date
						? new Date(la.sanction.sanction_date)
						: null;
					if (sanctionDate && sanctionDate >= monthStart) {
						sanctionedCount++;
						sanctionedAmount += la.sanction?.amount || 0;
					}
				}
			}
		}

		// File counters
		// initialReviewCount: cases at file_building or beyond (DSA has started building the file)
		const FILE_BUILDING_AND_BEYOND: CaseStage[] = [
			'file_building',
			'submitted',
			'processing',
			'query',
			'sanctioned',
			'disbursed'
		];
		const initialReviewCount = allCases.filter((c) =>
			FILE_BUILDING_AND_BEYOND.includes(c.stage)
		).length;

		// finalReviewCount: cases where at least one lender_application has a "submitted or beyond" status
		const FINAL_REVIEW_STATUSES = new Set([
			'submitted',
			'processing',
			'query',
			'query_responded',
			'sanctioned',
			'disbursed'
		]);
		const finalReviewCount = allCases.filter((c) =>
			c.lender_applications.some((la) => FINAL_REVIEW_STATUSES.has(la.status))
		).length;

		// Step 6: Pipeline counts
		const stageCounts: Record<string, number> = {};
		for (const c of activeCases) {
			stageCounts[c.stage] = (stageCounts[c.stage] || 0) + 1;
		}
		// Roll query cases into processing for pipeline display
		if (stageCounts['query']) {
			stageCounts['processing'] = (stageCounts['processing'] || 0) + stageCounts['query'];
		}
		const pipeline = PIPELINE_STAGES.map((stage) => ({
			stage,
			label: STAGE_LABELS[stage],
			count: stageCounts[stage] || 0,
			color: STAGE_COLORS[stage]
		}));

		// Step 7: Attention items
		const attentionItems = computeAttentionItems(allCases);

		// Step 8: Recent cases (top 5)
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
			is_sample: c.is_sample,
			dsa_name: caseIdToDsaName[c.case_id] || ''
		}));

		// timelineEvents already loaded in parallel with cases (Step 3+9)
		const recentActivity = timelineEvents.map((ev) => ({
			event_type: ev.event_type,
			description: ev.description,
			created_at: ev.created_at.toISOString
				? ev.created_at.toISOString()
				: new Date(ev.created_at).toISOString(),
			case_id: ev.case_id
		}));

		// Step 10: DSA connections list
		const dsaConnectionMap: Record<
			string,
			{ dsa_id: string; dsa_name: string; case_count: number; last_shared_at: Date }
		> = {};
		for (const t of allThreads) {
			const key = t.dsa_id.toString();
			if (!dsaConnectionMap[key]) {
				dsaConnectionMap[key] = {
					dsa_id: key,
					dsa_name: t.dsa_name,
					case_count: 0,
					last_shared_at: t.created_at
				};
			}
			dsaConnectionMap[key].case_count++;
			if (new Date(t.created_at) > new Date(dsaConnectionMap[key].last_shared_at)) {
				dsaConnectionMap[key].last_shared_at = t.created_at;
			}
		}
		const dsaConnections = Object.values(dsaConnectionMap)
			.sort((a, b) => new Date(b.last_shared_at).getTime() - new Date(a.last_shared_at).getTime())
			.map((d) => ({
				dsa_id: d.dsa_id,
				dsa_name: d.dsa_name,
				case_count: d.case_count,
				last_shared_at: d.last_shared_at.toISOString
					? d.last_shared_at.toISOString()
					: new Date(d.last_shared_at).toISOString()
			}));

		// Policy items (clarificationSubs, pendingReviewVersions, recentActiveVersions)
		// already loaded in parallel with threads (Step 2+11 above)

		// Enrich versions with lender/product names
		const allVersionsForEnrich = [...pendingReviewVersions, ...recentActiveVersions];
		const versionRuleIds = [...new Set(allVersionsForEnrich.map((v) => v.policy_rule_id))];
		let versionLenderMap = new Map<string, string>();
		let versionProductMap = new Map<string, string>();
		let versionVariationMap = new Map<string, string>();

		if (versionRuleIds.length > 0) {
			const vRules = await PolicyRules.find(
				{ policy_rule_id: { $in: versionRuleIds } },
				{ projection: { policy_rule_id: 1, lender_id: 1, product_id: 1, variation_id: 1 } }
			).toArray();
			const vLenderIds = [...new Set(vRules.map((r) => r.lender_id))];
			const vProductIds = [...new Set(vRules.map((r) => r.product_id))];
			const vVariationIds = [...new Set(vRules.map((r) => r.variation_id))];

			const [vLenders, vProducts, vVariations] = await Promise.all([
				vLenderIds.length > 0
					? Lenders.find(
							{ lender_id: { $in: vLenderIds } },
							{ projection: { lender_id: 1, lender_name: 1 } }
						).toArray()
					: [],
				vProductIds.length > 0
					? LenderProducts.find(
							{ product_id: { $in: vProductIds } },
							{ projection: { product_id: 1, product_type: 1 } }
						).toArray()
					: [],
				vVariationIds.length > 0
					? ProductVariations.find(
							{ variation_id: { $in: vVariationIds } },
							{ projection: { variation_id: 1, label: 1 } }
						).toArray()
					: []
			]);

			versionLenderMap = new Map(vLenders.map((l) => [l.lender_id, l.lender_name]));
			const vProductTypeMap = new Map(vProducts.map((p) => [p.product_id, p.product_type]));
			versionVariationMap = new Map(vVariations.map((v) => [v.variation_id, v.label]));

			// Build product label map: product_id -> human label
			for (const [pid, ptype] of vProductTypeMap) {
				versionProductMap.set(pid, PRODUCT_TYPE_LABELS[ptype] || ptype);
			}

			// Build version -> names lookup via rules
			const ruleMap = new Map(vRules.map((r) => [r.policy_rule_id, r]));
			// Reassign maps to be keyed by policy_rule_id for easy lookup
			const ruleToLender = new Map<string, string>();
			const ruleToProduct = new Map<string, string>();
			const ruleToVariation = new Map<string, string>();
			for (const r of vRules) {
				ruleToLender.set(r.policy_rule_id, versionLenderMap.get(r.lender_id) || r.lender_id);
				ruleToProduct.set(r.policy_rule_id, versionProductMap.get(r.product_id) || r.product_id);
				ruleToVariation.set(
					r.policy_rule_id,
					versionVariationMap.get(r.variation_id) || r.variation_id
				);
			}
			versionLenderMap = ruleToLender;
			versionProductMap = ruleToProduct;
			versionVariationMap = ruleToVariation;
		}

		// Build action required items
		const actionRequired: Array<{
			type: 'clarification_needed' | 'pending_review';
			id: string;
			title: string;
			subtitle: string;
			urgency?: string;
			updated_at: string;
			link: string;
		}> = [];

		for (const sub of clarificationSubs) {
			actionRequired.push({
				type: 'clarification_needed',
				id: sub.submission_id,
				title: `Clarification needed: ${sub.lender_name}`,
				subtitle: sub.description?.slice(0, 100) || 'Admin requested more information',
				urgency: sub.urgency,
				updated_at: sub.updated_at
					? new Date(sub.updated_at).toISOString()
					: new Date().toISOString(),
				link: `/dashboard/rm/submissions/${sub.submission_id}`
			});
		}

		for (const ver of pendingReviewVersions) {
			const lenderName = versionLenderMap.get(ver.policy_rule_id) || 'Unknown Lender';
			const productLabel = versionProductMap.get(ver.policy_rule_id) || '';
			actionRequired.push({
				type: 'pending_review',
				id: ver._id.toString(),
				title: `Review policy: ${lenderName}`,
				subtitle: productLabel
					? `${productLabel} — v${ver.version_number}`
					: `Version ${ver.version_number}`,
				updated_at: ver.updated_at
					? new Date(ver.updated_at).toISOString()
					: new Date().toISOString(),
				link: `/dashboard/rm/review/${ver._id.toString()}`
			});
		}

		// Sort action items by updated_at descending
		actionRequired.sort(
			(a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
		);

		// Build recently approved list
		const recentlyApproved = recentActiveVersions.map((ver) => ({
			version_id: ver._id.toString(),
			lender_name: versionLenderMap.get(ver.policy_rule_id) || 'Unknown',
			product_label: versionProductMap.get(ver.policy_rule_id) || 'Unknown',
			variation_label: versionVariationMap.get(ver.policy_rule_id) || 'Standard',
			version_number: ver.version_number,
			activated_at: ver.effective_from
				? new Date(ver.effective_from).toISOString()
				: ver.updated_at
					? new Date(ver.updated_at).toISOString()
					: new Date().toISOString()
		}));

		// Step 12: Suggested DSAs (auto-match reverse: RM → DSA)
		let suggestedDsas: Array<{
			dsa_id: string;
			dsa_name: string;
			city: string;
			score: number;
			reasons: string[];
		}> = [];

		try {
			const rmCity = (rmDoc.workingCity || rmDoc.city || '').toLowerCase().trim();
			const rmLender = (rmDoc.bankName || getLenderNameFromDomain(officialEmail) || '')
				.toLowerCase()
				.trim();
			const connectedDsaIds = new Set(allThreads.map((t) => t.dsa_id.toString()));

			// L-N2 (CODE-REVIEW-2026-05-31): when the RM has a city, push the
			// match into Mongo so the new {workingCity, onboardingCompleted,
			// is_suspended} compound index serves the query. workingCity is
			// the canonical field; the city fallback covers legacy DSAs that
			// completed onboarding before workingCity was added. We do a
			// case-insensitive prefix match via $regex anchored to start —
			// the same equality the in-memory scorer applies after lowercase.
			const baseFilter: Record<string, unknown> = {
				is_suspended: { $ne: true },
				onboardingCompleted: true
			};
			if (rmCity) {
				const escapedCity = rmCity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
				const cityRegex = new RegExp(`^${escapedCity}$`, 'i');
				baseFilter.$or = [{ workingCity: cityRegex }, { city: cityRegex }];
			}

			const dsaCandidates = await DsaApplications.find(baseFilter)
				.project({ _id: 1, name: 1, workingCity: 1, city: 1, preferredBanks: 1 })
				.limit(100)
				.toArray();

			for (const dsa of dsaCandidates) {
				const dsaId = dsa._id!.toString();
				if (connectedDsaIds.has(dsaId)) continue;

				let score = 0;
				const reasons: string[] = [];

				const dsaCity = ((dsa as any).workingCity || (dsa as any).city || '').toLowerCase().trim();
				if (rmCity && dsaCity && rmCity === dsaCity) {
					score += 40;
					reasons.push('Same city');
				}

				const dsaBanks: string[] = (dsa as any).preferredBanks || [];
				if (rmLender && dsaBanks.some((b: string) => b.toLowerCase().trim() === rmLender)) {
					score += 40;
					reasons.push('Works with your bank');
				}

				if (score > 0) {
					suggestedDsas.push({
						dsa_id: dsaId,
						dsa_name: (dsa as any).name || 'Unknown',
						city: (dsa as any).workingCity || (dsa as any).city || '',
						score,
						reasons
					});
				}
			}

			suggestedDsas.sort((a, b) => b.score - a.score);
			suggestedDsas = suggestedDsas.slice(0, 3);
		} catch (e) {
			logger.error({ err: e }, 'Suggested DSAs error');
		}

		// Preferred DSA IDs derived from rmDoc (no extra query — same doc loaded above).
		// PERF-1: previously fetched via onMount → /api/rm/preferred-dsas, now shipped via SSR.
		const preferredDsaIds = ((rmDoc as { preferred_dsa_ids?: ObjectId[] }).preferred_dsa_ids || []).map(
			(id) => id.toString()
		);

		return {
			rmProfile,
			stats: {
				casesReceived: allCases.length,
				activeCases: activeCases.length,
				dsaConnections: dsaIdSet.size,
				openQueries,
				sanctionedThisMonth: { count: sanctionedCount, amount: sanctionedAmount },
				initialReviewCount,
				finalReviewCount,
				// C.1 — policy-maintenance KPIs (RmLenderAssignments query above).
				lendersOwned,
				policiesNeedVerify
			},
			pipeline,
			attentionItems,
			recentCases,
			recentActivity,
			dsaConnections,
			hasCases: allCases.length > 0,
			hasRealCases,
			hasSampleCases,
			needsEmailVerification,
			rmEmail,
			actionRequired,
			recentlyApproved,
			suggestedDsas,
			preferredDsaIds
		};
	} catch (error) {
		logger.error({ err: error }, 'RM dashboard load error');
		return emptyResponse;
	}
};
