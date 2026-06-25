<script lang="ts">
	import Button from "./Button.svelte";

	type ContentItem = {
		title: string;
		icon: string;
		altName: string;
		url: string;
		link: string;
		desc: string;
		btnName: string;
		btnClass?: string;
	};

	type Props = {
		contents: {
			heading?: string;
			para?: string;
			xlGridCol?: number;
			listItem: ContentItem[];
		};
		paddingClass?: string;
		isBorder?: boolean;
	};

	const { contents, paddingClass = 'lg:px-[4rem]', isBorder = true }: Props = $props();
</script>

<section
	class="py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] {paddingClass} w-full {isBorder
		? 'border-b border-[var(--form-border)]'
		: ''}"
>
	<div class="flex flex-col gap-[2rem] w-full">
		<div class="flex flex-col gap-2">
			{#if contents.heading}
				<h2 class="font-ThirdHead text-minHeadFont text-[var(--form-text)]">
					{@html contents.heading}
				</h2>
			{/if}
			{#if contents.para}
				<p class="font-Paragraph text-subParaFont text-[var(--form-text-secondary)]">{@html contents.para}</p>
			{/if}
		</div>

		<div
			class={`grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-${contents.xlGridCol || 3} gap-4`}
		>
			{#each contents.listItem as list}
				<div class="text-[var(--form-text)] group py-[3rem] border border-[var(--form-border)] px-2 bg-[var(--form-bg-card)] rounded-xl hover:shadow-md transition-shadow">
					<div class="flex flex-col justify-center items-center h-full gap-[2rem]">
						<div class="bg-gray-100 p-3 rounded-full group-hover:bg-yellow-400/30 transition-colors">
							<img src={list.icon} alt={list.altName} class="h-[1.5rem]" />
						</div>
						<div class="flex flex-col gap-4 text-center">
							<p class="font-FourthHead text-cardHeading text-[var(--form-text)]">
								{list.title}
							</p>
							<p class="font-SubPara text-subParaFont text-[var(--form-text-secondary)]">
								{list.desc}
							</p>
						</div>

						<div class="w-[90%] md:w-auto">
							<Button
								btnName={list.btnName}
								link={list.link}
								btnClass={list.btnClass || 'btn-secondary'}
							/>
						</div>
					</div>
				</div>
			{/each}
		</div>
	</div>
</section>
