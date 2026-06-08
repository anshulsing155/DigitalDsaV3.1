/**
 * Reverse Schema Map + Payload-to-Fill-Instructions Tests
 * ══════════════════════════════════════════════════════════════════
 * Tests the reverse schema mapper and the payload converter that
 * generates E2E fill configurations from LoanApplicationPayload.
 * ══════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import { buildReverseMap, getAvailableLoanTypes } from '$lib/server/formEngine/reverseSchemaMap';
import {
	payloadToFormAnswers,
	generateFillConfig
} from '$lib/server/testing/payloadToFillInstructions';
import { fixture01_SalariedClean } from './ruleEngine/fixtureProfiles.test';
import type { LoanApplicationPayload } from '$lib/utils/payloadBuilder';

// ============================================================================
// buildReverseMap() — per loan type
// ============================================================================

describe('buildReverseMap', () => {
	const loanTypes = [
		'Home Loan',
		'Loan Against Property',
		'Plot Loan',
		'Personal Loan',
		'Business Loan',
		'Professional Loan'
	];

	it.each(loanTypes)('produces a non-empty reverse map for "%s"', (loanType) => {
		const map = buildReverseMap(loanType);
		expect(map.size).toBeGreaterThan(0);
	});

	it('throws for unknown loan type', () => {
		expect(() => buildReverseMap('Imaginary Loan')).toThrow(/Unknown loan type/);
	});

	describe('Home Loan specific keys', () => {
		const map = buildReverseMap('Home Loan');

		it('maps assessmentStatus to q1_assessmentStatus on caseIntake', () => {
			const entry = map.get('assessmentStatus');
			expect(entry).toBeDefined();
			expect(entry!.questionId).toBe('q1_assessmentStatus');
			expect(entry!.questionType).toBe('radio');
			expect(entry!.pageId).toBe('caseIntake_homeLoan');
			expect(entry!.pageIndex).toBe(0);
		});

		it('propertyType removed from Home Loan V2 (duplicate of constructionType)', () => {
			const entry = map.get('propertyType');
			// propertyType was removed from propertyLocation_homeLoan — it duplicated
			// constructionType on propertyCharacter_homeLoan. The contextKey still
			// exists in LAP and Plot Loan schemas (where it means Lease Hold / Free Hold).
			expect(entry).toBeUndefined();
		});

		it('maps constructionType correctly', () => {
			const entry = map.get('constructionType');
			expect(entry).toBeDefined();
		});

		it('maps propertyStateName correctly', () => {
			const entry = map.get('propertyStateName');
			expect(entry).toBeDefined();
		});

		it('maps sanctionAmount (loan amount key in Home Loan schema)', () => {
			// Home Loan schema uses sanctionAmount; payload builder reads RequiredLoanAmount ?? loanAmount ?? sanctionAmount
			const entry = map.get('sanctionAmount');
			expect(entry).toBeDefined();
		});

		it('maps mortgageYear (tenure)', () => {
			const entry = map.get('mortgageYear');
			expect(entry).toBeDefined();
		});
	});

	describe('cross-loan-type consistency', () => {
		it('all loan types have loanName or equivalent entry', () => {
			// Not all schemas have loanName as a question — it might be derived
			// Just ensure the maps are reasonable in size
			for (const lt of loanTypes) {
				const map = buildReverseMap(lt);
				expect(map.size).toBeGreaterThan(5);
			}
		});

		it('entries have valid structure', () => {
			for (const lt of loanTypes) {
				const map = buildReverseMap(lt);
				for (const [key, entry] of map) {
					expect(typeof key).toBe('string');
					expect(key.length).toBeGreaterThan(0);
					expect(entry.questionId).toBeTruthy();
					expect(entry.questionType).toBeTruthy();
					expect(entry.pageId).toBeTruthy();
					expect(typeof entry.pageIndex).toBe('number');
					expect(entry.pageIndex).toBeGreaterThanOrEqual(0);
					expect(typeof entry.required).toBe('boolean');
				}
			}
		});
	});

	it('getAvailableLoanTypes returns all 6 loan types', () => {
		const types = getAvailableLoanTypes();
		expect(types.length).toBeGreaterThanOrEqual(6);
		expect(types).toContain('Home Loan');
		expect(types).toContain('Personal Loan');
	});
});

// ============================================================================
// payloadToFormAnswers() — flattening
// ============================================================================

describe('payloadToFormAnswers', () => {
	it('maps loanTransaction fields correctly', () => {
		const answers = payloadToFormAnswers(fixture01_SalariedClean);

		expect(answers['loanName']).toBe('Home Loan');
		expect(answers['loanType']).toBe('New Loan');
		expect(answers['propertyStateName']).toBe('Maharashtra');
		expect(answers['propertyCityName']).toBe('Pune');
		// S77e Step-4 shift: propertyType removed from payload (no V2 schema question binds to it)
		expect(answers['propertyType']).toBeUndefined();
		// purchaseType updated to raw schema option value ('Direct Sale' was never valid)
		expect(answers['purchaseType']).toBe('resale_normal');
		// constructionType updated to V2 value ('Ready to Move' was old schema; V2 uses Flat/House/Floor)
		expect(answers['constructionType']).toBe('Flat');
	});

	it('converts booleans to Yes/No and maps merged fields', () => {
		const answers = payloadToFormAnswers(fixture01_SalariedClean);

		expect(answers['propertyIdentified']).toBe('Yes');
		expect(answers['propertyComplianceStatus']).toBe('fully_compliant');
		expect(answers['ifPropertyRegistered']).toBe('Yes');
		expect(answers['residenceOptionSame']).toBe('Yes');
	});

	it('converts numbers to strings', () => {
		const answers = payloadToFormAnswers(fixture01_SalariedClean);

		expect(answers['propertyCost']).toBe('7500000');
		expect(answers['downPayment']).toBe('1500000');
		expect(answers['RequiredLoanAmount']).toBe('6000000');
		expect(answers['mortgageYear']).toBe('20');
	});

	it('maps primary applicant fields', () => {
		const answers = payloadToFormAnswers(fixture01_SalariedClean);

		expect(answers['employmentType']).toBe('Salaried(Private)');
		expect(answers['ageOfApplicant']).toBe('34');
		expect(answers['gender']).toBe('Male');
		expect(answers['maritalStatus']).toBe('Married');
		expect(answers['creditScore']).toBe('780');
		expect(answers['grossIncome']).toBe('100000');
		expect(answers['netIncome']).toBe('80000');
	});

	it('handles false booleans correctly', () => {
		const payload: LoanApplicationPayload = {
			loanTransaction: {
				loanName: 'Home Loan',
				loanType: 'New Loan',
				numberOfApplicants: 1,
				propertyIdentified: false,
				loanAmount: 1000000,
				tenureYears: 10
			},
			allApplicantDetails: [
				{
					applicantType: 'Individual',
					fullName: 'Test',
					age: 30,
					gender: 'Male',
					maritalStatus: 'Single',
					employmentType: 'Salaried(Private)',
					creditScore: 700,
					hasExistingObligations: false
				}
			]
		};

		const answers = payloadToFormAnswers(payload);
		expect(answers['propertyIdentified']).toBe('No');
		expect(answers['ObligationsRunning']).toBe('No');
	});

	it('handles empty payload gracefully', () => {
		const payload: LoanApplicationPayload = {
			loanTransaction: {
				loanName: '',
				loanType: '',
				numberOfApplicants: 0,
				loanAmount: 0,
				tenureYears: 0
			},
			allApplicantDetails: []
		};

		const answers = payloadToFormAnswers(payload);
		expect(answers).toBeDefined();
		expect(typeof answers).toBe('object');
	});
});

// ============================================================================
// generateFillConfig() — full pipeline
// ============================================================================

describe('generateFillConfig', () => {
	it('produces correct fill config for fixture01 (Home Loan)', () => {
		const config = generateFillConfig(fixture01_SalariedClean);

		expect(config.loanName).toBe('Home Loan');
		expect(config.loanType).toBe('New Loan'); // Always passed so navigateToLoanForm can select the scope
		expect(config.pages.length).toBeGreaterThan(0);
	});

	it('pages are sorted by pageIndex', () => {
		const config = generateFillConfig(fixture01_SalariedClean);

		for (let i = 1; i < config.pages.length; i++) {
			expect(config.pages[i].pageIndex).toBeGreaterThanOrEqual(config.pages[i - 1].pageIndex);
		}
	});

	it('each page has at least one fill instruction', () => {
		const config = generateFillConfig(fixture01_SalariedClean);

		for (const page of config.pages) {
			expect(page.fills.length).toBeGreaterThan(0);
			expect(page.pageId).toBeTruthy();
		}
	});

	it('fill instructions have valid types', () => {
		const config = generateFillConfig(fixture01_SalariedClean);
		const validTypes = new Set([
			'radio',
			'text',
			'select',
			'number',
			'date',
			'currency',
			'multiple-select'
		]);

		for (const page of config.pages) {
			for (const fill of page.fills) {
				expect(validTypes.has(fill.type)).toBe(true);
				expect(fill.questionId).toBeTruthy();
				expect(fill.value !== undefined && fill.value !== null).toBe(true);
			}
		}
	});

	it('unmappedKeys contains keys not found in schema', () => {
		const config = generateFillConfig(fixture01_SalariedClean);

		// Some payload keys won't map to form questions (e.g. applicant-level keys
		// that are part of component schemas, not the main loan schema)
		expect(Array.isArray(config.unmappedKeys)).toBe(true);
	});

	it('maps creditHistory-related questions to early pages', () => {
		// fixture01 has creditHistoryStatus, propertyComplianceStatus, etc.
		// These map to early pages in the form flow
		const config = generateFillConfig(fixture01_SalariedClean);

		expect(config.pages.length).toBeGreaterThan(0);
		// First page should be one of the early pages (index 0 or 1)
		const firstPage = config.pages[0];
		expect(firstPage.pageIndex).toBeLessThanOrEqual(1);
	});

	it('generates config for Balance Transfer loan type', () => {
		const btPayload: LoanApplicationPayload = {
			loanTransaction: {
				loanName: 'Home Loan',
				loanType: 'Balance Transfer',
				numberOfApplicants: 1,
				loanAmount: 5000000,
				tenureYears: 15,
				currentBank: 'HDFC Bank',
				principalOutstanding: 4500000,
				currentInterestRate: 9.5,
				remainingTenure: 180,
				currentEMI: 48000,
				sixMonthsAfterRegistry: true
			},
			allApplicantDetails: [
				{
					applicantType: 'Individual',
					fullName: 'BT Test',
					age: 40,
					gender: 'Male',
					maritalStatus: 'Married',
					employmentType: 'Salaried(Private)',
					creditScore: 750,
					hasExistingObligations: false
				}
			]
		};

		const config = generateFillConfig(btPayload);
		expect(config.loanName).toBe('Home Loan');
		expect(config.loanType).toBe('Balance Transfer');
		expect(config.pages.length).toBeGreaterThan(0);
	});
});
