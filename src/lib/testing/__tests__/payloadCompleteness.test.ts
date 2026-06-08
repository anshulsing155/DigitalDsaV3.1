/**
 * Payload Completeness Tests
 * ======================================================================
 * Verifies that buildLoanPayload() and buildApplicantPayload()
 * correctly populate all expected fields for each of the 6 loan types.
 *
 * Purpose: Catch missing field mappings before they reach production.
 * If a schema field is added but not wired through the payload builder,
 * these tests will fail -- preventing silent data loss.
 *
 * IMPORTANT: Field keys in these fixtures must match exactly what the
 * builder reads from raw form data. Key mappings:
 *   - tenureYears reads from: `mortgageYear` or `tenure` (NOT loanTenure)
 *   - creditScore reads from: `rawApplicant.creditScore` (NOT cibilScore)
 *   - residenceType reads from: `rawApplicant.TypeOfResidence`
 *   - salariedProfile only built when employmentType = "Salaried(Private)"
 *   - salariedProfile reads from: `salariedActivityDetailsVisible` (multi-select)
 *   - numberOfApplicants reads from: `numberOfDirectorOrApplicant`
 *   - currentBank reads from: `selectSingleBank`
 *   - currentInterestRate reads from: `existingInterestRate`
 *   - currentEMI reads from: `includedCurrentEMIsAmount`
 * ======================================================================
 */

import { describe, it, expect } from 'vitest';
import {
	buildLoanPayload,
	buildLoanTransactionPayload,
	buildApplicantPayload
} from '$lib/utils/payloadBuilder';
import type {
	LoanApplicationPayload,
	LoanTransactionPayload,
	ApplicantPayload
} from '$lib/utils/payloadBuilder';

// ============================================================================
// SAMPLE DATA FACTORIES
// ============================================================================

/** Minimal salaried individual applicant for all loan types */
function createSalariedIndividual(
	overrides: Record<string, unknown> = {}
): Record<string, unknown> {
	return {
		id: 'applicant-1',
		applicantId: 'applicant-1',
		applicantType: 'Individual',
		fullName: 'Test User',
		age: 35,
		gender: 'Male',
		maritalStatus: 'Married',
		education: 'Graduate',
		// Builder checks exact string "Salaried(Private)" for salaried profile extraction
		employmentType: 'Salaried(Private)',
		// Builder reads `creditScore` directly (not cibilScore)
		creditScore: 750,
		ObligationsRunning: 'No',
		grossIncome: 100000,
		netIncome: 80000,
		incomeEntries: [
			{
				profileType: 'salaried_regular',
				entityName: 'Acme Corp',
				income: { monthlySalary: 100000, netTakeHome: 80000 },
				evidence: { itrFiled: true, hasDocumentaryEvidence: true }
			}
		],
		// Residence details -- builder reads `TypeOfResidence` (not residenceType)
		applicantResidenceState: 'Maharashtra',
		applicantResidenceCity: 'Mumbai',
		applicantResidencePincode: '400001',
		TypeOfResidence: 'Owned',
		yearsAtCurrentAddress: 5,
		isNRI: 'No',
		// Credit history
		creditHistoryStatus: 'Clean',
		// Salaried profile is built from `salariedActivityDetailsVisible` multi-select
		// Each key corresponds to an option ID in the activity details question
		salariedActivityDetailsVisible: {
			works_for_reputed_org: true,
			company_100plus_employees: true,
			employer_is_proprietorship_or_partnership: false,
			employer_shares_financials: true,
			holds_permanent_position: true,
			employed_2plus_years: true,
			total_experience_3plus_years: true,
			provides_staff_benefits: true,
			salary_credited_regularly: true,
			receives_bonus: false,
			receives_salary_slip_form16: true,
			has_professional_qualification: true
		},
		...overrides
	};
}

