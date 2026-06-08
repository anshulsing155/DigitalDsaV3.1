<!--
  E.1 — DPDP §11 self-export UI section
  ════════════════════════════════════════════════════════════════════
  Shared between DSA + RM profile pages. POSTs to /api/account/data-export
  and branches on the response shape:

    • 200 + Content-Type: application/zip
        → trigger a browser download via Blob URL + anchor click
        → show a brief "Download started" success toast

    • 200 + JSON {status: 'queued'}
        → show a persistent "we'll email you within 24 hours" notice
        → button stays disabled (per-session — refresh resets)

    • 429
        → show "you can request again on <date>" (server includes the
          ISO date in the error message)

    • any other → friendly generic error toast

  No server-side pre-fetch of rate-limit state — clicking when blocked
  gives an immediate friendly 429 response, which is acceptable v1 UX
  given the rate-limit fires at most once every 30 days.

  i18n keys deferred to Epic H per project convention. English-only v1.
-->

<script lang="ts">
	import { secureFetch } from '$lib/utils/csrf';

	type State = 'idle' | 'loading' | 'queued' | 'rate_limited' | 'error';

	let uiState = $state<State>('idle');
	let message = $state('');

	function triggerBrowserDownload(blob: Blob, filename: string) {
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		// Revoke after a tick so the browser has a chance to start the download.
		setTimeout(() => URL.revokeObjectURL(url), 1000);
	}

	function filenameFromHeaders(res: Response): string {
		const cd = res.headers.get('Content-Disposition') ?? '';
		const m = cd.match(/filename="([^"]+)"/);
		return m?.[1] ?? `digitaldsa-export-${new Date().toISOString().slice(0, 10)}.zip`;
	}

	async function requestExport() {
		uiState = 'loading';
		message = '';
		try {
			const res = await secureFetch('/api/account/data-export', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: '{}'
			});

			const contentType = res.headers.get('Content-Type') ?? '';

			if (res.status === 200 && contentType.includes('application/zip')) {
				// Inline ZIP path — convert to Blob + trigger browser download.
				const blob = await res.blob();
				triggerBrowserDownload(blob, filenameFromHeaders(res));
				uiState = 'idle';
				message = 'Your download has started. Check your browser\'s download folder.';
				// Auto-clear the success message after 5s so the section returns to clean.
				setTimeout(() => {
					if (uiState === 'idle') message = '';
				}, 5000);
				return;
			}

			// JSON response — could be queued (200) or an error (429 / 500).
			const json = await res.json().catch(() => null);

			if (res.status === 200 && json?.data?.status === 'queued') {
				uiState = 'queued';
				message =
					json.data.message ??
					'Your data export is too large for an instant download. Our team will email it to you within 24 hours.';
				return;
			}

			if (res.status === 429) {
				uiState = 'rate_limited';
				message =
					json?.error ?? 'You can request a data export once every 30 days.';
				return;
			}

			// Catch-all — surface whatever the server said + a recovery hint.
			uiState = 'error';
			message =
				json?.error ??
				`Something went wrong (status ${res.status}). Please try again, or contact tech@digitaldsa.com if the problem persists.`;
		} catch (err) {
			uiState = 'error';
			message =
				err instanceof Error && err.message
					? `Network error: ${err.message}. Please check your connection and try again.`
					: 'Network error. Please check your connection and try again.';
		}
	}

	// Button is disabled while loading OR when a non-recoverable status
	// (queued, rate_limited) means clicking again won't help.
	let buttonDisabled = $derived(
		uiState === 'loading' || uiState === 'queued' || uiState === 'rate_limited'
	);

	let buttonLabel = $derived(uiState === 'loading' ? 'Preparing your export…' : 'Request my data export');
</script>

<section
	class="rounded-xl border border-[var(--dash-border)] bg-[var(--dash-bg-alt)] p-5"
	aria-labelledby="data-export-heading"
>
	<h2
		id="data-export-heading"
		class="text-base font-semibold text-[var(--dash-text)]"
	>
		Your data &amp; privacy
	</h2>
	<p class="mt-1 text-sm text-[var(--dash-text-secondary)]">
		Download a copy of your DigitalDSA data (DPDP Act §11). The export includes
		your profile, cases, contacts, payments, communications, and disclaimer
		acceptances. Other users' personal data is excluded. You can request once
		every 30 days.
	</p>

	{#if message}
		<div
			class="mt-4 rounded-lg border px-3 py-2 text-sm
				{uiState === 'rate_limited' || uiState === 'error'
				? 'border-[var(--dash-warning-border, #d97706)] bg-[var(--dash-warning-bg, #fef3c7)] text-[var(--dash-warning-text, #92400e)]'
				: 'border-[var(--dash-btn-ghost-border)] bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-text)]'}"
			role={uiState === 'error' || uiState === 'rate_limited' ? 'alert' : 'status'}
		>
			{message}
		</div>
	{/if}

	<div class="mt-4">
		<button
			type="button"
			onclick={requestExport}
			disabled={buttonDisabled}
			class="inline-flex items-center gap-2 rounded-lg bg-[var(--ddsa-accent-500)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
		>
			{#if uiState === 'loading'}
				<svg
					class="h-4 w-4 animate-spin"
					fill="none"
					viewBox="0 0 24 24"
					aria-hidden="true"
				>
					<circle
						class="opacity-25"
						cx="12"
						cy="12"
						r="10"
						stroke="currentColor"
						stroke-width="4"
					/>
					<path
						class="opacity-75"
						fill="currentColor"
						d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
					/>
				</svg>
			{/if}
			{buttonLabel}
		</button>
	</div>

	<p class="mt-3 text-xs text-[var(--dash-text-secondary)]">
		Note: money records (billing transactions, invoices) are included in the
		export but cannot be deleted on account closure until the 6-year statutory
		retention window expires (Income Tax Act).
	</p>
</section>
