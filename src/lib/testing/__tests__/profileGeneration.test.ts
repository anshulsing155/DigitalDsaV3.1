import { describe, it, expect } from 'vitest';
import {
	ApplicantProfileGenerator,
	PropertyProfileGenerator,
	CombinationGenerator,
	QuickGenerators
} from '$lib/testing';
import {
	LOAN_NAMES,
	EMPLOYMENT_TYPES,
	GENDERS,
	MARITAL_STATUSES,
	SECURED_LOAN_NAMES
} from '$lib/testing/schema/schemaExtractor';

describe('ApplicantProfileGenerator', () => {
	it('generates valid individual profile', () => {
		const generator = new ApplicantProfileGenerator(42);
		const profile = generator.generate('Salaried(Private)', 1);

		expect(profile).toBeDefined();
		expect(profile.fullName).toBeDefined();
		expect(typeof profile.fullName).toBe('string');
		expect(profile.fullName.length).toBeGreaterThan(0);

		expect(profile.age).toBeGreaterThanOrEqual(18);
		expect(profile.age).toBeLessThanOrEqual(70);

		expect(GENDERS).toContain(profile.gender);
		expect(EMPLOYMENT_TYPES).toContain(profile.employmentType);
	});

	it('generates salaried profile with salaried employment type', () => {
		const generator = new ApplicantProfileGenerator(100);
		const profile = generator.generate('Salaried(Private)', 1);

		expect(profile.employmentType).toBe('Salaried(Private)');
		expect(profile.employmentType.startsWith('Salaried')).toBe(true);
		expect(profile.salariedProfile).toBeDefined();
		expect(profile.salariedProfile!.salaryInBankAccount).toBe(true);
	});

	it('generates business profile for self-employed', () => {
		const generator = new ApplicantProfileGenerator(200);
		const profile = generator.generate('Self-employed(Other)', 1);

		expect(profile.employmentType).toBe('Self-employed(Other)');
		expect(profile.businessProfile).toBeDefined();
		expect(profile.businessProfile!.businessVintageYears).toBeGreaterThan(0);
	});

	it('credit score is within valid range (300-900)', () => {
		const generator = new ApplicantProfileGenerator(300);

		// Test across all tiers to cover different credit score ranges
		for (const tier of [1, 2, 3] as const) {
			const profile = generator.generate('Salaried(Private)', tier);
			expect(
				profile.creditScore,
				`Tier ${tier} credit score should be >= 300`
			).toBeGreaterThanOrEqual(300);
			expect(profile.creditScore, `Tier ${tier} credit score should be <= 900`).toBeLessThanOrEqual(
				900
			);
		}
	});
});

describe('PropertyProfileGenerator', () => {
	it('generates valid property', () => {
		const generator = new PropertyProfileGenerator(42);
		const property = generator.generate('Metro', 'Flat', 1);

		expect(property).toBeDefined();
		expect(property.propertyState).toBeDefined();
		expect(typeof property.propertyState).toBe('string');
		expect(property.propertyState.length).toBeGreaterThan(0);

		expect(property.propertyCity).toBeDefined();
		expect(typeof property.propertyCity).toBe('string');
		expect(property.propertyCity.length).toBeGreaterThan(0);

		expect(property.propertyType).toBeDefined();
		expect(property.propertyType).toBe('Flat');

		expect(property.propertyCost).toBeGreaterThan(0);
		expect(property.expectedLTV).toBeGreaterThan(0);
		expect(property.expectedLTV).toBeLessThanOrEqual(100);
	});
});

describe('CombinationGenerator', () => {
	it('generates test cases', async () => {
		const generator = new CombinationGenerator(42);
		const result = await generator.generate({
			mode: 'filtered',
			filters: {
				loanNames: [LOAN_NAMES[0]] as any[],
				employmentTypes: [EMPLOYMENT_TYPES[0]] as any[],
				cityTiers: ['Metro'],
				propertyTypes: ['Flat']
			},
			limits: { maxCombinations: 5 }
		});

		expect(result).toBeDefined();
		expect(result.success).toBe(true);
		expect(result.testCases).toBeDefined();
		expect(Array.isArray(result.testCases)).toBe(true);
		expect(result.testCases.length).toBeGreaterThan(0);

		// Each test case should have applicants and a canonical loanName
		for (const testCase of result.testCases) {
			expect(testCase.applicants).toBeDefined();
			expect(Array.isArray(testCase.applicants)).toBe(true);
			expect(testCase.applicants.length).toBeGreaterThan(0);
			expect(testCase.loanName).toBeDefined();
			expect(typeof testCase.loanName).toBe('string');
		}
	});
});

describe('QuickGenerators', () => {
	it('salariedOnly() returns salaried profiles', async () => {
		const result = await QuickGenerators.salariedOnly(10);

		expect(result).toBeDefined();
		expect(result.success).toBe(true);
		expect(result.testCases.length).toBeGreaterThan(0);

		for (const testCase of result.testCases) {
			const primaryApplicant = testCase.applicants[0];
			expect(
				primaryApplicant.employmentType.startsWith('Salaried'),
				`Employment type "${primaryApplicant.employmentType}" should start with "Salaried"`
			).toBe(true);
		}
	});
});

describe('Generated profiles have required fields for payload', () => {
	it('generated profiles have required fields for payload', () => {
		const generator = new ApplicantProfileGenerator(999);

		const employmentTypes = ['Salaried(Private)', 'Self-employed(Other)'] as const;

		for (const empType of employmentTypes) {
			const profile = generator.generate(empType, 1);

			expect(
				profile.applicantType,
				`Profile for ${empType} should have applicantType`
			).toBeDefined();
			expect(profile.applicantType).toBe('Individual');

			expect(profile.fullName, `Profile for ${empType} should have fullName`).toBeDefined();
			expect(typeof profile.fullName).toBe('string');

			expect(profile.age, `Profile for ${empType} should have age`).toBeDefined();
			expect(typeof profile.age).toBe('number');

			expect(profile.gender, `Profile for ${empType} should have gender`).toBeDefined();
			expect(typeof profile.gender).toBe('string');
		}
	});
});
