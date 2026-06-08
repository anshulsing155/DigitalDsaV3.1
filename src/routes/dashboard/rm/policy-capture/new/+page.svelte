<script lang="ts">
	import { goto } from '$app/navigation';
	import { secureFetch } from '$lib/utils/csrf';
	import { ROUTES } from '$lib/config/routes.js';
	import type { ProductType } from '$lib/types/policyEngine.js';
	import { PRODUCT_TYPE_LABELS } from '$lib/types/policyEngine.js';

	let { data } = $props();

	// Auto-select RM's own bank if known
	let selectedLender = $state('');
	let isLenderLocked = $derived(!!data.rmLenderId);

	$effect(() => {
		if (data.rmLenderId) selectedLender = data.rmLenderId;
	});

	let selectedProductType = $state<ProductType | ''>('');
	let isSubmitting = $state(false);
	let errorMsg = $state('');

	// PMS Phase 2.A passive intelligence (2026-05-31): policy scope is
	// auto-derived from the RM's working city. The form no longer asks
	// State/PAN India — the system infers state and India levels later
	// via the convergence engine. When the city isn't seeded yet (data
	// race) we show a warning; the API gracefully accepts the request
	// without a city tag and the version stays untagged until backfill.
	const hasCityScope = $derived(!!data.rmCityScopeId);

	// Filter products by selected lender
	let filteredProducts = $derived(
		selectedLender ? data.products.filter((p) => p.lender_id === selectedLender) : []
	);

	let selectedLenderName = $derived(
		data.lenders.find((l) => l.lender_id === selectedLender)?.lender_name || ''
	);

	// Loan categories for grouping
	const LOAN_CATEGORIES: { label: string; types: ProductType[] }[] = [
		{
			label: 'Home Loan',
			types: ['HL_NEW', 'HL_BT', 'HL_TOPUP', 'HL_BT_TOPUP']
		},
		{
			label: 'Loan Against Property',
			types: ['LAP_NEW', 'LAP_BT']
		},
		{
			label: 'Plot & Construction',
			types: ['PLOT_CONST']
		},
		{
			label: 'Personal Loan',
			types: ['PL']
		},
		{
			label: 'Business Loan',
			types: ['BL_UNSECURED', 'BL_SECURED']
		}
	];

	async function handleCreate() {
		if (!selectedLender) {
			errorMsg = 'Please select a lender';
			return;
		}
		if (!selectedProductType) {
			errorMsg = 'Please select a product type';
			return;
		}

		isSubmitting = true;
		errorMsg = '';

		try {
			const res = await secureFetch('/api/rm/policy-captures', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					lender_id: selectedLender,
					product_type: selectedProductType,
					// PMS Phase 2.A: tag the capture with the RM's working-city
					// geo_scope_id. Convergence engine (Phase D, future) reads
					// these tags to infer state/pan-India rules over time.
					geo_city: data.rmCityScopeId || undefined
				})
			});
			const result = await res.json();
			if (!result.success) {
				errorMsg = result.error || 'Failed to create capture';
				return;
			}
			goto(`${ROUTES.DASHBOARD.RM.POLICY_CAPTURE}/${result.data.capture_id}`);
		} catch {
			errorMsg = 'Network error — please try again';
		} finally {
			isSubmitting = false;
		}
	}
</script>

<svelte:head>
	<title>RM: New Policy Capture | DigitalDSA</title>
</svelte:head>

