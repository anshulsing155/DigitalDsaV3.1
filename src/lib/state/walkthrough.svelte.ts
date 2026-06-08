import { browser } from '$app/environment';
import clientLogger from '$lib/utils/clientLogger';
import { secureFetch } from '$lib/utils/csrf';
import type {
	TourMode,
	WalkthroughDbState,
	WalkthroughStep,
	PageTourId
} from '$lib/config/walkthrough/types';
import { isPageTour, extractPageId } from '$lib/config/walkthrough/types';
import { INTRO_TOUR_STEPS } from '$lib/config/walkthrough/introTour';
import { EXPLANATORY_TOUR_STEPS } from '$lib/config/walkthrough/explanatoryTour';
import { PAGE_TOUR_REGISTRY } from '$lib/config/walkthrough/pages';
import { RM_INTRO_TOUR_STEPS } from '$lib/config/walkthrough/rm/rmIntroTour';
import { ADMIN_INTRO_TOUR_STEPS } from '$lib/config/walkthrough/admin/adminIntroTour';

const LS_INTRO_COMPLETED_KEY = 'ddsa_intro_completed';
/** Lifetime "auto-trigger has fired at least once" marker — localStorage safety
 *  net for the new intro_auto_triggered_at DB flag. See WalkthroughDbState. */
const LS_INTRO_AUTO_TRIGGERED_KEY = 'ddsa_intro_auto_triggered';
/** Per-tab guard — even with all persistence layers somehow reset, the tour
 *  auto-fires at most ONCE per page session. Survives client-side navigation,
 *  cleared by tab close. Last-line defence against tight reload races. */
const SS_INTRO_AUTO_TRIGGERED_KEY = 'ddsa_intro_auto_triggered_this_session';

/**
 * Walkthrough State Manager — Svelte 5 Runes Singleton
 *
 * Manages tour lifecycle (intro + explanatory + per-page), persistence to server,
 * and step filtering for mobile/desktop.
 *
 * Persistence strategy: DB is source of truth, localStorage is a safety net.
 * If DB persist fails silently, localStorage prevents the tour from re-triggering
 * on the same browser.
 */
class WalkthroughStateManager {
	// ── Reactive State ─────────────────────────────────
	private _isActive = $state(false);
	private _currentTour = $state<TourMode | null>(null);
	private _introCompleted = $state(false);
	private _explanatoryCompleted = $state(false);
	private _introDismissed = $state(false);
	/** Lifetime exposure marker — see WalkthroughDbState.intro_auto_triggered_at.
	 *  Once true, shouldAutoTriggerIntro returns false forever for this user. */
	private _introAutoTriggered = $state(false);
	private _isDemo = $state(false);
	private _pendingTour = $state<TourMode | null>(null);
	private _pageTourCompleted = $state<Partial<Record<PageTourId, boolean>>>({});
	private _role = $state<string>('dsa');
	private _showIntroDismissedHint = $state(false);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	private _driverInstance: any = null;

	// ── Public Getters ─────────────────────────────────
	get isActive(): boolean {
		return this._isActive;
	}
	get currentTour(): TourMode | null {
		return this._currentTour;
	}
	get introCompleted(): boolean {
		return this._introCompleted;
	}
	get explanatoryCompleted(): boolean {
		return this._explanatoryCompleted;
	}
	get pendingTour(): TourMode | null {
		return this._pendingTour;
	}
	get shouldAutoTriggerIntro(): boolean {
		// 5 gates, ALL must be open for the auto-trigger to fire:
		//   - Lifetime exposure marker not set (DB + localStorage + sessionStorage)
		//   - User hasn't completed the intro in some prior session
		//   - User hasn't dismissed the intro in some prior session
		//   - Not a demo guest (demo state isn't persisted)
		// The exposure marker is the strict gate per owner spec "automatically
		// once only in lifetime". The completed/dismissed checks are belt-and-
		// suspenders for legacy users whose DB rows were stamped before the
		// exposure marker shipped.
		return (
			!this._introAutoTriggered &&
			!this._introCompleted &&
			!this._introDismissed &&
			!this._isDemo
		);
	}

	isPageTourCompleted(pageId: PageTourId): boolean {
		return this._pageTourCompleted[pageId] ?? false;
	}

	get hasExplanatoryTour(): boolean {
		return this._role === 'dsa';
	}

	get showIntroDismissedHint(): boolean {
		return this._showIntroDismissedHint;
	}

