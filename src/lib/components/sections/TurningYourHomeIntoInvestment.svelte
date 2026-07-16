<script lang="ts">
	import NewPageLayout from '../layout/NewPageLayout.svelte';
	import StickyNavbar from '../layout/StickyNavbar.svelte';
	import AboveTitleWithoutIconCard from './AboveTitleWithoutIconCard.svelte';
	import AboveTitleWithBlackCard from './AboveTitleWithBlackCard.svelte';
	import ThreeColumWithLeftHeading from './ThreeColumWithLeftHeading.svelte';
	import Button from '../ui/Button.svelte';
	import HelpList from './HelpList.svelte';
	import ThingsYouShould from './ThingsYouShould.svelte';
	import PaymentTable from '../features/calculators/PaymentTable.svelte';
	import ButtonBanner from './ButtonBanner.svelte';
	import TwoColumnWithImage from './TwoColumnWithImage.svelte';
	import Seo from '../layout/Seo.svelte';
	import { onMount, createEventDispatcher } from 'svelte';
	import { applicationData } from '$lib/stores/stores';
	import { ChevronDown } from '$lib/utils/iconRegistry';
	import content from '$lib/data/website/turningYourHomeIntoInvestment.json';
	import { toggleDropdown } from '$lib/utils/toggleDropdown';

	interface ButtonProps {
		btnName: string;
		btnLink: string;
		btnClass?: string;
		animation?: boolean;
	}

	interface PageDataProps {
		coverImage: string;
		coverAlt?: string;
		altName?: string;
		heading: string;
		para: string;
		actionBtns: ButtonProps[];
	}

	let { pageData = content.pageData }: { pageData?: PageDataProps } = $props();

	// Inject store update callbacks dynamically for get-started actions
	const pageDataWithClicks = $derived({
		...pageData,
		coverAlt: pageData.coverAlt || pageData.altName || '',
		actionBtns: pageData.actionBtns.map((btn) => {
			if (btn.btnLink === '/get-started/how-can-we-help' || btn.btnName === 'Compare offers') {
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
			if (btn.btnLink === '/get-started/how-can-we-help' || btn.btnName === 'Compare offers') {
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
			if (rect.top <= 100 && rect.bottom >= 200) {
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

	// send data to parent (if any handler exists)
	const dispatch = createEventDispatcher();
	$effect(() => {
		const text = document.querySelector('.content')?.textContent || '';
		dispatch('textExtracted', text);
		dispatch('pageData', pageData);
	});

	// JSON-LD Structured Data Schema for Breadcrumbs
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
				name: 'Leveraging Property Value',
				item: 'https://www.digitaldsa.com/home-loan/turning-your-home-into-investment'
			}
		]
	};
</script>

<svelte:head>
	{@html `<script type="application/ld+json">${JSON.stringify(breadcrumbSchema)}</script>`}
</svelte:head>

<Seo
	type="WebPage"
	title="Use Your Property’s Value to Get Extra Funds | Top-Up & LAP"
	image={pageData.coverImage}
	description="Unlock funds using your property’s value. Get a Top-Up Loan or Loan Against Property (LAP) for home, business, or personal needs. Apply now!"
	keywords="Top-Up Loan, Loan Against Property (LAP), Home equity loan, Property-based loan, Mortgage top-up, Property financing options, Borrow against property, Home loan top-up eligibility, LAP vs Top-Up Loan, Loan against home equity, Home equity financing, Best loans for property owners, Property-based borrowing, Home equity loan process, How to use home equity for loans"
/>

<section class="content">
	<NewPageLayout pageData={pageDataWithClicks}>
		<!-- desktop view -->
		<div class="hidden lg:block">
			<div>
				<StickyNavbar navList={navListWithClicks} {activeSection} />
			</div>

			<div id="equity" data-section="equity" class="section">
				<div class="border-b border-[var(--form-border)]">
					<ThingsYouShould
						thinkKnow={{
							heading: content.equity.heading,
							subPara: content.equity.subPara,
							paraGraph: content.equity.paraGraph
						}}
						isBorder={content.equity.isBorder}
						disc="list-disc"
					/>
				</div>
			</div>

			<div id="topup" data-section="topup" class="section">
				<AboveTitleWithoutIconCard contents={content.topup.contents} isBorder />
				<AboveTitleWithBlackCard contents={content.topup.calculators} />
			</div>

			<div id="lap" data-section="lap" class="section">
				<AboveTitleWithoutIconCard contents={content.lap.contents} isBorder />
			</div>

			<div id="difference" data-section="difference" class="section">
				<div
					class="border-b border-[var(--form-border)] px-[0.5rem] py-[4rem] lg:px-16 lg:py-0 lg:pt-[4rem] lg:pb-[8rem]"
				>
					<h2 class="typography-h2-md  mb-6 text-[var(--form-text)]">
						{content.difference.heading}
					</h2>
					<div>
						{#each content.difference.firstTableData as tableData}
							<PaymentTable {tableData} />
						{/each}
					</div>
				</div>
			</div>

			<div id="howUseEquity" data-section="howUseEquity" class="section">
				<ThreeColumWithLeftHeading contents={content.howUseEquity} isBorder />
			</div>

			<div id="apply" data-section="apply" class="section">
				<div class="border-b border-[var(--form-border)]">
					<ThingsYouShould
						thinkKnow={{
							heading: content.apply.heading,
							paraGraph: content.apply.paraGraph
						}}
						disc="list-disc"
					/>
				</div>
				<ButtonBanner contents={content.apply.buttonBanner} isBorder />
			</div>
		</div>

		<!-- mobile view -->
		<div class="block lg:hidden">
			{#each content.mobileNavbarTitle as list, index}
				<details
					class="dropdown col-span-3 bg-[var(--landing-bg-card)] {index <
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

					{#if index === 0}
						<div id="equity" class="w-full min-w-0 overflow-hidden">
							<ThingsYouShould
								thinkKnow={{
									heading: content.equity.heading,
									subPara: content.equity.subPara,
									paraGraph: content.equity.paraGraph
								}}
								disc="list-disc"
							/>
						</div>
					{:else if index === 1}
						<div id="topup" class="bg-[var(--landing-bg)] pb-4">
							<AboveTitleWithoutIconCard contents={content.topup.contents} isBorder />
							<AboveTitleWithBlackCard contents={content.topup.calculators} />
						</div>
					{:else if index === 2}
						<div id="lap" class="bg-[var(--landing-bg)] pb-4">
							<AboveTitleWithoutIconCard contents={content.lap.contents} />
						</div>
					{:else if index === 3}
						<div id="difference" class="bg-[var(--landing-bg)] pb-4">
							<div class="w-full px-[0.5rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem]">
								<h2 class="typography-h2 py-5 text-center text-[var(--form-text)] dark:text-white">
									{content.difference.heading}
								</h2>
								<div>
									{#each content.difference.firstTableData as tableData}
										<PaymentTable {tableData} />
									{/each}
								</div>
							</div>
						</div>
					{:else if index === 4}
						<div id="howUseEquity" class="bg-[var(--landing-bg)] pb-4">
							<ThreeColumWithLeftHeading contents={content.howUseEquity} />
						</div>
					{:else if index === 5}
						<div id="apply" class="bg-[var(--landing-bg)] pb-4">
							<div class="border-b border-[var(--form-border)]">
								<ThingsYouShould
									thinkKnow={{
										heading: content.apply.heading,
										paraGraph: content.apply.paraGraph
									}}
									disc="list-disc"
								/>
							</div>
							<ButtonBanner contents={content.apply.buttonBanner} isBorder/>
						</div>
					{/if}
				</details>
			{/each}
		</div>

		<TwoColumnWithImage contents={content.messageUs.contents}>
			<p>{content.messageUs.para}</p>
			<Button
				link={content.messageUs.button.link}
				btnClass={content.messageUs.button.btnClass}
				btnName={content.messageUs.button.btnName}
			/>
		</TwoColumnWithImage>

		{#snippet secondary()}
			<HelpList contents={content.common_components.helpList.contents} isBorder />

			<ThingsYouShould
				thinkKnow={{
					heading: 'Things you should know',
					paraGraph: content.common_components.thinkYouShouldKnow.bullets
				}}
				disc="list-decimal"
				containerClass="lg:px-0"
			/>
		{/snippet}
	</NewPageLayout>
</section>

<style>
	.section {
		scroll-margin-top: 5rem;
	}
</style>
