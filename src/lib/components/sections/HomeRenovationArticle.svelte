<script lang="ts">
	import NewPageLayout from '../layout/NewPageLayout.svelte';
	import TwoColumnWithLeftHeading from './TwoColumnWithLeftHeading.svelte';
	import TwoColumnWithImage from './TwoColumnWithImage.svelte';
	import StickyNavbar from '../layout/StickyNavbar.svelte';
	import { onMount } from 'svelte';
	import Button from '../ui/Button.svelte';
	import HelpList from './HelpList.svelte';
	import ThingsYouKnow from './ThingsYouKnow.svelte';
	import Seo from '../layout/Seo.svelte';
	import { applicationData } from '$lib/stores/stores';
	import content from '$lib/data/website/homeRenovationArticle.json';
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
				name: 'Home Renovation Upgrades',
				item: 'https://www.digitaldsa.com/home-loan/home-renovation'
			}
		]
	};
</script>

<svelte:head>
	{@html `<script type="application/ld+json">${JSON.stringify(breadcrumbSchema)}</script>`}
</svelte:head>

<Seo
	type="WebPage"
	title="Smart Home Upgrades That Add Value | Best Renovation Tips"
	image={pageData.coverImage}
	description="Discover smart home upgrades that boost value & comfort. Learn renovation tips & financing options to make the most of your investment!"
	keywords="home renovation, home improvement, increase home value, smart upgrades, home renovation loan, kitchen remodel, bathroom makeover, flooring upgrade, painting tips, structural repairs, smart home automation, energy-efficient upgrades, financing home renovation, top home upgrades, resale value improvements"
/>

<section class="content">
	<NewPageLayout pageData={pageDataWithClicks}>
		<!-- desktop view -->
		<div class="hidden lg:block">
			<div>
				<StickyNavbar navList={navListWithClicks} {activeSection} />
			</div>

			<div id="interior" data-section="interior" class="section">
				<TwoColumnWithLeftHeading contents={content.interior.kitchen} isBorder />
				<TwoColumnWithLeftHeading contents={content.interior.bathroom} isBorder />
				<TwoColumnWithLeftHeading contents={content.interior.flooring} isBorder />
			</div>

			<div id="aesthetics" data-section="aesthetics" class="section">
				<TwoColumnWithLeftHeading contents={content.aesthetics.painting} isBorder />
				<TwoColumnWithLeftHeading contents={content.aesthetics.balcony} isBorder />
			</div>

			<div id="structure" data-section="structure" class="section">
				<TwoColumnWithLeftHeading contents={content.structure.repairs} isBorder />
				<TwoColumnWithLeftHeading contents={content.structure.smartHome} isBorder />
			</div>

			<div id="financing" data-section="financing" class="section">
				<TwoColumnWithLeftHeading contents={content.financing.methods} isBorder />
				<TwoColumnWithLeftHeading contents={content.financing.final}  />
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
						<div id="interior" class="bg-[var(--landing-bg)] pb-4 text-[var(--form-text)]">
							<TwoColumnWithLeftHeading contents={content.interior.kitchen} isBorder />
							<TwoColumnWithLeftHeading contents={content.interior.bathroom} isBorder />
							<TwoColumnWithLeftHeading contents={content.interior.flooring} />
						</div>
					{:else if index === 1}
						<div id="aesthetics" class="bg-[var(--landing-bg)] pb-4 text-[var(--form-text)]">
							<TwoColumnWithLeftHeading contents={content.aesthetics.painting} isBorder />
							<TwoColumnWithLeftHeading contents={content.aesthetics.balcony} />
						</div>
					{:else if index === 2}
						<div id="structure" class="bg-[var(--landing-bg)] pb-4 text-[var(--form-text)]">
							<TwoColumnWithLeftHeading contents={content.structure.repairs} isBorder />
							<TwoColumnWithLeftHeading contents={content.structure.smartHome} />
						</div>
					{:else if index === 3}
						<div id="financing" class="bg-[var(--landing-bg)] pb-4 text-[var(--form-text)]">
							<TwoColumnWithLeftHeading contents={content.financing.methods} isBorder />
							<TwoColumnWithLeftHeading contents={content.financing.final} />
						</div>
					{/if}
				</details>
			{/each}
		</div>

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
