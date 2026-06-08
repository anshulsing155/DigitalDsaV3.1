/**
 * DATA-1 — Vault entry orchestrator.
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Spec: docs/specs/DATA-1-LEAD-ATTRIBUTION-SPEC.md §6 (POST endpoint logic).
 *
 * Takes a Case document + the case's most recent form-snapshot payload, and
 * builds a fully-bucketed `LeadAttributionVaultEntry` ready to insert. All
 * privacy-load-bearing bucketing happens here — the endpoint handler is a
 * thin shell around this function, so future "should this be a vault entry"
 * policy lives in one place.
 *
 * v1 scope: secured-property loans only
 * --------------------------------------
 * Home Loan, LAP, Plot Loan. Personal/Business/Professional loans do not
 * carry a property location in the form payload — the spec's vault schema
 * (§3) uses property-keyed geography fields, so v1 returns `{ ok: false,
 * reason: 'unsupported_loan_type' }` for unsecured cases. A future v2 may
 * widen this by adding residence/business geography fields to the vault,
 * which is a schema change — out of scope for v1.
 *
 * Closure event
 * -------------
 * Per spec §14 Q1, the trigger is the FIRST transition to `stage:
 * 'sanctioned'`. We read this from `case.stage_history` rather than the
 * current `case.stage` so post-sanction stage moves (disbursed, closed) do
 * not affect the recorded quarter. If the case has never been sanctioned,
 * we refuse to write — the POST endpoint validates the trigger before
 * calling this function, but we double-check defensively.
 *
 * Lender selection
 * ----------------
 * Per spec §14 Q5, when multiple lender applications are sanctioned, pick
 * the one that reached `disbursed` (earliest by created_at). If none
 * disbursed yet, fall back to the earliest `sanctioned`. If neither, leave
 * `lender_selected` null — the field is non-routing and a null is OK.
 * ══════════════════════════════════════════════════════════════════════════════
 */

import type { Case, LenderApplication } from '$lib/types/case.js';
import type { LeadAttributionVaultEntry } from './types.js';
import { localityBucket } from './localityBucket.js';
import { priceBucket, loanAmountBucket } from './priceBucket.js';
import { closedQuarterBucket } from './closedQuarterBucket.js';

/** Loan types the v1 vault accepts. Property-secured only. */
const SECURED_LOAN_TYPES: ReadonlySet<string> = new Set([
	'Home Loan',
	'Plot and Construction Loan',
	'Plot Loan',
	'Loan Against Property',
	'LAP'
]);

export type BuildVaultResult =
	| {
			ok: true;
			/** Ready to insert — caller fills `_id` (Mongo) + `created_at` + `consent_ref`. */
			entry: Omit<LeadAttributionVaultEntry, '_id' | 'created_at' | 'consent_ref'>;
	  }
	| {
			ok: false;
			reason:
				| 'unsupported_loan_type'
				| 'not_sanctioned'
				| 'missing_property_pincode'
				| 'missing_property_price'
				| 'missing_property_locality';
	  };

/**
 * Returns true iff the loan type is a property-secured loan supported by v1.
 * Exported for the endpoint's early-skip check + the test suite.
 */
export function isSecuredLoanV1(loanType: string | null | undefined): boolean {
	if (!loanType) return false;
	return SECURED_LOAN_TYPES.has(loanType);
}

/**
 * Best-effort raw-address synthesis from the form's structured property
 * fields. We prefer `projectName`/`builderName` as the most specific tower
 * identifier and let localityBucket() strip whatever noise comes in (flat
 * numbers, building suffixes, etc.). If the project/builder is missing, the
 * area + city alone is a reasonable bucket — coarser but not wrong.
 */
