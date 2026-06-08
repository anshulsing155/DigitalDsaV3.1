/**
 * Admin Testing Dashboard — Server Load
 * ══════════════════════════════════════════════════════════════════
 * Loads test health, fixture profiles, synthetic profiles, and
 * quick-action links for the admin testing overview page.
 */

import type { PageServerLoad } from './$types';
import { requireRole, requireAdminPermissionPage } from '$lib/server/guards.js';
import {
	LenderRuleFixtures,
	SyntheticProfiles,
	LenderRuleArtifacts,
	PolicyRules
} from '$lib/database/mongo.js';
import { readFile } from 'fs/promises';
import { resolve } from 'path';

export const load: PageServerLoad = async ({ locals }) => {
	requireRole(locals, 'admin');
	requireAdminPermissionPage(locals, 'rule_authoring');

	// ── 1. Test Health Summary ──────────────────────────────────
	let testHealth: {
		available: boolean;
		totalTests?: number;
		passedTests?: number;
		failedTests?: number;
		lastRun?: string;
	} = { available: false };

	try {
		const resultsPath = resolve('test-results/vitest/results.json');
		const raw = await readFile(resultsPath, 'utf-8');
		const parsed = JSON.parse(raw);

		testHealth = {
			available: true,
			totalTests: parsed.numTotalTests ?? parsed.testResults?.length ?? 0,
			passedTests: parsed.numPassedTests ?? 0,
			failedTests: parsed.numFailedTests ?? 0,
			lastRun: parsed.startTime ? new Date(parsed.startTime).toISOString() : undefined
		};
	} catch {
		// File doesn't exist — expected on CI or first run
	}

	// ── 2. Fixture Profiles ─────────────────────────────────────
	const fixturesRaw = await LenderRuleFixtures.find({}).sort({ fixture_id: 1 }).toArray();

	const fixtures = fixturesRaw.map((f) => ({
		_id: f._id.toString(),
		fixture_id: f.fixture_id,
		name: f.name,
		description: f.description,
		loan_type: (f.payload as any)?.loanTransaction?.loanName || 'Unknown',
		employment_type: (f.payload as any)?.allApplicantDetails?.[0]?.employmentType || 'Unknown',
		created_at: f.created_at.toISOString()
	}));

	// ── 3. Synthetic Profiles Summary ───────────────────────────
	const syntheticPipeline = await SyntheticProfiles.aggregate([
		{
			$group: {
				_id: '$loan_type',
				count: { $sum: 1 },
				latest: { $max: '$created_at' }
			}
		},
		{ $sort: { _id: 1 } }
	]).toArray();

	const syntheticSummary = syntheticPipeline.map((g) => ({
		loan_type: g._id,
		count: g.count,
		latest: g.latest?.toISOString() ?? null
	}));

	const syntheticTotal = syntheticPipeline.reduce((sum, g) => sum + g.count, 0);

	// ── 4. Quick Links: active artifacts ────────────────────────
	const activeArtifacts = await LenderRuleArtifacts.find({ status: 'active' })
		.project({ _id: 1, artifact_id: 1, lender_name: 1 })
		.sort({ lender_name: 1 })
		.limit(20)
		.toArray();

	const artifactLinks = activeArtifacts.map((a) => ({
		_id: a._id.toString(),
		artifact_id: a.artifact_id,
		lender_name: a.lender_name
	}));

	// ── 5. Active policy rules count ────────────────────────────
	const activeRuleCount = await PolicyRules.countDocuments({ is_active: true });

	return {
		testHealth,
		fixtures,
		syntheticSummary,
		syntheticTotal,
		artifactLinks,
		activeRuleCount
	};
};
