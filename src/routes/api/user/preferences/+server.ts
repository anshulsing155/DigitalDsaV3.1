import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { apiError, parseJsonBody } from '$lib/server/apiResponse.js';
import { requireAuthApi } from '$lib/server/guards.js';
import { DsaApplications, rmApplications } from '$lib/database/mongo';
import { ObjectId } from 'mongodb';
import type { UserThemePreferences } from '$lib/types/index';

/**
 * PATCH /api/user/preferences
 *
 * Saves the user's theme preferences (mode and color scheme) to their profile.
 * Requires authentication. At least one field must be provided.
 */
export const PATCH: RequestHandler = async ({ request, locals }) => {
	const denied = requireAuthApi(locals);
	if (denied) return denied;

	const parsed = await parseJsonBody<Partial<UserThemePreferences>>(request);
	if (!parsed.ok) return parsed.response;
	const { theme_mode, color_scheme } = parsed.data;

	// Validate: at least one field required
	if (!theme_mode && !color_scheme) {
		return apiError('At least one preference field is required (theme_mode or color_scheme)', 400);
	}

	// Validate theme_mode if provided
	if (theme_mode && !['light', 'dark', 'system'].includes(theme_mode)) {
		return apiError('Invalid theme_mode. Must be one of: light, dark, system', 400);
	}

	// Validate color_scheme if provided
	const validSchemes = ['bronze', 'ocean', 'forest', 'slate', 'rose', 'amber'];
	if (color_scheme && !validSchemes.includes(color_scheme)) {
		return apiError(`Invalid color_scheme. Must be one of: ${validSchemes.join(', ')}`, 400);
	}

	const user = locals.user!;
	const userId = new ObjectId(user.id);
	const role = user.activeRole || user.role;

	// Build update object with only provided fields
	const preferencesUpdate: Partial<UserThemePreferences> = {};
	if (theme_mode) preferencesUpdate.theme_mode = theme_mode;
	if (color_scheme) preferencesUpdate.color_scheme = color_scheme;

	const update = { $set: { preferences: preferencesUpdate, updatedAt: new Date() } };

	if (role === 'rm') {
		await rmApplications.updateOne({ _id: userId }, update);
	} else {
		// Default to DSA (primary platform role)
		await DsaApplications.updateOne({ _id: userId }, update);
	}

	// left: extra top-level `preferences` key (not under `data`) — apiOk would nest it
	return json({ success: true, preferences: preferencesUpdate });
};
