<script>
	import NewPageLayout from '$lib/components/website/NewPageLayout.svelte';
	import TwoColumn from '$lib/components/website/TwoColumn.svelte';
	import Information from '$lib/components/website/Information.svelte';
	import NewHome from '$lib/components/website/NewHome.svelte';
	import Ways from '$lib/components/website/Ways.svelte';
	import WhyChoose from '$lib/components/website/WhyChoose.svelte';
	import ThingsYouShould from '$lib/components/website/ThingsYouShould.svelte';
	import Button from '$lib/components/website/Button.svelte';
	import NewBlogCard from '$lib/components/website/NewBlogCard.svelte';
	import Sublist from '$lib/components/website/Sublist.svelte';
	import ButtonBanner from '$lib/components/website/ButtonBanner.svelte';
	import Seo from '$lib/components/Seo.svelte';
	import HelpList from '$lib/components/website/HelpList.svelte';
	import content from '$lib/data/website/lap.json';
	import FeedbackCheck from '$lib/components/website/FeedbackCheck.svelte';
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
				class="grid w-full gap-8 px-[0.5rem] py-8 md:grid-cols-2 lg:grid-cols-3 lg:py-0 lg:pt-16 lg:pb-32"
			>
				<NewBlogCard blogLists={content.blogs} />
			</div>

			<Ways ways={content.ways} />

			<NewHome steps={content.steps} isBorder paddingClass="lg:px-0" />

			<ButtonBanner contents={content.buttonBanner} isBorder />
			
			<div class="border-b border-[var(--form-border)]">
				<TwoColumn
					cardImage={content.businessHealthCard.cardImage}
					cardAltName={content.businessHealthCard.cardAltName}
					cardHeading={content.businessHealthCard.cardHeading}
					reverse={content.businessHealthCard.reverse}
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
			</div>

			<div class="border-b border-[var(--form-border)]">
				<TwoColumn
					cardImage={content.messageUsCard.cardImage}
					cardAltName={content.messageUsCard.cardAltName}
					cardHeading={content.messageUsCard.cardHeading}
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
			</div>
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
