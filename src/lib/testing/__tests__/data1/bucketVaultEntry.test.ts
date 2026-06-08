/**
 * DATA-1 — buildVaultEntry orchestrator unit tests.
 * Spec: docs/specs/DATA-1-LEAD-ATTRIBUTION-SPEC.md §6 + §14.
 *
 * Covers the policy gates the POST /api/dsa/lead-vault endpoint relies on.
 * Each "ok: false" branch is privacy-load-bearing: any one of them returning
 * `ok: true` for a case that shouldn't be vault-able could leak data.
 */

import { describe, it, expect } from 'vitest';
import { ObjectId } from 'mongodb';
import { buildVaultEntry, isSecuredLoanV1 } from '$lib/server/data1/bucketVaultEntry';
import type { Case, LenderApplication } from '$lib/types/case';

// ── Fixtures ────────────────────────────────────────────────────────────────

const DSA_ID = new ObjectId();

function makeLenderApp(overrides: Partial<LenderApplication> = {}): LenderApplication {
	return {
		lender_application_id: 'LA-1',
		lender_id: 'L-HDFC',
		lender_name: 'HDFC',
		status: 'sanctioned',
		status_history: [],
		document_checklist: [],
		queries: [],
		file_snapshots: [],
		created_at: new Date('2026-02-01T00:00:00Z'),
		updated_at: new Date('2026-02-01T00:00:00Z'),
		...overrides
	};
}

function makeCase(overrides: Partial<Case> = {}): Case {
	return {
		case_id: 'HL-2026-0042',
		dsa_id: DSA_ID,
		label: 'Powai purchase',
		loan: { type: 'Home Loan', amount_required: 19_000_000 },
		stage: 'sanctioned',
		stage_history: [
			{ from: 'intake', to: 'sanctioned', timestamp: new Date('2026-03-14T10:00:00Z') }
		],
		lender_applications: [makeLenderApp()],
		created_at: new Date(),
		updated_at: new Date(),
		is_archived: false,
		is_sample: false,
		...overrides
	};
}

const HAPPY_PAYLOAD: Record<string, unknown> = {
	propertyStateName: 'Maharashtra',
	propertyCityName: 'Mumbai',
	propertyArea: 'Powai',
	propertyPincode: '400076',
	projectName: 'Hiranandani Gardens',
	propCost: 18_743_200
};

// ── isSecuredLoanV1 ─────────────────────────────────────────────────────────

describe('isSecuredLoanV1', () => {
	it('accepts the 3 secured loan types (Home, LAP, Plot)', () => {
		expect(isSecuredLoanV1('Home Loan')).toBe(true);
		expect(isSecuredLoanV1('Loan Against Property')).toBe(true);
		expect(isSecuredLoanV1('LAP')).toBe(true);
		expect(isSecuredLoanV1('Plot Loan')).toBe(true);
		expect(isSecuredLoanV1('Plot and Construction Loan')).toBe(true);
	});

	it('rejects unsecured loan types (v1 scope)', () => {
		expect(isSecuredLoanV1('Personal Loan')).toBe(false);
		expect(isSecuredLoanV1('Business Loan')).toBe(false);
		expect(isSecuredLoanV1('Professional Loan')).toBe(false);
	});

	it('rejects empty / null / unknown loan types', () => {
		expect(isSecuredLoanV1('')).toBe(false);
		expect(isSecuredLoanV1(null)).toBe(false);
		expect(isSecuredLoanV1(undefined)).toBe(false);
		expect(isSecuredLoanV1('Crypto Loan')).toBe(false);
	});
});

// ── buildVaultEntry — happy path ────────────────────────────────────────────

describe('buildVaultEntry — happy path', () => {
	it('produces a fully-bucketed entry for a sanctioned home loan', () => {
		const result = buildVaultEntry(makeCase(), HAPPY_PAYLOAD);

		expect(result.ok).toBe(true);
		if (!result.ok) return; // type narrow

		const { entry } = result;
		expect(entry.source_case_id).toBe('HL-2026-0042');
		expect(entry.source_dsa_id).toBe(DSA_ID);
		expect(entry.loan_type).toBe('Home Loan');
		expect(entry.closed_quarter).toBe('2026-Q1');
		expect(entry.lender_selected).toBe('HDFC');
		expect(entry.property_pincode).toBe('400076');
		expect(entry.property_price_bucket).toBe(18_740_000);
		expect(entry.loan_amount_bucket).toBe(19_000_000);
		expect(entry.property_locality_bucket).toBe('Hiranandani Gardens Powai');
	});

	it('picks the disbursed lender over the sanctioned one (spec §14 Q5)', () => {
		const caseDoc = makeCase({
			lender_applications: [
				makeLenderApp({
					lender_application_id: 'LA-1',
					lender_name: 'HDFC',
					status: 'sanctioned',
					created_at: new Date('2026-02-01T00:00:00Z')
				}),
				makeLenderApp({
					lender_application_id: 'LA-2',
					lender_name: 'SBI',
					status: 'disbursed',
					created_at: new Date('2026-02-15T00:00:00Z')
				})
			]
		});
		const result = buildVaultEntry(caseDoc, HAPPY_PAYLOAD);
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.entry.lender_selected).toBe('SBI');
	});

	it('falls back to projectName=missing → builderName when project unavailable', () => {
		const result = buildVaultEntry(makeCase(), {
			...HAPPY_PAYLOAD,
			projectName: undefined,
			builderName: 'Lodha'
		});
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.entry.property_locality_bucket).toBe('Lodha Powai');
	});
});

