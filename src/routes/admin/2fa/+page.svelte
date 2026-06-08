<!--
  E.2 — Admin 2FA login-step page
  ════════════════════════════════════════════════════════════════════
  Reached when an admin has completed OTP login but their JWT carries
  `tfa_pending: true`. hooks.server.ts restricts the session to this
  page (+ the verify endpoint + logout) until they submit a valid TOTP
  code or recovery code.

  Two input modes:
    • TOTP — 6-digit code from authenticator app (default)
    • Recovery code — toggle link, switches the input to recovery format

  On successful verify, the server re-issues the access token without
  the tfa_pending claim. We then redirect to /dashboard/admin.

  i18n keys: deferred to Epic H per project convention.
-->

<script lang="ts">
	import { goto } from '$app/navigation';
	import { secureFetch } from '$lib/utils/csrf';

	type Mode = 'totp' | 'recovery';

	let mode = $state<Mode>('totp');
	let codeValue = $state('');
	let submitting = $state(false);
	let errorMessage = $state('');

	let placeholder = $derived(
		mode === 'totp' ? '123 456' : 'xxxx-xxxx-xxxx-xxxx'
	);
	let label = $derived(
		mode === 'totp' ? '6-digit code from your authenticator app' : 'Recovery code'
	);

	function switchMode(next: Mode) {
		mode = next;
		codeValue = '';
		errorMessage = '';
	}

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (submitting) return;
		const trimmed = codeValue.trim();
		if (!trimmed) {
			errorMessage = 'Please enter a code.';
			return;
		}
		submitting = true;
		errorMessage = '';
		try {
			const body =
				mode === 'totp' ? { token: trimmed } : { recovery_code: trimmed };
			const res = await secureFetch('/api/admin/2fa/verify', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});
			const json = await res.json().catch(() => null);
			if (res.ok && json?.success) {
				const redirect: string = json.data?.redirect ?? '/dashboard/admin';
				// Hard navigation so the new (promoted) access-token cookie
				// is picked up by hooks.server.ts on the next request.
				window.location.href = redirect;
				return;
			}
			errorMessage =
				json?.error ??
				`Verification failed (status ${res.status}). Please try again.`;
		} catch (err) {
			errorMessage =
				err instanceof Error && err.message
					? `Network error: ${err.message}`
					: 'Network error. Please check your connection.';
		} finally {
			submitting = false;
		}
	}

	async function handleLogout() {
		try {
			await secureFetch('/api/auth/logout', { method: 'POST' });
		} catch {
			// Best-effort — even if the call fails, send the user to the
			// login page so they can start over.
		}
		await goto('/login');
	}
</script>

<svelte:head>
	<title>Two-factor verification | DigitalDSA Admin</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-[var(--dash-bg, #f5f5f5)] px-4 py-10">
	<div
		class="w-full max-w-md rounded-2xl border border-[var(--dash-border)] bg-[var(--dash-bg-card, white)] p-8 shadow-sm"
	>
		<h1 class="text-xl font-semibold text-[var(--dash-text, #1f2937)]">
			Two-factor verification
		</h1>
		<p class="mt-2 text-sm text-[var(--dash-text-secondary, #6b7280)]">
			{#if mode === 'totp'}
				Open your authenticator app and enter the current 6-digit code for
				DigitalDSA.
			{:else}
				Enter one of the recovery codes you saved when you set up 2FA. Each
				code works once.
			{/if}
		</p>

		<form class="mt-6" onsubmit={handleSubmit}>
			<label class="block text-sm font-medium text-[var(--dash-text, #1f2937)]">
				{label}
				<input
					type="text"
					inputmode={mode === 'totp' ? 'numeric' : 'text'}
					autocomplete="one-time-code"
					autocapitalize="off"
					autocorrect="off"
					spellcheck="false"
					{placeholder}
					bind:value={codeValue}
					disabled={submitting}
					maxlength={mode === 'totp' ? 7 : 24}
					class="mt-2 w-full rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-alt, white)] px-3 py-2.5 text-base tabular-nums tracking-wider text-[var(--dash-text, #1f2937)] focus:border-[var(--ddsa-accent-500, #cb997e)] focus:outline-none focus:ring-2 focus:ring-[var(--ddsa-accent-500, #cb997e)]/30 disabled:opacity-50"
					aria-describedby="code-help"
				/>
			</label>

			{#if errorMessage}
				<div
					class="mt-3 rounded-lg border border-[#d97706] bg-[#fef3c7] px-3 py-2 text-sm text-[#92400e]"
					role="alert"
				>
					{errorMessage}
				</div>
			{/if}

			<button
				type="submit"
				disabled={submitting}
				class="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--ddsa-accent-500, #cb997e)] px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
			>
				{#if submitting}
					<svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
						<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
					</svg>
					Verifying…
				{:else}
					Verify
				{/if}
			</button>
		</form>

		<div class="mt-5 flex items-center justify-between text-sm">
			{#if mode === 'totp'}
				<button
					type="button"
					onclick={() => switchMode('recovery')}
					class="text-[var(--ddsa-accent-500, #cb997e)] underline hover:no-underline"
				>
					Use a recovery code instead
				</button>
			{:else}
				<button
					type="button"
					onclick={() => switchMode('totp')}
					class="text-[var(--ddsa-accent-500, #cb997e)] underline hover:no-underline"
				>
					Use authenticator code instead
				</button>
			{/if}
			<button
				type="button"
				onclick={handleLogout}
				class="text-[var(--dash-text-secondary, #6b7280)] underline hover:no-underline"
			>
				Sign out
			</button>
		</div>

		<p id="code-help" class="mt-6 text-xs text-[var(--dash-text-secondary, #6b7280)]">
			Lost your authenticator and recovery codes? Contact tech@digitaldsa.com
			to have another admin disable 2FA on your account.
		</p>
	</div>
</div>