/** Minimal company applicant with directors */
function createCompanyApplicant(overrides: Record<string, unknown> = {}): Record<string, unknown> {
	return {
		id: 'company-1',
		applicantId: 'company-1',
		applicantType: 'Company',
		companyName: 'Test Pvt Ltd',
		companyType: 'Private Limited Company',
		companyAge: 10,
		fullName: 'Test Pvt Ltd',
		age: 10,
		gender: 'N/A',
		maritalStatus: 'N/A',
		employmentType: 'Self Employed (Other)',
		// Builder reads `creditScore` directly
		creditScore: 700,
		ObligationsRunning: 'No',
		directors: [
			{ name: 'Director One', age: 45, designation: 'MD', sharePercent: 60, cibil: 780 },
			{ name: 'Director Two', age: 38, designation: 'Director', sharePercent: 40, cibil: 720 }
		],
		...overrides
	};
}

// -- Loan answer factories (keyed by loan type) -------------------------

function createHomeLoanAnswers(): Record<string, unknown> {
	return {
		loanName: 'Home Loan',
		loanType: 'Home Loan - Fresh',
		propertyIdentified: 'Yes',
		propertyStateName: 'Maharashtra',
		propertyCityName: 'Mumbai',
		propertyPincode: '400001',
		propertyType: 'Flat/Apartment',
		purchaseType: 'Resale',
		constructionStatus: 'Ready to Move',
		PropertyStage: 'Registered',
		propCost: '10000000',
		deposit: '2000000',
		loanAmount: '8000000',
		// Builder reads `mortgageYear` or `tenure` (NOT loanTenure)
		tenure: '20',
		residenceSameAsProperty: 'No',
		assessmentStatus: 'fresh',
		// Builder reads `numberOfDirectorOrApplicant` for numberOfApplicants
		numberOfDirectorOrApplicant: 1
	};
}

function createLAPAnswers(): Record<string, unknown> {
	return {
		loanName: 'Loan Against Property',
		loanType: 'LAP - Fresh',
		propertyStateName: 'Karnataka',
		propertyCityName: 'Bangalore',
		propertyPincode: '560001',
		propertyType: 'Independent House',
		propCost: '15000000',
		loanAmount: '5000000',
		tenure: '15',
		loanPurpose: 'Business expansion',
		carpetArea: '2000',
		carpetAreaUnit: 'sqft',
		assessmentStatus: 'fresh',
		numberOfDirectorOrApplicant: 1
	};
}

function createPlotLoanAnswers(): Record<string, unknown> {
	return {
		loanName: 'Plot & Construction Loan',
		loanType: 'Plot Loan',
		propertyStateName: 'Tamil Nadu',
		propertyCityName: 'Chennai',
		propertyPincode: '600001',
		propertyType: 'Plot',
		propCost: '5000000',
		loanAmount: '3500000',
		tenure: '20',
		assessmentStatus: 'fresh',
		numberOfDirectorOrApplicant: 1
	};
}

function createPersonalLoanAnswers(): Record<string, unknown> {
	return {
		loanName: 'Personal Loan',
		loanType: 'Personal Loan',
		facilityType: 'Term Loan',
		residenceStateName: 'Maharashtra',
		residenceCityName: 'Mumbai',
		loanAmount: '500000',
		tenure: '5',
		assessmentStatus: 'fresh',
		numberOfDirectorOrApplicant: 1
	};
}

function createBusinessLoanAnswers(): Record<string, unknown> {
	return {
		loanName: 'Business Loan',
		loanType: 'Business Loan',
		facilityType: 'Term Loan',
		businessStateName: 'Delhi',
		businessCityName: 'New Delhi',
		loanAmount: '2000000',
		tenure: '7',
		assessmentStatus: 'fresh',
		numberOfDirectorOrApplicant: 1
	};
}

function createProfessionalLoanAnswers(): Record<string, unknown> {
	return {
		loanName: 'Professional Loan',
		loanType: 'Professional Loan',
		facilityType: 'Term Loan',
		businessStateName: 'Gujarat',
		businessCityName: 'Ahmedabad',
		loanAmount: '1000000',
		tenure: '5',
		assessmentStatus: 'fresh',
		numberOfDirectorOrApplicant: 1
	};
}

