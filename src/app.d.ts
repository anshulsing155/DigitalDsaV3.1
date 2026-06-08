import type { UserRoles } from '$lib/types';
import type { TeamMemberPermissions } from '$lib/types/team';
import type { AdminPermissions } from '$lib/types/adminUser';

declare global {
	namespace App {
		interface Locals {
			user: {
				id: string;
				name: string;
				email?: string;
				mobileNumber: string;
				gender?: string;
				occupation?: string;
				role: 'admin' | 'user' | 'dsa' | 'rm' | 'property-consultant';
				roles?: UserRoles;
				activeRole?: string;
				onboardingCompleted?: boolean;
				teamContext?: {
					teamId: string;
					ownerDsaId: string;
					memberRole: string;
					permissions: TeamMemberPermissions;
					isOwner: boolean;
				};
				/**
				 * E.2 — admin OTP-verified but 2FA-not-yet-verified. Hooks
				 * gate blocks such sessions from anywhere except /admin/2fa
				 * + /api/admin/2fa/verify + /api/auth/logout. Promoted by
				 * /api/admin/2fa/verify which re-issues the access token
				 * without this claim.
				 */
				tfa_pending?: boolean;
			} | null;
			Application: any[];
			verifiedMobile?: number | null;
			role?: 'admin' | 'user' | 'dsa' | 'rm' | 'property-consultant' | null;
			csrfToken?: string;
			/** Admin permission flags (populated for admin users during auth) */
			adminPermissions?: AdminPermissions;
			/** Whether the current admin is a super admin */
			isSuperAdmin?: boolean;
			/** CSP nonce for inline script tags (production only) */
			cspNonce?: string;
			/** Set when an admin is impersonating an RM. Contains the real admin identity. */
			adminActingAs?: { id: string; name: string; email: string };
		}
	}
}

export {};
