<!-- src/lib/components/website/SecondCardTest.svelte -->
<script lang="ts">
	import { Calculator, TrendingUp, PieChart, GitBranch, Map, Clock } from 'lucide-svelte';
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
			link: '/money-map/how-long-will-your-savings-support-you',
			title: 'Client Savings Analysis'
		},
		{
			icon: TrendingUp,
			link: '/money-map/how-long-will-it-take-to-save',
			title: 'Investment Projections'
		},
		{
			icon: PieChart,
			link: '/money-map/how-to-reach-your-desired-corpus',
			title: 'SIP & Corpus Modelling'
		}
		// {
		//   icon: GitBranch,
		//   link: "/money-map/how-much-can-i-save-with-regular-contributions",
		//   title: "What-If Scenarios",
		// },
		// {
		//   icon: Map,
		//   link: "/money-map/how-much-to-save-by-retirement",
		//   title: "Retirement Roadmap",
		// },
	];
</script>

<div
	class="flex w-full flex-col items-start justify-between gap-4 overflow-hidden rounded-xl border border-[var(--landing-glass-border)] bg-[var(--landing-bg-alt)] text-[var(--landing-text)] shadow-[var(--landing-shadow-glass)]"
>
	<div class="flex w-full flex-col gap-4 p-4">
		<!-- Hero Section -->
		<div class="flex w-full flex-col items-start justify-start gap-2">
			<h1 class="typography-h1 font-bold">
				Will Your Client's Money
				<span
					class="bg-gradient-to-r from-[var(--landing-accent)] to-[var(--landing-accent-hover)] bg-clip-text text-transparent"
				>
					Outlive Them?
				</span>
			</h1>
			<h2 class="typography-h2 text-start font-semibold">
				Help clients plan — and close more advisory deals.
			</h2>
			<p class="typography-body-md text-start text-[var(--landing-text-secondary)]">
				Most clients retire blind. You can be the DSA who shows them the full picture.
			</p>
		</div>

		<!-- Features Section -->
		<div class="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
			{#each features as feature}
				<FeatureCardCover {...feature} />
			{/each}
		</div>
	</div>

	<!-- CTA Section -->
	<div
		class="flex w-full justify-center bg-gradient-to-r from-[var(--landing-accent)] via-[var(--landing-accent)] to-[var(--landing-accent-hover)] px-4 py-10"
	>
		<div class="flex w-full max-w-md flex-col gap-2 text-center">
			<h2 class="typography-h3 font-bold text-[var(--landing-accent-accessible)]">
				Become a Trusted Financial Advisor
			</h2>
			<p class="typography-body-md text-[var(--landing-accent-accessible)] opacity-90">
				Use wealth mapping tools to build deeper client relationships
			</p>

			<button
				onclick={() => goto('/money-map/how-long-will-your-savings-support-you')}
				class="typography-button mt-2 inline-flex transform cursor-pointer items-center justify-center gap-3 rounded-xl border-0 bg-[var(--landing-section-dark-bg)] px-4 py-2 text-center font-semibold text-[var(--landing-bg)] transition-all duration-300 hover:scale-105 hover:opacity-90 hover:shadow-xl"
			>
				<Clock class="h-4 w-4" />
				Run a Client Wealth Check-Up
			</button>

			<div
				class="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs font-semibold text-[var(--landing-accent-accessible)] opacity-85"
			>
				<span class="flex items-center gap-1">
					<span class="h-1.5 w-1.5 rounded-full bg-current"></span> Free for Partners
				</span>
				<span class="flex items-center gap-1">
					<span class="h-1.5 w-1.5 rounded-full bg-current"></span> White-label Reports
				</span>
				<span class="flex items-center gap-1">
					<span class="h-1.5 w-1.5 rounded-full bg-current"></span> Instant Results
				</span>
			</div>
		</div>
	</div>
</div>
