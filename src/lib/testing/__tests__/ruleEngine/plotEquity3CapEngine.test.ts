/**
 * Plot & Equity Loan 3-cap engine math — gold-standard lock test (ADR-0021).
 *
 * Locks the four-number output the engine produces for Plot & Equity Loan
 * when the lender's rule doc supplies the three caps (X% overall sanction,
 * Y% seller disbursement on registry, Z% LAP-on-plot for buyer cash).
 *
 * Two worked examples are locked:
 *
 *   (A) Spec §3 gold standard — ₹1Cr market / ₹20L registry / 70-90-40:
 *       Sanction ₹70L · Seller ₹18L · Buyer cash ₹40L · Buyer net ₹42L
 *
 *   (B) Owner's variant — ₹1.4Cr market / ₹35L registry / 70-90-40:
 *       Sanction ₹98L · Seller ₹31.5L · Buyer cash ₹56L · Buyer net ₹52.5L
 *
 * Plus negative tests:
 *   - Other Plot variants (Plot Loan Only / Plot & Construction / Construction Only)
 *     never get the 4 fields populated even when market + registry + caps are present.
 *   - Home Loan + LAP never get the 4 fields populated.
 *   - Missing marketValue / registryValue → no fields populated, no crash.
 *   - Lender missing one of the three caps → no fields populated.
 *
 * Per CLAUDE.md §16 Rule #16: this asserts the CANONICAL post-Phase-2 contract.
 * If a future change moves the math, refactors the field names, or weakens
 * the gating, this test fails — forcing an explicit update with intent.
 */

import { describe, it, expect } from 'vitest';
import { evaluateLender } from '$lib/ruleEngine/evaluationEngine.js';
import type {
	LoanApplicationPayload,
	ApplicantPayload
} from '$lib/utils/payloadBuilder';
import type {
	ParsedLenderRuleDocument,
	ParsedIncomeRule,
	ParsedObligationRule
} from '$lib/ruleEngine/types.js';

const ONE_CRORE = 10_000_000;
const TWENTY_LAKH = 2_000_000;
const ONE_POINT_FOUR_CRORE = 14_000_000;
const THIRTY_FIVE_LAKH = 3_500_000;

// ── Minimal salaried applicant — passes age + CIBIL + income gates ──────────
function buildApplicant(overrides: Partial<ApplicantPayload> = {}): ApplicantPayload {
	return {
		applicantType: 'Individual',
		fullName: 'Test User',
		age: 35,
		gender: 'Male',
		maritalStatus: 'Married',
		employmentType: 'Salaried(Private)',
		grossIncome: 200_000,
		netIncome: 160_000,
		creditScore: 780,
		hasExistingObligations: false,
		obligations: [],
		incomeEntries: [
			{
				profileType: 'salaried_regular',
				entityName: 'TestCorp',
				income: { grossMonthlySalary: 200_000, netMonthlySalary: 160_000 },
				evidence: { itrFiled: true, hasDocumentaryEvidence: true }
			}
		],
		...overrides
	} as ApplicantPayload;
}

// ── Minimal Plot & Equity Loan payload — caps tested vary by rule doc ──────
function buildPayload(
	loanTransactionOverrides: Record<string, unknown> = {}
): LoanApplicationPayload {
	return {
		loanTransaction: {
			loanName: 'Plot and Construction Loan', // engine-canonical Plot Loan name
			loanType: 'New Loan',
			loanVariant: 'Plot & Equity Loan',
			numberOfApplicants: 1,
			propertyIdentified: true,
			propertyRegistered: true,
			propertyState: 'Haryana',
			propertyCity: 'Faridabad',
			propertyType: 'Free Hold',
			purchaseType: 'resale',
			loanAmount: 5_000_000,
			tenureYears: 15,
			marketValue: ONE_CRORE,
			registryValue: TWENTY_LAKH,
			propertyCost: ONE_CRORE,
			...loanTransactionOverrides
		},
		allApplicantDetails: [buildApplicant()]
	} as LoanApplicationPayload;
}

