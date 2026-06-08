import type { WalkthroughStep } from '../types';

export const PROFILE_TOUR_STEPS: WalkthroughStep[] = [
	{
		id: 'profile-welcome',
		popover: {
			title: 'Your Business Profile',
			description:
				'This wizard captures your DSA business details across 5 focused sections. A complete profile unlocks <strong>personalized lender recommendations</strong> and helps RMs match you to suitable cases.',
			popoverClass: 'ddsa-welcome-popover'
		}
	},
	{
		id: 'profile-stepper',
		element: '[data-walkthrough="profile-stepper"]',
		popover: {
			title: 'Progress Tracker',
			description:
				'Five steps to complete: <strong>Business Profile</strong>, <strong>Pain Points</strong>, <strong>Goals</strong>, <strong>Workflow</strong>, and <strong>Modules</strong>. You can save progress and return anytime — nothing is lost.',
			side: 'bottom',
			align: 'center',
			skipIfMissing: true
		}
	},
	{
		id: 'profile-business',
		element: '[data-walkthrough="profile-business-section"]',
		popover: {
			title: 'Step 1: Business Details',
			description:
				'Your firm name, team size, monthly file volume, primary loan types, empanelled lenders, and geography. This data drives the lender matching engine — <em>more detail means better matches</em>.',
			side: 'top',
			align: 'start',
			skipIfMissing: true
		}
	},
	{
		id: 'profile-pain-points',
		popover: {
			title: 'Step 2: Pain Points',
			description:
				'Tell us what slows you down — documentation delays, lender response times, client follow-ups. We use this to prioritize features and suggest workflow improvements.',
			popoverClass: 'ddsa-info-popover'
		}
	},
	{
		id: 'profile-goals-workflow',
		popover: {
			title: 'Steps 3-4: Goals & Workflow',
			description:
				'Set your <strong>6-month targets</strong> (case volume, sanction rate, processing days) and describe your current workflow. The analytics dashboard benchmarks your progress against these goals.',
			popoverClass: 'ddsa-info-popover'
		}
	},
	{
		id: 'profile-finish',
		element: '[data-walkthrough="profile-complete-badge"]',
		popover: {
			title: 'Profile Complete!',
			description:
				'Once all 5 steps are done, you get a <strong>Completed</strong> badge and your personalized recommendations activate. You can always come back to update any section.',
			side: 'bottom',
			align: 'end',
			popoverClass: 'ddsa-finish-popover',
			skipIfMissing: true
		}
	}
];
