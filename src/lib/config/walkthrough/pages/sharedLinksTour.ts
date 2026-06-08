import type { WalkthroughStep } from '../types';

export const SHARED_LINKS_TOUR_STEPS: WalkthroughStep[] = [
	{
		id: 'shared-links-welcome',
		popover: {
			title: 'Shared Links',
			description:
				'This page shows all form links you have shared with applicants for self-fill. Track their status, copy URLs, and revoke access — all in one place.',
			popoverClass: 'ddsa-welcome-popover'
		}
	},
	{
		id: 'shared-links-filters',
		element: '[data-walkthrough="shared-links-filter-tabs"]',
		popover: {
			title: 'Filter by Status',
			description:
				'Quickly filter links by their current status: <strong>Active</strong> (awaiting submission), <strong>Completed</strong> (form filled), <strong>Expired</strong> (past deadline), or <strong>Revoked</strong> (manually disabled). Counts update in real time.',
			side: 'bottom',
			align: 'start',
			skipIfMissing: true
		}
	},
	{
		id: 'shared-links-card',
		element: '[data-walkthrough="shared-links-card-first"]',
		popover: {
			title: 'Link Details',
			description:
				'Each card shows the <strong>case name</strong>, shared sections (e.g. personal, income, property), creation date, usage count, and time remaining. The status badge tells you at a glance whether the applicant has submitted.',
			side: 'bottom',
			align: 'start',
			skipIfMissing: true
		}
	},
	{
		id: 'shared-links-actions',
		element: '[data-walkthrough="shared-links-actions-first"]',
		popover: {
			title: 'Copy & Revoke',
			description:
				'<strong>Copy Link</strong> copies the share URL to your clipboard — send it via WhatsApp, SMS, or email. <strong>Revoke</strong> permanently disables the link so the applicant can no longer access it.',
			side: 'left',
			align: 'start',
			skipIfMissing: true
		}
	},
	{
		id: 'shared-links-finish',
		popover: {
			title: "You're All Set!",
			description:
				'Create share links from any case page using the "Share Form with Applicant" button. All links will appear here automatically. Replay this guide anytime from the button above.',
			popoverClass: 'ddsa-finish-popover'
		}
	}
];
