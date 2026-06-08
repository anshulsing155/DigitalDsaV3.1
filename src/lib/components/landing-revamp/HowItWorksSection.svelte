<script lang="ts">
	import { onMount } from 'svelte';
	import { gsap } from '$lib/utils/gsapSetup';
	import FileText from 'lucide-svelte/icons/file-text';
	import Target from 'lucide-svelte/icons/target';
	import CheckCircle from 'lucide-svelte/icons/check-circle';
	import SectionWrapper from './shared/SectionWrapper.svelte';
	import SectionTitle from './shared/SectionTitle.svelte';
	import PrimaryButton from './shared/PrimaryButton.svelte';
	import { landingNav } from '$lib/state/landingNavigation.svelte';

	function handleCTA() {
		landingNav.handleCTA();
	}

	const steps = [
		{
			iconName: 'file-text' as const,
			number: '01',
			title: 'Enter Client Profile',
			description:
				'Income profiling (12 types), employment, obligations, company directors — everything banks actually evaluate.',
			footer: '~15 minutes'
		},
		{
			iconName: 'target' as const,
			number: '02',
			title: 'See Who Will Approve',
			description:
				'50+ bank policies evaluated instantly. Fit percentage, likely amount, best DSA code, nearest RM.',
			footer: 'Instant'
		},
		{
			iconName: 'check-circle' as const,
			number: '03',
			title: 'File & Close',
			description:
				'Auto-generated file builder, document checklist, and verified RM contact. Ready to submit.',
			footer: 'Done'
		}
	];

	let cardsRef: HTMLDivElement | undefined = $state(undefined);

	onMount(() => {
		if (!cardsRef) return;
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		const cards = cardsRef.querySelectorAll('.hiw-card');
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

<SectionWrapper id="how-it-works" background="default">
	<SectionTitle title="How It Works" subtitle="Three steps. Fifteen minutes. Full clarity." />

	<div bind:this={cardsRef} class="mb-12 grid grid-cols-1 gap-8 md:grid-cols-3">
		{#each steps as step}
			<div class="hiw-card">
				<div class="hiw-header">
					<span class="hiw-number">{step.number}</span>
					<div class="hiw-icon-wrap">
						{#if step.iconName === 'file-text'}
							<FileText class="hiw-icon" />
						{:else if step.iconName === 'target'}
							<Target class="hiw-icon" />
						{:else}
							<CheckCircle class="hiw-icon" />
						{/if}
					</div>
				</div>
				<h3 class="hiw-title">{step.title}</h3>
				<p class="hiw-desc">{step.description}</p>
				<p class="hiw-footer">{step.footer}</p>
			</div>
		{/each}
	</div>

	<p class="hiw-footnote">
		Yes, it takes 15 minutes. Because real credit assessment isn't a 2-minute bluff.
	</p>

	<div class="text-center">
		<PrimaryButton onclick={handleCTA}>Try It Free</PrimaryButton>
	</div>
</SectionWrapper>

<style>
	.hiw-card {
		border-radius: 1rem;
		border: 1px solid var(--landing-glass-border);
		background: var(--landing-glass-bg);
		padding: 2rem;
		backdrop-filter: blur(var(--landing-glass-blur));
		-webkit-backdrop-filter: blur(var(--landing-glass-blur));
		box-shadow: var(--landing-shadow-glass);
		transition: all 0.3s ease;
	}
	.hiw-card:hover {
		box-shadow: var(--landing-shadow-glass-hover);
		border-color: var(--landing-glass-border-glow);
		transform: translateY(-2px);
	}
	.hiw-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 1.25rem;
	}
	.hiw-number {
		font-size: 0.875rem;
		font-weight: 700;
		color: var(--landing-accent-accessible);
	}
	.hiw-icon-wrap {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.5rem;
		height: 2.5rem;
		border-radius: 0.75rem;
		background: var(--landing-accent-subtle);
		border: 1px solid var(--landing-glass-border);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
	}
	:global(.hiw-icon) {
		width: 1.25rem;
		height: 1.25rem;
		color: var(--landing-accent-accessible);
	}
	.hiw-title {
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--dark-text);
		margin-bottom: 0.75rem;
	}
	.hiw-desc {
		color: var(--landing-text-muted);
		line-height: 1.6;
		margin-bottom: 1rem;
	}
	.hiw-footer {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--landing-accent-accessible);
	}

	.hiw-footnote {
		text-align: center;
		font-size: 0.875rem;
		font-style: italic;
		color: var(--landing-text-muted);
		margin-bottom: 2rem;
	}
</style>
