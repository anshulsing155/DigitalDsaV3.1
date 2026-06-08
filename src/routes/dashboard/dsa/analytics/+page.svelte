<script lang="ts">
	import { page } from '$app/stores';
	import { ROUTES } from '$lib/config/routes.js';
	import PageTourButton from '$lib/components/walkthrough/PageTourButton.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import { formatCurrency } from '$lib/i18n';
	import {
		TrendingUp,
		TrendingDown,
		Minus,
		CheckCircle,
		AlertTriangle,
		Info,
		Lightbulb,
		Bell,
		ArrowLeft,
		ArrowUpRight,
		ChevronRight
	} from 'lucide-svelte';

	// ── Server data ──────────────────────────────────────────────
	const data = $derived(
		$page.data as {
			scorecard: {
				overall_score: number;
				overall_rating: 'excellent' | 'good' | 'needs_improvement' | 'critical';
				metrics: Array<{
					metric_id: string;
					label: string;
					current_value: number;
					target_value: number;
					unit: string;
					progress_percent: number;
					trend: 'up' | 'down' | 'stable';
					trend_value?: number;
					rating: 'excellent' | 'good' | 'needs_improvement' | 'critical';
				}>;
				insights: string[];
				generated_at: string;
			} | null;
			policyAlerts: Array<{
				alert_id: string;
				lender_name: string;
				alert_type: string;
				severity: 'info' | 'warning' | 'action_required';
				title: string;
				description: string;
				affected_cases: string[];
				action_label?: string;
				created_at: string;
				expires_at?: string;
			}>;
			hasData: boolean;
		}
	);

	const scorecard = $derived(data.scorecard);
	const policyAlerts = $derived(data.policyAlerts || []);
	const hasData = $derived(data.hasData);

	// ── Expanded alert states ───────────────────────────────────
	let expandedAlerts = $state<Set<string>>(new Set());

	function toggleAlert(alertId: string) {
		const next = new Set(expandedAlerts);
		if (next.has(alertId)) {
			next.delete(alertId);
		} else {
			next.add(alertId);
		}
		expandedAlerts = next;
	}

	// ── Format helpers ──────────────────────────────────────────

	function formatValue(value: number, unit: string): string {
		if (unit === 'amount') return formatCurrency(value, true);
		if (unit === 'percent') return `${value}%`;
		if (unit === 'days') return value === 0 ? '--' : `${value}d`;
		return String(value);
	}

	// Rating colors — monochromatic brand palette at different intensities.
	// Excellent = strongest accent, Critical = most muted. One color family, no rainbow.
	function ratingColor(rating: string): string {
		switch (rating) {
			case 'excellent':
				return 'text-[var(--dash-accent-text)]';
			case 'good':
				return 'text-[var(--dash-accent-text)]';
			case 'needs_improvement':
				return 'text-[var(--dash-text-secondary)]';
			case 'critical':
				return 'text-[var(--dash-text-muted)]';
			default:
				return 'text-[var(--dash-text-secondary)]';
		}
	}

	function ratingBg(rating: string): string {
		switch (rating) {
			case 'excellent':
				return 'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)] border-[var(--dash-btn-ghost-border)]';
			case 'good':
				return 'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)] border-[var(--dash-btn-ghost-border)]';
			case 'needs_improvement':
				return 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)] border-[var(--dash-border)]';
			case 'critical':
				return 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-muted)] border-[var(--dash-border)]';
			default:
				return 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)] border-[var(--dash-border)]';
		}
	}

	function ratingLabel(rating: string): string {
		switch (rating) {
			case 'excellent':
				return 'Excellent';
			case 'good':
				return 'Good';
			case 'needs_improvement':
				return 'Needs Improvement';
			case 'critical':
				return 'Critical';
			default:
				return rating;
		}
	}

	// Progress bars + ring — monochromatic intensity scale
	function progressBarColor(rating: string): string {
		switch (rating) {
			case 'excellent':
				return 'bg-[var(--dash-btn-bg)]';
			case 'good':
				return 'bg-[var(--dash-btn-bg)]';
			case 'needs_improvement':
				return 'bg-[var(--dash-text-muted)]';
			case 'critical':
				return 'bg-[var(--dash-text-muted)]';
			default:
				return 'bg-[var(--dash-text-muted)]';
		}
	}

	function scoreRingColor(rating: string): string {
		switch (rating) {
			case 'excellent':
				return 'var(--dash-btn-bg)';
			case 'good':
				return 'var(--dash-btn-bg)';
			case 'needs_improvement':
				return 'var(--dash-text-muted)';
			case 'critical':
				return 'var(--dash-text-muted)';
			default:
				return 'var(--dash-text-muted)';
		}
	}

	// Severity — policy alerts use brand accent intensity, not semantic rainbow
	function severityBorder(severity: string): string {
		switch (severity) {
			case 'action_required':
				return 'border-l-[var(--dash-btn-bg)]';
			case 'warning':
				return 'border-l-[var(--dash-accent-text)]';
			case 'info':
				return 'border-l-[var(--dash-border)]';
			default:
				return 'border-l-[var(--dash-border)]';
		}
	}

	function severityBadge(severity: string): string {
		switch (severity) {
			case 'action_required':
				return 'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)]';
			case 'warning':
				return 'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)]';
			case 'info':
				return 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]';
			default:
				return 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]';
		}
	}

	function severityLabel(severity: string): string {
		switch (severity) {
			case 'action_required':
				return 'Action Required';
			case 'warning':
				return 'Warning';
			case 'info':
				return 'Info';
			default:
				return severity;
		}
	}

	function insightIcon(text: string): 'positive' | 'negative' | 'neutral' {
		const lower = text.toLowerCase();
		if (
			lower.includes('improved') ||
			lower.includes('excellent') ||
			lower.includes('outstanding') ||
			lower.includes('great') ||
			lower.includes('well') ||
			lower.includes('on track') ||
			lower.includes('hit your') ||
			lower.includes('paying off')
		) {
			return 'positive';
		}
		if (
			lower.includes('low') ||
			lower.includes('critical') ||
			lower.includes('stuck') ||
			lower.includes('over 21') ||
			lower.includes('consider') ||
			lower.includes('review') ||
			lower.includes('faster') ||
			lower.includes('only')
		) {
			return 'negative';
		}
		return 'neutral';
	}

	// ── SVG ring calculations ───────────────────────────────────
	const ringRadius = 58;
	const ringCircumference = $derived(2 * Math.PI * ringRadius);
	const ringOffset = $derived(
		scorecard
			? ringCircumference - (scorecard.overall_score / 100) * ringCircumference
			: ringCircumference
	);
