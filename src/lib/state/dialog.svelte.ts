/**
 * Unified Dialog & Modal State Manager
 *
 * Replaces:
 *   - src/lib/stores/modal.ts        (9 writable stores + helper functions)
 *   - src/lib/stores/agreeModal.ts    (1 writable store + open/close helpers)
 *   - src/lib/stores/confirmModal.ts  (1 writable store + open/close helpers)
 *   - src/lib/stores/modalStack.ts    (writable + derived + body lock side-effect)
 *
 * Pattern: Svelte 5 runes class (matches auth.svelte.ts, form.svelte.ts, ui.svelte.ts)
 */

import { browser } from '$app/environment';

// ============================================================================
// TYPES
// ============================================================================

/** State for the generic info modal (modal.ts → `modal` store) */
export interface InfoModalState {
	open: boolean;
	description: string | null;
	modalWidth: string;
}

/** State for the applicant modal (modal.ts → `applicantModal` store) */
export interface ApplicantModalState {
	open: boolean;
	data: Record<string, unknown> | null;
}

/** State for the agree modal */
export interface AgreeModalState {
	open: boolean;
	title: string;
	message: string;
	onAgree: (() => void) | null;
}

/**
 * Visual icon variant rendered in the modal header.
 *
 * - `send` — submission flow (Plot/Home/etc. new application). Icon: Send.
 * - `edit` — re-submitting an existing case. Icon: Edit3.
 * - `alert` — exhausted-quota state or other warning headers. Icon: AlertTriangle.
 * - `info` — generic informational header. Icon: Info (default fallback).
 *
 * Undefined keeps the legacy heuristic (destructive title keywords → red AlertTriangle,
 * otherwise amber Info).
 *
 * LEND-1 follow-up: ConfirmModal redesign (S204 stack pop 2026-06-02).
 */
export type ConfirmModalIcon = 'send' | 'edit' | 'alert' | 'info';

/**
 * Color-tinted badge chip rendered under the modal title. Used by the submit/edit
 * flow to surface the DSA's current quota state at the moment of confirm
 * (e.g. "3 of 5 saves used"). Tint matches the top-bar quota indicator language.
 */
export interface ConfirmModalBadge {
	text: string;
	tint: 'green' | 'amber' | 'red' | 'neutral';
}

/**
 * Optional secondary action button rendered between Cancel and Confirm. Used by the
 * exhausted-quota state to surface "Save for next cycle" alongside Upgrade/Review.
 * `style: 'secondary'` renders as an outlined neutral button; `style: 'subtle'` is
 * a flatter link-style fallback when space is tight.
 */
export interface ConfirmModalSecondaryAction {
	label: string;
	onClick: () => void;
	style?: 'secondary' | 'subtle';
}

/** State for the confirm modal */
export interface ConfirmModalState {
	open: boolean;
	title: string;
	message: string;
	onConfirm: (() => void) | null;
	onCancel?: (() => void) | null;
	confirmLabel?: string;
	cancelLabel?: string | null;
	/** Visual icon variant; undefined falls back to the destructive-title heuristic. */
	icon?: ConfirmModalIcon;
	/** Color-tinted badge chip under the title (e.g. quota state). */
	badge?: ConfirmModalBadge;
	/** Italic footer note above the action row (e.g. in-flight-case context). */
	footerNote?: string;
	/** Optional middle button (e.g. "Save for next cycle" on the exhausted state). */
	secondaryAction?: ConfirmModalSecondaryAction;
}

/** Context identifying which DatePicker instance opened the MonthYearModal */
export interface ModalContext {
	applicantIndex: number | null;
	questionId: string | null;
}

/** Constraints passed to the MonthYearModal */
export interface DateAreaOpenContext {
	minYear: number | null;
	maxYear?: number | null;
	introduceMonthIndia: number | null;
	/**
	 * Forward-only fields (e.g. "Planned registration month") set this to
	 * true so the picker disables months strictly earlier than the current
	 * month. Defaults to false — past-anchored fields like disbursement
	 * dates retain legacy behavior. See CLAUDE.md §3 Pitfall (Planned
	 * registration month accepts past months, 2026-05-28).
	 */
	futureOnly?: boolean;
}

