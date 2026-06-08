import { pcStep2Schema } from '$lib/schemas/onboarding/propertyConsultantStep2Schema';
import type { OnboardingData } from '$lib/stores/onboarding/onboarding';

/**
 * Validates Property Consultant Page 2 fields.
 * Reads from onboardingData.pc sub-object.
 */
export function validatePCStep2(data: Partial<OnboardingData> = {}) {
	const pcData = data.pc ?? ({} as any);

	const normalized = {
		panNumber: pcData.panNumber?.toUpperCase().trim() ?? '',
		reraNumber: pcData.reraNumber?.toUpperCase().trim() ?? '',
		workingCity: pcData.workingCity?.trim() ?? ''
	};

	const result = pcStep2Schema.safeParse(normalized);

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
