/**
 * Income Assessor V2 Tests
 *
 * Validates per-entry multi-source income assessment:
 * 1. Per-source gross extraction from all 12 profile types
 * 2. Multi-source assessment with multiple income entries
 * 3. assessment_logic JSON-Logic evaluation
 * 4. max_contribution_percent capping
 * 5. Backward compatibility — flat field fallback
 * 6. Rule matching (exact, wildcard, no-match)
 * 7. Condition evaluation on income rules
 */

import { describe, it, expect } from 'vitest';
import { assessIncomeV2 } from '$lib/ruleEngine/incomeAssessorV2.js';
import type { ParsedIncomeRule, AssessedIncomeSource } from '$lib/ruleEngine/types.js';
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

function makeIncomeRule(overrides: Partial<ParsedIncomeRule> = {}): ParsedIncomeRule {
	return {
		rule_id: 'ir-test',
		income_profile_type: 'salaried_regular',
		accepted: true,
		haircut_percent: 0,
		computation_method: 'standard',
		confidence: 0.9,
		source_excerpt: 'test rule',
		...overrides
	};
}

// ============================================================================
// 1. PER-SOURCE GROSS EXTRACTION
// ============================================================================

describe('per-source gross extraction', () => {
	const rules: ParsedIncomeRule[] = [
		makeIncomeRule({ income_profile_type: 'salaried_regular', haircut_percent: 0 }),
		makeIncomeRule({
			rule_id: 'ir-biz',
			income_profile_type: 'business_proprietorship',
			haircut_percent: 0
		}),
		makeIncomeRule({
			rule_id: 'ir-prof',
			income_profile_type: 'professional_practice',
			haircut_percent: 0
		}),
		makeIncomeRule({ rule_id: 'ir-pens', income_profile_type: 'pension', haircut_percent: 0 }),
		makeIncomeRule({
			rule_id: 'ir-rental',
			income_profile_type: 'rental_income',
			haircut_percent: 0
		}),
		makeIncomeRule({
			rule_id: 'ir-free',
			income_profile_type: 'freelance_consulting',
			haircut_percent: 0
		}),
		makeIncomeRule({
			rule_id: 'ir-agr',
			income_profile_type: 'agriculture_income',
			haircut_percent: 0
		}),
		makeIncomeRule({
			rule_id: 'ir-inv',
			income_profile_type: 'investment_income',
			haircut_percent: 0
		}),
		makeIncomeRule({
			rule_id: 'ir-dir',
			income_profile_type: 'director_company',
			haircut_percent: 0
		}),
		makeIncomeRule({
			rule_id: 'ir-part',
			income_profile_type: 'business_partnership',
			haircut_percent: 0
		})
	];

	it('salaried_regular: uses grossMonthlySalary', () => {
		const applicant = makeApplicant({
			incomeEntries: [
				makeEntry('salaried_regular', { grossMonthlySalary: 80000, netMonthlySalary: 65000 })
			]
		});
		const { totalAssessed, sources } = assessIncomeV2([applicant], rules, makePayload([applicant]));
		expect(totalAssessed).toBe(80000);
		expect(sources[0].gross_amount).toBe(80000);
	});

	it('salaried_regular: falls back to netMonthlySalary', () => {
		const applicant = makeApplicant({
			incomeEntries: [makeEntry('salaried_regular', { netMonthlySalary: 65000 })]
		});
		const { totalAssessed } = assessIncomeV2([applicant], rules, makePayload([applicant]));
		expect(totalAssessed).toBe(65000);
	});

	it('business_proprietorship: averages first two filed ITRs / 12 (owner policy)', () => {
		// Owner policy 2026-05-29: average of LAST TWO FILED ITRs (positions 0
		// and 1, where position 0 is the most recent). 3rd year is collected
		// for trend/vintage signal but not for income calc.
		// Expected: (1800000 + 1500000) / 2 / 12 = 137500.
		const applicant = makeApplicant({
			employmentType: 'Self-employed(Other)',
			incomeEntries: [
				makeEntry('business_proprietorship', {
					financialsTable: {
						itrFiled: [true, true, true],
						netProfitArray: [1800000, 1500000, 1200000]
					}
				})
			]
		});
		const { sources } = assessIncomeV2([applicant], rules, makePayload([applicant]));
		expect(sources[0].gross_amount).toBe(137500);
	});

	it('professional_practice: averages first two filed ITRs / 12 (owner policy)', () => {
		// Owner policy 2026-05-29: take last two FILED ITRs (positions 0 + 1).
		// (1600000 + 1500000) / 2 / 12 = 129166.6... — rounded by Math.round
		// in the enricher, but the V2 assessor reads the raw extractor output
		// which doesn't round. Compare with closeTo to allow for floating point.
		const applicant = makeApplicant({
			employmentType: 'Self-employed(Professional)',
			incomeEntries: [
				makeEntry('professional_practice', {
					financialsTable: {
						itrFiled: [true, true, true],
						netProfitArray: [1600000, 1500000, 1400000]
					}
				})
			]
		});
		const { sources } = assessIncomeV2([applicant], rules, makePayload([applicant]));
		// (1600000 + 1500000) / 2 / 12 = 129166.6...
		expect(sources[0].gross_amount).toBeCloseTo(129166.66, 0);
	});

	it('professional_practice: bug-report payload (current-FY empty, 3 filed ITRs)', () => {
		// Reproduces the team bug report payload exactly.
		// Expected: (3500000 + 3400000) / 2 / 12 = 287500.
		const applicant = makeApplicant({
			employmentType: 'Self-employed(Professional)',
			incomeEntries: [
				makeEntry('professional_practice', {
					financialsTable: {
						itrFiled: [true, true, true, true],
						netProfitArray: [3500000, 3400000, 3000000, '']
					}
				})
			]
		});
		const { sources } = assessIncomeV2([applicant], rules, makePayload([applicant]));
		expect(sources[0].gross_amount).toBe(287500);
	});

	it('professional_practice: April–Sept case where latest year ITR not yet filed', () => {
		// itrFiled[0] = false (operator hasn't filed FY-just-ended ITR yet).
		// Engine rolls to positions 1 + 2 (last two actually filed).
		// Expected: (3500000 + 3400000) / 2 / 12 = 287500.
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
		const { sources } = assessIncomeV2([applicant], rules, makePayload([applicant]));
		expect(sources[0].gross_amount).toBe(287500);
	});

	it('pension: uses monthlyPensionAmount', () => {
		const applicant = makeApplicant({
			employmentType: 'Pensioner',
			incomeEntries: [makeEntry('pension', { monthlyPensionAmount: 45000 })]
		});
		const { sources } = assessIncomeV2([applicant], rules, makePayload([applicant]));
		expect(sources[0].gross_amount).toBe(45000);
	});

	it('rental_income: uses monthlyRentAmount', () => {
		const applicant = makeApplicant({
			incomeEntries: [
				makeEntry('salaried_regular', { grossMonthlySalary: 80000 }),
				makeEntry('rental_income', { monthlyRentAmount: 25000 })
			]
		});
		const { sources } = assessIncomeV2([applicant], rules, makePayload([applicant]));
		const rentalSource = sources.find((s) => s.profile_type === 'rental_income');
		expect(rentalSource).toBeDefined();
		expect(rentalSource!.gross_amount).toBe(25000);
	});

	it('freelance_consulting: uses averageMonthlyFreelanceIncome', () => {
		const applicant = makeApplicant({
			incomeEntries: [
				makeEntry('salaried_regular', { grossMonthlySalary: 80000 }),
				makeEntry('freelance_consulting', { averageMonthlyFreelanceIncome: 30000 })
			]
		});
		const { sources } = assessIncomeV2([applicant], rules, makePayload([applicant]));
		const freelanceSource = sources.find((s) => s.profile_type === 'freelance_consulting');
		expect(freelanceSource!.gross_amount).toBe(30000);
	});

	it('agriculture_income: annual / 12', () => {
		const applicant = makeApplicant({
			incomeEntries: [
				makeEntry('salaried_regular', { grossMonthlySalary: 80000 }),
				makeEntry('agriculture_income', { averageAnnualAgricultureIncome: 240000 })
			]
		});
		const { sources } = assessIncomeV2([applicant], rules, makePayload([applicant]));
		const agrSource = sources.find((s) => s.profile_type === 'agriculture_income');
		expect(agrSource!.gross_amount).toBe(20000);
	});

	it('investment_income: annual / 12', () => {
		const applicant = makeApplicant({
			incomeEntries: [
				makeEntry('salaried_regular', { grossMonthlySalary: 80000 }),
				makeEntry('investment_income', { averageAnnualInvestmentIncome: 120000 })
			]
		});
		const { sources } = assessIncomeV2([applicant], rules, makePayload([applicant]));
		const invSource = sources.find((s) => s.profile_type === 'investment_income');
		expect(invSource!.gross_amount).toBe(10000);
	});

	it('director_company: salary + prorated profit', () => {
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
		const { sources } = assessIncomeV2([applicant], rules, makePayload([applicant]));
		// salary: 100000 + profit: (300000*4)/12 = 100000 => 200000
		expect(sources[0].gross_amount).toBe(200000);
	});

	it('business_partnership: salary + annual profit prorated', () => {
		const applicant = makeApplicant({
			employmentType: 'Self-employed(Other)',
			incomeEntries: [
				makeEntry('business_partnership', {
					drawsSalary: true,
					monthlySalaryAmount: 50000,
					receivesProfit: true,
					profitFrequency: 'annual',
					averageProfitPerWithdrawal: 600000
				})
			]
		});
		const { sources } = assessIncomeV2([applicant], rules, makePayload([applicant]));
		// salary: 50000 + profit: (600000*1)/12 = 50000 => 100000
		expect(sources[0].gross_amount).toBe(100000);
	});
});

