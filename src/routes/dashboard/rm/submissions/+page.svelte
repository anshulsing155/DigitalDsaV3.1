<script lang="ts">
	let { data } = $props();

	let statusFilter = $state('all');

	const statusColors: Record<string, string> = {
		submitted: 'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)]',
		under_review: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]',
		clarification_needed: 'bg-[var(--dash-contrast-ghost-bg)] text-[var(--dash-contrast-text)]',
		accepted: 'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)]',
		rejected: 'bg-[var(--dash-contrast-ghost-bg)] text-[var(--dash-contrast-text)]'
	};

	// Audit fix (RM dashboard audit 2026-05-30): 'normal' and 'urgent' were
	// rendered identically — only 'critical' stood out. Give 'urgent' the
	// accent style so RMs can triage at a glance.
	const urgencyColors: Record<string, string> = {
		normal: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]',
		urgent: 'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)]',
		critical: 'bg-[var(--dash-contrast-ghost-bg)] text-[var(--dash-contrast-text)]'
	};

	const statusLabels: Record<string, string> = {
		submitted: 'Submitted',
		under_review: 'Under Review',
		clarification_needed: 'Clarification Needed',
		accepted: 'Accepted',
		rejected: 'Rejected'
	};

	function formatDate(dateStr: string | null): string {
		if (!dateStr) return '-';
		return new Date(dateStr).toLocaleDateString('en-IN', {
			day: '2-digit',
			month: 'short',
			year: 'numeric'
		});
	}

	let filteredSubmissions = $derived(
		statusFilter === 'all'
			? data.submissions
			: data.submissions.filter((s) => s.status === statusFilter)
	);
</script>

<svelte:head>
	<title>RM: Submissions | DigitalDSA</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold text-[var(--dash-text)]">My Submissions</h1>
			<p class="mt-1 text-sm text-[var(--dash-text-muted)]">
				Policy updates and changes submitted for admin review
			</p>
		</div>
		<a
			href="/dashboard/rm/submissions/new"
			class="rounded-lg bg-[var(--dash-btn-bg)] px-4 py-2.5 text-sm font-medium text-[var(--dash-btn-text)] transition-colors hover:brightness-105"
		>
			New Submission
		</a>
	</div>

	<!-- Status Filters -->
	<div class="flex flex-wrap gap-2">
		{#each ['all', 'submitted', 'under_review', 'clarification_needed', 'accepted', 'rejected'] as status}
			<button
				onclick={() => (statusFilter = status)}
				class="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors
					{statusFilter === status
					? 'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)]'
					: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)] hover:bg-[var(--dash-hover)]'}"
			>
				{status === 'all' ? 'All' : statusLabels[status] || status}
			</button>
		{/each}
	</div>

	{#if filteredSubmissions.length === 0}
		<div class="card-surface rounded-xl p-10 text-center">
			<p class="text-[var(--dash-text-muted)]">
				{statusFilter === 'all'
					? 'No submissions yet'
					: `No ${statusLabels[statusFilter] || statusFilter} submissions`}
			</p>
			<a
				href="/dashboard/rm/submissions/new"
				class="mt-3 inline-block text-sm font-medium text-[var(--dash-accent-text)] hover:text-[var(--dash-accent-text)]"
			>
				Create your first submission
			</a>
		</div>
	{:else}
		<div class="space-y-3">
			{#each filteredSubmissions as submission}
				<div class="card-surface rounded-xl p-5 transition-shadow hover:shadow-md">
					<div class="flex items-start justify-between">
						<div>
							<div class="flex items-center gap-2">
								<h3 class="font-semibold text-[var(--dash-text)]">{submission.lender_name}</h3>
								{#if submission.product_type}
									<span
										class="rounded bg-[var(--dash-bg-alt)] px-1.5 py-0.5 font-mono text-[12px] text-[var(--dash-text-muted)]"
										>{submission.product_type}</span
									>
								{/if}
							</div>
							<p class="mt-1 line-clamp-2 text-sm text-[var(--dash-text-muted)]">
								{submission.description}
							</p>
						</div>
						<div class="flex items-center gap-2">
							<span
								class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium {urgencyColors[
									submission.urgency
								] || ''}"
							>
								{submission.urgency}
							</span>
							<span
								class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium {statusColors[
									submission.status
								] || 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]'}"
							>
								{statusLabels[submission.status] || submission.status}
							</span>
						</div>
					</div>
					<div
						class="mt-3 flex items-center justify-between border-t border-[var(--dash-border-light)] pt-3"
					>
						<div class="flex items-center gap-4 text-xs text-[var(--dash-text-muted)]">
							<span>{submission.submission_id}</span>
							<span
								>{submission.document_count} doc{submission.document_count !== 1 ? 's' : ''}</span
							>
							<span>Submitted {formatDate(submission.created_at)}</span>
						</div>
						<a
							href="/dashboard/rm/submissions/{submission.submission_id}"
							class="text-sm font-medium text-[var(--dash-accent-text)] hover:text-[var(--dash-accent-text)]"
						>
							View Details
						</a>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
