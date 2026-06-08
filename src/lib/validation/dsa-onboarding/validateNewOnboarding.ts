/**
 * Validation for the new 3-step DSA onboarding flow.
 * Each step validated independently.
 */

type ValidationResult = { valid: boolean; errors: Record<string, string> };

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

/** Step 1: About You — name, PAN, city, optional email */
export function validateStep1(data: Record<string, any>): ValidationResult {
	const errors: Record<string, string> = {};

	const name = (data.name || '').trim();
	if (!name || name.length < 2) {
		errors.name = 'Enter your full name (at least 2 characters)';
	}

	const pan = (data.panNumber || '').trim().toUpperCase();
	if (!pan) {
		errors.panNumber = 'PAN number is required';
	} else if (!PAN_REGEX.test(pan)) {
		errors.panNumber = 'Enter a valid PAN (e.g. ABCDE1234F)';
	}

	const city = (data.workingCity || '').trim();
	if (!city) {
		errors.workingCity = 'Select your working city';
	}

	// Email is optional — only validate format if provided
	const email = (data.email || '').trim();
	if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
		errors.email = 'Enter a valid email address';
	}

	return { valid: Object.keys(errors).length === 0, errors };
}

/** Step 2: Your Business — loan types, lenders, volume */
export function validateStep2(data: Record<string, any>): ValidationResult {
	const errors: Record<string, string> = {};

	const loanTypes = data.loanTypes || [];
	if (!Array.isArray(loanTypes) || loanTypes.length === 0) {
		errors.loanTypes = 'Select at least one loan type';
	}

	const lenders = data.empanelledLenders || [];
	if (!Array.isArray(lenders) || lenders.length === 0) {
		errors.empanelledLenders = 'Select at least one lender';
	}

	const volume = (data.monthlyVolume || '').trim();
	if (!volume) {
		errors.monthlyVolume = 'Select your monthly file volume';
	}

	return { valid: Object.keys(errors).length === 0, errors };
}

/** Step 3: What Brings You Here — exactly 3 pain points */
export function validateStep3(data: Record<string, any>): ValidationResult {
	const errors: Record<string, string> = {};

	const painPoints = data.painPoints || [];
	if (!Array.isArray(painPoints) || painPoints.length !== 3) {
		errors.painPoints = `Select exactly 3 challenges (${painPoints.length || 0} selected)`;
	}

	return { valid: Object.keys(errors).length === 0, errors };
}