// ============================================================================
// 2. MULTI-SOURCE ASSESSMENT
// ============================================================================

describe('multi-source assessment', () => {
	it('sums assessed amounts from 2+ income entries', () => {
		const rules = [
			makeIncomeRule({ income_profile_type: 'salaried_regular', haircut_percent: 10 }),
			makeIncomeRule({
				rule_id: 'ir-rental',
				income_profile_type: 'rental_income',
				haircut_percent: 30
			})
		];
		const applicant = makeApplicant({
			incomeEntries: [
				makeEntry('salaried_regular', { grossMonthlySalary: 100000, netMonthlySalary: 85000 }),
				makeEntry('rental_income', { monthlyRentAmount: 30000 })
			]
		});
		const { totalAssessed, sources } = assessIncomeV2([applicant], rules, makePayload([applicant]));
		// Salaried: 100000 * 0.9 = 90000, Rental: 30000 * 0.7 = 21000
		expect(sources[0].assessed_amount).toBe(90000);
		expect(sources[1].assessed_amount).toBe(21000);
		expect(totalAssessed).toBe(111000);
	});

	it('multi-applicant with incomeEntries on both', () => {
		const rules = [makeIncomeRule({ income_profile_type: 'salaried_regular', haircut_percent: 0 })];
		const primary = makeApplicant({
			incomeEntries: [makeEntry('salaried_regular', { grossMonthlySalary: 80000 })]
		});
		const coApp = makeApplicant({
			incomeEntries: [makeEntry('salaried_regular', { grossMonthlySalary: 50000 })]
		});
		const payload = makePayload([primary, coApp]);
		const { totalAssessed } = assessIncomeV2([primary, coApp], rules, payload);
		expect(totalAssessed).toBe(130000);
	});
});

