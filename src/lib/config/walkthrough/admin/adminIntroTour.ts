import type { WalkthroughStep } from '../types';

/**
 * Admin Introductory Tour — 8 steps, ~30 seconds
 * Auto-triggers once for new admins on first dashboard visit.
 * Highlights sidebar navigation items to orient the admin.
 */
export const ADMIN_INTRO_TOUR_STEPS: WalkthroughStep[] = [
	{
		id: 'admin-intro-welcome',
		popover: {
			title: 'Welcome to Admin Dashboard!',
			description: 'Quick tour of your admin tools. This takes about 30 seconds.',
			side: 'over',
			align: 'center',
			popoverClass: 'ddsa-welcome-popover'
		}
	},
	{
		id: 'admin-intro-dashboard',
		element: '[data-walkthrough="admin-dashboard"]',
		mobileElement: '[data-walkthrough="mobile-admin-dashboard"]',
		popover: {
			title: 'Dashboard',
			description:
				'Platform overview — user counts, role breakdowns, rule pipeline status, and account health.',
			side: 'right',
			align: 'start'
		}
	},
	{
		id: 'admin-intro-users',
		element: '[data-walkthrough="admin-users"]',
		mobileElement: '[data-walkthrough="mobile-admin-users"]',
		popover: {
			title: 'Users',
			description:
				'Manage DSAs, RMs, and other users. View profiles, suspend accounts, and monitor activity.',
			side: 'right',
			align: 'start'
		}
	},
	{
		id: 'admin-intro-policies',
		element: '[data-walkthrough="admin-policies"]',
		mobileElement: '[data-walkthrough="mobile-admin-policies"]',
		popover: {
			title: 'Policies',
			description:
				'Author and manage lending policies for all lenders. These power the eligibility engine.',
			side: 'right',
			align: 'start'
		}
	},
	{
		id: 'admin-intro-approvals',
		element: '[data-walkthrough="admin-approvals"]',
		mobileElement: '[data-walkthrough="mobile-admin-approvals"]',
		popover: {
			title: 'Approvals',
			description: 'Review and approve RM-submitted policy changes before they go live.',
			side: 'right',
			align: 'start'
		}
	},
	{
		id: 'admin-intro-testing',
		element: '[data-walkthrough="admin-testing"]',
		mobileElement: '[data-walkthrough="mobile-admin-testing"]',
		popover: {
			title: 'Testing',
			description: 'Test rule engine configurations, seed sample data, and run admin migrations.',
			side: 'right',
			align: 'start'
		}
	},
	{
		id: 'admin-intro-audit',
		element: '[data-walkthrough="admin-audit"]',
		mobileElement: '[data-walkthrough="mobile-admin-audit"]',
		popover: {
			title: 'Audit Log',
			description: 'Full audit trail of all policy changes, approvals, and admin actions.',
			side: 'right',
			align: 'start'
		}
	},
	{
		id: 'admin-intro-finish',
		element: '[data-walkthrough="tour-launcher-sidebar"]',
		popover: {
			title: "You're All Set!",
			description:
				'Replay this tour anytime from this button. Check the dashboard for platform health!',
			side: 'right',
			align: 'start',
			popoverClass: 'ddsa-finish-popover',
			skipIfMissing: true
		}
	}
];
