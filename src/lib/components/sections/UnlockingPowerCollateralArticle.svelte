<script lang="ts">
	import NewPageLayout from '../layout/NewPageLayout.svelte';
	import ThreeColumWithLeftHeading from './ThreeColumWithLeftHeading.svelte';
	import TwoColumnWithLeftHeading from './TwoColumnWithLeftHeading.svelte';
	import Seo from '../layout/Seo.svelte';
	import content from '$lib/data/website/unlockingPowerCollateral.json';
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
		<TwoColumnWithLeftHeading contents={content.understandingRole} isBorder/>
		<TwoColumnWithLeftHeading contents={content.maximizePotential} isBorder/>
		<ThreeColumWithLeftHeading contents={content.strategicUses} isBorder/>
		<ThreeColumWithLeftHeading contents={content.caseStudy} isBorder/>
		<TwoColumnWithLeftHeading contents={content.conclusion} />

		{#snippet secondary()}
			<HelpList contents={content.common_components.helpList.contents} />
		{/snippet}
	</NewPageLayout>
</section>
