import { describe, it, expect } from 'vitest';
import {
	LOAN_NAMES,
	SECURED_LOAN_NAMES,
	UNSECURED_LOAN_NAMES,
	EMPLOYMENT_TYPES,
	SALARIED_TYPES,
	SELF_EMPLOYED_TYPES,
	GENDERS,
	MARITAL_STATUSES,
	PROPERTY_OWNERSHIP_TYPES,
	validateSchemaAlignment
} from '$lib/testing/schema/schemaExtractor';
import { PAGE_IDS, QUESTIONS_BY_PAGE } from '$lib/testing/homeLoan/pageFlowMap';

describe('Schema alignment — constants derived from JSON configs', () => {
	it('LOAN_NAMES is a non-empty array', () => {
		expect(Array.isArray(LOAN_NAMES)).toBe(true);
		expect(LOAN_NAMES.length).toBeGreaterThan(0);
	});

	it('EMPLOYMENT_TYPES is a non-empty array', () => {
		expect(Array.isArray(EMPLOYMENT_TYPES)).toBe(true);
		expect(EMPLOYMENT_TYPES.length).toBeGreaterThan(0);
	});

	it('GENDERS is a non-empty array', () => {
		expect(Array.isArray(GENDERS)).toBe(true);
		expect(GENDERS.length).toBeGreaterThan(0);
	});

	it('MARITAL_STATUSES is a non-empty array', () => {
		expect(Array.isArray(MARITAL_STATUSES)).toBe(true);
		expect(MARITAL_STATUSES.length).toBeGreaterThan(0);
	});

	it('SECURED_LOAN_NAMES is a subset of LOAN_NAMES', () => {
		for (const secured of SECURED_LOAN_NAMES) {
			expect(LOAN_NAMES).toContain(secured);
		}
	});

	it('UNSECURED_LOAN_NAMES is a subset of LOAN_NAMES', () => {
		for (const unsecured of UNSECURED_LOAN_NAMES) {
			expect(LOAN_NAMES).toContain(unsecured);
		}
	});

	it('SALARIED_TYPES is a subset of EMPLOYMENT_TYPES', () => {
		for (const salaried of SALARIED_TYPES) {
			expect(EMPLOYMENT_TYPES).toContain(salaried);
		}
	});

	it('SELF_EMPLOYED_TYPES is a subset of EMPLOYMENT_TYPES', () => {
		for (const selfEmployed of SELF_EMPLOYED_TYPES) {
			expect(EMPLOYMENT_TYPES).toContain(selfEmployed);
		}
	});

	it('"Home Loan" is present in LOAN_NAMES', () => {
		expect(LOAN_NAMES).toContain('Home Loan');
	});

	it('"Home Loan" is present in SECURED_LOAN_NAMES', () => {
		expect(SECURED_LOAN_NAMES).toContain('Home Loan');
	});

	it('PROPERTY_OWNERSHIP_TYPES is non-empty', () => {
		expect(PROPERTY_OWNERSHIP_TYPES.length).toBeGreaterThan(0);
	});

	it('validateSchemaAlignment() returns no errors', () => {
		const issues = validateSchemaAlignment();
		if (issues.length > 0) {
			const summary = issues.map((i) => `${i.field}: ${i.issue}`).join('\n');
			expect.fail(`Schema alignment issues detected:\n${summary}`);
		}
		expect(issues).toEqual([]);
	});

	it('all PAGE_IDS values are valid non-empty string constants', () => {
		const ids = Object.values(PAGE_IDS);
		expect(ids.length).toBeGreaterThan(0);
		for (const id of ids) {
			expect(typeof id).toBe('string');
			expect(id.length).toBeGreaterThan(0);
		}
	});
});

describe('Page flow map — QUESTIONS_BY_PAGE integrity', () => {
	it('every PAGE_IDS value has a corresponding entry in QUESTIONS_BY_PAGE', () => {
		// Pages handled by dedicated components (not schema-driven questions)
		const componentHandledPages = new Set<string>([
			PAGE_IDS.APPLICANTS,
			PAGE_IDS.INCOME_PROFILES,
			PAGE_IDS.INCOME_DETAILS,
			PAGE_IDS.CREDIT_SCORE,
			PAGE_IDS.OBLIGATIONS
		]);

		const pageIdValues = Object.values(PAGE_IDS);
		for (const pageId of pageIdValues) {
			if (componentHandledPages.has(pageId)) continue;
			expect(QUESTIONS_BY_PAGE).toHaveProperty(pageId);
			expect(Array.isArray(QUESTIONS_BY_PAGE[pageId])).toBe(true);
		}
	});

	it('every question in QUESTIONS_BY_PAGE has id, contextKey, type, and required fields', () => {
		for (const [pageId, questions] of Object.entries(QUESTIONS_BY_PAGE)) {
			// Applicant page has no schema questions (handled by component)
			if (questions.length === 0) continue;
			for (const question of questions) {
				expect(question, `question in page "${pageId}" missing "id"`).toHaveProperty('id');
				expect(question, `question in page "${pageId}" missing "contextKey"`).toHaveProperty(
					'contextKey'
				);
				expect(question, `question in page "${pageId}" missing "type"`).toHaveProperty('type');
				expect(question, `question in page "${pageId}" missing "required"`).toHaveProperty(
					'required'
				);

				expect(typeof question.id).toBe('string');
				expect(typeof question.contextKey).toBe('string');
				expect(typeof question.type).toBe('string');
				expect(typeof question.required).toBe('boolean');
			}
		}
	});
});
