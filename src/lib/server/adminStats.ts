/**
 * Admin dashboard server helpers
 * ══════════════════════════════════════════════════════════════════
 * Shared between `+page.server.ts` load (SSR) and `+server.ts` API
 * routes for the admin home dashboard. Same pattern as `rmHelpers.ts`:
 * data-fetching extracted, permission checks live in the caller.
 *
 *   /api/admin/account-stats     → uses getAccountStats()
 *   /api/admin/testing-activity  → uses getTestingActivity()
 *   /dashboard/admin/+page.server.ts → uses both, in parallel
 * ══════════════════════════════════════════════════════════════════
 */

import {
	Applicant,
	DsaApplications,
	rmApplications,
	deletedUsers,
	deletedDsa,
	LenderRuleArtifacts,
	LenderRuleFixtures,
	SyntheticProfiles,
	E2eTestRuns,
	Lenders,
	RmLenderAssignments,
	PmsLenderPolicies
} from '$lib/database/mongo.js';

// ── Account Stats ───────────────────────────────────────────────

export interface AccountRoleStats {
	total: number;
	active: number;
	inactive: number;
	deleted: number;
}

export interface AccountStatsData {
	summary: {
		user: AccountRoleStats;
		dsa: AccountRoleStats;
		rm: AccountRoleStats;
	};
	totals: AccountRoleStats;
	recentDeletions: Array<{
		name: string;
		email: string;
		mobileNumber: number;
		role: string;
		deletedAt: string;
	}>;
	inactiveUsers: Array<{
		name: string;
		email: string;
		mobileNumber: number;
		role: string;
		lastActiveAt: string | null;
	}>;
	pipelineStatus: Record<string, number>;
}

/**
 * Aggregates DSA / RM / Applicant account counts plus recent-deletion
 * and inactive-user lists. Heavy parallel-Promise query — typical
 * latency 200-400ms against Atlas.
 *
 * Throws on DB errors so callers can decide whether to 500 (API) or
 * render an error banner (page load).
 */
