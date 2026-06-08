import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { apiError, parseJsonBody } from '$lib/server/apiResponse.js';
import { requireAuthApi } from '$lib/server/guards.js';
import { DsaApplications, rmApplications } from '$lib/database/mongo';
import { ObjectId } from 'mongodb';
import { isLanguageAvailable } from '$lib/i18n';

/**
 * PATCH /api/user/language
 *
 * Saves the user's preferred language to their profile (DSA or RM collection).
 * Requires authentication.
 */
export const PATCH: RequestHandler = async ({ request, locals }) => {
	const denied = requireAuthApi(locals);
	if (denied) return denied;

	const parsed = await parseJsonBody<{ language: string }>(request);
	if (!parsed.ok) return parsed.response;
	const { language } = parsed.data;

	if (!language || typeof language !== 'string' || !isLanguageAvailable(language)) {
		return apiError('Invalid language code. Available: en, hi, mr');
	}

	const user = locals.user!;
	const userId = new ObjectId(user.id);
	const role = user.activeRole || user.role;

	const update = { $set: { preferred_language: language, updatedAt: new Date() } };

	if (role === 'rm') {
		await rmApplications.updateOne({ _id: userId }, update);
	} else {
		// Default to DSA (primary platform role)
		await DsaApplications.updateOne({ _id: userId }, update);
	}

	// left: extra top-level `language` key (not under `data`) — apiOk would nest it
	return json({ success: true, language });
};
