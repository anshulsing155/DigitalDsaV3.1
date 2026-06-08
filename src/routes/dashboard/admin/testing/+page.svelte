<script lang="ts">
	/**
	 * Admin Testing Dashboard — /dashboard/admin/testing
	 * ═══════════════════════════════════════════════════════════════════
	 * Read-only overview of test health, fixture profiles, synthetic
	 * data, and quick actions for rule testing.
	 * ═══════════════════════════════════════════════════════════════════
	 */

	import type { PageData } from './$types';
	import { browser } from '$app/environment';
	import { secureFetch } from '$lib/utils/csrf';

	let { data }: { data: PageData } = $props();

	let seeding = $state(false);
	let seedResult = $state('');
	let seedingSynthetics = $state(false);
	let syntheticSeedResult = $state('');

	async function seedFixtures() {
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
				seedResult = `Seeded: ${d.fixtures_inserted ?? 0} fixtures, ${(d.sample_rules_inserted ?? 0) + (d.real_bank_rules_inserted ?? 0)} rules, ${d.lender_entries_inserted ?? 0} lenders, ${d.synthetics_inserted ?? 0} synthetic profiles, ${d.compiled_lenders_inserted ?? 0} compiled lender artifacts`;
				setTimeout(() => { if (browser) window.location.reload(); }, 1500);
			} else {
				seedResult = result.error || 'Seed failed';
			}
		} catch {
			seedResult = 'Network error';
		} finally {
			seeding = false;
		}
	}

	async function seedSynthetics() {
		seedingSynthetics = true;
		syntheticSeedResult = '';
		try {
			const res = await secureFetch('/api/admin/policy-engine/seed', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ synthetics: true })
			});
			const result = await res.json();
			if (result.success) {
				syntheticSeedResult = `Seeded successfully. Synthetics: ${result.data?.synthetics?.inserted ?? 0} inserted, ${result.data?.synthetics?.skipped ?? 0} skipped.`;
				setTimeout(() => { if (browser) window.location.reload(); }, 1500);
			} else {
				syntheticSeedResult = result.error || 'Seed failed';
			}
		} catch {
			syntheticSeedResult = 'Network error';
		} finally {
			seedingSynthetics = false;
		}
	}
</script>

