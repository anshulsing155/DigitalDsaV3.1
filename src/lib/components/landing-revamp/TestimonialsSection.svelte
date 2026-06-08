<script lang="ts">
	import { onMount } from 'svelte';
	import { gsap } from '$lib/utils/gsapSetup';
	import SectionWrapper from './shared/SectionWrapper.svelte';
	import SectionTitle from './shared/SectionTitle.svelte';

	const testimonials = [
		{
			quote:
				'I was doing 8-10 files a month. Now I do 18-20. Same hours. I just stopped wasting time on research and started meeting more brokers.',
			name: 'Ramesh K.',
			details: 'DSA since 2017 \u2022 Mumbai \u2022 Home Loans',
			avatar:
				'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face'
		},
		{
			quote:
				'Last month I saved \u20B947,000 just by switching to the right Corporate DSA code. I had no idea Andromeda was at higher slab than my usual one.',
			name: 'Priya S.',
			details: 'DSA since 2019 \u2022 Delhi \u2022 LAP Specialist',
			avatar:
				'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&h=150&fit=crop&crop=face'
		},
		{
			quote:
				"The RM network alone is worth it. Filed a case with a bank I'd never worked with before. Got the contact, called, done. No begging.",
			name: 'Vikram T.',
			details: 'DSA since 2020 \u2022 Bangalore \u2022 All Loan Types',
			avatar:
				'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face'
		}
	];

	let cardsRef: HTMLDivElement | undefined = $state(undefined);

	onMount(() => {
		if (!cardsRef) return;
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		const cards = cardsRef.querySelectorAll('.testimonial-card');
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

<SectionWrapper id="testimonials" background="dark">
	<SectionTitle title="From DSAs Like You" light={true} />

	<div bind:this={cardsRef} class="grid grid-cols-1 gap-8 md:grid-cols-3">
		{#each testimonials as t}
			<div class="testimonial-card">
				<span class="quote-mark" aria-hidden="true">"</span>
				<p class="quote-text">{t.quote}</p>
				<div class="quote-author">
					<img src={t.avatar} alt={t.name} class="author-avatar" loading="lazy" decoding="async" />
					<div>
						<p class="quote-name">{t.name}</p>
						<p class="quote-details">{t.details}</p>
					</div>
				</div>
			</div>
		{/each}
	</div>
</SectionWrapper>

<style>
	.testimonial-card {
		position: relative;
		border-radius: 1rem;
		background: rgba(255, 255, 255, 0.06);
		backdrop-filter: blur(16px);
		-webkit-backdrop-filter: blur(16px);
		border: 1px solid rgba(255, 255, 255, 0.1);
		padding: 2rem;
		box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
		transition: all 0.3s ease;
	}
	.testimonial-card:hover {
		background: rgba(255, 255, 255, 0.09);
		border-color: rgba(255, 204, 0, 0.2);
		box-shadow:
			0 8px 36px rgba(0, 0, 0, 0.25),
			0 0 30px rgba(255, 204, 0, 0.05);
		transform: translateY(-2px);
	}
	.quote-mark {
		position: absolute;
		top: 1rem;
		right: 1.5rem;
		font-size: 3rem;
		font-family: serif;
		color: #ffcc00;
		opacity: 0.35;
		line-height: 1;
		user-select: none;
	}
	.quote-text {
		color: rgba(255, 255, 255, 0.7);
		line-height: 1.6;
		margin-bottom: 1.5rem;
		position: relative;
		z-index: 1;
	}
	.quote-author {
		display: flex;
		align-items: center;
		gap: 0.875rem;
	}
	.author-avatar {
		width: 3rem;
		height: 3rem;
		border-radius: 50%;
		object-fit: cover;
		border: 2px solid rgba(255, 204, 0, 0.35);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
		flex-shrink: 0;
	}
	.quote-name {
		font-weight: 700;
		color: #ffffff;
	}
	.quote-details {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.5);
	}
</style>
