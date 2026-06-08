import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { rmApplications } from '$lib/database/mongo.js';
import { generateTokenPair } from '$lib/services/jwtService';
import { professionalBaseSchema } from '$lib/schemas/onboarding/commonSchema.js';
import { rmStep2Schema } from '$lib/schemas/onboarding/rmStep2Schema.js';
import { seedRMSampleData } from '$lib/server/rmSampleDataSeeder.js';
import { getLenderNameFromDomain } from '$lib/config/lenderDomains.js';
import { blockDemoWrite } from '$lib/server/guards.js';
import logger from '$lib/server/logger.js';
import { parseJsonBody, apiError, apiValidationError } from '$lib/server/apiResponse.js';
import { REFRESH_COOKIE_MAX_AGE, ACCESS_COOKIE_MAX_AGE } from '$lib/server/sessionConstants.js';
import {
	findUserByMobile,
	decryptUserPii,
	encryptUserPii
} from '$lib/server/csfle/index.js';

export const POST: RequestHandler = async ({ request, locals, cookies }) => {
	const demoBlocked = blockDemoWrite(locals);
	if (demoBlocked) return demoBlocked;

	const isProd = import.meta.env.PROD;
	const mobile = locals.verifiedMobile || cookies.get('verifiedMobile');

	if (!mobile) {
		throw error(401, 'Unauthorized. Please login again.');
	}

	const parsed = await parseJsonBody<{ onboardingData: Record<string, any> }>(request);
	if (!parsed.ok) return parsed.response;
	const { onboardingData } = parsed.data;
	const mobileNumber = Number(mobile);

	if (isNaN(mobileNumber) || String(mobileNumber).length < 10) {
		return apiError('Invalid mobile number', 400);
	}

	// Server-side validation: basic fields
	const baseResult = professionalBaseSchema.safeParse({
		name: onboardingData.name?.trim() ?? '',
		age: onboardingData.age ? Number(onboardingData.age) : undefined,
		gender: onboardingData.gender ?? '',
		email: onboardingData.email?.trim().toLowerCase() ?? ''
	});

	if (!baseResult.success) {
		const errors: Record<string, string> = {};
		for (const issue of baseResult.error.issues) {
			const key = issue.path[0] as string;
			if (!errors[key]) errors[key] = issue.message;
		}
		return apiValidationError('Validation failed', errors);
	}

	// Server-side validation: RM-specific fields
	const rmData = onboardingData.rm ?? {};
	const rmResult = rmStep2Schema.safeParse({
		officialEmail: rmData.officialEmail?.trim().toLowerCase() ?? '',
		workingCity: rmData.workingCity?.trim() ?? ''
	});

	if (!rmResult.success) {
		const errors: Record<string, string> = {};
		for (const issue of rmResult.error.issues) {
			const key = issue.path[0] as string;
			if (!errors[key]) errors[key] = issue.message;
		}
		return apiValidationError('Validation failed', errors);
	}

	const validBase = baseResult.data;
	const validRm = rmResult.data;
	const derivedBankName = getLenderNameFromDomain(validRm.officialEmail) || '';

	// SEC-2: encrypted-first lookup, decrypt for downstream reads
	const existingRaw = await findUserByMobile(rmApplications, mobileNumber);
	const existing = await decryptUserPii(existingRaw);

	if (existing) {
		const updateFields = {
			name: validBase.name,
			email: validBase.email || existing.email,
			gender: validBase.gender,
			officialEmail: validRm.officialEmail,
			rmOfficialEmail: validRm.officialEmail,
			bankName: derivedBankName,
			workingCity: validRm.workingCity,
			onboardingCompleted: true,
			role: 'rm' as const,
			updatedAt: new Date()
		};
		// SEC-2: encrypt PII before $set, update by _id (encrypted-mobile
		// query filter wouldn't match once mobile is ciphertext).
		const encryptedUpdate = await encryptUserPii(updateFields);
		await rmApplications.updateOne({ _id: existing._id }, { $set: encryptedUpdate });

		// Seed sample data (non-blocking — errors are logged, not thrown)
		try {
			await seedRMSampleData(existing._id, validBase.name, derivedBankName);
		} catch (e) {
			logger.error({ err: e }, 'RM sample data seeding error');
		}

		const tokenId = crypto.randomUUID();
		const { accessToken, refreshToken } = generateTokenPair(
			existing._id.toString(),
			(existing.email as string) ?? '',
			existing.mobileNumber as number,
			(existing.name as string) ?? '',
			tokenId
		);

		// Store refresh token + activeTokenId
		const refreshTokenExpiry = new Date();
		refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 30);
		await rmApplications.updateOne(
			{ _id: existing._id },
			{ $set: { refreshToken, refreshTokenExpiry, activeTokenId: tokenId, updatedAt: new Date() } }
		);

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

		cookies.set('activeRole', 'rm', {
			httpOnly: false, // Client-side JS reads this for role-switching UI
			path: '/',
			maxAge: REFRESH_COOKIE_MAX_AGE,
			secure: isProd,
			sameSite: 'lax'
		});

		cookies.delete('verifiedMobile', { path: '/' });
		cookies.delete('role', { path: '/' });

		return json({ success: true, redirect: '/dashboard/rm' });
	}

	// New RM application
	const newApplication = {
		name: validBase.name,
		email: validBase.email || '',
		mobileNumber,
		gender: validBase.gender,
		age: validBase.age,
		officialEmail: validRm.officialEmail,
		rmOfficialEmail: validRm.officialEmail,
		bankName: derivedBankName,
		workingCity: validRm.workingCity,
		role: 'rm',
		onboardingCompleted: true,
		accountStatus: 'active' as const,
		lastActiveAt: new Date(),
		usedCoins: 0,
		availableCoins: 0,
		createdAt: new Date()
	};

	// SEC-2: encrypt PII before insert; keep `newApplication` plaintext
	// for the JWT payload + sampleDataSeeder calls below.
	const encryptedNewApplication = await encryptUserPii(newApplication);
	const result = await rmApplications.insertOne(encryptedNewApplication);

	// Seed sample data (non-blocking — errors are logged, not thrown)
	try {
		await seedRMSampleData(result.insertedId, validBase.name, derivedBankName);
	} catch (e) {
		logger.error({ err: e }, 'RM sample data seeding error');
	}

	const tokenId = crypto.randomUUID();
	const { accessToken, refreshToken } = generateTokenPair(
		result.insertedId.toString(),
		newApplication.email ?? '',
		Number(newApplication.mobileNumber),
		newApplication.name,
		tokenId
	);

	// Store refresh token + activeTokenId
	const refreshTokenExpiry = new Date();
	refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 30);
	await rmApplications.updateOne(
		{ _id: result.insertedId },
		{ $set: { refreshToken, refreshTokenExpiry, activeTokenId: tokenId, updatedAt: new Date() } }
	);

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

	cookies.set('activeRole', 'rm', {
		httpOnly: false, // Client-side JS reads this for role-switching UI
		path: '/',
		maxAge: REFRESH_COOKIE_MAX_AGE,
		secure: isProd,
		sameSite: 'lax'
	});

	cookies.delete('verifiedMobile', { path: '/' });
	cookies.delete('role', { path: '/' });

	return json({ success: true, redirect: '/dashboard/rm' });
};
