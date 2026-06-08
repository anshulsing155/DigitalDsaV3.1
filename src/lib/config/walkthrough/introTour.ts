import type { WalkthroughStep } from './types';

/**
 * Introductory Tour — auto-fires ONCE per lifetime for new DSAs.
 * Replay any time from the Guide button (TourLauncher) in the sidebar.
 *
 * Step rule of thumb: each step says ONE thing that the screen alone can't.
 * If a label already reads "Cases", a tour step pointing at "Cases" must add
 * meaning beyond the label — otherwise it's noise. Refresh dates each time
 * the dashboard surface changes meaningfully.
 *
 * Last refreshed: 2026-06-02 — added quota chip + plan badge + Analytics
 * (per recent QBC + D.1 billing + analytics work); tightened copy on Cases
 * and Communication steps; replaced static "loan file" framing with the
 * stage-tracker reality.
 */
export const INTRO_TOUR_STEPS: WalkthroughStep[] = [
	{
		id: 'intro-welcome',
		popover: {
			title: 'Welcome to Digital DSA',
			description:
				'A 30-second tour of where things live. You can dismiss any time and replay later from the Guide button.',
			side: 'over',
			align: 'center',
			popoverClass: 'ddsa-welcome-popover'
		}
	},
	{
		id: 'intro-plan-badge',
		element: '[data-walkthrough="plan-badge"]',
		popover: {
			title: 'Your plan & cycle',
			description:
				'Your current plan and the active cycle date range. Click to manage billing or upgrade.',
			side: 'right',
			align: 'start',
			skipIfMissing: true
		}
	},
	{
		id: 'intro-quota-chip',
		element: '[data-walkthrough="quota-chip"]',
		popover: {
			title: 'Cases consumed this cycle',
			description:
				"Live count against your plan's monthly cap. Refreshes as soon as a case is submitted.",
			side: 'bottom',
			align: 'end',
			skipIfMissing: true
		}
	},
	{
		id: 'intro-dashboard',
		element: '[data-walkthrough="dashboard"]',
		mobileElement: '[data-walkthrough="mobile-dashboard"]',
		popover: {
			title: 'Dashboard',
			description:
				'Stats, pipeline, attention items, and recent activity — your default landing surface.',
			side: 'right',
			align: 'start'
		}
	},
	{
		id: 'intro-cases',
		element: '[data-walkthrough="cases"]',
		mobileElement: '[data-walkthrough="mobile-cases"]',
		popover: {
			title: 'Cases',
			description:
				'Every application you handle, with stage tracking from intake through disbursement. Filter, search, edit, and re-submit from here.',
			side: 'right',
			align: 'start'
		}
	},
	{
		id: 'intro-new-case',
		element: '[data-walkthrough="new-case"]',
		popover: {
			title: 'New Case',
			description:
				'Start a new application. Pick a loan type, fill the form, and submit — offers compute in seconds.',
			side: 'right',
			align: 'start',
			skipIfMissing: true
		}
	},
	{
		id: 'intro-crm',
		element: '[data-walkthrough="crm"]',
		mobileElement: '[data-walkthrough="mobile-crm"]',
		popover: {
			title: 'CRM',
			description: 'Leads, referral sources, and lender relationships in one place.',
			side: 'right',
			align: 'start',
			skipIfMissing: true
		}
	},
	{
		id: 'intro-analytics',
		element: '[data-walkthrough="analytics"]',
		mobileElement: '[data-walkthrough="mobile-analytics"]',
		popover: {
			title: 'Analytics',
			description:
				'Conversion rates, sanctioned volumes, and lender performance — useful once you have a few cases through the funnel.',
			side: 'right',
			align: 'start',
			skipIfMissing: true
		}
	},
	{
		id: 'intro-shared-links',
		element: '[data-walkthrough="shared-links"]',
		mobileElement: '[data-walkthrough="mobile-shared-links"]',
		popover: {
			title: 'Shared Links',
			description:
				'Send the form to an applicant directly. Track who submitted, copy a fresh URL, or revoke access.',
			side: 'right',
			align: 'start',
			skipIfMissing: true
		}
	},
	{
		id: 'intro-communication',
		element: '[data-walkthrough="communication"]',
		mobileElement: '[data-walkthrough="mobile-communication"]',
		popover: {
			title: 'Communication',
			description: 'Send case files to RMs and follow lender threads end-to-end.',
			side: 'right',
			align: 'start',
			skipIfMissing: true
		}
	},
	{
		id: 'intro-profile',
		element: '[data-walkthrough="profile"]',
		mobileElement: '[data-walkthrough="mobile-profile"]',
		popover: {
			title: 'Profile',
			description:
				'Your business profile. Filling this out unlocks personalised lender recommendations.',
			side: 'right',
			align: 'start'
		}
	},
	{
		id: 'intro-finish',
		element: '[data-walkthrough="tour-launcher-sidebar"]',
		popover: {
			title: "You're set",
			description:
				'Replay this tour or open the full guide from here any time. This auto-tour only fires once.',
			side: 'right',
			align: 'start',
			popoverClass: 'ddsa-finish-popover',
			skipIfMissing: true
		}
	}
];
