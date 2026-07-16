<script>
	import TwoColumn from '$lib/components/website/TwoColumn.svelte';
	import Information from '$lib/components/website/Information.svelte';
	import WhyChoose from '$lib/components/website/WhyChoose.svelte';
	import WeAreHereHelp from '$lib/components/website/WeAreHereHelp.svelte';
	import ThingsYouShould from '$lib/components/website/ThingsYouShould.svelte';
	import Button from '$lib/components/website/Button.svelte';
	import Sublist from '$lib/components/website/Sublist.svelte';
	import NewPageLayout from '$lib/components/website/NewPageLayout.svelte';
	import Seo from '$lib/components/website/Seo.svelte';
	import ThreeColumWithLeftHeading from '$lib/components/website/ThreeColumWithLeftHeading.svelte';
	import ButtonBanner from '$lib/components/website/ButtonBanner.svelte';
	import PaymentTable from '$lib/components/website/PaymentTable.svelte';
	import content from '$lib/data/website/professionalLoan.json';
	import HelpList from '$lib/components/website/HelpList.svelte';
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
			<div id="type">
				<WhyChoose facilities={content.professionalLoanType} paddingClass="lg:px-0" isBorder />
			</div>
			<div id="balanceTransfer">
				<WhyChoose facilities={content.balanceTransferTopup} paddingClass="lg:px-0" isBorder />
			</div>
			<ButtonBanner contents={content.balanceTransferBanner} isBorder />

			<div class="" id="calculator">
				<ThreeColumWithLeftHeading contents={content.calculators} paddingClass="lg:px-0" isBorder />
			</div>

			<div id="repayment">
				<TwoColumn
					cardImage={content.repaymentsCard.cardImage}
					cardAltName={content.repaymentsCard.cardAltName}
					cardHeading={content.repaymentsCard.cardHeading}
					reverse={content.repaymentsCard.reverse}
					isBorder
				>
					<div class="flex flex-col gap-2">
						<p class="typography-body-md text-[var(--form-text-secondary)]">
							{content.repaymentsCard.para}
						</p>
						<ul class="typography-body-md space-y-2 text-[var(--form-text-secondary)]">
							{#each content.repaymentsCard.bullets as bullet}
								<li class="flex items-start gap-2">
									<img src="/icons/circle-check.svg" alt="circle-check-icon" class="mt-2 h-4" />
									{bullet}
								</li>
							{/each}
						</ul>
					</div>

					<Button
						link="/planners/flexible-emi-planner"
						btnName="Calculate now"
						btnClass="btn-primary"
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
				class="w-full border-b border-[var(--form-border)] px-[0.5rem] py-8 text-[var(--form-text)] lg:px-0 lg:py-0 lg:pt-16 lg:pb-32"
			>
				<div class="">
					<h2 class="typography-h2 py-5 text-center text-[var(--form-text)]">
						<span class="underline decoration-primary underline-offset-4"> Secured </span> vs
						<span class="underline decoration-primary underline-offset-4"> Unsecured Loans</span>
					</h2>
				</div>
				<div class="">
					{#each content.firstTableData as tableData}
						<PaymentTable {tableData} />
					{/each}
				</div>
			</div>

			<div id="eligibility">
				<ThreeColumWithLeftHeading
					contents={content.eligibilitySection}
					paddingClass="lg:px-0"
					isBorder
				/>
			</div>

			<div>
				<WhyChoose facilities={content.whyChooseUs} paddingClass="lg:px-0" isBorder />
			</div>

			<ThreeColumWithLeftHeading contents={content.exploreBanner} paddingClass="lg:px-0" isBorder />

			<div>
				<TwoColumn
					cardImage={content.messageCard.cardImage}
					cardAltName={content.messageCard.cardAltName}
					cardHeading={content.messageCard.cardHeading}
					isBorder
				>
					<ul class="typography-body-md grid gap-8 text-[var(--form-text-secondary)]" slot="list">
						<li>
							{content.messageCard.para}
						</li>

						<div class="w-auto">
							<Button link="/contact" btnClass="btn-secondary w-full" btnName="Message us" />
						</div>
					</ul>
				</TwoColumn>
			</div>

			<div>
				<Information />
			</div>
		</div>

		{#snippet secondary()}
			<HelpList contents={content.help} />
			<ThingsYouShould
				thinkKnow={content.common_components.thingsYouShouldKnow}
				disc="list-decimal"
				containerClass="px-0"
			></ThingsYouShould>
		{/snippet}
	</NewPageLayout>
</section>
