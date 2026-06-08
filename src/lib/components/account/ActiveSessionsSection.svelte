<!--
  E.3 — Active Devices section
  ════════════════════════════════════════════════════════════════════
  Self-contained component. Fetches GET /api/account/sessions on mount,
  renders the user's active sessions as a stacked list with revoke
  buttons. "Sign out all other devices" CTA at bottom, hidden when
  there's only one session (only the current device).

  Endpoint handles role + ownership server-side — the component is
  role-agnostic and reusable across DSA profile / RM settings /
  admin settings.

  Per the natural revoke semantics: clicking "Sign out" sets revoked_at
  on the row. The device's existing access token still works for up to
  15 min; next refresh-token call fails + the device is signed out.
  Surface that delay clearly in the post-action message.

  i18n keys deferred to Epic H per project convention.
-->

<script lang="ts">
	import { onMount } from 'svelte';
	import { secureFetch } from '$lib/utils/csrf';

	interface SessionRow {
		session_id: string;
		device_label: string;
		ip_city: string | null;
		ip_country_region: string | null;
		ip_country: string | null;
		created_at: string;
		last_seen_at: string;
		role: string;
		is_current: boolean;
	}

	let sessions = $state<SessionRow[]>([]);
	let loading = $state(true);
	let errorMessage = $state('');
	let revoking = $state<string | null>(null);
	let revokingOthers = $state(false);
	let lastAction = $state('');

	async function load() {
		loading = true;
		errorMessage = '';
		try {
			const res = await fetch('/api/account/sessions');
			const json = await res.json().catch(() => null);
			if (res.ok && json?.success) {
				sessions = (json.data?.sessions ?? []) as SessionRow[];
			} else {
				errorMessage = json?.error ?? `Could not load sessions (status ${res.status}).`;
			}
		} catch (err) {
			errorMessage = err instanceof Error ? `Network error: ${err.message}` : 'Network error.';
		} finally {
			loading = false;
		}
	}

	onMount(load);

	async function revokeOne(sessionId: string) {
		revoking = sessionId;
		errorMessage = '';
		try {
			const res = await secureFetch(`/api/account/sessions/${sessionId}/revoke`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: '{}'
			});
			const json = await res.json().catch(() => null);
			if (res.ok && json?.success) {
				lastAction = 'Session signed out. The device will lose access within 15 minutes (when its current access token expires).';
				await load();
			} else {
				errorMessage = json?.error ?? `Revoke failed (status ${res.status}).`;
			}
		} catch (err) {
			errorMessage = err instanceof Error ? `Network error: ${err.message}` : 'Network error.';
		} finally {
			revoking = null;
		}
	}

	async function revokeOthers() {
		revokingOthers = true;
		errorMessage = '';
		try {
			const res = await secureFetch('/api/account/sessions/revoke-others', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: '{}'
			});
			const json = await res.json().catch(() => null);
			if (res.ok && json?.success) {
				const n = json.data?.revoked ?? 0;
				lastAction = n > 0
					? `Signed out of ${n} other ${n === 1 ? 'device' : 'devices'}. They'll lose access within 15 minutes.`
					: 'No other active devices to sign out.';
				await load();
			} else {
				errorMessage = json?.error ?? `Could not sign out other devices (status ${res.status}).`;
			}
		} catch (err) {
			errorMessage = err instanceof Error ? `Network error: ${err.message}` : 'Network error.';
		} finally {
			revokingOthers = false;
		}
	}

	function formatLocation(s: SessionRow): string {
		const parts = [s.ip_city, s.ip_country_region, s.ip_country].filter(Boolean);
		return parts.length > 0 ? parts.join(' · ') : '—';
	}

	function formatLastSeen(iso: string): string {
		const d = new Date(iso);
		const now = Date.now();
		const diffMin = Math.floor((now - d.getTime()) / 60000);
		if (diffMin < 1) return 'now';
		if (diffMin < 60) return `${diffMin} min ago`;
		const diffHr = Math.floor(diffMin / 60);
		if (diffHr < 24) return `${diffHr}h ago`;
		const diffDay = Math.floor(diffHr / 24);
		if (diffDay < 7) return `${diffDay}d ago`;
		return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
	}

	let canRevokeOthers = $derived(sessions.filter((s) => !s.is_current).length > 0);
</script>

<section
	class="rounded-xl border border-[var(--dash-border)] bg-[var(--dash-bg-alt)] p-5"
	aria-labelledby="sessions-heading"
>
	<h2 id="sessions-heading" class="text-base font-semibold text-[var(--dash-text)]">
		Active devices
	</h2>
	<p class="mt-1 text-sm text-[var(--dash-text-secondary)]">
		Every device currently signed in to your account. Sign out devices
		you don't recognize — affected devices lose access within 15 minutes.
	</p>

	{#if errorMessage}
		<div
			class="mt-4 rounded-lg border border-[#d97706] bg-[#fef3c7] px-3 py-2 text-sm text-[#92400e]"
			role="alert"
		>
			{errorMessage}
		</div>
	{/if}

	{#if lastAction && !errorMessage}
		<div
			class="mt-4 rounded-lg border border-[var(--dash-btn-ghost-border)] bg-[var(--dash-btn-ghost-bg)] px-3 py-2 text-sm text-[var(--dash-text)]"
			role="status"
		>
			{lastAction}
		</div>
	{/if}

	{#if loading}
		<p class="mt-4 text-sm text-[var(--dash-text-secondary)]">Loading…</p>
	{:else if sessions.length === 0}
		<p class="mt-4 text-sm text-[var(--dash-text-secondary)]">
			No active sessions yet. Your next sign-in will appear here.
		</p>
	{:else}
		<ul class="mt-4 divide-y divide-[var(--dash-border)]">
			{#each sessions as session (session.session_id)}
				<li class="flex flex-wrap items-center justify-between gap-3 py-3">
					<div class="min-w-0 flex-1">
						<p class="flex items-center gap-2 text-sm font-medium text-[var(--dash-text)]">
							{session.device_label}
							{#if session.is_current}
								<span class="rounded-full bg-[#16a34a] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
									This device
								</span>
							{/if}
						</p>
						<p class="mt-0.5 text-xs text-[var(--dash-text-secondary)]">
							{formatLocation(session)} · last active {formatLastSeen(session.last_seen_at)}
						</p>
					</div>
					{#if !session.is_current}
						<button
							type="button"
							onclick={() => revokeOne(session.session_id)}
							disabled={revoking === session.session_id || revokingOthers}
							class="rounded-lg border border-[var(--dash-border)] px-3 py-1.5 text-xs font-medium text-[#dc2626] hover:bg-[#fef2f2] disabled:cursor-not-allowed disabled:opacity-50"
						>
							{revoking === session.session_id ? 'Signing out…' : 'Sign out'}
						</button>
					{/if}
				</li>
			{/each}
		</ul>

		{#if canRevokeOthers}
			<div class="mt-4 border-t border-[var(--dash-border)] pt-4">
				<button
					type="button"
					onclick={revokeOthers}
					disabled={revokingOthers || revoking !== null}
					class="rounded-lg bg-[#dc2626] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
				>
					{revokingOthers ? 'Signing out other devices…' : 'Sign out all other devices'}
				</button>
				<p class="mt-2 text-xs text-[var(--dash-text-secondary)]">
					Your current device stays signed in.
				</p>
			</div>
		{/if}
	{/if}
</section>
