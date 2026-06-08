/**
 * Compatibility bridge for agreeModal.ts
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

export type AgreeModalState = {
	open: boolean;
	title: string;
	message: string;
	onAgree: (() => void) | null;
};

// ============================================================================
// Store-compatible bridge
// ============================================================================

/** Agree modal state — bridge to dialogState.agreeModal */
export const agreeModal = fromRune<AgreeModalState>(
	() => dialogState.agreeModal,
	(v) => {
		dialogState.agreeModal = v;
	}
);

// ============================================================================
// Helper functions (delegate to dialogState methods)
// ============================================================================

export function openAgreeModal(title: string, message: string, onAgree: () => void): void {
	dialogState.openAgreeModal(title, message, onAgree);
}

export function closeAgreeModal(): void {
	dialogState.closeAgreeModal();
}
