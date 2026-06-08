import { describe, it, expect } from 'vitest';
import {
	selectYoungest,
	selectHighestCibil,
	selectBestEmployment
} from '$lib/ruleEngine/applicantSelectors';

// ── Helper ────────────────────────────────────────────────────────
function makeApplicant(overrides: Record<string, unknown> = {}): Record<string, unknown> {
	return {
		applicantType: 'Individual',
		fullName: 'Test',
		age: 35,
		creditScore: 750,
		employmentType: 'Salaried(Private)',
		...overrides
	};
}

// ============================================================================
// selectYoungest
// ============================================================================
describe('selectYoungest', () => {
	it('returns undefined for empty array', () => {
		expect(selectYoungest([])).toBeUndefined();
	});

	it('returns the only applicant when single', () => {
		const a = makeApplicant({ fullName: 'Alice', age: 40 });
		expect(selectYoungest([a])).toBe(a);
	});

	it('picks younger of two individuals', () => {
		const older = makeApplicant({ fullName: 'Older', age: 55 });
		const younger = makeApplicant({ fullName: 'Younger', age: 28 });
		expect(selectYoungest([older, younger])?.fullName).toBe('Younger');
	});

	it('picks youngest of three', () => {
		const a = makeApplicant({ fullName: 'A', age: 50 });
		const b = makeApplicant({ fullName: 'B', age: 25 });
		const c = makeApplicant({ fullName: 'C', age: 40 });
		expect(selectYoungest([a, b, c])?.fullName).toBe('B');
	});

	it('skips Company applicants', () => {
		const company = makeApplicant({ applicantType: 'Company', fullName: 'Corp', age: 5 });
		const individual = makeApplicant({ fullName: 'Alice', age: 45 });
		expect(selectYoungest([company, individual])?.fullName).toBe('Alice');
	});

	it('returns undefined when all are Company', () => {
		const c1 = makeApplicant({ applicantType: 'Company' });
		const c2 = makeApplicant({ applicantType: 'Company' });
		expect(selectYoungest([c1, c2])).toBeUndefined();
	});

	it('falls back to first individual when all ages are 0', () => {
		const a = makeApplicant({ fullName: 'A', age: 0 });
		const b = makeApplicant({ fullName: 'B', age: 0 });
		expect(selectYoungest([a, b])?.fullName).toBe('A');
	});

	it('ignores zero-age applicants in favor of valid ages', () => {
		const noAge = makeApplicant({ fullName: 'NoAge', age: 0 });
		const valid = makeApplicant({ fullName: 'Valid', age: 60 });
		expect(selectYoungest([noAge, valid])?.fullName).toBe('Valid');
	});
});

// ============================================================================
// selectHighestCibil
// ============================================================================
describe('selectHighestCibil', () => {
	it('returns undefined for empty array', () => {
		expect(selectHighestCibil([])).toBeUndefined();
	});

	it('returns the only applicant when single', () => {
		const a = makeApplicant({ fullName: 'Alice', creditScore: 700 });
		expect(selectHighestCibil([a])).toBe(a);
	});

	it('picks higher CIBIL of two', () => {
		const low = makeApplicant({ fullName: 'Low', creditScore: 650 });
		const high = makeApplicant({ fullName: 'High', creditScore: 820 });
		expect(selectHighestCibil([low, high])?.fullName).toBe('High');
	});

	it('skips Company applicants', () => {
		const company = makeApplicant({ applicantType: 'Company', creditScore: 900 });
		const individual = makeApplicant({ fullName: 'Alice', creditScore: 700 });
		expect(selectHighestCibil([company, individual])?.fullName).toBe('Alice');
	});

	it('handles missing creditScore (defaults to 0)', () => {
		const noScore = makeApplicant({ fullName: 'NoScore', creditScore: undefined });
		const withScore = makeApplicant({ fullName: 'WithScore', creditScore: 750 });
		expect(selectHighestCibil([noScore, withScore])?.fullName).toBe('WithScore');
	});
});

// ============================================================================
// selectBestEmployment
// ============================================================================
describe('selectBestEmployment', () => {
	it('returns undefined for empty array', () => {
		expect(selectBestEmployment([])).toBeUndefined();
	});

	it('returns the only applicant when single', () => {
		const a = makeApplicant({ fullName: 'Alice', employmentType: 'Self-employed(Other)' });
		expect(selectBestEmployment([a])).toBe(a);
	});

	it('prefers Government salaried over Private salaried', () => {
		const pvt = makeApplicant({ fullName: 'Private', employmentType: 'Salaried(Private)' });
		const govt = makeApplicant({ fullName: 'Govt', employmentType: 'Salaried(Government)' });
		expect(selectBestEmployment([pvt, govt])?.fullName).toBe('Govt');
	});

	it('prefers Salaried over Self-employed', () => {
		const se = makeApplicant({ fullName: 'SE', employmentType: 'Self-employed(Businessman)' });
		const sal = makeApplicant({ fullName: 'Sal', employmentType: 'Salaried(Private)' });
		expect(selectBestEmployment([se, sal])?.fullName).toBe('Sal');
	});

	it('prefers Self-employed(Professional) over Self-employed(Other)', () => {
		const other = makeApplicant({ fullName: 'Other', employmentType: 'Self-employed(Other)' });
		const prof = makeApplicant({ fullName: 'Prof', employmentType: 'Self-employed(Professional)' });
		expect(selectBestEmployment([other, prof])?.fullName).toBe('Prof');
	});

	it('skips Company applicants', () => {
		const company = makeApplicant({
			applicantType: 'Company',
			employmentType: 'Salaried(Government)'
		});
		const individual = makeApplicant({ fullName: 'Alice', employmentType: 'Self-employed(Other)' });
		expect(selectBestEmployment([company, individual])?.fullName).toBe('Alice');
	});

	it('handles unknown employment type (lowest priority)', () => {
		const unknown = makeApplicant({ fullName: 'Unknown', employmentType: 'Freelancer' });
		const known = makeApplicant({ fullName: 'Known', employmentType: 'Self-employed(Other)' });
		expect(selectBestEmployment([unknown, known])?.fullName).toBe('Known');
	});
});
