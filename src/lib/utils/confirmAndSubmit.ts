/**
 * Confirm-and-Submit — pre-submit ConfirmModal wrapper around
 * submitFormForEvaluation.
 * ════════════════════════════════════════════════════════════════════
 *
 * Why this exists
 * ──────────────
 * Every loan form's submit handler used to call submitFormForEvaluation
 * directly, which meant a click on "Show Offers" immediately fired the
 * server-side evaluate-and-persist call, created the case, and pushed
 * the DSA to the offer page. There was no last-look confirmation, and
 * once the DSA realised they'd typo'd a name or wrong-clicked a loan
 * type, the case was already created — the only way back was to
 * re-edit and re-submit, which (under the upcoming monthly-quota
 * billing model) will consume another case from their plan.
 *
 * This wrapper interposes a ConfirmModal between the submit click and
 * the network call:
 *
 *   "Ready to submit? — please double-check every detail. Once
 *   submitted, any change to the form afterwards requires another
 *   submission and counts against your monthly plan."
 *
 * Adjustments that DON'T require a re-submit (loan tenure slider,
 * down-payment slider on Home / Plot loans) live on the offer page and
 * never round-trip through here.
 *
 * Why a separate file (not inlined into formSubmitHandler.ts)
 * ───────────────────────────────────────────────────────────
 * `formSubmitHandler.ts` is a pure server-call utility — no DOM, no
 * UI state. Adding modal interaction in there would muddle concerns
 * and break its unit-testability. This file is the thin UI shim.
 *
 * Billing-model note
 * ──────────────────
 * The "counts against your monthly plan" copy is truthful today (no
 * enforcement) and stays truthful tomorrow (when the billing rewrite
 * lands and `evaluate-and-persist` starts gating on a monthly quota).
 * The modal is the user-expectation surface; the gate is the
 * enforcement surface. They can ship independently.
 */

import { dialogState } from '$lib/state/dialog.svelte';
import { submitFormForEvaluation, type SubmitOptions, type SubmitResult } from './formSubmitHandler';
import { computeConfirmModalState } from './computeConfirmModalState';
import type { QuotaState } from '$lib/server/billing/quotaState';
import type { InFlightCaseSummary } from '$lib/server/billing/getInFlightCase';

/** Result shape extended with a cancelled flag for the "Review details" path. */
export interface ConfirmSubmitResult extends SubmitResult {
	/** True when the user dismissed the modal without confirming. Caller should treat as a no-op, NOT an error. */
	cancelled?: boolean;
	/** True when the DSA picked the exhausted-state "Save for next cycle" path. Caller should NOT submit; the QBC save flow handles it. */
	savedForNextCycle?: boolean;
	/** True when the DSA picked the exhausted-state "Upgrade plan" primary CTA. Caller should open the upgrade modal; do NOT submit. */
	openedUpgrade?: boolean;
}

/**
 * Extended options for the redesigned ConfirmModal flow (LEND-1 stack-pop, 2026-06-02).
 * All fields optional — when omitted, the legacy text-only modal renders unchanged.
 *
 * Callers that don't pass quotaState see the original "Ready to submit?" copy
 * with no badge / no footer. Callers that pass quotaState get state-specific
 * copy + a tinted badge + (when relevant) an in-flight footer.
 */
export interface ConfirmSubmitContext {
	/** Quota state from `getQuotaState(dsaId)` at page-load time. */
	quotaState?: QuotaState | null;
	/** In-flight case from `getInFlightCase(dsaId)` at page-load time. */
	inFlightCase?: InFlightCaseSummary | null;
	/** Called when the DSA picks "Upgrade plan" on the exhausted-state primary CTA. */
	onUpgrade?: () => void;
	/** Called when the DSA picks "Save for next cycle" on the exhausted-state secondary CTA. */
	onSaveForNextCycle?: () => void;
}

// QBC UX inversion (2026-05-30): the save-prompt + upgrade-required modals
// that used to live here have moved into /evaluating/+page.svelte as inline
// views (not modals). The pre-submit ConfirmModal stays here as the single
// "are you sure?" gate; everything downstream (API call + branching on
// quota_buffer_available / quota_fully_exhausted / network errors) lives
// on /evaluating. Net UX: single spinner instead of two; save-prompt is a
// dedicated screen instead of a modal stacked on the form page.

