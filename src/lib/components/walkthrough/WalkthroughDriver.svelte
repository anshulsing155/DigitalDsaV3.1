<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { walkthroughState } from '$lib/state/walkthrough.svelte';
	import type { TourMode, WalkthroughDbState } from '$lib/config/walkthrough/types';
	import 'driver.js/dist/driver.css';
	import '$lib/styles/driver-theme.css';

	interface Props {
		serverWalkthroughState: WalkthroughDbState | null;
		isDemo?: boolean;
		role?: string;
	}

	let { serverWalkthroughState, isDemo = false, role = 'dsa' }: Props = $props();

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let driverFactory: ((config: any) => any) | null = null;
	let initialized = $state(false);
	let isMobile = $state(false);

	onMount(async () => {
		// Detect mobile (sidebar hidden below lg breakpoint)
		const mql = window.matchMedia('(max-width: 1023px)');
		isMobile = mql.matches;
		mql.addEventListener('change', (e) => {
			isMobile = e.matches;
		});

		// Dynamically import Driver.js (client-only)
		const mod = await import('driver.js');
		driverFactory = mod.driver;

		// Initialize walkthrough state from server data
		walkthroughState.init(serverWalkthroughState, isDemo, role);
		initialized = true;

		// Auto-trigger intro tour for new users — ONCE per lifetime.
		// markIntroAutoTriggered() flips the lifetime gate synchronously
		// (localStorage + sessionStorage + DB persist), so even if the user
		// hard-reloads during the 800ms setTimeout window, the next page
		// load reads the marker and skips the auto-trigger. Manual replay
		// via the Guide button is unaffected.
		if (walkthroughState.shouldAutoTriggerIntro) {
			walkthroughState.markIntroAutoTriggered();
			setTimeout(() => {
				walkthroughState.requestTour('intro');
			}, 800);
		}
	});

	onDestroy(() => {
		walkthroughState.destroyActiveTour();
	});

	// Watch for tour requests from TourLauncher
	$effect(() => {
		const pending = walkthroughState.pendingTour;
		if (pending && initialized && driverFactory) {
			walkthroughState.clearPending();
			startTour(pending);
		}
	});

	function startTour(mode: TourMode): void {
		if (!driverFactory || !browser) return;

		// Destroy any active tour first
		walkthroughState.destroyActiveTour();

		const steps = walkthroughState.getFilteredSteps(mode, isMobile);
		if (steps.length === 0) return;

		// Map to Driver.js step format
		const driverSteps = steps.map((step) => ({
			element: step.element ?? undefined,
			popover: {
				title: step.popover.title,
				description: step.popover.description,
				side: step.popover.side === 'over' ? undefined : step.popover.side,
				align: step.popover.align,
				popoverClass: `ddsa-driver-popover ${step.popover.popoverClass || ''}`.trim()
			}
		}));

		const driverInstance = driverFactory({
			showProgress: true,
			steps: driverSteps,
			animate: true,
			smoothScroll: true,
			allowClose: true,
			stagePadding: 8,
			stageRadius: 10,
			popoverClass: 'ddsa-driver-popover',
			progressText: '{{current}} of {{total}}',
			nextBtnText: mode === 'intro' ? 'Next' : 'Next →',
			prevBtnText: '← Back',
			doneBtnText: 'Finish',
			// Single handler for ALL close/destroy paths (X button, Done button, backdrop click).
			// MUST be synchronous — Driver.js does NOT await async callbacks, and expects
			// a synchronous destroy() call inside onDestroyStarted to actually proceed.
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			onDestroyStarted: (_el: any, _step: any, _opts: any) => {
				const isCompleted = driverInstance.isLastStep();

				if (isCompleted) {
					walkthroughState.completeTour(mode);
				} else {
					walkthroughState.dismissTour(mode);

					// Show helpful tooltip about guide button only for intro tour when dismissed early
					if (mode === 'intro') {
						walkthroughState.triggerIntroDismissedHint();
					}
				}
				driverInstance.destroy();
			}
		});

		walkthroughState.setDriverInstance(driverInstance);
		walkthroughState.startTour(mode);
		driverInstance.drive();
	}
</script>
