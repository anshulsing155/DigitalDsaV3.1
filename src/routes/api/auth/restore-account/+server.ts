/**
 * POST /api/auth/restore-account
 * Restores a previously deleted DSA account from the archive.
 * - Moves the archived DSA doc back to DsaApplications
 * - Also restores the archived Applicant doc from deletedUsers if it exists
 * - Generates fresh JWT tokens and sets auth cookies
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { Applicant, DsaApplications, deletedUsers, deletedDsa } from '$lib/database/mongo.js';
import { generateTokenPair, generateTokenId } from '$lib/services/jwtService.js';
import {
	REFRESH_COOKIE_MAX_AGE,
	ACCESS_COOKIE_MAX_AGE,
	REFRESH_TOKEN_DAYS
} from '$lib/server/sessionConstants.js';
import { apiError, apiServerError, parseJsonBody } from '$lib/server/apiResponse.js';
import { rateLimit } from '$lib/server/rateLimiter.js';
import {
	findUserByMobile,
	decryptUserPii,
	encryptUserPii
} from '$lib/server/csfle/index.js';

export const POST: RequestHandler = async ({ request, cookies, getClientAddress }) => {
	// Rate limit: 10 requests per 10 minutes per IP to prevent account enumeration
	const isLimited = await rateLimit(getClientAddress(), {
		maxRequests: 10,
		windowMs: 10 * 60 * 1000,
		identifier: `restore-account:${getClientAddress()}`
	});
	if (isLimited) {
		return apiError('Too many requests. Please try again later.', 429);
	}

	const parsed = await parseJsonBody<{ mobileNumber: string }>(request);
	if (!parsed.ok) return parsed.response;
	const { mobileNumber } = parsed.data;

	try {
		if (!mobileNumber) {
			return apiError('Mobile number is required');
		}

		const mobileStr = String(mobileNumber);
		if (!/^\d{10,15}$/.test(mobileStr)) {
			return apiError('Invalid mobile number format');
		}

		const mobileQuery = { mobileNumber: { $in: [mobileStr, Number(mobileStr)] } } as any;
		const isProd = import.meta.env.PROD;

		// 1. Find the most recently archived DSA doc.
		// Archives are not currently in the CSFLE registry — `deletedDsa`
		// rows are plaintext today. After we wire Phase B archive paths,
		// archived docs may carry encrypted PII fields; decryptUserPii
		// transparently handles both (passes through plaintext, decrypts
		// Binary subtype 6).
		const archivedDsaRaw = await deletedDsa.findOne(mobileQuery, { sort: { deletedAt: -1 } });
		const archivedDsa = await decryptUserPii(archivedDsaRaw);

		if (!archivedDsa) {
			return apiError('No archived account found', 404);
		}

		// 1b. Check 30-day recovery window
		const thirtyDaysAgo = new Date();
		thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
		if (archivedDsa.deletedAt && archivedDsa.deletedAt < thirtyDaysAgo) {
			return apiError('Recovery window has expired (30 days). Please register as a new user.', 410);
		}

		// 2. Remove archive metadata, restore to DsaApplications
		const {
			_id: archiveId,
			originalId,
			originalRole,
			deletedAt,
			deletedReason,
			...dsaData
		} = archivedDsa;

		// Check for collision — encrypted-first dual-query.
		const existingDsa = await findUserByMobile(DsaApplications, mobileStr);
		if (existingDsa) {
			return apiError('An active account already exists for this number', 409);
		}

		// Insert restored doc — re-encrypt PII fields on the way back into
		// the active collection (use originalId to preserve refs from cases).
		const restoredDsaId = originalId;
		const restoredDoc = await encryptUserPii({
			_id: restoredDsaId,
			...dsaData,
			accountStatus: 'active',
			lastActiveAt: new Date(),
			updatedAt: new Date()
		});
		await DsaApplications.insertOne(restoredDoc as any);

		// Remove from archive
		await deletedDsa.deleteOne({ _id: archiveId });

		// 3. Also restore the archived Applicant doc if it exists
		const archivedUserRaw = await deletedUsers.findOne(mobileQuery, { sort: { deletedAt: -1 } });
		const archivedUser = await decryptUserPii(archivedUserRaw);
		if (archivedUser) {
			const {
				_id: userArchiveId,
				originalId: userOriginalId,
				originalRole: _ur,
				deletedAt: _dt,
				deletedReason: _dr,
				...userData
			} = archivedUser as Record<string, unknown>;

			// Only restore if no active Applicant already exists
			const existingUser = await findUserByMobile(Applicant, mobileStr);
			if (!existingUser) {
				const restoredUser = await encryptUserPii({
					_id: userOriginalId,
					...userData,
					lastActiveAt: new Date()
				});
				await Applicant.insertOne(restoredUser as any);
			}
			await deletedUsers.deleteOne({ _id: userArchiveId as never });
		}

		// 4. Generate fresh JWT tokens
		const tokenId = generateTokenId();
		const { accessToken, refreshToken } = generateTokenPair(
			restoredDsaId.toString(),
			dsaData.email ?? '',
			Number(dsaData.mobileNumber),
			dsaData.name ?? '',
			tokenId
		);

		// Bug fix: store refresh token + activeTokenId in DB (was missing)
		const refreshTokenExpiry = new Date();
		refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + REFRESH_TOKEN_DAYS);
		await DsaApplications.updateOne(
			{ _id: restoredDsaId },
			{
				$set: {
					refreshToken,
					refreshTokenExpiry,
					activeTokenId: tokenId,
					updatedAt: new Date()
				}
			}
		);

		// 5. Set auth cookies
		cookies.set('accessToken', accessToken, {
			httpOnly: true,
			path: '/',
			maxAge: ACCESS_COOKIE_MAX_AGE,
			sameSite: 'lax',
			secure: isProd
		});

		cookies.set('refreshToken', refreshToken, {
			httpOnly: true,
			path: '/',
			maxAge: REFRESH_COOKIE_MAX_AGE,
			sameSite: 'lax',
			secure: isProd
		});

		cookies.set('activeRole', 'dsa', {
			httpOnly: false, // Client-side JS reads this for role-switching UI
			path: '/',
			maxAge: REFRESH_COOKIE_MAX_AGE,
			secure: isProd,
			sameSite: 'lax'
		});

		// Clean up transient cookies
		cookies.delete('verifiedMobile', { path: '/' });
		cookies.delete('role', { path: '/' });

		return json({
			success: true,
			redirect: '/dashboard/dsa',
			user: {
				name: dsaData.name ?? '',
				role: 'dsa'
			}
		});
	} catch (error) {
		return apiServerError(error, 'Failed to restore account. Please try again.');
	}
};