// ── Mock rule doc — supplies the three Plot & Equity caps + bare-minimum
// parameters the engine validates (roi, max_foir, max_tenure_months,
// max_age_at_maturity, max_ltv as the generic LTV fallback). ──────────────
function buildRuleDoc(opts: {
	overallSanctionLtv?: number;
	sellerDisbursementCap?: number;
	lapOnPlotCap?: number;
	loanTypes?: string[];
} = {}): ParsedLenderRuleDocument {
	const ltvRules: ParsedLenderRuleDocument['sections']['ltv'] = [
		{
			rule_id: 'ltv-generic',
			description: 'Generic LTV 70% (fallback)',
			tier: 'parameter',
			logic: { '!!': [true] },
			parameter_key: 'max_ltv',
			parameter_value: 70,
			confidence: 0.9,
			source_excerpt: 'Generic LTV: 70%'
		}
	];

	if (opts.overallSanctionLtv !== undefined) {
		ltvRules.push({
			rule_id: 'plot-equity-X',
			description: `Plot & Equity overall sanction LTV ${opts.overallSanctionLtv}%`,
			tier: 'parameter',
			logic: { '==': [{ var: 'loanTransaction.loanVariant' }, 'Plot & Equity Loan'] },
			parameter_key: 'plot_equity_overall_sanction_ltv',
			parameter_value: opts.overallSanctionLtv,
			confidence: 0.95,
			source_excerpt: `Plot & Equity X = ${opts.overallSanctionLtv}%`
		});
	}
	if (opts.sellerDisbursementCap !== undefined) {
		ltvRules.push({
			rule_id: 'plot-equity-Y',
			description: `Plot & Equity seller disbursement cap ${opts.sellerDisbursementCap}% of registry`,
			tier: 'parameter',
			logic: { '==': [{ var: 'loanTransaction.loanVariant' }, 'Plot & Equity Loan'] },
			parameter_key: 'plot_equity_seller_disbursement_cap',
			parameter_value: opts.sellerDisbursementCap,
			confidence: 0.95,
			source_excerpt: `Plot & Equity Y = ${opts.sellerDisbursementCap}%`
		});
	}
	if (opts.lapOnPlotCap !== undefined) {
		ltvRules.push({
			rule_id: 'plot-equity-Z',
			description: `Plot & Equity LAP-on-plot cap ${opts.lapOnPlotCap}% of market`,
			tier: 'parameter',
			logic: { '==': [{ var: 'loanTransaction.loanVariant' }, 'Plot & Equity Loan'] },
			parameter_key: 'plot_equity_lap_on_plot_cap',
			parameter_value: opts.lapOnPlotCap,
			confidence: 0.95,
			source_excerpt: `Plot & Equity Z = ${opts.lapOnPlotCap}%`
		});
	}

	return {
		lender_id: 'test-bank',
		lender_name: 'Test Bank',
		classification: 'PVT',
		loan_types: opts.loanTypes ?? ['Plot and Construction Loan'],
		sections: {
			eligibility: [
				{
					rule_id: 'elig-age',
					description: 'Age 21-65',
					tier: 'hard_gate',
					logic: {
						and: [
							{ '>=': [{ var: 'allApplicantDetails.0.age' }, 21] },
							{ '<=': [{ var: 'allApplicantDetails.0.age' }, 65] }
						]
					},
					fail_message: 'Age out of range',
					fail_category: 'age_limit',
					confidence: 0.95,
					source_excerpt: 'Age 21-65'
				}
			],
			cibil: [
				{
					rule_id: 'cibil-min',
					description: 'CIBIL >= 700',
					tier: 'hard_gate',
					logic: { '>=': [{ var: 'allApplicantDetails.0.creditScore' }, 700] },
					fail_message: 'CIBIL too low',
					fail_category: 'cibil_threshold',
					confidence: 0.95,
					source_excerpt: 'Min CIBIL: 700'
				}
			],
			foir: [
				{
					rule_id: 'foir-cap',
					description: 'FOIR 55%',
					tier: 'computed',
					logic: { if: [{ '!!': [true] }, 0.55, null] },
					confidence: 0.9,
					source_excerpt: 'FOIR: 55%'
				}
			],
			income_assessment: [
				{
					rule_id: 'inc-salaried',
					income_profile_type: 'salaried_regular',
					accepted: true,
					haircut_percent: 0,
					computation_method: 'net_salary',
					confidence: 0.95,
					source_excerpt: 'Salaried: 100%'
				}
			] as ParsedIncomeRule[],
			ltv: ltvRules,
			obligation_treatment: [
				{
					rule_id: 'obl-term',
					obligation_type: 'term_loan',
					treatment: { count_factor: 1.0, ignore_if_closing: true },
					confidence: 0.95,
					source_excerpt: 'Term: 100%'
				}
			] as ParsedObligationRule[],
			property: null,
			transaction: null,
			tenure: [
				{
					rule_id: 'tenure-max',
					description: 'Max tenure 25y',
					tier: 'parameter',
					logic: { '!!': [true] },
					parameter_key: 'max_tenure_months',
					parameter_value: 300,
					confidence: 0.95,
					source_excerpt: 'Max tenure: 25y'
				},
				{
					rule_id: 'age-maturity',
					description: 'Max age at maturity 70',
					tier: 'parameter',
					logic: { '!!': [true] },
					parameter_key: 'max_age_at_maturity',
					parameter_value: 70,
					confidence: 0.95,
					source_excerpt: 'Maturity age: 70'
				}
			],
			roi: [
				{
					rule_id: 'roi-standard',
					description: 'ROI 9.0%',
					tier: 'parameter',
					logic: { '!!': [true] },
					parameter_key: 'roi',
					parameter_value: 9.0,
					confidence: 0.9,
					source_excerpt: 'ROI: 9.0%'
				}
			],
			fees: null,
			disbursement: null,
			documentation: null,
			nri: null,
			geo: null,
			discomforts: null,
			company: null,
			balance_transfer: null,
			top_up: null
		} as unknown as ParsedLenderRuleDocument['sections'],
		deviations: [],
		policies: []
	} as unknown as ParsedLenderRuleDocument;
}

