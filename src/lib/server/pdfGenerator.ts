/**
 * PDF Generator — DigitalDSA File Builder
 * ══════════════════════════════════════════════════════════════════
 * Generates professional loan application PDFs using pdf-lib.
 *
 * Two document types:
 *   - Review (v1): PII-stripped, watermarked "FOR REVIEW ONLY"
 *   - Submission (v2): Full data for formal file submission
 *
 * Features:
 *   - A4 page size with proper margins
 *   - Section-based layout with tables for key-value data
 *   - Nested object indentation and array numbering
 *   - Redacted fields rendered in gray italic
 *   - DSA notes in colored boxes
 *   - Diagonal watermark on review copies
 *   - Footer with page numbers, timestamp, and payload hash
 * ══════════════════════════════════════════════════════════════════
 */

import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';
import { computePayloadHash } from '$lib/server/snapshotHelpers.js';

// ============================================================================
// CONSTANTS
// ============================================================================

/** A4 dimensions in points */
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;

/** Margins */
const MARGIN_LEFT = 50;
const MARGIN_RIGHT = 50;
const MARGIN_TOP = 60;
const MARGIN_BOTTOM = 60;

/** Content area */
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

/** Font sizes */
const FONT_TITLE = 18;
const FONT_SUBTITLE = 11;
const FONT_SECTION_HEADER = 13;
const FONT_BODY = 9.5;
const FONT_SMALL = 8;
const FONT_FOOTER = 7.5;

/** Line heights (font size * multiplier) */
const LINE_HEIGHT_MULTIPLIER = 1.5;

/** Colors */
const COLOR_DARK_BLUE = rgb(0.082, 0.188, 0.369); // #153060
const COLOR_MEDIUM_BLUE = rgb(0.157, 0.31, 0.533); // #284F88
const COLOR_LIGHT_BLUE_BG = rgb(0.918, 0.937, 0.969); // #EAF0F8
const COLOR_WHITE = rgb(1, 1, 1);
const COLOR_BLACK = rgb(0, 0, 0);
const COLOR_DARK_GRAY = rgb(0.25, 0.25, 0.25);
const COLOR_MEDIUM_GRAY = rgb(0.5, 0.5, 0.5);
const COLOR_LIGHT_GRAY = rgb(0.85, 0.85, 0.85);
const COLOR_REDACTED = rgb(0.55, 0.55, 0.55);
const COLOR_NOTE_BG = rgb(1, 0.976, 0.922); // #FFF9EB warm cream
const COLOR_NOTE_BORDER = rgb(0.878, 0.769, 0.482); // #E0C47B
const COLOR_NOTE_TEXT = rgb(0.431, 0.337, 0.102); // #6E561A
const COLOR_REVIEW_BADGE_BG = rgb(0.957, 0.918, 0.831); // #F4EAD4
const COLOR_REVIEW_BADGE_TEXT = rgb(0.6, 0.4, 0.067); // #996611
const COLOR_SUBMISSION_BADGE_BG = rgb(0.847, 0.937, 0.871); // #D8EFde
const COLOR_SUBMISSION_BADGE_TEXT = rgb(0.133, 0.467, 0.2); // #227733
const COLOR_WATERMARK = rgb(0.9, 0.9, 0.9);
const COLOR_SEPARATOR = rgb(0.78, 0.82, 0.88);

/** Redacted value patterns */
const REDACTED_PATTERNS = ['[REDACTED]', '[Address Redacted]', '[DOB Redacted]'];

/** Keys to skip in rendering (internal fields) */
const SKIP_KEYS = ['_detailed', 'display_mode'];

// ============================================================================
// MAIN EXPORT
// ============================================================================

/**
 * Generate a professional PDF for a loan application case.
 *
 * @param payload - The file payload (already PII-stripped if review type)
 * @param options - Generation options
 * @returns PDF as Uint8Array
 */
