<script lang="ts">
	import { onMount } from 'svelte';
	import NewPageLayout from './NewPageLayout.svelte';
	import TwoColumnWithImage from './TwoColumnWithImage.svelte';
	import TwoColumnWithLeftHeading from './TwoColumnWithLeftHeading.svelte';
	import AboveTitleWithoutIconCard from './AboveTitleWithoutIconCard.svelte';
	import ThingsYouShould from './ThingsYouShould.svelte';
	import HelpList from './HelpList.svelte';
	import Button from './Button.svelte';
	import AboveTitleWithTopIconCard from './AboveTitleWithTopIconCard.svelte';
	import PaymentTable from './PaymentTable.svelte';
	import AboveTitleWithBlackCard from './AboveTitleWithBlackCard.svelte';
	import ButtonBanner from './ButtonBanner.svelte';
	import { applicationData } from '$lib/stores/stores';
	import StickyNavbar from './StickyNavbar.svelte';
	import Seo from './Seo.svelte';
	import content from '$lib/data/website/plotLoanOnlyChallenges.json';
	import { ChevronDown } from '$lib/utils/iconRegistry';
	import { toggleDropdown } from '$lib/utils/toggleDropdown';

	interface ButtonProps {
		btnName: string;
		btnLink: string;
		btnColor?: string;
		animation?: boolean;
	}

	interface PageDataProps {
		coverImage: string;
		coverAlt: string;
		classStyle?: string;
		heading: string;
		para: string;
		actionBtns: ButtonProps[];
	}

	let { pageData = content.pageData }: { pageData?: PageDataProps } = $props();

	const pageDataWithClicks = $derived({
		...pageData,
		actionBtns: pageData.actionBtns.map((btn) => {
			if (btn.btnLink === '/get-started/how-can-we-help' || btn.btnName === 'Compare rates') {
				return {
					...btn,
					btnClick: () => {
						applicationData.update((data) => {
							data.LoanName = 'Plot Loan';
							return data;
						});
					}
				};
			}
			return btn;
		})
	});

	const navListWithClicks = $derived({
		...content.navList,
		actionBtns: content.navList.actionBtns.map((btn) => {
			if (btn.btnLink === '/get-started/how-can-we-help' || btn.btnName === 'Compare rates') {
				return {
					...btn,
					btnClick: () => {
						applicationData.update((data) => {
							data.LoanName = 'Plot Loan';
							return data;
						});
					}
				};
			}
			return btn;
		})
	});

	const journeyWithClicks = $derived({
		...content.journey,
		btnClick: () => {
			applicationData.update((data) => {
				data.LoanName = 'Plot Loan';
				data.LoanType = 'Plot Loan Only';
				return data;
			});
		}
	});

	let activeSection = $state('');
	let firstTableData = content.firstTableData;
	let challenges = content.challenges;

	const initializeActiveSection = () => {
		const firstSection = document.querySelector('[data-section]');
		if (firstSection) {
			activeSection = firstSection.id;
		}
	};

	const handleScroll = () => {
		const sections = document.querySelectorAll('[data-section]');
		let currentSection = '';

		sections.forEach((section) => {
			const rect = section.getBoundingClientRect();
			if (rect.top <= 200 && rect.bottom >= 200) {
				currentSection = section.id;
			}
		});

		if (currentSection) {
			activeSection = currentSection;
		}
	};

	onMount(() => {
		initializeActiveSection();
		window.addEventListener('scroll', handleScroll);

		return () => {
			window.removeEventListener('scroll', handleScroll);
		};
	});
</script>

<Seo
	type={content.seo.type}
	title={content.seo.title}
	image={content.seo.image}
	description={content.seo.description}
	keywords={content.seo.keywords}
/>

