<script lang="ts">
	import NewPageLayout from "$lib/components/website/NewPageLayout.svelte";
	import ThreeColumWithLeftHeading from "$lib/components/website/ThreeColumWithLeftHeading.svelte";
	import TwoColumnWithLeftHeading from "$lib/components/website/TwoColumnWithLeftHeading.svelte";
	import HelpList from "$lib/components/website/HelpList.svelte";
	import ThingsYouShould from "$lib/components/website/ThingsYouShould.svelte";
	import ButtonBanner from "$lib/components/website/ButtonBanner.svelte";
	import Button from "$lib/components/website/Button.svelte";
	import TwoColumnWithImage from "$lib/components/website/TwoColumnWithImage.svelte";
	import Anchor from "$lib/components/website/Anchor.svelte";
	import PaymentTable from "$lib/components/website/PaymentTable.svelte";
	import TableModel from "$lib/components/website/TableModel.svelte";
	import Seo from "$lib/components/website/Seo.svelte";
	import content from "$lib/data/website/secureRetirement.json";

	// Modal states using Svelte 5 runes
	let showModalGovScheme = $state(false);
	let showModalFixedIncome = $state(false);
	let showModalMarketOptions = $state(false);
	let showModalPensionAnnuities = $state(false);

	let dialogBox = $state(null);

	function closeModal(modalName: string) {
		if (modalName === "showModalGovScheme") showModalGovScheme = false;
		if (modalName === "showModalFixedIncome") showModalFixedIncome = false;
		if (modalName === "showModalMarketOptions") showModalMarketOptions = false;
		if (modalName === "showModalPensionAnnuities") showModalPensionAnnuities = false;
		enableScroll();
	}

	function enableScroll() {
		document.documentElement.style.overflow = "";
		document.body.style.overflow = "";
	}

	// Layout and list data dynamically bound from JSON
	const govSchemesContents = $derived({
		...content.govSchemesContents,
		listBtn: {
			btnName: "Compare Plans",
			btnColor: "#ffcc00",
			btnBorder: "#4F4C4D",
			btnClick: () => {
				showModalGovScheme = true;
			}
		}
	});

	const fixedIncomeContents = $derived({
		...content.fixedIncomeContents,
		listBtn: {
			btnName: "Compare Plans",
			btnColor: "#ffcc00",
			btnBorder: "#4F4C4D",
			btnClick: () => {
				showModalFixedIncome = true;
			}
		}
	});

	const marketOptionsContents = $derived({
		...content.marketOptionsContents,
		listBtn: {
			btnName: "Compare Plans",
			btnColor: "#ffcc00",
			btnBorder: "#4F4C4D",
			btnClick: () => {
				showModalMarketOptions = true;
			}
		}
	});

	const pensionAnnuitiesContents = $derived({
		...content.pensionAnnuitiesContents,
		listBtn: {
			btnName: "Compare Plans",
			btnColor: "#ffcc00",
			btnBorder: "#4F4C4D",
			btnClick: () => {
				showModalPensionAnnuities = true;
			}
		}
	});
</script>

<Seo
	type="WebPage"
	title={content.seo.title}
	image={content.seo.image}
	description={content.seo.description}
	keywords={content.seo.keywords}
/>

