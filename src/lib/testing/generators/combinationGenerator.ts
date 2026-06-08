/**
 * Combination Generator - Creates test cases from filters or full automation
 */

import type {
	TestCase,
	TestSuite,
	TestDataFilters,
	GenerationConfig,
	GenerationResult,
	LoanName,
	EmploymentType,
	CityTier
} from '../types/testData.types';
import { ApplicantProfileGenerator, PropertyProfileGenerator } from './profileGenerator';
import {
	LOAN_NAMES,
	EMPLOYMENT_TYPES,
	SECURED_LOAN_NAMES,
	SALARIED_TYPES,
	SELF_EMPLOYED_TYPES
} from '../schema/schemaExtractor';

export class CombinationGenerator {
	private applicantGen: ApplicantProfileGenerator;
	private propertyGen: PropertyProfileGenerator;
	private seed: number;

	constructor(seed: number = Date.now()) {
		this.seed = seed;
		this.applicantGen = new ApplicantProfileGenerator(seed);
		this.propertyGen = new PropertyProfileGenerator(seed + 1);
	}

	/**
	 * Generate test cases based on configuration
	 */
	async generate(config: GenerationConfig): Promise<GenerationResult> {
		const startTime = Date.now();
		const testCases: TestCase[] = [];
		const errors: string[] = [];

		try {
			if (config.mode === 'full') {
				// Generate ALL possible combinations (use with caution!)
				const fullCombos = this.generateFullCombinations(config.limits?.maxCombinations || 5000);
				testCases.push(...fullCombos);
			} else if (config.mode === 'filtered' && config.filters) {
				// Generate based on filters
				const filteredCombos = this.generateFilteredCombinations(
					config.filters,
					config.limits?.maxCombinations
				);
				testCases.push(...filteredCombos);
			}

			// Generate variations if requested
			if (config.limits?.includeVariations) {
				const variations = this.generateVariations(testCases, config.limits.variationCount || 3);
				testCases.push(...variations);
			}
		} catch (error) {
			errors.push(error instanceof Error ? error.message : 'Unknown error');
		}

		const summary = this.generateSummary(testCases);

		return {
			success: errors.length === 0,
			totalGenerated: testCases.length,
			testCases,
			errors: errors.length > 0 ? errors : undefined,
			summary
		};
	}

	/**
	 * Generate test cases based on user-selected filters
	 */
	private generateFilteredCombinations(filters: TestDataFilters, maxCount?: number): TestCase[] {
		const testCases: TestCase[] = [];
		let generated = 0;

		// Get selected or all options
		const loanNames = filters.loanNames || this.getAllLoanNames();
		const employmentTypes = filters.employmentTypes || this.getAllEmploymentTypes();
		const cityTiers = filters.cityTiers || ['Metro', 'Tier1'];
		const propertyTypes = filters.propertyTypes || ['Flat', 'House'];

		// Generate combinations
		for (const loanName of loanNames) {
			for (const employmentType of employmentTypes) {
				// Determine tiers to generate based on filters
				const tiers = this.determineTiers(filters);

				for (const tier of tiers) {
					// Check if we need property (secured loans)
					const needsProperty = this.isSecuredLoan(loanName);

					if (needsProperty) {
						for (const cityTier of cityTiers) {
							for (const propertyType of propertyTypes) {
								if (maxCount && generated >= maxCount) {
									return testCases;
								}

								const testCase = this.createTestCase(
									loanName,
									employmentType,
									tier,
									cityTier,
									propertyType,
									filters
								);

								testCases.push(testCase);
								generated++;
							}
						}
					} else {
						// Unsecured loan - no property needed
						if (maxCount && generated >= maxCount) {
							return testCases;
						}

						const testCase = this.createTestCase(
							loanName,
							employmentType,
							tier,
							undefined,
							undefined,
							filters
						);

						testCases.push(testCase);
						generated++;
					}
				}
			}
		}

		return testCases;
	}

