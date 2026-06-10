<script lang="ts">
	import LeftIconCard from './LeftIconCard.svelte';

	type Props = {
		contents?: any;
	};

	const { contents = {} }: Props = $props();
</script>

<section
	class={`w-full py-[1rem] px-[1rem] lg:px-16 lg:py-0 lg:pt-16 lg:pb-32 ${ contents.borderBottom ? 'border-[var(--form-border)] lg:border-b' : '' }`}
>
	<div class="flex w-full flex-col gap-8">
		<h2
			class="typography-h2-md text-black dark:text-red-500"
		>
			{@html contents.heading}
		</h2>

		{#if contents.cards}
			<div
				class={`grid gap-4 md:grid-cols-2 ${ contents.xlGridCol === 4 ? 'xl:grid-cols-4' : 'lg:grid-cols-3' }`}
			>
				{#each contents.cards as card, index (index)}
					<div
						class={index < contents.cards.length - 1
							? 'border-b border-[var(--form-border)] pb-16 md:border-b-0 md:pb-0'
							: ''}
					>
						<LeftIconCard cardData={card} />
					</div>
				{/each}
			</div>
		{/if}
	</div>
</section>
