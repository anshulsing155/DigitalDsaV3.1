<!--
  E.2 — Admin Two-Factor Authentication section
  ════════════════════════════════════════════════════════════════════
  Self-contained section for the admin settings page. Three primary
  states based on the parent-supplied `twofa` prop + local enrollment
  flow state:

    NOT ENROLLED      → "Enroll" CTA
    ENROLLING         → QR + manual key + confirm-code field
    RECOVERY-CODES    → one-time display of 8 plaintext recovery codes
                        (only reachable immediately after /confirm)
    ENROLLED          → status + disable form (requires current code)

  Component does not persist state across refreshes. After /confirm
  shows the recovery codes, the user acknowledges them and the parent
  page reloads via invalidateAll() — the next render reads the ENABLED
  state from the server.

  i18n keys deferred to Epic H per project convention.
-->

<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { secureFetch } from '$lib/utils/csrf';

	interface TwofaProp {
		enabled: boolean;
		enrolled_at: string | null;
		recovery_codes_remaining: number;
	}

	let { twofa, onFeedback }: {
		twofa: TwofaProp;
		onFeedback?: (kind: 'success' | 'error', msg: string) => void;
	} = $props();

	type Phase = 'idle' | 'enrolling' | 'recovery_codes';

	let phase = $state<Phase>('idle');
	let qrDataUrl = $state('');
	let manualKey = $state('');
	let confirmCode = $state('');
	let recoveryCodes = $state<string[]>([]);
	let recoveryAcknowledged = $state(false);
	let disableCode = $state('');
	let disableMode = $state<'totp' | 'recovery'>('totp');
	let busy = $state(false);
	let errorMessage = $state('');

	function feedback(kind: 'success' | 'error', msg: string) {
		if (onFeedback) onFeedback(kind, msg);
	}

	async function startEnroll() {
		busy = true;
		errorMessage = '';
		try {
			const res = await secureFetch('/api/admin/2fa/enroll', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: '{}'
			});
			const json = await res.json().catch(() => null);
			if (res.ok && json?.success) {
				qrDataUrl = json.data.qr_data_url;
				manualKey = json.data.manual_key;
				confirmCode = '';
				phase = 'enrolling';
			} else {
				errorMessage = json?.error ?? `Could not start enrollment (status ${res.status}).`;
			}
		} catch {
			errorMessage = 'Network error. Please try again.';
		} finally {
			busy = false;
		}
	}

	async function submitConfirm(e: SubmitEvent) {
		e.preventDefault();
		const trimmed = confirmCode.trim();
		if (!trimmed) {
			errorMessage = 'Enter the 6-digit code from your authenticator app.';
			return;
		}
		busy = true;
		errorMessage = '';
		try {
			const res = await secureFetch('/api/admin/2fa/confirm', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ token: trimmed })
			});
			const json = await res.json().catch(() => null);
			if (res.ok && json?.success) {
				recoveryCodes = json.data.recovery_codes ?? [];
				recoveryAcknowledged = false;
				phase = 'recovery_codes';
				feedback('success', 'Two-factor authentication is now active.');
			} else {
				errorMessage = json?.error ?? `Verification failed (status ${res.status}).`;
			}
		} catch {
			errorMessage = 'Network error. Please try again.';
		} finally {
			busy = false;
		}
	}

	async function acknowledgeRecoveryCodes() {
		// Wipe local state + reload server data so the section re-renders
		// in the ENABLED state for the rest of the session.
		recoveryCodes = [];
		recoveryAcknowledged = false;
		qrDataUrl = '';
		manualKey = '';
		confirmCode = '';
		phase = 'idle';
		await invalidateAll();
	}

	async function copyRecoveryCodes() {
		try {
			await navigator.clipboard.writeText(recoveryCodes.join('\n'));
			feedback('success', 'Recovery codes copied to clipboard.');
		} catch {
			feedback('error', 'Could not copy. Select + copy manually.');
		}
	}

	async function submitDisable(e: SubmitEvent) {
		e.preventDefault();
		const trimmed = disableCode.trim();
		if (!trimmed) {
			errorMessage = 'Enter a current authenticator code or a recovery code.';
			return;
		}
		busy = true;
		errorMessage = '';
		try {
			const body =
				disableMode === 'totp' ? { token: trimmed } : { recovery_code: trimmed };
			const res = await secureFetch('/api/admin/2fa/disable', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});
			const json = await res.json().catch(() => null);
			if (res.ok && json?.success) {
				disableCode = '';
				feedback('success', 'Two-factor authentication has been disabled.');
				await invalidateAll();
			} else {
				errorMessage = json?.error ?? `Disable failed (status ${res.status}).`;
			}
		} catch {
			errorMessage = 'Network error. Please try again.';
		} finally {
			busy = false;
		}
	}

	function cancelEnrollment() {
		phase = 'idle';
		qrDataUrl = '';
		manualKey = '';
		confirmCode = '';
		errorMessage = '';
	}
