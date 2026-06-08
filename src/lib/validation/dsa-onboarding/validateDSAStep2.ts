import { dsaStep2Schema } from '$lib/schemas/onboarding/dsaStep2Schema';
import type { OnboardingData } from '$lib/stores/onboarding/onboarding';

/**
 * Validates DSA Page 2 fields.
 * Reads from onboardingData.dsa sub-object.
 */
export function validateDSAStep2(data: Partial<OnboardingData> = {}) {
	const dsaData = data.dsa ?? ({} as any);

	const normalized = {
		hasDirectDsaCode: dsaData.hasDirectDsaCode,
		lenderName: dsaData.lenderName?.trim() ?? '',
		dsaCode: dsaData.dsaCode?.trim().toUpperCase() ?? '',
		panNumber: dsaData.panNumber?.toUpperCase().trim() ?? '',
		workingCity: dsaData.workingCity?.trim() ?? '',
		gstNumber: dsaData.gstNumber?.toUpperCase().trim() ?? ''
	};

	const result = dsaStep2Schema.safeParse(normalized);

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