// Modal copy + state mapping now live in `computeConfirmModalState.ts`. The
// pure function takes (quotaState, inFlightCase, isEdit) and returns the
// modal options (title / body / badge / footerNote / icon / CTAs). i18n in
// the future swaps the copy lookups inside that helper without touching this
// file. Older callers that don't pass `context` get the 'normal' state copy,
// which matches the prior text exactly.

/**
 * Show the pre-submit ConfirmModal, then (only on confirm) call
 * `submitFormForEvaluation`. The returned Promise resolves with either:
 *   - the SubmitResult from the actual submit (success or failure), or
 *   - { success: false, cancelled: true } if the DSA dismissed the modal.
 *
 * Callers should treat `cancelled: true` as a no-op (no error message,
 * no state change beyond clearing `isSubmitting`).
 *
 * @example
 *   const result = await confirmAndSubmit({ loanType, ... });
 *   if (result.cancelled) return;                  // user wants to review
 *   if (!result.success) throw new Error(result.error);
 */
export function confirmAndSubmit(
	options: SubmitOptions,
	context?: ConfirmSubmitContext
): Promise<ConfirmSubmitResult> {
	const isEdit = !!options.editCaseId;

	// Compute modal state from quota + in-flight inputs. When no context is
	// supplied, the helper returns 'normal' state with no badge/footer — matching
	// the legacy modal exactly so older call sites stay byte-identical in UX.
	const modalConfig = computeConfirmModalState({
		quotaState: context?.quotaState ?? null,
		inFlightCase: context?.inFlightCase ?? null,
		isEdit,
		onUpgrade: context?.onUpgrade,
		onSaveForNextCycle: context?.onSaveForNextCycle
	});

	return new Promise<ConfirmSubmitResult>((resolve) => {
		// Exhausted-state branch:
		//   - When the page wires onUpgrade, the primary CTA opens the upgrade
		//     modal directly (no submit). Resolves with `openedUpgrade: true` so
		//     the caller knows to clear isSubmitting without showing an error.
		//   - When onUpgrade is NOT wired, fall through to the normal submit
		//     path — /evaluating handles the exhaustion gate via its inline
		//     upgrade-required view (QBC UX inversion, S214). No regression.
		const onPrimaryConfirm =
			modalConfig.state === 'exhausted' && context?.onUpgrade
				? async () => {
						context.onUpgrade!();
						resolve({ success: false, openedUpgrade: true });
					}
				: async () => {
						try {
							// QBC UX inversion: submitFormForEvaluation stashes the options
							// + navigates to /evaluating; outcome branching lives there.
							const result = await submitFormForEvaluation(options);
							resolve(result);
						} catch (err) {
							// Defensive: submitFormForEvaluation already catches and returns
							// { success: false, ... }; if a future refactor lets an exception
							// escape, we still resolve cleanly so the caller's `await` doesn't
							// hang and the form's `isSubmitting` flag eventually clears.
							resolve({
								success: false,
								error: err instanceof Error ? err.message : 'Submit failed',
								code: 'CONFIRM_WRAPPER_ERROR'
							});
						}
					};

		// Wrap the secondary action so picking it resolves the outer Promise.
		// The QBC save flow lives at the call site (form submit handler).
		const secondaryAction = modalConfig.secondaryAction
			? {
					...modalConfig.secondaryAction,
					onClick: () => {
						modalConfig.secondaryAction?.onClick();
						resolve({ success: false, savedForNextCycle: true });
					}
				}
			: undefined;

		dialogState.openConfirmModal(modalConfig.title, modalConfig.message, onPrimaryConfirm, {
			confirmLabel: modalConfig.confirmLabel,
			cancelLabel: modalConfig.cancelLabel,
			icon: modalConfig.icon,
			badge: modalConfig.badge,
			footerNote: modalConfig.footerNote,
			secondaryAction,
			// onCancel covers ALL dismissal paths — explicit Cancel button,
			// X close, Escape, backdrop click, native <dialog> close event
			// — per Pitfall #39. Without this, dismissing via Escape would
			// leave the outer Promise unresolved and the form stuck in
			// `isSubmitting = true`.
			onCancel: () => resolve({ success: false, cancelled: true })
		});
	});
}
