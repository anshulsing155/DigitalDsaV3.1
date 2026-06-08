<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';

	let { data } = $props();

	// ── State ────────────────────────────────────────────────────
	// svelte-ignore state_referenced_locally
	const initActiveFilters = data.activeFilters;
	let filterEventType = $state(initActiveFilters.eventType);
	let filterDateFrom = $state(initActiveFilters.dateFrom);
	let filterDateTo = $state(initActiveFilters.dateTo);

	const hasActiveFilters = $derived(
		data.activeFilters.eventType || data.activeFilters.dateFrom || data.activeFilters.dateTo
	);

	// ── Event type visual mapping ────────────────────────────────
	type EventVisualType = 'success' | 'info' | 'warning' | 'error' | 'neutral';

	const EVENT_TYPE_MAP: Record<string, EventVisualType> = {
		case_created: 'info',
		case_updated: 'info',
		stage_changed: 'info',
		lender_added: 'info',
		lender_status_changed: 'warning',
		document_uploaded: 'success',
		document_status_changed: 'info',
		document_expiring: 'warning',
		query_raised: 'warning',
		query_responded: 'info',
		query_resolved: 'success',
		review_pdf_generated: 'info',
		submission_pdf_generated: 'success',
		message_sent: 'info',
		note_added: 'neutral',
		form_updated: 'info',
		rejection: 'error',
		sanction: 'success',
		disbursement: 'success',
		results_evaluated: 'success',
		results_refreshed: 'info',
		lender_shortlisted: 'info',
		lender_selected: 'success',
		lender_deselected: 'warning'
	};

	const dotColor: Record<string, string> = {
		success: 'bg-[var(--dash-accent-text)]',
		info: 'bg-[var(--dash-text-secondary)]',
		warning: 'bg-[var(--dash-contrast-text)]',
		error: 'bg-[var(--dash-contrast-text)]',
		neutral: 'bg-[var(--dash-text-muted)]'
	};

	const pillColor: Record<string, string> = {
		success: 'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)]',
		info: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]',
		warning: 'bg-[var(--dash-contrast-ghost-bg)] text-[var(--dash-contrast-text)]',
		error: 'bg-[var(--dash-contrast-ghost-bg)] text-[var(--dash-contrast-text)]',
		neutral: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-muted)]'
	};

	// ── Helpers ───────────────────────────────────────────────────
	function formatEventType(type: string): string {
		return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
	}

	function formatTimeAgo(dateStr: string): string {
		const now = Date.now();
		const then = new Date(dateStr).getTime();
		const diffMs = now - then;
		const diffMin = Math.floor(diffMs / 60000);
		if (diffMin < 1) return 'just now';
		if (diffMin < 60) return `${diffMin}m ago`;
		const diffHr = Math.floor(diffMin / 60);
		if (diffHr < 24) return `${diffHr}h ago`;
		const diffDay = Math.floor(diffHr / 24);
		if (diffDay < 30) return `${diffDay}d ago`;
		const diffMonth = Math.floor(diffDay / 30);
		if (diffMonth < 12) return `${diffMonth}mo ago`;
		return `${Math.floor(diffMonth / 12)}y ago`;
	}

	function formatFullDate(dateStr: string): string {
		const d = new Date(dateStr);
		return d.toLocaleDateString('en-IN', {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function getVisualType(eventType: string): EventVisualType {
		return EVENT_TYPE_MAP[eventType] || 'neutral';
	}

	// ── Filter actions ───────────────────────────────────────────
	function applyFilters() {
		const params = new URLSearchParams();
		if (filterEventType) params.set('event_type', filterEventType);
		if (filterDateFrom) params.set('date_from', filterDateFrom);
		if (filterDateTo) params.set('date_to', filterDateTo);
		const qs = params.toString();
		const basePath = $page.url.pathname;
		goto(`${basePath}${qs ? '?' + qs : ''}`, { invalidateAll: true });
	}

	function clearFilters() {
		filterEventType = '';
		filterDateFrom = '';
		filterDateTo = '';
		goto($page.url.pathname, { invalidateAll: true });
	}

	function goToPage(p: number) {
		const params = new URLSearchParams($page.url.search);
		params.set('page', String(p));
		goto(`${$page.url.pathname}?${params.toString()}`, { invalidateAll: true });
	}
</script>

<svelte:head>
	<title>Case Timeline | DigitalDSA</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex flex-wrap items-center justify-between gap-3">
		<div class="flex items-center gap-3">
			<h2 class="text-xl font-bold text-[var(--dash-text)]">Timeline</h2>
			<span
				class="rounded-full bg-[var(--ddsa-accent-500)]/10 px-2.5 py-0.5 text-xs font-semibold text-[var(--ddsa-accent-500)]"
			>
				{data.pagination.total.toLocaleString('en-IN')} event{data.pagination.total !== 1
					? 's'
					: ''}
			</span>
		</div>
	</div>

	<!-- Filter Bar -->
	<div
		class="rounded-xl border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] p-4 shadow-sm"
	>
		<div class="flex flex-wrap items-end gap-3">
			<!-- Event Type -->
			<div class="min-w-[180px] flex-1">
				<label
					for="filter-event-type"
					class="mb-1 block text-xs font-medium text-[var(--dash-text-muted)]">Event Type</label
				>
				<select
					id="filter-event-type"
					bind:value={filterEventType}
					onchange={applyFilters}
					class="w-full rounded-lg border border-[var(--dash-border)] bg-[var(--dash-input-bg)] px-3 py-2 text-sm text-[var(--dash-text)] focus:border-[var(--ddsa-accent-500)] focus:ring-2 focus:ring-[var(--ddsa-accent-500)]/20 focus:outline-none"
				>
					<option value="">All Types</option>
					{#each data.eventTypeOptions as type}
						<option value={type}>{formatEventType(type)}</option>
					{/each}
				</select>
			</div>

			<!-- Date From -->
			<div class="min-w-[150px]">
				<label
					for="filter-date-from"
					class="mb-1 block text-xs font-medium text-[var(--dash-text-muted)]">From</label
				>
				<input
					id="filter-date-from"
					type="date"
					bind:value={filterDateFrom}
					onchange={applyFilters}
					class="w-full rounded-lg border border-[var(--dash-border)] bg-[var(--dash-input-bg)] px-3 py-2 text-sm text-[var(--dash-text)] focus:border-[var(--ddsa-accent-500)] focus:ring-2 focus:ring-[var(--ddsa-accent-500)]/20 focus:outline-none"
				/>
			</div>

			<!-- Date To -->
			<div class="min-w-[150px]">
				<label
					for="filter-date-to"
					class="mb-1 block text-xs font-medium text-[var(--dash-text-muted)]">To</label
				>
				<input
					id="filter-date-to"
					type="date"
					bind:value={filterDateTo}
					onchange={applyFilters}
					class="w-full rounded-lg border border-[var(--dash-border)] bg-[var(--dash-input-bg)] px-3 py-2 text-sm text-[var(--dash-text)] focus:border-[var(--ddsa-accent-500)] focus:ring-2 focus:ring-[var(--ddsa-accent-500)]/20 focus:outline-none"
				/>
			</div>

			<!-- Clear Filters -->
			{#if hasActiveFilters}
				<button
					onclick={clearFilters}
					class="rounded-lg border border-[var(--dash-border)] px-3 py-2 text-sm font-medium text-[var(--dash-text-secondary)] transition-colors hover:bg-[var(--dash-hover)] hover:text-[var(--dash-text)]"
				>
					Clear Filters
				</button>
			{/if}
		</div>
	</div>

	<!-- Timeline Events -->
	{#if data.events.length > 0}
		<div
			class="rounded-xl border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] p-5 shadow-sm"
		>
			<div class="space-y-0">
				{#each data.events as event, i}
					{@const vType = getVisualType(event.event_type)}
					<div class="flex gap-4 {i < data.events.length - 1 ? 'pb-6' : ''}">
						<!-- Dot + Line -->
						<div class="flex flex-col items-center">
							<div class="mt-1.5 h-3 w-3 rounded-full {dotColor[vType]}"></div>
							{#if i < data.events.length - 1}
								<div class="w-px flex-1 bg-[var(--dash-border)]"></div>
							{/if}
						</div>

						<!-- Content -->
						<div class="flex-1 pb-1">
							<div class="flex flex-wrap items-center gap-2">
								<p class="text-sm font-semibold text-[var(--dash-text)]">
									{formatEventType(event.event_type)}
								</p>
								<span class="rounded-full px-2 py-0.5 text-[12px] font-medium {pillColor[vType]}">
									{vType}
								</span>
							</div>

							<p class="mt-0.5 text-sm text-[var(--dash-text-secondary)]">{event.description}</p>

							<p class="mt-1 text-xs text-[var(--dash-text-muted)]">
								{formatFullDate(event.created_at)}
								<span class="ml-1 opacity-70">({formatTimeAgo(event.created_at)})</span>
							</p>

							<!-- Metadata -->
							{#if event.metadata && Object.keys(event.metadata).length > 0}
								<div class="mt-2 flex flex-wrap gap-2">
									{#each Object.entries(event.metadata) as [key, value]}
										{#if value !== null && value !== undefined && value !== ''}
											<span
												class="rounded bg-[var(--dash-bg-alt)] px-2 py-0.5 text-[13px] text-[var(--dash-text-muted)]"
											>
												{key.replace(/_/g, ' ')}:
												<span class="font-medium text-[var(--dash-text-secondary)]">{value}</span>
											</span>
										{/if}
									{/each}
								</div>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- Pagination -->
		{#if data.pagination.totalPages > 1}
			<div
				class="flex items-center justify-between rounded-xl border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] px-4 py-3 shadow-sm"
			>
				<button
					onclick={() => goToPage(data.pagination.page - 1)}
					disabled={data.pagination.page <= 1}
					class="rounded-lg border border-[var(--dash-border)] px-3 py-1.5 text-sm font-medium text-[var(--dash-text-secondary)] transition-colors hover:bg-[var(--dash-hover)] disabled:cursor-not-allowed disabled:opacity-40"
				>
					Previous
				</button>
				<span class="text-sm text-[var(--dash-text-muted)]">
					Page {data.pagination.page} of {data.pagination.totalPages}
				</span>
				<button
					onclick={() => goToPage(data.pagination.page + 1)}
					disabled={data.pagination.page >= data.pagination.totalPages}
					class="rounded-lg border border-[var(--dash-border)] px-3 py-1.5 text-sm font-medium text-[var(--dash-text-secondary)] transition-colors hover:bg-[var(--dash-hover)] disabled:cursor-not-allowed disabled:opacity-40"
				>
					Next
				</button>
			</div>
		{/if}
	{:else if hasActiveFilters}
		<!-- No results with filters -->
		<div
			class="rounded-xl border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] p-8 text-center shadow-sm"
		>
			<div
				class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--dash-bg-alt)]"
			>
				<svg
					class="h-6 w-6 text-[var(--dash-text-muted)]"
					fill="none"
					viewBox="0 0 24 24"
					stroke-width="1.5"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z"
					/>
				</svg>
			</div>
			<p class="text-sm font-medium text-[var(--dash-text-secondary)]">
				No events match your filters
			</p>
			<p class="mt-1 text-xs text-[var(--dash-text-muted)]">
				Try adjusting your filters or date range
			</p>
			<button
				onclick={clearFilters}
				class="mt-3 rounded-lg bg-[var(--ddsa-accent-500)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--ddsa-accent-600)]"
			>
				Clear Filters
			</button>
		</div>
	{:else}
		<!-- No events at all -->
		<div
			class="rounded-xl border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] p-8 text-center shadow-sm"
		>
			<div
				class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--dash-bg-alt)]"
			>
				<svg
					class="h-6 w-6 text-[var(--dash-text-muted)]"
					fill="none"
					viewBox="0 0 24 24"
					stroke-width="1.5"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
					/>
				</svg>
			</div>
			<p class="text-sm font-medium text-[var(--dash-text-secondary)]">No activity recorded yet</p>
			<p class="mt-1 text-xs text-[var(--dash-text-muted)]">
				Events will appear as you work on this case
			</p>
		</div>
	{/if}
</div>
