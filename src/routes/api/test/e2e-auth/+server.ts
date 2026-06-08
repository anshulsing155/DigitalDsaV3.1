/**
 * Dev-only E2E test authentication endpoint.
 *
 * Issues JWT access + refresh tokens for a test user so that
 * Playwright can access auth-protected routes.
 *
 * Supports multi-role auth:
 *  - { role: 'dsa' }   — Applicant + DsaApplications (default)
 *  - { role: 'rm' }    — rmApplications
 *  - { role: 'admin' } — AdminUsers (super admin, all permissions)
 *  - No role param     — backward compatible (same as 'dsa')
 *
 * This endpoint:
 *  1. Only works in dev mode (returns 404 in production)
 *  2. Creates/upserts the test user in MongoDB
 *  3. Returns httpOnly cookies — the same flow as real OTP login
 */
import { dev } from '$app/environment';
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { generateTokenPair } from '$lib/services/jwtService';
import { Applicant, DsaApplications, rmApplications, AdminUsers } from '$lib/database/mongo';
import { blockDemoWrite } from '$lib/server/guards.js';
import { REFRESH_COOKIE_MAX_AGE, ACCESS_COOKIE_MAX_AGE } from '$lib/server/sessionConstants.js';
import logger from '$lib/server/logger.js';
import { parseJsonBody } from '$lib/server/apiResponse.js';

// ── Test user definitions per role ──────────────────────────────
// C.7: every record stamps `is_test: true` so production-facing surfaces
// (admin Users table, lender dropdowns, etc.) can exclude them via the
// PROD_ENTITY_FILTER. The /api/test/e2e-auth endpoint itself is dev-only
// (404s in prod) but rows it has already created persist in the shared
// MongoDB — without the marker, those leak into prod UI.
const DSA_USER = {
	name: 'E2E Test User',
	email: 'e2e-test@digitaldsa.test',
	mobileNumber: 9999900000,
	gender: 'Male',
	occupation: 'Salaried',
	role: 'user',
	onboardingCompleted: true,
	usedCoins: 0,
	availableCoins: 500,
	is_test: true
};

const DSA_PROFILE = {
	mobileNumber: 9999900000,
	name: 'E2E Test User',
	email: 'e2e-test@digitaldsa.test',
	onboardingCompleted: true,
	business_profile: {
		team_size: 'solo',
		monthly_file_volume: '0-5',
		primary_loan_types: ['Home Loan'],
		empanelled_lenders: [{ lender_name: 'SBI', has_direct_code: false }],
		geography: { city: 'Delhi' },
		current_tools: ['excel'],
		has_website: false,
		lead_sources: ['self']
	}
};

const RM_USER = {
	name: 'E2E Test RM',
	email: 'e2e-rm@digitaldsa.test',
	mobileNumber: 9999900001,
	gender: 'Male',
	age: 35,
	role: 'rm',
	onboardingCompleted: true,
	bankName: 'Test Bank',
	workingCity: 'Delhi',
	usedCoins: 0,
	availableCoins: 500,
	is_test: true
};

const ADMIN_USER = {
	name: 'E2E Test Admin',
	email: 'e2e-admin@digitaldsa.test',
	mobileNumber: 9999900002,
	is_super_admin: true,
	is_active: true,
	is_test: true,
	permissions: {
		user_management: true,
		rule_authoring: true,
		system_settings: true,
		qa_view: true,
		qa_write: true,
		qa_run: true
	}
};

