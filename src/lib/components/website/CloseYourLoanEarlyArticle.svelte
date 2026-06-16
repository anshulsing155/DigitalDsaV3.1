<script lang="ts">
	import NewPageLayout from './NewPageLayout.svelte';
	import TwoColumnWithLeftHeading from './TwoColumnWithLeftHeading.svelte';
	import TwoColumnWithImage from './TwoColumnWithImage.svelte';
	import StickyNavbar from './StickyNavbar.svelte';
	import { onMount } from 'svelte';
	import Button from './Button.svelte';
	import ButtonBanner from './ButtonBanner.svelte';
	import HelpList from './HelpList.svelte';
	import ThingsYouKnow from './ThingsYouKnow.svelte';
	import Seo from './Seo.svelte';
	import { applicationData } from '$lib/stores/stores';
	import content from '$lib/data/website/closeYourLoanEarlyArticle.json';
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
				name: 'Smart Ways to Close Your Loan Early',
				item: 'https://www.digitaldsa.com/home-loan/close-your-loan-early'
			}
		]
	};
</script>

<svelte:head>
	{@html `<script type="application/ld+json">${JSON.stringify(breadcrumbSchema)}</script>`}
</svelte:head>

<Seo
	type="WebPage"
	title="Smart Ways to Close Your Loan Early & Save on Interest"
	image={pageData.coverImage}
	description="Close your loan early & save big on interest! Discover expert tips, tools & strategies to reduce your loan tenure. Start your journey today!"
	keywords="Close Loan Early, Loan Prepayment Tips, Save on Loan Interest, Reduce Loan Tenure, Smart Loan Repayment, Early Loan Closure, Increase EMI for Loan, Loan Part Payment Strategy, Balance Transfer Savings, Financial Freedom from Loans"
/>

<section class="content">
	<NewPageLayout pageData={pageDataWithClicks}>
		<!-- desktop view -->
		<div class="hidden lg:block">
			<div>
				<StickyNavbar navList={navListWithClicks} {activeSection} />
			</div>

			<div id="benefits" data-section="benefits" class="section">
				<div
					class="border-b border-[var(--form-border)] py-[4rem] text-[var(--form-text)] lg:py-0 lg:pt-[4rem] lg:pb-[8rem]"
				>
					<div class="px-[0.5rem] lg:px-[4rem]">
						<h2 class="typography-h2-md mb-[5rem] text-center text-[var(--form-text)]">
							{content.benefits.heading}
						</h2>
						<div class="flex items-center justify-center">
							<div class="flex gap-10">
								{#each content.benefits.cards as card}
									<div
										class="max-w-xs rounded-sm bg-[var(--landing-bg-card)] p-8 text-center shadow-lg"
									>
										<h3 class="typography-body-lg pb-5 !font-semibold text-[var(--form-text)]">
											{card.heading}
										</h3>
										<p class="typography-body-md text-[var(--form-text-secondary)]">
											{card.desc}
										</p>
									</div>
								{/each}
							</div>
						</div>
					</div>
				</div>
			</div>

			<div id="strategies" data-section="strategies" class="section">
				<TwoColumnWithLeftHeading contents={content.strategies.extraPayments} />
				<TwoColumnWithLeftHeading contents={content.strategies.higherEmis} />
				<TwoColumnWithLeftHeading contents={content.strategies.lumpSums} />
			</div>

			<div id="savings-transfer" data-section="savings-transfer" class="section">
				<TwoColumnWithLeftHeading contents={content.savingsTransfer.reduceExpenses} />
				<TwoColumnWithLeftHeading contents={content.savingsTransfer.balanceTransfer} />
				<TwoColumnWithLeftHeading contents={content.savingsTransfer.planStrategically} />
			</div>

			<div id="success-stories" data-section="success-stories" class="section">
				<div class="py-[4rem] text-[var(--form-text)]">
					<p class="typography-h2-md mb-[2rem] text-center text-[var(--form-text)]">
						<span class="underline decoration-primary underline-offset-4"> Inspiration:</span>
						Real Stories of Success
					</p>
					<TwoColumnWithImage contents={content.successStories.neha.contents}>
						<div class="mt-4">
							<p class="typography-body-md relative text-[var(--form-text-secondary)]">
								{content.successStories.neha.para}
							</p>
						</div>
					</TwoColumnWithImage>

					<TwoColumnWithImage contents={content.successStories.sharma.contents}>
						<div class="mt-4">
							<p class="typography-body-md relative text-[var(--form-text-secondary)]">
								{content.successStories.sharma.para}
							</p>
						</div>
					</TwoColumnWithImage>
				</div>
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
							id="benefits"
							class="bg-[var(--landing-bg)] px-[0.5rem] pb-4 text-[var(--form-text)]"
						>
							<div class="py-[2rem]">
								<h2 class="typography-h2-md mb-[5rem] text-center text-[var(--form-text)]">
									{content.benefits.heading}
								</h2>
								<div class="flex items-center justify-center">
									<div class="flex gap-10">
										{#each content.benefits.cards as card}
											<div
												class="max-w-xs rounded-sm bg-[var(--landing-bg-card)] p-8 text-center shadow-lg"
											>
												<h3 class="typography-body-lg pb-5 !font-semibold text-[var(--form-text)]">
													{card.heading}
												</h3>
												<p class="typography-body-md text-[var(--form-text-secondary)]">
													{card.desc}
												</p>
											</div>
										{/each}
									</div>
								</div>
							</div>
						</div>
					{:else if index === 1}
						<div
							id="strategies"
							class="bg-[var(--landing-bg)] px-[0.5rem] pb-4 text-[var(--form-text)]"
						>
							<TwoColumnWithLeftHeading contents={content.strategies.extraPayments} />
							<TwoColumnWithLeftHeading contents={content.strategies.higherEmis} />
							<TwoColumnWithLeftHeading contents={content.strategies.lumpSums} />
						</div>
					{:else if index === 2}
						<div
							id="savings-transfer"
							class="bg-[var(--landing-bg)] px-[0.5rem] pb-4 text-[var(--form-text)]"
						>
							<TwoColumnWithLeftHeading contents={content.savingsTransfer.reduceExpenses} />
							<TwoColumnWithLeftHeading contents={content.savingsTransfer.balanceTransfer} />
							<TwoColumnWithLeftHeading contents={content.savingsTransfer.planStrategically} />
						</div>
					{:else if index === 3}
						<div
							id="success-stories"
							class="bg-[var(--landing-bg)] px-[0.5rem] pb-4 text-[var(--form-text)]"
						>
							<p class="typography-h2-md mb-[2rem] pt-4 text-center text-[var(--form-text)]">
								Real Stories of Success
							</p>
							<TwoColumnWithImage contents={content.successStories.neha.contents}>
								<div class="mt-4">
									<p class="typography-body-md relative text-[var(--form-text-secondary)]">
										{content.successStories.neha.para}
									</p>
								</div>
							</TwoColumnWithImage>
							<TwoColumnWithImage contents={content.successStories.sharma.contents}>
								<div class="mt-4">
									<p class="typography-body-md relative text-[var(--form-text-secondary)]">
										{content.successStories.sharma.para}
									</p>
								</div>
							</TwoColumnWithImage>
						</div>
					{/if}
				</details>
			{/each}
		</div>

		<ButtonBanner contents={content.buttonBanner.contents} />

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
