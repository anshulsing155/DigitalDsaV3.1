<script lang="ts">
	import type { PageData } from './$types';
	import { untrack } from 'svelte';
	import { secureFetch } from '$lib/utils/csrf';
	import { Building2, Mail, ShieldCheck, CheckCircle, ArrowLeft, ChevronRight, Loader2 } from 'lucide-svelte';

	let { data }: { data: PageData } = $props();

	// ── Wizard state ──────────────────────────────────────────────
	let currentStep = $state(1);
	let selectedLenderId = $state<string>(untrack(() => data.preselectedLenderId ?? ''));
	let bankEmail = $state('');
	let otpDigits = $state(['', '', '', '', '', '']);
	let pmsOtpToken = $state('');
	let completedAt = $state<Date | null>(null);

	let isLoading = $state(false);
	let errorMessage = $state('');

	const purpose = $derived<'onboarding' | 'monthly_renewal'>(
		(data.purpose as 'onboarding' | 'monthly_renewal') ?? 'onboarding'
	);

	// ── Derived ───────────────────────────────────────────────────
	const selectedLender = $derived(data.lenders.find((l) => l.lenderId === selectedLenderId));
	const otp = $derived(otpDigits.join(''));

	const steps = [
		{ number: 1, label: 'Select Lender' },
		{ number: 2, label: 'Bank Email' },
		{ number: 3, label: 'Verify OTP' },
		{ number: 4, label: 'Confirmation' }
	];

	// ── Step 1 — Lender selection ─────────────────────────────────
	function selectLender(lenderId: string) {
		selectedLenderId = lenderId;
		errorMessage = '';
	}

	function proceedFromStep1() {
		if (!selectedLenderId) {
			errorMessage = 'Please select a lender to continue.';
			return;
		}
		if (!selectedLender?.officialEmailDomain) {
			errorMessage = 'This lender has no official email domain configured. Contact admin.';
			return;
		}
		errorMessage = '';
		currentStep = 2;
	}

	// ── Step 2 — Bank email ───────────────────────────────────────
	async function sendOtp() {
		if (!bankEmail) {
			errorMessage = 'Please enter your bank email address.';
			return;
		}
		if (!bankEmail.includes('@')) {
			errorMessage = 'Please enter a valid email address.';
			return;
		}

		isLoading = true;
		errorMessage = '';

		try {
			const res = await secureFetch('/api/pms/otp/send', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					bankEmail,
					context: { purpose, lenderId: selectedLenderId }
				})
			});

			const json = await res.json();

			if (!res.ok) {
				errorMessage = json.error ?? 'Failed to send OTP. Please try again.';
				return;
			}

			currentStep = 3;
		} catch {
			errorMessage = 'Network error. Please try again.';
		} finally {
			isLoading = false;
		}
	}

	// ── Step 3 — OTP entry ────────────────────────────────────────
	function handleOtpInput(index: number, e: Event) {
		const input = e.target as HTMLInputElement;
		const val = input.value.replace(/\D/g, '').slice(-1);
		otpDigits[index] = val;

		if (val && index < 5) {
			const next = document.getElementById(`otp-${index + 1}`);
			next?.focus();
		}
	}

	function handleOtpKeydown(index: number, e: KeyboardEvent) {
		if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
			const prev = document.getElementById(`otp-${index - 1}`);
			prev?.focus();
		}
	}

	async function verifyOtp() {
		if (otp.length !== 6) {
			errorMessage = 'Please enter all 6 digits.';
			return;
		}

		isLoading = true;
		errorMessage = '';

		try {
			// Step 1: verify OTP → get pmsOtpToken
			const verifyRes = await secureFetch('/api/pms/otp/verify', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					bankEmail,
					otp,
					context: { purpose, lenderId: selectedLenderId }
				})
			});

			const verifyJson = await verifyRes.json();

			if (!verifyRes.ok) {
				errorMessage = verifyJson.error ?? 'Invalid OTP. Please try again.';
				otpDigits = ['', '', '', '', '', ''];
				return;
			}

			pmsOtpToken = verifyJson.data?.pmsOtpToken ?? '';

			// Step 2: create assignment
			const onboardRes = await secureFetch('/api/pms/lender-assignments/onboard', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'x-pms-otp-token': pmsOtpToken
				},
				body: JSON.stringify({ lenderId: selectedLenderId, bankEmail })
			});

			const onboardJson = await onboardRes.json();

			if (!onboardRes.ok) {
				errorMessage = onboardJson.error ?? 'Failed to create assignment. Please try again.';
				return;
			}

			completedAt = new Date();
			currentStep = 4;
		} catch {
			errorMessage = 'Network error. Please try again.';
		} finally {
			isLoading = false;
		}
	}

	// ── OTP paste handler ─────────────────────────────────────────
	function handleOtpPaste(e: ClipboardEvent) {
		const pasted = e.clipboardData?.getData('text').replace(/\D/g, '').slice(0, 6) ?? '';
		if (pasted.length === 6) {
			e.preventDefault();
			otpDigits = pasted.split('');
		}
	}
