/**
 * Age-gap validation for the business-runner co-applicant.
 *
 * Used by BusinessRunnerPage.svelte to constrain the runner's age based on
 * the proprietor's age + the selected relation. Indian socio-legal norms:
 *   - Husband: spouse within ±15 years
 *   - Father: at least 15 years older
 *   - Son: at least 15 years younger, AND at least 18 (legal minor floor)
 *   - Other: only the legal 18-year floor
 */
import { describe, it, expect } from 'vitest';
import {
	ageGapBoundsFor,
	isRunnerAgeValid,
	relationLocksGender,
	MIN_CO_APPLICANT_AGE
} from '$lib/utils/businessRunnerCoApplicant';

describe('relationLocksGender', () => {
	it('locks gender for husband/father/son', () => {
		expect(relationLocksGender('husband')).toBe(true);
		expect(relationLocksGender('father')).toBe(true);
		expect(relationLocksGender('son')).toBe(true);
	});
	it('does not lock gender for other / self / blank', () => {
		expect(relationLocksGender('other')).toBe(false);
		expect(relationLocksGender('self')).toBe(false);
		expect(relationLocksGender('')).toBe(false);
		expect(relationLocksGender(null)).toBe(false);
	});
});

describe('ageGapBoundsFor — returns null for non-runner answers', () => {
	it('null for self / blank / undefined', () => {
		expect(ageGapBoundsFor('self', 33)).toBeNull();
		expect(ageGapBoundsFor('', 33)).toBeNull();
		expect(ageGapBoundsFor(null, 33)).toBeNull();
		expect(ageGapBoundsFor(undefined, 33)).toBeNull();
	});
});

describe('ageGapBoundsFor — Husband (±15 of proprietor)', () => {
	it('proprietor age 33 → husband must be 18-48', () => {
		const b = ageGapBoundsFor('husband', 33);
		expect(b).not.toBeNull();
		expect(b!.min).toBe(18);
		expect(b!.max).toBe(48);
		expect(b!.label).toMatch(/within 15 years/);
	});
	it('proprietor age 25 → husband min clamps to 18 (not 10)', () => {
		const b = ageGapBoundsFor('husband', 25);
		expect(b!.min).toBe(18);
		expect(b!.max).toBe(40);
	});
	it('proprietor age 60 → husband 45-75', () => {
		const b = ageGapBoundsFor('husband', 60);
		expect(b!.min).toBe(45);
		expect(b!.max).toBe(75);
	});
	it('missing proprietor age → only the legal floor with generic message', () => {
		const b = ageGapBoundsFor('husband', undefined);
		expect(b!.min).toBe(MIN_CO_APPLICANT_AGE);
		expect(b!.max).toBeUndefined();
	});
});

describe('ageGapBoundsFor — Father (≥15 older)', () => {
	it('proprietor age 33 → father ≥ 48', () => {
		const b = ageGapBoundsFor('father', 33);
		expect(b!.min).toBe(48);
		expect(b!.max).toBeUndefined(); // no upper cap
		expect(b!.label).toMatch(/15 years older/);
	});
	it('proprietor age 25 → father ≥ 40', () => {
		const b = ageGapBoundsFor('father', 25);
		expect(b!.min).toBe(40);
	});
});

describe('ageGapBoundsFor — Son (≥15 younger, ≥18 legal)', () => {
	it('proprietor age 33 → son 18-18 (tight band, just barely valid)', () => {
		const b = ageGapBoundsFor('son', 33);
		expect(b!.min).toBe(18);
		expect(b!.max).toBe(18);
	});
	it('proprietor age 45 → son 18-30', () => {
		const b = ageGapBoundsFor('son', 45);
		expect(b!.min).toBe(18);
		expect(b!.max).toBe(30);
	});
	it('proprietor age 32 → impossible (max<min) — label calls it out', () => {
		const b = ageGapBoundsFor('son', 32);
		expect(b!.min).toBe(18);
		expect(b!.max).toBe(17); // < min → impossible
		expect(b!.label).toMatch(/Proprietor must be at least/);
	});
});

describe('ageGapBoundsFor — Other (only legal floor)', () => {
	it('any proprietor age → min 18, no upper cap', () => {
		const b = ageGapBoundsFor('other', 33);
		expect(b!.min).toBe(MIN_CO_APPLICANT_AGE);
		expect(b!.max).toBeUndefined();
	});
});

describe('isRunnerAgeValid', () => {
	const P_AGE = 33;

	it('Husband 35 (within ±15 of 33) → valid', () => {
		expect(isRunnerAgeValid('husband', P_AGE, 35)).toBe(true);
	});
	it('Husband 50 (>48 cap) → invalid', () => {
		expect(isRunnerAgeValid('husband', P_AGE, 50)).toBe(false);
	});
	it('Husband 15 (<18 legal floor) → invalid', () => {
		expect(isRunnerAgeValid('husband', P_AGE, 15)).toBe(false);
	});

	it('Father 55 (≥48) → valid', () => {
		expect(isRunnerAgeValid('father', P_AGE, 55)).toBe(true);
	});
	it('Father 40 (<48) → invalid', () => {
		expect(isRunnerAgeValid('father', P_AGE, 40)).toBe(false);
	});

	it('Son 18 (exactly at upper bound for prop=33) → valid', () => {
		expect(isRunnerAgeValid('son', P_AGE, 18)).toBe(true);
	});
	it('Son 19 (>18 cap for prop=33) → invalid', () => {
		expect(isRunnerAgeValid('son', P_AGE, 19)).toBe(false);
	});
	it('Son 17 (<18 legal floor) → invalid', () => {
		expect(isRunnerAgeValid('son', P_AGE, 17)).toBe(false);
	});

	it('Other 25 → valid (no upper cap)', () => {
		expect(isRunnerAgeValid('other', P_AGE, 25)).toBe(true);
	});
	it('Other 17 → invalid (legal floor)', () => {
		expect(isRunnerAgeValid('other', P_AGE, 17)).toBe(false);
	});

	it('Self / blank → always valid (no runner to check)', () => {
		expect(isRunnerAgeValid('self', P_AGE, 5)).toBe(true);
		expect(isRunnerAgeValid('', P_AGE, 5)).toBe(true);
	});

	it('non-numeric / zero / negative age → invalid when relation applies', () => {
		expect(isRunnerAgeValid('husband', P_AGE, 0)).toBe(false);
		expect(isRunnerAgeValid('husband', P_AGE, -3)).toBe(false);
		expect(isRunnerAgeValid('husband', P_AGE, NaN)).toBe(false);
		expect(isRunnerAgeValid('husband', P_AGE, null)).toBe(false);
	});
});
