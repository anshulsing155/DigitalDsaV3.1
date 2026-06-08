import { describe, it, expect } from 'vitest';
import { rendersAsSingleApplicant } from '$lib/utils/applicantViewMode';

/**
 * Pins the single/multi view decision so the count-based mistake (a lone Company
 * treated as a single person) can't come back. Company ⇒ multi; sole-prop /
 * lone Individual ⇒ single.
 */
describe('rendersAsSingleApplicant', () => {
	it('lone Individual (sole-prop / personal) → single', () => {
		expect(rendersAsSingleApplicant([{ applicantType: 'Individual' }])).toBe(true);
	});

	it('lone Company → MULTI (directors are co-applicants; never a single person)', () => {
		expect(rendersAsSingleApplicant([{ applicantType: 'Company' }])).toBe(false);
	});

	it('two Individuals → multi', () => {
		expect(
			rendersAsSingleApplicant([{ applicantType: 'Individual' }, { applicantType: 'Individual' }])
		).toBe(false);
	});

	it('company + co-applicants → multi', () => {
		expect(
			rendersAsSingleApplicant([{ applicantType: 'Company' }, { applicantType: 'Individual' }])
		).toBe(false);
	});

	it('empty / undefined → single (safe default for an empty case)', () => {
		expect(rendersAsSingleApplicant([])).toBe(true);
		expect(rendersAsSingleApplicant(undefined)).toBe(true);
		expect(rendersAsSingleApplicant(null)).toBe(true);
	});
});
