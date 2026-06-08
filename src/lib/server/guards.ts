/**
 * Server-Side Authorization Guards
 * ══════════════════════════════════════════════════════════════════
 * Reusable guard functions for SvelteKit page loads and API routes.
 *
 * Two flavours:
 *   • Page guards   → throw error() (SvelteKit renders error page)
 *   • API guards    → return json() Response or null (null = OK)
 *
 * Admin users bypass role checks (they have full access).
 * ══════════════════════════════════════════════════════════════════
 */

import { error } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { RmLenderAssignments } from '$lib/database/mongo';
import { verifyPmsOtpToken } from '$lib/server/pms/signingKey.js';
import type { RmLenderAssignment } from '$lib/config/pms/policyTypes';

// ============================================================================
// PAGE LOAD GUARDS (for +page.server.ts / +layout.server.ts)
// ============================================================================

/**
 * Ensures the request has an authenticated user.
 * Throws 401 if not authenticated.
 *
 * @example
 * ```ts
 * export const load: PageServerLoad = async ({ locals }) => {
 *   requireAuth(locals);
 *   // locals.user is guaranteed non-null here
 * };
 * ```
 */
export function requireAuth(locals: App.Locals): void {
	if (!locals.user) {
		throw error(401, 'Authentication required');
	}
}

/**
 * Ensures the request has an authenticated user with the correct role.
 * Admin users always pass. Throws 401 if not authenticated, 403 if wrong role.
 *
 * @param locals - SvelteKit locals object (set by hooks.server.ts)
 * @param allowed - Single role string or array of allowed roles
 *
 * @example
 * ```ts
 * export const load: LayoutServerLoad = async ({ locals, parent }) => {
 *   requireRole(locals, 'dsa');
 *   // or: requireRole(locals, ['dsa', 'rm']);
 *   const parentData = await parent();
 *   return parentData;
 * };
 * ```
 */
export function requireRole(locals: App.Locals, allowed: string | string[]): void {
	if (!locals.user) {
		throw error(401, 'Authentication required');
	}

	const userRole = locals.role || locals.user.role || 'user';

	// Admin bypasses all role checks
	if (userRole === 'admin') return;

	const allowedRoles = Array.isArray(allowed) ? allowed : [allowed];
	if (!allowedRoles.includes(userRole)) {
		throw error(403, `Access denied: requires ${allowedRoles.join(' or ')} role`);
	}
}

// ============================================================================
// API ROUTE GUARDS (for +server.ts)
// ============================================================================

/**
 * Checks authentication for API routes.
 * Returns a 401 json Response if not authenticated, or null if OK.
 *
 * @example
 * ```ts
 * export const GET: RequestHandler = async ({ locals }) => {
 *   const denied = requireAuthApi(locals);
 *   if (denied) return denied;
 *   // proceed...
 * };
 * ```
 */
export function requireAuthApi(locals: App.Locals): Response | null {
	if (!locals.user) {
		return json({ success: false, error: 'Authentication required' }, { status: 401 });
	}
	return null;
}

/**
 * Checks authentication + role for API routes.
 * Admin users always pass. Returns 401/403 json Response or null (OK).
 *
 * @param locals - SvelteKit locals object
 * @param allowed - Single role string or array of allowed roles
 *
 * @example
 * ```ts
 * export const GET: RequestHandler = async ({ locals }) => {
 *   const denied = requireRoleApi(locals, 'dsa');
 *   if (denied) return denied;
 *   // proceed...
 * };
 * ```
 */
export function requireRoleApi(locals: App.Locals, allowed: string | string[]): Response | null {
	if (!locals.user) {
		return json({ success: false, error: 'Authentication required' }, { status: 401 });
	}

	const userRole = locals.role || locals.user.role || 'user';

	// Admin bypasses all role checks
	if (userRole === 'admin') return null;

	const allowedRoles = Array.isArray(allowed) ? allowed : [allowed];
	if (!allowedRoles.includes(userRole)) {
		return json(
			{ success: false, error: `Access denied: requires ${allowedRoles.join(' or ')} role` },
			{ status: 403 }
		);
	}

	return null;
}

