<!-- src/lib/components/website/AdvanceCalculator.svelte -->
<script lang="ts">
	import {
		Calculator,
		TrendingUp,
		Layers,
		ChartLine,
		PiggyBank,
		Shield,
		Clock
	} from 'lucide-svelte';
	import FeatureCardCover from './FeatureCardCover.svelte';
	import { goto } from '$app/navigation';

	interface Feature {
		icon: any;
		title: string;
		link: string;
	}

	const features: Feature[] = [
		{
			icon: Calculator,
			link: '/planners/part-payment-planner',
			title: 'Part Payment Strategy'
		},
		{
			icon: TrendingUp,
			link: '/planners/flexible-emi-planner',
			title: 'EMI Step-Up Planner'
		},
		{
			icon: Layers,
			link: '/planners/both',
			title: 'Combined Strategy'
		}
	];
</script>

<div
	class="flex h-full w-full flex-col justify-between gap-4 overflow-hidden rounded-xl border border-[var(--landing-glass-border)] bg-[var(--landing-bg-alt)] text-[var(--landing-text)] shadow-[var(--landing-shadow-glass)]"
>
	<div class="mx-auto flex w-full flex-col justify-between gap-4 p-4">
		<!-- Header Section -->
		<div class="flex w-full flex-col items-start justify-start gap-2">
			<h1 class="typography-h1 font-bold">
				Help Clients Get Debt-Free <br />
				<span
					class="flex items-start bg-gradient-to-r from-[var(--landing-accent)] to-[var(--landing-accent-hover)] bg-clip-text text-start text-transparent"
				>
					Years Earlier
				</span>
			</h1>
			<p class="typography-body-md text-start text-[var(--landing-text-secondary)]">
				Present clients with smart repayment strategies that save lakhs in interest. Close more
				deals with clear, visual payoff roadmaps.
			</p>
		</div>

		<!-- Features Grid -->
		<div class="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
			{#each features as feature}
				<FeatureCardCover {...feature} />
			{/each}
		</div>
	</div>

	<!-- Benefits Grid -->
	<div
		class="flex flex-col gap-4 bg-gradient-to-r from-[var(--landing-accent)] via-[var(--landing-accent)] to-[var(--landing-accent-hover)] p-4"
	>
		<div class="grid grid-cols-1 gap-4 text-left sm:grid-cols-2">
			<div class="flex items-start gap-2">
				<div class="mt-1 flex items-center justify-center">
					<PiggyBank color="#16a34a" size="24" />
				</div>
				<div class="flex flex-col items-start">
					<p class="typography-h4 font-bold text-[var(--landing-accent-accessible)]">
						Client Interest Savings
					</p>
					<p class="typography-body-sm text-[var(--landing-accent-accessible)] opacity-90">
						Show clients 30-60% interest savings with optimized repayment strategies — a powerful
						closing tool.
					</p>
				</div>
			</div>

			<div class="flex items-start gap-2">
				<div class="mt-1 flex items-center justify-center">
					<ChartLine color="#9333ea" size="24" />
				</div>
				<div class="flex flex-col items-start">
					<p class="typography-h4 font-bold text-[var(--landing-accent-accessible)]">
						Visual Progress Reports
					</p>
					<p class="typography-body-sm text-[var(--landing-accent-accessible)] opacity-90">
						Generate shareable analytics and milestone reports that keep clients engaged
						post-disbursement.
					</p>
				</div>
			</div>

			<div class="flex items-start gap-2">
				<div class="mt-1 flex items-center justify-center">
					<Clock color="#2563eb" size="22" />
				</div>
				<div class="flex flex-col items-start">
					<p class="typography-h4 font-bold text-[var(--landing-accent-accessible)]">
						Tenure Reduction Demos
					</p>
					<p class="typography-body-sm text-[var(--landing-accent-accessible)] opacity-90">
						Demonstrate 5-10 year tenure cuts live during client meetings to build trust instantly.
					</p>
				</div>
			</div>

			<div class="flex items-start gap-2">
				<div class="mt-1 flex items-center justify-center">
					<Shield color="#ea580c" size="24" />
				</div>
				<div class="flex flex-col items-start">
					<p class="typography-h4 font-bold text-[var(--landing-accent-accessible)]">
						Risk-Balanced Plans
					</p>
					<p class="typography-body-sm text-[var(--landing-accent-accessible)] opacity-90">
						Recommend strategies that maintain emergency funds while optimizing repayments —
						responsible advice clients value.
					</p>
				</div>
			</div>
		</div>

		<!-- CTA Button -->
		<div class="mt-2 flex w-full flex-col gap-2 text-center">
			<button
				onclick={() => goto('/planners/part-payment-planner')}
				class="typography-button inline-flex transform cursor-pointer items-center justify-center gap-3 rounded-xl border-0 bg-[var(--landing-section-dark-bg)] px-6 py-3 text-center font-semibold text-[var(--landing-bg)] transition-all duration-300 hover:scale-105 hover:opacity-90 hover:shadow-xl"
			>
				<Clock class="h-5 w-5" />
				Try a Client Repayment Plan
			</button>

			<div
				class="mt-2 flex flex-wrap justify-center gap-4 text-xs font-semibold text-[var(--landing-accent-accessible)] opacity-85"
			>
				<div class="flex items-center gap-1">
					<span class="h-1.5 w-1.5 rounded-full bg-current"></span> Free for Partners
				</div>
				<div class="flex items-center gap-1">
					<span class="h-1.5 w-1.5 rounded-full bg-current"></span> Shareable Reports
				</div>
				<div class="flex items-center gap-1">
					<span class="h-1.5 w-1.5 rounded-full bg-current"></span> Instant Results
				</div>
			</div>
		</div>
	</div>
</div>
