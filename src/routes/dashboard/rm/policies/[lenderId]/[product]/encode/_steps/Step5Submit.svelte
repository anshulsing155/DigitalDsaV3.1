<script lang="ts">
	import { ShieldCheck, Send, CheckCircle, AlertTriangle, ArrowLeft } from 'lucide-svelte';

	let {
		finalScore,
		bankEmail,
		isLoading,
		pmsOtpToken,
		onSendOtp,
		onVerifyOtp,
		onSubmit,
		onTokenReceived
	}: {
		finalScore: number | null;
		bankEmail: string;
		isLoading: boolean;
		pmsOtpToken: string;
		onSendOtp: () => Promise<{ ok: boolean; error?: string }>;
		onVerifyOtp: (otp: string) => Promise<{ ok: boolean; token?: string; error?: string }>;
		onSubmit: (token: string) => Promise<{ ok: boolean; error?: string }>;
		onTokenReceived: (token: string) => void;
	} = $props();

	let showOtpModal = $state(false);
	let otpDigits = $state(['', '', '', '', '', '']);
	let otpSent = $state(false);
	let localError = $state('');
	let localLoading = $state(false);
	let submitted = $state(false);

	const otp = $derived(otpDigits.join(''));

	function confidenceBadge(score: number | null): { cls: string; label: string } {
		if (score === null) return { cls: 'bg-gray-100 text-gray-500', label: 'N/A' };
		if (score >= 80) return { cls: 'bg-green-100 text-green-700', label: `${score}%` };
		if (score >= 60) return { cls: 'bg-amber-100 text-amber-700', label: `${score}%` };
		return { cls: 'bg-red-100 text-[var(--color-error)]', label: `${score}%` };
	}

	const badge = $derived(confidenceBadge(finalScore));

	async function openOtpModal() {
		localError = '';
		showOtpModal = true;

		// Auto-send OTP on modal open if not already sent
		if (!otpSent) {
			localLoading = true;
			const result = await onSendOtp();
			localLoading = false;
			if (!result.ok) {
				localError = result.error ?? 'Failed to send OTP.';
				showOtpModal = false;
				return;
			}
			otpSent = true;
		}
	}

	function handleOtpInput(index: number, e: Event) {
		const input = e.target as HTMLInputElement;
		const val = input.value.replace(/\D/g, '').slice(-1);
		otpDigits[index] = val;
		if (val && index < 5) {
			document.getElementById(`submit-otp-${index + 1}`)?.focus();
		}
	}

	function handleOtpKeydown(index: number, e: KeyboardEvent) {
		if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
			document.getElementById(`submit-otp-${index - 1}`)?.focus();
		}
	}

	function handleOtpPaste(e: ClipboardEvent) {
		const pasted = e.clipboardData?.getData('text').replace(/\D/g, '').slice(0, 6) ?? '';
		if (pasted.length === 6) {
			e.preventDefault();
			otpDigits = pasted.split('');
		}
	}

	async function verifyAndSubmit() {
		if (otp.length !== 6) {
			localError = 'Please enter all 6 digits.';
			return;
		}

		localLoading = true;
		localError = '';

		// Step 1: verify OTP → receive pmsOtpToken
		const verifyResult = await onVerifyOtp(otp);
		if (!verifyResult.ok) {
			localError = verifyResult.error ?? 'Invalid OTP. Please try again.';
			otpDigits = ['', '', '', '', '', ''];
			localLoading = false;
			return;
		}

		const token = verifyResult.token!;
		onTokenReceived(token);

		// Step 2: submit policy with the token
		const submitResult = await onSubmit(token);
		localLoading = false;

		if (!submitResult.ok) {
			localError = submitResult.error ?? 'Submission failed. Please try again.';
			return;
		}

		showOtpModal = false;
		submitted = true;
	}
</script>

