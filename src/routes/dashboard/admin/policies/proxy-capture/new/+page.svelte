<script lang="ts">
	import { goto } from '$app/navigation';
	import { secureFetch } from '$lib/utils/csrf';
	import type { ProductType } from '$lib/types/policyEngine.js';
	import { PRODUCT_TYPE_LABELS } from '$lib/types/policyEngine.js';

	let { data } = $props();

	// ── Step 0: who is this for ──────────────────────────────────
	let rmMode = $state<'existing' | 'stub'>('existing');

	// Existing-RM search
	let rmQuery = $state('');
	let rmResults = $state<
		Array<{ rmId: string; name: string; bankName: string; mobileLast4: string }>
	>([]);
	let selectedRmId = $state('');
	let selectedRmLabel = $state('');
	let searching = $state(false);
	let searchTimer: ReturnType<typeof setTimeout> | null = null;

	function onSearchInput() {
		selectedRmId = '';
		if (searchTimer) clearTimeout(searchTimer);
		const q = rmQuery.trim();
		if (q.length < 2) {
			rmResults = [];
			return;
		}
		searchTimer = setTimeout(async () => {
			searching = true;
			try {
				const res = await fetch(`/api/admin/rm-search?q=${encodeURIComponent(q)}`);
				const json = await res.json();
				rmResults = json?.data?.results ?? json?.results ?? [];
			} catch {
				rmResults = [];
			} finally {
				searching = false;
			}
		}, 300);
	}

	function pickRm(r: { rmId: string; name: string; bankName: string }) {
		selectedRmId = r.rmId;
		selectedRmLabel = `${r.name}${r.bankName ? ' · ' + r.bankName : ''}`;
		rmResults = [];
		rmQuery = selectedRmLabel;
	}

	// Stub-RM fields
	let stubName = $state('');
	let stubBank = $state('');
	let stubMobile = $state('');
	let stubEmail = $state('');

	// Arrival + reference
	const CHANNELS = [
		{ value: 'whatsapp', label: 'WhatsApp' },
		{ value: 'email', label: 'Email' },
		{ value: 'fax', label: 'Fax' },
		{ value: 'phone', label: 'Phone call' },
		{ value: 'in_person', label: 'In-person' }
	];
	let arrivalChannel = $state('');
	let referenceNote = $state('');

	// Scope: lender / product / geo
	let selectedLender = $state('');
	let selectedProductType = $state<ProductType | ''>('');
	let selectedGeoState = $state('');

	// A.2 Slice 4b — soft dedup: warn (don't block) if a non-rejected capture
	// already exists for this lender + product. Policies are per lender+product,
	// so this checks across all RMs.
	let dupCaptures = $state<
		Array<{ capture_id: string; rm_name: string; status: string }>
	>([]);
	let dupCheckTimer: ReturnType<typeof setTimeout> | null = null;

	$effect(() => {
		const lender = selectedLender;
		const product = selectedProductType;
		if (dupCheckTimer) clearTimeout(dupCheckTimer);
		if (!lender || !product) {
			dupCaptures = [];
			return;
		}
		dupCheckTimer = setTimeout(async () => {
			try {
				const res = await fetch(
					`/api/admin/policies/proxy-capture/check-existing?lender_id=${encodeURIComponent(lender)}&product_type=${encodeURIComponent(product)}`
				);
				const json = await res.json();
				dupCaptures = json?.data?.captures ?? [];
			} catch {
				dupCaptures = [];
			}
		}, 300);
	});

	const LOAN_CATEGORIES: { label: string; types: ProductType[] }[] = [
		{ label: 'Home Loan', types: ['HL_NEW', 'HL_BT', 'HL_TOPUP', 'HL_BT_TOPUP'] },
		{ label: 'Loan Against Property', types: ['LAP_NEW', 'LAP_BT'] },
		{ label: 'Plot & Construction', types: ['PLOT_CONST'] },
		{ label: 'Personal Loan', types: ['PL'] },
		{ label: 'Business Loan', types: ['BL_UNSECURED', 'BL_SECURED'] }
	];

	let creating = $state(false);
	let errorMsg = $state('');

	const stubValid = $derived(
		stubName.trim().length >= 2 &&
			stubBank.trim().length > 0 &&
			/^\d{10}$/.test(stubMobile.trim())
	);
	const rmChosen = $derived(rmMode === 'existing' ? !!selectedRmId : stubValid);
	const canSubmit = $derived(
		rmChosen && !!arrivalChannel && !!selectedLender && !!selectedProductType && !creating
	);

	async function handleCreate() {
		if (!canSubmit) return;
		creating = true;
		errorMsg = '';

		const rmRef =
			rmMode === 'existing'
				? { mode: 'existing', rmId: selectedRmId }
				: {
						mode: 'stub',
						name: stubName.trim(),
						bankName: stubBank.trim(),
						mobile: Number(stubMobile.trim()),
						email: stubEmail.trim() || undefined
					};

		try {
			const res = await secureFetch('/api/admin/policies/proxy-capture', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					rmRef,
					arrivalChannel,
					referenceNote: referenceNote.trim() || undefined,
					lender_id: selectedLender,
					product_type: selectedProductType,
					geo_state: selectedGeoState || undefined
				})
			});
			const result = await res.json();
			if (!result.success) {
				errorMsg = result.error || 'Failed to create capture';
				return;
			}
			const captureId = result.data?.captureId;
			goto(`/dashboard/admin/policies/proxy-capture/${captureId}`);
		} catch {
			errorMsg = 'Network error — please try again';
		} finally {
			creating = false;
		}
	}

	const inputClass =
		'mt-1 w-full rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-3 py-2.5 text-sm text-[var(--dash-text)] outline-none focus:border-[var(--dash-accent-text)] focus:ring-2 focus:ring-[var(--dash-accent-text)]/20';
	const labelClass = 'block text-sm font-medium text-[var(--dash-text-secondary)]';
