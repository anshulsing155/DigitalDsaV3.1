<script>
	import ThingsYouShould from '$lib/components/sections/ThingsYouShould.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Sublist from '$lib/components/layout/Sublist.svelte';
	import TwoColumnWithLeftHeading from '$lib/components/sections/TwoColumnWithLeftHeading.svelte';
	import PaymentTable from '$lib/components/features/calculators/PaymentTable.svelte';
	import NewPageLayout from '$lib/components/layout/NewPageLayout.svelte';
	import HelpList from '$lib/components/sections/HelpList.svelte';
	import AboveTitleWithTopIconCard from '$lib/components/sections/AboveTitleWithTopIconCard.svelte';
	import AboveTitleWithBlackCard from '$lib/components/sections/AboveTitleWithBlackCard.svelte';
	import ButtonBanner from '$lib/components/sections/ButtonBanner.svelte';
	import TwoColumnWithImage from '$lib/components/sections/TwoColumnWithImage.svelte';
	import Loader from '$lib/components/layout/Loader.svelte';
	import Anchor from '$lib/components/ui/Anchor.svelte';
	import FeedbackCheck from '$lib/components/ui/FeedbackCheck.svelte';
	import { applicationData } from '$lib/stores/stores';
	import Seo from '$lib/components/Seo.svelte';
	import AboveTitleWithoutIconCard from '$lib/components/sections/AboveTitleWithoutIconCard.svelte';
	import content from '$lib/data/website/plotLoan.json';
	import TwoColumn from '$lib/components/sections/TwoColumn.svelte';

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
			<div class="lg:px-16">
				<!-- plot categories -->
				<TwoColumnWithLeftHeading contents={content.plotCategories} isBorder paddingClass="lg:px-0" />

				<!-- diff b/w plot & home -->
				<div
					class="w-full border-b border-[var(--form-border)] px-[0.5rem] lg:px-0 py-[4rem] text-[var(--form-text)] lg:px-0 lg:py-0 lg:pt-[4rem] lg:pb-[8rem]"
				>
					<div class="">
						<h2 class="typography-h2-md py-5 text-center text-[var(--form-text)]">
							Plot Loan vs Home Loan:
							<span class="italic underline decoration-primary underline-offset-4"
								>Key Differences</span
							>
						</h2>
					</div>
					<div class="">
						{#each content.firstTableData as tableData}
							<PaymentTable {tableData} />
						{/each}
					</div>
				</div>

				<!-- why choose us -->
				<AboveTitleWithTopIconCard contents={content.whyChooseUs} isBorder paddingClass="lg:px-0" />

				<!-- balance transfer -->
				<div id="bt">
					<div
						class="w-full border-b border-[var(--form-border)] px-[0.5rem] py-[4rem] text-[var(--form-text)] lg:px-0 lg:py-0 lg:pt-[4rem] lg:pb-[8rem]"
					>
						<div class="">
							<h2 class="typography-h2-md py-5 text-center text-[var(--form-text)]">
								Balance Transfer for Plot Loans
							</h2>
						</div>
						<div class="">
							{#each content.btTable as tableData}
								<PaymentTable {tableData} />
							{/each}
						</div>
					</div>

					<AboveTitleWithoutIconCard
						contents={content.chargesAndSavings}
						isBorder
						paddingClass="px-0"
					/>

					<AboveTitleWithTopIconCard
						contents={content.thingsToConsider}
						isBorder
						paddingClass="px-0"
					/>
				</div>

				<!-- money map -->
				<AboveTitleWithTopIconCard
					contents={content.savingsCalculators}
					isBorder
					paddingClass="lg:px-0"
				/>

				<!-- plot loan calc -->
				<div id="calc">
					<AboveTitleWithBlackCard
						contents={content.plotLoanCalculators}
						isBorder
						paddingClass="lg:px-0"
					/>
				</div>

				<!-- ways to pay off -->
				<ButtonBanner contents={content.waysToPayOffFaster} isBorder />

				<!-- journey -->
				<TwoColumnWithLeftHeading
					contents={{
						...content.secureDreamPlotBanner,
						btnClick: () => {
							$applicationData.LoanName = 'Plot Loan';
						}
					}}
					isBorder
					paddingClass="lg:px-0"
				/>

				<div class="border-b border-[var(--form-border)]">
					<TwoColumn
						cardImage={content.agriToResiCard.cardImage}
						cardAltName={content.agriToResiCard.cardAltName}
						cardHeading={content.agriToResiCard.cardHeading}
						sourceName={content.agriToResiCard.sourceName}
					>
						<p class="typography-body-md text-[var(--form-text-secondary)]">
							{content.agriToResiCard.para}
						</p>
						<Anchor link={content.agriToResiCard.url} linkName={content.agriToResiCard.linkName} />
					</TwoColumn>
				</div>

				<!-- plot loan support -->
				<TwoColumnWithLeftHeading
					contents={content.plotLoanSupportBanner}
					isBorder
					paddingClass="lg:px-0"
				/>

				<!-- message us  -->
				<div class="border-b border-[var(--form-border)]">
					<TwoColumn
						cardImage={content.messageUsCard.cardImage}
						cardAltName={content.messageUsCard.cardAltName}
						cardHeading={content.messageUsCard.cardHeading}
						sourceName={content.messageUsCard.sourceName}
						reverse={content.messageUsCard.reverse}
					>
						<p class="typography-body-md text-[var(--form-text-secondary)]">
							{content.messageUsCard.para}
						</p>
						<div class="w-auto">
							<Button link="/contact" btnClass="btn-secondary w-full" btnName="Message us" />
						</div>
					</TwoColumn>
				</div>

				<FeedbackCheck paddingClass="lg:px-0" />
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
{:else}
	<div class="flex h-screen flex-col items-center justify-center">
		<Loader />
	</div>
{/if}
