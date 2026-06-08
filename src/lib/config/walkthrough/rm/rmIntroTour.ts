import type { WalkthroughStep } from '../types';

/**
 * RM Introductory Tour — 9 steps, ~30 seconds
 * Auto-triggers once for new RMs on first dashboard visit.
 * Highlights sidebar navigation items to orient the RM.
 */
export const RM_INTRO_TOUR_STEPS: WalkthroughStep[] = [
	{
		id: 'rm-intro-welcome',
		popover: {
			title: 'Welcome to the RM Portal!',
			description: 'Let us show you around your dashboard. This quick tour takes about 30 seconds.',
			side: 'over',
			align: 'center',
			popoverClass: 'ddsa-welcome-popover'
		}
	},
	{
		id: 'rm-intro-dashboard',
		element: '[data-walkthrough="rm-dashboard"]',
		mobileElement: '[data-walkthrough="mobile-rm-dashboard"]',
		popover: {
			title: 'Dashboard',
			description:
				'Your command center — pending reviews, policy submissions, case stats, and DSA connections at a glance.',
			side: 'right',
			align: 'start'
		}
	},
	{
		id: 'rm-intro-cases',
		element: '[data-walkthrough="rm-cases"]',
		mobileElement: '[data-walkthrough="mobile-rm-cases"]',
		popover: {
			title: 'Cases Received',
			description:
				'View loan cases shared by DSAs. Track application progress, rate accuracy, and respond to queries.',
			side: 'right',
			align: 'start'
		}
	},
	{
		id: 'rm-intro-communication',
		element: '[data-walkthrough="rm-communication"]',
		mobileElement: '[data-walkthrough="mobile-rm-communication"]',
		popover: {
			title: 'Communication',
			description:
				'Message threads with DSAs about specific cases. Share updates, clarify requirements.',
			side: 'right',
			align: 'start'
		}
	},
	{
		id: 'rm-intro-broadcasts',
		element: '[data-walkthrough="rm-broadcasts"]',
		mobileElement: '[data-walkthrough="mobile-rm-broadcasts"]',
		popover: {
			title: 'Broadcasts',
			description:
				'Send rate changes, scheme updates, and announcements to all connected DSAs at once.',
			side: 'right',
			align: 'start'
		}
	},
	{
		id: 'rm-intro-policies',
		element: '[data-walkthrough="rm-policies"]',
		mobileElement: '[data-walkthrough="mobile-rm-policies"]',
		popover: {
			title: 'Policies',
			description:
				"Upload and manage your bank's lending policies. DSAs see these as official guidelines.",
			side: 'right',
			align: 'start'
		}
	},
	{
		id: 'rm-intro-submissions',
		element: '[data-walkthrough="rm-submissions"]',
		mobileElement: '[data-walkthrough="mobile-rm-submissions"]',
		popover: {
			title: 'Submissions',
			description: 'Submit policy changes for admin review. Track approval status of your updates.',
			side: 'right',
			align: 'start',
			skipIfMissing: true
		}
	},
	{
		id: 'rm-intro-dsa-search',
		element: '[data-walkthrough="rm-dsa-search"]',
		mobileElement: '[data-walkthrough="mobile-rm-dsa-search"]',
		popover: {
			title: 'DSA Search',
			description:
				'Find and connect with DSAs in your territory. Build your network for better loan sourcing.',
			side: 'right',
			align: 'start'
		}
	},
	{
		id: 'rm-intro-finish',
		element: '[data-walkthrough="tour-launcher-sidebar"]',
		popover: {
			title: "You're All Set!",
			description:
				'Replay this tour anytime from this button. Start by checking your dashboard for pending items!',
			side: 'right',
			align: 'start',
			popoverClass: 'ddsa-finish-popover',
			skipIfMissing: true
		}
	}
];
