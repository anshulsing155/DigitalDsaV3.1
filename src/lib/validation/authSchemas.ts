import { z } from 'zod';

export const MobileSchema = z.object({
	mobile: z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number'),

	role: z.enum(['user', 'dsa', 'rm'], {
		error: 'Invalid role'
	})
});

export const OtpSchema = z.object({
	otp: z
		.string()
		.length(4, 'OTP must be 4 digits')
		.regex(/^\d{4}$/, 'OTP must be numbers only'),

	mobile: z.string().regex(/^[6-9]\d{9}$/, 'Invalid mobile number'),

	role: z.enum(['user', 'dsa', 'rm'], {
		error: 'Invalid role'
	})
});

export const OnboardingSchema = z.object({
	name: z.string().min(3, 'Name must be at least 3 characters'),
	email: z.string().email('Invalid email')
});
