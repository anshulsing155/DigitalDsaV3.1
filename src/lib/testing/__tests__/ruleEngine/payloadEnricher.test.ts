/**
 * Payload Enricher Tests
 *
 * Validates that enrichPayload() correctly computes derived fields
 * from loan application payloads.
 */

import { describe, it, expect } from 'vitest';
import { enrichPayload, type ComputedFields } from '$lib/ruleEngine/payloadEnricher.js';
import type {
	LoanApplicationPayload,
	ApplicantPayload,
	CleanIncomeEntry
} from '$lib/utils/payloadBuilder.js';

// ============================================================================
// TEST HELPERS
// ============================================================================

function makeEntry(
	profileType: string,
	income: Record<string, unknown>,
	evidence?: Partial<CleanIncomeEntry['evidence']>
): CleanIncomeEntry {
	return {
		profileType,
		entityName: `Test ${profileType}`,
		income,
		evidence: {
			itrFiled: true,
			hasDocumentaryEvidence: true,
			...evidence
		}
	};
}

function makeApplicant(overrides: Partial<ApplicantPayload> = {}): ApplicantPayload {
	return {
		applicantType: 'Individual',
		fullName: 'Test Person',
		age: 35,
		gender: 'Male',
		maritalStatus: 'Married',
		employmentType: 'Salaried(Private)',
		creditScore: 750,
		hasExistingObligations: false,
		...overrides
	};
}

function makePayload(applicants: ApplicantPayload[]): LoanApplicationPayload {
	return {
		loanTransaction: {
			loanName: 'Home Loan',
			loanType: 'New Loan',
			numberOfApplicants: applicants.length,
			loanAmount: 5000000,
			tenureYears: 20
		},
		allApplicantDetails: applicants
	};
}

// ============================================================================
// TESTS
// ============================================================================

