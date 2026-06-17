<script lang="ts">
	import BlackCard from './BlackCard.svelte';

	type Props = {
		contents?: any;
		paddingX?: number;
		mobPaddingX?: number;
	};

	const { contents = {}, paddingX = 4, mobPaddingX = 1 }: Props = $props();
</script>

<section
	class={`w-full px-[0.5rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] ${contents.borderBottom ? 'border-b border-[var(--form-border)]' : ''}`}
>
	<div class="flex w-full flex-col gap-12">
		<h2 class="typography-h2-md text-[var(--form-text)]">
			{@html contents.heading}
		</h2>

		{#if contents.cards}
			<div class="grid gap-8 {contents.xlGridCol === 4 ? 'xl:grid-cols-4' : 'lg:grid-cols-3'}">
				{#each contents.cards as card, index}
					<div
						class={index < contents.cards.length - 1
							? 'border-b border-[var(--form-border)] pb-16 md:border-b-0'
							: ''}
					>
						<BlackCard cardData={card} />
					</div>
				{/each}
			</div>
		{/if}
	</div>
</section>
