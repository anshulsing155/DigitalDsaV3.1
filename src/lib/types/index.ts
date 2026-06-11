// Database Types
import type { ObjectId } from 'mongodb';

export type AccountStatus = 'active' | 'inactive' | 'deleted';

// ── User Preferences ────────────────────────────────────
export interface UserThemePreferences {
	theme_mode?: 'light' | 'dark' | 'system';
	color_scheme?: 'bronze' | 'ocean' | 'forest' | 'slate' | 'rose' | 'amber';
}

// ── Multi-role boolean system ────────────────────────────────────
// Each user can have multiple roles simultaneously.
// All default to false; set to true when onboarding for that role completes.
export interface UserRoles {
	user: boolean;
	dsa: boolean;
	rm: boolean;
	propertyConsultant: boolean;
	admin: boolean;
}

export const DEFAULT_ROLES: UserRoles = {
	user: false,
	dsa: false,
	rm: false,
	propertyConsultant: false,
	admin: false
};

export interface User {
	_id?: ObjectId;
	name?: string;
	email?: string;
	gender?: string;
	mobileNumber: number;
	occupation?: string;
	city?: string;
	age?: number;

	// ── Role system ──
	role?: 'admin' | 'user' | 'dsa' | 'rm' | 'property-consultant' | string; // Legacy
	roles?: UserRoles; // New multi-role booleans
	activeRole?: string; // Which dashboard they're currently using

	onboardingCompleted?: boolean;
	isEmailVerified?: boolean;
	emailOtp?: string;
	emailOtpExpiry?: Date;
	accountStatus?: AccountStatus;
	lastActiveAt?: Date;
	deletedAt?: Date;
	activeTokenId?: string; // Legacy — single-device enforcement
	activeTokenIds?: string[]; // Multi-browser: array of valid token IDs
	deviceClassHash?: string; // Hardware-only fingerprint for device enforcement
	refreshToken?: string;
	refreshTokenExpiry?: Date;
	Applications?: any[];
	usedCoins?: number;
	availableCoins?: number;
	createdAt?: Date;
	updatedAt?: Date;
}

// dsa types start here
export type DsaType = 'own' | 'corporate' | 'referred';

export interface OwnDetails {
	dsaCode: string;
	officialEmail: string;
}

export interface CorporateDetails {
	companyNames: string[];
}

export interface ReferredDetails {
	refName: string;
	refMobile: string;
	refDsaCode?: string;
}

export interface RmDetails {
	dsaType: DsaType[];
	own?: OwnDetails;
	corporate?: CorporateDetails;
	referred?: ReferredDetails;
}

export interface ImageDetails {
	file: File | null;
	url: string;
	previewUrl: string;
	photoError: string;
	photoUploading: boolean;
}

/**
 * F.3 — UTM first-touch attribution captured at signup. Set once when
 * the DSA's first visit (or any subsequent visit-before-signup) carried
 * UTM params. Absent for organic / direct signups (those fall through
 * to source='direct' for the admin acquisition report).
 */
export interface DsaAttribution {
	utm_source?: string;
	utm_medium?: string;
	utm_campaign?: string;
	utm_content?: string;
	utm_term?: string;
	landing_page?: string;
	first_seen_at: Date;
}

export interface Dsa {
	_id?: ObjectId;
	name: string;
	email: string;
	gender: string;
	age: number;
	mobileNumber: number;
	role?: 'dsa' | string;
	isEmailVerified?: boolean;
	emailOtp?: string;
	onboardingCompleted: boolean;
	emailOtpExpiry?: Date;
	accountStatus?: AccountStatus;
	lastActiveAt?: Date;
	deletedAt?: Date;
	/**
	 * Set by the SES bounce/complaint SNS webhook when AWS reports a permanent
	 * bounce or complaint against this user's email. sendEmail() skips
	 * subsequent sends to suppressed addresses. Operators can manually flip
	 * back to 'active' after confirming the user fixed the underlying issue.
	 * 'soft_bounce' is reserved for transient failures (currently unused).
	 */
	email_status?: 'active' | 'suppressed_bounce' | 'suppressed_complaint' | 'soft_bounce';
	/** Timestamp of the most recent bounce/complaint event (set with email_status). */
	email_suppressed_at?: Date;

	// ── New simplified fields ───────────────────────
	hasDirectDsaCode?: boolean;
	lenderName?: string;
	dsaCode?: string;
	panNumber?: string;
	workingCity?: string;
	gstNumber?: string;

