<script>
	let { data } = $props();

	import NewPageLayout from './NewPageLayout.svelte';
	import ThingsYouShould from './ThingsYouShould.svelte';
	import Seo from './Seo.svelte';
	import content from '$lib/data/website/adjustYourBudget.json';
	import SectionIntro from '$lib/components/website/SectionIntro.svelte';

	const { seo, pageData, tips, conclusion } = content;
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
		<SectionIntro heading={conclusion.heading} para={conclusion.para} />
	</NewPageLayout>
</section>

<style>
</style>
