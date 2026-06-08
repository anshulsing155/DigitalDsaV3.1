<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { secureFetch } from '$lib/utils/csrf.js';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import { formatCurrency } from '$lib/i18n';

	let { data } = $props();

	let showCreateForm = $state(false);
	let newLabel = $state('');
	let newLoanType = $state('');
	let newAmount = $state('');
	let newSourceId = $state('');
	let newNotes = $state('');
	let isCreating = $state(false);
	let createError = $state('');

	const STATUS_LABELS: Record<string, { label: string; color: string }> = {
		new: {
			label: 'New',
			color: 'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)]'
		},
		contacted: {
			label: 'Contacted',
			color: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]'
		},
		qualified: {
			label: 'Qualified',
			color: 'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)]'
		},
		converted: {
			label: 'Converted',
			color: 'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)]'
		},
		dropped: {
			label: 'Dropped',
			color: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-muted)]'
		},
		follow_up: {
			label: 'Follow Up',
			color: 'bg-[var(--dash-contrast-ghost-bg)] text-[var(--dash-contrast-text)]'
		}
	};

	const totalLeads = $derived(Object.values(data.statusCounts).reduce((a, b) => a + b, 0));

	async function createLead() {
		createError = '';
		if (!newLabel.trim()) {
			createError = 'Label is required';
			return;
		}
		isCreating = true;
		try {
			const body: any = { label: newLabel.trim() };
			if (newLoanType) body.loan_type = newLoanType;
			if (newAmount) body.estimated_amount = Number(newAmount);
			if (newSourceId) body.source_id = newSourceId;
			if (newNotes) body.notes = newNotes;

			const res = await secureFetch('/api/leads', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});
			const result = await res.json();
			if (result.success) {
				showCreateForm = false;
				newLabel = '';
				newLoanType = '';
				newAmount = '';
				newSourceId = '';
				newNotes = '';
				await invalidateAll();
			} else {
				createError = result.error || 'Failed to create lead';
			}
		} catch {
			createError = 'Network error';
		} finally {
			isCreating = false;
		}
	}

	async function convertLead(leadId: string) {
		const res = await secureFetch(`/api/leads/${leadId}/convert`, { method: 'POST' });
		const result = await res.json();
		if (result.success) {
			goto(`/dashboard/dsa/cases`);
		}
	}
</script>

