<!--
  F.1 — Refer & Earn section
  ════════════════════════════════════════════════════════════════════
  Self-contained component. Fetches /api/dsa/referrals on mount,
  renders the referral link + counts + recent invites.

  CTAs:
    • Copy link — copies to clipboard
    • WhatsApp share — pre-fills a friendly message + the link
    • Each row: status badge (Joined / Subscribed)

  Reward: 1 free month for both when the invitee's first paid
  subscription succeeds. Reward is server-credited (chargeEngine
  handleSuccess → creditReferralRewardIfEligible).

  i18n keys deferred to Epic H.
-->

<script lang="ts">
	import { onMount } from 'svelte';

	interface ReferralRow {
		code: string;
		joined_at: string;
		subscribed_at: string | null;
		reward_status: 'pending' | 'credited' | 'void';
		mobile_masked: string;
	}

	interface ReferralData {
		referral_code: string | null;
		referral_link: string | null;
		invited_count: number;
		joined_count: number;
		pending_count: number;
		subscribed_count: number;
		rewards_credited: number;
		recent: ReferralRow[];
	}

	let data = $state<ReferralData | null>(null);
	let loading = $state(true);
	let errorMessage = $state('');
	let copied = $state(false);

	async function load() {
		loading = true;
		errorMessage = '';
		try {
			const res = await fetch('/api/dsa/referrals');
			const json = await res.json().catch(() => null);
			if (res.ok && json?.success) {
				data = json.data as ReferralData;
			} else {
				errorMessage = json?.error ?? `Could not load referrals (status ${res.status}).`;
			}
		} catch (err) {
			errorMessage = err instanceof Error ? `Network error: ${err.message}` : 'Network error.';
		} finally {
			loading = false;
		}
	}

	onMount(load);

	async function copyLink() {
		if (!data?.referral_link) return;
		try {
			await navigator.clipboard.writeText(data.referral_link);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		} catch {
			errorMessage = 'Could not copy. Select + copy manually.';
		}
	}

	function whatsappShareUrl(link: string): string {
		const msg = `I use DigitalDSA to manage my loan cases — saves a ton of time. Try it with my link, we'll both get 1 free month when you subscribe: ${link}`;
		return `https://wa.me/?text=${encodeURIComponent(msg)}`;
	}

	function formatDate(iso: string): string {
		return new Date(iso).toLocaleDateString('en-IN', {
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		});
	}

	function statusLabel(s: 'pending' | 'credited' | 'void'): string {
		if (s === 'credited') return '✓ Subscribed — reward credited';
		if (s === 'pending') return 'Joined · awaiting subscription';
		return 'Voided';
	}
</script>

<section
	class="rounded-xl border border-[var(--dash-border)] bg-[var(--dash-bg-alt)] p-5"
	aria-labelledby="refer-heading"
>
	<h2 id="refer-heading" class="text-base font-semibold text-[var(--dash-text)]">
		Refer & earn
	</h2>
	<p class="mt-1 text-sm text-[var(--dash-text-secondary)]">
		Invite other DSAs. When they subscribe, you both get
		<strong>1 free month</strong>.
	</p>

	{#if errorMessage}
		<div
			class="mt-4 rounded-lg border border-[#d97706] bg-[#fef3c7] px-3 py-2 text-sm text-[#92400e]"
			role="alert"
		>
			{errorMessage}
		</div>
	{/if}

	{#if loading}
		<p class="mt-4 text-sm text-[var(--dash-text-secondary)]">Loading…</p>
	{:else if data}
		{#if data.referral_link}
			<div class="mt-4 flex flex-wrap items-center gap-2">
				<code
					class="flex-1 min-w-[200px] rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-3 py-2 text-sm font-mono text-[var(--dash-text)]"
				>
					{data.referral_link}
				</code>
				<button
					type="button"
					onclick={copyLink}
					class="rounded-lg border border-[var(--dash-border)] px-3 py-2 text-sm font-medium text-[var(--dash-text)] hover:bg-[var(--dash-hover)]"
				>
					{copied ? '✓ Copied' : 'Copy'}
				</button>
				<a
					href={whatsappShareUrl(data.referral_link)}
					target="_blank"
					rel="noopener noreferrer"
					class="inline-flex items-center gap-1.5 rounded-lg bg-[#25D366] px-3 py-2 text-sm font-medium text-white hover:opacity-90"
				>
					<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
						<path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448L.057 24z" />
					</svg>
					WhatsApp
				</a>
			</div>

			<dl class="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-4">
				<div class="rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-3 py-2">
					<dt class="text-xs uppercase tracking-wide text-[var(--dash-text-secondary)]">
						Invited
					</dt>
					<dd class="mt-0.5 text-lg font-semibold text-[var(--dash-text)]">
						{data.invited_count}
					</dd>
				</div>
				<div class="rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-3 py-2">
					<dt class="text-xs uppercase tracking-wide text-[var(--dash-text-secondary)]">
						Pending
					</dt>
					<dd class="mt-0.5 text-lg font-semibold text-[var(--dash-text)]">
						{data.pending_count}
					</dd>
				</div>
				<div class="rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-3 py-2">
					<dt class="text-xs uppercase tracking-wide text-[var(--dash-text-secondary)]">
						Subscribed
					</dt>
					<dd class="mt-0.5 text-lg font-semibold text-[var(--dash-text)]">
						{data.subscribed_count}
					</dd>
				</div>
				<div class="rounded-lg border border-[#16a34a] bg-[#f0fdf4] px-3 py-2">
					<dt class="text-xs uppercase tracking-wide text-[#14532d]">
						Free months
					</dt>
					<dd class="mt-0.5 text-lg font-semibold text-[#14532d]">
						{data.rewards_credited}
					</dd>
				</div>
			</dl>

			{#if data.recent.length > 0}
				<div class="mt-5">
					<h3 class="text-sm font-medium text-[var(--dash-text)]">Your referrals</h3>
					<ul class="mt-2 divide-y divide-[var(--dash-border)]">
						{#each data.recent as r}
							<li class="flex flex-wrap items-center justify-between gap-3 py-2 text-sm">
								<span class="text-[var(--dash-text)]">{r.mobile_masked}</span>
								<span class="text-xs text-[var(--dash-text-secondary)]">
									Joined {formatDate(r.joined_at)} · {statusLabel(r.reward_status)}
								</span>
							</li>
						{/each}
					</ul>
				</div>
			{:else}
				<p class="mt-5 text-sm text-[var(--dash-text-secondary)]">
					Share your link to get started. Reward credits when your invitee
					completes their first paid subscription.
				</p>
			{/if}
		{:else}
			<p class="mt-4 text-sm text-[var(--dash-text-secondary)]">
				Referral link not yet available. It's minted on your next dashboard load
				— refresh in a moment.
			</p>
		{/if}
	{/if}
</section>
