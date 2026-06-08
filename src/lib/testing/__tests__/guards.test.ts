/**
 * Server-Side Guards — Unit Tests
 * ══════════════════════════════════════════════════════════════════
 * Tests for requireAuth, requireRole, requireAuthApi, requireRoleApi,
 * and blockDemoWrite guard functions.
 * ══════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';

// ── We test the guards by importing them directly ──────────────
// Note: guards.ts uses SvelteKit's `error()` and `json()` functions.
// In Vitest, `error()` throws an HttpError, and `json()` creates a Response.
// We need to handle both patterns in our tests.

// Since guards use SvelteKit runtime, we test the logic patterns directly
// by creating mock implementations that mirror the guard functions.
// This avoids needing the full SvelteKit server context.

// ── Test helpers ──────────────────────────────────────────────

/** Valid role union type */
type AppRole = 'admin' | 'user' | 'dsa' | 'rm' | 'property-consultant';

/** Minimal App.Locals mock */
function createLocals(options: {
	user?: {
		id: string;
		name: string;
		mobileNumber: string;
		role: AppRole;
		activeRole?: string;
		onboardingCompleted?: boolean;
	} | null;
	role?: string | null;
}): App.Locals {
	return {
		user: options.user as App.Locals['user'],
		Application: [],
		role: (options.role ?? options.user?.role ?? null) as any,
		csrfToken: undefined,
		verifiedMobile: undefined
	};
}

/** DSA user locals */
function dsaLocals(): App.Locals {
	return createLocals({
		user: {
			id: 'dsa-123',
			name: 'Test DSA',
			mobileNumber: '9876543210',
			role: 'dsa',
			activeRole: 'dsa',
			onboardingCompleted: true
		},
		role: 'dsa'
	});
}

/** RM user locals */
function rmLocals(): App.Locals {
	return createLocals({
		user: {
			id: 'rm-456',
			name: 'Test RM',
			mobileNumber: '9876543211',
			role: 'rm',
			activeRole: 'rm',
			onboardingCompleted: true
		},
		role: 'rm'
	});
}

/** Admin user locals */
function adminLocals(): App.Locals {
	return createLocals({
		user: {
			id: 'admin-789',
			name: 'Test Admin',
			mobileNumber: '9876543212',
			role: 'admin',
			activeRole: 'admin'
		},
		role: 'admin'
	});
}

/** Unauthenticated locals */
function noAuthLocals(): App.Locals {
	return createLocals({ user: null, role: null });
}

/** Demo user locals */
function demoLocals(): App.Locals {
	return createLocals({
		user: {
			id: 'demo-guest',
			name: 'Demo DSA Agent',
			mobileNumber: '9999999999',
			role: 'dsa',
			activeRole: 'dsa',
			onboardingCompleted: true
		},
		role: 'dsa'
	});
}

// ============================================================================
// PERMISSIONS CONFIG TESTS
// ============================================================================

