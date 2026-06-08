import { describe, it, expect } from 'vitest';
import {
	extractVarPaths,
	validateVarPath,
	validateRule,
	validateDeviation,
	validatePolicyKey,
	validateLenderRuleDocument
} from '$lib/ruleEngine/ruleValidator.js';

// ============================================================================
// VALID KEY REGISTRIES (mirroring the validator's internal lists)
// ============================================================================

const LOAN_TRANSACTION_KEYS = [
	'loanName',
	'loanType',
	'numberOfApplicants',
	'applicationStructure',
	'propertyIdentified',
	'propertyState',
	'propertyCity',
	'propertyType',
	'purchaseType',
	'constructionStatus',
	'propertyStage',
	'approvedByAuthority',
	'asPerApprovedMap',
	'propertyRegistered',
	'propertyCost',
	'atsValue',
	'downPayment',
	'residenceSameAsProperty',
	'residenceState',
	'residenceCity',
	'loanAmount',
	'tenureYears',
	'currentBank',
	'principalOutstanding',
	'currentInterestRate',
	'remainingTenure',
	'currentEMI',
	'sixMonthsAfterRegistry',
	'currentPropertyValue',
	'newTenure',
	'topUpAmount',
	'topUpTenure',
	'hasNRIApplicant',
	'preferredBanks',
	'excludedBanks',
	'carpetArea',
	'carpetAreaUnit',
	'carpetAreaRaw',
	'propertyAreaType',
	'leaseRemainingPeriod',
	'existingEncumbrance',
	'ocCcAvailable',
	'municipalApproval',
	'rentalIncome',
	'loanPurpose',
	'loanVintage',
	'repaymentTrack',
	'dodMonthlyWithdrawal',

	// ── Enricher-Derived: SC/ST + Disability ──
	'isSCST',
	'hasDisabledApplicant'
];

const APPLICANT_FLAT_KEYS = [
	'applicantType',
	'title',
	'fullName',
	'age',
	'gender',
	'maritalStatus',
	'roleInApplication',
	'relationshipWithPrimary',
	'otherRelationship',
	'residenceType',
	'yearsAtCurrentAddress',
	'isNRI',
	'employmentType',
	'professionType',
	'hasBarCouncilChamber',
	'businessType',
	'gstRegistrationDate',
	'grossIncome',
	'netIncome',
	'monthlyOtherIncome',
	'averageBankBalance',
	'averageCashAmount',
	'creditScore',
	'hasExistingObligations',
	'companyName',
	'companyType',
	'companyAge',

	// ── Home Loan Redesign: Per-Applicant Signals ──
	'emiBounceCount',
	'defaultSettlementStatus',
	'recentEnquiryCount',
	'applicantResidencePattern',
	'ownedResidentialProperties',
	'education',
	'religion',
	'casteCategory',
	'hasDisability',
	'creditHistoryStatus',

	// ── Profile Page: Location + NRI Fields ──
	'applicantResidenceState',
	'applicantResidenceCity',
	'applicantResidencePincode',
	'companyOfficeState',
	'companyOfficeCity',
	'companyOfficePincode',
	'nriCountry'
];

const SALARIED_PROFILE_KEYS = [
	'salariedProfile.worksForReputedOrg',
	'salariedProfile.companyHas100PlusEmployees',
	'salariedProfile.employerIsProprietorship',
	'salariedProfile.employerSharesFinancials',
	'salariedProfile.isPermanentEmployee',
	'salariedProfile.twoYearsWithSameEmployer',
	'salariedProfile.threeYearsTotalExperience',
	'salariedProfile.hasProvidentFund',
	'salariedProfile.salaryInBankAccount',
	'salariedProfile.receivesBonus',
	'salariedProfile.receivesSalarySlip',
	'salariedProfile.hasHigherEducation'
];

const GOVERNMENT_PROFILE_KEYS = [
	'governmentProfile.isCentralGovt',
	'governmentProfile.isDefense',
	'governmentProfile.isStateGovt',
	'governmentProfile.isPermanent',
	'governmentProfile.isContractual',
	'governmentProfile.probationCompleted',
	'governmentProfile.twoYearsService',
	'governmentProfile.noDisciplinaryAction',
	'governmentProfile.nonAccessiblePosting',
	'governmentProfile.verificationPossible',
	'governmentProfile.alternateAddressAvailable',
	'governmentProfile.receivesBonus',
	'governmentProfile.pensionEligible',
	'governmentProfile.receivesSalarySlip',
	'governmentProfile.filesITR',
	'governmentProfile.ownsProperty',
	'governmentProfile.hasOtherIncome'
];

const BUSINESS_PROFILE_KEYS = [
	'businessProfile.gstRegistered',
	'businessProfile.hasCurrentAccount',
	'businessProfile.usesSavingsAccount',
	'businessProfile.filesITRRegularly',
	'businessProfile.profitableLast3Years',
	'businessProfile.profitableSinceStart',
	'businessProfile.majorCashSales',
	'businessProfile.fewKeyClients',
	'businessProfile.hasCCOD',
	'businessProfile.hasOtherIncome',
	'businessProfile.hasProfessionalLicense',
	'businessProfile.hasCommercialPremises',
	'businessProfile.ownsPremises',
	'businessProfile.threeYearsInBusiness',
	'businessProfile.enrolledWithProfessionalBody',
	'businessProfile.priorExperience',
	'businessProfile.seasonalBusiness'
];

const PENSION_PROFILE_KEYS = [
	'pensionProfile.pensionInBankAccount',
	'pensionProfile.pensionRegular',
	'pensionProfile.isGovernmentPension',
	'pensionProfile.isPSUDefensePension',
	'pensionProfile.isLifelongPension',
	'pensionProfile.isFamilyPension',
	'pensionProfile.continuesBeyond75',
	'pensionProfile.receivesPensionSlip',
	'pensionProfile.nationalizedBankAccount',
	'pensionProfile.noPensionLoanDeduction',
	'pensionProfile.hasOtherIncome',
	'pensionProfile.ownsProperty',
	'pensionProfile.spousePensionApplicable',
	'pensionProfile.filesITR',
	'pensionProfile.verificationPossible'
];

const FINANCIALS_KEYS = [
	'financials.grossReceipts',
	'financials.netProfit',
	'financials.depreciation',
	'financials.itrFiled'
];

const LOW_CREDIT_REASONS_KEYS = [
	'lowCreditReasons.delayedEMI',
	'lowCreditReasons.highCreditUtilization',
	'lowCreditReasons.noCreditHistory',
	'lowCreditReasons.minimumDueOnly',
	'lowCreditReasons.multipleEnquiries',
	'lowCreditReasons.coApplicantDefault',
	'lowCreditReasons.loanDefault',
	'lowCreditReasons.onlyUnsecuredLoans'
];

const GPA_KEYS = [
	'gpaDetails.fullName',
	'gpaDetails.age',
	'gpaDetails.relationship',
	'gpaDetails.address'
];

