/**
 * Property-Not-Identified Traffic Light Tests
 * ══════════════════════════════════════════════════════════════════
 * When a secured loan has no identified property, this is the sanction-letter
 * view: there is no property cost, so the offered amount is the applicant's
 * income-based eligibility (FOIR-eligible amount), and Amount/EMI/ROI/Tenure
 * reflect that pre-approval. The traffic-light logic must judge eligibility on
 * income so income-eligible lenders are GREEN and the affordability overview
 * surfaces. The number of affordability scenario cards must follow the
 * sanctionType / withPersonalLoan answers. See evaluationEngine.ts (offered-
 * amount + traffic-light blocks) and the RE-7 affordability back-calculator.
 *
 * Strategy: mock LenderRuleArtifacts to return no DB rules, forcing the
 * engine onto the real static fallback rule docs (realBankRuleDocs.ts).
 * This is deterministic offline — no Atlas dependency.
 * ══════════════════════════════════════════════════════════════════
 */

import { describe, it, expect, vi } from 'vitest';

// Force the fallback rule docs: no active DB rules.
vi.mock('$lib/database/mongo.js', () => ({
	LenderRuleArtifacts: {
		find: () => ({ toArray: async () => [] }),
		countDocuments: async () => 1 // non-zero so autoSeedIfEmpty stays a no-op
	}
}));

vi.mock('$lib/server/logger.js', () => ({
	default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }
}));

import { evaluatePayload } from '$lib/ruleEngine/evaluationEngine';
import type { LoanApplicationPayload } from '$lib/utils/payloadBuilder';

function homeLoanPayload(
	overrides: Partial<LoanApplicationPayload['loanTransaction']>
): LoanApplicationPayload {
	return {
		loanTransaction: {
			loanName: 'Home Loan',
			loanType: 'New Loan',
			loanAmount: 0,
			tenureYears: 20,
			numberOfApplicants: 1,
			propertyState: 'Maharashtra',
			propertyCity: 'Pune',
			downPayment: 2000000,
			...overrides
		},
		allApplicantDetails: [
			{
				applicantType: 'Individual',
				fullName: 'Afford Probe',
				age: 35,
				gender: 'Male',
				maritalStatus: 'Married',
				employmentType: 'Salaried(Private)',
				creditScore: 770,
				hasExistingObligations: false,
				incomeProfiles: ['salaried_regular'],
				incomeEntries: [
					{
						profileType: 'salaried_regular',
						entityName: 'Acme Corp',
						income: { grossMonthlySalary: 150000, netMonthlySalary: 123000 },
						evidence: { itrFiled: true, hasDocumentaryEvidence: true }
					}
				]
			}
		]
	} as unknown as LoanApplicationPayload;
}

describe('property-not-identified traffic light', () => {
	it('income-eligible lenders are GREEN (not red) when property is not identified', async () => {
		const result = await evaluatePayload(homeLoanPayload({ propertyIdentified: false }));

		expect(result.results.length).toBeGreaterThan(0);

		const green = result.results.filter((r) => r.traffic_light === 'green');
		// A CIBIL-770, ₹1.5L/mo salaried applicant must be income-eligible somewhere.
		expect(green.length).toBeGreaterThan(0);

		// The green lenders must carry affordability so AffordabilityOverview renders.
		const greenWithAffordability = green.filter(
			(r) => r.affordability && r.affordability.eligibility
		);
		expect(greenWithAffordability.length).toBeGreaterThan(0);
		expect(greenWithAffordability[0].affordability!.eligibility!.maxPropertyCost).toBeGreaterThan(0);

		// Sanction-letter view: the offered Amount/EMI must reflect income-based
		// eligibility (not 0, and not a stale property-derived figure).
		const r = greenWithAffordability[0];
		expect(r.offered_amount).toBeGreaterThan(0);
		expect(r.offered_amount).toBe(r.eligible_amount);
		expect(r.emi).toBeGreaterThan(0);
	});

	it('does NOT turn lenders green merely because amount is 0 when property IS identified', async () => {
		// Property identified + 0 amount is a data error, not the affordability flow.
		// The exception must be scoped to propertyIdentified === false, so these stay red.
		const result = await evaluatePayload(
			homeLoanPayload({ propertyIdentified: true, loanAmount: 0 })
		);

		const green = result.results.filter((r) => r.traffic_light === 'green');
		expect(green.length).toBe(0);
	});
});

describe('property-not-identified affordability card gating (end-to-end)', () => {
	it('Based On Eligibility → only the eligibility scenario (1 card)', async () => {
		const result = await evaluatePayload(
			homeLoanPayload({ propertyIdentified: false, sanctionType: 'Based On Eligibility' })
		);
		const r = result.results.find((x) => x.affordability?.eligibility);
		expect(r).toBeDefined();
		expect(r!.affordability!.dpConstrained).toBeNull();
		expect(r!.affordability!.bridge).toBeNull();
	});

	it('Based on Downpayment without PL → eligibility + dpConstrained, no bridge (2 cards)', async () => {
		const result = await evaluatePayload(
			homeLoanPayload({
				propertyIdentified: false,
				sanctionType: 'Based on Downpayment',
				withPersonalLoan: 'No',
				downPayment: 2000000
			})
		);
		const r = result.results.find((x) => x.affordability?.eligibility);
		expect(r).toBeDefined();
		expect(r!.affordability!.dpConstrained).not.toBeNull();
		expect(r!.affordability!.bridge).toBeNull();
	});

	it('Based on Downpayment with PL=Yes → bridge is allowed to appear (3 cards)', async () => {
		const result = await evaluatePayload(
			homeLoanPayload({
				propertyIdentified: false,
				sanctionType: 'Based on Downpayment',
				withPersonalLoan: 'Yes',
				downPayment: 300000
			})
		);
		// With a small DP and strong income there is spare EMI capacity, so at least
		// one green lender should surface the PL bridge once the user opts in.
		const withBridge = result.results.filter((x) => x.affordability?.bridge);
		expect(withBridge.length).toBeGreaterThan(0);
	});
});