export async function getAccountStats(): Promise<AccountStatsData> {
	const cutoff = new Date();
	cutoff.setDate(cutoff.getDate() - 180);

	const inactiveFilter = {
		$or: [{ lastActiveAt: { $lt: cutoff } }, { lastActiveAt: { $exists: false } }]
	};

	const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

	// 8s server-side timeout — prevents hanging requests
	const queryOpts = { maxTimeMS: 8000 };

	const [
		userTotal,
		dsaTotal,
		userInactive,
		dsaInactive,
		userDeleted,
		dsaDeleted,
		recentDeletedUsers,
		recentDeletedDsa,
		inactiveUsersList,
		inactiveDsaList,
		rmTotal,
		rmInactive,
		pipelineAgg
	] = await Promise.all([
		Applicant.countDocuments({}, queryOpts),
		DsaApplications.countDocuments({}, queryOpts),
		Applicant.countDocuments(inactiveFilter, queryOpts),
		DsaApplications.countDocuments(inactiveFilter, queryOpts),
		deletedUsers.countDocuments({}, queryOpts),
		deletedDsa.countDocuments({}, queryOpts),
		deletedUsers
			.find({ deletedAt: { $gte: thirtyDaysAgo } })
			.project({ name: 1, email: 1, mobileNumber: 1, deletedAt: 1 })
			.sort({ deletedAt: -1 })
			.limit(10)
			.maxTimeMS(8000)
			.toArray(),
		deletedDsa
			.find({ deletedAt: { $gte: thirtyDaysAgo } })
			.project({ name: 1, email: 1, mobileNumber: 1, deletedAt: 1 })
			.sort({ deletedAt: -1 })
			.limit(10)
			.maxTimeMS(8000)
			.toArray(),
		Applicant.find(inactiveFilter)
			.project({ name: 1, email: 1, mobileNumber: 1, lastActiveAt: 1 })
			.sort({ lastActiveAt: 1 })
			.limit(20)
			.maxTimeMS(8000)
			.toArray(),
		DsaApplications.find(inactiveFilter)
			.project({ name: 1, email: 1, mobileNumber: 1, lastActiveAt: 1 })
			.sort({ lastActiveAt: 1 })
			.limit(20)
			.maxTimeMS(8000)
			.toArray(),
		rmApplications.countDocuments({}, queryOpts),
		rmApplications.countDocuments(inactiveFilter, queryOpts),
		LenderRuleArtifacts.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }])
			.maxTimeMS(8000)
			.toArray()
	]);

	// "Active" = total living accounts minus inactive ones
	const userActive = userTotal - userInactive;
	const dsaActive = dsaTotal - dsaInactive;
	const rmActive = rmTotal - rmInactive;

	const mapDeleted = (docs: Array<Record<string, unknown>>, role: string) =>
		docs.map((u) => ({
			name: u.name as string,
			email: u.email as string,
			mobileNumber: u.mobileNumber as number,
			deletedAt: (u.deletedAt as Date).toISOString
				? (u.deletedAt as Date).toISOString()
				: String(u.deletedAt),
			role
		}));

	const mapInactive = (docs: Array<Record<string, unknown>>, role: string) =>
		docs.map((u) => {
			const la = u.lastActiveAt as Date | null | undefined;
			return {
				name: u.name as string,
				email: u.email as string,
				mobileNumber: u.mobileNumber as number,
				lastActiveAt: la ? (la.toISOString ? la.toISOString() : String(la)) : null,
				role
			};
		});

	const recentDeletions = [
		...mapDeleted(recentDeletedUsers, 'User'),
		...mapDeleted(recentDeletedDsa, 'DSA')
	]
		.sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime())
		.slice(0, 20);

	const inactiveUsers = [
		...mapInactive(inactiveUsersList, 'User'),
		...mapInactive(inactiveDsaList, 'DSA')
	]
		.sort(
			(a, b) => new Date(a.lastActiveAt ?? 0).getTime() - new Date(b.lastActiveAt ?? 0).getTime()
		)
		.slice(0, 30);

	const pipelineStatus: Record<string, number> = {};
	for (const item of pipelineAgg) {
		pipelineStatus[item._id as string] = item.count;
	}

	return {
		summary: {
			user: { total: userTotal, active: userActive, inactive: userInactive, deleted: userDeleted },
			dsa: { total: dsaTotal, active: dsaActive, inactive: dsaInactive, deleted: dsaDeleted },
			rm: { total: rmTotal, active: rmActive, inactive: rmInactive, deleted: 0 }
		},
		totals: {
			total: userTotal + dsaTotal + rmTotal,
			active: userActive + dsaActive + rmActive,
			inactive: userInactive + dsaInactive + rmInactive,
			deleted: userDeleted + dsaDeleted
		},
		recentDeletions,
		inactiveUsers,
		pipelineStatus
	};
}

// ── Testing Activity ────────────────────────────────────────────

export interface TestingActivityData {
	/** Grouped by lender_name. Each group exposes its product count + the
	 *  first artifact's id (used as the entry point for "test this lender"
	 *  links). Pre-C.8 this was a flat list — one entry per (lender, product),
	 *  which made "AU Small Finance Bank ×4" read as broken UI. */
	activeArtifacts: Array<{
		_id: string;
		artifact_id: string;
		lender_name: string;
		productCount: number;
	}>;
	fixtureCount: number;
	syntheticCount: number;
	recentE2eRuns: Array<{
		run_id: string;
		profile_id: string;
		loan_type: string;
		status: string;
		created_at: string;
		duration_ms: number | null;
	}>;
}

/**
 * Returns testing-activity dashboard data: active rule artifacts,
 * fixture / synthetic-profile counts, and recent E2E test runs.
 * Independent of getAccountStats() — can run in parallel.
 */
