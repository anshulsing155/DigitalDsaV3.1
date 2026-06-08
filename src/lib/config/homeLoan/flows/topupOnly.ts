import type { FlowDefinition } from '../types.js';

export const topupOnlyFlow: FlowDefinition = {
	loanType: 'Top-up Only',
	description: 'Additional disbursement on existing loan — same lender, same property',
	pages: [
		'caseIntake_homeLoan',
		'propertyLocation_homeLoan',
		'propertyCharacter_homeLoan',
		'btRegistry_homeLoan',
		'propertyCondition_homeLoan',
		// No seller page
		'legalVerification_homeLoan',
		'tellUs_homeLoan',
		'applicantProfilePage',
		'incomeProfilesPage',
		'incomeDetailsPage',
		'creditScorePage',
		'obligationsPage',
		// No dealFinancials
		'btExistingLoan_homeLoan',
		'loanRequirements_homeLoan'
		// No sanctionProfile
	]
};
