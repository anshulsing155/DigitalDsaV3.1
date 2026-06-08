<script lang="ts">
	import { page } from '$app/stores';
	import { invalidateAll } from '$app/navigation';
	import { secureFetch } from '$lib/utils/csrf';
	import { formatEngagement, formatSendButtonLabel } from '$lib/utils/broadcastMetrics';

	// ── Server data ──────────────────────────────────────────────
	const data = $derived(
		$page.data as {
			broadcasts: Array<{
				_id: string;
				title: string;
				body: string;
				footer: string;
				target_count: number;
				read_count: number;
				created_at: string;
			}>;
			dsaCount: number;
			rmName: string;
			lenderName: string;
		}
	);

	// ── Local state ─────────────────────────────────────────────
	let title = $state('');
	let body = $state('');
	let isSending = $state(false);
	let showCompose = $state(false);
	let error = $state('');
	let success = $state('');

	// ── Constants ───────────────────────────────────────────────
	const FOOTER_PREVIEW =
		'\u26a0\ufe0f This information is shared by the RM based on their understanding. ' +
		'The platform does not guarantee it. Please confirm through official channels.';

	const MAX_TITLE = 200;
	const MAX_BODY = 2000;

	// ── Derived ─────────────────────────────────────────────────
	const bodyLength = $derived(body.length);
	const titleLength = $derived(title.length);
	const canSend = $derived(title.trim().length > 0 && body.trim().length > 0 && !isSending);

	// ── Send broadcast ──────────────────────────────────────────
	async function sendBroadcast() {
		error = '';
		success = '';
		isSending = true;

		try {
			const res = await secureFetch('/api/rm/broadcasts', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ title: title.trim(), body: body.trim() })
			});

			const result = await res.json();

			if (!res.ok || !result.success) {
				error = result.error || 'Failed to send broadcast';
				return;
			}

			success = `Broadcast sent to ${result.data.dsaCount} DSA${result.data.dsaCount !== 1 ? 's' : ''}`;
			title = '';
			body = '';
			showCompose = false;

			// Refresh the page data to show the new broadcast
			await invalidateAll();
		} catch {
			error = 'Network error. Please check your connection and try again.';
		} finally {
			isSending = false;
		}
	}

	// ── Format time ago ─────────────────────────────────────────
	function formatTimeAgo(dateStr: string): string {
		const date = new Date(dateStr);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMins / 60);
		const diffDays = Math.floor(diffHours / 24);

		if (diffMins < 1) return 'Just now';
		if (diffMins < 60) return `${diffMins}m ago`;
		if (diffHours < 24) return `${diffHours}h ago`;
		if (diffDays < 7) return `${diffDays}d ago`;
		return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
	}

	// ── Truncate body for card preview ──────────────────────────
	function truncate(text: string, maxLen: number): string {
		// Remove the footer part (everything after ---\n) for preview
		const footerIdx = text.indexOf('\n\n---\n');
		const bodyOnly = footerIdx >= 0 ? text.substring(0, footerIdx) : text;
		if (bodyOnly.length <= maxLen) return bodyOnly;
		return bodyOnly.substring(0, maxLen).trimEnd() + '...';
	}
</script>

<svelte:head>
	<title>Broadcasts - RM Dashboard</title>
</svelte:head>

