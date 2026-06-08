<script lang="ts">
	import { onMount } from 'svelte';
	import { gsap } from '$lib/utils/gsapSetup';
	import PrimaryButton from './shared/PrimaryButton.svelte';
	import { landingNav } from '$lib/state/landingNavigation.svelte';
	import { TRIAL_DAYS } from '$lib/config/billing';

	function handleCTA() {
		landingNav.handleCTA();
	}

	let sectionRef: HTMLElement | undefined = $state(undefined);

	onMount(() => {
		if (!sectionRef) return;
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		const items = sectionRef.querySelectorAll('.final-cta-content > *');
		if (!items.length) return;
		const ctx = gsap.context(() => {
			gsap.fromTo(
				items,
				{ opacity: 0, y: 30 },
				{
					opacity: 1,
					y: 0,
					duration: 0.6,
					stagger: 0.12,
					ease: 'power3.out',
					scrollTrigger: {
						trigger: sectionRef,
						start: 'top 85%',
						toggleActions: 'play none none none'
					}
				}
			);
		}, sectionRef);
		return () => ctx.revert();
	});
</script>

<section bind:this={sectionRef} id="final-cta" class="final-cta-section">
	<!-- Layered gradient + glossy radial + noise -->
	<div class="cta-gradient" aria-hidden="true"></div>
	<div class="cta-radial" aria-hidden="true"></div>
	<div class="cta-noise" aria-hidden="true"></div>
	<div class="final-cta-content">
		<p class="cta-eyebrow">Stop researching. Start closing.</p>
		<h2 class="cta-headline">Your next file could be your fastest.</h2>
		<p class="cta-subhead">
			Join 1,247+ DSAs who know which lender will approve — before they apply.
		</p>
		<div class="cta-btn-wrap">
			<PrimaryButton onclick={handleCTA} size="lg" variant="black">Try it free &rarr;</PrimaryButton
			>
		</div>
		<div class="cta-badges">
			<span class="cta-badge"><span class="cta-badge-dot"></span> {TRIAL_DAYS}-day trial</span>
			<span class="cta-badge"><span class="cta-badge-dot"></span> No credit card</span>
			<span class="cta-badge"><span class="cta-badge-dot"></span> Cancel anytime</span>
		</div>
	</div>
</section>

<style>
	/* Yellow gradient section with glossy radial highlights */
	.final-cta-section {
		position: relative;
		overflow: hidden;
		padding: 5rem 0;
	}
	@media (min-width: 768px) {
		.final-cta-section {
			padding: 7rem 0;
		}
	}

	.cta-gradient {
		position: absolute;
		inset: 0;
		background: linear-gradient(135deg, #ffcc00 0%, #e6b800 35%, #d4a800 65%, #ffcc00 100%);
	}

	.cta-radial {
		position: absolute;
		inset: 0;
		background:
			radial-gradient(ellipse at 30% 40%, rgba(255, 255, 255, 0.25) 0%, transparent 50%),
			radial-gradient(ellipse at 80% 70%, rgba(255, 255, 255, 0.12) 0%, transparent 40%);
	}

	.cta-noise {
		position: absolute;
		inset: 0;
		background: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
		opacity: 0.04;
		mix-blend-mode: overlay;
	}

	.final-cta-content {
		position: relative;
		z-index: 2;
		max-width: 48rem;
		margin: 0 auto;
		padding: 0 1rem;
		text-align: center;
	}

	/* Glossy black button — gradient bg with inner highlight */
	.final-cta-section :global(.primary-btn.black) {
		background: linear-gradient(180deg, #333 0%, #1a1a1a 100%);
		box-shadow:
			0 4px 20px rgba(0, 0, 0, 0.3),
			inset 0 1px 0 rgba(255, 255, 255, 0.1);
	}
	.final-cta-section :global(.primary-btn.black:hover) {
		box-shadow:
			0 8px 32px rgba(0, 0, 0, 0.4),
			inset 0 1px 0 rgba(255, 255, 255, 0.15);
	}
	.cta-eyebrow {
		font-size: 0.8125rem;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: #333333;
		margin-bottom: 1rem;
	}

	.cta-headline {
		font-size: clamp(1.875rem, 5vw, 3rem);
		font-weight: 700;
		color: #1a1a1a;
		margin-bottom: 1rem;
		letter-spacing: -0.025em;
	}
	.cta-subhead {
		font-size: 1.125rem;
		color: #333333;
		margin-bottom: 2.5rem;
	}
	.cta-btn-wrap {
		margin-bottom: 2rem;
	}
	.cta-badges {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 1.5rem;
	}
	.cta-badge {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		color: #333333;
	}
	.cta-badge-dot {
		display: inline-block;
		width: 0.375rem;
		height: 0.375rem;
		border-radius: 50%;
		background: #1a1a1a;
		flex-shrink: 0;
	}
</style>
