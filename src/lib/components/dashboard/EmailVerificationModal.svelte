<script lang="ts">
	import { secureFetch } from '$lib/utils/csrf';

	interface Props {
		rmEmail: string;
		onVerified: () => void;
	}

	let { rmEmail, onVerified }: Props = $props();

	// ── State ────────────────────────────────────────────────────
	let step = $state<'initial' | 'otp_sent' | 'verifying' | 'success'>('initial');
	let otpValue = $state('');
	let sending = $state(false);
	let verifying = $state(false);
	let errorMessage = $state('');

	// ── Helpers ──────────────────────────────────────────────────
	function maskEmail(email: string): string {
		if (!email) return '';
		const [localPart, domain] = email.split('@');
		if (!localPart || !domain) return email;
		const visible = localPart.charAt(0);
		const masked = visible + '****';
		return `${masked}@${domain}`;
	}

	const maskedEmail = $derived(maskEmail(rmEmail));

	// ── Send OTP ────────────────────────────────────────────────
	async function sendOtp() {
		sending = true;
		errorMessage = '';
		try {
			const res = await secureFetch('/api/rm/verify-email', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'send' })
			});
			const data = await res.json();
			if (data.success) {
				step = 'otp_sent';
				otpValue = '';
			} else {
				errorMessage = data.error || 'Failed to send OTP. Please try again.';
			}
		} catch {
			errorMessage = 'Network error. Please check your connection and try again.';
		} finally {
			sending = false;
		}
	}

	// ── Verify OTP ──────────────────────────────────────────────
	async function verifyOtp() {
		if (otpValue.length !== 6) {
			errorMessage = 'Please enter a valid 6-digit OTP.';
			return;
		}

		verifying = true;
		errorMessage = '';
		try {
			const res = await secureFetch('/api/rm/verify-email', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'verify', otp: otpValue })
			});
			const data = await res.json();
			if (data.success) {
				step = 'success';
				// Brief delay so user sees success state before reload
				setTimeout(() => {
					onVerified();
				}, 1200);
			} else {
				errorMessage = data.error || 'Verification failed. Please try again.';
				otpValue = '';
			}
		} catch {
			errorMessage = 'Network error. Please check your connection and try again.';
		} finally {
			verifying = false;
		}
	}

	// ── Resend OTP ──────────────────────────────────────────────
	async function resendOtp() {
		otpValue = '';
		errorMessage = '';
		await sendOtp();
	}

	// ── Handle OTP input — digits only, max 6 chars ─────────────
	function handleOtpInput(e: Event) {
		const input = e.target as HTMLInputElement;
		const cleaned = input.value.replace(/\D/g, '').slice(0, 6);
		otpValue = cleaned;
		input.value = cleaned;
	}

	// ── Handle Enter key on OTP input ───────────────────────────
	function handleOtpKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && otpValue.length === 6 && !verifying) {
			verifyOtp();
		}
	}
</script>

<!-- Modal overlay — cannot be dismissed -->
<div
	class="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
