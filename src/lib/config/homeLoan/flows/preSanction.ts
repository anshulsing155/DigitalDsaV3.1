import type { FlowDefinition } from '../types.js';

export const preSanctionFlow: FlowDefinition = {
	loanType: 'New Loan',
	description: 'New loan where property is NOT yet identified — pre-sanction assessment',
	pages: [
		'caseIntake_homeLoan',
		// No property pages — property not identified
		'tellUs_homeLoan',
		'applicantProfilePage',
		'incomeProfilesPage',
		'incomeDetailsPage',
		'creditScorePage',
		'obligationsPage',
		'sanctionProfile_homeLoan'
	]
};