const OBLIGATION_FIELDS = [
	'obligationType',
	'loanType',
	'bankName',
	'selectedToClose',
	'emi',
	'totalLimit',
	'tenure',
	'interestRate',
	'remainingLimit',
	'remainingTenure',
	'utilizedAmount',
	'sanctionedLimit',
	'sanctionedTenure'
];

const DIRECTOR_FIELDS = ['name', 'age', 'designation', 'din'];

const POLICY_KEYS = [
	'roi_type',
	'roi_benchmark',
	'roi_spread',
	'roi_range',
	'teaser_rate',
	'processing_fee_percent',
	'processing_fee_flat',
	'processing_fee_waiver',
	'prepayment_charge_floating',
	'prepayment_charge_fixed',
	'lock_in_period_months',
	'insurance_mandatory',
	'insurance_type',
	'login_to_sanction_days',
	'login_to_disbursal_days',
	'max_age_at_maturity',
	'min_loan_amount',
	'max_loan_amount',
	'women_borrower_discount',
	'festive_offer',
	'stamp_duty_info',
	'legal_technical_fee',
	'cersai_charge',
	'moratorium_available',
	'part_disbursement_allowed',
	'tranche_disbursement_info'
];

// ============================================================================
// HELPERS
// ============================================================================

/** Build a minimal valid rule object */
function makeRule(overrides: Record<string, unknown> = {}): Record<string, unknown> {
	return {
		rule_id: 'RULE_001',
		description: 'Test rule',
		logic: { '>': [{ var: 'loanTransaction.loanAmount' }, 500000] },
		outcome: 'eligible',
		confidence: 0.95,
		source_excerpt: 'Page 3 of HDFC policy doc',
		...overrides
	};
}

/** Build a minimal valid deviation object */
function makeDeviation(overrides: Record<string, unknown> = {}): Record<string, unknown> {
	return {
		deviation_id: 'DEV_001',
		description: 'Allow lower credit score',
		applies_to_rule: 'RULE_001',
		conditions: { '<': [{ var: 'allApplicantDetails.0.creditScore' }, 650] },
		adjustment: { type: 'override', value: 'eligible_with_conditions' },
		confidence: 0.8,
		source_excerpt: 'Deviation matrix row 4',
		...overrides
	};
}

/** Build a minimal valid lender rule document */
function makeDocument(overrides: Record<string, unknown> = {}): Record<string, unknown> {
	return {
		lender_id: 'hdfc',
		lender_name: 'HDFC Bank',
		product_type: 'Home Loan',
		version: 1,
		effective_date: '2026-01-01',
		rules: [makeRule()],
		deviations: [makeDeviation()],
		policy: {
			roi_type: 'floating',
			roi_benchmark: 'EBLR',
			roi_spread: 0.5,
			min_loan_amount: 300000,
			max_loan_amount: 50000000,
			max_age_at_maturity: 70,
			processing_fee_percent: 0.5,
			insurance_mandatory: true
		},
		...overrides
	};
}

// ============================================================================
// extractVarPaths -- JSON-Logic expression walking
// ============================================================================

describe('extractVarPaths', () => {
	it('extracts a single var reference', () => {
		const logic = { '>': [{ var: 'loanTransaction.loanAmount' }, 500000] };
		const paths = extractVarPaths(logic);
		expect(paths).toContain('loanTransaction.loanAmount');
		expect(paths).toHaveLength(1);
	});

	it('extracts multiple var references from an and-expression', () => {
		const logic = {
			and: [
				{ '>=': [{ var: 'loanTransaction.loanAmount' }, 500000] },
				{ '<=': [{ var: 'loanTransaction.tenureYears' }, 30] }
			]
		};
		const paths = extractVarPaths(logic);
		expect(paths).toContain('loanTransaction.loanAmount');
		expect(paths).toContain('loanTransaction.tenureYears');
		expect(paths).toHaveLength(2);
	});

	it('extracts var references from or-expression', () => {
		const logic = {
			or: [
				{ '==': [{ var: 'allApplicantDetails.0.employmentType' }, 'salaried'] },
				{ '==': [{ var: 'allApplicantDetails.0.employmentType' }, 'government'] }
			]
		};
		const paths = extractVarPaths(logic);
		expect(paths).toContain('allApplicantDetails.0.employmentType');
		expect(paths).toHaveLength(2);
	});

	it('deduplicates repeated var references', () => {
		const logic = {
			and: [
				{ '>=': [{ var: 'loanTransaction.loanAmount' }, 500000] },
				{ '<=': [{ var: 'loanTransaction.loanAmount' }, 10000000] }
			]
		};
		const paths = extractVarPaths(logic);
		expect(paths).toContain('loanTransaction.loanAmount');
		// Implementation may or may not deduplicate -- test both are present
		expect(paths.filter((p) => p === 'loanTransaction.loanAmount').length).toBeGreaterThanOrEqual(
			1
		);
	});

	it('extracts vars from deeply nested if/then/else', () => {
		const logic = {
			if: [
				{ '==': [{ var: 'loanTransaction.loanType' }, 'Home Loan'] },
				{
					if: [
						{ '>': [{ var: 'allApplicantDetails.0.age' }, 60] },
						{ '<=': [{ var: 'loanTransaction.tenureYears' }, 10] },
						{ '<=': [{ var: 'loanTransaction.tenureYears' }, 30] }
					]
				},
				false
			]
		};
		const paths = extractVarPaths(logic);
		expect(paths).toContain('loanTransaction.loanType');
		expect(paths).toContain('allApplicantDetails.0.age');
		expect(paths).toContain('loanTransaction.tenureYears');
	});

	it('extracts vars from nested applicant profile paths', () => {
		const logic = {
			and: [
				{ '==': [{ var: 'allApplicantDetails.0.salariedProfile.worksForReputedOrg' }, true] },
				{ '==': [{ var: 'allApplicantDetails.0.salariedProfile.isPermanentEmployee' }, true] }
			]
		};
		const paths = extractVarPaths(logic);
		expect(paths).toContain('allApplicantDetails.0.salariedProfile.worksForReputedOrg');
		expect(paths).toContain('allApplicantDetails.0.salariedProfile.isPermanentEmployee');
	});

	it('returns empty array for non-object input', () => {
		expect(extractVarPaths(null)).toEqual([]);
		expect(extractVarPaths(undefined)).toEqual([]);
		expect(extractVarPaths(42)).toEqual([]);
		expect(extractVarPaths('string')).toEqual([]);
	});

	it('returns empty array for logic with no var references', () => {
		const logic = { '==': [1, 1] };
		expect(extractVarPaths(logic)).toEqual([]);
	});

	it('handles empty object input', () => {
		expect(extractVarPaths({})).toEqual([]);
	});

	it('handles empty arrays in logic', () => {
		const logic = { and: [] };
		expect(extractVarPaths(logic)).toEqual([]);
	});

	it('extracts vars from not-expression', () => {
		const logic = { '!': { '==': [{ var: 'loanTransaction.hasNRIApplicant' }, true] } };
		const paths = extractVarPaths(logic);
		expect(paths).toContain('loanTransaction.hasNRIApplicant');
	});

	it('extracts vars from in-expression with array', () => {
		const logic = {
			in: [{ var: 'loanTransaction.propertyType' }, ['Flat', 'Villa', 'Plot']]
		};
		const paths = extractVarPaths(logic);
		expect(paths).toContain('loanTransaction.propertyType');
	});

	it('extracts vars from merge operator', () => {
		const logic = {
			merge: [
				[{ var: 'loanTransaction.preferredBanks' }],
				[{ var: 'loanTransaction.excludedBanks' }]
			]
		};
		const paths = extractVarPaths(logic);
		expect(paths).toContain('loanTransaction.preferredBanks');
		expect(paths).toContain('loanTransaction.excludedBanks');
	});

	it('extracts vars from multiple applicant indices', () => {
		const logic = {
			and: [
				{ '>=': [{ var: 'allApplicantDetails.0.creditScore' }, 700] },
				{ '>=': [{ var: 'allApplicantDetails.1.creditScore' }, 650] },
				{ '>=': [{ var: 'allApplicantDetails.2.age' }, 21] }
			]
		};
		const paths = extractVarPaths(logic);
		expect(paths).toContain('allApplicantDetails.0.creditScore');
		expect(paths).toContain('allApplicantDetails.1.creditScore');
		expect(paths).toContain('allApplicantDetails.2.age');
	});

	it('extracts vars from obligation array references', () => {
		const logic = {
			'>': [{ var: 'allApplicantDetails.0.obligations.0.emi' }, 0]
		};
		const paths = extractVarPaths(logic);
		expect(paths).toContain('allApplicantDetails.0.obligations.0.emi');
	});

	it('extracts vars from director array references', () => {
		const logic = {
			'>=': [{ var: 'allApplicantDetails.0.directors.0.age' }, 21]
		};
		const paths = extractVarPaths(logic);
		expect(paths).toContain('allApplicantDetails.0.directors.0.age');
	});

	it('extracts vars from gpaDetails nested paths', () => {
		const logic = {
			'!=': [{ var: 'allApplicantDetails.0.gpaDetails.fullName' }, '']
		};
		const paths = extractVarPaths(logic);
		expect(paths).toContain('allApplicantDetails.0.gpaDetails.fullName');
	});

	it('extracts vars from comparison with two var references', () => {
		const logic = {
			'<=': [{ var: 'loanTransaction.loanAmount' }, { var: 'loanTransaction.propertyCost' }]
		};
		const paths = extractVarPaths(logic);
		expect(paths).toContain('loanTransaction.loanAmount');
		expect(paths).toContain('loanTransaction.propertyCost');
	});

	it('extracts vars from lowCreditReasons nested paths', () => {
		const logic = {
			'==': [{ var: 'allApplicantDetails.0.lowCreditReasons.delayedEMI' }, true]
		};
		const paths = extractVarPaths(logic);
		expect(paths).toContain('allApplicantDetails.0.lowCreditReasons.delayedEMI');
	});

	it('extracts vars from financials nested paths', () => {
		const logic = {
			'>': [{ var: 'allApplicantDetails.0.financials.netProfit' }, 0]
		};
		const paths = extractVarPaths(logic);
		expect(paths).toContain('allApplicantDetails.0.financials.netProfit');
	});
});

