<script lang="ts">
	import type { PageData } from './$types';
	import {
		Building2,
		CheckCircle,
		AlertTriangle,
		ChevronRight,
		Clock,
		Plus,
		Search
	} from 'lucide-svelte';
	import { t, formatTimeAgo } from '$lib/i18n';
	import {
		filterAssignments,
		sortAssignments,
		type SortMode,
		type PolicyLibraryAssignment
	} from '$lib/utils/policyLibraryFilter';

	let { data }: { data: PageData } = $props();

	// C.2 — client-side search / type filter / sort. 78 lenders fits
	// comfortably in memory; no server round-trip needed.
	let searchQuery = $state('');
	let typeFilter = $state('');
	let sortBy = $state<SortMode>('recent');

	const filteredSorted = $derived(
		sortAssignments(
			filterAssignments(data.assignments as PolicyLibraryAssignment[], {
				query: searchQuery,
				type: typeFilter
			}),
			sortBy
		)
	);

	const activeAssignments = $derived(filteredSorted.filter((a) => a.status === 'active'));
	const suspendedAssignments = $derived(filteredSorted.filter((a) => a.status === 'suspended'));
	const pendingAssignments = $derived(
		filteredSorted.filter((a) => a.status === 'pending_verification')
	);

	// Distinct classifications across the FULL list (not filteredSorted) so the
	// dropdown doesn't churn as the user narrows. "" = all.
	const availableTypes = $derived.by(() => {
		const set = new Set<string>();
		for (const a of data.assignments) {
			if (a.lenderClassification) set.add(a.lenderClassification);
		}
		return Array.from(set).sort();
	});

	const filterActive = $derived(searchQuery.trim() !== '' || typeFilter !== '');
	const noMatch = $derived(filterActive && filteredSorted.length === 0);

	// Strict one-lender rule (2026-05-31): an RM holds exactly one lender at
	// any point in time (admin transfer is the legitimate switch mechanism).
	// Active assignment → hide "Add Lender" CTA; pending/no assignment → keep
	// it so the first onboarding can still happen.
	const hasActiveAssignment = $derived(
		data.assignments.some((a) => a.status === 'active')
	);

	function verifiedBadge(assignment: PolicyLibraryAssignment): string {
		if (!assignment.lastVerifiedAt) return t('policy_library.badge_not_yet');
		const ago = formatTimeAgo(new Date(assignment.lastVerifiedAt));
		return t('policy_library.badge_verified', { timeAgo: ago });
	}
</script>

<svelte:head>
	<title>Policy Library — DigitalDSA RM</title>
</svelte:head>

