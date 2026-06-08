<script lang="ts">
	import { onMount } from 'svelte';
	import { gsap } from '$lib/utils/gsapSetup';
	import SectionWrapper from './shared/SectionWrapper.svelte';
	import SectionTitle from './shared/SectionTitle.svelte';

	const neverItems = [
		"See your client's PAN, Aadhaar, or phone number",
		'Take a cut from your payout — ever',
		'Process files or compete with you',
		'Share your data with any third party'
	];
	const alwaysItems = [
		'Give you the intelligence to close faster',
		'Let you pick the bank, code, and RM',
		'Keep your clients, commissions, and business — yours'
	];

	let boxesRef: HTMLDivElement | undefined = $state(undefined);

	onMount(() => {
		if (!boxesRef) return;
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		const boxes = boxesRef.querySelectorAll('.pledge-box');
		if (!boxes.length) return;
		const ctx = gsap.context(() => {
			gsap.fromTo(
				boxes,
				{ opacity: 0, y: 40 },
				{
					opacity: 1,
					y: 0,
					duration: 0.7,
					stagger: 0.2,
					ease: 'power3.out',
					scrollTrigger: {
						trigger: boxesRef,
						start: 'top 85%',
						toggleActions: 'play none none none'
					}
				}
			);
		}, boxesRef);
		return () => ctx.revert();
	});
</script>

<SectionWrapper id="trust-pledge" background="dark">
	<SectionTitle title="Your business stays yours." light={true} />

	<div bind:this={boxesRef} class="mx-auto grid max-w-4xl grid-cols-1 gap-8 md:grid-cols-2">
		<div class="pledge-box">
			<h3 class="pledge-heading pledge-heading-bad">
				<svg
					class="pledge-heading-icon"
					fill="none"
					stroke="currentColor"
					stroke-width="2.5"
					viewBox="0 0 24 24"
				>
					<path d="M18 6 6 18" stroke-linecap="round" stroke-linejoin="round" />
					<path d="m6 6 12 12" stroke-linecap="round" stroke-linejoin="round" />
				</svg>
				We will NEVER
			</h3>
			<div class="pledge-items">
				{#each neverItems as item}
					<div class="pledge-item">
						<svg
							class="pledge-item-icon bad"
							fill="none"
							stroke="currentColor"
							stroke-width="2.5"
							viewBox="0 0 24 24"
						>
							<path d="M18 6 6 18" stroke-linecap="round" stroke-linejoin="round" />
							<path d="m6 6 12 12" stroke-linecap="round" stroke-linejoin="round" />
						</svg>
						<span>{item}</span>
					</div>
				{/each}
			</div>
		</div>

		<div class="pledge-box">
			<h3 class="pledge-heading pledge-heading-good">
				<svg
					class="pledge-heading-icon"
					fill="none"
					stroke="currentColor"
					stroke-width="2.5"
					viewBox="0 0 24 24"
				>
					<path d="M20 6 9 17l-5-5" stroke-linecap="round" stroke-linejoin="round" />
				</svg>
				We will ALWAYS
			</h3>
			<div class="pledge-items">
				{#each alwaysItems as item}
					<div class="pledge-item">
						<svg
							class="pledge-item-icon good"
							fill="none"
							stroke="currentColor"
							stroke-width="2.5"
							viewBox="0 0 24 24"
						>
							<path d="M20 6 9 17l-5-5" stroke-linecap="round" stroke-linejoin="round" />
						</svg>
						<span>{item}</span>
					</div>
				{/each}
			</div>
		</div>
	</div>

	<p class="pledge-footer">
		"Your clients. Your brokers. Your commissions. We just make you smarter."
	</p>
</SectionWrapper>

<style>
	.pledge-box {
		border-radius: 1rem;
		background: rgba(255, 255, 255, 0.08);
		border: 1px solid rgba(255, 255, 255, 0.12);
		padding: 2rem;
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
		transition: all 0.3s ease;
	}
	.pledge-box:hover {
		background: rgba(255, 255, 255, 0.1);
		border-color: rgba(255, 204, 0, 0.15);
		box-shadow: 0 8px 36px rgba(0, 0, 0, 0.2);
	}
	.pledge-heading {
		font-size: 1.125rem;
		font-weight: 700;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 1.5rem;
	}
	.pledge-heading-bad {
		color: #888888;
	}
	.pledge-heading-good {
		color: var(--landing-accent);
	}
	.pledge-heading-icon {
		width: 1.25rem;
		height: 1.25rem;
	}
	.pledge-items {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.pledge-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		color: rgba(255, 255, 255, 0.75);
		font-size: 1rem;
	}
	.pledge-item-icon {
		width: 1.25rem;
		height: 1.25rem;
		flex-shrink: 0;
	}
	.pledge-item-icon.bad {
		color: #888888;
	}
	.pledge-item-icon.good {
		color: var(--landing-accent);
	}
	.pledge-footer {
		text-align: center;
		font-size: 1.125rem;
		font-weight: 500;
		font-style: italic;
		color: var(--landing-accent);
		margin-top: 3rem;
	}
</style>
