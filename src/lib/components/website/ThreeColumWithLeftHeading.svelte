<script lang="ts">
	import Anchor from './Anchor.svelte';
	import Button from './Button.svelte';

	type Props = {
		contents?: any;
		paddingClass?: string;
	};

	const { contents = {}, paddingClass = 'px-[0.5rem] lg:px-16' }: Props = $props();
</script>

<section
	class="border-[var(--form-border)] py-[4rem] text-[var(--form-text)] border-b lg:py-0 lg:pt-[4rem] lg:pb-[8rem]"
>
	<div class={`grid grid-cols-3 gap-[2rem] ${paddingClass}`}>
		<!-- Left Heading -->
		<div class="col-span-3 flex flex-col gap-4 lg:col-span-1">
			{#if contents.heading}
				<p class="typography-h2-md text-[var(--form-text)]">
					{@html contents.heading}
				</p>
			{/if}

			{#if contents.para}
				<p class="typography-body-md text-[var(--form-text-secondary)]">
					{@html contents.para}
				</p>
			{/if}
		</div>

		<!-- Cards -->
		{#if contents.cardData}
			<div class="col-span-3 grid grid-cols-2 gap-[4rem] lg:col-span-2">
				{#each contents.cardData as card}
					<div
						class="col-span-2 grid gap-[4rem] border-b border-[var(--form-border)] pb-[2rem] last:border-b-0 md:col-span-1 md:border-b-0 md:pb-0"
					>
						<div class="flex flex-col gap-4">
							{#if card.title}
								<p class="typography-body-lg !font-semibold text-[var(--form-text)]">
									{@html card.title}
								</p>
							{/if}

							{#if card.para}
								<p class="typography-body-md text-[var(--form-text-secondary)]">
									{@html card.para}
								</p>
							{/if}

							{#if card.btnName}
								<div class="w-full md:w-auto">
									<Button
										btnName={card.btnName}
										link={card.btnLink}
										btnClass={card.btnClass}
										onClick={card.btnClick}
									/>
								</div>
							{/if}

							{#if card.linkName}
								<Anchor link={card.url} linkName={card.linkName} />
							{/if}

							{#if card.links}
								<div class="flex flex-col gap-2">
									{#each card.links as link}
										<ul class="grid list-disc pl-5 marker:text-black">
											<li>
												<Anchor
													link={link.secUrl}
													linkName={link.secLinkName}
													linkColor={link.linkColor}
												/>
											</li>
										</ul>
									{/each}
								</div>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</section>
