/**
 * Role-Based Permissions Configuration
 * ══════════════════════════════════════════════════════════════════
 * Shared between client (auth.svelte.ts) and server (guards.ts).
 *
 * Permission naming convention: `resource.action`
 *   - cases.*   — case management
 *   - form.*    — loan forms
 *   - files.*   — file builder / documents
 *   - rm.*      — RM-specific features
 *   - admin.*   — platform administration
 *   - profile.* — own profile
 *   - communication.* — messaging / templates
 *   - analytics.*     — dashboards / reports
 *   - share_link.*    — share link generation
 * ══════════════════════════════════════════════════════════════════
 */

export const ROLE_PERMISSIONS: Record<string, readonly string[]> = {
	dsa: [
		// Cases
		'cases.create',
		'cases.view_own',
		'cases.edit_own',
		// Forms
		'form.create',
		'form.edit_own',
		'form.submit',
		// Files & Documents
		'files.upload',
		'files.view_own',
		'files.download_own',
		// Profile
		'profile.view',
		'profile.edit',
		// Communication
		'communication.view_own',
		'communication.send',
		// Analytics
		'analytics.view_own',
		// RM interactions
		'rm.search',
		'rm.connect',
		// Share link
		'share_link.create',
		'share_link.view_own'
	],
	rm: [
		// Cases (read-only, DSA cases shared with them)
		'cases.view_shared',
		'cases.rate',
		// RM-specific
		'rm.dashboard',
		'rm.broadcast',
		'rm.policy_upload',
		'rm.dsa_search',
		'rm.query',
		// Profile
		'profile.view',
		'profile.edit',
		// Communication
		'communication.view_own',
		'communication.send',
		// Analytics
		'analytics.view_own'
	],
	admin: [
		// Full access
		'cases.view_all',
		'cases.edit_all',
		'cases.delete',
		'form.view_all',
		'files.view_all',
		'profile.view',
		'profile.edit',
		'admin.dashboard',
		'admin.users',
		'admin.roles',
		'admin.stats',
		'admin.delete_account',
		'communication.view_all',
		'analytics.view_all',
		'rm.view_all'
	],
	user: [
		// Minimal — pre-onboarding state
		'profile.view',
		'profile.edit'
	],
	dsa_team_member: [
		// Team members — subset of DSA permissions, further filtered by TeamMemberPermissions
		'cases.view_own',
		'form.create',
		'form.edit_own',
		'form.submit',
		'files.upload',
		'files.view_own',
		'profile.view',
		'profile.edit'
	]
} as const;

/**
 * All valid role strings in the system.
 */
export type AppRole = 'admin' | 'user' | 'dsa' | 'rm' | 'property-consultant';

/**
 * Check if a role string has a specific permission.
 * Usable server-side without importing auth state.
 */
export function roleHasPermission(role: string, permission: string): boolean {
	const perms = ROLE_PERMISSIONS[role] ?? ROLE_PERMISSIONS.user;
	return perms.includes(permission);
}

/**
 * Get all permissions for a given role.
 */
export function getPermissionsForRole(role: string): readonly string[] {
	return ROLE_PERMISSIONS[role] ?? ROLE_PERMISSIONS.user;
}
