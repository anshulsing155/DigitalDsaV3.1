<script lang="ts">
	import { onMount } from 'svelte';
	import { gsap } from '$lib/utils/gsapSetup';

	const stats = [
		{ target: 1247, suffix: '+', prefix: '', label: 'DSAs on Platform' },
		{ target: 847, suffix: ' Cr+', prefix: '₹', label: 'Loan Amount Matched' },
		{ target: 52, suffix: '+', prefix: '', label: 'Lender Policies' },
		{ target: 15, suffix: '+', prefix: '', label: 'Loan Types Supported' },
		{ target: 94, suffix: '%', prefix: '', label: 'First-File Approval Rate' }
	];

	let displayed = $state<string[]>(stats.map((s) => `${s.prefix}0${s.suffix}`));
	let sectionRef: HTMLElement | undefined = $state(undefined);

	onMount(() => {
		if (!sectionRef) return;

		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
			stats.forEach((stat, i) => {
				const formatted =
					stat.target >= 1000 ? stat.target.toLocaleString('en-IN') : String(stat.target);
				displayed[i] = `${stat.prefix}${formatted}${stat.suffix}`;
			});
			return;
		}

		const ctx = gsap.context(() => {
			/* Animate stat cards entrance */
			const cards = sectionRef!.querySelectorAll('.stat-card');
			if (cards.length) {
				gsap.fromTo(
					cards,
					{ opacity: 0, y: 30 },
					{
						opacity: 1,
						y: 0,
						duration: 0.5,
						stagger: 0.1,
						ease: 'power3.out',
						scrollTrigger: {
							trigger: sectionRef,
							start: 'top 80%',
							toggleActions: 'play none none none'
						}
					}
				);
			}

			/* Counter tween-up */
			stats.forEach((stat, i) => {
				const obj = { val: 0 };
				gsap.to(obj, {
					val: stat.target,
					duration: 2,
					ease: 'power2.out',
					scrollTrigger: {
						trigger: sectionRef,
						start: 'top 80%',
						toggleActions: 'play none none none'
					},
					onUpdate() {
						const rounded = Math.round(obj.val);
						const formatted = rounded >= 1000 ? rounded.toLocaleString('en-IN') : String(rounded);
						displayed[i] = `${stat.prefix}${formatted}${stat.suffix}`;
					}
				});
			});
		}, sectionRef);

		return () => ctx.revert();
	});
</script>

<section bind:this={sectionRef} id="stats" class="stats-section">
	<!-- Layered yellow gradient background -->
	<div class="stats-gradient" aria-hidden="true"></div>
	<div class="stats-radial" aria-hidden="true"></div>
	<div class="stats-noise" aria-hidden="true"></div>

	<div class="stats-container">
		<p class="stats-eyebrow">The Platform in Numbers</p>

		<div class="stats-grid">
			{#each stats as stat, i}
				<div class="stat-card">
					<span class="stat-value">{displayed[i]}</span>
					<span class="stat-label">{stat.label}</span>
				</div>
			{/each}
		</div>
	</div>
</section>

<style>
	.stats-section {
		position: relative;
		overflow: hidden;
		padding: 5rem 0;
	}

	@media (min-width: 768px) {
		.stats-section {
			padding: 6rem 0;
		}
	}

	/* --- Layered gradient background --- */
	.stats-gradient {
		position: absolute;
		inset: 0;
		background: linear-gradient(135deg, #ffcc00 0%, #e6b800 40%, #d4a800 70%, #ffcc00 100%);
	}

	/* Glossy radial highlight — makes it feel 3D, not flat */
	.stats-radial {
		position: absolute;
		inset: 0;
		background: radial-gradient(ellipse at 70% 30%, rgba(255, 255, 255, 0.22) 0%, transparent 60%);
	}

	/* Subtle noise texture for premium analog feel */
	.stats-noise {
		position: absolute;
		inset: 0;
		background: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
		opacity: 0.04;
		mix-blend-mode: overlay;
	}

	.stats-container {
		position: relative;
		z-index: 2;
		max-width: 72rem;
		margin: 0 auto;
		padding: 0 1rem;
	}

	.stats-eyebrow {
		text-align: center;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.15em;
		color: #333333;
		margin-bottom: 2.5rem;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 1rem;
		text-align: center;
	}

	@media (min-width: 640px) {
		.stats-grid {
			grid-template-columns: repeat(3, 1fr);
		}
	}

	@media (min-width: 1024px) {
		.stats-grid {
			grid-template-columns: repeat(5, 1fr);
			gap: 1.25rem;
		}
	}

	/* Dark frosted glass cards on yellow gradient = dramatic depth */
	.stat-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		padding: 1.5rem 1rem;
		border-radius: 1rem;
		background: rgba(26, 26, 26, 0.75);
		backdrop-filter: blur(16px);
		-webkit-backdrop-filter: blur(16px);
		border: 1px solid rgba(255, 255, 255, 0.1);
		transition: all 0.3s ease;
	}

	.stat-card:hover {
		transform: translateY(-2px);
		border-color: rgba(255, 204, 0, 0.3);
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
	}

	/* Yellow numbers on dark glass — high contrast + premium */
	.stat-value {
		font-size: 2rem;
		font-weight: 700;
		color: #ffcc00;
		letter-spacing: -0.02em;
		line-height: 1;
		font-variant-numeric: tabular-nums;
	}

	@media (min-width: 768px) {
		.stat-value {
			font-size: 2.5rem;
		}
	}

	.stat-label {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.6);
		font-weight: 500;
	}
</style>