export async function getTestingActivity(): Promise<TestingActivityData> {
	const queryOpts = { maxTimeMS: 8000 };

	const [activeArtifacts, fixtureCount, syntheticCount, recentRuns] = await Promise.all([
		LenderRuleArtifacts.find({ status: 'active', json_logic: { $ne: null } })
			.project({ _id: 1, artifact_id: 1, lender_name: 1 })
			.sort({ lender_name: 1 })
			.limit(20)
			.maxTimeMS(8000)
			.toArray(),
		LenderRuleFixtures.countDocuments({}, queryOpts),
		SyntheticProfiles.countDocuments({}, queryOpts),
		E2eTestRuns.find({}).sort({ created_at: -1 }).limit(10).maxTimeMS(8000).toArray()
	]);

	// C.8 — group by lender_name so 4× "AU Small Finance Bank" collapses to
	// one chip with "·4 products". The artifact id used for the click-through
	// is the first one we see for that lender (sorted by lender_name above,
	// so deterministic).
	const groupedByLender = new Map<
		string,
		{ _id: string; artifact_id: string; lender_name: string; productCount: number }
	>();
	for (const a of activeArtifacts) {
		const existing = groupedByLender.get(a.lender_name);
		if (existing) {
			existing.productCount += 1;
		} else {
			groupedByLender.set(a.lender_name, {
				_id: a._id.toString(),
				artifact_id: a.artifact_id,
				lender_name: a.lender_name,
				productCount: 1
			});
		}
	}

	return {
		activeArtifacts: Array.from(groupedByLender.values()),
		fixtureCount,
		syntheticCount,
		recentE2eRuns: recentRuns.map((r) => ({
			run_id: r.run_id,
			// profile_id / loan_type are nullable in the schema (early runs created
			// before the fields were required). Coerce to '' so downstream UI
			// doesn't need to handle undefined.
			profile_id: r.profile_id ?? '',
			loan_type: r.loan_type ?? '',
			status: r.status,
			created_at: r.created_at.toISOString(),
			duration_ms: r.completed_at ? r.completed_at.getTime() - r.created_at.getTime() : null
		}))
	};
}

// ── Lender Coverage Stats (C.6) ─────────────────────────────────

/** Canonical "how many lenders" counts. The audit reported four numbers
 *  appearing across the admin/RM dashboards (288/78/62/0) with no labels
 *  explaining the difference. This shape gives each its definition and
 *  prevents drift — every consumer that renders a lender count should
 *  pull from `getLenderCoverageStats()`. */
export interface LenderCoverageStats {
	/** Total rows in the Lenders master collection (seeded). The widest
	 *  number — includes inactive entries. Useful for ops, not customer-facing. */
	lenderRecords: number;
	/** Lenders with status='active'. The "live master list" count. */
	activeLenders: number;
	/** Distinct lenderIds with at least one RmLenderAssignment (status='active').
	 *  Tells you how many lenders have a human RM contact onboarded. */
	lendersWithAssignedRm: number;
	/** Distinct lenderIds with at least one PmsLenderPolicies document in
	 *  status='published'. This is the customer/investor-facing coverage
	 *  number — "we can actually evaluate against this bank." */
	lendersWithPublishedPolicy: number;
}

/**
 * Returns the four canonical lender counts in a single round-trip.
 * Each count is sourced from a different collection, but they are all
 * indexed-lookups so the parallel `Promise.all` is cheap.
 */
export async function getLenderCoverageStats(): Promise<LenderCoverageStats> {
	const queryOpts = { maxTimeMS: 8000 };

	const [lenderRecords, activeLenders, assignedDistinct, publishedDistinct] = await Promise.all([
		Lenders.countDocuments({}, queryOpts),
		Lenders.countDocuments({ status: 'active' }, queryOpts),
		// `distinct` returns the array of unique lenderId values, so .length is
		// the count we want. Only count active assignments (suspended +
		// pending_verification don't represent a usable RM relationship).
		RmLenderAssignments.distinct('lenderId', { status: 'active' }),
		PmsLenderPolicies.distinct('lenderId', { status: 'published' })
	]);

	return {
		lenderRecords,
		activeLenders,
		lendersWithAssignedRm: assignedDistinct.length,
		lendersWithPublishedPolicy: publishedDistinct.length
	};
}