// ============================================================================
// DIALOG STATE CLASS
// ============================================================================

class DialogStateManager {
	// ==========================================================================
	// From modal.ts — Info Modal
	// ==========================================================================

	/** Generic info/description modal state */
	infoModal = $state<InfoModalState>({
		open: false,
		description: '',
		modalWidth: ''
	});

	// ==========================================================================
	// From modal.ts — Applicant Modal
	// ==========================================================================

	/** Applicant modal state */
	applicantModal = $state<ApplicantModalState>({
		open: false,
		data: null
	});

	// ==========================================================================
	// From modal.ts — Individual stores
	// ==========================================================================

	/** Index of the currently open applicant (used by archived components) */
	openIndex = $state<number | null>(null);

	/** Type of date area being edited */
	dateAreaType = $state<'startDate' | 'endDate' | null>(null);

	/** Whether the MonthYearModal date picker is open */
	isDateAreaOpen = $state<boolean>(false);

	/** The currently selected date string in the MonthYearModal */
	selectedDate = $state<string>('');

	/**
	 * Monotonically increments each time MonthYearModal confirms a pick.
	 *
	 * Why: closeDatePicker intentionally leaves `selectedDate` + `modalContext`
	 * intact so DatePickerYearAndMonth's $effect can still observe the confirmed
	 * value after close. But that leftover state is a hazard: a DatePicker that
	 * mounts AFTERWARDS (e.g., a second business-proprietorship entry's GST date
	 * field) would read the stale `selectedDate` on its very first effect run,
	 * see a matching `modalContext`, and silently apply the previous entry's
	 * date — no user click required.
	 *
	 * DatePickerYearAndMonth snapshots this epoch on mount and only reacts when
	 * the epoch advances past that snapshot. New mounts are inert toward
	 * anything already on the notepad; only fresh user picks trigger apply.
	 */
	selectionEpoch = $state<number>(0);

	/** Whether the email OTP verification modal is visible */
	showEmailOtpModal = $state<boolean>(false);

	/** Context identifying which DatePicker opened the MonthYearModal */
	modalContext = $state<ModalContext>({
		applicantIndex: null,
		questionId: null
	});

	/** Constraints for the MonthYearModal (min year, month boundary) */
	isDateAreaOpenContext = $state<DateAreaOpenContext>({
		minYear: null,
		introduceMonthIndia: null
	});

	/**
	 * The value of the field that opened the MonthYearModal.
	 * Used by the modal to initialise year/month to the field's current value
	 * rather than the stale last-selected date.
	 */
	datePickerInitialValue = $state<string>('');

	/**
	 * Same-company prompt slot. Lives here (and not as a local $state in
	 * IncomePageNew) so the modal can be rendered at the form/+layout level,
	 * OUTSIDE the per-applicant profile modal's <dialog> tree. Nesting our
	 * own <dialog> inside the profile modal's <dialog> caused the inner one
	 * to render behind the parent in some browser stacking edge cases —
	 * users reported "Update Entry does nothing on duplicate company name"
	 * (the prompt fired but was invisible until they closed the profile
	 * modal). Layout-level rendering guarantees a clean top-layer slot.
	 */
	sameCompanyPrompt = $state<{
		sourceApplicantName: string;
		entityName: string;
		onConfirm: () => void;
		onDeny: () => void;
	} | null>(null);

	// ==========================================================================
	// From agreeModal.ts
	// ==========================================================================

	/** Agree modal state (single-button acknowledgment dialog) */
	agreeModal = $state<AgreeModalState>({
		open: false,
		title: '',
		message: '',
		onAgree: null
	});

	// ==========================================================================
	// From confirmModal.ts
	// ==========================================================================

