<script>
	import NewPageLayout from '$lib/components/website/NewPageLayout.svelte';
	import ThingsYouShould from '$lib/components/website/ThingsYouShould.svelte';
	import Button from '$lib/components/website/Button.svelte';
	import Loader from '$lib/components/website/Loader.svelte';
	import Sublist from '$lib/components/website/Sublist.svelte';
	import AboveTitleWithTopIconCard from '$lib/components/website/AboveTitleWithTopIconCard.svelte';
	import AboveTitleWithBlackCard from '$lib/components/website/AboveTitleWithBlackCard.svelte';
	import NewBlogCard from '$lib/components/website/NewBlogCard.svelte';
	import ButtonBanner from '$lib/components/website/ButtonBanner.svelte';
	import AboveTitleWithoutIconCard from '$lib/components/website/AboveTitleWithoutIconCard.svelte';
	import ThreeColumWithLeftHeading from '$lib/components/website/ThreeColumWithLeftHeading.svelte';
	import VerticalBlog from '$lib/components/website/VerticalBlog.svelte';
	import TwoColumnWithImage from '$lib/components/website/TwoColumnWithImage.svelte';
	import TwoColumnWithLeftHeading from '$lib/components/website/TwoColumnWithLeftHeading.svelte';
	import FeedbackCheck from '$lib/components/website/FeedbackCheck.svelte';
	import HelpList from '$lib/components/website/HelpList.svelte';
	import Seo from '$lib/components/Seo.svelte';
	import DownloadGuideModal from '$lib/components/website/DownloadGuideModal.svelte';
	import content from '$lib/data/website/homeLoan.json';
	import TwoColumn from '$lib/components/website/TwoColumn.svelte';

	let loaderValue = false;
	let showDownloadModal = $state(false);

	function openDownloadModal() {
		showDownloadModal = true;
	}

	const pageDataWithClicks = $derived({
		...content.pageData,
		actionBtn: content.pageData.actionBtn.map((btn) => {
			if (btn.btnName === 'Download Guide') {
				return {
					...btn,
					btnClick: openDownloadModal
				};
			}
			return btn;
		})
	});
</script>

<Seo
	type={content.seo.type}
	title={content.seo.title}
	image={content.seo.image}
	description={content.seo.description}
	keywords={content.seo.keywords}
/>

{#if !loaderValue}
	<section class="content">
		<NewPageLayout pageData={pageDataWithClicks}>
			<Sublist subList={content.subList} />
			<div class="lg:px-16">
				<AboveTitleWithTopIconCard contents={content.whyChoose} paddingClass="lg:px-0" isBorder />

				<div id="calc">
					<AboveTitleWithBlackCard contents={content.calculators} paddingClass="lg:px-0" />
				</div>

				<div
					class="grid w-full gap-8 px-[0.5rem]  py-8 md:grid-cols-2 lg:grid-cols-3 lg:py-0 lg:pt-16 lg:pb-32 lg:border-b border-[var(--form-border)]"
				>
					<NewBlogCard blogLists={content.blogCard1} />
				</div>

				<ButtonBanner contents={content.payFasterBanner} isBorder />

				<AboveTitleWithoutIconCard contents={content.buyingNewHome} paddingClass="lg:px-0" isBorder />

				<ButtonBanner contents={content.itrBanner} isBorder />

				<ThreeColumWithLeftHeading contents={content.startJourney} paddingClass="lg:px-0" isBorder />

				<div
					class="grid w-full gap-8 px-[0.5rem]  py-8 md:grid-cols-2 lg:grid-cols-3 lg:py-0 lg:pt-16 lg:pb-32 lg:border-b border-[var(--form-border)]"
				>
					<NewBlogCard blogLists={content.blogCard2} />

					<div class="flex flex-col gap-4">
						<VerticalBlog blogLists={content.verticalBlog} />
					</div>
				</div>

				<ButtonBanner contents={content.compareRatesBanner} isBorder />

				<TwoColumnWithLeftHeading contents={content.support} paddingClass="lg:px-0" isBorder />

				<div class="border-b border-[var(--form-border)]">
					<TwoColumn
						cardImage={content.messageUs.contents.cardImage}
						cardAltName={content.messageUs.contents.cardAltName}
						cardHeading={content.messageUs.contents.cardHeading}
						reverse={content.messageUs.contents.reverse}
						sourceName={content.messageUs.contents.sourceName}
						originalSource={content.messageUs.contents.originalSource}
					>
						<p class="typography-body-md text-[var(--form-text-secondary)]">
							{content.messageUs.para}
						</p>
						<Button link="/contact" btnClass="btn-secondary" btnName="Message us" />
					</TwoColumn>
				</div>
				<ButtonBanner contents={content.keyFactsBanner} isBorder />

				<div id="propertyguide">
					<AboveTitleWithTopIconCard
						contents={content.propertyGuides}
						paddingClass="lg:px-0"
						isBorder
					/>
				</div>

				<FeedbackCheck paddingClass="lg:px-0" />
			</div>
			{#snippet secondary()}
				<HelpList contents={content.common_components.helpList.contents} isBorder/>
				<ThingsYouShould
					thinkKnow={content.common_components.thinkYouShouldKnow}
					disc="list-decimal"
					containerClass="lg:px-0"
				></ThingsYouShould>
			{/snippet}
		</NewPageLayout>
	</section>
{:else}
	<div class="flex h-screen flex-col items-center justify-center">
		<Loader />
	</div>
{/if}

<!-- Download Guide Modal -->
<DownloadGuideModal bind:showModal={showDownloadModal} />
