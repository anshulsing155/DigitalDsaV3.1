<script lang="ts">
	import NewPageLayout from './NewPageLayout.svelte';
	import StickyNavbar from './StickyNavbar.svelte';
	import AboveTitleWithoutIconCard from './AboveTitleWithoutIconCard.svelte';
	import AboveTitleWithLeftIconCard from './AboveTitleWithLeftIconCard.svelte';
	import AboveTitleWithBlackCard from './AboveTitleWithBlackCard.svelte';
	import AboveTitleWithTopIconCard from './AboveTitleWithTopIconCard.svelte';
	import ButtonBanner from './ButtonBanner.svelte';
	import TwoColumnWithImage from './TwoColumnWithImage.svelte';
	import Button from './Button.svelte';
	import HelpList from './HelpList.svelte';
	import ThingsYouShould from './ThingsYouShould.svelte';
	import Seo from './Seo.svelte';
	import { onMount } from 'svelte';
	import { applicationData } from '$lib/stores/stores';
	import content from '$lib/data/website/homeLoanToolsandCalculator.json';

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
			if (btn.btnLink === '/get-started/how-can-we-help' || btn.btnName === 'Compare loan offers') {
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
			if (btn.btnLink === '/get-started/how-can-we-help' || btn.btnName === 'Compare loan offers') {
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
				'name': 'Home Loan Tools & Calculators',
				'item': 'https://www.digitaldsa.com/home-loan/home-loan-tools-calculator'
			}
		]
	};
</script>

<svelte:head>
	{@html `<script type="application/ld+json">${JSON.stringify(breadcrumbSchema)}</script>`}
</svelte:head>

<Seo
	type="WebPage"
	title="Home Loan Calculators & Tools – Plan, Borrow & Save"
	image={pageData.coverImage}
	description="Use our home loan calculators to estimate EMIs, eligibility, and savings. Plan smart with flexible EMIs, balance transfer, and repayment tools."
	keywords="home loan calculator, home loan eligibility, EMI calculator, home loan repayment, stamp duty calculator, balance transfer, mortgage tools, home buying, loan planner, part-payment planner, refinance calculator, property investment, loan savings, interest rates, mortgage support, financial planning."
/>

<section class="content">
	<NewPageLayout pageData={pageDataWithClicks}>
		<!-- desktop view -->
		<div class="hidden lg:block">
			<div>
				<StickyNavbar navList={navListWithClicks} {activeSection} />
			</div>

			<div id="Calculators" data-section="Calculators" class="section">
				<AboveTitleWithoutIconCard contents={content.calculators.contents} />
			</div>

			<div id="Tools" data-section="Tools" class="section">
				<AboveTitleWithBlackCard contents={content.tools.moneyMap} />
				<AboveTitleWithoutIconCard contents={content.tools.planners} />
				<AboveTitleWithLeftIconCard contents={content.tools.journey} />
			</div>

			<div id="guides" data-section="guides" class="section">
				<ButtonBanner contents={content.guides.buttonBanner} />
				<AboveTitleWithTopIconCard contents={content.guides.topIconCards} />
			</div>
		</div>

		<!-- mobile view -->
		<div class="block lg:hidden">
			{#each content.mobileNavbarTitle as list, index}
				<details
					class="dropdown col-span-3 bg-[var(--landing-bg-card)] text-black dark:text-white {index <
					content.mobileNavbarTitle.length - 1
						? 'border-b border-[var(--form-border)]'
						: ''}"
				>
					<summary
						class="col-span-3 list-none cursor-pointer px-[1rem] py-[1.5rem]"
						onclick={(e) => toggleDropdown(e, index)}
					>
						<div class="mx-auto flex w-full items-center justify-between gap-4">
							<h2 class="text-black dark:text-white typography-label">{list}</h2>
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
						<div id="Calculators" class="bg-[var(--landing-bg)] px-[0.5rem] pb-4 text-black dark:text-white">
							<AboveTitleWithoutIconCard contents={content.calculators.contents} />
						</div>
					{:else if index === 1}
						<div id="Tools" class="bg-[var(--landing-bg)] px-[0.5rem] pb-4 text-black dark:text-white">
							<AboveTitleWithBlackCard contents={content.tools.moneyMap} />
							<AboveTitleWithoutIconCard contents={content.tools.planners} />
							<AboveTitleWithLeftIconCard contents={content.tools.journey} />
						</div>
					{:else if index === 2}
						<div id="guides" class="bg-[var(--landing-bg)] px-[0.5rem] pb-4 text-black dark:text-white">
							<ButtonBanner contents={content.guides.buttonBanner} />
							<AboveTitleWithTopIconCard contents={content.guides.topIconCards} />
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