	/** Confirm modal state (two-button confirm/cancel dialog) */
	confirmModal = $state<ConfirmModalState>({
		open: false,
		title: '',
		message: '',
		onConfirm: null
	});

	// ==========================================================================
	// From modalStack.ts — Body scroll lock
	// ==========================================================================

	/** Stack of currently open modal IDs for body scroll locking */
	private _modalStack = $state<string[]>([]);

	/** Whether any modal is open (drives body scroll lock) */
	get isBodyLocked(): boolean {
		return this._modalStack.length > 0;
	}

	/** Cleanup function for the body lock effect */
	private _bodyLockCleanup: (() => void) | null = null;

	// ==========================================================================
	// CONSTRUCTOR
	// ==========================================================================

	constructor() {
		if (browser) {
			this._initBodyLock();
		}
	}

	// ==========================================================================
	// INFO MODAL METHODS (from modal.ts)
	// ==========================================================================

	/** Open the info/description modal */
	openModal(description: string, modalWidth?: string): void {
		this.infoModal = {
			open: true,
			description,
			modalWidth: modalWidth || ''
		};
	}

	/** Close the info/description modal */
	closeModal(): void {
		this.infoModal = {
			open: false,
			description: '',
			modalWidth: ''
		};
	}

	// ==========================================================================
	// AGREE MODAL METHODS (from agreeModal.ts)
	// ==========================================================================

	/** Open the agree modal */
	openAgreeModal(title: string, message: string, onAgree: () => void): void {
		this.agreeModal = {
			open: true,
			title,
			message,
			onAgree
		};
	}

	/** Close the agree modal */
	closeAgreeModal(): void {
		this.agreeModal = {
			open: false,
			title: '',
			message: '',
			onAgree: null
		};
	}

	// ==========================================================================
	// CONFIRM MODAL METHODS (from confirmModal.ts)
	// ==========================================================================

	/** Open the confirm modal */
	openConfirmModal(
		title: string,
		message: string,
		onConfirm: () => void,
		options?: {
			confirmLabel?: string;
			cancelLabel?: string | null;
			onCancel?: () => void;
			icon?: ConfirmModalIcon;
			badge?: ConfirmModalBadge;
			footerNote?: string;
			secondaryAction?: ConfirmModalSecondaryAction;
		}
	): void {
		this.confirmModal = {
			open: true,
			title,
			message,
			onConfirm,
			onCancel: options?.onCancel ?? null,
			confirmLabel: options?.confirmLabel,
			cancelLabel: options?.cancelLabel,
			icon: options?.icon,
			badge: options?.badge,
			footerNote: options?.footerNote,
			secondaryAction: options?.secondaryAction
		};
	}

	/** Close the confirm modal */
	closeConfirmModal(): void {
		this.confirmModal = {
			open: false,
			title: '',
			message: '',
			onConfirm: null
		};
	}

	/**
	 * Treat the confirm modal as dismissed by the user (X close button /
	 * Escape key / backdrop click / native <dialog> `close` event). Fires
	 * `onCancel` if one was supplied, then closes. Idempotent — calling
	 * when the modal is already closed is a no-op.
	 *
	 * Idempotency matters because the native `close` event fires AFTER
	 * `handleConfirm` / `handleCancel` already closed the modal via
	 * `closeConfirmModal`. Without the guard, every Confirm-button click
	 * would also fire onCancel a tick later via the native close listener.
	 *
	 * See docs/PITFALLS.md "Modal dismissal paths must invoke onCancel"
	 * for the FEMA regression that motivated this method.
	 */
	dismissConfirmModal(): void {
		if (!this.confirmModal.open) return;
		const onCancel = this.confirmModal.onCancel;
		onCancel?.();
		this.closeConfirmModal();
	}

	// ==========================================================================
	// MODAL STACK METHODS (from modalStack.ts)
	// ==========================================================================