describe('enrichPayload — computed field accuracy', () => {
	it('computes _total_gross_monthly from salaried incomeEntries', () => {
		const applicant = makeApplicant({
			incomeEntries: [
				makeEntry('salaried_regular', { grossMonthlySalary: 80000, netMonthlySalary: 65000 })
			]
		});
		const enriched = enrichPayload(makePayload([applicant]));
		expect(enriched._computed._total_gross_monthly).toBe(80000);
	});

	it('business_proprietorship: averages first two filed ITRs / 12 (owner policy 2026-05-29)', () => {
		// Per owner policy: monthly income = average of LAST TWO FILED ITRs
		// (positions 0 and 1, where position 0 is the most recent year).
		// 3rd year is collected for trend/vintage signal only.
		// Expected: (1800000 + 1500000) / 2 / 12 = 137500.
		const applicant = makeApplicant({
			employmentType: 'Self-employed(Other)',
			incomeEntries: [
				makeEntry('business_proprietorship', {
					financialsTable: {
						itrFiled: [true, true, true],
						netProfitArray: [1800000, 1500000, 1200000],
						depreciationArray: [70000, 60000, 50000],
						turnOverArray: [7000000, 6000000, 5000000],
						grossReceipts: [7000000, 6000000, 5000000]
					}
				})
			]
		});
		const enriched = enrichPayload(makePayload([applicant]));
		expect(enriched._computed._total_gross_monthly).toBe(137500);
	});

	it('professional_practice: averages first two filed ITRs / 12 (bug report payload)', () => {
		// Reproduces the team bug report payload exactly: doctor with 3 filed
		// years + current-FY-in-progress cell empty.
		// Expected: (3500000 + 3400000) / 2 / 12 = 287500.
		const applicant = makeApplicant({
			employmentType: 'Self-employed(Professional)',
			incomeEntries: [
				makeEntry('professional_practice', {
					financialsTable: {
						itrFiled: [true, true, true, true],
						netProfitArray: [3500000, 3400000, 3000000, ''],
						depreciationArray: [300000, 300000, 300000, ''],
						grossReceipts: [3800000, 3700000, 3300000, ''],
						currentFYTurnover: ''
					}
				})
			]
		});
		const enriched = enrichPayload(makePayload([applicant]));
		expect(enriched._computed._total_gross_monthly).toBe(287500);
	});

	it('multi-year profile: itrFiled[0]=false (April–Sept case) shifts the window to positions 1 & 2', () => {
		// Case the owner flagged: until Sept, most non-audit-required individuals
		// have NOT filed their FY-just-ended ITR. So itrFiled[0]=false and the
		// engine must roll to positions 1 + 2 (last two ACTUALLY filed years).
		// Expected: (3500000 + 3400000) / 2 / 12 = 287500 — same as if position 0
		// had been the filed year. Operator should not be penalized for the
		// timing gap.
		const applicant = makeApplicant({
			employmentType: 'Self-employed(Professional)',
			incomeEntries: [
				makeEntry('professional_practice', {
					financialsTable: {
						itrFiled: [false, true, true, true],
						netProfitArray: ['', 3500000, 3400000, 3000000]
					}
				})
			]
		});
		const enriched = enrichPayload(makePayload([applicant]));
		expect(enriched._computed._total_gross_monthly).toBe(287500);
	});

	it('multi-year profile: only one filed ITR available raises limited_vintage signal', () => {
		// New business / new professional with only 1 filed ITR. Income uses
		// that single year; the signal carries limited_vintage so lender rules
		// can decide acceptance (some require ≥2 filed ITRs).
		const applicant = makeApplicant({
			employmentType: 'Self-employed(Professional)',
			incomeEntries: [
				makeEntry('professional_practice', {
					financialsTable: {
						itrFiled: [false, true, false, false],
						netProfitArray: ['', 2400000, '', '']
					}
				})
			]
		});
		const enriched = enrichPayload(makePayload([applicant]));
		// 2400000 / 12 = 200000
		expect(enriched._computed._total_gross_monthly).toBe(200000);
		const sig = enriched._computed._income_signals[0];
		expect(sig.limited_vintage).toBe(true);
		expect(sig.trend).toBeUndefined();
	});

	it('multi-year profile: loss year participates in average, negative result clamps to 0', () => {
		// Two consecutive loss years (most recent + year before) — net average
		// is negative. Clamps to 0 to avoid downstream FOIR / EMI math weirdness.
		const applicant = makeApplicant({
			employmentType: 'Self-employed(Other)',
			incomeEntries: [
				makeEntry('business_proprietorship', {
					financialsTable: {
						itrFiled: [true, true, true],
						netProfitArray: [-500000, -300000, 800000]
					}
				})
			]
		});
		const enriched = enrichPayload(makePayload([applicant]));
		expect(enriched._computed._total_gross_monthly).toBe(0);
	});

	it('multi-year profile: trend = growing when avg YoY > +5%', () => {
		// Doctor case from bug report: 30L → 34L → 35L. YoY changes:
		// (35-34)/34 = +2.9%, (34-30)/30 = +13.3%. Avg = +8.1% → growing.
		const applicant = makeApplicant({
			employmentType: 'Self-employed(Professional)',
			incomeEntries: [
				makeEntry('professional_practice', {
					financialsTable: {
						itrFiled: [true, true, true],
						netProfitArray: [3500000, 3400000, 3000000]
					}
				})
			]
		});
		const enriched = enrichPayload(makePayload([applicant]));
		expect(enriched._computed._income_signals[0].trend).toBe('growing');
	});

	it('multi-year profile: trend = declining when avg YoY < -5%', () => {
		const applicant = makeApplicant({
			employmentType: 'Self-employed(Other)',
			incomeEntries: [
				makeEntry('business_proprietorship', {
					financialsTable: {
						itrFiled: [true, true, true],
						netProfitArray: [1500000, 1900000, 2400000]
					}
				})
			]
		});
		const enriched = enrichPayload(makePayload([applicant]));
		expect(enriched._computed._income_signals[0].trend).toBe('declining');
	});

	it('multi-year profile: trend = flat when avg YoY is within ±5%', () => {
		const applicant = makeApplicant({
			employmentType: 'Self-employed(Other)',
			incomeEntries: [
				makeEntry('business_proprietorship', {
					financialsTable: {
						itrFiled: [true, true, true],
						netProfitArray: [1500000, 1480000, 1460000]
					}
				})
			]
		});
		const enriched = enrichPayload(makePayload([applicant]));
		expect(enriched._computed._income_signals[0].trend).toBe('flat');
	});

	it('director_company foreign salaried: uses NET salary in monthly income', () => {
		// Foreign-company director — only the salaried-path keys (gross + net
		// monthly salary). Engine uses NET (post-foreign-tax, credited-in-India)
		// as the income figure; gross is exposed separately for lenders that
		// want to apply their own haircut.
		const applicant = makeApplicant({
			employmentType: 'Self-employed(Other)',
			incomeEntries: [
				makeEntry('director_company', {
					grossMonthlySalary: 250000,
					netMonthlySalary: 180000
				})
			]
		});
		const enriched = enrichPayload(makePayload([applicant]));
		expect(enriched._computed._total_gross_monthly).toBe(180000);
		const sig = enriched._computed._income_signals[0];
		expect(sig.is_foreign_salaried).toBe(true);
		expect(sig.monthly_income).toBe(180000);
		expect(sig.gross_monthly).toBe(250000);
	});

	it('business_partnership foreign salaried: same NET-preferred treatment', () => {
		const applicant = makeApplicant({
			employmentType: 'Self-employed(Other)',
			incomeEntries: [
				makeEntry('business_partnership', {
					grossMonthlySalary: 200000,
					netMonthlySalary: 150000
				})
			]
		});
		const enriched = enrichPayload(makePayload([applicant]));
		expect(enriched._computed._total_gross_monthly).toBe(150000);
		const sig = enriched._computed._income_signals[0];
		expect(sig.is_foreign_salaried).toBe(true);
	});

	it('director_company foreign salaried: net missing → falls back to gross', () => {
		// Older data where net wasn't captured. Use gross as the income figure
		// and still flag the entry as foreign for downstream lender rules.
		const applicant = makeApplicant({
			employmentType: 'Self-employed(Other)',
			incomeEntries: [
				makeEntry('director_company', {
					grossMonthlySalary: 250000
				})
			]
		});
		const enriched = enrichPayload(makePayload([applicant]));
		expect(enriched._computed._total_gross_monthly).toBe(250000);
		expect(enriched._computed._income_signals[0].is_foreign_salaried).toBe(true);
	});

	it('foreign salaried totals: sums net + gross across multiple foreign entries', () => {
		// Two foreign-salaried entries on the primary applicant. Totals reflect
		// the sum of each. `_total_gross_monthly` uses the NET (income figure),
		// `_total_foreign_salaried_monthly_gross` exposes the gross sum.
		const applicant = makeApplicant({
			employmentType: 'Self-employed(Other)',
			incomeEntries: [
				makeEntry('director_company', {
					grossMonthlySalary: 250000,
					netMonthlySalary: 180000
				}),
				makeEntry('business_partnership', {
					grossMonthlySalary: 200000,
					netMonthlySalary: 150000
				})
			]
		});
		const enriched = enrichPayload(makePayload([applicant]));
		expect(enriched._computed._total_gross_monthly).toBe(330000); // 180000 + 150000
		expect(enriched._computed._total_foreign_salaried_monthly_net).toBe(330000);
		expect(enriched._computed._total_foreign_salaried_monthly_gross).toBe(450000);
	});

	it('domestic director (standard path): NOT flagged as foreign salaried', () => {
		// Standard-path director (registered Indian company) with drawsSalary +
		// monthlySalaryAmount populated. Must NOT be flagged as foreign.
		const applicant = makeApplicant({
			employmentType: 'Self-employed(Other)',
			incomeEntries: [
				makeEntry('director_company', {
					drawsSalary: true,
					monthlySalaryAmount: 120000,
					receivesProfit: false
				})
			]
		});
		const enriched = enrichPayload(makePayload([applicant]));
		expect(enriched._computed._total_gross_monthly).toBe(120000);
		const sig = enriched._computed._income_signals[0];
		expect(sig.is_foreign_salaried).toBeUndefined();
		expect(enriched._computed._total_foreign_salaried_monthly_net).toBe(0);
	});

	it('computes _total_gross_monthly from pension incomeEntries', () => {
		const applicant = makeApplicant({
			employmentType: 'Pensioner',
			incomeEntries: [makeEntry('pension', { monthlyPensionAmount: 45000 })]
		});
		const enriched = enrichPayload(makePayload([applicant]));
		expect(enriched._computed._total_gross_monthly).toBe(45000);
	});

	it('sums multiple income sources in single applicant', () => {
		const applicant = makeApplicant({
			incomeEntries: [
				makeEntry('salaried_regular', { grossMonthlySalary: 80000, netMonthlySalary: 65000 }),
				makeEntry('rental_income', { monthlyRentAmount: 20000 })
			]
		});
		const enriched = enrichPayload(makePayload([applicant]));
		expect(enriched._computed._total_gross_monthly).toBe(100000);
	});

	it('sums across multiple applicants', () => {
		const primary = makeApplicant({
			incomeEntries: [
				makeEntry('salaried_regular', { grossMonthlySalary: 80000, netMonthlySalary: 65000 })
			],
			creditScore: 780
		});
		const coApplicant = makeApplicant({
			incomeEntries: [
				makeEntry('salaried_regular', { grossMonthlySalary: 50000, netMonthlySalary: 42000 })
			],
			creditScore: 720
		});
		const enriched = enrichPayload(makePayload([primary, coApplicant]));
		expect(enriched._computed._total_gross_monthly).toBe(130000);
	});

	it('falls back to flat fields when incomeEntries absent', () => {
		const applicant = makeApplicant({
			grossIncome: 70000,
			netIncome: 60000
		});
		const enriched = enrichPayload(makePayload([applicant]));
		expect(enriched._computed._total_gross_monthly).toBe(60000);
	});

	it('handles director_company income with salary + profit', () => {
		const applicant = makeApplicant({
			employmentType: 'Self-employed(Other)',
			incomeEntries: [
				makeEntry('director_company', {
					drawsSalary: true,
					monthlySalaryAmount: 100000,
					receivesProfit: true,
					profitFrequency: 'quarterly',
					averageProfitPerWithdrawal: 300000
				})
			]
		});
		const enriched = enrichPayload(makePayload([applicant]));
		// salary: 100000, profit: (300000 * 4) / 12 = 100000 => total = 200000
		expect(enriched._computed._total_gross_monthly).toBe(200000);
	});

	it('handles agriculture and investment annual income', () => {
		const applicant = makeApplicant({
			employmentType: 'Self-employed(Other)',
			incomeEntries: [
				makeEntry('business_proprietorship', {
					financialsTable: {
						netProfitArray: [600000],
						depreciationArray: [20000],
						turnOverArray: [2000000],
						grossReceipts: [2000000]
					}
				}),
				makeEntry('agriculture_income', { averageAnnualAgricultureIncome: 240000 }),
				makeEntry('investment_income', { averageAnnualInvestmentIncome: 120000 })
			]
		});
		const enriched = enrichPayload(makePayload([applicant]));
		// biz: 600000/1/12 = 50000, agr: 240000/12 = 20000, inv: 120000/12 = 10000
		expect(enriched._computed._total_gross_monthly).toBe(80000);
	});
});

