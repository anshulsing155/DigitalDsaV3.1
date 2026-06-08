/**
 * Smart auto-scroll for the form wizard.
 *
 * Two behaviours:
 *   1. **Reveal scroll** — When a showWhen condition reveals 1-3 new questions
 *      and any of them are below the visible viewport, smooth-scroll to the
 *      first off-screen one.
 *   2. **Flow scroll** — When the user answers a question and the next
 *      unanswered question is below the viewport, smooth-scroll to it so the
 *      user can see it without manually scrolling.
 *
 * Scrolling is **minimal** — we only scroll as much as needed to bring the
 * target into view.  This avoids pushing unanswered questions off the top.
 *
 * Usage inside an `$effect`:
 * ```ts
 * const autoScroll = createFormAutoScroll();
 * $effect(() => {
 *     if (currentPageIndex !== lastPageForScroll) {
 *         lastPageForScroll = currentPageIndex;
 *         autoScroll.reset();
 *     }
 *     autoScroll.update(visibleQuestions, currentAnswers);
 * });
 * ```
 */

interface MinimalQuestion {
	id: string;
	bindsTo: string;
	/** Obfuscated DOM ID (production only). Falls back to id in dev. */
	domId?: string;
}

/** Bottom padding reserved for the navigation bar / dropdowns */
const NAV_RESERVE = 140;

/**
 * Scroll the minimum amount so that `el` is fully visible above the nav bar.
 * Does **not** push content above the viewport.
 */
function scrollMinimal(el: Element): void {
	const rect = el.getBoundingClientRect();
	const viewportHeight = window.innerHeight;
	const safeBottom = viewportHeight - NAV_RESERVE;

	if (rect.bottom > safeBottom) {
		// Element is (partially) below the safe zone — scroll down just enough
		const overshoot = rect.bottom - safeBottom;
		window.scrollBy({ top: overshoot + 24, behavior: 'smooth' }); // +24px padding
	} else if (rect.top < 0) {
		// Element is above the viewport — scroll up just enough
		window.scrollBy({ top: rect.top - 24, behavior: 'smooth' });
	}
}

export function createFormAutoScroll() {
	let prevVisibleIds: string[] = [];
	let prevAnsweredCount = 0;
	let isFirstRun = true;

	/**
	 * Call every time `visibleQuestions` or `currentAnswers` change
	 * (reactive — call inside `$effect`).
	 */
	function update(visibleQuestions: MinimalQuestion[], currentAnswers: Record<string, unknown>) {
		const currentIds = visibleQuestions.map((q) => q.id);
		const prevSet = new Set(prevVisibleIds);
		const newIds = currentIds.filter((id) => !prevSet.has(id));

		const answeredCount = visibleQuestions.filter((q) => {
			const v = currentAnswers[q.bindsTo];
			return v !== undefined && v !== null && v !== '';
		}).length;

		// Detect meaningful changes
		const isPageChange = newIds.length > 3; // full page swap — don't scroll
		const hasNewQuestions = newIds.length > 0 && newIds.length <= 3;
		const hasNewAnswer = !isPageChange && answeredCount > prevAnsweredCount;

		// Persist state for next comparison
		prevVisibleIds = currentIds;
		prevAnsweredCount = answeredCount;

		// Skip first run (initial mount) and full page swaps
		if (isFirstRun) {
			isFirstRun = false;
			return;
		}
		if (isPageChange) return;
		if (!hasNewQuestions && !hasNewAnswer) return;

		// Use setTimeout to let Svelte finish rendering new DOM elements
		setTimeout(() => {
			const viewportHeight = window.innerHeight;
			const safeBottom = viewportHeight - NAV_RESERVE;

			// Priority 1: Scroll to first off-screen newly-revealed question
			if (hasNewQuestions) {
				for (const id of newIds) {
					// Use domId for DOM lookup (obfuscated in production)
					const q = visibleQuestions.find((vq) => vq.id === id);
					const domId = q?.domId ?? id;
					const el = document.querySelector(`[data-question-id="${domId}"]`);
					if (!el) continue;
					const rect = el.getBoundingClientRect();
					if (rect.bottom > safeBottom) {
						scrollMinimal(el);
						return; // scrolled — done
					}
				}
			}

			// Priority 2: Scroll to next unanswered question if it's below the fold
			if (hasNewAnswer) {
				for (const q of visibleQuestions) {
					const val = currentAnswers[q.bindsTo];
					const isAnswered = val !== undefined && val !== null && val !== '';
					if (!isAnswered) {
						const el = document.querySelector(`[data-question-id="${q.domId ?? q.id}"]`);
						if (!el) continue;
						const rect = el.getBoundingClientRect();
						if (rect.bottom > safeBottom) {
							scrollMinimal(el);
						}
						break; // only scroll to the first unanswered
					}
				}
			}
		}, 80);
	}

	/**
	 * Reset tracking state (call when the form page changes via wizard
	 * navigation so the next update is treated as a fresh page load).
	 */
	function reset() {
		prevVisibleIds = [];
		prevAnsweredCount = 0;
		isFirstRun = true;
	}

	return { update, reset };
}
