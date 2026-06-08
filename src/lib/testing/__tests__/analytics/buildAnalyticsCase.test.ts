/**
 * DATA-4 — buildAnalyticsCase orchestrator unit tests.
 * Spec: docs/specs/DATA-4-ANALYTICS-WAREHOUSE-V1-SPEC.md §4–§6 / §9.
 */

import { describe, it, expect } from 'vitest';
import { ObjectId } from 'mongodb';
import { buildAnalyticsCase } from '$lib/server/analytics/buildAnalyticsCase';
import type { Case } from '$lib/types/case';
import type { EnrichedPayload } from '$lib/ruleEngine/payloadEnricher';

const DSA_ID = new ObjectId();
const ETL_RUN_ID = 'etl-run-2026-05-20';
const ETL_AT = new Date('2026-05-20T02:00:00Z');

/** Minimal Case with the fields buildAnalyticsCase reads. */
function makeCase(overrides: Partial<Case> = {}): Case {
	return {
		case_id: 'HL-2026-0042',
		dsa_id: DSA_ID,
		label: 'private ref',
		loan: { type: 'Home Loan', amount_required: 5_000_000 },
		stage: 'disbursed',
		stage_history: [
			{ from: 'intake', to: 'profiling', timestamp: new Date('2026-01-01') },
			{ from: 'submitted', to: 'disbursed', timestamp: new Date('2026-03-15') }
		],
		lender_applications: [
			{
				lender_application_id: 'app-1',
				lender_id: 'hdfc',
				lender_name: 'HDFC',
				status: 'disbursed',
				status_history: [],
				sanction: { amount: 4_800_000 },
				disbursement: { total_amount: 4_800_000 },
				document_checklist: [],
				queries: [],
				file_snapshots: [],
				created_at: new Date(),
				updated_at: new Date()
			}
		],
		primary_lender_id: 'hdfc',
		created_at: new Date('2026-01-01'),
		updated_at: new Date('2026-03-15'),
		is_archived: false,
		is_sample: false,
		...overrides
	} as unknown as Case;
}

/** Minimal enriched payload with the fields buildAnalyticsCase reads. */
function makePayload(overrides: Record<string, unknown> = {}): EnrichedPayload {
	return {
		loanTransaction: {
			loanAmount: 5_000_000,
			tenureYears: 20,
			propertyType: 'apartment',
			propertyCost: 6_500_000,
			propertyPincode: '400076',
			propertyIdentified: true
		},
		allApplicantDetails: [
			{
				applicantType: 'Individual',
				fullName: 'should-not-leak',
				age: 34,
				gender: 'Male',
				employmentType: 'Salaried(Private)',
				applicantResidenceCity: 'Mumbai',
				applicantResidenceState: 'Maharashtra',
				applicantResidencePincode: '400076',
				obligations: [{ id: 'o1' }, { id: 'o2' }]
			}
		],
		_computed: {
			_total_gross_monthly: 120_000,
			_total_obligations_monthly: 30_000
		},
		...overrides
	} as unknown as EnrichedPayload;
}

const baseInput = () => ({
	caseDoc: makeCase(),
	payload: makePayload(),
	snapshotVersion: 3,
	etlRunId: ETL_RUN_ID,
	etlWrittenAt: ETL_AT
});