describe('Plot & Equity Loan 3-cap engine — gold-standard lock (ADR-0021)', () => {
	describe('(A) Spec §3 worked example — ₹1Cr market / ₹20L registry / 70-90-40', () => {
		const payload = buildPayload();
		const ruleDoc = buildRuleDoc({
			overallSanctionLtv: 70,
			sellerDisbursementCap: 90,
			lapOnPlotCap: 40
		});
		const ev = evaluateLender(payload, ruleDoc);

		it('sanction headline = ₹70L (70% × ₹1Cr)', () => {
			expect(ev.plot_equity_sanction_headline).toBe(7_000_000);
		});

		it('seller disbursement = ₹18L (min of 90%×₹20L=₹18L, ₹70L sanction)', () => {
			expect(ev.plot_equity_seller_disbursement).toBe(1_800_000);
		});

		it('buyer cash component = ₹40L (min of 40%×₹1Cr=₹40L, ₹70L−₹18L=₹52L)', () => {
			expect(ev.plot_equity_buyer_cash_component).toBe(4_000_000);
		});

		it('buyer net out-of-pocket = ₹42L ((₹20L−₹18L) + (₹1Cr−₹20L) − ₹40L)', () => {
			expect(ev.plot_equity_buyer_net_out_of_pocket).toBe(4_200_000);
		});

		it('totals: sellerPortion + buyerCash = ₹58L disbursed (₹12L unused sanction)', () => {
			const seller = ev.plot_equity_seller_disbursement ?? 0;
			const buyer = ev.plot_equity_buyer_cash_component ?? 0;
			const sanction = ev.plot_equity_sanction_headline ?? 0;
			expect(seller + buyer).toBe(5_800_000);
			expect(sanction - (seller + buyer)).toBe(1_200_000);
		});

		// Market + registry input echoes — drive the UI's buyer-margin-on-registered
		// sub-note. Engine populates them only when the 3-cap branch actually fires.
		it('echoes marketValue input alongside outputs (UI sub-note input)', () => {
			expect(ev.plot_equity_market_value).toBe(ONE_CRORE);
		});

		it('echoes registryValue input alongside outputs (UI sub-note input)', () => {
			expect(ev.plot_equity_registry_value).toBe(TWENTY_LAKH);
		});

		it('buyer-margin-on-registered (registry − seller) = ₹2L (₹20L − ₹18L)', () => {
			// Derived in UI; verified here for arithmetic sanity at the engine layer.
			const registry = ev.plot_equity_registry_value ?? 0;
			const seller = ev.plot_equity_seller_disbursement ?? 0;
			expect(Math.max(0, registry - seller)).toBe(200_000);
		});
	});

	describe('(B) Owner variant — ₹1.4Cr market / ₹35L registry / 70-90-40', () => {
		const payload = buildPayload({
			marketValue: ONE_POINT_FOUR_CRORE,
			registryValue: THIRTY_FIVE_LAKH,
			propertyCost: ONE_POINT_FOUR_CRORE
		});
		const ruleDoc = buildRuleDoc({
			overallSanctionLtv: 70,
			sellerDisbursementCap: 90,
			lapOnPlotCap: 40
		});
		const ev = evaluateLender(payload, ruleDoc);

		it('sanction headline = ₹98L (70% × ₹1.4Cr)', () => {
			expect(ev.plot_equity_sanction_headline).toBe(9_800_000);
		});

		it('seller disbursement = ₹31.5L (min of 90%×₹35L=₹31.5L, ₹98L sanction)', () => {
			expect(ev.plot_equity_seller_disbursement).toBe(3_150_000);
		});

		it('buyer cash component = ₹56L (min of 40%×₹1.4Cr=₹56L, ₹98L−₹31.5L=₹66.5L)', () => {
			expect(ev.plot_equity_buyer_cash_component).toBe(5_600_000);
		});

		it('buyer net out-of-pocket = ₹52L ((₹35L−₹31.5L) + (₹1.4Cr−₹35L) − ₹56L)', () => {
			// = 350,000 + 10,500,000 − 5,600,000 = 5,250,000
			expect(ev.plot_equity_buyer_net_out_of_pocket).toBe(5_250_000);
		});
	});

	describe('Negative — variant gating', () => {
		const ruleDoc = buildRuleDoc({
			overallSanctionLtv: 70,
			sellerDisbursementCap: 90,
			lapOnPlotCap: 40
		});

		for (const variant of [
			'Plot Loan Only',
			'Plot & Construction Loan',
			'Construction Loan Only'
		]) {
			it(`does NOT populate for variant: ${variant}`, () => {
				const payload = buildPayload({ loanVariant: variant });
				const ev = evaluateLender(payload, ruleDoc);
				expect(ev.plot_equity_sanction_headline).toBeUndefined();
				expect(ev.plot_equity_seller_disbursement).toBeUndefined();
				expect(ev.plot_equity_buyer_cash_component).toBeUndefined();
				expect(ev.plot_equity_buyer_net_out_of_pocket).toBeUndefined();
				expect(ev.plot_equity_market_value).toBeUndefined();
				expect(ev.plot_equity_registry_value).toBeUndefined();
			});
		}
	});

	describe('Negative — Home Loan + LAP unaffected', () => {
		it('Home Loan with marketValue + registryValue + 3 caps in rule doc: no 4-fields', () => {
			const ruleDoc = buildRuleDoc({
				overallSanctionLtv: 70,
				sellerDisbursementCap: 90,
				lapOnPlotCap: 40,
				loanTypes: ['Home Loan']
			});
			const payload = buildPayload({
				loanName: 'Home Loan',
				loanVariant: undefined
			});
			const ev = evaluateLender(payload, ruleDoc);
			expect(ev.plot_equity_sanction_headline).toBeUndefined();
			expect(ev.plot_equity_seller_disbursement).toBeUndefined();
			expect(ev.plot_equity_buyer_cash_component).toBeUndefined();
			expect(ev.plot_equity_buyer_net_out_of_pocket).toBeUndefined();
		});

		it('LAP: no 4-fields', () => {
			const ruleDoc = buildRuleDoc({
				overallSanctionLtv: 70,
				sellerDisbursementCap: 90,
				lapOnPlotCap: 40,
				loanTypes: ['Loan Against Property']
			});
			const payload = buildPayload({
				loanName: 'Loan Against Property',
				loanVariant: undefined
			});
			const ev = evaluateLender(payload, ruleDoc);
			expect(ev.plot_equity_sanction_headline).toBeUndefined();
			expect(ev.plot_equity_seller_disbursement).toBeUndefined();
			expect(ev.plot_equity_buyer_cash_component).toBeUndefined();
			expect(ev.plot_equity_buyer_net_out_of_pocket).toBeUndefined();
		});
	});

	describe('Negative — missing inputs gracefully skip', () => {
		it('missing marketValue: no fields, no crash', () => {
			const ruleDoc = buildRuleDoc({
				overallSanctionLtv: 70,
				sellerDisbursementCap: 90,
				lapOnPlotCap: 40
			});
			const payload = buildPayload({ marketValue: undefined });
			const ev = evaluateLender(payload, ruleDoc);
			expect(ev.plot_equity_sanction_headline).toBeUndefined();
		});

		it('missing registryValue: no fields, no crash', () => {
			const ruleDoc = buildRuleDoc({
				overallSanctionLtv: 70,
				sellerDisbursementCap: 90,
				lapOnPlotCap: 40
			});
			const payload = buildPayload({ registryValue: undefined });
			const ev = evaluateLender(payload, ruleDoc);
			expect(ev.plot_equity_sanction_headline).toBeUndefined();
		});

		it('lender missing Y%: no fields populated', () => {
			const ruleDoc = buildRuleDoc({
				overallSanctionLtv: 70,
				// sellerDisbursementCap missing
				lapOnPlotCap: 40
			});
			const payload = buildPayload();
			const ev = evaluateLender(payload, ruleDoc);
			expect(ev.plot_equity_sanction_headline).toBeUndefined();
			expect(ev.plot_equity_seller_disbursement).toBeUndefined();
			expect(ev.plot_equity_buyer_cash_component).toBeUndefined();
		});

		it('lender missing X%: no fields populated', () => {
			const ruleDoc = buildRuleDoc({
				// overallSanctionLtv missing
				sellerDisbursementCap: 90,
				lapOnPlotCap: 40
			});
			const payload = buildPayload();
			const ev = evaluateLender(payload, ruleDoc);
			expect(ev.plot_equity_sanction_headline).toBeUndefined();
		});

		it('lender missing Z%: no fields populated', () => {
			const ruleDoc = buildRuleDoc({
				overallSanctionLtv: 70,
				sellerDisbursementCap: 90
				// lapOnPlotCap missing
			});
			const payload = buildPayload();
			const ev = evaluateLender(payload, ruleDoc);
			expect(ev.plot_equity_buyer_cash_component).toBeUndefined();
		});
	});
});
