import type { WalkthroughStep } from '../types';

export const ANALYTICS_TOUR_STEPS: WalkthroughStep[] = [
	{
		id: 'analytics-welcome',
		popover: {
			title: 'Performance Analytics',
			description:
				'Track your DSA business performance with an automated scorecard, 8 key metrics, AI-generated insights, and real-time lender policy alerts. Data refreshes as you process cases.',
			popoverClass: 'ddsa-welcome-popover'
		}
	},
	{
		id: 'analytics-score-ring',
		element: '[data-walkthrough="analytics-score-ring"]',
		popover: {
			title: 'Performance Score',
			description:
				'Your overall score out of 100, color-coded: <strong style="color:#10b981;">Green</strong> (Excellent, 80+), <strong style="color:#3b82f6;">Blue</strong> (Good, 60-79), <strong style="color:#d4a84e;">Amber</strong> (Needs Improvement, 40-59), <strong style="color:#ef4444;">Red</strong> (Critical, below 40). Calculated from all 8 metrics combined.',
			side: 'right',
			align: 'center',
			skipIfMissing: true
		}
	},
	{
		id: 'analytics-metrics-grid',
		element: '[data-walkthrough="analytics-metrics-grid"]',
		popover: {
			title: 'Key Metrics Grid',
			description:
				'Eight business metrics with targets: Conversion Rate, Avg. Processing Days, Cases This Month, Sanction Amount, and more. Each card shows current value, trend arrow, progress bar to target, and rating.',
			side: 'bottom',
			align: 'start',
			skipIfMissing: true
		}
	},
	{
		id: 'analytics-metric-card',
		popover: {
			title: 'Reading a Metric Card',
			description:
				'Each metric shows: <strong>Current value</strong> (large number), <strong>trend</strong> (green arrow up = improving, red arrow down = declining), <strong>progress bar</strong> (percentage toward target), and a <strong>rating badge</strong>. Target is shown below the bar.',
			popoverClass: 'ddsa-info-popover'
		}
	},
	{
		id: 'analytics-insights',
		element: '[data-walkthrough="analytics-insights"]',
		popover: {
			title: 'Insights & Recommendations',
			description:
				'AI-generated observations about your performance — what is working, what needs attention, and specific suggestions. Green checkmarks are positives, amber warnings flag areas for improvement.',
			side: 'top',
			align: 'start',
			skipIfMissing: true
		}
	},
	{
		id: 'analytics-policy-alerts',
		element: '[data-walkthrough="analytics-policy-alerts"]',
		popover: {
			title: 'Lender Policy Alerts',
			description:
				'Critical updates from lenders — rate changes, documentation requirements, scheme modifications. Severity-coded: <strong style="color:#ef4444;">Action Required</strong>, <strong style="color:#d4a84e;">Warning</strong>, <strong style="color:#3b82f6;">Info</strong>. Click to expand and see affected cases.',
			side: 'top',
			align: 'start',
			skipIfMissing: true
		}
	},
	{
		id: 'analytics-finish',
		popover: {
			title: 'Data-Driven Filing',
			description:
				'Review analytics weekly to identify your best-performing loan types and lenders. The scorecard targets update based on your profile goals. More cases you complete, smarter the insights become.',
			popoverClass: 'ddsa-finish-popover'
		}
	}
];