</script>

<svelte:head>
	<title>Analytics | DigitalDSA</title>
</svelte:head>

<div class="pb-20 lg:pb-0">
	<!-- ═══════════════════════════════════════════════════════════ -->
	<!-- PAGE HEADER                                                -->
	<!-- ═══════════════════════════════════════════════════════════ -->
	<div class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<div class="flex items-center gap-2">
				<h1 class="text-xl font-bold text-[var(--dash-text)] md:text-2xl">Performance Analytics</h1>
				<PageTourButton pageId="analytics" />
			</div>
			<p class="mt-1 text-sm text-[var(--dash-text-secondary)]">
				Track your performance, identify trends, and stay updated on lender policies.
			</p>
		</div>
		<a
			href="/dashboard/dsa"
			class="inline-flex items-center gap-1.5 rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-3 py-2 text-sm font-medium text-[var(--dash-text-secondary)] transition-colors hover:bg-[var(--dash-hover)]"
		>
			<ArrowLeft size={16} strokeWidth={1.5} />
			Back to Dashboard
		</a>
	</div>

	{#if !hasData}
		<!-- ═══════════════════════════════════════════════════════════ -->
		<!-- EMPTY STATE                                                -->
		<!-- ═══════════════════════════════════════════════════════════ -->
		<EmptyState
			title="No Analytics Data Yet"
			description="Create and process cases to start tracking your performance metrics. Your scorecard and insights will appear here once you have data."
			variant="default"
		>
			{#snippet action()}
				<a
					href={ROUTES.FORM.HOW_CAN_WE_HELP}
					class="inline-flex items-center gap-2 rounded-xl bg-[var(--dash-btn-bg)] px-6 py-3 text-sm font-semibold text-[var(--dash-btn-text)] shadow-lg transition-all hover:bg-[var(--ddsa-primary-600)] hover:shadow-xl"
				>
					Create Your First Case
				</a>
			{/snippet}
		</EmptyState>
	{:else if scorecard}
		<!-- ═══════════════════════════════════════════════════════════ -->
		<!-- SCORECARD CONTENT                                          -->
		<!-- ═══════════════════════════════════════════════════════════ -->

		<!-- Top Section: Score Ring + Metrics -->
		<div class="mb-6 grid gap-6 lg:grid-cols-4">
			<!-- ── OVERALL SCORE RING ─────────────────────────────── -->
			<div
				data-walkthrough="analytics-score-ring"
				class="flex flex-col items-center justify-center rounded-2xl border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] p-6 shadow-sm"
			>
				<h3
					class="mb-4 text-sm font-semibold tracking-wide text-[var(--dash-text-secondary)] uppercase"
				>
					Performance Score
				</h3>
				<div class="relative mb-4">
					<svg width="140" height="140" viewBox="0 0 140 140">
						<!-- Background circle -->
						<circle
							cx="70"
							cy="70"
							r={ringRadius}
							fill="none"
							stroke="var(--dash-border)"
							stroke-width="10"
						/>
						<!-- Progress circle -->
						<circle
							cx="70"
							cy="70"
							r={ringRadius}
							fill="none"
							stroke={scoreRingColor(scorecard.overall_rating)}
							stroke-width="10"
							stroke-linecap="round"
							stroke-dasharray={ringCircumference}
							stroke-dashoffset={ringOffset}
							transform="rotate(-90 70 70)"
							class="score-ring-progress"
						/>
					</svg>
					<div class="absolute inset-0 flex flex-col items-center justify-center">
						<span class="text-3xl font-bold {ratingColor(scorecard.overall_rating)}">
							{scorecard.overall_score}
						</span>
						<span class="text-xs text-[var(--dash-text-muted)]">/ 100</span>
					</div>
				</div>
				<span
					class="inline-flex rounded-full border px-3 py-1 text-xs font-semibold {ratingBg(
						scorecard.overall_rating
					)}"
				>
					{ratingLabel(scorecard.overall_rating)}
				</span>
			</div>

			<!-- ── METRICS GRID ───────────────────────────────────── -->
			<div class="lg:col-span-3" data-walkthrough="analytics-metrics-grid">
				<div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
					{#each scorecard.metrics as metric}
						<div
							class="group relative rounded-xl border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] p-4 shadow-sm transition-all hover:shadow-md"
						>
							<!-- Label -->
							<p class="mb-1 truncate text-xs font-medium text-[var(--dash-text-secondary)]">
								{metric.label}
							</p>

							<!-- Value -->
							<div class="mb-2 flex items-baseline gap-2">
								<span class="text-xl font-bold text-[var(--dash-text)]">
									{formatValue(metric.current_value, metric.unit)}
								</span>
								<!-- Trend — monochromatic brand colors -->
								{#if metric.trend === 'up'}
									<span
										class="inline-flex items-center gap-0.5 text-xs font-medium text-[var(--dash-accent-text)]"
									>
										<TrendingUp size={12} strokeWidth={2.5} />
										{#if metric.trend_value}{Math.abs(metric.trend_value)}%{/if}
									</span>
								{:else if metric.trend === 'down'}
									<span
										class="inline-flex items-center gap-0.5 text-xs font-medium text-[var(--ddsa-secondary-500)]"
									>
										<TrendingDown size={12} strokeWidth={2.5} />
										{#if metric.trend_value}{Math.abs(metric.trend_value)}%{/if}
									</span>
								{:else}
									<span
										class="inline-flex items-center text-xs font-medium text-[var(--dash-text-muted)]"
									>
										<Minus size={12} strokeWidth={2.5} />
									</span>
								{/if}
							</div>

							<!-- Progress bar -->
							<div class="mb-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[var(--dash-bg-alt)]">
								<div
									class="h-full rounded-full transition-all duration-500 {progressBarColor(
										metric.rating
									)}"
									style="width: {Math.min(metric.progress_percent, 100)}%"
								></div>
							</div>

							<!-- Target + Rating -->
							<div class="flex items-center justify-between">
								<span class="text-[13px] text-[var(--dash-text-muted)]">
									Target: {formatValue(metric.target_value, metric.unit)}
								</span>
								<span
									class="inline-flex rounded-full px-1.5 py-0.5 text-[13px] font-semibold {ratingBg(
										metric.rating
									)}"
								>
									{ratingLabel(metric.rating)}
								</span>
							</div>

							<!-- Tooltip on hover -->
							<div
								class="pointer-events-none absolute -top-12 left-1/2 z-10 -translate-x-1/2 rounded-lg bg-gray-900 px-3 py-1.5 text-xs whitespace-nowrap text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
							>
								{metric.current_value} of {formatValue(metric.target_value, metric.unit)} ({metric.progress_percent}%)
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>

		<!-- Bottom Section: Insights + Alerts -->
		<div class="grid gap-6 lg:grid-cols-2">
			<!-- ── INSIGHTS & RECOMMENDATIONS ─────────────────────── -->
			<div
				data-walkthrough="analytics-insights"
				class="rounded-2xl border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] p-5 shadow-sm"
			>
				<div class="mb-4 flex items-center gap-2">
					<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--dash-btn-bg)]">
						<Lightbulb size={16} strokeWidth={1.5} class="text-[var(--dash-btn-text)]" />
					</div>
					<h3 class="text-sm font-semibold text-[var(--dash-text)]">Insights & Recommendations</h3>
				</div>

				{#if scorecard.insights.length > 0}
					<ul class="space-y-3">
						{#each scorecard.insights as insight}
							{@const iconType = insightIcon(insight)}
							<li class="flex items-start gap-3">
								{#if iconType === 'positive'}
									<div
										class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--dash-btn-ghost-bg)]"
									>
										<CheckCircle
											size={12}
											strokeWidth={2.5}
											class="text-[var(--dash-accent-text)]"
										/>
									</div>
								{:else if iconType === 'negative'}
									<div
										class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--dash-btn-ghost-bg)]"
									>
										<AlertTriangle
											size={12}
											strokeWidth={2.5}
											class="text-[var(--dash-accent-text)]"
										/>
									</div>
								{:else}
									<div
										class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--dash-bg-alt)]"
									>
										<Info size={12} strokeWidth={2.5} class="text-[var(--dash-text-secondary)]" />
									</div>
								{/if}
								<p class="text-sm leading-relaxed text-[var(--dash-text-secondary)]">{insight}</p>
							</li>
						{/each}
					</ul>
				{:else}
					<p class="text-sm text-[var(--dash-text-muted)] italic">
						No insights available yet. Keep processing cases to get personalised recommendations.
					</p>
				{/if}
			</div>

			<!-- ── LENDER POLICY ALERTS ───────────────────────────── -->
			<div
				data-walkthrough="analytics-policy-alerts"
				class="rounded-2xl border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] p-5 shadow-sm"
			>
				<div class="mb-4 flex items-center gap-2">
					<div
						class="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--ddsa-primary-500)]"
					>
						<Bell size={16} strokeWidth={1.5} class="text-white" />
					</div>
					<h3 class="text-sm font-semibold text-[var(--dash-text)]">Lender Policy Alerts</h3>
					{#if policyAlerts.length > 0}
						<span
							class="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--dash-btn-ghost-bg)] px-1.5 text-[13px] font-bold text-[var(--dash-accent-text)]"
						>
							{policyAlerts.length}
						</span>
					{/if}
				</div>

				{#if policyAlerts.length > 0}
					<div class="space-y-3">
						{#each policyAlerts as alert}
							<div
								class="rounded-lg border border-l-4 border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] transition-all"
								style="border-left-color: {alert.severity === 'action_required'
									? 'var(--ddsa-primary-700)'
									: alert.severity === 'warning'
										? 'var(--ddsa-primary-400)'
										: 'var(--ddsa-secondary-400)'}"
							>
								<button
									onclick={() => toggleAlert(alert.alert_id)}
									class="w-full cursor-pointer px-4 py-3 text-left"
								>
									<div class="flex items-start justify-between gap-2">
										<div class="min-w-0 flex-1">
											<div class="mb-1 flex flex-wrap items-center gap-2">
												<span
													class="inline-flex rounded-full bg-[var(--dash-bg-alt)] px-2 py-0.5 text-[13px] font-semibold text-[var(--dash-text-secondary)]"
												>
													{alert.lender_name}
												</span>
												<span
													class="inline-flex rounded-full px-2 py-0.5 text-[13px] font-semibold {severityBadge(
														alert.severity
													)}"
												>
													{severityLabel(alert.severity)}
												</span>
											</div>
											<p class="text-sm font-medium text-[var(--dash-text)]">{alert.title}</p>
										</div>
										{#if alert.affected_cases.length > 0}
											<span
												class="inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--dash-btn-ghost-bg)] px-2 py-0.5 text-[13px] font-semibold text-[var(--dash-accent-text)]"
											>
												{alert.affected_cases.length} case{alert.affected_cases.length !== 1
													? 's'
													: ''}
											</span>
										{/if}
									</div>
								</button>

								{#if expandedAlerts.has(alert.alert_id)}
									<div class="border-t border-[var(--dash-border-light)] px-4 py-3">
										<p class="mb-3 text-sm leading-relaxed text-[var(--dash-text-secondary)]">
											{alert.description}
										</p>

										{#if alert.affected_cases.length > 0}
											<div class="mb-3">
												<p class="mb-1.5 text-xs font-semibold text-[var(--dash-text-secondary)]">
													Affected Cases:
												</p>
												<div class="flex flex-wrap gap-1.5">
													{#each alert.affected_cases as caseId}
														<a
															href="/dashboard/dsa/cases/{caseId}"
															class="inline-flex rounded-md bg-[var(--dash-bg-alt)] px-2 py-0.5 font-mono text-xs text-[var(--dash-text-secondary)] transition-colors hover:bg-[var(--dash-btn-ghost-bg)] hover:text-[var(--dash-accent-text)]"
														>
															{caseId}
														</a>
													{/each}
												</div>
											</div>
										{/if}

										{#if alert.action_label}
											<button
												class="inline-flex items-center gap-1.5 rounded-lg bg-[var(--dash-btn-bg)] px-3 py-1.5 text-xs font-semibold text-[var(--dash-btn-text)] transition-colors hover:bg-[var(--ddsa-primary-600)]"
											>
												{alert.action_label}
												<ChevronRight size={12} strokeWidth={2} />
											</button>
										{/if}
									</div>
								{/if}
							</div>
						{/each}
					</div>
				{:else}
					<div class="flex flex-col items-center justify-center py-8 text-center">
						<div
							class="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--dash-btn-ghost-bg)]"
						>
							<CheckCircle size={20} strokeWidth={1.5} class="text-[var(--dash-accent-text)]" />
						</div>
						<p class="text-sm font-medium text-[var(--dash-text-secondary)]">No active alerts</p>
						<p class="text-xs text-[var(--dash-text-muted)]">You're all caught up!</p>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	.score-ring-progress {
		transition: stroke-dashoffset 1s ease-in-out;
	}
</style>
