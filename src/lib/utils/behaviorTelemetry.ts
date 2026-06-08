/**
 * Behavioral Telemetry — lightweight client-side signal collection.
 *
 * Tracks BOOLEAN signals (not keystrokes or values):
 *   - hadMouseMovement, hadScrolling, hadFieldFocus, hadKeyboardInput, hadPasteEvents
 *   - focusBlurCount, timeToFirstInteraction
 *
 * Purpose: distinguish real users from headless browser automation.
 * Bots can fake some signals but struggle to fake ALL signals naturally.
 *
 * Usage per form page:
 *   const telemetry = new BehaviorTelemetry();
 *   onMount(() => telemetry.attach());
 *   onDestroy(() => telemetry.destroy());
 *   // On page change: telemetry.reset()
 *   // On evaluate call: telemetry.getSignals()
 */

import type { BehaviorSignals } from '$lib/types/formSession';

export class BehaviorTelemetry {
	private hadMouseMovement = false;
	private hadScrolling = false;
	private hadFieldFocus = false;
	private hadKeyboardInput = false;
	private hadPasteEvents = false;
	private focusBlurCount = 0;
	private pageLoadTime = Date.now();
	private firstInteractionTime: number | null = null;
	private attached = false;

	// Bound handlers for cleanup
	private onMouseMove = () => {
		this.hadMouseMovement = true;
		this.recordFirstInteraction();
	};
	private onScroll = () => {
		this.hadScrolling = true;
		this.recordFirstInteraction();
	};
	private onFocusIn = () => {
		this.hadFieldFocus = true;
		this.focusBlurCount++;
		this.recordFirstInteraction();
	};
	private onKeyDown = () => {
		this.hadKeyboardInput = true;
		this.recordFirstInteraction();
	};
	private onPaste = () => {
		this.hadPasteEvents = true;
		this.recordFirstInteraction();
	};

	private recordFirstInteraction() {
		if (this.firstInteractionTime === null) {
			this.firstInteractionTime = Date.now();
		}
	}

	/** Attach DOM listeners. Call in onMount. */
	attach(): void {
		if (this.attached || typeof document === 'undefined') return;
		this.attached = true;

		// Use { passive: true, once: true } for mouse/scroll — only need to detect once
		document.addEventListener('mousemove', this.onMouseMove, { passive: true, once: true });
		document.addEventListener('scroll', this.onScroll, { passive: true, once: true });
		document.addEventListener('focusin', this.onFocusIn, { passive: true });
		document.addEventListener('keydown', this.onKeyDown, { passive: true, once: true });
		document.addEventListener('paste', this.onPaste, { passive: true, once: true });
	}

	/** Remove all DOM listeners. Call in onDestroy. */
	destroy(): void {
		if (!this.attached || typeof document === 'undefined') return;
		this.attached = false;

		document.removeEventListener('mousemove', this.onMouseMove);
		document.removeEventListener('scroll', this.onScroll);
		document.removeEventListener('focusin', this.onFocusIn);
		document.removeEventListener('keydown', this.onKeyDown);
		document.removeEventListener('paste', this.onPaste);
	}

	/** Get current behavioral signals snapshot. */
	getSignals(): BehaviorSignals {
		return {
			hadMouseMovement: this.hadMouseMovement,
			hadScrolling: this.hadScrolling,
			hadFieldFocus: this.hadFieldFocus,
			hadKeyboardInput: this.hadKeyboardInput,
			hadPasteEvents: this.hadPasteEvents,
			focusBlurCount: this.focusBlurCount,
			timeToFirstInteraction: this.firstInteractionTime
				? this.firstInteractionTime - this.pageLoadTime
				: -1
		};
	}

	/** Reset signals for a new page. */
	reset(): void {
		this.hadMouseMovement = false;
		this.hadScrolling = false;
		this.hadFieldFocus = false;
		this.hadKeyboardInput = false;
		this.hadPasteEvents = false;
		this.focusBlurCount = 0;
		this.pageLoadTime = Date.now();
		this.firstInteractionTime = null;

		// Re-attach one-time listeners that may have fired
		if (this.attached && typeof document !== 'undefined') {
			document.removeEventListener('mousemove', this.onMouseMove);
			document.removeEventListener('scroll', this.onScroll);
			document.removeEventListener('keydown', this.onKeyDown);
			document.removeEventListener('paste', this.onPaste);

			document.addEventListener('mousemove', this.onMouseMove, { passive: true, once: true });
			document.addEventListener('scroll', this.onScroll, { passive: true, once: true });
			document.addEventListener('keydown', this.onKeyDown, { passive: true, once: true });
			document.addEventListener('paste', this.onPaste, { passive: true, once: true });
		}
	}
}
