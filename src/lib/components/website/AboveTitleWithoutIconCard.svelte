<script>
	let { contents = {}, children = undefined } = $props();

	import CardWithoutIcon from './CardWithoutIcon.svelte';
</script>

<section
	class="w-full border-b border-[var(--form-border)] px-[0.5rem] py-[4rem] lg:px-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem]"
>
	<div class="flex w-full flex-col gap-[2rem]">
		<div class="flex flex-col gap-2">
			{#if contents.heading}
				<h2 class="typography-h2-md text-[var(--form-text)]">
					{@html contents.heading}
				</h2>
			{/if}
			{#if contents.para}
				<p class="typography-body-md text-[var(--form-text-secondary)]">{@html contents.para}</p>
			{/if}
		</div>

		{#if contents.cards}
			<div class="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-{contents.xlGridCol} gap-4">
				{#each contents.cards as card, index}
					<div
						class={index < contents.cards.length - 1
							? 'border-b border-[var(--form-border)] pb-[4rem] md:border-b-0 md:pb-0'
							: ''}
					>
						<CardWithoutIcon cardData={card} />
					</div>
				{/each}
			</div>
		{/if}

		{#if contents.list}
			<div class="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-{contents.xlGridCol} gap-4">
				{#each contents.list as listItem}
					<div class="group my-[4rem] mt-4 flex flex-col items-start gap-2 pr-4">
						{#if listItem.heading}
							<h2 class="typography-body-lg !font-semibold text-[var(--form-text)]">
								{@html listItem.heading}
							</h2>
						{/if}
						{#if listItem.topPara}
							<p class="typography-body-md text-[var(--form-text-secondary)]">
								{@html listItem.topPara}
							</p>
						{/if}
						{#if listItem.desc}
							<ul class="ml-5 list-disc space-y-1">
								{#each listItem.desc as desc}
									<li class="typography-body-md text-[var(--form-text-secondary)]">
										{@html desc}
									</li>
								{/each}
							</ul>
						{/if}
						{#if listItem.para}
							<p class="typography-body-md text-[var(--form-text-secondary)]">
								{@html listItem.para}
							</p>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
		{@render children?.()}
	</div>
</section>