</script>

<svelte:head>
	<title>
		{purpose === 'monthly_renewal' ? 'Renew Lender Verification' : 'Add Lender'} — DigitalDSA RM
	</title>
</svelte:head>

<div class="mx-auto max-w-2xl p-6">
	<!-- Back link -->
	<a href="/dashboard/rm/policies" class="mb-6 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
		<ArrowLeft size={14} />
		Back to Policy Library
	</a>

	<!-- Step indicator -->
	<div class="mb-8 flex items-center gap-0">
		{#each steps as step, i (step.number)}
			<div class="flex items-center">
				<div class="flex flex-col items-center">
					<div
						class="flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors
						{currentStep === step.number
							? 'bg-amber-600 text-white'
							: currentStep > step.number
								? 'bg-green-500 text-white'
								: 'bg-gray-100 text-gray-400'}"
					>
						{#if currentStep > step.number}
							<CheckCircle size={16} />
						{:else}
							{step.number}
						{/if}
					</div>
					<span class="mt-1 text-xs {currentStep === step.number ? 'text-amber-700 font-medium' : 'text-gray-400'}">{step.label}</span>
				</div>
				{#if i < steps.length - 1}
					<div class="mb-4 mx-2 h-px w-8 bg-gray-200 sm:w-12"></div>
				{/if}
			</div>
		{/each}
	</div>

	<!-- Error message -->
	{#if errorMessage}
		<div class="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
			{errorMessage}
		</div>
	{/if}

	<!-- Step 1 — Lender selection -->
	{#if currentStep === 1}
		<div class="rounded-xl border border-gray-200 bg-white p-6">
			<h2 class="mb-1 text-lg font-semibold text-gray-900">Select Lender</h2>
			<p class="mb-5 text-sm text-gray-500">Choose the bank or NBFC you represent as a relationship manager.</p>

			<div class="max-h-96 space-y-1.5 overflow-y-auto">
				{#each data.lenders as lender (lender.lenderId)}
					<button
						type="button"
						disabled={lender.alreadyAssigned}
						onclick={() => selectLender(lender.lenderId)}
						class="flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors
						{lender.alreadyAssigned
							? 'cursor-not-allowed border-gray-100 bg-gray-50 opacity-50'
							: selectedLenderId === lender.lenderId
								? 'border-amber-300 bg-amber-50'
								: 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}"
					>
						<Building2 size={18} class={selectedLenderId === lender.lenderId ? 'text-amber-600' : 'text-gray-400'} />
						<div class="flex-1 min-w-0">
							<p class="truncate text-sm font-medium text-gray-900">{lender.lenderName}</p>
							<p class="text-xs text-gray-400">{lender.classification}</p>
						</div>
						{#if lender.alreadyAssigned}
							<span class="shrink-0 text-xs text-green-600">Assigned</span>
						{:else if selectedLenderId === lender.lenderId}
							<CheckCircle size={16} class="shrink-0 text-amber-600" />
						{/if}
					</button>
				{/each}
			</div>

			<button
				type="button"
				onclick={proceedFromStep1}
				class="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
				disabled={!selectedLenderId}
			>
				Continue <ChevronRight size={16} />
			</button>
		</div>
	{/if}

	<!-- Step 2 — Bank email -->
	{#if currentStep === 2}
		<div class="rounded-xl border border-gray-200 bg-white p-6">
			<div class="mb-4 flex items-center gap-3">
				<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
					<Mail size={18} class="text-amber-600" />
				</div>
				<div>
					<h2 class="text-lg font-semibold text-gray-900">Enter Bank Email</h2>
					<p class="text-sm text-gray-500">{selectedLender?.lenderName}</p>
				</div>
			</div>

			<p class="mb-4 text-sm text-gray-600">
				Enter your official <strong>{selectedLender?.lenderName}</strong> email address.
				The domain must end with <code class="rounded bg-gray-100 px-1 py-0.5 text-xs">@{selectedLender?.officialEmailDomain}</code>.
			</p>

			<label for="bankEmail" class="mb-1.5 block text-sm font-medium text-gray-700">Official bank email</label>
			<input
				id="bankEmail"
				type="email"
				bind:value={bankEmail}
				placeholder="you@{selectedLender?.officialEmailDomain}"
				class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
				onkeydown={(e) => { if (e.key === 'Enter') sendOtp(); }}
			/>

			<div class="mt-4 flex gap-3">
				<button
					type="button"
					onclick={() => { currentStep = 1; errorMessage = ''; }}
					class="flex items-center gap-1.5 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
				>
					<ArrowLeft size={14} /> Back
				</button>
				<button
					type="button"
					onclick={sendOtp}
					disabled={isLoading || !bankEmail}
					class="flex flex-1 items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
				>
					{#if isLoading}
						<Loader2 size={15} class="animate-spin" />
						Sending…
					{:else}
						Send verification code <ChevronRight size={15} />
					{/if}
				</button>
			</div>
		</div>
	{/if}

	<!-- Step 3 — OTP entry -->
	{#if currentStep === 3}
		<div class="rounded-xl border border-gray-200 bg-white p-6">
			<div class="mb-4 flex items-center gap-3">
				<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
					<ShieldCheck size={18} class="text-blue-600" />
				</div>
				<div>
					<h2 class="text-lg font-semibold text-gray-900">Enter Verification Code</h2>
					<p class="text-sm text-gray-500">Sent to {bankEmail}</p>
				</div>
			</div>

			<p class="mb-5 text-sm text-gray-600">
				A 6-digit code was sent to <strong>{bankEmail}</strong>. It expires in 10 minutes.
			</p>

			<!-- 6-box OTP input -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div class="flex justify-center gap-2" onpaste={handleOtpPaste}>
				{#each otpDigits as digit, i (i)}
					<input
						id="otp-{i}"
						type="text"
						inputmode="numeric"
						maxlength="1"
						value={digit}
						oninput={(e) => handleOtpInput(i, e)}
						onkeydown={(e) => handleOtpKeydown(i, e)}
						class="h-12 w-10 rounded-lg border border-gray-300 text-center text-xl font-bold outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
					/>
				{/each}
			</div>

			<div class="mt-6 flex gap-3">
				<button
					type="button"
					onclick={() => { currentStep = 2; errorMessage = ''; otpDigits = ['', '', '', '', '', '']; }}
					class="flex items-center gap-1.5 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
				>
					<ArrowLeft size={14} /> Back
				</button>
				<button
					type="button"
					onclick={verifyOtp}
					disabled={isLoading || otp.length !== 6}
					class="flex flex-1 items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
				>
					{#if isLoading}
						<Loader2 size={15} class="animate-spin" />
						Verifying…
					{:else}
						Verify & Confirm <ChevronRight size={15} />
					{/if}
				</button>
			</div>
		</div>
	{/if}

	<!-- Step 4 — Confirmation -->
	{#if currentStep === 4}
		<div class="rounded-xl border border-gray-200 bg-white p-8 text-center">
			<div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
				<CheckCircle size={32} class="text-green-600" />
			</div>
			<h2 class="mb-2 text-xl font-bold text-gray-900">
				{purpose === 'monthly_renewal' ? 'Verification renewed!' : 'Lender assigned!'}
			</h2>
			<p class="mb-1 text-sm text-gray-600">
				You are now assigned to <strong>{selectedLender?.lenderName}</strong>.
			</p>
			<p class="text-sm text-gray-400">
				Monthly verification due by{' '}
				{completedAt
					? new Date(completedAt.getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', {
							day: 'numeric',
							month: 'long',
							year: 'numeric'
						})
					: '30 days from now'}.
			</p>
			<a
				href="/dashboard/rm/policies"
				class="mt-6 inline-flex items-center gap-2 rounded-lg bg-amber-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-amber-700"
			>
				Go to Policy Library →
			</a>
		</div>
	{/if}
</div>