<div class="mx-auto max-w-4xl space-y-6 p-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold text-[var(--dash-text-primary)]">Policy Library</h1>
			<p class="mt-1 text-sm text-[var(--dash-text-muted)]">
				Manage your lender assignments and policy documents
			</p>
		</div>
		{#if hasActiveAssignment}
			<!-- Strict one-lender: surface the assignment state instead of
			     an Add CTA. Admin transfer is the legitimate switch path. -->
			<span
				class="inline-flex items-center gap-2 rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-alt)] px-3 py-1.5 text-xs font-medium text-[var(--dash-text-muted)]"
				title="An RM holds exactly one lender at a time"
			>
				Single lender · contact admin to reassign
			</span>
		{:else}
			<a
				href="/dashboard/rm/policies/onboard-lender"
				class="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
			>
				<Plus size={16} />
				Add Lender
			</a>
		{/if}
	</div>

	<!-- C.2 — Search / Type / Sort toolbar. Only render once there's enough
	     to search (≥3 records); below that the toolbar is just visual noise. -->
	{#if data.assignments.length >= 3}
		<div class="flex flex-col gap-2 sm:flex-row sm:items-center">
			<div class="relative flex-1">
				<Search
					size={14}
					class="absolute top-1/2 left-3 -translate-y-1/2 text-[var(--dash-text-muted)]"
				/>
				<input
					type="text"
					bind:value={searchQuery}
					placeholder={t('common.search')}
					class="w-full rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-card)] py-2 pr-3 pl-9 text-sm text-[var(--dash-text-primary)] placeholder:text-[var(--dash-text-muted)] focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none"
				/>
			</div>
			<select
				bind:value={typeFilter}
				class="rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-3 py-2 text-sm text-[var(--dash-text-primary)] focus:border-amber-500 focus:outline-none"
			>
				<option value="">{t('policy_library.type_all')}</option>
				{#each availableTypes as ty (ty)}
					<option value={ty}>{ty}</option>
				{/each}
			</select>
			<select
				bind:value={sortBy}
				class="rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-3 py-2 text-sm text-[var(--dash-text-primary)] focus:border-amber-500 focus:outline-none"
			>
				<option value="recent">{t('policy_library.sort_recently_verified')}</option>
				<option value="due_soonest">{t('policy_library.sort_due_soonest')}</option>
				<option value="az">{t('policy_library.sort_az')}</option>
			</select>
		</div>
	{/if}

	<!-- Renewal warnings (read from data.assignments so they're visible even
	     when a filter narrows the rendered sections below — these are an
	     attention surface that ignores the filter intentionally). -->
	{#each data.assignments.filter((a) => a.status === 'active' && (a.renewalDueSoon || a.renewalOverdue)) as assignment (assignment.id)}
		<!-- L-N4 (CODE-REVIEW-2026-05-31): banner colors use the --dash-warning-*
		     / --dash-danger-* semantic tokens so they adapt to dark mode + theme
		     overrides. Previously hardcoded amber-* / red-* Tailwind utilities. -->
		<div
			class="flex items-start gap-3 rounded-lg border p-4"
			style:background-color={assignment.renewalOverdue
				? 'var(--dash-danger-bg)'
				: 'var(--dash-warning-bg)'}
			style:border-color={assignment.renewalOverdue
				? 'var(--dash-danger-border)'
				: 'var(--dash-warning-border)'}
		>
			<!-- Wrap the icon in a span: style:color on a lucide component is
			     not allowed (Svelte component directive rule); we set color on
			     the wrapper and the SVG inherits via currentColor. -->
			<span
				class="mt-0.5"
				style:color={assignment.renewalOverdue
					? 'var(--dash-danger-icon)'
					: 'var(--dash-warning-icon)'}
			>
				<AlertTriangle size={18} />
			</span>
			<div class="flex-1">
				<p
					class="text-sm font-medium"
					style:color={assignment.renewalOverdue
						? 'var(--dash-danger-text-strong)'
						: 'var(--dash-warning-text-strong)'}
				>
					{#if assignment.renewalOverdue}
						{assignment.lenderName} verification is overdue — your access will be suspended.
					{:else}
						{assignment.lenderName} verification due in {assignment.daysUntilRenewal} day{assignment.daysUntilRenewal ===
						1
							? ''
							: 's'}.
					{/if}
				</p>
			</div>
			<a
				href="/dashboard/rm/policies/onboard-lender?lenderId={assignment.lenderId}&purpose=monthly_renewal"
				class="text-sm font-medium underline"
				style:color={assignment.renewalOverdue
					? 'var(--dash-danger-text)'
					: 'var(--dash-warning-text)'}
			>
				Verify now →
			</a>
		</div>
	{/each}

	<!-- No-match state (only when filtering is active and nothing matched) -->
	{#if noMatch}
		<div class="rounded-xl border border-dashed border-[var(--dash-border)] bg-[var(--dash-bg-alt)] px-6 py-10 text-center">
			<p class="text-sm text-[var(--dash-text-muted)]">
				{t('policy_library.no_match', { query: searchQuery || typeFilter })}
			</p>
		</div>
	{/if}

	<!-- Active assignments -->
	{#if activeAssignments.length > 0}
		<section>
			<h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--dash-text-muted)]">
				Active Lenders ({activeAssignments.length})
			</h2>
			<div class="divide-y divide-[var(--dash-border-light)] rounded-xl border border-[var(--dash-border)] bg-[var(--dash-bg-card)]">
				{#each activeAssignments as assignment (assignment.id)}
					<a
						href="/dashboard/rm/policies/{assignment.lenderId}/home"
						class="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-[var(--dash-hover)]"
					>
						<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
							<Building2 size={18} class="text-green-600" />
						</div>
						<div class="flex-1 min-w-0">
							<p class="font-medium text-[var(--dash-text-primary)] truncate">{assignment.lenderName}</p>
							<p class="text-xs text-[var(--dash-text-muted)] mt-0.5">
								{assignment.lenderClassification ?? ''} · {assignment.officialBankEmail}
							</p>
						</div>
						<div class="text-right shrink-0">
							{#if assignment.renewalOverdue}
								<span
									class="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700"
								>
									<AlertTriangle size={11} />
									Overdue
								</span>
							{:else if assignment.renewalDueSoon}
								<span
									class="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700"
								>
									<Clock size={11} />
									Due in {assignment.daysUntilRenewal}d
								</span>
							{:else}
								<span
									class="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700"
									title={assignment.lastVerifiedAt
										? new Date(assignment.lastVerifiedAt).toLocaleString('en-IN')
										: ''}
								>
									<CheckCircle size={11} />
									{verifiedBadge(assignment)}
								</span>
							{/if}
						</div>
						<ChevronRight size={16} class="text-[var(--dash-text-muted)] shrink-0" />
					</a>
				{/each}
			</div>
		</section>
	{/if}

	<!-- Pending verification -->
	{#if pendingAssignments.length > 0}
		<section>
			<h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--dash-text-muted)]">
				Pending Verification ({pendingAssignments.length})
			</h2>
			<div class="divide-y divide-[var(--dash-border-light)] rounded-xl border border-[var(--dash-border)] bg-[var(--dash-bg-card)]">
				{#each pendingAssignments as assignment (assignment.id)}
					<div class="flex items-center gap-4 px-5 py-4">
						<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-50">
							<Clock size={18} class="text-yellow-600" />
						</div>
						<div class="flex-1 min-w-0">
							<p class="font-medium text-[var(--dash-text-primary)]">{assignment.lenderName}</p>
							<p class="text-xs text-[var(--dash-text-muted)] mt-0.5">Bank email verification required</p>
						</div>
						<a
							href="/dashboard/rm/policies/onboard-lender?lenderId={assignment.lenderId}&purpose=onboarding"
							class="text-sm font-medium text-amber-600 underline"
						>
							Complete verification →
						</a>
					</div>
				{/each}
			</div>
		</section>
	{/if}

	<!-- Suspended assignments -->
	{#if suspendedAssignments.length > 0}
		<section>
			<h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--dash-text-muted)]">
				Suspended ({suspendedAssignments.length})
			</h2>
			<div class="divide-y divide-[var(--dash-border-light)] rounded-xl border border-[var(--dash-border)] bg-[var(--dash-bg-card)] opacity-60">
				{#each suspendedAssignments as assignment (assignment.id)}
					<div class="flex items-center gap-4 px-5 py-4">
						<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--dash-bg-alt)]">
							<Building2 size={18} class="text-[var(--dash-text-muted)]" />
						</div>
						<div class="flex-1 min-w-0">
							<p class="font-medium text-[var(--dash-text-secondary)]">{assignment.lenderName}</p>
							<p class="text-xs text-[var(--dash-text-muted)] mt-0.5">Suspended — contact admin to reinstate</p>
						</div>
					</div>
				{/each}
			</div>
		</section>
	{/if}

	<!-- Empty state (no records at all — distinct from "no match" above) -->
	{#if data.assignments.length === 0}
		<div
			class="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--dash-border)] bg-[var(--dash-bg-alt)] py-16 text-center"
		>
			<Building2 size={40} class="mb-4 text-[var(--dash-text-muted)]" />
			<h3 class="text-base font-semibold text-[var(--dash-text-primary)]">No lender assignments yet</h3>
			<p class="mt-1 max-w-xs text-sm text-[var(--dash-text-muted)]">
				Add your first lender to start managing policies. You'll need your official bank email to
				verify.
			</p>
			<a
				href="/dashboard/rm/policies/onboard-lender"
				class="mt-5 flex items-center gap-2 rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-amber-700"
			>
				<Plus size={16} />
				Add Lender
			</a>
		</div>
	{/if}
</div>
