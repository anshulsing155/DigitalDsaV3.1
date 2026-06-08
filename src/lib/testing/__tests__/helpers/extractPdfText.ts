/**
 * PDF text extraction helper for behavioural tests.
 *
 * Generated PDFs are byte buffers — to test that the right content is in them,
 * we read the bytes back and pull out per-page text. Uses the legacy build of
 * pdfjs-dist which is the Node-friendly entry point.
 *
 * Used by pdfGeneratorContent.test.ts.
 */

import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs';

// pdfjs 5.x requires GlobalWorkerOptions.workerSrc to be set, even in Node.
// Resolve the worker file inside the installed pdfjs-dist package and convert
// to a file:// URL — Node's ESM loader rejects bare Windows paths (drive letter
// mistaken as a URL scheme like "f:") with "Only URLs with a scheme in: file,
// data, and node are supported".
const require = createRequire(import.meta.url);
GlobalWorkerOptions.workerSrc = pathToFileURL(
	require.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs')
).href;

export interface ExtractedPdf {
	/** Number of pages in the PDF. */
	pageCount: number;
	/** Raw text per page, in order. */
	pages: string[];
	/** All pages joined with double newline — convenient for global asserts. */
	fullText: string;
}

/**
 * Extract per-page text from a PDF buffer. Layout positions are not preserved —
 * tests should use `.toContain(...)` and `.toMatch(...)` rather than positional
 * assertions.
 */
export async function extractPdfText(pdfBytes: Uint8Array): Promise<ExtractedPdf> {
	// pdfjs mutates its input buffer; pass a copy so the caller's bytes survive.
	const data = new Uint8Array(pdfBytes);
	const doc = await getDocument({ data, disableFontFace: true }).promise;

	const pages: string[] = [];
	for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
		const page = await doc.getPage(pageNumber);
		const content = await page.getTextContent();
		const text = content.items
			.map((item) => ('str' in item ? item.str : ''))
			.join(' ')
			.replace(/\s+/g, ' ')
			.trim();
		pages.push(text);
	}

	const pageCount = doc.numPages;
	await doc.destroy();

	return {
		pageCount,
		pages,
		fullText: pages.join('\n\n')
	};
}
