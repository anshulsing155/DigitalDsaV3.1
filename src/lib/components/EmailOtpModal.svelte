<script lang="ts">
	import { onMount } from 'svelte';
	import { dialogState } from '$lib/state/dialog.svelte';
	import { emailVerificationState } from '$lib/stores/emailVerificationContext.svelte';

	interface Props {
		onSubmit?: (otp: string) => Promise<boolean>;
		onResend?: () => Promise<boolean>;
	}

	let { onSubmit = async () => false, onResend = async () => false }: Props = $props();

	let otp = $state(['', '', '', '', '', '']);
	let inputRefs: HTMLInputElement[] = $state([]);

	let isVerifying = $state(false);
	let isResending = $state(false);
	let errorMessage = $state('');
	let resendCooldown = $state(0);
	let failCount = $state(0);
	let cooldownInterval: ReturnType<typeof setInterval> | null = null;

	// Start cooldown on mount (user just received OTP) — NOT at script level to avoid SSR interval
	onMount(() => {
		startCooldown();
		return () => clearCooldownTimer();
	});

	function close() {
		clearCooldownTimer();
		dialogState.showEmailOtpModal = false;
	}

	function startCooldown() {
		resendCooldown = 30;
		clearCooldownTimer();
		cooldownInterval = setInterval(() => {
			resendCooldown--;
			if (resendCooldown <= 0) clearCooldownTimer();
		}, 1000);
	}

	function clearCooldownTimer() {
		if (cooldownInterval) {
			clearInterval(cooldownInterval);
			cooldownInterval = null;
		}
	}

	function handleInput(e: Event, index: number) {
		const target = e.target as HTMLInputElement;
		const val = target.value.replace(/[^0-9]/g, '').slice(-1);

		otp[index] = val;
		errorMessage = '';

		if (val && index < otp.length - 1) {
			inputRefs[index + 1]?.focus();
		}
	}

	function handleKeydown(e: KeyboardEvent, index: number) {
		if (e.key === 'Backspace') {
			e.preventDefault();
			if (otp[index]) {
				otp[index] = '';
			} else if (index > 0) {
				otp[index - 1] = '';
				inputRefs[index - 1]?.focus();
			}
			errorMessage = '';
		}
	}

	function handlePaste(e: ClipboardEvent) {
		e.preventDefault();
		const pasted = (e.clipboardData?.getData('text') || '').replace(/[^0-9]/g, '').slice(0, 6);
		if (!pasted) return;

		for (let i = 0; i < 6; i++) {
			otp[i] = pasted[i] || '';
		}
		const focusIdx = Math.min(pasted.length, 5);
		inputRefs[focusIdx]?.focus();
		errorMessage = '';
	}

	async function submitOtp() {
		const code = otp.join('');

		if (code.length !== 6) {
			errorMessage = 'Please enter all 6 digits';
			return;
		}

		isVerifying = true;
		errorMessage = '';

		try {
			const success = await onSubmit(code);
			if (success) {
				// Service layer closes modal — this is just a fallback
				close();
				return;
			} else {
				failCount++;
				errorMessage = 'Incorrect OTP. Please check and try again.';
				otp = ['', '', '', '', '', ''];
				inputRefs[0]?.focus();
			}
		} catch {
			failCount++;
			errorMessage = 'Verification failed. Please try again.';
		} finally {
			isVerifying = false;
		}
	}

	async function resendOtp() {
		if (isResending || resendCooldown > 0) return;

		isResending = true;
		errorMessage = '';

		try {
			const success = await onResend();
			if (success) {
				otp = ['', '', '', '', '', ''];
				failCount = 0;
				inputRefs[0]?.focus();
				startCooldown();
				errorMessage = '';
			} else {
				errorMessage = 'Failed to resend OTP. Try again shortly.';
			}
		} catch {
			errorMessage = 'Network error. Please check your connection.';
		} finally {
			isResending = false;
		}
	}

	const maskedEmail = $derived(() => {
		const email = emailVerificationState.email;
		if (!email || !email.includes('@')) return email;
		const [local, domain] = email.split('@');
		if (local.length <= 2) return `${local}@${domain}`;
		return `${local.slice(0, 2)}${'*'.repeat(Math.min(local.length - 2, 4))}@${domain}`;
	});
