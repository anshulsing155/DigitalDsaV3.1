/**
 * ═══════════════════════════════════════════════════════════════════════════
 * S77e — Payload Assembler: FormEndState → LoanApplicationPayload
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Wraps `buildLoanPayload()` — the canonical payload builder used by the
 * real submission pipeline — so fixture-factory output matches what a
 * real DSA session would submit.
 *
 * This is a deliberate design choice. The prior archetype system built
 * `LoanApplicationPayload` shapes by hand, which is exactly how fixture
 * drift crept in: hand-written payloads diverged from what
 * `buildLoanPayload()` would actually produce for the same inputs. By
 * routing through the real builder, the factory's output is correct
 * by construction — any bug in the builder is either a bug a real
 * submission would also hit (caught by integration tests), or a
 * difference we want tests to see.
 *
 * See spec §4a and §7 FM-1 (the pre-migration snapshot lock uses this
 * assembler's output as the reference shape).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { buildLoanPayload } from '$lib/utils/payloadBuilder/index.js';
import type { LoanApplicationPayload } from '$lib/utils/payloadBuilder/types.js';
import type { FormEndState } from './journeyTypes.js';

// ─────────────────────────────────────────────────────────────────────────────
// Assemble
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Converts a `FormEndState` into a `LoanApplicationPayload`.
 *
 * `loanName` is required — `buildLoanPayload()` reads it from
 * `applicationData.loanName` to drive transaction-payload shape
 * decisions. Extra `applicationData` keys (e.g. `numberOfApplicants`,
 * derived flags) can be passed via `extraApplicationData`.
 *
 * `relationships` lets you model co-borrower / guarantor / director
 * ties when a journey has multi-applicant steps. Default: empty.
 */
export function toLoanApplicationPayload(
	endState: FormEndState,
	loanName: string,
	opts?: {
		extraApplicationData?: Record<string, unknown>;
		relationships?: Array<{
			fromId: string;
			toId: string;
			relationType: string;
			category?: string;
		}>;
		/**
		 * Frozen-time injection for deterministic time-derived fields
		 * (`loanVintageMonths`). Tests pass FIXTURE_NOW; production omits.
		 * Threads through to `buildLoanTransactionPayload`. Added 2026-06-01
		 * (S210, TECH-DEBT-CLEANUP D-incoming-4 Level-3 fix).
		 */
		now?: Date;
	}
): LoanApplicationPayload {
	const applicationData: Record<string, unknown> = {
		loanName,
		// `buildLoanTransactionPayload` reads numberOfApplicants from
		// applicationData in some code paths; default to the journey's
		// observed applicant count so payload shape matches session state.
		numberOfApplicants: endState.applicants.length,
		...(opts?.extraApplicationData ?? {})
	};

	return buildLoanPayload(
		endState.answers,
		endState.applicants as Record<string, unknown>[],
		applicationData,
		opts?.relationships,
		{ now: opts?.now }
	);
}
