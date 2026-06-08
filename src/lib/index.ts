// Components
export { default as ToastContainer } from './components/auth/ToastContainer.svelte';

// Services
export * from './services/emailService';

// Types
export * from './types/index';

// Validation Schemas - explicitly re-export to avoid conflicts with types/index
export {
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
	validateLoginWithOtp,
	type OtpVerificationData,
	type EmailVerificationData,
	type ResendOtpData,
	type ResendEmailOtpData,
	type LoginWithOtpData
} from './formValidationSchema';

// Stores
export * from './stores/stores';

// Utilities
export * from './utils';
