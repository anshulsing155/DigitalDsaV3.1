/**
 * Test Data Storage - Handles persistence of test cases and results
 * Supports both JSON file storage and SQLite database
 */

import type {
	TestCase,
	TestSuite,
	StoredTestCase,
	TestCaseQuery,
	ApplicantProfile,
	PropertyProfile
} from '../types/testData.types';
import { writeFile, readFile, mkdir, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export class TestDataStorage {
	private baseDir: string;
	private profilesDir: string;
	private combinationsDir: string;
	private resultsDir: string;

	constructor(baseDir: string = 'test-data') {
		this.baseDir = baseDir;
		this.profilesDir = path.join(baseDir, 'profiles');
		this.combinationsDir = path.join(baseDir, 'combinations');
		this.resultsDir = path.join(baseDir, 'results');
	}

	/**
	 * Initialize storage directories
	 */
	async initialize(): Promise<void> {
		const dirs = [
			this.baseDir,
			this.profilesDir,
			path.join(this.profilesDir, 'applicants'),
			path.join(this.profilesDir, 'properties'),
			this.combinationsDir,
			this.resultsDir,
			path.join(this.resultsDir, 'ui-tests'),
			path.join(this.resultsDir, 'bank-rules')
		];

		for (const dir of dirs) {
			if (!existsSync(dir)) {
				await mkdir(dir, { recursive: true });
			}
		}
	}

	// ==================== PROFILE STORAGE ====================

	/**
	 * Save an applicant profile
	 */
	async saveApplicantProfile(profile: ApplicantProfile): Promise<string> {
		const filename = `${this.sanitizeFilename(profile.profileId)}.json`;
		const filepath = path.join(this.profilesDir, 'applicants', filename);

		await writeFile(filepath, JSON.stringify(profile, null, 2), 'utf-8');

		return filepath;
	}

	/**
	 * Save a property profile
	 */
	async savePropertyProfile(profile: PropertyProfile): Promise<string> {
		const filename = `${this.sanitizeFilename(profile.profileId)}.json`;
		const filepath = path.join(this.profilesDir, 'properties', filename);

		await writeFile(filepath, JSON.stringify(profile, null, 2), 'utf-8');

		return filepath;
	}

	/**
	 * Load an applicant profile by ID
	 */
	async loadApplicantProfile(profileId: string): Promise<ApplicantProfile | null> {
		try {
			const filename = `${this.sanitizeFilename(profileId)}.json`;
			const filepath = path.join(this.profilesDir, 'applicants', filename);

			const content = await readFile(filepath, 'utf-8');
			return JSON.parse(content) as ApplicantProfile;
		} catch {
			return null;
		}
	}

	/**
	 * Load a property profile by ID
	 */
	async loadPropertyProfile(profileId: string): Promise<PropertyProfile | null> {
		try {
			const filename = `${this.sanitizeFilename(profileId)}.json`;
			const filepath = path.join(this.profilesDir, 'properties', filename);

			const content = await readFile(filepath, 'utf-8');
			return JSON.parse(content) as PropertyProfile;
		} catch {
			return null;
		}
	}

	/**
	 * List all applicant profiles
	 */
	async listApplicantProfiles(): Promise<ApplicantProfile[]> {
		const dir = path.join(this.profilesDir, 'applicants');
		if (!existsSync(dir)) return [];

		const files = await readdir(dir);
		const profiles: ApplicantProfile[] = [];

		for (const file of files) {
			if (file.endsWith('.json')) {
				const content = await readFile(path.join(dir, file), 'utf-8');
				profiles.push(JSON.parse(content));
			}
		}

		return profiles;
	}

	/**
	 * List all property profiles
	 */
	async listPropertyProfiles(): Promise<PropertyProfile[]> {
		const dir = path.join(this.profilesDir, 'properties');
		if (!existsSync(dir)) return [];

		const files = await readdir(dir);
		const profiles: PropertyProfile[] = [];

		for (const file of files) {
			if (file.endsWith('.json')) {
				const content = await readFile(path.join(dir, file), 'utf-8');
				profiles.push(JSON.parse(content));
			}
		}

		return profiles;
	}

	// ==================== TEST CASE STORAGE ====================

	/**
	 * Save a single test case
	 */
	async saveTestCase(testCase: TestCase): Promise<StoredTestCase> {
		const filename = `${this.sanitizeFilename(testCase.id)}.json`;
		const filepath = path.join(this.combinationsDir, filename);

		await writeFile(filepath, JSON.stringify(testCase, null, 2), 'utf-8');

		return {
			testCase,
			filePath: filepath,
			storedAt: new Date().toISOString()
		};
	}

	/**
	 * Save multiple test cases as a suite
	 */
	async saveTestSuite(suite: TestSuite): Promise<string> {
		const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
		const filename = `suite_${this.sanitizeFilename(suite.name)}_${timestamp}.json`;
		const filepath = path.join(this.combinationsDir, filename);

		await writeFile(filepath, JSON.stringify(suite, null, 2), 'utf-8');

		// Also save individual test cases
		for (const testCase of suite.testCases) {
			await this.saveTestCase(testCase);
		}

		return filepath;
	}

	/**
	 * Load a test case by ID
	 */
	async loadTestCase(id: string): Promise<TestCase | null> {
		try {
			const filename = `${this.sanitizeFilename(id)}.json`;
			const filepath = path.join(this.combinationsDir, filename);

			const content = await readFile(filepath, 'utf-8');
			return JSON.parse(content) as TestCase;
		} catch {
			return null;
		}
	}

	/**
	 * Load a test suite by filename
	 */
	async loadTestSuite(filename: string): Promise<TestSuite | null> {
		try {
			const filepath = path.join(this.combinationsDir, filename);
			const content = await readFile(filepath, 'utf-8');
			return JSON.parse(content) as TestSuite;
		} catch {
			return null;
		}
	}

	/**
	 * List all test suites
	 */
	async listTestSuites(): Promise<TestSuite[]> {
		if (!existsSync(this.combinationsDir)) return [];

		const files = await readdir(this.combinationsDir);
		const suites: TestSuite[] = [];

		for (const file of files) {
			if (file.startsWith('suite_') && file.endsWith('.json')) {
				const content = await readFile(path.join(this.combinationsDir, file), 'utf-8');
				suites.push(JSON.parse(content));
			}
		}

		return suites.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
	}

	/**
	 * List all individual test cases
	 */
	async listTestCases(): Promise<TestCase[]> {
		if (!existsSync(this.combinationsDir)) return [];

		const files = await readdir(this.combinationsDir);
		const testCases: TestCase[] = [];

		for (const file of files) {
			if (file.startsWith('TC_') && file.endsWith('.json')) {
				const content = await readFile(path.join(this.combinationsDir, file), 'utf-8');
				testCases.push(JSON.parse(content));
			}
		}

		return testCases;
	}

	/**
	 * Query test cases with filters
	 */
	async queryTestCases(query: TestCaseQuery): Promise<TestCase[]> {
		let testCases = await this.listTestCases();

		// Apply filters
		if (query.tags && query.tags.length > 0) {
			testCases = testCases.filter((tc) => query.tags!.some((tag) => tc.tags.includes(tag)));
		}

		if (query.loanNames && query.loanNames.length > 0) {
			testCases = testCases.filter((tc) => query.loanNames!.includes(tc.loanName));
		}

		if (query.employmentTypes && query.employmentTypes.length > 0) {
			testCases = testCases.filter((tc) =>
				query.employmentTypes!.includes(tc.applicants[0].employmentType as any)
			);
		}

		if (query.cibilRange) {
			testCases = testCases.filter((tc) => {
				const cibil = tc.applicants[0].creditScore;
				return cibil >= query.cibilRange!.min && cibil <= query.cibilRange!.max;
			});
		}

		if (query.ageRange) {
			testCases = testCases.filter((tc) => {
				const age = tc.applicants[0].age;
				return age >= query.ageRange!.min && age <= query.ageRange!.max;
			});
		}

		if (query.createdAfter) {
			testCases = testCases.filter((tc) => tc.createdAt >= query.createdAfter!);
		}

		if (query.createdBefore) {
			testCases = testCases.filter((tc) => tc.createdAt <= query.createdBefore!);
		}

		// Sort by creation date (newest first)
		testCases.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

		// Apply pagination
		const offset = query.offset || 0;
		const limit = query.limit || testCases.length;

		return testCases.slice(offset, offset + limit);
	}

	/**
	 * Delete a test case
	 */
	async deleteTestCase(id: string): Promise<boolean> {
		try {
			const filename = `${this.sanitizeFilename(id)}.json`;
			const filepath = path.join(this.combinationsDir, filename);

			const fs = await import('fs/promises');
			await fs.unlink(filepath);
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Delete a test suite
	 */
	async deleteTestSuite(filename: string): Promise<boolean> {
		try {
			const filepath = path.join(this.combinationsDir, filename);
			const fs = await import('fs/promises');
			await fs.unlink(filepath);
			return true;
		} catch {
			return false;
		}
	}

	// ==================== EXPORT / IMPORT ====================

	/**
	 * Export test cases to JSON
	 */
	async exportTestCases(testCaseIds: string[]): Promise<string> {
		const testCases: TestCase[] = [];

		for (const id of testCaseIds) {
			const tc = await this.loadTestCase(id);
			if (tc) testCases.push(tc);
		}

		return JSON.stringify(testCases, null, 2);
	}

	/**
	 * Import test cases from JSON
	 */
	async importTestCases(jsonData: string): Promise<number> {
		try {
			const testCases = JSON.parse(jsonData) as TestCase[];
			let imported = 0;

			for (const tc of testCases) {
				await this.saveTestCase(tc);
				imported++;
			}

			return imported;
		} catch (error) {
			console.error('Import failed:', error);
			return 0;
		}
	}

	/**
	 * Get storage statistics
	 */
	async getStatistics(): Promise<{
		applicantProfiles: number;
		propertyProfiles: number;
		testCases: number;
		testSuites: number;
		totalSize: number;
	}> {
		const [applicants, properties, testCases, suites] = await Promise.all([
			this.listApplicantProfiles(),
			this.listPropertyProfiles(),
			this.listTestCases(),
			this.listTestSuites()
		]);

		return {
			applicantProfiles: applicants.length,
			propertyProfiles: properties.length,
			testCases: testCases.length,
			testSuites: suites.length,
			totalSize: 0 // TODO: Calculate actual file sizes
		};
	}

	// ==================== UTILITY METHODS ====================

	private sanitizeFilename(str: string): string {
		return str.replace(/[^a-zA-Z0-9_-]/g, '_');
	}
}

// ==================== SINGLETON INSTANCE ====================

let storageInstance: TestDataStorage | null = null;

export function getTestDataStorage(baseDir?: string): TestDataStorage {
	if (!storageInstance) {
		storageInstance = new TestDataStorage(baseDir);
	}
	return storageInstance;
}
