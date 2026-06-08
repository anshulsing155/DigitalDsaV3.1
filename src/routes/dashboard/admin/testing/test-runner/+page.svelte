<script lang="ts">
	/**
	 * Admin Test Runner — /dashboard/admin/testing/test-runner
	 * ═══════════════════════════════════════════════════════════════
	 * Visual, button-driven test runner. No CLI needed.
	 * Cards for each test type with live progress polling.
	 *
	 * After PERF-3 Phase A: per-card state and polling lives inside
	 * `_components/TestCard.svelte`. This page now does layout + the
	 * run-history table only.
	 * ═══════════════════════════════════════════════════════════════
	 */

	import type { PageData } from './$types';
	import TestCard from './_components/TestCard.svelte';
	import { statusColor, statusLabel, formatDuration } from './_components/testRunnerHelpers';

	let { data }: { data: PageData } = $props();

	// ── Test type metadata ────────────────────────────────────
	const TEST_TYPES = [
		{
			id: 'selector-health' as const,
			label: 'Selector Health',
			description:
				'Verify all Playwright selectors resolve to DOM elements. Catches renamed IDs, removed buttons, changed aria-labels.',
			estimate: '~30s',
			needsProfile: false,
			icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z'
		},
		{
			id: 'accessibility' as const,
			label: 'Accessibility Baseline',
			description:
				'Capture DOM structure snapshots and diff against baseline. Detects structural regressions.',
			estimate: '~2min',
			needsProfile: false,
			icon: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z'
		},
		{
			id: 'form-fill' as const,
			label: 'E2E Form Fill',
			description:
				'Fill a complete loan form using fixture/synthetic profile data. Tests all schema pages + custom components.',
			estimate: '~3-5min',
			needsProfile: true,
			icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
		},
		{
			id: 'applicant-stage' as const,
			label: 'Applicant Stage (Stage 1)',
			description:
				'Navigates to each loan form via the shortest route, fills minimum schema pages, then adds an Individual applicant. Runs all 6 loan types.',
			estimate: '~2-3min',
			needsProfile: false,
			icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
		},
		{
			id: 'full-path' as const,
			label: 'Full Path (Stage 2)',
			description: 'Loads Stage 1 applicant state and fills remaining pages. Run Stage 1 first.',
			estimate: '~3-5min',
			needsProfile: false,
			icon: 'M13 10V3L4 14h7v7l9-11h-7z'
		},
		{
			id: 'unit-tests' as const,
			label: 'Unit Tests (Vitest)',
			description:
				'Run the full Vitest suite (9,000+ tests). Results saved for the Testing Dashboard health panel.',
			estimate: '~2-4min',
			needsProfile: false,
			icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4'
		}
	] as const;

	// ── Global controls ──────────────────────────────────────
	let headed = $state(true);

	// ── Run History filter ────────────────────────────────────
	let historyFilter = $state('all');

	let filteredRuns = $derived(
		historyFilter === 'all'
			? data.recentRuns
			: data.recentRuns.filter((r) => r.test_type === historyFilter)
	);

	function testTypeLabel(tt: string): string {
		return TEST_TYPES.find((t) => t.id === tt)?.label ?? tt;
	}
</script>