export async function generateCasePDF(
	payload: Record<string, any>,
	options: {
		type: 'review' | 'submission';
		caseId: string;
		lenderName: string;
		generatedAt: Date;
		piiStripped: boolean;
	}
): Promise<Uint8Array> {
	const pdfDoc = await PDFDocument.create();

	// Embed fonts
	const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
	const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
	const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

	// Compute payload hash for the footer integrity reference
	const payloadHash = computePayloadHash(payload);

	// Create a drawing context that manages pages and cursor position
	const ctx = new DrawingContext(pdfDoc, fontRegular, fontBold, fontOblique, options.type);

	// ── Draw Header on first page ─────────────────────────────────
	drawHeader(ctx, options);

	// ── Draw separator ────────────────────────────────────────────
	ctx.drawHorizontalRule();
	ctx.advanceCursor(10);

	// ── Draw Sections ─────────────────────────────────────────────
	// Separate metadata keys from section keys
	const metadataKeys = ['case_id', 'loan', 'created_at', 'updated_at', 'form_version'];
	const sectionKeys = Object.keys(payload).filter((k) => !metadataKeys.includes(k));

	// Render metadata summary if present
	const metaEntries = metadataKeys
		.filter((k) => payload[k] !== undefined)
		.map((k) => [k, payload[k]] as [string, any]);

	if (metaEntries.length > 0) {
		ctx.drawSectionHeader('Case Overview');
		for (const [key, value] of metaEntries) {
			if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
				// Render nested object inline
				for (const [subKey, subVal] of Object.entries(value)) {
					if (SKIP_KEYS.includes(subKey)) continue;
					ctx.drawKeyValueRow(formatLabel(subKey), formatValue(subVal), 0);
				}
			} else {
				ctx.drawKeyValueRow(formatLabel(key), formatValue(value), 0);
			}
		}
		ctx.advanceCursor(10);
	}

	// Render each payload section
	for (const sectionKey of sectionKeys) {
		const sectionData = payload[sectionKey];

		// Ensure enough space for header + at least a few lines
		ctx.ensureSpace(60);

		// Section header
		ctx.drawSectionHeader(formatLabel(sectionKey));

		// Check for DSA note
		let dsaNote: string | undefined;
		if (
			typeof sectionData === 'object' &&
			sectionData !== null &&
			!Array.isArray(sectionData) &&
			sectionData._dsa_note
		) {
			dsaNote = sectionData._dsa_note;
		}

		// Render section content
		renderValue(ctx, sectionData, 0);

		// Render DSA note box if present
		if (dsaNote) {
			ctx.ensureSpace(40);
			ctx.drawDsaNoteBox(dsaNote);
		}

		ctx.advanceCursor(14);
	}

	// ── Apply watermark on review copies ──────────────────────────
	if (options.type === 'review') {
		applyWatermark(pdfDoc, fontBold);
	}

	// ── Draw footers on all pages ─────────────────────────────────
	const totalPages = pdfDoc.getPageCount();
	const pages = pdfDoc.getPages();
	for (let i = 0; i < totalPages; i++) {
		drawFooter(pages[i], fontRegular, i + 1, totalPages, options.generatedAt, payloadHash);
	}

	// Set PDF metadata
	pdfDoc.setTitle(`DigitalDSA - ${options.caseId} - ${options.type.toUpperCase()}`);
	pdfDoc.setSubject(`Loan Application File - ${options.lenderName}`);
	pdfDoc.setCreator('DigitalDSA File Builder');
	pdfDoc.setProducer('DigitalDSA / pdf-lib');
	pdfDoc.setCreationDate(options.generatedAt);

	return pdfDoc.save();
}

// ============================================================================
// DRAWING CONTEXT — Manages cursor, pages, and convenience draw methods
// ============================================================================

class DrawingContext {
	pdfDoc: PDFDocument;
	fontRegular: any;
	fontBold: any;
	fontOblique: any;
	currentPage: any;
	cursorY: number;
	docType: 'review' | 'submission';

	constructor(
		pdfDoc: PDFDocument,
		fontRegular: any,
		fontBold: any,
		fontOblique: any,
		docType: 'review' | 'submission'
	) {
		this.pdfDoc = pdfDoc;
		this.fontRegular = fontRegular;
		this.fontBold = fontBold;
		this.fontOblique = fontOblique;
		this.docType = docType;
		this.currentPage = this.addNewPage();
		this.cursorY = PAGE_HEIGHT - MARGIN_TOP;
	}

	addNewPage() {
		const page = this.pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
		this.currentPage = page;
		this.cursorY = PAGE_HEIGHT - MARGIN_TOP;
		return page;
	}

	/** Ensure at least `minHeight` points of space remain; if not, add a new page. */
	ensureSpace(minHeight: number) {
		if (this.cursorY - minHeight < MARGIN_BOTTOM + 30) {
			this.addNewPage();
		}
	}

	/** Move cursor down */
	advanceCursor(amount: number) {
		this.cursorY -= amount;
	}

