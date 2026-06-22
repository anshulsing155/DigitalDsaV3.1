<script lang="ts">
	import LeftIconCard from './LeftIconCard.svelte';

	type Props = {
		contents?: any;
	};

	const { contents = {} }: Props = $props();
</script>

<section
	class={`w-full  py-16 lg:px-0 ${contents.borderBottom ? 'border-b border-[var(--form-border)]' : ''}`}
>
	<div class="flex w-full flex-col gap-4">
		<h2 class="typography-h2-md text-[var(--form-text)]">
			{@html contents.heading}
		</h2>

		{#if contents.cards}
			<div
				class={`grid gap-4 md:grid-cols-2 ${contents.xlGridCol === 4 ? 'xl:grid-cols-4' : 'lg:grid-cols-3'}`}
			>
				{#each contents.cards as card, index}
					<a href={card.url} class="group">
						<div
							class={index < contents.cards.length - 1
								? 'border-b border-[var(--form-border)] pb-16 md:border-r md:border-b-0 md:pb-0'
								: ''}
						>
							<LeftIconCard cardData={card} />
						</div>
					</a>
				{/each}
			</div>
		{/if}
	</div>
</section>