describe('Permissions Config', () => {
	it('should export ROLE_PERMISSIONS with 5 roles', async () => {
		const { ROLE_PERMISSIONS } = await import('$lib/config/permissions');
		expect(Object.keys(ROLE_PERMISSIONS)).toEqual(
			expect.arrayContaining(['dsa', 'rm', 'admin', 'user', 'dsa_team_member'])
		);
		expect(Object.keys(ROLE_PERMISSIONS)).toHaveLength(5);
	});

	it('DSA should have case creation permissions', async () => {
		const { ROLE_PERMISSIONS } = await import('$lib/config/permissions');
		expect(ROLE_PERMISSIONS.dsa).toContain('cases.create');
		expect(ROLE_PERMISSIONS.dsa).toContain('cases.view_own');
		expect(ROLE_PERMISSIONS.dsa).toContain('cases.edit_own');
	});

	it('DSA should have form permissions', async () => {
		const { ROLE_PERMISSIONS } = await import('$lib/config/permissions');
		expect(ROLE_PERMISSIONS.dsa).toContain('form.create');
		expect(ROLE_PERMISSIONS.dsa).toContain('form.edit_own');
		expect(ROLE_PERMISSIONS.dsa).toContain('form.submit');
	});

	it('DSA should have file permissions', async () => {
		const { ROLE_PERMISSIONS } = await import('$lib/config/permissions');
		expect(ROLE_PERMISSIONS.dsa).toContain('files.upload');
		expect(ROLE_PERMISSIONS.dsa).toContain('files.view_own');
	});

	it('DSA should have share link permissions', async () => {
		const { ROLE_PERMISSIONS } = await import('$lib/config/permissions');
		expect(ROLE_PERMISSIONS.dsa).toContain('share_link.create');
		expect(ROLE_PERMISSIONS.dsa).toContain('share_link.view_own');
	});

	it('RM should have RM-specific permissions', async () => {
		const { ROLE_PERMISSIONS } = await import('$lib/config/permissions');
		expect(ROLE_PERMISSIONS.rm).toContain('rm.dashboard');
		expect(ROLE_PERMISSIONS.rm).toContain('rm.broadcast');
		expect(ROLE_PERMISSIONS.rm).toContain('rm.dsa_search');
	});

	it('RM should NOT have case creation permissions', async () => {
		const { ROLE_PERMISSIONS } = await import('$lib/config/permissions');
		expect(ROLE_PERMISSIONS.rm).not.toContain('cases.create');
		expect(ROLE_PERMISSIONS.rm).not.toContain('cases.edit_own');
	});

	it('RM should have shared case viewing', async () => {
		const { ROLE_PERMISSIONS } = await import('$lib/config/permissions');
		expect(ROLE_PERMISSIONS.rm).toContain('cases.view_shared');
		expect(ROLE_PERMISSIONS.rm).toContain('cases.rate');
	});

	it('Admin should have full access permissions', async () => {
		const { ROLE_PERMISSIONS } = await import('$lib/config/permissions');
		expect(ROLE_PERMISSIONS.admin).toContain('cases.view_all');
		expect(ROLE_PERMISSIONS.admin).toContain('cases.edit_all');
		expect(ROLE_PERMISSIONS.admin).toContain('cases.delete');
		expect(ROLE_PERMISSIONS.admin).toContain('admin.dashboard');
		expect(ROLE_PERMISSIONS.admin).toContain('admin.users');
	});

	it('User should only have profile permissions', async () => {
		const { ROLE_PERMISSIONS } = await import('$lib/config/permissions');
		expect(ROLE_PERMISSIONS.user).toHaveLength(2);
		expect(ROLE_PERMISSIONS.user).toContain('profile.view');
		expect(ROLE_PERMISSIONS.user).toContain('profile.edit');
	});

	it('All permission strings should follow resource.action pattern', async () => {
		const { ROLE_PERMISSIONS } = await import('$lib/config/permissions');
		const permissionPattern = /^[a-z_]+\.[a-z_]+$/;
		for (const [role, perms] of Object.entries(ROLE_PERMISSIONS)) {
			for (const perm of perms) {
				expect(perm, `Permission "${perm}" in role "${role}"`).toMatch(permissionPattern);
			}
		}
	});

	it('No duplicate permissions within a role', async () => {
		const { ROLE_PERMISSIONS } = await import('$lib/config/permissions');
		for (const [role, perms] of Object.entries(ROLE_PERMISSIONS)) {
			const unique = new Set(perms);
			expect(unique.size, `Duplicate permissions in role "${role}"`).toBe(perms.length);
		}
	});
});

// ============================================================================
// roleHasPermission() TESTS
// ============================================================================

describe('roleHasPermission()', () => {
	it('should return true for valid DSA permission', async () => {
		const { roleHasPermission } = await import('$lib/config/permissions');
		expect(roleHasPermission('dsa', 'cases.create')).toBe(true);
	});

	it('should return false for invalid DSA permission', async () => {
		const { roleHasPermission } = await import('$lib/config/permissions');
		expect(roleHasPermission('dsa', 'admin.dashboard')).toBe(false);
	});

	it('should return true for admin full-access permission', async () => {
		const { roleHasPermission } = await import('$lib/config/permissions');
		expect(roleHasPermission('admin', 'cases.view_all')).toBe(true);
		expect(roleHasPermission('admin', 'admin.users')).toBe(true);
	});

	it('should fallback to user permissions for unknown role', async () => {
		const { roleHasPermission } = await import('$lib/config/permissions');
		expect(roleHasPermission('unknown_role', 'profile.view')).toBe(true);
		expect(roleHasPermission('unknown_role', 'cases.create')).toBe(false);
	});

	it('should return true for RM-specific permission', async () => {
		const { roleHasPermission } = await import('$lib/config/permissions');
		expect(roleHasPermission('rm', 'rm.dashboard')).toBe(true);
		expect(roleHasPermission('rm', 'rm.broadcast')).toBe(true);
	});
});

// ============================================================================
// getPermissionsForRole() TESTS
// ============================================================================

describe('getPermissionsForRole()', () => {
	it('should return DSA permissions array', async () => {
		const { getPermissionsForRole } = await import('$lib/config/permissions');
		const perms = getPermissionsForRole('dsa');
		expect(perms).toContain('cases.create');
		expect(perms.length).toBeGreaterThan(10);
	});

	it('should return user permissions for unknown role', async () => {
		const { getPermissionsForRole } = await import('$lib/config/permissions');
		const perms = getPermissionsForRole('nonexistent');
		expect(perms).toHaveLength(2);
		expect(perms).toContain('profile.view');
	});

	it('should return readonly array (immutable)', async () => {
		const { getPermissionsForRole } = await import('$lib/config/permissions');
		const perms = getPermissionsForRole('dsa');
		// TypeScript enforces readonly, but let's verify the source is consistent
		expect(Array.isArray(perms)).toBe(true);
	});
});

