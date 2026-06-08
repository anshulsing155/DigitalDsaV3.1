<script lang="ts">
	import { goto } from '$app/navigation';
	import { secureFetch } from '$lib/utils/csrf';

	let { data } = $props();

	// Auto-select RM's own bank if known
	let selectedLender = $state('');
	let isLenderLocked = $derived(!!data.rmLenderId);

	$effect(() => {
		if (data.rmLenderId) selectedLender = data.rmLenderId;
	});
	let selectedProductType = $state('');
	let selectedGeoState = $state('');
	let urgency = $state<'normal' | 'urgent' | 'critical'>('normal');
	let description = $state('');
	let isSubmitting = $state(false);
	let errorMsg = $state('');

	let filteredProducts = $derived(
		selectedLender ? data.products.filter((p) => p.lender_id === selectedLender) : []
	);

	let selectedLenderName = $derived(
		data.lenders.find((l) => l.lender_id === selectedLender)?.lender_name || ''
	);

	async function handleSubmit() {
		if (!selectedLender) {
			errorMsg = 'Please select a lender';
			return;
		}
		if (!description.trim() || description.trim().length < 10) {
			errorMsg = 'Description must be at least 10 characters';
			return;
		}

		isSubmitting = true;
		errorMsg = '';

		try {
			const res = await secureFetch('/api/rm/submissions', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					lender_id: selectedLender,
					product_type: selectedProductType || undefined,
					geo_state: selectedGeoState || undefined,
					urgency,
					description: description.trim()
				})
			});
			const result = await res.json();
			if (!result.success) {
				errorMsg = result.error || 'Failed to create submission';
				return;
			}
			goto(`/dashboard/rm/submissions/${result.data.submission_id}`);
		} catch {
			errorMsg = 'Network error — please try again';
		} finally {
			isSubmitting = false;
		}
	}
</script>

<svelte:head>
	<title>RM: New Submission | DigitalDSA</title>
</svelte:head>