/**
 * Checks if a team member has the required permission.
 * Returns a 403 json Response if the member lacks the permission, or null if OK.
 *
 * - Solo DSAs / team owners always pass (no restriction).
 * - Admin users always pass.
 * - Premium permissions are force-disabled for free-tier owners.
 *
 * @example
 * ```ts
 * export const GET: RequestHandler = async ({ locals }) => {
 *   const permDenied = requireTeamPermission(locals, 'cases_view');
 *   if (permDenied) return permDenied;
 *   // proceed...
 * };
 * ```
 */
export function requireTeamPermission(
	locals: App.Locals,
	permission: keyof import('$lib/types/team.js').TeamMemberPermissions
): Response | null {
	if (!locals.user) {
		return json({ success: false, error: 'Authentication required' }, { status: 401 });
	}

	const userRole = locals.role || locals.user.role || 'user';

	// Admin bypasses all checks
	if (userRole === 'admin') return null;

	const ctx = locals.user.teamContext;

	// Solo DSAs or team owners → always pass
	if (!ctx || ctx.isOwner) return null;

	// Team member → check permission
	if (!ctx.permissions[permission]) {
		return json(
			{ success: false, error: `Permission denied: requires ${permission}` },
			{ status: 403 }
		);
	}

	return null;
}

// ============================================================================
// ADMIN PERMISSION GUARDS (for admin API routes)
// ============================================================================

/**
 * Checks that the current admin user has a specific permission.
 * Uses `locals.adminPermissions` (populated during auth in hooks.server.ts).
 * Super admins always pass. Returns 403 json Response or null (OK).
 *
 * @example
 * ```ts
 * export const GET: RequestHandler = async ({ locals }) => {
 *   const denied = requireRoleApi(locals, 'admin');
 *   if (denied) return denied;
 *   const permDenied = requireAdminPermission(locals, 'rule_authoring');
 *   if (permDenied) return permDenied;
 *   // proceed...
 * };
 * ```
 */
export function requireAdminPermission(
	locals: App.Locals,
	permission: keyof import('$lib/types/adminUser.js').AdminPermissions
): Response | null {
	// Super admins bypass all permission checks
	if (locals.isSuperAdmin) return null;

	// Check specific permission
	if (locals.adminPermissions && locals.adminPermissions[permission]) return null;

	return json(
		{ success: false, error: `Admin permission denied: requires ${permission}` },
		{ status: 403 }
	);
}

/**
 * Checks that the current admin user is a super admin.
 * Returns 403 json Response or null (OK).
 *
 * @example
 * ```ts
 * export const POST: RequestHandler = async ({ locals }) => {
 *   const denied = requireRoleApi(locals, 'admin');
 *   if (denied) return denied;
 *   const superDenied = requireSuperAdmin(locals);
 *   if (superDenied) return superDenied;
 *   // proceed...
 * };
 * ```
 */
export function requireSuperAdmin(locals: App.Locals): Response | null {
	if (locals.isSuperAdmin) return null;

	return json(
		{ success: false, error: 'Access denied: requires super admin privileges' },
		{ status: 403 }
	);
}

/**
 * Page-load version: checks that the admin has a specific permission.
 * Throws 403 if permission is missing. Super admins always pass.
 */
export function requireAdminPermissionPage(
	locals: App.Locals,
	permission: keyof import('$lib/types/adminUser.js').AdminPermissions
): void {
	if (locals.isSuperAdmin) return;
	if (locals.adminPermissions && locals.adminPermissions[permission]) return;

	throw error(403, `Admin permission denied: requires ${permission}`);
}

/**
 * Page-load version: checks that the user is a super admin.
 * Throws 403 if not super admin.
 */
export function requireSuperAdminPage(locals: App.Locals): void {
	if (locals.isSuperAdmin) return;
	throw error(403, 'Access denied: requires super admin privileges');
}

// ============================================================================
// PMS GUARDS
// ============================================================================

/**
 * Checks that the authenticated RM has an active, non-expired assignment for
 * the given lenderId. Admin users bypass this check (full PMS access).
 *
 * Returns 401/403/404 json Response on failure, or null on success.
 * On success, also returns the assignment document for the caller's use.
 *
 * @example
 * ```ts
 * export const POST: RequestHandler = async ({ locals, request }) => {
 *   const [denied, assignment] = await requireRmLenderAccess(locals, 'hdfc-bank');
 *   if (denied) return denied;
 *   // assignment is the active RmLenderAssignment document
 * };
 * ```
 */
