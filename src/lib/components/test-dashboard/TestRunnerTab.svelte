<script lang="ts">
	import StatCard from '$lib/components/dashboard/StatCard.svelte';
	import { ClipboardList, CircleCheck, CircleX, Clock } from 'lucide-svelte';
	import MiniBarChart from '$lib/components/dashboard/MiniBarChart.svelte';
	import { secureFetch } from '$lib/utils/csrf';

	interface VitestFile {
		filepath: string;
		name: string;
		assertionResults?: VitestTest[];
	}

	interface VitestTest {
		fullName: string;
		title: string;
		status: string;
		duration: number;
		failureMessages?: string[];
	}

	interface VitestResult {
		numTotalTests: number;
		numPassedTests: number;
		numFailedTests: number;
		numPendingTests: number;
		testResults: VitestFile[];
		startTime?: number;
		success?: boolean;
	}

	let running = $state(false);
	let pattern = $state('');
	let result = $state<VitestResult | null>(null);
	let rawOutput = $state('');
	let errorOutput = $state('');
	let hasRun = $state(false);

	async function runTests() {
		running = true;
		result = null;
		rawOutput = '';
		errorOutput = '';
		hasRun = true;

		try {
			const res = await secureFetch('/api/test/run-vitest', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ pattern: pattern || undefined })
			});

			const data = await res.json();

			if (data.parsed) {
				result = normalizeResult(data.parsed);
			}
			if (data.stdout) rawOutput = data.stdout;
			if (data.stderr) errorOutput = data.stderr;
		} catch (err) {
			errorOutput = 'Failed to reach test runner API';
		} finally {
			running = false;
		}
	}

	function normalizeResult(raw: Record<string, unknown>): VitestResult {
		const r = raw as Record<string, unknown>;
		return {
			numTotalTests: (r.numTotalTests as number) ?? 0,
			numPassedTests: (r.numPassedTests as number) ?? 0,
			numFailedTests: (r.numFailedTests as number) ?? 0,
			numPendingTests: (r.numPendingTests as number) ?? 0,
			testResults: (r.testResults as VitestFile[]) ?? [],
			startTime: r.startTime as number | undefined,
			success: r.success as boolean | undefined
		};
	}

	const chartData = $derived(
		result
			? [
					{ label: 'Passed', value: result.numPassedTests, color: '#22c55e' },
					{ label: 'Failed', value: result.numFailedTests, color: '#ef4444' },
					{ label: 'Pending', value: result.numPendingTests, color: '#94a3b8' }
				]
			: []
	);

	function getFileTests(file: VitestFile): VitestTest[] {
		return file.assertionResults ?? [];
	}

	function statusColor(status: string): string {
		if (status === 'passed') return 'bg-green-500';
		if (status === 'failed') return 'bg-red-500';
		return 'bg-gray-400';
	}

	let showRawJson = $state(false);
</script>

