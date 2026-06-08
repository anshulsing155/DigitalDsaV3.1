<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { ROUTES } from '$lib/config/routes';
	import { addToast } from '$lib/state/ui.svelte';
	import { secureFetch } from '$lib/utils/csrf';
	import {
		FlaskConical,
		Play,
		Copy,
		Archive,
		ChevronLeft,
		ChevronRight,
		CheckCircle2,
		XCircle,
		AlertTriangle,
		Clock,
		Info
	} from '$lib/utils/iconRegistry';

	let { data } = $props();

	// ── Filter state (mirrors URL params) ─────────────────────────────────────
	// Local $state so the user can type/select before applying, but re-seeded
	// from server props whenever navigation (applyFilters/clearFilters) invalidates
	// the page — otherwise the dropdowns would show stale selections after a nav.
	// svelte-ignore state_referenced_locally
	let filterLoanType = $state(data.filters.loanType);
	// svelte-ignore state_referenced_locally
	let filterEmployment = $state(data.filters.employment);
	// svelte-ignore state_referenced_locally
	let filterResult = $state(data.filters.result);

	$effect.pre(() => {
		filterLoanType = data.filters.loanType;
		filterEmployment = data.filters.employment;
		filterResult = data.filters.result;
	});

	// ── Running state ──────────────────────────────────────────────────────────
	let runningId = $state<string | null>(null);
	let runningAll = $state(false);

	// ── Clone modal state ──────────────────────────────────────────────────────
	let cloneTarget = $state<{ id: string; name: string } | null>(null);
	let cloneCibilOverride = $state('');
	let cloneNote = $state('');
	let cloning = $state(false);

	// ── Archive confirm state ──────────────────────────────────────────────────
	let archiveTarget = $state<{ id: string; name: string } | null>(null);
	let archiving = $state(false);

	// ── Helpers ────────────────────────────────────────────────────────────────

	function applyFilters() {
		const params = new URLSearchParams();
		if (filterLoanType) params.set('loanType', filterLoanType);
		if (filterEmployment) params.set('employment', filterEmployment);
		if (filterResult) params.set('result', filterResult);
		goto(`/dashboard/admin/qa?${params.toString()}`, { invalidateAll: true });
	}

	function clearFilters() {
		filterLoanType = '';
		filterEmployment = '';
		filterResult = '';
		goto('/dashboard/admin/qa', { invalidateAll: true });
	}

	function timeAgo(iso: string | null): string {
		if (!iso) return '';
		const diff = Date.now() - new Date(iso).getTime();
		const mins = Math.floor(diff / 60000);
		if (mins < 1) return 'just now';
		if (mins < 60) return `${mins}m ago`;
		const hrs = Math.floor(mins / 60);
		if (hrs < 24) return `${hrs}h ago`;
		return `${Math.floor(hrs / 24)}d ago`;
	}

	// ── Actions ────────────────────────────────────────────────────────────────

	async function runScenario(id: string, name: string) {
		runningId = id;
		try {
			const res = await secureFetch('/api/qa/scenarios/run', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ ids: [id] })
			});
			const json = await res.json();
			if (json.success) {
				const r = json.data.results[0];
				const label = r.runDetails.overallResult;
				if (label === 'pass') addToast({ type: 'success', message: `✓ ${name} — Pass` });
				else if (label === 'fail') addToast({ type: 'error', message: `✗ ${name} — Fail` });
				else addToast({ type: 'warning', message: `⚠ ${name} — Warning` });
				goto($page.url.pathname + $page.url.search, { invalidateAll: true });
			} else {
				addToast({ type: 'error', message: json.error ?? 'Run failed' });
			}
		} catch {
			addToast({ type: 'error', message: 'Network error — run failed' });
		} finally {
			runningId = null;
		}
	}

	async function runAll() {
		runningAll = true;
		try {
			const res = await secureFetch('/api/qa/scenarios/run', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ ids: [] })
			});
			const json = await res.json();
			if (json.success) {
				const { pass, fail, warning } = json.data.summary;
				addToast({ type: 'success', message: `Run complete — ${pass} pass · ${fail} fail · ${warning} warning` });
				goto($page.url.pathname + $page.url.search, { invalidateAll: true });
			} else {
				addToast({ type: 'error', message: json.error ?? 'Run all failed' });
			}
		} catch {
			addToast({ type: 'error', message: 'Network error — run failed' });
		} finally {
			runningAll = false;
		}
	}

	async function confirmClone() {
		if (!cloneTarget) return;
		cloning = true;
		try {
			const body: Record<string, unknown> = {
				testerNote: cloneNote || undefined,
				primaryApplicantOverrides: cloneCibilOverride
					? { creditScore: Number(cloneCibilOverride) }
					: undefined
			};
			const res = await secureFetch(`/api/qa/scenarios/${cloneTarget.id}/clone`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});
			const json = await res.json();
			if (json.success) {
				addToast({ type: 'success', message: `Cloned — ${json.data.autoName}` });
				cloneTarget = null;
				cloneCibilOverride = '';
				cloneNote = '';
				goto($page.url.pathname + $page.url.search, { invalidateAll: true });
			} else {
				addToast({ type: 'error', message: json.error ?? 'Clone failed' });
			}
		} catch {
			addToast({ type: 'error', message: 'Network error — clone failed' });
		} finally {
			cloning = false;
		}
	}

	async function confirmArchive() {
		if (!archiveTarget) return;
		archiving = true;
		try {
			const res = await secureFetch(`/api/qa/scenarios/${archiveTarget.id}`, { method: 'DELETE' });
			const json = await res.json();
			if (json.success) {
				addToast({ type: 'success', message: 'Scenario archived' });
				archiveTarget = null;
				goto($page.url.pathname + $page.url.search, { invalidateAll: true });
			} else {
				addToast({ type: 'error', message: json.error ?? 'Archive failed' });
			}
		} catch {
			addToast({ type: 'error', message: 'Network error — archive failed' });
		} finally {
			archiving = false;
		}
	}
