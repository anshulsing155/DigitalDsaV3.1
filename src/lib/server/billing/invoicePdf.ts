/**
 * D.2 — GST Invoice PDF renderer
 * ══════════════════════════════════════════════════════════════════════
 * Renders an InvoiceDoc to a PDF byte stream on-demand. Called by the
 * `/api/billing/invoices/[id]/pdf` route at download time.
 *
 * Why generate-on-demand instead of pre-rendering at issue time:
 *   - The InvoiceDoc IS the source of truth — the PDF is just a
 *     formatted view of the same data
 *   - Avoids needing PDF storage infrastructure (S3 / ImageKit) for a
 *     legal doc that we generate cheaply
 *   - PDF rendering is fast (~100ms); a Cache-Control header on the
 *     download route gives the same UX as pre-generation
 *
 * Layout:
 *   - A4 portrait, standard 36pt margins
 *   - Header: seller legal name + GSTIN + address
 *   - Sub-header: "TAX INVOICE" centered, bold, large
 *   - Two-column meta strip: invoice_number + issue_date | buyer details
 *   - Line item box: description + HSN + qty + taxable + tax + total
 *   - Tax breakdown box: depends on tax_kind (intra/inter/B2C)
 *   - Footer: amount-in-words + signature placeholder + page n/n
 *
 * Spec: docs/specs/POST-AUDIT-IMPLEMENTATION-MASTER-SPEC.md §D.2
 * ══════════════════════════════════════════════════════════════════════
 */

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import type { InvoiceDoc } from '$lib/types/invoice';

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 36;
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;

const COLOR_TEXT = rgb(0.13, 0.13, 0.13);
const COLOR_MUTED = rgb(0.42, 0.42, 0.42);
const COLOR_BORDER = rgb(0.78, 0.78, 0.78);
const COLOR_HEADER_BG = rgb(0.96, 0.96, 0.96);

