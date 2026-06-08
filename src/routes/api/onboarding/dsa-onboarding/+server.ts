import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { DsaApplications } from '$lib/database/mongo.js';
import { generateTokenPair } from '$lib/services/jwtService';
import { ensureApplicantProfile } from '$lib/services/ensureApplicantProfile';
import { professionalBaseSchema } from '$lib/schemas/onboarding/commonSchema.js';
import { dsaStep2Schema } from '$lib/schemas/onboarding/dsaStep2Schema.js';
import { blockDemoWrite } from '$lib/server/guards.js';
import logger from '$lib/server/logger.js';
import { parseJsonBody, apiError, apiValidationError } from '$lib/server/apiResponse.js';
import { seedSampleData } from '$lib/server/sampleDataSeeder.js';
import { REFRESH_COOKIE_MAX_AGE, ACCESS_COOKIE_MAX_AGE } from '$lib/server/sessionConstants.js';
import {
	findUserByMobile,
	decryptUserPii,
	encryptUserPii
} from '$lib/server/csfle/index.js';
import {
	UTM_COOKIE_NAME,
	parseFromCookie,
	type UtmAttribution
} from '$lib/server/attribution/utm';
import { Referrals } from '$lib/database/mongo.js';
import {
	mintUniqueReferralCode,
	findReferrerByCode
} from '$lib/server/referrals/referralCode';
import { REFERRAL_COOKIE_NAME } from '$lib/types/referral';