<section class="mx-auto w-full">
	<NewPageLayout
		pageData={{
			coverImage: content.pageData.coverImage,
			coverAlt: content.pageData.coverAlt,
			heading: content.pageData.heading,
			para: content.pageData.para
		}}
	>
		<!-- Section 1: Safe Government Schemes -->
		<div id="safe-schemes" data-section="safe-schemes">
			<TwoColumnWithLeftHeading contents={govSchemesContents} />

			{#if showModalGovScheme}
				<TableModel bind:showModal={showModalGovScheme} bind:dialog={dialogBox}>
					<div class="relative">
						<div class="sticky top-0 flex justify-between items-center bg-black text-white">
							<div class="w-full">
								<p class="font-ThirdHead text-subParaFont text-center py-5">
									Safe Government Schemes
								</p>
							</div>
							<button
								class="w-fit bg-yellow-400 text-black px-4 py-5 font-bold"
								onclick={() => closeModal("showModalGovScheme")}
							>
								✕
							</button>
						</div>
						<div>
							{#each content.governmentSchemesTableData as tableData}
								<PaymentTable {tableData} />
							{/each}
						</div>
					</div>
				</TableModel>
			{/if}
		</div>

		<!-- Section 2: Fixed Deposits & Flexibility -->
		<div id="fixed-income" data-section="fixed-income">
			<TwoColumnWithLeftHeading contents={fixedIncomeContents} />

			{#if showModalFixedIncome}
				<TableModel bind:showModal={showModalFixedIncome} bind:dialog={dialogBox}>
					<div class="relative">
						<div class="sticky top-0 flex justify-between items-center bg-black text-white">
							<div class="w-full">
								<p class="font-ThirdHead text-subParaFont text-center py-5">
									Fixed Deposits & Flexibility
								</p>
							</div>
							<button
								class="w-fit bg-yellow-400 text-black px-4 py-5 font-bold"
								onclick={() => closeModal("showModalFixedIncome")}
							>
								✕
							</button>
						</div>
						<div>
							{#each content.fixedIncomeTableData as tableData}
								<PaymentTable {tableData} />
							{/each}
						</div>
					</div>
				</TableModel>
			{/if}
		</div>

		<!-- Section 3: Low-Risk Market Options -->
		<div id="market-options" data-section="market-options">
			<TwoColumnWithLeftHeading contents={marketOptionsContents} />

			{#if showModalMarketOptions}
				<TableModel bind:showModal={showModalMarketOptions} bind:dialog={dialogBox}>
					<div class="relative">
						<div class="sticky top-0 flex justify-between items-center bg-black text-white">
							<div class="w-full">
								<p class="font-ThirdHead text-subParaFont text-center py-5">
									Low-Risk Market Options
								</p>
							</div>
							<button
								class="w-fit bg-yellow-400 text-black px-4 py-5 font-bold"
								onclick={() => closeModal("showModalMarketOptions")}
							>
								✕
							</button>
						</div>
						<div>
							{#each content.marketOptionsTableData as tableData}
								<PaymentTable {tableData} />
							{/each}
						</div>
					</div>
				</TableModel>
			{/if}
		</div>

		<!-- Section 4: Pension & Annuities -->
		<div id="pension-annuities" data-section="pension-annuities">
			<TwoColumnWithLeftHeading contents={pensionAnnuitiesContents} />

			{#if showModalPensionAnnuities}
				<TableModel bind:showModal={showModalPensionAnnuities} bind:dialog={dialogBox}>
					<div class="relative">
						<div class="sticky top-0 flex justify-between items-center bg-black text-white">
							<div class="w-full">
								<p class="font-ThirdHead text-subParaFont text-center py-5">
									Pension & Annuities
								</p>
							</div>
							<button
								class="w-fit bg-yellow-400 text-black px-4 py-5 font-bold"
								onclick={() => closeModal("showModalPensionAnnuities")}
							>
								✕
							</button>
						</div>
						<div>
							{#each content.annuityTableData as tableData}
								<PaymentTable {tableData} />
							{/each}
						</div>
					</div>
				</TableModel>
			{/if}
		</div>

		<!-- Action Banners & Custom Cards -->
		<div>
			<ButtonBanner contents={content.buttonBannerContents} />
		</div>

		<div>
			<TwoColumnWithImage
				contents={{
					cardImage: content.calculatorPromoContents.cardImage,
					cardAltName: content.calculatorPromoContents.cardAltName,
					cardHeading: content.calculatorPromoContents.cardHeading,
					reverse: content.calculatorPromoContents.reverse
				}}
			>
				<p class="font-Paragraph text-minParaFont">
					{content.calculatorPromoContents.para}
				</p>
				<Anchor
					link={content.calculatorPromoContents.anchorLink}
					linkName={content.calculatorPromoContents.anchorLinkName}
				/>
			</TwoColumnWithImage>
		</div>

		<ThreeColumWithLeftHeading contents={content.strategiesContents} />

		<TwoColumnWithImage
			contents={{
				cardImage: content.messageUsPromoContents.cardImage,
				cardAltName: content.messageUsPromoContents.cardAltName,
				cardHeading: content.messageUsPromoContents.cardHeading,
				reverse: content.messageUsPromoContents.reverse
			}}
		>
			<p class="font-Paragraph text-minParaFont">
				{content.messageUsPromoContents.para}
			</p>
			<Button
				link={content.messageUsPromoContents.btnLink}
				btnName={content.messageUsPromoContents.btnName}
			/>
		</TwoColumnWithImage>

		<!-- Sidebar Components -->
		<div slot="secondary">
			<HelpList contents={content.commonHelpList} />
			<ThingsYouShould
				thinkKnow={content.commonThingsYouShould}
				disc="list-decimal"
			/>
		</div>
	</NewPageLayout>
</section>
