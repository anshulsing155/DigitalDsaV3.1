<script lang="ts">
	import NewPageLayout from '../layout/NewPageLayout.svelte';
	import WeAreHereHelp from './WeAreHereHelp.svelte';
	import TwoColumnWithLeftHeading from './TwoColumnWithLeftHeading.svelte';
	import PaymentTable from '../features/calculators/PaymentTable.svelte';
	import TwoColumnWithImage from './TwoColumnWithImage.svelte';
	import Seo from '../layout/Seo.svelte';
	import content from '$lib/data/website/lapVsDod.json';
	import HelpList from './HelpList.svelte';

	let { pageData = content.pageData }: { pageData?: any } = $props();
</script>

<Seo
	type={content.seo.type}
	title={content.seo.title}
	image={content.seo.image}
	description={content.seo.description}
	keywords={content.seo.keywords}
/>

<section>
	<NewPageLayout {pageData}>
		<TwoColumnWithLeftHeading contents={content.lap} isBorder />
		<TwoColumnWithLeftHeading contents={content.dod} isBorder />

		<div
			class="w-full border-b border-[var(--form-border)] px-[0.5rem] py-[4rem] lg:px-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem]"
		>
			<div>
				<h2 class="typography-h2-md mb-[4rem] grid text-center text-[var(--form-text)]">
					{content.comparison.heading}
					<span class="italic underline decoration-primary decoration-4 underline-offset-4">
						{content.comparison.italicHeading}
					</span>
				</h2>
			</div>

			{#each content.comparison.tableData as tableData}
				<PaymentTable {tableData} />
			{/each}
		</div>

		<TwoColumnWithImage contents={content.whichToChoose.contents}>
			<ul class="list-disc pl-4">
				{#each content.whichToChoose.list as item}
					<li>
						<span class="font-semibold">{item.bold}</span>
						{item.text}
					</li>
				{/each}
			</ul>
		</TwoColumnWithImage>

		{#snippet secondary()}
			<!-- <WeAreHereHelp
				help={content.common_components.helpList.contents.cards}
				heading={content.common_components.helpList.contents.heading}
			/> -->

			<HelpList contents={content.common_components.helpList.contents} />
		{/snippet}
	</NewPageLayout>
</section>
