/**
 * Business-runner stash (P12 retrieval)
 * ════════════════════════════════════════════════════════════════════════════
 * When a female sole-proprietor's "Who runs the business?" answer is changed away
 * (gender flipped, or back to "Self"), the auto-created runner co-applicant is
 * removed from the active applicants list — but the DSA may return to female and
 * want those details back. We stash the removed runner here, keyed by proprietor
 * id, so re-creating the runner can rehydrate it (reusing the same applicant id,
 * which also re-links its income/obligations in applicantDataStore).
 *
 * Kept in its OWN session-persisted store (not applicationData, which is Zod-
 * parsed and would strip the key; and not applicantRecoveryStore, to avoid the
 * runner showing up as a generic restorable applicant in the Restore modal).
 */
import { sessionPersisted } from './_bridge.svelte';

/** proprietorId → the last removed runner applicant object for that proprietor. */
export const businessRunnerStashStore = sessionPersisted<Record<string, Record<string, unknown>>>(
	'business-runner-stash',
	{}
);
