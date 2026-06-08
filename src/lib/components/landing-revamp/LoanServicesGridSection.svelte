<script lang="ts">
	import { onMount } from 'svelte';
	import { gsap } from '$lib/utils/gsapSetup';
	import SectionWrapper from './shared/SectionWrapper.svelte';
	import SectionTitle from './shared/SectionTitle.svelte';
	import Home from 'lucide-svelte/icons/home';
	import Landmark from 'lucide-svelte/icons/landmark';
	import Building2 from 'lucide-svelte/icons/building-2';
	import Car from 'lucide-svelte/icons/car';
	import Gem from 'lucide-svelte/icons/gem';
	import Wrench from 'lucide-svelte/icons/wrench';
	import User from 'lucide-svelte/icons/user';
	import Briefcase from 'lucide-svelte/icons/briefcase';
	import GraduationCap from 'lucide-svelte/icons/graduation-cap';
	import ShoppingCart from 'lucide-svelte/icons/shopping-cart';
	import CreditCard from 'lucide-svelte/icons/credit-card';
	import Zap from 'lucide-svelte/icons/zap';
	import Banknote from 'lucide-svelte/icons/banknote';
	import Wallet from 'lucide-svelte/icons/wallet';
	import TrendingDown from 'lucide-svelte/icons/trending-down';

	const categories = [
		{
			name: 'Secured',
			color: '#ffcc00',
			loans: [
				{ name: 'Home Loan', icon: Home },
				{ name: 'Plot & Construction', icon: Landmark },
				{ name: 'LAP', icon: Building2 },
				{ name: 'Vehicle', icon: Car },
				{ name: 'Gold', icon: Gem },
				{ name: 'Machinery', icon: Wrench }
			]
		},
		{
			name: 'Unsecured',
			color: '#888888',
			loans: [
				{ name: 'Personal', icon: User },
				{ name: 'Business', icon: Briefcase },
				{ name: 'Education', icon: GraduationCap },
				{ name: 'Consumer Durable', icon: ShoppingCart },
				{ name: 'Credit Card', icon: CreditCard },
				{ name: 'Insta Loan', icon: Zap }
			]
		},
		{
			name: 'Working Capital',
			color: '#555555',
			loans: [
				{ name: 'OD Limit', icon: Banknote },
				{ name: 'CC Limit', icon: Wallet },
				{ name: 'Dropline OD', icon: TrendingDown }
			]
		}
	];

	let gridRef: HTMLDivElement | undefined = $state(undefined);

	onMount(() => {
		if (!gridRef) return;
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		const cards = gridRef.querySelectorAll('.loan-card');
		if (!cards.length) return;
		const ctx = gsap.context(() => {
			gsap.fromTo(
				cards,
				{ opacity: 0, y: 30 },
				{
					opacity: 1,
					y: 0,
					duration: 0.5,
					stagger: 0.05,
					ease: 'power3.out',
					scrollTrigger: {
						trigger: gridRef,
						start: 'top 85%',
						toggleActions: 'play none none none'
					}
				}
			);
		}, gridRef);
		return () => ctx.revert();
	});
</script>

<SectionWrapper id="loan-services" background="default">
	<SectionTitle
		title="15 Loan Types. One Workflow."
		subtitle="File any case through a single intelligent form."
	/>

	<div bind:this={gridRef} class="categories-grid">
		{#each categories as category}
			<div class="category-block">
				<h3 class="category-name" style="color: {category.color};">{category.name}</h3>
				<div class="loans-grid">
					{#each category.loans as loan}
						<div class="loan-card" style="border-left-color: {category.color};">
							<div class="loan-icon" style="color: {category.color};">
								<loan.icon size={20} />
							</div>
							<span class="loan-name">{loan.name}</span>
						</div>
					{/each}
				</div>
			</div>
		{/each}
	</div>
</SectionWrapper>

<style>
	.categories-grid {
		display: flex;
		flex-direction: column;
		gap: 2.5rem;
	}

	.category-name {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		margin-bottom: 1rem;
	}

	.loans-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0.75rem;
	}

	@media (min-width: 640px) {
		.loans-grid {
			grid-template-columns: repeat(3, 1fr);
		}
	}

	@media (min-width: 1024px) {
		.loans-grid {
			grid-template-columns: repeat(6, 1fr);
		}
	}

	.loan-card {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.875rem 1rem;
		border-radius: 0.75rem;
		background: var(--landing-bg-card);
		border: 1px solid var(--landing-border);
		border-left: 3px solid;
		transition:
			transform 0.2s ease,
			box-shadow 0.2s ease;
		cursor: default;
	}

	.loan-card:hover {
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
	}

	.loan-icon {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.loan-name {
		font-size: 0.8rem;
		font-weight: 500;
		color: var(--landing-text);
		white-space: nowrap;
	}
</style>
