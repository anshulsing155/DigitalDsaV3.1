<script>
	let { data } = $props();

	import NewPageLayout from '../layout/NewPageLayout.svelte';
	import ThingsYouShould from './ThingsYouShould.svelte';
	import Seo from '../Seo.svelte';
	import content from '$lib/data/website/budgetingTips.json';
	import SectionIntro from '$lib/components/sections/SectionIntro.svelte';

	const { seo, pageData, tips, finalThoughts } = content;
</script>

<Seo
	type={seo.type}
	title={seo.title}
	image={seo.image}
	description={seo.description}
	keywords={seo.keywords}
/>

<section class="content">
	<NewPageLayout {pageData}>
		{#each tips as tip}
			<ThingsYouShould thinkKnow={tip} disc="list-disc" sectionBorder />
		{/each}

		<SectionIntro heading={finalThoughts.heading} para={finalThoughts.para} />
	</NewPageLayout>
</section>

<style>
</style>
