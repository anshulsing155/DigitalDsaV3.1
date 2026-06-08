/**
 * [ARCHIVED 2026-04-21 — S77c Phase 3.3]
 *
 * Backward-compatible bridge that wrapped the Svelte-5 runes module
 * `cleanPayloadStore.svelte.ts` into Svelte-4 store-compatible exports
 * (`$cleanPayload` / `$casePayload` auto-subscription).
 *
 * All call sites have been migrated to import directly from
 * `$lib/stores/cleanPayloadStore.svelte` and use the runes API
 * (`cleanPayloadState.cleanPayload`, etc.). This shim no longer has any
 * importers — it was preserved here to keep the runtime surface area of
 * the active codebase small while honouring the repo's "archive, never
 * delete" policy (see `_archive/README.md`).
 *
 * Migrated importers (now reach the runes module directly):
 *   - src/lib/components/PayloadDebugger.svelte
 *   - src/routes/(app)/form/home-loan/+page.svelte
 *   - src/routes/(app)/form/lap/+page.svelte
 *   - src/routes/(app)/form/plot-loan/+page.svelte
 *   - src/routes/(app)/form/unsecure-loan/personal-loan/+page.svelte
 *   - src/routes/(app)/form/unsecure-loan/business-loan/+page.svelte
 *   - src/routes/(app)/form/unsecure-loan/professional-loan/+page.svelte
 *
 * Restoration: the last live copy sat at
 *   src/lib/stores/cleanPayloadStore.ts
 * prior to archival. Git history (commit immediately before S77c Phase 3.3)
 * carries the full contents if an export ever needs to be revived.
 *
 * Phase: Svelte 5 migration + submission-pipeline rewrite (S77c).
 */

import { fromRuneReadonly } from '$lib/stores/_bridge.svelte';
import { cleanPayloadState } from '../../cleanPayloadStore.svelte';
import type { LoanApplicationPayload } from '$lib/utils/payloadBuilder';
import type { CasePayload } from '$lib/types/casePayload';

// ─────────────────────────────────────────────────────────────────────────────
// STORE-COMPATIBLE BRIDGES (for $cleanPayload / $casePayload syntax)
// ─────────────────────────────────────────────────────────────────────────────

/** @deprecated Use cleanPayloadState.cleanPayload from '$lib/stores/cleanPayloadStore.svelte' */
export const cleanPayload = fromRuneReadonly<LoanApplicationPayload>(
	() => cleanPayloadState.cleanPayload
);

/** @deprecated Use cleanPayloadState.casePayload from '$lib/stores/cleanPayloadStore.svelte' */
export const casePayload = fromRuneReadonly<CasePayload>(() => cleanPayloadState.casePayload);

// ─────────────────────────────────────────────────────────────────────────────
// RE-EXPORTED FUNCTIONS (pass-through from .svelte.ts)
// ─────────────────────────────────────────────────────────────────────────────

export {
	getCleanPayload,
	getCasePayload,
	getApplicantPayload,
	getLoanTransactionPayload,
	logCleanPayload,
	getPayloadAsJSON,
	compareWithExisting,
	submitCleanPayload,
	cleanPayloadState
} from '../../cleanPayloadStore.svelte';

// ─────────────────────────────────────────────────────────────────────────────
// RE-EXPORTED TYPES (pass-through, unchanged)
// ─────────────────────────────────────────────────────────────────────────────

export type {
	LoanApplicationPayload,
	ApplicantPayload,
	LoanTransactionPayload,
	ObligationEntry,
	FinancialsData,
	DirectorInfo,
	GPADetails,
	CleanIncomeEntry,
	RelationshipEntry,
	StructuredPayload
} from '$lib/utils/payloadBuilder';

export { buildStructuredPayload } from '$lib/utils/payloadBuilder';
export { buildCleanAnswers, groupAnswersBySchema } from '$lib/utils/payloadGrouping';
export { buildCasePayload } from '$lib/utils/casePayloadBuilder';
export type {
	CasePayload,
	CaseScreening,
	CasePropertyLocation,
	CasePropertyTechnical,
	CasePropertyLegal,
	CasePropertyFinancial,
	CaseSeller,
	CaseLoanDetails,
	CaseBalanceTransfer,
	CaseTopUp,
	CaseApplicant,
	CaseApplicantPersonal,
	CaseApplicantIncome,
	CaseApplicantObligations,
	CaseApplicantCibil,
	CaseDerivedInsights,
	CaseDerivedApplicant
} from '$lib/types/casePayload';
