import type { WalkthroughStep } from '../types';

export const COMMUNICATION_TOUR_STEPS: WalkthroughStep[] = [
	{
		id: 'comm-welcome',
		popover: {
			title: 'Communication Hub',
			description:
				'Draft professional messages for customers, lender RMs, and referral sources using pre-built templates. Fill in the variables, link to a case, and share via WhatsApp or clipboard.',
			popoverClass: 'ddsa-welcome-popover'
		}
	},
	{
		id: 'comm-category-tabs',
		element: '[data-walkthrough="comm-category-tabs"]',
		popover: {
			title: 'Template Categories',
			description:
				'Three categories: <strong>Customer</strong> (status updates, document requests, congratulations), <strong>RM</strong> (file submissions, query responses, follow-ups), and <strong>Source/Broker</strong> (thank yous, referral updates). The count badge shows templates available.',
			side: 'bottom',
			align: 'start',
			skipIfMissing: true
		}
	},
	{
		id: 'comm-search',
		element: '[data-walkthrough="comm-search"]',
		popover: {
			title: 'Search Templates',
			description:
				'Type keywords to filter templates within the selected category. Searches both template names and body text for quick discovery.',
			side: 'bottom',
			align: 'end',
			skipIfMissing: true
		}
	},
	{
		id: 'comm-template-card',
		element: '[data-walkthrough="comm-template-first"]',
		popover: {
			title: 'Template Card',
			description:
				'Each card shows the template name, channel (WhatsApp/Email/SMS), a preview of the message body, and the category badge. Click a card to select it and open the composer below.',
			side: 'bottom',
			align: 'start',
			skipIfMissing: true
		}
	},
	{
		id: 'comm-composer',
		element: '[data-walkthrough="comm-composer"]',
		popover: {
			title: 'Message Composer',
			description:
				'After selecting a template, the composer appears here. Link a case (auto-fills case details), fill in remaining variables, preview the final message, then share via <strong>WhatsApp</strong> or copy to clipboard.',
			side: 'top',
			align: 'center',
			skipIfMissing: true
		}
	},
	{
		id: 'comm-finish',
		popover: {
			title: 'Professional Communication',
			description:
				'Consistent, professional messaging builds trust with customers and RMs. Templates are curated for Indian lending workflows — document follow-ups, sanction congratulations, query responses, and more.',
			popoverClass: 'ddsa-finish-popover'
		}
	}
];