/** Format paise to a rupee-and-paise string: "₹3,389.83" — used everywhere in the PDF. */
function formatRupees(paise: number): string {
	const rupees = paise / 100;
	// en-IN locale uses lakh/crore comma grouping (1,00,000 not 100,000). Force INR style.
	return `₹${rupees.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Format a JS Date to "15 May 2026" (DSA-friendly Indian date). */
function formatDate(d: Date): string {
	return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Convert a paise integer into the "amount in words" line that's
 * legally required at the bottom of an Indian tax invoice. e.g.
 * 399900 paise → "Three Thousand Nine Hundred Ninety-Nine Rupees Only"
 *
 * Implementation: a minimal Indian-number-system word builder. Handles
 * up to lakhs (sufficient for our subscription plan range). If amounts
 * ever exceed ₹99,99,999 (~99 lakh) we'll extend to crores.
 */
function amountInWords(paise: number): string {
	const rupees = Math.floor(paise / 100);
	const paiseRemainder = paise % 100;

	const lessThan100 = (n: number): string => {
		const ones = [
			'',
			'One',
			'Two',
			'Three',
			'Four',
			'Five',
			'Six',
			'Seven',
			'Eight',
			'Nine',
			'Ten',
			'Eleven',
			'Twelve',
			'Thirteen',
			'Fourteen',
			'Fifteen',
			'Sixteen',
			'Seventeen',
			'Eighteen',
			'Nineteen'
		];
		const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
		if (n < 20) return ones[n];
		const t = Math.floor(n / 10);
		const o = n % 10;
		return tens[t] + (o ? `-${ones[o]}` : '');
	};
	const lessThan1000 = (n: number): string => {
		const h = Math.floor(n / 100);
		const r = n % 100;
		const hPart = h ? `${lessThan100(h)} Hundred` : '';
		const rPart = r ? (hPart ? ` ${lessThan100(r)}` : lessThan100(r)) : '';
		return (hPart + rPart) || '';
	};

	if (rupees === 0) return paiseRemainder ? `Zero Rupees and ${lessThan100(paiseRemainder)} Paise Only` : 'Zero Rupees Only';

	// Indian numbering: Lakhs (1,00,000) → Thousands → Hundreds-and-below
	const crore = Math.floor(rupees / 10000000);
	const afterCrore = rupees % 10000000;
	const lakh = Math.floor(afterCrore / 100000);
	const afterLakh = afterCrore % 100000;
	const thousand = Math.floor(afterLakh / 1000);
	const remainder = afterLakh % 1000;

	const parts: string[] = [];
	if (crore) parts.push(`${lessThan100(crore)} Crore`);
	if (lakh) parts.push(`${lessThan100(lakh)} Lakh`);
	if (thousand) parts.push(`${lessThan100(thousand)} Thousand`);
	if (remainder) parts.push(lessThan1000(remainder));

	let rupeesWords = parts.join(' ').trim() || 'Zero';
	rupeesWords += ' Rupees';
	if (paiseRemainder) {
		rupeesWords += ` and ${lessThan100(paiseRemainder)} Paise`;
	}
	return rupeesWords + ' Only';
}

// ── Drawing helpers ────────────────────────────────────────────────

interface DrawCtx {
	page: PDFPage;
	font: PDFFont;
	fontBold: PDFFont;
	y: number;
}

function drawText(
	ctx: DrawCtx,
	text: string,
	opts: { x: number; y?: number; size?: number; bold?: boolean; color?: ReturnType<typeof rgb> } = { x: MARGIN }
): void {
	const yPos = opts.y ?? ctx.y;
	ctx.page.drawText(text, {
		x: opts.x,
		y: yPos,
		size: opts.size ?? 10,
		font: opts.bold ? ctx.fontBold : ctx.font,
		color: opts.color ?? COLOR_TEXT
	});
}

function drawRect(
	ctx: DrawCtx,
	x: number,
	y: number,
	w: number,
	h: number,
	fillColor?: ReturnType<typeof rgb>
): void {
	ctx.page.drawRectangle({
		x,
		y,
		width: w,
		height: h,
		borderColor: COLOR_BORDER,
		borderWidth: 0.5,
		...(fillColor && { color: fillColor })
	});
}

// ── Main render function ───────────────────────────────────────────

export async function renderInvoicePdf(invoice: InvoiceDoc): Promise<Uint8Array> {
	const pdfDoc = await PDFDocument.create();
	pdfDoc.setTitle(`Invoice ${invoice.invoice_number}`);
	pdfDoc.setAuthor(invoice.seller_legal_name);
	pdfDoc.setSubject('GST Tax Invoice');
	pdfDoc.setProducer('DigitalDSA');
	pdfDoc.setCreator('DigitalDSA Billing');

	const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
	const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

	const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
	const ctx: DrawCtx = { page, font, fontBold, y: PAGE_HEIGHT - MARGIN };

	// ── Seller header ──
	drawText(ctx, invoice.seller_legal_name, { x: MARGIN, y: ctx.y, size: 14, bold: true });
	ctx.y -= 18;
	drawText(ctx, invoice.seller_address, { x: MARGIN, y: ctx.y, size: 9, color: COLOR_MUTED });
	ctx.y -= 12;
	drawText(ctx, `GSTIN: ${invoice.gstin_seller}  •  State Code: ${invoice.seller_state_code}`, {
		x: MARGIN,
		y: ctx.y,
		size: 9,
		color: COLOR_MUTED
	});
	ctx.y -= 24;

	// ── Title banner ──
	drawRect(ctx, MARGIN, ctx.y - 26, CONTENT_WIDTH, 30, COLOR_HEADER_BG);
	drawText(ctx, 'TAX INVOICE', {
		x: MARGIN + CONTENT_WIDTH / 2 - 40,
		y: ctx.y - 18,
		size: 14,
		bold: true
	});
	ctx.y -= 40;

	// ── Meta strip (two columns) ──
	const colWidth = CONTENT_WIDTH / 2;
	const metaTop = ctx.y;
	const metaHeight = 70;

	// Left col: invoice meta
	drawRect(ctx, MARGIN, metaTop - metaHeight, colWidth, metaHeight);
	drawText(ctx, 'Invoice Number', {
		x: MARGIN + 6,
		y: metaTop - 14,
		size: 8,
		bold: true,
		color: COLOR_MUTED
	});
	drawText(ctx, invoice.invoice_number, { x: MARGIN + 6, y: metaTop - 28, size: 11, bold: true });
	drawText(ctx, 'Issue Date', {
		x: MARGIN + 6,
		y: metaTop - 44,
		size: 8,
		bold: true,
		color: COLOR_MUTED
	});
	drawText(ctx, formatDate(invoice.issue_date), { x: MARGIN + 6, y: metaTop - 58, size: 10 });

	// Right col: buyer
	const rightX = MARGIN + colWidth;
	drawRect(ctx, rightX, metaTop - metaHeight, colWidth, metaHeight);
	drawText(ctx, 'Billed To', {
		x: rightX + 6,
		y: metaTop - 14,
		size: 8,
		bold: true,
		color: COLOR_MUTED
	});
	if (invoice.gstin_buyer) {
		drawText(ctx, `GSTIN: ${invoice.gstin_buyer}`, { x: rightX + 6, y: metaTop - 28, size: 10 });
	} else {
		drawText(ctx, 'Unregistered (B2C)', {
			x: rightX + 6,
			y: metaTop - 28,
			size: 10,
			color: COLOR_MUTED
		});
	}
	if (invoice.buyer_state_code) {
		drawText(ctx, `State Code: ${invoice.buyer_state_code}`, {
			x: rightX + 6,
			y: metaTop - 44,
			size: 9,
			color: COLOR_MUTED
		});
	}
	drawText(ctx, `FY ${invoice.fy}`, {
		x: rightX + 6,
		y: metaTop - 58,
		size: 9,
		color: COLOR_MUTED
	});

	ctx.y -= metaHeight + 16;

	// ── Line item table ──
	const tableTop = ctx.y;
	const tableHeight = 56;
	// Header row
	drawRect(ctx, MARGIN, tableTop - 18, CONTENT_WIDTH, 18, COLOR_HEADER_BG);
	drawText(ctx, 'Description', { x: MARGIN + 6, y: tableTop - 13, size: 9, bold: true });
	drawText(ctx, 'HSN/SAC', { x: MARGIN + 320, y: tableTop - 13, size: 9, bold: true });
	drawText(ctx, 'Taxable Value', { x: MARGIN + 390, y: tableTop - 13, size: 9, bold: true });
	// Data row
	drawRect(ctx, MARGIN, tableTop - tableHeight, CONTENT_WIDTH, tableHeight - 18);
	drawText(ctx, invoice.description, { x: MARGIN + 6, y: tableTop - 36, size: 10 });
	drawText(ctx, invoice.hsn_sac, { x: MARGIN + 320, y: tableTop - 36, size: 10 });
	drawText(ctx, formatRupees(invoice.taxable_paise), {
		x: MARGIN + 390,
		y: tableTop - 36,
		size: 10
	});
	ctx.y -= tableHeight + 12;

	// ── Tax breakdown box ──
	const breakdownTop = ctx.y;
	const breakdownHeight = invoice.tax_kind === 'intra_state' ? 90 : 75;
	const breakdownX = MARGIN + CONTENT_WIDTH * 0.45;
	const breakdownW = CONTENT_WIDTH * 0.55;
	drawRect(ctx, breakdownX, breakdownTop - breakdownHeight, breakdownW, breakdownHeight);

	let breakdownY = breakdownTop - 16;
	drawText(ctx, 'Taxable Value', { x: breakdownX + 6, y: breakdownY, size: 9, color: COLOR_MUTED });
	drawText(ctx, formatRupees(invoice.taxable_paise), {
		x: breakdownX + breakdownW - 100,
		y: breakdownY,
		size: 9
	});
	breakdownY -= 14;

	if (invoice.tax_kind === 'intra_state') {
		drawText(ctx, 'CGST @ 9%', { x: breakdownX + 6, y: breakdownY, size: 9, color: COLOR_MUTED });
		drawText(ctx, formatRupees(invoice.cgst_paise), {
			x: breakdownX + breakdownW - 100,
			y: breakdownY,
			size: 9
		});
		breakdownY -= 14;
		drawText(ctx, 'SGST @ 9%', { x: breakdownX + 6, y: breakdownY, size: 9, color: COLOR_MUTED });
		drawText(ctx, formatRupees(invoice.sgst_paise), {
			x: breakdownX + breakdownW - 100,
			y: breakdownY,
			size: 9
		});
		breakdownY -= 14;
	} else {
		drawText(ctx, 'IGST @ 18%', { x: breakdownX + 6, y: breakdownY, size: 9, color: COLOR_MUTED });
		drawText(ctx, formatRupees(invoice.igst_paise), {
			x: breakdownX + breakdownW - 100,
			y: breakdownY,
			size: 9
		});
		breakdownY -= 14;
	}

	// Total line (bold + separator)
	page.drawLine({
		start: { x: breakdownX + 6, y: breakdownY + 6 },
		end: { x: breakdownX + breakdownW - 6, y: breakdownY + 6 },
		thickness: 0.5,
		color: COLOR_BORDER
	});
	drawText(ctx, 'TOTAL', { x: breakdownX + 6, y: breakdownY - 6, size: 11, bold: true });
	drawText(ctx, formatRupees(invoice.total_paise), {
		x: breakdownX + breakdownW - 100,
		y: breakdownY - 6,
		size: 11,
		bold: true
	});

	ctx.y -= breakdownHeight + 16;

	// ── Amount in words ──
	drawText(ctx, 'Amount in Words', { x: MARGIN, y: ctx.y, size: 8, bold: true, color: COLOR_MUTED });
	ctx.y -= 14;
	drawText(ctx, amountInWords(invoice.total_paise), { x: MARGIN, y: ctx.y, size: 10 });
	ctx.y -= 28;

	// ── Tax remark ──
	const taxNote =
		invoice.tax_kind === 'intra_state'
			? 'Intra-state supply — CGST + SGST applied'
			: invoice.tax_kind === 'inter_state'
				? 'Inter-state supply — IGST applied'
				: 'Unregistered buyer (B2C) — IGST applied';
	drawText(ctx, taxNote, { x: MARGIN, y: ctx.y, size: 8, color: COLOR_MUTED });
	ctx.y -= 30;

	// ── Footer / signature ──
	drawText(
		ctx,
		'This is a system-generated invoice. No signature required. Saved per record-keeping rules (6-year retention).',
		{ x: MARGIN, y: MARGIN + 18, size: 7, color: COLOR_MUTED }
	);
	drawText(ctx, `Page 1 of 1  •  Generated on ${formatDate(new Date())}`, {
		x: MARGIN,
		y: MARGIN + 6,
		size: 7,
		color: COLOR_MUTED
	});

	return await pdfDoc.save();
}
