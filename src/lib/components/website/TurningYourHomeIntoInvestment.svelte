<script lang="ts">
	import NewPageLayout from './NewPageLayout.svelte';
	import StickyNavbar from './StickyNavbar.svelte';
	import AboveTitleWithoutIconCard from './AboveTitleWithoutIconCard.svelte';
	import AboveTitleWithBlackCard from './AboveTitleWithBlackCard.svelte';
	import ThreeColumWithLeftHeading from './ThreeColumWithLeftHeading.svelte';
	import Button from './Button.svelte';
	import HelpList from './HelpList.svelte';
	import ThingsYouShould from './ThingsYouShould.svelte';
	import PaymentTable from './PaymentTable.svelte';
	import ButtonBanner from './ButtonBanner.svelte';
	import TwoColumnWithImage from './TwoColumnWithImage.svelte';
	import Seo from './Seo.svelte';
	import { onMount, createEventDispatcher } from 'svelte';
	import { applicationData } from '$lib/stores/stores';
	import content from '$lib/data/website/turningYourHomeIntoInvestment.json';

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

	let {
		pageData = content.pageData
	}: { pageData?: PageDataProps } = $props();

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

	const toggleDropdown = (event: Event, index: number) => {
		event.preventDefault();
		const summaryElement = event.currentTarget as HTMLElement;
		const icon = summaryElement.querySelector('.faq-icon');
		const detailsElement = summaryElement.parentElement as HTMLDetailsElement;

		// Close all dropdowns except the clicked one
		document.querySelectorAll('.dropdown').forEach((otherDetails, idx) => {
			const otherIcon = otherDetails.querySelector('.faq-icon');

			if (idx !== index) {
				otherDetails.removeAttribute('open');
				if (otherIcon) {
					otherIcon.classList.remove('fa-angle-up');
					otherIcon.classList.add('fa-angle-down');
				}
			}
		});

		// Toggle current dropdown open/close state
		const isOpen = detailsElement.hasAttribute('open');
		if (isOpen) {
			detailsElement.removeAttribute('open');
			if (icon) {
				icon.classList.remove('fa-angle-up');
				icon.classList.add('fa-angle-down');
			}
		} else {
			detailsElement.setAttribute('open', 'true');
			if (icon) {
				icon.classList.remove('fa-angle-down');
				icon.classList.add('fa-angle-up');
			}
		}
		setTimeout(() => {
			if (detailsElement) {
				detailsElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
			}
		}, 100);
	};

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
		'itemListElement': [
			{
				'@type': 'ListItem',
				'position': 1,
				'name': 'Home',
				'item': 'https://www.digitaldsa.com'
			},
			{
				'@type': 'ListItem',
				'position': 2,
				'name': 'Home Loan',
				'item': 'https://www.digitaldsa.com/home-loan'
			},
			{
				'@type': 'ListItem',
				'position': 3,
				'name': 'Leveraging Property Value',
				'item': 'https://www.digitaldsa.com/home-loan/turning-your-home-into-investment'
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
				<div class="lg:px-[4rem] border-b border-[var(--form-border)]">
					<ThingsYouShould
						thinkKnow={{
							heading: content.equity.heading,
							subPara: content.equity.subPara,
							paraGraph: content.equity.paraGraph
						}}
						disc="list-disc"
					/>
				</div>
			</div>

			<div id="topup" data-section="topup" class="section">
				<AboveTitleWithoutIconCard contents={content.topup.contents} />
				<AboveTitleWithBlackCard contents={content.topup.calculators} />
			</div>

			<div id="lap" data-section="lap" class="section">
				<AboveTitleWithoutIconCard contents={content.lap.contents} />
			</div>

			<div id="difference" data-section="difference" class="section">
				<div class="py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-[var(--form-border)] ">
					<h2 class="typography-h2 text-text-main text-center py-5 dark:text-white">
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
				<ThreeColumWithLeftHeading contents={content.howUseEquity} />
			</div>

			<div id="apply" data-section="apply" class="section">
				<div class="lg:px-[4rem]">
					<div class="border-b border-[var(--form-border)]">
						<ThingsYouShould
							thinkKnow={{
								heading: content.apply.heading,
								paraGraph: content.apply.paraGraph
							}}
							disc="list-disc"
						/>
					</div>
					<ButtonBanner contents={content.apply.buttonBanner} />
				</div>
			</div>
		</div>

		<!-- mobile view -->
		<div class="block lg:hidden">
			{#each content.mobileNavbarTitle as list, index}
				<details
					class="dropdown col-span-3 bg-[var(--landing-bg-card)]  {index <
					content.mobileNavbarTitle.length - 1
						? 'border-b border-[var(--form-border)]'
						: ''}"
				>
					<summary
						class="col-span-3 list-none cursor-pointer px-[1rem] py-[1.5rem]"
						onclick={(e) => toggleDropdown(e, index)}
					>
						<div class="mx-auto flex w-full items-center justify-between gap-4">
							<h2 class=" typography-label">{list}</h2>
							<div class="icon-container justify-self-end typography-h3">
								<span
									><i
										class="fa-solid fa-angle-down faq-icon text-black transition-transform duration-300 dark:text-white"
									></i></span
								>
							</div>
						</div>
					</summary>

					{#if index === 0}
						<div id="equity" class="bg-[var(--landing-bg)] px-[0.5rem] pb-4">
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
						<div id="topup" class="bg-[var(--landing-bg)] px-[0.5rem] pb-4 ">
							<AboveTitleWithoutIconCard contents={content.topup.contents} />
							<AboveTitleWithBlackCard contents={content.topup.calculators} />
						</div>
					{:else if index === 2}
						<div id="lap" class="bg-[var(--landing-bg)] px-[0.5rem] pb-4 ">
							<AboveTitleWithoutIconCard contents={content.lap.contents} />
						</div>
					{:else if index === 3}
						<div id="difference" class="bg-[var(--landing-bg)] px-[0.5rem] pb-4 ">
							<div class="py-[2rem] px-[0.5rem] w-full ">
								<h2 class="typography-h2 text-text-main text-center py-5 dark:text-white">
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
						<div id="howUseEquity" class="bg-[var(--landing-bg)] px-[0.5rem] pb-4 ">
							<ThreeColumWithLeftHeading contents={content.howUseEquity} />
						</div>
					{:else if index === 5}
						<div id="apply" class="bg-[var(--landing-bg)] px-[0.5rem] pb-4 ">
							<ThingsYouShould
								thinkKnow={{
									heading: content.apply.heading,
									paraGraph: content.apply.paraGraph
								}}
								disc="list-disc"
							/>
							<ButtonBanner contents={content.apply.buttonBanner} />
						</div>
					{/if}
				</details>
			{/each}
		</div>

		<TwoColumnWithImage contents={content.messageUs.contents}>
			<p>{content.messageUs.para}</p>
			<Button
				link={content.messageUs.button.link}
				btnBorder={content.messageUs.button.btnBorder}
				btnName={content.messageUs.button.btnName}
			/>
		</TwoColumnWithImage>

		<div slot="secondary" class="px-2">
			<HelpList contents={content.common_components.helpList.contents} />

			<ThingsYouShould
				thinkKnow={{
					heading: 'Things you should know',
					paraGraph: content.common_components.thinkYouShouldKnow.bullets
				}}
				disc="list-decimal"
			/>
		</div>
	</NewPageLayout>
</section>

<style>
	.section {
		scroll-margin-top: 5rem;
	}
</style>
