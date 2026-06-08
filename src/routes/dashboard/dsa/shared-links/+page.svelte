<script lang="ts">
	/**
	 * Shared Links Management — /dashboard/dsa/shared-links
	 * ═══════════════════════════════════════════════════════════════════
	 * DSA can view, filter, copy, and revoke all their share links.
	 * ═══════════════════════════════════════════════════════════════════
	 */

	import type { PageData } from './$types';
	import type { FormShareLink } from '$lib/types/incomeProfile';
	import PageTourButton from '$lib/components/walkthrough/PageTourButton.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import { secureFetch } from '$lib/utils/csrf';
	import { browser } from '$app/environment';
	import { openConfirmModal } from '$lib/stores/confirmModal';

	let { data }: { data: PageData } = $props();

	// ── State ────────────────────────────────────────────────────
	let activeFilter = $state('all');
	let copied = $state('');
	let revoking = $state('');
	let revokeError = $state('');

	// ── Compute link status ─────────────────────────────────────
	function getLinkStatus(link: FormShareLink): 'active' | 'completed' | 'expired' | 'revoked' {
		if (!link.isActive) return 'revoked';
		if (link.submissionStatus === 'completed') return 'completed';
		if (new Date(link.expiresAt) < new Date()) return 'expired';
		return 'active';
	}

	const STATUS_COLORS: Record<string, string> = {
		active: 'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)]',
		completed: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]',
		expired: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-muted)]',
		revoked: 'bg-[var(--dash-contrast-ghost-bg)] text-[var(--dash-contrast-text)]'
	};

	const STATUS_LABELS: Record<string, string> = {
		active: 'Active',
		completed: 'Completed',
		expired: 'Expired',
		revoked: 'Revoked'
	};

	// ── Filtered links ──────────────────────────────────────────
	const filteredLinks = $derived(
		activeFilter === 'all'
			? data.links
			: data.links.filter((l: FormShareLink) => getLinkStatus(l) === activeFilter)
	);

	// ── Filter counts ───────────────────────────────────────────
	const filterCounts = $derived({
		all: data.links.length,
		active: data.links.filter((l: FormShareLink) => getLinkStatus(l) === 'active').length,
		completed: data.links.filter((l: FormShareLink) => getLinkStatus(l) === 'completed').length,
		expired: data.links.filter((l: FormShareLink) => getLinkStatus(l) === 'expired').length,
		revoked: data.links.filter((l: FormShareLink) => getLinkStatus(l) === 'revoked').length
	});

	// ── Copy link URL ───────────────────────────────────────────
	async function copyLink(token: string) {
		if (!browser) return;
		const url = `${window.location.origin}/f/${token}`;
		try {
			await navigator.clipboard.writeText(url);
			copied = token;
			setTimeout(() => {
				copied = '';
			}, 2000);
		} catch {
			// Fallback
			const input = document.createElement('input');
			input.value = url;
			document.body.appendChild(input);
			input.select();
			document.execCommand('copy');
			document.body.removeChild(input);
			copied = token;
			setTimeout(() => {
				copied = '';
			}, 2000);
		}
	}

	// ── Revoke link ─────────────────────────────────────────────
	function revokeLink(token: string) {
		openConfirmModal(
			'Revoke Share Link',
			'Revoke this link? The applicant will no longer be able to access it.',
			async () => {
				revoking = token;
				revokeError = '';

				try {
					const res = await secureFetch('/api/share-link/revoke', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ token })
					});

					const result = await res.json();

					if (result.success) {
						// Update local state
						const link = data.links.find((l: FormShareLink) => l.token === token);
						if (link) link.isActive = false;
					} else {
						revokeError = result.error || 'Failed to revoke link';
					}
				} catch {
					revokeError = 'Network error. Please try again.';
				} finally {
					revoking = '';
				}
			},
			{ confirmLabel: 'Revoke' }
		);
	}

	// ── Format helpers ──────────────────────────────────────────
	function formatDate(dateStr: string): string {
		return new Date(dateStr).toLocaleDateString('en-IN', {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function formatTimeRemaining(expiresAt: string): string {
		const now = new Date();
		const expiry = new Date(expiresAt);
		const diffMs = expiry.getTime() - now.getTime();

		if (diffMs <= 0) return 'Expired';

		const hours = Math.floor(diffMs / (1000 * 60 * 60));
		if (hours < 1) {
			const mins = Math.floor(diffMs / (1000 * 60));
			return `${mins}m remaining`;
		}
		if (hours < 24) return `${hours}h remaining`;
		const days = Math.floor(hours / 24);
		return `${days}d remaining`;
	}
</script>

<svelte:head>
	<title>Shared Links | DigitalDSA</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-start justify-between gap-3">
		<div>
			<h1 class="text-xl font-bold text-[var(--dash-text)]">Shared Links</h1>
			<p class="mt-1 text-sm text-[var(--dash-text-secondary)]">
				Manage form links shared with applicants for self-fill
			</p>
		</div>
		<PageTourButton pageId="shared-links" />
	</div>

	<!-- Filter Tabs -->
	<div
		data-walkthrough="shared-links-filter-tabs"
		class="flex gap-1 overflow-x-auto rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-alt)] p-1"
	>
		{#each ['all', 'active', 'completed', 'expired', 'revoked'] as filter}
			{@const count = filterCounts[filter as keyof typeof filterCounts]}
			<button
				onclick={() => {
					activeFilter = filter;
				}}
				class="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors
					{activeFilter === filter
					? 'bg-[var(--dash-bg-card)] text-[var(--ddsa-accent-500)] shadow-sm'
					: 'text-[var(--dash-text-secondary)] hover:text-[var(--dash-text)]'}"
			>
				{filter === 'all' ? 'All' : STATUS_LABELS[filter]}
				{#if count > 0}
					<span
						class="rounded-full bg-[var(--dash-bg-alt)] px-1.5 py-0.5 text-[12px] font-bold {activeFilter ===
						filter
							? 'text-[var(--ddsa-accent-500)]'
							: 'text-[var(--dash-text-muted)]'}"
					>
						{count}
					</span>
				{/if}
			</button>
		{/each}
	</div>

	{#if revokeError}
		<div
			class="rounded-lg bg-[var(--dash-contrast-ghost-bg)] px-3 py-2 text-xs font-medium text-[var(--dash-contrast-text)]"
		>
			{revokeError}
		</div>
	{/if}

	<!-- Links List -->
	{#if filteredLinks.length > 0}
		<div class="space-y-3">
			{#each filteredLinks as link, idx (link.token)}
				{@const status = getLinkStatus(link)}
				{@const caseLabel = data.caseLabels[link.applicationId] || link.applicationId}
				<div
					data-walkthrough={idx === 0 ? 'shared-links-card-first' : undefined}
					class="rounded-xl border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] p-4 shadow-sm"
				>
					<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
						<div class="min-w-0 flex-1">
							<!-- Case Label + Status -->
							<div class="flex items-center gap-2">
								<p class="truncate text-sm font-semibold text-[var(--dash-text)]">
									{caseLabel}
								</p>
								<span
									class="shrink-0 rounded-full px-2 py-0.5 text-[12px] font-semibold {STATUS_COLORS[
										status
									]}"
								>
									{STATUS_LABELS[status]}
								</span>
							</div>

							<!-- Sections -->
							<div class="mt-1.5 flex flex-wrap gap-1">
								{#each link.sections as section}
									<span
										class="rounded bg-[var(--dash-bg-alt)] px-1.5 py-0.5 text-[12px] font-medium text-[var(--dash-text-secondary)] capitalize"
									>
										{section}
									</span>
								{/each}
							</div>

							<!-- Meta info -->
							<div
								class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-[var(--dash-text-muted)]"
							>
								<span>Created: {formatDate(link.createdAt)}</span>
								<span>Uses: {link.useCount}/{link.maxUses}</span>
								{#if status === 'active'}
									<span class="text-[var(--dash-accent-text)]"
										>{formatTimeRemaining(link.expiresAt)}</span
									>
								{:else if link.lastSubmittedAt}
									<span>Submitted: {formatDate(link.lastSubmittedAt)}</span>
								{/if}
							</div>
						</div>

						<!-- Actions -->
						<div
							data-walkthrough={idx === 0 ? 'shared-links-actions-first' : undefined}
							class="flex shrink-0 items-center gap-2"
						>
							{#if status === 'active'}
								<button
									onclick={() => copyLink(link.token)}
									class="rounded-lg border border-[var(--dash-border)] px-3 py-1.5 text-xs font-medium text-[var(--dash-text-secondary)] transition-colors hover:bg-[var(--dash-hover)]
										{copied === link.token
										? 'border-[var(--dash-btn-ghost-border)] bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)]'
										: ''}"
								>
									{copied === link.token ? 'Copied!' : 'Copy Link'}
								</button>
								<button
									onclick={() => revokeLink(link.token)}
									disabled={revoking === link.token}
									class="rounded-lg border border-[var(--dash-contrast-ghost-border)] px-3 py-1.5 text-xs font-medium text-[var(--dash-contrast-text)] transition-colors hover:bg-[var(--dash-contrast-ghost-bg)] disabled:opacity-50"
								>
									{revoking === link.token ? 'Revoking...' : 'Revoke'}
								</button>
							{:else if status === 'completed' || status === 'expired'}
								<button
									onclick={() => copyLink(link.token)}
									class="rounded-lg border border-[var(--dash-border)] px-3 py-1.5 text-xs font-medium text-[var(--dash-text-muted)] transition-colors hover:bg-[var(--dash-hover)]"
								>
									{copied === link.token ? 'Copied!' : 'Copy Link'}
								</button>
							{/if}
						</div>
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<!-- Empty State -->
		<div data-walkthrough="shared-links-empty-state">
			{#if activeFilter === 'all'}
				<EmptyState
					title="No shared links yet"
					description="Open a case and use &quot;Share Form with Applicant&quot; to create your first link"
					variant="default"
				/>
			{:else}
				<EmptyState
					title="No {STATUS_LABELS[activeFilter]?.toLowerCase()} links"
					variant="filtered"
				/>
			{/if}
		</div>
	{/if}
</div>