// ============================================================================
// 3. ASSESSMENT_LOGIC (JSON-Logic)
// ============================================================================

describe('assessment_logic evaluation', () => {
	it('assessment_logic overrides haircut_percent', () => {
		const rules = [
			makeIncomeRule({
				income_profile_type: 'salaried_regular',
				haircut_percent: 20,
				// JSON-Logic: return 70000 (custom assessed amount)
				assessment_logic: { '*': [{ var: '_entry.grossAmount' }, 0.7] }
			})
		];
		const applicant = makeApplicant({
			incomeEntries: [
				makeEntry('salaried_regular', { grossMonthlySalary: 100000, netMonthlySalary: 85000 })
			]
		});
		const { sources } = assessIncomeV2([applicant], rules, makePayload([applicant]));
		// assessment_logic: 100000 * 0.7 = 70000
		expect(sources[0].assessed_amount).toBe(70000);
		expect(sources[0].haircut_percent).toBe(30); // effective haircut
	});

	it('falls back to haircut_percent when assessment_logic fails', () => {
		const rules = [
			makeIncomeRule({
				income_profile_type: 'salaried_regular',
				haircut_percent: 15,
				// Invalid logic that will throw
				assessment_logic: { invalidOp: [1, 2] }
			})
		];
		const applicant = makeApplicant({
			incomeEntries: [makeEntry('salaried_regular', { grossMonthlySalary: 100000 })]
		});
		const { sources } = assessIncomeV2([applicant], rules, makePayload([applicant]));
		// Falls back to haircut: 100000 * 0.85 = 85000
		expect(sources[0].assessed_amount).toBe(85000);
	});

	it('assessment_logic with empty object falls back to haircut', () => {
		const rules = [
			makeIncomeRule({
				income_profile_type: 'salaried_regular',
				haircut_percent: 10,
				assessment_logic: {}
			})
		];
		const applicant = makeApplicant({
			incomeEntries: [makeEntry('salaried_regular', { grossMonthlySalary: 100000 })]
		});
		const { sources } = assessIncomeV2([applicant], rules, makePayload([applicant]));
		expect(sources[0].assessed_amount).toBe(90000);
	});
});

