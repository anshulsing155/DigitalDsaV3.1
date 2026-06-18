<script lang="ts">
	import { ROUTES } from '$lib/config/routes';
	import { CheckCircle2, XCircle, AlertTriangle, Clock, FlaskConical } from '$lib/utils/iconRegistry';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Derive cell status for color coding:
	// fail > warning > neverRun > pass > empty
	function cellStatus(cell: { total: number; pass: number; fail: number; warning: number; neverRun: number } | undefined) {
		if (!cell || cell.total === 0) return 'empty';
		if (cell.fail > 0) return 'fail';
		if (cell.warning > 0) return 'warning';
		if (cell.neverRun > 0) return 'pending';
		return 'pass';
	}

	function cellBg(status: string) {
		if (status === 'pass') return 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800';
		if (status === 'fail') return 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800';
		if (status === 'warning') return 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800';
		if (status === 'pending') return 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700';
		return 'bg-white border-gray-100 dark:bg-gray-900 dark:border-gray-800';
	}

	function cellTextColor(status: string) {
		if (status === 'pass') return 'text-emerald-700 dark:text-emerald-300';
		if (status === 'fail') return 'text-[var(--color-error)] dark:text-red-300';
		if (status === 'warning') return 'text-amber-700 dark:text-amber-300';
		if (status === 'pending') return 'text-gray-500 dark:text-gray-400';
		return 'text-gray-300 dark:text-gray-700';
	}

	function getCell(loanType: string, employment: string) {
		return data.cells[`${loanType}|${employment}`];
	}

	function rowStatus(lt: string) {
		return cellStatus(data.rowTotals[lt]);
	}

	// Coverage percentage: scenarios with at least one run / total
	function coveredPct(row: { total: number; neverRun: number }) {
		if (row.total === 0) return 0;
		return Math.round(((row.total - row.neverRun) / row.total) * 100);
	}

	const overallCoveredPct = $derived(coveredPct(data.overall));
</script>

