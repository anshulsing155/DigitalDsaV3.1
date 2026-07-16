<script>
	import NewPageLayout from '$lib/components/layout/NewPageLayout.svelte';
	import TwoColumn from '$lib/components/sections/TwoColumn.svelte';
	import Information from '$lib/components/sections/Information.svelte';
	import NewHome from '$lib/components/sections/NewHome.svelte';
	import Ways from '$lib/components/sections/Ways.svelte';
	import WhyChoose from '$lib/components/sections/WhyChoose.svelte';
	import ThingsYouShould from '$lib/components/sections/ThingsYouShould.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import NewBlogCard from '$lib/components/sections/NewBlogCard.svelte';
	import Sublist from '$lib/components/layout/Sublist.svelte';
	import ButtonBanner from '$lib/components/sections/ButtonBanner.svelte';
	import Seo from '$lib/components/Seo.svelte';
	import HelpList from '$lib/components/sections/HelpList.svelte';
	import content from '$lib/data/website/lap.json';
	import FeedbackCheck from '$lib/components/ui/FeedbackCheck.svelte';
</script>

<Seo
	type={content.seo.type}
	title={content.seo.title}
	image={content.seo.image}
	description={content.seo.description}
	keywords={content.seo.keywords}
/>

<section class="content">
	<NewPageLayout pageData={content.pageData}>
		<Sublist subList={content.subList} />
		<div class="lg:px-16">
			<WhyChoose facilities={content.facilities} paddingClass="lg:px-0" isBorder />

			<div
				class="grid w-full gap-8 px-[0.5rem] lg:px-0 py-8 md:grid-cols-2 lg:grid-cols-3 lg:py-0 lg:pt-16 lg:pb-32"
			>
				<NewBlogCard blogLists={content.blogs} />
			</div>

			<Ways ways={content.ways} />

			<NewHome steps={content.steps} isBorder paddingClass="lg:px-0" />

			<ButtonBanner contents={content.buttonBanner} isBorder />

			<TwoColumn
				cardImage={content.businessHealthCard.cardImage}
				cardAltName={content.businessHealthCard.cardAltName}
				cardHeading={content.businessHealthCard.cardHeading}
				reverse={content.businessHealthCard.reverse}
				isBorder
			>
				<ul class="typography-body-md grid gap-4 text-[var(--form-text-secondary)]" slot="list">
					<li>
						{content.businessHealthCard.para}
					</li>
					<li>
						<a
							class="text-[var(--ddsa-info-text)] underline underline-offset-4 hover:no-underline"
							href={content.businessHealthCard.link}
						>
							{content.businessHealthCard.linkName}
						</a>
					</li>
				</ul>
			</TwoColumn>

			<TwoColumn
				cardImage={content.messageUsCard.cardImage}
				cardAltName={content.messageUsCard.cardAltName}
				cardHeading={content.messageUsCard.cardHeading}
				isBorder
			>
				<ul class="typography-body-md grid gap-8 text-[var(--form-text-secondary)]" slot="list">
					<li>
						{content.messageUsCard.para}
					</li>

					<div class="w-auto">
						<Button link="/contact" btnClass="btn-secondary" btnName="Message Us" />
					</div>
				</ul>
			</TwoColumn>

			<FeedbackCheck paddingClass="px-0" />
		</div>

		{#snippet secondary()}
			<HelpList contents={content.help} isBorder />
			<ThingsYouShould
				thinkKnow={content.common_components.thingsYouShouldKnow}
				disc="list-decimal"
				containerClass="px-0"
			></ThingsYouShould>
		{/snippet}
	</NewPageLayout>
</section>