// ============================================================================
// 4. MAX_CONTRIBUTION_PERCENT CAPPING
// ============================================================================

describe('max_contribution_percent capping', () => {
	it('caps secondary source at configured percentage of running total', () => {
		const rules = [
			makeIncomeRule({ income_profile_type: 'salaried_regular', haircut_percent: 0 }),
			makeIncomeRule({
				rule_id: 'ir-rental',
				income_profile_type: 'rental_income',
				haircut_percent: 0,
				max_contribution_percent: 25
			})
		];
		const applicant = makeApplicant({
			incomeEntries: [
				makeEntry('salaried_regular', { grossMonthlySalary: 80000 }),
				makeEntry('rental_income', { monthlyRentAmount: 40000 })
			]
		});
		const { totalAssessed, sources } = assessIncomeV2([applicant], rules, makePayload([applicant]));
		// Salaried: 80000 (running total = 80000)
		// Rental: 40000 gross, but max = 80000 * 25% = 20000 -> capped at 20000
		expect(sources[1].assessed_amount).toBe(40000);
		expect(sources[1].capped_at).toBe(20000);
		expect(sources[1].final_amount).toBe(20000);
		expect(totalAssessed).toBe(100000);
	});

	it('no capping when source is below max_contribution_percent', () => {
		const rules = [
			makeIncomeRule({ income_profile_type: 'salaried_regular', haircut_percent: 0 }),
			makeIncomeRule({
				rule_id: 'ir-rental',
				income_profile_type: 'rental_income',
				haircut_percent: 0,
				max_contribution_percent: 50
			})
		];
		const applicant = makeApplicant({
			incomeEntries: [
				makeEntry('salaried_regular', { grossMonthlySalary: 80000 }),
				makeEntry('rental_income', { monthlyRentAmount: 20000 })
			]
		});
		const { sources } = assessIncomeV2([applicant], rules, makePayload([applicant]));
		// Max allowed = 80000 * 50% = 40000, rental is 20000 -> no cap
		expect(sources[1].capped_at).toBeUndefined();
		expect(sources[1].final_amount).toBe(20000);
	});

	it('first source is never capped (running total is 0)', () => {
		const rules = [
			makeIncomeRule({
				income_profile_type: 'salaried_regular',
				haircut_percent: 0,
				max_contribution_percent: 25
			})
		];
		const applicant = makeApplicant({
			incomeEntries: [makeEntry('salaried_regular', { grossMonthlySalary: 80000 })]
		});
		const { sources } = assessIncomeV2([applicant], rules, makePayload([applicant]));
		expect(sources[0].capped_at).toBeUndefined();
		expect(sources[0].final_amount).toBe(80000);
	});
});