	/** Draw a section header bar */
	drawSectionHeader(title: string) {
		this.ensureSpace(32);

		const barHeight = 22;
		const barY = this.cursorY - barHeight;

		// Draw background bar
		this.currentPage.drawRectangle({
			x: MARGIN_LEFT,
			y: barY,
			width: CONTENT_WIDTH,
			height: barHeight,
			color: COLOR_DARK_BLUE
		});

		// Draw section title text
		this.currentPage.drawText(title, {
			x: MARGIN_LEFT + 10,
			y: barY + 6,
			size: FONT_SECTION_HEADER,
			font: this.fontBold,
			color: COLOR_WHITE
		});

		this.cursorY = barY - 8;
	}

	/** Draw a key-value row with optional indentation level */
	drawKeyValueRow(label: string, value: string, indent: number) {
		const lineHeight = FONT_BODY * LINE_HEIGHT_MULTIPLIER;
		this.ensureSpace(lineHeight + 4);

		const indentPx = indent * 18;
		const labelX = MARGIN_LEFT + 8 + indentPx;
		const valueX = MARGIN_LEFT + 190 + indentPx;
		const maxValueWidth = PAGE_WIDTH - MARGIN_RIGHT - valueX - 4;

		// Determine if value is redacted
		const isRedacted = REDACTED_PATTERNS.some((p) => value.includes(p));

		// Wrap long values
		const valueLines = wrapText(
			value,
			maxValueWidth,
			FONT_BODY,
			isRedacted ? this.fontOblique : this.fontRegular
		);

		const totalHeight = Math.max(1, valueLines.length) * lineHeight;
		this.ensureSpace(totalHeight + 2);

		// Draw subtle alternating row background
		this.currentPage.drawRectangle({
			x: MARGIN_LEFT + 2 + indentPx,
			y: this.cursorY - totalHeight + 2,
			width: CONTENT_WIDTH - 4 - indentPx,
			height: totalHeight,
			color: COLOR_LIGHT_BLUE_BG,
			opacity: 0.35
		});

		// Draw label
		const truncatedLabel = truncateText(label, 190 - 18 - indentPx, FONT_BODY, this.fontBold);
		this.currentPage.drawText(truncatedLabel, {
			x: labelX,
			y: this.cursorY - lineHeight + 4,
			size: FONT_BODY,
			font: this.fontBold,
			color: COLOR_DARK_GRAY
		});

		// Draw value (possibly multi-line)
		for (let i = 0; i < valueLines.length; i++) {
			this.currentPage.drawText(valueLines[i], {
				x: valueX,
				y: this.cursorY - (i + 1) * lineHeight + 4,
				size: FONT_BODY,
				font: isRedacted ? this.fontOblique : this.fontRegular,
				color: isRedacted ? COLOR_REDACTED : COLOR_BLACK
			});
		}

		this.cursorY -= totalHeight + 1;
	}

	/** Draw a plain text line at current position */
	drawTextLine(
		text: string,
		options?: {
			font?: any;
			size?: number;
			color?: any;
			indent?: number;
			isRedacted?: boolean;
		}
	) {
		const size = options?.size || FONT_BODY;
		const lineHeight = size * LINE_HEIGHT_MULTIPLIER;
		this.ensureSpace(lineHeight + 2);

		const indent = (options?.indent || 0) * 18;
		const isRedacted = options?.isRedacted || false;
		const font = options?.font || (isRedacted ? this.fontOblique : this.fontRegular);
		const color = options?.color || (isRedacted ? COLOR_REDACTED : COLOR_BLACK);

		this.currentPage.drawText(text, {
			x: MARGIN_LEFT + 8 + indent,
			y: this.cursorY - lineHeight + 4,
			size,
			font,
			color
		});

		this.cursorY -= lineHeight;
	}

	/** Draw a horizontal rule */
	drawHorizontalRule() {
		this.currentPage.drawLine({
			start: { x: MARGIN_LEFT, y: this.cursorY },
			end: { x: PAGE_WIDTH - MARGIN_RIGHT, y: this.cursorY },
			thickness: 0.75,
			color: COLOR_SEPARATOR
		});
		this.advanceCursor(4);
	}

