import type { FlowDefinition } from '../types.js';

export const btTopupFlow: FlowDefinition = {
	loanType: 'Balance Transfer With Top-up',
	description: 'Transfer existing loan + additional disbursement',
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
		// No sanctionProfile
	]
};