<svelte:head>
	<title>Admin: Test Runner | DigitalDSA</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-xl font-bold text-[var(--dash-text)]">Test Runner</h1>
			<p class="mt-1 text-sm text-[var(--dash-text-secondary)]">
				Run all tests visually — no CLI needed. Click a button, watch progress.
			</p>
		</div>
		<div class="flex gap-2">
			<a
				href="/dashboard/admin/testing/e2e-run"
				class="rounded-lg border border-[var(--dash-border)] px-3 py-1.5 text-xs font-medium text-[var(--dash-text-secondary)] transition-colors hover:bg-[var(--dash-hover)]"
			>
				E2E Detail View
			</a>
			<a
				href="/dashboard/admin/testing"
				class="rounded-lg border border-[var(--dash-border)] px-3 py-1.5 text-xs font-medium text-[var(--dash-text-secondary)] transition-colors hover:bg-[var(--dash-hover)]"
			>
				Back to Testing
			</a>
		</div>
	</div>

	<!-- Global Controls -->
	<div
		class="flex flex-wrap items-center gap-4 rounded-xl border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] p-4 shadow-sm"
	>
		<label
			class="flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--dash-border-light)] px-3 py-2 transition-colors hover:bg-[var(--dash-hover)]"
		>
			<input
				type="checkbox"
				bind:checked={headed}
				class="h-4 w-4 rounded border-[var(--dash-border-light)] text-[var(--ddsa-accent-500)] accent-[var(--ddsa-accent-500)]"
			/>
			<span class="text-xs font-medium text-[var(--dash-text-secondary)]">Show browser</span>
			<span class="text-[12px] text-[var(--dash-text-muted)]">
				{headed ? '(visible window)' : '(headless)'}
			</span>
		</label>
		<span class="text-[12px] text-[var(--dash-text-muted)]">
			Applies to Playwright-based tests
		</span>
	</div>

	<!-- Test Category Cards -->
	<div class="grid gap-4 lg:grid-cols-2">
		{#each TEST_TYPES as testType (testType.id)}
			<TestCard
				{testType}
				lastRun={data.lastRunByType[testType.id]}
				{headed}
				fixtures={data.fixtures}
				synthetics={data.synthetics}
			/>
		{/each}
	</div>

	<!-- Run History -->
	{#if data.recentRuns.length > 0}
		<div
			class="rounded-xl border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] p-5 shadow-sm"
		>
			<div class="mb-4 flex items-center justify-between">
				<h2 class="text-sm font-bold tracking-wider text-[var(--dash-text-muted)] uppercase">
					Run History
				</h2>
				<select
					bind:value={historyFilter}
					class="rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg)] px-2 py-1 text-[12px] text-[var(--dash-text)] focus:border-[var(--ddsa-accent-500)] focus:outline-none"
				>
					<option value="all">All Types</option>
					{#each TEST_TYPES as tt}
						<option value={tt.id}>{tt.label}</option>
					{/each}
				</select>
			</div>

			<div class="max-h-[480px] overflow-auto">
				<table class="w-full text-sm">
					<thead>
						<tr
							class="sticky top-0 border-b border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] text-left text-xs font-medium tracking-wider text-[var(--dash-text-muted)] uppercase"
						>
							<th class="px-3 py-2">Date</th>
							<th class="px-3 py-2">Test Type</th>
							<th class="px-3 py-2">Profile</th>
							<th class="px-3 py-2">Status</th>
							<th class="px-3 py-2">Duration</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-[var(--dash-border-light)]">
						{#each filteredRuns as run}
							<tr class="transition-colors hover:bg-[var(--dash-hover)]">
								<td class="px-3 py-2 text-xs text-[var(--dash-text-muted)]">
									{new Date(run.created_at).toLocaleDateString('en-IN', {
										day: 'numeric',
										month: 'short',
										hour: '2-digit',
										minute: '2-digit'
									})}
								</td>
								<td class="px-3 py-2">
									<span
										class="rounded bg-[var(--dash-bg-alt)] px-1.5 py-0.5 text-[12px] font-medium text-[var(--dash-text-secondary)]"
									>
										{testTypeLabel(run.test_type)}
									</span>
								</td>
								<td class="px-3 py-2 font-mono text-xs text-[var(--dash-text)]">
									{run.profile_id || '-'}
								</td>
								<td class="px-3 py-2">
									<span
										class="inline-block rounded-full px-2 py-0.5 text-[12px] font-bold capitalize {statusColor(
											run.status
										)}"
									>
										{statusLabel(run.status)}
									</span>
								</td>
								<td class="px-3 py-2 text-xs text-[var(--dash-text-muted)]">
									{formatDuration(run.duration_ms)}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			{#if filteredRuns.length === 0}
				<p class="py-6 text-center text-xs text-[var(--dash-text-muted)]">
					No runs found for this filter.
				</p>
			{/if}
		</div>
	{/if}
</div>
