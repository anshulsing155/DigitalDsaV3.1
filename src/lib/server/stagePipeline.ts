// Stage Transition Pipeline — defines allowed transitions for cases and lender applications
import type { CaseStage, LenderAppStatus } from '$lib/types/case.js';

// ============================================================================
// CASE STAGE TRANSITIONS
// ============================================================================

/** Which case stage transitions are allowed from each stage */
export const ALLOWED_STAGE_TRANSITIONS: Record<CaseStage, CaseStage[]> = {
	// quota_blocked → intake is system-only (FIFO unblock on upgrade/cycle
	// reset). DSAs cannot manually transition out of quota_blocked; the
	// case sits with FormSnapshot saved + no LenderResultsSnapshot until
	// the auto-process trigger fires.
	quota_blocked: ['intake'],
	intake: ['profiling', 'dropped'],
	profiling: ['file_building', 'dropped'],
	file_building: ['submitted', 'dropped'],
	submitted: ['processing', 'rejected', 'dropped'],
	processing: ['query', 'sanctioned', 'rejected'],
	query: ['processing', 'rejected'], // after query resolved, goes back to processing
	sanctioned: ['disbursed', 'dropped'],
	disbursed: ['closed'],
	rejected: ['intake'], // can restart from intake
	dropped: ['intake'], // can reactivate
	closed: [] // terminal
};

/** Check if a case stage transition is allowed */
export function canTransitionTo(current: CaseStage, target: CaseStage): boolean {
	return ALLOWED_STAGE_TRANSITIONS[current].includes(target);
}

/** Get the list of available transitions from a case stage */
export function getAvailableTransitions(current: CaseStage): CaseStage[] {
	return ALLOWED_STAGE_TRANSITIONS[current];
}

/** Validate a case stage transition and return a result with error details */
export function validateTransition(
	current: CaseStage,
	target: CaseStage
): { valid: boolean; error?: string } {
	if (current === target) {
		return { valid: false, error: `Case is already in stage "${current}"` };
	}
	if (!canTransitionTo(current, target)) {
		const allowed = getAvailableTransitions(current);
		const allowedStr = allowed.length > 0 ? allowed.join(', ') : 'none (terminal stage)';
		return {
			valid: false,
			error: `Cannot transition from "${current}" to "${target}". Allowed transitions: ${allowedStr}`
		};
	}
	return { valid: true };
}

// ============================================================================
// LENDER APPLICATION STATUS TRANSITIONS
// ============================================================================

/** Which lender application status transitions are allowed from each status */
export const ALLOWED_LENDER_STATUS_TRANSITIONS: Record<LenderAppStatus, LenderAppStatus[]> = {
	selected: ['file_building', 'withdrawn'],
	file_building: ['ready', 'withdrawn'],
	ready: ['submitted', 'withdrawn'],
	submitted: ['processing', 'rejected', 'withdrawn'],
	processing: ['query', 'sanctioned', 'rejected'],
	query: ['query_responded'],
	query_responded: ['processing', 'rejected'],
	sanctioned: ['disbursed', 'withdrawn'],
	disbursed: [], // terminal
	rejected: [], // terminal
	withdrawn: [] // terminal
};

/** Check if a lender application status transition is allowed */
export function canLenderTransitionTo(current: LenderAppStatus, target: LenderAppStatus): boolean {
	return ALLOWED_LENDER_STATUS_TRANSITIONS[current].includes(target);
}

/** Get the list of available transitions from a lender application status */
export function getAvailableLenderTransitions(current: LenderAppStatus): LenderAppStatus[] {
	return ALLOWED_LENDER_STATUS_TRANSITIONS[current];
}

/** Validate a lender application status transition and return a result with error details */
export function validateLenderTransition(
	current: LenderAppStatus,
	target: LenderAppStatus
): { valid: boolean; error?: string } {
	if (current === target) {
		return { valid: false, error: `Lender application is already in status "${current}"` };
	}
	if (!canLenderTransitionTo(current, target)) {
		const allowed = getAvailableLenderTransitions(current);
		const allowedStr = allowed.length > 0 ? allowed.join(', ') : 'none (terminal status)';
		return {
			valid: false,
			error: `Cannot transition from "${current}" to "${target}". Allowed transitions: ${allowedStr}`
		};
	}
	return { valid: true };
}
