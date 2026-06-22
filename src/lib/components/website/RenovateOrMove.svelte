<script lang="ts">
	import NewPageLayout from './NewPageLayout.svelte';
	import StickyNavbar from './StickyNavbar.svelte';
	import TwoColumnWithLeftHeading from './TwoColumnWithLeftHeading.svelte';
	import PaymentTable from './PaymentTable.svelte';
	import ButtonBanner from './ButtonBanner.svelte';
	import HelpList from './HelpList.svelte';
	import ThingsYouShould from '$lib/components/website/ThingsYouShould.svelte';
	import TwoColumnWithImage from './TwoColumnWithImage.svelte';
	import Button from './Button.svelte';
	import { onMount } from 'svelte';
	import Seo from './Seo.svelte';
	import content from '$lib/data/website/renovateOrMove.json';
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
				name: 'Renovate or Move Guide',
				item: 'https://www.digitaldsa.com/home-loan/renovate-or-move'
			}
		]
	};

	const faqSchema = {
		'@context': 'https://schema.org',
		'@type': 'FAQPage',
		mainEntity: [
			{
				'@type': 'Question',
				name: 'Is it cheaper to renovate or move?',
				acceptedAnswer: {
					'@type': 'Answer',
					text: 'Renovating is generally more cost-effective (typically ₹5-15 lakh for major work) compared to buying a new home (which involves ₹30 lakh to ₹1 crore+ in transaction costs, stamp duties, and registration).'
				}
			},
			{
				'@type': 'Question',
				name: 'Does home renovation increase property value?',
				acceptedAnswer: {
					'@type': 'Answer',
					text: "Yes, high-quality renovations that improve layout, add modern amenities, or enhance energy efficiency can boost your property's resale value significantly."
				}
			}
		]
	};
</script>

<svelte:head>
	{@html `<script type="application/ld+json">${JSON.stringify(breadcrumbSchema)}</script>`}
	{@html `<script type="application/ld+json">${JSON.stringify(faqSchema)}</script>`}
</svelte:head>

<Seo
	type="WebPage"
	title="Home Renovation vs. Buying New – Find the Best Option"
	image={pageData.coverImage}
	description="Should you renovate or buy a new home? Compare costs, benefits, and long-term value to make the right choice. Get expert advice today!"
	keywords="Home renovation vs buying a new home, Should I renovate or move, Home upgrade options, Cost of home renovation vs buying new, Home renovation benefits, Buying a new home advantages, Home improvement vs moving, Renovate or relocate, Home renovation cost vs moving, Best home loan options for renovation and buying"
/>

<section class="content">
	<NewPageLayout {pageData}>
		<!-- desktop view -->
		<div class="hidden lg:block">
			<StickyNavbar navList={content.navList} {activeSection} />

			<section id="renovation" data-section="renovation" class="section">
				<TwoColumnWithLeftHeading contents={content.renovation.contents} isBorder />
			</section>

			<section id="buying" data-section="buying" class="section">
				<TwoColumnWithLeftHeading contents={content.buying.contents} isBorder />
			</section>

			<section id="comparision" data-section="comparision" class="section">
				<div class="border-b border-[var(--form-border)] px-[0.5rem] px-[1rem] py-12 lg:px-16">
					<h2 class="typography-body-lg mb-2 text-center !font-semibold text-[var(--form-text)]">
						The Ultimate Comparison
					</h2>
					<p class="typography-body-md mb-6 text-center text-[var(--form-text-secondary)]">
						Here’s a detailed comparison of the <span
							class="font-semibold underline decoration-primary underline-offset-4"
							>Home Renovation</span
						>
						and
						<span class="font-semibold underline decoration-primary underline-offset-4"
							>New Home Purchase</span
						> options, including financial, emotional, and practical considerations:
					</p>
					{#each content.comparison.firstTableData as tableData}
						<PaymentTable {tableData} />
					{/each}
				</div>

				<ButtonBanner contents={content.comparison.buttonBanner} isBorder />
			</section>

			<section id="option" data-section="option" class="section">
				<TwoColumnWithLeftHeading contents={content.option.contents1} isBorder />
				<TwoColumnWithLeftHeading contents={content.option.contents2} isBorder/>
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

					{#if index === 0}
						<div
							id="renovation"
							class="bg-[var(--landing-bg)] pb-4 text-[var(--form-text)]"
						>
							<TwoColumnWithLeftHeading contents={content.renovation.contents} />
						</div>
					{:else if index === 1}
						<div
							id="buying"
							class="bg-[var(--landing-bg)] pb-4 text-[var(--form-text)]"
						>
							<TwoColumnWithLeftHeading contents={content.buying.contents} />
						</div>
					{:else if index === 2}
						<div id="comparision" class="pb-4">
							<div class="border-b border-[var(--form-border)] px-[0.5rem] lg:px-16 py-12">
								<h2
									class="typography-body-lg mb-2 text-center !font-semibold text-[var(--form-text)]"
								>
									The Ultimate Comparison
								</h2>
								<p class="typography-body-md mb-6 text-center text-[var(--form-text-secondary)]">
									Here’s a detailed comparison of the <span
										class="font-semibold underline decoration-primary underline-offset-4"
										>Home Renovation</span
									>
									and
									<span class="font-semibold underline decoration-primary underline-offset-4"
										>New Home Purchase</span
									> options, including financial, emotional, and practical considerations:
								</p>
								{#each content.comparison.firstTableData as tableData}
									<PaymentTable {tableData} />
								{/each}
							</div>
							<ButtonBanner contents={content.comparison.buttonBanner} />
						</div>
					{:else if index === 3}
						<div
							id="option"
							class="bg-[var(--landing-bg)] pb-4 text-[var(--form-text)]"
						>
							<TwoColumnWithLeftHeading contents={content.option.contents1} isBorder/>
							<TwoColumnWithLeftHeading contents={content.option.contents2} isBorder/>
						</div>
					{/if}
				</details>
			{/each}
		</div>

		<!-- Dynamic Configured Message Us Section -->
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
