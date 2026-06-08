/**
 * Admin E2E Form Fill — Server Load
 * ══════════════════════════════════════════════════════════════════
 * Loads fixture/synthetic profiles and recent E2E runs for the
 * admin form fill orchestration page.
 * ══════════════════════════════════════════════════════════════════
 */

import type { PageServerLoad } from './$types';
import { requireRole, requireAdminPermissionPage } from '$lib/server/guards.js';
import { LenderRuleFixtures, SyntheticProfiles, E2eTestRuns } from '$lib/database/mongo.js';

export const load: PageServerLoad = async ({ locals }) => {
	requireRole(locals, 'admin');
	requireAdminPermissionPage(locals, 'rule_authoring');

	// ── Fixture Profiles ────────────────────────────────────────
	const fixturesRaw = await LenderRuleFixtures.find({}).sort({ fixture_id: 1 }).toArray();

	const fixtures = fixturesRaw.map((f) => ({
		_id: f._id.toString(),
		fixture_id: f.fixture_id,
		name: f.name,
		description: f.description,
		loan_type:
			(f.payload as Record<string, unknown> & { loanTransaction?: { loanName?: string } })
				?.loanTransaction?.loanName || 'Unknown',
		employment_type:
			(
				f.payload as Record<string, unknown> & {
					allApplicantDetails?: Array<{ employmentType?: string }>;
				}
			)?.allApplicantDetails?.[0]?.employmentType || 'Unknown',
		created_at: f.created_at.toISOString()
	}));

	// ── Synthetic Profiles ──────────────────────────────────────
	const syntheticsRaw = await SyntheticProfiles.find({})
		.sort({ loan_type: 1, profile_id: 1 })
		.toArray();

	const synthetics = syntheticsRaw.map((s) => ({
		_id: s._id?.toString(),
		profile_id: s.profile_id,
		loan_type: s.loan_type,
		employment_type: s.metadata?.employment_type || 'Unknown',
		tags: s.metadata?.tags || [],
		created_at: s.created_at.toISOString()
	}));

	// ── Recent E2E Runs ─────────────────────────────────────────
	const runsRaw = await E2eTestRuns.find({}).sort({ created_at: -1 }).limit(10).toArray();

	const recentRuns = runsRaw.map((r) => ({
		run_id: r.run_id,
		profile_type: r.profile_type,
		profile_id: r.profile_id,
		loan_type: r.loan_type,
		status: r.status,
		current_page: r.current_page,
		total_pages: r.total_pages,
		screenshot_count: r.screenshots?.length ?? 0,
		error: r.error,
		created_at: r.created_at.toISOString(),
		completed_at: r.completed_at?.toISOString(),
		duration_ms: r.completed_at ? r.completed_at.getTime() - r.created_at.getTime() : null
	}));

	return {
		fixtures,
		synthetics,
		recentRuns
	};
};