<div class="mx-auto max-w-6xl px-4 py-6">

	<!-- Header + nav tabs -->
	<div class="mb-6">
		<div class="flex items-center gap-2">
			<FlaskConical class="h-5 w-5 text-violet-600" />
			<h1 class="text-lg font-bold text-gray-900 dark:text-gray-100">QA Coverage Map</h1>
		</div>
		<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
			Scenario coverage across loan types and employment profiles. Click a cell to filter the scenario list.
		</p>

		<!-- Tabs -->
		<div class="mt-4 flex gap-1 border-b border-gray-200 dark:border-gray-700">
			<a
				href={ROUTES.DASHBOARD.ADMIN.QA}
				class="rounded-t-lg px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
			>
				Scenarios
			</a>
			<a
				href={ROUTES.DASHBOARD.ADMIN.QA_COVERAGE}
				class="rounded-t-lg border-b-2 border-violet-600 px-4 py-2 text-sm font-medium text-violet-700 dark:text-violet-400"
			>
				Coverage Map
			</a>
		</div>
	</div>

	<!-- Overall stats bar -->
	<div class="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
		<div class="rounded-xl border border-gray-200 bg-white p-3 text-center dark:border-gray-700 dark:bg-gray-900">
			<div class="text-2xl font-bold text-gray-900 dark:text-gray-100">{data.overall.total}</div>
			<div class="text-xs text-gray-500">Total</div>
		</div>
		<div class="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center dark:border-emerald-800 dark:bg-emerald-950/30">
			<div class="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{data.overall.pass}</div>
			<div class="text-xs text-emerald-600 dark:text-emerald-500">Pass</div>
		</div>
		<div class="rounded-xl border border-red-200 bg-red-50 p-3 text-center dark:border-red-800 dark:bg-red-950/30">
			<div class="text-2xl font-bold text-[var(--color-error)] dark:text-red-400">{data.overall.fail}</div>
			<div class="text-xs text-red-600 dark:text-red-500">Fail</div>
		</div>
		<div class="rounded-xl border border-amber-200 bg-amber-50 p-3 text-center dark:border-amber-800 dark:bg-amber-950/30">
			<div class="text-2xl font-bold text-amber-700 dark:text-amber-400">{data.overall.warning}</div>
			<div class="text-xs text-amber-600 dark:text-amber-500">Warning</div>
		</div>
		<div class="rounded-xl border border-gray-200 bg-gray-50 p-3 text-center dark:border-gray-700 dark:bg-gray-800">
			<div class="text-2xl font-bold text-gray-600 dark:text-gray-300">{overallCoveredPct}%</div>
			<div class="text-xs text-gray-500">Run coverage</div>
		</div>
	</div>

	{#if data.overall.total === 0}
		<!-- Empty state -->
		<div class="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 py-16 text-center dark:border-gray-700 dark:bg-gray-900">
			<FlaskConical class="mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
			<p class="text-sm font-medium text-gray-500 dark:text-gray-400">No scenarios yet</p>
			<p class="mt-1 text-xs text-gray-400">
				Save scenarios from the form in dev mode, then run them to see coverage here.
			</p>
			<a
				href={ROUTES.DASHBOARD.ADMIN.QA}
				class="mt-4 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
			>
				Go to Scenarios
			</a>
		</div>
	{:else}
		<!-- Coverage grid -->
		<div class="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
			<table class="w-full border-collapse text-sm">
				<thead>
					<tr class="border-b border-gray-200 dark:border-gray-700">
						<!-- Corner cell -->
						<th class="sticky left-0 bg-white px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:bg-gray-900 dark:text-gray-400">
							Loan Type ↓ / Employment →
						</th>
						{#each data.employments as employment}
							<th class="px-3 py-3 text-center text-xs font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap">
								{employment}
							</th>
						{/each}
						<!-- Row total column -->
						<th class="px-3 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800">
							Total
						</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-100 dark:divide-gray-800">
					{#each data.loanTypes as loanType}
						{@const rowTotal = data.rowTotals[loanType]}
						{@const rStatus = rowStatus(loanType)}
						<tr class="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
							<!-- Loan type label -->
							<td class="sticky left-0 bg-white px-4 py-3 font-medium text-gray-800 dark:bg-gray-900 dark:text-gray-200 whitespace-nowrap">
								{loanType}
								{#if rowTotal}
									<div class="mt-0.5 text-xs text-gray-400">{coveredPct(rowTotal)}% run</div>
								{/if}
							</td>

							{#each data.employments as employment}
								{@const cell = getCell(loanType, employment)}
								{@const status = cellStatus(cell)}
								<td class="px-2 py-2 text-center">
									{#if cell && cell.total > 0}
										<a
											href="{ROUTES.DASHBOARD.ADMIN.QA}?loanType={encodeURIComponent(loanType)}&employment={encodeURIComponent(employment)}"
											class="block rounded-lg border p-2 transition-transform hover:scale-105 {cellBg(status)}"
											title="{cell.total} scenario{cell.total !== 1 ? 's' : ''} · {cell.pass} pass · {cell.fail} fail · {cell.warning} warning · {cell.neverRun} not run"
										>
											<span class="block text-base font-bold {cellTextColor(status)}">{cell.total}</span>
											<div class="mt-1 flex items-center justify-center gap-1">
												{#if cell.fail > 0}
													<span class="text-[10px] text-red-600">✕{cell.fail}</span>
												{/if}
												{#if cell.warning > 0}
													<span class="text-[10px] text-amber-600">⚠{cell.warning}</span>
												{/if}
												{#if cell.pass > 0}
													<span class="text-[10px] text-emerald-600">✓{cell.pass}</span>
												{/if}
												{#if cell.neverRun > 0 && cell.neverRun === cell.total}
													<span class="text-[10px] text-gray-400">○{cell.neverRun}</span>
												{/if}
											</div>
										</a>
									{:else}
										<div class="rounded-lg border border-dashed border-gray-100 p-2 dark:border-gray-800">
											<span class="text-xs text-gray-200 dark:text-gray-700">—</span>
										</div>
									{/if}
								</td>
							{/each}

							<!-- Row total -->
							<td class="bg-gray-50 px-3 py-2 text-center dark:bg-gray-800">
								{#if rowTotal && rowTotal.total > 0}
									<a
										href="{ROUTES.DASHBOARD.ADMIN.QA}?loanType={encodeURIComponent(loanType)}"
										class="block rounded-lg border p-2 {cellBg(rStatus)}"
									>
										<span class="block text-base font-bold {cellTextColor(rStatus)}">{rowTotal.total}</span>
										<div class="mt-0.5 text-[10px] text-gray-400">{coveredPct(rowTotal)}% run</div>
									</a>
								{:else}
									<span class="text-xs text-gray-300 dark:text-gray-600">—</span>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>

				<!-- Column totals footer -->
				<tfoot class="border-t-2 border-gray-200 dark:border-gray-700">
					<tr class="bg-gray-50 dark:bg-gray-800">
						<td class="sticky left-0 bg-gray-50 px-4 py-3 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
							Column total
						</td>
						{#each data.employments as employment}
							{@const colCells = data.loanTypes
								.map(lt => getCell(lt, employment))
								.filter((c): c is NonNullable<typeof c> => !!c)}
							{@const colTotal = colCells.reduce((acc, c) => acc + c.total, 0)}
							{@const colFail = colCells.reduce((acc, c) => acc + c.fail, 0)}
							{@const colPass = colCells.reduce((acc, c) => acc + c.pass, 0)}
							<td class="px-3 py-2 text-center">
								{#if colTotal > 0}
									<a
										href="{ROUTES.DASHBOARD.ADMIN.QA}?employment={encodeURIComponent(employment)}"
										class="inline-block rounded-lg border px-2 py-1 text-sm font-bold {colFail > 0 ? 'border-red-200 bg-red-50 text-[var(--color-error)] dark:border-red-800 dark:bg-red-950/30 dark:text-red-300' : colPass === colTotal ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300' : 'border-gray-200 bg-white text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300'}"
									>
										{colTotal}
									</a>
								{:else}
									<span class="text-xs text-gray-300 dark:text-gray-600">—</span>
								{/if}
							</td>
						{/each}
						<td class="px-3 py-2 text-center">
							<span class="inline-block rounded-lg border border-violet-200 bg-violet-50 px-2 py-1 text-sm font-bold text-violet-700 dark:border-violet-800 dark:bg-violet-950/30 dark:text-violet-300">
								{data.overall.total}
							</span>
						</td>
					</tr>
				</tfoot>
			</table>
		</div>

		<!-- Legend -->
		<div class="mt-4 flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
			<span class="font-medium">Legend:</span>
			<span class="flex items-center gap-1.5">
				<span class="inline-block h-3 w-3 rounded border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30"></span>
				All pass
			</span>
			<span class="flex items-center gap-1.5">
				<span class="inline-block h-3 w-3 rounded border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30"></span>
				Any fail
			</span>
			<span class="flex items-center gap-1.5">
				<span class="inline-block h-3 w-3 rounded border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30"></span>
				Any warning (no fails)
			</span>
			<span class="flex items-center gap-1.5">
				<span class="inline-block h-3 w-3 rounded border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800"></span>
				Not yet run
			</span>
			<span class="flex items-center gap-1.5">
				<span class="inline-block h-3 w-3 rounded border border-dashed border-gray-200 dark:border-gray-700"></span>
				No scenarios
			</span>
			<span class="ml-auto">Click any cell to filter the scenario list.</span>
		</div>
	{/if}
</div>
