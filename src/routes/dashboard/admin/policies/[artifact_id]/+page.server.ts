import type { PageServerLoad } from './$types';
import { requireRole } from '$lib/server/guards.js';
import { LenderRuleArtifacts } from '$lib/database/mongo.js';
import { ObjectId } from 'mongodb';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals, params }) => {
	requireRole(locals, 'admin');

	// Unparseable ObjectId → 404 (the resource cannot exist), not 400.
	// Same rationale as qa/[id]/+page.server.ts — friendlier error page if
	// any future static-slug sibling under /policies/ accidentally collides.
	let artifactOid: ObjectId;
	try {
		artifactOid = new ObjectId(params.artifact_id);
	} catch {
		throw error(404, 'Artifact not found');
	}

	const artifact = await LenderRuleArtifacts.findOne({ _id: artifactOid });
	if (!artifact) {
		throw error(404, 'Artifact not found');
	}

	// last_parse_error is set by reparse/+server.ts when AI parsing throws.
	// Not declared in the schema — read defensively via a narrow cast.
	const lastParseErrorRaw = (artifact as { last_parse_error?: { message?: string; at?: Date } })
		.last_parse_error;
	const lastParseError =
		lastParseErrorRaw && lastParseErrorRaw.message
			? {
					message: lastParseErrorRaw.message,
					at: lastParseErrorRaw.at ? new Date(lastParseErrorRaw.at).toISOString() : null
				}
			: null;

	return {
		artifact: {
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
			// Version tracking
			change_summary: artifact.change_summary || null,
			previous_version_id: artifact.previous_version_id || null,
			changes_from_previous: artifact.changes_from_previous || null,
			// Soft-delete tracking
			deleted_by: artifact.deleted_by || null,
			deleted_at: artifact.deleted_at ? new Date(artifact.deleted_at).toISOString() : null,
			created_at: artifact.created_at ? new Date(artifact.created_at).toISOString() : null,
			activated_at: artifact.activated_at ? new Date(artifact.activated_at).toISOString() : null,
			updated_at: artifact.updated_at ? new Date(artifact.updated_at).toISOString() : null,
			last_parse_error: lastParseError
		}
	};
};
