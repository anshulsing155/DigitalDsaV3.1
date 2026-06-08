import { z } from 'zod';

/**
 * Step 0 — Role selection schema.
 * Only validates role selection.
 */
export const roleSelectionSchema = z.object({
	selectedRole: z.enum(['user', 'dsa', 'rm', 'property-consultant'], {
		message: 'Select a role to continue'
	})
});

/**
 * Step 1 — Details schema (shared by User role).
 * Captures: name, age, gender, city, occupation.
 * Email is OPTIONAL for all roles except RM.
 */
export const userDetailsSchema = z.object({
	name: z
		.string()
		.min(2, 'Enter your full name (at least 2 characters)')
		.max(100, 'Name cannot exceed 100 characters')
		.regex(/^[a-zA-Z\s'-]+$/, 'Name should contain only letters, spaces, hyphens, or apostrophes'),
	age: z
		.number({ message: 'Select your age' })
		.min(18, 'Minimum age is 18')
		.max(80, 'Maximum age is 80'),
	gender: z.string().min(1, 'Select gender'),
	city: z.string().min(1, 'Select your city'),
	occupation: z.string().min(1, 'Select your occupation'),
	email: z
		.union([
			z
				.string()
				.max(254, 'Email cannot exceed 254 characters')
				.email('Enter a valid email address'),
			z.literal('')
		])
		.optional()
});

/**
 * Step 1 — Details schema for DSA/RM/PC roles.
 * Same basic fields but without occupation (they have professional details instead).
 * Email is OPTIONAL.
 */
export const professionalBaseSchema = z.object({
	name: z
		.string()
		.min(2, 'Enter your full name (at least 2 characters)')
		.max(100, 'Name cannot exceed 100 characters')
		.regex(/^[a-zA-Z\s'-]+$/, 'Name should contain only letters, spaces, hyphens, or apostrophes'),
	age: z
		.number({ message: 'Select your age' })
		.min(18, 'Minimum age is 18')
		.max(80, 'Maximum age is 80'),
	gender: z.string().min(1, 'Select gender'),
	email: z
		.union([
			z
				.string()
				.max(254, 'Email cannot exceed 254 characters')
				.email('Enter a valid email address'),
			z.literal('')
		])
		.optional()
});

/**
 * Legacy combined schema — kept for backward compatibility.
 * Used where code still references commonOnboardingSchema.
 */
export const commonOnboardingSchema = z.object({
	name: z
		.string()
		.min(2, 'Enter your full name (at least 2 characters)')
		.max(100, 'Name cannot exceed 100 characters')
		.regex(/^[a-zA-Z\s'-]+$/, 'Name should contain only letters, spaces, hyphens, or apostrophes'),
	age: z
		.number({ message: 'Select your age' })
		.min(18, 'Minimum age is 18')
		.max(80, 'Maximum age is 80'),
	gender: z.string().min(1, 'Select gender'),
	email: z
		.union([
			z
				.string()
				.max(254, 'Email cannot exceed 254 characters')
				.email('Enter a valid email address'),
			z.literal('')
		])
		.optional(),
	selectedRole: z.enum(['user', 'dsa', 'rm', 'property-consultant'], {
		message: 'Select a role to continue'
	})
});

export type RoleSelectionInput = z.infer<typeof roleSelectionSchema>;
export type UserDetailsInput = z.infer<typeof userDetailsSchema>;
export type CommonOnboardingInput = z.infer<typeof commonOnboardingSchema>;
