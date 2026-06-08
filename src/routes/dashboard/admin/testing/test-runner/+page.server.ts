/**
 * Admin Test Runner — Server Load
 * ══════════════════════════════════════════════════════════════════
 * Loads recent test runs (all types), fixture/synthetic profiles,
 * and latest UI health data for the unified test runner page.
 * ══════════════════════════════════════════════════════════════════
 */

import type { PageServerLoad } from './$types';
import { requireRole, requireAdminPermissionPage } from '$lib/server/guards.js';
import { E2eTestRuns, LenderRuleFixtures, SyntheticProfiles } from '$lib/database/mongo.js';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';

const A11Y_DIFF_REPORT = 'test-results/accessibility/diff-report.json';
const A11Y_TEXT_REPORT = 'test-results/accessibility/diff-report.txt';

export const load: PageServerLoad = async ({ locals }) => {
	requireRole(locals, 'admin');
	requireAdminPermissionPage(locals, 'rule_authoring');

	// ── Recent runs (all types, last 30) ────────────────────────
	const runsRaw = await E2eTestRuns.find({}).sort({ created_at: -1 }).limit(30).toArray();

	const recentRuns = runsRaw.map((r) => ({
		run_id: r.run_id,
		test_type: r.test_type || 'form-fill',
		profile_type: r.profile_type,
		profile_id: r.profile_id,
		loan_type: r.loan_type,
		status: r.status,
		current_page: r.current_page,
		total_pages: r.total_pages,
		screenshot_count: r.screenshots?.length ?? 0,
		error: r.error,
		output: r.output,
		duration_ms:
			r.duration_ms ?? (r.completed_at ? r.completed_at.getTime() - r.created_at.getTime() : null),
		created_at: r.created_at.toISOString(),
		completed_at: r.completed_at?.toISOString()
	}));

	// ── Last run per test type (for card status) ────────────────
	const testTypes = [
		'form-fill',
		'selector-health',
		'accessibility',
		'applicant-stage',
		'full-path',
		'unit-tests'
	] as const;
	const lastRunByType: Record<string, (typeof recentRuns)[number] | null> = {};
	for (const tt of testTypes) {
		lastRunByType[tt] = recentRuns.find((r) => r.test_type === tt) ?? null;
	}

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

	// ── Accessibility diff data (if available) ──────────────────
	let a11yDiff: Record<string, unknown> | null = null;
	let a11yDiffText: string | null = null;

	if (existsSync(A11Y_DIFF_REPORT)) {
		try {
			a11yDiff = JSON.parse(await readFile(A11Y_DIFF_REPORT, 'utf-8'));
		} catch {
			/* non-fatal */
		}
	}
	if (existsSync(A11Y_TEXT_REPORT)) {
		try {
			a11yDiffText = await readFile(A11Y_TEXT_REPORT, 'utf-8');
		} catch {
			/* non-fatal */
		}
	}

	return {
		recentRuns,
		lastRunByType,
		fixtures,
		synthetics,
		a11yDiff,
		a11yDiffText
	};
};