	/**
	 * F.3 — first-touch UTM attribution captured at signup. Absent for
	 * organic / direct signups (admin acquisition report treats absence
	 * as source='direct'). See DsaAttribution above + UTM_COOKIE_NAME
	 * in src/lib/server/attribution/utm.ts.
	 */
	attribution?: DsaAttribution;

	/**
	 * F.1 — Unique 8-char referral code minted at signup. Used as the
	 * /r/<code> public link and as the lookup key in the Referrals
	 * collection. Format: [A-Z2-9]{8} (lookalike-free charset).
	 */
	referral_code?: string;

	/**
	 * F.1 — The referral code that brought this DSA in (if any). Absent
	 * for organic / direct signups. Drives the reward credit on first
	 * paid subscription.
	 */
	referred_by?: string;

	// ── Legacy fields (optional for backward compat) ──
	businessType?: string;
	state?: string;
	city?: string;
	citySegment?: string;
	loanTypes?: string[];
	bankList?: string[];
	rmDetails?: RmDetails;
	imageDetails?: ImageDetails;

	// ── Preferences ──
	preferred_language?: string;
	preferences?: UserThemePreferences;

	// ── Team ownership ──
	team_owner_id?: ObjectId; // If sub-DSA, points to Main DSA's _id
	is_team_owner?: boolean; // true if has created a team

	// ── Subscription & Feature Flags ──
	subscription?: {
		plan: 'basic' | 'pro' | 'enterprise';
		status: 'trial' | 'active' | 'expired' | 'cancelled';
		started_at: Date;
		expires_at: Date;
		trial_ends_at?: Date;
		razorpay_payment_id?: string;
		case_limit: number;
		/** @deprecated Use plan instead */
		tier?: 'free' | 'pro' | 'enterprise';
	};
	feature_flags?: Record<string, boolean>;

	activeTokenId?: string; // Legacy — single-device enforcement
	activeTokenIds?: string[]; // Multi-browser: array of valid token IDs
	deviceClassHash?: string; // Hardware-only fingerprint for device enforcement
	refreshToken?: string;
	refreshTokenExpiry?: Date;
	Applications?: any[];
	usedCoins: number;
	availableCoins: number;
	createdAt: Date;
	updatedAt?: Date;
}

// dsa types ends here

// rm types start here
export interface Rm {
	_id?: ObjectId;
	name: string;
	email: string;
	gender: string;
	age: number;
	mobileNumber: number;
	role?: 'rm' | string;
	isEmailVerified?: boolean;
	emailOtp?: string;
	onboardingCompleted: boolean;
	emailOtpExpiry?: Date;
	accountStatus?: AccountStatus;
	lastActiveAt?: Date;
	deletedAt?: Date;
	/**
	 * Set by the SES bounce/complaint SNS webhook when AWS reports a permanent
	 * bounce or complaint against this user's email. sendEmail() skips
	 * subsequent sends to suppressed addresses. Operators can manually flip
	 * back to 'active' after confirming the user fixed the underlying issue.
	 * 'soft_bounce' is reserved for transient failures (currently unused).
	 */
	email_status?: 'active' | 'suppressed_bounce' | 'suppressed_complaint' | 'soft_bounce';
	/** Timestamp of the most recent bounce/complaint event (set with email_status). */
	email_suppressed_at?: Date;

	// ── New simplified fields ───────────────────────
	rmOfficialEmail?: string;
	workingCity?: string;

	// ── Profile provisioning (A.1 — auto-provision + complete-profile flow) ──
	// `profileStatus` tracks the lifecycle of an auto-provisioned RM doc:
	// 'profile_incomplete' = stub created by a role grant (set-role) or lazy
	// Settings-load fallback; 'active' = the RM filled the complete-profile form.
	// `provisioned_by` records how the doc came to exist (audit/provenance).
	profileStatus?: 'profile_incomplete' | 'active';
	provisioned_by?: 'auto_role_grant' | 'partner_signup' | 'admin_proxy';

	// ── Preferences ──
	preferred_language?: string;
	preferences?: UserThemePreferences;

	// ── RM Portal expansion (Phase 6) ──
	email_verified_at?: Date;
	email_verification_failures?: number;
	preferred_dsa_ids?: ObjectId[];

