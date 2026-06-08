import { z } from 'zod';

// Common validation patterns
const mobileNumberSchema = z
	.string()
	.min(1, { message: 'Mobile number is required' })
	.regex(/^\d+$/, { message: 'Mobile number must contain only numbers' })
	.length(10, { message: 'Mobile number must be exactly 10 digits' })
	.regex(/^[6-9]/, { message: 'Indian mobile numbers start with 6, 7, 8, or 9' });

const otpSchema = z
	.string()
	.min(1, { message: 'OTP is required' })
	.regex(/^\d{4}$/, { message: 'OTP must be exactly 4 digits' });

// Login form validation schema
export const loginSchema = z.object({
	mobileNumber: mobileNumberSchema
});

// OTP verification schema
export const otpVerificationSchema = z.object({
	otp: otpSchema
});

// Email verification schema
export const emailVerificationSchema = z.object({
	userId: z.string().min(1, { message: 'User ID is required' }),
	otp: otpSchema
});

// Resend OTP schema
export const resendOtpSchema = z.object({
	mobileNumber: mobileNumberSchema
});

// Resend email OTP schema
export const resendEmailOtpSchema = z.object({
	userId: z.string().min(1, { message: 'User ID is required' })
});

// Combined login with OTP schema
export const loginWithOtpSchema = z.object({
	mobileNumber: mobileNumberSchema,
	otp: otpSchema
});

// Type exports for TypeScript
export type LoginFormData = z.infer<typeof loginSchema>;
export type OtpVerificationData = z.infer<typeof otpVerificationSchema>;
export type EmailVerificationData = z.infer<typeof emailVerificationSchema>;
export type ResendOtpData = z.infer<typeof resendOtpSchema>;
export type ResendEmailOtpData = z.infer<typeof resendEmailOtpSchema>;
export type LoginWithOtpData = z.infer<typeof loginWithOtpSchema>;

// Validation helper functions
export const validateLogin = (data: unknown) => loginSchema.safeParse(data);
export const validateOtp = (data: unknown) => otpVerificationSchema.safeParse(data);
export const validateEmailVerification = (data: unknown) => emailVerificationSchema.safeParse(data);
export const validateResendOtp = (data: unknown) => resendOtpSchema.safeParse(data);
export const validateResendEmailOtp = (data: unknown) => resendEmailOtpSchema.safeParse(data);
export const validateLoginWithOtp = (data: unknown) => loginWithOtpSchema.safeParse(data);

export const contactSchema = z.object({
	userSubject: z.string().min(1, "Subject cannot be empty"),
	userName: z.string()
		.min(3, { message: "Name must be at least 3 letters long" })
		.regex(/^[A-Za-z]+( [A-Za-z]+)*$/, { message: "Name must contain only alphabets and a single space between words" }),
	userMobile: z
		.string()
		.regex(/^\d+$/, { message: "Mobile number must contain only numbers" })
		.superRefine((value, ctx) => {
			if (value.length !== 10) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: "Mobile number must be exactly 10 digits",
				});
			}
		}),
	feedbackMsg: z.string()
		.min(10, { message: "Message must be at least 10 characters long" })
		.refine(value => value.trim().split(/\s+/).length >= 5, {
			message: "Message must have at least 5 words"
		})
});

export const feedbackSchema = z.object({
	userName: z.string()
		.min(3, { message: "Name must be at least 3 letters long" })
		.regex(/^[A-Za-z]+( [A-Za-z]+)*$/, { message: "Name must contain only alphabets and a single space between words" }),

	userEmail: z.string()
		.regex(/^[^\s@]+@[^\s@]+(?:\.[^\s@]+)+$/, {
			message: "Email must contain at least one dot (.) but not consecutively"
		}),

	feedbackMsg: z.string()
		.min(10, { message: "Message must be at least 10 characters long" })
		.refine(value => value.trim().split(/\s+/).length >= 5, {
			message: "Message must have at least 5 words"
		})
});
