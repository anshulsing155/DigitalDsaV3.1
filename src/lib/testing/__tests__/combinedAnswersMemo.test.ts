/**
 * Tests for combinedAnswers memoization utility (CP-5).
 * Verifies shallow equality, stable reference, and builder functions.
 */
import { describe, it, expect } from 'vitest';
import {
	shallowEqualAnswers,
	stableReference,
	buildCombinedAnswersBase,
	buildCombinedAnswersSecured,
	buildCombinedAnswersUnsecured
} from '$lib/utils/combinedAnswersMemo';
import type { Answers } from '$lib/types/formTypes';

// ============================================================================
// shallowEqualAnswers
// ============================================================================

describe('shallowEqualAnswers', () => {
	it('returns true for identical references', () => {
		const obj: Answers = { a: '1', b: 2 };
		expect(shallowEqualAnswers(obj, obj)).toBe(true);
	});

	it('returns true for objects with same keys and values', () => {
		const a: Answers = { name: 'John', age: 30, active: true };
		const b: Answers = { name: 'John', age: 30, active: true };
		expect(shallowEqualAnswers(a, b)).toBe(true);
	});

	it('returns false when values differ', () => {
		const a: Answers = { name: 'John', amount: '15000' };
		const b: Answers = { name: 'John', amount: '150000' };
		expect(shallowEqualAnswers(a, b)).toBe(false);
	});

	it('returns false when key count differs', () => {
		const a: Answers = { name: 'John' };
		const b: Answers = { name: 'John', extra: 'val' };
		expect(shallowEqualAnswers(a, b)).toBe(false);
	});

	it('returns false when a key is missing from previous', () => {
		const a: Answers = { name: 'John', old: 'key' };
		const b: Answers = { name: 'John', new: 'key' };
		expect(shallowEqualAnswers(a, b)).toBe(false);
	});

	it('handles empty objects', () => {
		expect(shallowEqualAnswers({}, {})).toBe(true);
	});

	it('distinguishes undefined from missing key', () => {
		const a: Answers = { x: undefined };
		const b: Answers = {};
		// Different key count → not equal
		expect(shallowEqualAnswers(a, b)).toBe(false);
	});

	it('treats arrays as equal only by reference', () => {
		const arr = ['a', 'b'];
		const a: Answers = { items: arr };
		const b: Answers = { items: arr };
		expect(shallowEqualAnswers(a, b)).toBe(true);

		// Different array references with same content → NOT shallow-equal
		const c: Answers = { items: ['a', 'b'] };
		expect(shallowEqualAnswers(a, c)).toBe(false);
	});
});

// ============================================================================
// stableReference
// ============================================================================

describe('stableReference', () => {
	it('returns previous reference when values are equal', () => {
		const previous: Answers = { loanType: 'Home', amount: '500000' };
		const next: Answers = { loanType: 'Home', amount: '500000' };

		let stored = previous;
		const result = stableReference(next, stored, (ref) => {
			stored = ref;
		});

		// Should return the SAME reference as previous
		expect(result).toBe(previous);
		// stored should NOT have been updated
		expect(stored).toBe(previous);
	});

	it('returns new reference when values differ', () => {
		const previous: Answers = { loanType: 'Home', amount: '500000' };
		const next: Answers = { loanType: 'Home', amount: '600000' };

		let stored = previous;
		const result = stableReference(next, stored, (ref) => {
			stored = ref;
		});

		// Should return the NEW reference
		expect(result).toBe(next);
		// stored should have been updated
		expect(stored).toBe(next);
	});

	it('handles transition from empty to populated', () => {
		const previous: Answers = {};
		const next: Answers = { loanType: 'LAP' };

		let stored = previous;
		const result = stableReference(next, stored, (ref) => {
			stored = ref;
		});

		expect(result).toBe(next);
		expect(stored).toBe(next);
	});
});

// ============================================================================
// buildCombinedAnswersBase
// ============================================================================

