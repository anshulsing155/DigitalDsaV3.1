/**
 * Case triage (Audit B.5 — daily DSA cases view).
 * ════════════════════════════════════════════════════════════════════
 * Turns a case's operational signals into a single "what do I do next?"
 * answer + a priority bucket, so the daily list can sort the cases that
 * NEED the DSA to the top. Pure + unit-tested — the brain of the triage table.
 *
 * Priority drives the default sort (lower `rank` = more urgent). `nextAction`
 * is the headline column the DSA scans.
 */

export type CasePriority = 'high' | 'medium' | 'low' | 'none';

export interface CaseTriageSignals {
	stage: string;
	lendersCount: number;
	/** Overall document completion across lenders, 0–100. */
	docsPercent: number;
	openQueryCount: number;
	daysInStage: number;
}

export interface CaseTriage {
	priority: CasePriority;
	/** Sort key — lower is more urgent. Tie-break on daysInStage desc in the caller. */
	rank: number;
	nextAction: string;
}

/** Days in a stage past which a case is "stuck" and bumped to high priority. */
const STAGE_STUCK_DAYS: Record<string, number> = {
	intake: 5,
	profiling: 7,
	file_building: 10,
	submitted: 10,
	processing: 21,
	query: 3
};

/** Stages that need no DSA action. */
const TERMINAL_LABELS: Record<string, string> = {
	sanctioned: 'Sanctioned',
	disbursed: 'Disbursed',
	rejected: 'Rejected',
	dropped: 'Dropped',
	closed: 'Closed'
};

export function computeCaseTriage(s: CaseTriageSignals): CaseTriage {
	// Terminal stages — informational, sink to the bottom.
	if (TERMINAL_LABELS[s.stage]) {
		return { priority: 'none', rank: 100, nextAction: TERMINAL_LABELS[s.stage] };
	}

	const threshold = STAGE_STUCK_DAYS[s.stage];
	const isStuck = threshold != null && s.daysInStage > threshold;

	// 1) Open queries — always the most urgent.
	if (s.openQueryCount > 0) {
		const n = s.openQueryCount;
		return { priority: 'high', rank: 0, nextAction: `${n} quer${n === 1 ? 'y' : 'ies'} to resolve` };
	}

	// 2) Stuck in stage too long — follow up.
	if (isStuck) {
		return { priority: 'high', rank: 1, nextAction: `Stuck ${s.daysInStage}d — follow up` };
	}

	// 3) Early stage with no lenders — the file isn't started.
	if ((s.stage === 'intake' || s.stage === 'profiling') && s.lendersCount === 0) {
		return { priority: 'medium', rank: 2, nextAction: 'Add lenders / build file' };
	}

	// 4) Lenders chosen but documents incomplete.
	if (s.lendersCount > 0 && s.docsPercent < 100) {
		return { priority: 'medium', rank: 3, nextAction: `Docs ${s.docsPercent}% — complete & submit` };
	}

	// 5) File ready (lenders + docs done) but not yet submitted.
	if (s.lendersCount > 0 && s.docsPercent >= 100 && s.stage !== 'submitted' && s.stage !== 'processing') {
		return { priority: 'medium', rank: 4, nextAction: 'Submit file' };
	}

	// 6) Submitted / processing — waiting on the lender, no DSA action.
	if (s.stage === 'submitted' || s.stage === 'processing') {
		return { priority: 'low', rank: 5, nextAction: 'Awaiting lender' };
	}

	return { priority: 'low', rank: 6, nextAction: 'Review' };
}
