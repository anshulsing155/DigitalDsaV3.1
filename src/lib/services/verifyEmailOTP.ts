import { addToast } from '$lib/state/ui.svelte';
import { authState } from '$lib/state/auth.svelte';
import { emailVerificationState } from '$lib/stores/emailVerificationContext.svelte';
import { dialogState } from '$lib/state/dialog.svelte';

/**
 * Verify email OTP against the server.
 * Returns `true` on success, `false` on failure (so the modal can react).
 */
export async function verifyEmailOTP(otp: string, email: string, role: string): Promise<boolean> {
	if (!/^\d{6}$/.test(otp)) {
		addToast({ type: 'error', message: 'Please enter a valid 6-digit OTP', duration: 3000 });
		return false;
	}

	if (!email) {
		addToast({
			type: 'error',
			message: 'Email context lost. Please close and try again.',
			duration: 3000
		});
		return false;
	}

	try {
		const response = await fetch('/api/auth/verify-email', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email, otp, role })
		});

		const result = await response.json();

		if (!response.ok || !result.success) {
			const msg = result.error || 'Invalid OTP. Please try again.';
			addToast({ type: 'error', message: msg, duration: 3000 });
			return false;
		}

		// If tokens come, save login session (optional depending on flow)
		if (result.accessToken && result.refreshToken) {
			authState.setSession(result.user || ({} as any), result.accessToken);
		}

		emailVerificationState.markVerified();

		// Close modal immediately — no success screen needed, user has more form fields
		dialogState.showEmailOtpModal = false;

		addToast({
			type: 'success',
			message: 'Email verified successfully!',
			duration: 3000
		});

		return true;
	} catch (err: any) {
		addToast({
			type: 'error',
			message: err.message || 'Verification failed. Please try again.',
			duration: 3000
		});
		return false;
	}
}

/**
 * Resend OTP to the email stored in emailVerificationState.
 * Returns `true` on success, `false` on failure.
 */
export async function resendEmailOTP(): Promise<boolean> {
	const email = emailVerificationState.email;
	const role = emailVerificationState.role;

	if (!email) {
		addToast({
			type: 'error',
			message: 'Email context lost. Please close and try again.',
			duration: 3000
		});
		return false;
	}

	try {
		const res = await fetch('/api/auth/send-email-verification', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email, role })
		});

		const data = await res.json();

		if (!res.ok || !data.success) {
			const msg = data.error || 'Failed to resend OTP. Try again after some time.';
			addToast({ type: 'error', message: msg, duration: 3000 });
			return false;
		}

		return true;
	} catch {
		addToast({
			type: 'error',
			message: 'Network error. Try again after some time.',
			duration: 4000
		});
		return false;
	}
}