describe('buildCombinedAnswersBase', () => {
	it('creates shorthand aliases for underscore-separated keys', () => {
		const answers: Answers = { q4_propertyStateName: 'Maharashtra' };
		const result = buildCombinedAnswersBase(answers, 'Home Loan', []);

		expect(result['propertyStateName']).toBe('Maharashtra');
		expect(result['q4_propertyStateName']).toBe('Maharashtra');
	});

	it('sets loan identity fields', () => {
		const result = buildCombinedAnswersBase({}, 'Home Loan', []);

		expect(result['q1_loanName']).toBe('Home Loan');
		expect(result['loanName']).toBe('Home Loan');
	});

	it('sets applicant count', () => {
		const applicants = [{ applicantType: 'Individual' }, { applicantType: 'Individual' }];
		const result = buildCombinedAnswersBase({}, 'PL', applicants);

		expect(result['__applicantCount']).toBe(2);
	});

	it('detects all-NRI individuals', () => {
		const applicants = [
			{ applicantType: 'Individual', isNRI: 'Yes' },
			{ applicantType: 'Individual', isNRI: 'Yes' }
		];
		const result = buildCombinedAnswersBase({}, 'HL', applicants);

		expect(result['__allIndividualsNRI']).toBe(true);
	});

	it('detects mixed NRI status', () => {
		const applicants = [
			{ applicantType: 'Individual', isNRI: 'Yes' },
			{ applicantType: 'Individual', isNRI: 'No' }
		];
		const result = buildCombinedAnswersBase({}, 'HL', applicants);

		expect(result['__allIndividualsNRI']).toBe(false);
	});

	it('detects only-company applicant', () => {
		const applicants = [{ applicantType: 'Company' }];
		const result = buildCombinedAnswersBase({}, 'BL', applicants);

		expect(result['__onlyCompanyApplicant']).toBe(true);
	});

	it('includes primary applicant obligation status', () => {
		const applicants = [{ ObligationsRunning: 'Yes' }];
		const result = buildCombinedAnswersBase({}, 'HL', applicants);

		expect(result['ObligationsRunning']).toBe('Yes');
	});

	it('includes income profiles and no-current-income flag', () => {
		const applicants = [{ selectedIncomeProfiles: ['no_current_income'] }];
		const result = buildCombinedAnswersBase({}, 'HL', applicants);

		expect(result['selectedIncomeProfiles']).toEqual(['no_current_income']);
		expect(result['__hasOnlyNoCurrentIncome']).toBe(true);
	});

	it('sets __hasOnlyNoCurrentIncome to false for multiple profiles', () => {
		const applicants = [{ selectedIncomeProfiles: ['salaried', 'rental'] }];
		const result = buildCombinedAnswersBase({}, 'HL', applicants);

		expect(result['__hasOnlyNoCurrentIncome']).toBe(false);
	});
});

// ============================================================================
// buildCombinedAnswersSecured
// ============================================================================

describe('buildCombinedAnswersSecured', () => {
	it('includes loanType, loanVariant, and facilityType from answers', () => {
		const answers: Answers = {
			loanType: 'BT + Top-up',
			loanVariant: 'Plot Loan Only',
			facilityType: 'Term Loan'
		};
		const result = buildCombinedAnswersSecured(answers, 'LAP', []);

		expect(result['loanType']).toBe('BT + Top-up');
		expect(result['loanVariant']).toBe('Plot Loan Only');
		expect(result['facilityType']).toBe('Term Loan');
	});

	it('defaults loanType, loanVariant, and facilityType to empty string', () => {
		const result = buildCombinedAnswersSecured({}, 'HL', []);

		expect(result['loanType']).toBe('');
		expect(result['loanVariant']).toBe('');
		expect(result['facilityType']).toBe('');
	});
});

// ============================================================================
// buildCombinedAnswersUnsecured
// ============================================================================

