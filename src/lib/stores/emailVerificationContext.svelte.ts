/**
 * Email Verification Context Store (Svelte 5 Runes)
 * ============================================================================
 * Tracks email verification state: the email/role being verified
 * and whether verification has completed.
 * Migrated from two writables to a single class-based $state.
 * ============================================================================
 */

class EmailVerificationState {
	/** The email being verified */
	email = $state<string>('');

	/** The role associated with verification */
	role = $state<string>('');

	/** Whether the email has been verified */
	verified = $state<boolean>(false);

	/** Set the verification context (email + role) */
	setContext(email: string, role: string): void {
		this.email = email;
		this.role = role;
	}

	/** Mark email as verified */
	markVerified(): void {
		this.verified = true;
	}

	/** Reset all verification state */
	reset(): void {
		this.email = '';
		this.role = '';
		this.verified = false;
	}
}

export const emailVerificationState = new EmailVerificationState();
