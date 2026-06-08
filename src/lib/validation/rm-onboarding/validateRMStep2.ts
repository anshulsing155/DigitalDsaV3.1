import { rmStep2Schema } from '$lib/schemas/onboarding/rmStep2Schema';
import type { OnboardingData } from '$lib/stores/onboarding/onboarding';

/**
 * Validates RM Page 2 fields.
 * Reads from onboardingData.rm sub-object.
 * Server also validates domain — this is the client-side layer.
 */
export function validateRMStep2(data: Partial<OnboardingData> = {}) {
	const rmData = data.rm ?? ({} as any);

	const normalized = {
		officialEmail: rmData.officialEmail?.trim().toLowerCase() ?? '',
		workingCity: rmData.workingCity?.trim() ?? ''
	};

	const result = rmStep2Schema.safeParse(normalized);

	if (!result.success) {
		const formatted: Record<string, string> = {};
		for (const issue of result.error.issues) {
			const key = issue.path[0] as string;
			if (!formatted[key]) formatted[key] = issue.message;
		}
		return { valid: false, errors: formatted };
	}

	return { valid: true, errors: {} as Record<string, string> };
}
