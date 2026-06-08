/**
 * POST  /api/form/location
 * ══════════════════════════════════════════════════════════════════
 * Dedicated endpoint for location compound question lookups.
 *
 * Supports four actions:
 *   - states:        List available states for a dataset
 *   - cities:        List cities for a given state
 *   - areas:         List areas/localities for a given state+city (with pincodes)
 *   - pincodeLookup: Reverse lookup — pincode → [{state, city, area}]
 *
 * This endpoint replaces the hardcoded optionResolver entries for
 * state/city/pincode questions. The LocationGroup component calls this
 * directly instead of /api/form/options.
 * ══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { requireAuthApi } from '$lib/server/guards';
import { apiServerError, parseJsonBody } from '$lib/server/apiResponse.js';
import { checkRateLimit } from '$lib/server/formGuard';
import {
	getEngineOptions,
	getCityOptionsForState,
	getCityOptionsForAllState,
	getAreasForCity,
	lookupPincode,
	getPincodeSuggestions
} from '$lib/server/formEngine/engineContext';

type LocationAction = 'states' | 'cities' | 'areas' | 'pincodeLookup' | 'pincodeSuggestions';

interface LocationRequest {
	action: LocationAction;
	source: 'selected' | 'all';
	state?: string;
	city?: string;
	pincode?: string;
}

const VALID_ACTIONS: LocationAction[] = [
	'states',
	'cities',
	'areas',
	'pincodeLookup',
	'pincodeSuggestions'
];
const VALID_SOURCES = ['selected', 'all'] as const;

export const POST: RequestHandler = async ({ request, locals }) => {
	// Auth guard
	const denied = requireAuthApi(locals);
	if (denied) return denied;

	// Rate limit (production only) — same budget as /api/form/options
	if (!dev && locals.user) {
		if (!checkRateLimit(`location:${locals.user.id}`, 30)) {
			return json(
				{ success: false, error: 'Too many location requests. Please slow down.' },
				{ status: 429 }
			);
		}
	}

	const jsonParsed = await parseJsonBody<Record<string, unknown>>(request);
	if (!jsonParsed.ok) return jsonParsed.response;

	try {
		const body = jsonParsed.data as unknown as LocationRequest;
		const { action, source = 'selected', state, city, pincode } = body;

		// Validate action
		if (!action || !VALID_ACTIONS.includes(action)) {
			return json(
				{
					success: false,
					error: `Invalid action. Must be one of: ${VALID_ACTIONS.join(', ')}`
				},
				{ status: 400 }
			);
		}

		// Validate source
		if (!VALID_SOURCES.includes(source)) {
			return json(
				{ success: false, error: "Invalid source. Must be 'selected' or 'all'" },
				{ status: 400 }
			);
		}

		const noCache = {
			'Cache-Control': 'no-store, no-cache, must-revalidate, private',
			Pragma: 'no-cache'
		};

		switch (action) {
			case 'states': {
				const opts = getEngineOptions();
				const states = source === 'selected' ? opts.stateOptions : opts.allStateOptions;
				return json({ success: true, data: { states } }, { headers: noCache });
			}

			case 'cities': {
				if (!state || typeof state !== 'string') {
					return json(
						{ success: false, error: 'state is required for cities action' },
						{ status: 400 }
					);
				}
				const cities =
					source === 'selected' ? getCityOptionsForState(state) : getCityOptionsForAllState(state);
				return json({ success: true, data: { cities } }, { headers: noCache });
			}

			case 'areas': {
				if (!state || !city) {
					return json(
						{ success: false, error: 'state and city are required for areas action' },
						{ status: 400 }
					);
				}
				const areas = getAreasForCity(state, city, source);
				return json({ success: true, data: { areas } }, { headers: noCache });
			}

			case 'pincodeLookup': {
				if (!pincode || typeof pincode !== 'string') {
					return json(
						{ success: false, error: 'pincode is required for pincodeLookup action' },
						{ status: 400 }
					);
				}
				const locations = lookupPincode(pincode, source);
				if (!locations) {
					return json(
						{ success: true, data: { valid: false, locations: [] } },
						{ headers: noCache }
					);
				}
				return json({ success: true, data: { valid: true, locations } }, { headers: noCache });
			}

			case 'pincodeSuggestions': {
				if (!pincode || typeof pincode !== 'string') {
					return json(
						{
							success: false,
							error: 'pincode is required for pincodeSuggestions action'
						},
						{ status: 400 }
					);
				}
				const suggestions = getPincodeSuggestions(pincode, source, 10);
				return json({ success: true, data: { suggestions } }, { headers: noCache });
			}

			default:
				return json({ success: false, error: 'Unknown action' }, { status: 400 });
		}
	} catch (err) {
		return apiServerError(err, 'Location lookup failed');
	}
};
