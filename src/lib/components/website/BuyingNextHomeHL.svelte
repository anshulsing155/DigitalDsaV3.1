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

	let {
		pageData = content.pageData
	}: { pageData?: PageDataProps } = $props();

	const toggleDropdown = (event: Event, index: number) => {
		event.preventDefault();
		const summaryElement = event.currentTarget as HTMLElement;
		const icon = summaryElement.querySelector('.faq-icon');
		const detailsElement = summaryElement.parentElement as HTMLDetailsElement;

		// Close all dropdowns except the clicked one
		document.querySelectorAll('.dropdown').forEach((otherDetails, idx) => {
			const otherIcon = otherDetails.querySelector('.faq-icon');

			if (idx !== index) {
				otherDetails.removeAttribute('open');
				if (otherIcon) {
					otherIcon.classList.remove('fa-angle-up');
					otherIcon.classList.add('fa-angle-down');
				}
			}
		});

		// Toggle current dropdown open/close state
		const isOpen = detailsElement.hasAttribute('open');
		if (isOpen) {
			detailsElement.removeAttribute('open');
			if (icon) {
				icon.classList.remove('fa-angle-up');
				icon.classList.add('fa-angle-down');
			}
		} else {
			detailsElement.setAttribute('open', 'true');
			if (icon) {
				icon.classList.remove('fa-angle-down');
				icon.classList.add('fa-angle-up');
			}
		}
		setTimeout(() => {
			if (detailsElement) {
				detailsElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
			}
		}, 100);
	};

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
		"@context": "https://schema.org",
		"@type": "BreadcrumbList",
		"itemListElement": [
			{
				"@type": "ListItem",
				"position": 1,
				"name": "Home",
				"item": "https://www.digitaldsa.com"
			},
			{
				"@type": "ListItem",
				"position": 2,
				"name": "Home Loan",
				"item": "https://www.digitaldsa.com/home-loan"
			},
			{
				"@type": "ListItem",
				"position": 3,
				"name": "Next Home Buyer Guide",
				"item": "https://www.digitaldsa.com/home-loan/buying-next-home"
			}
		]
	};

	const faqSchema = {
		"@context": "https://schema.org",
		"@type": "FAQPage",
		"mainEntity": content.started.contents.cardData
			.filter(c => c.url !== '')
			.map(c => ({
				"@type": "Question",
				"name": c.title,
				"acceptedAnswer": {
					"@type": "Answer",
					"text": c.para
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
				<ThreeColumWithLeftHeading contents={content.started.contents} />
			</section>

			<section id="whybuy" data-section="whybuy" class="section">
				<AboveTitleWithTopIconCard
					listGridAboveLg="2"
					contents={content.whybuy.contents}
				/>
				<AboveTitleWithTopIconCard contents={content.considerations.contents} />
				<div class="border-b border-borderColor">
					<AboveTitleWithTopIconCard contents={content.benefits.contents} />
				</div>
				<AboveTitleWithTopIconCard
					listGridAboveLg="2"
					contents={content.steps.contents}
				/>
			</section>

			<section id="whychoose" data-section="whychoose" class="section">
				<div class="py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-borderColor">
					<h2 class="grid mb-[4rem] typography-h3 font-semibold md:typography-h2-md text-center">
						{content.whychoose.heading}
					</h2>
					<div>
						{#each content.whychoose.tableData as tableData}
							<PaymentTable {tableData} />
						{/each}
					</div>
				</div>

				<TwoColumnWithLeftHeading contents={content.whychoose.makeHomeCount} />
				<ButtonBanner contents={content.whychoose.buttonBanner} />
			</section>

			<section id="calculators" data-section="calculators" class="section">
				<AboveTitleWithBlackCard contents={content.calculators.contents} />
			</section>
		</div>

		<!-- mobile view -->
		<div class="block lg:hidden">
			{#each content.mobileNavbarTitle as list, index (list)}
				<details
					class="dropdown col-span-3 bg-[var(--landing-bg-card)] text-black dark:text-white {index < content.mobileNavbarTitle.length - 1 ? 'border-b border-[var(--form-border)]' : ''}"
				>
					<summary
						class="col-span-3 list-none cursor-pointer px-[1rem] py-[1.5rem]"
						onclick={(e) => toggleDropdown(e, index)}
					>
						<div class="typography-label mx-auto flex w-full items-center justify-between gap-4">
							<h2 class="text-black dark:text-white">{list}</h2>
							<div class="icon-container justify-self-end typography-h3">
								<span><i class="fa-solid fa-angle-down faq-icon text-black dark:text-white transition-transform duration-300"></i></span>
							</div>
						</div>
					</summary>

					{#if index == 0}
						<div id="started" class="bg-[var(--landing-bg)] text-black dark:text-white px-[0.5rem] pb-4">
							<ThreeColumWithLeftHeading contents={content.started.contents} />
						</div>
					{:else if index == 1}
						<div id="whybuy" class="bg-[var(--landing-bg)] text-black dark:text-white px-[0.5rem] pb-4">
							<AboveTitleWithTopIconCard contents={content.whybuy.contents} />
							<AboveTitleWithTopIconCard contents={content.considerations.contents} />
							<div class="border-b border-borderColor">
								<AboveTitleWithTopIconCard contents={content.benefits.contents} />
							</div>
							<AboveTitleWithTopIconCard contents={content.steps.contents} />
						</div>
					{:else if index == 2}
						<div id="whychoose" class="bg-[var(--landing-bg)] text-black dark:text-white px-[0.5rem] pb-4">
							<div class="py-[4rem] w-full border-b border-borderColor overflow-x-auto">
								<h2 class="grid mb-[4rem] typography-h3 font-semibold text-center">
									{content.whychoose.heading}
								</h2>
								<div>
									{#each content.whychoose.tableData as tableData}
										<PaymentTable {tableData} />
									{/each}
								</div>
							</div>
							<TwoColumnWithLeftHeading contents={content.whychoose.makeHomeCount} />
							<ButtonBanner contents={content.whychoose.buttonBanner} />
						</div>
					{:else if index == 3}
						<div id="calculators" class="bg-[var(--landing-bg)] text-black dark:text-white px-[0.5rem] pb-4">
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

		<div slot="secondary">
			<HelpList contents={content.common_components.helpList.contents} />
			<ThingsYouShould
				thinkKnow={content.common_components.thinkYouShouldKnow.contents}
				disc={content.common_components.thinkYouShouldKnow.disc}
			></ThingsYouShould>
		</div>
	</NewPageLayout>
</section>
