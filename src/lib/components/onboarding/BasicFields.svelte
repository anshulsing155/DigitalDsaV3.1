<script lang="ts">
	import TextField from '../TextField.svelte';
	import SingleTextField from '../SingleTextField.svelte';
	import OnboardingSelect from './OnboardingSelect.svelte';
	import { onboardingState } from '$lib/stores/onboarding/onboarding.svelte';
	import { showEmailOtpModal } from '$lib/stores/modal';
	import { addToast } from '$lib/state/ui.svelte';
	import { emailVerificationState } from '$lib/stores/emailVerificationContext.svelte';
	import { BadgeCheck } from '$lib/utils/iconRegistry';

	const ageOptions = Array.from({ length: 63 }, (_, i) => ({
		label: `${18 + i}`,
		value: 18 + i
	}));

	// ── Email verification state ───────────────────────
	let isVerifying = $state(false);
	let emailStatus = $state<{ type: 'idle' | 'loading' | 'error' | 'success'; message: string }>({
		type: 'idle',
		message: ''
	});

	// ── Field validation ────────────────────────────────
	function handleInputChange(field: string, value: string | number) {
		let normalizedValue: string | number = value;
		if (field === 'age') normalizedValue = Number(value);

		onboardingState.updateData((data) => ({ ...data, [field]: normalizedValue }));

		// Clear error for this field
		onboardingState.updateErrors((errs) => {
			const updated = { ...errs };
			delete updated[field];
			return updated;
		});

		// Clear email status when user edits email
		if (field === 'email') {
			emailStatus = { type: 'idle', message: '' };
		}
	}

	// ── Email Verification ──────────────────────────────
	async function openEmailModal() {
		if (isVerifying) return;

		const email = onboardingState.data.email?.trim();

		// Client-side validation
		if (!email) {
			onboardingState.updateErrors((errs) => ({ ...errs, email: 'Please enter your email first' }));
			emailStatus = { type: 'error', message: 'Please enter your email first' };
			return;
		}

		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			onboardingState.updateErrors((errs) => ({
				...errs,
				email: 'Enter a valid email address'
			}));
			emailStatus = { type: 'error', message: 'Enter a valid email address' };
			return;
		}

		isVerifying = true;
		emailStatus = { type: 'loading', message: 'Checking email...' };

		try {
			// Step 1: Check email availability
			const checkRes = await fetch('/api/auth/check-email', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, role: onboardingState.data.selectedRole })
			});
			const check = await checkRes.json();

			if (!checkRes.ok || !check.success) {
				const msg =
					check.error || 'Email check failed. Try again or contact support@digitaldsa.com';
				emailStatus = { type: 'error', message: msg };
				onboardingState.updateErrors((errs) => ({ ...errs, email: msg }));
				return;
			}

			// Step 2: Send verification OTP
			emailStatus = { type: 'loading', message: 'Sending verification code...' };

			const sendRes = await fetch('/api/auth/send-email-verification', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, role: onboardingState.data.selectedRole })
			});
			const send = await sendRes.json();

			if (!sendRes.ok || !send.success) {
				const msg =
					send.error ||
					'Failed to send verification email. Try again or contact support@digitaldsa.com';
				emailStatus = { type: 'error', message: msg };
				onboardingState.updateErrors((errs) => ({ ...errs, email: msg }));
				return;
			}

			// Success — open OTP modal
			emailStatus = { type: 'success', message: 'OTP sent to your email!' };
			onboardingState.updateErrors((errs) => {
				const updated = { ...errs };
				delete updated.email;
				return updated;
			});
			emailVerificationState.setContext(email, onboardingState.data.selectedRole || '');
			showEmailOtpModal.set(true);
		} catch {
			emailStatus = {
				type: 'error',
				message:
					'Unable to connect. Try again after some time. If issue persists, email support@digitaldsa.com'
			};
		} finally {
			isVerifying = false;
		}
	}

	// Derived: button text
	const verifyButtonText = $derived(
		isVerifying ? 'Sending...' : emailVerificationState.verified ? 'Verified' : 'Verify'
	);

	// Derived: field read-only after verification (not disabled — disabled can lose visual value)
	const emailFieldDisabled = $derived(isVerifying);
	const emailFieldReadonly = $derived(emailVerificationState.verified);
</script>

<!-- ── Basic Fields (shared by DSA/RM/PC Step 1) ──────── -->
<div class="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-3">
	<SingleTextField
		id="basic_name"
		label="Full Name <span class='text-red-500'>*</span>"
		placeholder="Enter your full name"
		bind:value={onboardingState.data.name}
		error={onboardingState.errors.name || undefined}
		onInput={(value) => handleInputChange('name', value)}
		icon="user"
		required={true}
		maxLength={100}
	/>

	<OnboardingSelect
		id="basic_age"
		label="Your Age <span class='text-red-500'>*</span>"
		icon="calendar-1"
		required={true}
		bind:value={onboardingState.data.age}
		onChange={(value) => handleInputChange('age', value)}
		error={onboardingState.errors.age || undefined}
		selectClass="w-full pl-2"
		options={ageOptions}
	/>

	<OnboardingSelect
		id="basic_gender"
		label="Gender <span class='text-red-500'>*</span>"
		icon="transgender"
		required={true}
		bind:value={onboardingState.data.gender}
		onChange={(value) => handleInputChange('gender', value)}
		error={onboardingState.errors.gender || undefined}
		selectClass="w-full"
		options={[
			{ label: 'Male', value: 'Male' },
			{ label: 'Female', value: 'Female' },
			{ label: 'Other', value: 'Other' }
		]}
	/>
</div>

<!-- ── Email (Optional) ─────────────────────────── -->
<div class="mt-4">
	<TextField
		id="basic_email"
		textFieldClass="col-span-3"
		label="Email Address <span class='text-[var(--dash-text-muted)] text-xs font-normal'>(optional)</span>"
		placeholder="Enter your email address"
		bind:value={onboardingState.data.email}
		onInput={(value) => handleInputChange('email', value)}
		error={onboardingState.errors.email || undefined}
		icon="mail"
		uiType="email"
		maxLength={254}
		button={!!onboardingState.data.email && !emailVerificationState.verified}
		buttonText={verifyButtonText}
		buttonIcon={emailVerificationState.verified ? BadgeCheck : null}
		disabled={emailFieldDisabled}
		readonly={emailFieldReadonly}
		onButtonClick={openEmailModal}
	/>

	<!-- Status messages below email field -->
	{#if emailVerificationState.verified}
		<p class="mt-1 flex items-center gap-1 px-1 text-xs font-medium text-emerald-600">
			<BadgeCheck class="h-3.5 w-3.5" />
			Email verified successfully
		</p>
	{:else if emailStatus.type === 'loading'}
		<p class="mt-1 flex items-center gap-1 px-1 text-xs text-blue-600">
			<span
				class="inline-block h-3 w-3 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"
			></span>
			{emailStatus.message}
		</p>
	{:else if emailStatus.type === 'error'}
		<p class="mt-1 px-1 text-xs font-medium text-red-500">
			{emailStatus.message}
		</p>
	{:else if emailStatus.type === 'success'}
		<p class="mt-1 px-1 text-xs font-medium text-emerald-600">
			{emailStatus.message}
		</p>
	{:else}
		<p class="mt-1 px-1 text-xs text-[var(--dash-text-muted)]">
			Optional. Add your email for notifications and updates.
		</p>
	{/if}
</div>
