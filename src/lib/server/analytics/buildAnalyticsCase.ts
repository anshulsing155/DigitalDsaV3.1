/**
 * DATA-4 — buildAnalyticsCase orchestrator.
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Spec: docs/specs/DATA-4-ANALYTICS-WAREHOUSE-V1-SPEC.md §4–§6.
 *
 * Pure function: takes an operational Case + its ENRICHED, already-decrypted
 * form payload, and returns the de-identified analytics row. No DB access, no
 * decryption, no I/O — the ETL job (Slice 5) does all of that and hands the
 * plaintext in. That keeps this fully unit-testable and side-effect-free.
 *
 * Two field-scope conventions (documented because the schema field names
 * don't make them obvious):
 *   - DEMOGRAPHIC fields (age / gender / employment / industry / residence)
 *     describe the PRIMARY applicant (allApplicantDetails[0]).
 *   - FINANCIAL aggregates (income / obligations / obligation ratio /
 *     existing-loan count) are CASE-LEVEL totals (all applicants), because
 *     that's what the enricher's `_computed` totals represent and it's the
 *     more useful analytics signal for a one-row-per-case warehouse.
 *
 * Fields that are null in v1 (no clean source in the payload — they live on
 * the eligibility result / LenderResultsSnapshot, or need a helper we haven't
 * built): person_id, loan_amount_eligible, emi_amount, interest_rate_band,
 * property_value_bracket, property_locality_bucket, recommended_banks,
 * selection_reason, engine_version. See the spec §5 table for the rationale.
 * ══════════════════════════════════════════════════════════════════════════════
 */

import type { Case, LenderApplication } from '$lib/types/case.js';
import type { EnrichedPayload } from '$lib/ruleEngine/payloadEnricher.js';
import type { AnalyticsCaseDoc, AnalyticsFinalStage } from './types.js';
import { ageBracket } from './ageBracket.js';
import { incomeBracket } from './incomeBracket.js';
import { industryLookup } from './industryLookup.js';
import { regionTier } from './regionTier.js';

/** Stages that count as a case having "settled" into a terminal outcome. */
const TERMINAL_STAGES = new Set(['disbursed', 'closed', 'rejected', 'dropped']);
const MONTHS_PER_YEAR = 12;

export interface BuildAnalyticsCaseInput {
	/** The operational case document. */
	caseDoc: Case;
	/** The enriched + decrypted form payload (ETL resolves + enriches it). */
	payload: EnrichedPayload;
	/** FormSnapshots.version this row was built from (for reproducibility). */
	snapshotVersion: number | null;
	/** Identifier of the ETL run writing this row. */
	etlRunId: string;
	/** Timestamp of this upsert. */
	etlWrittenAt: Date;
}

