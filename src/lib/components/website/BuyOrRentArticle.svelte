<script lang="ts">
	import NewPageLayout from './NewPageLayout.svelte';
	import TwoColumnWithLeftHeading from './TwoColumnWithLeftHeading.svelte';
	import PaymentTable from './PaymentTable.svelte';
	import TwoColumnWithImage from './TwoColumnWithImage.svelte';
	import StickyNavbar from './StickyNavbar.svelte';
	import { onMount } from 'svelte';
	import AboveTitleWithBlackCard from './AboveTitleWithBlackCard.svelte';
	import Button from './Button.svelte';
	import HelpList from './HelpList.svelte';
	import ThingsYouKnow from './ThingsYouKnow.svelte';
	import Seo from './Seo.svelte';
	import { applicationData } from '$lib/stores/stores';
	import content from '$lib/data/website/buyOrRentArticle.json';
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
				name: 'Should You Buy or Rent',
				item: 'https://www.digitaldsa.com/home-loan/buy-or-rent'
			}
		]
	};
</script>

<svelte:head>
	{@html `<script type="application/ld+json">${JSON.stringify(breadcrumbSchema)}</script>`}
</svelte:head>

<Seo
	type="WebPage"
	title="Renting vs Buying: Compare Costs & Decide What’s Best"
	image={pageData.coverImage}
	description="Should you rent or buy? Compare costs, pros & cons, and use our tools to find the best option for you. Get expert guidance today!"
	keywords="Rent vs Buy Calculator, Renting vs Buying Pros and Cons, Should I Buy or Rent a Home?, Homeownership vs Renting, Buying a House vs Renting, Renting vs Buying Cost Comparison, Home Loan Affordability Calculator, Down Payment for Buying a House, Real Estate Investment vs Renting, Mortgage vs Rent Cost Analysis"
/>

