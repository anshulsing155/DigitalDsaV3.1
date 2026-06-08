/**
 * GET /api/test/e2e-run-config?runId=xxx
 * ══════════════════════════════════════════════════════════════════
 * Dev-only endpoint consumed by Playwright data-driven filler.
 * Reads an E2eTestRun doc, generates fill config from the profile
 * payload, stores it in the doc, and returns it.
 * ══════════════════════════════════════════════════════════════════
 */

import { dev } from '$app/environment';
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { apiOk, apiError } from '$lib/server/apiResponse.js';
import { E2eTestRuns, LenderRuleFixtures, SyntheticProfiles } from '$lib/database/mongo.js';
import { generateFillConfig } from '$lib/server/testing/payloadToFillInstructions.js';
import type { LoanApplicationPayload } from '$lib/utils/payloadBuilder.js';

export const GET: RequestHandler = async ({ url }) => {
	if (!dev) throw error(404, 'Not found');

	const runId = url.searchParams.get('runId');
	if (!runId) {
		return apiError('Missing runId parameter');
	}

	const run = await E2eTestRuns.findOne({ run_id: runId });
	if (!run) {
		return apiError(`Run not found: ${runId}`, 404);
	}

	// If fill_config already computed, return it
	if (run.fill_config) {
		return apiOk(run.fill_config);
	}

	// Load the profile payload
	let payload: LoanApplicationPayload | null = null;

	if (run.profile_type === 'fixture') {
		const fixture = await LenderRuleFixtures.findOne({ fixture_id: run.profile_id });
		if (!fixture) {
			return apiError(`Fixture not found: ${run.profile_id}`, 404);
		}
		payload = fixture.payload as unknown as LoanApplicationPayload;
	} else if (run.profile_type === 'synthetic') {
		const profile = await SyntheticProfiles.findOne({ profile_id: run.profile_id });
		if (!profile) {
			return apiError(`Synthetic profile not found: ${run.profile_id}`, 404);
		}
		payload = profile.payload as unknown as LoanApplicationPayload;
	}

	if (!payload) {
		return apiError('Could not load profile payload', 500);
	}

	// Generate fill config
	const fillConfig = generateFillConfig(payload);

	// Store in the run doc for debugging
	await E2eTestRuns.updateOne(
		{ run_id: runId },
		{
			$set: {
				fill_config: fillConfig,
				total_pages: fillConfig.pages.length,
				updated_at: new Date()
			}
		}
	);

	return apiOk(fillConfig);
};