describe('enrichPayload — obligation computation', () => {
	it('computes _total_obligations_monthly from term loan EMIs', () => {
		const applicant = makeApplicant({
			hasExistingObligations: true,
			obligations: [
				{
					id: 'o1',
					obligationType: 'term_loan',
					loanType: 'Car Loan',
					bankName: 'HDFC',
					selectedToClose: 'Keep running',
					emi: '15000',
					totalLimit: '0',
					tenure: '60',
					interestRate: '9'
				},
				{
					id: 'o2',
					obligationType: 'term_loan',
					loanType: 'Personal Loan',
					bankName: 'ICICI',
					selectedToClose: 'Keep running',
					emi: '8000',
					totalLimit: '0',
					tenure: '36',
					interestRate: '12'
				}
			]
		});
		const enriched = enrichPayload(makePayload([applicant]));
		expect(enriched._computed._total_obligations_monthly).toBe(23000);
	});

	it('computes credit line burden as 5% of limit', () => {
		const applicant = makeApplicant({
			hasExistingObligations: true,
			obligations: [
				{
					id: 'o1',
					obligationType: 'credit_line',
					loanType: 'Credit Card',
					bankName: 'HDFC',
					selectedToClose: 'Keep running',
					emi: '0',
					totalLimit: '200000',
					tenure: '0',
					interestRate: '0'
				}
			]
		});
		const enriched = enrichPayload(makePayload([applicant]));
		expect(enriched._computed._total_obligations_monthly).toBe(10000);
	});
});

