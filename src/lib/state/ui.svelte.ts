/**
 * UI State using Svelte 5 Runes
 *
 * Handles non-form UI state like:
 * - Toast notifications
 * - Mobile detection
 * - Drawer state
 * - Alert notifications
 *
 * This replaces the UI portions of stores.ts
 */

import { browser } from '$app/environment';
import type { ToastMessage, UIState, ToastType } from '$lib/types/form';

// ============================================================================
// UI STATE CLASS
// ============================================================================

class UIStateManager {
	// Toast notifications
	toasts = $state<ToastMessage[]>([]);

	// Mobile detection
	isMobile = $state(false);

	// Drawer state
	showDrawer = $state(false);

	// Alert notification
	alertNotification = $state<string | null>(null);

	// Internal counter for toast IDs
	private _toastCounter = 0;
	private _resizeHandler: (() => void) | null = null;

	constructor() {
		if (browser) {
			this._initMobileDetection();
		}
	}

	// ============================================================================
	// TOAST METHODS
	// ============================================================================

	/**
	 * Add a toast notification
	 */
	addToast(toast: { type: ToastType; message: string; duration?: number }): number {
		const id = Date.now() + ++this._toastCounter;
		const duration = toast.duration ?? 5000;

		this.toasts = [
			...this.toasts,
			{
				id,
				type: toast.type,
				message: toast.message,
				duration
			}
		];

		// Auto-remove toast after duration
		if (browser) {
			setTimeout(() => {
				this.removeToast(id);
			}, duration);
		}

		return id;
	}

	/**
	 * Remove a toast by ID
	 */
	removeToast(id: number): void {
		this.toasts = this.toasts.filter((t) => t.id !== id);
	}

	/**
	 * Clear all toasts
	 */
	clearToasts(): void {
		this.toasts = [];
	}

	/**
	 * Add a success toast
	 */
	success(message: string, duration?: number): number {
		return this.addToast({ type: 'success', message, duration });
	}

	/**
	 * Add an error toast
	 */
	error(message: string, duration?: number): number {
		return this.addToast({ type: 'error', message, duration });
	}

	/**
	 * Add a warning toast
	 */
	warning(message: string, duration?: number): number {
		return this.addToast({ type: 'warning', message, duration });
	}

	/**
	 * Add an info toast
	 */
	info(message: string, duration?: number): number {
		return this.addToast({ type: 'info', message, duration });
	}

	// ============================================================================
	// MOBILE DETECTION
	// ============================================================================

	/**
	 * Initialize mobile detection
	 */
	private _initMobileDetection(): void {
		if (!browser) return;

		this._updateMobileStatus();

		this._resizeHandler = () => this._updateMobileStatus();
		window.addEventListener('resize', this._resizeHandler);

		// Cleanup on HMR
		if (import.meta.hot) {
			import.meta.hot.dispose(() => {
				if (this._resizeHandler) {
					window.removeEventListener('resize', this._resizeHandler);
				}
			});
		}
	}

	private _updateMobileStatus(): void {
		if (browser) {
			this.isMobile = window.innerWidth <= 768;
		}
	}

	/**
	 * Manually reinitialize mobile detection (e.g., after SSR hydration)
	 */
	reinitMobileDetection(): void {
		this._initMobileDetection();
	}

	// ============================================================================
	// DRAWER METHODS
	// ============================================================================

	/**
	 * Open the drawer
	 */
	openDrawer(): void {
		this.showDrawer = true;
	}

	/**
	 * Close the drawer
	 */
	closeDrawer(): void {
		this.showDrawer = false;
	}

	/**
	 * Toggle the drawer
	 */
	toggleDrawer(): void {
		this.showDrawer = !this.showDrawer;
	}

	// ============================================================================
	// ALERT METHODS
	// ============================================================================

	/**
	 * Set alert notification
	 */
	setAlert(message: string): void {
		this.alertNotification = message;
	}

	/**
	 * Clear alert notification
	 */
	clearAlert(): void {
		this.alertNotification = null;
	}

	// ============================================================================
	// RESET
	// ============================================================================

	/**
	 * Reset all UI state
	 */
	reset(): void {
		this.toasts = [];
		this.showDrawer = false;
		this.alertNotification = null;
		// Note: isMobile is not reset as it's based on window size
	}

	// ============================================================================
	// SERIALIZATION
	// ============================================================================

	/**
	 * Export current state as JSON
	 */
	toJSON(): UIState {
		return {
			toasts: this.toasts,
			isMobile: this.isMobile,
			showDrawer: this.showDrawer,
			alertNotification: this.alertNotification
		};
	}
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

/**
 * Global UI state instance
 * Import this in components to access UI state
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { uiState } from '$lib/state/ui.svelte';
 *
 *   const isMobile = $derived(uiState.isMobile);
 *
 *   function showSuccess() {
 *     uiState.success('Operation completed!');
 *   }
 * </script>
 * ```
 */
export const uiState = new UIStateManager();

// ============================================================================
// COMPATIBILITY EXPORTS
// ============================================================================

/**
 * Add a toast (backward compatibility with stores.ts addToast)
 */
export function addToast(toast: { type: ToastType; message: string; duration?: number }): void {
	uiState.addToast(toast);
}

/**
 * Initialize mobile detection (backward compatibility with stores.ts initMobileDetection)
 */
export function initMobileDetection(): void {
	uiState.reinitMobileDetection();
}
