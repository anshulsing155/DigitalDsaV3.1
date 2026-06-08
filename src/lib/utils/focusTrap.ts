/**
 * Focus trap Svelte action.
 *
 * For <dialog> elements opened with showModal(), the browser already traps
 * focus natively.  This action adds two missing behaviours:
 *
 *   1. **Focus restore** — saves `document.activeElement` on mount and
 *      returns focus to it when the action is destroyed (modal closes).
 *   2. **Initial focus** — moves focus to the first tabbable element inside
 *      the node (or the node itself if nothing is tabbable).
 *
 * For div-based overlays (like CommandPalette) it also provides a full
 * keyboard focus trap via Tab/Shift+Tab cycling.
 *
 * @example
 * <!-- Dialog-based modal (native trap, adds restore + initial focus) -->
 * <dialog use:focusTrap>...</dialog>
 *
 * <!-- Div-based overlay (full trap + restore + initial focus) -->
 * <div use:focusTrap>...</div>
 */

const FOCUSABLE = [
	'a[href]',
	'button:not([disabled])',
	'input:not([disabled])',
	'select:not([disabled])',
	'textarea:not([disabled])',
	'[tabindex]:not([tabindex="-1"])'
].join(', ');

function getTabbables(container: HTMLElement): HTMLElement[] {
	return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
		(el) => el.offsetParent !== null
	); // visible only
}

export function focusTrap(node: HTMLElement) {
	const previouslyFocused = document.activeElement as HTMLElement | null;
	const isDialog = node.tagName === 'DIALOG';

	// Move focus to first tabbable (or the node itself) on next tick
	// so the modal content has rendered.
	requestAnimationFrame(() => {
		const tabbables = getTabbables(node);
		if (tabbables.length > 0) {
			tabbables[0].focus();
		} else {
			node.setAttribute('tabindex', '-1');
			node.focus();
		}
	});

	// For div-based overlays, add Tab/Shift+Tab cycling.
	// <dialog showModal()> already traps natively, so skip for dialogs.
	let handleKeydown: ((e: KeyboardEvent) => void) | null = null;

	if (!isDialog) {
		handleKeydown = (e: KeyboardEvent) => {
			if (e.key !== 'Tab') return;

			const tabbables = getTabbables(node);
			if (tabbables.length === 0) return;

			const first = tabbables[0];
			const last = tabbables[tabbables.length - 1];

			if (e.shiftKey && document.activeElement === first) {
				e.preventDefault();
				last.focus();
			} else if (!e.shiftKey && document.activeElement === last) {
				e.preventDefault();
				first.focus();
			}
		};

		node.addEventListener('keydown', handleKeydown);
	}

	return {
		destroy() {
			if (handleKeydown) {
				node.removeEventListener('keydown', handleKeydown);
			}
			// Restore focus to the element that opened the modal
			previouslyFocused?.focus?.();
		}
	};
}