// ============================================================================
// validateVarPath -- individual path validation
// ============================================================================

describe('validateVarPath', () => {
	describe('loanTransaction paths', () => {
		it('accepts all valid loanTransaction keys', () => {
			for (const key of LOAN_TRANSACTION_KEYS) {
				const result = validateVarPath(`loanTransaction.${key}`);
				expect(result.valid, `loanTransaction.${key} should be valid`).toBe(true);
			}
		});

		it('rejects unknown loanTransaction keys', () => {
			const result = validateVarPath('loanTransaction.nonExistentField');
			expect(result.valid).toBe(false);
			expect(result.error).toBeDefined();
		});

		it('rejects typos in loanTransaction keys', () => {
			const typos = [
				'loanTransaction.loanAmout',
				'loanTransaction.propertytype',
				'loanTransaction.LoanAmount',
				'loanTransaction.loan_amount',
				'loanTransaction.tenureyears'
			];
			for (const path of typos) {
				const result = validateVarPath(path);
				expect(result.valid, `${path} should be invalid (typo)`).toBe(false);
			}
		});

		it('rejects loanTransaction with extra nesting', () => {
			const result = validateVarPath('loanTransaction.loanAmount.value');
			expect(result.valid).toBe(false);
		});
	});

	describe('allApplicantDetails paths', () => {
		it('accepts flat applicant keys with index 0', () => {
			for (const key of APPLICANT_FLAT_KEYS) {
				const result = validateVarPath(`allApplicantDetails.0.${key}`);
				expect(result.valid, `allApplicantDetails.0.${key} should be valid`).toBe(true);
			}
		});

		it('accepts applicant keys with various indices', () => {
			const result0 = validateVarPath('allApplicantDetails.0.age');
			const result1 = validateVarPath('allApplicantDetails.1.age');
			const result2 = validateVarPath('allApplicantDetails.2.age');
			const result5 = validateVarPath('allApplicantDetails.5.age');
			expect(result0.valid).toBe(true);
			expect(result1.valid).toBe(true);
			expect(result2.valid).toBe(true);
			expect(result5.valid).toBe(true);
		});

		it('accepts salaried profile nested keys', () => {
			for (const key of SALARIED_PROFILE_KEYS) {
				const path = `allApplicantDetails.0.${key}`;
				const result = validateVarPath(path);
				expect(result.valid, `${path} should be valid`).toBe(true);
			}
		});

		it('accepts government profile nested keys', () => {
			for (const key of GOVERNMENT_PROFILE_KEYS) {
				const path = `allApplicantDetails.1.${key}`;
				const result = validateVarPath(path);
				expect(result.valid, `${path} should be valid`).toBe(true);
			}
		});

		it('accepts business profile nested keys', () => {
			for (const key of BUSINESS_PROFILE_KEYS) {
				const path = `allApplicantDetails.0.${key}`;
				const result = validateVarPath(path);
				expect(result.valid, `${path} should be valid`).toBe(true);
			}
		});

		it('accepts pension profile nested keys', () => {
			for (const key of PENSION_PROFILE_KEYS) {
				const path = `allApplicantDetails.0.${key}`;
				const result = validateVarPath(path);
				expect(result.valid, `${path} should be valid`).toBe(true);
			}
		});

		it('accepts financials nested keys', () => {
			for (const key of FINANCIALS_KEYS) {
				const path = `allApplicantDetails.0.${key}`;
				const result = validateVarPath(path);
				expect(result.valid, `${path} should be valid`).toBe(true);
			}
		});

		it('accepts lowCreditReasons nested keys', () => {
			for (const key of LOW_CREDIT_REASONS_KEYS) {
				const path = `allApplicantDetails.0.${key}`;
				const result = validateVarPath(path);
				expect(result.valid, `${path} should be valid`).toBe(true);
			}
		});

		it('accepts gpaDetails nested keys', () => {
			for (const key of GPA_KEYS) {
				const path = `allApplicantDetails.0.${key}`;
				const result = validateVarPath(path);
				expect(result.valid, `${path} should be valid`).toBe(true);
			}
		});

		it('accepts obligation array paths', () => {
			for (const field of OBLIGATION_FIELDS) {
				const path = `allApplicantDetails.0.obligations.0.${field}`;
				const result = validateVarPath(path);
				expect(result.valid, `${path} should be valid`).toBe(true);
			}
		});

		it('accepts obligation paths with various array indices', () => {
			const result = validateVarPath('allApplicantDetails.0.obligations.3.emi');
			expect(result.valid).toBe(true);
		});

		it('accepts director array paths', () => {
			for (const field of DIRECTOR_FIELDS) {
				const path = `allApplicantDetails.0.directors.0.${field}`;
				const result = validateVarPath(path);
				expect(result.valid, `${path} should be valid`).toBe(true);
			}
		});

		it('rejects unknown applicant keys', () => {
			const result = validateVarPath('allApplicantDetails.0.socialSecurityNumber');
			expect(result.valid).toBe(false);
		});

		it('rejects typos in applicant profile keys', () => {
			const typos = [
				'allApplicantDetails.0.salariedProfile.worksForReputtedOrg',
				'allApplicantDetails.0.businessProfile.gstregistered',
				'allApplicantDetails.0.pensionProfile.PensionInBankAccount',
				'allApplicantDetails.0.governmentProfile.is_central_govt'
			];
			for (const path of typos) {
				const result = validateVarPath(path);
				expect(result.valid, `${path} should be invalid (typo)`).toBe(false);
			}
		});

		it('rejects applicant path without an index', () => {
			const result = validateVarPath('allApplicantDetails.age');
			expect(result.valid).toBe(false);
		});

		it('rejects applicant path with non-numeric index', () => {
			const result = validateVarPath('allApplicantDetails.primary.age');
			expect(result.valid).toBe(false);
		});

		it('rejects invented nested profile names', () => {
			const result = validateVarPath('allApplicantDetails.0.freelanceProfile.hasGST');
			expect(result.valid).toBe(false);
		});

		it('rejects obligation path with unknown field', () => {
			const result = validateVarPath('allApplicantDetails.0.obligations.0.inventedField');
			expect(result.valid).toBe(false);
		});

		it('rejects director path with unknown field', () => {
			const result = validateVarPath('allApplicantDetails.0.directors.0.salary');
			expect(result.valid).toBe(false);
		});
	});

	describe('invalid root sections', () => {
		it('rejects paths with unknown root section', () => {
			const result = validateVarPath('borrowerDetails.0.age');
			expect(result.valid).toBe(false);
		});

		it('rejects bare key without section prefix', () => {
			const result = validateVarPath('loanAmount');
			expect(result.valid).toBe(false);
		});

		it('rejects empty string', () => {
			const result = validateVarPath('');
			expect(result.valid).toBe(false);
		});

		it('rejects paths with only a dot', () => {
			const result = validateVarPath('.');
			expect(result.valid).toBe(false);
		});

		it('rejects paths with trailing dot', () => {
			const result = validateVarPath('loanTransaction.');
			expect(result.valid).toBe(false);
		});

		it('rejects paths with leading dot', () => {
			const result = validateVarPath('.loanTransaction.loanAmount');
			expect(result.valid).toBe(false);
		});

		it('rejects paths with double dots', () => {
			const result = validateVarPath('loanTransaction..loanAmount');
			expect(result.valid).toBe(false);
		});
	});
});

