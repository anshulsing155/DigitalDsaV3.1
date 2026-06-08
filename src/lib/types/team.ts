// Team Management Types
import type { ObjectId } from 'mongodb';

// ============================================================================
// TEAM MEMBER PERMISSIONS
// ============================================================================

export interface TeamMemberPermissions {
	cases_view: boolean;
	cases_create: boolean;
	cases_edit: boolean;
	form_fill: boolean;
	form_view: boolean;
	results_view: boolean;
	file_builder_view: boolean;
	file_builder_configure: boolean;
	leads_view: boolean;
	leads_create: boolean;
	leads_edit: boolean;
	sources_view: boolean;
	sources_manage: boolean;
	communication_view: boolean;
	analytics_view: boolean;
}

// ============================================================================
// TEAM ROLES
// ============================================================================

export type TeamRole = 'admin' | 'data_entry' | 'viewer' | 'field_agent';

export type TeamMemberStatus = 'invited' | 'active' | 'suspended' | 'removed';

/**
 * Pre-built permission sets for each team role.
 * Owner can override individual permissions for Pro/Enterprise tiers.
 */
export const TEAM_ROLE_PRESETS: Record<TeamRole, TeamMemberPermissions> = {
	admin: {
		cases_view: true,
		cases_create: true,
		cases_edit: true,
		form_fill: true,
		form_view: true,
		results_view: true,
		file_builder_view: true,
		file_builder_configure: true,
		leads_view: true,
		leads_create: true,
		leads_edit: true,
		sources_view: true,
		sources_manage: true,
		communication_view: true,
		analytics_view: true
	},
	data_entry: {
		cases_view: true,
		cases_create: true,
		cases_edit: true,
		form_fill: true,
		form_view: true,
		results_view: false,
		file_builder_view: false,
		file_builder_configure: false,
		leads_view: true,
		leads_create: true,
		leads_edit: false,
		sources_view: false,
		sources_manage: false,
		communication_view: false,
		analytics_view: false
	},
	viewer: {
		cases_view: true,
		cases_create: false,
		cases_edit: false,
		form_fill: false,
		form_view: true,
		results_view: true,
		file_builder_view: true,
		file_builder_configure: false,
		leads_view: true,
		leads_create: false,
		leads_edit: false,
		sources_view: true,
		sources_manage: false,
		communication_view: true,
		analytics_view: true
	},
	field_agent: {
		cases_view: true,
		cases_create: true,
		cases_edit: false,
		form_fill: true,
		form_view: true,
		results_view: false,
		file_builder_view: false,
		file_builder_configure: false,
		leads_view: true,
		leads_create: true,
		leads_edit: true,
		sources_view: true,
		sources_manage: false,
		communication_view: false,
		analytics_view: false
	}
};

/**
 * Permissions that require Pro/Enterprise subscription.
 * Free-tier owners have these force-disabled for all team members.
 */
export const PREMIUM_TEAM_PERMISSIONS: (keyof TeamMemberPermissions)[] = [
	'results_view',
	'file_builder_view',
	'file_builder_configure',
	'analytics_view',
	'communication_view'
];

// ============================================================================
// TEAM MEMBER
// ============================================================================

export interface TeamMember {
	user_id: ObjectId;
	mobile_number: number;
	name: string;
	team_role: TeamRole;
	permissions: TeamMemberPermissions;
	status: TeamMemberStatus;
	invited_at: Date;
	joined_at?: Date;
	invite_code: string;
	/**
	 * Invitee email captured at invite time when the team owner provided
	 * one. Drives the SEC-8 team-invite email (template D). Absent for
	 * legacy mobile-only invites — those still work, just without the
	 * email touch-point.
	 */
	email?: string;
}

// ============================================================================
// TEAM DOCUMENT
// ============================================================================

export interface Team {
	_id?: ObjectId;
	owner_dsa_id: ObjectId;
	members: TeamMember[];
	created_at: Date;
	updated_at: Date;
}
