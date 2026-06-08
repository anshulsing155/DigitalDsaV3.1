<script lang="ts">
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import { secureFetch } from '$lib/utils/csrf';

	let { data } = $props();

	let viewMode = $state<'grid' | 'list' | 'tree'>('tree');
	let expandedLenders = $state<Set<string>>(new Set());
	let expandedProducts = $state<Set<string>>(new Set());
	let treeSearch = $state('');
	let seeding = $state(false);
	let seedResult = $state('');

	// URL-based status filter (supports clickable pipeline counts from admin home)
	let statusFilter = $derived(new URL($page.url).searchParams.get('status') || '');

	// Auto-switch to "All Artifacts" tab when status filter is set
	$effect(() => {
		if (statusFilter) {
			viewMode = 'list';
		}
	});

	const statusColors: Record<string, string> = {
		draft: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-muted)]',
		parsing: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text)]',
		in_review: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]',
		rm_pending: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]',
		approved: 'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)]',
		active: 'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)]',
		superseded: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-muted)]'
	};

	const classColors: Record<string, string> = {
		PVT: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text)]',
		GOV: 'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)]',
		NBFC: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]',
		HFC: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]',
		SFB: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]'
	};

	function formatDate(dateStr: string | null): string {
		if (!dateStr) return '-';
		return new Date(dateStr).toLocaleDateString('en-IN', {
			day: '2-digit',
			month: 'short',
			year: 'numeric'
		});
	}

	function toggleLender(lenderId: string) {
		const next = new Set(expandedLenders);
		if (next.has(lenderId)) next.delete(lenderId);
		else next.add(lenderId);
		expandedLenders = next;
	}

	function toggleProduct(productId: string) {
		const next = new Set(expandedProducts);
		if (next.has(productId)) next.delete(productId);
		else next.add(productId);
		expandedProducts = next;
	}

	let filteredTree = $derived(
		treeSearch.trim()
			? data.policyTree.filter(
					(l) =>
						l.lender_name.toLowerCase().includes(treeSearch.toLowerCase()) ||
						l.products.some(
							(p) =>
								p.product_label.toLowerCase().includes(treeSearch.toLowerCase()) ||
								p.variations.some((v) => v.label.toLowerCase().includes(treeSearch.toLowerCase()))
						)
				)
			: data.policyTree
	);

	// Filtered artifacts (when status filter is active from URL)
	let filteredArtifacts = $derived(
		statusFilter ? data.allArtifacts.filter((a) => a.status === statusFilter) : data.allArtifacts
	);

	async function seedTestData() {
		seeding = true;
		seedResult = '';
		try {
			const res = await secureFetch('/api/admin/policies/seed', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' }
			});
			const result = await res.json();
			if (result.success) {
				const d = result.data;
				seedResult = `Seeded: ${d.fixtures_inserted ?? 0} fixtures, ${(d.sample_rules_inserted ?? 0) + (d.real_bank_rules_inserted ?? 0)} rules, ${d.lender_entries_inserted ?? 0} lenders, ${d.compiled_lenders_inserted ?? 0} compiled artifacts`;
				setTimeout(() => {
					if (browser) window.location.reload();
				}, 1500);
			} else {
				seedResult = result.error || 'Seed failed';
			}
		} catch {
			seedResult = 'Network error';
		} finally {
			seeding = false;
		}
	}
</script>

