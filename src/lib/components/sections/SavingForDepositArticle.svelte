<script lang="ts">
	import NewPageLayout from '$lib/components/layout/NewPageLayout.svelte';
	import TwoColumnWithLeftHeading from '$lib/components/sections/TwoColumnWithLeftHeading.svelte';
	import VerticalBlog from './VerticalBlog.svelte';
	import HelpList from './HelpList.svelte';
	import ThingsYouKnow from './ThingsYouKnow.svelte';
	import TwoColumnWithImage from './TwoColumnWithImage.svelte';
	import Button from '../ui/Button.svelte';
	import StickyNavbar from '../layout/StickyNavbar.svelte';
	import { onMount } from 'svelte';
	import ThreeColumWithLeftHeading from './ThreeColumWithLeftHeading.svelte';
	import Seo from '../Seo.svelte';
	import { applicationData } from '$lib/stores/stores';
	import content from '$lib/data/website/savingForDepositArticle.json';
	import { ChevronDown } from '$lib/utils/iconRegistry';
	import { toggleDropdown } from '$lib/utils/toggleDropdown';
	import SectionIntro from '$lib/components/sections/SectionIntro.svelte';

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
				name: 'Saving for a Down Payment',
				item: 'https://www.digitaldsa.com/home-loan/saving-for-deposit'
			}
		]
	};
</script>

<svelte:head>
	{@html `<script type="application/ld+json">${JSON.stringify(breadcrumbSchema)}</script>`}
</svelte:head>

<Seo
	type="WebPage"
	title="Smart Ways to Save for a Down Payment | Digital DSA Guide"
	image={pageData.coverImage}
	description="Learn smart strategies to save for a down payment, reduce debt & secure a home loan. Get expert guidance & tools at Digital DSA."
	keywords="Save for a down payment, Home loan savings tips, First-time home buyer savings, Down payment assistance, Smart budgeting for a home, Home buying financial planning, Reduce debt for home loan, Best ways to save for a house, Mortgage down payment tips, Digital DSA home loan guide"
/>

<section class="content">
	<NewPageLayout pageData={pageDataWithClicks}>
		<!-- desktop view -->
		<div class="hidden lg:block">
			<div class="sticky-section">
				<StickyNavbar navList={navListWithClicks} {activeSection} />
			</div>

			<div id="intro" data-section="intro" class="section-1">
				<TwoColumnWithLeftHeading contents={content.intro} isBorder />
			</div>

			<div id="understand-spending" data-section="understand-spending" class="section">
				<TwoColumnWithLeftHeading contents={content.understandSpending.habits} isBorder/>
				<TwoColumnWithLeftHeading contents={content.understandSpending.budget} isBorder/>
				<TwoColumnWithLeftHeading contents={content.understandSpending.debts} isBorder/>
			</div>

			<div id="start-saving" data-section="start-saving" class="section">
				<TwoColumnWithLeftHeading contents={content.startSaving.strategic} isBorder/>
				<TwoColumnWithLeftHeading contents={content.startSaving.assistance} isBorder/>
				<TwoColumnWithLeftHeading contents={content.startSaving.education} isBorder/>
			</div>

			<div id="guidance" data-section="guidance" class="section">
				<TwoColumnWithLeftHeading contents={content.guidance.advisors} isBorder/>
				<TwoColumnWithLeftHeading contents={content.guidance.steps} isBorder/>
				<SectionIntro
					heading={content.guidance.finalThoughts.heading}
					para={content.guidance.finalThoughts.para}
					isBorder={true}
				/>
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
						<div id="intro" class="bg-[var(--landing-bg)] text-[var(--form-text)]">
							<TwoColumnWithLeftHeading contents={content.intro} />
						</div>
					{:else if index === 1}
						<div
							id="understand-spending"
							class="bg-[var(--landing-bg)] text-[var(--form-text)]"
						>
							<TwoColumnWithLeftHeading contents={content.understandSpending.habits} isBorder/>
							<TwoColumnWithLeftHeading contents={content.understandSpending.budget} isBorder/>
							<TwoColumnWithLeftHeading contents={content.understandSpending.debts} />
						</div>
					{:else if index === 2}
						<div
							id="start-saving"
							class="bg-[var(--landing-bg)] text-[var(--form-text)]"
						>
							<TwoColumnWithLeftHeading contents={content.startSaving.strategic} isBorder/>
							<TwoColumnWithLeftHeading contents={content.startSaving.assistance} isBorder/>
							<TwoColumnWithLeftHeading contents={content.startSaving.education} />
						</div>
					{:else if index === 3}
						<div
							id="guidance"
							class="bg-[var(--landing-bg)] text-[var(--form-text)]"
						>
							<TwoColumnWithLeftHeading contents={content.guidance.advisors} isBorder/>
							<TwoColumnWithLeftHeading contents={content.guidance.steps} isBorder/>
							<SectionIntro
								heading={content.guidance.finalThoughts.heading}
								para={content.guidance.finalThoughts.para}
								isBorder={true}
							/>
						</div>
					{/if}
				</details>
			{/each}
		</div>

		<!-- blog/related resources section -->
		<div class="px-[0.5rem] py-[4rem] lg:px-[4rem] border-b border-[var(--form-border)]">
			<h2 class="typography-h2-md mb-8 text-[var(--form-text)]">
				{content.verticalBlog.heading}
			</h2>
			<div class="flex flex-col gap-4 md:flex-row">
				<VerticalBlog blogLists={content.verticalBlog.blogLists} />
			</div>
		</div>

		<ThreeColumWithLeftHeading contents={content.tools} isBorder />

		<TwoColumnWithImage contents={content.messageUs.contents}>
			<p>{content.messageUs.para}</p>
			<Button
				link={content.messageUs.button.link}
				btnName={content.messageUs.button.btnName}
				btnClass={content.messageUs.button.btnClass}
			/>
		</TwoColumnWithImage>

		{#snippet secondary()}
			<HelpList contents={content.common_components.helpList} isBorder />

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