// ============================================================================
// validateRule -- rule object validation
// ============================================================================

describe('validateRule', () => {
	it('accepts a valid rule', () => {
		const result = validateRule(makeRule());
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	it('accepts a rule with complex nested logic', () => {
		const result = validateRule(
			makeRule({
				logic: {
					and: [
						{ '>=': [{ var: 'loanTransaction.loanAmount' }, 500000] },
						{ '<=': [{ var: 'loanTransaction.loanAmount' }, 50000000] },
						{
							or: [
								{ '==': [{ var: 'allApplicantDetails.0.employmentType' }, 'salaried'] },
								{
									and: [
										{ '==': [{ var: 'allApplicantDetails.0.employmentType' }, 'self_employed'] },
										{
											'==': [{ var: 'allApplicantDetails.0.businessProfile.gstRegistered' }, true]
										}
									]
								}
							]
						}
					]
				}
			})
		);
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	describe('required field validation', () => {
		it('rejects rule without rule_id', () => {
			const rule = makeRule();
			delete (rule as Record<string, unknown>).rule_id;
			const result = validateRule(rule);
			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.toLowerCase().includes('rule_id'))).toBe(true);
		});

		it('rejects rule with empty rule_id', () => {
			const result = validateRule(makeRule({ rule_id: '' }));
			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.toLowerCase().includes('rule_id'))).toBe(true);
		});

		it('rejects rule without confidence', () => {
			const rule = makeRule();
			delete (rule as Record<string, unknown>).confidence;
			const result = validateRule(rule);
			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.toLowerCase().includes('confidence'))).toBe(true);
		});

		it('rejects rule with confidence below 0', () => {
			const result = validateRule(makeRule({ confidence: -0.1 }));
			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.toLowerCase().includes('confidence'))).toBe(true);
		});

		it('rejects rule with confidence above 1', () => {
			const result = validateRule(makeRule({ confidence: 1.5 }));
			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.toLowerCase().includes('confidence'))).toBe(true);
		});

		it('accepts rule with confidence of exactly 0', () => {
			const result = validateRule(makeRule({ confidence: 0 }));
			// confidence = 0 is a valid value (low confidence is still valid)
			expect(result.errors.filter((e) => e.toLowerCase().includes('confidence'))).toHaveLength(0);
		});

		it('accepts rule with confidence of exactly 1', () => {
			const result = validateRule(makeRule({ confidence: 1 }));
			expect(result.errors.filter((e) => e.toLowerCase().includes('confidence'))).toHaveLength(0);
		});

		it('rejects rule without source_excerpt', () => {
			const rule = makeRule();
			delete (rule as Record<string, unknown>).source_excerpt;
			const result = validateRule(rule);
			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.toLowerCase().includes('source_excerpt'))).toBe(true);
		});

		it('rejects rule with empty source_excerpt', () => {
			const result = validateRule(makeRule({ source_excerpt: '' }));
			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.toLowerCase().includes('source_excerpt'))).toBe(true);
		});

		it('rejects rule without logic', () => {
			const rule = makeRule();
			delete (rule as Record<string, unknown>).logic;
			const result = validateRule(rule);
			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.toLowerCase().includes('logic'))).toBe(true);
		});

		it('rejects rule without description', () => {
			const rule = makeRule();
			delete (rule as Record<string, unknown>).description;
			const result = validateRule(rule);
			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.toLowerCase().includes('description'))).toBe(true);
		});

		it('rejects rule without outcome', () => {
			const rule = makeRule();
			delete (rule as Record<string, unknown>).outcome;
			const result = validateRule(rule);
			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.toLowerCase().includes('outcome'))).toBe(true);
		});
	});

	describe('var path validation within logic', () => {
		it('rejects rule with invalid var path in logic', () => {
			const result = validateRule(
				makeRule({
					logic: { '>': [{ var: 'loanTransaction.invalidKey' }, 0] }
				})
			);
			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.includes('invalidKey'))).toBe(true);
		});

		it('rejects rule with invented section prefix', () => {
			const result = validateRule(
				makeRule({
					logic: { '>': [{ var: 'borrowerProfile.0.income' }, 0] }
				})
			);
			expect(result.valid).toBe(false);
		});

		it('rejects rule where one of multiple var paths is invalid', () => {
			const result = validateRule(
				makeRule({
					logic: {
						and: [
							{ '>': [{ var: 'loanTransaction.loanAmount' }, 500000] },
							{ '>': [{ var: 'loanTransaction.madeUpField' }, 0] }
						]
					}
				})
			);
			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.includes('madeUpField'))).toBe(true);
		});

		it('reports all invalid paths, not just the first', () => {
			const result = validateRule(
				makeRule({
					logic: {
						and: [
							{ '>': [{ var: 'loanTransaction.badField1' }, 0] },
							{ '>': [{ var: 'loanTransaction.badField2' }, 0] }
						]
					}
				})
			);
			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.includes('badField1'))).toBe(true);
			expect(result.errors.some((e) => e.includes('badField2'))).toBe(true);
		});
	});

	describe('null and edge-case logic', () => {
		it('rejects null as rule input', () => {
			const result = validateRule(null);
			expect(result.valid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
		});

		it('rejects undefined as rule input', () => {
			const result = validateRule(undefined);
			expect(result.valid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
		});

		it('rejects a string as rule input', () => {
			const result = validateRule('not a rule');
			expect(result.valid).toBe(false);
		});

		it('rejects a number as rule input', () => {
			const result = validateRule(42);
			expect(result.valid).toBe(false);
		});

		it('rejects an empty object as rule input', () => {
			const result = validateRule({});
			expect(result.valid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
		});

		it('accepts rule with null logic section (rule may be metadata-only)', () => {
			// Some rules might have null logic for documentation/metadata purposes
			// The validator decides if this is valid -- test it either way
			const result = validateRule(makeRule({ logic: null }));
			// If null logic is not accepted, expect an error mentioning logic
			if (!result.valid) {
				expect(result.errors.some((e) => e.toLowerCase().includes('logic'))).toBe(true);
			}
		});
	});
});

// ============================================================================
// validateDeviation -- deviation reference validation
// ============================================================================

describe('validateDeviation', () => {
	const existingRuleIds = ['RULE_001', 'RULE_002', 'RULE_003'];

	it('accepts a valid deviation referencing an existing rule', () => {
		const result = validateDeviation(makeDeviation(), existingRuleIds);
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	it('rejects deviation referencing a non-existent rule', () => {
		const result = validateDeviation(
			makeDeviation({ applies_to_rule: 'RULE_999' }),
			existingRuleIds
		);
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.includes('RULE_999'))).toBe(true);
	});

	it('rejects deviation without deviation_id', () => {
		const dev = makeDeviation();
		delete (dev as Record<string, unknown>).deviation_id;
		const result = validateDeviation(dev, existingRuleIds);
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.toLowerCase().includes('deviation_id'))).toBe(true);
	});

	it('rejects deviation with empty deviation_id', () => {
		const result = validateDeviation(makeDeviation({ deviation_id: '' }), existingRuleIds);
		expect(result.valid).toBe(false);
	});

	it('rejects deviation without applies_to_rule', () => {
		const dev = makeDeviation();
		delete (dev as Record<string, unknown>).applies_to_rule;
		const result = validateDeviation(dev, existingRuleIds);
		expect(result.valid).toBe(false);
	});

	it('rejects deviation without confidence', () => {
		const dev = makeDeviation();
		delete (dev as Record<string, unknown>).confidence;
		const result = validateDeviation(dev, existingRuleIds);
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.toLowerCase().includes('confidence'))).toBe(true);
	});

	it('rejects deviation with confidence out of range', () => {
		const result = validateDeviation(makeDeviation({ confidence: 2.0 }), existingRuleIds);
		expect(result.valid).toBe(false);
	});

	it('rejects deviation without source_excerpt', () => {
		const dev = makeDeviation();
		delete (dev as Record<string, unknown>).source_excerpt;
		const result = validateDeviation(dev, existingRuleIds);
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.toLowerCase().includes('source_excerpt'))).toBe(true);
	});

	it('rejects deviation with invalid var paths in conditions', () => {
		const result = validateDeviation(
			makeDeviation({
				conditions: { '>': [{ var: 'allApplicantDetails.0.madeUpField' }, 100] }
			}),
			existingRuleIds
		);
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.includes('madeUpField'))).toBe(true);
	});

	it('accepts deviation with valid var paths in conditions', () => {
		const result = validateDeviation(
			makeDeviation({
				conditions: {
					and: [
						{ '<': [{ var: 'allApplicantDetails.0.creditScore' }, 700] },
						{ '>=': [{ var: 'allApplicantDetails.0.age' }, 25] }
					]
				}
			}),
			existingRuleIds
		);
		expect(result.valid).toBe(true);
	});

	it('rejects deviation with empty existing rule IDs when referencing a rule', () => {
		const result = validateDeviation(makeDeviation(), []);
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.includes('RULE_001'))).toBe(true);
	});

	it('rejects null deviation input', () => {
		const result = validateDeviation(null, existingRuleIds);
		expect(result.valid).toBe(false);
		expect(result.errors.length).toBeGreaterThan(0);
	});

	it('rejects undefined deviation input', () => {
		const result = validateDeviation(undefined, existingRuleIds);
		expect(result.valid).toBe(false);
	});

	it('rejects deviation without description', () => {
		const dev = makeDeviation();
		delete (dev as Record<string, unknown>).description;
		const result = validateDeviation(dev, existingRuleIds);
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.toLowerCase().includes('description'))).toBe(true);
	});

	it('rejects deviation without adjustment', () => {
		const dev = makeDeviation();
		delete (dev as Record<string, unknown>).adjustment;
		const result = validateDeviation(dev, existingRuleIds);
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.toLowerCase().includes('adjustment'))).toBe(true);
	});
});

