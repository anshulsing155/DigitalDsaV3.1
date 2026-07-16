<script lang="ts">
	import CardWithoutIcon from './CardWithoutIcon.svelte';

	interface Props {
		contents?: any;
		children?: any;
		paddingClass?: string;
		isBorder?: boolean;
	}

	let {
		contents = {},
		children,
		paddingClass = 'lg:px-16',
		isBorder = false
	}: Props = $props();
</script>

<section
	class="w-full px-[0.5rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] {isBorder
		? 'border-b border-[var(--form-border)]'
		: ''}"
>
	<div class={`flex w-full flex-col gap-[2rem] ${paddingClass}`}>
		<div class="flex flex-col gap-2">
			{#if contents.heading}
				<h2 class="font-ThirdHead text-sectionHeading text-[var(--form-text)]">
					{@html contents.heading}
				</h2>
			{/if}
			{#if contents.para}
				<p class="font-Paragraph text-subPara text-[var(--form-text-secondary)]">
					{@html contents.para}
				</p>
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
				{#each contents.list as listItem, index}
					<div
						class="group my-[4rem] mt-4 flex flex-col items-start gap-4 pr-4 {index <
						contents.list.length - 1
							? 'border-b border-[var(--form-border)] pb-[4rem] md:border-b-0 md:pb-0'
							: ''}"
					>
						{#if listItem.heading}
							<h2 class="font-FourthHead text-cardHeading text-[var(--form-text)]">
								{@html listItem.heading}
							</h2>
						{/if}
						{#if listItem.topPara}
							<p class="font-SubPara text-subPara text-[var(--form-text-secondary)]">
								{@html listItem.topPara}
							</p>
						{/if}
						{#if listItem.desc}
							<ul class="space-y-2 list-disc ml-5 marker:text-[var(--form-text)]">
								{#each listItem.desc as desc}
									<li class="font-SubPara text-subPara text-[var(--form-text-secondary)]">
										{@html desc}
									</li>
								{/each}
							</ul>
						{/if}
						{#if listItem.para}
							<p class="font-SubPara text-subPara text-[var(--form-text-secondary)]">
								{@html listItem.para}
							</p>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
		{#if children}
			{@render children()}
		{/if}
	</div>
</section>