<svelte:head>
	<title>Admin: Policies | DigitalDSA</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header with dynamic stats -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold text-[var(--dash-text)]">Policy Management</h1>
			<p class="mt-1 text-sm text-[var(--dash-text-secondary)]">
				{#if data.artifactStats.total > 0}
					{data.artifactStats.active} active lender{data.artifactStats.active !== 1 ? 's' : ''} &middot;
					{data.artifactStats.total} artifact{data.artifactStats.total !== 1 ? 's' : ''}
					{#if data.artifactStats.pending_review > 0}
						&middot; <span class="font-medium text-[var(--dash-text-secondary)]"
							>{data.artifactStats.pending_review} pending review</span
						>
					{/if}
				{:else}
					Manage lender policies, products, variations, and geographic overrides
				{/if}
			</p>
		</div>
		<div class="flex items-center gap-3">
			{#if data.artifactStats.total === 0}
				<button
					onclick={seedTestData}
					disabled={seeding}
					class="rounded-lg border border-[var(--ddsa-accent-500)] bg-[var(--ddsa-accent-500)]/10 px-4 py-2.5 text-sm font-medium text-[var(--ddsa-accent-600)] transition-colors hover:bg-[var(--ddsa-accent-500)]/20 disabled:opacity-50 dark:text-[var(--ddsa-accent-400)]"
				>
					{seeding ? 'Seeding...' : 'Seed Test Data'}
				</button>
			{/if}
			<a
				href="/dashboard/admin/policies/proxy-capture/new"
				class="rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-4 py-2.5 text-sm font-medium text-[var(--dash-text)] transition-colors hover:bg-[var(--dash-hover)]"
			>
				Capture on behalf of RM
			</a>
			<a
				href="/dashboard/admin/policies/upload"
				class="rounded-lg bg-gradient-to-r from-[var(--ddsa-primary-400)] via-[var(--ddsa-accent-500)] to-[var(--ddsa-primary-400)] px-4 py-2.5 text-sm font-medium text-white transition-all hover:brightness-110"
			>
				Upload New Policy
			</a>
		</div>
	</div>

	{#if seedResult}
		<p
			class="text-xs font-medium {seedResult.includes('error') || seedResult.includes('failed')
				? 'text-[var(--dash-contrast-text)]'
				: 'text-[var(--dash-accent-text)]'}"
		>
			{seedResult}
		</p>
	{/if}

	<!-- View Toggle -->
	<div class="flex items-center gap-2">
		<button
			onclick={() => (viewMode = 'tree')}
			class="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors
				{viewMode === 'tree'
				? 'bg-[var(--ddsa-accent-500)]/15 text-[var(--ddsa-accent-600)] dark:text-[var(--ddsa-accent-400)]'
				: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)] hover:bg-[var(--dash-hover)]'}"
		>
			Policy Engine
		</button>
		<button
			onclick={() => (viewMode = 'grid')}
			class="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors
				{viewMode === 'grid'
				? 'bg-[var(--ddsa-accent-500)]/15 text-[var(--ddsa-accent-600)] dark:text-[var(--ddsa-accent-400)]'
				: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)] hover:bg-[var(--dash-hover)]'}"
		>
			Legacy Artifacts
		</button>
		<button
			onclick={() => (viewMode = 'list')}
			class="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors
				{viewMode === 'list'
				? 'bg-[var(--ddsa-accent-500)]/15 text-[var(--ddsa-accent-600)] dark:text-[var(--ddsa-accent-400)]'
				: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)] hover:bg-[var(--dash-hover)]'}"
		>
			All Artifacts
			{#if statusFilter}
				<span
					class="ml-1 rounded-full bg-[var(--ddsa-accent-500)] px-1.5 py-0.5 text-[12px] font-bold text-white"
					>{statusFilter}</span
				>
			{/if}
		</button>

		{#if statusFilter}
			<a
				href="/dashboard/admin/policies"
				class="ml-2 rounded-lg border border-[var(--dash-border)] px-2 py-1 text-xs font-medium text-[var(--dash-text-secondary)] transition-colors hover:bg-[var(--dash-hover)]"
			>
				Clear filter
			</a>
		{/if}
	</div>

	{#if viewMode === 'tree'}
		<!-- Lender Coverage (C.6) — canonical, unambiguous counts. The
		     customer/investor-facing number is "with published policy". The
		     other three are operational diagnostics with clear definitions. -->
		<div class="grid grid-cols-2 gap-3 md:grid-cols-4">
			<div
				class="rounded-xl bg-[var(--dash-bg-card)] p-4 shadow-sm ring-1 ring-[var(--dash-border-light)]"
				title="Total entries in the Lenders master list (all statuses)"
			>
				<p class="text-xs font-medium text-[var(--dash-text-muted)]">Lender Records</p>
				<p class="mt-1 text-2xl font-bold text-[var(--dash-text)]">
					{data.lenderCoverage.lenderRecords}
				</p>
			</div>
			<div
				class="rounded-xl bg-[var(--dash-bg-card)] p-4 shadow-sm ring-1 ring-[var(--dash-border-light)]"
				title="Lenders with status = active"
			>
				<p class="text-xs font-medium text-[var(--dash-text-muted)]">Active Lenders</p>
				<p class="mt-1 text-2xl font-bold text-[var(--dash-text)]">
					{data.lenderCoverage.activeLenders}
				</p>
			</div>
			<div
				class="rounded-xl bg-[var(--dash-bg-card)] p-4 shadow-sm ring-1 ring-[var(--dash-border-light)]"
				title="Lenders where at least one RM has an active assignment"
			>
				<p class="text-xs font-medium text-[var(--dash-text-muted)]">Lenders with RM</p>
				<p class="mt-1 text-2xl font-bold text-[var(--dash-text)]">
					{data.lenderCoverage.lendersWithAssignedRm}
				</p>
			</div>
			<div
				class="rounded-xl bg-[var(--dash-bg-card)] p-4 shadow-sm ring-1 ring-[var(--dash-border-light)]"
				title="Customer/investor-facing coverage: lenders with at least one published PMS policy"
			>
				<p class="text-xs font-medium text-[var(--dash-text-muted)]">Policy Coverage</p>
				<p class="mt-1 text-2xl font-bold text-[var(--dash-text)]">
					{data.lenderCoverage.lendersWithPublishedPolicy}
				</p>
			</div>
		</div>

		<!-- Policy Engine Stats — counts inside the tree (Policy Engine schema). -->
		<div class="grid grid-cols-2 gap-3 md:grid-cols-4">
			<div
				class="rounded-xl bg-[var(--dash-bg-card)] p-4 shadow-sm ring-1 ring-[var(--dash-border-light)]"
				title="Active lenders that have at least one Policy Engine product seeded"
			>
				<p class="text-xs font-medium text-[var(--dash-text-muted)]">Lenders in tree</p>
				<p class="mt-1 text-2xl font-bold text-[var(--dash-text)]">
					{data.policyStats.totalLenders}
				</p>
			</div>
			<div
				class="rounded-xl bg-[var(--dash-bg-card)] p-4 shadow-sm ring-1 ring-[var(--dash-border-light)]"
			>
				<p class="text-xs font-medium text-[var(--dash-text-muted)]">Products</p>
				<p class="mt-1 text-2xl font-bold text-[var(--dash-text)]">
					{data.policyStats.totalProducts}
				</p>
			</div>
			<div
				class="rounded-xl bg-[var(--dash-bg-card)] p-4 shadow-sm ring-1 ring-[var(--dash-border-light)]"
			>
				<p class="text-xs font-medium text-[var(--dash-text-muted)]">Variations</p>
				<p class="mt-1 text-2xl font-bold text-[var(--dash-text)]">
					{data.policyStats.totalVariations}
				</p>
			</div>
			<div
				class="rounded-xl bg-[var(--dash-bg-card)] p-4 shadow-sm ring-1 ring-[var(--dash-border-light)]"
			>
				<p class="text-xs font-medium text-[var(--dash-text-muted)]">Active Rules</p>
				<p class="mt-1 text-2xl font-bold text-[var(--dash-text)]">{data.policyStats.totalRules}</p>
			</div>
		</div>

		<!-- Search -->
		<div>
			<input
				type="text"
				bind:value={treeSearch}
				placeholder="Search lenders, products, variations..."
				class="w-full rounded-lg border border-[var(--dash-border-light)] bg-[var(--dash-bg)] px-4 py-2.5 text-sm text-[var(--dash-text)] placeholder-[var(--dash-text-muted)] transition-colors outline-none focus:border-[var(--ddsa-accent-500)] focus:ring-2 focus:ring-[var(--ddsa-accent-500)]/20 md:w-80"
			/>
		</div>

		<!-- Policy Tree Browser -->
		{#if filteredTree.length === 0}
			<div
				class="rounded-xl bg-[var(--dash-bg-card)] p-10 text-center shadow-sm ring-1 ring-[var(--dash-border-light)]"
			>
				{#if treeSearch.trim()}
					<p class="text-[var(--dash-text-muted)]">No results for "{treeSearch}"</p>
				{:else}
					<div class="flex flex-col items-center">
						<div
							class="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--dash-btn-ghost-bg)] text-xl"
						>
							🏦
						</div>
						<p class="text-sm font-medium text-[var(--dash-text-secondary)]">
							No lenders configured yet
						</p>
						<p class="mt-1 text-xs text-[var(--dash-text-muted)]">
							Seed test data to populate lenders with realistic rules and configurations.
						</p>
						<button
							onclick={seedTestData}
							disabled={seeding}
							class="mt-3 rounded-lg bg-gradient-to-r from-[var(--ddsa-primary-400)] via-[var(--ddsa-accent-500)] to-[var(--ddsa-primary-400)] px-5 py-2 text-sm font-medium text-white transition-all hover:brightness-110 disabled:opacity-50"
						>
							{seeding ? 'Seeding...' : 'Seed Test Data'}
						</button>
					</div>
				{/if}
			</div>
		{:else}
			<div class="space-y-2">
				{#each filteredTree as lender}
					<!-- Lender Accordion -->
					<div
						class="rounded-xl bg-[var(--dash-bg-card)] shadow-sm ring-1 ring-[var(--dash-border-light)]"
					>
						<button
							onclick={() => toggleLender(lender.lender_id)}
							class="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-[var(--dash-hover)]"
						>
							<div class="flex items-center gap-3">
								<svg
									class="h-4 w-4 text-[var(--dash-text-muted)] transition-transform {expandedLenders.has(
										lender.lender_id
									)
										? 'rotate-90'
										: ''}"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
									stroke-width="2"
								>
									<path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
								</svg>
								<span class="font-semibold text-[var(--dash-text)]">{lender.lender_name}</span>
								<span
									class="inline-flex rounded-full px-2 py-0.5 text-[12px] font-medium {classColors[
										lender.classification
									] || 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]'}"
								>
									{lender.classification}
								</span>
							</div>
							<span class="text-xs text-[var(--dash-text-muted)]">
								{lender.products.length} product{lender.products.length !== 1 ? 's' : ''}
							</span>
						</button>

						{#if expandedLenders.has(lender.lender_id)}
							<div class="border-t border-[var(--dash-border-light)] px-5 pb-4">
								{#if lender.products.length === 0}
									<p class="py-3 text-sm text-[var(--dash-text-muted)]">No products configured</p>
								{:else}
									{#each lender.products as product}
										<!-- Product Accordion -->
										<div class="mt-2 rounded-lg ring-1 ring-[var(--dash-border-light)]">
											<button
												onclick={() => toggleProduct(product.product_id)}
												class="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-[var(--dash-hover)]"
											>
												<div class="flex items-center gap-2">
													<svg
														class="h-3.5 w-3.5 text-[var(--dash-text-muted)] transition-transform {expandedProducts.has(
															product.product_id
														)
															? 'rotate-90'
															: ''}"
														fill="none"
														viewBox="0 0 24 24"
														stroke="currentColor"
														stroke-width="2"
													>
														<path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
													</svg>
													<span class="text-sm font-medium text-[var(--dash-text)]"
														>{product.product_label}</span
													>
													<span
														class="rounded bg-[var(--dash-bg-alt)] px-1.5 py-0.5 font-mono text-[12px] text-[var(--dash-text-muted)]"
														>{product.product_type}</span
													>
												</div>
												<span class="text-xs text-[var(--dash-text-muted)]">
													{product.variations.length} variation{product.variations.length !== 1
														? 's'
														: ''}
												</span>
											</button>

											{#if expandedProducts.has(product.product_id)}
												<div class="border-t border-[var(--dash-border-light)] px-4 pb-3">
													{#if product.variations.length === 0}
														<p class="py-2 text-xs text-[var(--dash-text-muted)]">
															No variations configured
														</p>
													{:else}
														<div class="mt-2 space-y-1.5">
															{#each product.variations as variation}
																<div
																	class="flex items-center justify-between rounded-lg bg-[var(--dash-bg-alt)] px-3 py-2.5"
																>
																	<div class="flex items-center gap-2">
																		<span class="text-sm text-[var(--dash-text)]"
																			>{variation.label}</span
																		>
																		<span
																			class="rounded bg-[var(--dash-bg-card)] px-1.5 py-0.5 text-[12px] text-[var(--dash-text-muted)] ring-1 ring-[var(--dash-border-light)]"
																		>
																			{variation.category}
																		</span>
																	</div>
																	<div class="flex items-center gap-3">
																		<span class="text-xs text-[var(--dash-text-muted)]">
																			{variation.rules_count} rule{variation.rules_count !== 1
																				? 's'
																				: ''}
																		</span>
																		{#if variation.has_active_version}
																			<span
																				class="inline-flex h-2 w-2 rounded-full bg-green-400"
																				role="img"
																				aria-label="Has active version"
																				title="Has active version"
																			></span>
																		{:else}
																			<span
																				class="inline-flex h-2 w-2 rounded-full bg-[var(--dash-text-muted)]"
																				role="img"
																				aria-label="No active version"
																				title="No active version"
																			></span>
																		{/if}
																	</div>
																</div>
															{/each}
														</div>
													{/if}
												</div>
											{/if}
										</div>
									{/each}
								{/if}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	{:else if viewMode === 'grid'}
		<!-- Lender Grid View (Legacy Artifacts) -->
		{#if data.lenderGroups.length === 0}
			<div
				class="rounded-xl bg-[var(--dash-bg-card)] p-10 text-center shadow-sm ring-1 ring-[var(--dash-border-light)]"
			>
				<div class="flex flex-col items-center">
					<div
						class="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--dash-btn-ghost-bg)] text-xl"
					>
						📋
					</div>
					<p class="text-sm font-medium text-[var(--dash-text-secondary)]">
						No rule artifacts found
					</p>
					<p class="mt-1 text-xs text-[var(--dash-text-muted)]">
						Upload policy documents or seed test data to get started.
					</p>
					<div class="mt-3 flex gap-3">
						<button
							onclick={seedTestData}
							disabled={seeding}
							class="rounded-lg border border-[var(--ddsa-accent-500)] bg-[var(--ddsa-accent-500)]/10 px-4 py-2 text-sm font-medium text-[var(--ddsa-accent-600)] transition-colors hover:bg-[var(--ddsa-accent-500)]/20 disabled:opacity-50 dark:text-[var(--ddsa-accent-400)]"
						>
							{seeding ? 'Seeding...' : 'Seed Test Data'}
						</button>
						<a
							href="/dashboard/admin/policies/upload"
							class="rounded-lg bg-gradient-to-r from-[var(--ddsa-primary-400)] via-[var(--ddsa-accent-500)] to-[var(--ddsa-primary-400)] px-4 py-2 text-sm font-medium text-white transition-all hover:brightness-110"
						>
							Upload Policy
						</a>
					</div>
				</div>
			</div>
		{:else}
			<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				{#each data.lenderGroups as lender}
					<div
						class="rounded-xl bg-[var(--dash-bg-card)] p-5 shadow-sm ring-1 ring-[var(--dash-border-light)] transition-shadow hover:shadow-md"
					>
						<div class="flex items-start justify-between">
							<div>
								<h3 class="font-semibold text-[var(--dash-text)]">{lender.lender_name}</h3>
								<div class="mt-1.5 flex items-center gap-2">
									<span
										class="inline-flex rounded-full px-2 py-0.5 text-[12px] font-medium {classColors[
											lender.classification
										] || 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]'}"
									>
										{lender.classification}
									</span>
									<span class="text-xs text-[var(--dash-text-muted)]">v{lender.latest_version}</span
									>
								</div>
							</div>
							<span
								class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium {statusColors[
									lender.latest_status
								] ||
									'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]'} {lender.latest_status ===
								'parsing'
									? 'animate-pulse'
									: ''}"
							>
								{#if lender.latest_status === 'parsing'}
									<span class="relative flex h-2 w-2" aria-hidden="true">
										<span
											class="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--dash-accent-text)] opacity-75"
										></span>
										<span
											class="relative inline-flex h-2 w-2 rounded-full bg-[var(--dash-accent-text)]"
										></span>
									</span>
								{/if}
								{lender.latest_status}
							</span>
						</div>

						{#if lender.loan_types.length > 0}
							<div class="mt-3 flex flex-wrap gap-1">
								{#each lender.loan_types as lt}
									<span
										class="rounded bg-[var(--dash-bg-alt)] px-1.5 py-0.5 text-[12px] text-[var(--dash-text-muted)]"
										>{lt}</span
									>
								{/each}
							</div>
						{/if}

						<div
							class="mt-4 flex items-center justify-between border-t border-[var(--dash-border-light)] pt-3"
						>
							<span class="text-xs text-[var(--dash-text-muted)]">
								{lender.total_versions} version{lender.total_versions !== 1 ? 's' : ''} | Updated {formatDate(
									lender.updated_at
								)}
							</span>
							<div class="flex items-center gap-2">
								{#if lender.latest_status === 'active'}
									<a
										href="/dashboard/admin/policies/{lender.latest_mongo_id}/test"
										class="rounded-lg border border-[var(--dash-btn-ghost-border)] px-2.5 py-1 text-xs font-medium text-[var(--dash-accent-text)] transition-colors hover:bg-[var(--dash-btn-ghost-bg)]"
									>
										Test
									</a>
								{/if}
								<a
									href="/dashboard/admin/policies/{lender.latest_mongo_id}"
									class="rounded-lg bg-[var(--dash-btn-ghost-bg)] px-3 py-1 text-xs font-medium text-[var(--ddsa-accent-600)] transition-colors hover:bg-[var(--ddsa-primary-200)]"
								>
									View
								</a>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	{:else}
		<!-- All Artifacts List View -->
		<div
			class="rounded-xl bg-[var(--dash-bg-card)] shadow-sm ring-1 ring-[var(--dash-border-light)]"
		>
			{#if statusFilter}
				<div class="border-b border-[var(--dash-border-light)] px-6 py-3">
					<p class="text-sm text-[var(--dash-text-secondary)]">
						Showing <span class="font-semibold text-[var(--dash-text)]"
							>{filteredArtifacts.length}</span
						>
						artifacts with status
						<span
							class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium {statusColors[
								statusFilter
							] || 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]'}"
							>{statusFilter}</span
						>
					</p>
				</div>
			{/if}

			{#if filteredArtifacts.length === 0}
				<div class="flex flex-col items-center px-6 py-10 text-center">
					{#if statusFilter}
						<p class="text-sm text-[var(--dash-text-muted)]">
							No artifacts with status "{statusFilter}"
						</p>
						<a
							href="/dashboard/admin/policies"
							class="mt-2 text-sm font-medium text-[var(--ddsa-accent-500)] hover:underline"
						>
							Clear filter
						</a>
					{:else}
						<div
							class="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--dash-btn-ghost-bg)] text-xl"
						>
							📄
						</div>
						<p class="text-sm font-medium text-[var(--dash-text-secondary)]">No artifacts yet</p>
						<p class="mt-1 text-xs text-[var(--dash-text-muted)]">
							Upload policy documents or seed test data to populate artifacts.
						</p>
						<button
							onclick={seedTestData}
							disabled={seeding}
							class="mt-3 rounded-lg bg-gradient-to-r from-[var(--ddsa-primary-400)] via-[var(--ddsa-accent-500)] to-[var(--ddsa-primary-400)] px-5 py-2 text-sm font-medium text-white transition-all hover:brightness-110 disabled:opacity-50"
						>
							{seeding ? 'Seeding...' : 'Seed Test Data'}
						</button>
					{/if}
				</div>
			{:else}
				<div class="overflow-x-auto">
					<table class="w-full text-sm">
						<thead>
							<tr class="border-b border-[var(--dash-border-light)] bg-[var(--dash-bg-alt)]">
								<th class="px-6 py-3 text-left font-medium text-[var(--dash-text-secondary)]"
									>Artifact</th
								>
								<th class="px-6 py-3 text-left font-medium text-[var(--dash-text-secondary)]"
									>Lender</th
								>
								<th class="px-6 py-3 text-center font-medium text-[var(--dash-text-secondary)]"
									>Version</th
								>
								<th class="px-6 py-3 text-center font-medium text-[var(--dash-text-secondary)]"
									>Status</th
								>
								<th class="px-6 py-3 text-left font-medium text-[var(--dash-text-secondary)]"
									>Created</th
								>
								<th class="px-6 py-3 text-left font-medium text-[var(--dash-text-secondary)]"
									>Parsed By</th
								>
								<th class="px-6 py-3 text-center font-medium text-[var(--dash-text-secondary)]"
									>Action</th
								>
							</tr>
						</thead>
						<tbody>
							{#each filteredArtifacts as artifact}
								<tr
									class="border-b border-[var(--dash-border-light)] transition-colors hover:bg-[var(--dash-hover)]"
								>
									<td class="px-6 py-3 font-medium text-[var(--dash-text)]"
										>{artifact.artifact_id}</td
									>
									<td class="px-6 py-3 text-[var(--dash-text-secondary)]">{artifact.lender_name}</td
									>
									<td class="px-6 py-3 text-center text-[var(--dash-text-secondary)]"
										>v{artifact.version}</td
									>
									<td class="px-6 py-3 text-center">
										<span
											class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium {statusColors[
												artifact.status
											] ||
												'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]'} {artifact.status ===
											'parsing'
												? 'animate-pulse'
												: ''}"
										>
											{#if artifact.status === 'parsing'}
												<span class="relative flex h-2 w-2" aria-hidden="true">
													<span
														class="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--dash-accent-text)] opacity-75"
													></span>
													<span
														class="relative inline-flex h-2 w-2 rounded-full bg-[var(--dash-accent-text)]"
													></span>
												</span>
											{/if}
											{artifact.status}
										</span>
									</td>
									<td class="px-6 py-3 text-[var(--dash-text-muted)]"
										>{formatDate(artifact.created_at)}</td
									>
									<td class="px-6 py-3 text-[var(--dash-text-muted)]"
										>{artifact.parsed_by || '-'}</td
									>
									<td class="px-6 py-3 text-center">
										<div class="flex items-center justify-center gap-2">
											<a
												href="/dashboard/admin/policies/{artifact._id}"
												class="text-sm font-medium text-[var(--ddsa-accent-500)] hover:text-[var(--ddsa-accent-600)]"
											>
												View
											</a>
											{#if artifact.status === 'active'}
												<a
													href="/dashboard/admin/policies/{artifact._id}/test"
													class="rounded-lg border border-[var(--dash-btn-ghost-border)] px-2 py-0.5 text-[13px] font-medium text-[var(--dash-accent-text)] transition-colors hover:bg-[var(--dash-btn-ghost-bg)]"
												>
													Test
												</a>
											{/if}
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>
	{/if}
</div>
