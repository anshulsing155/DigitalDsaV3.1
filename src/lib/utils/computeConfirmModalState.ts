/**
 * Confirm-and-submit modal state computer
 * ══════════════════════════════════════════════════════════════════════
 * Pure function. Given the DSA's current quota state, an optional in-flight
 * case summary, and whether this is an edit-resubmit vs new-submit, returns
 * the four locked decisions for the submit/edit ConfirmModal:
 *
 *   1. Headline + body copy (state-specific)
 *   2. Icon variant (send / edit / alert)
 *   3. Quota badge (text + tint matching the state)
 *   4. In-flight footer note (shown only when relevant)
 *   5. Primary / secondary CTAs (Submit / Save-for-next-cycle / Review)
 *
 * 4 states:
 *   - 'normal'        — quota healthy (more than 1 save left). Green badge.
 *                       In-flight footer suppressed (not actionable info yet).
 *   - 'approaching'   — 1 save left after submit. Amber badge.
 *                       In-flight footer shown if a case is in flight.
 *   - 'exhausted'     — 0 saves left. Red badge. Primary CTA pushes Upgrade;
 *                       secondary CTA offers "Save for next cycle" (QBC buffer);
 *                       in-flight footer shown if relevant.
 *   - 'edit'          — re-submitting an existing case. Edit copy + green badge
 *                       reflecting current state; no in-flight footer (the case
 *                       being edited IS the in-flight case — would be redundant).
 *
 * Why a pure function: state-mapping logic is the test target. The page-server
 * load wires up the inputs; this function decides the modal shape; the modal
 * component renders it. Decoupled so changes to UX copy don't touch wiring or
 * rendering.
 *
 * LEND-1 stack-pop, 2026-06-02.
 */

import type { QuotaState } from '$lib/server/billing/quotaState';
import type { InFlightCaseSummary } from '$lib/server/billing/getInFlightCase';
import type {
	ConfirmModalBadge,
	ConfirmModalIcon,
	ConfirmModalSecondaryAction
} from '$lib/state/dialog.svelte';

export type ConfirmModalStateKey = 'normal' | 'approaching' | 'exhausted' | 'edit';

export interface ConfirmModalConfig {
	state: ConfirmModalStateKey;
	title: string;
	message: string;
	confirmLabel: string;
	cancelLabel: string;
	icon: ConfirmModalIcon;
	badge?: ConfirmModalBadge;
	footerNote?: string;
	/** Provided ONLY on the exhausted state (Save for next cycle). */
	secondaryAction?: ConfirmModalSecondaryAction;
}

export interface ComputeInput {
	/** Quota state at the moment of confirm. Optional — when null, falls back to legacy non-billing copy (no badge). */
	quotaState: QuotaState | null;
	/** Latest in-flight case for this DSA. Null when none exists. */
	inFlightCase: InFlightCaseSummary | null;
	/** Edit-resubmit vs new-submit branch. */
	isEdit: boolean;
	/**
	 * Called when the DSA picks "Upgrade plan" on the exhausted-state primary CTA.
	 * Page wires this to the existing upgrade-modal opener.
	 */
	onUpgrade?: () => void;
	/**
	 * Called when the DSA picks "Save for next cycle" on the exhausted-state secondary CTA.
	 * Page wires this to the QBC save flow.
	 */
	onSaveForNextCycle?: () => void;
}

/** Format a Date-ISO string for the exhausted-state body copy. */
function formatNextCycle(iso?: string): string {
	if (!iso) return 'next cycle';
	const d = new Date(iso);
	if (isNaN(d.getTime())) return 'next cycle';
	return d.toLocaleDateString('en-IN', {
		day: 'numeric',
		month: 'short',
		year: 'numeric'
	});
}

/** Build the in-flight footer note. Returns undefined when no footer should render. */
function buildFooterNote(
	inFlightCase: InFlightCaseSummary | null,
	state: ConfirmModalStateKey
): string | undefined {
	// Footer is decision-relevant only when quota is tight (approaching / exhausted).
	// On 'normal' state we suppress it — the DSA has plenty of room and the
	// existence of another case isn't a trade-off. On 'edit' the in-flight case
	// IS the one being edited; surfacing it would be confusing.
	if (state !== 'approaching' && state !== 'exhausted') return undefined;
	if (!inFlightCase) return undefined;

	const stagePhrase =
		inFlightCase.stage === 'intake'
			? 'still in intake'
			: inFlightCase.stage === 'profiling'
				? 'mid-profiling'
				: 'in file-building';

	if (state === 'approaching') {
		return `You have an in-flight case (${inFlightCase.label}) ${stagePhrase}. Submitting now uses your last save this cycle.`;
	}
	// exhausted
	return `Your in-flight case (${inFlightCase.label}) is ${stagePhrase} and still counts in this cycle.`;
}

