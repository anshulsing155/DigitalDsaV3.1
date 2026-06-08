<script lang="ts">
	import { goto } from '$app/navigation';
	import { secureFetch } from '$lib/utils/csrf';
	import { createQuery, useQueryClient } from '@tanstack/svelte-query';

	let { data } = $props();

	// PERF-3 pilot — TanStack Query migration.
	//
	// Pre-migration: SSR load() → `data.artifact`. Then a `setInterval` polled
	// `invalidateAll()` every 5s when status='parsing'. After every mutation,
	// `invalidateAll()` was called to refresh the page (which re-runs ALL
	// load functions on the page, not just this one).
	//
	// Post-migration:
	//  - createQuery wraps the new /api/admin/policies/[id] GET endpoint.
	//  - initialData seeded from data.artifact so SSR still hydrates immediately
	//    (no fetch-on-mount flash).
	//  - refetchInterval is a function — TanStack decides per-tick whether to
	//    poll based on current data status. The polling automatically stops
	//    when status leaves 'parsing' AND auto-cleans up on component unmount.
	//  - After a mutation, queryClient.invalidateQueries refreshes ONLY this
	//    artifact's query (not the entire page's load chain).
	const queryClient = useQueryClient();
	// data.artifact._id is stable for this page's lifetime — the URL parameter
	// that drove the SSR load can't change without navigation. Capturing once
	// at mount is correct; the svelte-ignore suppresses Pitfall #10's warning.
	// svelte-ignore state_referenced_locally
	const artifactQueryKey = ['admin-policy-artifact', data.artifact._id] as const;

	const artifactQuery = createQuery(() => ({
		queryKey: [...artifactQueryKey],
		queryFn: async () => {
			const res = await secureFetch(`/api/admin/policies/${data.artifact._id}`);
			const json = await res.json();
			if (!json.success) {
				throw new Error(json.error ?? 'Failed to load artifact');
			}
			return json.data as typeof data.artifact;
		},
		initialData: data.artifact,
		refetchInterval: (query) => {
			const status = (query.state.data as { status?: string } | undefined)?.status;
			return status === 'parsing' ? 5_000 : false;
		}
	}));

	// @tanstack/svelte-query v6 returns a reactive object (not a Svelte store) —
	// access fields directly, no $-prefix. `$derived` re-evaluates when the
	// query result changes.
	let a = $derived(artifactQuery.data ?? data.artifact);

	let actionLoading = $state('');
	let actionError = $state('');
	let actionSuccess = $state('');
	let showJsonLogic = $state(false);
	let expandedIteration = $state<number | null>(null);
	let correctionNote = $state('');
	let sourceDocContent = $state('');
	let showDeleteConfirm = $state(false);
	let deleteLoading = $state(false);

	const statusColors: Record<string, string> = {
		draft: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text)]',
		parsing: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text)]',
		in_review: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]',
		rm_pending: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]',
		approved: 'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)]',
		active: 'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)]',
		superseded: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]',
		parse_error: 'bg-[var(--dash-contrast-ghost-bg)] text-[var(--dash-contrast-text)]'
	};

	const stages = ['draft', 'parsing', 'in_review', 'rm_pending', 'approved', 'active'];
	const stageIdx = $derived(stages.indexOf(a.status));

	const severityColors: Record<string, string> = {
		match: 'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)]',
		minor: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]',
		major: 'bg-[var(--dash-contrast-ghost-bg)] text-[var(--dash-contrast-text)]',
		missing: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]'
	};

	function formatDate(dateStr: string | null): string {
		if (!dateStr) return '-';
		return new Date(dateStr).toLocaleDateString('en-IN', {
			day: '2-digit',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	async function callAction(endpoint: string, body?: Record<string, unknown>) {
		actionError = '';
		actionSuccess = '';
		actionLoading = endpoint;
		try {
			const res = await secureFetch(`/api/admin/policies/${a._id}/${endpoint}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body || {})
			});
			const result = await res.json();
			if (result.success) {
				if (endpoint === 'parse') {
					const iters = result.data?.iterations_run || '?';
					const converged = result.data?.converged;
					actionSuccess = converged
						? `Parsing complete (${iters} iteration${iters !== 1 ? 's' : ''}, converged)`
						: `Parsing complete (${iters} iteration${iters !== 1 ? 's' : ''}, needs review)`;
				} else if (endpoint === 'publish') {
					actionSuccess = 'Policy published and activated';
				} else if (endpoint === 'review') {
					actionSuccess = 'Review action completed';
				} else {
					actionSuccess = 'Action completed';
				}
				await queryClient.invalidateQueries({ queryKey: [...artifactQueryKey] });
			} else {
				actionError = result.error || 'Action failed';
			}
		} catch {
			actionError = 'Failed to connect to server';
		} finally {
			actionLoading = '';
		}
	}

	const canDelete = $derived(a.status !== 'parsing' && a.status !== 'rm_pending');

	const isHardDelete = $derived(['draft', 'parsing', 'in_review', 'superseded'].includes(a.status));

	async function deleteArtifact() {
		deleteLoading = true;
		actionError = '';
		actionSuccess = '';
		try {
			const res = await secureFetch(`/api/admin/policies/${a.artifact_id}/delete`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' }
			});
			const result = await res.json();
			if (result.success) {
				const action = result.data?.action;
				if (action === 'hard_delete') {
					// Redirect to list — this artifact no longer exists
					await goto('/dashboard/admin/policies');
				} else {
					actionSuccess = result.data?.message || 'Artifact marked as superseded';
					showDeleteConfirm = false;
					await queryClient.invalidateQueries({ queryKey: [...artifactQueryKey] });
				}
			} else {
				actionError = result.error || 'Delete failed';
				showDeleteConfirm = false;
			}
		} catch {
			actionError = 'Failed to connect to server';
			showDeleteConfirm = false;
		} finally {
			deleteLoading = false;
		}
	}
</script>

<svelte:head>
	<title>Admin: Policy Artifact | DigitalDSA</title>
</svelte:head>

<div class="space-y-6">
	<!-- Back link + Header -->
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
		<div class="mt-3 flex items-center justify-between">
			<div>
				<h1 class="text-2xl font-bold text-[var(--dash-text)]">{a.lender_name}</h1>
				<p class="mt-1 text-sm text-[var(--dash-text-secondary)]">
					{a.artifact_id} | v{a.version} | by {a.parsed_by}
					{#if a.previous_version_id}
						<span class="text-[var(--dash-text-muted)]">| supersedes {a.previous_version_id}</span>
					{/if}
				</p>
			</div>
			<div class="flex items-center gap-2">
				{#if canDelete}
					<button
						onclick={() => (showDeleteConfirm = true)}
						class="inline-flex items-center gap-1.5 rounded-lg border border-[var(--dash-contrast-ghost-border)] px-3 py-1.5 text-sm font-medium text-[var(--dash-contrast-text)] transition-colors hover:bg-[var(--dash-contrast-ghost-bg)]"
						title="Delete artifact"
					>
						<svg
							class="h-4 w-4"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							stroke-width="2"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
							/>
						</svg>
						Delete
					</button>
				{/if}
				<span
					class="inline-flex rounded-full px-3 py-1 text-sm font-medium {statusColors[a.status] ||
						'bg-[var(--dash-bg-alt)] text-[var(--dash-text)]'} {a.status === 'parsing'
						? 'animate-pulse'
						: ''}"
				>
					{a.status === 'parsing' ? 'Parsing...' : a.status}
				</span>
			</div>
		</div>
	</div>

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

	<!-- Parse-error banner: surfaces last AI failure when status is parse_error -->
	{#if a.status === 'parse_error' && a.last_parse_error?.message}
		<div
			class="rounded-lg border border-[var(--dash-contrast-ghost-border)] bg-[var(--dash-contrast-ghost-bg)] p-4 text-sm text-[var(--dash-contrast-text)]"
		>
			<p class="font-semibold">Parse failed</p>
			<p class="mt-1">{a.last_parse_error.message}</p>
			{#if a.last_parse_error.at}
				<p class="mt-1 text-xs opacity-75">{formatDate(a.last_parse_error.at)}</p>
			{/if}
		</div>
	{/if}

	<!-- Parsing In Progress Banner -->
	{#if a.status === 'parsing'}
		<div class="rounded-xl bg-[var(--dash-bg-alt)] p-5 ring-1 ring-[var(--dash-border)]">
			<div class="flex items-center gap-3">
				<span class="relative flex h-3 w-3">
					<span
						class="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--dash-accent-text)] opacity-75"
					></span>
					<span class="relative inline-flex h-3 w-3 rounded-full bg-[var(--dash-accent-text)]"
					></span>
				</span>
				<div>
					<p class="text-sm font-semibold text-[var(--dash-text)]">AI parsing in progress</p>
					<p class="mt-0.5 text-xs text-[var(--dash-text-secondary)]">
						This may take up to 60 seconds. The page will refresh automatically when complete.
					</p>
				</div>
			</div>
		</div>
	{/if}

	<!-- Stage Progress Bar -->
	<div
		class="rounded-xl bg-[var(--dash-bg-card)] p-5 shadow-sm ring-1 ring-[var(--dash-border-light)]"
	>
		<h2 class="mb-3 text-sm font-semibold text-[var(--dash-text)]">Pipeline Progress</h2>
		<div class="flex items-center gap-1">
			{#each stages as stage, i}
				<div class="flex flex-1 items-center">
					<div
						class="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold
						{i <= stageIdx
							? 'bg-[var(--dash-btn-bg)] text-[var(--dash-btn-text)]'
							: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]'}"
					>
						{i + 1}
					</div>
					{#if i < stages.length - 1}
						<div
							class="h-0.5 flex-1 {i < stageIdx
								? 'bg-[var(--dash-btn-bg)]'
								: 'bg-[var(--dash-bg-alt)]'}"
						></div>
					{/if}
				</div>
			{/each}
		</div>
		<div class="mt-2 flex">
			{#each stages as stage}
				<div class="flex-1 text-center text-[12px] text-[var(--dash-text-muted)]">
					{stage.replace('_', ' ')}
				</div>
			{/each}
		</div>
	</div>

	<!-- Source Documents -->
	<div
		class="rounded-xl bg-[var(--dash-bg-card)] p-5 shadow-sm ring-1 ring-[var(--dash-border-light)]"
	>
		<h2 class="mb-3 text-sm font-semibold text-[var(--dash-text)]">
			Source Documents ({a.source_document_urls.length})
		</h2>
		<div class="flex flex-wrap gap-2">
			{#each a.source_document_urls as url, i}
				<a
					href={url}
					target="_blank"
					rel="noopener"
					class="inline-flex items-center gap-1.5 rounded-lg border border-[var(--dash-border-light)] px-3 py-2 text-sm text-[var(--dash-accent-text)] transition-colors hover:bg-[var(--dash-btn-ghost-bg)]"
				>
					<svg
						class="h-4 w-4"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						stroke-width="2"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
						/>
					</svg>
					Document {i + 1}
				</a>
			{/each}
		</div>
	</div>

	<!-- Parsed Output (if available) -->
	{#if a.json_logic || a.human_readable}
		<div
			class="rounded-xl bg-[var(--dash-bg-card)] shadow-sm ring-1 ring-[var(--dash-border-light)]"
		>
			<div
				class="flex items-center justify-between border-b border-[var(--dash-border-light)] px-5 py-4"
			>
				<h2 class="text-sm font-semibold text-[var(--dash-text)]">Parsed Output</h2>
				<div class="flex gap-2">
					<button
						onclick={() => (showJsonLogic = false)}
						class="rounded-lg px-3 py-1 text-xs font-medium {!showJsonLogic
							? 'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)]'
							: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]'}"
					>
						Human Readable
					</button>
					<button
						onclick={() => (showJsonLogic = true)}
						class="rounded-lg px-3 py-1 text-xs font-medium {showJsonLogic
							? 'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)]'
							: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]'}"
					>
						JSON-Logic
					</button>
				</div>
			</div>

			<!-- Confidence scores -->
			{#if a.confidence_scores}
				<div class="border-b border-[var(--dash-border-light)] px-5 py-3">
					<div class="flex flex-wrap gap-2">
						{#each Object.entries(a.confidence_scores) as [section, score]}
							{@const pct = Math.round(Number(score) * 100)}
							<span
								class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-medium
								{pct >= 80
									? 'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)]'
									: pct >= 50
										? 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]'
										: 'bg-[var(--dash-contrast-ghost-bg)] text-[var(--dash-contrast-text)]'}"
							>
								{section}: {pct}%
							</span>
						{/each}
					</div>
				</div>
			{/if}

			<div class="p-5">
				{#if showJsonLogic}
					<pre
						class="max-h-96 overflow-auto rounded-lg bg-[var(--dash-bg-alt)] p-4 text-xs text-[var(--dash-text)]">{JSON.stringify(
							a.json_logic,
							null,
							2
						)}</pre>
				{:else}
					<div class="prose prose-sm max-w-none">
						{@html a.human_readable ||
							'<p class="text-[var(--dash-text-muted)]">No human-readable document generated yet</p>'}
					</div>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Parse Iterations -->
	{#if a.parse_iterations.length > 0}
		<div
			class="rounded-xl bg-[var(--dash-bg-card)] shadow-sm ring-1 ring-[var(--dash-border-light)]"
		>
			<div class="border-b border-[var(--dash-border-light)] px-5 py-4">
				<h2 class="text-sm font-semibold text-[var(--dash-text)]">
					Parse Iterations ({a.parse_iterations.length})
				</h2>
			</div>
			<div class="divide-y divide-[var(--dash-border-light)]">
				{#each a.parse_iterations as iter}
					<div class="px-5 py-3">
						<button
							onclick={() =>
								(expandedIteration = expandedIteration === iter.iteration ? null : iter.iteration)}
							class="flex w-full items-center justify-between text-left"
						>
							<div class="flex items-center gap-3">
								<span
									class="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--dash-bg-alt)] text-xs font-bold text-[var(--dash-text-secondary)]"
								>
									{iter.iteration}
								</span>
								<span class="text-sm font-medium text-[var(--dash-text)]">
									Iteration {iter.iteration}
								</span>
								{#if iter.resolved}
									<span
										class="rounded-full bg-[var(--dash-btn-ghost-bg)] px-2 py-0.5 text-[12px] font-medium text-[var(--dash-accent-text)]"
										>Resolved</span
									>
								{:else if iter.human_intervention_needed}
									<span
										class="rounded-full bg-[var(--dash-contrast-ghost-bg)] px-2 py-0.5 text-[12px] font-medium text-[var(--dash-contrast-text)]"
										>Needs Human</span
									>
								{:else}
									<span
										class="rounded-full bg-[var(--dash-bg-alt)] px-2 py-0.5 text-[12px] font-medium text-[var(--dash-text-secondary)]"
										>In Progress</span
									>
								{/if}
							</div>
							<span class="text-xs text-[var(--dash-text-muted)]"
								>{formatDate(iter.completed_at)}</span
							>
						</button>

						{#if expandedIteration === iter.iteration}
							<div class="mt-3 space-y-3 pl-9">
								<!-- Diff sections -->
								{#if iter.diff_report?.sections}
									<div class="space-y-1">
										{#each iter.diff_report.sections as section}
											<div class="flex items-center gap-2 text-xs">
												<span
													class="inline-flex rounded-full px-2 py-0.5 font-medium {severityColors[
														section.severity
													] || 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]'}"
												>
													{section.severity}
												</span>
												<span class="text-[var(--dash-text-secondary)]">{section.section}</span>
												{#if section.discrepancy}
													<span class="text-[var(--dash-text-muted)]">- {section.discrepancy}</span>
												{/if}
											</div>
										{/each}
									</div>
								{/if}

								<!-- Corrections made -->
								{#if iter.corrections_made.length > 0}
									<div>
										<p class="text-xs font-medium text-[var(--dash-text-secondary)]">
											Corrections:
										</p>
										<ul class="mt-1 space-y-0.5">
											{#each iter.corrections_made as correction}
												<li class="text-xs text-[var(--dash-text-secondary)]">- {correction}</li>
											{/each}
										</ul>
									</div>
								{/if}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Action Buttons -->
	<div
		class="rounded-xl bg-[var(--dash-bg-card)] p-5 shadow-sm ring-1 ring-[var(--dash-border-light)]"
	>
		<h2 class="mb-4 text-sm font-semibold text-[var(--dash-text)]">Actions</h2>

		{#if a.status === 'draft'}
			<div class="space-y-3">
				<div>
					<label
						for="sourceDocContent"
						class="block text-xs font-medium text-[var(--dash-text-secondary)]"
						>Source document content (optional, helps AI accuracy)</label
					>
					<textarea
						id="sourceDocContent"
						bind:value={sourceDocContent}
						placeholder="Paste the text content of the policy document here..."
						class="mt-1 w-full rounded-lg border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] px-3 py-2 text-sm text-[var(--dash-text)] focus:border-[var(--dash-accent-text)] focus:ring-2 focus:ring-[var(--dash-accent-text)]/20 focus:outline-none"
						rows="4"
					></textarea>
				</div>
				<button
					onclick={() => callAction('parse', { source_doc_content: sourceDocContent })}
					disabled={actionLoading === 'parse'}
					class="rounded-lg bg-[var(--dash-btn-bg)] px-5 py-2.5 text-sm font-medium text-[var(--dash-btn-text)] transition-colors hover:brightness-110 disabled:opacity-50"
				>
					{actionLoading === 'parse' ? 'Parsing (this may take a minute)...' : 'Start AI Parsing'}
				</button>
			</div>
		{:else if a.status === 'in_review'}
			<div class="flex flex-wrap gap-3">
				<button
					onclick={() => callAction('review', { action: 'approve' })}
					disabled={!!actionLoading}
					class="rounded-lg bg-[var(--dash-btn-bg)] px-5 py-2.5 text-sm font-medium text-[var(--dash-btn-text)] hover:brightness-110 disabled:opacity-50"
				>
					{actionLoading === 'review' ? '...' : 'Approve'}
				</button>
				<button
					onclick={() => callAction('review', { action: 'send_to_rm' })}
					disabled={!!actionLoading}
					class="rounded-lg bg-[var(--dash-btn-bg)] px-5 py-2.5 text-sm font-medium text-[var(--dash-btn-text)] hover:brightness-110 disabled:opacity-50"
				>
					Send to RM
				</button>
				<div class="flex flex-1 gap-2">
					<input
						type="text"
						bind:value={correctionNote}
						placeholder="Correction note..."
						class="flex-1 rounded-lg border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] px-3 py-2 text-sm text-[var(--dash-text)] focus:border-[var(--dash-accent-text)] focus:outline-none"
					/>
					<button
						onclick={() =>
							callAction('reparse', {
								corrections: correctionNote,
								source_doc_content: sourceDocContent
							})}
						disabled={!!actionLoading}
						class="rounded-lg bg-[var(--dash-bg-alt)] px-4 py-2.5 text-sm font-medium text-[var(--dash-text)] hover:brightness-110 disabled:opacity-50"
					>
						Re-parse
					</button>
				</div>
			</div>
		{:else if a.status === 'rm_pending'}
			<div class="space-y-3">
				<p class="text-sm text-[var(--dash-text-secondary)]">Waiting for RM verification</p>
				{#if a.rm_review.queries.length > 0}
					<div class="space-y-2">
						{#each a.rm_review.queries as query}
							<div class="rounded-lg border border-[var(--dash-border-light)] p-3 text-sm">
								<span class="font-medium text-[var(--dash-text)]">{query.category}:</span>
								<span class="text-[var(--dash-text-secondary)]">{query.question}</span>
								{#if query.resolved}
									<span class="ml-2 text-[var(--dash-accent-text)]">(Resolved)</span>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
				<button
					onclick={() => callAction('review', { action: 'approve' })}
					disabled={!!actionLoading}
					class="rounded-lg bg-[var(--dash-btn-bg)] px-5 py-2.5 text-sm font-medium text-[var(--dash-btn-text)] hover:brightness-110 disabled:opacity-50"
				>
					Override: Approve
				</button>
			</div>
		{:else if a.status === 'approved'}
			<button
				onclick={() => callAction('publish')}
				disabled={!!actionLoading}
				class="rounded-lg bg-[var(--dash-btn-bg)] px-5 py-2.5 text-sm font-medium text-[var(--dash-btn-text)] hover:brightness-110 disabled:opacity-50"
			>
				{actionLoading === 'publish' ? 'Publishing...' : 'Publish (Activate)'}
			</button>
		{:else if a.status === 'active'}
			<div class="flex items-center gap-3">
				<span class="text-sm font-medium text-[var(--dash-accent-text)]">This rule set is live</span
				>
				<span class="text-xs text-[var(--dash-text-muted)]"
					>Activated: {formatDate(a.activated_at)}</span
				>
				<a
					href="/dashboard/admin/policies/{a._id}/test"
					class="rounded-lg bg-[var(--dash-btn-ghost-bg)] px-4 py-2 text-sm font-medium text-[var(--dash-accent-text)] hover:brightness-110"
				>
					Test with Fixtures
				</a>
			</div>
		{:else if a.status === 'superseded'}
			<p class="text-sm text-[var(--dash-text-muted)]">
				This version has been superseded by a newer version.
			</p>
		{/if}
	</div>

	<!-- Version History -->
	{#if a.change_summary || a.changes_from_previous}
		<div
			class="rounded-xl bg-[var(--dash-bg-card)] p-5 shadow-sm ring-1 ring-[var(--dash-border-light)]"
		>
			<h2 class="mb-3 text-sm font-semibold text-[var(--dash-text)]">
				Version Changes (v{a.version})
			</h2>
			{#if a.change_summary}
				<p class="mb-3 text-sm text-[var(--dash-text-secondary)]">{a.change_summary}</p>
			{/if}
			{#if a.changes_from_previous}
				<div class="grid grid-cols-2 gap-3 text-sm lg:grid-cols-4">
					<div>
						<p class="text-xs text-[var(--dash-text-muted)]">Sections Modified</p>
						<p class="font-medium text-[var(--dash-text)]">
							{a.changes_from_previous.sections_modified?.join(', ') || 'None'}
						</p>
					</div>
					<div>
						<p class="text-xs text-[var(--dash-text-muted)]">Rules Added</p>
						<p class="font-medium text-[var(--dash-accent-text)]">
							+{a.changes_from_previous.rules_added || 0}
						</p>
					</div>
					<div>
						<p class="text-xs text-[var(--dash-text-muted)]">Rules Removed</p>
						<p class="font-medium text-[var(--dash-contrast-text)]">
							-{a.changes_from_previous.rules_removed || 0}
						</p>
					</div>
					<div>
						<p class="text-xs text-[var(--dash-text-muted)]">Rules Modified</p>
						<p class="font-medium text-[var(--dash-text)]">
							{a.changes_from_previous.rules_modified || 0}
						</p>
					</div>
				</div>
				{#if a.changes_from_previous.parameter_changes?.length > 0}
					<div class="mt-3">
						<p class="text-xs font-medium text-[var(--dash-text-secondary)]">Parameter Changes:</p>
						<div class="mt-1 space-y-1">
							{#each a.changes_from_previous.parameter_changes as change}
								<div class="flex items-center gap-2 text-xs">
									<span class="font-medium text-[var(--dash-text)]">{change.param}:</span>
									<span class="text-[var(--dash-contrast-text)] line-through"
										>{JSON.stringify(change.old_value)}</span
									>
									<span class="text-[var(--dash-text-muted)]">&rarr;</span>
									<span class="text-[var(--dash-accent-text)]"
										>{JSON.stringify(change.new_value)}</span
									>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			{/if}
		</div>
	{/if}

	<!-- Metadata -->
	<div
		class="rounded-xl bg-[var(--dash-bg-card)] p-5 shadow-sm ring-1 ring-[var(--dash-border-light)]"
	>
		<h2 class="mb-3 text-sm font-semibold text-[var(--dash-text)]">Metadata</h2>
		<div class="grid grid-cols-2 gap-3 text-sm lg:grid-cols-4">
			<div>
				<p class="text-xs text-[var(--dash-text-muted)]">Classification</p>
				<p class="font-medium text-[var(--dash-text)]">{a.classification}</p>
			</div>
			<div>
				<p class="text-xs text-[var(--dash-text-muted)]">Loan Types</p>
				<p class="font-medium text-[var(--dash-text)]">{a.loan_types.join(', ') || '-'}</p>
			</div>
			<div>
				<p class="text-xs text-[var(--dash-text-muted)]">Created</p>
				<p class="font-medium text-[var(--dash-text)]">{formatDate(a.created_at)}</p>
			</div>
			<div>
				<p class="text-xs text-[var(--dash-text-muted)]">Reviewed By</p>
				<p class="font-medium text-[var(--dash-text)]">{a.reviewed_by || '-'}</p>
			</div>
		</div>
		{#if a.deleted_by}
			<div class="mt-3 rounded-lg bg-[var(--dash-contrast-ghost-bg)] px-3 py-2">
				<p class="text-xs text-[var(--dash-contrast-text)]">
					Deleted by {a.deleted_by} on {formatDate(a.deleted_at)}
				</p>
			</div>
		{/if}
	</div>
</div>

<!-- Delete Confirmation Dialog -->
{#if showDeleteConfirm}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
		<div class="w-full max-w-md rounded-xl bg-[var(--dash-bg-card)] p-6 shadow-xl">
			<div class="mb-4 flex items-center gap-3">
				<div
					class="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--dash-contrast-ghost-bg)]"
				>
					<svg
						class="h-5 w-5 text-[var(--dash-contrast-text)]"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						stroke-width="2"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
						/>
					</svg>
				</div>
				<div>
					<h3 class="text-lg font-semibold text-[var(--dash-text)]">Delete Artifact</h3>
					<p class="text-sm text-[var(--dash-text-secondary)]">{a.lender_name} (v{a.version})</p>
				</div>
			</div>

			{#if isHardDelete}
				<p class="mb-4 text-sm text-[var(--dash-text-secondary)]">
					This will <strong class="text-[var(--dash-contrast-text)]">permanently delete</strong> this
					artifact. This action cannot be undone.
				</p>
			{:else}
				<p class="mb-4 text-sm text-[var(--dash-text-secondary)]">
					This will mark the artifact as <strong>superseded</strong>. It will no longer be used in
					evaluations but the record will be preserved for audit purposes.
				</p>
			{/if}

			<div class="flex justify-end gap-3">
				<button
					onclick={() => (showDeleteConfirm = false)}
					disabled={deleteLoading}
					class="rounded-lg border border-[var(--dash-border-light)] px-4 py-2 text-sm font-medium text-[var(--dash-text)] hover:bg-[var(--dash-hover)] disabled:opacity-50"
				>
					Cancel
				</button>
				<button
					onclick={deleteArtifact}
					disabled={deleteLoading}
					class="rounded-lg border border-[var(--dash-contrast-ghost-border)] bg-[var(--dash-contrast-ghost-bg)] px-4 py-2 text-sm font-medium text-[var(--dash-contrast-text)] hover:brightness-110 disabled:opacity-50"
				>
					{deleteLoading ? 'Deleting...' : isHardDelete ? 'Delete Permanently' : 'Mark Superseded'}
				</button>
			</div>
		</div>
	</div>
{/if}
