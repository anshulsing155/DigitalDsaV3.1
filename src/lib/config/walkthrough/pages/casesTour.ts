import type { WalkthroughStep } from '../types';

export const CASES_TOUR_STEPS: WalkthroughStep[] = [
	{
		id: 'cases-welcome',
		popover: {
			title: 'Your Case Manager',
			description:
				'Every loan application you create becomes a <strong>Case</strong> with a unique ID. Track progress from intake through disbursement, all in one place.',
			popoverClass: 'ddsa-welcome-popover'
		}
	},
	{
		id: 'cases-new-button',
		element: '[data-walkthrough="cases-new-button"]',
		popover: {
			title: 'Start a New Case',
			description:
				'Click here to open the loan application form. Select your loan type and the smart form adapts — covering applicant details, 12 income types, obligations, CIBIL, and property details.',
			side: 'bottom',
			align: 'end',
			skipIfMissing: true
		}
	},
	{
		id: 'cases-quick-stats',
		element: '[data-walkthrough="cases-quick-stats"]',
		popover: {
			title: 'Quick Stats Bar',
			description:
				'At-a-glance counters: <strong>Total</strong> cases, <strong>Active</strong> (in-progress), <strong>Submitted</strong> (filed with lenders), and <strong>Sanctioned</strong> (approved). Updates in real time as cases progress.',
			side: 'bottom',
			align: 'center',
			skipIfMissing: true
		}
	},
	{
		id: 'cases-filters',
		element: '[data-walkthrough="cases-filter-bar"]',
		popover: {
			title: 'Filter & Search',
			description:
				'Find cases quickly — search by case label or ID, filter by <strong>stage</strong> (Intake, Profiling, Submitted, etc.), <strong>loan type</strong> (HL, LAP, PL), or <strong>lender</strong>. Filters combine for precise results.',
			side: 'bottom',
			align: 'start',
			skipIfMissing: true
		}
	},
	{
		id: 'cases-card',
		element: '[data-walkthrough="cases-card-first"]',
		popover: {
			title: 'Case Card',
			description:
				'Each card shows the <strong>case label</strong>, loan type, amount, stage badge, assigned lenders, and document completion progress. The <strong>query badge</strong> (red) flags open lender queries needing your response.',
			side: 'bottom',
			align: 'start',
			skipIfMissing: true
		}
	},
	{
		id: 'cases-stage-info',
		popover: {
			title: 'Stage Tracking',
			description:
				'The colored badge shows current stage: <strong>Intake</strong> (gray) through <strong>Disbursed</strong> (green). The "days in stage" counter at the bottom helps you spot stuck cases. Click any case to see full details, timeline, and documents.',
			popoverClass: 'ddsa-info-popover'
		}
	},
	{
		id: 'cases-pagination',
		element: '[data-walkthrough="cases-pagination"]',
		popover: {
			title: 'Pagination',
			description:
				'Cases are paginated — 12 per page. Use Previous/Next to navigate, or change filters to narrow results.',
			side: 'top',
			align: 'center',
			skipIfMissing: true,
			popoverClass: 'ddsa-finish-popover'
		}
	}
];
