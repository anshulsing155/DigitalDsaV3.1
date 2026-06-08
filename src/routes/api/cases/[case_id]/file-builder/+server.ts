/**
 * GET  /api/cases/[case_id]/file-builder — Preview the built file
 * POST /api/cases/[case_id]/file-builder — Generate and save a file snapshot
 * ══════════════════════════════════════════════════════════════════
 * The File Builder derives the file from form snapshot data. DSAs
 * control presentation (sections, display modes) but NEVER numbers.
 *
 * Two modes:
 *   - 'review': PII is ALWAYS stripped (system-enforced). For RM discussions.
 *   - 'submission': Full data with contact details. For file submission.
 * ══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from './$types';
import { z } from 'zod';
import { Cases, FormSnapshots, LenderResultsSnapshots } from '$lib/database/mongo.js';
import { snapshotTypeEnum } from '$lib/schemas/case.schema.js';
import {
	resolveEffectiveDsaId,
	verifyCaseOwnership,
	createTimelineEvent
} from '$lib/server/caseHelpers.js';
import { computePayloadHash } from '$lib/server/snapshotHelpers.js';
import { resolveSnapshotPayload } from '$lib/server/csfle/index.js';
import { getDefaultFileConfig, buildFilePayload, stripPII } from '$lib/server/fileConfigurator.js';
import { generateCasePDF } from '$lib/server/pdfGenerator.js';
import { blockDemoWrite, requireAuthApi, requireTeamPermission } from '$lib/server/guards.js';
import {
	apiOk,
	apiError,
	apiValidationError,
	apiServerError,
	parseJsonBody
} from '$lib/server/apiResponse.js';
import type { LenderResult } from '$lib/types/lenderResults.js';

/**
 * Load the latest LenderResultsSnapshot for a case and return the result for
 * the specific lender application. Returns undefined if no snapshot exists yet
 * (case never evaluated) or if this lender isn't in the latest results — both
 * are tolerable: the lender_offer section simply won't render in that PDF.
 *
 * LEND-1 Phase 4 (offer in file-builder PDF).
 */
async function findLenderResultForApplication(
	caseId: string,
	lenderAppId: string
): Promise<LenderResult | undefined> {
	const snapshot = await LenderResultsSnapshots.findOne(
		{ case_id: caseId },
		{ sort: { version: -1 } }
	);
	if (!snapshot) return undefined;

	return snapshot.payload.results.find((r) => r.lender_application_id === lenderAppId);
}

// ── GET — Preview the built file ─────────────────────────────────

export const GET: RequestHandler = async ({ params, locals, url }) => {
	const denied = requireAuthApi(locals);
	if (denied) return denied;

	const permDenied = requireTeamPermission(locals, 'file_builder_view');
	if (permDenied) return permDenied;

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

		// ── Parse query params ───────────────────────────────────
		const lenderAppId = url.searchParams.get('lender_app_id');
		if (!lenderAppId) {
			return apiError('lender_app_id query parameter is required', 400);
		}

		const mode = (url.searchParams.get('mode') || 'review') as 'review' | 'submission';
		if (mode !== 'review' && mode !== 'submission') {
			return apiError('mode must be "review" or "submission"', 400);
		}

		// ── Find lender application ──────────────────────────────
		const lenderApp = caseDoc.lender_applications.find(
			(la) => la.lender_application_id === lenderAppId
		);

		if (!lenderApp) {
			return apiError('Lender application not found', 404);
		}

		// ── Load latest form snapshot ────────────────────────────
		const snapshot = await FormSnapshots.findOne(
			{ case_id: params.case_id },
			{ sort: { version: -1 } }
		);

		if (!snapshot) {
			return apiError(
				'No form snapshot found for this case. Create a form snapshot first.',
				404
			);
		}

		// ── Load file config (or defaults) ───────────────────────
		const config =
			lenderApp.file_config || getDefaultFileConfig(params.case_id, caseDoc.loan?.type);

		// SEC-2 Phase C.2: resolve encrypted snapshot payload.
		const formPayload = await resolveSnapshotPayload(snapshot);
		if (!formPayload) {
			return apiError('Form snapshot has no payload data.', 422);
		}

		// ── Load latest lender results + find this lender's offer ──
		// LEND-1 Phase 4: surface the per-lender offer in the file PDF.
		// Optional — if no evaluation has been run yet, or this lender isn't
		// in the latest results, the lender_offer section simply doesn't render.
		const lenderResult = await findLenderResultForApplication(params.case_id, lenderAppId);

		// ── Build payload ────────────────────────────────────────
		let payload = buildFilePayload(formPayload, config, lenderResult);

		// System-enforced PII stripping for review mode
		const piiStripped = mode === 'review';
		if (piiStripped) {
			payload = stripPII(payload);
		}

		// ── Compute hash ─────────────────────────────────────────
		const payloadHash = computePayloadHash(payload);

		return apiOk({
			payload,
			mode,
			snapshot_version: snapshot.version,
			payload_hash: payloadHash,
			pii_stripped: piiStripped
		});
	} catch (err) {
		return apiServerError(err, 'Failed to preview file');
	}
};

// ── POST — Generate and save a file snapshot ─────────────────────

