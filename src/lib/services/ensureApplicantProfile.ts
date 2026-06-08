import { Applicant } from '$lib/database/mongo';
import { DEFAULT_ROLES } from '$lib/types';
import {
	findUserByMobile,
	decryptUserPii,
	encryptUserPii
} from '$lib/server/csfle/index.js';

/**
 * Ensures an Applicant (user profile) record exists for the given mobile number.
 * Called by ALL onboarding endpoints so every person (DSA, RM, PC) also has a base "user" profile.
 *
 * - If record exists → updates name/email/gender, sets user=true + the specified role boolean
 * - If not → creates new Applicant record with roles booleans
 *
 * @param roleBooleanKey - Which role to set true (e.g. 'user', 'dsa', 'rm', 'propertyConsultant')
 * Returns the ObjectId of the existing or newly created Applicant.
 */
export async function ensureApplicantProfile(data: {
	name: string;
	email: string;
	gender: string;
	mobileNumber: number;
	age?: number;
	city?: string;
	occupation?: string;
	roleBooleanKey?: 'user' | 'dsa' | 'rm' | 'propertyConsultant';
}) {
	// SEC-2: encrypted-first lookup; decrypt so we can read existing
	// name/email/gender below for the merge.
	const existingRaw = await findUserByMobile(Applicant, data.mobileNumber);
	const existing = await decryptUserPii(existingRaw);

	// Build the role update
	const roleUpdate: Record<string, boolean> = {
		'roles.user': true // Everyone gets user=true
	};
	if (data.roleBooleanKey && data.roleBooleanKey !== 'user') {
		roleUpdate[`roles.${data.roleBooleanKey}`] = true;
	}

	if (existing) {
		const setFields: Record<string, any> = {
			name: data.name || existing.name,
			email: data.email || existing.email,
			gender: data.gender || existing.gender,
			onboardingCompleted: true,
			updatedAt: new Date(),
			...roleUpdate
		};

		if (data.age) setFields.age = data.age;
		if (data.city) setFields.city = data.city;
		if (data.occupation) setFields.occupation = data.occupation;

		// SEC-2: encrypt PII before $set. Update by _id from the prior
		// lookup — encrypted-mobile filter wouldn't match if active.
		const encryptedSet = await encryptUserPii(setFields);
		await Applicant.updateOne({ _id: existing._id }, { $set: encryptedSet });
		return existing._id;
	}

	const newDoc: Record<string, any> = {
		name: data.name,
		email: data.email,
		mobileNumber: data.mobileNumber,
		gender: data.gender,
		occupation: data.occupation || '',
		roles: {
			...DEFAULT_ROLES,
			user: true, // Everyone gets user=true
			...(data.roleBooleanKey && data.roleBooleanKey !== 'user'
				? { [data.roleBooleanKey]: true }
				: {})
		},
		onboardingCompleted: true,
		accountStatus: 'active',
		lastActiveAt: new Date(),
		usedCoins: 0,
		availableCoins: 10,
		createdAt: new Date(),
		updatedAt: new Date()
	};

	if (data.age) newDoc.age = data.age;
	if (data.city) newDoc.city = data.city;

	// SEC-2: encrypt PII fields before insert.
	const encryptedDoc = await encryptUserPii(newDoc);
	const result = await Applicant.insertOne(encryptedDoc as any);
	return result.insertedId;
}