	// ── Legacy fields (optional for backward compat) ──
	referralCode?: string;
	bankName?: string;
	branchCode?: string;
	RMCode?: string;
	designation?: string;
	experience?: number;
	loanTypes?: string[];
	state?: string;
	city?: string;
	citySegment?: string;
	panNumber?: string;
	aadhaarNumber?: string;
	imageDetails?: ImageDetails;

	activeTokenId?: string; // Legacy — single-device enforcement
	activeTokenIds?: string[]; // Multi-browser: array of valid token IDs
	deviceClassHash?: string; // Hardware-only fingerprint for device enforcement
	refreshToken?: string;
	refreshTokenExpiry?: Date;
	Applications?: any[];
	usedCoins: number;
	availableCoins: number;
	createdAt: Date;
	updatedAt?: Date;
}

// property-consultant types
export interface PropertyConsultant {
	_id?: ObjectId;
	name: string;
	email: string;
	mobileNumber: number;
	role?: 'property-consultant' | string;
	onboardingCompleted: boolean;
	isEmailVerified?: boolean;
	accountStatus?: AccountStatus;
	lastActiveAt?: Date;
	deletedAt?: Date;
	reraNumber?: string;
	workingCity: string;
	refreshToken?: string;
	refreshTokenExpiry?: Date;
	usedCoins: number;
	availableCoins: number;
	createdAt: Date;
	updatedAt?: Date;
}

// API Response Types
export interface ApiResponse<T = any> {
	success: boolean;
	message?: string;
	error?: string;
	data?: T;
}

export interface AuthResponse extends ApiResponse {
	user?: {
		id: string;
		name: string;
		email: string;
		mobileNumber: number;
		gender: string;
		occupation: string;
		isEmailVerified?: boolean;
	};
	accessToken?: string;
	refreshToken?: string;
}

// JWT Types
export interface JWTPayload {
	userId: string;
	email: string;
	// SEC-2 (M1): widened to string | number. CSFLE deterministic
	// encryption is type-sensitive — mobile is stored as a STRING in
	// the DB (see encryptUserPii). The JWT claim must round-trip the
	// same type, otherwise locals.user.mobileNumber === doc.mobileNumber
	// silently fails across the encryption boundary. Existing callers
	// that still pass a number continue to work; new auth routes pass
	// strings. Treat as `string | number` and coerce at use site
	// (most consumers already do String(...) or $in [v, Number(v)]).
	mobileNumber: string | number;
	role: string;
	name: string;
	isDemo?: boolean;
	/**
	 * E.2 — when set on an admin's access token, the session is
	 * "OTP-verified but 2FA-pending". hooks.server.ts gates such sessions
	 * to /admin/2fa + /api/admin/2fa/verify only. /api/admin/2fa/verify
	 * re-issues the access token WITHOUT this claim once the TOTP code
	 * (or recovery code) verifies, promoting the session to full admin
	 * access.
	 */
	tfa_pending?: boolean;
	iat?: number;
	exp?: number;
}

export interface RefreshTokenPayload {
	userId: string;
	tokenId: string;
	iat?: number;
	exp?: number;
}

export interface TokenPair {
	accessToken: string;
	refreshToken: string;
}

export interface JWTValidationResult {
	valid: boolean;
	payload?: JWTPayload;
	error?: string;
}

export interface OtpResponse extends ApiResponse {
	reqId?: string;
	otpSent?: boolean;
}

// Form Types
export interface LoginFormData {
	mobileNumber: string;
	otpCode?: string;
}

export interface EmailOtpData {
	email: string;
	otp: string;
	expiresAt: Date;
}

// Store Types
export interface ApplicationData {
	allApplicantDetails: any[];
	allExistingApplicantDetails: any[];
	approvedBankForSelectedByUser: any[];
	LoanName?: string;
	LoanType?: string;
	typeOfROI?: string;
}

export interface ToastMessage {
	id: number;
	type: 'success' | 'error' | 'warning' | 'info';
	message: string;
	duration?: number;
}

export interface SessionData {
	id: string;
	name: string;
	mobileNumber: number;
	email: string;
	gender: string;
	occupation?: string;
}

// Location Types
export interface LocationData {
	country: string;
	region: string;
	city: string;
	coordinates?: {
		latitude: number;
		longitude: number;
	} | null;
}

export interface LocationResponse extends ApiResponse {
	location: LocationData;
	timestamp: string;
}
