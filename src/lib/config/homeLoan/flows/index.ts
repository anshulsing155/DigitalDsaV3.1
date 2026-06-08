import type { LoanType, FlowDefinition } from '../types.js';
import { newLoanFlow } from './newLoan.js';
import { btOnlyFlow } from './btOnly.js';
import { btTopupFlow } from './btTopup.js';
import { topupOnlyFlow } from './topupOnly.js';
import { preSanctionFlow } from './preSanction.js';

const flowMap: Record<LoanType, FlowDefinition> = {
	'New Loan': newLoanFlow,
	'Balance Transfer Only': btOnlyFlow,
	'Balance Transfer With Top-up': btTopupFlow,
	'Top-up Only': topupOnlyFlow
};

/**
 * Resolve the flow definition for a given loan type.
 * Returns the flow with page order appropriate for the loan type.
 */
export function resolveFlow(loanType: LoanType): FlowDefinition {
	return flowMap[loanType] ?? newLoanFlow;
}

/**
 * Get the pre-sanction flow (property not identified).
 * This is a special case of New Loan.
 */
export function getPreSanctionFlow(): FlowDefinition {
	return preSanctionFlow;
}

export { newLoanFlow, btOnlyFlow, btTopupFlow, topupOnlyFlow, preSanctionFlow };
