import type { WalkthroughStep } from './types';

/**
 * Explanatory Tour — 15 steps, ~2 minutes
 * On-demand, always re-playable from the Guide button.
 * Covers the full DSA workflow with detailed descriptions.
 * Uses dashboard page elements + sidebar nav as anchors.
 */
export const EXPLANATORY_TOUR_STEPS: WalkthroughStep[] = [
	{
		id: 'explain-welcome',
		popover: {
			title: 'Your Complete DSA Workflow Guide',
			description:
				"This guide walks you through every tool on your dashboard — from creating a case to submitting files to lenders. Let's begin!",
			side: 'over',
			align: 'center',
			popoverClass: 'ddsa-welcome-popover'
		}
	},
	{
		id: 'explain-stats',
		element: '[data-walkthrough="stats-row"]',
		popover: {
			title: 'Performance Stats',
			description:
				'Four real-time metrics: <strong>Active Cases</strong> (in-progress files), <strong>Files Submitted</strong> (lender submissions this month), <strong>Sanctioned</strong> (approvals with total value), and <strong>Avg Processing Time</strong> (days from intake to sanction). These update automatically as you work.',
			side: 'bottom',
			align: 'center',
			skipIfMissing: true
		}
	},
	{
		id: 'explain-pipeline',
		element: '[data-walkthrough="pipeline-chart"]',
		popover: {
			title: 'Case Pipeline',
			description:
				'Visual breakdown of your active cases across 7 stages: <strong>Intake → Profiling → File Building → Submitted → Processing → Sanctioned → Disbursed</strong>. Click any stage bar to filter your case list.',
			side: 'bottom',
			align: 'center',
			skipIfMissing: true
		}
	},
	{
		id: 'explain-attention',
		element: '[data-walkthrough="attention-items"]',
		popover: {
			title: 'Attention Required',
			description:
				'Smart alerts for items needing immediate action — open lender queries (3+ days pending), documents expiring within 15 days, and cases stuck in the same stage too long. <strong>Critical items appear in red, warnings in amber.</strong>',
			side: 'bottom',
			align: 'start',
			skipIfMissing: true
		}
	},
	{
		id: 'explain-quick-actions',
		element: '[data-walkthrough="quick-actions"]',
		popover: {
			title: 'Quick Actions',
			description:
				'Shortcut buttons to your most common tasks — <strong>New Case</strong> starts a fresh loan application, <strong>My Cases</strong> opens your full case list, <strong>RM Contacts</strong> lets you find lender RMs, and <strong>Communicate</strong> opens lender messaging threads.',
			side: 'top',
			align: 'start',
			skipIfMissing: true
		}
	},
	{
		id: 'explain-new-case',
		element: '[data-walkthrough="new-case"]',
		popover: {
			title: 'Step 1: Start a New Case',
			description:
				'Begin any loan application here. Choose from <strong>Home Loan, LAP, Personal, Business, Professional, or Plot Loan</strong>. The smart form adapts to your loan type — covering applicant details, 12 income types, existing obligations, CIBIL scores, and property details. <em>More data you provide, the better the lender matches.</em>',
			side: 'right',
			align: 'start',
			skipIfMissing: true
		}
	},
	{
		id: 'explain-cases',
		element: '[data-walkthrough="cases"]',
		mobileElement: '[data-walkthrough="mobile-cases"]',
		popover: {
			title: 'Step 2: Track Your Cases',
			description:
				'Every submitted form becomes a Case with a unique ID (e.g. HL-2026-001). View all your cases, filter by stage or loan type, manage documents, track queries, and review the complete timeline. <strong>Each case maintains an immutable audit trail.</strong>',
			side: 'right',
			align: 'start'
		}
	},
	{
		id: 'explain-results',
		popover: {
			title: 'Step 3: Compare Lender Results',
			description:
				'After form submission, the system matches your applicant against lender eligibility rules. Results show as traffic-light cards: <strong style="color: #059669;">Green</strong> (eligible), <strong style="color: #d4a84e;">Amber</strong> (conditional), <strong style="color: #dc2626;">Red</strong> (not eligible). Compare loan amounts, interest rates, EMIs, and processing fees side-by-side.',
			side: 'over',
			align: 'center',
			popoverClass: 'ddsa-info-popover'
		}
	},
	{
		id: 'explain-file-builder',
		popover: {
			title: 'Step 4: Build the File',
			description:
				'The File Builder auto-generates from your form submission and selected lender results. Control the presentation — section order, consolidated vs. detailed views, notes to the RM — but financial numbers remain <strong>immutable</strong>. Generate a <strong>Review PDF</strong> (anonymized, no PII) for discussion, and a <strong>Submission PDF</strong> (complete) for formal filing.',
			side: 'over',
			align: 'center',
			popoverClass: 'ddsa-info-popover'
		}
	},
	{
		id: 'explain-crm',
		element: '[data-walkthrough="crm"]',
		mobileElement: '[data-walkthrough="mobile-crm"]',
		popover: {
			title: 'CRM Hub',
			description:
				'Your relationship management center with three sections: <strong>Leads</strong> (track prospects with 6-status flow from New to Converted), <strong>Sources</strong> (categorize where leads come from — builders, CAs, referrals, walk-ins), and <strong>Lenders</strong> (empanelment status, RM contacts, sanction metrics).',
			side: 'right',
			align: 'start'
		}
	},
	{
		id: 'explain-profile',
		element: '[data-walkthrough="profile"]',
		mobileElement: '[data-walkthrough="mobile-profile"]',
		popover: {
			title: 'Business Profile',
			description:
				'Your DSA business details: firm name, city, business type, GST number, and lender empanelments. A completed profile unlocks personalized lender recommendations and helps RMs find you when searching for DSAs in their area.',
			side: 'right',
			align: 'start'
		}
	},
	{
		id: 'explain-communication',
		element: '[data-walkthrough="communication"]',
		mobileElement: '[data-walkthrough="mobile-communication"]',
		popover: {
			title: 'Communication Center',
			description:
				'Structured messaging with lender RMs. Send case files, respond to queries, share documents, and maintain a clear thread per case per lender. <strong>Templates</strong> help you draft professional messages quickly. All communication is archived.',
			side: 'right',
			align: 'start',
			skipIfMissing: true
		}
	},
	{
		id: 'explain-shared-links',
		element: '[data-walkthrough="shared-links"]',
		mobileElement: '[data-walkthrough="mobile-shared-links"]',
		popover: {
			title: 'Shared Links',
			description:
				'Share form links with applicants so they can self-fill their details — personal info, income, property, CIBIL. Links are time-limited and usage-capped. Track status (active, completed, expired, revoked) and manage everything from one page. <strong>Reduces back-and-forth and speeds up intake.</strong>',
			side: 'right',
			align: 'start',
			skipIfMissing: true
		}
	},
	{
		id: 'explain-analytics',
		element: '[data-walkthrough="analytics"]',
		popover: {
			title: 'Analytics',
			description:
				'Deep insights into your business performance: conversion funnels, lender-wise success rates, monthly trends, processing time breakdowns, and revenue tracking. Identify which loan types and lenders give you the best results.',
			side: 'right',
			align: 'start',
			skipIfMissing: true
		}
	},
	{
		id: 'explain-team',
		element: '[data-walkthrough="team"]',
		popover: {
			title: 'Team Management',
			description:
				"For main DSAs with sub-agents. Create teams, invite members with a 6-character code, and assign <strong>granular permissions</strong> (case creation, results viewing, analytics access, and more). Sub-DSA cases automatically roll up under your firm's umbrella.",
			side: 'right',
			align: 'start',
			skipIfMissing: true
		}
	},
	{
		id: 'explain-finish',
		element: '[data-walkthrough="tour-launcher-sidebar"]',
		popover: {
			title: "You're Ready to Go!",
			description:
				"That's the complete workflow: <strong>Create Case → Fill Form → Get Results → Select Lender → Build File → Submit</strong>. Replay this guide anytime from this button. Good luck with your filings!",
			side: 'right',
			align: 'start',
			popoverClass: 'ddsa-finish-popover',
			skipIfMissing: true
		}
	}
];