describe('buildAnalyticsCase — happy path', () => {
	const row = buildAnalyticsCase(baseInput());

	it('carries provenance straight through', () => {
		expect(row.case_id).toBe('HL-2026-0042');
		expect(row.dsa_id).toBe(DSA_ID);
		expect(row.payload_version).toBe(3);
		expect(row.etl_run_id).toBe(ETL_RUN_ID);
		expect(row.etl_written_at).toBe(ETL_AT);
	});

	it('always leaves person_id null in v1', () => {
		expect(row.person_id).toBeNull();
	});

	it('derives closure from the first terminal stage transition', () => {
		expect(row.final_stage).toBe('disbursed');
		expect(row.closed_at).toEqual(new Date('2026-03-15'));
		expect(row.current_stage).toBe('disbursed');
		expect(row.opened_at).toEqual(new Date('2026-01-01'));
	});

	it('maps loan basics + sanction/disbursement', () => {
		expect(row.loan_type).toBe('Home Loan');
		expect(row.loan_amount_requested).toBe(5_000_000);
		expect(row.loan_amount_sanctioned).toBe(4_800_000);
		expect(row.loan_amount_disbursed).toBe(4_800_000);
		expect(row.tenure_months).toBe(240);
		expect(row.selected_lender_id).toBe('hdfc');
	});

	it('maps + brackets demographics from the primary applicant', () => {
		expect(row.borrower_age).toBe(34);
		expect(row.borrower_age_bracket).toBe('30-35');
		expect(row.borrower_gender).toBe('Male');
		expect(row.borrower_employment_type).toBe('Salaried(Private)');
		expect(row.borrower_industry).toBeNull(); // salaried → no employer name
	});

	it('uses case-level enricher totals for financials', () => {
		expect(row.borrower_income_exact).toBe(120_000); // raw monthly
		expect(row.borrower_income_bracket).toBe('10L-20L'); // 120k/mo × 12 = ₹14.4L annual
		expect(row.borrower_obligations_exact).toBe(30_000);
		expect(row.borrower_obligation_ratio).toBeCloseTo(0.25, 5);
		expect(row.borrower_existing_loans_count).toBe(2);
	});

	it('maps geography + region tier', () => {
		expect(row.borrower_city).toBe('Mumbai');
		expect(row.borrower_state).toBe('Maharashtra');
		expect(row.borrower_pincode).toBe('400076');
		expect(row.borrower_region_tier).toBe('Tier 1');
	});

	it('maps property fields', () => {
		expect(row.has_property).toBe(true);
		expect(row.property_type).toBe('apartment');
		expect(row.property_value_exact).toBe(6_500_000);
		expect(row.property_pincode).toBe('400076');
	});

	it('leaves v1-deferred fields null', () => {
		expect(row.loan_amount_eligible).toBeNull();
		expect(row.emi_amount).toBeNull();
		expect(row.interest_rate_band).toBeNull();
		expect(row.property_value_bracket).toBeNull();
		expect(row.property_locality_bucket).toBeNull();
		expect(row.recommended_banks).toBeNull();
		expect(row.selection_reason).toBeNull();
		expect(row.engine_version).toBeNull();
	});
});

describe('buildAnalyticsCase — edge cases', () => {
	it('reports null closure for an in-flight case (no terminal transition)', () => {
		const row = buildAnalyticsCase({
			...baseInput(),
			caseDoc: makeCase({
				stage: 'processing',
				stage_history: [{ from: 'intake', to: 'profiling', timestamp: new Date('2026-01-01') }]
			})
		});
		expect(row.final_stage).toBeNull();
		expect(row.closed_at).toBeNull();
		expect(row.current_stage).toBe('processing');
	});

	it('does not throw on an empty payload — fills nulls instead', () => {
		const row = buildAnalyticsCase({
			...baseInput(),
			payload: {} as unknown as EnrichedPayload
		});
		expect(row.case_id).toBe('HL-2026-0042'); // provenance still set
		expect(row.borrower_age).toBeNull();
		expect(row.borrower_age_bracket).toBeNull();
		expect(row.borrower_income_exact).toBeNull();
		expect(row.borrower_income_bracket).toBeNull();
		expect(row.borrower_existing_loans_count).toBeNull();
		expect(row.has_property).toBeNull();
		expect(row.borrower_region_tier).toBeNull();
	});

	it('classifies industry for a self-employed / business applicant', () => {
		const row = buildAnalyticsCase({
			...baseInput(),
			payload: makePayload({
				allApplicantDetails: [
					{
						applicantType: 'Individual',
						age: 45,
						gender: 'Female',
						employmentType: 'Self-employed(Other)',
						businessIndustrySector: 'Manufacturing'
					}
				]
			})
		});
		expect(row.borrower_industry).toBe('Manufacturing');
		expect(row.borrower_gender).toBe('Female');
	});

	it('never emits a forbidden PII field name (belt-and-suspenders for §5)', () => {
		const row = buildAnalyticsCase(baseInput());
		const forbidden = [
			'borrower_name',
			'borrower_mobile',
			'borrower_email',
			'borrower_pan',
			'borrower_aadhaar',
			'borrower_bank_account',
			'borrower_address_line1',
			'employer_name',
			'fullName'
		];
		for (const key of forbidden) {
			expect(Object.prototype.hasOwnProperty.call(row, key)).toBe(false);
		}
	});
});
