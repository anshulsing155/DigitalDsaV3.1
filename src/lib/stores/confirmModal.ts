/**
 * Compatibility bridge for confirmModal.ts
 *
 * Source of truth: src/lib/state/dialog.svelte.ts (DialogStateManager)
 * This file re-exports store-compatible wrappers so existing consumers
 * using $store / .set() / .subscribe() continue to work.
 *
 * Will be removed in Phase 8 (direct migration of all consumers).
 */

import { dialogState } from '$lib/state/dialog.svelte';
import { fromRune } from '$lib/stores/_bridge.svelte';

// ============================================================================
// Types (re-exported for consumers that import them)
// ============================================================================

export type ConfirmModalState = {
	open: boolean;
	title: string;
	message: string;
	onConfirm: (() => void) | null;
	onCancel?: (() => void) | null;
	confirmLabel?: string;
	cancelLabel?: string | null;
};

// ============================================================================
// Store-compatible bridge
// ============================================================================

/** Confirm modal state — bridge to dialogState.confirmModal */
export const confirmModal = fromRune<ConfirmModalState>(
	() => dialogState.confirmModal,
	(v) => {
		dialogState.confirmModal = v;
	}
);

// ============================================================================
// Helper functions (delegate to dialogState methods)
// ============================================================================

export function openConfirmModal(
	title: string,
	message: string,
	onConfirm: () => void,
	options?: { confirmLabel?: string; cancelLabel?: string | null; onCancel?: () => void }
): void {
	dialogState.openConfirmModal(title, message, onConfirm, options);
}

export function closeConfirmModal(): void {
	dialogState.closeConfirmModal();
}