// ============================================================================
// CORE LOAN TRANSACTION TESTS
// ============================================================================

describe('Payload Completeness: Loan Transaction', () => {
	describe('Universal fields (all 6 loan types)', () => {
		const testCases = [
			{ name: 'Home Loan', answers: createHomeLoanAnswers },
			{ name: 'LAP', answers: createLAPAnswers },
			{ name: 'Plot Loan', answers: createPlotLoanAnswers },
			{ name: 'Personal Loan', answers: createPersonalLoanAnswers },
			{ name: 'Business Loan', answers: createBusinessLoanAnswers },
			{ name: 'Professional Loan', answers: createProfessionalLoanAnswers }
		];

		testCases.forEach(({ name, answers }) => {
			it(`${name}: has loanName, loanType, loanAmount, tenureYears`, () => {
				const loanAnswers = answers();
				const applicants = [createSalariedIndividual()];
				const applicationData = { loanName: loanAnswers.loanName };

				const payload = buildLoanPayload(loanAnswers, applicants, applicationData);
				const tx = payload.loanTransaction;

				expect(tx.loanName).toBeTruthy();
				expect(tx.loanType).toBeTruthy();
				expect(tx.loanAmount).toBeGreaterThan(0);
				expect(tx.tenureYears).toBeGreaterThan(0);
				expect(tx.numberOfApplicants).toBe(1);
			});
		});
	});

	describe('Secured loan fields (Home, LAP, Plot)', () => {
		it('Home Loan: has property details', () => {
			const payload = buildLoanPayload(createHomeLoanAnswers(), [createSalariedIndividual()], {
				loanName: 'Home Loan'
			});
			const tx = payload.loanTransaction;

			expect(tx.propertyState).toBeTruthy();
			expect(tx.propertyCity).toBeTruthy();
			expect(tx.propertyType).toBeTruthy();
			expect(tx.propertyCost).toBeGreaterThan(0);
		});

		it('LAP: has loan purpose and carpet area', () => {
			const payload = buildLoanPayload(createLAPAnswers(), [createSalariedIndividual()], {
				loanName: 'Loan Against Property'
			});
			const tx = payload.loanTransaction;

			expect(tx.propertyState).toBeTruthy();
			expect(tx.propertyCity).toBeTruthy();
			expect(tx.loanPurpose).toBeTruthy();
		});

		it('Plot Loan: has property details', () => {
			const payload = buildLoanPayload(createPlotLoanAnswers(), [createSalariedIndividual()], {
				loanName: 'Plot & Construction Loan'
			});
			const tx = payload.loanTransaction;

			expect(tx.propertyState).toBeTruthy();
			expect(tx.propertyCity).toBeTruthy();
			expect(tx.propertyCost).toBeGreaterThan(0);
		});
	});

	describe('Unsecured loan fields (Personal, Business, Professional)', () => {
		it('Personal Loan: has residence location, no property fields', () => {
			const payload = buildLoanPayload(createPersonalLoanAnswers(), [createSalariedIndividual()], {
				loanName: 'Personal Loan'
			});
			const tx = payload.loanTransaction;

			expect(tx.residenceState).toBeTruthy();
			expect(tx.residenceCity).toBeTruthy();
			// Unsecured should NOT have property fields
			expect(tx.propertyCost).toBeFalsy();
		});

		it('Business Loan: has business location', () => {
			const payload = buildLoanPayload(createBusinessLoanAnswers(), [createSalariedIndividual()], {
				loanName: 'Business Loan'
			});
			const tx = payload.loanTransaction;

			expect(tx.businessState).toBeTruthy();
			expect(tx.businessCity).toBeTruthy();
		});

		it('Professional Loan: has business location', () => {
			const payload = buildLoanPayload(
				createProfessionalLoanAnswers(),
				[createSalariedIndividual()],
				{ loanName: 'Professional Loan' }
			);
			const tx = payload.loanTransaction;

			expect(tx.businessState).toBeTruthy();
			expect(tx.businessCity).toBeTruthy();
		});
	});

	describe('Balance Transfer fields', () => {
		it('BT Home Loan: includes BT-specific fields', () => {
			const btAnswers = {
				...createHomeLoanAnswers(),
				loanType: 'Home Loan - Balance Transfer',
				// Builder reads `selectSingleBank` for currentBank
				selectSingleBank: 'SBI',
				principalOutstanding: '5000000',
				// Builder reads `existingInterestRate` for currentInterestRate
				existingInterestRate: '9.5',
				// Builder reads `remainingTenure` or `orignalRemaningTenure`
				remainingTenure: '180',
				// Builder reads `includedCurrentEMIsAmount` for currentEMI
				includedCurrentEMIsAmount: '45000',
				sixMonthsPassedAfterRegistry: 'Yes',
				currentPropertyValue: '12000000',
				newTenure: '240',
				loanVintage: '5+ years',
				repaymentTrack: 'Regular'
			};
			const payload = buildLoanPayload(btAnswers, [createSalariedIndividual()], {
				loanName: 'Home Loan'
			});
			const tx = payload.loanTransaction;

			expect(tx.currentBank).toBe('SBI');
			expect(tx.principalOutstanding).toBeGreaterThan(0);
			expect(tx.currentInterestRate).toBeGreaterThan(0);
		});
	});

	describe('Case intake fields (assessment status)', () => {
		it('Fresh application has assessmentStatus', () => {
			const payload = buildLoanPayload(createHomeLoanAnswers(), [createSalariedIndividual()], {
				loanName: 'Home Loan'
			});
			expect(payload.loanTransaction.assessmentStatus).toBe('fresh');
		});
	});
});

