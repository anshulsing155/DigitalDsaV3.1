<script lang="ts">
	import { onMount } from 'svelte';
	import { gsap } from '$lib/utils/gsapSetup';
	import Check from 'lucide-svelte/icons/check';
	import SectionWrapper from './shared/SectionWrapper.svelte';
	import SectionTitle from './shared/SectionTitle.svelte';
	import PrimaryButton from './shared/PrimaryButton.svelte';
	import { landingNav } from '$lib/state/landingNavigation.svelte';
	import { PLAN_LIST, TRIAL_DAYS } from '$lib/config/billing';

	function handleCTA() {
		landingNav.handleCTA();
	}

	// Derive landing page cards from the single source of truth (billing.ts).
	// "Popular" was previously read from the static `plan.badge` field, which
	// carried two simultaneous badges ("Most Popular" + "Best Value") that
	// the D.6 audit flagged as confusing. The static field is gone; on the
	// landing page (where the visitor has no active-case count yet) we always
	// surface Pro as the marketing recommendation — same effect, no badge
	// field required.
	const plans = PLAN_LIST.map((p) => ({
		name: p.name.toUpperCase(),
		price: `₹${p.priceMonthly.toLocaleString('en-IN')}`,
		period: '/mo',
		popular: p.id === 'pro',
		features: p.features
	}));

	const trustBadges = [
		`${TRIAL_DAYS}-day free trial`,
		'No credit card needed',
		'No commission cut',
		'Cancel anytime'
	];

	let cardsRef: HTMLDivElement | undefined = $state(undefined);

	onMount(() => {
		if (!cardsRef) return;
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		const cards = cardsRef.querySelectorAll('.pricing-card');
		if (!cards.length) return;
		const ctx = gsap.context(() => {
			gsap.fromTo(
				cards,
				{ opacity: 0, y: 40 },
				{
					opacity: 1,
					y: 0,
					duration: 0.6,
					stagger: 0.15,
					ease: 'power3.out',
					scrollTrigger: {
						trigger: cardsRef,
						start: 'top 85%',
						toggleActions: 'play none none none'
					}
				}
			);
		}, cardsRef);
		return () => ctx.revert();
	});
</script>

<SectionWrapper id="pricing" background="default">
	<SectionTitle
		title="One price. No commission sharing."
		subtitle="Flat subscription — you keep 100% of your payouts."
	/>

	<div bind:this={cardsRef} class="mx-auto mb-12 grid max-w-5xl grid-cols-1 gap-8 md:grid-cols-3">
		{#each plans as plan}
			<div class="pricing-card" class:popular={plan.popular}>
				{#if plan.popular}
					<span class="popular-badge">Popular</span>
				{/if}

				<h3 class="plan-name">{plan.name}</h3>
				<div class="plan-price">
					<span class="price-amount">{plan.price}</span>
					<span class="price-period">{plan.period}</span>
				</div>

				<ul class="feature-list">
					{#each plan.features as feature}
						<li class="feature-item">
							<Check class="feature-check" />
							{feature}
						</li>
					{/each}
				</ul>

				<PrimaryButton
					onclick={handleCTA}
					fullWidth
					arrow={false}
					variant={plan.popular ? 'gold' : 'dark'}
				>
					Start Free
				</PrimaryButton>
			</div>
		{/each}
	</div>

	<div class="trust-badges">
		{#each trustBadges as badge}
			<div class="badge-item">
				<Check class="badge-check" />
				{badge}
			</div>
		{/each}
	</div>
</SectionWrapper>

<style>
	.pricing-card {
		position: relative;
		border-radius: 1rem;
		border: 1px solid var(--landing-glass-border);
		background: var(--landing-glass-bg);
		padding: 2rem;
		display: flex;
		flex-direction: column;
		backdrop-filter: blur(var(--landing-glass-blur));
		-webkit-backdrop-filter: blur(var(--landing-glass-blur));
		box-shadow: var(--landing-shadow-glass);
		transition: all 0.3s ease;
	}
	.pricing-card:hover {
		box-shadow: var(--landing-shadow-card);
		border-color: var(--landing-glass-border-glow);
		transform: translateY(-2px);
	}
	.pricing-card.popular {
		border-color: rgba(255, 204, 0, 0.4);
		box-shadow:
			0 8px 32px rgba(255, 204, 0, 0.12),
			var(--landing-shadow-glass);
		transform: scale(1.03);
	}
	@media (min-width: 768px) {
		.pricing-card.popular {
			transform: scale(1.05);
		}
	}
	.popular-badge {
		position: absolute;
		top: -0.75rem;
		left: 50%;
		transform: translateX(-50%);
		border-radius: 9999px;
		background: var(--landing-accent);
		color: var(--landing-accent-text);
		padding: 0.25rem 1rem;
		font-size: 0.75rem;
		font-weight: 700;
		box-shadow: 0 2px 12px rgba(255, 204, 0, 0.35);
	}
	.plan-name {
		font-size: 0.875rem;
		font-weight: 700;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: var(--landing-text-muted);
		margin-bottom: 0.5rem;
	}
	.plan-price {
		margin-bottom: 1.5rem;
	}
	.price-amount {
		font-size: 2.25rem;
		font-weight: 700;
		color: var(--dark-text);
	}
	.price-period {
		color: var(--landing-text-muted);
	}
	.feature-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin-bottom: 2rem;
		flex: 1;
		list-style: none;
		padding: 0;
	}
	.feature-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: var(--landing-text-muted);
	}
	:global(.feature-check) {
		width: 1rem;
		height: 1rem;
		flex-shrink: 0;
		color: var(--landing-accent-accessible);
	}
	.trust-badges {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 1.5rem;
	}
	.badge-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		color: var(--landing-text-muted);
	}
	:global(.badge-check) {
		width: 1rem;
		height: 1rem;
		color: var(--landing-accent-accessible);
	}
</style>
