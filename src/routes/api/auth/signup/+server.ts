import { Applicant } from '$lib/database/mongo.js';
import type { RequestHandler } from '@sveltejs/kit';
import { DEFAULT_ROLES } from '$lib/types/index.js';
import { generateTokenPair, generateTokenId } from '$lib/services/jwtService.js';
import { dev } from '$app/environment';
import { encryptUserPii, findUserByMobile, encryptMobileForQuery } from '$lib/server/csfle/index.js';
import {
	REFRESH_COOKIE_MAX_AGE,
	ACCESS_COOKIE_MAX_AGE,
	REFRESH_TOKEN_DAYS
} from '$lib/server/sessionConstants.js';
import {
	apiOk,
	apiError,
	apiServerError,
	apiValidationError,
	parseJsonBody
} from '$lib/server/apiResponse.js';
import { isNativePlatform } from '$lib/server/platformDetection.js';
import { rateLimit } from '$lib/server/rateLimiter.js';
import { z } from 'zod';

// DX-2: Zod schema replaces the inline empty + regex checks. Indian
// mobile numbers are 10 digits starting with 6, 7, 8, or 9 — the
// /^[6-9]\d{9}$/ pattern matched the pre-Zod code exactly.
const postRequestSchema = z.object({
	mobileNumber: z
		.union([z.string(), z.number()])
		.transform((v) => String(v))
		.pipe(z.string().regex(/^[6-9]\d{9}$/, 'Must be a valid 10-digit Indian mobile number'))
});

/**
 * POST /api/auth/signup
 * ═══════════════════════════════════════════════════════════════
 * Creates a bare Applicant record with just the mobile number.
 * All role booleans default to false.
 * Personal details (name, email, etc.) are collected during onboarding.
 *
 * Called when detect-roles finds no existing profile for a mobile number.
 * ═══════════════════════════════════════════════════════════════
 */
export const POST: RequestHandler = async ({ request, cookies, getClientAddress }) => {
	// SEC-4: rate-limit account creation by IP. 5/min/IP is tight enough to
	// block bot signup floods while leaving room for a real user retrying.
	const isLimited = await rateLimit(getClientAddress(), {
		identifier: `auth-signup:${getClientAddress()}`,
		maxRequests: 5,
		windowMs: 60_000
	});
	if (isLimited) {
		return apiError('Too many signup attempts. Please wait before trying again.', 429);
	}

	const parsed = await parseJsonBody<Record<string, unknown>>(request);
	if (!parsed.ok) return parsed.response;

	const validated = postRequestSchema.safeParse(parsed.data);
	if (!validated.success) {
		return apiValidationError('Invalid request body', validated.error.flatten());
	}
	const mobileStr = validated.data.mobileNumber;

	try {
		// SEC-2: dual-query handles encrypted (new) + plaintext (legacy) rows.
		// When CSFLE is disabled, this falls through to the legacy plaintext
		// dual-query — same behavior as before.
		const existingUser = await findUserByMobile(Applicant, mobileStr);

		if (existingUser) {
			return apiError('User with this mobile number already exists', 409);
		}

		// SEC-2: encrypt PII before insert. When CSFLE is disabled,
		// encryptUserPii passes through unchanged.
		// Normalize mobile to string at the encryption boundary — CSFLE
		// deterministic mode is type-sensitive, so we standardize storage.
		const encryptedDoc = await encryptUserPii({
			mobileNumber: mobileStr,
			roles: { ...DEFAULT_ROLES },
			onboardingCompleted: false,
			accountStatus: 'active',
			lastActiveAt: new Date(),
			usedCoins: 0,
			availableCoins: 10,
			createdAt: new Date(),
			updatedAt: new Date()
		});

		const result = await Applicant.insertOne(encryptedDoc as any);

		if (!result.acknowledged) {
			return apiError('Failed to create account. Please try again.', 500);
		}

		// Generate JWT tokens
		const tokenId = generateTokenId();
		// SEC-2 (M1): pass the STRING form to match the DB-stored mobile
		// shape under CSFLE deterministic encryption. Downstream code
		// reading locals.user.mobileNumber must compare against the
		// decrypted DB value, which is also a string. Previously this
		// passed Number(mobileStr) and silently broke strict equality.
		const tokens = generateTokenPair(
			result.insertedId.toString(),
			'', // No email yet
			mobileStr,
			'', // No name yet
			tokenId
		);

		// Store refresh token in DB
		const refreshTokenExpiry = new Date();
		refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + REFRESH_TOKEN_DAYS);

		await Applicant.updateOne(
			{ _id: result.insertedId },
			{
				$set: {
					refreshToken: tokens.refreshToken,
					refreshTokenExpiry,
					activeTokenId: tokenId,
					updatedAt: new Date()
				}
			}
		);

		// Set httpOnly cookies
		cookies.set('accessToken', tokens.accessToken, {
			httpOnly: true,
			path: '/',
			maxAge: ACCESS_COOKIE_MAX_AGE,
			secure: !dev,
			sameSite: 'lax'
		});

		cookies.set('refreshToken', tokens.refreshToken, {
			httpOnly: true,
			path: '/',
			maxAge: REFRESH_COOKIE_MAX_AGE,
			secure: !dev,
			sameSite: 'lax'
		});

		// PB-3: Tokens transported via httpOnly cookies only (set above).
		// NOTE: Native platforms (Capacitor) get tokens in response body — WebView
		// cannot reliably read httpOnly cookies from SvelteKit responses.
		const nativeTokens = isNativePlatform(request)
			? { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }
			: {};

		// SEC-2 (M1): return the STRING form so the wire-shape matches
		// what gets stored in the DB and embedded in the JWT claim.
		// Consumers that previously read this as a number must coerce —
		// search confirmed no consumer of the signup response does
		// arithmetic on mobileNumber (all uses are display or pass-through).
		//
		// DX-4: migrated from raw json() to apiOk(). Native tokens moved
		// inside data — consumers only check signupResponse.ok and read
		// error on failure, so this is wire-safe.
		return apiOk({
			message: 'Account created! Please complete your profile.',
			userId: result.insertedId.toString(),
			mobileNumber: mobileStr,
			roles: { ...DEFAULT_ROLES },
			requiresOnboarding: true,
			...nativeTokens
		}, 201);
	} catch (error) {
		return apiServerError(error, 'Something went wrong. Please try again.');
	}
};