// ============================================================================
// 5. BACKWARD COMPATIBILITY — FLAT FIELD FALLBACK
// ============================================================================

describe('backward compatibility — flat field fallback', () => {
	it('uses grossIncome/netIncome when incomeEntries is absent', () => {
		const rules = [
			makeIncomeRule({ income_profile_type: 'salaried_regular', haircut_percent: 10 })
		];
		const applicant = makeApplicant({
			grossIncome: 80000,
			netIncome: 65000
		});
		const { totalAssessed, sources } = assessIncomeV2([applicant], rules, makePayload([applicant]));
		// Falls back to extractGrossMonthlyIncome which returns netIncome for salaried
		expect(sources[0].gross_amount).toBe(65000);
		expect(sources[0].assessed_amount).toBe(58500); // 65000 * 0.9
		expect(totalAssessed).toBe(58500);
	});

	it('uses financials for self-employed when incomeEntries is absent', () => {
		const rules = [
			makeIncomeRule({
				rule_id: 'ir-biz',
				income_profile_type: 'business_proprietorship',
				haircut_percent: 0
			})
		];
		const applicant = makeApplicant({
			employmentType: 'Self-employed(Other)',
			financials: {
				grossReceipts: [5000000, 6000000, 7000000],
				netProfit: [1200000, 1500000, 1800000],
				depreciation: [50000, 60000, 70000],
				itrFiled: ['FY21-22', 'FY22-23', 'FY23-24']
			}
		});
		const { sources } = assessIncomeV2([applicant], rules, makePayload([applicant]));
		// (1200000+1500000+1800000)/3/12 = 125000
		expect(sources[0].gross_amount).toBe(125000);
	});

	it('uses 0 for unemployed', () => {
		const applicant = makeApplicant({ employmentType: 'Unemployed' });
		const { totalAssessed } = assessIncomeV2([applicant], null, makePayload([applicant]));
		expect(totalAssessed).toBe(0);
	});
});

// ============================================================================
// 6. RULE MATCHING
// ============================================================================