/** Coerce to a finite number, or null. Keeps NaN / Infinity / non-numbers out. */
function numberOrNull(value: unknown): number | null {
	return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** Non-empty trimmed string, or null. */
function stringOrNull(value: unknown): string | null {
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
}

/**
 * Find when (and into what terminal stage) the case settled, by scanning the
 * stage history for the FIRST transition into a terminal stage. Returns nulls
 * for a case still in flight.
 */
function deriveClosure(caseDoc: Case): { closed_at: Date | null; final_stage: AnalyticsFinalStage } {
	const history = Array.isArray(caseDoc.stage_history) ? caseDoc.stage_history : [];
	for (const transition of history) {
		if (transition && TERMINAL_STAGES.has(transition.to)) {
			return {
				closed_at: transition.timestamp ?? null,
				final_stage: transition.to as AnalyticsFinalStage
			};
		}
	}
	return { closed_at: null, final_stage: null };
}

/** First lender application carrying a numeric sanction amount, or null. */
function firstSanctionAmount(apps: LenderApplication[]): number | null {
	for (const app of apps) {
		const amount = numberOrNull(app?.sanction?.amount);
		if (amount !== null) return amount;
	}
	return null;
}

/** First lender application carrying a numeric disbursement total, or null. */
function firstDisbursementAmount(apps: LenderApplication[]): number | null {
	for (const app of apps) {
		const amount = numberOrNull(app?.disbursement?.total_amount);
		if (amount !== null) return amount;
	}
	return null;
}

/** lender_id of a sanctioned/disbursed application, used when no primary is set. */
function sanctionedLenderId(apps: LenderApplication[]): string | null {
	for (const app of apps) {
		if (app?.sanction?.amount != null || app?.disbursement?.total_amount != null) {
			return stringOrNull(app.lender_id);
		}
	}
	return null;
}

/** Count existing-obligation entries across ALL applicants (case-level total). */
function countObligations(payload: EnrichedPayload): number | null {
	const applicants = Array.isArray(payload.allApplicantDetails) ? payload.allApplicantDetails : [];
	if (applicants.length === 0) return null;
	let count = 0;
	for (const applicant of applicants) {
		if (Array.isArray(applicant?.obligations)) count += applicant.obligations.length;
	}
	return count;
}

/**
 * Derive the borrower's industry category. Salaried borrowers have no employer
 * name in the payload, so industry stays null for them. Self-employed /
 * business / professional applicants expose a sector/type we can classify.
 */
function deriveIndustry(employmentType: string | null, primary: EnrichedPayload['allApplicantDetails'][number] | undefined): string | null {
	const emp = (employmentType ?? '').toLowerCase();
	const isSalariedLike =
		emp.includes('salaried') || emp.includes('government') || emp.includes('pension');
	if (isSalariedLike) return null;

	const source =
		stringOrNull(primary?.businessIndustrySector) ??
		stringOrNull(primary?.businessType) ??
		stringOrNull(primary?.professionType) ??
		stringOrNull(primary?.companyName);
	return industryLookup(source);
}

/**
 * Assemble the de-identified analytics row from an operational case + payload.
 * Never throws on missing fields — absent data becomes null so the ETL can
 * still write a (partial) row rather than skipping the case.
 */
export function buildAnalyticsCase(input: BuildAnalyticsCaseInput): AnalyticsCaseDoc {
	const { caseDoc, payload, snapshotVersion, etlRunId, etlWrittenAt } = input;

	const txn = payload.loanTransaction ?? ({} as EnrichedPayload['loanTransaction']);
	const applicants = Array.isArray(payload.allApplicantDetails) ? payload.allApplicantDetails : [];
	const primary = applicants[0];
	const lenderApps = Array.isArray(caseDoc.lender_applications) ? caseDoc.lender_applications : [];

	const { closed_at, final_stage } = deriveClosure(caseDoc);

	// ── Demographics (primary applicant) ──────────────────────
	const age = numberOrNull(primary?.age);
	const employmentType = stringOrNull(primary?.employmentType);

	// ── Financials (case-level totals from the enricher) ──────
	const incomeMonthly = numberOrNull(payload._computed?._total_gross_monthly);
	const obligationsMonthly = numberOrNull(payload._computed?._total_obligations_monthly);
	const obligationRatio =
		incomeMonthly !== null && incomeMonthly > 0 && obligationsMonthly !== null
			? obligationsMonthly / incomeMonthly
			: null;

	// ── Geography (primary residence, falling back to case-level) ──
	const residenceCity = stringOrNull(primary?.applicantResidenceCity) ?? stringOrNull(txn.residenceCity);
	const residenceState =
		stringOrNull(primary?.applicantResidenceState) ?? stringOrNull(txn.residenceState);
	const residencePincode = stringOrNull(primary?.applicantResidencePincode);

	// ── Property (case-level) ─────────────────────────────────
	const propertyType = stringOrNull(txn.propertyType);
	const propertyCost = numberOrNull(txn.propertyCost);
	const propertyPincode = stringOrNull(txn.propertyPincode);
	const hasPropertySignal =
		propertyType !== null ||
		propertyCost !== null ||
		propertyPincode !== null ||
		txn.propertyIdentified === true;

	const tenureYears = numberOrNull(txn.tenureYears);

	return {
		// ── Provenance ──
		case_id: caseDoc.case_id,
		dsa_id: caseDoc.dsa_id,
		person_id: null, // v1: no clean PAN source — see types.ts AnalyticsCaseDoc.person_id

		// ── Timing ──
		opened_at: caseDoc.created_at,
		closed_at,
		final_stage,
		current_stage: caseDoc.stage,

		// ── Loan basics ──
		loan_type: stringOrNull(caseDoc.loan?.type) ?? '',
		loan_amount_requested: numberOrNull(txn.loanAmount) ?? numberOrNull(caseDoc.loan?.amount_required),
		loan_amount_eligible: null, // v1: lives on the eligibility result, not the payload
		loan_amount_sanctioned: firstSanctionAmount(lenderApps),
		loan_amount_disbursed: firstDisbursementAmount(lenderApps),
		tenure_months: tenureYears !== null ? tenureYears * MONTHS_PER_YEAR : null,
		emi_amount: null, // v1: computed downstream, not in the payload
		interest_rate_band: null, // v1: from sanction.roi / eligibility, not yet wired

		// ── Borrower demographics (primary applicant) ──
		borrower_age: age,
		borrower_age_bracket: ageBracket(age),
		borrower_gender: stringOrNull(primary?.gender),
		borrower_employment_type: employmentType,
		borrower_industry: deriveIndustry(employmentType, primary),
		borrower_income_exact: incomeMonthly,
		borrower_income_bracket: incomeBracket(incomeMonthly),
		borrower_obligations_exact: obligationsMonthly,
		borrower_obligation_ratio: obligationRatio,
		borrower_existing_loans_count: countObligations(payload),

		// ── Geography ──
		borrower_pincode: residencePincode,
		borrower_city: residenceCity,
		borrower_state: residenceState,
		borrower_region_tier: regionTier(residenceCity),

		// ── Property ──
		has_property: hasPropertySignal ? true : null,
		property_type: propertyType,
		property_value_exact: propertyCost,
		property_value_bracket: null, // v1: no property-value bracket helper yet
		property_pincode: propertyPincode,
		property_locality_bucket: null, // v1: payload has no area+project keys to bucket

		// ── Lender selection ──
		recommended_banks: null, // v1: from LenderResultsSnapshot, not passed in
		selected_lender_id: stringOrNull(caseDoc.primary_lender_id) ?? sanctionedLenderId(lenderApps),
		selection_reason: null, // v1: not tracked operationally
		engine_version: null, // v1: from results snapshot, not yet wired

		// ── Reproducibility ──
		payload_version: snapshotVersion ?? numberOrNull(caseDoc.form_snapshot_version),

		// ── ETL audit ──
		etl_run_id: etlRunId,
		etl_written_at: etlWrittenAt
	};
}