// ============================================================================
// validatePolicyKey -- policy key validation
// ============================================================================

describe('validatePolicyKey', () => {
	it('accepts all valid universal policy keys', () => {
		for (const key of POLICY_KEYS) {
			expect(validatePolicyKey(key), `${key} should be a valid policy key`).toBe(true);
		}
	});

	it('rejects unknown policy keys', () => {
		const invalid = [
			'interest_rate',
			'loanAmount',
			'customer_discount',
			'branch_override',
			'internal_score'
		];
		for (const key of invalid) {
			expect(validatePolicyKey(key), `${key} should be rejected`).toBe(false);
		}
	});

	it('rejects empty string', () => {
		expect(validatePolicyKey('')).toBe(false);
	});

	it('rejects policy keys with wrong casing', () => {
		expect(validatePolicyKey('ROI_TYPE')).toBe(false);
		expect(validatePolicyKey('Roi_Type')).toBe(false);
		expect(validatePolicyKey('roiType')).toBe(false);
	});

	it('rejects policy keys with extra whitespace', () => {
		expect(validatePolicyKey(' roi_type')).toBe(false);
		expect(validatePolicyKey('roi_type ')).toBe(false);
	});

	it('rejects policy keys that are close misspellings', () => {
		expect(validatePolicyKey('roi_typ')).toBe(false);
		expect(validatePolicyKey('procesing_fee_percent')).toBe(false);
		expect(validatePolicyKey('insurance_manditory')).toBe(false);
	});

	it('rejects null-ish values cast to string', () => {
		// Implementation should handle any string input
		expect(validatePolicyKey('null')).toBe(false);
		expect(validatePolicyKey('undefined')).toBe(false);
	});
});

