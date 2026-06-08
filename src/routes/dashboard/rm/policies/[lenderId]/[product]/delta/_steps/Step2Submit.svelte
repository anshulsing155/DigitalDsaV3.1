<script lang="ts">
	import { CheckCircle, Send, Loader, AlertTriangle } from 'lucide-svelte';
	import { secureFetch } from '$lib/utils/csrf';
	import { goto } from '$app/navigation';
	import type { PolicyDelta } from '$lib/config/pms/policyTypes.js';

	interface Props {
		draftId: string;
		lockVersion: number;
		lenderId: string;
		loanProduct: string;
		bankEmail: string;
		pendingChangeCount: number;
		acceptedDeltas: PolicyDelta[];
	}

	const {
		draftId,
		lockVersion: initialLockVersion,
		lenderId,
		loanProduct,
		bankEmail,
		pendingChangeCount,
		acceptedDeltas
	}: Props = $props();

	// Local lockVersion seeded from prop; bumped after each successful save.
	// svelte-ignore state_referenced_locally
	let lockVersion = $state(initialLockVersion);

	// OTP flow state — mirrors the encode wizard / edit page pattern exactly
	let otpSent = $state(false);
	let otpCode = $state('');
	let otpBoxes = $state(['', '', '', '', '', '']);
	let isSendingOtp = $state(false);
	let isVerifying = $state(false);
	let isSubmitting = $state(false);
	let otpError = $state('');
	let submitError = $state('');
	let pmsOtpToken = $state('');

	// Compute draft hash — fetches live policy and SHA-256 of {sections, overrides}
	// Matches the server's computeDraftHash() in submit/+server.ts
	async function computeDraftHash(): Promise<string> {
		const res = await secureFetch(`/api/pms/policies/${draftId}`);
		if (!res.ok) throw new Error('Failed to load draft for hash computation');
		const json = await res.json();
		const policy = json.data;
		const payload = JSON.stringify({ sections: policy.sections, overrides: policy.conditionalOverrides });
		const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload));
		return Array.from(new Uint8Array(buf))
			.map((b) => b.toString(16).padStart(2, '0'))
			.join('');
	}

	async function sendOtp() {
		isSendingOtp = true;
		otpError = '';
		try {
			const draftHash = await computeDraftHash();
			const res = await secureFetch('/api/pms/otp/send', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					bankEmail,
					context: {
						purpose: 'policy_change',
						lenderId,
						policyId: draftId,
						draftHash
					}
				})
			});
			const json = await res.json();
			if (!res.ok) {
				otpError = json.error ?? 'Failed to send OTP. Please try again.';
				return;
			}
			otpSent = true;
		} catch {
			otpError = 'Network error sending OTP.';
		} finally {
			isSendingOtp = false;
		}
	}

	// Handle individual OTP digit input — auto-focus next box
	function handleOtpInput(index: number, e: Event) {
		const input = e.target as HTMLInputElement;
		const value = input.value.replace(/\D/g, '').slice(-1);
		otpBoxes[index] = value;
		otpCode = otpBoxes.join('');
		if (value && index < 5) {
			const next = input.parentElement?.children[index + 1] as HTMLInputElement | null;
			next?.focus();
		}
	}

	function handleOtpKeydown(index: number, e: KeyboardEvent) {
		if (e.key === 'Backspace' && !otpBoxes[index] && index > 0) {
			const prev = (e.target as HTMLInputElement).parentElement?.children[index - 1] as HTMLInputElement | null;
			prev?.focus();
		}
	}

	async function verifyAndSubmit() {
		if (otpCode.length !== 6) {
			otpError = 'Enter the full 6-digit OTP.';
			return;
		}

		isVerifying = true;
		otpError = '';

		try {
			const draftHash = await computeDraftHash();

			const verifyRes = await secureFetch('/api/pms/otp/verify', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					otp: otpCode,
					context: {
						purpose: 'policy_change',
						lenderId,
						policyId: draftId,
						draftHash
					}
				})
			});
			const verifyJson = await verifyRes.json();
			if (!verifyRes.ok) {
				otpError = verifyJson.error ?? 'OTP verification failed.';
				return;
			}
			pmsOtpToken = verifyJson.data?.pmsOtpToken ?? '';
		} catch {
			otpError = 'Network error verifying OTP.';
			return;
		} finally {
			isVerifying = false;
		}

		// Submit the draft for admin review
		isSubmitting = true;
		submitError = '';
		try {
			const submitRes = await secureFetch(`/api/pms/policies/${draftId}/submit`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'x-pms-otp-token': pmsOtpToken
				},
				body: JSON.stringify({ lockVersion })
			});
			const submitJson = await submitRes.json();
			if (!submitRes.ok) {
				submitError = submitJson.error ?? 'Submission failed. Please try again.';
				return;
			}
			// Success — redirect to detail page
			await goto(`/dashboard/rm/policies/${lenderId}/${encodeURIComponent(loanProduct)}`);
		} catch {
			submitError = 'Network error during submission.';
		} finally {
			isSubmitting = false;
		}
	}
