<script lang="ts">
	/**
	 * Partner Signup Page — RM Entry Point
	 * ═══════════════════════════════════════════════════════════════════
	 * Flow:
	 *   1. MOBILE INPUT — Enter Indian phone number
	 *   2. OTP VERIFICATION — Enter 4-digit code
	 *   3. CHECK EXISTENCE:
	 *      a) Number exists in any collection → toast + redirect to /login
	 *      b) New number → auto-create RM profile → redirect to /rm-onboarding
	 * ═══════════════════════════════════════════════════════════════════
	 */

	import { goto } from '$app/navigation';

	import clientLogger from '$lib/utils/clientLogger';
	import { loginSchema } from '$lib/formValidationSchema';
	import { addToast, setAuthData } from '$lib/stores/stores.js';
	import { onMount } from 'svelte';
	import { fly, fade } from 'svelte/transition';
	import { tick } from 'svelte';
	import { MoveLeft, Shield, AlertCircle, Phone } from '$lib/utils/iconRegistry';
	import { secureFetch } from '$lib/utils/csrf';
	import { browser } from '$app/environment';

	// ── Page State ───────────────────────────────────────────────
	type PageStep = 'mobile' | 'otp';

	let currentStep: PageStep = $state('mobile');

	let isLoading = $state(true);
	let isWaiting = $state(false);

	// ── Form Data ──────────────────────────────────────────────
	interface FormData {
		userMobile?: string;
	}
	interface FormErrors {
		userMobile?: { _errors?: string[] };
	}
	let formData = $state<FormData>({});
	let errors = $state<FormErrors>({});

	// ── OTP State ────────────────────────────────────────────────
	let otp = $state(['', '', '', '']);
	let otpCode = $derived(otp.join(''));
	let requestId = $state('');
	let lastOtpSent = $state(0);
	const OTP_COOLDOWN = 30000;
	const SESSION_TIMEOUT = 10 * 60 * 1000;
	let countdown = $state(30);
	let isResendDisabled = $state(true);
	let sessionStartTime = $state(0);

	let widgetData = $state(null);

	// ── Timer references ─────────────────────────────────────────
	let otpCountdownInterval: ReturnType<typeof setInterval> | null = null;

	onMount(async () => {
		await initializeComponent();
	});

	$effect(() => {
		return () => {
			if (otpCountdownInterval) clearInterval(otpCountdownInterval);
		};
	});

	// ── Initialization ───────────────────────────────────────────
	async function initializeComponent() {
		if (!browser) {
			isLoading = false;
			return;
		}

		isLoading = true;
		try {
			const widgetResponse = await fetch('/api/auth/init-widget');
			if (!widgetResponse.ok) throw new Error('Failed to initialize widget');
			const widgetResult = await widgetResponse.json();
			if (!widgetResult.success) throw new Error(widgetResult.error || 'Widget init failed');
			widgetData = widgetResult.widgetData;
		} catch (error) {
			clientLogger.error({ err: error }, 'Initialization error:');
			addToast({
				type: 'error',
				message: 'Unable to initialize. Please try again later.',
				duration: 3000
			});
		} finally {
			isLoading = false;
		}
	}

	// ── Navigation ───────────────────────────────────────────────
	function goBackToMobile() {
		currentStep = 'mobile';
		otp = ['', '', '', ''];
	}

	function sanitizeText(text: string): string {
		return text.replace(
			/[<>&"']/g,
			(match: string) =>
				(
					({
						'<': '&lt;',
						'>': '&gt;',
						'&': '&amp;',
						'"': '&quot;',
						"'": '&#x27;'
					}) as Record<string, string>
				)[match]
		);
	}

	// ── Form Validation ──────────────────────────────────────────

	/** Formatting only — strip non-digits, cap at 10. Runs on every keystroke. */
	function formatMobile(event: Event) {
		const target = event.target as HTMLInputElement;
		const value = target.value.replace(/\D/g, '').slice(0, 10);
		formData.userMobile = value;
		if (errors.userMobile) errors.userMobile = undefined;
	}

	/** Full schema validation — runs on blur and before submit. */
	function validateMobile(): boolean {
		if (!formData.userMobile) {
			errors.userMobile = { _errors: ['Mobile number is required'] };
			return false;
		}
		const result = loginSchema.safeParse({ mobileNumber: formData.userMobile });
		errors.userMobile = result.success ? undefined : result.error.format().mobileNumber;
		return result.success;
	}

	// ── OTP Functions ────────────────────────────────────────────
	async function sendOTP() {
		if (!browser) return;

		if (Date.now() - lastOtpSent < OTP_COOLDOWN) {
			addToast({
				type: 'warning',
				message: 'Please wait before requesting another OTP',
				duration: 3000
			});
			return;
		}

		if (!validateMobile()) {
			return;
		}

		if (!widgetData) {
			addToast({
				type: 'error',
				message: 'Unable to send OTP. Please refresh and try again.',
				duration: 3000
			});
			return;
		}

		isWaiting = true;
		try {
			const response = await fetch('/api/auth/send-otp', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ mobileNumber: Number(formData.userMobile) })
			});
			const result = await response.json();
			if (!response.ok || !result.success) throw new Error(result.message || 'Failed to send OTP');

			requestId = result.reqId || '';
			sessionStartTime = Date.now();
			currentStep = 'otp';
			startCountdown();
			lastOtpSent = Date.now();
			addToast({ type: 'success', message: 'OTP sent successfully', duration: 3000 });

			await tick();
			document.getElementById('otp-input-0')?.focus();
		} catch {
			addToast({ type: 'error', message: 'Failed to send OTP', duration: 3000 });
		} finally {
			isWaiting = false;
		}
	}

	/**
	 * After OTP verification:
	 * 1. Verify OTP
	 * 2. Check if number exists in any collection
	 * 3. If exists → redirect to login
	 * 4. If new → create RM profile → redirect to /rm-onboarding
	 */
	async function verifyOTP() {
		if (!browser) return;
		if (isWaiting) return;

		if (otpCode.length !== 4 || !/^\d{4}$/.test(otpCode)) {
			addToast({ type: 'error', message: 'Please enter a valid 4-digit OTP', duration: 3000 });
			return;
		}

		if (!requestId) {
			addToast({
				type: 'error',
				message: 'No active OTP session. Please request an OTP first.',
				duration: 3000
			});
			return;
		}

		if (sessionStartTime && Date.now() - sessionStartTime > SESSION_TIMEOUT) {
			requestId = '';
			addToast({
				type: 'error',
				message: 'OTP session expired. Please request a new OTP.',
				duration: 3000
			});
			return;
		}

		isWaiting = true;
		try {
			// Step 1: Verify OTP
			const verifyResponse = await fetch('/api/auth/verify-otp', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					otpCode,
					reqId: requestId,
					mobileNumber: formData.userMobile,
					userRole: 'user'
				})
			});

			const verifyResult = await verifyResponse.json();
			if (!verifyResponse.ok || !verifyResult.success) {
				throw new Error(verifyResult.error || 'Invalid OTP');
			}

			// Step 2: Check if this number already exists in any collection
			const rolesResponse = await fetch('/api/auth/detect-roles', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ mobileNumber: formData.userMobile })
			});

			const rolesResult = await rolesResponse.json();

			if (rolesResult.success && rolesResult.data.hasAnyProfile) {
				// Number already exists — redirect to login
				addToast({
					type: 'info',
					message: 'You already have an account. Please sign in.',
					duration: 4000
				});
				goto('/login');
				return;
			}

			// Step 3: New number — create RM profile via signup + check-rm
			// First create bare Applicant
			try {
				await fetch('/api/auth/signup', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ mobileNumber: formData.userMobile })
				});
			} catch {
				// May already exist — that's fine
			}

			// Create RM record
			const rmCreateResponse = await secureFetch('/api/auth/create-rm', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ mobileNumber: formData.userMobile })
			});

			const rmCreateResult = await rmCreateResponse.json();

			if (rmCreateResult.success && rmCreateResult.accessToken) {
				setAuthData(rmCreateResult.user, {
					accessToken: rmCreateResult.accessToken,
					refreshToken: rmCreateResult.refreshToken
				});
			}

			// Set role cookie — secureFetch adds CSRF token (raw fetch → 403 in production)
			await secureFetch('/api/set-role', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ role: 'rm' })
			});

			addToast({
				type: 'success',
				message: "Welcome! Let's set up your partner profile.",
				duration: 3000
			});
			goto('/rm-onboarding');
		} catch (err) {
			addToast({ type: 'error', message: 'Invalid OTP. Please try again.', duration: 3000 });
		} finally {
			isWaiting = false;
		}
	}

	async function retryOTP() {
		if (!browser) return;
		if (Date.now() - lastOtpSent < OTP_COOLDOWN || !requestId) return;

		try {
			const response = await fetch('/api/auth/resend-otp', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					reqId: requestId,
					mobileNumber: Number(formData.userMobile)
				})
			});
			const result = await response.json();
			if (!response.ok || !result.success) throw new Error(result.error || 'Failed to resend OTP');

			requestId = result.requestId || requestId;
			lastOtpSent = Date.now();
			startCountdown();
			addToast({ type: 'success', message: 'OTP resent successfully', duration: 3000 });
		} catch {
			addToast({ type: 'error', message: 'Failed to resend OTP', duration: 3000 });
		}
	}

	// ── Countdown Helpers ────────────────────────────────────────
	function startCountdown() {
		isResendDisabled = true;
		countdown = 30;
		if (otpCountdownInterval) clearInterval(otpCountdownInterval);
		otpCountdownInterval = setInterval(() => {
			if (countdown > 0) countdown--;
			else {
				if (otpCountdownInterval) clearInterval(otpCountdownInterval);
				otpCountdownInterval = null;
				isResendDisabled = false;
			}
		}, 1000);
	}

	// ── OTP Input Helpers ────────────────────────────────────────
	function updateDigit(index: number, event: Event) {
		const target = event.target as HTMLInputElement;
		const value = target.value.replace(/\D/g, '').slice(0, 1);
		otp[index] = value;
		if (value && index < otp.length - 1) {
			document.getElementById(`otp-input-${index + 1}`)?.focus();
		}
		if (value && index === otp.length - 1 && otp.every((d: string) => d)) {
			setTimeout(verifyOTP, 300);
		}
	}

	function handleBackspace(index: number, event: KeyboardEvent) {
		if (event.key === 'Backspace' && !otp[index] && index > 0) {
			document.getElementById(`otp-input-${index - 1}`)?.focus();
			otp[index - 1] = '';
		}
	}

	function handleEnter(event: KeyboardEvent, action: () => void) {
		if (event.key === 'Enter') action();
	}
