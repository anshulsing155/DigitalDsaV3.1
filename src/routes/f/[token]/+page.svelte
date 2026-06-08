<script lang="ts">
	/**
	 * Shared Form Page — /f/[token]
	 * ═══════════════════════════════════════════════════════════════════
	 * Public, white-label page for applicant self-fill.
	 *
	 * Flow:
	 *   1. Server validates token → renders page or error
	 *   2. If OTP required → show mobile input + OTP verification
	 *   3. After verification → render the income/credit form
	 *   4. Applicant fills form → auto-saves as draft
	 *   5. Final submit → marks link as completed
	 *
	 * Design:
	 *   - Clean, minimal branding (white-label ready)
	 *   - Mobile-first responsive layout
	 *   - Progressive disclosure (step by step)
	 *   - Clear feedback at every step
	 * ═══════════════════════════════════════════════════════════════════
	 */

	import type { PageData } from './$types';
	import type { IncomeProfileType, IncomeSourceEntry } from '$lib/types/incomeProfile';
	import IncomeProfileSelector from '$lib/components/IncomeProfileSelector.svelte';
	import IncomeSourceForm from '$lib/components/IncomeSourceForm.svelte';
	import IncomeSourceEntries from '$lib/components/IncomeSourceEntries.svelte';
	import CreditScoreSection from '$lib/components/CreditScoreSection.svelte';
	import DocumentUploadSection from '$lib/components/DocumentUploadSection.svelte';
	import { AlertCircle, Check, Shield, Calendar, ArrowRight, Info } from '$lib/utils/iconRegistry';
	import { invalidateAll } from '$app/navigation';

	let { data }: { data: PageData } = $props();

	// ── State: OTP Verification ──────────────────────────────────
	let otpStep: 'phone' | 'otp' | 'verified' = $state('verified');

	$effect(() => {
		otpStep = data.link?.requiresOtp ? 'phone' : 'verified';
	});
	let mobileNumber = $state('');
	let otpCode = $state('');
	let otpError = $state('');
	let otpLoading = $state(false);
	let otpSent = $state(false);

	// ── State: OTP Resend Timer (P1.3) ──────────────────────────
	const OTP_COOLDOWN_SECS = 30;
	let lastOtpSentAt = $state(0);
	let otpCountdown = $state(OTP_COOLDOWN_SECS);
	let isResendDisabled = $state(false);
	let otpCountdownInterval: ReturnType<typeof setInterval> | null = null;

	function startOtpCountdown() {
		isResendDisabled = true;
		otpCountdown = OTP_COOLDOWN_SECS;
		if (otpCountdownInterval) clearInterval(otpCountdownInterval);
		otpCountdownInterval = setInterval(() => {
			if (otpCountdown > 0) {
				otpCountdown--;
			} else {
				if (otpCountdownInterval) clearInterval(otpCountdownInterval);
				otpCountdownInterval = null;
				isResendDisabled = false;
			}
		}, 1000);
	}

	// ── State: Session Timeout Warning (P1.4) ───────────────────
	let showTimeoutWarning = $state(false);
	let timeoutWarningMessage = $state('');
	let sessionWarnings = $state({ fiveMin: false, oneMin: false });
	let sessionCheckInterval: ReturnType<typeof setInterval> | null = null;

	function startSessionMonitoring() {
		if (!data.link?.expiresAt) return;
		if (sessionCheckInterval) clearInterval(sessionCheckInterval);

		sessionCheckInterval = setInterval(() => {
			const now = Date.now();
			const expiry = new Date(data.link!.expiresAt).getTime();
			const msLeft = expiry - now;
			const minsLeft = Math.floor(msLeft / 60_000);

			if (minsLeft <= 5 && minsLeft > 1 && !sessionWarnings.fiveMin) {
				sessionWarnings.fiveMin = true;
				timeoutWarningMessage =
					'Your session will expire in 5 minutes. Please complete and submit your form soon.';
				showTimeoutWarning = true;
			}

			if (minsLeft <= 1 && !sessionWarnings.oneMin) {
				sessionWarnings.oneMin = true;
				timeoutWarningMessage =
					'Your session will expire in less than 1 minute! Please submit now.';
				showTimeoutWarning = true;
			}

			if (msLeft <= 0) {
				if (sessionCheckInterval) clearInterval(sessionCheckInterval);
				sessionCheckInterval = null;
				// Re-run the server load — it will detect the expired token and
				// render the "link expired" state without nuking client-side UI state.
				invalidateAll();
			}
		}, 10_000);
	}

	// Start session monitoring once OTP is verified (or immediately if no OTP)
	$effect(() => {
		if (otpStep === 'verified' && data.link?.expiresAt) {
			startSessionMonitoring();
		}
	});

	// Cleanup all intervals on destroy
	$effect(() => {
		return () => {
			if (otpCountdownInterval) clearInterval(otpCountdownInterval);
			if (sessionCheckInterval) clearInterval(sessionCheckInterval);
		};
	});

	// ── State: Form Data ─────────────────────────────────────────
	let currentStep = $state(0);
	let selectedProfiles: IncomeProfileType[] = $state([]);
	let incomeEntries: IncomeSourceEntry[] = $state([]);
	let editingEntry: IncomeSourceEntry | null = $state(null);
	let creditScore: number | string = $state('');
	let whyLowCredit: string[] = $state([]);
	let hasRunningObligations = $state('');

	// ── State: Document Upload ───────────────────────────────────
	let uploadedFiles: Array<{
		id: string;
		docId: string;
		name: string;
		size: number;
		type: string;
		status: 'uploading' | 'uploaded' | 'error';
		url?: string;
		error?: string;
	}> = $state([]);

	// ── State: Submission ────────────────────────────────────────
	let isSubmitting = $state(false);
	let submitSuccess = $state(false);
	let submitError = $state('');
	let autoSaveTimer: ReturnType<typeof setTimeout> | null = $state(null);

	// ── Derive if documents section is included ──────────────────
	let hasDocumentsSection = $derived(data.link?.sections?.includes('documents') ?? false);

	// ── Prefill from link data ───────────────────────────────────
	$effect(() => {
		if (data.link?.prefilledData) {
			const prefill = data.link.prefilledData as Record<string, any>;
			if (prefill.selectedProfiles) selectedProfiles = prefill.selectedProfiles;
			if (prefill.creditScore) creditScore = prefill.creditScore;
		}
	});

	// ── Steps configuration ──────────────────────────────────────
	const steps = $derived.by(() => {
		const s: { id: string; label: string; complete: boolean }[] = [];

		if (data.link?.sections?.includes('income')) {
			s.push({
				id: 'profiles',
				label: 'Income Sources',
				complete: selectedProfiles.length > 0
			});
			s.push({
				id: 'details',
				label: 'Income Details',
				complete: incomeEntries.length > 0
			});
		}

		if (data.link?.sections?.includes('credit')) {
			s.push({
				id: 'credit',
				label: 'Credit Score',
				complete: Number(creditScore) >= 300 && hasRunningObligations !== ''
			});
		}

		if (hasDocumentsSection) {
			s.push({
				id: 'documents',
				label: 'Documents',
				complete: uploadedFiles.some((f) => f.status === 'uploaded')
			});
		}

		return s;
	});

	// ── OTP Functions ────────────────────────────────────────────
	async function sendOtp() {
		if (!mobileNumber || mobileNumber.length < 10) {
			otpError = 'Please enter a valid 10-digit mobile number';
			return;
		}

		// Client-side cooldown check
		if (Date.now() - lastOtpSentAt < OTP_COOLDOWN_SECS * 1000) {
			otpError = 'Please wait before requesting another OTP';
			return;
		}

		otpLoading = true;
		otpError = '';

		try {
			const res = await fetch('/api/share-link/verify-otp', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					action: 'send',
					token: data.token,
					mobileNumber
				})
			});

			const result = await res.json();

			if (result.success) {
				otpStep = 'otp';
				otpSent = true;
				lastOtpSentAt = Date.now();
				startOtpCountdown();
			} else {
				otpError = result.error || 'Failed to send OTP';
			}
		} catch {
			otpError = 'Network error. Please try again.';
		} finally {
			otpLoading = false;
		}
	}

	async function verifyOtp() {
		if (!otpCode || otpCode.length !== 6) {
			otpError = 'Please enter the 6-digit OTP';
			return;
		}

		otpLoading = true;
		otpError = '';

		try {
			const res = await fetch('/api/share-link/verify-otp', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					action: 'verify',
					token: data.token,
					mobileNumber,
					otp: otpCode
				})
			});

			const result = await res.json();

			if (result.success && result.verified) {
				otpStep = 'verified';
			} else {
				otpError = result.error || 'Verification failed';
			}
		} catch {
			otpError = 'Network error. Please try again.';
		} finally {
			otpLoading = false;
		}
	}

	// ── Auto-save (debounced) ────────────────────────────────────
	function scheduleAutoSave() {
		if (autoSaveTimer) clearTimeout(autoSaveTimer);
		autoSaveTimer = setTimeout(() => saveData('save'), 5000);
	}

	// ── Save / Submit ────────────────────────────────────────────
	async function saveData(action: 'save' | 'submit') {
		if (isSubmitting) return;
		isSubmitting = true;
		submitError = '';

		try {
			// Build document metadata (only successfully uploaded files)
			const documentMeta = uploadedFiles
				.filter((f) => f.status === 'uploaded')
				.map((f) => ({
					id: f.id,
					docId: f.docId,
					name: f.name,
					size: f.size,
					type: f.type,
					url: f.url
				}));

			const res = await fetch('/api/share-link/submit', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					token: data.token,
					mobileNumber,
					action,
					data: {
						selectedProfiles,
						incomeEntries,
						creditScore,
						whyLowCredit,
						hasRunningObligations,
						...(documentMeta.length > 0 && { uploadedDocuments: documentMeta })
					}
				})
			});

			const result = await res.json();

			if (result.success) {
				if (action === 'submit') {
					submitSuccess = true;
				}
			} else {
				submitError = result.error || 'Failed to save';
			}
		} catch {
			submitError = 'Network error. Please try again.';
		} finally {
			isSubmitting = false;
		}
	}

	// ── Form Handlers ────────────────────────────────────────────
	function handleAddEntry(entry: IncomeSourceEntry) {
		incomeEntries = [...incomeEntries, entry];
		scheduleAutoSave();
	}

	function handleUpdateEntry(entry: IncomeSourceEntry) {
		incomeEntries = incomeEntries.map((e) => (e.id === entry.id ? entry : e));
		editingEntry = null;
		scheduleAutoSave();
	}

	function handleDeleteEntry(id: string) {
		incomeEntries = incomeEntries.filter((e) => e.id !== id);
		scheduleAutoSave();
	}

	function handleEditEntry(entry: IncomeSourceEntry) {
		editingEntry = entry;
	}

	// ── Document Handlers ────────────────────────────────────────
	function handleDocFilesChange() {
		scheduleAutoSave();
	}

	// ── Get the "next" step label for navigation buttons ─────────
	function getNextStepLabel(currentIdx: number): string {
		if (currentIdx + 1 < steps.length) {
			return `Next: ${steps[currentIdx + 1].label}`;
		}
		return 'Next';
	}

	// ── Check if all required steps are complete ─────────────────
	// Documents step is always optional — don't block submit if docs are incomplete
	let canSubmit = $derived(steps.filter((s) => s.id !== 'documents').every((s) => s.complete));

	// ── Expiry display ───────────────────────────────────────────
	let expiryText = $derived.by(() => {
		if (!data.link?.expiresAt) return '';
		const expiry = new Date(data.link.expiresAt);
		const now = new Date();
		const hoursLeft = Math.max(
			0,
			Math.round((expiry.getTime() - now.getTime()) / (1000 * 60 * 60))
		);

		if (hoursLeft > 48) {
			return `${Math.round(hoursLeft / 24)} days remaining`;
		}
		if (hoursLeft > 1) {
			return `${hoursLeft} hours remaining`;
		}
		return 'Expires soon';
	});
