<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import Pagination from '$lib/components/Pagination.svelte';

	let { data } = $props();

	// Local filter state (mirrors URL params, applied on submit)
	// svelte-ignore state_referenced_locally
	const initFilters = data.filters;
	let filterActor = $state(initFilters.actor);
	let filterAction = $state(initFilters.action);
	let filterTargetType = $state(initFilters.targetType);
	let filterLenderId = $state(initFilters.lenderId);
	let filterDateFrom = $state(initFilters.dateFrom);
	let filterDateTo = $state(initFilters.dateTo);

	// Track which rows have expanded details
	let expandedRows = $state<Set<string>>(new Set());

	// All possible action values — kept in sync with AuditAction union in
	// policyEngine.ts. New actions added under C.5 surface non-policy admin
	// actions (suspend / role / permission / impersonation / refund).
	const allActions = [
		'version_created',
		'version_status_changed',
		'version_activated',
		'version_superseded',
		'rule_created',
		'rule_updated',
		'lender_created',
		'lender_updated',
		'product_created',
		'variation_created',
		'geo_scope_created',
		'rm_submission_created',
		'rm_submission_status_changed',
		'comment_added',
		'document_uploaded',
		// C.5 + C.4
		'impersonation_start',
		'impersonation_exit',
		'user_suspended',
		'user_reactivated',
		'role_changed',
		'permission_granted',
		'permission_revoked'
	];

	// All possible target types — kept in sync with PolicyAuditLog.target_type
	// union in policyEngine.ts.
	const allTargetTypes = [
		'lender',
		'product',
		'variation',
		'geo_scope',
		'policy_rule',
		'policy_version',
		'rm_submission',
		'comment',
		// C.4 + C.5
		'user',
		'payment',
		'refund',
		'permission_change'
	];

	// Color maps
	const actionColors: Record<string, string> = {
		version_created: 'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)]',
		version_status_changed: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]',
		version_activated: 'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)]',
		version_superseded: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-muted)]',
		rule_created: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text)]',
		rule_updated: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text)]',
		lender_created: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text)]',
		lender_updated: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text)]',
		product_created: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text)]',
		variation_created: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text)]',
		geo_scope_created: 'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)]',
		rm_submission_created: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]',
		rm_submission_status_changed: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]',
		comment_added: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]',
		document_uploaded: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text)]',
		// C.4 + C.5 — amber-tinted for privileged user/admin events so they
		// stand out from the (much higher-volume) policy state transitions.
		impersonation_start: 'bg-amber-100 text-amber-800',
		impersonation_exit: 'bg-amber-50 text-amber-700',
		user_suspended: 'bg-red-100 text-red-800',
		user_reactivated: 'bg-green-100 text-green-800',
		role_changed: 'bg-amber-100 text-amber-800',
		permission_granted: 'bg-amber-50 text-amber-700',
		permission_revoked: 'bg-amber-50 text-amber-700'
	};

	const targetTypeColors: Record<string, string> = {
		lender: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text)]',
		product: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text)]',
		variation: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text)]',
		policy_rule: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text)]',
		policy_version: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]',
		rm_submission: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]',
		comment: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]',
		geo_scope: 'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)]',
		// C.4 + C.5
		user: 'bg-amber-100 text-amber-800',
		payment: 'bg-amber-100 text-amber-800',
		refund: 'bg-amber-100 text-amber-800',
		permission_change: 'bg-amber-50 text-amber-700'
	};

	const roleColors: Record<string, string> = {
		admin: 'bg-[var(--dash-contrast-ghost-bg)] text-[var(--dash-contrast-text)]',
		rm: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text)]',
		system: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-muted)]'
	};

	function formatAction(action: string): string {
		return action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
	}

	function formatTimestamp(dateStr: string | null): string {
		if (!dateStr) return '-';
		return new Date(dateStr).toLocaleString('en-IN', {
			day: '2-digit',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			hour12: true
		});
	}

	function formatTargetType(type: string): string {
		return type.replace(/_/g, ' ');
	}

	function truncateId(id: string, maxLen = 24): string {
		if (id.length <= maxLen) return id;
		return id.slice(0, maxLen) + '...';
	}

	function toggleRow(id: string) {
		const next = new Set(expandedRows);
		if (next.has(id)) {
			next.delete(id);
		} else {
			next.add(id);
		}
		expandedRows = next;
	}

	function hasDetails(details: Record<string, unknown>): boolean {
		return Object.keys(details).length > 0;
	}

	function formatDetails(details: Record<string, unknown>): string {
		return JSON.stringify(details, null, 2);
	}

	function applyFilters() {
		const params = new URLSearchParams();
		if (filterActor) params.set('actor', filterActor);
		if (filterAction) params.set('action', filterAction);
		if (filterTargetType) params.set('target_type', filterTargetType);
		if (filterLenderId) params.set('lender_id', filterLenderId);
		if (filterDateFrom) params.set('date_from', filterDateFrom);
		if (filterDateTo) params.set('date_to', filterDateTo);
		// Reset to page 1 when filters change
		const qs = params.toString();
		goto(`/dashboard/admin/audit${qs ? '?' + qs : ''}`, { invalidateAll: true });
	}

	function clearFilters() {
		filterActor = '';
		filterAction = '';
		filterTargetType = '';
		filterLenderId = '';
		filterDateFrom = '';
		filterDateTo = '';
		goto('/dashboard/admin/audit', { invalidateAll: true });
	}

	function goToPage(pageNum: number) {
		const params = new URLSearchParams($page.url.searchParams);
		params.set('page', String(pageNum));
		goto(`/dashboard/admin/audit?${params.toString()}`, { invalidateAll: true });
	}

	let hasActiveFilters = $derived(
		data.filters.actor !== '' ||
			data.filters.action !== '' ||
			data.filters.targetType !== '' ||
			data.filters.lenderId !== '' ||
			data.filters.dateFrom !== '' ||
			data.filters.dateTo !== ''
	);
