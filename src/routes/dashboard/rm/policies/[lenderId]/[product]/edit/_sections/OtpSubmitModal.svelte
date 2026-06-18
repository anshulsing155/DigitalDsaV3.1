<script lang="ts">
	import { ShieldCheck, ArrowLeft } from 'lucide-svelte';

	let {
		bankEmail,
		isOpen = $bindable<boolean>(false),
		onSendOtp,
		onVerifyAndSubmit
	}: {
		bankEmail: string;
		isOpen: boolean;
		onSendOtp: () => Promise<{ ok: boolean; error?: string }>;
		onVerifyAndSubmit: (otp: string) => Promise<{ ok: boolean; error?: string }>;
	} = $props();

	let otpDigits = $state(['', '', '', '', '', '']);
	let otpSent = $state(false);
	let localError = $state('');
	let localLoading = $state(false);

	const otp = $derived(otpDigits.join(''));

	$effect(() => {
		if (isOpen && !otpSent) {
			// Fire OTP as soon as modal opens
			(async () => {
				localLoading = true;
				localError = '';
				const result = await onSendOtp();
				localLoading = false;
				if (!result.ok) {
					localError = result.error ?? 'Failed to send OTP.';
					isOpen = false;
					return;
				}
				otpSent = true;
			})();
		}
	});

	function close() {
		isOpen = false;
		localError = '';
		otpDigits = ['', '', '', '', '', ''];
	}

	function handleOtpInput(index: number, e: Event) {
		const input = e.target as HTMLInputElement;
		const val = input.value.replace(/\D/g, '').slice(-1);
		otpDigits[index] = val;
		if (val && index < 5) document.getElementById(`edit-otp-${index + 1}`)?.focus();
	}

	function handleOtpKeydown(index: number, e: KeyboardEvent) {
		if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
			document.getElementById(`edit-otp-${index - 1}`)?.focus();
		}
	}

	function handleOtpPaste(e: ClipboardEvent) {
		const pasted = e.clipboardData?.getData('text').replace(/\D/g, '').slice(0, 6) ?? '';
		if (pasted.length === 6) {
			e.preventDefault();
			otpDigits = pasted.split('');
		}
	}

	async function verify() {
		if (otp.length !== 6) {
			localError = 'Please enter all 6 digits.';
			return;
		}
		localLoading = true;
		localError = '';
		const result = await onVerifyAndSubmit(otp);
		localLoading = false;
		if (!result.ok) {
			localError = result.error ?? 'Submission failed. Please try again.';
			otpDigits = ['', '', '', '', '', ''];
			return;
		}
		// Parent handles success (redirect/success banner); just close
		close();
	}
</script>

{#if isOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div
		role="presentation"
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
		onclick={(e) => { if (e.target === e.currentTarget) close(); }}
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

			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div class="mb-5 flex justify-center gap-2" onpaste={handleOtpPaste}>
				{#each otpDigits as digit, i (i)}
					<input
						id="edit-otp-{i}"
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

			<div class="flex gap-3">
				<button type="button" onclick={close} class="flex items-center gap-1.5 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50">
					<ArrowLeft size={14} /> Cancel
				</button>
				<button type="button" onclick={verify} disabled={localLoading || otp.length !== 6} class="flex flex-1 items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-40">
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
