// ── Walkthrough Tour Types ─────────────────────────────

export type PageTourId =
	| 'profile'
	| 'cases'
	| 'crm'
	| 'communication'
	| 'analytics'
	| 'team'
	| 'shared-links';

export type TourMode = 'intro' | 'explanatory' | `page:${PageTourId}`;

export interface WalkthroughStep {
	id: string;
	/** CSS selector for Driver.js highlight. Omit for centered popover (no highlight). */
	element?: string;
	/** Fallback selector for mobile bottom nav (used when sidebar is hidden). */
	mobileElement?: string;
	popover: {
		title: string;
		description: string;
		side?: 'top' | 'right' | 'bottom' | 'left' | 'over';
		align?: 'start' | 'center' | 'end';
		popoverClass?: string;
		/** Skip this step if the target element is not present in the DOM. */
		skipIfMissing?: boolean;
	};
}

export interface WalkthroughDbState {
	intro_completed: boolean;
	explanatory_completed: boolean;
	intro_dismissed_at?: string;
	/**
	 * Lifetime stamp set the first time the intro tour was auto-triggered
	 * (regardless of completion / dismissal outcome). Once set, the
	 * auto-trigger NEVER fires again for this user — the Guide button is
	 * the only way to replay the intro. Matches the owner-stated spec
	 * "automatically once only in lifetime, thereafter only when user seeks".
	 *
	 * Why a third flag in addition to intro_completed / intro_dismissed_at:
	 * those mark OUTCOME ("did the user respond to the tour?"). This marks
	 * EXPOSURE ("has the system ever auto-shown the tour?"). The exposure
	 * marker is the right gate for the auto-trigger because it survives
	 * scenarios where the persist-on-outcome path fails (PATCH race against
	 * page reload, write-to-wrong-collection bug for admin role, transient
	 * 5xx). Stamped synchronously the moment the auto-trigger requests the
	 * tour, before Driver.js even mounts.
	 */
	intro_auto_triggered_at?: string;
	page_tours_completed: Partial<Record<PageTourId, boolean>>;
	// Legacy backward-compat fields
	completed?: boolean;
	dismissed_at?: string;
	current_step?: number;
	steps_seen?: string[];
}

// ── Helpers ────────────────────────────────────────────

export function isPageTour(mode: TourMode): mode is `page:${PageTourId}` {
	return mode.startsWith('page:');
}

export function extractPageId(mode: TourMode): PageTourId | null {
	if (!mode.startsWith('page:')) return null;
	return mode.slice(5) as PageTourId;
}
