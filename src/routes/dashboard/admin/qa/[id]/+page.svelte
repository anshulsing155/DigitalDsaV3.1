<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { addToast } from '$lib/state/ui.svelte';
	import { ROUTES } from '$lib/config/routes';
	import { secureFetch } from '$lib/utils/csrf';
	import {
		ArrowLeft,
		Play,
		CheckCircle2,
		XCircle,
		AlertTriangle,
		Clock,
		ChevronDown,
		ChevronUp,
		FlaskConical
	} from '$lib/utils/iconRegistry';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let scenario = $derived(data.scenario);
	let details = $derived(scenario.lastRunDetails);
	let evalResult = $derived(details?.evaluationResult ?? null);

	// ── Run state ─────────────────────────────────────────────────────────────
	let isRunning = $state(false);

	async function runScenario() {
		isRunning = true;
		try {
			const response = await secureFetch('/api/qa/scenarios/run', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ ids: [scenario._id] })
			});
			const json = await response.json();
			if (response.ok) {
				await invalidateAll();
				const result = json.data?.results?.[0];
				if (result?.result === 'pass') {
					addToast({ type: 'success', message: 'Run complete — PASS' });
				} else if (result?.result === 'fail') {
					addToast({ type: 'error', message: 'Run complete — FAIL' });
				} else {
					addToast({ type: 'warning', message: 'Run complete — WARNING' });
				}
			} else {
				addToast({ type: 'error', message: json.message ?? 'Run failed' });
			}
		} catch {
			addToast({ type: 'error', message: 'Network error during run' });
		} finally {
			isRunning = false;
		}
	}

	// ── Payload / JSON expand state ───────────────────────────────────────────
	let isPayloadOpen = $state(false);
	let isRawResultOpen = $state(false);

	// ── Helpers ───────────────────────────────────────────────────────────────
	function trafficLightClass(light: string) {
		if (light === 'green') return 'bg-emerald-500';
		if (light === 'amber') return 'bg-amber-400';
		if (light === 'red') return 'bg-red-500';
		return 'bg-gray-300';
	}

	function trafficLightLabel(light: string) {
		if (light === 'green') return 'Eligible';
		if (light === 'amber') return 'Conditional';
		if (light === 'red') return 'Rejected';
		return 'Not evaluated';
	}

	function resultBadgeClass(result: string | null) {
		if (result === 'pass') return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300';
		if (result === 'fail') return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300';
		if (result === 'warning') return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300';
		return 'bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400';
	}

	function formatAmount(n: number) {
		if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2)}Cr`;
		if (n >= 100_000) return `₹${(n / 100_000).toFixed(2)}L`;
		return `₹${n.toLocaleString('en-IN')}`;
	}

	function formatDate(iso: string | null) {
		if (!iso) return '—';
		return new Date(iso).toLocaleString('en-IN', {
			day: '2-digit', month: 'short', year: 'numeric',
			hour: '2-digit', minute: '2-digit'
		});
	}

	let greenLenders = $derived(evalResult?.results.filter(r => r.traffic_light === 'green') ?? []);
	let amberLenders = $derived(evalResult?.results.filter(r => r.traffic_light === 'amber') ?? []);
	let redLenders = $derived(evalResult?.results.filter(r => r.traffic_light === 'red') ?? []);
</script>

<div class="mx-auto max-w-5xl px-4 py-6">

	<!-- Back link + header -->
	<div class="mb-6">
		<a
			href={ROUTES.DASHBOARD.ADMIN.QA}
			class="mb-3 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
		>
			<ArrowLeft class="h-4 w-4" />
			Back to QA Library
		</a>

		<div class="flex flex-wrap items-start justify-between gap-4">
			<div class="min-w-0 flex-1">
				<div class="flex items-center gap-2">
					<FlaskConical class="h-5 w-5 shrink-0 text-violet-600" />
					<h1 class="truncate text-lg font-bold text-gray-900 dark:text-gray-100">
						{scenario.autoName}
					</h1>
				</div>
				{#if scenario.testerNote}
					<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{scenario.testerNote}</p>
				{/if}
			</div>

			<button
				onclick={runScenario}
				disabled={isRunning}
				class="flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-violet-700 disabled:opacity-60"
			>
				<Play class="h-4 w-4" />
				{isRunning ? 'Running…' : 'Run Now'}
			</button>
		</div>

		<!-- Meta badges -->
		<div class="mt-3 flex flex-wrap gap-2">
			{#each [scenario.meta.loanType, scenario.meta.formPath, scenario.meta.employment, scenario.meta.city] as badge}
				{#if badge}
					<span class="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300">
						{badge}
					</span>
				{/if}
			{/each}
			{#if scenario.meta.cibil}
				<span class="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
					CIBIL {scenario.meta.cibil}
				</span>
			{/if}
			{#if scenario.meta.applicantCount > 1}
				<span class="rounded-full bg-purple-50 px-2.5 py-0.5 text-xs text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
					{scenario.meta.applicantCount} applicants
				</span>
			{/if}
			{#each scenario.meta.tags as tag}
				<span class="rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-medium text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
					{tag}
				</span>
			{/each}
		</div>
	</div>

	<!-- Last run result banner -->
	<div class="mb-6 rounded-xl border {resultBadgeClass(scenario.lastRunResult)} p-4">
		<div class="flex flex-wrap items-center gap-3">
			{#if scenario.lastRunResult === 'pass'}
				<CheckCircle2 class="h-5 w-5 text-emerald-600" />
				<span class="font-semibold">Last run: PASS</span>
			{:else if scenario.lastRunResult === 'fail'}
				<XCircle class="h-5 w-5 text-red-600" />
				<span class="font-semibold">Last run: FAIL</span>
			{:else if scenario.lastRunResult === 'warning'}
				<AlertTriangle class="h-5 w-5 text-amber-600" />
				<span class="font-semibold">Last run: WARNING</span>
			{:else}
				<Clock class="h-5 w-5 text-gray-500" />
				<span class="font-semibold text-gray-600 dark:text-gray-300">Never run — click "Run Now" to evaluate</span>
			{/if}
			{#if scenario.lastRunAt}
				<span class="ml-auto text-xs opacity-70">{formatDate(scenario.lastRunAt)}</span>
			{/if}
		</div>

		{#if details && !details.payloadBuilt}
			<p class="mt-2 text-sm">
				<span class="font-medium">Build error:</span> {details.buildError ?? 'Unknown build failure'}
			</p>
		{/if}
	</div>

	<!-- Warning match section (only when expected warnings were set) -->
	{#if scenario.expectedWarnings.length > 0 && details}
		<div class="mb-6 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
			<h2 class="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Expected Warnings</h2>
			<div class="space-y-2">
				{#each scenario.expectedWarnings as warning}
					{@const matched = details.warningsMatched.includes(warning)}
					<div class="flex items-start gap-2 text-sm">
						{#if matched}
							<CheckCircle2 class="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
							<span class="text-emerald-700 dark:text-emerald-300">{warning}</span>
						{:else}
							<XCircle class="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
							<span class="text-red-700 line-through dark:text-red-300">{warning}</span>
							<span class="text-xs text-red-500">(not seen in output)</span>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Lender results — only if we have evaluation output -->
	{#if evalResult}
		<!-- Summary counts -->
		<div class="mb-4 grid grid-cols-3 gap-3">
			<div class="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center dark:border-emerald-800 dark:bg-emerald-950/30">
				<div class="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{greenLenders.length}</div>
				<div class="text-xs text-emerald-600 dark:text-emerald-500">Eligible</div>
			</div>
			<div class="rounded-xl border border-amber-200 bg-amber-50 p-3 text-center dark:border-amber-800 dark:bg-amber-950/30">
				<div class="text-2xl font-bold text-amber-700 dark:text-amber-400">{amberLenders.length}</div>
				<div class="text-xs text-amber-600 dark:text-amber-500">Conditional</div>
			</div>
			<div class="rounded-xl border border-red-200 bg-red-50 p-3 text-center dark:border-red-800 dark:bg-red-950/30">
				<div class="text-2xl font-bold text-red-700 dark:text-red-400">{redLenders.length}</div>
				<div class="text-xs text-red-600 dark:text-red-500">Rejected</div>
			</div>
		</div>

		<!-- Per-lender table -->
		<div class="mb-6 overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
			<table class="w-full text-sm">
				<thead>
					<tr class="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
						<th class="px-4 py-2.5 text-left font-medium text-gray-600 dark:text-gray-300">Lender</th>
						<th class="px-4 py-2.5 text-left font-medium text-gray-600 dark:text-gray-300">Status</th>
						<th class="px-4 py-2.5 text-right font-medium text-gray-600 dark:text-gray-300">Offered</th>
						<th class="px-4 py-2.5 text-right font-medium text-gray-600 dark:text-gray-300">ROI</th>
						<th class="px-4 py-2.5 text-right font-medium text-gray-600 dark:text-gray-300">FOIR</th>
						<th class="px-4 py-2.5 text-right font-medium text-gray-600 dark:text-gray-300">CIBIL</th>
						<th class="px-4 py-2.5 text-right font-medium text-gray-600 dark:text-gray-300">Factors</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-100 dark:divide-gray-800">
					{#each evalResult.results as lender}
						{@const negativeFactors = lender.factors.filter(f => f.impact === 'negative')}
						{@const positiveFactors = lender.factors.filter(f => f.impact === 'positive')}
						<tr class="hover:bg-gray-50 dark:hover:bg-gray-800/50">
							<td class="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
								{lender.lender_name}
								{#if lender.traffic_light_message}
									<p class="text-xs font-normal text-gray-400 dark:text-gray-500">{lender.traffic_light_message}</p>
								{/if}
							</td>
							<td class="px-4 py-3">
								<div class="flex items-center gap-2">
									<span class="h-2 w-2 rounded-full {trafficLightClass(lender.traffic_light)}"></span>
									<span class="text-xs text-gray-600 dark:text-gray-400">{trafficLightLabel(lender.traffic_light)}</span>
								</div>
							</td>
							<td class="px-4 py-3 text-right tabular-nums text-gray-900 dark:text-gray-100">
								{lender.offered_amount > 0 ? formatAmount(lender.offered_amount) : '—'}
							</td>
							<td class="px-4 py-3 text-right tabular-nums text-gray-600 dark:text-gray-300">
								{lender.roi > 0 ? `${lender.roi.toFixed(2)}%` : '—'}
							</td>
							<td class="px-4 py-3 text-right tabular-nums text-gray-600 dark:text-gray-300">
								{lender.key_metrics.foir != null ? `${(lender.key_metrics.foir * 100).toFixed(1)}%` : '—'}
							</td>
							<td class="px-4 py-3 text-right tabular-nums text-gray-600 dark:text-gray-300">
								{lender.key_metrics.cibil || '—'}
							</td>
							<td class="px-4 py-3 text-right">
								<div class="flex items-center justify-end gap-2">
									{#if positiveFactors.length}
										<span class="rounded-full bg-emerald-50 px-1.5 py-0.5 text-xs font-medium text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
											+{positiveFactors.length}
										</span>
									{/if}
									{#if negativeFactors.length}
										<span class="rounded-full bg-red-50 px-1.5 py-0.5 text-xs font-medium text-red-600 dark:bg-red-900/30 dark:text-red-400">
											−{negativeFactors.length}
										</span>
									{/if}
								</div>
							</td>
						</tr>

						<!-- Negative factors row (always shown when they exist) -->
						{#if negativeFactors.length}
							<tr class="bg-red-50/40 dark:bg-red-950/10">
								<td colspan="7" class="px-4 py-2">
									<div class="flex flex-wrap gap-x-4 gap-y-1">
										{#each negativeFactors as f}
											<span class="text-xs text-red-700 dark:text-red-400">
												• {f.description}
												{#if f.metric}
													<span class="opacity-70">({f.metric.value}{f.metric.benchmark ? ` / ${f.metric.benchmark}` : ''})</span>
												{/if}
											</span>
										{/each}
									</div>
								</td>
							</tr>
						{/if}
					{/each}
				</tbody>
			</table>
		</div>

		<!-- Raw result JSON (collapsible) -->
		<div class="mb-6 rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
			<button
				onclick={() => (isRawResultOpen = !isRawResultOpen)}
				class="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
			>
				Raw evaluation result (JSON)
				{#if isRawResultOpen}
					<ChevronUp class="h-4 w-4 text-gray-400" />
				{:else}
					<ChevronDown class="h-4 w-4 text-gray-400" />
				{/if}
			</button>
			{#if isRawResultOpen}
				<pre class="max-h-96 overflow-auto border-t border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-300">{JSON.stringify(evalResult, null, 2)}</pre>
			{/if}
		</div>
	{/if}

	<!-- Payload viewer (collapsible) -->
	<div class="mb-6 rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
		<button
			onclick={() => (isPayloadOpen = !isPayloadOpen)}
			class="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
		>
			Stored payload (JSON)
			{#if isPayloadOpen}
				<ChevronUp class="h-4 w-4 text-gray-400" />
			{:else}
				<ChevronDown class="h-4 w-4 text-gray-400" />
			{/if}
		</button>
		{#if isPayloadOpen}
			<pre class="max-h-96 overflow-auto border-t border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-300">{JSON.stringify(scenario.payload, null, 2)}</pre>
		{/if}
	</div>

	<!-- Scenario metadata footer -->
	<div class="rounded-xl border border-gray-100 bg-gray-50 p-4 text-xs text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
		<div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
			<div><span class="font-medium">Created</span><br />{formatDate(scenario.createdAt)}</div>
			<div><span class="font-medium">Last updated</span><br />{formatDate(scenario.updatedAt)}</div>
			<div><span class="font-medium">Last run</span><br />{formatDate(scenario.lastRunAt)}</div>
			<div><span class="font-medium">ID</span><br /><span class="font-mono">{scenario._id}</span></div>
		</div>
	</div>
</div>
