<script lang="ts">
	import { browser } from '$app/environment';
	import { secureFetch } from '$lib/utils/csrf';
	import StatCard from '$lib/components/dashboard/StatCard.svelte';
	import QuickActions from '$lib/components/dashboard/QuickActions.svelte';
	import {
		UserCircle,
		Activity,
		Clock,
		Trash2,
		Upload,
		ClipboardList,
		CircleCheck
	} from 'lucide-svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	type StatsData = NonNullable<PageData['stats']>;
	type TestingActivity = NonNullable<PageData['testingActivity']>;

	// SSR-loaded data (PERF-1). The page server returns either the data shape
	// or a *Error string per section — UI surfaces the error inline rather than
	// blanking. Seeding mutation (POST below) still goes via secureFetch.
	// svelte-ignore state_referenced_locally
	let stats = $state<StatsData | null>(data.stats);
	// svelte-ignore state_referenced_locally
	let testingActivity = $state<TestingActivity | null>(data.testingActivity);
	// Loading is false on first paint — data already shipped via SSR.
	let loading = $state(false);
	// svelte-ignore state_referenced_locally
	let error = $state(data.statsError ?? '');
	let activeTab = $state<'overview' | 'inactive' | 'deleted'>('overview');
	let seeding = $state(false);
	let seedResult = $state('');

	function formatDate(dateStr: string | null): string {
		if (!dateStr) return 'Never';
		return new Date(dateStr).toLocaleDateString('en-IN', {
			day: '2-digit',
			month: 'short',
			year: 'numeric'
		});
	}

	const roleLabels: Record<string, string> = {
		user: 'Users',
		dsa: 'DSA Agents',
		rm: 'RM Partners'
	};

	const pipelineLabels: Record<string, { label: string; color: string; darkColor: string }> = {
		draft: {
			label: 'Draft',
			color: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-muted)]',
			darkColor: ''
		},
		parsing: {
			label: 'Parsing',
			color: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text)]',
			darkColor: ''
		},
		in_review: {
			label: 'In Review',
			color: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]',
			darkColor: ''
		},
		rm_pending: {
			label: 'RM Pending',
			color: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]',
			darkColor: ''
		},
		approved: {
			label: 'Approved',
			color: 'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)]',
			darkColor: ''
		},
		active: {
			label: 'Active',
			color: 'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)]',
			darkColor: ''
		},
		superseded: {
			label: 'Superseded',
			color: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-muted)]',
			darkColor: ''
		}
	};

	const totalPipelineRules = $derived(
		stats?.pipelineStatus ? Object.values(stats.pipelineStatus).reduce((a, b) => a + b, 0) : 0
	);

	// Quick action config for admin
	const adminQuickActions = $derived([
		{
			label: 'Upload Policy',
			icon: Upload,
			href: '/dashboard/admin/policies/upload',
			primary: true
		},
		{ label: 'Policies', icon: ClipboardList, href: '/dashboard/admin/policies' },
		{ label: 'Approvals', icon: CircleCheck, href: '/dashboard/admin/policies/approvals' },
		{ label: 'RM Profiles', icon: UserCircle, href: '/dashboard/admin/rm-management' },
		{ label: 'Test Rules', icon: '🧪', href: '/dashboard/admin/testing' },
		{ label: 'Audit Log', icon: '📊', href: '/dashboard/admin/audit' },
		{ label: 'User Mgmt', icon: '👥', href: '/dashboard/admin/users' }
	]);

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
				seedResult = `Seeded: ${d.fixtures_inserted ?? 0} fixtures, ${(d.sample_rules_inserted ?? 0) + (d.real_bank_rules_inserted ?? 0)} rules, ${d.lender_entries_inserted ?? 0} lenders, ${d.synthetics_inserted ?? 0} synthetic profiles, ${d.compiled_lenders_inserted ?? 0} compiled lender artifacts`;
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
	<title>Admin: Dashboard | DigitalDSA</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div>
		<h1 class="text-2xl font-bold text-[var(--dash-text)]">Admin Dashboard</h1>
		<p class="mt-1 text-sm text-[var(--dash-text-secondary)]">
			Monitor users, rule pipeline status, and system health
		</p>
	</div>

	{#if loading}
		<div class="flex items-center justify-center py-20">
			<div
				class="h-8 w-8 animate-spin rounded-full border-4 border-[var(--ddsa-accent-500)] border-t-transparent"
			></div>
			<span class="ml-3 text-[var(--dash-text-secondary)]">Loading stats...</span>
		</div>
	{:else}
		<!-- Error banner (compact, doesn't hide the rest of the page) -->
		{#if error}
			<div
				class="rounded-lg bg-[var(--dash-contrast-ghost-bg)] p-4 text-sm text-[var(--dash-contrast-text)]"
			>
				{error}
			</div>
		{/if}

		<!-- Account Summary Cards — only when stats loaded -->
		{#if stats}
			<div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
				<StatCard title="Total Accounts" value={stats.totals.total} icon={UserCircle} />
				<StatCard
					title="Active"
					value={stats.totals.active}
					subtitle="Within 180 days"
					icon={Activity}
				/>
				<StatCard
					title="Inactive"
					value={stats.totals.inactive}
					subtitle="180+ days idle"
					icon={Clock}
				/>
				<StatCard
					title="Deleted"
					value={stats.totals.deleted}
					subtitle="Self-removed"
					icon={Trash2}
				/>
			</div>
		{/if}

		<!-- Quick Actions — always shown after loading -->
		<QuickActions actions={adminQuickActions} />

		<!-- Testing Activity — independent of account stats -->
		<div
			class="rounded-xl bg-[var(--dash-bg-card)] shadow-sm ring-1 ring-[var(--dash-border-light)]"
		>
			<div
				class="flex items-center justify-between border-b border-[var(--dash-border-light)] px-6 py-4"
			>
				<div class="flex items-center gap-3">
					<h2 class="font-semibold text-[var(--dash-text)]">🧪 Testing & QA</h2>
					{#if testingActivity && testingActivity.activeArtifacts.length > 0}
						<span
							class="flex h-2 w-2 animate-pulse rounded-full bg-green-400"
							title="Live testing available"
						></span>
						<span class="text-[12px] font-medium text-[var(--dash-accent-text)]">Live</span>
					{/if}
				</div>
				<div class="flex items-center gap-2">
					<a
						href="/dashboard/admin/testing/e2e-run"
						class="rounded-lg bg-[var(--dash-btn-bg)] px-3.5 py-1.5 text-xs font-semibold text-[var(--dash-btn-text)] shadow-sm transition-all hover:shadow-md hover:brightness-110"
					>
						▶ Run E2E Test
					</a>
					<a
						href="/dashboard/admin/testing"
						class="rounded-lg border border-[var(--dash-border-light)] px-3 py-1.5 text-xs font-medium text-[var(--dash-text-secondary)] transition-colors hover:bg-[var(--dash-hover)]"
					>
						Full Dashboard
					</a>
				</div>
			</div>

			{#if !testingActivity}
				<!-- Empty/failed state for testing -->
				<div class="px-6 py-8 text-center text-sm text-[var(--dash-text-muted)]">
					Testing data unavailable.
					<a
						href="/dashboard/admin/testing"
						class="font-medium text-[var(--ddsa-accent-500)] hover:underline"
					>
						Go to Testing Dashboard
					</a>
				</div>
			{:else if testingActivity.activeArtifacts.length === 0 && testingActivity.fixtureCount === 0}
				<!-- Empty state — prompt to seed -->
				<div class="p-6">
					<div
						class="flex flex-col items-center rounded-xl border-2 border-dashed border-[var(--dash-btn-ghost-border)] bg-[var(--dash-btn-ghost-bg)]/30 p-6 text-center"
					>
						<div
							class="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--dash-btn-bg)] text-xl text-[var(--dash-btn-text)] shadow-lg"
						>
							🧪
						</div>
						<h3 class="text-sm font-bold text-[var(--dash-text)]">No Test Data Yet</h3>
						<p class="mt-1 max-w-sm text-xs text-[var(--dash-text-secondary)]">
							Seed test fixtures and policy rules to start testing your lender eligibility engine
							with realistic data.
						</p>
						<div class="mt-3 flex gap-2">
							<button
								onclick={seedTestData}
								disabled={seeding}
								class="rounded-lg bg-[var(--dash-btn-bg)] px-4 py-2 text-xs font-semibold text-[var(--dash-btn-text)] shadow-sm transition-all hover:shadow-md hover:brightness-110 disabled:opacity-50"
							>
								{seeding ? 'Seeding...' : 'Seed Test Data'}
							</button>
							<a
								href="/dashboard/admin/policies/upload"
								class="rounded-lg border border-[var(--dash-border)] px-4 py-2 text-xs font-medium text-[var(--dash-text-secondary)] transition-colors hover:bg-[var(--dash-hover)]"
							>
								Upload Policy
							</a>
						</div>
						{#if seedResult}
							<p
								class="mt-2 text-xs font-medium {seedResult.includes('error') ||
								seedResult.includes('failed')
									? 'text-[var(--dash-contrast-text)]'
									: 'text-[var(--dash-accent-text)]'}"
							>
								{seedResult}
							</p>
						{/if}
					</div>
				</div>
			{:else}
				<!-- Testing Stats Grid -->
				<div class="grid grid-cols-2 gap-3 p-6 sm:grid-cols-4">
					<a
						href="/dashboard/admin/testing"
						class="group rounded-lg border border-[var(--dash-border-light)] bg-[var(--dash-bg-alt)] p-3 text-center transition-all hover:border-[var(--dash-btn-ghost-border)] hover:shadow-sm"
					>
						<p class="text-2xl font-bold text-[var(--dash-accent-text)]">
							{testingActivity.activeArtifacts.length}
						</p>
						<p
							class="text-[12px] text-[var(--dash-text-muted)] group-hover:text-[var(--dash-accent-text)]"
						>
							Testable Lenders
						</p>
					</a>
					<a
						href="/dashboard/admin/testing"
						class="group rounded-lg border border-[var(--dash-border-light)] bg-[var(--dash-bg-alt)] p-3 text-center transition-all hover:border-[var(--ddsa-accent-500)]/40 hover:shadow-sm"
					>
						<p class="text-2xl font-bold text-[var(--dash-text)]">
							{testingActivity.fixtureCount}
						</p>
						<p class="text-[12px] text-[var(--dash-text-muted)]">Fixture Profiles</p>
					</a>
					<a
						href="/dashboard/admin/testing"
						class="group rounded-lg border border-[var(--dash-border-light)] bg-[var(--dash-bg-alt)] p-3 text-center transition-all hover:border-[var(--ddsa-accent-500)]/40 hover:shadow-sm"
					>
						<p class="text-2xl font-bold text-[var(--dash-text)]">
							{testingActivity.syntheticCount}
						</p>
						<p class="text-[12px] text-[var(--dash-text-muted)]">Synthetic Profiles</p>
					</a>
					<a
						href="/dashboard/admin/testing/e2e-run"
						class="group rounded-lg border border-[var(--dash-border-light)] bg-[var(--dash-bg-alt)] p-3 text-center transition-all hover:border-[var(--dash-btn-ghost-border)] hover:shadow-sm"
					>
						<p class="text-2xl font-bold text-[var(--dash-text)]">
							{testingActivity.recentE2eRuns.length}
						</p>
						<p
							class="text-[12px] text-[var(--dash-text-muted)] group-hover:text-[var(--dash-accent-text)]"
						>
							E2E Runs
						</p>
					</a>
				</div>

				<!-- Quick Test Links -->
				{#if testingActivity.activeArtifacts.length > 0}
					<div class="border-t border-[var(--dash-border-light)] px-6 py-4">
						<p class="mb-2 text-xs font-medium text-[var(--dash-text-muted)]">
							Quick Test — Evaluate Lender Rules
						</p>
						<div class="flex flex-wrap gap-2">
							{#each testingActivity.activeArtifacts.slice(0, 8) as artifact (artifact._id)}
								<a
									href="/dashboard/admin/policies/{artifact._id}/test"
									title="{artifact.productCount} active policy product{artifact.productCount === 1 ? '' : 's'}"
									class="group rounded-lg border border-[var(--dash-border-light)] px-3 py-1.5 text-xs font-medium text-[var(--dash-text-secondary)] transition-all hover:border-[var(--dash-btn-ghost-border)] hover:text-[var(--dash-accent-text)] hover:shadow-sm"
								>
									<span class="mr-1.5 opacity-50 group-hover:opacity-100">🧪</span
									>{artifact.lender_name}
									{#if artifact.productCount > 1}
										<span class="ml-1 text-[var(--dash-text-muted)]"
											>· {artifact.productCount}</span
										>
									{/if}
								</a>
							{/each}
							{#if testingActivity.activeArtifacts.length > 8}
								<a
									href="/dashboard/admin/testing"
									class="rounded-lg border border-[var(--dash-border-light)] px-3 py-1.5 text-xs font-medium text-[var(--dash-text-muted)] transition-colors hover:bg-[var(--dash-hover)]"
								>
									+{testingActivity.activeArtifacts.length - 8} more
								</a>
							{/if}
						</div>
					</div>
				{/if}

				<!-- Recent E2E Runs -->
				{#if testingActivity.recentE2eRuns.length > 0}
					<div class="border-t border-[var(--dash-border-light)] px-6 py-4">
						<div class="mb-2 flex items-center justify-between">
							<p class="text-xs font-medium text-[var(--dash-text-muted)]">Recent E2E Runs</p>
							<a
								href="/dashboard/admin/testing/e2e-run"
								class="text-[12px] font-medium text-[var(--ddsa-accent-500)] hover:underline"
							>
								Run new test →
							</a>
						</div>
						<div class="space-y-1.5">
							{#each testingActivity.recentE2eRuns.slice(0, 5) as run}
								<div
									class="flex items-center justify-between rounded-lg bg-[var(--dash-bg-alt)] px-3 py-2 text-xs"
								>
									<div class="flex items-center gap-3">
										<span
											class="inline-flex rounded-full px-2 py-0.5 text-[12px] font-bold capitalize
											{run.status === 'completed'
												? 'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)]'
												: run.status === 'failed'
													? 'bg-[var(--dash-contrast-ghost-bg)] text-[var(--dash-contrast-text)]'
													: run.status === 'running'
														? 'animate-pulse bg-[var(--dash-bg-alt)] text-[var(--dash-text)]'
														: 'bg-[var(--dash-bg)] text-[var(--dash-text-muted)]'}"
										>
											{run.status}
										</span>
										<span class="font-mono text-[var(--dash-text-secondary)]">{run.profile_id}</span
										>
										<span class="text-[var(--dash-text-muted)]">{run.loan_type}</span>
									</div>
									<div class="flex items-center gap-2">
										{#if run.duration_ms}
											<span class="text-[var(--dash-text-muted)]"
												>{(run.duration_ms / 1000).toFixed(1)}s</span
											>
										{/if}
										<span class="text-[var(--dash-text-muted)]">
											{new Date(run.created_at).toLocaleDateString('en-IN', {
												day: 'numeric',
												month: 'short',
												hour: '2-digit',
												minute: '2-digit'
											})}
										</span>
									</div>
								</div>
							{/each}
						</div>
						{#if testingActivity.recentE2eRuns.length > 5}
							<a
								href="/dashboard/admin/testing/e2e-run"
								class="mt-2 block text-center text-xs font-medium text-[var(--ddsa-accent-500)] hover:underline"
							>
								View all E2E runs →
							</a>
						{/if}
					</div>
				{:else}
					<!-- No E2E runs yet — prompt to run -->
					<div class="border-t border-[var(--dash-border-light)] px-6 py-4">
						<div
							class="flex items-center justify-between rounded-lg border border-dashed border-[var(--dash-btn-ghost-border)] bg-[var(--dash-btn-ghost-bg)]/30 px-4 py-3"
						>
							<div>
								<p class="text-xs font-medium text-[var(--dash-text)]">No E2E test runs yet</p>
								<p class="text-[12px] text-[var(--dash-text-muted)]">
									Run your first end-to-end form fill test with fixture or synthetic data
								</p>
							</div>
							<a
								href="/dashboard/admin/testing/e2e-run"
								class="rounded-lg bg-[var(--dash-btn-bg)] px-3 py-1.5 text-xs font-medium text-[var(--dash-btn-text)] transition-colors hover:brightness-110"
							>
								Start First Run
							</a>
						</div>
					</div>
				{/if}
			{/if}
		</div>

		<!-- Rule Pipeline Status -->
		<div
			class="rounded-xl bg-[var(--dash-bg-card)] shadow-sm ring-1 ring-[var(--dash-border-light)]"
		>
			<div
				class="flex items-center justify-between border-b border-[var(--dash-border-light)] px-6 py-4"
			>
				<div>
					<h2 class="font-semibold text-[var(--dash-text)]">Rule Pipeline Status</h2>
					<p class="mt-0.5 text-xs text-[var(--dash-text-muted)]">
						{totalPipelineRules} total rule artifacts
					</p>
				</div>
				<a
					href="/dashboard/admin/policies"
					class="rounded-lg bg-[var(--dash-btn-ghost-bg)] px-3 py-1.5 text-xs font-medium text-[var(--ddsa-accent-600)] transition-colors hover:bg-[var(--ddsa-primary-200)]"
				>
					View All
				</a>
			</div>

			{#if totalPipelineRules === 0}
				<!-- Empty state: Quick Setup CTA -->
				<div class="p-6">
					<div
						class="flex flex-col items-center rounded-xl border-2 border-dashed border-[var(--ddsa-accent-500)]/30 bg-[var(--dash-btn-ghost-bg)]/30 p-8 text-center"
					>
						<div
							class="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[var(--ddsa-primary-400)] to-[var(--ddsa-accent-500)] text-2xl text-white shadow-lg"
						>
							🚀
						</div>
						<h3 class="text-base font-bold text-[var(--dash-text)]">
							Get Started with Policy Rules
						</h3>
						<p class="mt-1.5 max-w-md text-sm text-[var(--dash-text-secondary)]">
							Populate 77 lender policies (compiled from directory), 10 hand-crafted bank rules, 25
							fixture profiles, and synthetic data for full evaluation testing.
						</p>
						<button
							onclick={seedTestData}
							disabled={seeding}
							class="mt-4 rounded-lg bg-gradient-to-r from-[var(--ddsa-primary-400)] via-[var(--ddsa-accent-500)] to-[var(--ddsa-primary-400)] px-6 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg hover:brightness-110 disabled:opacity-50"
						>
							{seeding ? 'Seeding...' : 'Seed Test Data'}
						</button>
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
					</div>
				</div>
			{:else}
				<div class="grid grid-cols-2 gap-3 p-6 sm:grid-cols-3 lg:grid-cols-7">
					{#each Object.entries(pipelineLabels) as [key, meta]}
						{@const count = stats?.pipelineStatus?.[key] ?? 0}
						<a
							href="/dashboard/admin/policies?status={key}"
							class="group rounded-lg border border-[var(--dash-border-light)] bg-[var(--dash-bg-alt)] p-3 text-center transition-all hover:border-[var(--ddsa-accent-500)]/40 hover:shadow-sm"
						>
							<p
								class="text-2xl font-bold text-[var(--dash-text)] transition-colors group-hover:text-[var(--ddsa-accent-600)]"
							>
								{count}
							</p>
							<span
								class="mt-1 inline-flex rounded-full px-2 py-0.5 text-[12px] font-medium {meta.color} {meta.darkColor}"
							>
								{meta.label}
							</span>
						</a>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Role Breakdown + User Tables — only when stats loaded -->
		{#if stats}
			<div
				class="rounded-xl bg-[var(--dash-bg-card)] shadow-sm ring-1 ring-[var(--dash-border-light)]"
			>
				<div class="border-b border-[var(--dash-border-light)] px-6 py-4">
					<h2 class="font-semibold text-[var(--dash-text)]">Breakdown by Role</h2>
				</div>
				<div class="overflow-x-auto">
					<table class="w-full text-sm">
						<thead>
							<tr class="border-b border-[var(--dash-border-light)] bg-[var(--dash-bg-alt)]">
								<th class="px-6 py-3 text-left font-medium text-[var(--dash-text-secondary)]"
									>Role</th
								>
								<th class="px-6 py-3 text-center font-medium text-[var(--dash-text-secondary)]"
									>Total</th
								>
								<th class="px-6 py-3 text-center font-medium text-[var(--dash-accent-text)]"
									>Active</th
								>
								<th class="px-6 py-3 text-center font-medium text-[var(--dash-text-secondary)]"
									>Inactive</th
								>
								<th class="px-6 py-3 text-center font-medium text-[var(--dash-contrast-text)]"
									>Deleted</th
								>
							</tr>
						</thead>
						<tbody>
							{#each Object.entries(stats.summary) as [key, role]}
								<tr
									class="border-b border-[var(--dash-border-light)] transition-colors hover:bg-[var(--dash-hover)]"
								>
									<td class="px-6 py-3 font-medium text-[var(--dash-text)]"
										>{roleLabels[key] ?? key}</td
									>
									<td class="px-6 py-3 text-center text-[var(--dash-text-secondary)]"
										>{role.total}</td
									>
									<td class="px-6 py-3 text-center">
										<span
											class="inline-flex rounded-full bg-[var(--dash-btn-ghost-bg)] px-2.5 py-0.5 text-xs font-medium text-[var(--dash-accent-text)]"
											>{role.active}</span
										>
									</td>
									<td class="px-6 py-3 text-center">
										<span
											class="inline-flex rounded-full bg-[var(--dash-bg-alt)] px-2.5 py-0.5 text-xs font-medium text-[var(--dash-text-secondary)]"
											>{role.inactive}</span
										>
									</td>
									<td class="px-6 py-3 text-center">
										<span
											class="inline-flex rounded-full bg-[var(--dash-contrast-ghost-bg)] px-2.5 py-0.5 text-xs font-medium text-[var(--dash-contrast-text)]"
											>{role.deleted}</span
										>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>

			<!-- Tabs: Inactive / Deleted -->
			<div
				class="rounded-xl bg-[var(--dash-bg-card)] shadow-sm ring-1 ring-[var(--dash-border-light)]"
			>
				<div class="flex border-b border-[var(--dash-border-light)]">
					<button
						onclick={() => (activeTab = 'inactive')}
						class="px-6 py-3 text-sm font-medium transition-colors {activeTab === 'inactive'
							? 'border-b-2 border-[var(--dash-border)] text-[var(--dash-text)]'
							: 'text-[var(--dash-text-secondary)] hover:text-[var(--dash-text)]'}"
					>
						Inactive Users ({stats.inactiveUsers.length})
					</button>
					<button
						onclick={() => (activeTab = 'deleted')}
						class="px-6 py-3 text-sm font-medium transition-colors {activeTab === 'deleted'
							? 'border-b-2 border-[var(--dash-contrast-ghost-border)] text-[var(--dash-contrast-text)]'
							: 'text-[var(--dash-text-secondary)] hover:text-[var(--dash-text)]'}"
					>
						Recent Deletions ({stats.recentDeletions.length})
					</button>
				</div>

				<div class="overflow-x-auto">
					{#if activeTab === 'inactive'}
						{#if stats.inactiveUsers.length === 0}
							<div class="px-6 py-10 text-center text-[var(--dash-text-muted)]">
								No inactive users found. All users are active!
							</div>
						{:else}
							<table class="w-full text-sm">
								<thead>
									<tr class="border-b border-[var(--dash-border-light)] bg-[var(--dash-bg-alt)]">
										<th class="px-6 py-3 text-left font-medium text-[var(--dash-text-secondary)]"
											>Name</th
										>
										<th class="px-6 py-3 text-left font-medium text-[var(--dash-text-secondary)]"
											>Mobile</th
										>
										<th class="px-6 py-3 text-left font-medium text-[var(--dash-text-secondary)]"
											>Role</th
										>
										<th class="px-6 py-3 text-left font-medium text-[var(--dash-text-secondary)]"
											>Last Active</th
										>
									</tr>
								</thead>
								<tbody>
									{#each stats.inactiveUsers as user}
										<tr
											class="border-b border-[var(--dash-border-light)] hover:bg-[var(--dash-hover)]"
										>
											<td class="px-6 py-3 font-medium text-[var(--dash-text)]">{user.name}</td>
											<td class="px-6 py-3 text-[var(--dash-text-secondary)]"
												>{user.mobileNumber}</td
											>
											<td class="px-6 py-3">
												<span
													class="inline-flex rounded-full bg-[var(--dash-bg-alt)] px-2.5 py-0.5 text-xs font-medium text-[var(--dash-text-secondary)]"
													>{user.role}</span
												>
											</td>
											<td class="px-6 py-3 text-[var(--dash-text-secondary)]"
												>{formatDate(user.lastActiveAt)}</td
											>
										</tr>
									{/each}
								</tbody>
							</table>
						{/if}
					{:else if activeTab === 'deleted'}
						{#if stats.recentDeletions.length === 0}
							<div class="px-6 py-10 text-center text-[var(--dash-text-muted)]">
								No recent deletions in the last 30 days.
							</div>
						{:else}
							<table class="w-full text-sm">
								<thead>
									<tr class="border-b border-[var(--dash-border-light)] bg-[var(--dash-bg-alt)]">
										<th class="px-6 py-3 text-left font-medium text-[var(--dash-text-secondary)]"
											>Name</th
										>
										<th class="px-6 py-3 text-left font-medium text-[var(--dash-text-secondary)]"
											>Mobile</th
										>
										<th class="px-6 py-3 text-left font-medium text-[var(--dash-text-secondary)]"
											>Role</th
										>
										<th class="px-6 py-3 text-left font-medium text-[var(--dash-text-secondary)]"
											>Deleted On</th
										>
									</tr>
								</thead>
								<tbody>
									{#each stats.recentDeletions as user}
										<tr
											class="border-b border-[var(--dash-border-light)] hover:bg-[var(--dash-hover)]"
										>
											<td class="px-6 py-3 font-medium text-[var(--dash-text)]">{user.name}</td>
											<td class="px-6 py-3 text-[var(--dash-text-secondary)]"
												>{user.mobileNumber}</td
											>
											<td class="px-6 py-3">
												<span
													class="inline-flex rounded-full bg-[var(--dash-contrast-ghost-bg)] px-2.5 py-0.5 text-xs font-medium text-[var(--dash-contrast-text)]"
													>{user.role}</span
												>
											</td>
											<td class="px-6 py-3 text-[var(--dash-text-secondary)]"
												>{formatDate(user.deletedAt)}</td
											>
										</tr>
									{/each}
								</tbody>
							</table>
						{/if}
					{/if}
				</div>
			</div>
		{/if}
	{/if}
</div>
