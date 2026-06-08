<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { secureFetch } from '$lib/utils/csrf';
	import { createQuery } from '@tanstack/svelte-query';

	let { data } = $props();

	let activeTab = $state<'versions' | 'submissions' | 'captures' | 'activated'>('versions');
	let actionLoading = $state('');
	let actionError = $state('');
	let actionSuccess = $state('');

	// A.2 Slice 4 — capture review.
	let unconfirmedProxyOnly = $state(false);

	const provenanceLabels: Record<string, string> = {
		rm_self: 'RM self-capture',
		admin_manual_proxy: 'Admin proxy · unconfirmed',
		rm_confirmed: 'RM-confirmed'
	};

	const filteredCaptures = $derived(
		unconfirmedProxyOnly
			? data.pendingCaptures.filter((c) => c.provenance_source === 'admin_manual_proxy')
			: data.pendingCaptures
	);

	async function activateCapture(captureId: string) {
		actionError = '';
		actionSuccess = '';
		actionLoading = `cap:${captureId}`;
		try {
			const res = await secureFetch(
				`/api/admin/policy-engine/captures/${captureId}/activate`,
				{ method: 'POST', headers: { 'Content-Type': 'application/json' } }
			);
			const result = await res.json();
			if (result.success) {
				actionSuccess = 'Capture activated as a live rule artifact';
				await invalidateAll();
			} else {
				actionError = result.error || 'Activation failed';
			}
		} catch {
			actionError = 'Failed to connect to server';
		} finally {
			actionLoading = '';
		}
	}

	// ── Parsing-status polling (PERF-3 — TanStack Query) ───────────
	// Previously: `$effect` + `setInterval(invalidateAll, 10_000)` that
	// fired ONLY when SSR seeded a non-empty parsingArtifacts list.
	// Each tick re-ran the full SSR load (4 Mongo queries + enrichment)
	// to refresh ONE small list — coarse and wasteful.
	//
	// Now: a scoped query against /api/admin/policy-engine/parsing-status
	// returns just the parsing artifacts + count. `initialData` is
	// seeded from SSR so first paint is unchanged. `refetchInterval`
	// is a function — TanStack stops polling automatically when the
	// list is empty, and resumes per-tick when artifacts reappear in
	// fresh data. Auto-cleans on unmount.
	//
	// Same semantic as before: poll only while there's work to watch.
	// Difference: per-tick query is ~5 lines of Mongo instead of 4
	// queries + 60 lines of enrichment.
	type ParsingArtifact = (typeof data.parsingArtifacts)[number];
	interface ParsingStatusPayload {
		parsingArtifacts: ParsingArtifact[];
		count: number;
	}

	const parsingQuery = createQuery<ParsingStatusPayload>(() => ({
		queryKey: ['admin-policies-parsing-status'],
		queryFn: async () => {
			const res = await secureFetch('/api/admin/policy-engine/parsing-status');
			const json = await res.json();
			if (!json.success) throw new Error(json.error ?? 'Failed to load parsing status');
			return json.data as ParsingStatusPayload;
		},
		initialData: {
			parsingArtifacts: data.parsingArtifacts,
			count: data.counts.parsingArtifacts
		},
		// Poll every 10s while any artifact is still parsing. When the
		// list empties, refetchInterval returns false and polling stops
		// until the next mount or manual refetch.
		refetchInterval: (q) => {
			const count = (q.state.data as ParsingStatusPayload | undefined)?.count ?? 0;
			return count > 0 ? 10_000 : false;
		}
	}));

	// @tanstack/svelte-query v6 returns a reactive object — access
	// fields directly, no `$`-prefix (CLAUDE.md Pitfall #28).
	let parsingArtifacts = $derived(parsingQuery.data?.parsingArtifacts ?? data.parsingArtifacts);
	let parsingCount = $derived(parsingQuery.data?.count ?? data.counts.parsingArtifacts);

	const versionStatusColors: Record<string, string> = {
		pending_rm_review: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]',
		pending_admin_final: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]',
		approved: 'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)]',
		active: 'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)]'
	};

	const submissionStatusColors: Record<string, string> = {
		submitted: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text)]',
		under_review: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]',
		clarification_needed: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]'
	};

	const urgencyColors: Record<string, string> = {
		normal: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]',
		urgent: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text)]',
		critical: 'bg-[var(--dash-contrast-ghost-bg)] text-[var(--dash-contrast-text)]'
	};

	function formatDate(dateStr: string | null): string {
		if (!dateStr) return '-';
		return new Date(dateStr).toLocaleDateString('en-IN', {
			day: '2-digit',
			month: 'short',
			year: 'numeric'
		});
	}

	function timeAgo(dateStr: string | null): string {
		if (!dateStr) return '-';
		const diff = Date.now() - new Date(dateStr).getTime();
		const minutes = Math.floor(diff / 60_000);
		if (minutes < 60) return `${minutes}m ago`;
		const hours = Math.floor(minutes / 60);
		if (hours < 24) return `${hours}h ago`;
		const days = Math.floor(hours / 24);
		return `${days}d ago`;
	}

	function formatStatus(status: string): string {
		return status.replace(/_/g, ' ');
	}

	async function callVersionAction(
		versionId: string,
		endpoint: string,
		body?: Record<string, unknown>
	) {
		actionError = '';
		actionSuccess = '';
		actionLoading = `${versionId}:${endpoint}`;
		try {
			const res = await secureFetch(`/api/admin/policy-engine/versions/${versionId}/${endpoint}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body || {})
			});
			const result = await res.json();
			if (result.success) {
				actionSuccess = 'Action completed successfully';
				await invalidateAll();
			} else {
				actionError = result.error || 'Action failed';
			}
		} catch {
			actionError = 'Failed to connect to server';
		} finally {
			actionLoading = '';
		}
	}

	async function callSubmissionAction(submissionId: string, body: Record<string, unknown>) {
		actionError = '';
		actionSuccess = '';
		actionLoading = `sub:${submissionId}`;
		try {
			const res = await secureFetch(`/api/admin/policy-engine/submissions/${submissionId}/status`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});
			const result = await res.json();
			if (result.success) {
				actionSuccess = 'Submission status updated';
				await invalidateAll();
			} else {
				actionError = result.error || 'Action failed';
			}
		} catch {
			actionError = 'Failed to connect to server';
		} finally {
			actionLoading = '';
		}
	}
</script>

<svelte:head>
	<title>Admin: Policy Approvals | DigitalDSA</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div>
		<a
			href="/dashboard/admin/policies"
			class="inline-flex items-center gap-1.5 text-sm text-[var(--dash-text-secondary)] hover:text-[var(--dash-text)]"
		>
			<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
				<path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
			</svg>
			Back to Policies
		</a>
		<h1 class="mt-3 text-2xl font-bold text-[var(--dash-text)]">Approval Queue</h1>
		<p class="mt-1 text-sm text-[var(--dash-text-secondary)]">
			Review pending policy versions and RM submissions
		</p>
	</div>

	<!-- Feedback messages -->
	{#if actionError}
		<div
			class="rounded-lg bg-[var(--dash-contrast-ghost-bg)] p-4 text-sm text-[var(--dash-contrast-text)]"
		>
			{actionError}
		</div>
	{/if}
	{#if actionSuccess}
		<div
			class="rounded-lg bg-[var(--dash-btn-ghost-bg)] p-4 text-sm text-[var(--dash-accent-text)]"
		>
			{actionSuccess}
		</div>
	{/if}

	<!-- Summary stat cards -->
	<div class="grid grid-cols-2 gap-3 md:grid-cols-4">
		<div
			class="rounded-xl bg-[var(--dash-bg-card)] p-4 shadow-sm ring-1 ring-[var(--dash-border-light)]"
		>
			<p class="text-xs font-medium text-[var(--dash-text-secondary)]">Pending Versions</p>
			<p class="mt-1 text-2xl font-bold text-[var(--dash-text)]">
				{data.counts.pendingVersions}
			</p>
		</div>
		<div
			class="rounded-xl bg-[var(--dash-bg-card)] p-4 shadow-sm ring-1 ring-[var(--dash-border-light)]"
		>
			<p class="text-xs font-medium text-[var(--dash-text-secondary)]">RM Submissions</p>
			<p class="mt-1 text-2xl font-bold text-[var(--dash-text)]">
				{data.counts.pendingSubmissions}
			</p>
		</div>
		<div
			class="rounded-xl bg-[var(--dash-bg-card)] p-4 shadow-sm ring-1 ring-[var(--dash-border-light)]"
		>
			<p class="text-xs font-medium text-[var(--dash-text-secondary)]">Currently Parsing</p>
			<p class="mt-1 text-2xl font-bold text-[var(--dash-text)]">
				{parsingCount}
			</p>
		</div>
		<div
			class="rounded-xl bg-[var(--dash-bg-card)] p-4 shadow-sm ring-1 ring-[var(--dash-border-light)]"
		>
			<p class="text-xs font-medium text-[var(--dash-text-secondary)]">Recently Activated</p>
			<p class="mt-1 text-2xl font-bold text-[var(--dash-text)]">
				{data.counts.recentlyActivated}
			</p>
		</div>
	</div>

	<!-- Currently Parsing Banner -->
	{#if parsingArtifacts.length > 0}
		<div class="rounded-xl bg-[var(--dash-bg-alt)] p-4 ring-1 ring-[var(--dash-border)]">
			<div class="flex items-center gap-3">
				<span class="parsing-pulse relative flex h-3 w-3">
					<span
						class="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--dash-accent-text)] opacity-75"
					></span>
					<span class="relative inline-flex h-3 w-3 rounded-full bg-[var(--dash-accent-text)]"
					></span>
				</span>
				<p class="text-sm font-medium text-[var(--dash-text)]">
					Currently parsing {parsingArtifacts.length} artifact{parsingArtifacts.length !== 1
						? 's'
						: ''}
				</p>
			</div>
			<div class="mt-2 flex flex-wrap gap-2 pl-6">
				{#each parsingArtifacts as artifact}
					<a
						href="/dashboard/admin/policies/{artifact._id}"
						class="inline-flex items-center gap-1.5 rounded-lg bg-[var(--dash-bg-card)] px-3 py-1.5 text-xs font-medium text-[var(--dash-accent-text)] ring-1 ring-[var(--dash-btn-ghost-border)] transition-colors hover:bg-[var(--dash-btn-ghost-bg)]"
					>
						{artifact.lender_name}
						<span class="text-[var(--dash-text-muted)]">({artifact.artifact_id})</span>
					</a>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Tab system -->
	<div class="flex gap-2">
		<button
			onclick={() => (activeTab = 'versions')}
			class="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors
				{activeTab === 'versions'
				? 'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)]'
				: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)] hover:bg-[var(--dash-hover)]'}"
		>
			Pending Versions
			{#if data.counts.pendingVersions > 0}
				<span
					class="ml-1 inline-flex rounded-full bg-[var(--dash-btn-bg)] px-1.5 py-0.5 text-[12px] font-bold text-[var(--dash-btn-text)]"
				>
					{data.counts.pendingVersions}
				</span>
			{/if}
		</button>
		<button
			onclick={() => (activeTab = 'submissions')}
			class="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors
				{activeTab === 'submissions'
				? 'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)]'
				: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)] hover:bg-[var(--dash-hover)]'}"
		>
			RM Submissions
			{#if data.counts.pendingSubmissions > 0}
				<span
					class="ml-1 inline-flex rounded-full bg-[var(--dash-btn-bg)] px-1.5 py-0.5 text-[12px] font-bold text-[var(--dash-btn-text)]"
				>
					{data.counts.pendingSubmissions}
				</span>
			{/if}
		</button>
		<button
			onclick={() => (activeTab = 'captures')}
			class="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors
				{activeTab === 'captures'
				? 'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)]'
				: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)] hover:bg-[var(--dash-hover)]'}"
		>
			Policy Captures
			{#if data.counts.pendingCaptures > 0}
				<span
					class="ml-1 inline-flex rounded-full bg-[var(--dash-btn-bg)] px-1.5 py-0.5 text-[12px] font-bold text-[var(--dash-btn-text)]"
				>
					{data.counts.pendingCaptures}
				</span>
			{/if}
		</button>
		<button
			onclick={() => (activeTab = 'activated')}
			class="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors
				{activeTab === 'activated'
				? 'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)]'
				: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)] hover:bg-[var(--dash-hover)]'}"
		>
			Recently Activated
		</button>
	</div>

	<!-- Tab: Pending Versions -->
	{#if activeTab === 'versions'}
		{#if data.pendingVersions.length === 0}
			<div
				class="rounded-xl bg-[var(--dash-bg-card)] p-10 text-center shadow-sm ring-1 ring-[var(--dash-border-light)]"
			>
				<p class="text-[var(--dash-text-muted)]">No pending policy versions</p>
			</div>
		{:else}
			<div class="space-y-3">
				{#each data.pendingVersions as version}
					<div
						class="rounded-xl bg-[var(--dash-bg-card)] p-5 shadow-sm ring-1 ring-[var(--dash-border-light)]"
					>
						<div class="flex items-start justify-between">
							<div>
								<h3 class="font-semibold text-[var(--dash-text)]">
									{version.lender_name}
								</h3>
								<p class="mt-0.5 text-sm text-[var(--dash-text-secondary)]">
									{version.product_label} / {version.variation_label}
								</p>
							</div>
							<span
								class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium {versionStatusColors[
									version.status
								] || 'bg-[var(--dash-bg-alt)] text-[var(--dash-text)]'}"
							>
								{formatStatus(version.status)}
							</span>
						</div>

						<!-- Details row -->
						<div
							class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--dash-text-secondary)]"
						>
							<span>v{version.version_number}</span>
							<span
								class="rounded bg-[var(--dash-bg-alt)] px-1.5 py-0.5 text-[var(--dash-text-secondary)]"
								>{version.geo_scope_id}</span
							>
							<span>{version.field_count} field{version.field_count !== 1 ? 's' : ''}</span>
							<span>Source: {version.source_type}</span>
							{#if version.source_rm_name}
								<span>RM: {version.source_rm_name}</span>
							{/if}
							{#if version.confirmation_method}
								<span
									class="rounded bg-[var(--dash-btn-ghost-bg)] px-1.5 py-0.5 text-[var(--dash-accent-text)]"
								>
									{version.confirmation_method}
								</span>
							{/if}
							{#if version.comment_count > 0}
								<span
									class="rounded bg-[var(--dash-btn-ghost-bg)] px-1.5 py-0.5 text-[var(--dash-accent-text)]"
								>
									{version.comment_count} comment{version.comment_count !== 1 ? 's' : ''}
								</span>
							{/if}
							<span class="text-[var(--dash-text-muted)]" title={version.created_at || ''}>
								{timeAgo(version.created_at)}
							</span>
						</div>

						<!-- Action buttons -->
						<div class="mt-4 flex flex-wrap gap-2 border-t border-[var(--dash-border-light)] pt-3">
							{#if version.status === 'pending_rm_review'}
								<button
									onclick={() =>
										callVersionAction(version._id, 'verbal-approval', { method: 'verbal' })}
									disabled={!!actionLoading}
									class="rounded-lg bg-[var(--dash-btn-bg)] px-4 py-2 text-sm font-medium text-[var(--dash-btn-text)] transition-colors hover:brightness-110 disabled:opacity-50"
								>
									{actionLoading === `${version._id}:verbal-approval`
										? 'Logging...'
										: 'Log Verbal Approval'}
								</button>
								<button
									onclick={() => callVersionAction(version._id, 'status', { status: 'rejected' })}
									disabled={!!actionLoading}
									class="rounded-lg bg-[var(--dash-contrast-ghost-bg)] px-4 py-2 text-sm font-medium text-[var(--dash-contrast-text)] transition-colors hover:brightness-110 disabled:opacity-50"
								>
									{actionLoading === `${version._id}:status` ? 'Rejecting...' : 'Reject'}
								</button>
							{:else if version.status === 'pending_admin_final'}
								<button
									onclick={() => callVersionAction(version._id, 'approve')}
									disabled={!!actionLoading}
									class="rounded-lg bg-[var(--dash-btn-bg)] px-4 py-2 text-sm font-medium text-[var(--dash-btn-text)] transition-colors hover:brightness-110 disabled:opacity-50"
								>
									{actionLoading === `${version._id}:approve` ? 'Approving...' : 'Approve'}
								</button>
								<button
									onclick={() => callVersionAction(version._id, 'status', { status: 'rejected' })}
									disabled={!!actionLoading}
									class="rounded-lg bg-[var(--dash-contrast-ghost-bg)] px-4 py-2 text-sm font-medium text-[var(--dash-contrast-text)] transition-colors hover:brightness-110 disabled:opacity-50"
								>
									{actionLoading === `${version._id}:status` ? 'Rejecting...' : 'Reject'}
								</button>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{/if}

		<!-- Tab: RM Submissions -->
	{:else if activeTab === 'submissions'}
		{#if data.pendingSubmissions.length === 0}
			<div
				class="rounded-xl bg-[var(--dash-bg-card)] p-10 text-center shadow-sm ring-1 ring-[var(--dash-border-light)]"
			>
				<p class="text-[var(--dash-text-muted)]">No pending RM submissions</p>
			</div>
		{:else}
			<div class="space-y-3">
				{#each data.pendingSubmissions as submission}
					<div
						class="rounded-xl bg-[var(--dash-bg-card)] p-5 shadow-sm ring-1 ring-[var(--dash-border-light)]"
					>
						<div class="flex items-start justify-between">
							<div>
								<h3 class="font-semibold text-[var(--dash-text)]">{submission.rm_name}</h3>
								<p class="mt-0.5 text-sm text-[var(--dash-text-secondary)]">
									{submission.lender_name}
									{#if submission.product_type}
										/ {submission.product_type}
									{/if}
									{#if submission.variation_slug}
										/ {submission.variation_slug}
									{/if}
								</p>
							</div>
							<div class="flex items-center gap-2">
								<span
									class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium {urgencyColors[
										submission.urgency
									] || 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]'}
									{submission.urgency === 'critical' ? 'urgency-pulse' : ''}"
								>
									{submission.urgency}
								</span>
								<span
									class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium {submissionStatusColors[
										submission.status
									] || 'bg-[var(--dash-bg-alt)] text-[var(--dash-text)]'}"
								>
									{formatStatus(submission.status)}
								</span>
							</div>
						</div>

						<!-- Description preview + details -->
						{#if submission.description}
							<p class="mt-2 text-sm text-[var(--dash-text-secondary)]">
								{submission.description.length > 120
									? submission.description.slice(0, 120) + '...'
									: submission.description}
							</p>
						{/if}

						<div
							class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--dash-text-secondary)]"
						>
							{#if submission.geo_state}
								<span
									class="rounded bg-[var(--dash-bg-alt)] px-1.5 py-0.5 text-[var(--dash-text-secondary)]"
									>{submission.geo_state}</span
								>
							{/if}
							{#if submission.document_count > 0}
								<span
									>{submission.document_count} document{submission.document_count !== 1
										? 's'
										: ''}</span
								>
							{/if}
							<span class="text-[var(--dash-text-muted)]" title={submission.created_at || ''}>
								{timeAgo(submission.created_at)}
							</span>
						</div>

						<!-- Action buttons -->
						<div class="mt-4 flex flex-wrap gap-2 border-t border-[var(--dash-border-light)] pt-3">
							{#if submission.status === 'submitted'}
								<button
									onclick={() =>
										callSubmissionAction(submission.submission_id, { status: 'under_review' })}
									disabled={!!actionLoading}
									class="rounded-lg bg-[var(--dash-btn-bg)] px-4 py-2 text-sm font-medium text-[var(--dash-btn-text)] transition-colors hover:brightness-110 disabled:opacity-50"
								>
									{actionLoading === `sub:${submission.submission_id}`
										? 'Starting...'
										: 'Start Review'}
								</button>
							{:else if submission.status === 'under_review'}
								<button
									onclick={() =>
										callSubmissionAction(submission.submission_id, { status: 'accepted' })}
									disabled={!!actionLoading}
									class="rounded-lg bg-[var(--dash-btn-bg)] px-4 py-2 text-sm font-medium text-[var(--dash-btn-text)] transition-colors hover:brightness-110 disabled:opacity-50"
								>
									{actionLoading === `sub:${submission.submission_id}` ? '...' : 'Accept'}
								</button>
								<button
									onclick={() =>
										callSubmissionAction(submission.submission_id, {
											status: 'clarification_needed'
										})}
									disabled={!!actionLoading}
									class="rounded-lg bg-[var(--dash-bg-alt)] px-4 py-2 text-sm font-medium text-[var(--dash-text)] transition-colors hover:bg-[var(--dash-hover)] disabled:opacity-50"
								>
									Need Clarification
								</button>
								<button
									onclick={() =>
										callSubmissionAction(submission.submission_id, { status: 'rejected' })}
									disabled={!!actionLoading}
									class="rounded-lg bg-[var(--dash-contrast-ghost-bg)] px-4 py-2 text-sm font-medium text-[var(--dash-contrast-text)] transition-colors hover:brightness-110 disabled:opacity-50"
								>
									Reject
								</button>
							{:else if submission.status === 'clarification_needed'}
								<button
									onclick={() =>
										callSubmissionAction(submission.submission_id, { status: 'under_review' })}
									disabled={!!actionLoading}
									class="rounded-lg bg-[var(--dash-bg-alt)] px-4 py-2 text-sm font-medium text-[var(--dash-text)] transition-colors hover:bg-[var(--dash-hover)] disabled:opacity-50"
								>
									{actionLoading === `sub:${submission.submission_id}`
										? 'Resuming...'
										: 'Resume Review'}
								</button>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{/if}

		<!-- Tab: Policy Captures (A.2 Slice 4) -->
	{:else if activeTab === 'captures'}
		<div class="mb-3 flex items-center justify-between">
			<label class="flex items-center gap-2 text-sm text-[var(--dash-text-secondary)]">
				<input type="checkbox" bind:checked={unconfirmedProxyOnly} />
				Unconfirmed admin-proxy only
			</label>
		</div>
		{#if filteredCaptures.length === 0}
			<div
				class="rounded-xl bg-[var(--dash-bg-card)] p-10 text-center shadow-sm ring-1 ring-[var(--dash-border-light)]"
			>
				<p class="text-[var(--dash-text-muted)]">
					{unconfirmedProxyOnly
						? 'No unconfirmed admin-proxy captures'
						: 'No policy captures awaiting review'}
				</p>
			</div>
		{:else}
			<div class="space-y-3">
				{#each filteredCaptures as capture}
					<div
						class="rounded-xl bg-[var(--dash-bg-card)] p-5 shadow-sm ring-1 ring-[var(--dash-border-light)]"
					>
						<div class="flex items-start justify-between">
							<div>
								<h3 class="font-semibold text-[var(--dash-text)]">{capture.lender_name}</h3>
								<p class="mt-0.5 text-sm text-[var(--dash-text-secondary)]">
									{capture.product_label}
									{#if capture.geo_state}/ {capture.geo_state}{/if}
								</p>
							</div>
							<div class="flex items-center gap-2">
								<span
									class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium {capture.provenance_source ===
									'admin_manual_proxy'
										? 'bg-[var(--dash-contrast-ghost-bg)] text-[var(--dash-contrast-text)]'
										: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]'}"
								>
									{provenanceLabels[capture.provenance_source] || capture.provenance_source}
								</span>
								<span
									class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium {submissionStatusColors[
										capture.status
									] || 'bg-[var(--dash-bg-alt)] text-[var(--dash-text)]'}"
								>
									{formatStatus(capture.status)}
								</span>
							</div>
						</div>

						<div
							class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--dash-text-secondary)]"
						>
							<span>RM: {capture.rm_name}</span>
							<span>{capture.completion_percent}% complete</span>
							{#if capture.unknown_fields_count > 0}
								<span class="text-[var(--dash-contrast-text)]"
									>{capture.unknown_fields_count} unknown field{capture.unknown_fields_count !== 1
										? 's'
										: ''}</span
								>
							{/if}
							<span class="text-[var(--dash-text-muted)]" title={capture.updated_at || ''}>
								{timeAgo(capture.updated_at)}
							</span>
						</div>

						<div class="mt-4 flex flex-wrap gap-2 border-t border-[var(--dash-border-light)] pt-3">
							<a
								href="/dashboard/admin/policies/captures/{capture.capture_id}"
								class="rounded-lg bg-[var(--dash-bg-alt)] px-4 py-2 text-sm font-medium text-[var(--dash-text)] transition-colors hover:bg-[var(--dash-hover)]"
							>
								Review
							</a>
							<button
								onclick={() => activateCapture(capture.capture_id)}
								disabled={!!actionLoading}
								class="rounded-lg bg-[var(--dash-btn-bg)] px-4 py-2 text-sm font-medium text-[var(--dash-btn-text)] transition-colors hover:brightness-110 disabled:opacity-50"
							>
								{actionLoading === `cap:${capture.capture_id}` ? 'Activating...' : 'Activate'}
							</button>
						</div>
					</div>
				{/each}
			</div>
		{/if}

		<!-- Tab: Recently Activated -->
	{:else if activeTab === 'activated'}
		{#if data.recentlyActivated.length === 0}
			<div
				class="rounded-xl bg-[var(--dash-bg-card)] p-10 text-center shadow-sm ring-1 ring-[var(--dash-border-light)]"
			>
				<p class="text-[var(--dash-text-muted)]">No recently activated policies</p>
			</div>
		{:else}
			<div
				class="rounded-xl bg-[var(--dash-bg-card)] shadow-sm ring-1 ring-[var(--dash-border-light)]"
			>
				<div class="divide-y divide-[var(--dash-border-light)]">
					{#each data.recentlyActivated as version}
						<div class="flex items-center justify-between px-5 py-4">
							<div>
								<p class="font-medium text-[var(--dash-text)]">{version.lender_name}</p>
								<p class="mt-0.5 text-sm text-[var(--dash-text-secondary)]">
									{version.product_label} / {version.variation_label}
									<span class="ml-1 text-xs text-[var(--dash-text-muted)]"
										>v{version.version_number}</span
									>
								</p>
							</div>
							<div class="flex items-center gap-3">
								<span
									class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium {versionStatusColors[
										version.status
									] || 'bg-[var(--dash-bg-alt)] text-[var(--dash-text)]'}"
								>
									{formatStatus(version.status)}
								</span>
								<span class="text-xs text-[var(--dash-text-muted)]"
									>{formatDate(version.updated_at)}</span
								>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	{/if}
</div>

<style>
	@keyframes pulse-urgency {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.6;
		}
	}

	:global(.urgency-pulse) {
		animation: pulse-urgency 2s ease-in-out infinite;
	}
</style>