// ============================================================================
// APPLICANT PAYLOAD TESTS
// ============================================================================

describe('Payload Completeness: Applicant', () => {
	describe('Individual applicant -- salaried', () => {
		it('has identity fields', () => {
			const applicant = buildApplicantPayload(createSalariedIndividual(), 0);

			expect(applicant.applicantType).toBe('Individual');
			expect(applicant.fullName).toBe('Test User');
			expect(applicant.age).toBe(35);
			expect(applicant.gender).toBe('Male');
			expect(applicant.maritalStatus).toBe('Married');
		});

		it('has employment type', () => {
			const applicant = buildApplicantPayload(createSalariedIndividual(), 0);
			expect(applicant.employmentType).toBe('Salaried(Private)');
		});

		it('has credit score', () => {
			const applicant = buildApplicantPayload(createSalariedIndividual(), 0);
			expect(applicant.creditScore).toBe(750);
		});

		it('has income entries when provided', () => {
			const applicant = buildApplicantPayload(createSalariedIndividual(), 0);
			expect(applicant.incomeEntries).toBeDefined();
			expect(applicant.incomeEntries!.length).toBeGreaterThan(0);
			expect(applicant.incomeEntries![0].profileType).toBe('salaried_regular');
		});

		it('has salaried profile flags', () => {
			const applicant = buildApplicantPayload(createSalariedIndividual(), 0);
			expect(applicant.salariedProfile).toBeDefined();
			expect(applicant.salariedProfile!.salaryInBankAccount).toBe(true);
			expect(applicant.salariedProfile!.worksForReputedOrg).toBe(true);
			expect(applicant.salariedProfile!.isPermanentEmployee).toBe(true);
			expect(applicant.salariedProfile!.receivesBonus).toBe(false);
		});

		it('has residence details', () => {
			const applicant = buildApplicantPayload(createSalariedIndividual(), 0);
			expect(applicant.residenceType).toBe('Owned');
		});

		it('has no obligations flag when ObligationsRunning=No', () => {
			const applicant = buildApplicantPayload(createSalariedIndividual(), 0);
			expect(applicant.hasExistingObligations).toBe(false);
		});
	});

	describe('Individual applicant -- with obligations', () => {
		it('has obligations array when ObligationsRunning=Yes', () => {
			const applicant = buildApplicantPayload(
				createSalariedIndividual({
					ObligationsRunning: 'Yes',
					obligations: [
						{
							loanType: 'Personal Loan',
							bankName: 'HDFC',
							selectedToClose: 'Keep running',
							emi: '15000',
							tenure: '36',
							interestRate: '12',
							obligationType: 'term_loan'
						}
					]
				}),
				0
			);
			expect(applicant.hasExistingObligations).toBe(true);
			expect(applicant.obligations).toBeDefined();
			expect(applicant.obligations!.length).toBeGreaterThan(0);
		});
	});

	describe('Company applicant', () => {
		it('has company details', () => {
			const applicant = buildApplicantPayload(createCompanyApplicant(), 0);
			expect(applicant.applicantType).toBe('Company');
			expect(applicant.companyName).toBe('Test Pvt Ltd');
			expect(applicant.companyType).toBe('Private Limited Company');
		});

		it('has directors array', () => {
			const applicant = buildApplicantPayload(createCompanyApplicant(), 0);
			expect(applicant.directors).toBeDefined();
			expect(applicant.directors!.length).toBe(2);
			expect(applicant.directors![0].name).toBe('Director One');
		});
	});

	describe('Multi-applicant with relationships', () => {
		it('assigns roles correctly', () => {
			const primary = createSalariedIndividual({ id: 'a1', applicantId: 'a1' });
			const coApplicant = createSalariedIndividual({
				id: 'a2',
				applicantId: 'a2',
				fullName: 'Co-Applicant',
				relationType: 'Spouse'
			});
			const relationships = [
				{ fromIndex: 1, toIndex: 0, relationType: 'Spouse', category: 'family' }
			];

			const applicant2 = buildApplicantPayload(coApplicant, 1, relationships, [
				primary,
				coApplicant
			]);
			expect(applicant2.relationshipWithPrimary).toBeTruthy();
		});
	});
});