describe('enrichPayload — applicant metadata', () => {
	it('counts applicants correctly', () => {
		const p = makeApplicant({ creditScore: 780 });
		const c = makeApplicant({ creditScore: 720 });
		const enriched = enrichPayload(makePayload([p, c]));
		expect(enriched._computed._applicant_count).toBe(2);
		expect(enriched._computed._has_co_applicant).toBe(true);
	});

	it('single applicant has no co-applicant', () => {
		const enriched = enrichPayload(makePayload([makeApplicant()]));
		expect(enriched._computed._applicant_count).toBe(1);
		expect(enriched._computed._has_co_applicant).toBe(false);
	});

	it('primary age from first applicant', () => {
		const enriched = enrichPayload(makePayload([makeApplicant({ age: 42 })]));
		expect(enriched._computed._primary_age).toBe(42);
	});

	it('primary employment from first applicant', () => {
		const enriched = enrichPayload(makePayload([makeApplicant({ employmentType: 'Pensioner' })]));
		expect(enriched._computed._primary_employment).toBe('Pensioner');
	});
});

describe('enrichPayload — CIBIL aggregation', () => {
	it('max and min CIBIL across applicants', () => {
		const p = makeApplicant({ creditScore: 780 });
		const c = makeApplicant({ creditScore: 720 });
		const enriched = enrichPayload(makePayload([p, c]));
		expect(enriched._computed._max_cibil).toBe(780);
		expect(enriched._computed._min_cibil).toBe(720);
	});

	it('single applicant — max equals min', () => {
		const enriched = enrichPayload(makePayload([makeApplicant({ creditScore: 750 })]));
		expect(enriched._computed._max_cibil).toBe(750);
		expect(enriched._computed._min_cibil).toBe(750);
	});
});

