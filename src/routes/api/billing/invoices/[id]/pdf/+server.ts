/**
 * GET /api/billing/invoices/[id]/pdf
 * ══════════════════════════════════════════════════════════════════════
 * Stream a GST invoice PDF. Ownership-gated — the DSA in `locals.user`
 * must own the invoice (dsa_id match). Returns 404 (not 403) on mismatch
 * to avoid leaking the existence of other DSAs' invoices.
 *
 * The PDF is generated ON-DEMAND from the InvoiceDoc — no pre-rendered
 * artifact is stored. Cache-Control allows the browser to cache for 1
 * hour so repeated downloads in the same session are cheap.
 *
 * Spec: docs/specs/POST-AUDIT-IMPLEMENTATION-MASTER-SPEC.md §D.2
 * ══════════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from './$types';
import { ObjectId } from 'mongodb';
import { error } from '@sveltejs/kit';
import { apiError } from '$lib/server/apiResponse';
import { requireRoleApi } from '$lib/server/guards';
import { rateLimit } from '$lib/server/rateLimiter';
import { Invoices } from '$lib/database/mongo';
import { renderInvoicePdf } from '$lib/server/billing/invoicePdf';
import logger from '$lib/server/logger';

export const GET: RequestHandler = async ({ params, locals }) => {
	const denied = requireRoleApi(locals, 'dsa');
	if (denied) return denied;

	const userId = locals.user!.id;
	const dsaObjectId = new ObjectId(userId);

	const limited = await rateLimit(userId, {
		identifier: `billing-invoice-pdf:${userId}`,
		maxRequests: 30,
		windowMs: 60_000
	});
	if (limited) return apiError('Too many requests. Please slow down.', 429);

	const idParam = params.id;
	if (!idParam || !ObjectId.isValid(idParam)) {
		throw error(404, 'Invoice not found');
	}

	const invoiceId = new ObjectId(idParam);
	const invoice = await Invoices.findOne({ _id: invoiceId });
	// Ownership gate: 404 on mismatch (NOT 403) so we don't leak the
	// existence of another DSA's invoice via the response code.
	if (!invoice || !invoice.dsa_id.equals(dsaObjectId)) {
		throw error(404, 'Invoice not found');
	}

	let pdfBytes: Uint8Array;
	try {
		pdfBytes = await renderInvoicePdf(invoice);
	} catch (err) {
		logger.error(
			{ invoice_id: idParam, err: (err as Error).message },
			'invoice PDF render failed'
		);
		throw error(500, 'Invoice could not be rendered. Please try again.');
	}

	// Filename — safe ASCII (slashes in the invoice number get hyphenated).
	const safeName = invoice.invoice_number.replace(/[/\\]/g, '-');
	// Copy bytes into a fresh ArrayBuffer-backed Uint8Array so Blob/Response
	// type-check cleanly. pdf-lib returns Uint8Array<ArrayBufferLike> which
	// the current TS lib types don't widen into BodyInit/BlobPart; the copy
	// rebinds onto an ArrayBuffer (not Shared / Like) that satisfies both.
	const arrayBuffer = new ArrayBuffer(pdfBytes.byteLength);
	new Uint8Array(arrayBuffer).set(pdfBytes);
	return new Response(arrayBuffer, {
		status: 200,
		headers: {
			'Content-Type': 'application/pdf',
			'Content-Disposition': `inline; filename="${safeName}.pdf"`,
			'Cache-Control': 'private, max-age=3600',
			'Content-Length': String(pdfBytes.byteLength)
		}
	});
};
