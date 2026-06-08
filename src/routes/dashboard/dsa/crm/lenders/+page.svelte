<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { secureFetch } from '$lib/utils/csrf';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import { formatCurrency } from '$lib/i18n';

	let { data } = $props();

	let showCreateForm = $state(false);
	let newLenderName = $state('');
	let newBranch = $state('');
	let newCity = $state('');
	let newEmpanelled = $state(false);
	let newDsaCode = $state('');
	let isCreating = $state(false);
	let createError = $state('');

	async function createLender() {
		createError = '';
		if (!newLenderName.trim()) {
			createError = 'Lender name is required';
			return;
		}
		isCreating = true;
		try {
			const body: any = {
				lender_name: newLenderName.trim(),
				empanelled: newEmpanelled
			};
			if (newBranch) body.branch = newBranch;
			if (newCity) body.city = newCity;
			if (newDsaCode) body.dsa_code_at_lender = newDsaCode;

			const res = await secureFetch('/api/crm-lenders', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});
			const result = await res.json();
			if (result.success) {
				showCreateForm = false;
				newLenderName = '';
				newBranch = '';
				newCity = '';
				newDsaCode = '';
				newEmpanelled = false;
				await invalidateAll();
			} else {
				createError = result.error || 'Failed';
			}
		} catch {
			createError = 'Network error';
		} finally {
			isCreating = false;
		}
	}
</script>

<svelte:head>
	<title>Lenders | CRM | DigitalDSA</title>
</svelte:head>

<div class="space-y-6">
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
			<h1 class="text-2xl font-bold text-[var(--dash-text)]">Lender Relationships</h1>
		</div>
		<button
			onclick={() => (showCreateForm = true)}
			class="rounded-lg bg-[var(--ddsa-accent-500)] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90"
		>
			Add Lender
		</button>
	</div>

	{#if data.lenders.length === 0}
		<EmptyState
			title="No lender relationships yet"
			description="Track your empanelment status and case history with lenders."
			variant="compact"
		/>
	{:else}
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each data.lenders as lender}
				<div
					class="rounded-xl border border-[var(--dash-border)] bg-[var(--dash-bg-card)] p-5 {lender.is_active
						? ''
						: 'opacity-50'}"
				>
					<div class="mb-3 flex items-start justify-between">
						<h3 class="font-semibold text-[var(--dash-text)]">{lender.lender_name}</h3>
						{#if lender.empanelled}
							<span
								class="rounded-full bg-[var(--dash-btn-ghost-bg)] px-2 py-0.5 text-xs font-medium text-[var(--dash-accent-text)]"
								>Empanelled</span
							>
						{:else}
							<span
								class="rounded-full bg-[var(--dash-bg-alt)] px-2 py-0.5 text-xs font-medium text-[var(--dash-text-secondary)]"
								>Not Empanelled</span
							>
						{/if}
					</div>
					{#if lender.branch || lender.city}
						<p class="mb-2 text-xs text-[var(--dash-text-secondary)]">
							{[lender.branch, lender.city].filter(Boolean).join(', ')}
						</p>
					{/if}
					{#if lender.dsa_code_at_lender}
						<p class="mb-3 text-xs text-[var(--dash-text-muted)]">
							DSA Code: {lender.dsa_code_at_lender}
						</p>
					{/if}
					<div class="grid grid-cols-3 gap-2 border-t border-[var(--dash-border-light)] pt-3">
						<div class="text-center">
							<p class="text-lg font-bold text-[var(--dash-text)]">{lender.total_cases}</p>
							<p class="text-[12px] text-[var(--dash-text-secondary)]">Cases</p>
						</div>
						<div class="text-center">
							<p class="text-lg font-bold text-[var(--dash-text)]">{lender.total_sanctioned}</p>
							<p class="text-[12px] text-[var(--dash-text-secondary)]">Sanctioned</p>
						</div>
						<div class="text-center">
							<p class="text-lg font-bold text-[var(--dash-text)]">
								{lender.avg_processing_days || '-'}
							</p>
							<p class="text-[12px] text-[var(--dash-text-secondary)]">Avg Days</p>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Create Modal -->
	{#if showCreateForm}
		<div
			class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
			role="dialog"
			aria-modal="true"
			aria-label="Add lender"
			tabindex="-1"
			onclick={(e) => {
				if (e.target === e.currentTarget) showCreateForm = false;
			}}
			onkeydown={(e) => {
				if (e.key === 'Escape') showCreateForm = false;
			}}
		>
			<div class="w-full max-w-md rounded-xl bg-[var(--dash-bg-card)] p-6 shadow-2xl">
				<h3 class="mb-4 text-lg font-bold text-[var(--dash-text)]">Add Lender</h3>
				<div class="space-y-4">
					<div>
						<label
							for="lndr-name"
							class="mb-1 block text-sm font-medium text-[var(--dash-text-secondary)]"
							>Lender Name *</label
						>
						<input
							id="lndr-name"
							type="text"
							bind:value={newLenderName}
							placeholder="e.g. HDFC Bank"
							class="w-full rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-3 py-2 text-sm text-[var(--dash-text)] focus:border-[var(--ddsa-accent-500)] focus:outline-none"
						/>
					</div>
					<div>
						<label
							for="lndr-branch"
							class="mb-1 block text-sm font-medium text-[var(--dash-text-secondary)]">Branch</label
						>
						<input
							id="lndr-branch"
							type="text"
							bind:value={newBranch}
							class="w-full rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-3 py-2 text-sm text-[var(--dash-text)] focus:border-[var(--ddsa-accent-500)] focus:outline-none"
						/>
					</div>
					<div>
						<label
							for="lndr-city"
							class="mb-1 block text-sm font-medium text-[var(--dash-text-secondary)]">City</label
						>
						<input
							id="lndr-city"
							type="text"
							bind:value={newCity}
							class="w-full rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-3 py-2 text-sm text-[var(--dash-text)] focus:border-[var(--ddsa-accent-500)] focus:outline-none"
						/>
					</div>
					<div>
						<label
							for="lndr-code"
							class="mb-1 block text-sm font-medium text-[var(--dash-text-secondary)]"
							>Your DSA Code at this Lender</label
						>
						<input
							id="lndr-code"
							type="text"
							bind:value={newDsaCode}
							class="w-full rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-3 py-2 text-sm text-[var(--dash-text)] focus:border-[var(--ddsa-accent-500)] focus:outline-none"
						/>
					</div>
					<label class="flex items-center gap-2">
						<input
							type="checkbox"
							bind:checked={newEmpanelled}
							class="h-4 w-4 rounded border-[var(--dash-border)] accent-[var(--ddsa-accent-500)]"
						/>
						<span class="text-sm text-[var(--dash-text-secondary)]"
							>Empanelled with this lender</span
						>
					</label>
					{#if createError}<p class="text-sm text-[var(--dash-contrast-text)]">
							{createError}
						</p>{/if}
					<div class="flex gap-3 pt-2">
						<button
							onclick={() => (showCreateForm = false)}
							class="flex-1 rounded-lg border border-[var(--dash-border)] px-4 py-2.5 text-sm font-medium text-[var(--dash-text-secondary)] hover:bg-[var(--dash-hover)]"
							>Cancel</button
						>
						<button
							onclick={createLender}
							disabled={isCreating}
							class="flex-1 rounded-lg bg-[var(--ddsa-accent-500)] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
							>{isCreating ? 'Creating...' : 'Add Lender'}</button
						>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>