describe('rule matching', () => {
	it('no rules — uses 100% of gross (no haircut)', () => {
		const applicant = makeApplicant({
			incomeEntries: [makeEntry('salaried_regular', { grossMonthlySalary: 80000 })]
		});
		const { totalAssessed } = assessIncomeV2([applicant], null, makePayload([applicant]));
		expect(totalAssessed).toBe(80000);
	});

	it('empty rules array — uses 100% of gross', () => {
		const applicant = makeApplicant({
			incomeEntries: [makeEntry('salaried_regular', { grossMonthlySalary: 80000 })]
		});
		const { totalAssessed } = assessIncomeV2([applicant], [], makePayload([applicant]));
		expect(totalAssessed).toBe(80000);
	});

	it('no matching rule for profile type — uses 100%', () => {
		const rules = [makeIncomeRule({ income_profile_type: 'pension', haircut_percent: 20 })];
		const applicant = makeApplicant({
			incomeEntries: [makeEntry('salaried_regular', { grossMonthlySalary: 80000 })]
		});
		const { totalAssessed } = assessIncomeV2([applicant], rules, makePayload([applicant]));
		expect(totalAssessed).toBe(80000);
	});

	it('wildcard rule matches when no exact match', () => {
		const rules = [
			makeIncomeRule({ rule_id: 'ir-wildcard', income_profile_type: '*', haircut_percent: 50 })
		];
		const applicant = makeApplicant({
			incomeEntries: [makeEntry('salaried_regular', { grossMonthlySalary: 80000 })]
		});
		const { sources } = assessIncomeV2([applicant], rules, makePayload([applicant]));
		expect(sources[0].haircut_percent).toBe(50);
		expect(sources[0].assessed_amount).toBe(40000);
	});

	it('exact match takes priority over wildcard', () => {
		const rules = [
			makeIncomeRule({
				rule_id: 'ir-exact',
				income_profile_type: 'salaried_regular',
				haircut_percent: 10
			}),
			makeIncomeRule({ rule_id: 'ir-wildcard', income_profile_type: '*', haircut_percent: 50 })
		];
		const applicant = makeApplicant({
			incomeEntries: [makeEntry('salaried_regular', { grossMonthlySalary: 80000 })]
		});
		const { sources } = assessIncomeV2([applicant], rules, makePayload([applicant]));
		expect(sources[0].rule_id).toBe('ir-exact');
		expect(sources[0].haircut_percent).toBe(10);
	});

	it('not accepted — assessed amount is 0', () => {
		const rules = [makeIncomeRule({ income_profile_type: 'salaried_regular', accepted: false })];
		const applicant = makeApplicant({
			incomeEntries: [makeEntry('salaried_regular', { grossMonthlySalary: 80000 })]
		});
		const { totalAssessed } = assessIncomeV2([applicant], rules, makePayload([applicant]));
		expect(totalAssessed).toBe(0);
	});
});

// ============================================================================
// 7. CONDITION EVALUATION
// ============================================================================

describe('condition evaluation on income rules', () => {
	it('condition met — applies haircut normally', () => {
		const rules = [
			makeIncomeRule({
				income_profile_type: 'salaried_regular',
				haircut_percent: 10,
				// Condition: loan amount > 1000000
				conditions: { '>': [{ var: 'loanTransaction.loanAmount' }, 1000000] }
			})
		];
		const applicant = makeApplicant({
			incomeEntries: [makeEntry('salaried_regular', { grossMonthlySalary: 80000 })]
		});
		const payload = makePayload([applicant]);
		payload.loanTransaction.loanAmount = 5000000;
		const { sources } = assessIncomeV2([applicant], rules, payload);
		expect(sources[0].assessed_amount).toBe(72000);
	});

	it('condition not met — income rejected', () => {
		const rules = [
			makeIncomeRule({
				income_profile_type: 'salaried_regular',
				haircut_percent: 10,
				conditions: { '>': [{ var: 'loanTransaction.loanAmount' }, 10000000] }
			})
		];
		const applicant = makeApplicant({
			incomeEntries: [makeEntry('salaried_regular', { grossMonthlySalary: 80000 })]
		});
		const payload = makePayload([applicant]);
		payload.loanTransaction.loanAmount = 5000000;
		const { totalAssessed } = assessIncomeV2([applicant], rules, payload);
		expect(totalAssessed).toBe(0);
	});
});

// ============================================================================
// 8. GUARANTOR HANDLING
// ============================================================================

describe('guarantor handling', () => {
	it('guarantor contributes 0 income', () => {
		const rules = [makeIncomeRule({ income_profile_type: 'salaried_regular', haircut_percent: 0 })];
		const primary = makeApplicant({
			roleInApplication: 'Primary',
			incomeEntries: [makeEntry('salaried_regular', { grossMonthlySalary: 80000 })]
		});
		const guarantor = makeApplicant({
			roleInApplication: 'Guarantor',
			incomeEntries: [makeEntry('salaried_regular', { grossMonthlySalary: 50000 })]
		});
		const payload = makePayload([primary, guarantor]);
		const { totalAssessed, sources } = assessIncomeV2([primary, guarantor], rules, payload);
		expect(totalAssessed).toBe(80000);
		expect(sources[1].final_amount).toBe(0);
	});
});