<div class="mx-auto max-w-2xl space-y-6">
	<div>
		<a
			href={ROUTES.DASHBOARD.RM.POLICY_CAPTURE}
			class="text-sm text-[var(--dash-text-muted)] hover:text-[var(--dash-text-secondary)]"
		>
			Back to Policy Capture
		</a>
		<h1 class="mt-2 text-2xl font-bold text-[var(--dash-text)]">New Policy Capture</h1>
		<p class="mt-1 text-sm text-[var(--dash-text-secondary)]">
			Select the bank and product to capture lending policy details
		</p>
	</div>

	{#if errorMsg}
		<div
			class="rounded-lg bg-[var(--dash-contrast-ghost-bg)] p-4 text-sm text-[var(--dash-contrast-text)]"
		>
			{errorMsg}
		</div>
	{/if}

	<div class="space-y-5 rounded-xl border border-[var(--dash-border)] bg-[var(--dash-bg-card)] p-6">
		<!-- Lender -->
		<div>
			<label for="lender" class="block text-sm font-medium text-[var(--dash-text-secondary)]"
				>Bank / Lender *</label
			>
			{#if isLenderLocked}
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
					Auto-detected from your official email.
				</p>
			{:else}
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

		<!-- Product Type -->
		<div>
			<span class="block text-sm font-medium text-[var(--dash-text-secondary)]">Product Type *</span
			>
			<p class="mt-0.5 text-xs text-[var(--dash-text-muted)]">
				Select the specific loan product this policy covers
			</p>

			<div class="mt-3 space-y-4">
				{#each LOAN_CATEGORIES as category}
					<div>
						<p
							class="mb-2 text-xs font-semibold tracking-wider text-[var(--dash-text-muted)] uppercase"
						>
							{category.label}
						</p>
						<div class="flex flex-wrap gap-2">
							{#each category.types as ptype}
								<button
									type="button"
									onclick={() => (selectedProductType = ptype)}
									class="rounded-lg px-3 py-2 text-sm font-medium transition-colors
										{selectedProductType === ptype
										? 'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)] ring-1 ring-[var(--dash-btn-ghost-border)]'
										: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)] hover:bg-[var(--dash-hover)]'}"
								>
									{PRODUCT_TYPE_LABELS[ptype]}
								</button>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- Geography — auto-tagged from RM's working city -->
		<div>
			<span class="block text-sm font-medium text-[var(--dash-text-secondary)]">Scope</span>
			<p class="mt-0.5 text-xs text-[var(--dash-text-muted)]">
				Policies you author are tagged with your working city. The system promotes them to state
				or pan-India automatically as other cities agree.
			</p>

			{#if hasCityScope}
				<div
					class="mt-2 flex items-center gap-2 rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-alt)] px-3 py-2.5"
				>
					<span class="text-sm font-medium text-[var(--dash-text)]">{data.rmCity}</span>
					<span
						class="ml-auto rounded bg-[var(--dash-btn-ghost-bg)] px-2 py-0.5 text-xs font-medium text-[var(--dash-accent-text)]"
					>
						Tagged
					</span>
				</div>
			{:else if data.rmCity}
				<div
					class="mt-2 rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-alt)] px-3 py-2.5 text-xs text-[var(--dash-text-muted)]"
				>
					Your working city <strong class="text-[var(--dash-text-secondary)]">{data.rmCity}</strong>
					isn't in the seeded city list yet. This capture will be saved without a city tag and can
					be re-scoped later.
				</div>
			{:else}
				<div
					class="mt-2 rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-alt)] px-3 py-2.5 text-xs text-[var(--dash-text-muted)]"
				>
					Add your working city in Settings so policies you author are scoped correctly.
				</div>
			{/if}
		</div>

		<!-- Create -->
		<div class="flex items-center justify-between border-t border-[var(--dash-border-light)] pt-4">
			<p class="text-xs text-[var(--dash-text-muted)]">You can save progress and continue later.</p>
			<button
				onclick={handleCreate}
				disabled={isSubmitting || !selectedLender || !selectedProductType}
				class="rounded-lg bg-[var(--dash-btn-bg)] px-6 py-2.5 text-sm font-medium text-[var(--dash-btn-text)] transition-colors hover:brightness-105 disabled:opacity-50"
			>
				{isSubmitting ? 'Creating...' : 'Start Capture'}
			</button>
		</div>
	</div>
</div>
