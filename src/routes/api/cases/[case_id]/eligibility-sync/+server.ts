/**
 * POST /api/cases/[case_id]/eligibility-sync
 * ══════════════════════════════════════════════════════════════════
 * Syncs rule engine results into per-lender eligibility snapshots
 * and auto-applies document checklists for eligible lender apps.
 *
 * Called fire-and-forget from the evaluating page after results are
 * persisted. Idempotent — safe to call multiple times.
 * ══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from './$types';
import { LenderResultsSnapshots, Cases } from '$lib/database/mongo.js';
import { resolveEffectiveDsaId, verifyCaseOwnership } from '$lib/server/caseHelpers.js';
import { blockDemoWrite, requireAuthApi, requireTeamPermission } from '$lib/server/guards.js';
import type { LenderResult } from '$lib/types/lenderResults.js';
import type { DocumentChecklistItem } from '$lib/types/case.js';
import {
	COMMON_DOCUMENT_TEMPLATES,
	EMPLOYMENT_DOCUMENT_TEMPLATES,
	type DocumentTemplate
} from '$lib/server/data/documentTemplates.js';
import crypto from 'crypto';
import { apiOk, apiError, apiServerError } from '$lib/server/apiResponse.js';

export const POST: RequestHandler = async ({ params, locals }) => {
	const denied = requireAuthApi(locals);
	if (denied) return denied;

	const permDenied = requireTeamPermission(locals, 'results_view');
	if (permDenied) return permDenied;

	const demoBlocked = blockDemoWrite(locals);
	if (demoBlocked) return demoBlocked;

	try {
		const result = await resolveEffectiveDsaId(locals);
		if (!result.ok) {
			return apiError(result.error, 404);
		}

		const ownership = await verifyCaseOwnership(params.case_id, result.dsaId);
		if (!ownership.ok) {
			const status = ownership.error === 'Case not found' ? 404 : 403;
			return apiError(ownership.error, status);
		}

		const caseDoc = ownership.caseDoc;

		// Load latest results snapshot
		const latestSnapshot = await LenderResultsSnapshots.findOne(
			{ case_id: params.case_id },
			{ sort: { version: -1 } }
		);

		if (!latestSnapshot || !latestSnapshot.payload?.results?.length) {
			return apiOk({ synced: 0, skipped: 0, docs_applied: 0, message: 'No results to sync' });
		}

		const results: LenderResult[] = latestSnapshot.payload.results;
		const lenderApps = caseDoc.lender_applications || [];

		// Extract primary applicant's employment type from results payload
		const employmentType = extractEmploymentType(latestSnapshot.payload);

		let synced = 0;
		let skipped = 0;
		let docsApplied = 0;
		const now = new Date();
		const bulkOps: any[] = [];

		for (const lr of results) {
			// Find matching lender application by lender_name
			const laIndex = lenderApps.findIndex((la) => la.lender_name === lr.lender_name);

			if (laIndex === -1) {
				skipped++;
				continue;
			}

			const la = lenderApps[laIndex];

			// Build eligibility snapshot from LenderResult
			const eligibilitySnapshot = {
				traffic_light: lr.traffic_light,
				message: lr.traffic_light_message,
				computed_at: now,
				offered_amount: lr.offered_amount,
				roi: lr.roi,
				emi: lr.emi,
				approval_probability: lr.key_metrics?.approval_probability,
				foir: lr.key_metrics?.foir,
				ltv: lr.key_metrics?.ltv
			};

			bulkOps.push({
				updateOne: {
					filter: { case_id: params.case_id, dsa_id: result.dsaId },
					update: {
						$set: {
							[`lender_applications.${laIndex}.eligibility_snapshot`]: eligibilitySnapshot,
							[`lender_applications.${laIndex}.updated_at`]: now,
							updated_at: now
						}
					}
				}
			});
			synced++;

			// Auto-apply document checklist for green/amber lenders with empty checklist
			if (
				(lr.traffic_light === 'green' || lr.traffic_light === 'amber') &&
				(!la.document_checklist || la.document_checklist.length === 0) &&
				employmentType
			) {
				const templates = buildDocumentChecklist(employmentType);
				if (templates.length > 0) {
					const checklistItems: DocumentChecklistItem[] = templates.map((t) => ({
						doc_id: crypto.randomUUID(),
						doc_name: t.doc_name,
						category: t.category,
						is_mandatory: t.is_mandatory,
						description: t.description,
						status: 'not_started' as const,
						validity: {
							is_fresh: true,
							freshness_rule_days: t.freshness_rule_days
						}
					}));

					bulkOps.push({
						updateOne: {
							filter: { case_id: params.case_id, dsa_id: result.dsaId },
							update: {
								$set: {
									[`lender_applications.${laIndex}.document_checklist`]: checklistItems
								}
							}
						}
					});
					docsApplied++;
				}
			}
		}

		// Execute bulk write
		if (bulkOps.length > 0) {
			await Cases.bulkWrite(bulkOps);
		}

		return apiOk({ synced, skipped, docs_applied: docsApplied });
	} catch (err) {
		return apiServerError(err, 'Failed to sync eligibility snapshots');
	}
};

// ── Helpers ─────────────────────────────────────────────────────────

/** Extract primary applicant's employment type from the results payload */
function extractEmploymentType(payload: any): string | null {
	try {
		// The original LoanApplicationPayload is stored in the results
		// payload at construction time. We also check the results metadata.
		// The allApplicantDetails may be in the stored payload or we can
		// infer from the first applicant's profile.
		const applicants = payload?.allApplicantDetails;
		if (Array.isArray(applicants) && applicants.length > 0) {
			const primary = applicants[0];
			return primary.employmentType || primary.EmploymentType || primary.employment_type || null;
		}
	} catch {
		// Ignore extraction errors
	}
	return null;
}

/** Build a merged document checklist from common + employment-type templates */
function buildDocumentChecklist(employmentType: string): DocumentTemplate[] {
	const empTemplates = EMPLOYMENT_DOCUMENT_TEMPLATES[employmentType] || [];
	const merged = [...COMMON_DOCUMENT_TEMPLATES];

	// Add employment-specific templates, skip duplicates by doc_name
	const existingNames = new Set(merged.map((t) => t.doc_name));
	for (const t of empTemplates) {
		if (!existingNames.has(t.doc_name)) {
			merged.push(t);
			existingNames.add(t.doc_name);
		}
	}

	return merged;
}
