/**
 * DATA-3 — Retention-floor calculation per document tier.
 *
 * Maps `doc_id` (the well-known checklist identifier) → `DocumentTier` →
 * floor in days. Verified rows whose `verified_at + floor < now` are
 * eligible for the sweep. See spec §6 for the policy.
 *
 * Conservative defaults: anything we can't classify falls into the
 * `high_stakes` 365-day bucket. Better to retain than to delete-then-regret.
 */

import type { DocumentTier } from './types.js';

/** Floor in days per tier — single source of truth. */
export const RETENTION_FLOOR_DAYS: Record<DocumentTier, number> = {
	financial: 30,
	kyc: 90,
	property: 180,
	high_stakes: 365
};

/**
 * `doc_id` → `DocumentTier` mapping. These IDs come from the document
 * checklist generator (one per loan product). Unknown IDs fall through to
 * `high_stakes` — see `classifyDocument`.
 */
const TIER_BY_DOC_ID: Record<string, DocumentTier> = {
	// Financial — 30 days
	bank_statement_3m: 'financial',
	bank_statement_6m: 'financial',
	bank_statement_12m: 'financial',
	salary_slip_3m: 'financial',
	salary_slip_recent: 'financial',
	form_16: 'financial',
	form_16_2y: 'financial',
	itr_1y: 'financial',
	itr_2y: 'financial',
	itr_3y: 'financial',
	itr_acknowledgement: 'financial',
	computation_of_income: 'financial',
	cibil_report: 'financial',
	business_financials: 'financial',
	gst_returns: 'financial',
	gst_3b: 'financial',
	profit_loss: 'financial',
	balance_sheet: 'financial',

	// KYC — 90 days
	pan_card: 'kyc',
	aadhaar_card: 'kyc',
	aadhaar_front: 'kyc',
	aadhaar_back: 'kyc',
	photo: 'kyc',
	photograph: 'kyc',
	signature_specimen: 'kyc',
	address_proof: 'kyc',
	voter_id: 'kyc',
	passport: 'kyc',
	driving_license: 'kyc',

	// Property — 180 days
	sale_deed: 'property',
	agreement_to_sell: 'property',
	allotment_letter: 'property',
	property_title_chain: 'property',
	approved_plan: 'property',
	occupancy_certificate: 'property',
	commencement_certificate: 'property',
	property_tax_receipt: 'property',
	noc_society: 'property',
	rera_certificate: 'property',
	property_card: 'property',
	encumbrance_certificate: 'property'

	// Anything else → `high_stakes` (365 days) via `classifyDocument`.
};

/**
 * Resolve a document's tier from its `doc_id`. Unknown IDs are classified
 * as `high_stakes` — long retention is the safe default.
 */
export function classifyDocument(docId: string): DocumentTier {
	return TIER_BY_DOC_ID[docId] ?? 'high_stakes';
}

/**
 * Floor in days for a given doc_id.
 */
export function retentionFloorDays(docId: string): number {
	return RETENTION_FLOOR_DAYS[classifyDocument(docId)];
}

/**
 * Has the retention floor elapsed for this row? Pure function — caller
 * passes `now` so tests can pin the clock.
 *
 *   floor elapsed  ⇔  verified_at + floor(days) <= now
 *
 * Returns false if `verified_at` is null (row hasn't been verified yet).
 */
export function hasRetentionFloorElapsed(
	verifiedAt: Date | null,
	docId: string,
	now: Date
): boolean {
	if (!verifiedAt) return false;
	const floorDays = retentionFloorDays(docId);
	const eligibleAt = new Date(verifiedAt.getTime() + floorDays * 24 * 60 * 60 * 1000);
	return now.getTime() >= eligibleAt.getTime();
}
