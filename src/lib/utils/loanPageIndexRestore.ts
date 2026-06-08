/**
 * Loan Page Index Restore — bug fix helper for browser-back navigation.
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Background — the bug this exists to prevent
 * ─────────────────────────────────────────────
 * Every loan +page.svelte declares `let currentPageIndex = $state(0)` and a
 * reactive `$effect` that writes `currentPageIndex` back into the persisted
 * per-loan field on formState (`formState.personalLoanPageIndex`, etc.) once
 * `resumeHandled` flips true.
 *
 * On a browser-back from `/dashboard/.../results` → `/evaluating` → loan
 * +page.svelte, the SessionResumeModal does NOT fire — `isReloadOfCurrentPath()`
 * is false for client-side navigation (Pitfall #42). So the else-branch of
 * onMount runs immediately: it flips `resumeHandled = true` with
 * `currentPageIndex` still at its default 0. The sync effect then promptly
 * writes 0 into `formState.<loan>PageIndex`, destroying the value the user
 * left off at. Result: the form re-mounts at page 1.
 *
 * The fix
 * ───────
 * Before the else-branch flips `resumeHandled = true`, we rehydrate
 * `currentPageIndex` from the captured `initialSavedPageIndex` IF it's
 * non-zero. The sync effect then sees `currentPageIndex === lastPageIndex`
 * after its first read, no destructive write happens, and the user lands on
 * the page they left from. The Resume-Modal path (genuine browser reload) is
 * unaffected — that path sets `resumeIndexPending = initialSavedPageIndex`
 * via `handleResumeChoice('resume')` which a separate effect consumes.
 *
 * Why a function (not a one-liner inlined into 6 files)
 * ─────────────────────────────────────────────────────
 * The decision rule is: "rehydrate only when there's a real saved index to
 * restore (>0) and the resume modal is not handling the case". That logic
 * lives in this single tested function rather than being duplicated as a
 * raw `if` across 6 +page.svelte files where it's easy to copy-paste-skip.
 * Pure data in, pure data out — unit-testable without DOM.
 */

/**
 * Decide what `currentPageIndex` should be on a non-reload remount of the
 * loan form (e.g. browser-back from results / evaluating).
 *
 * Returns the index the caller should assign to its local `currentPageIndex`
 * `$state` BEFORE flipping `resumeHandled = true`. Returns `null` if no
 * rehydration is needed (default behavior preserved).
 *
 * @param savedPageIndex — `formState.<loan>PageIndex` captured at module init
 *                         (before the sync effect could clobber it)
 * @param showResumeModal — true if the SessionResumeModal will fire (reload
 *                          path). When true, we leave the index alone —
 *                          handleResumeChoice('resume') owns the restore.
 * @returns the index to assign, or null to skip
 */
export function computePageIndexOnRemount(
	savedPageIndex: number,
	showResumeModal: boolean
): number | null {
	// Resume modal is showing — don't touch the index. The modal's own
	// handlers ('resume' / 'restart' / 'clear') decide the final value.
	if (showResumeModal) return null;

	// Nothing to restore. (Fresh entry from picker, or variant-reset just
	// nulled the saved value via resetLoanPageIndex — Pitfall #41.)
	if (!Number.isFinite(savedPageIndex) || savedPageIndex <= 0) return null;

	return savedPageIndex;
}
