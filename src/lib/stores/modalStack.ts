/**
 * Compatibility bridge for modalStack.ts
 *
 * Source of truth: src/lib/state/dialog.svelte.ts (DialogStateManager)
 * This file re-exports the register/unregister functions and
 * a store-compatible `isBodyLocked` derived value.
 *
 * Body scroll locking is now handled inside DialogStateManager's constructor
 * via $effect.root, so the side-effect subscription that was here is no longer needed.
 *
 * Will be removed in Phase 8 (direct migration of all consumers).
 */

import { dialogState } from '$lib/state/dialog.svelte';
import { fromRuneReadonly } from '$lib/stores/_bridge.svelte';

// ============================================================================
// Store-compatible bridge (read-only derived)
// ============================================================================

/** Whether body should be scroll-locked — bridge to dialogState.isBodyLocked */
export const isBodyLocked = fromRuneReadonly<boolean>(() => dialogState.isBodyLocked);

// ============================================================================
// Functions (delegate to dialogState methods)
// ============================================================================

/** Register a modal as open (adds to body-lock stack) */
export function registerModal(id: string): void {
	dialogState.registerModal(id);
}

/** Unregister a modal (removes from body-lock stack) */
export function unregisterModal(id: string): void {
	dialogState.unregisterModal(id);
}