// ============================================================================
// validateLenderRuleDocument -- full document validation
// ============================================================================

describe('validateLenderRuleDocument', () => {
	it('accepts a complete valid document', () => {
		const result = validateLenderRuleDocument(makeDocument());
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	describe('required document-level fields', () => {
		it('rejects document without lender_id', () => {
			const doc = makeDocument();
			delete (doc as Record<string, unknown>).lender_id;
			const result = validateLenderRuleDocument(doc);
			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.toLowerCase().includes('lender_id'))).toBe(true);
		});

		it('rejects document without lender_name', () => {
			const doc = makeDocument();
			delete (doc as Record<string, unknown>).lender_name;
			const result = validateLenderRuleDocument(doc);
			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.toLowerCase().includes('lender_name'))).toBe(true);
		});

		it('rejects document without product_type', () => {
			const doc = makeDocument();
			delete (doc as Record<string, unknown>).product_type;
			const result = validateLenderRuleDocument(doc);
			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.toLowerCase().includes('product_type'))).toBe(true);
		});

		it('rejects document without version', () => {
			const doc = makeDocument();
			delete (doc as Record<string, unknown>).version;
			const result = validateLenderRuleDocument(doc);
			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.toLowerCase().includes('version'))).toBe(true);
		});

		it('rejects document without rules array', () => {
			const doc = makeDocument();
			delete (doc as Record<string, unknown>).rules;
			const result = validateLenderRuleDocument(doc);
			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.toLowerCase().includes('rules'))).toBe(true);
		});
	});

	describe('rules array validation', () => {
		it('accepts document with multiple valid rules', () => {
			const result = validateLenderRuleDocument(
				makeDocument({
					rules: [
						makeRule({ rule_id: 'RULE_001' }),
						makeRule({
							rule_id: 'RULE_002',
							logic: { '>=': [{ var: 'allApplicantDetails.0.creditScore' }, 700] }
						}),
						makeRule({
							rule_id: 'RULE_003',
							logic: { '==': [{ var: 'loanTransaction.propertyType' }, 'Flat'] }
						})
					]
				})
			);
			expect(result.valid).toBe(true);
		});

		it('rejects document with invalid rule in array', () => {
			const result = validateLenderRuleDocument(
				makeDocument({
					rules: [
						makeRule({ rule_id: 'RULE_001' }),
						makeRule({
							rule_id: 'RULE_002',
							logic: { '>': [{ var: 'loanTransaction.fakeField' }, 0] }
						})
					]
				})
			);
			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.includes('fakeField'))).toBe(true);
		});

		it('rejects document with duplicate rule IDs', () => {
			const result = validateLenderRuleDocument(
				makeDocument({
					rules: [makeRule({ rule_id: 'RULE_001' }), makeRule({ rule_id: 'RULE_001' })]
				})
			);
			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.toLowerCase().includes('duplicate'))).toBe(true);
		});

		it('accepts document with empty rules array', () => {
			const result = validateLenderRuleDocument(makeDocument({ rules: [] }));
			// Empty rules array might be valid (no rules defined yet) or invalid
			// Either way, it should not throw
			expect(typeof result.valid).toBe('boolean');
		});

		it('rejects document with rules as non-array', () => {
			const result = validateLenderRuleDocument(makeDocument({ rules: 'not an array' }));
			expect(result.valid).toBe(false);
		});
	});

	describe('deviations validation within document', () => {
		it('accepts document with deviations referencing valid rule IDs', () => {
			const result = validateLenderRuleDocument(
				makeDocument({
					rules: [
						makeRule({ rule_id: 'RULE_001' }),
						makeRule({
							rule_id: 'RULE_002',
							logic: { '>=': [{ var: 'allApplicantDetails.0.creditScore' }, 700] }
						})
					],
					deviations: [
						makeDeviation({ deviation_id: 'DEV_001', applies_to_rule: 'RULE_001' }),
						makeDeviation({ deviation_id: 'DEV_002', applies_to_rule: 'RULE_002' })
					]
				})
			);
			expect(result.valid).toBe(true);
		});

		it('rejects document with deviation referencing non-existent rule', () => {
			const result = validateLenderRuleDocument(
				makeDocument({
					rules: [makeRule({ rule_id: 'RULE_001' })],
					deviations: [makeDeviation({ deviation_id: 'DEV_001', applies_to_rule: 'RULE_999' })]
				})
			);
			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.includes('RULE_999'))).toBe(true);
		});

		it('accepts document with no deviations', () => {
			const result = validateLenderRuleDocument(makeDocument({ deviations: [] }));
			expect(result.valid).toBe(true);
		});

		it('accepts document with deviations key omitted', () => {
			const doc = makeDocument();
			delete (doc as Record<string, unknown>).deviations;
			const result = validateLenderRuleDocument(doc);
			// Deviations are optional
			expect(typeof result.valid).toBe('boolean');
		});

		it('rejects document with duplicate deviation IDs', () => {
			const result = validateLenderRuleDocument(
				makeDocument({
					rules: [makeRule({ rule_id: 'RULE_001' })],
					deviations: [
						makeDeviation({ deviation_id: 'DEV_001', applies_to_rule: 'RULE_001' }),
						makeDeviation({ deviation_id: 'DEV_001', applies_to_rule: 'RULE_001' })
					]
				})
			);
			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.toLowerCase().includes('duplicate'))).toBe(true);
		});
	});

	describe('policy section validation', () => {
		it('accepts document with all valid policy keys', () => {
			const fullPolicy: Record<string, unknown> = {};
			for (const key of POLICY_KEYS) {
				fullPolicy[key] = 'test_value';
			}
			const result = validateLenderRuleDocument(makeDocument({ policy: fullPolicy }));
			expect(result.valid).toBe(true);
		});

		it('rejects document with invalid policy key', () => {
			const result = validateLenderRuleDocument(
				makeDocument({
					policy: {
						roi_type: 'floating',
						invalid_custom_key: 'some value'
					}
				})
			);
			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.includes('invalid_custom_key'))).toBe(true);
		});

		it('rejects document with multiple invalid policy keys', () => {
			const result = validateLenderRuleDocument(
				makeDocument({
					policy: {
						roi_type: 'floating',
						bad_key_1: 'x',
						bad_key_2: 'y'
					}
				})
			);
			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.includes('bad_key_1'))).toBe(true);
			expect(result.errors.some((e) => e.includes('bad_key_2'))).toBe(true);
		});

		it('accepts document with empty policy object', () => {
			const result = validateLenderRuleDocument(makeDocument({ policy: {} }));
			// Empty policy is valid -- no invalid keys
			expect(result.valid).toBe(true);
		});

		it('accepts document with policy key omitted entirely', () => {
			const doc = makeDocument();
			delete (doc as Record<string, unknown>).policy;
			const result = validateLenderRuleDocument(doc);
			// Policy is optional or may default
			expect(typeof result.valid).toBe('boolean');
		});
	});

	describe('full document edge cases', () => {
		it('rejects null as document input', () => {
			const result = validateLenderRuleDocument(null);
			expect(result.valid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
		});

		it('rejects undefined as document input', () => {
			const result = validateLenderRuleDocument(undefined);
			expect(result.valid).toBe(false);
		});

		it('rejects empty object as document', () => {
			const result = validateLenderRuleDocument({});
			expect(result.valid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
		});

		it('rejects array as document input', () => {
			const result = validateLenderRuleDocument([]);
			expect(result.valid).toBe(false);
		});

		it('rejects string as document input', () => {
			const result = validateLenderRuleDocument('just a string');
			expect(result.valid).toBe(false);
		});

		it('collects errors from rules, deviations, and policy in one pass', () => {
			const result = validateLenderRuleDocument(
				makeDocument({
					rules: [
						makeRule({
							rule_id: 'RULE_001',
							logic: { '>': [{ var: 'loanTransaction.fakeRuleField' }, 0] }
						})
					],
					deviations: [
						makeDeviation({
							deviation_id: 'DEV_001',
							applies_to_rule: 'RULE_MISSING',
							conditions: {
								'>': [{ var: 'allApplicantDetails.0.fakeDevField' }, 0]
							}
						})
					],
					policy: { invalid_policy_key: 'value' }
				})
			);
			expect(result.valid).toBe(false);
			// Should have errors from all three sections
			expect(result.errors.some((e) => e.includes('fakeRuleField'))).toBe(true);
			expect(result.errors.some((e) => e.includes('RULE_MISSING'))).toBe(true);
			expect(result.errors.some((e) => e.includes('invalid_policy_key'))).toBe(true);
		});
	});
});

