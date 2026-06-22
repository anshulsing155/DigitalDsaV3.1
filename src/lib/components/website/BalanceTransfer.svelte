<script lang="ts">
	import Button from './Button.svelte';
	import ThingsYouShould from '$lib/components/website/ThingsYouShould.svelte';
	import { onMount } from 'svelte';
	import StickyNavbar from './StickyNavbar.svelte';
	import PageDesign from './PageDesign.svelte';
	import AboveTitleWithTopIconCard from './AboveTitleWithTopIconCard.svelte';
	import TwoColumnWithLeftHeading from './TwoColumnWithLeftHeading.svelte';
	import PaymentTable from './PaymentTable.svelte';
	import TwoColumnWithImage from './TwoColumnWithImage.svelte';
	import AboveTitleWithBlackCard from './AboveTitleWithBlackCard.svelte';
	import { applicationData } from '$lib/stores/stores';
	import ButtonBanner from './ButtonBanner.svelte';
	import ThreeColumWithLeftHeading from './ThreeColumWithLeftHeading.svelte';
	import FeedbackCheck from './FeedbackCheck.svelte';
	import Seo from './Seo.svelte';
	import HelpList from './HelpList.svelte';
	import content from '$lib/data/website/balanceTransfer.json';
	import { ChevronDown } from '$lib/utils/iconRegistry';
	import { toggleDropdown } from '$lib/utils/toggleDropdown';

	interface ButtonProps {
		btnName: string;
		btnLink: string;
		btnClass?: string;
		animation?: boolean;
	}

	interface PageDataProps {
		coverImage: string;
		coverAlt: string;
		sourceName?: string;
		originalSource?: string;
		heading: string;
		para: string;
		actionBtns: ButtonProps[];
	}

	let { pageData = content.pageData }: { pageData?: PageDataProps } = $props();

	// Inject store update callbacks dynamically for get-started actions
	const pageDataWithClicks = $derived({
		...pageData,
		actionBtns: pageData.actionBtns.map((btn) => {
			if (
				btn.btnLink === '/get-started/how-can-we-help' ||
				btn.btnName === 'Check lowest rates' ||
				btn.btnName === 'Compare rates'
			) {
				return {
					...btn,
					btnClick: () => {
						applicationData.update((data) => {
							data.LoanName = 'Home Loan';
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
			if (
				btn.btnLink === '/get-started/how-can-we-help' ||
				btn.btnName === 'Check lowest rates' ||
				btn.btnName === 'Compare rates'
			) {
				return {
					...btn,
					btnClick: () => {
						applicationData.update((data) => {
							data.LoanName = 'Home Loan';
							return data;
						});
					}
				};
			}
			return btn;
		})
	});

	const toolsThreeColumnWithClicks = $derived({
		...content.tools.threeColumn,
		cardData: content.tools.threeColumn.cardData.map((card) => {
			if (card.needLoanName) {
				return {
					...card,
					btnClick: () => {
						applicationData.update((data) => {
							data.LoanName = 'Home Loan';
							return data;
						});
					}
				};
			}
			return card;
		})
	});

	let activeSection = $state('');

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

	// JSON-LD Structured Data Schema for Breadcrumbs and FAQ Rich Snippets
	const breadcrumbSchema = {
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement: [
			{
				'@type': 'ListItem',
				position: 1,
				name: 'Home',
				item: 'https://www.digitaldsa.com'
			},
			{
				'@type': 'ListItem',
				position: 2,
				name: 'Home Loan',
				item: 'https://www.digitaldsa.com/home-loan'
			},
			{
				'@type': 'ListItem',
				position: 3,
				name: 'Home Loan Balance Transfer',
				item: 'https://www.digitaldsa.com/home-loan/balance-transfer'
			}
		]
	};

	const faqSchema = {
		'@context': 'https://schema.org',
		'@type': 'FAQPage',
		mainEntity: [
			...content.whyRefinance.contents.list.map((c) => ({
				'@type': 'Question',
				name: c.heading,
				acceptedAnswer: {
					'@type': 'Answer',
					text: c.topPara + (c.para || '')
				}
			})),
			...content.whenAvoid.contents.list.map((c) => ({
				'@type': 'Question',
				name: c.heading,
				acceptedAnswer: {
					'@type': 'Answer',
					text: c.topPara + (c.para || '')
				}
			}))
		]
	};
</script>

<svelte:head>
	{@html `<script type="application/ld+json">${JSON.stringify(breadcrumbSchema)}</script>`}
	{@html `<script type="application/ld+json">${JSON.stringify(faqSchema)}</script>`}
</svelte:head>

<Seo
	type="WebPage"
	title="Home Loan Balance Transfer – Lower EMIs & Save More"
	image={pageData.coverImage}
	description="Switch your home loan to a lower interest rate & reduce EMIs. Compare balance transfer offers, calculate savings & apply hassle-free for the best deal today!"
	keywords="Home loan balance transfer, Transfer home loan to another bank, Lower home loan interest rate, Home loan EMI savings, Best home loan transfer offers, Home loan refinance, Reduce home loan EMI, Compare home loan rates, Home loan prepayment options, Home loan top-up loan, Home loan eligibility checker, Home loan transfer calculator, Home loan balance transfer process, Lowest home loan interest rates, Best home loan lenders"
/>

<section class="bg-mainBg mx-auto w-full">
	<PageDesign {pageData} actionBtns={content.actionBtns}>
		<!-- desktop view -->
		<div class="hidden lg:block">
			<StickyNavbar navList={navListWithClicks} {activeSection} />

			<div id="whyRefinance" data-section="whyRefinance">
				<AboveTitleWithTopIconCard contents={content.whyRefinance.contents} isBorder/>
			</div>

			<div id="whenAvoid" data-section="whenAvoid">
				<AboveTitleWithTopIconCard contents={content.whenAvoid.contents} isBorder/>
			</div>

			<div id="how" data-section="how">
				<TwoColumnWithLeftHeading contents={content.how.contents} isBorder/>

				{#if content.how.exampleTableData}
					<div class="border-b border-[var(--form-border)] px-[1rem] py-12 px-[0.5rem] lg:px-16">
						<h3 class="typography-body-lg mb-6 !font-semibold text-[var(--form-text)]">
							{content.how.tableHeading}
						</h3>
						{#each content.how.exampleTableData as table}
							<PaymentTable tableData={table} />
						{/each}
					</div>
				{/if}

				<ButtonBanner contents={content.how.buttonBanner} isBorder/>
			</div>

			<div id="help" data-section="help">
				<TwoColumnWithImage contents={content.help.contents} isBorder>
					<div class="typography-body-md text-[var(--form-text-secondary)]">
						<ul class="typography-body-md list-disc space-y-4 text-[var(--form-text-secondary)]">
							{#each content.help.list as item}
								<li class="flex items-start gap-2">
									<img src="/icons/circle-check.svg" alt="Check icon" class="mt-1 h-5" />
									<p class="text-[var(--form-text-secondary)]">
										<span class="font-semibold">{item.bold}</span>
										{@html item.text}
									</p>
								</li>
							{/each}
						</ul>
					</div>
				</TwoColumnWithImage>
			</div>

			<div id="tools" data-section="tools">
				<ThreeColumWithLeftHeading contents={toolsThreeColumnWithClicks} isBorder/>
				<AboveTitleWithBlackCard contents={content.tools.blackCard} />
				<AboveTitleWithTopIconCard contents={content.tools.topIconCard} isBorder/>
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
						<div
							id="whyRefinance"
							class="bg-[var(--landing-bg)] text-[var(--form-text)]"
						>
							<AboveTitleWithTopIconCard contents={content.whyRefinance.contents} />
						</div>
					{:else if index == 1}
						<div
							id="whenAvoid"
							class="bg-[var(--landing-bg)] text-[var(--form-text)]"
						>
							<AboveTitleWithTopIconCard contents={content.whenAvoid.contents} />
						</div>
					{:else if index == 2}
						<div id="how" class="bg-[var(--landing-bg)] text-[var(--form-text)]">
							<TwoColumnWithLeftHeading contents={content.how.contents} isBorder/>

							{#if content.how.exampleTableData}
								<div class="border-b border-[var(--form-border)] px-[0.5rem] lg:px-16 py-12">
									<h3 class="typography-body-lg mb-6 !font-semibold text-[var(--form-text)]">
										{content.how.tableHeading}
									</h3>
									{#each content.how.exampleTableData as table}
										<PaymentTable tableData={table} />
									{/each}
								</div>
							{/if}

							<ButtonBanner contents={content.how.buttonBanner} />
						</div>
					{:else if index == 3}
						<div id="help" class="bg-[var(--landing-bg)] text-[var(--form-text)]">
							<TwoColumnWithImage contents={content.help.contents}>
								<div class="typography-body-md text-[var(--form-text-secondary)]">
									<ul
										class="typography-body-md list-disc space-y-4 text-[var(--form-text-secondary)]"
									>
										{#each content.help.list as item}
											<li class="flex items-start gap-2">
												<img src="/icons/circle-check.svg" alt="Check icon" class="mt-1 h-5" />
												<p>
													<span class="font-semibold">{item.bold}</span>
													{@html item.text}
												</p>
											</li>
										{/each}
									</ul>
								</div>
							</TwoColumnWithImage>
						</div>
					{:else if index == 4}
						<div id="tools" class="bg-[var(--landing-bg)] text-[var(--form-text)]">
							<ThreeColumWithLeftHeading contents={toolsThreeColumnWithClicks} isBorder/>
							<AboveTitleWithBlackCard contents={content.tools.blackCard} />
							<AboveTitleWithTopIconCard contents={content.tools.topIconCard} isBorder/>
						</div>
					{/if}
				</details>
			{/each}
		</div>

		<!-- message us -->
		<TwoColumnWithImage contents={content.messageUs.contents} isBorder>
			<p class="typography-body-md text-[var(--form-text-secondary)]">{content.messageUs.para}</p>
			<div class="w-auto">
				<Button
					link={content.messageUs.button.link}
					btnName={content.messageUs.button.btnName}
					btnClass={content.messageUs.button.btnClass}
				/>
			</div>
		</TwoColumnWithImage>

		<FeedbackCheck />

		{#snippet secondary()}
			<HelpList contents={content.common_components.helpList.contents} />
			<ThingsYouShould
				thinkKnow={content.common_components.thinkYouShouldKnow.thinkKnow}
				disc={content.common_components.thinkYouShouldKnow.disc}
				containerClass="lg:px-0"
			/>
		{/snippet}
	</PageDesign>
</section>

<style>
</style>