// ============================================================================
// GUARD LOGIC TESTS (pattern-based, no SvelteKit runtime dependency)
// ============================================================================

describe('Guard Logic — requireAuthApi pattern', () => {
	it('should return 401 response for unauthenticated user', { timeout: 10000 }, async () => {
		const { requireAuthApi } = await import('$lib/server/guards');
		const locals = noAuthLocals();
		const result = requireAuthApi(locals);
		expect(result).not.toBeNull();
		expect(result!.status).toBe(401);
		const body = await result!.json();
		expect(body.success).toBe(false);
		expect(body.error).toContain('Authentication required');
	});

	it('should return null for authenticated user', async () => {
		const { requireAuthApi } = await import('$lib/server/guards');
		const locals = dsaLocals();
		const result = requireAuthApi(locals);
		expect(result).toBeNull();
	});
});

describe('Guard Logic — requireRoleApi pattern', () => {
	it('should return 401 for unauthenticated user', async () => {
		const { requireRoleApi } = await import('$lib/server/guards');
		const locals = noAuthLocals();
		const result = requireRoleApi(locals, 'dsa');
		expect(result).not.toBeNull();
		expect(result!.status).toBe(401);
	});

	it('should return 403 for wrong role', async () => {
		const { requireRoleApi } = await import('$lib/server/guards');
		const locals = rmLocals();
		const result = requireRoleApi(locals, 'dsa');
		expect(result).not.toBeNull();
		expect(result!.status).toBe(403);
		const body = await result!.json();
		expect(body.success).toBe(false);
		expect(body.error).toContain('dsa');
	});

	it('should return null for matching role', async () => {
		const { requireRoleApi } = await import('$lib/server/guards');
		const locals = dsaLocals();
		const result = requireRoleApi(locals, 'dsa');
		expect(result).toBeNull();
	});

	it('should accept array of allowed roles', async () => {
		const { requireRoleApi } = await import('$lib/server/guards');
		const locals = rmLocals();
		const result = requireRoleApi(locals, ['dsa', 'rm']);
		expect(result).toBeNull();
	});

	it('should return 403 when role not in allowed array', async () => {
		const { requireRoleApi } = await import('$lib/server/guards');
		const locals = rmLocals();
		const result = requireRoleApi(locals, ['dsa', 'admin']);
		expect(result).not.toBeNull();
		expect(result!.status).toBe(403);
	});

	it('admin should bypass all role checks', async () => {
		const { requireRoleApi } = await import('$lib/server/guards');
		const locals = adminLocals();

		// Admin accessing DSA-only route
		expect(requireRoleApi(locals, 'dsa')).toBeNull();
		// Admin accessing RM-only route
		expect(requireRoleApi(locals, 'rm')).toBeNull();
		// Admin accessing admin route
		expect(requireRoleApi(locals, 'admin')).toBeNull();
	});

	it('DSA cannot access RM routes', async () => {
		const { requireRoleApi } = await import('$lib/server/guards');
		const locals = dsaLocals();
		const result = requireRoleApi(locals, 'rm');
		expect(result).not.toBeNull();
		expect(result!.status).toBe(403);
	});

	it('RM cannot access admin routes', async () => {
		const { requireRoleApi } = await import('$lib/server/guards');
		const locals = rmLocals();
		const result = requireRoleApi(locals, 'admin');
		expect(result).not.toBeNull();
		expect(result!.status).toBe(403);
	});
});

describe('Guard Logic — requireAuth (page guard)', () => {
	it('should throw 401 for unauthenticated user', async () => {
		const { requireAuth } = await import('$lib/server/guards');
		const locals = noAuthLocals();
		expect(() => requireAuth(locals)).toThrow();
	});

	it('should not throw for authenticated user', async () => {
		const { requireAuth } = await import('$lib/server/guards');
		const locals = dsaLocals();
		expect(() => requireAuth(locals)).not.toThrow();
	});
});

