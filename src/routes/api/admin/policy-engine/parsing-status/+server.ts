/**
 * GET /api/admin/policy-engine/parsing-status
 * ═══════════════════════════════════════════════════════════════════
 * Returns the list of LenderRuleArtifacts currently in `parsing` status.
 *
 * Why this endpoint exists:
 *   The admin policy-approvals page (/dashboard/admin/policies/approvals)
 *   needs to refresh its "currently parsing" banner every 10 seconds
 *   while a parse is in-flight. Previously the page used SvelteKit's
 *   invalidateAll() on a setInterval, which re-ran the entire SSR load
 *   (four separate Mongo queries + enrichment) per tick — coarse and
 *   wasteful. PERF-3 (TanStack Query adoption) replaces that with a
 *   scoped client-side query backed by THIS endpoint.
 *
 * Response shape mirrors the equivalent slice of the SSR load so the
 * page's `initialData` (seeded from SSR) and the live query data are
 * structurally identical.
 *
 * Auth: admin-only. No per-resource BOLA — parsing artifacts are a
 * global admin queue, not owned by anyone.
 *
 * Reference: docs/specs/PERF-3-NEXT-CANDIDATE-PLAN.md §Round 2.
 * ═══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from '@sveltejs/kit';
import { requireRoleApi, requireAdminPermission } from '$lib/server/guards.js';
import { LenderRuleArtifacts } from '$lib/database/mongo.js';
import { apiOk, apiServerError } from '$lib/server/apiResponse.js';

export const GET: RequestHandler = async ({ locals }) => {
	const denied = requireRoleApi(locals, 'admin');
	if (denied) return denied;
	const permDenied = requireAdminPermission(locals, 'rule_authoring');
	if (permDenied) return permDenied;

	try {
		const artifacts = await LenderRuleArtifacts.find({ status: 'parsing' })
			.project({ artifact_id: 1, lender_name: 1, lender_id: 1, updated_at: 1 })
			.toArray();

		const parsingArtifacts = artifacts.map((a) => ({
			_id: a._id.toString(),
			artifact_id: a.artifact_id,
			lender_name: a.lender_name,
			updated_at: a.updated_at ? new Date(a.updated_at).toISOString() : null
		}));

		return apiOk({
			parsingArtifacts,
			count: parsingArtifacts.length
		});
	} catch (err) {
		return apiServerError(err, 'Failed to load parsing status');
	}
};