<div class="space-y-6">
	<!-- What this tab does -->
	<div class="rounded-xl border border-blue-200 bg-blue-50 p-4">
		<h3 class="text-sm font-bold text-blue-900">What does this do?</h3>
		<p class="mt-1 text-xs leading-relaxed text-blue-800">
			Runs <strong>Vitest unit tests</strong> in the background (no browser needed). These verify the
			form's logic: page sequences, showWhen visibility rules, required field validation, and payload
			sanitization. Click "Run Unit Tests" and wait for results below.
		</p>
		<p class="mt-2 text-xs text-blue-700">
			<strong>What to look for:</strong> All tests should be green (passed). If any are red (failed),
			expand the failed file to see which specific assertion failed and report it.
		</p>
	</div>

	<!-- Controls -->
	<div class="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
		<div class="flex flex-col gap-3 sm:flex-row sm:items-end">
			<div class="flex-1">
				<label for="tr_pattern" class="mb-1 block text-xs font-medium text-gray-500">
					Test Pattern (optional — leave empty to run all tests)
				</label>
				<input
					id="tr_pattern"
					type="text"
					class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[var(--ddsa-primary-500)] focus:ring-1 focus:ring-[var(--ddsa-primary-500)] focus:outline-none"
					placeholder="e.g. schemaAlignment, homeLoan, payloadSanitization"
					bind:value={pattern}
				/>
			</div>
			<div class="flex gap-2">
				<button
					type="button"
					class="rounded-lg bg-gradient-to-r from-[var(--ddsa-primary-400)] via-[var(--ddsa-accent-500)] to-[var(--ddsa-primary-400)] px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:brightness-110 disabled:opacity-50"
					onclick={runTests}
					disabled={running}
				>
					{running ? 'Running...' : 'Run Unit Tests'}
				</button>
				{#if pattern}
					<button
						type="button"
						class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
						onclick={() => {
							pattern = '';
							runTests();
						}}
						disabled={running}
					>
						Run All (no filter)
					</button>
				{/if}
			</div>
		</div>
	</div>

	{#if running}
		<div class="flex items-center justify-center py-12">
			<div class="flex items-center gap-3 text-sm text-gray-500">
				<span class="animate-spin text-lg">&#x27F3;</span>
				Running vitest... this may take a moment
			</div>
		</div>
	{/if}

	{#if result && !running}
		<!-- Summary Stats -->
		<div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
			<StatCard title="Total Tests" value={result.numTotalTests} icon={ClipboardList} />
			<StatCard title="Passed" value={result.numPassedTests} icon={CircleCheck} />
			<StatCard title="Failed" value={result.numFailedTests} icon={CircleX} />
			<StatCard title="Pending" value={result.numPendingTests} icon={Clock} />
		</div>

		<!-- Bar Chart -->
		{#if result.numTotalTests > 0}
			<div class="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
				<h3 class="mb-3 text-sm font-semibold text-[#1e293b]">Results Distribution</h3>
				<MiniBarChart data={chartData} height={100} />
			</div>
		{/if}

		<!-- File Results -->
		<div class="space-y-3">
			<h3 class="text-sm font-semibold text-[#1e293b]">
				Test Files ({result.testResults.length})
			</h3>
			{#each result.testResults as file}
				{@const tests = getFileTests(file)}
				<div class="rounded-xl border border-gray-200 bg-white shadow-sm">
					<div class="flex items-center justify-between border-b border-gray-100 px-4 py-3">
						<div>
							<p class="text-sm font-medium text-[#1e293b]">{file.name || file.filepath}</p>
							<p class="text-xs text-gray-400">{tests.length} tests</p>
						</div>
					</div>
					{#if tests.length > 0}
						<div class="divide-y divide-gray-50">
							{#each tests as t}
								<div class="flex items-center justify-between px-4 py-2.5">
									<div class="flex items-center gap-2">
										<span class="inline-block h-2 w-2 rounded-full {statusColor(t.status)}"></span>
										<span class="text-sm text-gray-700">{t.title || t.fullName}</span>
									</div>
									<span class="text-xs text-gray-400">{t.duration}ms</span>
								</div>
								{#if t.failureMessages?.length}
									<div class="mx-4 mb-2 rounded-lg bg-red-50 p-3">
										<pre class="text-xs whitespace-pre-wrap text-[var(--color-error)]">{t.failureMessages.join(
												'\n'
											)}</pre>
									</div>
								{/if}
							{/each}
						</div>
					{/if}
				</div>
			{/each}
		</div>

		<!-- Raw JSON toggle -->
		<div class="rounded-xl border border-gray-100 bg-white shadow-sm">
			<button
				type="button"
				class="w-full px-4 py-3 text-left text-xs font-medium text-gray-500 hover:bg-gray-50"
				onclick={() => (showRawJson = !showRawJson)}
			>
				{showRawJson ? 'Hide' : 'Show'} Raw JSON
			</button>
			{#if showRawJson}
				<pre
					class="max-h-64 overflow-auto border-t border-gray-100 p-4 text-xs text-gray-600">{JSON.stringify(
						result,
						null,
						2
					)}</pre>
			{/if}
		</div>
	{/if}

	{#if !result && hasRun && !running}
		{#if rawOutput}
			<div class="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
				<h3 class="mb-3 text-sm font-semibold text-[#1e293b]">Raw Output</h3>
				<pre
					class="max-h-96 overflow-auto rounded-lg bg-gray-900 p-4 text-xs text-green-400">{rawOutput}</pre>
			</div>
		{/if}
		{#if errorOutput}
			<div class="rounded-xl border border-red-200 bg-red-50 p-5">
				<h3 class="mb-3 text-sm font-semibold text-red-800">Error Output</h3>
				<pre
					class="max-h-96 overflow-auto rounded-lg bg-gray-900 p-4 text-xs text-red-400">{errorOutput}</pre>
			</div>
		{/if}
	{/if}

	{#if !hasRun && !running}
		<div class="flex flex-col items-center justify-center py-16 text-center">
			<span class="mb-3 text-4xl">&#x1F9EA;</span>
			<p class="text-sm text-gray-500">
				Click "Run Unit Tests" to execute vitest and see results here.
			</p>
			<p class="mt-1 text-xs text-gray-400">
				Optionally enter a pattern to filter tests (e.g. "homeLoan", "schema").
			</p>
		</div>
	{/if}
</div>
