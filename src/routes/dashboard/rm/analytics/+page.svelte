<script lang="ts">
	import { page } from '$app/stores';
	import type {
		RMReputationScore,
		PolicyFeedbackAggregate,
		RatingCategory,
		ReputationRating
	} from '$lib/types/rmPortal';

	// ── Server data ──────────────────────────────────────────────
	const data = $derived(
		$page.data as {
			feedbackAggregates: PolicyFeedbackAggregate[];
			reputation: RMReputationScore | null;
			hasData: boolean;
		}
	);

	const reputation = $derived(data.reputation);
	const feedbackAggregates = $derived(data.feedbackAggregates || []);
	const hasData = $derived(data.hasData);

	// ── SVG ring calculations ───────────────────────────────────
	const ringRadius = 58;
	const ringCircumference = $derived(2 * Math.PI * ringRadius);
	const ringOffset = $derived(
		reputation
			? ringCircumference - (reputation.overall_score / 100) * ringCircumference
			: ringCircumference
	);

	// ── Color mappings ──────────────────────────────────────────
	function reputationColor(rating: ReputationRating): string {
		switch (rating) {
			case 'excellent':
				return 'text-[var(--dash-accent-text)]';
			case 'good':
				return 'text-[var(--dash-accent-text)]';
			case 'average':
				return 'text-[var(--dash-text-secondary)]';
			case 'needs_improvement':
				return 'text-[var(--dash-contrast-text)]';
			default:
				return 'text-[var(--dash-text-secondary)]';
		}
	}

	function reputationBg(rating: ReputationRating): string {
		switch (rating) {
			case 'excellent':
				return 'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)] border-[var(--dash-btn-ghost-border)]';
			case 'good':
				return 'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)] border-[var(--dash-btn-ghost-border)]';
			case 'average':
				return 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)] border-[var(--dash-border)]';
			case 'needs_improvement':
				return 'bg-[var(--dash-contrast-ghost-bg)] text-[var(--dash-contrast-text)] border-[var(--dash-contrast-ghost-border)]';
			default:
				return 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)] border-[var(--dash-border)]';
		}
	}

	function reputationRingColor(rating: ReputationRating): string {
		switch (rating) {
			case 'excellent':
				return '#10b981';
			case 'good':
				return '#3b82f6';
			case 'average':
				return '#cb997e';
			case 'needs_improvement':
				return '#ef4444';
			default:
				return '#9ca3af';
		}
	}

	function reputationLabel(rating: ReputationRating): string {
		switch (rating) {
			case 'excellent':
				return 'Excellent';
			case 'good':
				return 'Good';
			case 'average':
				return 'Average';
			case 'needs_improvement':
				return 'Needs Improvement';
			default:
				return rating;
		}
	}

	// ── Category display ────────────────────────────────────────
	const CATEGORY_LABELS: Record<RatingCategory, string> = {
		income_estimation: 'Income Estimation',
		property_valuation: 'Property Valuation',
		eligibility_check: 'Eligibility Check',
		documentation: 'Documentation',
		overall: 'Overall'
	};

	const CATEGORY_ICONS: Record<RatingCategory, string> = {
		income_estimation:
			'M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
		property_valuation:
			'M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l4.5-1.636M18.75 3l-1.5.545m0 6.205l3 1m1.5.5l-1.5-.5M6.75 7.364V3h-3v18m3-13.636l10.5-3.819',
		eligibility_check: 'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
		documentation:
			'M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z',
		overall:
			'M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z'
	};

	// ── Star rendering ──────────────────────────────────────────
	function getStarFill(starIndex: number, rating: number): 'full' | 'half' | 'empty' {
		if (rating >= starIndex) return 'full';
		if (rating >= starIndex - 0.5) return 'half';
		return 'empty';
	}

	// ── Trend display ───────────────────────────────────────────
	function trendLabel(trend: 'up' | 'down' | 'stable'): string {
		switch (trend) {
			case 'up':
				return 'Improving';
			case 'down':
				return 'Declining';
			case 'stable':
				return 'Stable';
		}
	}

	function trendColor(trend: 'up' | 'down' | 'stable'): string {
		switch (trend) {
			case 'up':
				return 'text-[var(--dash-accent-text)]';
			case 'down':
				return 'text-[var(--dash-contrast-text)]';
			case 'stable':
				return 'text-[var(--dash-text-secondary)]';
		}
	}

	// ── Format helpers ──────────────────────────────────────────
	function formatHours(hours: number): string {
		if (hours === 0) return '--';
		if (hours < 1) return `${Math.round(hours * 60)}m`;
		if (hours < 24) return `${hours}h`;
		return `${Math.round(hours / 24)}d`;
	}

	function formatPercent(value: number): string {
		return `${Math.round(value * 100)}%`;
	}

	function formatRating(value: number): string {
		if (value === 0) return '--';
		return value.toFixed(1);
	}
