<script lang="ts">
	import { goto } from '$app/navigation';
	import { secureFetch } from '$lib/utils/csrf';
	import { AlertTriangle, CheckCircle2, Clock, Ban, RefreshCw, Loader2, Filter } from 'lucide-svelte';

	type AssignmentRow = NonNullable<(typeof data.rows)[number]>;

	let { data } = $props();

	// Filter inputs seeded from URL params at mount; user edits them freely
	// and applyFilters() goto's a new URL when ready.
	// svelte-ignore state_referenced_locally
	let searchQuery = $state(data.search || '');
	// svelte-ignore state_referenced_locally
	let selectedStatus = $state(data.statusFilter || '');
	// svelte-ignore state_referenced_locally
	let selectedLender = $state(data.lenderFilter || '');

	// Transfer modal state
	let transferModalOpen = $state(false);
	let transferAssignment = $state<AssignmentRow | null>(null);
	let replacementRmId = $state('');
	let transferring = $state(false);
	let transferError = $state('');

	// Suspend/unsuspend state
	let actionInProgress = $state<string | null>(null);

	const totalPages = $derived(Math.ceil(data.total / data.limit));

	function formatDate(isoStr: string): string {
		return new Date(isoStr).toLocaleDateString('en-IN', {
			day: '2-digit',
			month: 'short',
			year: 'numeric'
		});
	}

	function applyFilters() {
		const params = new URLSearchParams();
		if (searchQuery.trim()) params.set('q', searchQuery.trim());
		if (selectedStatus) params.set('status', selectedStatus);
		if (selectedLender) params.set('lender', selectedLender);
		goto(`/dashboard/admin/rm-assignments?${params.toString()}`);
	}

	function clearFilters() {
		searchQuery = '';
		selectedStatus = '';
		selectedLender = '';
		goto('/dashboard/admin/rm-assignments');
	}

	function goToPage(p: number) {
		const params = new URLSearchParams();
		if (searchQuery.trim()) params.set('q', searchQuery.trim());
		if (selectedStatus) params.set('status', selectedStatus);
		if (selectedLender) params.set('lender', selectedLender);
		params.set('page', String(p));
		goto(`/dashboard/admin/rm-assignments?${params.toString()}`);
	}

	function openTransferModal(row: AssignmentRow) {
		transferAssignment = row;
		replacementRmId = '';
		transferError = '';
		transferModalOpen = true;
	}

	function closeTransferModal() {
		transferModalOpen = false;
		transferAssignment = null;
		replacementRmId = '';
		transferError = '';
	}

	async function confirmTransfer() {
		if (!transferAssignment || !replacementRmId.trim()) {
			transferError = 'Please enter the replacement RM user ID.';
			return;
		}

		transferring = true;
		transferError = '';

		try {
			const res = await secureFetch('/api/pms/lender-assignments/transfer', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					assignmentId: transferAssignment.assignmentId,
					replacementRmUserId: replacementRmId.trim()
				})
			});

			const json = await res.json();
			if (!res.ok) {
				transferError = json.error ?? 'Transfer failed. Please try again.';
				return;
			}

			closeTransferModal();
			goto('/dashboard/admin/rm-assignments', { invalidateAll: true });
		} catch {
			transferError = 'Network error. Please try again.';
		} finally {
			transferring = false;
		}
	}

	async function suspendAssignment(row: AssignmentRow) {
		if (!confirm(`Suspend ${row.rmName}'s assignment for ${row.lenderName}?`)) return;

		actionInProgress = row.assignmentId;
		try {
			const res = await secureFetch(`/api/pms/lender-assignments/${row.assignmentId}`, {
				method: 'DELETE'
			});
			const json = await res.json();
			if (res.ok) {
				goto('/dashboard/admin/rm-assignments', { invalidateAll: true });
			} else {
				alert(json.error ?? 'Could not suspend assignment.');
			}
		} catch {
			alert('Network error. Please try again.');
		} finally {
			actionInProgress = null;
		}
	}
</script>