<section class="content">
	<NewPageLayout pageData={pageDataWithClicks}>
		<!-- desktop view -->
		<div class="hidden lg:block">
			<div>
				<StickyNavbar navList={navListWithClicks} {activeSection} />
			</div>

			<div id="right" data-section="right" class="section">
				<TwoColumnWithLeftHeading contents={content.right.contents} />
			</div>

			<div id="compare" data-section="compare" class="section">
				<div
					class="w-full border-b border-[var(--form-border)] px-[0.5rem] py-[4rem] lg:px-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem]"
				>
					<div class="">
						<h2 class="typography-h2-md mb-[4rem] grid text-center text-[var(--form-text)]">
							<p>Renting vs Buying</p>
							<span class="underline decoration-primary decoration-4 underline-offset-4"
								>The Breakdown</span
							>
						</h2>
					</div>
					<div class="">
						{#each content.compare.exampleTableData as tableData}
							<PaymentTable {tableData} />
						{/each}
					</div>
					<p class="typography-body-md mt-14 text-center text-[var(--form-text-secondary)]">
						{@html content.compare.funFact}
					</p>
				</div>

				<div class="mt-[4rem]">
					<p class="typography-h2-md mb-[2rem] text-center text-[var(--form-text)]">
						Real-Life Scenarios: What Worked for Others
						<br /><span
							class="typography-body-md mt-14 text-center text-[var(--form-text-secondary)]"
							>Here’s what people like you did and why</span
						>
					</p>
					<TwoColumnWithImage contents={content.compare.buyerStory.contents}>
						<div class="mt-4 text-center">
							<blockquote
								class="typography-body-md relative text-[var(--form-text-secondary)] italic"
							>
								<span class="absolute -top-3 -left-12 font-serif text-4xl">“</span>
								{content.compare.buyerStory.quote}
								<span class="absolute -right-4 -bottom-6 font-serif text-4xl">”</span>
							</blockquote>
						</div>
					</TwoColumnWithImage>

					<TwoColumnWithImage contents={content.compare.renterStory.contents}>
						<div class="mt-4 text-center">
							<blockquote
								class="typography-body-md relative text-[var(--form-text-secondary)] italic"
							>
								<span class="absolute -top-3 -left-8 font-serif text-4xl">“</span>
								{content.compare.renterStory.quote}
								<span class="absolute -right-2 -bottom-6 font-serif text-4xl">”</span>
							</blockquote>
							<p class="mt-10">
								<a
									class="text-[var(--ddsa-info-text)] underline underline-offset-4 hover:no-underline"
									href={content.compare.renterStory.linkUrl}
									>{content.compare.renterStory.linkText}</a
								>
							</p>
						</div>
					</TwoColumnWithImage>
				</div>

				<TwoColumnWithLeftHeading contents={content.compare.costs} />
			</div>

			<div id="prosCons" class="section" data-section="prosCons">
				<TwoColumnWithLeftHeading contents={content.prosCons} />
				<TwoColumnWithLeftHeading contents={content.prosCons.unsure} />
			</div>

			<div id="calculators" data-section="calculators" class="section">
				<AboveTitleWithBlackCard contents={content.tools.contents} />
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
						<div id="right" class="bg-[var(--landing-bg)] px-[0.5rem] pb-4 text-[var(--form-text)]">
							<TwoColumnWithLeftHeading contents={content.right.contents} />
						</div>
					{:else if index === 1}
						<div
							id="compare"
							class="bg-[var(--landing-bg)] px-[0.5rem] pb-4 text-[var(--form-text)]"
						>
							<div
								class="w-full border-b border-[var(--form-border)] px-[0.5rem] py-[4rem] lg:px-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem]"
							>
								<div class="">
									<h2 class="typography-h2-md mb-[4rem] grid text-center text-[var(--form-text)]">
										<p>Renting vs Buying</p>
										<span class="underline decoration-primary decoration-4 underline-offset-4"
											>The Breakdown</span
										>
									</h2>
								</div>
								<div class="">
									{#each content.compare.exampleTableData as tableData}
										<PaymentTable {tableData} />
									{/each}
								</div>
								<p class="typography-body-md mt-14 text-center text-[var(--form-text-secondary)]">
									{@html content.compare.funFact}
								</p>
							</div>

							<div class="mt-[4rem]">
								<p class="typography-h2-md mb-[2rem] text-center text-[var(--form-text)]">
									Real-Life Scenarios: What Worked for Others
									<br /><span
										class="typography-body-md mt-14 text-center text-[var(--form-text-secondary)]"
										>Here’s what people like you did and why</span
									>
								</p>
								<TwoColumnWithImage contents={content.compare.buyerStory.contents}>
									<div class="mt-4 text-center">
										<blockquote class="relative italic">
											{content.compare.buyerStory.quote}
										</blockquote>
									</div>
								</TwoColumnWithImage>

								<TwoColumnWithImage contents={content.compare.renterStory.contents}>
									<div class="mt-4 text-center">
										<blockquote class="relative italic">
											{content.compare.renterStory.quote}
										</blockquote>
										<p class="mt-10">
											<a href={content.compare.renterStory.linkUrl} class="underline underline-offset-4"
												>{content.compare.renterStory.linkText}</a
											>
										</p>
									</div>
								</TwoColumnWithImage>
							</div>

							<TwoColumnWithLeftHeading contents={content.compare.costs} />
						</div>
					{:else if index === 2}
						<div
							id="prosCons"
							class="bg-[var(--landing-bg)] px-[0.5rem] pb-4 text-[var(--form-text)]"
						>
							<TwoColumnWithLeftHeading contents={content.prosCons} />
							<TwoColumnWithLeftHeading contents={content.prosCons.unsure} />
						</div>
					{:else if index === 3}
						<div
							id="calculators"
							class="bg-[var(--landing-bg)] px-[0.5rem] pb-4 text-[var(--form-text)]"
						>
							<AboveTitleWithBlackCard contents={content.tools.contents} />
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
