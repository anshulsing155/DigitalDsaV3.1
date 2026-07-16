<script lang="ts">
	import TopIconCard from './TopIconCard.svelte';

	interface Props {
		contents?: any;
		listGridAboveLg?: string;
		paddingClass?: string;
		isBorder?: boolean;
	}

	let {
		contents = {},
		listGridAboveLg = '3',
		paddingClass = 'lg:px-16',
		isBorder = false
	}: Props = $props();
</script>

<section
	class="py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full {isBorder
		? 'border-b border-[var(--form-border)]'
		: ''}"
>
	<div class={`flex flex-col gap-[2rem] w-full ${paddingClass}`}>
		<div class="flex flex-col gap-2">
			{#if contents.heading}
				<h2 class="font-ThirdHead text-sectionHeading text-[var(--form-text)]">
					{@html contents.heading}
				</h2>
			{/if}
			{#if contents.subHeading}
				<h3 class="font-FifthHead text-subPara text-[var(--form-text)]">
					{@html contents.subHeading}
				</h3>
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
						<TopIconCard cardData={card} />
					</div>
				{/each}
			</div>
		{/if}

		{#if contents.list}
			<div
				class="grid md:grid-cols-2 lg:grid-cols-{listGridAboveLg} xl:grid-cols-{contents.xlGridCol} gap-4"
			>
				{#each contents.list as listItem, index}
					<div
						class="flex flex-col gap-4 items-start mt-4 pr-4 lg:my-[4rem] group border-b border-[var(--form-border)] lg:border-b-0 pb-[2rem] lg:pb-0 {index <
						contents.list.length - 1
							? ''
							: ''}"
					>
						{#if listItem.icon}
							<img
								src={listItem.icon}
								alt={listItem.iconAltName || 'icon'}
								class="h-10 transition-transform duration-300 group-hover:scale-125"
							/>
						{/if}
						<div class="flex flex-col gap-4">
							{#if listItem.heading}
								<h2 class="font-FourthHead text-minSubHead text-[var(--form-text)]">
									{@html listItem.heading}
								</h2>
							{/if}
							{#if listItem.topPara}
								<p
									class="font-SubPara text-minParaFont md:text-subParaFont text-[var(--form-text-secondary)]"
								>
									{@html listItem.topPara}
								</p>
							{/if}
							{#if listItem.desc}
								<ul class="space-y-2 list-disc ml-5 marker:text-[var(--form-text)]">
									{#each listItem.desc as desc}
										<li
											class="font-SubPara text-minParaFont md:text-subParaFont text-[var(--form-text-secondary)]"
										>
											{@html desc}
										</li>
									{/each}
								</ul>
							{/if}
							{#if listItem.para}
								<p
									class="font-SubPara text-minParaFont md:text-subParaFont text-[var(--form-text-secondary)]"
								>
									{@html listItem.para}
								</p>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</section>
