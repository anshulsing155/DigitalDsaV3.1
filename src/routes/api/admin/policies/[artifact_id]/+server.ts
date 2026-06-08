/**
 * GET /api/admin/policies/[artifact_id]
 * Return a single rule artifact in the same shape the page's SSR load() returns.
 *
 * Used by TanStack Query on the artifact detail page to poll for status updates
 * (e.g. parsing → in_review) without forcing a full SvelteKit load() round-trip.
 * Admin-only. No body. PERF-3 introduced this endpoint as part of the pilot
 * migration; see CLAUDE.md Pitfall #28 and .claude/protocols/tanstack-query-migration.md.
 */

import type { RequestHandler } from '@sveltejs/kit';
import { ObjectId } from 'mongodb';
import { requireRoleApi, requireAdminPermission } from '$lib/server/guards.js';
import { apiOk, apiError, apiServerError } from '$lib/server/apiResponse.js';
import { LenderRuleArtifacts } from '$lib/database/mongo.js';

export const GET: RequestHandler = async ({ locals, params }) => {
	const denied = requireRoleApi(locals, 'admin');
	if (denied) return denied;
	const permDenied = requireAdminPermission(locals, 'rule_authoring');
	if (permDenied) return permDenied;

	try {
		if (!params.artifact_id || !ObjectId.isValid(params.artifact_id)) {
			return apiError('Invalid artifact ID', 400);
		}

		const artifact = await LenderRuleArtifacts.findOne({ _id: new ObjectId(params.artifact_id) });
		if (!artifact) {
			return apiError('Artifact not found', 404);
		}

		const lastParseErrorRaw = (artifact as { last_parse_error?: { message?: string; at?: Date } })
			.last_parse_error;
		const lastParseError =
			lastParseErrorRaw && lastParseErrorRaw.message
				? {
						message: lastParseErrorRaw.message,
						at: lastParseErrorRaw.at ? new Date(lastParseErrorRaw.at).toISOString() : null
					}
				: null;

		// Shape must match the page's SSR +page.server.ts load() return so the
		// TanStack Query refresh produces drop-in data the page already handles.
		return apiOk({
			_id: artifact._id.toString(),
			artifact_id: artifact.artifact_id,
			lender_id: artifact.lender_id,
			lender_name: artifact.lender_name,
			classification: artifact.classification,
			loan_types: artifact.loan_types,
			version: artifact.version,
			status: artifact.status,
			json_logic: artifact.json_logic,
			human_readable: artifact.human_readable,
			confidence_scores: artifact.confidence_scores,
			parse_iterations: artifact.parse_iterations.map((pi) => ({
				iteration: pi.iteration,
				diff_report: pi.diff_report,
				corrections_made: pi.corrections_made,
				resolved: pi.resolved,
				human_intervention_needed: pi.human_intervention_needed,
				completed_at: pi.completed_at ? new Date(pi.completed_at).toISOString() : null
			})),
			rm_review: {
				queries: artifact.rm_review.queries,
				approved_by: artifact.rm_review.approved_by || null,
				approved_at: artifact.rm_review.approved_at
					? new Date(artifact.rm_review.approved_at).toISOString()
					: null,
				thread_id: artifact.rm_review.thread_id?.toString() || null
			},
			source_document_urls: artifact.source_document_urls,
			parsed_by: artifact.parsed_by,
			reviewed_by: artifact.reviewed_by || null,
			change_summary: artifact.change_summary || null,
			previous_version_id: artifact.previous_version_id || null,
			changes_from_previous: artifact.changes_from_previous || null,
			deleted_by: artifact.deleted_by || null,
			deleted_at: artifact.deleted_at ? new Date(artifact.deleted_at).toISOString() : null,
			created_at: artifact.created_at ? new Date(artifact.created_at).toISOString() : null,
			activated_at: artifact.activated_at ? new Date(artifact.activated_at).toISOString() : null,
			updated_at: artifact.updated_at ? new Date(artifact.updated_at).toISOString() : null,
			last_parse_error: lastParseError
		});
	} catch (err) {
		return apiServerError(err, 'Failed to load artifact');
	}
};
