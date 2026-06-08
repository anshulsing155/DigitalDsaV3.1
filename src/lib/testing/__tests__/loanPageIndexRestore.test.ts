/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Contract: `computePageIndexOnRemount` rehydrates currentPageIndex on
 * client-side remount of a loan +page.svelte so browser-back from results
 * doesn't lose the user's place.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Pre-fix repro: user navigates several pages deep, clicks "Show Offers" →
 * `/evaluating` → `/results`. Browser-back returns to the loan form, which
 * re-mounts with `currentPageIndex` defaulting to 0. The sync `$effect`
 * blindly writes 0 back into formState.<loan>PageIndex, destroying the saved
 * value. The user lands on page 1.
 *
 * The helper's job is to answer one question: "on this remount, what value
 * should the loan +page.svelte assign to currentPageIndex before flipping
 * resumeHandled = true?" The Resume Modal path (genuine reload) is owned by
 * its own handler — the helper must NOT interfere there.
 */

import { describe, it, expect } from 'vitest';
import { computePageIndexOnRemount } from '$lib/utils/loanPageIndexRestore';

describe('computePageIndexOnRemount — browser-back page-index restore', () => {
	it('returns the saved index when the user lands here via client-nav with a deep prior position', () => {
		// Simulates browser-back from /results: showResumeModal=false (no reload),
		// savedPageIndex was captured BEFORE the sync effect could clobber it.
		expect(computePageIndexOnRemount(8, false)).toBe(8);
	});

	it('returns null when the resume modal will fire (reload path owns the restore)', () => {
		// On genuine reload, isReloadOfCurrentPath()=true + savedPageIndex>0
		// triggers SessionResumeModal. handleResumeChoice('resume') sets
		// resumeIndexPending separately. The helper must stay out of that path.
		expect(computePageIndexOnRemount(8, true)).toBeNull();
	});

	it('returns null when saved index is 0 (fresh entry from picker — nothing to restore)', () => {
		// User just picked this loan from how-can-we-help — formState.<loan>PageIndex
		// is 0, default behavior is correct.
		expect(computePageIndexOnRemount(0, false)).toBeNull();
	});

	it('returns null when saved index is 0 even if resume modal is showing (defensive)', () => {
		// Cannot actually happen — the reload+savedIndex>0 condition gates the
		// modal — but the helper should still be defensive on this combination.
		expect(computePageIndexOnRemount(0, true)).toBeNull();
	});

	it('returns null on negative or non-finite inputs (defensive — should never come from formState)', () => {
		expect(computePageIndexOnRemount(-1, false)).toBeNull();
		expect(computePageIndexOnRemount(Number.NaN, false)).toBeNull();
		expect(computePageIndexOnRemount(Number.POSITIVE_INFINITY, false)).toBeNull();
	});

	it('preserves variant-reset behavior (Pitfall #41): when picker just reset to 0, no resurrection of stale index', () => {
		// resetLoanPageIndex('Personal Loan') was called moments ago for a
		// variant change, setting savedPageIndex to 0. The helper must NOT
		// invent a non-zero index — restore-to-0 is the desired behavior here.
		expect(computePageIndexOnRemount(0, false)).toBeNull();
	});

	it('handles a deep index near typical max page count', () => {
		// Personal Loan currently maxes around 10-12 visible pages; helper
		// shouldn't cap or filter — just return the saved value as-is.
		expect(computePageIndexOnRemount(12, false)).toBe(12);
	});

	it('handles the smallest non-zero index (page 1)', () => {
		// Edge case: user only advanced one page. Saved=1, still worth restoring
		// — otherwise the Next-button work to advance off page 0 is lost.
		expect(computePageIndexOnRemount(1, false)).toBe(1);
	});
});