describe('Guard Logic — requireRole (page guard)', () => {
	it('should throw 401 for unauthenticated user', async () => {
		const { requireRole } = await import('$lib/server/guards');
		const locals = noAuthLocals();
		expect(() => requireRole(locals, 'dsa')).toThrow();
	});

	it('should throw 403 for wrong role', async () => {
		const { requireRole } = await import('$lib/server/guards');
		const locals = rmLocals();
		expect(() => requireRole(locals, 'dsa')).toThrow();
	});

	it('should not throw for correct role', async () => {
		const { requireRole } = await import('$lib/server/guards');
		const locals = dsaLocals();
		expect(() => requireRole(locals, 'dsa')).not.toThrow();
	});

	it('should not throw for admin (bypasses all)', async () => {
		const { requireRole } = await import('$lib/server/guards');
		const locals = adminLocals();
		expect(() => requireRole(locals, 'dsa')).not.toThrow();
		expect(() => requireRole(locals, 'rm')).not.toThrow();
	});

	it('should accept array of roles', async () => {
		const { requireRole } = await import('$lib/server/guards');
		const locals = rmLocals();
		expect(() => requireRole(locals, ['dsa', 'rm'])).not.toThrow();
	});
});

describe('Guard Logic — blockDemoWrite', () => {
	it('should return mock success for demo user', async () => {
		const { blockDemoWrite } = await import('$lib/server/guards');
		const locals = demoLocals();
		const result = blockDemoWrite(locals);
		expect(result).not.toBeNull();
		expect(result!.status).toBe(200);
		const body = await result!.json();
		expect(body.success).toBe(true);
		expect(body.message).toContain('Demo mode');
	});

	it('should return null for regular user', async () => {
		const { blockDemoWrite } = await import('$lib/server/guards');
		const locals = dsaLocals();
		const result = blockDemoWrite(locals);
		expect(result).toBeNull();
	});

	it('should return null for unauthenticated user', async () => {
		const { blockDemoWrite } = await import('$lib/server/guards');
		const locals = noAuthLocals();
		const result = blockDemoWrite(locals);
		expect(result).toBeNull();
	});
});

// ============================================================================
// ROLE ISOLATION TESTS
// ============================================================================

describe('Role Isolation', () => {
	it('DSA should not access admin features', async () => {
		const { roleHasPermission } = await import('$lib/config/permissions');
		expect(roleHasPermission('dsa', 'admin.dashboard')).toBe(false);
		expect(roleHasPermission('dsa', 'admin.users')).toBe(false);
		expect(roleHasPermission('dsa', 'cases.view_all')).toBe(false);
	});

	it('RM should not access DSA form features', async () => {
		const { roleHasPermission } = await import('$lib/config/permissions');
		expect(roleHasPermission('rm', 'form.create')).toBe(false);
		expect(roleHasPermission('rm', 'files.upload')).toBe(false);
		expect(roleHasPermission('rm', 'share_link.create')).toBe(false);
	});

	it('User role should be minimal', async () => {
		const { roleHasPermission } = await import('$lib/config/permissions');
		expect(roleHasPermission('user', 'profile.view')).toBe(true);
		expect(roleHasPermission('user', 'profile.edit')).toBe(true);
		expect(roleHasPermission('user', 'cases.create')).toBe(false);
		expect(roleHasPermission('user', 'admin.dashboard')).toBe(false);
	});

	it('All roles should have profile permissions', async () => {
		const { roleHasPermission } = await import('$lib/config/permissions');
		for (const role of ['dsa', 'rm', 'admin', 'user']) {
			expect(roleHasPermission(role, 'profile.view')).toBe(true);
			expect(roleHasPermission(role, 'profile.edit')).toBe(true);
		}
	});
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe('Edge Cases', () => {
	it('requireRoleApi should handle user with no role gracefully', async () => {
		const { requireRoleApi } = await import('$lib/server/guards');
		const locals = createLocals({
			user: {
				id: 'user-1',
				name: 'No Role User',
				mobileNumber: '1234567890',
				role: 'user'
			},
			role: ''
		});
		// Empty role should be treated as 'user' and fail DSA check
		const result = requireRoleApi(locals, 'dsa');
		expect(result).not.toBeNull();
		expect(result!.status).toBe(403);
	});

	it('requireRoleApi with single string should work like array with one element', async () => {
		const { requireRoleApi } = await import('$lib/server/guards');
		const locals = dsaLocals();
		expect(requireRoleApi(locals, 'dsa')).toBeNull();
		expect(requireRoleApi(locals, ['dsa'])).toBeNull();
	});

	it('requireRoleApi error message should include required role', async () => {
		const { requireRoleApi } = await import('$lib/server/guards');
		const locals = dsaLocals();
		const result = requireRoleApi(locals, 'rm');
		expect(result).not.toBeNull();
		const body = await result!.json();
		expect(body.error).toContain('rm');
	});

	it('requireRoleApi error message should join multiple roles', async () => {
		const { requireRoleApi } = await import('$lib/server/guards');
		const locals = dsaLocals();
		const result = requireRoleApi(locals, ['rm', 'admin']);
		expect(result).not.toBeNull();
		const body = await result!.json();
		expect(body.error).toContain('rm');
		expect(body.error).toContain('admin');
	});
});