describe('enrichPayload — business/salaried file detection', () => {
	it('detects business file when any applicant is self-employed', () => {
		const salaried = makeApplicant({ employmentType: 'Salaried(Private)' });
		const biz = makeApplicant({ employmentType: 'Self-employed(Other)' });
		const enriched = enrichPayload(makePayload([salaried, biz]));
		expect(enriched._computed._is_business_file).toBe(true);
		expect(enriched._computed._is_salaried_file).toBe(true); // primary is salaried
	});

	it('detects pure salaried file', () => {
		const enriched = enrichPayload(
			makePayload([makeApplicant({ employmentType: 'Salaried(Private)' })])
		);
		expect(enriched._computed._is_salaried_file).toBe(true);
		expect(enriched._computed._is_business_file).toBe(false);
	});

	it('detects professional as business file', () => {
		const enriched = enrichPayload(
			makePayload([makeApplicant({ employmentType: 'Self-employed(Professional)' })])
		);
		expect(enriched._computed._is_business_file).toBe(true);
		expect(enriched._computed._is_salaried_file).toBe(false);
	});
});

describe('enrichPayload — vintage and income source tracking', () => {
	it('extracts max vintage years across all entries', () => {
		const applicant = makeApplicant({
			incomeEntries: [
				makeEntry('salaried_regular', { grossMonthlySalary: 80000 }, { vintageYears: undefined }),
				makeEntry('rental_income', { monthlyRentAmount: 20000 }, { vintageYears: 5 })
			]
		});
		const enriched = enrichPayload(makePayload([applicant]));
		expect(enriched._computed._total_vintage_years).toBe(5);
	});

	it('counts income sources across all applicants', () => {
		const p = makeApplicant({
			incomeEntries: [
				makeEntry('salaried_regular', { grossMonthlySalary: 80000 }),
				makeEntry('rental_income', { monthlyRentAmount: 20000 })
			]
		});
		const c = makeApplicant({
			incomeEntries: [makeEntry('salaried_regular', { grossMonthlySalary: 50000 })]
		});
		const enriched = enrichPayload(makePayload([p, c]));
		expect(enriched._computed._income_source_count).toBe(3);
	});

	it('collects unique income profile types', () => {
		const applicant = makeApplicant({
			incomeEntries: [
				makeEntry('salaried_regular', { grossMonthlySalary: 80000 }),
				makeEntry('rental_income', { monthlyRentAmount: 20000 }),
				makeEntry('freelance_consulting', { averageMonthlyFreelanceIncome: 15000 })
			]
		});
		const enriched = enrichPayload(makePayload([applicant]));
		expect(enriched._computed._income_profile_types).toContain('salaried_regular');
		expect(enriched._computed._income_profile_types).toContain('rental_income');
		expect(enriched._computed._income_profile_types).toContain('freelance_consulting');
		expect(enriched._computed._income_profile_types.length).toBe(3);
	});
});

