/**
 * DATA-1 — Consent document lookup.
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Spec: docs/specs/DATA-1-LEAD-ATTRIBUTION-SPEC.md §6 (POST), §10 (consent model).
 *
 * The consent document is the legal predicate for any vault write. Per
 * spec, the case must have a checklist item with:
 *   - doc_name === 'data_usage_consent_v1'
 *   - status === 'uploaded' (file is on ImageKit)
 *
 * The checklist items live inside each lender_application's
 * document_checklist[]. A single consent document is uploaded per case but
 * may appear in multiple lender applications' checklists (each lender has
 * its own checklist row, but the file_id can be shared). We accept the
 * first match across all applications — they should reference the same
 * underlying file.
 *
 * Returning the doc_id (the checklist item's identifier) gives the vault
 * write a stable reference for the consent withdrawal flow (§10): when the
 * customer revokes consent, the doc_id makes it easy to find which vault
 * entries originated from that signature.
 * ══════════════════════════════════════════════════════════════════════════════
 */

import type { Case } from '$lib/types/case.js';

/** The canonical doc_name for the v1 data-usage consent template. */
export const DATA_USAGE_CONSENT_DOC_NAME = 'data_usage_consent_v1';

/**
 * Returns the doc_id of the first uploaded data-usage consent document on
 * the case, or null if none. The endpoint handler uses the null return as
 * the trigger for the CONSENT_REQUIRED 400 response.
 */
export function findConsentDocId(caseDoc: Case): string | null {
	for (const app of caseDoc.lender_applications ?? []) {
		for (const item of app.document_checklist ?? []) {
			if (item.doc_name === DATA_USAGE_CONSENT_DOC_NAME && item.status === 'uploaded') {
				return item.doc_id;
			}
		}
	}
	return null;
}
