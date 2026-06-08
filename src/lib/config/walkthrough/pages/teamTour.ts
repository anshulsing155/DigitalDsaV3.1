import type { WalkthroughStep } from '../types';

export const TEAM_TOUR_STEPS: WalkthroughStep[] = [
	{
		id: 'team-welcome',
		popover: {
			title: 'Team Management',
			description:
				'Build your DSA team — invite data entry staff, field agents, and admins. Assign roles and permissions so team members can create cases, view results, and access analytics under your firm.',
			popoverClass: 'ddsa-welcome-popover'
		}
	},
	{
		id: 'team-create-button',
		element: '[data-walkthrough="team-create-button"]',
		popover: {
			title: 'Create Your Team',
			description:
				'First, create a team. This initializes your firm as a team entity. After creation, you can invite members. <em>Only the account owner (you) can create and manage the team.</em>',
			side: 'bottom',
			align: 'center',
			skipIfMissing: true
		}
	},
	{
		id: 'team-invite-button',
		element: '[data-walkthrough="team-invite-button"]',
		popover: {
			title: 'Invite Members',
			description:
				"Enter the member's name, 10-digit mobile number, and assign a role. The system generates a <strong>6-character invite code</strong> — share it with the member. They log in with their phone and enter the code to join.",
			side: 'bottom',
			align: 'end',
			skipIfMissing: true
		}
	},
	{
		id: 'team-member-list',
		element: '[data-walkthrough="team-member-list"]',
		popover: {
			title: 'Member List',
			description:
				'View all team members with their role, status (Invited/Active/Suspended), and actions. You can <strong>Edit</strong> permissions, <strong>Suspend</strong> access temporarily, or <strong>Remove</strong> members entirely.',
			side: 'top',
			align: 'start',
			skipIfMissing: true
		}
	},
	{
		id: 'team-finish',
		element: '[data-walkthrough="team-tier-info"]',
		popover: {
			title: 'Team Roles & Tiers',
			description:
				'Four roles: <strong>Data Entry</strong> (form filling), <strong>Field Agent</strong> (on-ground work), <strong>Viewer</strong> (read-only), <strong>Admin</strong> (full access). Free tier allows basic team features — upgrade to Pro for advanced permissions and analytics access.',
			side: 'top',
			align: 'center',
			skipIfMissing: true,
			popoverClass: 'ddsa-finish-popover'
		}
	}
];