function synthesizeLocalityInput(answers: Record<string, unknown>): string {
	const project =
		(answers.projectName as string) ||
		(answers.projectNameSelected as string) ||
		(answers.projectNameManual as string) ||
		'';
	const builder =
		(answers.builderName as string) || (answers.builderNameManual as string) || '';
	const area = (answers.propertyArea as string) || '';
	const city = (answers.propertyCityName as string) || '';

	// Compose the "raw address-like" input string. Empty tokens are dropped
	// before joining so we don't emit stray commas that confuse the bucket
	// pipeline's segment-detection logic.
	const parts = [project || builder, area, city].filter((t) => t && String(t).trim());
	return parts.join(', ');
}

/**
 * Pick the lender to record on the vault entry. Returns the lender_name
 * string or null when no lender has progressed far enough.
 */
function pickSelectedLender(apps: LenderApplication[]): string | null {
	if (!apps || apps.length === 0) return null;
	// Earliest-first ordering — disbursement / sanction sort positions are
	// independent of the original creation order in the LenderApplications
	// array, but spec §14 Q5 wants the earliest created_at to win ties.
	const sorted = [...apps].sort(
		(a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
	);
	const disbursed = sorted.find((a) => a.status === 'disbursed');
	if (disbursed) return disbursed.lender_name;
	const sanctioned = sorted.find((a) => a.status === 'sanctioned');
	if (sanctioned) return sanctioned.lender_name;
	return null;
}

/**
 * Build a vault entry from a Case + its form payload. Pure function — no DB
 * access, no IO. The caller is responsible for: ownership/auth checks, the
 * consent-document presence check, loading the form snapshot, decrypting it
 * (via resolveSnapshotPayload), and writing the returned entry.
 */
export function buildVaultEntry(
	caseDoc: Case,
	formAnswers: Record<string, unknown>
): BuildVaultResult {
	// Gate 1: loan type — v1 supports secured only.
	if (!isSecuredLoanV1(caseDoc.loan?.type)) {
		return { ok: false, reason: 'unsupported_loan_type' };
	}

	// Gate 2: closure event — first transition to 'sanctioned'. Reading from
	// stage_history (not current stage) means the recorded quarter is stable
	// across later stage moves like 'disbursed' / 'closed'.
	const sanctionedEvent = caseDoc.stage_history?.find((s) => s.to === 'sanctioned');
	if (!sanctionedEvent) {
		return { ok: false, reason: 'not_sanctioned' };
	}

	// Gate 3: property data must be present in the form payload.
	const propertyPincodeRaw = formAnswers.propertyPincode;
	const propertyPincode =
		typeof propertyPincodeRaw === 'string' || typeof propertyPincodeRaw === 'number'
			? String(propertyPincodeRaw).trim()
			: '';
	if (!/^\d{6}$/.test(propertyPincode)) {
		return { ok: false, reason: 'missing_property_pincode' };
	}

	const propCostRaw = Number(formAnswers.propCost ?? 0);
	if (!Number.isFinite(propCostRaw) || propCostRaw <= 0) {
		return { ok: false, reason: 'missing_property_price' };
	}

	const localityInput = synthesizeLocalityInput(formAnswers);
	const propertyLocalityBucket = localityBucket(localityInput);
	if (!propertyLocalityBucket) {
		return { ok: false, reason: 'missing_property_locality' };
	}

	// All gates passed — build the entry. consent_ref is filled by the
	// caller after it resolves the doc_id from case.lender_applications[].
	const closedQuarter = closedQuarterBucket(sanctionedEvent.timestamp);
	const lenderSelected = pickSelectedLender(caseDoc.lender_applications ?? []);
	const loanAmountSource = Number(caseDoc.loan?.amount_required ?? 0);

	return {
		ok: true,
		entry: {
			source_case_id: caseDoc.case_id,
			source_dsa_id: caseDoc.dsa_id,
			closed_quarter: closedQuarter,
			loan_type: caseDoc.loan.type,
			lender_selected: lenderSelected,
			property_locality_bucket: propertyLocalityBucket,
			property_pincode: propertyPincode,
			property_price_bucket: priceBucket(propCostRaw),
			loan_amount_bucket: loanAmountBucket(loanAmountSource)
		}
	};
}
