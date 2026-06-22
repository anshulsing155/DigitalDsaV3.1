<script lang="ts">
	import NewPageLayout from '$lib/components/website/NewPageLayout.svelte';
	import TwoColumnWithLeftHeading from '$lib/components/website/TwoColumnWithLeftHeading.svelte';
	import VerticalBlog from '$lib/components/website/VerticalBlog.svelte';
	import StickyNavbar from '$lib/components/website/StickyNavbar.svelte';
	import { onMount } from 'svelte';
	import TwoColumnWithImage from '$lib/components/website/TwoColumnWithImage.svelte';
	import Button from '$lib/components/website/Button.svelte';
	import HelpList from '$lib/components/website/HelpList.svelte';
	import ThingsYouKnow from '$lib/components/website/ThingsYouKnow.svelte';
	import ThreeColumWithLeftHeading from '$lib/components/website/ThreeColumWithLeftHeading.svelte';
	import Seo from './Seo.svelte';
	import { applicationData } from '$lib/stores/stores';
	import content from '$lib/data/website/understandCostOfBuyingHomeArticle.json';
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
		heading: string;
		para: string;
		actionBtns: ButtonProps[];
	}

	let { pageData = content.pageData }: { pageData?: PageDataProps } = $props();

	// Inject store update callbacks dynamically for get-started actions
	const pageDataWithClicks = $derived({
		...pageData,
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
				name: 'Understanding Home Buying Costs',
				item: 'https://www.digitaldsa.com/home-loan/understand-cost-of-buying-home'
			}
		]
	};
</script>

<svelte:head>
	{@html `<script type="application/ld+json">${JSON.stringify(breadcrumbSchema)}</script>`}
</svelte:head>

<Seo
	type="WebPage"
	title="Understanding Home Buying Costs in India | Digital DSA"
	image={pageData.coverImage}
	description="Discover all home-buying costs in India—taxes, fees, loans & subsidies. Plan better with Digital DSA's expert tools & guidance."
	keywords="Home buying costs in India, First-time homebuyer India, Stamp duty and registration fees, Home loan costs India, Property buying taxes India, Pradhan Mantri Awas Yojana subsidy, Home loan calculators India, Mortgage insurance India, Property valuation cost, Digital DSA home loan assistance"
/>

<section class="content">
	<NewPageLayout pageData={pageDataWithClicks}>
		<!-- desktop view -->
		<div class="hidden lg:block">
			<div>
				<StickyNavbar navList={navListWithClicks} {activeSection} />
			</div>

			<div id="taxes-fees" data-section="taxes-fees" class="section">
				<TwoColumnWithLeftHeading contents={content.taxesFees.contents} isBorder/>
			</div>

			<div id="inspections" data-section="inspections" class="section">
				<TwoColumnWithLeftHeading contents={content.inspections.contents} isBorder/>
			</div>

			<div id="setup-cost" data-section="setup-cost" class="section">
				<TwoColumnWithLeftHeading contents={content.setupCost.insurance} isBorder/>
				<TwoColumnWithLeftHeading contents={content.setupCost.legal} isBorder/>
				<TwoColumnWithLeftHeading contents={content.setupCost.moving} isBorder/>
				<TwoColumnWithLeftHeading contents={content.setupCost.loanCosts} isBorder/>
				<TwoColumnWithLeftHeading contents={content.setupCost.subsidy} isBorder />
			</div>

			<div id="guidance" data-section="guidance" class="section">
				<TwoColumnWithLeftHeading contents={content.guidance.help} isBorder/>
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
							id="taxes-fees"
							class="bg-[var(--landing-bg)] text-[var(--form-text)]"
						>
							<TwoColumnWithLeftHeading contents={content.taxesFees.contents} />
						</div>
					{:else if index === 1}
						<div
							id="inspections"
							class="bg-[var(--landing-bg)] text-[var(--form-text)]"
						>
							<TwoColumnWithLeftHeading contents={content.inspections.contents} />
						</div>
					{:else if index === 2}
						<div
							id="setup-cost"
							class="bg-[var(--landing-bg)] text-[var(--form-text)]"
						>
							<TwoColumnWithLeftHeading contents={content.setupCost.insurance} isBorder/>
							<TwoColumnWithLeftHeading contents={content.setupCost.legal} isBorder/>
							<TwoColumnWithLeftHeading contents={content.setupCost.moving} isBorder/>
							<TwoColumnWithLeftHeading contents={content.setupCost.loanCosts} isBorder/>
							<TwoColumnWithLeftHeading contents={content.setupCost.subsidy} />
						</div>
					{:else if index === 3}
						<div
							id="guidance"
							class="bg-[var(--landing-bg)] text-[var(--form-text)]"
						>
							<TwoColumnWithLeftHeading contents={content.guidance.help} isBorder/>
						</div>
					{/if}
				</details>
			{/each}
		</div>

		<div class="py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-16 border-b border-[var(--form-border)]">
			<h2 class="typography-h2-md mb-8 text-[var(--form-text)]">
				{content.verticalBlog.heading}
			</h2>
			<div class="flex flex-col gap-4 md:flex-row">
				<VerticalBlog blogLists={content.verticalBlog.blogLists} />
			</div>
		</div>

		<ThreeColumWithLeftHeading contents={content.tools} isBorder/>

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
