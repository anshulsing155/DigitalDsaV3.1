/**
 * Smart auto-scroll for modal-based forms (Company wizard, etc.)
 *
 * Adapted from `formAutoScroll.ts` for modal scroll containers.
 * Uses the modal's `overflow-y: auto` div instead of `window.scrollBy()`.
 *
 * Scroll strategy:
 *   After the user answers a question, scroll so that the ANSWERED question's
 *   selected option sits near the top of the viewport (~40px margin), and the
 *   NEXT unanswered question with ALL its options is fully visible below.
 *   This gives the user a single comfortable scroll that shows:
 *     - What they just answered (confirmation, near top)
 *     - The next question they need to answer (fully visible)
 *
 *   If the next question is already fully visible → no scroll at all.
 *   Nav buttons (Previous/Next) always stay below the content.
 *
 * Usage:
 * ```ts
 * const autoScroll = createModalAutoScroll();
 * // On tab change:
 * autoScroll.resetAndScrollTop();
 * // In $effect:
 * autoScroll.update(questionKeys, answers);
 * ```
 */

/** Top margin above the answered question when scrolling */
const TOP_MARGIN = 40;

/** Bottom padding so nav buttons / last question has breathing room */
const NAV_RESERVE = 80;

/**
 * Find the modal's scroll container — the `overflow-y: auto` div inside Modal.svelte.
 */
function findScrollContainer(): HTMLElement | null {
	return document.querySelector<HTMLElement>('.overflow-y-auto[class*="max-h-"]');
}

export function createModalAutoScroll() {
	let prevAnsweredKeys: Set<string> = new Set();
	let isFirstRun = true;

	/**
	 * Call on tab change — scrolls modal to top and resets tracking.
	 */
	function resetAndScrollTop() {
		prevAnsweredKeys = new Set();
		isFirstRun = true;
		const container = findScrollContainer();
		if (container) {
			container.scrollTo({ top: 0, behavior: 'smooth' });
		}
	}

	/**
	 * Call inside `$effect` whenever answers change.
	 *
	 * @param questionKeys — Ordered list of question keys matching `data-q` attributes in DOM.
	 * @param answers — Current applicant data to check which keys have values.
	 */
	function update(questionKeys: string[], answers: Record<string, unknown>) {
		const currentAnswered = new Set<string>();
		for (const key of questionKeys) {
			const val = answers[key];
			if (
				val !== undefined &&
				val !== null &&
				val !== '' &&
				!(Array.isArray(val) && val.length === 0)
			) {
				currentAnswered.add(key);
			}
		}

		// Detect new answers
		const newlyAnswered: string[] = [];
		for (const key of currentAnswered) {
			if (!prevAnsweredKeys.has(key)) {
				newlyAnswered.push(key);
			}
		}

		prevAnsweredKeys = currentAnswered;

		if (isFirstRun) {
			isFirstRun = false;
			return;
		}

		if (newlyAnswered.length === 0) return;

		// The last newly answered key — this is what the user just clicked
		const justAnsweredKey = newlyAnswered[newlyAnswered.length - 1];

		setTimeout(() => {
			const container = findScrollContainer();
			if (!container) return;

			const containerRect = container.getBoundingClientRect();
			const safeBottom = containerRect.bottom - NAV_RESERVE;

			// Find the just-answered element and the next unanswered element
			const answeredEl = document.querySelector(`[data-q="${justAnsweredKey}"]`);
			let nextUnansweredEl: Element | null = null;

			for (const key of questionKeys) {
				if (!currentAnswered.has(key)) {
					nextUnansweredEl = document.querySelector(`[data-q="${key}"]`);
					break;
				}
			}

			// If there's no next unanswered question, no scroll needed
			if (!nextUnansweredEl) return;

			const nextRect = nextUnansweredEl.getBoundingClientRect();

			// If the next question is FULLY visible (top to bottom) → no scroll
			if (nextRect.top >= containerRect.top && nextRect.bottom <= safeBottom) {
				return;
			}

			// Find the nav bar (Previous/Next buttons) — it's the last child of company-wrapper
			const navBar = container.querySelector('.company-wrapper > div:last-child');

			// Maximum scroll: stop as soon as nav buttons reach the bottom of viewport
			let maxScroll = Infinity;
			if (navBar) {
				const navRect = navBar.getBoundingClientRect();
				// Max scroll = distance to bring nav bottom to container bottom
				maxScroll = Math.max(0, navRect.bottom - containerRect.bottom);
			}

			// Scroll target: position the answered question near the top,
			// so the next question is fully visible below it.
			let scrollAmount = 0;

			if (answeredEl) {
				const answeredRect = answeredEl.getBoundingClientRect();
				// We want answered question near the top of viewport
				const desiredScrollDelta = answeredRect.top - containerRect.top - TOP_MARGIN;

				// But also ensure the next question's bottom is visible
				const nextBottomOvershoot = nextRect.bottom - safeBottom;

				// Use the larger of the two — ensures both are satisfied
				scrollAmount = Math.max(desiredScrollDelta, nextBottomOvershoot + 24);
			} else {
				// Fallback: just scroll to show next unanswered
				scrollAmount = nextRect.bottom - safeBottom + 24;
			}

			// Clamp: never scroll past the nav bar reaching the bottom
			scrollAmount = Math.min(scrollAmount, maxScroll);

			if (scrollAmount > 10) {
				container.scrollBy({ top: scrollAmount, behavior: 'smooth' });
			}
		}, 80);
	}

	return { update, resetAndScrollTop };
}