export async function requireRmLenderAccess(
	locals: App.Locals,
	lenderId: string
): Promise<[Response, null] | [null, RmLenderAssignment]> {
	if (!locals.user) {
		return [json({ success: false, error: 'Authentication required' }, { status: 401 }), null];
	}

	const userRole = locals.role || locals.user.role || 'user';

	// Admin has full PMS access — return a synthetic active assignment
	if (userRole === 'admin') {
		const adminAssignment: RmLenderAssignment = {
			_id: undefined as never,
			rmUserId: locals.user.id,
			lenderId,
			lenderName: lenderId,
			officialBankEmail: '',
			status: 'active',
			onboardedAt: new Date(),
			lastMonthlyVerifiedAt: new Date(),
			nextVerificationDueBy: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
			suspendedAt: null,
			suspendedReason: null,
			transferredTo: null,
			transferredAt: null
		};
		return [null, adminAssignment];
	}

	if (userRole !== 'rm') {
		return [
			json({ success: false, error: 'Access denied: requires rm role' }, { status: 403 }),
			null
		];
	}

	const assignment = await RmLenderAssignments.findOne({
		rmUserId: locals.user.id,
		lenderId,
		status: 'active'
	});

	if (!assignment) {
		return [
			json(
				{
					success: false,
					error: 'No active assignment found for this lender. Please complete onboarding first.'
				},
				{ status: 403 }
			),
			null
		];
	}

	// Check if monthly renewal is overdue (suspended means assignment is no longer active,
	// but we also gate on nextVerificationDueBy in case the cron hasn't run yet)
	if (assignment.nextVerificationDueBy < new Date()) {
		return [
			json(
				{
					success: false,
					error: 'Your lender assignment has expired. Please complete monthly verification.',
					code: 'RENEWAL_REQUIRED'
				},
				{ status: 403 }
			),
			null
		];
	}

	return [null, assignment];
}

/**
 * Verifies the short-lived `pmsOtpToken` header on RM submit/publish endpoints.
 * The token is a windowed HMAC-SHA256 of
 * `${rmUserId}:${lenderId}:${policyId}:${draftHash}:${windowSlot}` where
 * windowSlot rotates every 15 minutes (see `PMS_OTP_TOKEN_WINDOW_MS`). Tokens
 * are accepted in the current OR previous slot — giving ~15-30 minutes of
 * validity. Without windowing, a captured token would be replayable indefinitely.
 *
 * Token is passed as `x-pms-otp-token` header. Returns 401 json Response on failure,
 * or null if the token is valid. Caller passes `signingKey` from `getPmsSigningKey()`.
 */
export function requirePmsOtpToken(
	request: Request,
	rmUserId: string,
	lenderId: string,
	policyId: string,
	draftHash: string,
	signingKey: string
): Response | null {
	const token = request.headers.get('x-pms-otp-token');

	if (!token) {
		return json(
			{ success: false, error: 'OTP token required for this action' },
			{ status: 401 }
		);
	}

	const ok = verifyPmsOtpToken(
		token,
		{ rmUserId, lenderId, policyId, draftHash },
		signingKey
	);
	if (!ok) {
		return json(
			{ success: false, error: 'Invalid or expired OTP token. Please re-verify.' },
			{ status: 401 }
		);
	}

	return null;
}

// ============================================================================
// DEMO MODE GUARD
// ============================================================================

/**
 * Checks if the current user is a demo user.
 * Returns a mock success response for write operations in demo mode.
 *
 * @example
 * ```ts
 * export const POST: RequestHandler = async ({ locals }) => {
 *   const demoBlock = blockDemoWrite(locals);
 *   if (demoBlock) return demoBlock;
 *   // proceed with real write...
 * };
 * ```
 */
export function blockDemoWrite(locals: App.Locals): Response | null {
	if (locals.user?.id === 'demo-guest') {
		return json(
			{
				success: true,
				message: 'Demo mode — changes not saved',
				data: {
					caseId: 'demo-case',
					offerCount: 5,
					amountRequested: 5_000_000,
					tenureYears: 20
				}
			},
			{ status: 200 }
		);
	}
	return null;
}