export const POST: RequestHandler = async ({ request, locals, cookies }) => {
	const demoBlocked = blockDemoWrite(locals);
	if (demoBlocked) return demoBlocked;

	const isProd = import.meta.env.PROD;
	const mobile =
		locals.verifiedMobile ||
		cookies.get('verifiedMobile') ||
		(locals.user?.mobileNumber ? String(locals.user.mobileNumber) : '');

	if (!mobile) {
		throw error(401, 'Unauthorized. Please login again.');
	}

	const parsed = await parseJsonBody<{ onboardingData: Record<string, any>; role?: string }>(
		request
	);
	if (!parsed.ok) return parsed.response;
	const { onboardingData, role } = parsed.data;
	const userRole = (role || 'dsa').toLowerCase();
	const mobileNumber = Number(mobile);

	if (isNaN(mobileNumber) || String(mobileNumber).length < 10) {
		return apiError('Invalid mobile number', 400);
	}

	// ── Detect new 3-step format vs legacy ──────────────
	const isNewFormat =
		Array.isArray(onboardingData.loanTypes) || Array.isArray(onboardingData.painPoints);

	let validName = '';
	let validEmail = '';
	let validPan = '';
	let validCity = '';
	let validGender = '';
	let validAge: number | undefined;
	let newFormatFields: Record<string, any> = {};

	if (isNewFormat) {
		// ── New 3-step validation ──
		const name = (onboardingData.name || '').trim();
		const pan = (onboardingData.panNumber || '').trim().toUpperCase();
		const city = (onboardingData.workingCity || '').trim();
		const email = (onboardingData.email || '').trim().toLowerCase();
		const loanTypes = onboardingData.loanTypes || [];
		const lenders = onboardingData.empanelledLenders || [];
		const volume = (onboardingData.monthlyVolume || '').trim();
		const painPoints = onboardingData.painPoints || [];

		const errors: Record<string, string> = {};
		if (!name || name.length < 2) errors.name = 'Name required (min 2 chars)';
		if (!pan || !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) errors.panNumber = 'Valid PAN required';
		if (!city) errors.workingCity = 'City required';
		if (!Array.isArray(loanTypes) || loanTypes.length === 0)
			errors.loanTypes = 'Select at least 1 loan type';
		if (!Array.isArray(lenders) || lenders.length === 0)
			errors.empanelledLenders = 'Select at least 1 lender';
		if (!volume) errors.monthlyVolume = 'Select volume';
		if (!Array.isArray(painPoints) || painPoints.length !== 3)
			errors.painPoints = 'Select exactly 3';

		if (Object.keys(errors).length > 0) {
			return apiValidationError('Validation failed', errors);
		}

		validName = name;
		validEmail = email;
		validPan = pan;
		validCity = city;
		newFormatFields = {
			primary_loan_types: loanTypes,
			empanelled_lenders: lenders.map((l: string) => ({ lender_name: l, has_direct_code: false })),
			monthly_file_volume: volume,
			pain_points_ranking: { ranked_items: painPoints, ranked_at: new Date() },
			active_modules: [
				'case_builder',
				'file_builder',
				'communication',
				'rm_database',
				'crm',
				'analytics'
			],
			onboarding_v2_completed: true
		};
	} else {
		// ── Legacy V1 validation ──
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

		const dsaData = onboardingData.dsa ?? {};
		const dsaResult = dsaStep2Schema.safeParse({
			hasDirectDsaCode: dsaData.hasDirectDsaCode,
			lenderName: dsaData.lenderName?.trim() ?? '',
			dsaCode: dsaData.dsaCode?.trim().toUpperCase() ?? '',
			panNumber: dsaData.panNumber?.toUpperCase().trim() ?? '',
			workingCity: dsaData.workingCity?.trim() ?? '',
			gstNumber: dsaData.gstNumber?.toUpperCase().trim() ?? ''
		});

		if (!dsaResult.success) {
			const errors: Record<string, string> = {};
			for (const issue of dsaResult.error.issues) {
				const key = issue.path[0] as string;
				if (!errors[key]) errors[key] = issue.message;
			}
			return apiValidationError('Validation failed', errors);
		}

		validName = baseResult.data.name;
		validEmail = baseResult.data.email || '';
		validGender = baseResult.data.gender;
		validAge = baseResult.data.age;
		validPan = dsaResult.data.panNumber || '';
		validCity = dsaResult.data.workingCity || '';
	}

	// ── Ensure a base user (Applicant) profile exists ─────────
	await ensureApplicantProfile({
		name: validName,
		email: validEmail,
		gender: validGender || 'Not specified',
		mobileNumber,
		age: validAge,
		roleBooleanKey: 'dsa'
	});

	// SEC-2: encrypted-first lookup, decrypt for downstream reads
	const existingRaw = await findUserByMobile(DsaApplications, mobileNumber);
	const existing = await decryptUserPii(existingRaw);

	if (existing) {
		const updateFields: Record<string, any> = {
			name: validName,
			email: validEmail || existing.email,
			panNumber: validPan || existing.panNumber || '',
			workingCity: validCity || existing.workingCity || '',
			onboardingCompleted: true,
			role: userRole,
			updatedAt: new Date(),
			...newFormatFields
		};
		// Preserve legacy fields if present from legacy flow
		if (validGender) updateFields.gender = validGender;
		if (validAge) updateFields.age = validAge;

		// SEC-2: encrypt PII before $set. Update by _id (not mobile filter)
		// since once mobile is encrypted the plain-mobile filter wouldn't
		// match — _id is provably correct from the prior decrypted lookup.
		const encryptedUpdate = await encryptUserPii(updateFields);
		await DsaApplications.updateOne({ _id: existing._id }, { $set: encryptedUpdate });

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
		await DsaApplications.updateOne(
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

		cookies.set('activeRole', 'dsa', {
			httpOnly: false, // Client-side JS reads this for role-switching UI
			path: '/',
			maxAge: REFRESH_COOKIE_MAX_AGE,
			secure: isProd,
			sameSite: 'lax'
		});

		cookies.delete('verifiedMobile', { path: '/' });
		cookies.delete('role', { path: '/' });

		return json({ success: true, redirect: '/dashboard/dsa' });
	}

	// ── F.3 — read UTM cookie + persist as attribution sub-doc ──
	// Cookie set in hooks.server.ts on the visit that first carried
	// utm_* params (first-touch). Absent → leave attribution unset
	// (the admin acquisition report treats absence as source='direct').
	let attribution: UtmAttribution | undefined;
	try {
		const cookieRaw = cookies.get(UTM_COOKIE_NAME);
		const parsed = parseFromCookie(cookieRaw);
		if (parsed) attribution = parsed;
	} catch {
		// Non-fatal — onboarding proceeds without attribution capture.
	}

	// ── F.1 — mint own referral code + resolve referrer (if any) ──
	let ownReferralCode: string | undefined;
	let referredByCode: string | undefined;
	let referrerDsaId: import('mongodb').ObjectId | undefined;
	try {
		ownReferralCode = await mintUniqueReferralCode();
	} catch (refErr) {
		logger.warn({ err: refErr }, '[F.1] mintUniqueReferralCode failed — DSA gets no code v1');
	}
	try {
		const refCookie = cookies.get(REFERRAL_COOKIE_NAME);
		if (refCookie) {
			const referrer = await findReferrerByCode(refCookie);
			if (referrer) {
				// Self-referral block: a DSA can't refer themselves by sharing
				// their own link to a second account on the same mobile. The
				// signup already rejects duplicate mobiles in the upstream
				// existing-user check; the explicit string compare here is
				// belt + suspenders in case that check ever loosens.
				if (String(referrer.mobileNumber) !== String(mobileNumber)) {
					referredByCode = String(refCookie).trim().toUpperCase();
					referrerDsaId = referrer._id;
				} else {
					logger.info(
						{ mobile: String(mobileNumber) },
						'[F.1] self-referral blocked at signup'
					);
				}
			}
		}
	} catch (refLookupErr) {
		logger.warn(
			{ err: refLookupErr },
			'[F.1] referral cookie lookup failed — proceeding without attribution'
		);
	}

	// ── New DSA application ───────────────────────────────────
	const newApplication: Record<string, any> = {
		name: validName,
		email: validEmail || '',
		mobileNumber,
		panNumber: validPan || '',
		workingCity: validCity || '',
		role: userRole,
		onboardingCompleted: true,
		accountStatus: 'active' as const,
		lastActiveAt: new Date(),
		usedCoins: 0,
		availableCoins: 0,
		createdAt: new Date(),
		...newFormatFields,
		// F.3 — first-touch attribution. Stored as ISO string in the cookie;
		// reified as Date for the DB row. first_seen_at is the cookie's
		// timestamp (= first UTM-carrying visit), NOT the signup time.
		...(attribution && {
			attribution: {
				...attribution,
				first_seen_at: new Date(attribution.first_seen_at)
			}
		}),
		// F.1 — referral fields.
		...(ownReferralCode && { referral_code: ownReferralCode }),
		...(referredByCode && { referred_by: referredByCode })
	};

	// SEC-2: encrypt PII before insert. Keep `newApplication` (plaintext)
	// for the JWT payload + sampleDataSeeder calls below — both need
	// plaintext name/email/mobileNumber.
	const encryptedNewApplication = await encryptUserPii(newApplication);
	const result = await DsaApplications.insertOne(encryptedNewApplication as any);

	// Seed sample cases for new DSA (non-fatal — don't block onboarding if this fails)
	try {
		await seedSampleData(result.insertedId, newApplication.name);
	} catch (seedErr) {
		logger.error({ err: seedErr }, 'Failed to seed sample data for new DSA');
	}

	// F.1 — insert Referrals row + clear the referral cookie. The reward
	// itself fires later from chargeEngine.handleSuccess when this DSA's
	// first paid subscription succeeds. Best-effort.
	if (referrerDsaId && referredByCode) {
		try {
			await Referrals.insertOne({
				referrer_dsa_id: referrerDsaId,
				referred_dsa_id: result.insertedId,
				code: referredByCode,
				joined_at: new Date(),
				reward_status: 'pending',
				reward_type: 'free_month'
			});
			logger.info(
				{
					code: referredByCode,
					referrer_dsa_id: String(referrerDsaId),
					referred_dsa_id: String(result.insertedId)
				},
				'[F.1] referral row created — reward pending until first paid sub'
			);
		} catch (insertErr) {
			// E11000 on the unique (referred_dsa_id) index means this DSA was
			// already attributed to some referrer — keep the existing record.
			logger.warn(
				{ err: insertErr, code: referredByCode },
				'[F.1] Referrals.insertOne failed (probably duplicate)'
			);
		}
		// Clear the cookie regardless — it's served its purpose; lingering
		// would cause the same row to be inserted again on any future onboarding
		// retry by the same browser.
		cookies.delete(REFERRAL_COOKIE_NAME, { path: '/' });
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
	await DsaApplications.updateOne(
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

	cookies.set('activeRole', 'dsa', {
		httpOnly: false, // Client-side JS reads this for role-switching UI
		path: '/',
		maxAge: REFRESH_COOKIE_MAX_AGE,
		secure: isProd,
		sameSite: 'lax'
	});

	cookies.delete('verifiedMobile', { path: '/' });
	cookies.delete('role', { path: '/' });

	return json({ success: true, redirect: '/dashboard/dsa' });
};
