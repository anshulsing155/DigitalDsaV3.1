/**
 * Admin User Type Definitions
 * ══════════════════════════════════════════════════════════════════
 * Dedicated admin user accounts stored in the `adminUsers` collection.
 * Independent from DSA/RM accounts — admin need not be a DSA or RM.
 * Auth uses the same phone + OTP flow as DSA/RM.
 * ══════════════════════════════════════════════════════════════════
 */

import type { ObjectId } from 'mongodb';

// ── Admin Permissions ──────────────────────────────────────────────

export interface AdminPermissions {
	/** Can view/suspend/unsuspend DSA and RM accounts */
	user_management: boolean;
	/** Can upload policies, run AI parse pipeline, approve/publish rules */
	rule_authoring: boolean;
	/** Can view/modify system settings, API key status */
	system_settings: boolean;
	/** Can view QA scenarios and run results */
	qa_view: boolean;
	/** Can save, edit, clone, and archive QA scenarios */
	qa_write: boolean;
	/** Can trigger scenario runs against the rule engine */
	qa_run: boolean;
}

// ── Admin User Document ────────────────────────────────────────────

export interface AdminUser {
	_id: ObjectId;
	name: string;
	mobileNumber: number;
	email?: string;
	permissions: AdminPermissions;
	/** Super admins can manage other admin accounts + promote/demote */
	is_super_admin?: boolean;
	is_active: boolean;
	last_login?: Date;
	lastActiveAt?: Date;
	/** Multi-device JWT tracking — same pattern as DSA/RM */
	activeTokenIds?: string[];
	created_at: Date;
	updated_at: Date;
	/**
	 * E.2 — TOTP-based second factor. Optional (voluntary v1 per owner
	 * decision 2026-05-30). When `enabled: true`, the login flow gates
	 * the admin's session behind a /admin/2fa verify step after OTP.
	 *
	 * Storage: `secret` is written via CSFLE-aware encryptValue helpers,
	 * so it's ciphertext when CSFLE_ENABLED is on (post SEC-2 rollout)
	 * and plaintext today. Recovery codes are SHA-256 hashed at rest —
	 * stored as the hex digest, single-use; verifying a code removes it
	 * from the array. Tracking failed attempts in-doc means rate-limit
	 * survives Vercel cold-starts (vs in-memory which doesn't).
	 */
	twofa?: AdminTwoFa;
}

/**
 * Embedded 2FA sub-document on AdminUser. Absent = never enrolled.
 * `enabled: false` with a secret = enrollment in progress (secret created
 * by /enroll but not yet confirmed via /confirm).
 */
export interface AdminTwoFa {
	/** True once /confirm verified the first TOTP code. Drives the login gate. */
	enabled: boolean;
	/** Base32 TOTP secret. Written via CSFLE encryptValue (passthrough today). */
	secret: string;
	/**
	 * SHA-256 hex digests of one-time recovery codes. Single-use: verifying
	 * a code removes its hash from this array. Issued ONCE on /confirm,
	 * shown to the admin in that response only. 8 codes generated.
	 */
	recovery_code_hashes: string[];
	/** When the admin successfully completed /confirm. Absent during enrollment-in-progress. */
	enrolled_at?: Date;
	/**
	 * Timestamps of recent failed TOTP attempts (last 15 minutes worth).
	 * Lockout: ≥5 entries within the window blocks /verify until the
	 * window slides past. Pruned on every check (no growth concern).
	 */
	failed_attempts?: Date[];
}
