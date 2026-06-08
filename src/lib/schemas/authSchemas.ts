// Authentication validation schemas using Zod
import { z } from 'zod';

// Enhanced validation schemas for authentication
export const emailSchema = z
	.string()
	.email('Please enter a valid email address')
	.min(5, 'Email must be at least 5 characters')
	.max(100, 'Email must not exceed 100 characters')
	.toLowerCase()
	.trim();

export const passwordSchema = z
	.string()
	.min(8, 'Password must be at least 8 characters')
	.max(128, 'Password must not exceed 128 characters')
	.regex(
		/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
		'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
	);

export const phoneSchema = z
	.string()
	.regex(/^[6-9]\d{9}$/, 'Please enter a valid 10-digit mobile number starting with 6, 7, 8, or 9')
	.transform((val) => val.replace(/\D/g, '')); // Remove non-digits

export const nameSchema = z
	.string()
	.min(2, 'Name must be at least 2 characters')
	.max(50, 'Name must not exceed 50 characters')
	.regex(/^[a-zA-Z\s]+$/, 'Name can only contain letters and spaces')
	.trim();

export const otpSchema = z.string().regex(/^\d{6}$/, 'Please enter a valid 6-digit OTP');

// Login schema
export const loginSchema = z.object({
	email: emailSchema,
	password: z.string().min(1, 'Password is required'),
	rememberMe: z.boolean().optional().default(false)
});

// Registration schema
export const registrationSchema = z
	.object({
		name: nameSchema,
		email: emailSchema,
		phone: phoneSchema,
		password: passwordSchema,
		confirmPassword: z.string(),
		termsAccepted: z.boolean().refine((val) => val === true, {
			message: 'You must accept the terms and conditions'
		})
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "Passwords don't match",
		path: ['confirmPassword']
	});

// Password reset schemas
export const forgotPasswordSchema = z.object({
	email: emailSchema
});

// API reset password schema (for backend endpoint)
export const resetPasswordApiSchema = z.object({
	token: z.string().min(1, 'Reset token is required'),
	password: passwordSchema
});

// Frontend reset password schema (for form validation)
export const resetPasswordSchema = z
	.object({
		token: z.string().min(1, 'Reset token is required'),
		password: passwordSchema,
		confirmPassword: z.string()
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "Passwords don't match",
		path: ['confirmPassword']
	});

// Email verification schema
export const emailVerificationSchema = z.object({
	token: z.string().min(1, 'Verification token is required')
});

// Change password schema
export const changePasswordSchema = z
	.object({
		currentPassword: z.string().min(1, 'Current password is required'),
		newPassword: passwordSchema,
		confirmPassword: z.string()
	})
	.refine((data) => data.newPassword === data.confirmPassword, {
		message: "Passwords don't match",
		path: ['confirmPassword']
	})
	.refine((data) => data.currentPassword !== data.newPassword, {
		message: 'New password must be different from current password',
		path: ['newPassword']
	});

// Profile update schema
export const profileUpdateSchema = z.object({
	name: nameSchema.optional(),
	phone: phoneSchema.optional(),
	dateOfBirth: z.string().optional(),
	occupation: z.string().max(100).optional(),
	income: z.number().positive().optional()
});

// 2FA schemas
export const enable2FASchema = z.object({
	password: z.string().min(1, 'Password is required for 2FA setup')
});

export const verify2FASchema = z
	.object({
		code: otpSchema.optional(),
		backupCode: z.string().optional(),
		tempToken: z.string().min(1, 'Temporary token is required')
	})
	.refine((data) => data.code || data.backupCode, {
		message: 'Either TOTP code or backup code is required',
		path: ['code']
	});

// Device management schema
export const deviceManagementSchema = z.object({
	sessionId: z.string().min(1, 'Session ID is required')
});

// Validation utility functions
export function validateInput<T>(
	schema: z.ZodSchema<T>,
	data: unknown
): {
	success: boolean;
	data?: T;
	errors?: Array<{ field: string; message: string; code: string }>;
} {
	try {
		const result = schema.parse(data);

		return { success: true, data: result };
	} catch (error) {
		if (error instanceof z.ZodError) {
			const mappedErrors = error.issues?.map((err) => ({
				field: err.path.join('.'),
				message: err.message,
				code: err.code
			})) || [{ field: 'general', message: 'Validation failed', code: 'unknown' }];

			return {
				success: false,
				errors: mappedErrors
			};
		}

		return {
			success: false,
			errors: [{ field: 'general', message: 'Validation failed', code: 'unknown' }]
		};
	}
}

export function sanitizeFormData(data: Record<string, any>): Record<string, any> {
	const sanitized: Record<string, any> = {};
	for (const [key, value] of Object.entries(data)) {
		if (typeof value === 'string') {
			// Basic XSS prevention
			sanitized[key] = value
				.trim()
				.replace(/[<>]/g, '')
				.replace(/javascript:/gi, '')
				.replace(/on\w+=/gi, '');
		} else {
			sanitized[key] = value;
		}
	}
	return sanitized;
}

// Type exports for use in components
export type LoginFormData = z.infer<typeof loginSchema>;
export type RegistrationFormData = z.infer<typeof registrationSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;
export type ProfileUpdateFormData = z.infer<typeof profileUpdateSchema>;
