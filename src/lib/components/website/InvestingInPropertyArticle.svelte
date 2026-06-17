<script lang="ts">
	import NewPageLayout from './NewPageLayout.svelte';
	import TwoColumnWithLeftHeading from './TwoColumnWithLeftHeading.svelte';
	import TwoColumnWithImage from './TwoColumnWithImage.svelte';
	import StickyNavbar from './StickyNavbar.svelte';
	import { onMount } from 'svelte';
	import Button from './Button.svelte';
	import HelpList from './HelpList.svelte';
	import ThingsYouKnow from './ThingsYouKnow.svelte';
	import Seo from './Seo.svelte';
	import { applicationData } from '$lib/stores/stores';
	import content from '$lib/data/website/investingInPropertyArticle.json';
	import { toggleDropdown } from '$lib/utils/toggleDropdown';
	import { ChevronDown } from '$lib/utils/iconRegistry';

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
			if (btn.btnLink === '/get-started/how-can-we-help' || btn.btnName === 'Compare rates') {
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
			if (btn.btnLink === '/get-started/how-can-we-help' || btn.btnName === 'Compare rates') {
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
				name: 'Investing in Property',
				item: 'https://www.digitaldsa.com/home-loan/investing-in-property'
			}
		]
	};
</script>

<svelte:head>
	{@html `<script type="application/ld+json">${JSON.stringify(breadcrumbSchema)}</script>`}
</svelte:head>

<Seo
	type="WebPage"
	title="Smart Property Investment: Make Profitable Real Estate Moves"
	image={pageData.coverImage}
	description="Learn how to invest in real estate wisely! Maximize rental income, choose the right property, and secure high returns with smart strategies."
	keywords="Real estate investment, Property investment tips, Rental income strategies, Residential vs commercial property, Smart real estate decisions, Real estate returns, Best locations for property investment, Under-construction vs ready-to-move, Property loan vs cash purchase, Tax benefits on real estate, Real estate appreciation, Passive income from property, Best cities for real estate investment"
/>

<section class="content">
	<NewPageLayout pageData={pageDataWithClicks}>
		<!-- desktop view -->
		<div class="hidden lg:block">
			<div>
				<StickyNavbar navList={navListWithClicks} {activeSection} />
			</div>

			<div id="goals-types" data-section="goals-types" class="section">
				<TwoColumnWithLeftHeading contents={content.goalsTypes.goal} />
				<TwoColumnWithLeftHeading contents={content.goalsTypes.resVsComm} />
			</div>

			<div id="location-timing" data-section="location-timing" class="section">
				<TwoColumnWithLeftHeading contents={content.locationTiming.location} />
				<TwoColumnWithLeftHeading contents={content.locationTiming.constructionVsReady} />
			</div>

			<div id="financials-tax" data-section="financials-tax" class="section">
				<TwoColumnWithLeftHeading contents={content.financialsTax.loanVsCash} />
				<TwoColumnWithLeftHeading contents={content.financialsTax.rentalYield} />
				<TwoColumnWithLeftHeading contents={content.financialsTax.taxBenefits} />
			</div>

			<div id="scenarios" data-section="scenarios" class="section">
				<TwoColumnWithLeftHeading contents={content.scenarios.cases} />
				<TwoColumnWithLeftHeading contents={content.scenarios.help} />
			</div>
		</div>

		<!-- mobile view -->
		<div class="block lg:hidden">
			{#each content.mobileNavbarTitle as list, index}
				<details
					class="dropdown col-span-3 bg-[var(--landing-bg-card)] text-[var(--form-text)] {index <
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
						<div
							id="goals-types"
							class="bg-[var(--landing-bg)] px-[0.5rem] pb-4 text-[var(--form-text)]"
						>
							<TwoColumnWithLeftHeading contents={content.goalsTypes.goal} />
							<TwoColumnWithLeftHeading contents={content.goalsTypes.resVsComm} />
						</div>
					{:else if index === 1}
						<div
							id="location-timing"
							class="bg-[var(--landing-bg)] px-[0.5rem] pb-4 text-[var(--form-text)]"
						>
							<TwoColumnWithLeftHeading contents={content.locationTiming.location} />
							<TwoColumnWithLeftHeading contents={content.locationTiming.constructionVsReady} />
						</div>
					{:else if index === 2}
						<div
							id="financials-tax"
							class="bg-[var(--landing-bg)] px-[0.5rem] pb-4 text-[var(--form-text)]"
						>
							<TwoColumnWithLeftHeading contents={content.financialsTax.loanVsCash} />
							<TwoColumnWithLeftHeading contents={content.financialsTax.rentalYield} />
							<TwoColumnWithLeftHeading contents={content.financialsTax.taxBenefits} />
						</div>
					{:else if index === 3}
						<div
							id="scenarios"
							class="bg-[var(--landing-bg)] px-[0.5rem] pb-4 text-[var(--form-text)]"
						>
							<TwoColumnWithLeftHeading contents={content.scenarios.cases} />
							<TwoColumnWithLeftHeading contents={content.scenarios.help} />
						</div>
					{/if}
				</details>
			{/each}
		</div>

		<div slot="secondary" class="px-2">
			<HelpList contents={content.common_components.helpList.contents} />

			<ThingsYouKnow contents={{ heading: 'Things you should know' }}>
				<ul class="flex list-decimal flex-col gap-4 px-2 pl-4">
					{#each content.common_components.thinkYouShouldKnow.bullets as bullet}
						<li>{@html bullet}</li>
					{/each}
				</ul>
			</ThingsYouKnow>
		</div>
	</NewPageLayout>
</section>

<style>
	.section {
		scroll-margin-top: 5rem;
	}
</style>