</script>

<svelte:head>
	<title>{data.link?.customTitle || 'Shared Form'}</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="min-h-screen bg-[var(--form-bg-alt)]">
	<!-- ══════════════════════════════════════════════════════════════
	     HEADER — Minimal, clean, white-label
	     ══════════════════════════════════════════════════════════════ -->
	<header class="border-b border-[var(--form-border)] bg-[var(--form-bg-card)] shadow-sm">
		<div class="mx-auto max-w-3xl px-4 py-4 sm:px-6">
			<!-- DSA Branding (if available) -->
			{#if data.branding?.firmName || data.branding?.logoUrl}
				<div class="mb-3 flex items-center gap-3 border-b border-[var(--form-border)] pb-3">
					{#if data.branding.logoUrl}
						<img
							src={data.branding.logoUrl}
							alt={data.branding.firmName || 'Logo'}
							class="h-8 w-8 rounded-lg object-cover"
						/>
					{:else}
						<div
							class="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600"
						>
							<span class="text-sm font-bold text-white">
								{(data.branding.firmName || 'D').charAt(0).toUpperCase()}
							</span>
						</div>
					{/if}
					<span class="text-sm font-semibold text-[var(--form-text)]">
						{data.branding.firmName}
					</span>
				</div>
			{/if}

			<div class="flex items-center justify-between">
				<div>
					<h1 class="text-lg font-bold text-[var(--form-text)] sm:text-xl">
						{data.link?.customTitle || 'Income & Credit Information'}
					</h1>
					{#if data.link?.customSubtitle}
						<p class="mt-0.5 text-xs text-[var(--form-text-secondary)] sm:text-sm">
							{data.link.customSubtitle}
						</p>
					{/if}
				</div>

				{#if expiryText}
					<div class="flex items-center gap-1.5 text-xs text-[var(--form-text-muted)]">
						<Calendar class="h-3.5 w-3.5" />
						<span>{expiryText}</span>
					</div>
				{/if}
			</div>
		</div>
	</header>

	<main class="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
		<!-- ══════════════════════════════════════════════════════════
		     ERROR STATE — Invalid or expired link
		     ══════════════════════════════════════════════════════════ -->
		{#if !data.valid}
			<div class="rounded-2xl bg-[var(--form-bg-card)] p-8 text-center shadow-lg">
				<div
					class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30"
				>
					<AlertCircle class="h-8 w-8 text-red-500" />
				</div>
				<h2 class="mb-2 text-xl font-bold text-[var(--form-text)]">Link Unavailable</h2>
				<p class="mx-auto max-w-md text-[var(--form-text-secondary)]">
					{data.error ||
						'This link is no longer valid. Please contact the person who shared it with you.'}
				</p>
			</div>

			<!-- ══════════════════════════════════════════════════════════
		     SUCCESS STATE — Form submitted
		     ══════════════════════════════════════════════════════════ -->
		{:else if submitSuccess}
			<div class="rounded-2xl bg-[var(--form-bg-card)] p-8 text-center shadow-lg">
				<div
					class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30"
				>
					<Check class="h-8 w-8 text-green-600" />
				</div>
				<h2 class="mb-2 text-xl font-bold text-[var(--form-text)]">Submitted Successfully!</h2>
				<p class="mx-auto max-w-md text-[var(--form-text-secondary)]">
					Your income and credit information has been submitted. You can close this page now.
				</p>
				{#if uploadedFiles.filter((f) => f.status === 'uploaded').length > 0}
					<p class="mt-2 text-sm text-green-600">
						{uploadedFiles.filter((f) => f.status === 'uploaded').length} document(s) uploaded successfully.
					</p>
				{/if}
			</div>

			<!-- ══════════════════════════════════════════════════════════
		     OTP VERIFICATION — Phone + OTP input
		     ══════════════════════════════════════════════════════════ -->
		{:else if otpStep !== 'verified'}
			<div class="rounded-2xl bg-[var(--form-bg-card)] p-6 shadow-lg sm:p-8">
				<div class="mb-6 text-center">
					<div
						class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30"
					>
						<Shield class="h-7 w-7 text-blue-600" />
					</div>
					<h2 class="text-lg font-bold text-[var(--form-text)]">Verify Your Identity</h2>
					<p class="mt-1 text-sm text-[var(--form-text-secondary)]">
						For your security, please verify your mobile number before accessing the form.
					</p>
				</div>

				{#if otpStep === 'phone'}
					<!-- Mobile Number Input -->
					<div class="mx-auto max-w-sm">
						<label
							for="share_mobile"
							class="mb-1.5 block text-sm font-medium text-[var(--form-text-secondary)]"
						>
							Mobile Number
						</label>
						<div class="flex gap-2">
							<span
								class="flex items-center rounded-lg border border-[var(--form-border)] bg-[var(--form-bg-alt)] px-3 text-sm text-[var(--form-text-secondary)]"
							>
								+91
							</span>
							<input
								id="share_mobile"
								type="tel"
								bind:value={mobileNumber}
								maxlength="10"
								placeholder="Enter 10-digit number"
								class="flex-1 rounded-lg border border-[var(--form-border)] bg-[var(--form-bg-card)] px-4 py-3
									text-sm text-[var(--form-text)]
									outline-none placeholder:text-[var(--form-text-muted)] focus:border-blue-500 focus:ring-2
									focus:ring-blue-500"
							/>
						</div>

						{#if otpError}
							<p class="mt-2 text-xs text-red-500">{otpError}</p>
						{/if}

						<button
							onclick={sendOtp}
							disabled={otpLoading || mobileNumber.length < 10}
							class="mt-4 w-full rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white
								transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
						>
							{otpLoading ? 'Sending...' : 'Send OTP'}
						</button>
					</div>
				{:else if otpStep === 'otp'}
					<!-- OTP Input -->
					<div class="mx-auto max-w-sm">
						<p class="mb-4 text-center text-sm text-[var(--form-text-secondary)]">
							OTP sent to <strong>+91 {mobileNumber}</strong>
						</p>

						<label
							for="share_otp"
							class="mb-1.5 block text-sm font-medium text-[var(--form-text-secondary)]"
						>
							Enter OTP
						</label>
						<input
							id="share_otp"
							type="text"
							bind:value={otpCode}
							maxlength="6"
							placeholder="6-digit OTP"
							class="w-full rounded-lg border border-[var(--form-border)] bg-[var(--form-bg-card)] px-4 py-3 text-center text-lg
								tracking-widest text-[var(--form-text)]
								outline-none placeholder:text-[var(--form-text-muted)] focus:border-blue-500 focus:ring-2
								focus:ring-blue-500"
						/>

						{#if otpError}
							<p class="mt-2 text-center text-xs text-red-500">{otpError}</p>
						{/if}

						<button
							onclick={verifyOtp}
							disabled={otpLoading || otpCode.length < 6}
							class="mt-4 w-full rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white
								transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
						>
							{otpLoading ? 'Verifying...' : 'Verify OTP'}
						</button>

						<div class="mt-3 flex justify-between text-xs">
							<button
								onclick={() => {
									otpStep = 'phone';
									otpCode = '';
									otpError = '';
								}}
								class="text-blue-600 hover:underline"
							>
								Change number
							</button>
							<button
								onclick={sendOtp}
								disabled={otpLoading || isResendDisabled}
								class="text-blue-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
							>
								{isResendDisabled ? `Resend OTP (${otpCountdown}s)` : 'Resend OTP'}
							</button>
						</div>
					</div>
				{/if}
			</div>

			<!-- ══════════════════════════════════════════════════════════
		     FORM CONTENT — After OTP verification
		     ══════════════════════════════════════════════════════════ -->
		{:else}
			<!-- Step Progress -->
			{#if steps.length > 1}
				<div class="mb-6 flex items-center gap-2 overflow-x-auto pb-2">
					{#each steps as step, i}
						<button
							onclick={() => {
								currentStep = i;
							}}
							class="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-all
								{currentStep === i
								? 'bg-blue-600 text-white shadow-md'
								: step.complete
									? 'border border-green-200 bg-green-100 text-green-700 dark:border-green-700 dark:bg-green-900/30 dark:text-green-400'
									: 'border border-[var(--form-border)] bg-[var(--form-bg-alt)] text-[var(--form-text-secondary)]'}"
						>
							{#if step.complete && currentStep !== i}
								<Check class="h-4 w-4" />
							{:else}
								<span
									class="flex h-5 w-5 items-center justify-center rounded-full text-xs
									{currentStep === i ? 'bg-white/20' : 'bg-[var(--form-bg-alt)] text-[var(--form-text-secondary)]'}"
								>
									{i + 1}
								</span>
							{/if}
							{step.label}
						</button>

						{#if i < steps.length - 1}
							<ArrowRight class="h-4 w-4 shrink-0 text-[var(--form-text-muted)]" />
						{/if}
					{/each}
				</div>
			{/if}

			<!-- Step Content -->
			<div class="rounded-2xl bg-[var(--form-bg-card)] p-4 shadow-lg sm:p-6">
				{#if steps[currentStep]?.id === 'profiles'}
					<IncomeProfileSelector
						bind:selectedProfiles
						answersContext={{}}
						onSelectionChange={() => scheduleAutoSave()}
					/>

					{#if selectedProfiles.length > 0}
						<div class="mt-6 flex justify-end">
							<button
								onclick={() => {
									currentStep = 1;
								}}
								class="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white
									transition-colors hover:bg-blue-700"
							>
								{getNextStepLabel(0)}
								<ArrowRight class="h-4 w-4" />
							</button>
						</div>
					{/if}
				{:else if steps[currentStep]?.id === 'details'}
					<!-- Income Form + Entries -->
					<IncomeSourceForm
						{selectedProfiles}
						existingEntries={incomeEntries}
						onAddEntry={handleAddEntry}
						onUpdateEntry={handleUpdateEntry}
						{editingEntry}
						onCancelEdit={() => {
							editingEntry = null;
						}}
						filledBy="applicant"
					/>

					{#if incomeEntries.length > 0}
						<div class="mt-6 border-t border-[var(--form-border)] pt-6">
							<IncomeSourceEntries
								entries={incomeEntries}
								onEdit={handleEditEntry}
								onDelete={handleDeleteEntry}
							/>
						</div>

						<div class="mt-6 flex justify-end">
							<button
								onclick={() => {
									currentStep = currentStep + 1;
								}}
								class="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white
									transition-colors hover:bg-blue-700"
							>
								{getNextStepLabel(currentStep)}
								<ArrowRight class="h-4 w-4" />
							</button>
						</div>
					{/if}
				{:else if steps[currentStep]?.id === 'credit'}
					<CreditScoreSection
						bind:creditScore
						bind:whyLowCredit
						onAnswerChange={() => scheduleAutoSave()}
					/>

					<!-- Obligations question (moved out of CreditScoreSection) -->
					{#if Number(creditScore) >= 300}
						<div
							class="mt-6 rounded-xl border border-[var(--form-border)] bg-[var(--form-bg-card)] p-5"
						>
							<p class="mb-3 font-paragraph text-sm font-medium text-[var(--form-text)]">
								Does this applicant have any running loans / EMIs?
							</p>
							<div class="flex gap-3">
								{#each ['Yes', 'No'] as option}
									<button
										type="button"
										onclick={() => {
											hasRunningObligations = option.toLowerCase();
											scheduleAutoSave();
										}}
										class="rounded-lg border px-5 py-2 text-sm font-medium transition-colors
											{hasRunningObligations === option.toLowerCase()
											? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
											: 'border-[var(--form-border)] bg-[var(--form-bg)] text-[var(--form-text-secondary)] hover:bg-[var(--form-bg-alt)]'}"
									>
										{option}
									</button>
								{/each}
							</div>
						</div>
					{/if}

					{#if hasDocumentsSection && Number(creditScore) >= 300 && hasRunningObligations !== ''}
						<div class="mt-6 flex justify-end border-t border-[var(--form-border)] pt-4">
							<button
								onclick={() => {
									currentStep = currentStep + 1;
								}}
								class="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white
									transition-colors hover:bg-blue-700"
							>
								{getNextStepLabel(currentStep)}
								<ArrowRight class="h-4 w-4" />
							</button>
						</div>
					{/if}
				{:else if steps[currentStep]?.id === 'documents'}
					<!-- ══════════════════════════════════════════════════
					     DOCUMENT UPLOAD SECTION
					     ══════════════════════════════════════════════════ -->
					<DocumentUploadSection
						{selectedProfiles}
						hasObligations={hasRunningObligations === 'yes'}
						bind:uploadedFiles
						uploadUrl="/api/share-link/upload"
						token={data.token ?? ''}
						{mobileNumber}
						onFilesChange={handleDocFilesChange}
					/>

					<!-- Skip notice if no documents uploaded -->
					{#if uploadedFiles.filter((f) => f.status === 'uploaded').length === 0}
						<div
							class="mt-4 flex items-start gap-2.5 rounded-xl border border-stone-200 bg-stone-50 p-3 dark:border-stone-700 dark:bg-stone-900/20"
						>
							<Info class="mt-0.5 h-4 w-4 shrink-0 text-stone-500" />
							<p class="text-xs leading-relaxed text-stone-700 dark:text-stone-300">
								Document upload is <strong>optional</strong>. You can skip this step and submit your
								information without any documents. You can always provide them later.
							</p>
						</div>
					{/if}
				{/if}
			</div>

			<!-- Submit Bar -->
			{#if canSubmit}
				<div class="mt-6 rounded-2xl bg-[var(--form-bg-card)] p-4 shadow-lg sm:p-6">
					<div class="flex items-center justify-between gap-4">
						<div>
							<p class="text-sm font-semibold text-[var(--form-text)]">Ready to submit?</p>
							<p class="text-xs text-[var(--form-text-secondary)]">
								All sections are complete. Review your information before submitting.
								{#if hasDocumentsSection}
									<span class="text-[var(--form-text-muted)]">(Document upload is optional)</span>
								{/if}
							</p>
						</div>

						<button
							onclick={() => saveData('submit')}
							disabled={isSubmitting}
							class="rounded-lg bg-green-600 px-8 py-3 text-sm font-bold whitespace-nowrap
								text-white shadow-md transition-colors
								hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
						>
							{isSubmitting ? 'Submitting...' : 'Submit Information'}
						</button>
					</div>

					{#if submitError}
						<div
							class="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-700 dark:bg-red-900/20"
						>
							<p class="text-sm text-red-600 dark:text-red-400">{submitError}</p>
						</div>
					{/if}
				</div>
			{/if}
		{/if}
	</main>

	<!-- Session Timeout Warning Modal (P1.4) -->
	{#if showTimeoutWarning}
		<div
			class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
			role="dialog"
			aria-modal="true"
			aria-label="Session expiring warning"
		>
			<div class="mx-4 max-w-md rounded-2xl bg-[var(--form-bg-card)] p-6 shadow-xl">
				<div class="flex items-start gap-3">
					<div
						class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30"
					>
						<AlertCircle class="h-5 w-5 text-orange-600" />
					</div>
					<div class="flex-1">
						<h3 class="mb-2 text-lg font-bold text-[var(--form-text)]">Session Expiring Soon</h3>
						<p class="text-sm text-[var(--form-text-secondary)]">{timeoutWarningMessage}</p>
					</div>
				</div>
				<div class="mt-4 flex justify-end">
					<button
						onclick={() => {
							showTimeoutWarning = false;
						}}
						class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
					>
						Got it
					</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Footer -->
	<footer class="mt-12 border-t border-[var(--form-border)] bg-[var(--form-bg-card)] py-6">
		<div class="mx-auto max-w-3xl px-4 text-center sm:px-6">
			<p class="text-xs text-[var(--form-text-muted)]">
				Your information is encrypted and securely transmitted. This form was shared with you for
				the purpose of loan processing.
			</p>
			<p class="mt-2 text-[10px] text-[var(--form-text-muted)]">
				{#if data.branding?.firmName}
					{data.branding.firmName} &middot;
				{/if}
				Powered by DigitalDSA
			</p>
		</div>
	</footer>
</div>