	/** Draw a DSA note box */
	drawDsaNoteBox(noteText: string) {
		const lineHeight = FONT_SMALL * LINE_HEIGHT_MULTIPLIER;
		const padding = 8;
		const noteLines = wrapText(
			noteText,
			CONTENT_WIDTH - 24 - padding * 2,
			FONT_SMALL,
			this.fontRegular
		);
		const boxHeight = noteLines.length * lineHeight + padding * 2 + 4;

		this.ensureSpace(boxHeight + 8);

		const boxY = this.cursorY - boxHeight;

		// Draw note background
		this.currentPage.drawRectangle({
			x: MARGIN_LEFT + 12,
			y: boxY,
			width: CONTENT_WIDTH - 24,
			height: boxHeight,
			color: COLOR_NOTE_BG,
			borderColor: COLOR_NOTE_BORDER,
			borderWidth: 0.75
		});

		// Draw "DSA Note:" label
		this.currentPage.drawText('DSA Note:', {
			x: MARGIN_LEFT + 12 + padding,
			y: boxY + boxHeight - padding - FONT_SMALL,
			size: FONT_SMALL,
			font: this.fontBold,
			color: COLOR_NOTE_TEXT
		});

		// Draw note text lines
		for (let i = 0; i < noteLines.length; i++) {
			this.currentPage.drawText(noteLines[i], {
				x: MARGIN_LEFT + 12 + padding,
				y: boxY + boxHeight - padding - FONT_SMALL - (i + 1) * lineHeight,
				size: FONT_SMALL,
				font: this.fontRegular,
				color: COLOR_NOTE_TEXT
			});
		}

		this.cursorY = boxY - 4;
	}
}

// ============================================================================
// HEADER
// ============================================================================

function drawHeader(
	ctx: DrawingContext,
	options: {
		type: 'review' | 'submission';
		caseId: string;
		lenderName: string;
		generatedAt: Date;
		piiStripped: boolean;
	}
) {
	const page = ctx.currentPage;

	// ── Title background bar ──────────────────────────────────────
	const headerBarHeight = 44;
	const headerBarY = PAGE_HEIGHT - MARGIN_TOP - headerBarHeight + 14;

	page.drawRectangle({
		x: MARGIN_LEFT,
		y: headerBarY,
		width: CONTENT_WIDTH,
		height: headerBarHeight,
		color: COLOR_DARK_BLUE
	});

	// ── Title text ────────────────────────────────────────────────
	page.drawText('LOAN APPLICATION FILE', {
		x: MARGIN_LEFT + 14,
		y: headerBarY + 15,
		size: FONT_TITLE,
		font: ctx.fontBold,
		color: COLOR_WHITE
	});

	ctx.cursorY = headerBarY - 6;

	// ── Type badge ────────────────────────────────────────────────
	const isReview = options.type === 'review';
	const badgeText = isReview ? 'REVIEW COPY \u2014 PII REDACTED' : 'SUBMISSION COPY';
	const badgeBg = isReview ? COLOR_REVIEW_BADGE_BG : COLOR_SUBMISSION_BADGE_BG;
	const badgeTextColor = isReview ? COLOR_REVIEW_BADGE_TEXT : COLOR_SUBMISSION_BADGE_TEXT;
	const badgeWidth = ctx.fontBold.widthOfTextAtSize(badgeText, FONT_SUBTITLE) + 20;
	const badgeHeight = 18;

	page.drawRectangle({
		x: MARGIN_LEFT,
		y: ctx.cursorY - badgeHeight,
		width: badgeWidth,
		height: badgeHeight,
		color: badgeBg
	});

	page.drawText(badgeText, {
		x: MARGIN_LEFT + 10,
		y: ctx.cursorY - badgeHeight + 5,
		size: FONT_SUBTITLE,
		font: ctx.fontBold,
		color: badgeTextColor
	});

	ctx.advanceCursor(badgeHeight + 10);

	// ── Meta info lines ───────────────────────────────────────────
	const metaLines = [
		{ label: 'Case ID:', value: options.caseId },
		{ label: 'Lender:', value: options.lenderName },
		{
			label: 'Generated:',
			value: formatDate(options.generatedAt)
		}
	];

	for (const meta of metaLines) {
		const lineHeight = FONT_BODY * LINE_HEIGHT_MULTIPLIER;
		ctx.ensureSpace(lineHeight);

		page.drawText(meta.label, {
			x: MARGIN_LEFT + 4,
			y: ctx.cursorY - lineHeight + 3,
			size: FONT_BODY,
			font: ctx.fontBold,
			color: COLOR_MEDIUM_BLUE
		});

		page.drawText(meta.value, {
			x: MARGIN_LEFT + 80,
			y: ctx.cursorY - lineHeight + 3,
			size: FONT_BODY,
			font: ctx.fontRegular,
			color: COLOR_DARK_GRAY
		});

		ctx.advanceCursor(lineHeight);
	}

	ctx.advanceCursor(6);
}

// ============================================================================
// FOOTER
// ============================================================================