describe('enrichPayload — empty/edge cases', () => {
	it('handles empty applicant array', () => {
		const payload: LoanApplicationPayload = {
			loanTransaction: {
				loanName: 'Home Loan',
				loanType: 'New Loan',
				numberOfApplicants: 0,
				loanAmount: 0,
				tenureYears: 0
			},
			allApplicantDetails: []
		};
		const enriched = enrichPayload(payload);
		expect(enriched._computed._applicant_count).toBe(0);
		expect(enriched._computed._total_gross_monthly).toBe(0);
		expect(enriched._computed._has_co_applicant).toBe(false);
		expect(enriched._computed._primary_age).toBe(0);
		expect(enriched._computed._primary_employment).toBe('unknown');
		expect(enriched._computed._max_cibil).toBe(0);
		expect(enriched._computed._min_cibil).toBe(0);
	});

	it('handles applicant with no income data at all', () => {
		const applicant = makeApplicant({
			employmentType: 'Unemployed'
		});
		const enriched = enrichPayload(makePayload([applicant]));
		expect(enriched._computed._total_gross_monthly).toBe(0);
		expect(enriched._computed._income_source_count).toBe(0);
	});

	it('preserves original payload fields', () => {
		const payload = makePayload([makeApplicant()]);
		const enriched = enrichPayload(payload);
		expect(enriched.loanTransaction.loanName).toBe('Home Loan');
		expect(enriched.allApplicantDetails.length).toBe(1);
	});
});

// ============================================================================
// BACKWARD COMPATIBILITY: legacy field derivations from merged form questions
// ============================================================================

describe('enrichPayload — backward compat derivations', () => {
	// These tests verify dynamically-derived fields that enrichPayload() adds
	// at runtime but aren't part of the static LoanTransactionPayload type.
	// We use `as any` to set source fields and read derived fields.

	it('derives isDefaulter + madeGuarantor from creditHistoryStatus on loanTransaction', () => {
		const payload = makePayload([makeApplicant()]);
		(payload.loanTransaction as any).creditHistoryStatus = 'defaulter';
		const enriched = enrichPayload(payload);
		const lt = enriched.loanTransaction as any;
		expect(lt.isDefaulter).toBe('Yes');
		expect(lt.madeGuarantor).toBe('No');
	});

	it('derives isDefaulter + madeGuarantor for "both" status', () => {
		const payload = makePayload([makeApplicant()]);
		(payload.loanTransaction as any).creditHistoryStatus = 'both';
		const enriched = enrichPayload(payload);
		const lt = enriched.loanTransaction as any;
		expect(lt.isDefaulter).toBe('Yes');
		expect(lt.madeGuarantor).toBe('Yes');
	});

	it('derives isDefaulter=No for clean credit history', () => {
		const payload = makePayload([makeApplicant()]);
		(payload.loanTransaction as any).creditHistoryStatus = 'clean';
		const enriched = enrichPayload(payload);
		const lt = enriched.loanTransaction as any;
		expect(lt.isDefaulter).toBe('No');
		expect(lt.madeGuarantor).toBe('No');
	});

	it('derives approvedByAuthority + asPerMap from propertyComplianceStatus', () => {
		const payload = makePayload([makeApplicant()]);
		(payload.loanTransaction as any).propertyComplianceStatus = 'fully_compliant';
		const enriched = enrichPayload(payload);
		const lt = enriched.loanTransaction as any;
		expect(lt.approvedByAuthority).toBe('Yes');
		expect(lt.asPerMap).toBe('Yes');
	});

	it('derives approvedByAuthority=No for not_authorized compliance', () => {
		const payload = makePayload([makeApplicant()]);
		(payload.loanTransaction as any).propertyComplianceStatus = 'not_authorized';
		const enriched = enrichPayload(payload);
		const lt = enriched.loanTransaction as any;
		expect(lt.approvedByAuthority).toBe('No');
		expect(lt.asPerMap).toBe('No');
	});

	it('derives payslips + Form16Available from incomeDocAvailable', () => {
		const payload = makePayload([makeApplicant()]);
		(payload.loanTransaction as any).incomeDocAvailable = 'both';
		const enriched = enrichPayload(payload);
		const lt = enriched.loanTransaction as any;
		expect(lt.payslips).toBe('Yes');
		expect(lt.Form16Available).toBe('Yes');
	});

	it('derives payslips=No for form16_only', () => {
		const payload = makePayload([makeApplicant()]);
		(payload.loanTransaction as any).incomeDocAvailable = 'form16_only';
		const enriched = enrichPayload(payload);
		const lt = enriched.loanTransaction as any;
		expect(lt.payslips).toBe('No');
		expect(lt.Form16Available).toBe('Yes');
	});
});

