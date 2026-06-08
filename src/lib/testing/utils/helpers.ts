/**
 * Helper utilities for test data management
 */

import type {
	TestCase,
	TestSuite,
	ApplicantProfile,
	PropertyProfile
} from '../types/testData.types';

/**
 * Create a test case from profiles
 */
export function createTestCase(
	applicants: ApplicantProfile[],
	loanName: string,
	property?: PropertyProfile,
	options?: Partial<TestCase>
): TestCase {
	const loanAmount = property
		? Math.floor(property.propertyCost * (property.expectedLTV / 100))
		: 500000;

	const tenureYears = Math.min(20, 65 - applicants[0].age);

	return {
		id: `TC_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
		name: `${loanName} - ${applicants[0].employmentType}`,
		description: `Test case for ${loanName}`,
		tags: [loanName.toLowerCase(), applicants[0].employmentType.toLowerCase()],
		loanName: loanName as any,
		applicants,
		property,
		loanAmount,
		tenureYears,
		loanPurpose: 'New Loan',
		expectedResult: 'Pass',
		createdAt: new Date().toISOString(),
		createdBy: 'manual',
		...options
	};
}

/**
 * Create a test suite from test cases
 */
export function createTestSuite(
	name: string,
	testCases: TestCase[],
	description?: string
): TestSuite {
	return {
		id: `SUITE_${Date.now()}`,
		name,
		description: description || `Test suite with ${testCases.length} cases`,
		testCases,
		createdAt: new Date().toISOString(),
		totalCount: testCases.length
	};
}

/**
 * Validate a test case has all required fields
 */
export function validateTestCase(testCase: TestCase): { valid: boolean; errors: string[] } {
	const errors: string[] = [];

	if (!testCase.id) errors.push('Missing test case ID');
	if (!testCase.loanName) errors.push('Missing loan name');
	if (!testCase.applicants || testCase.applicants.length === 0) {
		errors.push('At least one applicant required');
	}

	if (testCase.applicants && testCase.applicants.length > 0) {
		const applicant = testCase.applicants[0];
		if (!applicant.fullName) errors.push('Applicant name required');
		if (!applicant.age || applicant.age < 18 || applicant.age > 80) {
			errors.push('Applicant age must be between 18 and 80');
		}
		if (!applicant.creditScore || applicant.creditScore < 300 || applicant.creditScore > 900) {
			errors.push('Credit score must be between 300 and 900');
		}
	}

	if (testCase.loanAmount <= 0) errors.push('Loan amount must be positive');
	if (testCase.tenureYears <= 0) errors.push('Tenure must be positive');

	return {
		valid: errors.length === 0,
		errors
	};
}

/**
 * Get summary statistics from test cases
 */
export function getTestCaseStatistics(testCases: TestCase[]) {
	const stats = {
		total: testCases.length,
		byLoanName: {} as Record<string, number>,
		byEmploymentType: {} as Record<string, number>,
		byExpectedResult: {} as Record<string, number>,
		avgAge: 0,
		avgCibil: 0,
		avgLoanAmount: 0
	};

	let totalAge = 0;
	let totalCibil = 0;
	let totalLoanAmount = 0;

	for (const tc of testCases) {
		// Count by loan product name
		stats.byLoanName[tc.loanName] = (stats.byLoanName[tc.loanName] || 0) + 1;

		// Count by employment type
		const empType = tc.applicants[0].employmentType;
		stats.byEmploymentType[empType] = (stats.byEmploymentType[empType] || 0) + 1;

		// Count by expected result
		stats.byExpectedResult[tc.expectedResult] =
			(stats.byExpectedResult[tc.expectedResult] || 0) + 1;

		// Sum for averages
		totalAge += tc.applicants[0].age;
		totalCibil += tc.applicants[0].creditScore;
		totalLoanAmount += tc.loanAmount;
	}

	stats.avgAge = Math.round(totalAge / testCases.length);
	stats.avgCibil = Math.round(totalCibil / testCases.length);
	stats.avgLoanAmount = Math.round(totalLoanAmount / testCases.length);

	return stats;
}

/**
 * Filter test cases by criteria
 */
export function filterTestCases(
	testCases: TestCase[],
	criteria: {
		loanNames?: string[];
		employmentTypes?: string[];
		cibilMin?: number;
		cibilMax?: number;
		ageMin?: number;
		ageMax?: number;
		tags?: string[];
	}
): TestCase[] {
	return testCases.filter((tc) => {
		if (criteria.loanNames && !criteria.loanNames.includes(tc.loanName)) return false;

		if (
			criteria.employmentTypes &&
			!criteria.employmentTypes.includes(tc.applicants[0].employmentType)
		) {
			return false;
		}

		const cibil = tc.applicants[0].creditScore;
		if (criteria.cibilMin !== undefined && cibil < criteria.cibilMin) return false;
		if (criteria.cibilMax !== undefined && cibil > criteria.cibilMax) return false;

		const age = tc.applicants[0].age;
		if (criteria.ageMin !== undefined && age < criteria.ageMin) return false;
		if (criteria.ageMax !== undefined && age > criteria.ageMax) return false;

		if (criteria.tags && !criteria.tags.some((tag) => tc.tags.includes(tag))) return false;

		return true;
	});
}

/**
 * Sort test cases by various criteria
 */
export function sortTestCases(
	testCases: TestCase[],
	sortBy: 'cibil' | 'age' | 'loanAmount' | 'createdAt',
	order: 'asc' | 'desc' = 'asc'
): TestCase[] {
	const sorted = [...testCases].sort((a, b) => {
		let comparison = 0;

		switch (sortBy) {
			case 'cibil':
				comparison = a.applicants[0].creditScore - b.applicants[0].creditScore;
				break;
			case 'age':
				comparison = a.applicants[0].age - b.applicants[0].age;
				break;
			case 'loanAmount':
				comparison = a.loanAmount - b.loanAmount;
				break;
			case 'createdAt':
				comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
				break;
		}

		return order === 'asc' ? comparison : -comparison;
	});

	return sorted;
}

/**
 * Find test cases that match a profile
 */
export function findSimilarTestCases(
	testCases: TestCase[],
	targetProfile: Partial<ApplicantProfile>,
	tolerance: { age?: number; cibil?: number } = { age: 5, cibil: 50 }
): TestCase[] {
	return testCases.filter((tc) => {
		const applicant = tc.applicants[0];

		if (targetProfile.employmentType && applicant.employmentType !== targetProfile.employmentType) {
			return false;
		}

		if (targetProfile.age !== undefined) {
			const ageDiff = Math.abs(applicant.age - targetProfile.age);
			if (ageDiff > (tolerance.age || 5)) return false;
		}

		if (targetProfile.creditScore !== undefined) {
			const cibilDiff = Math.abs(applicant.creditScore - targetProfile.creditScore);
			if (cibilDiff > (tolerance.cibil || 50)) return false;
		}

		return true;
	});
}