export function computeConfirmModalState(input: ComputeInput): ConfirmModalConfig {
	const { quotaState, inFlightCase, isEdit, onUpgrade, onSaveForNextCycle } = input;

	// ── Edit branch: short-circuit. Edit copy doesn't change with quota state. ──
	if (isEdit) {
		const badge = buildQuotaBadge(quotaState, 'edit');
		return {
			state: 'edit',
			title: 'Save changes to this application?',
			message:
				'This will create a new version and count as one more submission under your monthly plan. Please verify every change before submitting.',
			confirmLabel: 'Save and resubmit',
			cancelLabel: 'Review details',
			icon: 'edit',
			badge,
			footerNote: undefined
		};
	}

	// ── New-submit branch: branch by quota state ──
	const state = classifyState(quotaState);
	const badge = buildQuotaBadge(quotaState, state);
	const footerNote = buildFooterNote(inFlightCase, state);

	if (state === 'exhausted') {
		// Primary-CTA selection:
		//   - When the page wires `onUpgrade`, the primary CTA is "Upgrade plan"
		//     and clicking it opens the upgrade modal directly. Cleanest UX.
		//   - When `onUpgrade` is NOT wired, fall back to "Submit application"
		//     and let the existing /evaluating page handle the exhaustion gate
		//     via its inline upgrade-required view (per QBC UX inversion,
		//     S214). The badge + footer still surface the state; the CTA stays
		//     functional via the existing post-submit path.
		const confirmLabel = onUpgrade ? 'Upgrade plan' : 'Submit application';

		return {
			state: 'exhausted',
			title: 'Quota exhausted for this cycle',
			message: `You've used all ${quotaState?.caseLimit ?? '0'} saves this cycle. Upgrade to keep submitting, or save this for next cycle (resumes ${formatNextCycle(
				quotaState?.nextCycleAt
			)}).`,
			confirmLabel,
			cancelLabel: 'Review details',
			icon: 'alert',
			badge,
			footerNote,
			secondaryAction:
				onSaveForNextCycle && quotaState && quotaState.bufferRemaining > 0
					? {
							label: 'Save for next cycle',
							onClick: onSaveForNextCycle,
							style: 'secondary'
						}
					: undefined
		};
	}

	// 'normal' and 'approaching' share the same copy + CTAs; only the badge tint differs.
	return {
		state,
		title: 'Ready to submit?',
		message:
			'Please double-check every detail — applicant info, income, loan amount, property cost. Once submitted, this counts as one submission under your monthly plan, and any change to the form afterwards requires another submission. Adjustments to loan tenure or down payment (Home Loan / Plot Loan) can still be made on the offer page without another submission.',
		confirmLabel: 'Submit application',
		cancelLabel: 'Review details',
		icon: 'send',
		badge,
		footerNote
	};
}

/** Classify the modal state from QuotaState. Defaults to 'normal' when quotaState is null. */
function classifyState(quotaState: QuotaState | null): Exclude<ConfirmModalStateKey, 'edit'> {
	if (!quotaState) return 'normal';
	if (quotaState.isExhausted) return 'exhausted';
	if (quotaState.caseLimit === Infinity) return 'normal';

	// Approaching = exactly 1 save left after THIS submit (or less).
	// activeCount = cases already used; submitting one more makes it activeCount + 1.
	// caseLimit - (activeCount + 1) is the saves remaining after submit.
	const savesLeftAfterSubmit = quotaState.caseLimit - (quotaState.activeCount + 1);
	if (savesLeftAfterSubmit <= 0) return 'approaching';
	return 'normal';
}

/** Build the badge chip text + tint from quota state. Returns undefined when quotaState is null. */
function buildQuotaBadge(
	quotaState: QuotaState | null,
	state: ConfirmModalStateKey
): ConfirmModalBadge | undefined {
	if (!quotaState) return undefined;
	if (quotaState.caseLimit === Infinity) return undefined; // Enterprise — no point showing a quota chip

	const used = quotaState.activeCount;
	const limit = quotaState.caseLimit;
	const left = Math.max(0, limit - used);

	const text =
		left > 0 ? `${used} of ${limit} saves used · ${left} left` : `${used} of ${limit} saves used`;

	const tint: ConfirmModalBadge['tint'] =
		state === 'exhausted' ? 'red' : state === 'approaching' ? 'amber' : 'green';

	return { text, tint };
}
