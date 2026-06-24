<script lang="ts">
	import Button from './Button.svelte';
	import ThingsYouShould from '$lib/components/website/ThingsYouShould.svelte';
	import { onMount } from 'svelte';
	import StickyNavbar from './StickyNavbar.svelte';
	import NewPageLayout from './NewPageLayout.svelte';
	import AboveTitleWithTopIconCard from './AboveTitleWithTopIconCard.svelte';
	import PaymentTable from './PaymentTable.svelte';
	import TwoColumnWithLeftHeading from './TwoColumnWithLeftHeading.svelte';
	import ButtonBanner from './ButtonBanner.svelte';
	import ThreeColumWithLeftHeading from './ThreeColumWithLeftHeading.svelte';
	import AboveTitleWithBlackCard from './AboveTitleWithBlackCard.svelte';
	import Seo from './Seo.svelte';
	import TwoColumnWithImage from './TwoColumnWithImage.svelte';
	import HelpList from './HelpList.svelte';
	import content from '$lib/data/website/buyingNextHomeHL.json';
	import { toggleDropdown } from '$lib/utils/toggleDropdown';
	import { ChevronDown } from '$lib/utils/iconRegistry';

	interface ButtonProps {
		btnName: string;
		btnLink: string;
		btnClass?: string;
		btnColor?: string;
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

	// JSON-LD Structured Data Schema for Breadcrumbs and FAQ Rich Snippets
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
				name: 'Next Home Buyer Guide',
				item: 'https://www.digitaldsa.com/home-loan/buying-next-home'
			}
		]
	};

	const faqSchema = {
		'@context': 'https://schema.org',
		'@type': 'FAQPage',
		mainEntity: content.started.contents.cardData
			.filter((c) => c.url !== '')
			.map((c) => ({
				'@type': 'Question',
				name: c.title,
				acceptedAnswer: {
					'@type': 'Answer',
					text: c.para
				}
			}))
	};
</script>

<svelte:head>
	{@html `<script type="application/ld+json">${JSON.stringify(breadcrumbSchema)}</script>`}
	{@html `<script type="application/ld+json">${JSON.stringify(faqSchema)}</script>`}
</svelte:head>

<Seo
	type="WebPage"
	title="Buying Your Next Home: Smart Guide to Upsizing & Investing"
	image={pageData.coverImage}
	description="Find expert tips, tools & financing options for buying your next home. Explore resale vs. direct purchase & maximize your property investment."
	keywords="Buying your next home, Upsizing your home, Home investment guide, Second home financing, Resale vs new home, Home loan options, Property investment tips, Real estate market insights, Home buying process, Best neighborhoods to buy"
/>

<section class="content">
	<NewPageLayout {pageData}>
		<!-- desktop view -->
		<div class="hidden lg:block">
			<StickyNavbar navList={content.navList} {activeSection} />

			<section id="started" data-section="started" class="section">
				<ThreeColumWithLeftHeading contents={content.started.contents} isBorder />
			</section>

			<section id="whybuy" data-section="whybuy" class="section">
				<AboveTitleWithTopIconCard
					listGridAboveLg="2"
					contents={content.whybuy.contents}
					isBorder
				/>
				<AboveTitleWithTopIconCard contents={content.considerations.contents} isBorder />
				<AboveTitleWithTopIconCard contents={content.benefits.contents} isBorder />
				<AboveTitleWithTopIconCard listGridAboveLg="2" contents={content.steps.contents} isBorder />
			</section>

			<section id="whychoose" data-section="whychoose" class="section">
				<div
					class="border-b border-[var(--form-border)] px-[0.5rem] px-[1rem] py-[4rem] lg:px-16 lg:py-0 lg:pt-[4rem] lg:pb-[8rem]"
				>
					<h2 class="typography-h2-md mb-6 !font-semibold text-[var(--form-text)]">
						{content.whychoose.heading}
					</h2>
					<div>
						{#each content.whychoose.tableData as tableData}
							<PaymentTable {tableData} />
						{/each}
					</div>
				</div>

				<TwoColumnWithLeftHeading contents={content.whychoose.makeHomeCount} isBorder />
				<ButtonBanner contents={content.whychoose.buttonBanner} isBorder />
			</section>

			<section id="calculators" data-section="calculators" class="section">
				<AboveTitleWithBlackCard contents={content.calculators.contents} />
			</section>
		</div>

		<!-- mobile view -->
		<div class="block lg:hidden">
			{#each content.mobileNavbarTitle as list, index (list)}
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

					{#if index == 0}
						<div id="started" class="bg-[var(--landing-bg)] pb-4 text-[var(--form-text)]">
							<ThreeColumWithLeftHeading contents={content.started.contents} />
						</div>
					{:else if index == 1}
						<div id="whybuy" class="bg-[var(--landing-bg)] pb-4 text-[var(--form-text)]">
							<AboveTitleWithTopIconCard contents={content.whybuy.contents} isBorder />
							<AboveTitleWithTopIconCard contents={content.considerations.contents} isBorder />
							<AboveTitleWithTopIconCard contents={content.benefits.contents} isBorder />
							<AboveTitleWithTopIconCard contents={content.steps.contents} />
						</div>
					{:else if index == 2}
						<div id="whychoose" class="bg-[var(--landing-bg)] pb-4 text-[var(--form-text)]">
							<div
								class="w-full px-[0.5rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem]"
							>
								<h2 class="typography-h2 py-5 text-center text-[var(--form-text)] dark:text-white">
									{content.whychoose.heading}
								</h2>
								<div>
									{#each content.whychoose.tableData as tableData}
										<PaymentTable {tableData} />
									{/each}
								</div>
							</div>
							<TwoColumnWithLeftHeading contents={content.whychoose.makeHomeCount} isBorder/>
							<ButtonBanner contents={content.whychoose.buttonBanner} />
						</div>
					{:else if index == 3}
						<div id="calculators" class="bg-[var(--landing-bg)] pb-4 text-[var(--form-text)]">
							<AboveTitleWithBlackCard contents={content.calculators.contents} />
						</div>
					{/if}
				</details>
			{/each}
		</div>

		<!-- Configured Message Us Section -->
		<TwoColumnWithImage contents={content.messageUs.contents}>
			<p class="typography-body-md text-[var(--form-text-secondary)]">
				{content.messageUs.para}
			</p>
			<Button
				link={content.messageUs.button.link}
				btnName={content.messageUs.button.btnName}
				btnClass={content.messageUs.button.btnClass}
			/>
		</TwoColumnWithImage>

		{#snippet secondary()}
			<HelpList contents={content.common_components.helpList.contents} isBorder/>
			<ThingsYouShould
				thinkKnow={content.common_components.thinkYouShouldKnow.contents}
				disc={content.common_components.thinkYouShouldKnow.disc}
				containerClass="lg:px-0"
			></ThingsYouShould>
		{/snippet}
	</NewPageLayout>
</section>
