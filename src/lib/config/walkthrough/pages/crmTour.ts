import type { WalkthroughStep } from '../types';

export const CRM_TOUR_STEPS: WalkthroughStep[] = [
	{
		id: 'crm-welcome',
		popover: {
			title: 'CRM Dashboard',
			description:
				'Your relationship management hub. Track leads, monitor pipeline, analyze sources, and review communication history — all derived from your case activity.',
			popoverClass: 'ddsa-welcome-popover'
		}
	},
	{
		id: 'crm-nav-cards',
		element: '[data-walkthrough="crm-nav-grid"]',
		popover: {
			title: 'Quick Navigation',
			description:
				'Jump to dedicated pages for <strong>Leads</strong> (prospect tracking with 6-status pipeline), <strong>Sources</strong> (builder, CA, referral categorization), and <strong>Lenders</strong> (empanelment status and RM contacts). The badge shows count.',
			side: 'bottom',
			align: 'center',
			skipIfMissing: true
		}
	},
	{
		id: 'crm-metrics',
		element: '[data-walkthrough="crm-metrics-grid"]',
		popover: {
			title: 'Key Metrics',
			description:
				"Seven real-time metrics: Total & Active Cases, Conversion Rate, Average Days to Sanction, Total Sanctioned Value, and This Month's activity. These are computed from your actual case data.",
			side: 'bottom',
			align: 'center',
			skipIfMissing: true
		}
	},
	{
		id: 'crm-pipeline',
		element: '[data-walkthrough="crm-pipeline"]',
		popover: {
			title: 'Pipeline Kanban View',
			description:
				'Visual board showing cases across stages — from <strong>Intake</strong> to <strong>Disbursed</strong>. Each column shows case count, total amount, and individual case cards. Scroll horizontally to see all stages.',
			side: 'top',
			align: 'center',
			skipIfMissing: true
		}
	},
	{
		id: 'crm-pipeline-cards',
		popover: {
			title: 'Pipeline Cards',
			description:
				'Each mini-card shows the case label, loan type, amount, and days in stage. Click any card to jump to the full case detail page. <em>Cases stuck in a stage for 7+ days get flagged on your dashboard.</em>',
			popoverClass: 'ddsa-info-popover'
		}
	},
	{
		id: 'crm-source-analysis',
		element: '[data-walkthrough="crm-source-analysis"]',
		popover: {
			title: 'Source Analysis',
			description:
				'Breakdown of where your cases come from — walk-ins, builders, CAs, referrals, online, brokers. Tracks case count, sanctions, and <strong>conversion rate</strong> per source. The best-performing source is highlighted.',
			side: 'top',
			align: 'start',
			skipIfMissing: true
		}
	},
	{
		id: 'crm-comm-log',
		element: '[data-walkthrough="crm-comm-log"]',
		popover: {
			title: 'Communication Log',
			description:
				'Timeline of all case activity — messages sent, queries raised/resolved, stage changes, sanctions, rejections. Filter by event type. Click the case link to navigate directly.',
			side: 'top',
			align: 'start',
			skipIfMissing: true
		}
	},
	{
		id: 'crm-finish',
		popover: {
			title: 'CRM in Action',
			description:
				'The CRM dashboard updates automatically as you work on cases. More cases you process, richer the data becomes. Use Source Analysis to double down on your best lead channels.',
			popoverClass: 'ddsa-finish-popover'
		}
	}
];
