import jwt from 'jsonwebtoken';
import { JWT_SECRET, JWT_REFRESH_SECRET } from '$env/static/private';
import type { JWTPayload, RefreshTokenPayload, TokenPair, JWTValidationResult } from '$lib/types';

// Token expiration times
const ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRY = '30d'; // 30 days

/**
 * Generate access token
 */
export function generateAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
	return jwt.sign(payload, JWT_SECRET, {
		expiresIn: ACCESS_TOKEN_EXPIRY,
		issuer: 'auth-system',
		audience: 'auth-client'
	});
}

/**
 * Generate refresh token
 */
export function generateRefreshToken(payload: Omit<RefreshTokenPayload, 'iat' | 'exp'>): string {
	return jwt.sign(payload, JWT_REFRESH_SECRET, {
		expiresIn: REFRESH_TOKEN_EXPIRY,
		issuer: 'auth-system',
		audience: 'auth-client'
	});
}

/**
 * Generate both access and refresh tokens
 */
export function generateTokenPair(
	userId: string,
	email: string,
	// SEC-2 (M1): widened to string | number to mirror JWTPayload.
	// CSFLE deterministic mode stores mobile as a STRING; passing a
	// number here would produce a token whose claim does not match the
	// DB shape after Phase C migration.
	mobileNumber: string | number,
	name: string,
	tokenId: string,
	/**
	 * E.2 — optional extra claims merged into the access token. Today
	 * only `tfa_pending` (for admin 2FA-not-yet-verified sessions) and
	 * `role` (which check-dsa already overrides via the JWT subject's
	 * cookie). Refresh token is intentionally NOT extended — re-issuing
	 * the access token via /admin/2fa/verify rotates the claim without
	 * needing a new refresh token.
	 */
	extraClaims?: { tfa_pending?: boolean; role?: string }
): TokenPair {
	const accessToken = generateAccessToken({
		userId,
		email,
		mobileNumber,
		name,
		role: extraClaims?.role ?? '',
		...(extraClaims?.tfa_pending && { tfa_pending: true })
	});

	const refreshToken = generateRefreshToken({
		userId,
		tokenId
	});

	return { accessToken, refreshToken };
}

/**
 * Verify access token
 */
export function verifyAccessToken(token: string): JWTValidationResult {
	try {
		const payload = jwt.verify(token, JWT_SECRET, {
			issuer: 'auth-system',
			audience: 'auth-client'
		}) as JWTPayload;

		return {
			valid: true,
			payload
		};
	} catch (error) {
		return {
			valid: false,
			error: error instanceof Error ? error.message : 'Invalid token'
		};
	}
}

/**
 * Verify refresh token
 */
export function verifyRefreshToken(token: string): {
	valid: boolean;
	payload?: RefreshTokenPayload;
	error?: string;
} {
	try {
		const payload = jwt.verify(token, JWT_REFRESH_SECRET, {
			issuer: 'auth-system',
			audience: 'auth-client'
		}) as RefreshTokenPayload;

		return {
			valid: true,
			payload
		};
	} catch (error) {
		return {
			valid: false,
			error: error instanceof Error ? error.message : 'Invalid refresh token'
		};
	}
}

/**
 * Decode token without verification (for debugging)
 */
export function decodeToken(token: string): any {
	try {
		return jwt.decode(token);
	} catch {
		return null;
	}
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token: string): boolean {
	try {
		const decoded = jwt.decode(token) as any;
		if (!decoded || !decoded.exp) return true;

		const currentTime = Math.floor(Date.now() / 1000);
		return decoded.exp < currentTime;
	} catch {
		return true;
	}
}

/**
 * Get token expiration time
 */
export function getTokenExpiration(token: string): Date | null {
	try {
		const decoded = jwt.decode(token) as any;
		if (!decoded || !decoded.exp) return null;

		return new Date(decoded.exp * 1000);
	} catch {
		return null;
	}
}

/**
 * Generate a unique token ID for refresh tokens.
 * Uses crypto.randomUUID() for cryptographically secure, unpredictable IDs.
 */
export function generateTokenId(): string {
	return crypto.randomUUID();
}

// ── Demo Mode ────────────────────────────────────────────────────

/** Fixed demo user ID — never changes, used to identify demo sessions */
export const DEMO_USER_ID = 'demo-guest';

/**
 * Generate a demo access token with 1h expiry (limited session).
 * Includes `isDemo: true` flag so hooks can skip DB lookup.
 */
export function generateDemoAccessToken(): string {
	return jwt.sign(
		{
			userId: DEMO_USER_ID,
			email: 'demo@digitaldsa.com',
			mobileNumber: 9999999999,
			name: 'Demo DSA Agent',
			role: 'dsa',
			isDemo: true
		},
		JWT_SECRET,
		{
			expiresIn: '1h',
			issuer: 'auth-system',
			audience: 'auth-client'
		}
	);
}

/**
 * Generate a demo refresh token (24h for demo, shorter than production).
 */
export function generateDemoRefreshToken(): string {
	return jwt.sign(
		{
			userId: DEMO_USER_ID,
			tokenId: 'demo-token-static'
		},
		JWT_REFRESH_SECRET,
		{
			expiresIn: '24h',
			issuer: 'auth-system',
			audience: 'auth-client'
		}
	);
}