	/**
	 * Generate all possible combinations (limited by maxCount)
	 */
	private generateFullCombinations(maxCount: number): TestCase[] {
		const filters: TestDataFilters = {
			loanNames: this.getAllLoanNames(),
			employmentTypes: this.getAllEmploymentTypes(),
			cityTiers: ['Metro', 'Tier1', 'Tier2'],
			propertyTypes: ['Flat', 'House', 'Plot'],
			includeEdgeCases: true,
			includeNRI: true,
			includeJointApplicants: true
		};

		return this.generateFilteredCombinations(filters, maxCount);
	}

	/**
	 * Create a single test case
	 */
	private createTestCase(
		loanName: LoanName,
		employmentType: EmploymentType,
		tier: 1 | 2 | 3,
		cityTier?: CityTier,
		propertyType?: string,
		filters?: TestDataFilters
	): TestCase {
		// Generate applicant
		const applicant = this.applicantGen.generate(employmentType, tier, {
			isNRI: filters?.includeNRI
		});

		// Generate property if needed
		const property =
			cityTier && propertyType
				? this.propertyGen.generate(cityTier, propertyType, tier)
				: undefined;

		// Calculate loan amount based on property or default ranges
		const loanAmount = property
			? Math.floor(property.propertyCost * (property.expectedLTV / 100))
			: this.getDefaultLoanAmount(loanName, tier);

		// Calculate tenure
		const tenureYears = this.calculateTenure(applicant.age, loanName);

		// Determine expected result
		const expectedResult = this.determineExpectedResult(tier, applicant, property);

		const testCase: TestCase = {
			id: this.generateTestCaseId(),
			name: this.generateTestCaseName(loanName, employmentType, tier, cityTier),
			description: this.generateDescription(applicant, property, loanName),
			tags: this.generateTestCaseTags(loanName, employmentType, tier, filters),

			loanName,
			applicants: [applicant],
			property,

			loanAmount,
			tenureYears,
			loanPurpose: 'New Loan',

			expectedResult,
			expectedIssues:
				expectedResult === 'Fail' ? this.identifyPotentialIssues(applicant, property) : undefined,

			createdAt: new Date().toISOString(),
			createdBy: 'automated',
			source: filters ? `filter:${this.filtersToString(filters)}` : 'full-generation'
		};

		// Add joint applicants if requested
		if (filters?.includeJointApplicants && Math.random() > 0.7) {
			const coApplicant = this.applicantGen.generate(
				this.getRelatedEmploymentType(employmentType),
				tier
			);
			testCase.applicants.push(coApplicant);
			testCase.tags.push('joint-application');
		}

		return testCase;
	}

	/**
	 * Generate variations of existing test cases
	 */
	private generateVariations(baseTestCases: TestCase[], count: number): TestCase[] {
		const variations: TestCase[] = [];

		for (const baseCase of baseTestCases) {
			for (let i = 0; i < count; i++) {
				const variation = this.createVariation(baseCase, i + 1);
				variations.push(variation);
			}
		}

		return variations;
	}

	private createVariation(baseCase: TestCase, variationNum: number): TestCase {
		const varied = structuredClone(baseCase);
		varied.id = this.generateTestCaseId();
		varied.name = `${baseCase.name} - Variation ${variationNum}`;
		varied.tags.push(`variation-${variationNum}`);

		// Vary credit score
		varied.applicants[0].creditScore = Math.max(
			300,
			Math.min(900, varied.applicants[0].creditScore + (Math.random() - 0.5) * 100)
		);

		// Vary age slightly
		varied.applicants[0].age = Math.max(
			18,
			Math.min(80, varied.applicants[0].age + Math.floor((Math.random() - 0.5) * 4))
		);

		// Vary income
		if (varied.applicants[0].netIncome) {
			varied.applicants[0].netIncome = Math.floor(
				varied.applicants[0].netIncome * (0.9 + Math.random() * 0.2)
			);
		}

		return varied;
	}

	// ==================== HELPER METHODS ====================

