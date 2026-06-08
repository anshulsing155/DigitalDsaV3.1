import {
	roleSelectionSchema,
	userDetailsSchema,
	professionalBaseSchema,
	commonOnboardingSchema
} from '$lib/schemas/onboarding/commonSchema';
import type { OnboardingData } from '$lib/stores/onboarding/onboarding';

/**
 * Validates Step 0 (role selection only).
 */
export function validateRoleSelection(data: Partial<OnboardingData> = {}) {
	const normalized = {
		selectedRole: data.selectedRole ?? ''
	};

	const result = roleSelectionSchema.safeParse(normalized);

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

/**
 * Validates Step 1 for User role (name, age, gender, city, occupation, optional email).
 */
export function validateUserDetails(data: Partial<OnboardingData> = {}) {
	const normalized = {
		name: data.name?.trim() ?? '',
		age: data.age ? Number(data.age) : undefined,
		gender: data.gender ?? '',
		city: data.city ?? '',
		occupation: data.occupation ?? '',
		email: data.email?.trim().toLowerCase() ?? ''
	};

	const result = userDetailsSchema.safeParse(normalized);

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

/**
 * Validates Step 1 base fields for DSA/RM/PC roles (name, age, gender, optional email).
 * Role-specific fields are validated by their own validators.
 */
export function validateProfessionalBase(data: Partial<OnboardingData> = {}) {
	const normalized = {
		name: data.name?.trim() ?? '',
		age: data.age ? Number(data.age) : undefined,
		gender: data.gender ?? '',
		email: data.email?.trim().toLowerCase() ?? ''
	};

	const result = professionalBaseSchema.safeParse(normalized);

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

/**
 * Legacy: Validates Page 1 (common details) for all roles.
 * Kept for backward compatibility.
 */
export function validateCommonDetails(data: Partial<OnboardingData> = {}) {
	const normalized = {
		name: data.name?.trim() ?? '',
		age: data.age ? Number(data.age) : undefined,
		gender: data.gender ?? '',
		email: data.email?.trim().toLowerCase() ?? '',
		selectedRole: data.selectedRole ?? ''
	};

	const result = commonOnboardingSchema.safeParse(normalized);

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
