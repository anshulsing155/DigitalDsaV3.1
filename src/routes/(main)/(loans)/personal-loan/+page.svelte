<script>
	import TwoColumn from '$lib/components/sections/TwoColumn.svelte';
	import Information from '$lib/components/sections/Information.svelte';
	import WhyChoose from '$lib/components/sections/WhyChoose.svelte';
	import WeAreHereHelp from '$lib/components/sections/WeAreHereHelp.svelte';
	import ThingsYouShould from '$lib/components/sections/ThingsYouShould.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Sublist from '$lib/components/layout/Sublist.svelte';
	import NewPageLayout from '$lib/components/layout/NewPageLayout.svelte';
	import Seo from '$lib/components/Seo.svelte';
	import ThreeColumWithLeftHeading from '$lib/components/sections/ThreeColumWithLeftHeading.svelte';
	import ButtonBanner from '$lib/components/sections/ButtonBanner.svelte';
	import PaymentTable from '$lib/components/features/calculators/PaymentTable.svelte';
	import content from '$lib/data/website/personalLoan.json';
	import HelpList from '$lib/components/sections/HelpList.svelte';
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
			<div id="type" class="">
				<WhyChoose facilities={content.personalLoanPurpose} paddingClass="lg:px-0" isBorder />
			</div>
			<div id="balanceTransfer" class="">
				<WhyChoose facilities={content.balanceTransferTopup} paddingClass="lg:px-0" isBorder />
			</div>
			<ButtonBanner contents={content.balanceTransferBanner} paddingClass="lg:px-0" isBorder />

			<div class="" id="calculator">
				<ThreeColumWithLeftHeading contents={content.calculators} paddingClass="lg:px-0" isBorder />
			</div>

			<div id="repayment" class="">
				<TwoColumn
					cardImage={content.repaymentsCard.cardImage}
					cardAltName={content.repaymentsCard.cardAltName}
					cardHeading={content.repaymentsCard.cardHeading}
					reverse={content.repaymentsCard.reverse}
					sourceName={content.repaymentsCard.sourceName}
					originalSource={content.repaymentsCard.originalSource}
					paddingClass="lg:px-0"
					isBorder
				>
					<div class="flex flex-col gap-2">
						<p class="typography-body-md text-[var(--form-text-secondary)]">
							{content.repaymentsCard.para}
						</p>
						<ul class="typography-body-md space-y-2 text-[var(--form-text-secondary)]">
							{#each content.repaymentsCard.bullets as bullet}
								<li class="flex items-start gap-2">
									<img src="/icons/circle-check.svg" alt="circle-check-icon" class="mt-1 h-4" />
									{bullet}
								</li>
							{/each}
						</ul>
					</div>

					<Button
						link={content.repaymentsCard.buttonBanner.btnLink}
						btnName={content.repaymentsCard.buttonBanner.btnName}
						btnClass={content.repaymentsCard.buttonBanner.btnClass}
					/>
				</TwoColumn>
			</div>

			<ThreeColumWithLeftHeading
				contents={content.wealthCalculators}
				paddingClass="lg:px-0"
				isBorder
			/>

			<div
				id="securedUnsecured"
				class="border-b border-[var(--form-border)] px-[0.5rem] py-[4rem] lg:px-0 lg:py-0 lg:pt-[4rem] lg:pb-[8rem]"
			>
				<h2
					class="typography-h2-md mb-6 text-center !font-semibold text-[var(--form-text)] underline decoration-primary underline-offset-4"
				>
					Secured vs Unsecured Loans
				</h2>
				{#each content.firstTableData as tableData}
					<PaymentTable {tableData} />
				{/each}
			</div>

			<div id="eligibility" class="border-b border-[var(--form-border)]">
				<ThingsYouShould
					thinkKnow={content.loanEligibilityCriteria}
					disc="list-disc"
					containerClass="px-0"
				/>
			</div>
			<WhyChoose facilities={content.whyChooseUs} paddingClass="lg:px-0" isBorder />

			<ThreeColumWithLeftHeading contents={content.exploreBanner} paddingClass="lg:px-0" isBorder />

			<TwoColumn
				cardImage={content.messageCard.cardImage}
				cardAltName={content.messageCard.cardAltName}
				cardHeading={content.messageCard.cardHeading}
				sourceName={content.messageCard.sourceName}
				paddingClass="lg:px-0"
				isBorder
			>
				<ul class="typography-body-md grid gap-8 text-[var(--form-text-secondary)]" slot="list">
					<li>
						{content.messageCard.para}
					</li>

					<div class="w-auto">
						<Button link="/contact" btnClass="btn-secondary" btnName="Message us" />
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