<div class="mx-auto max-w-2xl space-y-6">
	{#if submitted}
		<!-- Success state -->
		<div class="flex flex-col items-center justify-center rounded-xl border border-green-200 bg-green-50 py-16 text-center">
			<div class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
				<CheckCircle size={32} class="text-green-600" />
			</div>
			<h2 class="text-xl font-bold text-gray-900">Policy submitted for review</h2>
			<p class="mt-2 max-w-sm text-sm text-gray-500">
				Your policy encoding has been sent to admin for approval. You'll be notified
				when a decision is made.
			</p>
			<a
				href="/dashboard/rm/policies"
				class="mt-6 inline-flex items-center gap-2 rounded-lg bg-amber-600 px-6 py-2.5
				text-sm font-medium text-white hover:bg-amber-700"
			>
				Back to Policy Library →
			</a>
		</div>
	{:else}
		<div>
			<h1 class="text-xl font-bold text-gray-900">Submit for Approval</h1>
			<p class="mt-1 text-sm text-gray-500">
				Review the confidence summary, then verify your identity to submit this encoding
				for admin review. Confidence is advisory only and does not block submission.
			</p>
		</div>

		<!-- Confidence summary (advisory) -->
		<div class="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
			<h2 class="text-sm font-semibold text-gray-800">Confidence Summary</h2>
			<div class="flex items-center justify-between">
				<span class="text-sm text-gray-600">Overall policy confidence</span>
				<span class="rounded-full px-3 py-1 text-sm font-semibold {badge.cls}">
					{badge.label}
				</span>
			</div>
			{#if finalScore !== null && finalScore < 80}
				<div class="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-xs text-amber-700">
					<AlertTriangle size={13} class="mt-0.5 shrink-0" />
					<span>
						Score below 80% — admin will review with extra scrutiny.
						This does not block submission.
					</span>
				</div>
			{/if}
			<p class="text-xs text-gray-400">
				Confidence is calculated from AI encoding accuracy across all clauses.
				Final approval is always made by admin.
			</p>
		</div>

		<!-- Bank email display -->
		<div class="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-5 py-4">
			<ShieldCheck size={20} class="shrink-0 text-blue-500" />
			<div>
				<p class="text-sm font-medium text-gray-800">OTP will be sent to</p>
				<p class="text-sm text-gray-500">{bankEmail || 'your registered bank email'}</p>
			</div>
		</div>

		<!-- Submit button -->
		<button
			type="button"
			onclick={openOtpModal}
			disabled={isLoading}
			class="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-3
			text-sm font-semibold text-white transition-colors hover:bg-amber-700 disabled:opacity-40"
		>
			<Send size={16} /> Submit for Admin Approval
		</button>
	{/if}
</div>

<!-- ── OTP Modal ────────────────────────────────────────────────────────────── -->
{#if showOtpModal}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div
		role="presentation"
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
		onclick={(e) => { if (e.target === e.currentTarget) showOtpModal = false; }}
	>
		<div role="dialog" aria-modal="true" aria-label="Identity verification" class="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl">
			<div class="mb-4 flex items-center gap-3">
				<div class="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50">
					<ShieldCheck size={20} class="text-blue-600" />
				</div>
				<div>
					<h3 class="text-base font-semibold text-gray-900">Verify identity</h3>
					<p class="text-xs text-gray-500">
						{otpSent ? `Code sent to ${bankEmail}` : 'Sending code…'}
					</p>
				</div>
			</div>

			{#if localError}
				<div class="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-[var(--color-error)]">
					{localError}
				</div>
			{/if}

			<!-- 6-box OTP input -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div class="mb-5 flex justify-center gap-2" onpaste={handleOtpPaste}>
				{#each otpDigits as digit, i (i)}
					<input
						id="submit-otp-{i}"
						type="text"
						inputmode="numeric"
						maxlength="1"
						value={digit}
						oninput={(e) => handleOtpInput(i, e)}
						onkeydown={(e) => handleOtpKeydown(i, e)}
						class="h-12 w-10 rounded-lg border border-gray-300 text-center text-xl font-bold
						outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
					/>
				{/each}
			</div>

			<div class="flex gap-3">
				<button
					type="button"
					onclick={() => { showOtpModal = false; localError = ''; otpDigits = ['','','','','','']; }}
					class="flex items-center gap-1.5 rounded-lg border border-gray-200 px-4 py-2.5
					text-sm font-medium text-gray-600 hover:bg-gray-50"
				>
					<ArrowLeft size={14} /> Cancel
				</button>
				<button
					type="button"
					onclick={verifyAndSubmit}
					disabled={localLoading || otp.length !== 6}
					class="flex flex-1 items-center justify-center gap-2 rounded-lg bg-amber-600 px-4
					py-2.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-40"
				>
					{#if localLoading}
						<span class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
						Submitting…
					{:else}
						Verify &amp; Submit
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}
