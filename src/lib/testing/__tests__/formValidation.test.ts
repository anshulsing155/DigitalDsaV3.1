import { describe, it, expect } from 'vitest';
import {
	loginSchema,
	otpVerificationSchema,
	emailVerificationSchema,
	resendOtpSchema,
	resendEmailOtpSchema,
	loginWithOtpSchema,
	validateLogin,
	validateOtp,
	validateEmailVerification,
	validateResendOtp,
	validateResendEmailOtp,
	validateLoginWithOtp
} from '$lib/formValidationSchema';

// ---------------------------------------------------------------------------
// Mobile number schema (shared by loginSchema, resendOtpSchema, loginWithOtpSchema)
// ---------------------------------------------------------------------------
describe('Mobile number validation', () => {
	// --- Valid Indian mobile numbers ---
	it.each(['6000000000', '7123456789', '8999999999', '9876543210'])(
		'accepts valid 10-digit Indian mobile: %s',
		(num) => {
			const result = loginSchema.safeParse({ mobileNumber: num });
			expect(result.success).toBe(true);
		}
	);

	// --- Rejects empty / missing ---
	it('rejects missing mobileNumber field', () => {
		const result = loginSchema.safeParse({});
		expect(result.success).toBe(false);
	});

	it('rejects empty string', () => {
		const result = loginSchema.safeParse({ mobileNumber: '' });
		expect(result.success).toBe(false);
		if (!result.success) {
			const msgs = result.error.issues.map((i) => i.message);
			expect(msgs.some((m) => m.includes('required'))).toBe(true);
		}
	});

	// --- Length enforcement ---
	it('rejects 9-digit number (too short)', () => {
		const result = loginSchema.safeParse({ mobileNumber: '912345678' });
		expect(result.success).toBe(false);
		if (!result.success) {
			const msgs = result.error.issues.map((i) => i.message);
			expect(msgs.some((m) => /10 digits/.test(m))).toBe(true);
		}
	});

	it('rejects 11-digit number (too long)', () => {
		const result = loginSchema.safeParse({ mobileNumber: '91234567890' });
		expect(result.success).toBe(false);
	});

	// --- Non-numeric input ---
	it.each(['abcdefghij', '98765abcde', '98765 4321', '+919876543210', '9876-543210'])(
		'rejects non-numeric input: %s',
		(val) => {
			const result = loginSchema.safeParse({ mobileNumber: val });
			expect(result.success).toBe(false);
			if (!result.success) {
				const msgs = result.error.issues.map((i) => i.message);
				expect(msgs.some((m) => /only numbers/.test(m))).toBe(true);
			}
		}
	);

	// --- Indian first-digit rule (must start with 6-9) ---
	it.each(['0123456789', '1234567890', '2345678901', '3456789012', '4567890123', '5678901234'])(
		'rejects number starting with digit < 6: %s',
		(val) => {
			const result = loginSchema.safeParse({ mobileNumber: val });
			expect(result.success).toBe(false);
			if (!result.success) {
				const msgs = result.error.issues.map((i) => i.message);
				expect(msgs.some((m) => /start with 6, 7, 8, or 9/.test(m))).toBe(true);
			}
		}
	);

	// --- Type coercion ---
	it('rejects number type (must be string)', () => {
		const result = loginSchema.safeParse({ mobileNumber: 9876543210 });
		expect(result.success).toBe(false);
	});

	it('rejects null', () => {
		const result = loginSchema.safeParse({ mobileNumber: null });
		expect(result.success).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// OTP schema (4-digit)
// ---------------------------------------------------------------------------
describe('OTP validation (4-digit)', () => {
	it.each(['1234', '0000', '9999', '5678'])('accepts valid 4-digit OTP: %s', (otp) => {
		const result = otpVerificationSchema.safeParse({ otp });
		expect(result.success).toBe(true);
	});

	it('rejects empty OTP', () => {
		const result = otpVerificationSchema.safeParse({ otp: '' });
		expect(result.success).toBe(false);
	});

	it('rejects missing OTP field', () => {
		const result = otpVerificationSchema.safeParse({});
		expect(result.success).toBe(false);
	});

	it.each(['123', '12345', '12', '1'])('rejects wrong-length OTP: %s', (otp) => {
		const result = otpVerificationSchema.safeParse({ otp });
		expect(result.success).toBe(false);
	});

	it.each(['abcd', '12ab', '12 4', '123!'])('rejects non-numeric OTP: %s', (otp) => {
		const result = otpVerificationSchema.safeParse({ otp });
		expect(result.success).toBe(false);
	});

	it('rejects 6-digit OTP (common confusion)', () => {
		const result = otpVerificationSchema.safeParse({ otp: '123456' });
		expect(result.success).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Email verification schema (userId + OTP)
// ---------------------------------------------------------------------------
describe('Email verification schema', () => {
	it('accepts valid userId + OTP', () => {
		const result = emailVerificationSchema.safeParse({ userId: 'user123', otp: '4567' });
		expect(result.success).toBe(true);
	});

	it('rejects missing userId', () => {
		const result = emailVerificationSchema.safeParse({ otp: '1234' });
		expect(result.success).toBe(false);
	});

	it('rejects empty userId', () => {
		const result = emailVerificationSchema.safeParse({ userId: '', otp: '1234' });
		expect(result.success).toBe(false);
	});

	it('rejects missing OTP', () => {
		const result = emailVerificationSchema.safeParse({ userId: 'user123' });
		expect(result.success).toBe(false);
	});

	it('rejects invalid OTP with valid userId', () => {
		const result = emailVerificationSchema.safeParse({ userId: 'user123', otp: '12' });
		expect(result.success).toBe(false);
	});

	it('rejects both fields invalid', () => {
		const result = emailVerificationSchema.safeParse({ userId: '', otp: 'ab' });
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues.length).toBeGreaterThanOrEqual(2);
		}
	});
});

// ---------------------------------------------------------------------------
// Resend OTP schema
// ---------------------------------------------------------------------------
describe('Resend OTP schema', () => {
	it('accepts valid mobile number', () => {
		const result = resendOtpSchema.safeParse({ mobileNumber: '9876543210' });
		expect(result.success).toBe(true);
	});

	it('rejects invalid mobile number (same rules as login)', () => {
		const result = resendOtpSchema.safeParse({ mobileNumber: '1234567890' });
		expect(result.success).toBe(false);
	});

	it('rejects empty object', () => {
		const result = resendOtpSchema.safeParse({});
		expect(result.success).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Resend email OTP schema
// ---------------------------------------------------------------------------
describe('Resend email OTP schema', () => {
	it('accepts valid userId', () => {
		const result = resendEmailOtpSchema.safeParse({ userId: 'abc123' });
		expect(result.success).toBe(true);
	});

	it('rejects empty userId', () => {
		const result = resendEmailOtpSchema.safeParse({ userId: '' });
		expect(result.success).toBe(false);
	});

	it('rejects missing userId', () => {
		const result = resendEmailOtpSchema.safeParse({});
		expect(result.success).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Login with OTP schema (mobile + OTP combined)
// ---------------------------------------------------------------------------
describe('Login with OTP schema', () => {
	it('accepts valid mobile + OTP', () => {
		const result = loginWithOtpSchema.safeParse({ mobileNumber: '9876543210', otp: '1234' });
		expect(result.success).toBe(true);
	});

	it('rejects valid mobile + invalid OTP', () => {
		const result = loginWithOtpSchema.safeParse({ mobileNumber: '9876543210', otp: '12' });
		expect(result.success).toBe(false);
	});

	it('rejects invalid mobile + valid OTP', () => {
		const result = loginWithOtpSchema.safeParse({ mobileNumber: '12345', otp: '1234' });
		expect(result.success).toBe(false);
	});

	it('rejects both invalid', () => {
		const result = loginWithOtpSchema.safeParse({ mobileNumber: '', otp: '' });
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues.length).toBeGreaterThanOrEqual(2);
		}
	});

	it('rejects empty object', () => {
		const result = loginWithOtpSchema.safeParse({});
		expect(result.success).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Helper function wrappers (ensure they delegate correctly)
// ---------------------------------------------------------------------------
describe('Validation helper functions', () => {
	it('validateLogin returns success for valid data', () => {
		const result = validateLogin({ mobileNumber: '9876543210' });
		expect(result.success).toBe(true);
	});

	it('validateLogin returns failure for invalid data', () => {
		const result = validateLogin({ mobileNumber: '' });
		expect(result.success).toBe(false);
	});

	it('validateOtp returns success for valid OTP', () => {
		const result = validateOtp({ otp: '1234' });
		expect(result.success).toBe(true);
	});

	it('validateOtp returns failure for invalid OTP', () => {
		const result = validateOtp({ otp: '123456' });
		expect(result.success).toBe(false);
	});

	it('validateEmailVerification returns success for valid data', () => {
		const result = validateEmailVerification({ userId: 'u1', otp: '4321' });
		expect(result.success).toBe(true);
	});

	it('validateEmailVerification returns failure when userId missing', () => {
		const result = validateEmailVerification({ otp: '1234' });
		expect(result.success).toBe(false);
	});

	it('validateResendOtp delegates correctly', () => {
		expect(validateResendOtp({ mobileNumber: '8888888888' }).success).toBe(true);
		expect(validateResendOtp({ mobileNumber: '1111111111' }).success).toBe(false);
	});

	it('validateResendEmailOtp delegates correctly', () => {
		expect(validateResendEmailOtp({ userId: 'x' }).success).toBe(true);
		expect(validateResendEmailOtp({ userId: '' }).success).toBe(false);
	});

	it('validateLoginWithOtp delegates correctly', () => {
		expect(validateLoginWithOtp({ mobileNumber: '7777777777', otp: '9999' }).success).toBe(true);
		expect(validateLoginWithOtp({ mobileNumber: '7777777777', otp: '' }).success).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Edge cases and boundary values
// ---------------------------------------------------------------------------
describe('Edge cases', () => {
	it('rejects undefined input entirely', () => {
		const result = loginSchema.safeParse(undefined);
		expect(result.success).toBe(false);
	});

	it('rejects null input entirely', () => {
		const result = loginSchema.safeParse(null);
		expect(result.success).toBe(false);
	});

	it('rejects non-object input', () => {
		const result = loginSchema.safeParse('9876543210');
		expect(result.success).toBe(false);
	});

	it('ignores extra fields (strip by default)', () => {
		const result = loginSchema.safeParse({ mobileNumber: '9876543210', extra: 'value' });
		expect(result.success).toBe(true);
	});

	it('mobile number with leading/trailing spaces fails (no trim)', () => {
		const result = loginSchema.safeParse({ mobileNumber: ' 9876543210 ' });
		expect(result.success).toBe(false);
	});

	it('OTP with leading zero is valid', () => {
		const result = otpVerificationSchema.safeParse({ otp: '0123' });
		expect(result.success).toBe(true);
	});

	it('OTP with whitespace fails', () => {
		const result = otpVerificationSchema.safeParse({ otp: ' 1234' });
		expect(result.success).toBe(false);
	});
});