<svelte:head>
	<title>Admin: RM Assignments | DigitalDSA</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold text-[var(--dash-text)]">RM Lender Assignments</h1>
			<p class="mt-1 text-sm text-[var(--dash-text-secondary)]">
				Manage which RMs are assigned to which lenders for policy management
			</p>
		</div>
		<div class="text-sm text-[var(--dash-text-muted)]">
			{data.total} assignment{data.total === 1 ? '' : 's'}
		</div>
	</div>

	<!-- Filters -->
	<div class="rounded-xl bg-[var(--dash-bg-card)] shadow-sm ring-1 ring-[var(--dash-border-light)] p-4">
		<div class="flex flex-wrap items-end gap-3">
			<div class="flex-1 min-w-48">
				<label for="rm-search" class="mb-1 block text-xs font-medium text-[var(--dash-text-secondary)]">Search RM</label>
				<input
					id="rm-search"
					type="text"
					bind:value={searchQuery}
					placeholder="Name or phone..."
					class="w-full rounded-lg border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] px-3 py-2 text-sm text-[var(--dash-text)] focus:border-[var(--dash-accent-text)] focus:ring-2 focus:ring-[var(--dash-accent-text)]/20 focus:outline-none"
					onkeydown={(e) => { if (e.key === 'Enter') applyFilters(); }}
				/>
			</div>

			<div class="min-w-36">
				<label for="rm-status" class="mb-1 block text-xs font-medium text-[var(--dash-text-secondary)]">Status</label>
				<select
					id="rm-status"
					bind:value={selectedStatus}
					class="w-full rounded-lg border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] px-3 py-2 text-sm text-[var(--dash-text)] focus:border-[var(--dash-accent-text)] focus:outline-none"
				>
					<option value="">All statuses</option>
					<option value="active">Active</option>
					<option value="pending_verification">Pending verification</option>
					<option value="suspended">Suspended</option>
				</select>
			</div>

			<div class="min-w-48">
				<label for="rm-lender" class="mb-1 block text-xs font-medium text-[var(--dash-text-secondary)]">Lender</label>
				<select
					id="rm-lender"
					bind:value={selectedLender}
					class="w-full rounded-lg border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] px-3 py-2 text-sm text-[var(--dash-text)] focus:border-[var(--dash-accent-text)] focus:outline-none"
				>
					<option value="">All lenders</option>
					{#each data.lenders as lender (lender.lenderId)}
						<option value={lender.lenderId}>{lender.lenderName}</option>
					{/each}
				</select>
			</div>

			<div class="flex gap-2">
				<button
					onclick={applyFilters}
					class="flex items-center gap-1.5 rounded-lg bg-[var(--dash-btn-bg)] px-4 py-2 text-sm font-medium text-[var(--dash-btn-text)] hover:brightness-110"
				>
					<Filter size={14} />
					Filter
				</button>
				{#if data.search || data.statusFilter || data.lenderFilter}
					<button
						onclick={clearFilters}
						class="rounded-lg border border-[var(--dash-border-light)] px-4 py-2 text-sm text-[var(--dash-text-secondary)] hover:bg-[var(--dash-hover)]"
					>
						Clear
					</button>
				{/if}
			</div>
		</div>
	</div>

	<!-- Table -->
	<div class="rounded-xl bg-[var(--dash-bg-card)] shadow-sm ring-1 ring-[var(--dash-border-light)]">
		<div class="overflow-x-auto">
			{#if data.rows.length === 0}
				<div class="px-6 py-12 text-center">
					<div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--dash-bg-alt)]">
						<Filter size={20} class="text-[var(--dash-text-muted)]" />
					</div>
					<p class="text-sm text-[var(--dash-text-muted)]">No assignments found</p>
					{#if data.search || data.statusFilter || data.lenderFilter}
						<button onclick={clearFilters} class="mt-2 text-sm text-[var(--dash-accent-text)] hover:underline">Clear filters</button>
					{/if}
				</div>
			{:else}
				<table class="w-full text-sm">
					<thead>
						<tr class="border-b border-[var(--dash-border-light)] bg-[var(--dash-bg-alt)]">
							<th class="px-5 py-3 text-left font-medium text-[var(--dash-text-secondary)]">RM</th>
							<th class="px-5 py-3 text-left font-medium text-[var(--dash-text-secondary)]">Lender</th>
							<th class="px-5 py-3 text-left font-medium text-[var(--dash-text-secondary)]">Status</th>
							<th class="px-5 py-3 text-left font-medium text-[var(--dash-text-secondary)]">Renewal</th>
							<th class="px-5 py-3 text-left font-medium text-[var(--dash-text-secondary)]">Onboarded</th>
							<th class="px-5 py-3 text-center font-medium text-[var(--dash-text-secondary)]">Actions</th>
						</tr>
					</thead>
					<tbody>
						{#each data.rows.filter((r) => r !== null) as row (row.assignmentId)}
							<tr class="border-b border-[var(--dash-border-light)] hover:bg-[var(--dash-hover)]">
								<!-- RM info -->
								<td class="px-5 py-3">
									<p class="font-medium text-[var(--dash-text)]">{row.rmName}</p>
									{#if row.rmEmail}
										<p class="text-xs text-[var(--dash-text-muted)]">{row.rmEmail}</p>
									{/if}
									{#if row.officialBankEmail}
										<p class="text-xs text-[var(--dash-accent-text)]">{row.officialBankEmail}</p>
									{/if}
								</td>

								<!-- Lender -->
								<td class="px-5 py-3">
									<p class="font-medium text-[var(--dash-text)]">{row.lenderName}</p>
									<p class="text-xs text-[var(--dash-text-muted)]">{row.lenderId}</p>
								</td>

								<!-- Status badge -->
								<td class="px-5 py-3">
									{#if row.status === 'active'}
										<span class="inline-flex items-center gap-1 rounded-full bg-[var(--dash-btn-ghost-bg)] px-2.5 py-0.5 text-xs font-medium text-[var(--dash-accent-text)]">
											<CheckCircle2 size={11} />
											Active
										</span>
									{:else if row.status === 'pending_verification'}
										<span class="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
											<Clock size={11} />
											Pending
										</span>
									{:else}
										<span class="inline-flex items-center gap-1 rounded-full bg-[var(--dash-contrast-ghost-bg)] px-2.5 py-0.5 text-xs font-medium text-[var(--dash-contrast-text)]">
											<Ban size={11} />
											Suspended
										</span>
										{#if row.suspendedReason}
											<p class="mt-0.5 text-xs text-[var(--dash-text-muted)]">{row.suspendedReason}</p>
										{/if}
									{/if}
								</td>

								<!-- Renewal timing -->
								<td class="px-5 py-3">
									{#if row.status === 'active'}
										{#if row.renewalOverdue}
											<span class="inline-flex items-center gap-1 text-xs font-medium text-red-600">
												<AlertTriangle size={12} />
												{Math.abs(row.daysUntilRenewal)}d overdue
											</span>
										{:else if row.renewalDueSoon}
											<span class="inline-flex items-center gap-1 text-xs font-medium text-amber-600">
												<Clock size={12} />
												Due in {row.daysUntilRenewal}d
											</span>
										{:else}
											<span class="text-xs text-[var(--dash-text-secondary)]">
												{row.daysUntilRenewal}d left
											</span>
										{/if}
										<p class="text-xs text-[var(--dash-text-muted)]">by {formatDate(row.nextVerificationDueBy)}</p>
									{:else}
										<span class="text-xs text-[var(--dash-text-muted)]">—</span>
									{/if}
								</td>

								<!-- Onboarded date -->
								<td class="px-5 py-3 text-xs text-[var(--dash-text-secondary)]">
									{formatDate(row.onboardedAt)}
								</td>

								<!-- Actions -->
								<td class="px-5 py-3">
									<div class="flex items-center justify-center gap-2">
										{#if row.status !== 'suspended'}
											<button
												onclick={() => openTransferModal(row)}
												class="flex items-center gap-1 rounded-lg border border-[var(--dash-border-light)] px-2.5 py-1.5 text-xs font-medium text-[var(--dash-text-secondary)] hover:bg-[var(--dash-hover)] hover:text-[var(--dash-text)]"
												title="Transfer to another RM"
											>
												<RefreshCw size={12} />
												Transfer
											</button>
											<button
												onclick={() => suspendAssignment(row)}
												disabled={actionInProgress === row.assignmentId}
												class="flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
												title="Suspend assignment"
											>
												{#if actionInProgress === row.assignmentId}
													<Loader2 size={12} class="animate-spin" />
												{:else}
													<Ban size={12} />
												{/if}
												Suspend
											</button>
										{/if}
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{/if}
		</div>

		<!-- Pagination -->
		{#if totalPages > 1}
			<div class="flex items-center justify-between border-t border-[var(--dash-border-light)] px-5 py-3">
				<p class="text-xs text-[var(--dash-text-muted)]">
					Page {data.page} of {totalPages}
				</p>
				<div class="flex gap-1.5">
					<button
						onclick={() => goToPage(data.page - 1)}
						disabled={data.page <= 1}
						class="rounded-lg border border-[var(--dash-border-light)] px-3 py-1.5 text-xs text-[var(--dash-text-secondary)] hover:bg-[var(--dash-hover)] disabled:opacity-40"
					>
						Previous
					</button>
					<button
						onclick={() => goToPage(data.page + 1)}
						disabled={data.page >= totalPages}
						class="rounded-lg border border-[var(--dash-border-light)] px-3 py-1.5 text-xs text-[var(--dash-text-secondary)] hover:bg-[var(--dash-hover)] disabled:opacity-40"
					>
						Next
					</button>
				</div>
			</div>
		{/if}
	</div>
</div>

<!-- Transfer modal -->
{#if transferModalOpen && transferAssignment}
	<div
		role="dialog"
		aria-modal="true"
		aria-labelledby="transfer-modal-title"
		tabindex="-1"
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
		onclick={(e) => { if (e.target === e.currentTarget) closeTransferModal(); }}
		onkeydown={(e) => { if (e.key === 'Escape') closeTransferModal(); }}
	>
		<div class="w-full max-w-md rounded-2xl bg-[var(--dash-bg-card)] p-6 shadow-2xl ring-1 ring-[var(--dash-border-light)]">
			<h3 id="transfer-modal-title" class="mb-1 text-lg font-semibold text-[var(--dash-text)]">Transfer Assignment</h3>
			<p class="mb-4 text-sm text-[var(--dash-text-secondary)]">
				Transfer <strong>{transferAssignment.lenderName}</strong> from
				<strong>{transferAssignment.rmName}</strong> to a replacement RM.
			</p>

			<label for="replacement-rm-id" class="mb-1.5 block text-sm font-medium text-[var(--dash-text)]">
				Replacement RM user ID
			</label>
			<input
				id="replacement-rm-id"
				type="text"
				bind:value={replacementRmId}
				placeholder="RM MongoDB user ID..."
				class="w-full rounded-lg border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] px-3 py-2.5 text-sm text-[var(--dash-text)] focus:border-[var(--dash-accent-text)] focus:ring-2 focus:ring-[var(--dash-accent-text)]/20 focus:outline-none"
			/>
			<p class="mt-1 text-xs text-[var(--dash-text-muted)]">
				The replacement RM will receive a notification and must re-verify their bank email.
			</p>

			{#if transferError}
				<div class="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
					{transferError}
				</div>
			{/if}

			<div class="mt-5 flex gap-3">
				<button
					onclick={closeTransferModal}
					class="flex-1 rounded-lg border border-[var(--dash-border-light)] px-4 py-2.5 text-sm font-medium text-[var(--dash-text-secondary)] hover:bg-[var(--dash-hover)]"
				>
					Cancel
				</button>
				<button
					onclick={confirmTransfer}
					disabled={transferring || !replacementRmId.trim()}
					class="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--dash-btn-bg)] px-4 py-2.5 text-sm font-medium text-[var(--dash-btn-text)] hover:brightness-110 disabled:opacity-50"
				>
					{#if transferring}
						<Loader2 size={15} class="animate-spin" />
						Transferring…
					{:else}
						Confirm Transfer
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}
