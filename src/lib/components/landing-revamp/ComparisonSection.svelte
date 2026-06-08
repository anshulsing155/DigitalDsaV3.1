<script lang="ts">
	import { onMount } from 'svelte';
	import { gsap } from '$lib/utils/gsapSetup';
	import SectionWrapper from './shared/SectionWrapper.svelte';
	import SectionTitle from './shared/SectionTitle.svelte';
	import ChecklistItem from './shared/ChecklistItem.svelte';

	const withoutItems = [
		'Guess which bank',
		'Call 5 RMs, 2 respond',
		'No idea about slabs',
		'4-5 hours per file',
		'60% approval rate',
		'Leave money on table'
	];
	const withItems = [
		'Know which bank',
		'Direct RM contact',
		'Real-time slab data',
		'10 minutes per file',
		'94% approval rate',
		'Best payout every time'
	];

	let columnsRef: HTMLDivElement | undefined = $state(undefined);

	onMount(() => {
		if (!columnsRef) return;
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		const cols = columnsRef.querySelectorAll('.comparison-col');
		if (!cols.length) return;
		const ctx = gsap.context(() => {
			gsap.fromTo(
				cols,
				{ opacity: 0, y: 40 },
				{
					opacity: 1,
					y: 0,
					duration: 0.7,
					stagger: 0.2,
					ease: 'power3.out',
					scrollTrigger: {
						trigger: columnsRef,
						start: 'top 85%',
						toggleActions: 'play none none none'
					}
				}
			);
		}, columnsRef);
		return () => ctx.revert();
	});
</script>

<SectionWrapper id="comparison" background="default">
	<SectionTitle title="The Old Way vs. The New Way" />

	<div bind:this={columnsRef} class="mx-auto grid max-w-4xl grid-cols-1 gap-8 md:grid-cols-2">
		<div class="comparison-col col-without">
			<h3 class="col-heading col-heading-bad">
				<svg
					class="col-heading-icon"
					fill="none"
					stroke="currentColor"
					stroke-width="2.5"
					viewBox="0 0 24 24"
				>
					<path d="M18 6 6 18" stroke-linecap="round" stroke-linejoin="round" />
					<path d="m6 6 12 12" stroke-linecap="round" stroke-linejoin="round" />
				</svg>
				Without DigitalDSA
			</h3>
			<div class="col-items">
				{#each withoutItems as item}
					<ChecklistItem text={item} checked={false} />
				{/each}
			</div>
		</div>

		<div class="comparison-col col-with">
			<h3 class="col-heading col-heading-good">
				<svg
					class="col-heading-icon"
					fill="none"
					stroke="currentColor"
					stroke-width="2.5"
					viewBox="0 0 24 24"
				>
					<path d="M20 6 9 17l-5-5" stroke-linecap="round" stroke-linejoin="round" />
				</svg>
				With DigitalDSA
			</h3>
			<div class="col-items">
				{#each withItems as item}
					<ChecklistItem text={item} checked={true} />
				{/each}
			</div>
		</div>
	</div>

	<p class="comparison-footer">Same files. Better outcomes.</p>
</SectionWrapper>

<style>
	.comparison-col {
		border-radius: 1rem;
		padding: 2rem;
	}
	.col-without {
		background: rgba(136, 136, 136, 0.08);
		border: 1px solid rgba(136, 136, 136, 0.2);
	}
	.col-with {
		background: var(--landing-accent-subtle);
		border: 1px solid var(--landing-accent-medium);
	}
	:global(.dark) .col-without {
		background: rgba(136, 136, 136, 0.12);
		border-color: rgba(136, 136, 136, 0.3);
	}
	:global(.dark) .col-with {
		background: var(--landing-accent-subtle);
		border-color: var(--landing-accent-medium);
	}
	.col-heading {
		font-size: 1.125rem;
		font-weight: 700;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 1.5rem;
	}
	.col-heading-bad {
		color: #888888;
	}
	.col-heading-good {
		color: var(--landing-accent-accessible);
	}
	.col-heading-icon {
		width: 1.25rem;
		height: 1.25rem;
	}
	.col-items {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.comparison-footer {
		text-align: center;
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--dark-text);
		margin-top: 3rem;
	}
</style>