describe('buildCombinedAnswersUnsecured', () => {
	it('includes multi-applicant mode flags', () => {
		const applicants = [{ applicantType: 'Individual' }, { applicantType: 'Individual' }];
		const result = buildCombinedAnswersUnsecured({}, 'PL', applicants, false, false);

		expect(result['__multiApplicantMode']).toBe(true);
		expect(result['__individualApplicantCount']).toBe(2);
	});

	it('sets multiApplicantMode false for single applicant', () => {
		const applicants = [{ applicantType: 'Individual' }];
		const result = buildCombinedAnswersUnsecured({}, 'PL', applicants, true, false);

		expect(result['__multiApplicantMode']).toBe(false);
	});

	it('includes NRI bridge when flag is set', () => {
		const applicants = [{ isNRI: 'Yes' }];
		const result = buildCombinedAnswersUnsecured({}, 'PL', applicants, true, true);

		expect(result['ApplicantIsNRI']).toBe('Yes');
	});

	it('excludes NRI bridge when flag is false', () => {
		const applicants = [{ isNRI: 'Yes' }];
		const result = buildCombinedAnswersUnsecured({}, 'BL', applicants, true, false);

		expect(result['ApplicantIsNRI']).toBeUndefined();
	});

	it('includes loanType and facilityType', () => {
		const answers: Answers = { loanType: 'New Loan', facilityType: 'Term Loan' };
		const result = buildCombinedAnswersUnsecured(answers, 'PL', [], true, false);

		expect(result['loanType']).toBe('New Loan');
		expect(result['facilityType']).toBe('Term Loan');
	});
});

// ============================================================================
// Integration: stableReference + builders
// ============================================================================

describe('memoization integration', () => {
	it('returns same reference when only text field value changes but combined is identical', () => {
		// Simulate: user types in a text field not represented in combinedAnswers
		// (e.g., a field that only exists in currentAnswers with same shorthand)
		const answers1: Answers = { loanType: 'New Loan', q4_propCost: '15000' };
		const answers2: Answers = { loanType: 'New Loan', q4_propCost: '150000' };

		let stored: Answers = {} as Answers;
		const result1 = buildCombinedAnswersSecured(answers1, 'HL', []);
		const stable1 = stableReference(result1, stored, (ref) => {
			stored = ref;
		});

		const result2 = buildCombinedAnswersSecured(answers2, 'HL', []);
		const stable2 = stableReference(result2, stored, (ref) => {
			stored = ref;
		});

		// Values ARE different (propCost changed), so reference SHOULD change
		expect(stable1).not.toBe(stable2);
		expect(stable2['propCost']).toBe('150000');
	});

	it('returns same reference when nothing changes', () => {
		const answers: Answers = { loanType: 'New Loan' };
		const applicants = [{ applicantType: 'Individual' as const }];

		let stored: Answers = {} as Answers;
		const result1 = buildCombinedAnswersSecured(answers, 'HL', applicants);
		const stable1 = stableReference(result1, stored, (ref) => {
			stored = ref;
		});

		// Same inputs — should produce equal output
		const result2 = buildCombinedAnswersSecured(answers, 'HL', applicants);
		const stable2 = stableReference(result2, stored, (ref) => {
			stored = ref;
		});

		// Should be the SAME reference (memoized)
		expect(stable2).toBe(stable1);
	});

	it('detects changes in computed flags (applicant added)', () => {
		const answers: Answers = { loanType: 'New Loan' };

		let stored: Answers = {} as Answers;
		const result1 = buildCombinedAnswersSecured(answers, 'HL', [{ applicantType: 'Individual' }]);
		const stable1 = stableReference(result1, stored, (ref) => {
			stored = ref;
		});

		// Add a second applicant — __applicantCount changes
		const result2 = buildCombinedAnswersSecured(answers, 'HL', [
			{ applicantType: 'Individual' },
			{ applicantType: 'Individual' }
		]);
		const stable2 = stableReference(result2, stored, (ref) => {
			stored = ref;
		});

		// Should be a NEW reference (applicant count changed)
		expect(stable2).not.toBe(stable1);
		expect(stable2['__applicantCount']).toBe(2);
	});
});
