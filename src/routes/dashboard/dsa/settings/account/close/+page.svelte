<script lang="ts">
	/**
	 * Close Account (SEC-8)
	 * ══════════════════════════════════════════════════════════════════
	 * Target of the "Close account" link in every transactional email
	 * footer (AWS SES case 177987930900751, footer element #3). Provides
	 * a stable deep-linkable URL — the in-dashboard delete modal still
	 * works for users coming from the menu; this page is the entry from
	 * an email link, where modal context isn't available.
	 *
	 * Submits to the existing /api/auth/delete-account endpoint, which:
	 *   - moves the row to deletedDsa with 30-day recovery TTL
	 *   - clears auth cookies (logging the user out everywhere)
	 *   - sends the user a deletion-confirmation email
	 *
	 * Auth inherited from /dashboard/dsa/+layout.server.ts (requireRole('dsa')).
	 * ══════════════════════════════════════════════════════════════════
	 */

	import { secureFetch } from '$lib/utils/csrf';
	import { browser } from '$app/environment';

	let confirmText = $state('');
	let isClosing = $state(false);
	let errorMessage = $state('');

	const CONFIRM_PHRASE = 'CLOSE';
	const canSubmit = $derived(confirmText === CONFIRM_PHRASE && !isClosing);

	async function handleClose() {
		if (!canSubmit) return;
		isClosing = true;
		errorMessage = '';
		try {
			const res = await secureFetch('/api/auth/delete-account', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' }
			});
			const data = await res.json();
			if (data.success) {
				if (browser) window.location.href = '/login?account_closed=1';
				return;
			}
			errorMessage = data.error ?? 'Failed to close the account. Please try again.';
		} catch {
			errorMessage = 'Network error. Please try again.';
		} finally {
			isClosing = false;
		}
	}
</script>

<svelte:head>
	<title>Close your account — DigitalDSA</title>
</svelte:head>

<div class="mx-auto max-w-2xl px-4 py-8">
	<h1 class="text-2xl font-semibold text-[var(--dash-text)]">Close your account</h1>

	<p class="mt-2 text-sm text-[var(--dash-text-muted)]">
		Closing immediately stops all email and logs you out of every device.
	</p>

	<section class="mt-8 rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-card)] p-6">
		<h2 class="text-lg font-semibold text-[var(--dash-text)]">What closing does</h2>
		<ul class="mt-3 list-disc space-y-2 pl-6 text-sm text-[var(--dash-text)]">
			<li>Stops every email DigitalDSA would otherwise send to your address.</li>
			<li>Signs you out on every device and revokes your active sessions.</li>
			<li>Moves your account data to a recovery archive for <strong>30 days</strong>.</li>
		</ul>

		<h2 class="mt-6 text-lg font-semibold text-[var(--dash-text)]">If you change your mind</h2>
		<p class="mt-3 text-sm leading-relaxed text-[var(--dash-text)]">
			During the 30-day window you can restore the account by logging in with the same mobile
			number and choosing "Restore account" when prompted. After 30 days, the data is permanently
			deleted and cannot be recovered.
		</p>

		<h2 class="mt-6 text-lg font-semibold text-[var(--dash-text)]">Financial records retention</h2>
		<p class="mt-3 text-sm leading-relaxed text-[var(--dash-text-muted)]">
			Invoices, payment records, and tax-relevant billing data are kept for six years per Indian
			Income Tax and GST requirements, independent of account closure. Everything else is removed
			at the end of the 30-day window.
		</p>
	</section>

	<section class="mt-6 rounded-lg border border-[var(--dash-danger)]/40 bg-[var(--dash-bg-card)] p-6">
		<h2 class="text-lg font-semibold text-[var(--dash-text)]">Confirm closure</h2>
		<p class="mt-3 text-sm text-[var(--dash-text)]">
			Type <strong>{CONFIRM_PHRASE}</strong> in the box below and click "Close account" to confirm.
		</p>

		<input
			type="text"
			bind:value={confirmText}
			placeholder="Type {CONFIRM_PHRASE} to confirm"
			class="mt-4 block w-full max-w-xs rounded-md border border-[var(--dash-border)] bg-[var(--dash-bg)] px-3 py-2 text-sm text-[var(--dash-text)] focus:border-[var(--dash-accent-text)] focus:outline-none"
			aria-label="Type {CONFIRM_PHRASE} to confirm closing your account"
		/>

		{#if errorMessage}
			<p class="mt-3 text-sm text-[var(--dash-danger)]">{errorMessage}</p>
		{/if}

		<div class="mt-5 flex items-center gap-3">
			<button
				type="button"
				onclick={handleClose}
				disabled={!canSubmit}
				class="inline-flex items-center rounded-md bg-[var(--dash-danger)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
			>
				{isClosing ? 'Closing…' : 'Close account'}
			</button>
			<a
				href="/dashboard/dsa"
				class="text-sm text-[var(--dash-text-muted)] hover:text-[var(--dash-text)] hover:underline"
			>
				Cancel
			</a>
		</div>
	</section>
</div>
