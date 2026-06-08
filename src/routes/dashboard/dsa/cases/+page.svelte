<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { ROUTES } from '$lib/config/routes.js';
	import PageTourButton from '$lib/components/walkthrough/PageTourButton.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import { Funnel, FileText } from '$lib/utils/iconRegistry';
	import { formatCurrency } from '$lib/i18n';
	import { dsaCaseTitle } from '$lib/utils/caseLabel';

	// ── Server data ──────────────────────────────────────────────
	const data = $derived(
		$page.data as {
			cases: Array<{
				case_id: string;
				label: string;
				loan_type: string;
				loan_type_label: string;
				loan_amount: number;
				applicant_name: string;
				applicant_city: string;
				stage: string;
				stage_label: string;
				lender_summaries: Array<{
					lender_name: string;
					status: string;
					document_total: number;
					document_completed: number;
					document_completion_percent: number;
					open_queries: number;
				}>;
				lenders_count: number;
				document_completion_percent: number;
				days_in_current_stage: number;
				has_open_queries: boolean;
				open_query_count: number;
				priority: 'high' | 'medium' | 'low' | 'none';
				priority_rank: number;
				next_action: string;
				is_sample: boolean;
				updated_at: string;
				created_at: string;
				// Item 3 — pre-computed Edit form URL per row (null for sample
				// cases or loan types with no form route).
				editFormURL: string | null;
			}>;
			pagination: {
				page: number;
				total: number;
				filtered: number;
				totalPages: number;
				perPage: number;
			};
			quickStats: {
				total: number;
				active: number;
				submitted: number;
				sanctioned: number;
			};
			filterOptions: {
				stages: Array<{ value: string; label: string; count: number }>;
				loanTypes: Array<{ value: string; label: string }>;
				lenders: string[];
			};
			activeFilters: {
				stage: string;
				loan_type: string;
				lender: string;
				search: string;
				sort: string;
				page: number;
			};
			// QBC — quota state for New Case button gating. Null when the load
			// failed gracefully (logged on the server) — UI falls through to the
			// always-enabled New Case link in that case (fail-open UX consistent
			// with the evaluate-and-persist gate's fail-open posture).
			quotaState: null | {
				planId: string;
				planName: string;
				caseLimit: number;
				saveBuffer: number;
				activeCount: number;
				blockedCount: number;
				bufferRemaining: number;
				isExhausted: boolean;
				isBufferFull: boolean;
				newCaseDisabled: boolean;
				editFormDisabled: boolean;
				recommendedPlan: string;
				recommendedPlanName: string;
				recommendedPlanLimit: number | null;
				nextCycleAt?: string;
			};
		}
	);

	// ── Local filter state (bound to inputs) ────────────────────
	let searchInput = $state('');
	let stageFilter = $state('');
	let loanTypeFilter = $state('');
	let lenderFilter = $state('');

	// ── View mode: table (default) or cards (B.5). Persisted per browser. ──
	let viewMode = $state<'table' | 'cards'>('table');
	$effect(() => {
		const saved = localStorage.getItem('dsaCasesViewMode');
		if (saved === 'cards' || saved === 'table') viewMode = saved;
	});
	function setViewMode(mode: 'table' | 'cards') {
		viewMode = mode;
		localStorage.setItem('dsaCasesViewMode', mode);
	}

	// ── Triage sort (B.5) ──────────────────────────────────────────
	const currentSort = $derived(data.activeFilters?.sort || 'priority');
	function setSort(key: string) {
		applyFilters({ sort: key === 'priority' ? '' : key, page: '1' });
	}

	// ── Inline row expansion (B.5) ─────────────────────────────────
	let expandedId = $state<string | null>(null);
	function toggleExpand(caseId: string) {
		expandedId = expandedId === caseId ? null : caseId;
	}

	const priorityDot: Record<string, string> = {
		high: 'bg-[var(--dash-contrast-text)]',
		medium: 'bg-[var(--ddsa-accent-500)]',
		low: 'bg-[var(--dash-text-muted)]',
		none: 'bg-transparent ring-1 ring-[var(--dash-border)]'
	};

	// Sync local state when URL changes externally
	$effect(() => {
		searchInput = data.activeFilters.search;
		stageFilter = data.activeFilters.stage;
		loanTypeFilter = data.activeFilters.loan_type;
		lenderFilter = data.activeFilters.lender;
	});

	// ── Debounced search ────────────────────────────────────────
	let searchTimeout: ReturnType<typeof setTimeout> | undefined;

	function handleSearchInput(value: string) {
		searchInput = value;
		clearTimeout(searchTimeout);
		searchTimeout = setTimeout(() => {
			applyFilters({ search: value, page: '1' });
		}, 400);
	}

	// ── Apply filters via URL ───────────────────────────────────
	function applyFilters(overrides: Record<string, string> = {}) {
		const params = new URLSearchParams();
		const filters = {
			stage: stageFilter,
			loan_type: loanTypeFilter,
			lender: lenderFilter,
			search: searchInput,
			// 'priority' is the default — omit it from the URL to keep links clean.
			sort: currentSort === 'priority' ? '' : currentSort,
			page: '1',
			...overrides
		};

		for (const [key, value] of Object.entries(filters)) {
			if (value && value !== '1') {
				params.set(key, value);
			} else if (key === 'page' && value !== '1') {
				params.set(key, value);
			}
		}

		const qs = params.toString();
		goto(`/dashboard/dsa/cases${qs ? '?' + qs : ''}`, { replaceState: true, keepFocus: true });
	}

	function handleStageChange(value: string) {
		stageFilter = value;
		applyFilters({ stage: value, page: '1' });
	}

	function handleLoanTypeChange(value: string) {
		loanTypeFilter = value;
		applyFilters({ loan_type: value, page: '1' });
	}

	function handleLenderChange(value: string) {
		lenderFilter = value;
		applyFilters({ lender: value, page: '1' });
	}

	function clearFilters() {
		searchInput = '';
		stageFilter = '';
		loanTypeFilter = '';
		lenderFilter = '';
		goto('/dashboard/dsa/cases', { replaceState: true });
	}

	function goToPage(pageNum: number) {
		applyFilters({ page: String(pageNum) });
	}

	// ── Derived state ───────────────────────────────────────────
	const hasActiveFilters = $derived(
		data.activeFilters.stage !== '' ||
			data.activeFilters.loan_type !== '' ||
			data.activeFilters.lender !== '' ||
			data.activeFilters.search !== ''
	);

	const isFiltered = $derived(data.pagination.filtered !== data.pagination.total);

	// ── Stage badge colors — 60-30-10 rule ──────────────────────
	// 60% neutral: in-progress + terminal stages
	// 30% brand accent: success stages (sanctioned, disbursed, submitted)
	// 10% contrast complement: attention stages (query)
	const stageColors: Record<string, string> = {
		intake:
			'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)] border border-[var(--dash-border)]',
		profiling:
			'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)] border border-[var(--dash-border)]',
		file_building:
			'bg-[var(--dash-bg-alt)] text-[var(--dash-text)] border border-[var(--dash-border)]',
		submitted:
			'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)] border border-[var(--dash-btn-ghost-border)]',
		processing:
			'bg-[var(--dash-bg-alt)] text-[var(--dash-text)] border border-[var(--dash-border)]',
		query:
			'bg-[var(--dash-contrast-ghost-bg)] text-[var(--dash-contrast-text)] border border-[var(--dash-contrast-ghost-border)]',
		sanctioned:
			'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)] border border-[var(--dash-btn-ghost-border)]',
		disbursed:
			'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)] border border-[var(--dash-btn-ghost-border)]',
		rejected:
			'bg-[var(--dash-bg-alt)] text-[var(--dash-text-muted)] border border-[var(--dash-border)]',
		dropped:
			'bg-[var(--dash-bg-alt)] text-[var(--dash-text-muted)] border border-[var(--dash-border)]',
		closed:
			'bg-[var(--dash-bg-alt)] text-[var(--dash-text-muted)] border border-[var(--dash-border)]'
	};

	// ── Format helpers ────────────────────────────────────────── Cr`;

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
		if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
		return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
	}