<svelte:head>
	<title>Leads | CRM | DigitalDSA</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-3">
			<a
				href="/dashboard/dsa/crm"
				aria-label="Go back"
				class="text-[var(--dash-text-muted)] hover:text-[var(--dash-text-secondary)]"
			>
				<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
				</svg>
			</a>
			<div>
				<h1 class="text-2xl font-bold text-[var(--dash-text)]">Leads</h1>
				<p class="text-sm text-[var(--dash-text-secondary)]">{totalLeads} total leads</p>
			</div>
		</div>
		<button
			onclick={() => (showCreateForm = true)}
			class="rounded-lg bg-[var(--ddsa-accent-500)] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90"
		>
			New Lead
		</button>
	</div>

	<!-- Status filters -->
	<div class="flex flex-wrap gap-2">
		<a
			href="/dashboard/dsa/crm/leads"
			class="rounded-full px-3 py-1.5 text-xs font-medium transition-colors
				{data.activeFilter === 'all'
				? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
				: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)] hover:bg-[var(--dash-hover)]'}"
		>
			All ({totalLeads})
		</a>
		{#each Object.entries(STATUS_LABELS) as [key, meta]}
			<a
				href="/dashboard/dsa/crm/leads?status={key}"
				class="rounded-full px-3 py-1.5 text-xs font-medium transition-colors
					{data.activeFilter === key
					? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
					: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)] hover:bg-[var(--dash-hover)]'}"
			>
				{meta.label} ({data.statusCounts[key] || 0})
			</a>
		{/each}
	</div>

	<!-- Leads list -->
	{#if data.leads.length === 0}
		<EmptyState
			title="No leads found"
			description="Create your first lead to start tracking."
			variant="compact"
		/>
	{:else}
		<div class="space-y-3">
			{#each data.leads as lead}
				{@const statusMeta = STATUS_LABELS[lead.status] || {
					label: lead.status,
					color: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]'
				}}
				<div class="rounded-xl border border-[var(--dash-border)] bg-[var(--dash-bg-card)] p-4">
					<div class="flex items-start justify-between">
						<div class="space-y-1">
							<div class="flex items-center gap-2">
								<span class="font-mono text-xs text-[var(--dash-text-muted)]">{lead.lead_id}</span>
								<span class="rounded-full px-2 py-0.5 text-xs font-medium {statusMeta.color}">
									{statusMeta.label}
								</span>
							</div>
							<p class="font-semibold text-[var(--dash-text)]">{lead.label}</p>
							{#if lead.loan_type}
								<p class="text-xs text-[var(--dash-text-secondary)]">
									{lead.loan_type}
									{lead.estimated_amount ? `- ${formatCurrency(lead.estimated_amount)}` : ''}
								</p>
							{/if}
						</div>
						<div class="flex gap-2">
							{#if lead.status !== 'converted' && lead.status !== 'dropped'}
								<button
									onclick={() => convertLead(lead.lead_id)}
									class="rounded-lg border border-[var(--dash-btn-ghost-border)] px-3 py-1.5 text-xs font-medium text-[var(--dash-accent-text)] hover:bg-[var(--dash-btn-ghost-bg)]"
								>
									Convert to Case
								</button>
							{/if}
							{#if lead.converted_case_id}
								<a
									href="/dashboard/dsa/cases"
									class="rounded-lg border border-[var(--dash-border)] px-3 py-1.5 text-xs font-medium text-[var(--dash-text-secondary)] hover:bg-[var(--dash-hover)]"
								>
									View Case
								</a>
							{/if}
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Create Lead Modal -->
	{#if showCreateForm}
		<div
			class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
			role="dialog"
			aria-modal="true"
			aria-label="New lead"
			tabindex="-1"
			onclick={(e) => {
				if (e.target === e.currentTarget) showCreateForm = false;
			}}
			onkeydown={(e) => {
				if (e.key === 'Escape') showCreateForm = false;
			}}
		>
			<div class="w-full max-w-md rounded-xl bg-[var(--dash-bg-card)] p-6 shadow-2xl">
				<h3 class="mb-4 text-lg font-bold text-[var(--dash-text)]">New Lead</h3>
				<div class="space-y-4">
					<div>
						<label
							for="lead-label"
							class="mb-1 block text-sm font-medium text-[var(--dash-text-secondary)]"
							>Label *</label
						>
						<input
							id="lead-label"
							type="text"
							bind:value={newLabel}
							placeholder="e.g. Builder referral - Whitefield"
							class="w-full rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-3 py-2 text-sm text-[var(--dash-text)] focus:border-[var(--ddsa-accent-500)] focus:outline-none"
						/>
					</div>
					<div>
						<label
							for="lead-loan-type"
							class="mb-1 block text-sm font-medium text-[var(--dash-text-secondary)]"
							>Loan Type</label
						>
						<input
							id="lead-loan-type"
							type="text"
							bind:value={newLoanType}
							placeholder="e.g. Home Loan"
							class="w-full rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-3 py-2 text-sm text-[var(--dash-text)] focus:border-[var(--ddsa-accent-500)] focus:outline-none"
						/>
					</div>
					<div>
						<label
							for="lead-amount"
							class="mb-1 block text-sm font-medium text-[var(--dash-text-secondary)]"
							>Estimated Amount</label
						>
						<input
							id="lead-amount"
							type="number"
							bind:value={newAmount}
							placeholder="e.g. 5000000"
							class="w-full rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-3 py-2 text-sm text-[var(--dash-text)] focus:border-[var(--ddsa-accent-500)] focus:outline-none"
						/>
					</div>
					{#if data.sources.length > 0}
						<div>
							<label
								for="lead-source"
								class="mb-1 block text-sm font-medium text-[var(--dash-text-secondary)]"
								>Source</label
							>
							<select
								id="lead-source"
								bind:value={newSourceId}
								class="w-full rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-3 py-2 text-sm text-[var(--dash-text)] focus:border-[var(--ddsa-accent-500)] focus:outline-none"
							>
								<option value="">None</option>
								{#each data.sources as source}
									<option value={source._id}>{source.name}</option>
								{/each}
							</select>
						</div>
					{/if}
					<div>
						<label
							for="lead-notes"
							class="mb-1 block text-sm font-medium text-[var(--dash-text-secondary)]">Notes</label
						>
						<textarea
							id="lead-notes"
							bind:value={newNotes}
							rows="2"
							class="w-full rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-3 py-2 text-sm text-[var(--dash-text)] focus:border-[var(--ddsa-accent-500)] focus:outline-none"
						></textarea>
					</div>
					{#if createError}
						<p class="text-sm text-[var(--dash-contrast-text)]">{createError}</p>
					{/if}
					<div class="flex gap-3 pt-2">
						<button
							onclick={() => (showCreateForm = false)}
							class="flex-1 rounded-lg border border-[var(--dash-border)] px-4 py-2.5 text-sm font-medium text-[var(--dash-text-secondary)] hover:bg-[var(--dash-hover)]"
							>Cancel</button
						>
						<button
							onclick={createLead}
							disabled={isCreating}
							class="flex-1 rounded-lg bg-[var(--ddsa-accent-500)] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
						>
							{isCreating ? 'Creating...' : 'Create Lead'}
						</button>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>