	private getAllLoanNames(): LoanName[] {
		return [...LOAN_NAMES] as LoanName[];
	}

	private getAllEmploymentTypes(): EmploymentType[] {
		return [...EMPLOYMENT_TYPES] as EmploymentType[];
	}

	private determineTiers(filters: TestDataFilters): (1 | 2 | 3)[] {
		const tiers: (1 | 2 | 3)[] = [];

		// Always include tier 1 (prime)
		tiers.push(1);

		// Add tier 2 (standard)
		tiers.push(2);

		// Add tier 3 (subprime) if edge cases or low CIBIL included
		if (filters.includeEdgeCases || filters.includeLowCibil) {
			tiers.push(3);
		}

		return tiers;
	}

	private isSecuredLoan(loanName: LoanName): boolean {
		return SECURED_LOAN_NAMES.includes(loanName);
	}

	private getDefaultLoanAmount(loanName: LoanName, tier: 1 | 2 | 3): number {
		const ranges: Record<string, [number, number]> = {
			'Home Loan': [2000000, 10000000],
			'Business Loan': [500000, 5000000],
			'Personal Loan': [100000, 2000000],
			'Loan Against Property': [2000000, 15000000],
			'Plot Loan': [1500000, 8000000],
			'Professional Loan': [500000, 5000000]
		};

		const [min, max] = ranges[loanName] || [500000, 5000000];
		const factor = tier === 1 ? 0.8 : tier === 2 ? 0.5 : 0.3;

		return Math.floor(min + (max - min) * factor);
	}

	private calculateTenure(age: number, loanName: LoanName): number {
		const maxAge = 65; // Typical retirement age
		const maxTenure = Math.min(30, maxAge - age);

		const typicalTenures: Record<string, number> = {
			'Home Loan': 20,
			'Business Loan': 7,
			'Personal Loan': 5,
			'Loan Against Property': 15,
			'Plot Loan': 15,
			'Professional Loan': 7
		};

		const typical = typicalTenures[loanName] || 10;
		return Math.min(typical, maxTenure);
	}

	private determineExpectedResult(
		tier: 1 | 2 | 3,
		applicant: any,
		property?: any
	): 'Pass' | 'Fail' | 'Warning' {
		if (tier === 1 && applicant.creditScore >= 720) return 'Pass';
		if (tier === 3 || applicant.creditScore < 600) return 'Fail';
		if (applicant.creditScore < 650) return 'Warning';
		if (property && property.propertyComplianceStatus !== 'fully_compliant') return 'Warning';
		return tier === 2 ? 'Warning' : 'Pass';
	}

	private identifyPotentialIssues(applicant: any, property?: any): string[] {
		const issues: string[] = [];

		if (applicant.creditScore < 650) issues.push('Low CIBIL score');
		if (applicant.age > 55) issues.push('Age may limit tenure');
		if (applicant.hasExistingObligations && applicant.totalMonthlyEMI > 50000) {
			issues.push('High existing obligations');
		}
		if (property && property.propertyComplianceStatus !== 'fully_compliant') {
			issues.push('Property compliance issue');
		}

		return issues;
	}

	private getRelatedEmploymentType(primary: EmploymentType): EmploymentType {
		// For joint applicants, typically spouse or family member
		const options = [...SALARIED_TYPES, ...SELF_EMPLOYED_TYPES] as EmploymentType[];
		return options[Math.floor(Math.random() * options.length)];
	}

