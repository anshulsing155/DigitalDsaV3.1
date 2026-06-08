import { dev } from '$app/environment';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import {
	LOAN_NAMES,
	SECURED_LOAN_NAMES,
	EMPLOYMENT_TYPES
} from '$lib/testing/schema/schemaExtractor';

export const load: PageServerLoad = () => {
	if (!dev) {
		throw error(404, 'Not found');
	}

	// Pass schema constants to client (these come from server-only JSON files)
	return {
		schemaConstants: {
			LOAN_NAMES: [...LOAN_NAMES],
			SECURED_LOAN_NAMES: [...SECURED_LOAN_NAMES],
			EMPLOYMENT_TYPES: [...EMPLOYMENT_TYPES]
		}
	};
};
