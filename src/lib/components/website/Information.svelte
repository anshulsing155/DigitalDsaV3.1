<script>
	import { fade } from 'svelte/transition';
	import { feedbackYes } from '$lib/stores/stores';

	let feedback = '';
</script>

<section class="py-[3rem]">
	<div class="grid items-center justify-between gap-4 md:w-4/6 lg:grid-cols-4">
		<p class="typography-body-md col-span-2 text-[var(--form-text-secondary)]">
			Did you find the information on this page helpful?
		</p>
		<div class="col-span-2 flex flex-col gap-4 sm:flex-row">
			<button
				onclick={() => (feedback = 'Yes')}
				class:bg-[#ffcc00]={feedback === 'Yes'}
				class="typography-button flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-[var(--form-border)] px-[3rem] py-3 text-[var(--form-text-secondary)] hover:border-[var(--form-border-hover)] hover:opacity-90 sm:w-auto"
			>
				<img src="/icons/like.svg" alt="like-icon" class="h-4" />
				<p class="text-[var(--form-text-secondary)]">Yes</p>
			</button>
			<button
				onclick={() => (feedback = 'No')}
				class:bg-[#ffcc00]={feedback === 'No'}
				class="typography-button flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-[var(--form-border)] px-[3rem] py-3 text-center text-[var(--form-text-secondary)] hover:border-[var(--form-border-hover)] hover:opacity-90 sm:w-auto"
			>
				<img src="/icons/dislike.svg" alt="dislike-icon" class="h-4" />
				<p class="text-[var(--form-text-secondary)]">No</p>
			</button>
		</div>
	</div>
	{#if feedback == 'No'}
		<p in:fade class="typography-body-md mt-[2rem]">
			<span class="font-semibold">Thank you for your feedback.</span> <br />
			Have any suggestions? Please
			<a
				href="/complaint-compliment#feedback"
				onclick={() => {
					$feedbackYes = 0;
				}}
				class="text-linkColor underline underline-offset-4"
			>
				let us know how we can improve.
			</a>
		</p>
	{:else if feedback == 'Yes'}
		<p in:fade class="typography-body-md mt-[2rem] text-[var(--form-text-secondary)]">
			<span class="typography-body-md font-semibold">Glad to hear that!</span> <br />
			Share your experience with us, and
			<a
				href="/complaint-compliment#feedback"
				class="text-linkColor underline underline-offset-4"
				onclick={() => {
					$feedbackYes = 5;
				}}
			>
				we might feature your testimonial
			</a> on our web app.
		</p>
	{/if}
</section>
