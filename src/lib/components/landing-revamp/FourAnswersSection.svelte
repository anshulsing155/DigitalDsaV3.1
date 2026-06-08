<script lang="ts">
	import { onMount } from 'svelte';
	import { gsap } from '$lib/utils/gsapSetup';
	import Building2 from 'lucide-svelte/icons/building-2';
	import Coins from 'lucide-svelte/icons/coins';
	import Phone from 'lucide-svelte/icons/phone';
	import FileCheck from 'lucide-svelte/icons/file-check';
	import SectionWrapper from './shared/SectionWrapper.svelte';
	import SectionTitle from './shared/SectionTitle.svelte';

	const answers = [
		{
			iconName: 'building2' as const,
			title: 'Which Bank Will Approve',
			description:
				"Not 'might approve.' Will approve. We match your client's exact profile against 40+ lender policies. You see fit percentage, likely amount, and why.",
			quote: 'Stop applying everywhere. Apply where it fits.'
		},
		{
			iconName: 'coins' as const,
			title: 'Which Code Pays Most',
			description:
				'See real-time slab data for every Corporate DSA. Andromeda at 1.1% this month? Magicbricks at 0.9%? Know before you file. Pick the highest payout.',
			quote: 'Same file. ₹15,000 more. Just by knowing.'
		},
		{
			iconName: 'phone' as const,
			title: 'Which RM to Call',
			description:
				'Bank not in your network? No problem. We connect you with local RMs who respond. Direct numbers. Verified contacts.',
			quote: 'No more cold calling bank branches.'
		},
		{
			iconName: 'file-check' as const,
			title: "What Amount They'll Sanction",
			description:
				"Not a guess. Calculated based on bank's actual FOIR policy, LTV limits, and eligibility criteria. Client wants ₹50L? Know if they'll get it.",
			quote: 'Set right expectations. No last-minute surprises.'
		}
	];

	let cardsRef: HTMLDivElement | undefined = $state(undefined);

	onMount(() => {
		if (!cardsRef) return;
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		const cards = cardsRef.querySelectorAll('.answer-card');
		if (!cards.length) return;
		const ctx = gsap.context(() => {
			gsap.fromTo(
				cards,
				{ opacity: 0, y: 50 },
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

<SectionWrapper id="four-answers" background="dark">
	<SectionTitle title="Four Answers Every File Needs" light={true} />

	<div bind:this={cardsRef} class="answers-list">
		{#each answers as answer, i}
			<div class="answer-card" class:offset-right={i % 2 === 1}>
				<div class="answer-inner">
					<div class="answer-icon-wrap">
						{#if answer.iconName === 'building2'}
							<Building2 class="answer-icon" />
						{:else if answer.iconName === 'coins'}
							<Coins class="answer-icon" />
						{:else if answer.iconName === 'phone'}
							<Phone class="answer-icon" />
						{:else}
							<FileCheck class="answer-icon" />
						{/if}
					</div>
					<div>
						<h3 class="answer-title">{answer.title}</h3>
						<p class="answer-desc">{answer.description}</p>
						<p class="answer-quote">"{answer.quote}"</p>
					</div>
				</div>
			</div>
		{/each}
	</div>
</SectionWrapper>

<style>
	.answers-list {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		max-width: 48rem;
		margin: 0 auto;
	}
	.answer-card {
		border-radius: 1rem;
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(255, 255, 255, 0.1);
		padding: 2rem;
		transition: all 0.3s ease;
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
	}
	.answer-card:hover {
		background: rgba(255, 255, 255, 0.09);
		border-color: rgba(255, 204, 0, 0.2);
		box-shadow:
			0 8px 36px rgba(0, 0, 0, 0.2),
			0 0 30px rgba(255, 204, 0, 0.05);
		transform: translateY(-2px);
	}
	@media (min-width: 768px) {
		.answer-card.offset-right {
			margin-left: 2rem;
		}
		.answer-card:not(.offset-right) {
			margin-right: 2rem;
		}
	}
	.answer-inner {
		display: flex;
		align-items: flex-start;
		gap: 1.25rem;
	}
	.answer-icon-wrap {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 3rem;
		height: 3rem;
		flex-shrink: 0;
		border-radius: 0.75rem;
		background: rgba(255, 204, 0, 0.15);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		border: 1px solid rgba(255, 204, 0, 0.15);
	}
	:global(.answer-icon) {
		width: 1.5rem;
		height: 1.5rem;
		color: #ffcc00;
	}
	.answer-title {
		font-size: 1.25rem;
		font-weight: 700;
		color: #ffffff;
		margin-bottom: 0.75rem;
	}
	.answer-desc {
		color: rgba(255, 255, 255, 0.65);
		line-height: 1.6;
		margin-bottom: 1rem;
	}
	.answer-quote {
		font-style: italic;
		font-size: 0.875rem;
		color: #ffcc00;
		opacity: 0.8;
		border-left: 2px solid #ffcc00;
		padding-left: 1rem;
	}
</style>
