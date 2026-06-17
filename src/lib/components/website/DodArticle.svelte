<script lang="ts">
	import NewPageLayout from './NewPageLayout.svelte';
	import TwoColumnWithLeftHeading from './TwoColumnWithLeftHeading.svelte';
	import TwoColumnWithImage from './TwoColumnWithImage.svelte';
	import HelpList from './HelpList.svelte';
	import Button from './Button.svelte';
	import Seo from './Seo.svelte';
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
		<div class="border-b border-[var(--form-border)] lg:border-b-0">
			<TwoColumnWithLeftHeading contents={content.howItWorks} />
		</div>
		<div class="border-b border-[var(--form-border)] lg:border-b-0">
			<TwoColumnWithLeftHeading contents={content.benefits} />
		</div>
		<div class="border-b border-[var(--form-border)] lg:border-b-0">
			<TwoColumnWithLeftHeading contents={content.features} />
		</div>
		<div class="border-b border-[var(--form-border)] lg:border-b-0">
			<TwoColumnWithLeftHeading contents={content.whenToUse} />
		</div>
		<div class="border-b border-[var(--form-border)] lg:border-b-0">
			<TwoColumnWithLeftHeading contents={content.conclusion} />
		</div>

		<TwoColumnWithImage contents={content.messageUs}>
			<p class="typography-body-md text-[var(--form-text-secondary)]">{content.messageUs.text}</p>
			<Button
				link={content.messageUs.button.link}
				btnClass={content.messageUs.button.btnClass}
				btnName={content.messageUs.button.btnName}
			/>
		</TwoColumnWithImage>

		<div slot="secondary">
			<HelpList contents={content.common_components.helpList.contents} />
		</div>
	</NewPageLayout>
</section>