</script>

<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
	role="dialog"
	aria-modal="true"
	tabindex="-1"
	aria-label="Email OTP Verification"
	onclick={(e) => {
		if (e.target === e.currentTarget) close();
	}}
	onkeydown={(e) => {
		if (e.key === 'Escape') close();
	}}
>
	<div class="relative w-full max-w-sm rounded-xl bg-[var(--form-bg-card)] p-6 shadow-2xl">
		<!-- Close button — ALWAYS enabled -->
		<button
			onclick={close}
			class="absolute top-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full text-xl text-[var(--form-text-muted)] transition hover:bg-[var(--dash-bg-alt)] hover:text-[var(--form-text)]"
			aria-label="Close"
		>
			&times;
		</button>

		<!-- Header -->
		<div class="mb-4 text-center">
			<div
				class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-950/30"
			>
				<svg class="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
					/>
				</svg>
			</div>
			<h2 class="text-lg font-semibold text-[var(--form-text)]">Verify Email</h2>
			<p class="mt-1 text-sm text-[var(--form-text-secondary)]">
				Enter the 6-digit code sent to
				{#if emailVerificationState.email}
					<span class="font-medium text-[var(--form-text)]">{maskedEmail()}</span>
				{/if}
			</p>
		</div>

		<!-- OTP Input -->
		<div class="my-5 flex justify-center gap-2.5" onpaste={handlePaste}>
			{#each otp as _, i}
				<input
					bind:this={inputRefs[i]}
					value={otp[i]}
					class="h-12 w-11 rounded-lg border-2 bg-[var(--form-bg-card)] text-center text-lg font-semibold text-[var(--form-text)] transition-colors outline-none
						{errorMessage
						? 'border-red-300 focus:border-red-500 focus:ring-1 focus:ring-red-500'
						: 'border-[var(--form-border)] focus:border-[var(--trial-accent)] focus:ring-1 focus:ring-[var(--trial-accent)]'}"
					maxlength="1"
					inputmode="numeric"
					autocomplete="one-time-code"
					disabled={isVerifying}
					oninput={(e) => handleInput(e, i)}
					onkeydown={(e) => handleKeydown(e, i)}
				/>
			{/each}
		</div>

		<!-- Error message -->
		{#if errorMessage}
			<div
				class="mb-3 rounded-lg bg-red-50 px-3 py-2 text-center text-xs font-medium text-red-600 dark:bg-red-950/30"
			>
				{errorMessage}
			</div>
		{/if}

		<!-- Verify button -->
		<button
			class="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--trial-accent)] px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
			onclick={submitOtp}
			disabled={isVerifying || otp.join('').length !== 6}
		>
			{#if isVerifying}
				<span
					class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
				></span>
				Verifying...
			{:else}
				Verify OTP
			{/if}
		</button>

		<!-- Resend + Change Email -->
		<div class="mt-3 text-center">
			{#if isResending}
				<p class="flex items-center justify-center gap-1 text-xs text-blue-600">
					<span
						class="inline-block h-3 w-3 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"
					></span>
					Sending new code...
				</p>
			{:else if resendCooldown > 0}
				<p class="text-xs text-[var(--form-text-muted)]">
					Resend code in <span class="font-medium">{resendCooldown}s</span>
				</p>
			{:else}
				<button
					class="cursor-pointer text-xs font-medium text-[var(--trial-accent)] transition hover:underline"
					onclick={resendOtp}
				>
					Didn't receive it? Resend OTP
				</button>
			{/if}
		</div>

		<!-- Wrong email hint — shows after 1+ failed attempts -->
		{#if failCount >= 1}
			<div
				class="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-center dark:border-amber-800 dark:bg-amber-950/30"
			>
				<p class="text-xs text-amber-700 dark:text-amber-400">
					Wrong email? <button class="font-medium underline" onclick={close}>Go back</button> and correct
					it.
				</p>
			</div>
		{/if}

		<!-- Help text -->
		<p class="mt-3 text-center text-[10px] text-[var(--form-text-muted)]">
			Check your spam/junk folder. If issue persists, contact
			<a href="mailto:support@digitaldsa.com" class="underline underline-offset-4">support@digitaldsa.com</a>
		</p>
	</div>
</div>