</script>

<svelte:head>
	<title>RM Analytics - Digital DSA</title>
</svelte:head>

<div class="pb-20 lg:pb-0">
	<!-- ═══════════════════════════════════════════════════════════ -->
	<!-- PAGE HEADER                                                -->
	<!-- ═══════════════════════════════════════════════════════════ -->
	<div class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="text-xl font-bold text-[var(--dash-text)] md:text-2xl">Analytics & Reputation</h1>
			<p class="mt-1 text-sm text-[var(--dash-text-secondary)]">
				Track your reputation score, response metrics, and DSA feedback trends.
			</p>
		</div>
		<a
			href="/dashboard/rm"
			class="inline-flex items-center gap-1.5 rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-3 py-2 text-sm font-medium text-[var(--dash-text-secondary)] transition-colors hover:bg-[var(--dash-hover)]"
		>
			<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
				/>
			</svg>
			Back to Dashboard
		</a>
	</div>

	{#if !hasData}
		<!-- ═══════════════════════════════════════════════════════════ -->
		<!-- EMPTY STATE                                                -->
		<!-- ═══════════════════════════════════════════════════════════ -->
		<div
			class="rounded-2xl border-2 border-dashed border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-6 py-12 text-center"
		>
			<div
				class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[var(--ddsa-accent-100)] to-[var(--ddsa-primary-100)]"
			>
				<svg
					class="h-8 w-8 text-[var(--ddsa-accent-500)]"
					fill="none"
					viewBox="0 0 24 24"
					stroke-width="1.5"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
					/>
				</svg>
			</div>
			<h2 class="mb-2 text-lg font-bold text-[var(--dash-text)]">No Analytics Data Yet</h2>
			<p class="mx-auto mb-6 max-w-md text-sm text-[var(--dash-text-secondary)]">
				Your reputation score and feedback trends will appear here once DSAs start sharing cases and
				providing ratings.
			</p>
			<a
				href="/dashboard/rm/cases"
				class="inline-flex items-center gap-2 rounded-xl bg-[var(--dash-btn-bg)] px-6 py-3 text-sm font-semibold text-[var(--dash-btn-text)] shadow-lg shadow-neutral-200 transition-all hover:shadow-xl hover:brightness-105 dark:shadow-neutral-900/20"
			>
				View Your Cases
			</a>
		</div>
	{:else}
		<!-- ═══════════════════════════════════════════════════════════ -->
		<!-- REPUTATION SCORE SECTION (6.14)                            -->
		<!-- ═══════════════════════════════════════════════════════════ -->
		{#if reputation}
			<div class="mb-6 grid gap-6 lg:grid-cols-4">
				<!-- ── OVERALL SCORE RING ─────────────────────────────── -->
				<div
					class="flex flex-col items-center justify-center rounded-2xl border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] p-6 shadow-sm"
				>
					<h3
						class="mb-4 text-sm font-semibold tracking-wide text-[var(--dash-text-secondary)] uppercase"
					>
						Reputation Score
					</h3>
					<div class="relative mb-4">
						<svg width="140" height="140" viewBox="0 0 140 140">
							<!-- Background circle -->
							<circle
								cx="70"
								cy="70"
								r={ringRadius}
								fill="none"
								stroke="#e5e7eb"
								stroke-width="10"
							/>
							<!-- Progress circle -->
							<circle
								cx="70"
								cy="70"
								r={ringRadius}
								fill="none"
								stroke={reputationRingColor(reputation.rating)}
								stroke-width="10"
								stroke-linecap="round"
								stroke-dasharray={ringCircumference}
								stroke-dashoffset={ringOffset}
								transform="rotate(-90 70 70)"
								class="score-ring-progress"
							/>
						</svg>
						<div class="absolute inset-0 flex flex-col items-center justify-center">
							<span class="text-3xl font-bold {reputationColor(reputation.rating)}">
								{reputation.overall_score}
							</span>
							<span class="text-xs text-[var(--dash-text-muted)]">/ 100</span>
						</div>
					</div>
					<span
						class="inline-flex rounded-full border px-3 py-1 text-xs font-semibold {reputationBg(
							reputation.rating
						)}"
					>
						{reputationLabel(reputation.rating)}
					</span>
					{#if reputation.case_count > 0}
						<p class="mt-3 text-xs text-[var(--dash-text-muted)]">
							Based on {reputation.case_count} case{reputation.case_count !== 1 ? 's' : ''}
						</p>
					{/if}
				</div>

				<!-- ── METRIC CARDS GRID ──────────────────────────────── -->
				<div class="lg:col-span-3">
					<div class="grid grid-cols-2 gap-3 lg:grid-cols-2">
						<!-- Response Time -->
						<div
							class="rounded-xl border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] p-4 shadow-sm"
						>
							<div class="mb-2 flex items-center gap-2">
								<div
									class="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--dash-btn-ghost-bg)]"
								>
									<svg
										class="h-4 w-4 text-[var(--dash-accent-text)]"
										fill="none"
										viewBox="0 0 24 24"
										stroke-width="1.5"
										stroke="currentColor"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
										/>
									</svg>
								</div>
								<p class="text-xs font-medium text-[var(--dash-text-secondary)]">
									Avg Response Time
								</p>
							</div>
							<p class="text-2xl font-bold text-[var(--dash-text)]">
								{formatHours(reputation.response_time_avg_hours)}
							</p>
							<p class="mt-1 text-[13px] text-[var(--dash-text-muted)]">
								{reputation.response_time_avg_hours <= 4
									? 'Excellent responsiveness'
									: reputation.response_time_avg_hours <= 12
										? 'Good response time'
										: reputation.response_time_avg_hours <= 24
											? 'Room for improvement'
											: 'Needs attention'}
							</p>
						</div>

						<!-- Query Resolution -->
						<div
							class="rounded-xl border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] p-4 shadow-sm"
						>
							<div class="mb-2 flex items-center gap-2">
								<div
									class="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--dash-btn-ghost-bg)]"
								>
									<svg
										class="h-4 w-4 text-[var(--dash-accent-text)]"
										fill="none"
										viewBox="0 0 24 24"
										stroke-width="1.5"
										stroke="currentColor"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
										/>
									</svg>
								</div>
								<p class="text-xs font-medium text-[var(--dash-text-secondary)]">
									Query Resolution
								</p>
							</div>
							<p class="text-2xl font-bold text-[var(--dash-text)]">
								{formatPercent(reputation.query_resolution_rate)}
							</p>
							<p class="mt-1 text-[13px] text-[var(--dash-text-muted)]">
								{reputation.query_resolution_rate >= 0.9
									? 'Outstanding resolution rate'
									: reputation.query_resolution_rate >= 0.7
										? 'Good resolution rate'
										: 'Improve query follow-ups'}
							</p>
						</div>

						<!-- Accuracy Rating -->
						<div
							class="rounded-xl border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] p-4 shadow-sm"
						>
							<div class="mb-2 flex items-center gap-2">
								<div
									class="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--dash-bg-alt)]"
								>
									<svg
										class="h-4 w-4 text-[var(--dash-text-secondary)]"
										fill="none"
										viewBox="0 0 24 24"
										stroke-width="1.5"
										stroke="currentColor"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
										/>
									</svg>
								</div>
								<p class="text-xs font-medium text-[var(--dash-text-secondary)]">Accuracy Rating</p>
							</div>
							<div class="flex items-baseline gap-1">
								<p class="text-2xl font-bold text-[var(--dash-text)]">
									{formatRating(reputation.accuracy_rating_avg)}
								</p>
								<span class="text-sm text-[var(--dash-text-muted)]">/ 5</span>
							</div>
							<p class="mt-1 text-[13px] text-[var(--dash-text-muted)]">
								{reputation.accuracy_rating_avg >= 4
									? 'Highly accurate assessments'
									: reputation.accuracy_rating_avg >= 3
										? 'Good accuracy level'
										: 'Review assessment practices'}
							</p>
						</div>

						<!-- DSA Engagement -->
						<div
							class="rounded-xl border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] p-4 shadow-sm"
						>
							<div class="mb-2 flex items-center gap-2">
								<div
									class="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--dash-bg-alt)]"
								>
									<svg
										class="h-4 w-4 text-[var(--dash-text-secondary)]"
										fill="none"
										viewBox="0 0 24 24"
										stroke-width="1.5"
										stroke="currentColor"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155"
										/>
									</svg>
								</div>
								<p class="text-xs font-medium text-[var(--dash-text-secondary)]">DSA Engagement</p>
							</div>
							<div class="flex items-baseline gap-1">
								<p class="text-2xl font-bold text-[var(--dash-text)]">
									{formatRating(reputation.dsa_satisfaction_avg)}
								</p>
								<span class="text-sm text-[var(--dash-text-muted)]">/ 5</span>
							</div>
							<p class="mt-1 text-[13px] text-[var(--dash-text-muted)]">
								{reputation.dsa_satisfaction_avg >= 4
									? 'Highly engaged conversations'
									: reputation.dsa_satisfaction_avg >= 3
										? 'Good engagement level'
										: 'Consider more active communication'}
							</p>
						</div>
					</div>
				</div>
			</div>
		{/if}

		<!-- ═══════════════════════════════════════════════════════════ -->
		<!-- POLICY FEEDBACK AGGREGATES (6.13)                          -->
		<!-- ═══════════════════════════════════════════════════════════ -->
		<div
			class="rounded-2xl border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] p-5 shadow-sm"
		>
			<div class="mb-4 flex items-center gap-2">
				<div
					class="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--dash-btn-ghost-bg)]"
				>
					<svg
						class="h-4 w-4 text-[var(--dash-accent-text)]"
						fill="none"
						viewBox="0 0 24 24"
						stroke-width="1.5"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z"
						/>
					</svg>
				</div>
				<h3 class="text-sm font-semibold text-[var(--dash-text)]">Policy Feedback Trends</h3>
				{#if feedbackAggregates.length > 0}
					<span
						class="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--dash-btn-ghost-bg)] px-1.5 text-[12px] font-bold text-[var(--dash-accent-text)]"
					>
						{feedbackAggregates.length}
					</span>
				{/if}
			</div>

			{#if feedbackAggregates.length > 0}
				<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
					{#each feedbackAggregates as agg}
						<div
							class="rounded-xl border border-[var(--dash-border-light)] p-4 transition-all hover:shadow-md"
						>
							<!-- Category header -->
							<div class="mb-3 flex items-start justify-between gap-2">
								<div class="flex items-center gap-2">
									<div
										class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--dash-bg-alt)]"
									>
										<svg
											class="h-3.5 w-3.5 text-[var(--dash-text-secondary)]"
											fill="none"
											viewBox="0 0 24 24"
											stroke-width="1.5"
											stroke="currentColor"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												d={CATEGORY_ICONS[agg.category]}
											/>
										</svg>
									</div>
									<div>
										<p class="text-sm font-medium text-[var(--dash-text)]">
											{CATEGORY_LABELS[agg.category]}
										</p>
										<p class="text-[13px] text-[var(--dash-text-muted)]">{agg.lender_name}</p>
									</div>
								</div>
								<!-- Trend indicator -->
								<span
									class="inline-flex items-center gap-0.5 text-xs font-medium {trendColor(
										agg.trend
									)}"
								>
									{#if agg.trend === 'up'}
										<svg
											class="h-3 w-3"
											fill="none"
											viewBox="0 0 24 24"
											stroke-width="2.5"
											stroke="currentColor"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25"
											/>
										</svg>
									{:else if agg.trend === 'down'}
										<svg
											class="h-3 w-3"
											fill="none"
											viewBox="0 0 24 24"
											stroke-width="2.5"
											stroke="currentColor"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												d="M4.5 4.5l15 15m0 0V8.25m0 11.25H8.25"
											/>
										</svg>
									{:else}
										<svg
											class="h-3 w-3"
											fill="none"
											viewBox="0 0 24 24"
											stroke-width="2.5"
											stroke="currentColor"
										>
											<path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14" />
										</svg>
									{/if}
									{trendLabel(agg.trend)}
								</span>
							</div>

							<!-- Star rating -->
							<div class="mb-2 flex items-center gap-1.5">
								<div class="flex items-center gap-0.5">
									{#each [1, 2, 3, 4, 5] as star}
										{@const fill = getStarFill(star, agg.avg_rating)}
										<svg class="h-4 w-4" viewBox="0 0 24 24">
											{#if fill === 'full'}
												<path
													fill="#cb997e"
													d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
												/>
											{:else if fill === 'half'}
												<defs>
													<linearGradient id="half-star-{agg.category}-{agg.lender_name}-{star}">
														<stop offset="50%" stop-color="#cb997e" />
														<stop offset="50%" stop-color="#e5e7eb" />
													</linearGradient>
												</defs>
												<path
													fill="url(#half-star-{agg.category}-{agg.lender_name}-{star})"
													d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
												/>
											{:else}
												<path
													fill="#e5e7eb"
													d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
												/>
											{/if}
										</svg>
									{/each}
								</div>
								<span class="text-sm font-bold text-[var(--dash-text)]">{agg.avg_rating}</span>
							</div>

							<!-- Count -->
							<p class="text-[13px] text-[var(--dash-text-muted)]">
								{agg.count} rating{agg.count !== 1 ? 's' : ''}
							</p>
						</div>
					{/each}
				</div>
			{:else}
				<div class="flex flex-col items-center justify-center py-8 text-center">
					<div
						class="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--dash-bg-alt)]"
					>
						<svg
							class="h-5 w-5 text-[var(--dash-text-muted)]"
							fill="none"
							viewBox="0 0 24 24"
							stroke-width="1.5"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
							/>
						</svg>
					</div>
					<p class="text-sm font-medium text-[var(--dash-text-secondary)]">
						No feedback ratings yet
					</p>
					<p class="text-xs text-[var(--dash-text-muted)]">
						Ratings from DSAs on your assessments will appear here
					</p>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.score-ring-progress {
		transition: stroke-dashoffset 1s ease-in-out;
	}
</style>
