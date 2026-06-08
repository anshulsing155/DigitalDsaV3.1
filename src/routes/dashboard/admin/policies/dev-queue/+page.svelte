<script lang="ts">
	import { ArrowLeft, Inbox, Building2, Search, ExternalLink, Filter } from 'lucide-svelte';
	import type { DevQueueEntry } from './+page.server.js';

	let { data } = $props();

	let searchQuery = $state('');
	let filterLender = $state('');
	let filterProduct = $state('');
	let expandedId = $state<string | null>(null);

	const products = $derived([
		...new Set(data.entries.map((e: DevQueueEntry) => e.loanProduct))
	].sort());

	const filtered = $derived(
		data.entries.filter((e: DevQueueEntry) => {
			if (filterLender && e.lenderId !== filterLender) return false;
			if (filterProduct && e.loanProduct !== filterProduct) return false;
			if (searchQuery) {
				const q = searchQuery.toLowerCase();
				if (!e.text.toLowerCase().includes(q) && !e.lenderName.toLowerCase().includes(q)) return false;
			}
			return true;
		})
	);

	// Group by clause text to count how many lenders have the same unencoded clause
	const clauseFrequency = $derived(
		filtered.reduce<Record<string, number>>((acc, e: DevQueueEntry) => {
			acc[e.text] = (acc[e.text] ?? 0) + 1;
			return acc;
		}, {})
	);

	function statusBadge(status: string): string {
		switch (status) {
			case 'published': return 'bg-green-100 text-green-700';
			case 'submitted': return 'bg-amber-100 text-amber-700';
			case 'approved': return 'bg-blue-100 text-blue-700';
			case 'draft': return 'bg-gray-100 text-gray-600';
			default: return 'bg-gray-100 text-gray-600';
		}
	}

	function formatDate(iso: string): string {
		return new Date(iso).toLocaleDateString('en-IN', {
			day: 'numeric', month: 'short', year: 'numeric'
		});
	}
</script>

<svelte:head>
	<title>Dev Queue — Admin | DigitalDSA</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 p-6">
	<!-- Header -->
	<div class="mb-6">
		<a href="/dashboard/admin/policies/pms" class="mb-3 inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700">
			<ArrowLeft size={12} /> Back to PMS policies
		</a>
		<div class="flex items-start justify-between">
			<div>
				<h1 class="text-xl font-semibold text-gray-900">Dev Queue</h1>
				<p class="mt-0.5 text-sm text-gray-500">
					{data.entries.length} unencoded clause{data.entries.length !== 1 ? 's' : ''} across {data.totalPolicies} polic{data.totalPolicies !== 1 ? 'ies' : 'y'} — these need new rule keys before they can be encoded.
				</p>
			</div>
		</div>
	</div>

	<!-- Filters -->
	<div class="mb-4 rounded-xl border border-gray-200 bg-white p-4">
		<div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
			<div class="relative">
				<Search size={13} class="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" />
				<input
					type="text"
					placeholder="Search clauses…"
					bind:value={searchQuery}
					class="w-full rounded-lg border border-gray-200 py-2 pr-3 pl-8 text-sm focus:border-amber-400 focus:ring-1 focus:ring-amber-400 focus:outline-none"
				/>
			</div>
			<select
				bind:value={filterLender}
				class="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-amber-400 focus:ring-1 focus:ring-amber-400 focus:outline-none"
			>
				<option value="">All lenders</option>
				{#each data.lenders as lender}
					<option value={lender.lenderId}>{lender.lenderName}</option>
				{/each}
			</select>
			<select
				bind:value={filterProduct}
				class="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-amber-400 focus:ring-1 focus:ring-amber-400 focus:outline-none"
			>
				<option value="">All products</option>
				{#each products as product}
					<option value={product}>{product}</option>
				{/each}
			</select>
		</div>
	</div>

	<!-- Table -->
	{#if filtered.length === 0}
		<div class="rounded-xl border border-dashed border-gray-200 bg-white py-20 text-center">
			<Inbox size={28} class="mx-auto mb-2 text-gray-300" />
			<p class="text-sm font-medium text-gray-500">
				{data.entries.length === 0 ? 'Dev queue is empty' : 'No clauses match your filters'}
			</p>
			{#if data.entries.length === 0}
				<p class="mt-1 text-xs text-gray-400">
					Bank card notes from submitted policies will appear here.
				</p>
			{/if}
		</div>
	{:else}
		<div class="overflow-hidden rounded-xl border border-gray-200 bg-white">
			<table class="w-full text-sm">
				<thead>
					<tr class="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
						<th class="px-4 py-3">Clause text</th>
						<th class="px-4 py-3">Lender · Product</th>
						<th class="px-4 py-3">Policy</th>
						<th class="px-4 py-3">Added</th>
						<th class="px-4 py-3"></th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-50">
					{#each filtered as entry (entry.id)}
						<tr
							class="cursor-pointer hover:bg-gray-50/60"
							onclick={() => (expandedId = expandedId === entry.id ? null : entry.id)}
						>
							<!-- Clause text -->
							<td class="px-4 py-3 max-w-xs">
								<p class="line-clamp-2 text-gray-800">{entry.text}</p>
								{#if clauseFrequency[entry.text] > 1}
									<span class="mt-1 inline-flex items-center gap-1 rounded-full bg-purple-100 px-1.5 py-0.5 text-[10px] font-semibold text-purple-700">
										<Filter size={9} />
										{clauseFrequency[entry.text]}× lenders
									</span>
								{/if}
							</td>

							<!-- Lender + product -->
							<td class="px-4 py-3">
								<div class="flex items-center gap-1 text-gray-700">
									<Building2 size={12} class="shrink-0 text-gray-400" />
									<span class="font-medium">{entry.lenderName}</span>
								</div>
								<p class="mt-0.5 text-xs text-gray-400">{entry.loanProduct}</p>
							</td>

							<!-- Policy status + version -->
							<td class="px-4 py-3">
								<span class="inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold {statusBadge(entry.policyStatus)}">
									{entry.policyStatus}
								</span>
								<p class="mt-0.5 text-xs text-gray-400">v{entry.policyVersion}</p>
							</td>

							<!-- Date -->
							<td class="px-4 py-3 text-xs text-gray-500">
								{formatDate(entry.addedAt)}
							</td>

							<!-- Actions -->
							<td class="px-4 py-3 text-right">
								<a
									href="/dashboard/admin/policies/pms/{entry.policyId}"
									onclick={(e) => e.stopPropagation()}
									class="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50"
								>
									<ExternalLink size={11} />
									Open policy
								</a>
							</td>
						</tr>

						<!-- Expanded detail -->
						{#if expandedId === entry.id}
							<tr class="bg-amber-50/30">
								<td colspan="5" class="px-4 py-3">
									<div class="space-y-2">
										<p class="text-xs font-semibold text-gray-600">Full clause text:</p>
										<p class="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800">{entry.text}</p>
										<p class="text-xs text-gray-500">
											Added by <span class="font-medium text-gray-700">{entry.addedBy}</span> on {formatDate(entry.addedAt)}.
											This clause was routed to the bank card because no matching rule key exists — a new field must be added to the PMS schema before this can be encoded.
										</p>
									</div>
								</td>
							</tr>
						{/if}
					{/each}
				</tbody>
			</table>
			<div class="border-t border-gray-100 px-4 py-2.5 text-xs text-gray-400">
				Showing {filtered.length} of {data.entries.length} clauses
			</div>
		</div>
	{/if}
</div>
