import { describe, it, expect } from 'vitest';
import { computeSectionCompletion } from '$lib/utils/incomeTabState';

/**
 * Regression guard for Problem 2 validation rule: a director/partner linked to a
 * Company applicant on the case MUST declare income from a company they actually
 * direct (an income entry sourced from a linked company, with income filled).
 * Extra director income from OTHER companies is allowed, but the same-company
 * income is mandatory — Next must stay blocked until it exists.
 */

const opts = { requireResidencePattern: false };

function director(entries: unknown[], linkedCompanyIds: string[]) {
	return {
		applicantType: 'Individual',
		selectedIncomeProfiles: ['director_company'],
		linkedCompanyIds,
		incomeEntries: entries
	} as Record<string, unknown>;
}

const filledIncome = { drawsSalary: true, monthlySalaryAmount: 100000 };

describe('director same-company income gate (income_details completion)', () => {
	it('complete when income is declared from the linked company', () => {
		const result = computeSectionCompletion(
			director(
				[
					{
						id: 'e1',
						profileType: 'director_company',
						entityName: 'Sweets Corner',
						sourceCompanyId: 'c1',
						income: filledIncome
					}
				],
				['c1']
			),
			opts
		);
		expect(result.income_details).toBe(true);
	});

	it('blocked when a selector-linked entry points at a DIFFERENT (non-linked) company', () => {
		const result = computeSectionCompletion(
			director(
				[
					{
						id: 'e1',
						profileType: 'director_company',
						entityName: 'Other Co',
						sourceCompanyId: 'cX', // linked via selector, but NOT the company on this case
						income: filledIncome
					}
				],
				['c1']
			),
			opts
		);
		expect(result.income_details).toBe(false);
	});

	it('TOLERANT: legacy free-typed director income (no sourceCompanyId) is NOT blocked', () => {
		// Cases built before the company selector have no sourceCompanyId — blocking
		// these would wedge submit on existing data. A filled director income suffices.
		const result = computeSectionCompletion(
			director(
				[{ id: 'e1', profileType: 'director_company', entityName: 'Sweets Corner', income: filledIncome }],
				['c1']
			),
			opts
		);
		expect(result.income_details).toBe(true);
	});

	it('complete when both the linked company AND an extra "Other" company are declared', () => {
		const result = computeSectionCompletion(
			director(
				[
					{ id: 'e1', profileType: 'director_company', sourceCompanyId: 'c1', income: filledIncome },
					{ id: 'e2', profileType: 'director_company', entityName: 'Other Co', income: filledIncome }
				],
				['c1']
			),
			opts
		);
		expect(result.income_details).toBe(true);
	});

	it('does not apply when the individual is not a linked director (no linkedCompanyIds)', () => {
		const result = computeSectionCompletion(
			director(
				[{ id: 'e1', profileType: 'director_company', entityName: 'Some Co', income: filledIncome }],
				[]
			),
			opts
		);
		expect(result.income_details).toBe(true);
	});

	it('blocked when the linked-company entry exists but income is not filled', () => {
		const result = computeSectionCompletion(
			director(
				[{ id: 'e1', profileType: 'director_company', sourceCompanyId: 'c1', income: {} }],
				['c1']
			),
			opts
		);
		expect(result.income_details).toBe(false);
	});
});