function drawFooter(
	page: any,
	font: any,
	pageNum: number,
	totalPages: number,
	generatedAt: Date,
	payloadHash: string
) {
	const footerY = MARGIN_BOTTOM - 28;

	// Separator line
	page.drawLine({
		start: { x: MARGIN_LEFT, y: footerY + 14 },
		end: { x: PAGE_WIDTH - MARGIN_RIGHT, y: footerY + 14 },
		thickness: 0.5,
		color: COLOR_LIGHT_GRAY
	});

	// Left: "Generated by DigitalDSA" + timestamp
	const timestamp = formatDate(generatedAt);
	page.drawText(`Generated by DigitalDSA  |  ${timestamp}`, {
		x: MARGIN_LEFT,
		y: footerY,
		size: FONT_FOOTER,
		font,
		color: COLOR_MEDIUM_GRAY
	});

	// Center: Hash (truncated for display)
	const shortHash = payloadHash.substring(0, 16) + '...';
	const hashText = `SHA-256: ${shortHash}`;
	const hashWidth = font.widthOfTextAtSize(hashText, FONT_FOOTER);
	page.drawText(hashText, {
		x: (PAGE_WIDTH - hashWidth) / 2,
		y: footerY,
		size: FONT_FOOTER,
		font,
		color: COLOR_MEDIUM_GRAY
	});

	// Right: Page number
	const pageText = `Page ${pageNum} of ${totalPages}`;
	const pageTextWidth = font.widthOfTextAtSize(pageText, FONT_FOOTER);
	page.drawText(pageText, {
		x: PAGE_WIDTH - MARGIN_RIGHT - pageTextWidth,
		y: footerY,
		size: FONT_FOOTER,
		font,
		color: COLOR_MEDIUM_GRAY
	});
}

// ============================================================================
// WATERMARK (Review copies only)
// ============================================================================

function applyWatermark(pdfDoc: PDFDocument, fontBold: any) {
	const pages = pdfDoc.getPages();
	const watermarkText = 'FOR REVIEW ONLY';

	for (const page of pages) {
		const textWidth = fontBold.widthOfTextAtSize(watermarkText, 52);

		page.drawText(watermarkText, {
			x: (PAGE_WIDTH - textWidth * 0.7) / 2,
			y: PAGE_HEIGHT / 2 - 20,
			size: 52,
			font: fontBold,
			color: COLOR_WATERMARK,
			opacity: 0.15,
			rotate: degrees(45)
		});
	}
}

// ============================================================================
// RECURSIVE VALUE RENDERER
// ============================================================================

/**
 * Recursively renders a value into the PDF context.
 * - Objects: key-value rows (skipping internal keys)
 * - Arrays: numbered items
 * - Primitives: single text line
 */
function renderValue(ctx: DrawingContext, value: any, indent: number) {
	if (value === null || value === undefined) {
		ctx.drawTextLine('\u2014', { indent, color: COLOR_MEDIUM_GRAY });
		return;
	}

	if (Array.isArray(value)) {
		if (value.length === 0) {
			ctx.drawTextLine('(none)', { indent, color: COLOR_MEDIUM_GRAY });
			return;
		}
		for (let i = 0; i < value.length; i++) {
			const item = value[i];
			// Draw numbered header for each array item
			ctx.ensureSpace(20);
			ctx.drawTextLine(`#${i + 1}`, {
				indent,
				font: ctx.fontBold,
				size: FONT_BODY,
				color: COLOR_MEDIUM_BLUE
			});

			if (typeof item === 'object' && item !== null) {
				renderValue(ctx, item, indent + 1);
			} else {
				const strVal = formatValue(item);
				const isRedacted = REDACTED_PATTERNS.some((p) => strVal.includes(p));
				ctx.drawTextLine(strVal, { indent: indent + 1, isRedacted });
			}

			// Small gap between array items
			ctx.advanceCursor(3);
		}
		return;
	}

	if (typeof value === 'object') {
		const entries = Object.entries(value);
		for (const [key, val] of entries) {
			// Skip internal keys
			if (SKIP_KEYS.includes(key)) continue;
			// Skip DSA note — handled separately
			if (key === '_dsa_note') continue;

			if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
				// Nested object: draw sub-header then recurse
				ctx.ensureSpace(20);
				ctx.drawTextLine(formatLabel(key), {
					indent,
					font: ctx.fontBold,
					size: FONT_BODY,
					color: COLOR_MEDIUM_BLUE
				});
				renderValue(ctx, val, indent + 1);
				ctx.advanceCursor(3);
			} else if (Array.isArray(val)) {
				// Array: draw label then render items
				ctx.ensureSpace(20);
				ctx.drawTextLine(formatLabel(key), {
					indent,
					font: ctx.fontBold,
					size: FONT_BODY,
					color: COLOR_MEDIUM_BLUE
				});
				renderValue(ctx, val, indent + 1);
				ctx.advanceCursor(3);
			} else {
				// Simple key-value
				const strVal = formatValue(val);
				ctx.drawKeyValueRow(formatLabel(key), strVal, indent);
			}
		}
		return;
	}

	// Primitive value
	const strVal = formatValue(value);
	const isRedacted = REDACTED_PATTERNS.some((p) => strVal.includes(p));
	ctx.drawTextLine(strVal, { indent, isRedacted });
}

