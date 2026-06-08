import type { FlowDefinition } from '../types.js';

/**
 * Page order for New Home Loan.
 * All pages included — showWhen conditions gate visibility at runtime.
 */
export const newLoanFlow: FlowDefinition = {
	loanType: 'New Loan',
	description: 'New home loan with property identified or pre-sanction without property',
	pages: [
		'caseIntake_homeLoan',
		'propertyLocation_homeLoan',
		'propertyCharacter_homeLoan',
		// btRegistry not relevant for new loan — gated by showWhen
		'propertyCondition_homeLoan',
		'sellerTransaction_homeLoan', // resale purchases
		'sellerTransaction_authority_homeLoan', // authority purchases
		'legalVerification_homeLoan',
		'tellUs_homeLoan',
		'applicantProfilePage',
		'incomeProfilesPage',
		'incomeDetailsPage',
		'creditScorePage',
		'obligationsPage',
		'dealFinancials_homeLoan',
		// btExistingLoan not relevant for new loan
		// loanRequirements not relevant for new loan
		'sanctionProfile_homeLoan' // only for property NOT identified
	]
};