export const POST: RequestHandler = async ({ cookies, locals, request }) => {
	if (!dev) {
		throw error(404, 'Not found');
	}

	const demoBlocked = blockDemoWrite(locals);
	if (demoBlocked) return demoBlocked;

	const parsed = await parseJsonBody<{ role?: string }>(request);
	const body = parsed.ok ? parsed.data : {};

	const role = body.role || 'dsa';

	try {
		let userId: string;
		let email: string;
		let mobileNumber: number;
		let name: string;

		if (role === 'rm') {
			// ── RM user ──────────────────────────────────────────
			const tokenId = crypto.randomUUID();
			const existing = await rmApplications.findOne({ mobileNumber: RM_USER.mobileNumber });

			if (existing) {
				userId = existing._id!.toString();
				await rmApplications.updateOne(
					{ _id: existing._id },
					{
						$set: { ...RM_USER, updatedAt: new Date() },
						$push: { activeTokenIds: { $each: [tokenId], $slice: -10 } as any }
					}
				);
			} else {
				const result = await rmApplications.insertOne({
					...RM_USER,
					activeTokenIds: [tokenId],
					createdAt: new Date(),
					updatedAt: new Date()
				} as any);
				userId = result.insertedId.toString();
			}

			email = RM_USER.email;
			mobileNumber = RM_USER.mobileNumber;
			name = RM_USER.name;

			const { accessToken, refreshToken } = generateTokenPair(
				userId,
				email,
				mobileNumber,
				name,
				tokenId
			);

			setCookies(cookies, accessToken, refreshToken, 'rm');

			return json({
				success: true,
				user: { id: userId, name, email, mobileNumber, role: 'rm' }
			});
		} else if (role === 'admin') {
			// ── Admin user ───────────────────────────────────────
			const tokenId = crypto.randomUUID();
			const existing = await AdminUsers.findOne({ mobileNumber: ADMIN_USER.mobileNumber });

			if (existing) {
				userId = existing._id!.toString();
				await AdminUsers.updateOne(
					{ _id: existing._id },
					{
						$set: { ...ADMIN_USER, updated_at: new Date() },
						$push: { activeTokenIds: { $each: [tokenId], $slice: -10 } as any }
					}
				);
			} else {
				const result = await AdminUsers.insertOne({
					...ADMIN_USER,
					activeTokenIds: [tokenId],
					created_at: new Date(),
					updated_at: new Date()
				} as any);
				userId = result.insertedId.toString();
			}

			email = ADMIN_USER.email;
			mobileNumber = ADMIN_USER.mobileNumber;
			name = ADMIN_USER.name;

			const { accessToken, refreshToken } = generateTokenPair(
				userId,
				email,
				mobileNumber,
				name,
				tokenId
			);

			setCookies(cookies, accessToken, refreshToken, 'admin');

			return json({
				success: true,
				user: { id: userId, name, email, mobileNumber, role: 'admin' }
			});
		} else {
			// ── DSA user (default) ───────────────────────────────
			const tokenId = crypto.randomUUID();

			// 1. Upsert Applicant (backward compatible)
			let applicant = await Applicant.findOne({ mobileNumber: DSA_USER.mobileNumber });
			if (!applicant) {
				const insertResult = await Applicant.insertOne({
					...DSA_USER,
					createdAt: new Date(),
					updatedAt: new Date()
				});
				applicant = await Applicant.findOne({ _id: insertResult.insertedId });
			}

			// 2. Upsert DsaApplications (so dashboard works without extra onboarding step)
			const existingDsa = await DsaApplications.findOne({ mobileNumber: DSA_PROFILE.mobileNumber });
			if (existingDsa) {
				await DsaApplications.updateOne(
					{ _id: existingDsa._id },
					{
						$set: { updatedAt: new Date() },
						$push: { activeTokenIds: { $each: [tokenId], $slice: -10 } as any }
					}
				);
			} else {
				await DsaApplications.insertOne({
					...DSA_PROFILE,
					activeTokenIds: [tokenId],
					createdAt: new Date(),
					updatedAt: new Date()
				} as any);
			}

			if (!applicant) {
				throw error(500, 'Failed to create test user');
			}

			userId = applicant._id.toString();
			email = DSA_USER.email;
			mobileNumber = DSA_USER.mobileNumber;
			name = DSA_USER.name;

			const { accessToken, refreshToken } = generateTokenPair(
				userId,
				email,
				mobileNumber,
				name,
				tokenId
			);

			setCookies(cookies, accessToken, refreshToken, 'dsa');

			return json({
				success: true,
				user: { id: userId, name, email, mobileNumber, role: 'dsa' }
			});
		}
	} catch (err) {
		logger.error({ err }, 'E2E auth error');
		throw error(500, 'E2E authentication failed');
	}
};

function setCookies(
	cookies: Parameters<RequestHandler>[0]['cookies'],
	accessToken: string,
	refreshToken: string,
	role: string
) {
	cookies.set('accessToken', accessToken, {
		httpOnly: true,
		path: '/',
		maxAge: ACCESS_COOKIE_MAX_AGE,
		secure: !dev,
		sameSite: 'lax'
	});

	cookies.set('refreshToken', refreshToken, {
		httpOnly: true,
		path: '/',
		maxAge: REFRESH_COOKIE_MAX_AGE,
		secure: !dev,
		sameSite: 'lax'
	});

	cookies.set('activeRole', role, {
		httpOnly: false, // Client-side JS reads this for role-switching UI
		path: '/',
		maxAge: REFRESH_COOKIE_MAX_AGE,
		secure: !dev,
		sameSite: 'lax'
	});
}