<div class="space-y-6 pb-20 lg:pb-0">
	<!-- ═══════════════════════════════════════════════════════════ -->
	<!-- PAGE HEADER                                                -->
	<!-- ═══════════════════════════════════════════════════════════ -->
	<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="text-2xl font-bold text-[var(--dash-text)]">Broadcasts</h1>
			<p class="mt-1 text-sm text-[var(--dash-text-secondary)]">
				Send updates to all your connected DSAs
			</p>
		</div>
		{#if !showCompose}
			<button
				onclick={() => {
					showCompose = true;
					error = '';
					success = '';
				}}
				class="inline-flex items-center gap-2 rounded-xl bg-[var(--dash-btn-bg)] px-4 py-2.5 text-sm font-semibold text-[var(--dash-btn-text)] shadow-sm transition-all hover:shadow-md hover:brightness-105"
			>
				<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
				</svg>
				New Broadcast
			</button>
		{/if}
	</div>

	<!-- ═══════════════════════════════════════════════════════════ -->
	<!-- SUCCESS MESSAGE                                            -->
	<!-- ═══════════════════════════════════════════════════════════ -->
	{#if success}
		<div
			class="flex items-center gap-3 rounded-xl border border-[var(--dash-btn-ghost-border)] bg-[var(--dash-btn-ghost-bg)] px-4 py-3"
		>
			<svg
				class="h-5 w-5 shrink-0 text-[var(--dash-accent-text)]"
				fill="none"
				viewBox="0 0 24 24"
				stroke-width="2"
				stroke="currentColor"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
				/>
			</svg>
			<p class="text-sm font-medium text-[var(--dash-accent-text)]">{success}</p>
			<button
				onclick={() => (success = '')}
				aria-label="Dismiss success message"
				class="ml-auto text-[var(--dash-accent-text)] hover:text-[var(--dash-accent-text)]"
			>
				<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		</div>
	{/if}

	<!-- ═══════════════════════════════════════════════════════════ -->
	<!-- COMPOSE SECTION                                            -->
	<!-- ═══════════════════════════════════════════════════════════ -->
	{#if showCompose}
		<div
			class="rounded-xl border border-[var(--dash-border)] bg-[var(--dash-bg-card)] p-5 shadow-sm"
		>
			<div class="mb-4 flex items-center justify-between">
				<h2 class="text-lg font-semibold text-[var(--dash-text)]">Compose Broadcast</h2>
				<button
					onclick={() => {
						showCompose = false;
						error = '';
					}}
					aria-label="Close compose form"
					class="rounded-lg p-1.5 text-[var(--dash-text-muted)] transition-colors hover:bg-[var(--dash-hover)] hover:text-[var(--dash-text-secondary)]"
				>
					<svg
						class="h-5 w-5"
						fill="none"
						viewBox="0 0 24 24"
						stroke-width="2"
						stroke="currentColor"
					>
						<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>

			<div class="space-y-4">
				<!-- Title -->
				<div>
					<label
						for="broadcast-title"
						class="mb-1.5 block text-sm font-medium text-[var(--dash-text-secondary)]"
					>
						Title
					</label>
					<input
						id="broadcast-title"
						type="text"
						bind:value={title}
						maxlength={MAX_TITLE}
						placeholder="e.g. Updated LAP guidelines for Q1 2026"
						class="w-full rounded-lg border border-[var(--dash-border)] px-3 py-2 text-sm text-[var(--dash-text)] placeholder-[var(--dash-text-muted)] transition-colors focus:border-[var(--ddsa-accent-500)] focus:ring-1 focus:ring-[var(--ddsa-accent-500)] focus:outline-none"
					/>
					<p class="mt-1 text-right text-xs text-[var(--dash-text-muted)]">
						{titleLength}/{MAX_TITLE}
					</p>
				</div>

				<!-- Body -->
				<div>
					<label
						for="broadcast-body"
						class="mb-1.5 block text-sm font-medium text-[var(--dash-text-secondary)]"
					>
						Message
					</label>
					<textarea
						id="broadcast-body"
						bind:value={body}
						maxlength={MAX_BODY}
						rows={6}
						placeholder="Write your broadcast message here..."
						class="w-full resize-y rounded-lg border border-[var(--dash-border)] px-3 py-2 text-sm text-[var(--dash-text)] placeholder-[var(--dash-text-muted)] transition-colors focus:border-[var(--ddsa-accent-500)] focus:ring-1 focus:ring-[var(--ddsa-accent-500)] focus:outline-none"
					></textarea>
					<p
						class="mt-1 text-right text-xs {bodyLength > MAX_BODY * 0.9
							? 'font-medium text-[var(--dash-contrast-text)]'
							: 'text-[var(--dash-text-muted)]'}"
					>
						{bodyLength}/{MAX_BODY}
					</p>
				</div>

				<!-- Footer preview (non-editable) -->
				<div>
					<p class="mb-1.5 text-sm font-medium text-[var(--dash-text-secondary)]">
						Auto-appended disclaimer (cannot be edited)
					</p>
					<div
						class="rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-alt)] px-3 py-2.5 text-sm text-[var(--dash-text-secondary)] italic"
					>
						{FOOTER_PREVIEW}
					</div>
				</div>

				<!-- Target audience -->
				<div
					class="flex items-center gap-2 rounded-lg border border-[var(--dash-btn-ghost-border)] bg-[var(--dash-btn-ghost-bg)] px-3 py-2.5"
				>
					<svg
						class="h-4 w-4 shrink-0 text-[var(--dash-accent-text)]"
						fill="none"
						viewBox="0 0 24 24"
						stroke-width="2"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
						/>
					</svg>
					<p class="text-sm text-[var(--dash-accent-text)]">
						{#if data.dsaCount > 0}
							Target: <strong>{data.dsaCount} connected DSA{data.dsaCount !== 1 ? 's' : ''}</strong>
						{:else}
							No connected DSAs — broadcasts require at least one DSA connection
						{/if}
					</p>
				</div>

				<!-- Error -->
				{#if error}
					<div
						class="flex items-center gap-2 rounded-lg border border-[var(--dash-contrast-ghost-border)] bg-[var(--dash-contrast-ghost-bg)] px-3 py-2.5"
					>
						<svg
							class="h-4 w-4 shrink-0 text-[var(--dash-contrast-text)]"
							fill="none"
							viewBox="0 0 24 24"
							stroke-width="2"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
							/>
						</svg>
						<p class="text-sm font-medium text-[var(--dash-contrast-text)]">{error}</p>
					</div>
				{/if}

				<!-- Actions -->
				<div class="flex items-center justify-end gap-3 pt-2">
					<button
						onclick={() => {
							showCompose = false;
							error = '';
						}}
						class="rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-4 py-2 text-sm font-medium text-[var(--dash-text-secondary)] transition-colors hover:bg-[var(--dash-hover)]"
					>
						Cancel
					</button>
					<button
						onclick={sendBroadcast}
						disabled={!canSend || data.dsaCount === 0}
						class="inline-flex items-center gap-2 rounded-lg bg-[var(--ddsa-accent-500)] px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-[var(--ddsa-accent-600)] disabled:cursor-not-allowed disabled:opacity-50"
					>
						{#if isSending}
							<svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
								<circle
									class="opacity-25"
									cx="12"
									cy="12"
									r="10"
									stroke="currentColor"
									stroke-width="4"
								></circle>
								<path
									class="opacity-75"
									fill="currentColor"
									d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
								></path>
							</svg>
							Sending...
						{:else}
							<svg
								class="h-4 w-4"
								fill="none"
								viewBox="0 0 24 24"
								stroke-width="2"
								stroke="currentColor"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
								/>
							</svg>
							{formatSendButtonLabel(data.dsaCount)}
						{/if}
					</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- ═══════════════════════════════════════════════════════════ -->
	<!-- SENT BROADCASTS LIST                                       -->
	<!-- ═══════════════════════════════════════════════════════════ -->
	{#if data.broadcasts.length > 0}
		<div>
			<h2 class="mb-3 text-sm font-semibold text-[var(--dash-text)]">
				Sent Broadcasts ({data.broadcasts.length})
			</h2>
			<div class="space-y-3">
				{#each data.broadcasts as broadcast (broadcast._id)}
					<div
						class="rounded-xl border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] p-4 shadow-sm transition-colors hover:border-[var(--dash-border)]"
					>
						<!-- Header -->
						<div class="mb-2 flex items-start justify-between gap-3">
							<h3 class="text-sm font-semibold text-[var(--dash-text)]">
								{broadcast.title}
							</h3>
							<span class="shrink-0 text-xs text-[var(--dash-text-muted)]">
								{formatTimeAgo(broadcast.created_at)}
							</span>
						</div>

						<!-- Body preview -->
						<p class="mb-3 text-sm leading-relaxed text-[var(--dash-text-secondary)]">
							{truncate(broadcast.body, 200)}
						</p>

						<!-- Meta row -->
						<div
							class="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-[var(--dash-border-light)] pt-3"
						>
							<!-- C.3 — engagement strip: target + opened + percentage in one
							     line. Replaces the bare "N DSAs · M read" pair which
							     left "did anyone open it?" as a math problem. -->
							<div
								class="flex items-center gap-1.5 text-xs font-medium text-[var(--dash-text-secondary)]"
							>
								<svg
									class="h-3.5 w-3.5"
									fill="none"
									viewBox="0 0 24 24"
									stroke-width="2"
									stroke="currentColor"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
									/>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
									/>
								</svg>
								{formatEngagement({
									target: broadcast.target_count,
									opened: broadcast.read_count
								})}
							</div>

							<!-- Date -->
							<div class="flex items-center gap-1.5 text-xs text-[var(--dash-text-muted)]">
								<svg
									class="h-3.5 w-3.5"
									fill="none"
									viewBox="0 0 24 24"
									stroke-width="2"
									stroke="currentColor"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
									/>
								</svg>
								{new Date(broadcast.created_at).toLocaleDateString('en-IN', {
									day: 'numeric',
									month: 'short',
									year: 'numeric',
									hour: '2-digit',
									minute: '2-digit'
								})}
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{:else if !showCompose}
		<!-- Empty state -->
		<div
			class="rounded-xl border-2 border-dashed border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-6 py-12 text-center"
		>
			<div
				class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[var(--ddsa-accent-100)] to-[var(--ddsa-primary-100)]"
			>
				<svg
					class="h-8 w-8 text-[var(--ddsa-accent-500)]"
					fill="none"
					viewBox="0 0 24 24"
					stroke-width="1.5"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46"
					/>
				</svg>
			</div>
			<h3 class="mb-2 text-lg font-bold text-[var(--dash-text)]">No broadcasts yet</h3>
			<p class="mx-auto mb-6 max-w-md text-sm text-[var(--dash-text-secondary)]">
				Send updates, policy changes, or announcements to all your connected DSAs at once. A
				disclaimer footer will be automatically appended to every broadcast.
			</p>
			<button
				onclick={() => {
					showCompose = true;
					error = '';
					success = '';
				}}
				class="inline-flex items-center gap-2 rounded-xl bg-[var(--dash-btn-bg)] px-6 py-3 text-sm font-semibold text-[var(--dash-btn-text)] shadow-lg shadow-neutral-200 transition-all hover:shadow-xl hover:brightness-105 dark:shadow-neutral-900/20"
			>
				<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
				</svg>
				Create Your First Broadcast
			</button>
		</div>
	{/if}
</div>