<section class="">
	<NewPageLayout pageData={pageDataWithClicks}>
		<!-- desktop view -->
		<div class="hidden lg:block">
			<StickyNavbar navList={navListWithClicks} {activeSection} />

			<div id="search" data-section="search" class="section">
				<TwoColumnWithLeftHeading contents={content.search} />
			</div>

			<div id="challenges" data-section="challenges" class="section">
				<div
					class="w-full border-b border-[var(--form-border)] px-[0.5rem] py-[4rem] lg:px-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem]"
				>
					<div class="flex flex-col gap-[2rem] lg:gap-[4rem]">
						<h2 class="typography-h2-md !font-semibold text-[var(--form-text)]">
							{@html challenges.heading}
						</h2>
						<div class="grid gap-[2rem] md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
							{#each challenges.list as listItem}
								<div
									class="grid gap-4 min-h-fit rounded rounded-lg border border-[var(--form-border)] shadow-[10px_10px_10px_rgba(0,0,0,0.15)]"
								>
									<div class="row-span-2">
										<h2 class="typography-h3 p-4 font-semibold text-text-main">
											{@html listItem.heading}
										</h2>
										<p class="typography-body-md p-4 text-text-light">
											{@html listItem.topPara}
										</p>
									</div>
									<div class="bg-ddsa-gradient-primary p-4 rounded-b-lg row-span-1">
										<p
											class="typography-body-md text-text-light text-white"
										>
											{@html listItem.para}
										</p>
									</div>
								</div>
							{/each}
						</div>
					</div>
				</div>
			</div>

			<div id="chances" data-section="chances" class="section">
				<TwoColumnWithLeftHeading contents={content.chances} />
			</div>

			<div id="alternate" data-section="alternate" class="section">
				<AboveTitleWithTopIconCard contents={content.alternate.contents} />

				<div
					class="w-full border-b border-[var(--form-border)] px-[0.5rem] py-[4rem] lg:px-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem]"
				>
					<div class="">
						<h2
							class="typography-h2-md mb-[4rem] grid text-center font-semibold text-[var(--form-text)]"
						>
							Comparison of Alternative Financing Options for Buying a Plot
						</h2>
					</div>
					<div class="">
						{#each firstTableData as tableData}
							<PaymentTable {tableData} />
						{/each}
					</div>
				</div>

				<ButtonBanner contents={content.tools.buttonBanner} />
				<AboveTitleWithoutIconCard contents={content.risks.contents} />
				<TwoColumnWithLeftHeading contents={journeyWithClicks} />
			</div>

			<div id="tools" data-section="tools" class="section">
				<AboveTitleWithTopIconCard contents={content.tools.moneyMap} />
				<AboveTitleWithBlackCard contents={content.tools.calculators} />
			</div>
		</div>

		<!-- mobile view -->
		<div class="block lg:hidden">
			{#each content.mobileNavbarTitle as list, index (list)}
				<details
					class="dropdown border-bgBtn col-span-3 bg-[var(--landing-bg-card)] text-[var(--form-text)] {index <
					content.mobileNavbarTitle.length - 1
						? 'border-b border-[var(--form-border)]'
						: ''}"
				>
					<summary
						class="col-span-3 cursor-pointer list-none px-[1rem] py-[1.5rem]"
						onclick={(e) => toggleDropdown(e, index)}
					>
						<div class="mx-auto flex w-full items-center justify-between gap-4">
							<h2 class="typography-label text-[var(--form-text)]">{list}</h2>
							<div class="justify-self-end text-[var(--form-text)]">
								<ChevronDown class="faq-icon transition-transform duration-300" />
							</div>
						</div>
					</summary>

					{#if index == 0}
						<div
							id="search"
							class="bg-[var(--landing-bg)] px-[0.5rem] pb-4 text-[var(--form-text)]"
						>
							<TwoColumnWithLeftHeading contents={content.search} />
						</div>
					{:else if index == 1}
						<div
							id="challenges"
							class="bg-[var(--landing-bg)] px-[0.5rem] pb-4 text-[var(--form-text)]"
						>
							<div class="w-full border-b border-[var(--form-border)] px-[0.5rem] py-[4rem]">
								<div class="flex flex-col gap-[2rem]">
									<h2 class="typography-h2 text-text-main">
										{@html challenges.heading}
									</h2>
									<div class="grid gap-[4rem] md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
										{#each challenges.list as listItem}
											<div
												class="grid grid-rows-8 gap-4 rounded shadow-[10px_10px_10px_rgba(0,0,0,0.15)]"
											>
												<h2 class="typography-h3 row-span-2 p-4 font-semibold text-text-main">
													{@html listItem.heading}
												</h2>
												<p class="typography-body-md row-span-3 p-4 text-text-light">
													{@html listItem.topPara}
												</p>
												<p
													class="typography-body-md row-span-3 rounded-b-lg bg-black p-4 text-text-light text-white"
												>
													{@html listItem.para}
												</p>
											</div>
										{/each}
									</div>
								</div>
							</div>
						</div>
					{:else if index == 2}
						<div
							id="chances"
							class="bg-[var(--landing-bg)] px-[0.5rem] pb-4 text-[var(--form-text)]"
						>
							<TwoColumnWithLeftHeading contents={content.chances} />
						</div>
					{:else if index == 3}
						<div
							id="alternate"
							class="bg-[var(--landing-bg)] px-[0.5rem] pb-4 text-[var(--form-text)]"
						>
							<AboveTitleWithTopIconCard contents={content.alternate.contents} />

							<div class="w-full border-b border-[var(--form-border)] px-[0.5rem] py-[4rem]">
								<div class="">
									<h2 class="typography-h2 mb-[4rem] grid text-center text-text-main">
										Comparison of Alternative Financing Options for Buying a Plot
									</h2>
								</div>
								<div class="">
									{#each firstTableData as tableData}
										<PaymentTable {tableData} />
									{/each}
								</div>
							</div>

							<ButtonBanner contents={content.tools.buttonBanner} />
							<AboveTitleWithoutIconCard contents={content.risks.contents} />
							<TwoColumnWithLeftHeading contents={journeyWithClicks} />
						</div>
					{:else if index == 4}
						<div id="tools" class="bg-[var(--landing-bg)] px-[0.5rem] pb-4 text-[var(--form-text)]">
							<AboveTitleWithTopIconCard contents={content.tools.moneyMap} />
							<AboveTitleWithBlackCard contents={content.tools.calculators} />
						</div>
					{/if}
				</details>
			{/each}
		</div>

		<!-- message us -->
		<TwoColumnWithImage contents={content.messageUs.contents}>
			<p>{content.messageUs.para}</p>
			<div class="w-auto">
				<Button
					link={content.messageUs.button.link}
					btnClass={content.messageUs.button.btnClass}
					btnName={content.messageUs.button.btnName}
				/>
			</div>
		</TwoColumnWithImage>

		<div slot="secondary">
			<HelpList contents={content.common_components.helpList.contents} />
			<ThingsYouShould
				thinkKnow={content.common_components.thinkYouShouldKnow}
				disc="list-decimal"
				containerClass="px-0"
			/>
		</div>
	</NewPageLayout>
</section>

<style>
	.section {
		scroll-margin-top: 4rem;
	}
</style>
