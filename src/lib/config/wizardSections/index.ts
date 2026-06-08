export { homeLoanSections } from './homeLoan';
export { businessLoanSections } from './businessLoan';
export { lapLoanSections } from './lapLoan';
export { plotLoanSections } from './plotLoan';
export { personalLoanSections } from './personalLoan';
export { professionalLoanSections } from './professionalLoan';

import { homeLoanSections } from './homeLoan';
import { businessLoanSections } from './businessLoan';
import { lapLoanSections } from './lapLoan';
import { plotLoanSections } from './plotLoan';
import { personalLoanSections } from './personalLoan';
import { professionalLoanSections } from './professionalLoan';
import type { WizardSectionConfig } from '$lib/types/wizard';

const configMap: Record<string, WizardSectionConfig> = {
	'Home Loan': homeLoanSections,
	'Business Loan': businessLoanSections,
	'Loan Against Property': lapLoanSections,
	LAP: lapLoanSections,
	'Plot Loan': plotLoanSections,
	'Personal Loan': personalLoanSections,
	'Professional Loan': professionalLoanSections
};

export function getSectionConfig(loanName: string): WizardSectionConfig | undefined {
	return configMap[loanName];
}
