<script>
	let { contents = [], supportHeading = '', gridCol = 3, children = undefined } = $props();

	import Button from './Button.svelte';
</script>

<section class="flex flex-col gap-[2rem] text-[var(--form-text)] lg:pt-[4rem] lg:pb-[8rem]">
	{#if supportHeading}
		<p class="typography-h2-md text-[var(--form-text)]">
			{supportHeading}
		</p>
	{/if}

	<div class="grid md:grid-cols-2 md:gap-[2rem] lg:grid-cols-{gridCol}">
		{#each contents as content}
			<div class="col-span-1 flex flex-col gap-[1rem] py-[1rem] ">
				{#if content.title}
					<p class="typography-body-lg !font-semibold text-[var(--form-text)] md:w-3/4">
						{content.title}
					</p>
				{/if}

				{#if content.lists}
					<ul class="typography-body-md flex flex-col gap-4 text-[var(--form-text-secondary)]">
						{#each content.lists as list}
							<li>{@html list.name}</li>
						{/each}
					</ul>
				{/if}

				{#if content.links}
					<ul class="grid list-disc gap-2 pl-5 marker:text-primary dark:marker:text-white">
						{#each content.links as link}
							<li
								class="typography-body-md"
								class:text-[var(--ddsa-info-text)]={link.url !== ''}
								class:text-deActiveLinkColor={!link.url}
							>
								<a
									href={link.url}
									class="text-inherit underline underline-offset-4 hover:no-underline"
								>
									{link.name}
								</a>
							</li>
						{/each}
					</ul>
				{/if}
				<div>
					{@render children?.()}
				</div>
				{#if content.btn}
					<Button btnName={content.btn} link={content.btnLink} />
				{/if}
			</div>
		{/each}
	</div>
</section>