	/** Register a modal as open (adds to body-lock stack) */
	registerModal(id: string): void {
		if (this._modalStack.includes(id)) return;
		this._modalStack = [...this._modalStack, id];
	}

	/** Unregister a modal (removes from body-lock stack) */
	unregisterModal(id: string): void {
		this._modalStack = this._modalStack.filter((m) => m !== id);
	}

	// ==========================================================================
	// BODY LOCK (from modalStack.ts)
	// ==========================================================================

	/** Initialize reactive body overflow lock using $effect.root */
	private _initBodyLock(): void {
		this._bodyLockCleanup = $effect.root(() => {
			$effect(() => {
				const locked = this.isBodyLocked;
				document.body.style.overflow = locked ? 'hidden' : '';
				document.documentElement.style.overflow = locked ? 'hidden' : '';
			});
		});

		// Cleanup on HMR
		if (import.meta.hot) {
			import.meta.hot.dispose(() => {
				this._bodyLockCleanup?.();
			});
		}
	}

	// ==========================================================================
	// DATE PICKER METHODS
	// ==========================================================================

	/**
	 * Atomically open the MonthYearModal for a specific DatePicker field.
	 * Replaces the previous pattern of 4 sequential store writes which had
	 * a small race window and left stale data from previous pickers.
	 *
	 * @param applicantIndex - Index of the applicant owning this field
	 * @param questionId     - Unique key of the question / field
	 * @param currentValue   - The field's current value (e.g. "May-2020") so the
	 *                         modal opens on the right year, not a stale one
	 * @param minYear        - Earliest selectable year
	 * @param introduceMonthIndia - Earliest selectable month index for minYear
	 * @param maxYear        - Latest selectable year (defaults to current year if null)
	 */
	openDatePicker(
		applicantIndex: number | null,
		questionId: string,
		currentValue: string,
		minYear: number | null,
		introduceMonthIndia: number | null,
		maxYear: number | null = null,
		futureOnly: boolean = false
	): void {
		// Single atomic write — no race window between context + open flag
		this.modalContext = { applicantIndex, questionId };
		this.datePickerInitialValue = currentValue;
		this.selectedDate = currentValue; // pre-seed for continuity
		this.isDateAreaOpenContext = { minYear, maxYear, introduceMonthIndia, futureOnly };
		this.isDateAreaOpen = true;
	}

	/**
	 * Close the MonthYearModal without selecting a date.
	 * Clears transient picker state.
	 */
	closeDatePicker(): void {
		this.isDateAreaOpen = false;
		// Keep selectedDate so DatePickerYearAndMonth $effect can still fire
		// for any last confirmed selection; it is re-seeded on next open.
	}

	// ==========================================================================
	// RESET
	// ==========================================================================

	/** Reset all dialog state */
	reset(): void {
		this.infoModal = { open: false, description: '', modalWidth: '' };
		this.applicantModal = { open: false, data: null };
		this.openIndex = null;
		this.dateAreaType = null;
		this.isDateAreaOpen = false;
		this.selectedDate = '';
		this.datePickerInitialValue = '';
		this.showEmailOtpModal = false;
		this.modalContext = { applicantIndex: null, questionId: null };
		this.isDateAreaOpenContext = { minYear: null, introduceMonthIndia: null };
		this.agreeModal = { open: false, title: '', message: '', onAgree: null };
		this.confirmModal = { open: false, title: '', message: '', onConfirm: null };
		this._modalStack = [];
	}
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

/**
 * Global dialog state instance.
 * Import this in components to access dialog/modal state.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { dialogState } from '$lib/state/dialog.svelte';
 *
 *   function showInfo() {
 *     dialogState.openModal('Some description text');
 *   }
 *
 *   function askConfirm() {
 *     dialogState.openConfirmModal(
 *       'Delete?',
 *       'This cannot be undone.',
 *       () => { performDelete(); }
 *     );
 *   }
 * </script>
 * ```
 */
export const dialogState = new DialogStateManager();
