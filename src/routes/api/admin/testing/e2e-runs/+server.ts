/**
 * POST /api/admin/testing/e2e-runs — Create run + spawn test process
 * GET  /api/admin/testing/e2e-runs — List recent runs (optionally filtered by test_type)
 * ══════════════════════════════════════════════════════════════════
 */

import { dev } from '$app/environment';
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { TestRunType } from '$lib/types/e2eTestRun.js';
import { ObjectId } from 'mongodb';
import { exec } from 'node:child_process';
import { requireRoleApi, requireAdminPermission } from '$lib/server/guards.js';
import { apiOk, apiError, parseJsonBody, apiServerError } from '$lib/server/apiResponse.js';
import { E2eTestRuns, LenderRuleFixtures, SyntheticProfiles } from '$lib/database/mongo.js';
import logger from '$lib/server/logger.js';

const VALID_TEST_TYPES: TestRunType[] = [
	'form-fill',
	'selector-health',
	'accessibility',
	'applicant-stage',
	'full-path',
	'unit-tests'
];

/** Build the shell command for each test type */
function buildCommand(testType: TestRunType, headed: boolean): { cmd: string; timeout: number } {
	const headedFlag = headed ? ' --headed' : '';

	switch (testType) {
		case 'form-fill':
			return {
				cmd: `pnpm exec playwright test dataFill.spec.ts --project=dsa --reporter=list${headedFlag}`,
				timeout: 300_000
			};
		case 'selector-health':
			return {
				cmd: `pnpm exec playwright test selectorHealth.spec.ts accessibilityBaseline.spec.ts --project=selector-health --reporter=list${headedFlag}`,
				timeout: 120_000
			};
		case 'accessibility':
			return {
				cmd: `pnpm exec playwright test accessibilityBaseline.spec.ts --project=selector-health --reporter=list${headedFlag}`,
				timeout: 180_000
			};
		case 'applicant-stage':
			return {
				cmd: `pnpm exec playwright test applicant-secured.setup.ts --project=applicant-setup-secured --reporter=list${headedFlag}`,
				timeout: 300_000
			};
		case 'full-path':
			return {
				cmd: `pnpm exec playwright test fullPath-homeLoan.spec.ts --project=full-path-secured --reporter=list${headedFlag}`,
				timeout: 300_000
			};
		case 'unit-tests':
			return {
				cmd: 'pnpm run test:unit --reporter=json --outputFile=test-results/vitest/results.json',
				timeout: 600_000
			};
	}
}

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!dev) throw error(404, 'Not found');

	const denied = requireRoleApi(locals, 'admin');
	if (denied) return denied;
	const permDenied = requireAdminPermission(locals, 'rule_authoring');
	if (permDenied) return permDenied;

	try {
		const parsed = await parseJsonBody<{
			test_type?: string;
			profile_type?: string;
			profile_id?: string;
			loan_type?: string;
			headed?: boolean;
		}>(request);
		if (!parsed.ok) return parsed.response;

		const {
			test_type = 'form-fill',
			profile_type,
			profile_id,
			loan_type,
			headed = true
		} = parsed.data;

		// Validate test_type
		if (!VALID_TEST_TYPES.includes(test_type as TestRunType)) {
			return apiError(`Invalid test_type. Must be one of: ${VALID_TEST_TYPES.join(', ')}`, 400);
		}

		const typedTestType = test_type as TestRunType;

		// Only form-fill requires a profile (fixture/synthetic payload).
		// applicant-stage and full-path use hardcoded test data and saved browser state.
		const needsProfile = typedTestType === 'form-fill';

		if (needsProfile) {
			if (!profile_type || !profile_id || !loan_type) {
				return apiError('Missing required fields: profile_type, profile_id, loan_type', 400);
			}

			if (profile_type !== 'fixture' && profile_type !== 'synthetic') {
				return apiError('profile_type must be "fixture" or "synthetic"', 400);
			}

			// Verify profile exists
			if (profile_type === 'fixture') {
				const fixture = await LenderRuleFixtures.findOne({ fixture_id: profile_id });
				if (!fixture) {
					return apiError(`Fixture not found: ${profile_id}`, 404);
				}
			} else {
				const profile = await SyntheticProfiles.findOne({ profile_id });
				if (!profile) {
					return apiError(`Synthetic profile not found: ${profile_id}`, 404);
				}
			}
		}

		const runId = `e2e-run-${crypto.randomUUID().slice(0, 12)}`;
		const now = new Date();

		await E2eTestRuns.insertOne({
			run_id: runId,
			test_type: typedTestType,
			...(needsProfile
				? {
						profile_type: profile_type as 'fixture' | 'synthetic',
						profile_id: profile_id!,
						loan_type: loan_type!
					}
				: {}),
			status: 'pending',
			screenshots: [],
			created_by: new ObjectId(locals.user!.id),
			created_at: now,
			updated_at: now
		});

		// Build command for this test type
		const { cmd, timeout } = buildCommand(typedTestType, headed);
		const startTime = Date.now();

		exec(
			cmd,
			{
				cwd: process.cwd(),
				timeout,
				maxBuffer: 10 * 1024 * 1024,
				env: {
					...process.env,
					E2E_RUN_ID: runId
				}
			},
			async (err, stdout, stderr) => {
				const durationMs = Date.now() - startTime;
				const completedAt = new Date();
				// Capture output (truncate to 5000 chars)
				const combinedOutput = ((stderr || '').trim() + '\n' + (stdout || '').trim())
					.trim()
					.slice(0, 5000);

				const finalStatus = err ? 'failed' : 'completed';
				const updateFields: Record<string, unknown> = {
					status: finalStatus,
					output: combinedOutput,
					duration_ms: durationMs,
					updated_at: completedAt,
					completed_at: completedAt
				};
				if (err) {
					const playwrightOutput = (stderr || '').trim() || (stdout || '').trim();
					updateFields.error = playwrightOutput ? playwrightOutput.slice(0, 2000) : err.message;
				}

				try {
					await E2eTestRuns.updateOne(
						{ run_id: runId, status: { $nin: ['completed', 'failed', 'timed_out'] } },
						{ $set: updateFields }
					);
				} catch (dbErr) {
					logger.warn({ err: dbErr, runId, finalStatus }, 'Failed to update e2e test run status — auto-expire will clean up');
				}
			}
		);

		// Update status to running
		await E2eTestRuns.updateOne(
			{ run_id: runId },
			{ $set: { status: 'running', updated_at: new Date() } }
		);

		return apiOk({ run_id: runId });
	} catch (err) {
		return apiServerError(err, 'Failed to create test run');
	}
};

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!dev) throw error(404, 'Not found');

	const denied = requireRoleApi(locals, 'admin');
	if (denied) return denied;
	const permDenied = requireAdminPermission(locals, 'rule_authoring');
	if (permDenied) return permDenied;

	// Optional filter by test_type
	const typeFilter = url.searchParams.get('type');
	const filter: Record<string, unknown> = {};
	if (typeFilter && VALID_TEST_TYPES.includes(typeFilter as TestRunType)) {
		filter.test_type = typeFilter;
	}

	const staleThreshold = new Date(Date.now() - 30 * 60 * 1000);
	await E2eTestRuns.updateMany(
		{ status: 'running', updated_at: { $lt: staleThreshold } },
		{ $set: { status: 'timed_out', error: 'Auto-expired: stuck in running for over 30 minutes', completed_at: new Date() } }
	).catch((err) => logger.warn({ err }, 'Failed to auto-expire stale e2e test runs'));

	const runs = await E2eTestRuns.find(filter)
		.sort({ created_at: -1 })
		.limit(20)
		.project({
			run_id: 1,
			test_type: 1,
			profile_type: 1,
			profile_id: 1,
			loan_type: 1,
			status: 1,
			current_page: 1,
			total_pages: 1,
			current_page_id: 1,
			screenshots: 1,
			error: 1,
			output: 1,
			duration_ms: 1,
			created_at: 1,
			updated_at: 1,
			completed_at: 1
		})
		.toArray();

	return apiOk(runs);
};