</script>

<svelte:head>
	<title>Admin: Capture Policy on Behalf of RM | DigitalDSA</title>
</svelte:head>

<div class="mx-auto max-w-2xl space-y-6">
	<div>
		<a href="/dashboard/admin/policies" class="text-sm text-[var(--dash-text-muted)] hover:text-[var(--dash-text-secondary)]">
			Back to Policies
		</a>
		<h1 class="mt-2 text-2xl font-bold text-[var(--dash-text)]">Capture policy on behalf of an RM</h1>
		<p class="mt-1 text-sm text-[var(--dash-text-secondary)]">Step 0 of 11 · Who is this for?</p>
	</div>

	{#if errorMsg}
		<div class="rounded-lg bg-[var(--dash-contrast-ghost-bg)] p-4 text-sm text-[var(--dash-contrast-text)]">
			{errorMsg}
		</div>
	{/if}

	<div class="space-y-5 rounded-xl border border-[var(--dash-border)] bg-[var(--dash-bg-card)] p-6">
		<!-- RM mode -->
		<div class="flex gap-4">
			<label class="flex items-center gap-2 text-sm text-[var(--dash-text)]">
				<input type="radio" value="existing" bind:group={rmMode} /> Existing RM
			</label>
			<label class="flex items-center gap-2 text-sm text-[var(--dash-text)]">
				<input type="radio" value="stub" bind:group={rmMode} /> RM not on platform yet
			</label>
		</div>

		{#if rmMode === 'existing'}
			<div>
				<label for="rm-search" class={labelClass}>Search RM by name / bank / mobile *</label>
				<input id="rm-search" type="text" bind:value={rmQuery} oninput={onSearchInput} placeholder="e.g. SBI, or a mobile number" class={inputClass} autocomplete="off" />
				{#if searching}
					<p class="mt-1 text-xs text-[var(--dash-text-muted)]">Searching…</p>
				{/if}
				{#if rmResults.length > 0}
					<div class="mt-1 divide-y divide-[var(--dash-border-light)] rounded-lg border border-[var(--dash-border)]">
						{#each rmResults as r}
							<button type="button" onclick={() => pickRm(r)} class="block w-full px-3 py-2 text-left text-sm text-[var(--dash-text)] hover:bg-[var(--dash-hover)]">
								<span class="font-medium">{r.name}</span>
								<span class="text-[var(--dash-text-muted)]"> · {r.bankName} · ****{r.mobileLast4}</span>
							</button>
						{/each}
					</div>
				{:else if rmQuery.trim().length >= 2 && !searching}
					<p class="mt-1 text-xs text-[var(--dash-text-muted)]">No RMs match. Switch to "RM not on platform yet" to create a stub.</p>
				{/if}
				{#if selectedRmId}
					<p class="mt-1 text-xs text-[var(--dash-accent-text)]">Selected: {selectedRmLabel}</p>
				{/if}
			</div>
		{:else}
			<div class="space-y-3">
				<div>
					<label for="stub-name" class={labelClass}>Name *</label>
					<input id="stub-name" type="text" bind:value={stubName} class={inputClass} />
				</div>
				<div>
					<label for="stub-bank" class={labelClass}>Bank *</label>
					<input id="stub-bank" type="text" bind:value={stubBank} placeholder="e.g. State Bank of India" class={inputClass} />
				</div>
				<div>
					<label for="stub-mobile" class={labelClass}>Mobile * (10 digits)</label>
					<input id="stub-mobile" type="text" inputmode="numeric" bind:value={stubMobile} class={inputClass} />
				</div>
				<div>
					<label for="stub-email" class={labelClass}>Official email (optional)</label>
					<input id="stub-email" type="email" bind:value={stubEmail} class={inputClass} />
				</div>
			</div>
		{/if}

		<!-- Arrival channel -->
		<div>
			<label for="channel" class={labelClass}>How did this policy arrive? *</label>
			<select id="channel" bind:value={arrivalChannel} class={inputClass}>
				<option value="">Select…</option>
				{#each CHANNELS as c}
					<option value={c.value}>{c.label}</option>
				{/each}
			</select>
		</div>

		<!-- Reference note -->
		<div>
			<label for="ref-note" class={labelClass}>Reference note (optional)</label>
			<input id="ref-note" type="text" maxlength="280" bind:value={referenceNote} placeholder='e.g. "WhatsApp from Mr. Sharma, SBI Andheri, 18 May"' class={inputClass} />
		</div>

		<!-- Lender -->
		<div>
			<label for="lender" class={labelClass}>Bank / Lender *</label>
			<select id="lender" bind:value={selectedLender} class={inputClass}>
				<option value="">Select a lender…</option>
				{#each data.lenders as lender}
					<option value={lender.lender_id}>{lender.lender_name} ({lender.classification})</option>
				{/each}
			</select>
		</div>

		<!-- Product type -->
		<div>
			<span class={labelClass}>Product Type *</span>
			<div class="mt-3 space-y-4">
				{#each LOAN_CATEGORIES as category}
					<div>
						<p class="mb-2 text-xs font-semibold tracking-wider text-[var(--dash-text-muted)] uppercase">{category.label}</p>
						<div class="flex flex-wrap gap-2">
							{#each category.types as ptype}
								<button type="button" onclick={() => (selectedProductType = ptype)} class="rounded-lg px-3 py-2 text-sm font-medium transition-colors {selectedProductType === ptype ? 'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)] ring-1 ring-[var(--dash-btn-ghost-border)]' : 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)] hover:bg-[var(--dash-hover)]'}">
									{PRODUCT_TYPE_LABELS[ptype]}
								</button>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- Geo -->
		<div>
			<label for="geo" class={labelClass}>State (optional)</label>
			<select id="geo" bind:value={selectedGeoState} class={inputClass}>
				<option value="">PAN India / Not state-specific</option>
				{#each data.geoStates as state}
					<option value={state.geo_scope_id}>{state.label}</option>
				{/each}
			</select>
		</div>

		{#if dupCaptures.length > 0}
			<div class="rounded-lg bg-[var(--dash-contrast-ghost-bg)] p-4 text-sm text-[var(--dash-contrast-text)]">
				<p class="font-medium">
					{dupCaptures.length} existing capture{dupCaptures.length !== 1 ? 's' : ''} for this lender + product
				</p>
				<p class="mt-1 text-xs">You can still continue (e.g. a different geography or a deliberate re-capture).</p>
				<ul class="mt-2 space-y-1">
					{#each dupCaptures as dup}
						<li class="text-xs">
							<a href="/dashboard/admin/policies/captures/{dup.capture_id}" class="underline">
								{dup.rm_name}
							</a>
							· {dup.status.replace(/_/g, ' ')}
						</li>
					{/each}
				</ul>
			</div>
		{/if}

		<div class="flex items-center justify-between border-t border-[var(--dash-border-light)] pt-4">
			<p class="text-xs text-[var(--dash-text-muted)]">The wizard opens next; you can save progress and continue later.</p>
			<button onclick={handleCreate} disabled={!canSubmit} title={canSubmit ? '' : 'Choose an RM, source, lender, and product'} class="rounded-lg bg-[var(--dash-btn-bg)] px-6 py-2.5 text-sm font-medium text-[var(--dash-btn-text)] transition-colors hover:brightness-105 disabled:opacity-50">
				{creating ? 'Creating…' : 'Next →'}
			</button>
		</div>
	</div>
</div>
