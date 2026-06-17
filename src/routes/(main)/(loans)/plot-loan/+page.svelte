<script>
	import ThingsYouShould from '$lib/components/website/ThingsYouShould.svelte';
	import Button from '$lib/components/website/Button.svelte';
	import Sublist from '$lib/components/website/Sublist.svelte';
	import TwoColumnWithLeftHeading from '$lib/components/website/TwoColumnWithLeftHeading.svelte';
	import PaymentTable from '$lib/components/website/PaymentTable.svelte';
	import NewPageLayout from '$lib/components/website/NewPageLayout.svelte';
	import HelpList from '$lib/components/website/HelpList.svelte';
	import AboveTitleWithTopIconCard from '$lib/components/website/AboveTitleWithTopIconCard.svelte';
	import AboveTitleWithBlackCard from '$lib/components/website/AboveTitleWithBlackCard.svelte';
	import ButtonBanner from '$lib/components/website/ButtonBanner.svelte';
	import TwoColumnWithImage from '$lib/components/website/TwoColumnWithImage.svelte';
	import Loader from '$lib/components/website/Loader.svelte';
	import Anchor from '$lib/components/website/Anchor.svelte';
	import FeedbackCheck from '$lib/components/website/FeedbackCheck.svelte';
	import { applicationData } from '$lib/stores/stores';
	import Seo from '$lib/components/Seo.svelte';
	import AboveTitleWithoutIconCard from '$lib/components/website/AboveTitleWithoutIconCard.svelte';
	import content from '$lib/data/website/plotLoan.json';

	let loaderValue = false;

	// Bind the runtime click handlers to the JSON buttons
	let pageData = {
		...content.pageData,
		actionBtn: content.pageData?.actionBtn?.map((btn) => {
			if (btn.btnLink === '/get-started/how-can-we-help') {
				return {
					...btn,
					btnClick: () => {
						$applicationData.LoanName = 'Plot Loan';
					}
				};
			}
			return btn;
		})
	};
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
		<NewPageLayout {pageData}>
			<Sublist subList={content.subList} />

			<!-- plot categories -->
			<TwoColumnWithLeftHeading contents={content.plotCategories} />

			<!-- diff b/w plot & home -->
			<div
				class="w-full border-b border-[var(--form-border)] px-4 py-8 text-[var(--form-text)] lg:px-16 lg:py-0 lg:pt-16 lg:pb-32"
			>
				<div class="">
					<h2 class=" mb-8 typography-h2-md text-center text-[var(--form-text)]">
						Plot Loan vs Home Loan:
						<span class="italic underline decoration-primary">Key Differences</span>
					</h2>
				</div>
				<div class="">
					{#each content.firstTableData as tableData}
						<PaymentTable {tableData} />
					{/each}
				</div>
			</div>

			<!-- why choose us -->
			<AboveTitleWithTopIconCard contents={content.whyChooseUs} />

			<!-- balance transfer -->
			<div id="bt">
				<div
					class="w-full border-b border-[var(--form-border)] px-4 py-8 text-[var(--form-text)] lg:px-16 lg:py-0 lg:pt-16 lg:pb-32"
				>
					<div class="">
						<h2 class="typography-h2-md mb-8 text-center text-[var(--form-text)]">
							Balance Transfer for Plot Loans
						</h2>
					</div>
					<div class="">
						{#each content.btTable as tableData}
							<PaymentTable {tableData} />
						{/each}
					</div>
				</div>

				<AboveTitleWithoutIconCard contents={content.chargesAndSavings} />

				<AboveTitleWithTopIconCard contents={content.thingsToConsider} />
			</div>

			<!-- money map -->
			<AboveTitleWithTopIconCard contents={content.savingsCalculators} />

			<!-- plot loan calc -->
			<div id="calc">
				<AboveTitleWithBlackCard contents={content.plotLoanCalculators} />
			</div>

			<!-- ways to pay off -->
			<ButtonBanner contents={content.waysToPayOffFaster} />

			<!-- journey -->
			<TwoColumnWithLeftHeading
				contents={{
					...content.secureDreamPlotBanner,
					btnClick: () => {
						$applicationData.LoanName = 'Plot Loan';
					}
				}}
			/>

			<TwoColumnWithImage contents={content.agriToResiCard}>
				<p class="typography-body-md text-[var(--form-text-secondary)]">
					{content.agriToResiCard.para}
				</p>
				<Anchor link={content.agriToResiCard.url} linkName={content.agriToResiCard.linkName} />
			</TwoColumnWithImage>

			<!-- plot loan support -->
			<TwoColumnWithLeftHeading contents={content.plotLoanSupportBanner} />

			<!-- message us  -->
			<TwoColumnWithImage contents={content.messageUsCard}>
				<p class="typography-body-md text-[var(--form-text-secondary)]">
					{content.messageUsCard.para}
				</p>
				<div class="w-auto">
					<Button link="/contact" btnClass="btn-secondary w-full" btnName="Message us" />
				</div>
			</TwoColumnWithImage>

			<FeedbackCheck />

			<div slot="secondary">
				<HelpList contents={content.help} />
				<ThingsYouShould
					thinkKnow={content.common_components.thingsYouShouldKnow}
					disc="list-decimal"
          containerClass="px-0"
				></ThingsYouShould>
			</div>
		</NewPageLayout>
	</section>
{:else}
	<div class="flex h-screen flex-col items-center justify-center">
		<Loader />
	</div>
{/if}