<div class="mx-auto max-w-2xl space-y-6">
	<div>
		<a
			href="/dashboard/rm/submissions"
			class="text-sm text-[var(--dash-text-muted)] hover:text-[var(--dash-text-secondary)]"
			>Back to Submissions</a
		>
		<h1 class="mt-2 text-2xl font-bold text-[var(--dash-text)]">New Policy Submission</h1>
		<p class="mt-1 text-sm text-[var(--dash-text-secondary)]">
			Submit policy updates or new information for admin review
		</p>
	</div>

	{#if errorMsg}
		<div
			class="rounded-lg bg-[var(--dash-contrast-ghost-bg)] p-4 text-sm text-[var(--dash-contrast-text)]"
		>
			{errorMsg}
		</div>
	{/if}

	<div class="card-surface space-y-5 rounded-xl">
		<!-- Lender -->
		<div>
			<label for="lender" class="block text-sm font-medium text-[var(--dash-text-secondary)]"
				>Lender *</label
			>
			{#if isLenderLocked}
				<!-- RM's bank is known — show locked, no need to select -->
				<div
					class="mt-1 flex items-center gap-2 rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-alt)] px-3 py-2.5"
				>
					<span class="text-sm font-medium text-[var(--dash-text)]">{data.rmBankName}</span>
					<span
						class="ml-auto rounded bg-[var(--dash-btn-ghost-bg)] px-2 py-0.5 text-xs font-medium text-[var(--dash-accent-text)]"
						>Your Bank</span
					>
				</div>
				<p class="mt-1 text-xs text-[var(--dash-text-muted)]">
					Auto-detected from your official email. Contact support to change.
				</p>
			{:else}
				<!-- Fallback: bank not yet resolved — let RM pick -->
				<select
					id="lender"
					bind:value={selectedLender}
					class="mt-1 w-full rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-3 py-2.5 text-sm text-[var(--dash-text)] outline-none focus:border-[var(--dash-accent-text)] focus:ring-2 focus:ring-[var(--dash-accent-text)]/20"
				>
					<option value="">Select a lender...</option>
					{#each data.lenders as lender}
						<option value={lender.lender_id}>{lender.lender_name} ({lender.classification})</option>
					{/each}
				</select>
			{/if}
		</div>

		<!-- Product Type (optional) -->
		{#if filteredProducts.length > 0}
			<div>
				<label for="product" class="block text-sm font-medium text-[var(--dash-text-secondary)]"
					>Product Type (optional)</label
				>
				<select
					id="product"
					bind:value={selectedProductType}
					class="mt-1 w-full rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-3 py-2.5 text-sm text-[var(--dash-text)] outline-none focus:border-[var(--dash-accent-text)] focus:ring-2 focus:ring-[var(--dash-accent-text)]/20"
				>
					<option value="">Not sure / All products</option>
					{#each filteredProducts as product}
						<option value={product.product_type}>{product.product_label}</option>
					{/each}
				</select>
			</div>
		{/if}

		<!-- Geography (optional) -->
		<div>
			<label for="geo" class="block text-sm font-medium text-[var(--dash-text-secondary)]"
				>State (optional)</label
			>
			<select
				id="geo"
				bind:value={selectedGeoState}
				class="mt-1 w-full rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-3 py-2.5 text-sm text-[var(--dash-text)] outline-none focus:border-[var(--dash-accent-text)] focus:ring-2 focus:ring-[var(--dash-accent-text)]/20"
			>
				<option value="">PAN India / Not sure</option>
				{#each data.geoStates as state}
					<option value={state.geo_scope_id}>{state.label}</option>
				{/each}
			</select>
		</div>

		<!-- Urgency -->
		<div>
			<p class="block text-sm font-medium text-[var(--dash-text-secondary)]">Urgency</p>
			<div class="mt-2 flex gap-3">
				{#each [['normal', 'Normal'], ['urgent', 'Urgent'], ['critical', 'Critical']] as [value, label]}
					<button
						onclick={() => (urgency = value as 'normal' | 'urgent' | 'critical')}
						class="rounded-lg px-4 py-2 text-sm font-medium transition-colors
							{urgency === value
							? 'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)] ring-1 ring-[var(--dash-btn-ghost-border)]'
							: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)] hover:bg-[var(--dash-hover)]'}"
					>
						{label}
					</button>
				{/each}
			</div>
		</div>

		<!-- Description -->
		<div>
			<label for="desc" class="block text-sm font-medium text-[var(--dash-text-secondary)]"
				>Description *</label
			>
			<textarea
				id="desc"
				bind:value={description}
				rows="5"
				placeholder="Describe the policy update, rate change, or new information. Include specifics like effective dates, rate changes, new conditions, etc."
				class="mt-1 w-full rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-3 py-2.5 text-sm text-[var(--dash-text)] placeholder-[var(--dash-text-muted)] outline-none focus:border-[var(--dash-accent-text)] focus:ring-2 focus:ring-[var(--dash-accent-text)]/20"
			></textarea>
			<p class="mt-1 text-xs text-[var(--dash-text-muted)]">
				{description.length} characters (min 10)
			</p>
		</div>

		<!-- Submit -->
		<div class="flex items-center justify-between border-t border-[var(--dash-border-light)] pt-4">
			<p class="text-xs text-[var(--dash-text-muted)]">
				You can upload documents after creating the submission.
			</p>
			<button
				onclick={handleSubmit}
				disabled={isSubmitting}
				class="rounded-lg bg-[var(--dash-btn-bg)] px-6 py-2.5 text-sm font-medium text-[var(--dash-btn-text)] transition-colors hover:brightness-105 disabled:opacity-50"
			>
				{isSubmitting ? 'Submitting...' : 'Submit'}
			</button>
		</div>
	</div>
</div>
