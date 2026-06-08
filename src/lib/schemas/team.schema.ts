// Team Management Zod Schemas
import { z } from 'zod';

// ============================================================================
// ENUMS
// ============================================================================

export const teamRoleEnum = z.enum(['admin', 'data_entry', 'viewer', 'field_agent']);

export const teamMemberStatusEnum = z.enum(['invited', 'active', 'suspended', 'removed']);

// ============================================================================
// PERMISSIONS SCHEMA
// ============================================================================

export const teamMemberPermissionsSchema = z.object({
	cases_view: z.boolean(),
	cases_create: z.boolean(),
	cases_edit: z.boolean(),
	form_fill: z.boolean(),
	form_view: z.boolean(),
	results_view: z.boolean(),
	file_builder_view: z.boolean(),
	file_builder_configure: z.boolean(),
	leads_view: z.boolean(),
	leads_create: z.boolean(),
	leads_edit: z.boolean(),
	sources_view: z.boolean(),
	sources_manage: z.boolean(),
	communication_view: z.boolean(),
	analytics_view: z.boolean()
});

// ============================================================================
// INVITE SCHEMA (Main DSA invites a member)
// ============================================================================

export const teamInviteSchema = z.object({
	mobile_number: z
		.number()
		.int()
		.min(6000000000, 'Invalid Indian mobile number')
		.max(9999999999, 'Invalid Indian mobile number'),
	name: z.string().min(1, 'Name is required').max(100),
	team_role: teamRoleEnum,
	/**
	 * Optional invitee email. When provided, /api/team/invite sends the
	 * SEC-8 team-invite email (template D) in addition to surfacing the
	 * invite code on the inviter's dashboard. Mobile-only invites (no
	 * email) still work — the inviter shares the code out-of-band as
	 * before.
	 */
	email: z.string().trim().email('Invalid email').max(200).optional()
});

// ============================================================================
// JOIN SCHEMA (Member accepts invite)
// ============================================================================

export const teamJoinSchema = z.object({
	invite_code: z.string().length(6, 'Invite code must be 6 characters')
});

// ============================================================================
// MEMBER UPDATE SCHEMA
// ============================================================================

export const teamMemberUpdateSchema = z.object({
	team_role: teamRoleEnum.optional(),
	permissions: teamMemberPermissionsSchema.partial().optional(),
	status: z.enum(['active', 'suspended']).optional()
});

// ============================================================================
// INFERRED TYPES
// ============================================================================

export type TeamRoleEnum = z.infer<typeof teamRoleEnum>;
export type TeamMemberStatusEnum = z.infer<typeof teamMemberStatusEnum>;
export type TeamMemberPermissionsData = z.infer<typeof teamMemberPermissionsSchema>;
export type TeamInviteData = z.infer<typeof teamInviteSchema>;
export type TeamJoinData = z.infer<typeof teamJoinSchema>;
export type TeamMemberUpdateData = z.infer<typeof teamMemberUpdateSchema>;