// ============================================================================
// FORMATTING HELPERS
// ============================================================================

/**
 * Converts a snake_case key to Title Case label.
 * e.g., "income_details" => "Income Details"
 */
function formatLabel(key: string): string {
	return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Formats a value for display. Handles dates, numbers, booleans, etc.
 */
function formatValue(value: any): string {
	if (value === null || value === undefined) return '\u2014';
	if (typeof value === 'boolean') return value ? 'Yes' : 'No';
	if (value instanceof Date) return formatDate(value);
	if (typeof value === 'number') {
		// Format currency-like numbers with Indian comma system for large values
		if (value >= 1000) {
			return formatIndianNumber(value);
		}
		return String(value);
	}
	// Check if string looks like an ISO date
	if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
		try {
			return formatDate(new Date(value));
		} catch {
			return value;
		}
	}
	return String(value);
}

/**
 * Formats a Date to a readable string: "11 Feb 2026, 02:30 PM"
 */
function formatDate(date: Date): string {
	const months = [
		'Jan',
		'Feb',
		'Mar',
		'Apr',
		'May',
		'Jun',
		'Jul',
		'Aug',
		'Sep',
		'Oct',
		'Nov',
		'Dec'
	];
	const d = date.getDate().toString().padStart(2, '0');
	const m = months[date.getMonth()];
	const y = date.getFullYear();
	const h = date.getHours();
	const min = date.getMinutes().toString().padStart(2, '0');
	const ampm = h >= 12 ? 'PM' : 'AM';
	const h12 = h % 12 || 12;
	return `${d} ${m} ${y}, ${h12.toString().padStart(2, '0')}:${min} ${ampm}`;
}

/**
 * Formats a number with Indian numbering system (lakhs, crores).
 * e.g., 1234567 => "12,34,567"
 */
function formatIndianNumber(num: number): string {
	const isNegative = num < 0;
	const absStr = Math.abs(Math.round(num)).toString();

	if (absStr.length <= 3) {
		return (isNegative ? '-' : '') + absStr;
	}

	// Last 3 digits
	let result = absStr.slice(-3);
	let remaining = absStr.slice(0, -3);

	// Group remaining digits in pairs (Indian system)
	while (remaining.length > 0) {
		const chunk = remaining.slice(-2);
		remaining = remaining.slice(0, -2);
		result = chunk + ',' + result;
	}

	return (isNegative ? '-' : '') + result;
}

/**
 * Wraps text to fit within a given width. Returns array of lines.
 */
function wrapText(text: string, maxWidth: number, fontSize: number, font: any): string[] {
	if (!text || maxWidth <= 0) return [text || ''];

	const words = text.split(/\s+/);
	const lines: string[] = [];
	let currentLine = '';

	for (const word of words) {
		const testLine = currentLine ? `${currentLine} ${word}` : word;
		const testWidth = font.widthOfTextAtSize(testLine, fontSize);

		if (testWidth > maxWidth && currentLine) {
			lines.push(currentLine);
			currentLine = word;
		} else {
			currentLine = testLine;
		}
	}

	if (currentLine) {
		lines.push(currentLine);
	}

	return lines.length > 0 ? lines : [''];
}

/**
 * Truncates text to fit within a maximum width, adding "..." if needed.
 */
function truncateText(text: string, maxWidth: number, fontSize: number, font: any): string {
	if (font.widthOfTextAtSize(text, fontSize) <= maxWidth) {
		return text;
	}

	let truncated = text;
	while (truncated.length > 0 && font.widthOfTextAtSize(truncated + '...', fontSize) > maxWidth) {
		truncated = truncated.slice(0, -1);
	}

	return truncated + '...';
}
