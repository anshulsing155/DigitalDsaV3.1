<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { secureFetch } from '$lib/utils/csrf';
	import EmptyState from '$lib/components/EmptyState.svelte';

	let { data } = $props();

	let showCreateForm = $state(false);
	let newName = $state('');
	let newCategory = $state<string>('referral');
	let newContactName = $state('');
	let newContactPhone = $state('');
	let newCity = $state('');
	let isCreating = $state(false);
	let createError = $state('');

	const CATEGORY_LABELS: Record<string, string> = {
		builder: 'Builder',
		ca: 'CA',
		broker: 'Broker',
		referral: 'Referral',
		online: 'Online',
		walk_in: 'Walk-in',
		self: 'Self',
		other: 'Other'
	};

	async function createSource() {
		createError = '';
		if (!newName.trim()) {
			createError = 'Name is required';
			return;
		}
		isCreating = true;
		try {
			const body: any = { name: newName.trim(), category: newCategory };
			if (newContactName) body.contact_name = newContactName;
			if (newContactPhone) body.contact_phone = newContactPhone;
			if (newCity) body.city = newCity;

			const res = await secureFetch('/api/sources', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});
			const result = await res.json();
			if (result.success) {
				showCreateForm = false;
				newName = '';
				newContactName = '';
				newContactPhone = '';
				newCity = '';
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

	async function toggleActive(sourceId: string, isActive: boolean) {
		await secureFetch(`/api/sources/${sourceId}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ is_active: !isActive })
		});
		await invalidateAll();
	}
</script>

<svelte:head>
	<title>Sources | CRM | DigitalDSA</title>
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
			<h1 class="text-2xl font-bold text-[var(--dash-text)]">Sources</h1>
		</div>
		<button
			onclick={() => (showCreateForm = true)}
			class="rounded-lg bg-[var(--ddsa-accent-500)] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90"
		>
			Add Source
		</button>
	</div>

	{#if data.sources.length === 0}
		<EmptyState
			title="No sources yet"
			description="Track where your leads come from."
			variant="compact"
		/>
	{:else}
		<div
			class="overflow-x-auto rounded-xl border border-[var(--dash-border)] bg-[var(--dash-bg-card)]"
		>
			<table class="w-full text-left text-sm">
				<thead class="border-b border-[var(--dash-border-light)] bg-[var(--dash-bg-alt)]">
					<tr>
						<th class="px-4 py-3 font-medium text-[var(--dash-text-secondary)]">Name</th>
						<th class="px-4 py-3 font-medium text-[var(--dash-text-secondary)]">Category</th>
						<th class="px-4 py-3 font-medium text-[var(--dash-text-secondary)]">Leads</th>
						<th class="px-4 py-3 font-medium text-[var(--dash-text-secondary)]">Cases</th>
						<th class="px-4 py-3 font-medium text-[var(--dash-text-secondary)]">Sanctioned</th>
						<th class="px-4 py-3 font-medium text-[var(--dash-text-secondary)]">Status</th>
						<th class="px-4 py-3 font-medium text-[var(--dash-text-secondary)]">Actions</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-[var(--dash-border)]">
					{#each data.sources as source}
						<tr class={source.is_active ? '' : 'opacity-50'}>
							<td class="px-4 py-3 font-medium text-[var(--dash-text)]">{source.name}</td>
							<td class="px-4 py-3">
								<span
									class="rounded-full bg-[var(--dash-bg-alt)] px-2 py-0.5 text-xs text-[var(--dash-text-secondary)]"
								>
									{CATEGORY_LABELS[source.category] || source.category}
								</span>
							</td>
							<td class="px-4 py-3 text-[var(--dash-text-secondary)]">{source.total_leads}</td>
							<td class="px-4 py-3 text-[var(--dash-text-secondary)]">{source.total_cases}</td>
							<td class="px-4 py-3 text-[var(--dash-text-secondary)]">{source.total_sanctioned}</td>
							<td class="px-4 py-3">
								<span
									class="rounded-full px-2 py-0.5 text-xs font-medium {source.is_active
										? 'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)]'
										: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]'}"
								>
									{source.is_active ? 'Active' : 'Inactive'}
								</span>
							</td>
							<td class="px-4 py-3">
								<button
									onclick={() => toggleActive(source._id, source.is_active)}
									class="text-xs text-[var(--dash-accent-text)] hover:underline"
								>
									{source.is_active ? 'Deactivate' : 'Reactivate'}
								</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}

	<!-- Create Modal -->
	{#if showCreateForm}
		<div
			class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
			role="dialog"
			aria-modal="true"
			aria-label="Add source"
			tabindex="-1"
			onclick={(e) => {
				if (e.target === e.currentTarget) showCreateForm = false;
			}}
			onkeydown={(e) => {
				if (e.key === 'Escape') showCreateForm = false;
			}}
		>
			<div class="w-full max-w-md rounded-xl bg-[var(--dash-bg-card)] p-6 shadow-2xl">
				<h3 class="mb-4 text-lg font-bold text-[var(--dash-text)]">Add Source</h3>
				<div class="space-y-4">
					<div>
						<label
							for="src-name"
							class="mb-1 block text-sm font-medium text-[var(--dash-text-secondary)]">Name *</label
						>
						<input
							id="src-name"
							type="text"
							bind:value={newName}
							class="w-full rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-3 py-2 text-sm text-[var(--dash-text)] focus:border-[var(--ddsa-accent-500)] focus:outline-none"
						/>
					</div>
					<div>
						<label
							for="src-category"
							class="mb-1 block text-sm font-medium text-[var(--dash-text-secondary)]"
							>Category *</label
						>
						<select
							id="src-category"
							bind:value={newCategory}
							class="w-full rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-3 py-2 text-sm text-[var(--dash-text)] focus:border-[var(--ddsa-accent-500)] focus:outline-none"
						>
							{#each Object.entries(CATEGORY_LABELS) as [val, label]}
								<option value={val}>{label}</option>
							{/each}
						</select>
					</div>
					<div>
						<label
							for="src-contact"
							class="mb-1 block text-sm font-medium text-[var(--dash-text-secondary)]"
							>Contact Name</label
						>
						<input
							id="src-contact"
							type="text"
							bind:value={newContactName}
							class="w-full rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-3 py-2 text-sm text-[var(--dash-text)] focus:border-[var(--ddsa-accent-500)] focus:outline-none"
						/>
					</div>
					<div>
						<label
							for="src-phone"
							class="mb-1 block text-sm font-medium text-[var(--dash-text-secondary)]"
							>Contact Phone</label
						>
						<input
							id="src-phone"
							type="tel"
							bind:value={newContactPhone}
							class="w-full rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-3 py-2 text-sm text-[var(--dash-text)] focus:border-[var(--ddsa-accent-500)] focus:outline-none"
						/>
					</div>
					<div>
						<label
							for="src-city"
							class="mb-1 block text-sm font-medium text-[var(--dash-text-secondary)]">City</label
						>
						<input
							id="src-city"
							type="text"
							bind:value={newCity}
							class="w-full rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-3 py-2 text-sm text-[var(--dash-text)] focus:border-[var(--ddsa-accent-500)] focus:outline-none"
						/>
					</div>
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
							onclick={createSource}
							disabled={isCreating}
							class="flex-1 rounded-lg bg-[var(--ddsa-accent-500)] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
							>{isCreating ? 'Creating...' : 'Add Source'}</button
						>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>
