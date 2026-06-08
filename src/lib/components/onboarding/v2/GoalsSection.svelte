<script lang="ts">
	import type { DsaGoals, CurrentTargetPair } from '$lib/types/dsaOnboardingV2';
	import {
		TrendingUp,
		TrendingDown,
		ArrowRight,
		FileText,
		IndianRupee,
		Landmark,
		Percent,
		Calendar,
		AlertCircle
	} from '$lib/utils/iconRegistry';

	interface Props {
		data: DsaGoals;
		onUpdate: (data: DsaGoals) => void;
		errors?: Record<string, string>;
	}

	let { data, onUpdate, errors = {} }: Props = $props();

	// ── Internal state (one-time snapshot from prop) ────────────
	// svelte-ignore state_referenced_locally
	let filesPerMonth = $state<CurrentTargetPair>({ ...data.files_per_month });
	// svelte-ignore state_referenced_locally
	let disbursementVolume = $state<CurrentTargetPair>({ ...data.disbursement_volume });
	// svelte-ignore state_referenced_locally
	let activeLenderCount = $state<CurrentTargetPair>({ ...data.active_lender_count });
	// svelte-ignore state_referenced_locally
	let repeatReferralRate = $state<CurrentTargetPair>({ ...data.repeat_referral_rate });
	// svelte-ignore state_referenced_locally
	let avgProcessingDays = $state<CurrentTargetPair>({ ...data.avg_processing_days });

	// ── Metric definitions ───────────────────────────────────────
	const metrics = [
		{
			key: 'files_per_month' as const,
			label: 'Files per Month',
			description: 'Number of loan files you process monthly',
			icon: FileText,
			iconColor: 'text-blue-600',
			iconBg: 'from-blue-50 to-blue-100',
			unit: 'files',
			step: 1,
			lowerIsBetter: false
		},
		{
			key: 'disbursement_volume' as const,
			label: 'Disbursement Volume',
			description: 'Total monthly disbursement amount in lakhs',
			icon: IndianRupee,
			iconColor: 'text-emerald-600',
			iconBg: 'from-emerald-50 to-emerald-100',
			unit: 'lakhs',
			prefix: '\u20B9',
			step: 1,
			lowerIsBetter: false
		},
		{
			key: 'active_lender_count' as const,
			label: 'Active Lender Count',
			description: 'Number of lenders you actively submit files to',
			icon: Landmark,
			iconColor: 'text-purple-600',
			iconBg: 'from-purple-50 to-purple-100',
			unit: 'lenders',
			step: 1,
			lowerIsBetter: false
		},
		{
			key: 'repeat_referral_rate' as const,
			label: 'Repeat / Referral Rate',
			description: 'Percentage of business from repeat or referred customers',
			icon: Percent,
			iconColor: 'text-stone-600',
			iconBg: 'from-stone-50 to-stone-100',
			unit: '%',
			step: 1,
			max: 100,
			lowerIsBetter: false
		},
		{
			key: 'avg_processing_days' as const,
			label: 'Avg Processing Days',
			description: 'Average days from file login to disbursement',
			icon: Calendar,
			iconColor: 'text-red-500',
			iconBg: 'from-red-50 to-red-100',
			unit: 'days',
			step: 1,
			lowerIsBetter: true
		}
	];

	// ── Get/Set helpers ──────────────────────────────────────────
	function getPair(key: string): CurrentTargetPair {
		switch (key) {
			case 'files_per_month':
				return filesPerMonth;
			case 'disbursement_volume':
				return disbursementVolume;
			case 'active_lender_count':
				return activeLenderCount;
			case 'repeat_referral_rate':
				return repeatReferralRate;
			case 'avg_processing_days':
				return avgProcessingDays;
			default:
				return { current: 0, target: 0 };
		}
	}

	function setPairCurrent(key: string, val: number) {
		const v = Math.max(0, val || 0);
		switch (key) {
			case 'files_per_month':
				filesPerMonth = { ...filesPerMonth, current: v };
				break;
			case 'disbursement_volume':
				disbursementVolume = { ...disbursementVolume, current: v };
				break;
			case 'active_lender_count':
				activeLenderCount = { ...activeLenderCount, current: v };
				break;
			case 'repeat_referral_rate':
				repeatReferralRate = { ...repeatReferralRate, current: v };
				break;
			case 'avg_processing_days':
				avgProcessingDays = { ...avgProcessingDays, current: v };
				break;
		}
		emitUpdate();
	}

	function setPairTarget(key: string, val: number) {
		const v = Math.max(0, val || 0);
		switch (key) {
			case 'files_per_month':
				filesPerMonth = { ...filesPerMonth, target: v };
				break;
			case 'disbursement_volume':
				disbursementVolume = { ...disbursementVolume, target: v };
				break;
			case 'active_lender_count':
				activeLenderCount = { ...activeLenderCount, target: v };
				break;
			case 'repeat_referral_rate':
				repeatReferralRate = { ...repeatReferralRate, target: v };
				break;
			case 'avg_processing_days':
				avgProcessingDays = { ...avgProcessingDays, target: v };
				break;
		}
		emitUpdate();
	}

	function getImprovement(
		key: string,
		lowerIsBetter: boolean
	): { positive: boolean; text: string } | null {
		const pair = getPair(key);
		if (pair.current === 0 && pair.target === 0) return null;
		if (pair.current === 0) return { positive: true, text: 'New goal' };

		const diff = pair.target - pair.current;
		if (diff === 0) return { positive: false, text: 'No change' };

		const pct = Math.abs(Math.round((diff / pair.current) * 100));
		if (lowerIsBetter) {
			return diff < 0
				? { positive: true, text: `${pct}% reduction` }
				: { positive: false, text: `${pct}% increase` };
		}
		return diff > 0
			? { positive: true, text: `${pct}% growth` }
			: { positive: false, text: `${pct}% decline` };
	}

	function emitUpdate() {
		onUpdate({
			files_per_month: { ...filesPerMonth },
			disbursement_volume: { ...disbursementVolume },
			active_lender_count: { ...activeLenderCount },
			repeat_referral_rate: { ...repeatReferralRate },
			avg_processing_days: { ...avgProcessingDays },
			set_at: new Date()
		});
	}
