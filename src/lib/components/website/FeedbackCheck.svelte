<script lang="ts">
	import { fade } from 'svelte/transition';
	import { feedbackYes } from '$lib/stores/stores';
	import { onMount } from 'svelte';
	let feedback = $state('');
	let isMobile = false;

	type Props = {
		paddingClass?: string;
	};

	const { paddingClass = 'px-[0.5rem] lg:px-16' }: Props = $props();

	onMount(() => {
		const checkScreenSize = () => {
			isMobile = window.innerWidth <= 768; // Adjust breakpoint as needed
		};

		checkScreenSize(); // Initial check
		window.addEventListener('resize', checkScreenSize);

		return () => window.removeEventListener('resize', checkScreenSize);
	});
</script>

<!-- px-4 lg:px-16 -->
<section class={`py-[3rem] ${paddingClass}`}>
	<div class="grid items-center justify-between gap-4 md:w-4/6 lg:grid-cols-4">
		<p class="typography-body-md col-span-2 !font-semibold text-[var(--form-text)]">
			Was the information on this page useful?
		</p>
		<div class="col-span-2 flex flex-col gap-4 sm:flex-row">
			<button
				onclick={() => (feedback = 'Yes')}
				class:btn-primary={feedback === 'Yes'}
				class:btn-secondary={feedback !== 'Yes'}
				class="typography-button flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-[var(--form-border)] px-[3rem] py-3 text-center text-white hover:border-[var(--form-border-hover)] hover:opacity-90 sm:w-auto"
			>
				<img src="/icons/like.svg" alt="like-icon" class="h-4" />
				<p class="">Yes</p>
			</button>
			<button
				onclick={() => (feedback = 'No')}
				class:btn-primary={feedback === 'No'}
				class:btn-secondary={feedback !== 'No'}
				class="typography-button flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-[var(--form-border)] px-[3rem] py-3 text-center text-white hover:border-[var(--form-border-hover)] hover:opacity-90 sm:w-auto"
			>
				<img src="/icons/dislike.svg" alt="dislike-icon" class="h-4" />
				<p class="">No</p>
			</button>
		</div>
	</div>
	{#if feedback == 'No'}
		<p in:fade class="typography-body-sm md:typography-body-md mt-[2rem] text-[var(--form-text)]">
			<span class="typography-body-sm !font-semibold"> Thanks for your feedback. </span>
			<br /> Have a suggestion? Please
			<a
				href="/complaint-compliment#feedback"
				onclick={() => {
					$feedbackYes = 2;
				}}
				class="text-[var(--ddsa-info-text)] underline underline-offset-4 hover:no-underline"
				>help us improve.</a
			>
		</p>
	{:else if feedback == 'Yes'}
		<p in:fade class="typography-body-sm mt-[2rem] text-[var(--form-text)]">
			<span class="typography-body-sm !font-semibold">That's really great.</span>
			<br />
			Share your experience with us and
			<a
				href="/complaint-compliment#feedback"
				class="text-[var(--ddsa-info-text)] underline underline-offset-4 hover:no-underline"
				onclick={() => {
					$feedbackYes = 5;
				}}
			>
				we'll proudly feature your testimonial
			</a>on our web app.
		</p>
	{/if}
</section>