// ============================================================================
// APPLICANT EMI SHARE — enricher uses applicantEmiShare when present
// ============================================================================

describe('enrichPayload — applicantEmiShare in obligations', () => {
	it('uses applicantEmiShare for term loan in _total_obligations_monthly', () => {
		const applicant = makeApplicant({
			hasExistingObligations: true,
			obligations: [
				{
					id: 'obl-1',
					obligationType: 'term_loan',
					loanType: 'Home Loan',
					bankName: 'SBI',
					selectedToClose: 'Keep running',
					emi: '50000',
					totalLimit: '0',
					tenure: '180',
					interestRate: '8.5',
					borrowerCount: '2' // Server recomputes: 50000/2 = 25000
				} as any
			]
		});
		const enriched = enrichPayload(makePayload([applicant]));
		// Should use 25000 (equal split of 50000 between 2 borrowers)
		expect(enriched._computed._total_obligations_monthly).toBe(25000);
	});

	it('falls back to raw emi when applicantEmiShare is missing', () => {
		const applicant = makeApplicant({
			hasExistingObligations: true,
			obligations: [
				{
					id: 'obl-1',
					obligationType: 'term_loan',
					loanType: 'Personal Loan',
					bankName: 'HDFC',
					selectedToClose: 'Keep running',
					emi: '30000',
					totalLimit: '0',
					tenure: '36',
					interestRate: '12'
				}
			]
		});
		const enriched = enrichPayload(makePayload([applicant]));
		expect(enriched._computed._total_obligations_monthly).toBe(30000);
	});

	it('applicantEmiShare = 0 for guarantor results in 0 obligation', () => {
		const applicant = makeApplicant({
			hasExistingObligations: true,
			obligations: [
				{
					id: 'obl-1',
					obligationType: 'term_loan',
					loanType: 'Home Loan',
					bankName: 'ICICI',
					selectedToClose: 'Keep running',
					emi: '50000',
					totalLimit: '0',
					tenure: '240',
					interestRate: '9',
					role: 'Guarantor' // Server recomputes: Guarantor → 0
				} as any
			]
		});
		const enriched = enrichPayload(makePayload([applicant]));
		expect(enriched._computed._total_obligations_monthly).toBe(0);
	});

	it('credit line with applicantEmiShare applies ENRICHER factor to share', () => {
		const applicant = makeApplicant({
			hasExistingObligations: true,
			obligations: [
				{
					id: 'obl-1',
					obligationType: 'credit_line',
					loanType: 'CC Limit',
					bankName: 'Axis',
					selectedToClose: 'Keep running',
					emi: '0',
					totalLimit: '500000',
					tenure: '0',
					interestRate: '0',
					borrowerCount: '2' // Server recomputes: 500000/2 = 250000
				} as any
			]
		});
		const enriched = enrichPayload(makePayload([applicant]));
		// 250000 (split) * 0.05 (credit line factor) = 12500
		expect(enriched._computed._total_obligations_monthly).toBe(12500);
	});

	it('proof-overridden share used correctly in obligations total', () => {
		const applicant = makeApplicant({
			hasExistingObligations: true,
			obligations: [
				{
					id: 'obl-1',
					obligationType: 'term_loan',
					loanType: 'Home Loan',
					bankName: 'BOB',
					selectedToClose: 'Keep running',
					emi: '60000',
					totalLimit: '0',
					tenure: '120',
					interestRate: '8.5',
					borrowerCount: '2',
					hasProofOverride: true,
					monthlyShare: '35000' // Server recomputes: proof override → 35000
				} as any
			]
		});
		const enriched = enrichPayload(makePayload([applicant]));
		expect(enriched._computed._total_obligations_monthly).toBe(35000);
	});
});
