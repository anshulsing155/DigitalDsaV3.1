/**
 * Business Loan — page-set regression coverage (post Option-B company-multi rework).
 *
 * A company applicant (Pvt Ltd / OPC / Partnership / LLP) now uses the multi
 * cards + modal flow — its business profile and financials are captured inside
 * the applicant modal (Identity / Character / Income tabs). So the standalone
 * `businessProfilePage` and `companyFinancialsPage` are RETIRED from the schema:
 * keeping them duplicated the modal (Problem D — "Business Profile questions
 * repeated outside the Applicant section") under divergent, dead keys.
 *
 * Sole proprietorship (a lone Individual) still uses the flattened single-applicant
 * pages (income profiles/details, credit, obligations).
 */
import { describe, it, expect } from 'vitest';
import { composeBusinessLoanSchema } from '$lib/config/businessLoan/composer';

describe('Business Loan — page set (company → modal, sole-prop → flattened)', () => {
	const schema = composeBusinessLoanSchema();
	const pageIds = schema.pages.map((p) => p.id);

	it('businessProfilePage is retired (company captures it in the applicant modal)', () => {
		expect(pageIds).not.toContain('businessProfilePage');
	});

	it('companyFinancialsPage is retired (company financials live in the modal Income tab)', () => {
		expect(pageIds).not.toContain('companyFinancialsPage');
	});

	it('sole-prop flattened pages still exist', () => {
		expect(pageIds).toContain('incomeProfilesPage');
		expect(pageIds).toContain('incomeDetailsPage');
		expect(pageIds).toContain('creditScorePage');
		expect(pageIds).toContain('obligationsPage');
		expect(pageIds).toContain('applicantProfilePage');
	});
});
