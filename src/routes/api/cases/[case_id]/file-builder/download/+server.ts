/**
 * GET /api/cases/[case_id]/file-builder/download — Download PDF
 * ══════════════════════════════════════════════════════════════════
 * Serves the generated PDF file for a specific file snapshot.
 *
 * Query params:
 *   - lender_app_id (required): The lender application ID
 *   - snapshot_id (required): The file snapshot ID
 *
 * Returns the PDF binary with proper Content-Type and
 * Content-Disposition headers for browser download.
 * ══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from './$types';
import { resolveEffectiveDsaId, verifyCaseOwnership } from '$lib/server/caseHelpers.js';
import { requireAuthApi, requireTeamPermission } from '$lib/server/guards.js';
import { apiError, apiServerError } from '$lib/server/apiResponse.js';

export const GET: RequestHandler = async ({ params, locals, url }) => {
	const authDenied = requireAuthApi(locals);
	if (authDenied) return authDenied;

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
		const snapshotId = url.searchParams.get('snapshot_id');

		if (!lenderAppId) {
			return apiError('lender_app_id query parameter is required', 400);
		}

		if (!snapshotId) {
			return apiError('snapshot_id query parameter is required', 400);
		}

		// ── Find lender application ──────────────────────────────
		const lenderApp = caseDoc.lender_applications.find(
			(la) => la.lender_application_id === lenderAppId
		);

		if (!lenderApp) {
			return apiError('Lender application not found', 404);
		}

		// ── Find the file snapshot ───────────────────────────────
		const fileSnapshot = lenderApp.file_snapshots.find((fs) => fs.snapshot_id === snapshotId);

		if (!fileSnapshot) {
			return apiError('File snapshot not found', 404);
		}

		// ── Retrieve PDF data ────────────────────────────────────
		// The snapshot record has pdf_data stored as base64 (set by POST handler)
		const snapshotRecord = fileSnapshot as any;
		const pdfData = snapshotRecord.pdf_data;

		if (!pdfData) {
			return apiError(
				'PDF data not found for this snapshot. The snapshot may have been generated before PDF generation was enabled.',
				404
			);
		}

		// ── Decode base64 to binary ──────────────────────────────
		const pdfBuffer = Buffer.from(pdfData, 'base64');

		// ── Build filename ───────────────────────────────────────
		// Sanitize lender name for filename (remove special characters)
		const safeLenderName = lenderApp.lender_name
			.replace(/[^a-zA-Z0-9\s-]/g, '')
			.replace(/\s+/g, '-')
			.substring(0, 50);

		const fileType = fileSnapshot.type || 'file';
		const filename = `DigitalDSA-${params.case_id}-${fileType}-${safeLenderName}.pdf`;

		// ── Return PDF response ──────────────────────────────────
		// Binary download: apiOk() wraps in JSON envelope which would corrupt the PDF.
		// Raw Response is intentional here — keep Content-Type / Disposition explicit.
		return new Response(pdfBuffer, {
			status: 200,
			headers: {
				'Content-Type': 'application/pdf',
				'Content-Disposition': `attachment; filename="${filename}"`,
				'Content-Length': String(pdfBuffer.length),
				'Cache-Control': 'private, no-cache'
			}
		});
	} catch (err) {
		return apiServerError(err, 'Failed to download PDF');
	}
};