	// ── Initialize from Server Data ────────────────────
	init(serverState: WalkthroughDbState | null, isDemo: boolean, role: string = 'dsa'): void {
		this._isDemo = isDemo;
		this._role = role;

		// localStorage safety net: if intro was completed/dismissed in this browser
		// but DB persist failed, don't let server state reset us to false
		const localIntroCompleted = browser && this._readLocalIntroCompleted();
		// sessionStorage: this-tab guard — if the auto-trigger already fired in
		// this tab session, never fire again even if all other persistence layers
		// somehow say otherwise. Cleared by tab close (correct: a brand-new tab
		// can in principle auto-fire on its first load if no other gate applies).
		const sessionAutoTriggered = browser && this._readSessionAutoTriggered();
		// Lifetime exposure marker: localStorage backup for the new DB flag,
		// because the DB persist is best-effort fire-and-forget and may race a
		// hard reload. localStorage write is synchronous, so it's the load-bearing
		// guard in practice.
		const localAutoTriggered = browser && this._readLocalAutoTriggered();

		if (!serverState) {
			this._introCompleted = localIntroCompleted || false;
			this._explanatoryCompleted = false;
			this._introDismissed = localIntroCompleted || false;
			this._introAutoTriggered = localAutoTriggered || sessionAutoTriggered || false;
			this._pageTourCompleted = {};

			// Sync: localStorage says completed but server has no state — re-persist
			if (localIntroCompleted && !isDemo) {
				this._persistToServer({
					intro_completed: true,
					dismissed: true,
					completed: true,
					intro_auto_triggered: true
				});
			} else if (localAutoTriggered && !isDemo) {
				// Exposure happened but no completion — re-persist just the marker
				this._persistToServer({ intro_auto_triggered: true });
			}
			return;
		}
		// Backward compat: old `completed` field maps to intro_completed
		const serverIntroCompleted = serverState.intro_completed ?? serverState.completed ?? false;
		const serverAutoTriggered = !!serverState.intro_auto_triggered_at;
		this._introCompleted = serverIntroCompleted || localIntroCompleted || false;
		this._explanatoryCompleted = serverState.explanatory_completed ?? false;
		this._introDismissed = !!serverState.intro_dismissed_at || localIntroCompleted || false;
		this._introAutoTriggered =
			serverAutoTriggered || localAutoTriggered || sessionAutoTriggered || false;
		this._pageTourCompleted = serverState.page_tours_completed ?? {};

		// Sync: localStorage says completed but server disagrees — re-persist
		if (localIntroCompleted && !serverIntroCompleted && !isDemo) {
			this._persistToServer({
				intro_completed: true,
				dismissed: true,
				completed: true,
				intro_auto_triggered: true
			});
		} else if (localAutoTriggered && !serverAutoTriggered && !isDemo) {
			this._persistToServer({ intro_auto_triggered: true });
		}
	}

	// ── Get Raw Steps ──────────────────────────────────
	getSteps(mode: TourMode): WalkthroughStep[] {
		if (mode === 'intro') {
			if (this._role === 'rm') return RM_INTRO_TOUR_STEPS;
			if (this._role === 'admin') return ADMIN_INTRO_TOUR_STEPS;
			return INTRO_TOUR_STEPS;
		}
		if (mode === 'explanatory') return EXPLANATORY_TOUR_STEPS;
		const pageId = extractPageId(mode);
		if (pageId && PAGE_TOUR_REGISTRY[pageId]) {
			return PAGE_TOUR_REGISTRY[pageId];
		}
		return [];
	}

	// ── Get Filtered Steps (skip missing elements, swap mobile selectors) ──
	getFilteredSteps(mode: TourMode, isMobile: boolean): WalkthroughStep[] {
		if (!browser) return [];
		const steps = this.getSteps(mode);

		return steps
			.map((step) => {
				// On mobile, swap to mobile selector if available
				if (isMobile && step.mobileElement) {
					return {
						...step,
						element: step.mobileElement,
						popover: {
							...step.popover,
							side: 'top' as const // Bottom nav items need top-positioned popovers
						}
					};
				}
				return step;
			})
			.filter((step) => {
				// No element = centered popover, always show
				if (!step.element) return true;
				// Skip if element not in DOM and skipIfMissing is set
				if (step.popover.skipIfMissing) {
					return !!document.querySelector(step.element);
				}
				return true;
			});
	}

	// ── Tour Lifecycle ─────────────────────────────────
	requestTour(mode: TourMode): void {
		this._pendingTour = mode;
	}

	/**
	 * Mark that the intro auto-trigger has fired for this user. Called by
	 * WalkthroughDriver right before requesting the auto-tour, BEFORE the
	 * Driver.js mount completes. The synchronous local/session writes are
	 * the load-bearing guarantee; the DB persist is best-effort.
	 *
	 * Idempotent — calling this when already marked is a no-op (but it
	 * still re-emits the persist in case a prior attempt failed, since
	 * the API endpoint's $set is idempotent at the document level).
	 */
	markIntroAutoTriggered(): void {
		this._introAutoTriggered = true;
		// localStorage + sessionStorage write SYNCHRONOUSLY, so even if the
		// user hard-reloads inside the same tick as the requestTour() call,
		// the next page load reads the marker before any auto-trigger check.
		this._writeLocalAutoTriggered();
		this._writeSessionAutoTriggered();
		// Persist to DB last. Fire-and-forget per the rest of this class's
		// convention; outcome doesn't gate user-visible behaviour because the
		// local/session writes already guarantee the lifetime semantic.
		this._persistToServer({ intro_auto_triggered: true });
	}

