<script lang="ts">
	import { page } from '$app/stores';
	import { formatCurrency } from '$lib/i18n';

	const data = $derived(
		$page.data as {
			cases: Array<{
				case_id: string;
				label: string;
				loan_type: string;
				loan_type_label: string;
				amount: number | undefined;
				stage: string;
				stage_label: string;
				lenders: string[];
				dsa_name: string;
				updated_at: string;
				created_at: string;
				is_sample: boolean;
				has_open_query: boolean;
			}>;
		}
	);

	// Audit fix (RM dashboard audit 2026-05-30): seed selected stage from the
	// ?stage= query param so the home-page stat cards (Open Queries,
	// Sanctioned, etc.) can deep-link into a pre-filtered view. Validated
	// against the known options to avoid arbitrary strings landing in state.
	const initialStage = (() => {
		const qp = $page.url.searchParams.get('stage') ?? 'all';
		return ['all', 'intake', 'profiling', 'file_building', 'submitted',
			'processing', 'query', 'sanctioned', 'disbursed',
			'rejected', 'dropped', 'closed'].includes(qp) ? qp : 'all';
	})();
	let selectedStage = $state(initialStage);

	// Audit fix (RM dashboard audit 2026-05-30, B8): terminal stages
	// (rejected/dropped/closed) exist in data but were unreachable via the
	// filter — RMs could not review failed cases. quota_blocked is an
	// internal stage and stays hidden from the RM filter on purpose.
	const stageOptions = [
		{ value: 'all', label: 'All' },
		{ value: 'intake', label: 'Intake' },
		{ value: 'profiling', label: 'Profiling' },
		{ value: 'file_building', label: 'File Building' },
		{ value: 'submitted', label: 'Submitted' },
		{ value: 'processing', label: 'Processing' },
		{ value: 'query', label: 'Query' },
		{ value: 'sanctioned', label: 'Sanctioned' },
		{ value: 'disbursed', label: 'Disbursed' },
		{ value: 'rejected', label: 'Rejected' },
		{ value: 'dropped', label: 'Dropped' },
		{ value: 'closed', label: 'Closed' }
	];

	const filteredCases = $derived(
		selectedStage === 'all' ? data.cases : data.cases.filter((c) => c.stage === selectedStage)
	);

	const stageColors: Record<string, string> = {
		intake: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]',
		profiling: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]',
		file_building: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]',
		submitted: 'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)]',
		processing: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]',
		query: 'bg-[var(--dash-contrast-ghost-bg)] text-[var(--dash-contrast-text)]',
		sanctioned: 'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)]',
		disbursed: 'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)]',
		rejected: 'bg-[var(--dash-contrast-ghost-bg)] text-[var(--dash-contrast-text)]',
		dropped: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]',
		closed: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]'
	};

	function formatTimeAgo(dateStr: string): string {
		const now = Date.now();
		const then = new Date(dateStr).getTime();
		const diff = now - then;
		const mins = Math.floor(diff / 60000);
		if (mins < 1) return 'Just now';
		if (mins < 60) return `${mins}m ago`;
		const hrs = Math.floor(mins / 60);
		if (hrs < 24) return `${hrs}h ago`;
		const days = Math.floor(hrs / 24);
		if (days < 30) return `${days}d ago`;
		const months = Math.floor(days / 30);
		if (months < 12) return `${months}mo ago`;
		return `${Math.floor(months / 12)}y ago`;
	}
</script>

