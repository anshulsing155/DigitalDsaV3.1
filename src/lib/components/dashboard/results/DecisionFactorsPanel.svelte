<script lang="ts">
	import {
		CircleCheck,
		AlertTriangle,
		Info,
		IndianRupee,
		CreditCard,
		House,
		Scale,
		User,
		Shield
	} from '$lib/utils/iconRegistry';

	// ── Props ────────────────────────────────────────────────────
	interface Factor {
		id: string;
		label: string;
		impact: 'positive' | 'negative' | 'neutral';
		description: string;
		metric?: { label: string; value: string; benchmark?: string };
		category: 'income' | 'credit' | 'property' | 'obligation' | 'profile' | 'policy';
	}

	interface Props {
		factors: Factor[];
	}

	let { factors }: Props = $props();

	// ── Category config ─────────────────────────────────────────
	const CATEGORY_CONFIG: Record<Factor['category'], { label: string; icon: typeof User }> = {
		income: { label: 'Income', icon: IndianRupee },
		credit: { label: 'Credit', icon: CreditCard },
		property: { label: 'Property', icon: House },
		obligation: { label: 'Obligations', icon: Scale },
		profile: { label: 'Profile', icon: User },
		policy: { label: 'Policy', icon: Shield }
	};

	// ── Impact config ───────────────────────────────────────────
	const IMPACT_CONFIG: Record<
		Factor['impact'],
		{ border: string; color: string; icon: typeof User }
	> = {
		positive: { border: 'border-l-emerald-500', color: 'text-emerald-500', icon: CircleCheck },
		negative: { border: 'border-l-red-500', color: 'text-red-500', icon: AlertTriangle },
		neutral: {
			border: 'border-l-[var(--dash-text-muted)]',
			color: 'text-[var(--dash-text-muted)]',
			icon: Info
		}
	};

	// ── Category ordering ───────────────────────────────────────
	const CATEGORY_ORDER: Factor['category'][] = [
		'income',
		'credit',
		'property',
		'obligation',
		'profile',
		'policy'
	];

	// ── Group factors by category ───────────────────────────────
	const groupedFactors = $derived.by(() => {
		const groups = new Map<Factor['category'], Factor[]>();
		for (const factor of factors) {
			const existing = groups.get(factor.category);
			if (existing) {
				existing.push(factor);
			} else {
				groups.set(factor.category, [factor]);
			}
		}
		// Return in defined order, skipping empty categories
		const ordered: Array<{ category: Factor['category']; items: Factor[] }> = [];
		for (const cat of CATEGORY_ORDER) {
			const items = groups.get(cat);
			if (items && items.length > 0) {
				ordered.push({ category: cat, items });
			}
		}
		return ordered;
	});
</script>

<div class="space-y-4 py-3">
	{#each groupedFactors as group (group.category)}
		{@const catConfig = CATEGORY_CONFIG[group.category]}
		{@const CatIcon = catConfig.icon}
		<div>
			<!-- Category header -->
			<div class="mb-2 flex items-center gap-1.5">
				<CatIcon class="h-3.5 w-3.5 text-[var(--dash-text-muted)]" />
				<span
					class="text-[13px] font-semibold tracking-wide text-[var(--dash-text-secondary)] uppercase"
				>
					{catConfig.label}
				</span>
			</div>

			<!-- Factors in this category -->
			<div class="space-y-1.5">
				{#each group.items as factor (factor.id)}
					{@const impactConfig = IMPACT_CONFIG[factor.impact]}
					{@const ImpactIcon = impactConfig.icon}
					<div class="border-l-2 {impactConfig.border} py-1.5 pl-3">
						<div class="flex items-start gap-2">
							<!-- Impact icon -->
							<ImpactIcon class="mt-0.5 h-3.5 w-3.5 shrink-0 {impactConfig.color}" />

							<div class="min-w-0 flex-1">
								<!-- Label + metric badge -->
								<div class="flex items-center gap-2">
									<span class="text-xs font-semibold text-[var(--dash-text)]">
										{factor.label}
									</span>
									{#if factor.metric}
										<span
											class="inline-flex items-center gap-1 rounded bg-[var(--dash-bg-alt)] px-1.5 py-0.5 font-mono text-[12px] text-[var(--dash-text-secondary)]"
										>
											{factor.metric.label}: {factor.metric.value}{#if factor.metric.benchmark}
												<span class="text-[var(--dash-text-muted)]">|</span>
												{factor.metric.benchmark}{/if}
										</span>
									{/if}
								</div>

								<!-- Description -->
								<p class="mt-0.5 text-[13px] leading-relaxed text-[var(--dash-text-muted)]">
									{factor.description}
								</p>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/each}

	{#if factors.length === 0}
		<p class="text-center text-xs text-[var(--dash-text-muted)]">No decision factors available.</p>
	{/if}
</div>
