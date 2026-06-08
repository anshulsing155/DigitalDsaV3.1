<script lang="ts">
	import { onMount } from 'svelte';
	import { gsap } from '$lib/utils/gsapSetup';
	import PrimaryButton from './shared/PrimaryButton.svelte';
	import { landingNav } from '$lib/state/landingNavigation.svelte';
	import { TRIAL_DAYS } from '$lib/config/billing';

	let heroRef: HTMLElement | undefined = $state(undefined);

	const stats = [
		{ value: '1,247+', label: 'Active DSAs' },
		{ value: '₹847 Cr+', label: 'Loans Matched' },
		{ value: '52+', label: 'Lender Policies' },
		{ value: '94%', label: 'First-File Approval' }
	];

	const checklist = [
		'Which bank will approve — before you apply',
		'Which DSA code pays the highest slab',
		'Which RM picks up — verified contacts',
		'Exact sanction amount — no surprises'
	];

	function handleCTA() {
		landingNav.handleCTA();
	}

	onMount(() => {
		if (!heroRef) return;
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

		const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

		/* -- Text column animations -- */
		const eyebrow = heroRef.querySelector('.hero-eyebrow');
		const headline = heroRef.querySelector('.hero-headline');
		const subhead = heroRef.querySelector('.hero-subhead');
		const checklistItems = heroRef.querySelectorAll('.checklist-row');
		const clarification = heroRef.querySelector('.hero-clarification');
		const cta = heroRef.querySelector('.hero-cta');

		if (eyebrow) tl.fromTo(eyebrow, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5 });
		if (headline)
			tl.fromTo(headline, { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 0.8 }, '-=0.2');
		if (subhead)
			tl.fromTo(subhead, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.6 }, '-=0.3');
		if (checklistItems.length)
			tl.fromTo(
				checklistItems,
				{ opacity: 0, x: -20 },
				{ opacity: 1, x: 0, duration: 0.4, stagger: 0.08 },
				'-=0.3'
			);
		if (clarification)
			tl.fromTo(clarification, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4 }, '-=0.1');
		if (cta)
			tl.fromTo(
				cta,
				{ opacity: 0, y: 20, scale: 0.95 },
				{ opacity: 1, y: 0, scale: 1, duration: 0.5 },
				'-=0.2'
			);

		/* -- Image column animation -- */
		const visual = heroRef.querySelector('.hero-visual');
		if (visual)
			tl.fromTo(
				visual,
				{ opacity: 0, x: 60, scale: 0.95 },
				{ opacity: 1, x: 0, scale: 1, duration: 0.8 },
				'-=0.6'
			);

		/* -- Stats bar animation -- */
		const statPills = heroRef.querySelectorAll('.stat-pill');
		if (statPills.length)
			tl.fromTo(
				statPills,
				{ opacity: 0, y: 20 },
				{ opacity: 1, y: 0, duration: 0.4, stagger: 0.08 },
				'-=0.3'
			);

		/* -- Floating ambient orbs — gentle yoyo drift -- */
		/* Store orb tweens so they get killed on unmount (prevents battery drain) */
		const orbTweens: gsap.core.Tween[] = [];
		const orbs = heroRef.querySelectorAll('.ambient-orb');
		orbs.forEach((orb, i) => {
			orbTweens.push(
				gsap.to(orb, {
					y: `+=${15 + i * 5}`,
					x: `+=${8 + i * 3}`,
					duration: 4 + i,
					ease: 'sine.inOut',
					yoyo: true,
					repeat: -1
				})
			);
		});

		return () => {
			tl.kill();
			orbTweens.forEach((tw) => tw.kill());
		};
	});
</script>

