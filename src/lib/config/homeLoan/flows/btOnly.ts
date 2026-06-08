import type { FlowDefinition } from '../types.js';

export const btOnlyFlow: FlowDefinition = {
	loanType: 'Balance Transfer Only',
	description: 'Transfer existing home loan from one lender to another — no top-up',
	pages: [
		'caseIntake_homeLoan',
		'propertyLocation_homeLoan',
		'propertyCharacter_homeLoan',
		'btRegistry_homeLoan',
		'propertyCondition_homeLoan',
		// No seller page — no new transaction
		'legalVerification_homeLoan',
		'tellUs_homeLoan',
		'applicantProfilePage',
		'incomeProfilesPage',
		'incomeDetailsPage',
		'creditScorePage',
		'obligationsPage',
		// No dealFinancials — no new deal
		'btExistingLoan_homeLoan',
		'loanRequirements_homeLoan'
		// No sanctionProfile — not applicable
	]
};