<svelte:head>
	<title>Cases Received - RM Dashboard</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div>
		<h1 class="text-2xl font-bold text-[var(--dash-text)]">Cases Received</h1>
		<p class="mt-1 text-sm text-[var(--dash-text-secondary)]">
			View case files shared by DSA agents
		</p>
	</div>

	<!-- Stage filter bar -->
	<div class="flex flex-wrap gap-2">
		{#each stageOptions as opt}
			<button
				type="button"
				class="rounded-full px-3 py-1 text-xs font-medium transition-colors {selectedStage ===
				opt.value
					? 'bg-[var(--dash-btn-bg)] text-[var(--dash-btn-text)] shadow-sm'
					: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)] hover:bg-[var(--dash-hover)]'}"
				onclick={() => (selectedStage = opt.value)}
			>
				{opt.label}
			</button>
		{/each}
	</div>

	<!-- Cases list -->
	{#if filteredCases.length > 0}
		<div class="grid gap-3">
			{#each filteredCases as caseItem (caseItem.case_id)}
				<a
					href="/dashboard/rm/cases/{caseItem.case_id}"
					class="block rounded-xl border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] p-4 shadow-sm transition-all hover:border-[var(--dash-border)] hover:shadow-md"
				>
					<div class="flex items-start justify-between gap-3">
						<div class="min-w-0 flex-1">
							<div class="flex items-center gap-2">
								<h3 class="truncate text-sm font-semibold text-[var(--dash-text)]">
									{caseItem.label}
								</h3>
								{#if caseItem.is_sample}
									<span
										class="shrink-0 rounded bg-[var(--dash-bg-alt)] px-1.5 py-0.5 text-[12px] font-medium text-[var(--dash-text-secondary)]"
										>Sample</span
									>
								{/if}
								{#if caseItem.has_open_query}
									<span
										class="shrink-0 rounded bg-[var(--dash-contrast-ghost-bg)] px-1.5 py-0.5 text-[12px] font-medium text-[var(--dash-contrast-text)]"
										>Query</span
									>
								{/if}
							</div>
							<div
								class="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--dash-text-secondary)]"
							>
								<span>{caseItem.loan_type_label}</span>
								{#if caseItem.amount}
									<span class="text-[var(--dash-text-muted)]">|</span>
									<span class="font-medium">{formatCurrency(caseItem.amount, true)}</span>
								{/if}
								<span class="text-[var(--dash-text-muted)]">|</span>
								<span>DSA: {caseItem.dsa_name}</span>
							</div>
							{#if caseItem.lenders.length > 0}
								<div class="mt-1.5 flex flex-wrap gap-1">
									{#each caseItem.lenders as lender}
										<span
											class="rounded bg-[var(--dash-bg-alt)] px-2 py-0.5 text-[12px] font-medium text-[var(--dash-text-secondary)]"
											>{lender}</span
										>
									{/each}
								</div>
							{/if}
						</div>
						<div class="flex shrink-0 flex-col items-end gap-1.5">
							<span
								class="rounded-full px-2.5 py-0.5 text-[12px] font-medium {stageColors[
									caseItem.stage
								] || 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]'}"
							>
								{caseItem.stage_label}
							</span>
							<span class="text-[12px] text-[var(--dash-text-muted)]"
								>{formatTimeAgo(caseItem.updated_at)}</span
							>
						</div>
					</div>
				</a>
			{/each}
		</div>
	{:else}
		<div
			class="rounded-xl border border-[var(--dash-border)] bg-[var(--dash-bg-card)] p-8 text-center"
		>
			<div
				class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--dash-bg-alt)]"
			>
				<svg
					class="h-8 w-8 text-[var(--dash-text-muted)]"
					fill="none"
					viewBox="0 0 24 24"
					stroke-width="1.5"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
					/>
				</svg>
			</div>
			<h3 class="text-lg font-semibold text-[var(--dash-text)]">No cases yet</h3>
			<p class="mx-auto mt-2 max-w-md text-sm text-[var(--dash-text-secondary)]">
				When DSA agents share case files with you, they will appear here.
			</p>
			<a
				href="/dashboard/rm/dsa-search"
				class="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[var(--dash-btn-bg)] px-4 py-2 text-xs font-medium text-[var(--dash-btn-text)] transition-all hover:brightness-105"
			>
				Find DSAs
			</a>
		</div>
	{/if}
</div>
