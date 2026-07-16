<script lang="ts">
	import { onMount } from 'svelte';
	import StickyNavbar from '../layout/StickyNavbar.svelte';
	import NewPageLayout from '../layout/NewPageLayout.svelte';
	import ThreeColumWithLeftHeading from './ThreeColumWithLeftHeading.svelte';
	import TwoColumnWithImage from './TwoColumnWithImage.svelte';
	import Anchor from '../ui/Anchor.svelte';
	import AboveTitleWithLeftIconCard from './AboveTitleWithLeftIconCard.svelte';
	import TwoColumnWithLeftHeading from './TwoColumnWithLeftHeading.svelte';
	import ThingsYouShould from './ThingsYouShould.svelte';
	import HelpList from './HelpList.svelte';
	import Button from '../ui/Button.svelte';
	import PaymentTable from '../features/calculators/PaymentTable.svelte';
	import ButtonBanner from './ButtonBanner.svelte';
	import { applicationData } from '$lib/stores/stores';
	
	import AboveTitleWithBlackCard from './AboveTitleWithBlackCard.svelte';
	import AboveTitleWithTopIconCard from './AboveTitleWithTopIconCard.svelte';
	import Seo from '../layout/Seo.svelte';
	import content from '$lib/data/website/plotLoanOnly.json';
	import { toggleDropdown } from '$lib/utils/toggleDropdown';
	import { ChevronDown } from '$lib/utils/iconRegistry';

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
			if (btn.btnLink === '/get-started/how-can-we-help' || btn.btnName === 'Compare offers') {
				return {
					...btn,
					btnClick: () => {
						applicationData.update((data) => {
							data.LoanName = 'Plot Loan';
							data.typeOfROI = '(HL/Construction/Plot+Construction/Plot)';
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
			if (btn.btnLink === '/get-started/how-can-we-help' || btn.btnName === 'Compare offers') {
				return {
					...btn,
					btnClick: () => {
						applicationData.update((data) => {
							data.LoanName = 'Plot Loan';
							data.typeOfROI = '(HL/Construction/Plot+Construction/Plot)';
							return data;
						});
					}
				};
			}
			return btn;
		})
	});

	const dreamPlotWithClicks = $derived({
		...content.dreamPlot.contents,
		cardData: content.dreamPlot.contents.cardData.map((card) => {
			if (card.btnLink === '/get-started/how-can-we-help') {
				return {
					...card,
					btnClick: () => {
						applicationData.update((data) => {
							data.LoanName = 'Plot Loan';
							data.LoanType = 'Plot Loan Only';
							return data;
						});
					}
				};
			}
			return card;
		})
	});

	let activeSection = $state('');
	let firstTableData = content.firstTableData;

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

			<div id="ready" data-section="ready" class="section">
				<ThreeColumWithLeftHeading contents={content.ready} isBorder />
			</div>

			<div id="challenges" data-section="challenges" class="section">
				<TwoColumnWithLeftHeading contents={content.challenges.contents} isBorder />
				<AboveTitleWithLeftIconCard contents={content.categories.contents} isBorder />

				<div
					class="w-full border-b border-[var(--form-border)] px-[0.5rem] py-[4rem] lg:px-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem]"
				>
					<div class="">
						<h2 class="typography-h2-md mb-[4rem] grid text-center text-[var(--form-text)]">
							Plot-Only loans : <br />
							<span class="italic underline decoration-primary decoration-4 underline-offset-4">
								Key Differences
							</span>
						</h2>
					</div>
					<div class="">
						{#each firstTableData as tableData}
							<PaymentTable {tableData} />
						{/each}
					</div>
				</div>

				<div id="bt">
					<TwoColumnWithLeftHeading contents={content.bt.contents} isBorder />
				</div>

				<ThreeColumWithLeftHeading contents={dreamPlotWithClicks} isBorder />
			</div>

			<div id="help" data-section="help" class="section">
				<TwoColumnWithImage contents={content.howWeHelp.contents} isBorder>
					<div class="typography-body-md text-[var(--form-text-secondary)]">
						<ul class="list-disc space-y-4">
							{#each content.howWeHelp.list as item}
								<li class="flex items-start gap-1">
									<img src="/icons/circle-check.svg" alt="circle-check-icon" class="mt-1 h-4" />
									<span>
										<strong>{item.bold}</strong>
										{item.text}
									</span>
								</li>
							{/each}
						</ul>
					</div>
				</TwoColumnWithImage>

				<TwoColumnWithLeftHeading contents={content.exploreMore} isBorder />
			</div>

			<div id="tools" data-section="tools" class="section">
				<AboveTitleWithTopIconCard contents={content.tools.moneyMap} isBorder />
				<AboveTitleWithBlackCard contents={content.tools.calculators} />
				<ButtonBanner contents={content.tools.buttonBanner} isBorder />
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
						class="bg-ddsa-gradient-primary col-span-3 cursor-pointer list-none px-[1rem] py-[1.5rem] text-white"
						onclick={(e) => toggleDropdown(e, index)}
					>
						<div class="mx-auto flex w-full items-center justify-between gap-4">
							<h2 class="typography-label">{list}</h2>
							<div class="justify-self-end">
								<ChevronDown class="faq-icon transition-transform duration-300" />
							</div>
						</div>
					</summary>

					{#if index == 0}
						<div id="ready" class="bg-[var(--landing-bg)]">
							<ThreeColumWithLeftHeading contents={content.ready} />
						</div>
					{:else if index == 1}
						<div id="challenges" class="bg-[var(--landing-bg)] text-[var(--form-text)]">
							<div class=" border-b border-[var(--form-border)]">
								<TwoColumnWithLeftHeading contents={content.challenges.contents} />
							</div>
							<div class=" border-b border-[var(--form-border)]">
								<AboveTitleWithLeftIconCard contents={content.categories.contents} />
							</div>
							<div class="w-full border-b border-[var(--form-border)] px-[0.5rem] py-[4rem]">
								<div class="">
									<h2 class="typography-h2-md mb-[4rem] grid text-center text-[var(--form-text)]">
										Plot-Only loans : <br />
										<span
											class="italic underline decoration-primary decoration-4 underline-offset-4"
										>
											Key Differences
										</span>
									</h2>
								</div>
								<div class="">
									{#each firstTableData as tableData}
										<PaymentTable {tableData} />
									{/each}
								</div>
							</div>

							<div id="bt" class="border-b border-[var(--form-border)]">
								<TwoColumnWithLeftHeading contents={content.bt.contents} />
							</div>

							<ThreeColumWithLeftHeading contents={dreamPlotWithClicks} />
						</div>
					{:else if index == 2}
						<div id="help" class="bg-[var(--landing-bg)] text-[var(--form-text)]">
							<TwoColumnWithImage contents={content.howWeHelp.contents} isBorder>
								<div class="typography-body-md text-[var(--form-text-secondary)]">
									<ul class="list-disc space-y-4">
										{#each content.howWeHelp.list as item}
											<li class="flex items-start gap-1">
												<img
													src="/icons/circle-check.svg"
													alt="circle-check-icon"
													class="mt-1 h-4"
												/>
												<span>
													<strong>{item.bold}</strong>
													{item.text}
												</span>
											</li>
										{/each}
									</ul>
								</div>
							</TwoColumnWithImage>

							<TwoColumnWithLeftHeading contents={content.exploreMore} />
						</div>
					{:else if index == 3}
						<div id="tools" class="bg-[var(--landing-bg)] text-[var(--form-text)]">
							<AboveTitleWithTopIconCard contents={content.tools.moneyMap} isBorder />
							<AboveTitleWithBlackCard contents={content.tools.calculators} />
							<ButtonBanner contents={content.tools.buttonBanner} isBorder />
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

		{#snippet secondary()}
			<HelpList contents={content.common_components.helpList.contents} isBorder />
			<ThingsYouShould
				thinkKnow={content.common_components.thinkYouShouldKnow}
				disc="list-decimal"
				containerClass="px-0"
			/>
		{/snippet}
	</NewPageLayout>
</section>

<style>
	.section {
		scroll-margin-top: 4rem;
	}
</style>