</script>

<!-- ── Page ──────────────────────────────────────────────────────────────── -->

<div class="space-y-6">

	<!-- Header -->
	<div class="flex items-start justify-between">
		<div>
			<h1 class="text-xl font-semibold text-[var(--dash-text)]">QA Testing</h1>
			<p class="mt-1 text-sm text-[var(--dash-text-muted)]">
				Test scenarios saved from real form fills. Run them against the rule engine to catch regressions.
			</p>
			<!-- Sub-nav tabs -->
			<div class="mt-3 flex gap-1 border-b border-[var(--dash-border-light)]">
				<span class="rounded-t-lg border-b-2 border-violet-600 px-4 py-1.5 text-sm font-medium text-violet-700 dark:text-violet-400">
					Scenarios
				</span>
				<a
					href={ROUTES.DASHBOARD.ADMIN.QA_COVERAGE}
					class="rounded-t-lg px-4 py-1.5 text-sm font-medium text-[var(--dash-text-muted)] hover:text-[var(--dash-text)]"
				>
					Coverage Map
				</a>
			</div>
		</div>
		<div class="flex items-center gap-2">
			<button
				onclick={runAll}
				disabled={runningAll || data.stats.total === 0}
				class="flex items-center gap-2 rounded-lg bg-[var(--dash-btn-bg)] px-4 py-2 text-sm font-medium text-[var(--dash-btn-text)] transition-opacity disabled:opacity-50"
			>
				{#if runningAll}
					<span class="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
					Running…
				{:else}
					<Play size={14} />
					Run All
				{/if}
			</button>
			<!-- Add Scenario: wired in Phase 3 via FormShell "Save as QA Scenario" -->
			<div class="group relative">
				<button
					disabled
					class="flex items-center gap-2 rounded-lg border border-[var(--dash-border-light)] px-4 py-2 text-sm font-medium text-[var(--dash-text-secondary)] opacity-60"
				>
					+ Add Scenario
				</button>
				<div class="pointer-events-none absolute right-0 top-10 z-10 hidden w-64 rounded-lg bg-[var(--dash-bg-card)] p-3 text-xs text-[var(--dash-text-muted)] shadow-lg ring-1 ring-[var(--dash-border-light)] group-hover:block">
					<Info size={12} class="mb-1 inline" />
					Fill any loan form in dev mode, then click "Save as QA Scenario" at the end of the form.
				</div>
			</div>
		</div>
	</div>

	<!-- Stats bar -->
	<div class="grid grid-cols-5 gap-3">
		{#each [
			{ label: 'Total', value: data.stats.total, color: 'text-[var(--dash-text)]' },
			{ label: 'Pass', value: data.stats.pass, color: 'text-emerald-600' },
			{ label: 'Fail', value: data.stats.fail, color: 'text-red-500' },
			{ label: 'Warning', value: data.stats.warning, color: 'text-amber-500' },
			{ label: 'Never run', value: data.stats.neverRun, color: 'text-[var(--dash-text-muted)]' }
		] as stat}
			<div class="rounded-xl bg-[var(--dash-bg-card)] p-4 shadow-sm ring-1 ring-[var(--dash-border-light)]">
				<p class="text-xs text-[var(--dash-text-muted)]">{stat.label}</p>
				<p class="mt-1 text-2xl font-semibold {stat.color}">{stat.value}</p>
			</div>
		{/each}
	</div>

	<!-- Filters -->
	<div class="flex flex-wrap items-center gap-3">
		<select
			bind:value={filterLoanType}
			onchange={applyFilters}
			class="rounded-lg border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] px-3 py-2 text-sm text-[var(--dash-text)] focus:outline-none"
		>
			<option value="">All loan types</option>
			{#each data.filterOptions.loanTypes as lt}
				<option value={lt}>{lt}</option>
			{/each}
		</select>

		<select
			bind:value={filterEmployment}
			onchange={applyFilters}
			class="rounded-lg border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] px-3 py-2 text-sm text-[var(--dash-text)] focus:outline-none"
		>
			<option value="">All employment types</option>
			{#each data.filterOptions.employmentTypes as et}
				<option value={et}>{et}</option>
			{/each}
		</select>

		<select
			bind:value={filterResult}
			onchange={applyFilters}
			class="rounded-lg border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] px-3 py-2 text-sm text-[var(--dash-text)] focus:outline-none"
		>
			<option value="">All results</option>
			<option value="pass">Pass</option>
			<option value="fail">Fail</option>
			<option value="warning">Warning</option>
			<option value="never">Never run</option>
		</select>

		{#if filterLoanType || filterEmployment || filterResult}
			<button
				onclick={clearFilters}
				class="text-sm text-[var(--dash-text-muted)] underline underline-offset-2 hover:text-[var(--dash-text)]"
			>
				Clear filters
			</button>
		{/if}

		<span class="ml-auto text-sm text-[var(--dash-text-muted)]">
			{data.pagination.total} scenario{data.pagination.total !== 1 ? 's' : ''}
		</span>
	</div>

	<!-- Scenario list -->
	{#if data.scenarios.length === 0}
		<div class="rounded-xl bg-[var(--dash-bg-card)] p-12 text-center shadow-sm ring-1 ring-[var(--dash-border-light)]">
			<FlaskConical size={36} class="mx-auto mb-3 text-[var(--dash-text-muted)] opacity-40" />
			<p class="text-sm font-medium text-[var(--dash-text-secondary)]">No scenarios yet</p>
			<p class="mt-1 text-xs text-[var(--dash-text-muted)]">
				Fill a loan form in dev mode and click "Save as QA Scenario" to add the first one.
			</p>
		</div>
	{:else}
		<div class="overflow-hidden rounded-xl bg-[var(--dash-bg-card)] shadow-sm ring-1 ring-[var(--dash-border-light)]">
			{#each data.scenarios as scenario, i}
				<div class="
					flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:gap-4
					{i !== 0 ? 'border-t border-[var(--dash-border-light)]' : ''}
				">
					<!-- Left: name + meta -->
					<div class="min-w-0 flex-1">
						<a
							href="/dashboard/admin/qa/{scenario._id}"
							class="block truncate font-medium text-[var(--dash-text)] hover:text-violet-600 dark:hover:text-violet-400"
							title={scenario.autoName}
						>
							{scenario.autoName}
						</a>

						{#if scenario.testerNote}
							<p class="mt-0.5 truncate text-xs text-[var(--dash-text-muted)]">
								{scenario.testerNote}
							</p>
						{/if}

						<!-- Meta badges -->
						<div class="mt-2 flex flex-wrap gap-1.5">
							<span class="rounded-full bg-[var(--dash-bg-alt)] px-2 py-0.5 text-xs text-[var(--dash-text-secondary)]">
								{scenario.meta.loanType}
							</span>
							<span class="rounded-full bg-[var(--dash-bg-alt)] px-2 py-0.5 text-xs text-[var(--dash-text-secondary)]">
								{scenario.meta.employment}
							</span>
							{#if scenario.meta.city}
								<span class="rounded-full bg-[var(--dash-bg-alt)] px-2 py-0.5 text-xs text-[var(--dash-text-secondary)]">
									{scenario.meta.city}
								</span>
							{/if}
							{#if scenario.meta.cibil > 0}
								<span class="rounded-full bg-[var(--dash-bg-alt)] px-2 py-0.5 text-xs text-[var(--dash-text-secondary)]">
									CIBIL {scenario.meta.cibil}
								</span>
							{/if}
							{#each scenario.meta.tags as tag}
								<span class="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
									{tag}
								</span>
							{/each}
						</div>
					</div>

					<!-- Right: result + actions -->
					<div class="flex shrink-0 items-center gap-3">
						<!-- Last run result badge -->
						<div class="flex items-center gap-1.5 text-xs">
							{#if scenario.lastRunResult === 'pass'}
								<CheckCircle2 size={14} class="text-emerald-500" />
								<span class="text-emerald-600">Pass</span>
							{:else if scenario.lastRunResult === 'fail'}
								<XCircle size={14} class="text-red-500" />
								<span class="text-red-600">Fail</span>
							{:else if scenario.lastRunResult === 'warning'}
								<AlertTriangle size={14} class="text-amber-500" />
								<span class="text-amber-600">Warning</span>
							{:else}
								<Clock size={14} class="text-[var(--dash-text-muted)]" />
								<span class="text-[var(--dash-text-muted)]">Never run</span>
							{/if}
							{#if scenario.lastRunAt}
								<span class="text-[var(--dash-text-muted)]">· {timeAgo(scenario.lastRunAt)}</span>
							{/if}
						</div>

						<!-- Actions -->
						<div class="flex items-center gap-1">
							<button
								onclick={() => runScenario(scenario._id, scenario.autoName)}
								disabled={runningId === scenario._id || runningAll}
								title="Run this scenario"
								class="rounded-lg p-1.5 text-[var(--dash-text-muted)] transition-colors hover:bg-[var(--dash-bg-alt)] hover:text-[var(--dash-text)] disabled:opacity-40"
							>
								{#if runningId === scenario._id}
									<span class="block size-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
								{:else}
									<Play size={15} />
								{/if}
							</button>

							<button
								onclick={() => {
									cloneTarget = { id: scenario._id, name: scenario.autoName };
									cloneCibilOverride = '';
									cloneNote = '';
								}}
								title="Clone this scenario"
								class="rounded-lg p-1.5 text-[var(--dash-text-muted)] transition-colors hover:bg-[var(--dash-bg-alt)] hover:text-[var(--dash-text)]"
							>
								<Copy size={15} />
							</button>

							<button
								onclick={() => archiveTarget = { id: scenario._id, name: scenario.autoName }}
								title="Archive this scenario"
								class="rounded-lg p-1.5 text-[var(--dash-text-muted)] transition-colors hover:bg-[var(--dash-bg-alt)] hover:text-red-500"
							>
								<Archive size={15} />
							</button>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Pagination -->
	{#if data.pagination.totalPages > 1}
		<div class="flex items-center justify-between">
			<p class="text-sm text-[var(--dash-text-muted)]">
				Page {data.pagination.page} of {data.pagination.totalPages}
			</p>
			<div class="flex gap-2">
				{#if data.pagination.page > 1}
					<a
						href="?{new URLSearchParams({ ...data.filters, page: String(data.pagination.page - 1) }).toString()}"
						class="flex items-center gap-1 rounded-lg border border-[var(--dash-border-light)] px-3 py-1.5 text-sm text-[var(--dash-text-secondary)] hover:bg-[var(--dash-bg-alt)]"
					>
						<ChevronLeft size={14} /> Prev
					</a>
				{/if}
				{#if data.pagination.page < data.pagination.totalPages}
					<a
						href="?{new URLSearchParams({ ...data.filters, page: String(data.pagination.page + 1) }).toString()}"
						class="flex items-center gap-1 rounded-lg border border-[var(--dash-border-light)] px-3 py-1.5 text-sm text-[var(--dash-text-secondary)] hover:bg-[var(--dash-bg-alt)]"
					>
						Next <ChevronRight size={14} />
					</a>
				{/if}
			</div>
		</div>
	{/if}

</div>

<!-- ── Clone modal ────────────────────────────────────────────────────────── -->

{#if cloneTarget}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
		<div class="w-full max-w-md rounded-xl bg-[var(--dash-bg-card)] p-6 shadow-xl ring-1 ring-[var(--dash-border-light)]">
			<h2 class="font-semibold text-[var(--dash-text)]">Clone Scenario</h2>
			<p class="mt-1 text-sm text-[var(--dash-text-muted)] line-clamp-2">{cloneTarget.name}</p>

			<div class="mt-4 space-y-3">
				<div>
					<label for="clone-cibil" class="block text-xs font-medium text-[var(--dash-text-secondary)]">
						Override CIBIL score (leave blank to keep original)
					</label>
					<input
						id="clone-cibil"
						type="number"
						bind:value={cloneCibilOverride}
						placeholder="e.g. 620"
						min="300"
						max="900"
						class="mt-1 w-full rounded-lg border border-[var(--dash-border-light)] bg-[var(--dash-bg-alt)] px-3 py-2 text-sm text-[var(--dash-text)] focus:outline-none focus:ring-1 focus:ring-[var(--dash-accent)]"
					/>
				</div>
				<div>
					<label for="clone-note" class="block text-xs font-medium text-[var(--dash-text-secondary)]">
						Note for the cloned scenario (optional)
					</label>
					<input
						id="clone-note"
						type="text"
						bind:value={cloneNote}
						placeholder="e.g. Low CIBIL variant for regression testing"
						class="mt-1 w-full rounded-lg border border-[var(--dash-border-light)] bg-[var(--dash-bg-alt)] px-3 py-2 text-sm text-[var(--dash-text)] focus:outline-none focus:ring-1 focus:ring-[var(--dash-accent)]"
					/>
				</div>
			</div>

			<div class="mt-5 flex justify-end gap-2">
				<button
					onclick={() => cloneTarget = null}
					class="rounded-lg px-4 py-2 text-sm text-[var(--dash-text-secondary)] hover:bg-[var(--dash-bg-alt)]"
				>
					Cancel
				</button>
				<button
					onclick={confirmClone}
					disabled={cloning}
					class="flex items-center gap-2 rounded-lg bg-[var(--dash-btn-bg)] px-4 py-2 text-sm font-medium text-[var(--dash-btn-text)] disabled:opacity-50"
				>
					{#if cloning}
						<span class="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
					{/if}
					Clone
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- ── Archive confirm modal ──────────────────────────────────────────────── -->

{#if archiveTarget}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
		<div class="w-full max-w-sm rounded-xl bg-[var(--dash-bg-card)] p-6 shadow-xl ring-1 ring-[var(--dash-border-light)]">
			<h2 class="font-semibold text-[var(--dash-text)]">Archive Scenario?</h2>
			<p class="mt-2 text-sm text-[var(--dash-text-muted)] line-clamp-3">{archiveTarget.name}</p>
			<p class="mt-2 text-xs text-[var(--dash-text-muted)]">
				Archived scenarios are hidden from the library but not deleted. They can be restored from the database if needed.
			</p>

			<div class="mt-5 flex justify-end gap-2">
				<button
					onclick={() => archiveTarget = null}
					class="rounded-lg px-4 py-2 text-sm text-[var(--dash-text-secondary)] hover:bg-[var(--dash-bg-alt)]"
				>
					Cancel
				</button>
				<button
					onclick={confirmArchive}
					disabled={archiving}
					class="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
				>
					{#if archiving}
						<span class="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
					{/if}
					Archive
				</button>
			</div>
		</div>
	</div>
{/if}
