import { describe, test, expect } from 'vitest';
import { calculateCreditLineFoirEligibleLimit } from '$lib/ruleEngine/emiCalculator';

describe('Credit Line FOIR', () => {
	test('basic: 100K income, 0.5 FOIR, 10K obligations, 0.05 factor', () => {
		expect(calculateCreditLineFoirEligibleLimit(100000, 0.5, 10000, 0.05)).toBe(800000);
	});

	test('zero income returns 0', () => {
		expect(calculateCreditLineFoirEligibleLimit(0, 0.5, 0, 0.05)).toBe(0);
	});

	test('obligations exceed headroom returns 0', () => {
		expect(calculateCreditLineFoirEligibleLimit(100000, 0.5, 60000, 0.05)).toBe(0);
	});

	test('zero factor returns 0', () => {
		expect(calculateCreditLineFoirEligibleLimit(100000, 0.5, 10000, 0)).toBe(0);
	});

	test('no obligations: full headroom', () => {
		expect(calculateCreditLineFoirEligibleLimit(100000, 0.5, 0, 0.05)).toBe(1000000);
	});
});
