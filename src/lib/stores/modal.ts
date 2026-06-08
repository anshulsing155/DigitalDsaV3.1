/**
 * Compatibility bridge for modal.ts
 *
 * Source of truth: src/lib/state/dialog.svelte.ts (DialogStateManager)
 * This file re-exports store-compatible wrappers so existing consumers
 * using $store / .set() / .update() / .subscribe() continue to work.
 *
 * Will be removed in Phase 8 (direct migration of all consumers).
 */

import { dialogState } from '$lib/state/dialog.svelte';
import { fromRune } from '$lib/stores/_bridge.svelte';

// ============================================================================
// Types (re-exported for consumers that import them)
// ============================================================================

export type ModalData = {
	open: boolean;
	description: string | null;
	modalWidth: string;
};

export interface ApplicantModalState {
	open: boolean;
	data: Record<string, unknown> | null;
}

// ============================================================================
// Store-compatible bridges
// ============================================================================

/** Info/description modal state — bridge to dialogState.infoModal */
export const modal = fromRune<ModalData>(
	() => dialogState.infoModal,
	(v) => {
		dialogState.infoModal = v;
	}
);

/** Applicant modal state — bridge to dialogState.applicantModal */
export const applicantModal = fromRune<ApplicantModalState>(
	() => dialogState.applicantModal,
	(v) => {
		dialogState.applicantModal = v;
	}
);

/** Open applicant index — bridge to dialogState.openIndex */
export const openIndex = fromRune<number | null>(
	() => dialogState.openIndex,
	(v) => {
		dialogState.openIndex = v;
	}
);

/** Date area type — bridge to dialogState.dateAreaType */
export const dateAreaType = fromRune<'startDate' | 'endDate' | null>(
	() => dialogState.dateAreaType,
	(v) => {
		dialogState.dateAreaType = v;
	}
);

/** Whether the MonthYearModal is open — bridge to dialogState.isDateAreaOpen */
export const isDateAreaOpen = fromRune<boolean>(
	() => dialogState.isDateAreaOpen,
	(v) => {
		dialogState.isDateAreaOpen = v;
	}
);

/** Selected date string — bridge to dialogState.selectedDate */
export const selectedDate = fromRune<string>(
	() => dialogState.selectedDate,
	(v) => {
		dialogState.selectedDate = v;
	}
);

/** Email OTP modal visibility — bridge to dialogState.showEmailOtpModal */
export const showEmailOtpModal = fromRune<boolean>(
	() => dialogState.showEmailOtpModal,
	(v) => {
		dialogState.showEmailOtpModal = v;
	}
);

/** Modal context (which DatePicker triggered the modal) — bridge to dialogState.modalContext */
export const modalContext = fromRune<{
	applicantIndex: number | null;
	questionId: string | null;
}>(
	() => dialogState.modalContext,
	(v) => {
		dialogState.modalContext = v;
	}
);

/** Date area open constraints — bridge to dialogState.isDateAreaOpenContext */
export const isDateAreaOpenContext = fromRune<{
	minYear: number | null;
	introduceMonthIndia: number | null;
}>(
	() => dialogState.isDateAreaOpenContext,
	(v) => {
		dialogState.isDateAreaOpenContext = v;
	}
);

// ============================================================================
// Helper functions (delegate to dialogState methods)
// ============================================================================

export function openModal(description: string, modalWidth?: string): void {
	dialogState.openModal(description, modalWidth);
}

export function closeModal(): void {
	dialogState.closeModal();
}