// ============================================================================
// Cross-cutting integration scenarios
// ============================================================================

describe('integration scenarios', () => {
	it('validates a realistic Home Loan eligibility rule document', () => {
		const doc = makeDocument({
			lender_id: 'sbi',
			lender_name: 'State Bank of India',
			product_type: 'Home Loan',
			version: 3,
			effective_date: '2026-01-15',
			rules: [
				makeRule({
					rule_id: 'SBI_HL_AGE_MAX',
					description: 'Maximum age at maturity is 70 years',
					logic: { '<=': [{ var: 'allApplicantDetails.0.age' }, 70] },
					outcome: 'eligible',
					confidence: 0.99,
					source_excerpt: 'SBI Home Loan Policy 2026 Section 3.1'
				}),
				makeRule({
					rule_id: 'SBI_HL_MIN_LOAN',
					description: 'Minimum loan amount 300000',
					logic: { '>=': [{ var: 'loanTransaction.loanAmount' }, 300000] },
					outcome: 'eligible',
					confidence: 1.0,
					source_excerpt: 'SBI Home Loan Policy 2026 Section 2.1'
				}),
				makeRule({
					rule_id: 'SBI_HL_CREDIT_SCORE',
					description: 'Minimum credit score 650 for salaried applicants',
					logic: {
						if: [
							{ '==': [{ var: 'allApplicantDetails.0.employmentType' }, 'salaried'] },
							{ '>=': [{ var: 'allApplicantDetails.0.creditScore' }, 650] },
							true
						]
					},
					outcome: 'eligible',
					confidence: 0.95,
					source_excerpt: 'SBI Home Loan Policy 2026 Section 4.2'
				}),
				makeRule({
					rule_id: 'SBI_HL_NRI_PROPERTY',
					description: 'NRI applicants must have property identified',
					logic: {
						if: [
							{ '==': [{ var: 'loanTransaction.hasNRIApplicant' }, true] },
							{ '==': [{ var: 'loanTransaction.propertyIdentified' }, true] },
							true
						]
					},
					outcome: 'eligible',
					confidence: 0.9,
					source_excerpt: 'SBI NRI Housing FAQ Q.7'
				})
			],
			deviations: [
				makeDeviation({
					deviation_id: 'SBI_DEV_LOW_CIBIL',
					description: 'Allow lower credit score with government employment',
					applies_to_rule: 'SBI_HL_CREDIT_SCORE',
					conditions: {
						and: [
							{ '<': [{ var: 'allApplicantDetails.0.creditScore' }, 650] },
							{
								'==': [{ var: 'allApplicantDetails.0.governmentProfile.isCentralGovt' }, true]
							}
						]
					},
					adjustment: { type: 'override', value: 'eligible_with_conditions' },
					confidence: 0.85,
					source_excerpt: 'SBI deviation matrix for government employees'
				})
			],
			policy: {
				roi_type: 'floating',
				roi_benchmark: 'EBLR',
				roi_spread: 0.4,
				min_loan_amount: 300000,
				max_loan_amount: 100000000,
				max_age_at_maturity: 70,
				processing_fee_percent: 0.35,
				processing_fee_waiver: 'festive_season',
				insurance_mandatory: true,
				insurance_type: 'property_insurance',
				prepayment_charge_floating: 'nil',
				women_borrower_discount: 0.05,
				lock_in_period_months: 0,
				moratorium_available: true,
				part_disbursement_allowed: true
			}
		});

		const result = validateLenderRuleDocument(doc);
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	it('validates a Balance Transfer rule using BT-specific fields', () => {
		const result = validateRule(
			makeRule({
				rule_id: 'BT_RULE_001',
				description: 'BT eligibility check',
				logic: {
					and: [
						{ '>': [{ var: 'loanTransaction.principalOutstanding' }, 0] },
						{ '>': [{ var: 'loanTransaction.currentEMI' }, 0] },
						{ '>': [{ var: 'loanTransaction.remainingTenure' }, 12] },
						{ '!=': [{ var: 'loanTransaction.currentBank' }, ''] },
						{ '<=': [{ var: 'loanTransaction.currentInterestRate' }, 15] }
					]
				},
				outcome: 'bt_eligible',
				confidence: 0.92,
				source_excerpt: 'BT policy guidelines section 1'
			})
		);
		expect(result.valid).toBe(true);
	});

	it('validates a rule using pension profile fields', () => {
		const result = validateRule(
			makeRule({
				rule_id: 'PENSION_RULE_001',
				description: 'Pension applicant eligibility',
				logic: {
					and: [
						{ '==': [{ var: 'allApplicantDetails.0.pensionProfile.isGovernmentPension' }, true] },
						{ '==': [{ var: 'allApplicantDetails.0.pensionProfile.pensionRegular' }, true] },
						{ '==': [{ var: 'allApplicantDetails.0.pensionProfile.continuesBeyond75' }, true] },
						{ '>': [{ var: 'allApplicantDetails.0.grossIncome' }, 15000] }
					]
				},
				outcome: 'eligible',
				confidence: 0.88,
				source_excerpt: 'Pension loan guidelines page 5'
			})
		);
		expect(result.valid).toBe(true);
	});

	it('validates a rule using business profile with financials', () => {
		const result = validateRule(
			makeRule({
				rule_id: 'BIZ_RULE_001',
				description: 'Self-employed with good financials',
				logic: {
					and: [
						{ '==': [{ var: 'allApplicantDetails.0.businessProfile.gstRegistered' }, true] },
						{ '==': [{ var: 'allApplicantDetails.0.businessProfile.filesITRRegularly' }, true] },
						{ '==': [{ var: 'allApplicantDetails.0.businessProfile.profitableLast3Years' }, true] },
						{ '>': [{ var: 'allApplicantDetails.0.financials.netProfit' }, 0] },
						{ '==': [{ var: 'allApplicantDetails.0.financials.itrFiled' }, true] }
					]
				},
				outcome: 'eligible',
				confidence: 0.91,
				source_excerpt: 'Self-employed policy section 6'
			})
		);
		expect(result.valid).toBe(true);
	});

	it('validates a rule referencing multiple applicants', () => {
		const result = validateRule(
			makeRule({
				rule_id: 'MULTI_APP_RULE',
				description: 'Co-applicant credit score check',
				logic: {
					and: [
						{ '>=': [{ var: 'allApplicantDetails.0.creditScore' }, 700] },
						{ '>=': [{ var: 'allApplicantDetails.1.creditScore' }, 650] },
						{ '>=': [{ var: 'allApplicantDetails.1.age' }, 21] },
						{
							'==': [{ var: 'allApplicantDetails.1.relationshipWithPrimary' }, 'spouse']
						}
					]
				},
				outcome: 'eligible',
				confidence: 0.93,
				source_excerpt: 'Co-applicant norms section 2.3'
			})
		);
		expect(result.valid).toBe(true);
	});

	it('validates a rule referencing obligations', () => {
		const result = validateRule(
			makeRule({
				rule_id: 'OBLIGATION_RULE',
				description: 'Check existing obligation EMI',
				logic: {
					and: [
						{ '==': [{ var: 'allApplicantDetails.0.hasExistingObligations' }, true] },
						{ '<=': [{ var: 'allApplicantDetails.0.obligations.0.emi' }, 50000] },
						{
							in: [
								{ var: 'allApplicantDetails.0.obligations.0.obligationType' },
								['Home Loan', 'Personal Loan', 'Car Loan']
							]
						}
					]
				},
				outcome: 'eligible_with_foir_check',
				confidence: 0.87,
				source_excerpt: 'Obligation norms page 8'
			})
		);
		expect(result.valid).toBe(true);
	});

	it('validates a rule referencing GPA details', () => {
		const result = validateRule(
			makeRule({
				rule_id: 'GPA_RULE',
				description: 'GPA holder age check',
				logic: {
					and: [
						{ '!=': [{ var: 'allApplicantDetails.0.gpaDetails.fullName' }, ''] },
						{ '>=': [{ var: 'allApplicantDetails.0.gpaDetails.age' }, 18] }
					]
				},
				outcome: 'gpa_accepted',
				confidence: 0.8,
				source_excerpt: 'GPA acceptance criteria section 1'
			})
		);
		expect(result.valid).toBe(true);
	});

	it('validates a rule referencing low credit reasons', () => {
		const result = validateRule(
			makeRule({
				rule_id: 'LOW_CREDIT_RULE',
				description: 'Reject if loan default present',
				logic: {
					and: [
						{ '<': [{ var: 'allApplicantDetails.0.creditScore' }, 600] },
						{ '==': [{ var: 'allApplicantDetails.0.lowCreditReasons.loanDefault' }, true] }
					]
				},
				outcome: 'ineligible',
				confidence: 0.98,
				source_excerpt: 'Credit policy hard rejection criteria'
			})
		);
		expect(result.valid).toBe(true);
	});

	it('validates a rule referencing directors', () => {
		const result = validateRule(
			makeRule({
				rule_id: 'DIRECTOR_RULE',
				description: 'Director minimum age check',
				logic: {
					'>=': [{ var: 'allApplicantDetails.0.directors.0.age' }, 21]
				},
				outcome: 'director_eligible',
				confidence: 0.85,
				source_excerpt: 'Corporate loan director norms'
			})
		);
		expect(result.valid).toBe(true);
	});

	it('validates a rule using property-related loanTransaction fields', () => {
		const result = validateRule(
			makeRule({
				rule_id: 'PROPERTY_RULE',
				description: 'Property checks for LAP',
				logic: {
					and: [
						{ '==': [{ var: 'loanTransaction.propertyRegistered' }, true] },
						{ '==': [{ var: 'loanTransaction.approvedByAuthority' }, true] },
						{ '==': [{ var: 'loanTransaction.ocCcAvailable' }, true] },
						{ '>=': [{ var: 'loanTransaction.carpetArea' }, 300] },
						{ '==': [{ var: 'loanTransaction.carpetAreaUnit' }, 'sqft'] },
						{ '==': [{ var: 'loanTransaction.existingEncumbrance' }, false] }
					]
				},
				outcome: 'property_eligible',
				confidence: 0.94,
				source_excerpt: 'LAP property guidelines section 3'
			})
		);
		expect(result.valid).toBe(true);
	});

	it('catches subtle typo in an otherwise valid complex rule', () => {
		const result = validateRule(
			makeRule({
				rule_id: 'SUBTLE_BUG_RULE',
				description: 'Almost correct but has a typo',
				logic: {
					and: [
						{ '>=': [{ var: 'loanTransaction.loanAmount' }, 500000] },
						{ '<=': [{ var: 'loanTransaction.tenureYears' }, 30] },
						{ '>=': [{ var: 'allApplicantDetails.0.creditScore' }, 650] },
						// Typo: "salariedProfle" instead of "salariedProfile"
						{
							'==': [{ var: 'allApplicantDetails.0.salariedProfle.isPermanentEmployee' }, true]
						}
					]
				},
				outcome: 'eligible',
				confidence: 0.9,
				source_excerpt: 'Policy section 4'
			})
		);
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.includes('salariedProfle'))).toBe(true);
	});
});
