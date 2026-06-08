import { describe, it, expect } from 'vitest';
import {
	generateAllProfiles,
	EXPECTED_TOTAL
} from '$lib/testing/generators/syntheticGenerator.js';

describe('syntheticGenerator', () => {
	const profiles = generateAllProfiles();

	it('produces expected number of profiles', () => {
		expect(profiles.length).toBe(EXPECTED_TOTAL);
	});

	it('EXPECTED_TOTAL is in valid range (280-350)', () => {
		expect(EXPECTED_TOTAL).toBeGreaterThanOrEqual(280);
		expect(EXPECTED_TOTAL).toBeLessThanOrEqual(350);
	});

	it('is deterministic — same seed produces identical output', () => {
		const profiles2 = generateAllProfiles();
		expect(JSON.stringify(profiles)).toBe(JSON.stringify(profiles2));
	});

	it('all 6 loan types represented with minimum 20 profiles each', () => {
		const byLoan: Record<string, number> = {};
		for (const p of profiles) {
			byLoan[p.loan_type] = (byLoan[p.loan_type] || 0) + 1;
		}
		expect(byLoan['Home Loan']).toBeGreaterThanOrEqual(20);
		expect(byLoan['Loan Against Property']).toBeGreaterThanOrEqual(20);
		expect(byLoan['Plot Loan']).toBeGreaterThanOrEqual(20);
		expect(byLoan['Personal Loan']).toBeGreaterThanOrEqual(20);
		expect(byLoan['Business Loan']).toBeGreaterThanOrEqual(20);
		expect(byLoan['Professional Loan']).toBeGreaterThanOrEqual(20);
	});

	it('has unique profile IDs', () => {
		const ids = profiles.map((p) => p.profile_id);
		const unique = new Set(ids);
		expect(unique.size).toBe(ids.length);
	});

	it('all profiles have valid payload structure', () => {
		for (const p of profiles) {
			expect(p.payload).toBeDefined();
			expect(p.payload.loanTransaction).toBeDefined();
			expect(p.payload.loanTransaction.loanName).toBeTruthy();
			expect(p.payload.loanTransaction.loanAmount).toBeGreaterThan(0);
			expect(p.payload.allApplicantDetails.length).toBeGreaterThanOrEqual(1);

			const primary = p.payload.allApplicantDetails[0];
			expect(primary.employmentType).toBeTruthy();
			expect(primary.creditScore).toBeGreaterThanOrEqual(0);
		}
	});

	it('boundary CIBIL profiles hit exact values', () => {
		// The variation generator adds cibil-boundary-N tags only when the primary
		// applicant's creditScore is exactly N. Journey variation 0 preserves the
		// original journey creditScore — several journeys use exact boundary values
		// (EDGE_CIBIL_580 → 580, EDGE_CIBIL_650 → 650, EDGE_PROF_LAWYER_DC → 700,
		// HL_NEW_SE_PRO → 750, HL_NEW_PENS → 800).
		const cibilTags = [
			'cibil-boundary-580',
			'cibil-boundary-650',
			'cibil-boundary-700',
			'cibil-boundary-750',
			'cibil-boundary-800'
		];
		for (const tag of cibilTags) {
			const matching = profiles.filter((p) => p.metadata.tags.includes(tag));
			expect(matching.length).toBeGreaterThan(0);
			const value = parseInt(tag.split('-').pop()!);
			for (const p of matching) {
				expect(p.payload.allApplicantDetails[0].creditScore).toBe(value);
			}
		}
	});

	it('NRI profiles present', () => {
		const nri = profiles.filter((p) => p.metadata.tags.includes('nri'));
		expect(nri.length).toBeGreaterThan(0);
		for (const p of nri) {
			expect(p.payload.allApplicantDetails[0].isNRI).toBe(true);
		}
	});

	it('company applicant profiles present', () => {
		const companies = profiles.filter((p) => p.metadata.tags.includes('company'));
		expect(companies.length).toBeGreaterThan(0);
		for (const p of companies) {
			expect(p.payload.allApplicantDetails[0].applicantType).toBe('Company');
			expect(p.payload.allApplicantDetails[0].companyName).toBeTruthy();
		}
	});

	it('multi-applicant profiles have correct count', () => {
		const multi = profiles.filter((p) => p.metadata.applicant_count >= 2);
		expect(multi.length).toBeGreaterThan(0);
		for (const p of multi) {
			expect(p.payload.allApplicantDetails.length).toBe(p.metadata.applicant_count);
		}
	});

	it('obligation values are strings', () => {
		const withObligations = profiles.filter((p) =>
			p.payload.allApplicantDetails.some((a) => a.obligations && a.obligations.length > 0)
		);
		expect(withObligations.length).toBeGreaterThan(0);
		for (const p of withObligations) {
			for (const a of p.payload.allApplicantDetails) {
				if (a.obligations) {
					for (const obl of a.obligations) {
						expect(typeof obl.emi).toBe('string');
						expect(typeof obl.tenure).toBe('string');
						// totalLimit is now only emitted for credit_line obligations
						// (CC / OD / Dropline OD). For term loans it should be absent.
						if (obl.obligationType === 'credit_line') {
							expect(typeof obl.totalLimit).toBe('string');
						} else {
							expect(obl.totalLimit).toBeUndefined();
						}
					}
				}
			}
		}
	});

	it('all boolean profile fields are explicitly set (not undefined)', () => {
		for (const p of profiles) {
			for (const a of p.payload.allApplicantDetails) {
				if (a.salariedProfile) {
					expect(a.salariedProfile.worksForReputedOrg).not.toBeUndefined();
					expect(a.salariedProfile.salaryInBankAccount).not.toBeUndefined();
					expect(a.salariedProfile.hasHigherEducation).not.toBeUndefined();
				}
				if (a.businessProfile) {
					expect(a.businessProfile.gstRegistered).not.toBeUndefined();
					expect(a.businessProfile.seasonalBusiness).not.toBeUndefined();
					expect(a.businessProfile.hasProfessionalLicense).not.toBeUndefined();
				}
				if (a.governmentProfile) {
					expect(a.governmentProfile.isCentralGovt).not.toBeUndefined();
					expect(a.governmentProfile.filesITR).not.toBeUndefined();
				}
				if (a.pensionProfile) {
					expect(a.pensionProfile.pensionInBankAccount).not.toBeUndefined();
					expect(a.pensionProfile.verificationPossible).not.toBeUndefined();
				}
			}
		}
	});
});