	private generateTestCaseId(): string {
		return `TC_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
	}

	private generateTestCaseName(
		loanName: LoanName,
		employmentType: EmploymentType,
		tier: 1 | 2 | 3,
		cityTier?: CityTier
	): string {
		const parts = [loanName, employmentType, `Tier${tier}`];
		if (cityTier) parts.push(cityTier);
		return parts.join(' - ');
	}

	private generateDescription(applicant: any, property: any, loanName: LoanName): string {
		let desc = `${loanName} application for ${applicant.employmentType} applicant, `;
		desc += `${applicant.age}yr, CIBIL ${applicant.creditScore}`;

		if (property) {
			desc += `, Property: ${property.propertyType} in ${property.propertyCity}`;
		}

		return desc;
	}

	private generateTestCaseTags(
		loanName: LoanName,
		employmentType: EmploymentType,
		tier: 1 | 2 | 3,
		filters?: TestDataFilters
	): string[] {
		const tags = [
			loanName.toLowerCase().replace(/\s+/g, '-'),
			employmentType.toLowerCase().replace(/[()]/g, ''),
			`tier-${tier}`
		];

		if (filters?.includeEdgeCases) tags.push('edge-case');
		if (filters?.includeNRI) tags.push('nri');
		if (filters?.includeLowCibil) tags.push('low-cibil');

		return tags;
	}

	private filtersToString(filters: TestDataFilters): string {
		const parts: string[] = [];
		if (filters.employmentTypes) parts.push(`emp:${filters.employmentTypes.join(',')}`);
		if (filters.loanNames) parts.push(`loan:${filters.loanNames.join(',')}`);
		if (filters.cityTiers) parts.push(`city:${filters.cityTiers.join(',')}`);
		return parts.join('|');
	}

	private generateSummary(testCases: TestCase[]) {
		const summary = {
			byLoanName: {} as Record<string, number>,
			byEmploymentType: {} as Record<string, number>,
			byTier: {} as Record<number, number>
		};

		for (const tc of testCases) {
			// By loan product name
			summary.byLoanName[tc.loanName] = (summary.byLoanName[tc.loanName] || 0) + 1;

			// By employment type
			const empType = tc.applicants[0].employmentType;
			summary.byEmploymentType[empType] = (summary.byEmploymentType[empType] || 0) + 1;

			// By tier
			const tier = tc.applicants[0].tier;
			summary.byTier[tier] = (summary.byTier[tier] || 0) + 1;
		}

		return summary;
	}
}

/**
 * Quick generation functions for common scenarios
 */
export const QuickGenerators = {
	/**
	 * Generate only salaried applicants
	 */
	salariedOnly: (maxCount: number = 100): Promise<GenerationResult> => {
		const config: GenerationConfig = {
			mode: 'filtered',
			filters: {
				employmentTypes: [...SALARIED_TYPES] as EmploymentType[],
				includeEdgeCases: false
			},
			limits: { maxCombinations: maxCount }
		};
		return new CombinationGenerator().generate(config);
	},

	/**
	 * Generate NRI + mixed employment
	 */
	nriMixed: (maxCount: number = 100): Promise<GenerationResult> => {
		const config: GenerationConfig = {
			mode: 'filtered',
			filters: {
				employmentTypes: [...SALARIED_TYPES] as EmploymentType[],
				includeNRI: true,
				includeJointApplicants: true
			},
			limits: { maxCombinations: maxCount }
		};
		return new CombinationGenerator().generate(config);
	},

	/**
	 * Generate self-employed with proprietorship
	 */
	selfEmployedProprietorship: (maxCount: number = 100): Promise<GenerationResult> => {
		const config: GenerationConfig = {
			mode: 'filtered',
			filters: {
				employmentTypes: [...SELF_EMPLOYED_TYPES] as EmploymentType[],
				companyTypes: ['Proprietorship'],
				includeEdgeCases: true
			},
			limits: { maxCombinations: maxCount }
		};
		return new CombinationGenerator().generate(config);
	},

	/**
	 * Generate edge cases only
	 */
	edgeCasesOnly: (maxCount: number = 200): Promise<GenerationResult> => {
		const config: GenerationConfig = {
			mode: 'filtered',
			filters: {
				includeEdgeCases: true,
				includeLowCibil: true,
				includeHighFOIR: true,
				ageRanges: ['18-25', '66-80']
			},
			limits: { maxCombinations: maxCount }
		};
		return new CombinationGenerator().generate(config);
	}
};