>
	<div class="w-full max-w-md rounded-xl bg-[var(--dash-bg-card)] p-6 shadow-2xl sm:p-8">
		<!-- Header icon -->
		<div
			class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--dash-btn-ghost-bg)]"
		>
			{#if step === 'success'}
				<svg
					class="h-7 w-7 text-[var(--dash-accent-text)]"
					fill="none"
					viewBox="0 0 24 24"
					stroke-width="2"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
					/>
				</svg>
			{:else}
				<svg
					class="h-7 w-7 text-[var(--dash-accent-text)]"
					fill="none"
					viewBox="0 0 24 24"
					stroke-width="2"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
					/>
				</svg>
			{/if}
		</div>

		<!-- Title -->
		<h2 class="mb-2 text-center text-lg font-bold text-[var(--dash-text)]">
			{#if step === 'success'}
				Email Verified
			{:else}
				Verify Your Bank Email
			{/if}
		</h2>

		<!-- Description -->
		{#if step === 'success'}
			<p class="mb-4 text-center text-sm text-[var(--dash-text-secondary)]">
				Your email has been verified successfully. Redirecting...
			</p>
			<div class="flex justify-center">
				<div
					class="h-8 w-8 animate-spin rounded-full border-4 border-[var(--dash-btn-ghost-border)] border-t-[var(--dash-accent-text)]"
				></div>
			</div>
		{:else if step === 'initial'}
			<p class="mb-2 text-center text-sm text-[var(--dash-text-secondary)]">
				For security, please verify your registered email monthly.
			</p>
			<p class="mb-6 text-center text-sm font-medium text-[var(--dash-text-secondary)]">
				{maskedEmail}
			</p>

			<!-- Error message -->
			{#if errorMessage}
				<div
					class="mb-4 rounded-lg bg-[var(--dash-contrast-ghost-bg)] px-3 py-2 text-center text-sm text-[var(--dash-contrast-text)]"
				>
					{errorMessage}
				</div>
			{/if}

			<!-- Send OTP button -->
			<button
				onclick={sendOtp}
				disabled={sending}
				class="w-full rounded-lg bg-[var(--dash-btn-bg)] px-4 py-2.5 text-sm font-semibold text-[var(--dash-btn-text)] transition-colors hover:bg-[var(--ddsa-primary-600)] disabled:cursor-not-allowed disabled:opacity-50"
			>
				{#if sending}
					<span class="inline-flex items-center gap-2">
						<span class="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
						></span>
						Sending...
					</span>
				{:else}
					Send OTP
				{/if}
			</button>
		{:else if step === 'otp_sent'}
			<p class="mb-1 text-center text-sm text-[var(--dash-text-secondary)]">
				We sent a 6-digit code to
			</p>
			<p class="mb-5 text-center text-sm font-medium text-[var(--dash-text-secondary)]">
				{maskedEmail}
			</p>

			<!-- Error message -->
			{#if errorMessage}
				<div
					class="mb-4 rounded-lg bg-[var(--dash-contrast-ghost-bg)] px-3 py-2 text-center text-sm text-[var(--dash-contrast-text)]"
				>
					{errorMessage}
				</div>
			{/if}

			<!-- OTP Input -->
			<div class="mb-4">
				<label
					for="otp-input"
					class="mb-1.5 block text-sm font-medium text-[var(--dash-text-secondary)]"
				>
					Verification Code
				</label>
				<input
					id="otp-input"
					type="text"
					inputmode="numeric"
					autocomplete="one-time-code"
					maxlength="6"
					value={otpValue}
					oninput={handleOtpInput}
					onkeydown={handleOtpKeydown}
					placeholder="000000"
					class="w-full rounded-lg border border-[var(--dash-border)] px-4 py-3 text-center text-2xl font-bold tracking-[0.4em] text-[var(--dash-text)] transition-colors focus:border-[var(--ddsa-accent-500)] focus:ring-2 focus:ring-[var(--ddsa-accent-500)]/20 focus:outline-none"
				/>
			</div>

			<!-- Verify button -->
			<button
				onclick={verifyOtp}
				disabled={verifying || otpValue.length !== 6}
				class="mb-3 w-full rounded-lg bg-[var(--dash-btn-bg)] px-4 py-2.5 text-sm font-semibold text-[var(--dash-btn-text)] transition-colors hover:bg-[var(--ddsa-primary-600)] disabled:cursor-not-allowed disabled:opacity-50"
			>
				{#if verifying}
					<span class="inline-flex items-center gap-2">
						<span class="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
						></span>
						Verifying...
					</span>
				{:else}
					Verify
				{/if}
			</button>

			<!-- Resend link -->
			<div class="text-center">
				<button
					onclick={resendOtp}
					disabled={sending}
					class="text-sm font-medium text-[var(--dash-accent-text)] transition-colors hover:text-[var(--ddsa-accent-700)] hover:underline disabled:cursor-not-allowed disabled:opacity-50"
				>
					{sending ? 'Sending...' : "Didn't receive it? Resend OTP"}
				</button>
			</div>
		{/if}
	</div>
</div>
