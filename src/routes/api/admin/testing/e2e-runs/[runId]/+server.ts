/**
 * GET   /api/admin/testing/e2e-runs/[runId] — Run status (admin auth)
 * PATCH /api/admin/testing/e2e-runs/[runId] — Update progress (dev-only, Playwright)
 * ══════════════════════════════════════════════════════════════════
 */

import { dev } from '$app/environment';
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRoleApi, requireAdminPermission } from '$lib/server/guards.js';
import { apiOk, apiError, parseJsonBody } from '$lib/server/apiResponse.js';
import { E2eTestRuns } from '$lib/database/mongo.js';

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!dev) throw error(404, 'Not found');

	const denied = requireRoleApi(locals, 'admin');
	if (denied) return denied;
	const permDenied = requireAdminPermission(locals, 'rule_authoring');
	if (permDenied) return permDenied;

	const run = await E2eTestRuns.findOne(
		{ run_id: params.runId },
		{
			projection: {
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
				fill_config: 1,
				error: 1,
				output: 1,
				duration_ms: 1,
				created_at: 1,
				updated_at: 1,
				completed_at: 1
			}
		}
	);

	if (!run) {
		return apiError('Run not found', 404);
	}

	return apiOk(run);
};

export const PATCH: RequestHandler = async ({ params, request }) => {
	// PATCH is dev-only — called by Playwright to report progress
	if (!dev) throw error(404, 'Not found');

	const parsed = await parseJsonBody<{
		status?: string;
		current_page?: number;
		current_page_id?: string;
		screenshots?: Array<{ page_id: string; path: string; timestamp: string }>;
		error?: string;
	}>(request);
	if (!parsed.ok) return parsed.response;
	const body = parsed.data;

	const { status, current_page, current_page_id, screenshots, error: runError } = body;

	const $set: Record<string, unknown> = { updated_at: new Date() };

	if (status) {
		$set.status = status;
		if (status === 'completed' || status === 'failed') {
			$set.completed_at = new Date();
		}
	}

	if (current_page !== undefined) $set.current_page = current_page;
	if (current_page_id) $set.current_page_id = current_page_id;
	if (runError) $set.error = runError;

	const update: Record<string, unknown> = { $set };

	// Append screenshots if provided
	if (screenshots && Array.isArray(screenshots)) {
		update.$push = {
			screenshots: {
				$each: screenshots.map((s) => ({
					page_id: s.page_id,
					path: s.path,
					timestamp: new Date(s.timestamp)
				}))
			}
		};
	}

	const result = await E2eTestRuns.updateOne({ run_id: params.runId }, update);

	if (result.matchedCount === 0) {
		return apiError('Run not found', 404);
	}

	return apiOk();
};
