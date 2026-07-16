<script lang="ts">
	import NewPageLayout from '$lib/components/layout/NewPageLayout.svelte';
	import TwoColumnWithLeftHeading from '$lib/components/sections/TwoColumnWithLeftHeading.svelte';
	import StickyNavbar from '$lib/components/layout/StickyNavbar.svelte';
	import { onMount } from 'svelte';
	import ThreeColumWithLeftHeading from '$lib/components/sections/ThreeColumWithLeftHeading.svelte';
	import TwoColumnWithImage from '$lib/components/sections/TwoColumnWithImage.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import HelpList from '$lib/components/sections/HelpList.svelte';
	import ThingsYouKnow from '$lib/components/sections/ThingsYouKnow.svelte';
	import Seo from '../layout/Seo.svelte';
	import { applicationData } from '$lib/stores/stores';
	import content from '$lib/data/website/conditionalPreApprovalArticle.json';
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
				name: 'Conditional Pre-Approval',
				item: 'https://www.digitaldsa.com/home-loan/conditional-pre-approval'
			}
		]
	};
</script>

<svelte:head>
	{@html `<script type="application/ld+json">${JSON.stringify(breadcrumbSchema)}</script>`}
</svelte:head>

<Seo
	type="WebPage"
	title="Should You Get Home Loan Conditional Pre-Approval?"
	image={pageData.coverImage}
	description="Discover the benefits of home loan conditional pre-approval. Get a clear budget, fast-track approval & secure your dream home with Digital DSA."
	keywords="Home loan pre-approval, Conditional pre-approval, Mortgage pre-approval, Home buying loan approval, Pre-approved home loan, Mortgage approval process, Digital home loan application, Home loan eligibility check, First-time home buyer loan, Get pre-approved for a mortgage, Fast home loan pre-approval, Secure home financing, Mortgage application process, Online home loan approval, Digital DSA home loans"
/>

<section class="content">
	<NewPageLayout pageData={pageDataWithClicks}>
		<!-- desktop view -->
		<div class="hidden lg:block">
			<div>
				<StickyNavbar navList={navListWithClicks} {activeSection} />
			</div>

			<div id="intro" data-section="intro" class="section">
				<TwoColumnWithLeftHeading contents={content.intro} isBorder />
			</div>

			<div id="advantages" data-section="advantages" class="section">
				<TwoColumnWithLeftHeading contents={content.advantages.contents} isBorder />
			</div>

			<div id="preparation" data-section="preparation" class="section">
				<TwoColumnWithLeftHeading contents={content.preparation.assess} isBorder />
				<TwoColumnWithLeftHeading contents={content.preparation.apply} isBorder />
				<TwoColumnWithLeftHeading contents={content.preparation.after} isBorder />
			</div>

			<div id="guidance" data-section="guidance" class="section">
				<TwoColumnWithLeftHeading contents={content.guidance.whyChoose} isBorder />
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
						<div id="advantages" class="bg-[var(--landing-bg)] text-[var(--form-text)]">
							<TwoColumnWithLeftHeading contents={content.advantages.contents} />
						</div>
					{:else if index === 2}
						<div id="preparation" class="bg-[var(--landing-bg)] text-[var(--form-text)]">
							<TwoColumnWithLeftHeading contents={content.preparation.assess} isBorder />
							<TwoColumnWithLeftHeading contents={content.preparation.apply} isBorder />
							<TwoColumnWithLeftHeading contents={content.preparation.after} />
						</div>
					{:else if index === 3}
						<div id="guidance" class="bg-[var(--landing-bg)] text-[var(--form-text)]">
							<TwoColumnWithLeftHeading contents={content.guidance.whyChoose} isBorder />
						</div>
					{/if}
				</details>
			{/each}
		</div>

		<div data-section="calculators" id="calculators">
			<ThreeColumWithLeftHeading contents={content.tools} isBorder />
		</div>

		<TwoColumnWithImage contents={content.messageUs.contents}>
			<p>{content.messageUs.para}</p>
			<Button
				link={content.messageUs.button.link}
				btnName={content.messageUs.button.btnName}
				btnClass={content.messageUs.button.btnClass}
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