</script>

<svelte:head>
	<title>Admin: Audit Log | DigitalDSA</title>
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
		<h1 class="mt-3 text-2xl font-bold text-[var(--dash-text)]">Audit Log</h1>
		<p class="mt-1 text-sm text-[var(--dash-text-secondary)]">
			All policy system state transitions (2-year retention)
		</p>
	</div>

	<!-- Filter bar -->
	<div
		class="rounded-xl bg-[var(--dash-bg-card)] p-5 shadow-sm ring-1 ring-[var(--dash-border-light)]"
	>
		<div class="mb-4 flex items-center gap-2">
			<svg
				class="h-4 w-4 text-[var(--dash-text-secondary)]"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
				stroke-width="2"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
				/>
			</svg>
			<h2 class="text-sm font-semibold text-[var(--dash-text)]">Filters</h2>
			{#if hasActiveFilters}
				<span class="ml-1 inline-flex h-2 w-2 rounded-full bg-[var(--dash-accent-text)]"></span>
			{/if}
		</div>

		<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
			<!-- Actor name -->
			<div>
				<label
					for="filter-actor"
					class="mb-1 block text-xs font-medium text-[var(--dash-text-secondary)]">Actor Name</label
				>
				<input
					id="filter-actor"
					type="text"
					bind:value={filterActor}
					placeholder="Search by name..."
					class="w-full rounded-lg border border-[var(--dash-border-light)] bg-[var(--dash-bg-alt)] px-3 py-2 text-sm text-[var(--dash-text)] placeholder-[var(--dash-text-muted)] focus:border-[var(--dash-accent-text)] focus:bg-[var(--dash-bg-card)] focus:ring-1 focus:ring-[var(--dash-accent-text)]/20 focus:outline-none"
				/>
			</div>

			<!-- Action type -->
			<div>
				<label
					for="filter-action"
					class="mb-1 block text-xs font-medium text-[var(--dash-text-secondary)]"
					>Action Type</label
				>
				<select
					id="filter-action"
					bind:value={filterAction}
					class="w-full rounded-lg border border-[var(--dash-border-light)] bg-[var(--dash-bg-alt)] px-3 py-2 text-sm text-[var(--dash-text)] focus:border-[var(--dash-accent-text)] focus:bg-[var(--dash-bg-card)] focus:ring-1 focus:ring-[var(--dash-accent-text)]/20 focus:outline-none"
				>
					<option value="">All actions</option>
					{#each allActions as act}
						<option value={act}>{formatAction(act)}</option>
					{/each}
				</select>
			</div>

			<!-- Target type -->
			<div>
				<label
					for="filter-target-type"
					class="mb-1 block text-xs font-medium text-[var(--dash-text-secondary)]"
					>Target Type</label
				>
				<select
					id="filter-target-type"
					bind:value={filterTargetType}
					class="w-full rounded-lg border border-[var(--dash-border-light)] bg-[var(--dash-bg-alt)] px-3 py-2 text-sm text-[var(--dash-text)] focus:border-[var(--dash-accent-text)] focus:bg-[var(--dash-bg-card)] focus:ring-1 focus:ring-[var(--dash-accent-text)]/20 focus:outline-none"
				>
					<option value="">All targets</option>
					{#each allTargetTypes as tt}
						<option value={tt}>{formatTargetType(tt)}</option>
					{/each}
				</select>
			</div>

			<!-- Lender -->
			<div>
				<label
					for="filter-lender"
					class="mb-1 block text-xs font-medium text-[var(--dash-text-secondary)]">Lender</label
				>
				<select
					id="filter-lender"
					bind:value={filterLenderId}
					class="w-full rounded-lg border border-[var(--dash-border-light)] bg-[var(--dash-bg-alt)] px-3 py-2 text-sm text-[var(--dash-text)] focus:border-[var(--dash-accent-text)] focus:bg-[var(--dash-bg-card)] focus:ring-1 focus:ring-[var(--dash-accent-text)]/20 focus:outline-none"
				>
					<option value="">All lenders</option>
					{#each data.lenders as lender}
						<option value={lender.lender_id}>{lender.lender_name}</option>
					{/each}
				</select>
			</div>

			<!-- Date from -->
			<div>
				<label
					for="filter-date-from"
					class="mb-1 block text-xs font-medium text-[var(--dash-text-secondary)]">Date From</label
				>
				<input
					id="filter-date-from"
					type="date"
					bind:value={filterDateFrom}
					class="w-full rounded-lg border border-[var(--dash-border-light)] bg-[var(--dash-bg-alt)] px-3 py-2 text-sm text-[var(--dash-text)] focus:border-[var(--dash-accent-text)] focus:bg-[var(--dash-bg-card)] focus:ring-1 focus:ring-[var(--dash-accent-text)]/20 focus:outline-none"
				/>
			</div>

			<!-- Date to -->
			<div>
				<label
					for="filter-date-to"
					class="mb-1 block text-xs font-medium text-[var(--dash-text-secondary)]">Date To</label
				>
				<input
					id="filter-date-to"
					type="date"
					bind:value={filterDateTo}
					class="w-full rounded-lg border border-[var(--dash-border-light)] bg-[var(--dash-bg-alt)] px-3 py-2 text-sm text-[var(--dash-text)] focus:border-[var(--dash-accent-text)] focus:bg-[var(--dash-bg-card)] focus:ring-1 focus:ring-[var(--dash-accent-text)]/20 focus:outline-none"
				/>
			</div>
		</div>

		<!-- Filter action buttons -->
		<div class="mt-4 flex items-center gap-3">
			<button
				onclick={applyFilters}
				class="inline-flex items-center gap-1.5 rounded-lg bg-[var(--dash-btn-bg)] px-4 py-2 text-sm font-medium text-[var(--dash-btn-text)] transition-colors hover:brightness-110"
			>
				<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
					/>
				</svg>
				Apply Filters
			</button>
			{#if hasActiveFilters}
				<button
					onclick={clearFilters}
					class="inline-flex items-center gap-1.5 rounded-lg bg-[var(--dash-bg-alt)] px-4 py-2 text-sm font-medium text-[var(--dash-text-secondary)] transition-colors hover:bg-[var(--dash-hover)]"
				>
					<svg
						class="h-4 w-4"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						stroke-width="2"
					>
						<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
					</svg>
					Clear
				</button>
			{/if}
			<span class="ml-auto text-xs text-[var(--dash-text-muted)]">
				{data.pagination.totalCount.toLocaleString('en-IN')} total entries
			</span>
		</div>
	</div>

	<!-- Results table -->
	{#if data.entries.length === 0}
		<div
			class="rounded-xl bg-[var(--dash-bg-card)] p-16 text-center shadow-sm ring-1 ring-[var(--dash-border-light)]"
		>
			<svg
				class="mx-auto h-12 w-12 text-[var(--dash-text-muted)]"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
				stroke-width="1.5"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
				/>
			</svg>
			<p class="mt-3 text-sm font-medium text-[var(--dash-text-secondary)]">
				No audit log entries found
			</p>
			{#if hasActiveFilters}
				<p class="mt-1 text-xs text-[var(--dash-text-muted)]">
					Try adjusting your filters or clearing them
				</p>
				<button
					onclick={clearFilters}
					class="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[var(--dash-bg-alt)] px-4 py-2 text-sm font-medium text-[var(--dash-text-secondary)] transition-colors hover:bg-[var(--dash-hover)]"
				>
					Clear Filters
				</button>
			{/if}
		</div>
	{:else}
		<div
			class="overflow-hidden rounded-xl bg-[var(--dash-bg-card)] shadow-sm ring-1 ring-[var(--dash-border-light)]"
		>
			<!-- Desktop table -->
			<div class="hidden overflow-x-auto lg:block">
				<table class="w-full text-sm">
					<thead>
						<tr class="border-b border-[var(--dash-border-light)] bg-[var(--dash-bg-alt)]">
							<th
								class="px-4 py-3 text-left text-xs font-semibold tracking-wider text-[var(--dash-text-secondary)] uppercase"
								>Timestamp</th
							>
							<th
								class="px-4 py-3 text-left text-xs font-semibold tracking-wider text-[var(--dash-text-secondary)] uppercase"
								>Actor</th
							>
							<th
								class="px-4 py-3 text-left text-xs font-semibold tracking-wider text-[var(--dash-text-secondary)] uppercase"
								>Action</th
							>
							<th
								class="px-4 py-3 text-left text-xs font-semibold tracking-wider text-[var(--dash-text-secondary)] uppercase"
								>Target</th
							>
							<th
								class="px-4 py-3 text-left text-xs font-semibold tracking-wider text-[var(--dash-text-secondary)] uppercase"
								>Details</th
							>
						</tr>
					</thead>
					<tbody class="divide-y divide-[var(--dash-border-light)]">
						{#each data.entries as entry}
							<tr class="transition-colors hover:bg-[var(--dash-hover)]">
								<!-- Timestamp -->
								<td class="px-4 py-3 whitespace-nowrap">
									<span class="text-xs text-[var(--dash-text-secondary)]"
										>{formatTimestamp(entry.created_at)}</span
									>
								</td>

								<!-- Actor -->
								<td class="px-4 py-3">
									<div class="flex items-center gap-2">
										<span class="text-sm font-medium text-[var(--dash-text)]"
											>{entry.actor_name}</span
										>
										<span
											class="inline-flex rounded-full px-1.5 py-0.5 text-[12px] font-semibold uppercase {roleColors[
												entry.actor_role
											] || 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-muted)]'}"
										>
											{entry.actor_role}
										</span>
									</div>
								</td>

								<!-- Action -->
								<td class="px-4 py-3">
									<span
										class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium {actionColors[
											entry.action
										] || 'bg-[var(--dash-bg-alt)] text-[var(--dash-text)]'}"
									>
										{formatAction(entry.action)}
									</span>
								</td>

								<!-- Target -->
								<td class="px-4 py-3">
									<div class="flex items-center gap-2">
										<span
											class="inline-flex rounded px-1.5 py-0.5 text-[12px] font-semibold uppercase {targetTypeColors[
												entry.target_type
											] || 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-muted)]'}"
										>
											{formatTargetType(entry.target_type)}
										</span>
										<span
											class="font-mono text-xs text-[var(--dash-text-secondary)]"
											title={entry.target_id}
										>
											{truncateId(entry.target_id)}
										</span>
									</div>
								</td>

								<!-- Details -->
								<td class="px-4 py-3">
									{#if hasDetails(entry.details)}
										<button
											onclick={() => toggleRow(entry._id)}
											class="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-[var(--dash-text-secondary)] transition-colors hover:bg-[var(--dash-hover)] hover:text-[var(--dash-text)]"
										>
											<svg
												class="h-3.5 w-3.5 transition-transform {expandedRows.has(entry._id)
													? 'rotate-90'
													: ''}"
												fill="none"
												viewBox="0 0 24 24"
												stroke="currentColor"
												stroke-width="2"
											>
												<path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
											</svg>
											{expandedRows.has(entry._id) ? 'Hide' : 'View'}
										</button>
									{:else}
										<span class="text-xs text-[var(--dash-text-muted)]">--</span>
									{/if}
								</td>
							</tr>

							<!-- Expanded details row -->
							{#if expandedRows.has(entry._id) && hasDetails(entry.details)}
								<tr>
									<td colspan="5" class="bg-[var(--dash-bg-alt)] px-4 py-3">
										<pre
											class="max-h-48 overflow-auto rounded-lg bg-[var(--dash-bg-alt)] p-3 font-mono text-xs text-[var(--dash-text)]">{formatDetails(
												entry.details
											)}</pre>
									</td>
								</tr>
							{/if}
						{/each}
					</tbody>
				</table>
			</div>

			<!-- Mobile card view -->
			<div class="divide-y divide-[var(--dash-border-light)] lg:hidden">
				{#each data.entries as entry}
					<div class="space-y-2 p-4">
						<!-- Timestamp + Actor -->
						<div class="flex items-start justify-between">
							<div>
								<div class="flex items-center gap-2">
									<span class="text-sm font-medium text-[var(--dash-text)]">{entry.actor_name}</span
									>
									<span
										class="inline-flex rounded-full px-1.5 py-0.5 text-[12px] font-semibold uppercase {roleColors[
											entry.actor_role
										] || 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-muted)]'}"
									>
										{entry.actor_role}
									</span>
								</div>
								<p class="mt-0.5 text-xs text-[var(--dash-text-muted)]">
									{formatTimestamp(entry.created_at)}
								</p>
							</div>
							<span
								class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium {actionColors[
									entry.action
								] || 'bg-[var(--dash-bg-alt)] text-[var(--dash-text)]'}"
							>
								{formatAction(entry.action)}
							</span>
						</div>

						<!-- Target -->
						<div class="flex items-center gap-2">
							<span
								class="inline-flex rounded px-1.5 py-0.5 text-[12px] font-semibold uppercase {targetTypeColors[
									entry.target_type
								] || 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-muted)]'}"
							>
								{formatTargetType(entry.target_type)}
							</span>
							<span
								class="font-mono text-xs text-[var(--dash-text-secondary)]"
								title={entry.target_id}
							>
								{truncateId(entry.target_id, 20)}
							</span>
						</div>

						<!-- Details expand -->
						{#if hasDetails(entry.details)}
							<button
								onclick={() => toggleRow(entry._id)}
								class="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-[var(--dash-text-secondary)] transition-colors hover:bg-[var(--dash-hover)] hover:text-[var(--dash-text)]"
							>
								<svg
									class="h-3.5 w-3.5 transition-transform {expandedRows.has(entry._id)
										? 'rotate-90'
										: ''}"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
									stroke-width="2"
								>
									<path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
								</svg>
								{expandedRows.has(entry._id) ? 'Hide details' : 'View details'}
							</button>
							{#if expandedRows.has(entry._id)}
								<pre
									class="max-h-48 overflow-auto rounded-lg bg-[var(--dash-bg-alt)] p-3 font-mono text-xs text-[var(--dash-text)]">{formatDetails(
										entry.details
									)}</pre>
							{/if}
						{/if}
					</div>
				{/each}
			</div>
		</div>

		<Pagination
			page={data.pagination.page}
			totalPages={data.pagination.totalPages}
			totalCount={data.pagination.totalCount}
			onPageChange={goToPage}
		/>
	{/if}
</div>