<section bind:this={heroRef} id="hero" class="hero-section">
	<!-- Decorative background layers -->
	<div class="dot-grid" aria-hidden="true"></div>
	<div class="ambient-orb orb-1" aria-hidden="true"></div>
	<div class="ambient-orb orb-2" aria-hidden="true"></div>
	<div class="ambient-orb orb-3" aria-hidden="true"></div>

	<div class="hero-container">
		<!-- LEFT: Text column -->
		<div class="hero-text">
			<p class="hero-eyebrow">For DSAs who are done guessing</p>

			<h1 class="hero-headline">
				Know the <span class="headline-gold">right lender</span><br />
				before you file.
			</h1>

			<p class="hero-subhead">
				50+ bank policies. One smart form. Instant results.<br />
				You stop researching. You start closing.
			</p>

			<ul class="hero-checklist">
				{#each checklist as item}
					<li class="checklist-row">
						<span class="checklist-dot"></span>
						<span>{item}</span>
					</li>
				{/each}
			</ul>

			<div class="hero-cta">
				<PrimaryButton size="lg" onclick={handleCTA}>Try it free &rarr;</PrimaryButton>
				<p class="hero-cta-note">No credit card &middot; {TRIAL_DAYS}-day trial &middot; Cancel anytime</p>
			</div>
		</div>

		<!-- RIGHT: Image column -->
		<div class="hero-visual">
			<div class="hero-image-wrapper">
				<img
					src="/images/loan-dsa.webp"
					alt="DSA agent on a call with bank RM, reviewing loan applications on his laptop"
					class="hero-image"
					loading="eager"
					decoding="async"
				/>
				<!-- Glass stat overlay at bottom of image -->
				<div class="hero-image-overlay">
					<div class="overlay-stat">
						<span class="overlay-stat-value">94%</span>
						<span class="overlay-stat-label">First-File Approval</span>
					</div>
					<div class="overlay-divider"></div>
					<div class="overlay-stat">
						<span class="overlay-stat-value">₹847Cr+</span>
						<span class="overlay-stat-label">Matched</span>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Bottom stats bar — frosted glass pills -->
	<div class="hero-stats-bar">
		{#each stats as stat}
			<div class="stat-pill">
				<span class="stat-pill-value">{stat.value}</span>
				<span class="stat-pill-label">{stat.label}</span>
			</div>
		{/each}
	</div>
</section>

<style>
	/* ═══════════════════════════════════════════════════════════════
	   Hero Section — Split layout with glassmorphism
	   ═══════════════════════════════════════════════════════════════ */

	.hero-section {
		position: relative;
		min-height: 100vh;
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		background-color: var(--landing-bg);
		padding: 6rem 1rem 3rem;
	}

	/* --- Background layers --- */
	.dot-grid {
		position: absolute;
		inset: 0;
		background-image: radial-gradient(circle, var(--dark-text) 0.6px, transparent 0.6px);
		background-size: 32px 32px;
		opacity: 0.03;
		pointer-events: none;
	}

	.ambient-orb {
		position: absolute;
		border-radius: 50%;
		pointer-events: none;
		filter: blur(100px);
	}

	.orb-1 {
		top: 10%;
		left: 30%;
		width: 500px;
		height: 500px;
		background: radial-gradient(circle, rgba(255, 204, 0, 0.12), transparent 65%);
		opacity: 0.6;
	}

	.orb-2 {
		top: 60%;
		right: 10%;
		width: 400px;
		height: 400px;
		background: radial-gradient(circle, rgba(255, 204, 0, 0.08), transparent 65%);
		opacity: 0.4;
	}

	.orb-3 {
		bottom: 5%;
		left: 10%;
		width: 300px;
		height: 300px;
		background: radial-gradient(circle, rgba(128, 128, 128, 0.06), transparent 65%);
		opacity: 0.3;
	}

	/* --- Split layout container --- */
	.hero-container {
		position: relative;
		z-index: 2;
		width: 100%;
		max-width: 72rem;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 3rem;
	}

	@media (min-width: 1024px) {
		.hero-container {
			flex-direction: row;
			align-items: center;
			gap: 4rem;
		}
	}

	/* --- Text column --- */
	.hero-text {
		flex: 1;
		text-align: center;
	}

	@media (min-width: 1024px) {
		.hero-text {
			text-align: left;
		}

		.hero-checklist {
			align-items: flex-start !important;
		}
	}

	.hero-eyebrow {
		font-size: 0.8125rem;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--landing-text-muted);
		margin-bottom: 1.25rem;
	}

	.hero-headline {
		font-size: clamp(2.25rem, 6vw, 4rem);
		font-weight: 700;
		line-height: 1.1;
		letter-spacing: -0.035em;
		color: var(--dark-text);
		margin-bottom: 1.25rem;
	}

	.headline-gold {
		color: #1a1a1a;
		background: #ffcc00;
		padding: 0.05em 0.2em;
		border-radius: 0.1em;
		box-decoration-break: clone;
		-webkit-box-decoration-break: clone;
	}

	.hero-subhead {
		font-size: clamp(1rem, 2vw, 1.2rem);
		color: var(--landing-text-muted);
		margin-bottom: 2rem;
		line-height: 1.6;
		max-width: 32rem;
		margin-left: auto;
		margin-right: auto;
	}

	@media (min-width: 1024px) {
		.hero-subhead {
			margin-left: 0;
		}
	}

	.hero-checklist {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.625rem;
		margin-bottom: 1.5rem;
	}

	.checklist-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		color: var(--dark-text);
		font-size: 0.9375rem;
	}

	.checklist-dot {
		width: 0.375rem;
		height: 0.375rem;
		border-radius: 50%;
		background: var(--landing-accent-accessible);
		flex-shrink: 0;
	}

	.hero-cta {
		margin-bottom: 0;
	}

	.hero-cta-note {
		font-size: 0.75rem;
		color: var(--landing-text-muted);
		margin-top: 0.75rem;
		opacity: 0.7;
	}

	/* --- Image column --- */
	.hero-visual {
		flex-shrink: 0;
		width: 100%;
		max-width: 28rem;
	}

	@media (min-width: 1024px) {
		.hero-visual {
			max-width: 24rem;
		}
	}

	@media (min-width: 1280px) {
		.hero-visual {
			max-width: 28rem;
		}
	}

	.hero-image-wrapper {
		position: relative;
		border-radius: 1.5rem;
		overflow: hidden;
		box-shadow:
			0 25px 60px rgba(0, 0, 0, 0.15),
			0 8px 24px rgba(0, 0, 0, 0.08);
	}

	.hero-image {
		display: block;
		width: 100%;
		height: auto;
		aspect-ratio: 4 / 5;
		object-fit: cover;
	}

	/* Glass overlay at bottom of image — shows floating stats */
	.hero-image-overlay {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1.25rem;
		padding: 1rem 1.5rem;
		background: rgba(26, 26, 26, 0.65);
		backdrop-filter: blur(16px);
		-webkit-backdrop-filter: blur(16px);
		border-top: 1px solid rgba(255, 255, 255, 0.1);
	}

	.overlay-stat {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.125rem;
	}

	.overlay-stat-value {
		font-size: 1.25rem;
		font-weight: 700;
		color: #ffcc00;
	}

	.overlay-stat-label {
		font-size: 0.6875rem;
		color: rgba(255, 255, 255, 0.6);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.overlay-divider {
		width: 1px;
		height: 2rem;
		background: rgba(255, 255, 255, 0.15);
	}

	/* --- Stats bar (bottom) --- */
	.hero-stats-bar {
		position: relative;
		z-index: 2;
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.75rem;
		margin-top: 3rem;
		padding: 0 1rem;
	}

	.stat-pill {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.625rem 1.25rem;
		border-radius: 9999px;
		background: var(--landing-glass-bg);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border: 1px solid var(--landing-glass-border);
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
	}

	.stat-pill-value {
		font-size: 1rem;
		font-weight: 700;
		color: var(--dark-text);
	}

	.stat-pill-label {
		font-size: 0.8125rem;
		color: var(--landing-text-muted);
	}

	/* --- Mobile adjustments --- */
	@media (max-width: 640px) {
		.hero-section {
			padding: 5rem 1rem 2rem;
		}

		.hero-visual {
			max-width: 20rem;
		}

		.hero-image-overlay {
			padding: 0.75rem 1rem;
			gap: 0.75rem;
		}

		.overlay-stat-value {
			font-size: 1rem;
		}

		.stat-pill {
			padding: 0.5rem 1rem;
		}

		.stat-pill-value {
			font-size: 0.875rem;
		}

		.stat-pill-label {
			font-size: 0.75rem;
		}
	}
</style>