<svelte:head>
	<title>Admin: Testing | DigitalDSA</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div>
		<h1 class="text-xl font-bold text-[var(--dash-text)]">Testing Dashboard</h1>
		<p class="mt-1 text-sm text-[var(--dash-text-secondary)]">
			Test health, fixture profiles, and synthetic data overview
		</p>
	</div>

	<!-- Section 1: Test Health Summary -->
	<div
		class="rounded-xl border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] p-5 shadow-sm"
	>
		<h2 class="mb-4 text-sm font-bold tracking-wider text-[var(--dash-text-muted)] uppercase">
			Test Health
		</h2>

		{#if data.testHealth.available}
			<div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
				<div class="rounded-lg bg-[var(--dash-bg-alt)] p-3 text-center">
					<p class="text-2xl font-bold text-[var(--dash-text)]">
						{data.testHealth.totalTests?.toLocaleString('en-IN')}
					</p>
					<p class="text-xs text-[var(--dash-text-muted)]">Total Tests</p>
				</div>
				<div class="rounded-lg bg-[var(--dash-btn-ghost-bg)] p-3 text-center">
					<p class="text-2xl font-bold text-[var(--dash-accent-text)]">
						{data.testHealth.passedTests?.toLocaleString('en-IN')}
					</p>
					<p class="text-xs text-[var(--dash-text-muted)]">Passed</p>
				</div>
				<div
					class="rounded-lg p-3 text-center {(data.testHealth.failedTests ?? 0) > 0
						? 'bg-[var(--dash-contrast-ghost-bg)]'
						: 'bg-[var(--dash-bg-alt)]'}"
				>
					<p
						class="text-2xl font-bold {(data.testHealth.failedTests ?? 0) > 0
							? 'text-[var(--dash-contrast-text)]'
							: 'text-[var(--dash-text)]'}"
					>
						{data.testHealth.failedTests ?? 0}
					</p>
					<p class="text-xs text-[var(--dash-text-muted)]">Failed</p>
				</div>
				<div class="rounded-lg bg-[var(--dash-bg-alt)] p-3 text-center">
					<p class="text-sm font-medium text-[var(--dash-text-secondary)]">
						{data.testHealth.lastRun
							? new Date(data.testHealth.lastRun).toLocaleDateString('en-IN', {
									day: 'numeric',
									month: 'short',
									hour: '2-digit',
									minute: '2-digit'
								})
							: 'Unknown'}
					</p>
					<p class="text-xs text-[var(--dash-text-muted)]">Last Run</p>
				</div>
			</div>
		{:else}
			<div class="rounded-lg bg-[var(--dash-bg-alt)] px-4 py-6 text-center">
				<p class="text-sm text-[var(--dash-text-secondary)]">No test results found</p>
				<p class="mt-1 text-xs text-[var(--dash-text-muted)]">
					Run <code class="rounded bg-[var(--dash-bg)] px-1.5 py-0.5 font-mono text-[12px]"
						>pnpm test:unit</code
					> locally to generate results
				</p>
			</div>
		{/if}
	</div>

	<!-- Section 2: Fixture Profiles -->
	<div
		class="rounded-xl border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] p-5 shadow-sm"
	>
		<div class="mb-4 flex items-center justify-between">
			<h2 class="text-sm font-bold tracking-wider text-[var(--dash-text-muted)] uppercase">
				Fixture Profiles
				<span class="ml-1 rounded-full bg-[var(--dash-bg-alt)] px-1.5 py-0.5 text-[12px] font-bold"
					>{data.fixtures.length}</span
				>
			</h2>
		</div>

		{#if data.fixtures.length > 0}
			<div class="max-h-[480px] overflow-auto">
				<table class="w-full text-sm">
					<thead>
						<tr
							class="sticky top-0 border-b border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] text-left text-xs font-medium tracking-wider text-[var(--dash-text-muted)] uppercase"
						>
							<th class="px-3 py-2">ID</th>
							<th class="px-3 py-2">Name</th>
							<th class="px-3 py-2">Loan Type</th>
							<th class="px-3 py-2">Employment</th>
							<th class="px-3 py-2">Action</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-[var(--dash-border-light)]">
						{#each data.fixtures as fixture (fixture._id)}
							<tr class="transition-colors hover:bg-[var(--dash-hover)]">
								<td class="px-3 py-2 font-mono text-xs text-[var(--dash-text-muted)]"
									>{fixture.fixture_id}</td
								>
								<td class="px-3 py-2">
									<p class="font-medium text-[var(--dash-text)]">{fixture.name}</p>
									<p class="text-[13px] text-[var(--dash-text-muted)]">{fixture.description}</p>
								</td>
								<td class="px-3 py-2 text-xs text-[var(--dash-text-secondary)]"
									>{fixture.loan_type}</td
								>
								<td class="px-3 py-2 text-xs text-[var(--dash-text-secondary)]"
									>{fixture.employment_type}</td
								>
								<td class="px-3 py-2">
									{#if data.artifactLinks.length === 1}
										<a
											href="/dashboard/admin/policies/{data.artifactLinks[0]._id}/test"
											class="rounded-lg border border-[var(--dash-border)] px-2 py-1 text-[12px] font-medium text-[var(--ddsa-accent-500)] transition-colors hover:bg-[var(--dash-hover)]"
										>
											Test
										</a>
									{:else if data.artifactLinks.length > 1}
										<details class="relative">
											<summary
												class="cursor-pointer rounded-lg border border-[var(--dash-border)] px-2 py-1 text-[12px] font-medium text-[var(--ddsa-accent-500)] transition-colors hover:bg-[var(--dash-hover)]"
											>
												Test ({data.artifactLinks.length})
											</summary>
											<div
												class="absolute right-0 z-10 mt-1 max-h-48 w-48 overflow-auto rounded-lg border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] p-1 shadow-lg"
											>
												{#each data.artifactLinks as link}
													<a
														href="/dashboard/admin/policies/{link._id}/test"
														class="block rounded px-3 py-1.5 text-xs text-[var(--dash-text)] transition-colors hover:bg-[var(--dash-hover)]"
													>
														{link.lender_name}
													</a>
												{/each}
											</div>
										</details>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else}
			<div class="rounded-lg bg-[var(--dash-bg-alt)] px-4 py-6 text-center">
				<p class="text-sm text-[var(--dash-text-secondary)]">No fixture profiles seeded yet</p>
				<button
					onclick={seedFixtures}
					disabled={seeding}
					class="mt-2 rounded-lg bg-[var(--ddsa-accent-500)] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[var(--ddsa-accent-600)] disabled:opacity-50"
				>
					{seeding ? 'Seeding...' : 'Seed All Test Data'}
				</button>
			</div>
		{/if}
	</div>

	<!-- Section 3: Synthetic Profiles -->
	<div
		class="rounded-xl border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] p-5 shadow-sm"
	>
		<h2 class="mb-4 text-sm font-bold tracking-wider text-[var(--dash-text-muted)] uppercase">
			Synthetic Profiles
			<span class="ml-1 rounded-full bg-[var(--dash-bg-alt)] px-1.5 py-0.5 text-[12px] font-bold"
				>{data.syntheticTotal}</span
			>
		</h2>

		{#if data.syntheticSummary.length > 0}
			<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
				{#each data.syntheticSummary as group}
					<div
						class="rounded-lg border border-[var(--dash-border-light)] bg-[var(--dash-bg-alt)] p-3"
					>
						<p class="text-sm font-semibold text-[var(--dash-text)]">{group.loan_type}</p>
						<div class="mt-1 flex items-center justify-between">
							<span class="text-lg font-bold text-[var(--ddsa-accent-500)]">{group.count}</span>
							{#if group.latest}
								<span class="text-[12px] text-[var(--dash-text-muted)]">
									{new Date(group.latest).toLocaleDateString('en-IN', {
										day: 'numeric',
										month: 'short'
									})}
								</span>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<div class="rounded-lg bg-[var(--dash-bg-alt)] px-4 py-6 text-center">
				<p class="text-sm text-[var(--dash-text-secondary)]">No synthetic profiles seeded yet</p>
				<button
					onclick={seedSynthetics}
					disabled={seedingSynthetics}
					class="mt-2 rounded-lg bg-[var(--ddsa-accent-500)] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[var(--ddsa-accent-600)] disabled:opacity-50"
				>
					{seedingSynthetics ? 'Seeding...' : 'Seed 500 Synthetic Profiles'}
				</button>
			</div>
		{/if}

		{#if syntheticSeedResult}
			<p
				class="mt-3 text-xs font-medium {syntheticSeedResult.includes('error') ||
				syntheticSeedResult.includes('failed')
					? 'text-[var(--dash-contrast-text)]'
					: 'text-[var(--dash-accent-text)]'}"
			>
				{syntheticSeedResult}
			</p>
		{/if}
	</div>

	<!-- Section 4: Quick Actions -->
	<div
		class="rounded-xl border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] p-5 shadow-sm"
	>
		<h2 class="mb-4 text-sm font-bold tracking-wider text-[var(--dash-text-muted)] uppercase">
			Quick Actions
		</h2>

		<div class="flex flex-wrap gap-3">
			<a
				href="/dashboard/admin/testing/test-runner"
				class="rounded-lg border border-[var(--ddsa-accent-500)] bg-[var(--ddsa-accent-500)]/10 px-4 py-2.5 text-sm font-medium text-[var(--ddsa-accent-600)] transition-colors hover:bg-[var(--ddsa-accent-500)]/20 dark:text-[var(--ddsa-accent-400)]"
			>
				Test Runner
			</a>

			<a
				href="/dashboard/admin/testing/e2e-run"
				class="rounded-lg border border-[var(--ddsa-accent-500)] bg-[var(--ddsa-accent-500)]/10 px-4 py-2.5 text-sm font-medium text-[var(--ddsa-accent-600)] transition-colors hover:bg-[var(--ddsa-accent-500)]/20 dark:text-[var(--ddsa-accent-400)]"
			>
				E2E Form Fill
			</a>

			<button
				onclick={seedFixtures}
				disabled={seeding}
				class="rounded-lg border border-[var(--dash-border)] px-4 py-2.5 text-sm font-medium text-[var(--dash-text-secondary)] transition-colors hover:bg-[var(--dash-hover)] disabled:opacity-50"
			>
				{seeding ? 'Seeding...' : 'Seed All Test Data'}
			</button>

			<button
				onclick={seedSynthetics}
				disabled={seedingSynthetics}
				class="rounded-lg border border-[var(--dash-border)] px-4 py-2.5 text-sm font-medium text-[var(--dash-text-secondary)] transition-colors hover:bg-[var(--dash-hover)] disabled:opacity-50"
			>
				{seedingSynthetics ? 'Seeding...' : 'Seed Synthetic Profiles'}
			</button>

			{#if data.artifactLinks.length > 0}
				{#each data.artifactLinks.slice(0, 5) as link}
					<a
						href="/dashboard/admin/policies/{link._id}/test"
						class="rounded-lg border border-[var(--dash-border)] px-4 py-2.5 text-sm font-medium text-[var(--dash-text-secondary)] transition-colors hover:bg-[var(--dash-hover)]"
					>
						Test {link.lender_name}
					</a>
				{/each}
				{#if data.artifactLinks.length > 5}
					<a
						href="/dashboard/admin/policies"
						class="rounded-lg border border-[var(--dash-border)] px-4 py-2.5 text-sm font-medium text-[var(--dash-text-muted)] transition-colors hover:bg-[var(--dash-hover)]"
					>
						+{data.artifactLinks.length - 5} more
					</a>
				{/if}
			{/if}

			<a
				href="/dashboard/admin/policies"
				class="rounded-lg border border-[var(--dash-border)] px-4 py-2.5 text-sm font-medium text-[var(--dash-text-secondary)] transition-colors hover:bg-[var(--dash-hover)]"
			>
				Policy Dashboard
			</a>
		</div>

		{#if seedResult}
			<p
				class="mt-3 text-xs font-medium {seedResult.includes('error') ||
				seedResult.includes('failed')
					? 'text-[var(--dash-contrast-text)]'
					: 'text-[var(--dash-accent-text)]'}"
			>
				{seedResult}
			</p>
		{/if}

		<!-- Summary Stats -->
		<div class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
			<div class="rounded-lg bg-[var(--dash-bg-alt)] p-3 text-center">
				<p class="text-lg font-bold text-[var(--dash-text)]">{data.fixtures.length}</p>
				<p class="text-[12px] text-[var(--dash-text-muted)]">Fixture Profiles</p>
			</div>
			<div class="rounded-lg bg-[var(--dash-bg-alt)] p-3 text-center">
				<p class="text-lg font-bold text-[var(--dash-text)]">{data.syntheticTotal}</p>
				<p class="text-[12px] text-[var(--dash-text-muted)]">Synthetic Profiles</p>
			</div>
			<div class="rounded-lg bg-[var(--dash-bg-alt)] p-3 text-center">
				<p class="text-lg font-bold text-[var(--dash-text)]">{data.activeRuleCount}</p>
				<p class="text-[12px] text-[var(--dash-text-muted)]">Active Policy Rules</p>
			</div>
		</div>
	</div>
</div>
