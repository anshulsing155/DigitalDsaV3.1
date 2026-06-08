/**
 * POST /api/admin/policies/seed
 * Seeds test fixtures, sample rule documents, real bank rules,
 * lender entries, and 500 synthetic profiles.
 * Admin-only, idempotent (safe to call multiple times).
 */

import type { RequestHandler } from '@sveltejs/kit';
import { requireRoleApi, requireAdminPermission } from '$lib/server/guards.js';
import { apiOk, apiServerError } from '$lib/server/apiResponse.js';
import logger from '$lib/server/logger.js';
import { seedAll } from '$lib/testing/fixtures/seedFixtures.js';

export const POST: RequestHandler = async ({ locals }) => {
	const denied = requireRoleApi(locals, 'admin');
	if (denied) return denied;
	const permDenied = requireAdminPermission(locals, 'rule_authoring');
	if (permDenied) return permDenied;

	try {
		const result = await seedAll();

		logger.info({ result }, 'Seed operation completed');

		return apiOk({
			message: 'Seed completed successfully',
			fixtures_inserted: result.fixtures.inserted,
			fixtures_skipped: result.fixtures.skipped,
			sample_rules_inserted: result.sample_rules.inserted,
			sample_rules_skipped: result.sample_rules.skipped,
			real_bank_rules_inserted: result.real_bank_rules.inserted,
			real_bank_rules_skipped: result.real_bank_rules.skipped,
			lender_entries_inserted: result.lender_entries.inserted,
			lender_entries_skipped: result.lender_entries.skipped,
			synthetics_inserted: result.synthetic_profiles.inserted,
			synthetics_skipped: result.synthetic_profiles.skipped
		});
	} catch (err) {
		return apiServerError(err, 'Failed to seed test data');
	}
};