const fileSnapshotCreateSchema = z.object({
	lender_app_id: z.string().min(1, 'lender_app_id is required'),
	type: snapshotTypeEnum
});

export const POST: RequestHandler = async ({ params, request, locals }) => {
	const denied = requireAuthApi(locals);
	if (denied) return denied;

	const permDenied = requireTeamPermission(locals, 'file_builder_configure');
	if (permDenied) return permDenied;

	const demoBlocked = blockDemoWrite(locals);
	if (demoBlocked) return demoBlocked;

	const jsonParsed = await parseJsonBody<Record<string, unknown>>(request);
	if (!jsonParsed.ok) return jsonParsed.response;

	try {
		// Validate input
		const parsed = fileSnapshotCreateSchema.safeParse(jsonParsed.data);
		if (!parsed.success) {
			return apiValidationError('Validation failed', parsed.error.flatten());
		}

		const { lender_app_id, type } = parsed.data;

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

		// ── Find lender application ──────────────────────────────
		const lenderAppIndex = caseDoc.lender_applications.findIndex(
			(la) => la.lender_application_id === lender_app_id
		);

		if (lenderAppIndex === -1) {
			return apiError('Lender application not found', 404);
		}

		// ── Load latest form snapshot ────────────────────────────
		const snapshot = await FormSnapshots.findOne(
			{ case_id: params.case_id },
			{ sort: { version: -1 } }
		);

		if (!snapshot) {
			return apiError(
				'No form snapshot found for this case. Create a form snapshot first.',
				404
			);
		}

		// ── Load file config (or defaults) ───────────────────────
		const lenderApp = caseDoc.lender_applications[lenderAppIndex];
		const config =
			lenderApp.file_config || getDefaultFileConfig(params.case_id, caseDoc.loan?.type);

		// SEC-2 Phase C.2: resolve encrypted snapshot payload.
		const formPayload = await resolveSnapshotPayload(snapshot);
		if (!formPayload) {
			return apiError('Form snapshot has no payload data.', 422);
		}

		// ── Load latest lender results + find this lender's offer ──
		// LEND-1 Phase 4: same logic as GET handler; see note above.
		const lenderResult = await findLenderResultForApplication(params.case_id, lender_app_id);

		// ── Build payload ────────────────────────────────────────
		let payload = buildFilePayload(formPayload, config, lenderResult);

		// System-enforced PII stripping for review type
		if (type === 'review') {
			payload = stripPII(payload);
		}

		// ── Compute hash ─────────────────────────────────────────
		const payloadHash = computePayloadHash(payload);

		// ── Build the FileSnapshot record ────────────────────────
		const now = new Date();
		const snapshotId = crypto.randomUUID();

		const configUsed = {
			...config,
			source_payload_hash: snapshot.payload_hash,
			source_snapshot_version: snapshot.version,
			updated_at: now
		};

		// ── Generate the PDF ─────────────────────────────────────
		const pdfBytes = await generateCasePDF(payload, {
			type,
			caseId: params.case_id,
			lenderName: lenderApp.lender_name,
			generatedAt: now,
			piiStripped: type === 'review'
		});

		// Store PDF as base64 for retrieval via download endpoint
		const pdfData = Buffer.from(pdfBytes).toString('base64');

		// Build download URL
		const pdfUrl = `/api/cases/${params.case_id}/file-builder/download?lender_app_id=${lender_app_id}&snapshot_id=${snapshotId}`;

		const fileSnapshot = {
			snapshot_id: snapshotId,
			type,
			file_url: pdfUrl,
			generated_at: now,
			config_used: configUsed,
			payload,
			payload_hash: payloadHash,
			pdf_data: pdfData
		};

		// ── Push to lender application's file_snapshots array ────
		const prefix = `lender_applications.${lenderAppIndex}`;

		await Cases.updateOne(
			{ case_id: params.case_id },
			{
				$push: {
					[`${prefix}.file_snapshots`]: fileSnapshot
				} as any,
				$set: {
					[`${prefix}.updated_at`]: now,
					updated_at: now
				}
			}
		);

		// ── Create timeline event ────────────────────────────────
		const eventType = type === 'review' ? 'review_pdf_generated' : 'submission_pdf_generated';
		const eventDesc =
			type === 'review'
				? `Review file generated for ${lenderApp.lender_name} (PII stripped)`
				: `Submission file generated for ${lenderApp.lender_name}`;

		await createTimelineEvent(params.case_id, eventType, eventDesc, {
			snapshot_id: snapshotId,
			lender_application_id: lender_app_id,
			lender_name: lenderApp.lender_name,
			type,
			source_snapshot_version: snapshot.version,
			payload_hash: payloadHash,
			pii_stripped: type === 'review'
		});

		return apiOk(
			{
				snapshot_id: snapshotId,
				type,
				generated_at: now,
				source_snapshot_version: snapshot.version,
				payload_hash: payloadHash,
				pii_stripped: type === 'review',
				lender_app_id: lender_app_id,
				pdf_url: pdfUrl
			},
			201
		);
	} catch (err) {
		return apiServerError(err, 'Failed to generate file snapshot');
	}
};
