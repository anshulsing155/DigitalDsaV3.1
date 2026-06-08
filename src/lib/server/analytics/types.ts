/**
 * DATA-4 — analytics warehouse types.
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Spec: docs/specs/DATA-4-ANALYTICS-WAREHOUSE-V1-SPEC.md §4 (schema).
 *
 * One document per operational case, holding ONLY de-identified data. Real
 * PII never lands here — see the spec's "Fields that NEVER appear" list (§5).
 * The privacy-contract static-scan test (Slice 6) enforces that no forbidden
 * field name ever appears in code that writes to this collection.
 *
 * This collection lives in a SEPARATE database (`digitaldsa_analytics`) on the
 * same Atlas cluster, written only by the nightly ETL job (Slice 5).
 * ══════════════════════════════════════════════════════════════════════════════
 */

import type { ObjectId } from 'mongodb';
import type { CaseStage } from '$lib/types/case.js';

/** Terminal stage a case settled into, or null while still open. */
export type AnalyticsFinalStage = 'disbursed' | 'closed' | 'rejected' | 'dropped' | null;

/** A lender recommendation, stripped of any PII — only id/score/reason. */
export interface AnalyticsRecommendedBank {
	lender_id: string;
	score: number;
	reason: string;
}

/**
 * The de-identified analytics row. Every field is either non-PII by nature
 * (internal IDs, timestamps, loan-type strings) or bucketed/derived so it
 * cannot identify a person. Exact numeric values (income, property value)
 * are kept alongside their brackets — a single rupee figure is not
 * identifying on its own, and exactness is useful for analytics; the bracket
 * fields exist for k-anonymity-friendly grouping queries.
 */
export interface AnalyticsCaseDoc {
	_id?: ObjectId;

	// ── Provenance ──────────────────────────────────────────
	case_id: string; // operational Cases.case_id — same string, not a secret
	dsa_id: ObjectId; // operational Cases.dsa_id — internal ID, safe to keep
	/**
	 * HMAC-SHA256(ANALYTICS_PEPPER, pan_hash) — the one-way bridge (§3).
	 *
	 * NULL in v1: the PAN is intentionally absent from the form payload, and a
	 * PAN hash exists only for doc-upload (locked) cases — never for manual
	 * cases. Tagging one person_id per case off the primary applicant's PAN
	 * would also misrepresent unique-person counts on multi-applicant loans.
	 * Since v1 ships no dashboards, unique-person counting isn't needed yet;
	 * the field + the personIdFromPanHash helper stay as ready plumbing for a
	 * future per-applicant identity bridge. (Decision: 2026-05-20.)
	 */
	person_id: string | null;

	// ── Timing ──────────────────────────────────────────────
	opened_at: Date; // Cases.created_at
	closed_at: Date | null; // when case reached a final stage; null while open
	final_stage: AnalyticsFinalStage;
	current_stage: CaseStage; // most recent value from Cases.stage

	// ── Loan basics ─────────────────────────────────────────
	loan_type: string; // e.g. 'Home Loan' — already non-PII
	loan_amount_requested: number | null; // exact
	loan_amount_eligible: number | null; // exact (from rule engine output)
	loan_amount_sanctioned: number | null; // exact, if reached sanctioned stage
	loan_amount_disbursed: number | null; // exact, if reached disbursed stage
	tenure_months: number | null;
	emi_amount: number | null;
	interest_rate_band: string | null; // '8-9%' | '9-10%' | ... — bucketed for k-anonymity

	// ── Borrower demographics (bucketed — no identifying detail) ───
	borrower_age: number | null; // exact integer — useful for analytics
	borrower_age_bracket: string | null; // '25-30' | '30-35' | etc. — for grouping queries
	borrower_gender: string | null; // if collected
	borrower_employment_type: string | null; // 'salaried' | 'self_employed' | 'business' | 'professional'
	borrower_industry: string | null; // e.g. 'IT_Services' — derived from employer name via lookup
	borrower_income_exact: number | null; // exact rupees
	borrower_income_bracket: string | null; // '5L-10L' | '10L-20L' | etc.
	borrower_obligations_exact: number | null;
	borrower_obligation_ratio: number | null; // ratio not raw amount
	borrower_existing_loans_count: number | null;

	// ── Geography (already-bucketed by construction) ────────
	borrower_pincode: string | null; // 6-digit — already a 2-10 km² bucket
	borrower_city: string | null;
	borrower_state: string | null;
	borrower_region_tier: string | null; // 'Tier 1' | 'Tier 2' | 'Tier 3' | 'Rural'

	// ── Property (if applicable to the loan) ────────────────
	has_property: boolean | null;
	property_type: string | null; // 'apartment' | 'independent' | 'plot' | 'commercial'
	property_value_exact: number | null;
	property_value_bracket: string | null; // '20L-40L' | '40L-60L' | etc.
	property_pincode: string | null; // 6-digit
	property_locality_bucket: string | null; // reuses DATA-1 localityBucket()

	// ── Lender selection (the analytics gold) ───────────────
	recommended_banks: AnalyticsRecommendedBank[] | null;
	selected_lender_id: string | null; // null until sanctioned stage
	selection_reason: string | null; // 'best_offer' | 'dsa_preference' | etc.

	// ── Reproducibility ─────────────────────────────────────
	engine_version: string | null; // Cases.results_snapshot engine version field
	payload_version: number | null; // FormSnapshots version used for this row

	// ── ETL audit ───────────────────────────────────────────
	etl_run_id: string; // identifier of the ETL run that wrote this row
	etl_written_at: Date; // last time this row was upserted
}

/**
 * One row per ETL run — the operational audit trail (spec §6 step 3 / §8).
 * Lets an operator answer "did last night's job complete? how many rows?".
 * Lives in the analytics database alongside analytics_cases.
 */
export interface AnalyticsEtlRunDoc {
	_id?: ObjectId;
	/** Unique run identifier (also stamped onto each row's etl_run_id). */
	run_id: string;
	/** When the run started — this is the incremental cursor for the NEXT run. */
	started_at: Date;
	/** When the run finished; null while a run is considered in-flight. */
	finished_at: Date | null;
	/** Cases successfully upserted into analytics_cases. */
	cases_processed: number;
	/** Cases skipped (no snapshot / empty or undecryptable payload). */
	cases_skipped: number;
	/** Cases that errored during transform (counted, never block the run). */
	cases_errored: number;
}
