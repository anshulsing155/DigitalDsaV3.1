<script lang="ts">
	import NewPageLayout from '../layout/NewPageLayout.svelte';
	import TwoColumnWithLeftHeading from './TwoColumnWithLeftHeading.svelte';
	import StickyNavbar from '../layout/StickyNavbar.svelte';
	import { onMount } from 'svelte';
	import HelpList from './HelpList.svelte';
	import ThingsYouKnow from './ThingsYouKnow.svelte';
	import Seo from '../layout/Seo.svelte';
	import { applicationData } from '$lib/stores/stores';
	import content from '$lib/data/website/sellingYourPropertyArticle.json';
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
				name: 'Selling Your Property',
				item: 'https://www.digitaldsa.com/home-loan/selling-your-property'
			}
		]
	};
</script>

<svelte:head>
	{@html `<script type="application/ld+json">${JSON.stringify(breadcrumbSchema)}</script>`}
</svelte:head>

<Seo
	type="WebPage"
	title="Selling Your Property: Get the Best Price & Smooth Process"
	image={pageData.coverImage}
	description="Maximize your property's value with expert tips on pricing, marketing, legal work & closing. Sell smart & stress-free with our complete guide!"
	keywords="Selling property guide, How to sell a house fast, Property selling tips, Real estate selling process, House selling checklist, Legal steps to sell property, Property valuation services, Best way to sell a house, Sell property online, Real estate marketing strategies"
/>

<section class="content">
	<NewPageLayout pageData={pageDataWithClicks}>
		<!-- desktop view -->
		<div class="hidden lg:block">
			<div>
				<StickyNavbar navList={navListWithClicks} {activeSection} />
			</div>

			<div id="preparation" data-section="preparation" class="section">
				<TwoColumnWithLeftHeading contents={content.preparation.prep} isBorder/>
			</div>

			<div id="marketing-buyers" data-section="marketing-buyers" class="section">
				<TwoColumnWithLeftHeading contents={content.marketingBuyers.marketing} isBorder/>
				<TwoColumnWithLeftHeading contents={content.marketingBuyers.negotiating} isBorder/>
			</div>

			<div id="legal" data-section="legal" class="section">
				<TwoColumnWithLeftHeading contents={content.legal.docs} isBorder/>
			</div>

			<div id="closing" data-section="closing" class="section">
				<TwoColumnWithLeftHeading contents={content.closing.close} isBorder/>
				<TwoColumnWithLeftHeading contents={content.closing.final} />
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
						class="col-span-3 cursor-pointer list-none px-[1rem] py-[1.5rem] bg-ddsa-gradient-primary text-white"
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
							id="preparation"
							class="bg-[var(--landing-bg)] pb-4 text-[var(--form-text)]"
						>
							<TwoColumnWithLeftHeading contents={content.preparation.prep} />
						</div>
					{:else if index === 1}
						<div
							id="marketing-buyers"
							class="bg-[var(--landing-bg)] pb-4 text-[var(--form-text)]"
						>
							<TwoColumnWithLeftHeading contents={content.marketingBuyers.marketing} isBorder/>
							<TwoColumnWithLeftHeading contents={content.marketingBuyers.negotiating} />
						</div>
					{:else if index === 2}
						<div id="legal" class="bg-[var(--landing-bg)] pb-4 text-[var(--form-text)]">
							<TwoColumnWithLeftHeading contents={content.legal.docs} />
						</div>
					{:else if index === 3}
						<div
							id="closing"
							class="bg-[var(--landing-bg)] pb-4 text-[var(--form-text)]"
						>
							<TwoColumnWithLeftHeading contents={content.closing.close} isBorder/>
							<TwoColumnWithLeftHeading contents={content.closing.final} />
						</div>
					{/if}
				</details>
			{/each}
		</div>

		{#snippet secondary()}
			<HelpList contents={content.common_components.helpList.contents} isBorder/>

			<ThingsYouKnow contents={{ heading: 'Things you should know' }}>
				<ul class="flex list-decimal flex-col gap-4 px-2 pl-4">
					{#each content.common_components.thinkYouShouldKnow.bullets as bullet}
						<li>{@html bullet}</li>
					{/each}
				</ul>
			</ThingsYouKnow>
		{/snippet}
	</NewPageLayout>
</section>

<style>
	.section {
		scroll-margin-top: 5rem;
	}
</style>