	clearPending(): void {
		this._pendingTour = null;
	}

	triggerIntroDismissedHint(): void {
		this._showIntroDismissedHint = true;
	}

	hideIntroDismissedHint(): void {
		this._showIntroDismissedHint = false;
	}

	startTour(mode: TourMode): void {
		this._currentTour = mode;
		this._isActive = true;
	}

	/**
	 * Complete a tour (user finished all steps).
	 * Sets state SYNCHRONOUSLY, fires persist as fire-and-forget.
	 * This is critical because Driver.js callbacks are NOT async-aware.
	 */
	completeTour(mode: TourMode): void {
		if (mode === 'intro') {
			this._introCompleted = true;
			this._writeLocalIntroCompleted();
		} else if (mode === 'explanatory') {
			this._explanatoryCompleted = true;
		} else if (isPageTour(mode)) {
			const pageId = extractPageId(mode);
			if (pageId) {
				this._pageTourCompleted = { ...this._pageTourCompleted, [pageId]: true };
			}
		}
		this._isActive = false;
		this._currentTour = null;

		// Fire-and-forget — don't block Driver.js callbacks with await
		if (isPageTour(mode)) {
			const pageId = extractPageId(mode)!;
			this._persistToServer({ page_tour_completed: pageId });
		} else {
			this._persistToServer({
				[`${mode}_completed`]: true,
				completed: true // backward compat
			});
		}
	}

	/**
	 * Dismiss a tour (user clicked X before completing).
	 * Sets state SYNCHRONOUSLY, fires persist as fire-and-forget.
	 */
	dismissTour(mode: TourMode): void {
		if (mode === 'intro') {
			this._introCompleted = true;
			this._introDismissed = true;
			this._writeLocalIntroCompleted();
		}
		this._isActive = false;
		this._currentTour = null;

		if (isPageTour(mode)) {
			// Don't mark page tours as completed on dismiss — user can retry
			return;
		}
		// Fire-and-forget
		this._persistToServer({
			dismissed: true,
			[`${mode}_completed`]: true,
			completed: true // backward compat
		});
	}

	// ── Driver Instance Management ─────────────────────
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	setDriverInstance(instance: any): void {
		this._driverInstance = instance;
	}

	destroyActiveTour(): void {
		if (this._driverInstance) {
			try {
				this._driverInstance.destroy();
			} catch {
				// Driver may already be destroyed
			}
			this._driverInstance = null;
		}
		this._isActive = false;
		this._currentTour = null;
	}

	// ── Reset ──────────────────────────────────────────
	reset(): void {
		this.destroyActiveTour();
		this._introCompleted = false;
		this._explanatoryCompleted = false;
		this._introDismissed = false;
		this._introAutoTriggered = false;
		this._isDemo = false;
		this._pendingTour = null;
		this._pageTourCompleted = {};
		this._role = 'dsa';
	}

	// ── localStorage + sessionStorage Safety Nets ──────
	private _writeLocalIntroCompleted(): void {
		if (!browser) return;
		try {
			localStorage.setItem(LS_INTRO_COMPLETED_KEY, '1');
		} catch {
			// Storage full or blocked — non-fatal
		}
	}

	private _readLocalIntroCompleted(): boolean {
		try {
			return localStorage.getItem(LS_INTRO_COMPLETED_KEY) === '1';
		} catch {
			return false;
		}
	}

	private _writeLocalAutoTriggered(): void {
		if (!browser) return;
		try {
			localStorage.setItem(LS_INTRO_AUTO_TRIGGERED_KEY, '1');
		} catch {
			// non-fatal
		}
	}

	private _readLocalAutoTriggered(): boolean {
		try {
			return localStorage.getItem(LS_INTRO_AUTO_TRIGGERED_KEY) === '1';
		} catch {
			return false;
		}
	}

	private _writeSessionAutoTriggered(): void {
		if (!browser) return;
		try {
			sessionStorage.setItem(SS_INTRO_AUTO_TRIGGERED_KEY, '1');
		} catch {
			// non-fatal
		}
	}

	private _readSessionAutoTriggered(): boolean {
		try {
			return sessionStorage.getItem(SS_INTRO_AUTO_TRIGGERED_KEY) === '1';
		} catch {
			return false;
		}
	}

	// ── Server Persistence (with retry) ─────────────────
	private async _persistToServer(data: Record<string, unknown>, retries = 2): Promise<void> {
		if (!browser || this._isDemo) return;
		for (let attempt = 0; attempt <= retries; attempt++) {
			try {
				const res = await secureFetch('/api/walkthrough', {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(data)
				});
				if (res.ok) return; // Success
				clientLogger.warn(`[walkthrough] persist failed: ${res.status}`);
			} catch {
				// Network error — retry
			}
			if (attempt < retries) {
				await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
			}
		}
	}
}

export const walkthroughState = new WalkthroughStateManager();
