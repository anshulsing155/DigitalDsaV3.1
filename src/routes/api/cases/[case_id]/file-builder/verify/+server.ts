/**
 * POST /api/cases/[case_id]/file-builder/verify — Verify file integrity
 * ══════════════════════════════════════════════════════════════════
 * Recomputes SHA-256 from stored payload and compares with the hash
 * that was stored at generation time. Detects tampering.
 * ══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from './$types';
import { z } from 'zod';
import { resolveEffectiveDsaId, verifyCaseOwnership } from '$lib/server/caseHelpers.js';
import { validateFileIntegrity } from '$lib/server/fileConfigurator.js';
import { computePayloadHash } from '$lib/server/snapshotHelpers.js';
import { blockDemoWrite, requireAuthApi, requireTeamPermission } from '$lib/server/guards.js';
import {
	apiOk,
	apiError,
	apiValidationError,
	apiServerError,
	parseJsonBody
} from '$lib/server/apiResponse.js';

// ── Validation schema ────────────────────────────────────────────

const verifySchema = z.object({
	lender_app_id: z.string().min(1, 'lender_app_id is required'),
	snapshot_id: z.string().min(1, 'snapshot_id is required')
});

// ── POST — Verify file integrity ─────────────────────────────────

export const POST: RequestHandler = async ({ params, request, locals }) => {
	const denied = requireAuthApi(locals);
	if (denied) return denied;

	const permDenied = requireTeamPermission(locals, 'file_builder_view');
	if (permDenied) return permDenied;

	const demoBlocked = blockDemoWrite(locals);
	if (demoBlocked) return demoBlocked;

	const jsonParsed = await parseJsonBody<Record<string, unknown>>(request);
	if (!jsonParsed.ok) return jsonParsed.response;

	try {
		// Validate input
		const parsed = verifySchema.safeParse(jsonParsed.data);
		if (!parsed.success) {
			return apiValidationError('Validation failed', parsed.error.flatten());
		}

		const { lender_app_id, snapshot_id } = parsed.data;

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
		const lenderApp = caseDoc.lender_applications.find(
			(la) => la.lender_application_id === lender_app_id
		);

		if (!lenderApp) {
			return apiError('Lender application not found', 404);
		}

		// ── Find the file snapshot ───────────────────────────────
		const fileSnapshot = lenderApp.file_snapshots.find((fs) => fs.snapshot_id === snapshot_id);

		if (!fileSnapshot) {
			return apiError('File snapshot not found', 404);
		}

		// ── Recompute hash and verify ────────────────────────────
		// The file snapshot stores both the payload and its hash
		const snapshotRecord = fileSnapshot as any;
		const storedPayload = snapshotRecord.payload;
		const storedHash = snapshotRecord.payload_hash;

		if (!storedPayload || !storedHash) {
			return apiError('Snapshot does not contain verifiable payload data', 422);
		}

		const computedHash = computePayloadHash(storedPayload);
		const verified = validateFileIntegrity(storedPayload, storedHash);

		return apiOk({
			verified,
			snapshot_id,
			computed_hash: computedHash,
			stored_hash: storedHash
		});
	} catch (err) {
		return apiServerError(err, 'Failed to verify file integrity');
	}
};