</script>

<svelte:head>
	<title>Sign Up as Partner - Digital DSA</title>
	<meta
		name="description"
		content="Sign up as a lender RM partner on Digital DSA. Connect with DSA agents and manage loan cases."
	/>
</svelte:head>

<section
	class="font-FifthHead relative z-50 flex min-h-screen w-full flex-col items-center justify-center gap-4 overflow-hidden bg-[var(--form-bg-alt)] p-4"
>
	{#if isLoading}
		<div class="flex h-screen items-center justify-center">
			<div class="loader" aria-label="Loading"></div>
		</div>
	{:else if !widgetData}
		<div
			class="mx-auto w-full max-w-sm overflow-hidden rounded-2xl bg-[var(--form-bg-card)] shadow-2xl"
		>
			<div class="flex w-full justify-center bg-red-600 p-6">
				<AlertCircle class="h-16 w-16 text-white/80" />
			</div>
			<div class="flex flex-col gap-4 px-6 py-8 text-center">
				<h2 class="text-2xl font-bold text-[var(--form-text)]">Access Restricted</h2>
				<p class="text-sm text-[var(--form-text-secondary)]">
					Unable to initialize. Please try again later.
				</p>
			</div>
		</div>
	{:else if currentStep === 'mobile'}
		<div class="mx-auto w-full max-w-sm" in:fly={{ y: 20, duration: 300 }}>
			<!-- Logo / Brand -->
			<div class="mb-8 text-center">
				<div
					class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 shadow-xl"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-8 w-8 text-white"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path d="M12 2L2 7l10 5 10-5-10-5z" />
						<path d="M2 17l10 5 10-5" />
						<path d="M2 12l10 5 10-5" />
					</svg>
				</div>
				<h1 class="text-2xl font-bold tracking-tight text-[var(--form-text)] sm:text-3xl">
					Partner Signup
				</h1>
				<p class="mt-2 text-sm text-[var(--form-text-secondary)]">
					Sign up as a lender RM to connect with DSA agents
				</p>
			</div>

			<!-- Mobile Input Card -->
			<div
				class="rounded-2xl border border-[var(--form-border)] bg-[var(--form-bg-card)] p-6 shadow-xl sm:p-8"
			>
				<div class="mb-6 text-center">
					<div
						class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 shadow-lg"
					>
						<Phone class="h-6 w-6 text-white" />
					</div>
					<h2 class="text-xl font-bold text-[var(--form-text)]">Enter Your Mobile</h2>
					<p class="mt-1 text-sm text-[var(--form-text-secondary)]">
						We'll send a one-time password to verify
					</p>
				</div>

				<div class="space-y-4">
					<div>
						<label
							for="userMobile"
							class="mb-1.5 block text-sm font-semibold text-[var(--form-text-secondary)]"
						>
							Mobile Number
						</label>
						<div class="flex gap-2">
							<span
								class="flex items-center rounded-xl border border-[var(--form-border)] bg-[var(--form-bg-alt)] px-3 text-sm font-medium text-[var(--form-text-secondary)]"
							>
								+91
							</span>
							<input
								id="userMobile"
								type="tel"
								inputmode="numeric"
								autocomplete="tel"
								bind:value={formData.userMobile}
								oninput={formatMobile}
								onblur={() => validateMobile()}
								onkeydown={(e) => handleEnter(e, sendOTP)}
								maxlength="10"
								placeholder="10-digit number"
								class="flex-1 rounded-xl border border-[var(--form-border)] bg-[var(--form-bg-card)] px-4 py-3 text-base
									font-medium text-[var(--form-text)]
									transition-all outline-none placeholder:text-[var(--form-text-muted)] focus:border-blue-500 focus:ring-2
									focus:ring-blue-500"
							/>
						</div>
						{#if errors.userMobile}
							<p class="mt-2 flex items-center gap-1 text-xs text-red-500">
								<AlertCircle class="h-3.5 w-3.5" />
								{errors.userMobile._errors?.[0]}
							</p>
						{/if}
					</div>

					{#if isWaiting}
						<button
							disabled
							class="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-500 py-3.5 font-semibold text-white opacity-70"
						>
							<div
								class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
							></div>
							Sending OTP...
						</button>
					{:else}
						<button
							onclick={sendOTP}
							class="w-full transform rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3.5 text-base font-bold
								text-white shadow-lg shadow-blue-400/30 transition-all
								duration-200 hover:scale-[1.01] hover:from-blue-700 hover:to-indigo-700"
						>
							Continue
						</button>
					{/if}
				</div>
			</div>

			<!-- Back to login -->
			<div class="mt-5 text-center">
				<p class="text-sm text-[var(--form-text-secondary)]">
					Already have an account?
					<a href="/login" class="font-semibold text-blue-600 hover:underline">Sign in</a>
				</p>
			</div>

			<!-- Footer -->
			<div class="mt-4 text-center text-xs text-[var(--form-text-muted)]">
				<p>
					By continuing, you agree to our
					<a href="/terms" class="font-medium text-blue-600 hover:underline">Terms</a>
					and
					<a href="/privacy" class="font-medium text-blue-600 hover:underline">Privacy Policy</a>.
				</p>
			</div>
		</div>
	{:else if currentStep === 'otp'}
		<div
			class="mx-auto w-full max-w-sm rounded-2xl border border-[var(--form-border)] bg-[var(--form-bg-card)] p-6 text-center shadow-xl sm:p-8"
			in:fly={{ x: 80, duration: 300 }}
		>
			<!-- Back -->
			<div class="mb-4 flex items-center justify-start">
				<button
					onclick={goBackToMobile}
					class="flex items-center gap-1.5 text-sm text-[var(--form-text-secondary)] transition-colors hover:text-[var(--form-text)]"
				>
					<MoveLeft class="h-4 w-4" />
					Edit number
				</button>
			</div>

			<!-- Header -->
			<div class="mb-6">
				<div
					class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 shadow-lg"
				>
					<Shield class="h-7 w-7 text-white" />
				</div>
				<h2 class="text-2xl font-bold text-[var(--form-text)]">Verify OTP</h2>
				<p class="mt-1 text-sm text-[var(--form-text-secondary)]">
					Code sent to <strong class="text-[var(--form-text-secondary)]"
						>+91 {sanitizeText(formData.userMobile ?? '')}</strong
					>
				</p>
			</div>

			<!-- OTP Inputs -->
			<div class="mb-6 flex justify-center gap-3">
				{#each otp as digit, index}
					<input
						id={`otp-input-${index}`}
						type="text"
						inputmode="numeric"
						pattern="[0-9]*"
						maxlength="1"
						bind:value={otp[index]}
						onkeydown={(e) => {
							handleBackspace(index, e);
							handleEnter(e, verifyOTP);
						}}
						oninput={(e) => updateDigit(index, e)}
						autocomplete="one-time-code"
						aria-label={`OTP digit ${index + 1}`}
						class="h-16 w-14 rounded-xl border-2 border-[var(--form-border)] bg-[var(--form-bg-alt)]
							text-center text-2xl font-bold text-[var(--form-text)]
							transition-all duration-200 outline-none
							hover:border-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100
							dark:hover:border-gray-500 dark:focus:ring-blue-900/30"
					/>
				{/each}
			</div>

			<!-- Resend -->
			<div class="mb-6">
				<button
					onclick={retryOTP}
					disabled={isResendDisabled}
					class="text-sm font-medium transition-colors
						{isResendDisabled
						? 'cursor-not-allowed text-[var(--form-text-muted)]'
						: 'text-blue-600 hover:text-blue-700'}"
				>
					{#if isResendDisabled}
						Resend in {countdown}s
					{:else}
						Resend Code
					{/if}
				</button>
			</div>

			<!-- Verify Button -->
			{#if isWaiting}
				<button
					disabled
					class="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 py-3.5 font-semibold text-white opacity-70"
				>
					<div
						class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
					></div>
					Verifying...
				</button>
			{:else}
				<button
					onclick={verifyOTP}
					class="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-3.5 text-base font-bold text-white
						shadow-lg shadow-indigo-400/30 transition-all duration-200
						hover:from-indigo-700 hover:to-purple-700"
				>
					Verify & Continue
				</button>
			{/if}
		</div>
	{/if}
</section>

<style>
	.loader {
		width: 20px;
		aspect-ratio: 1;
		display: grid;
		border-radius: 50%;
		background:
			linear-gradient(0deg, rgb(0 0 0 / 50%) 30%, #0000 0 70%, rgb(0 0 0 / 100%) 0) 50% / 8% 100%,
			linear-gradient(90deg, rgb(0 0 0 / 25%) 30%, #0000 0 70%, rgb(0 0 0 / 75%) 0) 50% / 100% 8%;
		background-repeat: no-repeat;
		animation: l23 1s infinite steps(12);
	}
	.loader::before,
	.loader::after {
		content: '';
		grid-area: 1/1;
		border-radius: 50%;
		background: inherit;
		opacity: 0.915;
		transform: rotate(30deg);
	}
	.loader::after {
		opacity: 0.83;
		transform: rotate(60deg);
	}
	@keyframes l23 {
		100% {
			transform: rotate(1turn);
		}
	}
</style>