</script>

<div class="space-y-8">
	<!-- ── Section Header ─────────────────────────────────────── -->
	<div class="flex items-center gap-3 border-b border-[var(--dash-border)] pb-2">
		<div
			class="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100"
		>
			<TrendingUp class="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
		</div>
		<div>
			<h2 class="text-lg font-bold text-[var(--dash-text)]">6-Month Goals</h2>
			<p class="text-sm text-[var(--dash-text-secondary)]">
				Set where you are today and where you want to be in 6 months
			</p>
		</div>
	</div>

	<!-- ── Motivational Banner ────────────────────────────────── -->
	<div
		class="rounded-xl border border-stone-200 bg-gradient-to-r from-stone-50 to-neutral-50 p-4 dark:border-stone-800 dark:from-stone-950/40 dark:to-neutral-950/40"
	>
		<p class="text-sm text-stone-800 dark:text-stone-400">
			Setting clear goals helps us tailor your dashboard and track your progress. Be realistic but
			ambitious -- these will be your benchmarks.
		</p>
	</div>

	<!-- ── Metric Cards ───────────────────────────────────────── -->
	<div class="space-y-4">
		{#each metrics as metric}
			{@const pair = getPair(metric.key)}
			{@const improvement = getImprovement(metric.key, metric.lowerIsBetter)}
			<div
				class="rounded-xl border-2 border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] p-5 transition-colors hover:border-[var(--dash-border)]"
			>
				<div class="flex flex-col gap-4">
					<!-- Metric Header -->
					<div class="flex items-center gap-3">
						<div
							class="h-10 w-10 rounded-lg bg-gradient-to-br {metric.iconBg} flex flex-shrink-0 items-center justify-center"
						>
							<metric.icon class="h-5 w-5 {metric.iconColor}" />
						</div>
						<div class="flex-1">
							<h3 class="text-sm font-semibold text-[var(--dash-text)]">{metric.label}</h3>
							<p class="text-xs text-[var(--dash-text-muted)]">{metric.description}</p>
						</div>
						{#if improvement}
							<div
								class="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium
								{improvement.positive
									? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
									: 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400'}"
							>
								{#if improvement.positive}
									<TrendingUp class="h-3 w-3" />
								{:else}
									<TrendingDown class="h-3 w-3" />
								{/if}
								{improvement.text}
							</div>
						{/if}
					</div>

					<!-- Current / Target Inputs -->
					<div class="flex items-center gap-3 md:gap-4">
						<!-- Current -->
						<div class="flex-1">
							<label
								for="{metric.key}_current"
								class="mb-1 block text-xs font-medium text-[var(--dash-text-secondary)]"
							>
								Today
							</label>
							<div class="relative">
								{#if metric.prefix}
									<span
										class="absolute top-1/2 left-3 -translate-y-1/2 text-sm text-[var(--dash-text-muted)]"
										>{metric.prefix}</span
									>
								{/if}
								<input
									id="{metric.key}_current"
									type="number"
									min="0"
									max={metric.max ?? undefined}
									step={metric.step}
									value={pair.current}
									oninput={(e) =>
										setPairCurrent(metric.key, Number((e.target as HTMLInputElement).value))}
									class="w-full {metric.prefix
										? 'pl-8'
										: 'pl-4'} rounded-xl border-2 border-[var(--dash-border)] bg-[var(--dash-bg-card)] py-3 pr-4 text-sm font-medium text-[var(--dash-text)] transition-all outline-none
										focus:border-stone-400 focus:ring-2 focus:ring-stone-100"
									placeholder="0"
								/>
							</div>
							{#if metric.unit}
								<p class="mt-1 text-xs text-[var(--dash-text-muted)]">{metric.unit}</p>
							{/if}
						</div>

						<!-- Arrow -->
						<div class="flex-shrink-0 pt-5">
							<ArrowRight class="h-5 w-5 text-[var(--dash-text-muted)]" />
						</div>

						<!-- Target -->
						<div class="flex-1">
							<label
								for="{metric.key}_target"
								class="mb-1 block text-xs font-medium text-[var(--dash-text-secondary)]"
							>
								6-Month Target
							</label>
							<div class="relative">
								{#if metric.prefix}
									<span
										class="absolute top-1/2 left-3 -translate-y-1/2 text-sm text-[var(--dash-text-muted)]"
										>{metric.prefix}</span
									>
								{/if}
								<input
									id="{metric.key}_target"
									type="number"
									min="0"
									max={metric.max ?? undefined}
									step={metric.step}
									value={pair.target}
									oninput={(e) =>
										setPairTarget(metric.key, Number((e.target as HTMLInputElement).value))}
									class="w-full {metric.prefix
										? 'pl-8'
										: 'pl-4'} rounded-xl border-2 border-stone-200 bg-stone-50/30 py-3 pr-4 text-sm font-medium text-[var(--dash-text)] transition-all outline-none focus:border-stone-400 focus:ring-2
										focus:ring-stone-100 dark:border-stone-800 dark:bg-stone-950/20"
									placeholder="0"
								/>
							</div>
							{#if metric.unit}
								<p class="mt-1 text-xs text-[var(--dash-text-muted)]">{metric.unit}</p>
							{/if}
						</div>
					</div>

					{#if errors[`${metric.key}.current`] || errors[`${metric.key}.target`]}
						<p class="flex items-center gap-1 text-xs text-red-500">
							<AlertCircle class="h-3 w-3" />
							{errors[`${metric.key}.current`] || errors[`${metric.key}.target`]}
						</p>
					{/if}
				</div>
			</div>
		{/each}
	</div>

	<!-- ── Tip ────────────────────────────────────────────────── -->
	<div
		class="rounded-xl border border-blue-100 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/40"
	>
		<p class="text-xs text-blue-700 dark:text-blue-400">
			<strong>Tip:</strong> Your goals will power your analytics dashboard. You can always adjust them
			later from Settings.
		</p>
	</div>
</div>
