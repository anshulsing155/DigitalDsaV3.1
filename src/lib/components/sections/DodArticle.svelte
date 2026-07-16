<script lang="ts">
	import NewPageLayout from '../layout/NewPageLayout.svelte';
	import TwoColumnWithLeftHeading from './TwoColumnWithLeftHeading.svelte';
	import TwoColumnWithImage from './TwoColumnWithImage.svelte';
	import HelpList from './HelpList.svelte';
	import Button from '../ui/Button.svelte';
	import Seo from '../Seo.svelte';
	import content from '$lib/data/website/dodArticle.json';

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
		<TwoColumnWithLeftHeading contents={content.howItWorks} isBorder/>
		<TwoColumnWithLeftHeading contents={content.benefits} isBorder/>
		<TwoColumnWithLeftHeading contents={content.features} isBorder/>
		<TwoColumnWithLeftHeading contents={content.whenToUse} isBorder/>
		<TwoColumnWithLeftHeading contents={content.conclusion} isBorder/>

		<TwoColumnWithImage contents={content.messageUs}>
			<p class="typography-body-md text-[var(--form-text-secondary)]">{content.messageUs.text}</p>
			<Button
				link={content.messageUs.button.link}
				btnClass={content.messageUs.button.btnClass}
				btnName={content.messageUs.button.btnName}
			/>
		</TwoColumnWithImage>

		{#snippet secondary()}
			<HelpList contents={content.common_components.helpList.contents} />
		{/snippet}
	</NewPageLayout>
</section>