</script>

<svelte:head>
	<title>Cases | DigitalDSA</title>
</svelte:head>

<div class="pb-20 lg:pb-0">
	<!-- ═══════════════════════════════════════════════════════════ -->
	<!-- PAGE HEADER                                                -->
	<!-- ═══════════════════════════════════════════════════════════ -->
	<div class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
		<div class="flex items-center gap-3">
			<h1 class="text-xl font-bold text-[var(--dash-text)] md:text-2xl">My Cases</h1>
			<span
				class="rounded-full bg-[var(--dash-bg-alt)] px-2.5 py-0.5 text-xs font-semibold text-[var(--dash-text-secondary)]"
			>
				{data.pagination.total}
			</span>
			<PageTourButton pageId="cases" />
		</div>
		{#if data.quotaState?.newCaseDisabled}
			<!-- QBC — New Case gated when DSA's monthly quota is exhausted.
			     The case-limit gate inside /api/evaluate-and-persist is the
			     enforcement surface; this disable is the UX surface that
			     prevents the DSA from starting a case they can't submit. -->
			<div class="flex flex-col items-end gap-1">
				<button
					type="button"
					disabled
					data-walkthrough="cases-new-button"
					class="inline-flex cursor-not-allowed items-center gap-2 rounded-xl bg-[var(--dash-bg-alt)] px-5 py-2.5 text-sm font-semibold text-[var(--dash-text-muted)] opacity-60"
					title="Monthly limit reached — upgrade your plan or wait for the next cycle"
				>
					<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
					</svg>
					New Case
				</button>
				<p class="max-w-xs text-right text-xs text-[var(--dash-text-muted)]">
					Monthly limit reached ({data.quotaState.activeCount}/{data.quotaState.caseLimit}).
					<a
						href="/dashboard/dsa/billing?recommend={encodeURIComponent(data.quotaState.recommendedPlan)}"
						class="font-medium text-[var(--dash-accent-text)] underline hover:no-underline"
					>
						Upgrade to {data.quotaState.recommendedPlanName}
					</a>
					{#if data.quotaState.blockedCount > 0}
						or wait for next cycle ({data.quotaState.blockedCount} of {data.quotaState.saveBuffer} saved).
					{:else}
						or wait for next cycle.
					{/if}
				</p>
			</div>
		{:else}
			<a
				href={ROUTES.FORM.HOW_CAN_WE_HELP}
				data-walkthrough="cases-new-button"
				class="inline-flex items-center gap-2 rounded-xl bg-[var(--dash-btn-bg)] px-5 py-2.5 text-sm font-semibold text-[var(--dash-btn-text)] shadow-lg shadow-neutral-200/50 transition-all hover:shadow-xl hover:brightness-105 dark:shadow-neutral-900/20"
			>
				<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
				</svg>
				New Case
			</a>
		{/if}
	</div>

	<!-- ═══════════════════════════════════════════════════════════ -->
	<!-- QUICK STATS BAR                                            -->
	<!-- ═══════════════════════════════════════════════════════════ -->
	{#if data.quickStats.total > 0}
		<div
			data-walkthrough="cases-quick-stats"
			class="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] px-4 py-2.5 text-sm shadow-sm"
		>
			<span class="font-medium text-[var(--dash-text-secondary)]">
				Total: <span class="font-bold text-[var(--dash-text)]">{data.quickStats.total}</span>
			</span>
			<span class="text-[var(--dash-text-muted)]">|</span>
			<span class="font-medium text-[var(--dash-text-secondary)]">
				Active: <span class="font-bold text-[var(--dash-text)]">{data.quickStats.active}</span>
			</span>
			<span class="text-[var(--dash-text-muted)]">|</span>
			<span class="font-medium text-[var(--dash-text-secondary)]">
				Submitted: <span class="font-bold text-[var(--dash-text)]">{data.quickStats.submitted}</span
				>
			</span>
			<span class="text-[var(--dash-text-muted)]">|</span>
			<span class="font-medium text-[var(--dash-text-secondary)]">
				Sanctioned: <span class="font-bold text-[var(--dash-accent-text)]"
					>{data.quickStats.sanctioned}</span
				>
			</span>
		</div>
	{/if}

	<!-- ═══════════════════════════════════════════════════════════ -->
	<!-- FILTER BAR                                                 -->
	<!-- ═══════════════════════════════════════════════════════════ -->
	<div
		data-walkthrough="cases-filter-bar"
		class="mb-6 rounded-xl border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] p-3 shadow-sm md:p-4"
	>
		<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
			<!-- Search input -->
			<div class="relative lg:col-span-2">
				<svg
					class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--dash-text-muted)]"
					fill="none"
					viewBox="0 0 24 24"
					stroke-width="2"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
					/>
				</svg>
				<input
					type="text"
					placeholder="Search by case label or ID..."
					value={searchInput}
					oninput={(e) => handleSearchInput(e.currentTarget.value)}
					class="w-full rounded-lg border border-[var(--dash-border)] bg-[var(--dash-input-bg)] py-2 pr-4 pl-10 text-sm text-[var(--dash-text-secondary)] transition-colors placeholder:text-[var(--dash-text-muted)] focus:border-[var(--ddsa-accent-500)] focus:bg-[var(--dash-bg-card)] focus:ring-2 focus:ring-[var(--ddsa-accent-500)]/20 focus:outline-none"
				/>
			</div>

			<!-- Stage filter -->
			<select
				value={stageFilter}
				onchange={(e) => handleStageChange(e.currentTarget.value)}
				class="rounded-lg border border-[var(--dash-border)] bg-[var(--dash-input-bg)] px-3 py-2 text-sm text-[var(--dash-text-secondary)] transition-colors focus:border-[var(--ddsa-accent-500)] focus:bg-[var(--dash-bg-card)] focus:ring-2 focus:ring-[var(--ddsa-accent-500)]/20 focus:outline-none"
			>
				<option value="">All Stages</option>
				{#each data.filterOptions.stages as stage}
					<option value={stage.value}>{stage.label} ({stage.count})</option>
				{/each}
			</select>

			<!-- Loan Type filter -->
			<select
				value={loanTypeFilter}
				onchange={(e) => handleLoanTypeChange(e.currentTarget.value)}
				class="rounded-lg border border-[var(--dash-border)] bg-[var(--dash-input-bg)] px-3 py-2 text-sm text-[var(--dash-text-secondary)] transition-colors focus:border-[var(--ddsa-accent-500)] focus:bg-[var(--dash-bg-card)] focus:ring-2 focus:ring-[var(--ddsa-accent-500)]/20 focus:outline-none"
			>
				<option value="">All Loan Types</option>
				{#each data.filterOptions.loanTypes as lt}
					<option value={lt.value}>{lt.label}</option>
				{/each}
			</select>

			<!-- Lender filter -->
			<div class="flex gap-2">
				<select
					value={lenderFilter}
					onchange={(e) => handleLenderChange(e.currentTarget.value)}
					class="min-w-0 flex-1 rounded-lg border border-[var(--dash-border)] bg-[var(--dash-input-bg)] px-3 py-2 text-sm text-[var(--dash-text-secondary)] transition-colors focus:border-[var(--ddsa-accent-500)] focus:bg-[var(--dash-bg-card)] focus:ring-2 focus:ring-[var(--ddsa-accent-500)]/20 focus:outline-none"
				>
					<option value="">All Lenders</option>
					{#each data.filterOptions.lenders as lender}
						<option value={lender}>{lender}</option>
					{/each}
				</select>

				{#if hasActiveFilters}
					<button
						onclick={clearFilters}
						class="shrink-0 rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-3 py-2 text-xs font-medium text-[var(--dash-text-secondary)] transition-colors hover:border-[var(--dash-contrast-ghost-border)] hover:bg-[var(--dash-contrast-ghost-bg)] hover:text-[var(--dash-contrast-text)]"
						title="Clear all filters"
						aria-label="Clear all filters"
					>
						<svg
							class="h-4 w-4"
							fill="none"
							viewBox="0 0 24 24"
							stroke-width="2"
							stroke="currentColor"
						>
							<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				{/if}
			</div>
		</div>

		{#if isFiltered}
			<p class="mt-2 text-xs text-[var(--dash-text-secondary)]">
				Showing {data.pagination.filtered} of {data.pagination.total} cases
			</p>
		{/if}
	</div>

	<!-- View toggle: table (default) or cards (B.5) -->
	{#if data.cases.length > 0}
		<div class="mb-3 flex justify-end">
			<div class="inline-flex overflow-hidden rounded-lg border border-[var(--dash-border)]">
				<button
					onclick={() => setViewMode('table')}
					class="px-3 py-1.5 text-xs font-medium transition-colors {viewMode === 'table'
						? 'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)]'
						: 'bg-[var(--dash-bg-card)] text-[var(--dash-text-secondary)] hover:bg-[var(--dash-hover)]'}"
				>
					Table
				</button>
				<button
					onclick={() => setViewMode('cards')}
					class="border-l border-[var(--dash-border)] px-3 py-1.5 text-xs font-medium transition-colors {viewMode ===
					'cards'
						? 'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)]'
						: 'bg-[var(--dash-bg-card)] text-[var(--dash-text-secondary)] hover:bg-[var(--dash-hover)]'}"
				>
					Cards
				</button>
			</div>
		</div>
	{/if}

	<!-- ═══════════════════════════════════════════════════════════ -->
	<!-- CASE LIST (cards or table)                                 -->
	<!-- ═══════════════════════════════════════════════════════════ -->
	{#if data.cases.length > 0}
		{#if viewMode === 'cards'}
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
			{#each data.cases as caseItem, i}
				<a
					href="/dashboard/dsa/cases/{caseItem.case_id}"
					data-walkthrough={i === 0 ? 'cases-card-first' : undefined}
					class="group flex flex-col rounded-xl border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] p-4 shadow-sm transition-all hover:border-[var(--ddsa-accent-500)]/30 hover:shadow-md"
				>
					<!-- Top row: label + case_id -->
					<div class="mb-3 flex items-start justify-between gap-2">
						<div class="min-w-0">
							<div class="flex items-center gap-2">
								<h3
									class="truncate text-sm font-bold text-[var(--dash-text)] group-hover:text-[var(--ddsa-accent-500)]"
								>
									{dsaCaseTitle(caseItem.label, caseItem.applicant_name)}
								</h3>
								{#if caseItem.is_sample}
									<span
										class="shrink-0 rounded bg-[var(--dash-btn-ghost-bg)] px-1.5 py-0.5 text-[12px] font-medium text-[var(--dash-accent-text)]"
									>
										Sample
									</span>
								{/if}
							</div>
							<p class="mt-0.5 font-mono text-[12px] text-[var(--dash-text-muted)]">
								{caseItem.case_id}
							</p>
						</div>
						<span
							class="shrink-0 rounded-full px-2.5 py-0.5 text-[12px] font-semibold {stageColors[
								caseItem.stage
							] || 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]'}"
						>
							{caseItem.stage_label}
						</span>
					</div>

					<!-- Loan type + amount -->
					<div class="mb-3 flex flex-wrap items-center gap-2">
						<span
							class="rounded-md bg-[var(--dash-btn-ghost-bg)] px-2 py-0.5 text-[13px] font-medium text-[var(--dash-accent-text)]"
						>
							{caseItem.loan_type_label}
						</span>
						{#if caseItem.loan_amount > 0}
							<span class="text-sm font-semibold text-[var(--dash-text)]">
								{formatCurrency(caseItem.loan_amount, true)}
							</span>
						{/if}
					</div>

					<!-- Lenders -->
					{#if caseItem.lender_summaries.length > 0}
						<div class="mb-3 flex flex-wrap items-center gap-1.5">
							{#each caseItem.lender_summaries.slice(0, 2) as lender}
								<span
									class="rounded-md border border-[var(--dash-border)] bg-[var(--dash-bg-alt)] px-2 py-0.5 text-[12px] font-medium text-[var(--dash-text-secondary)]"
								>
									{lender.lender_name}
								</span>
							{/each}
							{#if caseItem.lender_summaries.length > 2}
								<span
									class="rounded-md bg-[var(--dash-bg-alt)] px-2 py-0.5 text-[12px] font-medium text-[var(--dash-text-secondary)]"
								>
									+{caseItem.lender_summaries.length - 2} more
								</span>
							{/if}
						</div>
					{:else}
						<div class="mb-3">
							<span class="text-[12px] text-[var(--dash-text-muted)] italic"
								>No lenders added yet</span
							>
						</div>
					{/if}

					<!-- Document completion progress bar -->
					{#if caseItem.lender_summaries.length > 0}
						<div class="mb-3">
							<div class="mb-1 flex items-center justify-between">
								<span class="text-[12px] font-medium text-[var(--dash-text-secondary)]"
									>Documents</span
								>
								<span class="text-[12px] font-bold text-[var(--dash-text-secondary)]"
									>{caseItem.document_completion_percent}%</span
								>
							</div>
							<div class="h-1.5 w-full overflow-hidden rounded-full bg-[var(--dash-bg-alt)]">
								<div
									class="h-full rounded-full transition-all duration-500 ease-out {caseItem.document_completion_percent ===
									100
										? 'bg-emerald-500'
										: caseItem.document_completion_percent >= 50
											? 'bg-blue-500'
											: 'bg-stone-500'}"
									style="width: {caseItem.document_completion_percent}%"
								></div>
							</div>
						</div>
					{/if}

					<!-- Bottom row: meta info -->
					<div
						class="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-[var(--dash-border-light)] pt-3 text-[12px] text-[var(--dash-text-muted)]"
					>
						<!-- Open queries -->
						{#if caseItem.has_open_queries}
							<span
								class="flex items-center gap-1 rounded-full bg-[var(--dash-contrast-ghost-bg)] px-2 py-0.5 font-semibold text-[var(--dash-contrast-text)]"
							>
								<svg
									class="h-3 w-3"
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
								{caseItem.open_query_count}
								{caseItem.open_query_count === 1 ? 'query' : 'queries'}
							</span>
						{/if}

						<!-- Days in stage -->
						<span class="flex items-center gap-1">
							<svg
								class="h-3 w-3"
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
							{caseItem.days_in_current_stage}d in stage
						</span>

						<!-- Updated ago -->
						<span class="ml-auto">{formatTimeAgo(caseItem.updated_at)}</span>
					</div>
				</a>
			{/each}
		</div>
		{:else}
			<!-- Triage table view (B.5) -->
			{@const sortArrow = (k: string) => (currentSort === k ? ' ↓' : '')}
			<div class="overflow-x-auto rounded-xl border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] shadow-sm">
				<table class="w-full min-w-[820px] text-left text-sm">
					<thead class="border-b border-[var(--dash-border-light)] text-[11px] tracking-wider text-[var(--dash-text-muted)] uppercase">
						<tr>
							<th class="w-6 px-2 py-2.5"></th>
							<th class="px-3 py-2.5 font-semibold">Applicant</th>
							<th class="px-3 py-2.5 font-semibold">Loan</th>
							<th class="px-3 py-2.5 text-right font-semibold">
								<button onclick={() => setSort('amount')} class="uppercase hover:text-[var(--dash-text)]">Amount{sortArrow('amount')}</button>
							</th>
							<th class="px-3 py-2.5 font-semibold">
								<button onclick={() => setSort('stage')} class="uppercase hover:text-[var(--dash-text)]">Stage{sortArrow('stage')}</button>
							</th>
							<th class="px-3 py-2.5 font-semibold">
								<button onclick={() => setSort('priority')} class="uppercase hover:text-[var(--dash-text)]">Next action{sortArrow('priority')}</button>
							</th>
							<th class="px-3 py-2.5 font-semibold">
								<button onclick={() => setSort('age')} class="uppercase hover:text-[var(--dash-text)]">Age{sortArrow('age')}</button>
							</th>
							<th class="px-3 py-2.5 font-semibold">
								<button onclick={() => setSort('updated')} class="uppercase hover:text-[var(--dash-text)]">Updated{sortArrow('updated')}</button>
							</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-[var(--dash-border-light)]">
						{#each data.cases as caseItem}
							{@const stuck = caseItem.priority === 'high'}
							<tr
								onclick={() => toggleExpand(caseItem.case_id)}
								class="cursor-pointer transition-colors hover:bg-[var(--dash-hover)] {expandedId === caseItem.case_id ? 'bg-[var(--dash-hover)]' : ''}"
							>
								<td class="px-2 py-2.5">
									<span class="inline-block h-2 w-2 rounded-full {priorityDot[caseItem.priority] || priorityDot.none}" title="{caseItem.priority} priority"></span>
								</td>
								<td class="px-3 py-2.5">
									<div class="font-medium text-[var(--dash-text)]">{caseItem.applicant_name || '—'}</div>
									<div class="font-mono text-[11px] text-[var(--dash-text-muted)]">
										{caseItem.case_id}{#if caseItem.applicant_city} · {caseItem.applicant_city}{/if}
									</div>
								</td>
								<td class="px-3 py-2.5 text-[var(--dash-text-secondary)]">{caseItem.loan_type_label}</td>
								<td class="px-3 py-2.5 text-right text-[var(--dash-text-secondary)]">
									{caseItem.loan_amount > 0 ? formatCurrency(caseItem.loan_amount, true) : '—'}
								</td>
								<td class="px-3 py-2.5">
									<span class="rounded-full bg-[var(--dash-bg-alt)] px-2 py-0.5 text-[12px] font-medium text-[var(--dash-text-secondary)]">{caseItem.stage_label}</span>
								</td>
								<td class="px-3 py-2.5 text-[13px] font-medium {caseItem.priority === 'high' ? 'text-[var(--dash-contrast-text)]' : caseItem.priority === 'medium' ? 'text-[var(--dash-accent-text)]' : 'text-[var(--dash-text-secondary)]'}">
									{caseItem.next_action}
								</td>
								<td class="px-3 py-2.5 text-[12px] {stuck ? 'font-semibold text-[var(--dash-contrast-text)]' : 'text-[var(--dash-text-muted)]'}">
									{caseItem.days_in_current_stage}d
								</td>
								<td class="px-3 py-2.5 text-[12px] text-[var(--dash-text-muted)]">{formatTimeAgo(caseItem.updated_at)}</td>
							</tr>
							{#if expandedId === caseItem.case_id}
								<tr class="bg-[var(--dash-bg-alt)]/40">
									<td colspan="8" class="px-6 py-4">
										<div class="grid gap-4 md:grid-cols-2">
											<div>
												<p class="mb-1 text-[11px] font-semibold tracking-wider text-[var(--dash-text-muted)] uppercase">Lenders</p>
												{#if caseItem.lender_summaries.length === 0}
													<p class="text-sm text-[var(--dash-text-muted)] italic">No lenders added yet</p>
												{:else}
													<ul class="space-y-1">
														{#each caseItem.lender_summaries as ls}
															<li class="flex items-center justify-between text-[13px] text-[var(--dash-text-secondary)]">
																<span>{ls.lender_name}</span>
																<span class="text-[var(--dash-text-muted)]">{ls.status} · docs {ls.document_completion_percent}%{#if ls.open_queries > 0} · {ls.open_queries} {ls.open_queries === 1 ? 'query' : 'queries'}{/if}</span>
															</li>
														{/each}
													</ul>
												{/if}
											</div>
											<div>
												<p class="mb-1 text-[11px] font-semibold tracking-wider text-[var(--dash-text-muted)] uppercase">Documents</p>
												<div class="flex items-center gap-2">
													<div class="h-2 w-32 overflow-hidden rounded-full bg-[var(--dash-bg-alt)]">
														<div class="h-full rounded-full bg-[var(--dash-btn-bg)]" style="width: {caseItem.document_completion_percent}%"></div>
													</div>
													<span class="text-[12px] text-[var(--dash-text-secondary)]">{caseItem.document_completion_percent}%</span>
												</div>
												<p class="mt-2 text-[12px] text-[var(--dash-text-muted)]">Created {formatTimeAgo(caseItem.created_at)} · {caseItem.days_in_current_stage}d in {caseItem.stage_label}</p>
											</div>
										</div>
										<div class="mt-4 flex flex-wrap gap-2">
											<a href="/dashboard/dsa/cases/{caseItem.case_id}" class="rounded-lg bg-[var(--dash-btn-bg)] px-4 py-2 text-sm font-medium text-[var(--dash-btn-text)] transition-colors hover:brightness-105">Open case</a>
											<a href="/dashboard/dsa/cases/{caseItem.case_id}/file-builder" class="rounded-lg bg-[var(--dash-bg-card)] px-4 py-2 text-sm font-medium text-[var(--dash-text)] ring-1 ring-[var(--dash-border)] transition-colors hover:bg-[var(--dash-hover)]">File builder</a>
											{#if caseItem.editFormURL}
												{@const editDisabled = data.quotaState?.editFormDisabled ?? false}
												<a
													href={editDisabled ? undefined : caseItem.editFormURL}
													aria-disabled={editDisabled}
													tabindex={editDisabled ? -1 : 0}
													title={editDisabled
														? 'Monthly limit reached — editing requires re-evaluation. Upgrade to keep editing.'
														: 'Edit application form'}
													class="inline-flex items-center gap-1.5 rounded-lg bg-[var(--dash-bg-card)] px-4 py-2 text-sm font-medium ring-1 ring-[var(--dash-border)] transition-colors {editDisabled
														? 'cursor-not-allowed text-[var(--dash-text-muted)] opacity-60'
														: 'text-[var(--dash-text)] hover:bg-[var(--dash-hover)]'}"
													onclick={(e) => editDisabled && e.preventDefault()}
												>
													<svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
														<path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
													</svg>
													Edit form
												</a>
											{/if}
										</div>
									</td>
								</tr>
							{/if}
						{/each}
					</tbody>
				</table>
			</div>
		{/if}

		<!-- ═══════════════════════════════════════════════════════════ -->
		<!-- PAGINATION                                                 -->
		<!-- ═══════════════════════════════════════════════════════════ -->
		{#if data.pagination.totalPages > 1}
			<div data-walkthrough="cases-pagination" class="mt-6 flex items-center justify-center gap-2">
				<button
					onclick={() => goToPage(data.pagination.page - 1)}
					disabled={data.pagination.page <= 1}
					class="rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-3.5 py-2.5 text-sm font-medium text-[var(--dash-text-secondary)] transition-colors hover:bg-[var(--dash-hover)] disabled:cursor-not-allowed disabled:opacity-40"
				>
					Previous
				</button>
				<span class="px-2 text-sm text-[var(--dash-text-secondary)]">
					Page <span class="font-semibold text-[var(--dash-text)]">{data.pagination.page}</span>
					of <span class="font-semibold">{data.pagination.totalPages}</span>
				</span>
				<button
					onclick={() => goToPage(data.pagination.page + 1)}
					disabled={data.pagination.page >= data.pagination.totalPages}
					class="rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-3.5 py-2.5 text-sm font-medium text-[var(--dash-text-secondary)] transition-colors hover:bg-[var(--dash-hover)] disabled:cursor-not-allowed disabled:opacity-40"
				>
					Next
				</button>
			</div>
		{/if}

		<!-- ═══════════════════════════════════════════════════════════ -->
		<!-- EMPTY STATES                                               -->
		<!-- ═══════════════════════════════════════════════════════════ -->
	{:else if hasActiveFilters}
		<EmptyState
			icon={Funnel}
			title="No cases match your filters"
			description="Try adjusting your search terms or clearing the filters to see all cases."
			variant="filtered"
		>
			{#snippet action()}
				<button
					onclick={clearFilters}
					class="inline-flex items-center gap-2 rounded-xl border border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-5 py-2.5 text-sm font-semibold text-[var(--dash-text)] transition-colors hover:bg-[var(--dash-hover)]"
				>
					Clear Filters
				</button>
			{/snippet}
		</EmptyState>
	{:else}
		<EmptyState
			icon={FileText}
			title="No cases yet"
			description="Create your first case to get started. You will be able to track loan applications, manage documents, and connect with RMs."
		>
			{#snippet action()}
				<a
					href={ROUTES.FORM.HOW_CAN_WE_HELP}
					class="inline-flex items-center gap-2 rounded-xl bg-[var(--dash-btn-bg)] px-6 py-3 text-sm font-semibold text-[var(--dash-btn-text)] shadow-lg shadow-neutral-200 transition-all hover:shadow-xl hover:brightness-105 dark:shadow-neutral-900/20"
				>
					Create Your First Case
				</a>
			{/snippet}
		</EmptyState>
	{/if}
</div>