// ── buildVaultEntry — refusal gates ─────────────────────────────────────────

describe('buildVaultEntry — refusal gates', () => {
	it('refuses unsecured loan types', () => {
		const result = buildVaultEntry(
			makeCase({ loan: { type: 'Personal Loan' } }),
			HAPPY_PAYLOAD
		);
		expect(result).toEqual({ ok: false, reason: 'unsupported_loan_type' });
	});

	it('refuses when stage_history has no transition to sanctioned', () => {
		const result = buildVaultEntry(
			makeCase({ stage_history: [{ from: 'intake', to: 'profiling', timestamp: new Date() }] }),
			HAPPY_PAYLOAD
		);
		expect(result).toEqual({ ok: false, reason: 'not_sanctioned' });
	});

	it('refuses when propertyPincode is missing / malformed', () => {
		expect(buildVaultEntry(makeCase(), { ...HAPPY_PAYLOAD, propertyPincode: '' })).toEqual({
			ok: false,
			reason: 'missing_property_pincode'
		});
		expect(buildVaultEntry(makeCase(), { ...HAPPY_PAYLOAD, propertyPincode: '40076' })).toEqual({
			ok: false,
			reason: 'missing_property_pincode'
		});
		expect(
			buildVaultEntry(makeCase(), { ...HAPPY_PAYLOAD, propertyPincode: 'not-a-pin' })
		).toEqual({ ok: false, reason: 'missing_property_pincode' });
	});

	it('refuses when propCost is zero / negative / missing', () => {
		expect(buildVaultEntry(makeCase(), { ...HAPPY_PAYLOAD, propCost: 0 })).toEqual({
			ok: false,
			reason: 'missing_property_price'
		});
		expect(buildVaultEntry(makeCase(), { ...HAPPY_PAYLOAD, propCost: -1 })).toEqual({
			ok: false,
			reason: 'missing_property_price'
		});
		const { propCost: _, ...withoutPrice } = HAPPY_PAYLOAD;
		expect(buildVaultEntry(makeCase(), withoutPrice)).toEqual({
			ok: false,
			reason: 'missing_property_price'
		});
	});

	it('refuses when neither projectName nor builderName nor area nor city resolves', () => {
		const result = buildVaultEntry(makeCase(), {
			...HAPPY_PAYLOAD,
			projectName: '',
			projectNameSelected: '',
			projectNameManual: '',
			builderName: '',
			builderNameManual: '',
			propertyArea: '',
			propertyCityName: ''
		});
		expect(result).toEqual({ ok: false, reason: 'missing_property_locality' });
	});
});

// ── Privacy contract assertions ─────────────────────────────────────────────

describe('buildVaultEntry — privacy contract', () => {
	it('never returns the raw price — only the ₹10k-floored bucket', () => {
		const result = buildVaultEntry(makeCase(), { ...HAPPY_PAYLOAD, propCost: 18_743_287 });
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.entry.property_price_bucket).toBe(18_740_000);
			expect(result.entry.property_price_bucket).not.toBe(18_743_287);
		}
	});

	it('never returns an exact date — only the quarter', () => {
		const result = buildVaultEntry(makeCase(), HAPPY_PAYLOAD);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.entry.closed_quarter).toBe('2026-Q1');
			// Sanity: closed_quarter must NOT contain day-level precision.
			expect(result.entry.closed_quarter).not.toMatch(/\d{4}-\d{2}-\d{2}/);
		}
	});

	it('does not pass through specifying tokens (flat numbers) from projectName', () => {
		// If a DSA entered "Flat 4B, Hiranandani Gardens" as the project name
		// (unusual but possible), the bucket must still strip the flat number.
		const result = buildVaultEntry(makeCase(), {
			...HAPPY_PAYLOAD,
			projectName: 'Flat 4B, Hiranandani Gardens'
		});
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.entry.property_locality_bucket).not.toMatch(/4B/);
			expect(result.entry.property_locality_bucket).not.toMatch(/Flat/i);
		}
	});
});
