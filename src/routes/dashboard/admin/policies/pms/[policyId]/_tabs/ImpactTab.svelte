<script lang="ts">
	import { secureFetch } from '$lib/utils/csrf.js';
	import {
		Play,
		CheckCircle2,
		AlertTriangle,
		TrendingDown,
		TrendingUp,
		Minus,
		RefreshCw,
		Info
	} from 'lucide-svelte';
	import type { QaProfileSummary } from '$lib/config/pms/policyTypes.js';

	interface QaRunSummary {
		ranAt: string;
		totalProfiles: number;
		testedProfiles: number;
		changedProfiles: number;
		flippedEligibility: number;
		hadBaseline: boolean;
		results: QaProfileSummary[];
	}

	let {
		policyId,
		initialQaRun
	}: {
		policyId: string;
		initialQaRun: QaRunSummary | null;
	} = $props();

	// Local state seeded once from the initial prop, then mutated locally by
	// runQa(). The component is re-mounted on navigation so prop changes don't
	// need to flow through.
	// svelte-ignore state_referenced_locally
	let qaRun = $state<QaRunSummary | null>(initialQaRun);
	let running = $state(false);
	let runError = $state('');
	let expandedProfileId = $state<string | null>(null);

	// Show only changed profiles by default; toggle to show all
	let showAll = $state(false);

	const displayedResults = $derived(
		qaRun ? (showAll ? qaRun.results : qaRun.results.filter((r) => r.changed)) : []
	);

	async function runQa() {
		running = true;
		runError = '';
		try {
			const res = await secureFetch(`/api/pms/policies/${policyId}/qa-run`, { method: 'POST' });
			const json = await res.json();
			if (!res.ok) {
				runError = json.message || 'QA run failed';
				return;
			}
			qaRun = json.data;
		} catch {
			runError = 'Network error — please try again.';
		} finally {
			running = false;
		}
	}

	function trafficLightClass(tl: string): string {
		switch (tl) {
			case 'green':
				return 'text-green-600 bg-green-50';
			case 'amber':
				return 'text-amber-600 bg-amber-50';
			case 'red':
				return 'text-red-600 bg-red-50';
			default:
				return 'text-gray-500 bg-gray-50';
		}
	}

	function trafficLightDot(tl: string): string {
		switch (tl) {
			case 'green':
				return 'bg-green-500';
			case 'amber':
				return 'bg-amber-400';
			case 'red':
				return 'bg-red-500';
			default:
				return 'bg-gray-300';
		}
	}

	function isFlip(result: QaProfileSummary): boolean {
		if (!result.before) return false;
		const beforePass =
			result.before.trafficLight === 'green' || result.before.trafficLight === 'amber';
		const afterPass =
			result.after.trafficLight === 'green' || result.after.trafficLight === 'amber';
		return beforePass !== afterPass;
	}

	function formatCurrency(n: number): string {
		if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
		if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
		return `₹${n.toLocaleString('en-IN')}`;
	}

	function formatDate(iso: string): string {
		return new Date(iso).toLocaleString('en-IN', {
			day: 'numeric',
			month: 'short',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
</script>

<div class="space-y-5">
	<!-- Header row -->
	<div class="flex items-start justify-between gap-4">
		<div>
			<h3 class="text-sm font-semibold text-gray-800">QA Impact Report</h3>
			<p class="mt-0.5 text-xs text-gray-500">
				296 synthetic profiles evaluated against this policy draft vs the current live version.
			</p>
		</div>
		<button
			onclick={runQa}
			disabled={running}
			class="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-amber-600 disabled:opacity-60"
		>
			{#if running}
				<RefreshCw size={12} class="animate-spin" />
				Running…
			{:else}
				<Play size={12} />
				{qaRun ? 'Re-run QA' : 'Run QA scenarios'}
			{/if}
		</button>
	</div>

	{#if runError}
		<div class="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
			<AlertTriangle size={14} />
			{runError}
		</div>
	{/if}

	{#if !qaRun}
		<!-- Empty state -->
		<div class="rounded-xl border border-dashed border-gray-200 bg-gray-50 py-16 text-center">
			<Play size={24} class="mx-auto mb-2 text-gray-300" />
			<p class="text-sm font-medium text-gray-600">No QA run yet</p>
			<p class="mt-1 text-xs text-gray-400">
				Click "Run QA scenarios" to evaluate this policy against 296 synthetic profiles.
			</p>
		</div>
	{:else}
		<!-- Summary cards -->
		{#if !qaRun.hadBaseline}
			<div class="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
				<Info size={14} class="shrink-0" />
				No previously published version found for this lender+product — showing absolute results only (no before/after comparison).
			</div>
		{/if}

		<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
			<div class="rounded-xl border border-gray-200 bg-white p-4">
				<p class="text-xs text-gray-500">Profiles tested</p>
				<p class="mt-1 text-2xl font-bold text-gray-900">{qaRun.testedProfiles}</p>
				<p class="text-[10px] text-gray-400">of {qaRun.totalProfiles} total</p>
			</div>
			<div class="rounded-xl border border-gray-200 bg-white p-4">
				<p class="text-xs text-gray-500">Changed</p>
				<p class="mt-1 text-2xl font-bold {qaRun.changedProfiles > 0 ? 'text-amber-600' : 'text-gray-900'}">
					{qaRun.changedProfiles}
				</p>
				<p class="text-[10px] text-gray-400">vs live policy</p>
			</div>
			<div class="rounded-xl border border-gray-200 bg-white p-4">
				<p class="text-xs text-gray-500">Eligibility flips</p>
				<p class="mt-1 text-2xl font-bold {qaRun.flippedEligibility > 0 ? 'text-red-600' : 'text-green-600'}">
					{qaRun.flippedEligibility}
				</p>
				<p class="text-[10px] text-gray-400">pass ↔ fail</p>
			</div>
			<div class="rounded-xl border border-gray-200 bg-white p-4">
				<p class="text-xs text-gray-500">Last run</p>
				<p class="mt-1 text-sm font-semibold text-gray-700">{formatDate(qaRun.ranAt)}</p>
				<p class="text-[10px] text-gray-400">{qaRun.hadBaseline ? 'with baseline' : 'no baseline'}</p>
			</div>
		</div>

		<!-- Results table -->
		{#if qaRun.results.length === 0}
			<div class="rounded-xl border border-dashed border-gray-200 bg-gray-50 py-10 text-center">
				<CheckCircle2 size={20} class="mx-auto mb-2 text-green-400" />
				<p class="text-sm font-medium text-gray-600">No profiles match this loan product</p>
			</div>
		{:else}
			<!-- Filter toggle -->
			<div class="flex items-center justify-between">
				<p class="text-xs text-gray-500">
					{#if showAll}
						Showing all {qaRun.results.length} profiles
					{:else}
						Showing {displayedResults.length} changed profiles
						{#if qaRun.changedProfiles === 0}· none changed{/if}
					{/if}
				</p>
				<button
					onclick={() => (showAll = !showAll)}
					class="text-xs text-amber-600 hover:underline"
				>
					{showAll ? 'Show changed only' : 'Show all profiles'}
				</button>
			</div>

			{#if displayedResults.length === 0}
				<div class="rounded-xl border border-green-100 bg-green-50 py-10 text-center">
					<CheckCircle2 size={20} class="mx-auto mb-2 text-green-500" />
					<p class="text-sm font-semibold text-green-700">All clear — no changes detected</p>
					<p class="mt-1 text-xs text-green-600">
						Every tested profile produces the same result as the current live policy.
					</p>
				</div>
			{:else}
				<div class="overflow-hidden rounded-xl border border-gray-200 bg-white">
					<table class="w-full text-xs">
						<thead>
							<tr class="border-b border-gray-100 bg-gray-50 text-left font-semibold uppercase tracking-wide text-gray-500">
								<th class="px-4 py-2.5">Profile</th>
								<th class="px-4 py-2.5">Before</th>
								<th class="px-4 py-2.5">After</th>
								<th class="px-4 py-2.5">Changes</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-gray-50">
							{#each displayedResults as result (result.profileId)}
								<!-- Summary row -->
								<tr
									class="cursor-pointer hover:bg-gray-50/60 {isFlip(result) ? 'bg-red-50/30' : ''}"
									onclick={() =>
										(expandedProfileId =
											expandedProfileId === result.profileId ? null : result.profileId)}
								>
									<td class="px-4 py-3">
										<p class="font-medium text-gray-800">{result.profileId}</p>
										<p class="mt-0.5 text-gray-500">{result.description}</p>
										{#if isFlip(result)}
											<span class="mt-1 inline-flex items-center gap-1 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
												<AlertTriangle size={9} /> FLIP
											</span>
										{/if}
									</td>

									<!-- Before -->
									<td class="px-4 py-3">
										{#if result.before}
											<span class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold {trafficLightClass(result.before.trafficLight)}">
												<span class="h-1.5 w-1.5 rounded-full {trafficLightDot(result.before.trafficLight)}"></span>
												{result.before.trafficLight}
											</span>
											<p class="mt-1 text-gray-500">{formatCurrency(result.before.eligibleAmount)}</p>
										{:else}
											<span class="text-gray-300">—</span>
										{/if}
									</td>

									<!-- After -->
									<td class="px-4 py-3">
										<span class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold {trafficLightClass(result.after.trafficLight)}">
											<span class="h-1.5 w-1.5 rounded-full {trafficLightDot(result.after.trafficLight)}"></span>
											{result.after.trafficLight}
										</span>
										<p class="mt-1 text-gray-500">{formatCurrency(result.after.eligibleAmount)}</p>
									</td>

									<!-- Change types -->
									<td class="px-4 py-3">
										{#if result.changeTypes.length === 0}
											<span class="text-gray-300">—</span>
										{:else}
											<div class="flex flex-wrap gap-1">
												{#each result.changeTypes as ct}
													<span class="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
														{ct}
													</span>
												{/each}
											</div>
										{/if}
									</td>
								</tr>

								<!-- Expanded detail row -->
								{#if expandedProfileId === result.profileId}
									<tr class="bg-gray-50/80">
										<td colspan="4" class="px-4 py-3">
											<div class="grid grid-cols-2 gap-4 text-xs sm:grid-cols-4">
												{#if result.before}
													<div>
														<p class="font-semibold text-gray-600">Before — FOIR</p>
														<p class="mt-0.5 text-gray-800">{(result.before.foir * 100).toFixed(1)}%</p>
													</div>
													<div>
														<p class="font-semibold text-gray-600">Before — ROI</p>
														<p class="mt-0.5 text-gray-800">{result.before.roi.toFixed(2)}%</p>
													</div>
													<div>
														<p class="font-semibold text-gray-600">Before — Tenure</p>
														<p class="mt-0.5 text-gray-800">{result.before.tenureMonths} mo</p>
													</div>
													<div>
														<p class="font-semibold text-gray-600">Before — Eligible</p>
														<p class="mt-0.5 text-gray-800">{formatCurrency(result.before.eligibleAmount)}</p>
													</div>
												{/if}
												<div>
													<p class="font-semibold text-gray-600">After — FOIR</p>
													<p class="mt-0.5 {result.before && Math.abs(result.before.foir - result.after.foir) > 0.001 ? 'font-bold text-amber-700' : 'text-gray-800'}">{(result.after.foir * 100).toFixed(1)}%</p>
												</div>
												<div>
													<p class="font-semibold text-gray-600">After — ROI</p>
													<p class="mt-0.5 {result.before && Math.abs(result.before.roi - result.after.roi) > 0.01 ? 'font-bold text-amber-700' : 'text-gray-800'}">{result.after.roi.toFixed(2)}%</p>
												</div>
												<div>
													<p class="font-semibold text-gray-600">After — Tenure</p>
													<p class="mt-0.5 {result.before && result.before.tenureMonths !== result.after.tenureMonths ? 'font-bold text-amber-700' : 'text-gray-800'}">{result.after.tenureMonths} mo</p>
												</div>
												<div>
													<p class="font-semibold text-gray-600">After — Eligible</p>
													<p class="mt-0.5 text-gray-800">{formatCurrency(result.after.eligibleAmount)}</p>
												</div>
											</div>
										</td>
									</tr>
								{/if}
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		{/if}
	{/if}
</div>