</script>

<section
	class="rounded-xl border border-[var(--dash-border)] bg-[var(--dash-bg-alt)] p-5"
	aria-labelledby="2fa-heading"
>
	<h2 id="2fa-heading" class="text-base font-semibold text-[var(--dash-text)]">
		Two-factor authentication
	</h2>
	<p class="mt-1 text-sm text-[var(--dash-text-secondary)]">
		Add a second factor to admin logins. Required after phone OTP. Uses any
		authenticator app (Google Authenticator, Authy, 1Password, Microsoft
		Authenticator, etc.).
	</p>

	{#if errorMessage}
		<div
			class="mt-4 rounded-lg border border-[#d97706] bg-[#fef3c7] px-3 py-2 text-sm text-[#92400e]"
			role="alert"
		>
			{errorMessage}
		</div>
	{/if}

	{#if phase === 'idle' && !twofa.enabled}
		<!-- ── NOT ENROLLED ─────────────────────────────────────── -->
		<div class="mt-4 flex items-center justify-between gap-3">
			<div>
				<p class="text-sm font-medium text-[var(--dash-text)]">
					Two-factor authentication is <span class="text-[#dc2626]">off</span>
				</p>
				<p class="mt-1 text-xs text-[var(--dash-text-secondary)]">
					Voluntary in v1 — recommended for all admin accounts.
				</p>
			</div>
			<button
				type="button"
				onclick={startEnroll}
				disabled={busy}
				class="inline-flex items-center gap-2 rounded-lg bg-[var(--ddsa-accent-500)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
			>
				{busy ? 'Starting…' : 'Enable 2FA'}
			</button>
		</div>
	{:else if phase === 'enrolling'}
		<!-- ── ENROLLING ────────────────────────────────────────── -->
		<div class="mt-4 grid gap-5 lg:grid-cols-[200px_1fr]">
			<div class="flex flex-col items-center">
				{#if qrDataUrl}
					<img src={qrDataUrl} alt="2FA setup QR code" class="h-[200px] w-[200px] rounded-lg border border-[var(--dash-border)] bg-white p-1" />
				{/if}
				<p class="mt-2 text-center text-xs text-[var(--dash-text-secondary)]">
					Scan in your authenticator app.
				</p>
			</div>
			<div>
				<details class="mb-3">
					<summary class="cursor-pointer text-xs text-[var(--dash-text-secondary)] underline">
						Can't scan? Enter this key manually
					</summary>
					<code class="mt-2 block break-all rounded bg-[var(--dash-bg-card)] p-2 text-xs font-mono text-[var(--dash-text)]">
						{manualKey}
					</code>
				</details>
				<form onsubmit={submitConfirm}>
					<label class="block text-sm font-medium text-[var(--dash-text)]">
						Enter the 6-digit code shown in your app
						<input
							type="text"
							inputmode="numeric"
							autocomplete="off"
							placeholder="123 456"
							bind:value={confirmCode}
							disabled={busy}
							maxlength="7"
							class="mt-2 w-full max-w-[200px] rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-3 py-2 text-base tabular-nums tracking-wider text-[var(--dash-text)] focus:border-[var(--ddsa-accent-500)] focus:outline-none disabled:opacity-50"
						/>
					</label>
					<div class="mt-3 flex gap-2">
						<button
							type="submit"
							disabled={busy}
							class="rounded-lg bg-[var(--ddsa-accent-500)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
						>
							{busy ? 'Verifying…' : 'Confirm + enable'}
						</button>
						<button
							type="button"
							onclick={cancelEnrollment}
							disabled={busy}
							class="rounded-lg border border-[var(--dash-border)] px-4 py-2 text-sm text-[var(--dash-text-secondary)] hover:bg-[var(--dash-bg-card)] disabled:opacity-50"
						>
							Cancel
						</button>
					</div>
				</form>
			</div>
		</div>
	{:else if phase === 'recovery_codes'}
		<!-- ── RECOVERY CODES (one-time display) ────────────────── -->
		<div class="mt-4 rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-card)] p-4">
			<p class="text-sm font-semibold text-[var(--dash-text)]">
				Save these recovery codes
			</p>
			<p class="mt-1 text-xs text-[var(--dash-text-secondary)]">
				Each code works once. Use one if you lose access to your authenticator
				app. These will <strong>never be shown again</strong>.
			</p>
			<div class="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
				{#each recoveryCodes as code}
					<code class="rounded bg-[var(--dash-bg-alt)] px-2 py-1.5 text-center text-xs font-mono text-[var(--dash-text)]">
						{code}
					</code>
				{/each}
			</div>
			<div class="mt-4 flex flex-wrap items-center justify-between gap-3">
				<button
					type="button"
					onclick={copyRecoveryCodes}
					class="rounded-lg border border-[var(--dash-border)] px-3 py-1.5 text-xs text-[var(--dash-text-secondary)] hover:bg-[var(--dash-bg-alt)]"
				>
					Copy all
				</button>
				<label class="flex items-center gap-2 text-xs text-[var(--dash-text)]">
					<input type="checkbox" bind:checked={recoveryAcknowledged} />
					I've saved my recovery codes
				</label>
				<button
					type="button"
					onclick={acknowledgeRecoveryCodes}
					disabled={!recoveryAcknowledged}
					class="rounded-lg bg-[var(--ddsa-accent-500)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
				>
					Done
				</button>
			</div>
		</div>
	{:else if twofa.enabled}
		<!-- ── ENABLED — status + disable form ──────────────────── -->
		<div class="mt-4 rounded-lg border border-[#16a34a] bg-[#f0fdf4] p-3 text-sm text-[#14532d]">
			<p class="font-medium">
				✓ Two-factor authentication is on
				{#if twofa.enrolled_at}
					<span class="ml-2 font-normal opacity-75">
						(since {new Date(twofa.enrolled_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })})
					</span>
				{/if}
			</p>
			<p class="mt-1 text-xs">
				{twofa.recovery_codes_remaining} of 8 recovery codes remaining.
				{#if twofa.recovery_codes_remaining < 3}
					<strong class="text-[#dc2626]">Low — disable and re-enroll to regenerate.</strong>
				{/if}
			</p>
		</div>

		<form class="mt-4" onsubmit={submitDisable}>
			<details>
				<summary class="cursor-pointer text-sm text-[var(--dash-text-secondary)] underline">
					Disable two-factor authentication
				</summary>
				<div class="mt-3 space-y-3 rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-card)] p-3">
					<p class="text-xs text-[var(--dash-text-secondary)]">
						Requires a current authenticator code OR a recovery code to confirm
						you still have the second factor.
					</p>
					<div class="flex gap-3 text-xs">
						<label class="flex items-center gap-1">
							<input type="radio" bind:group={disableMode} value="totp" />
							Authenticator code
						</label>
						<label class="flex items-center gap-1">
							<input type="radio" bind:group={disableMode} value="recovery" />
							Recovery code
						</label>
					</div>
					<input
						type="text"
						inputmode={disableMode === 'totp' ? 'numeric' : 'text'}
						placeholder={disableMode === 'totp' ? '123 456' : 'xxxx-xxxx-xxxx-xxxx'}
						bind:value={disableCode}
						disabled={busy}
						maxlength={disableMode === 'totp' ? 7 : 24}
						class="w-full max-w-xs rounded border border-[var(--dash-border)] bg-[var(--dash-bg-alt)] px-3 py-1.5 text-sm tabular-nums text-[var(--dash-text)] focus:outline-none disabled:opacity-50"
					/>
					<button
						type="submit"
						disabled={busy}
						class="rounded-lg bg-[#dc2626] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
					>
						{busy ? 'Disabling…' : 'Disable 2FA'}
					</button>
				</div>
			</details>
		</form>
	{/if}
</section>
