<script lang="ts">
	import Button from './Button.svelte';
	import ThingsYouShould from '$lib/components/website/ThingsYouShould.svelte';
	import { onMount } from 'svelte';
	import StickyNavbar from './StickyNavbar.svelte';
	import NewPageLayout from './NewPageLayout.svelte';
	import ThreeColumWithLeftHeading from './ThreeColumWithLeftHeading.svelte';
	import AboveTitleWithLeftIconCard from './AboveTitleWithLeftIconCard.svelte';
	import TwoColumnWithImage from './TwoColumnWithImage.svelte';
	import ButtonBanner from './ButtonBanner.svelte';
	import HelpList from './HelpList.svelte';
	import AboveTitleWithBlackCard from './AboveTitleWithBlackCard.svelte';
	import Seo from './Seo.svelte';
	import content from '$lib/data/website/buyingFirstHomeHL.json';
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
		sourceName?: string;
		originalSource?: string;
		heading: string;
		para: string;
		actionBtns: ButtonProps[];
	}

	let {
		pageData = {
			coverImage: '/images/first-home-buyer.jpg',
			coverAlt:
				'photo of a happy indian couple who has bought their first home and took home loan through DigitalDSA.com',
			sourceName: 'Freepik',
			originalSource:
				'https://www.freepik.com/free-photo/people-recording-their-house-tour_129835217.htm',
			heading: 'First Home Buyers : <br> A DSA Guide to Helping Customers Buy Their First Home',
			para: 'Buying a first home can feel overwhelming for borrowers. From saving for a down payment to understanding eligibility and comparing lenders, customers need guidance at every stage. As a DSA, helping first-time buyers navigate the process creates trust, improves conversions, and increases successful loan disbursements.',
			actionBtns: [
				{
					btnName: 'Book appointment',
					btnLink: '/appointment',
					btnClass: 'btn-secondary'
				},
				{
					btnName: 'Compare rates',
					btnLink: '/get-started/how-can-we-help',
					btnClass: 'btn-primary text-black',
					animation: true
				}
			]
		}
	}: { pageData?: PageDataProps } = $props();

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
				name: 'First Home Buyer Guide',
				item: 'https://www.digitaldsa.com/home-loan/buying-first-home'
			}
		]
	};

	const faqSchema = {
		'@context': 'https://schema.org',
		'@type': 'FAQPage',
		mainEntity: content.ready.contents.cardData
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
	title="First Home Buyer Guide | Steps, Costs & Loan Options"
	image={pageData.coverImage}
	description="Get step-by-step guidance on buying your first home. Learn about deposits, costs & loans. Use tools & calculators to plan your purchase."
	keywords="First home buyer guide, Buying your first home, Home loan process, Home buying costs, Home loan calculator, Mortgage pre-approval, Home loan offers, Saving for a deposit, Stamp duty calculator, Borrowing power calculator"
/>

<section class="content">
	<NewPageLayout {pageData}>
		<!-- for desktop -->
		<div class="hidden lg:block">
			<StickyNavbar navList={content.navList} {activeSection} />

			<section id="ready" data-section="ready" class="section">
				<ThreeColumWithLeftHeading contents={content.ready.contents} />
			</section>

			<section id="start" data-section="start" class="section">
				<AboveTitleWithLeftIconCard contents={content.start.contents} />
			</section>

			<section id="next" data-section="next" class="section">
				<ThreeColumWithLeftHeading contents={content.next.contents} />
				<ButtonBanner contents={content.next.buttonBanner} />
			</section>

			<section id="calculators" data-section="calculators" class="section">
				<AboveTitleWithBlackCard contents={content.calculators.contents} />
			</section>
		</div>

		<!-- for mobile -->
		<div class="block lg:hidden">
			{#each content.mobileNavbarTitle as list, index (list)}
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

					{#if index == 0}
						<div id="ready" class="bg-[var(--landing-bg)] px-[0.5rem] pb-4 text-[var(--form-text)]">
							<ThreeColumWithLeftHeading contents={content.ready.contents} />
						</div>
					{:else if index == 1}
						<div id="start" class="bg-[var(--landing-bg)] px-[0.5rem] pb-4 text-[var(--form-text)]">
							<AboveTitleWithLeftIconCard contents={content.start.contents} />
						</div>
					{:else if index == 2}
						<div id="next" class="bg-[var(--landing-bg)] px-[0.5rem] pb-4 text-[var(--form-text)]">
							<ThreeColumWithLeftHeading contents={content.next.contents} />
							<ButtonBanner contents={content.next.buttonBanner} />
						</div>
					{:else if index == 3}
						<div
							id="calculators"
							class="bg-[var(--landing-bg)] px-[0.5rem] pb-4 text-[var(--form-text)]"
						>
							<AboveTitleWithBlackCard contents={content.calculators.contents} />
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

		<div slot="secondary">
			<HelpList contents={content.common_components.helpList.contents} />
			<ThingsYouShould
				thinkKnow={content.common_components.thinkYouShouldKnow.contents}
				disc={content.common_components.thinkYouShouldKnow.disc}
			></ThingsYouShould>
		</div>
	</NewPageLayout>
</section>
