<script lang="ts">
	import NewPageLayout from './NewPageLayout.svelte';
	import TwoColumnWithLeftHeading from './TwoColumnWithLeftHeading.svelte';
	import TwoColumnWithImage from './TwoColumnWithImage.svelte';
	import StickyNavbar from './StickyNavbar.svelte';
	import { onMount } from 'svelte';
	import Button from './Button.svelte';
	import HelpList from './HelpList.svelte';
	import ThingsYouKnow from './ThingsYouKnow.svelte';
	import VerticalBlog from './VerticalBlog.svelte';
	import Seo from './Seo.svelte';
	import { applicationData } from '$lib/stores/stores';
	import content from '$lib/data/website/choosePerfectNeighbourhoodArticle.json';
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
				name: 'Choose Perfect Neighbourhood',
				item: 'https://www.digitaldsa.com/home-loan/choose-perfect-neighbourhood'
			}
		]
	};
</script>

<svelte:head>
	{@html `<script type="application/ld+json">${JSON.stringify(breadcrumbSchema)}</script>`}
</svelte:head>

<Seo
	type="WebPage"
	title="How to Choose the Perfect Neighborhood for Your Dream Home"
	image={pageData.coverImage}
	description="Find the best neighborhood with safety, amenities, and future growth in mind. Discover key factors to make the right choice for your new home."
	keywords="Choosing the right neighborhood, Best neighborhood for home, Safe neighborhoods to live in, Neighborhood amenities checklist, Home buying guide, Future-proof neighborhoods, Best areas to live, Property investment tips, Neighborhood safety tips, Real estate location guide"
/>

<section class="content">
	<NewPageLayout pageData={pageDataWithClicks}>
		<!-- desktop view -->
		<div class="hidden lg:block">
			<div>
				<StickyNavbar navList={navListWithClicks} {activeSection} />
			</div>

			<div id="priorities" data-section="priorities" class="section">
				<TwoColumnWithLeftHeading contents={content.priorities.future} />
				<TwoColumnWithLeftHeading contents={content.priorities.define} />
			</div>

			<div id="testing-growth" data-section="testing-growth" class="section">
				<TwoColumnWithLeftHeading contents={content.testingGrowth.test} />
				<TwoColumnWithLeftHeading contents={content.testingGrowth.growth} />
			</div>

			<div id="budget-emotions" data-section="budget-emotions" class="section">
				<TwoColumnWithLeftHeading contents={content.budgetEmotions.budget} />
				<TwoColumnWithLeftHeading contents={content.budgetEmotions.emotional} />
			</div>

			<div id="decision" data-section="decision" class="section">
				<TwoColumnWithLeftHeading contents={content.decision.leap} />
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

					{#if index === 0}
						<div
							id="priorities"
							class="bg-[var(--landing-bg)] px-[0.5rem] pb-4 text-[var(--form-text)]"
						>
							<TwoColumnWithLeftHeading contents={content.priorities.future} />
							<TwoColumnWithLeftHeading contents={content.priorities.define} />
						</div>
					{:else if index === 1}
						<div
							id="testing-growth"
							class="bg-[var(--landing-bg)] px-[0.5rem] pb-4 text-[var(--form-text)]"
						>
							<TwoColumnWithLeftHeading contents={content.testingGrowth.test} />
							<TwoColumnWithLeftHeading contents={content.testingGrowth.growth} />
						</div>
					{:else if index === 2}
						<div
							id="budget-emotions"
							class="bg-[var(--landing-bg)] px-[0.5rem] pb-4 text-[var(--form-text)]"
						>
							<TwoColumnWithLeftHeading contents={content.budgetEmotions.budget} />
							<TwoColumnWithLeftHeading contents={content.budgetEmotions.emotional} />
						</div>
					{:else if index === 3}
						<div
							id="decision"
							class="bg-[var(--landing-bg)] px-[0.5rem] pb-4 text-[var(--form-text)]"
						>
							<TwoColumnWithLeftHeading contents={content.decision.leap} />
						</div>
					{/if}
				</details>
			{/each}
		</div>

		<!-- Did this resonate with you? section -->
		<div class="px-[0.5rem] py-[4rem] lg:px-[4rem]">
			<h2 class="typography-h3 mb-5 font-semibold">
				{content.verticalBlog.heading}
			</h2>
			<p class="mb-4 font-semibold">{content.verticalBlog.sub}</p>
			<div class="flex flex-col gap-4 md:flex-row">
				<VerticalBlog blogLists={content.verticalBlog.blogLists} />
			</div>
		</div>

		<TwoColumnWithImage contents={content.messageUs.contents}>
			<p>{content.messageUs.para}</p>
			<Button
				link={content.messageUs.button.link}
				btnClass={content.messageUs.button.btnClass}
				btnName={content.messageUs.button.btnName}
			/>
		</TwoColumnWithImage>

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