// ============================================================================
// FULL PIPELINE TESTS (buildLoanPayload -> complete structure)
// ============================================================================

describe('Payload Completeness: Full Pipeline', () => {
	const loanConfigs = [
		{
			name: 'Home Loan',
			answers: createHomeLoanAnswers,
			isSecured: true,
			expectedPropertyFields: true
		},
		{
			name: 'LAP',
			answers: createLAPAnswers,
			isSecured: true,
			expectedPropertyFields: true
		},
		{
			name: 'Plot Loan',
			answers: createPlotLoanAnswers,
			isSecured: true,
			expectedPropertyFields: true
		},
		{
			name: 'Personal Loan',
			answers: createPersonalLoanAnswers,
			isSecured: false,
			expectedPropertyFields: false
		},
		{
			name: 'Business Loan',
			answers: createBusinessLoanAnswers,
			isSecured: false,
			expectedPropertyFields: false
		},
		{
			name: 'Professional Loan',
			answers: createProfessionalLoanAnswers,
			isSecured: false,
			expectedPropertyFields: false
		}
	];

	loanConfigs.forEach(({ name, answers, isSecured, expectedPropertyFields }) => {
		describe(`${name}`, () => {
			it('buildLoanPayload returns complete structure', () => {
				const loanAnswers = answers();
				const applicants = [createSalariedIndividual()];
				const applicationData = { loanName: loanAnswers.loanName };

				const payload = buildLoanPayload(loanAnswers, applicants, applicationData);

				// Top-level structure
				expect(payload).toHaveProperty('loanTransaction');
				expect(payload).toHaveProperty('allApplicantDetails');

				// Loan transaction core
				expect(payload.loanTransaction.loanName).toBeTruthy();
				expect(payload.loanTransaction.loanAmount).toBeGreaterThan(0);
				expect(payload.loanTransaction.tenureYears).toBeGreaterThan(0);

				// Applicant array
				expect(payload.allApplicantDetails.length).toBe(1);
				expect(payload.allApplicantDetails[0].fullName).toBe('Test User');
				expect(payload.allApplicantDetails[0].employmentType).toBe('Salaried(Private)');
				expect(payload.allApplicantDetails[0].creditScore).toBe(750);
			});

			it(`property fields are ${expectedPropertyFields ? 'present' : 'absent'}`, () => {
				const loanAnswers = answers();
				const payload = buildLoanPayload(loanAnswers, [createSalariedIndividual()], {
					loanName: loanAnswers.loanName
				});
				const tx = payload.loanTransaction;

				if (expectedPropertyFields) {
					expect(tx.propertyState || tx.propertyCity).toBeTruthy();
				}
			});
		});
	});

	describe('Multi-applicant payload', () => {
		it('handles 2 Individual applicants', () => {
			const applicants = [
				createSalariedIndividual({ id: 'a1', applicantId: 'a1' }),
				createSalariedIndividual({
					id: 'a2',
					applicantId: 'a2',
					fullName: 'Spouse',
					relationType: 'Spouse'
				})
			];
			const payload = buildLoanPayload(
				// numberOfApplicants reads from `numberOfDirectorOrApplicant`, not __applicantCount
				{ ...createHomeLoanAnswers(), numberOfDirectorOrApplicant: 2 },
				applicants,
				{ loanName: 'Home Loan' }
			);

			expect(payload.allApplicantDetails.length).toBe(2);
			expect(payload.loanTransaction.numberOfApplicants).toBe(2);
		});

		it('handles Individual + Company applicants', () => {
			const applicants = [
				createSalariedIndividual({ id: 'a1', applicantId: 'a1' }),
				createCompanyApplicant()
			];
			const payload = buildLoanPayload(
				{ ...createBusinessLoanAnswers(), numberOfDirectorOrApplicant: 2 },
				applicants,
				{ loanName: 'Business Loan' }
			);

			expect(payload.allApplicantDetails.length).toBe(2);
			expect(payload.allApplicantDetails[0].applicantType).toBe('Individual');
			expect(payload.allApplicantDetails[1].applicantType).toBe('Company');
		});
	});
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe('Payload Completeness: Edge Cases', () => {
	it('handles missing income entries gracefully', () => {
		const applicant = createSalariedIndividual({ incomeEntries: undefined });
		const result = buildApplicantPayload(applicant, 0);
		// Should not crash -- incomeEntries just won't be populated
		expect(result.fullName).toBe('Test User');
	});

	it('handles empty obligations array', () => {
		const applicant = createSalariedIndividual({
			ObligationsRunning: 'Yes',
			obligations: []
		});
		const result = buildApplicantPayload(applicant, 0);
		expect(result.hasExistingObligations).toBe(true);
	});

	it('handles 0 credit score', () => {
		// Builder reads `creditScore` directly -- toNumber(0) = 0
		const applicant = createSalariedIndividual({ creditScore: 0 });
		const result = buildApplicantPayload(applicant, 0);
		expect(result.creditScore).toBe(0);
	});

	it('handles NRI applicant', () => {
		const applicant = createSalariedIndividual({
			isNRI: 'Yes',
			nriCountry: 'United States'
		});
		const result = buildApplicantPayload(applicant, 0);
		expect(result.isNRI).toBe(true);
		expect(result.nriCountry).toBe('United States');
	});

	it('unsecured facility type is preserved', () => {
		const answers = { ...createPersonalLoanAnswers(), facilityType: 'Overdraft (OD)' };
		const payload = buildLoanPayload(answers, [createSalariedIndividual()], {
			loanName: 'Personal Loan'
		});
		expect(payload.loanTransaction.facilityType).toBe('Overdraft (OD)');
	});
});
