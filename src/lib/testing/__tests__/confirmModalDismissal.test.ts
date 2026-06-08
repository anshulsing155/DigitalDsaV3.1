/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Contract: ConfirmModal dismissal paths must invoke `onCancel` exactly once.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * BACKGROUND
 * ──────────
 * The confirm modal is dismissable five ways:
 *
 *   1. Explicit Confirm button click  → onConfirm fires, modal closes
 *   2. Explicit Cancel button click   → onCancel  fires, modal closes
 *   3. "X" close-icon button click    → DISMISSAL (treated as cancel)
 *   4. Escape key press               → DISMISSAL (treated as cancel)
 *   5. Backdrop click                 → DISMISSAL (treated as cancel)
 *
 * Pre-S104 dismissal paths (3-5) only called `closeConfirmModal()` and never
 * invoked the caller's `onCancel` callback. Any modal that supplied
 * `cancelLabel: null` (e.g. the FEMA "Foreign Country" notice) had no path
 * to invoke onCancel at all — pressing Escape or clicking backdrop silently
 * left the offending value in place.
 *
 * Fix: `dialogState.dismissConfirmModal()` is the canonical "user dismissed"
 * entry point. It fires `onCancel?.()` then closes, and is idempotent — a
 * second call (e.g. from the native <dialog> `close` event after an explicit
 * Confirm-button click already closed the modal) is a no-op.
 *
 * This test pins the contract at the state-manager layer. The ConfirmModal
 * component wires every dismissal path through dismissConfirmModal, so this
 * suite covers the component-level contract by proxy.
 *
 * Companion: docs/PITFALLS.md "Modal dismissal paths must invoke onCancel".
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { dialogState } from '$lib/state/dialog.svelte';

beforeEach(() => {
	// Ensure each test starts with the modal closed
	dialogState.closeConfirmModal();
});

describe('dialogState.dismissConfirmModal — onCancel contract', () => {
	it('invokes onCancel when modal is open and onCancel is defined', () => {
		let cancelCount = 0;
		dialogState.openConfirmModal('Title', 'Message', () => {}, {
			onCancel: () => {
				cancelCount++;
			}
		});

		dialogState.dismissConfirmModal();

		expect(cancelCount, 'onCancel fired exactly once on dismissal').toBe(1);
		expect(dialogState.confirmModal.open, 'modal closed after dismissal').toBe(false);
	});

	it('is idempotent — dismissing an already-closed modal is a no-op', () => {
		let cancelCount = 0;
		dialogState.openConfirmModal('Title', 'Message', () => {}, {
			onCancel: () => {
				cancelCount++;
			}
		});

		dialogState.dismissConfirmModal(); // first call fires
		dialogState.dismissConfirmModal(); // second call is no-op
		dialogState.dismissConfirmModal(); // third call is no-op

		expect(cancelCount, 'onCancel fired exactly once across repeated dismiss calls').toBe(1);
	});

	it('closes the modal without errors when no onCancel was supplied', () => {
		dialogState.openConfirmModal('Title', 'Message', () => {});

		expect(() => dialogState.dismissConfirmModal()).not.toThrow();
		expect(dialogState.confirmModal.open).toBe(false);
	});

	it('does NOT fire onCancel when Confirm-button flow already closed the modal', () => {
		// Simulates ConfirmModal.handleConfirm: invoke onConfirm, then close.
		// The native <dialog> `close` event subsequently fires and would call
		// dialogState.dismissConfirmModal() via the component's `onclose`
		// listener. That re-entry must NOT fire onCancel — the user clicked
		// Confirm, not Cancel.
		let confirmCount = 0;
		let cancelCount = 0;
		dialogState.openConfirmModal(
			'Title',
			'Message',
			() => {
				confirmCount++;
			},
			{
				onCancel: () => {
					cancelCount++;
				}
			}
		);

		// What handleConfirm does:
		dialogState.confirmModal.onConfirm?.();
		dialogState.closeConfirmModal();

		// What the native onclose listener does AFTER the dialog closes:
		dialogState.dismissConfirmModal();

		expect(confirmCount, 'onConfirm fired once').toBe(1);
		expect(
			cancelCount,
			'critical: dismiss-after-confirm must not fire onCancel — user did not cancel'
		).toBe(0);
	});

	it('FEMA flow: dismissal with cancelLabel:null reverts the offending value', () => {
		// Reproduces the original bug. FEMA notice is opened with cancelLabel:null
		// (no Cancel button rendered). User presses Escape to dismiss. The
		// onCancel callback must fire so registrationCountry reverts to India.
		let registrationCountry = 'Foreign Country';
		dialogState.openConfirmModal(
			'FEMA Notice',
			'As per FEMA regulations, companies registered outside India cannot purchase residential property in India.',
			() => {
				registrationCountry = 'India';
			},
			{
				confirmLabel: 'I understand',
				cancelLabel: null,
				onCancel: () => {
					registrationCountry = 'India';
				}
			}
		);

		// User presses Escape → component routes to dismissConfirmModal
		dialogState.dismissConfirmModal();

		expect(
			registrationCountry,
			'offending value reverted to India on Escape dismissal'
		).toBe('India');
		expect(dialogState.confirmModal.open).toBe(false);
	});

	it('handles repeated open / dismiss cycles independently', () => {
		const cancelLog: string[] = [];

		// Cycle 1
		dialogState.openConfirmModal('First', 'msg', () => {}, {
			onCancel: () => cancelLog.push('first')
		});
		dialogState.dismissConfirmModal();
		expect(cancelLog).toEqual(['first']);

		// Cycle 2 — new modal, new onCancel
		dialogState.openConfirmModal('Second', 'msg', () => {}, {
			onCancel: () => cancelLog.push('second')
		});
		dialogState.dismissConfirmModal();
		expect(cancelLog).toEqual(['first', 'second']);

		// Cycle 3 — new modal, no onCancel
		dialogState.openConfirmModal('Third', 'msg', () => {});
		dialogState.dismissConfirmModal();
		expect(cancelLog, 'no onCancel supplied for cycle 3 — log unchanged').toEqual([
			'first',
			'second'
		]);
	});
});
