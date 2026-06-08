<script lang="ts">
	import { onMount } from 'svelte';
	import { gsap } from '$lib/utils/gsapSetup';
	import { bankData } from '$lib/config/bankSelection/bankName';
	import SectionWrapper from './shared/SectionWrapper.svelte';

	const classificationColors: Record<string, { bg: string; text: string; label: string }> = {
		GOV: {
			bg: 'rgba(255, 204, 0, 0.15)',
			text: '#b8960a',
			label: 'Government'
		},
		PVT: {
			bg: 'rgba(26, 26, 26, 0.08)',
			text: '#1a1a1a',
			label: 'Private'
		},
		NBFC: {
			bg: 'rgba(255, 204, 0, 0.25)',
			text: '#8a6d00',
			label: 'NBFC'
		},
		HFC: {
			bg: 'rgba(136, 136, 136, 0.12)',
			text: '#555555',
			label: 'Housing Finance'
		},
		SFB: {
			bg: 'rgba(85, 85, 85, 0.1)',
			text: '#888888',
			label: 'Small Finance'
		}
	};

	// Split banks into two rows
	const half = Math.ceil(bankData.length / 2);
	const row1 = bankData.slice(0, half);
	const row2 = bankData.slice(half);

	// Duplicate for seamless loop
	const row1Doubled = [...row1, ...row1];
	const row2Doubled = [...row2, ...row2];

	let sectionRef: HTMLElement | undefined = $state(undefined);

	onMount(() => {
		if (!sectionRef) return;
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		const ctx = gsap.context(() => {
			gsap.fromTo(
				sectionRef!.querySelector('.marquee-content'),
				{ opacity: 0, y: 30 },
				{
					opacity: 1,
					y: 0,
					duration: 0.8,
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

<SectionWrapper id="lender-marquee" background="alt">
	<div bind:this={sectionRef}>
		<div class="marquee-content">
			<div class="mb-10 text-center md:mb-14">
				<h2 class="marquee-title">77+ Lender Policies. One Platform.</h2>
				<p class="marquee-subtitle">
					Government banks, private banks, NBFCs, HFCs, and small finance banks — all matched in
					real time.
				</p>
			</div>

			<!-- Row 1: scrolls left -->
			<div class="marquee-track">
				<div class="marquee-scroll marquee-scroll-left">
					{#each row1Doubled as bank}
						<span
							class="marquee-chip"
							style="background: {classificationColors[bank.Classification]
								.bg}; color: {classificationColors[bank.Classification].text};"
						>
							{bank.label}
						</span>
					{/each}
				</div>
			</div>

			<!-- Row 2: scrolls right -->
			<div class="marquee-track mt-3">
				<div class="marquee-scroll marquee-scroll-right">
					{#each row2Doubled as bank}
						<span
							class="marquee-chip"
							style="background: {classificationColors[bank.Classification]
								.bg}; color: {classificationColors[bank.Classification].text};"
						>
							{bank.label}
						</span>
					{/each}
				</div>
			</div>

			<!-- Legend -->
			<div class="marquee-legend">
				{#each Object.entries(classificationColors) as [key, val]}
					<div class="legend-item">
						<span class="legend-dot" style="background: {val.text};"></span>
						<span class="legend-label">{val.label}</span>
					</div>
				{/each}
			</div>
		</div>
	</div>
</SectionWrapper>

<style>
	.marquee-title {
		font-size: 1.875rem;
		font-weight: 700;
		letter-spacing: -0.02em;
		color: var(--dark-text);
	}

	@media (min-width: 640px) {
		.marquee-title {
			font-size: 2.25rem;
		}
	}

	@media (min-width: 768px) {
		.marquee-title {
			font-size: 3rem;
		}
	}

	.marquee-subtitle {
		margin-top: 1rem;
		font-size: 1.125rem;
		color: var(--landing-text-muted);
	}

	.marquee-track {
		position: relative;
		overflow: hidden;
		mask-image: linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%);
		-webkit-mask-image: linear-gradient(
			to right,
			transparent 0%,
			black 8%,
			black 92%,
			transparent 100%
		);
	}

	.marquee-scroll {
		display: flex;
		gap: 0.75rem;
		width: max-content;
		will-change: transform;
	}

	.marquee-scroll-left {
		animation: scrollLeft 45s linear infinite;
	}

	.marquee-scroll-right {
		animation: scrollRight 50s linear infinite;
	}

	@keyframes scrollLeft {
		0% {
			transform: translateX(0);
		}
		100% {
			transform: translateX(-50%);
		}
	}

	@keyframes scrollRight {
		0% {
			transform: translateX(-50%);
		}
		100% {
			transform: translateX(0);
		}
	}

	.marquee-chip {
		display: inline-flex;
		align-items: center;
		padding: 0.5rem 1rem;
		border-radius: 999px;
		font-size: 0.8rem;
		font-weight: 500;
		white-space: nowrap;
		flex-shrink: 0;
		border: 1px solid color-mix(in srgb, currentColor 15%, transparent);
	}

	.marquee-legend {
		display: flex;
		justify-content: center;
		gap: 1.5rem;
		margin-top: 1.5rem;
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: 0.375rem;
	}

	.legend-dot {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 9999px;
		flex-shrink: 0;
	}

	.legend-label {
		font-size: 0.75rem;
		color: var(--landing-text-muted);
	}

	/* Pause on hover for accessibility */
	.marquee-track:hover .marquee-scroll {
		animation-play-state: paused;
	}
</style>