</script>

<div class="space-y-6">
	<!-- Summary of accepted changes -->
	<div class="rounded-xl border border-green-200 bg-green-50 p-4">
		<div class="flex items-start gap-3">
			<CheckCircle size={18} class="mt-0.5 shrink-0 text-green-600" />
			<div>
				<p class="text-sm font-semibold text-green-800">
					{pendingChangeCount} field change{pendingChangeCount === 1 ? '' : 's'} saved to draft
				</p>
				<p class="mt-0.5 text-xs text-green-700">
					Accepted from {acceptedDeltas.length} delta{acceptedDeltas.length === 1 ? '' : 's'}.
					Ready for admin review.
				</p>
			</div>
		</div>

		<!-- Changed fields list -->
		<div class="mt-3 space-y-1">
			{#each acceptedDeltas as delta}
				<div class="flex items-center gap-2 text-xs text-green-700">
					<span class="font-mono">{delta.sectionKey}.{delta.fieldKey}</span>
				</div>
			{/each}
		</div>
	</div>

	<!-- OTP submit — identical pattern to encode wizard Step 5 and edit page -->
	<div class="rounded-xl border border-gray-200 bg-white p-5">
		<h3 class="text-sm font-semibold text-gray-800">Submit for admin review</h3>
		<p class="mt-1 text-xs text-gray-500">
			An OTP will be sent to <strong>{bankEmail}</strong> to verify your identity before submission.
		</p>

		{#if !otpSent}
			<button
				type="button"
				onclick={sendOtp}
				disabled={isSendingOtp}
				class="mt-4 flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-700 disabled:opacity-40"
			>
				{#if isSendingOtp}
					<Loader size={15} class="animate-spin" />
					Sending OTP…
				{:else}
					<Send size={15} />
					Send OTP to bank email
				{/if}
			</button>
		{:else}
			<div class="mt-4 space-y-4">
				<p class="text-xs text-gray-500">
					OTP sent to <strong>{bankEmail}</strong>. Enter the 6-digit code below.
				</p>

				<!-- 6-box OTP input -->
				<div class="flex gap-2">
					{#each otpBoxes as box, i}
						<input
							type="text"
							inputmode="numeric"
							maxlength="1"
							value={box}
							oninput={(e) => handleOtpInput(i, e)}
							onkeydown={(e) => handleOtpKeydown(i, e)}
							class="h-11 w-10 rounded-lg border border-gray-300 text-center text-lg font-semibold text-gray-800 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
						/>
					{/each}
				</div>

				{#if otpError}
					<p class="flex items-center gap-1.5 text-xs text-red-600">
						<AlertTriangle size={13} />
						{otpError}
					</p>
				{/if}

				<div class="flex gap-3">
					<button
						type="button"
						onclick={verifyAndSubmit}
						disabled={isVerifying || isSubmitting || otpCode.length !== 6}
						class="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-700 disabled:opacity-40"
					>
						{#if isVerifying || isSubmitting}
							<Loader size={15} class="animate-spin" />
							{isVerifying ? 'Verifying…' : 'Submitting…'}
						{:else}
							<CheckCircle size={15} />
							Verify &amp; submit
						{/if}
					</button>

					<button
						type="button"
						onclick={() => { otpSent = false; otpBoxes = ['','','','','','']; otpCode = ''; }}
						class="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
					>
						Resend OTP
					</button>
				</div>

				{#if submitError}
					<p class="flex items-center gap-1.5 text-xs text-red-600">
						<AlertTriangle size={13} />
						{submitError}
					</p>
				{/if}
			</div>
		{/if}
	</div>
</div>
