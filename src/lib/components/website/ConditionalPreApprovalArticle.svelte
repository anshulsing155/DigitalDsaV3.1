<script lang="ts">
	import NewPageLayout from '$lib/components/website/NewPageLayout.svelte';
	import TwoColumnWithLeftHeading from '$lib/components/website/TwoColumnWithLeftHeading.svelte';
	import StickyNavbar from '$lib/components/website/StickyNavbar.svelte';
	import { onMount } from 'svelte';
	import ThreeColumWithLeftHeading from '$lib/components/website/ThreeColumWithLeftHeading.svelte';
	import TwoColumnWithImage from '$lib/components/website/TwoColumnWithImage.svelte';
	import Button from '$lib/components/website/Button.svelte';
	import HelpList from '$lib/components/website/HelpList.svelte';
	import ThingsYouKnow from '$lib/components/website/ThingsYouKnow.svelte';
	import Seo from './Seo.svelte';
	import { applicationData } from '$lib/stores/stores';
	import content from '$lib/data/website/conditionalPreApprovalArticle.json';

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

	let {
		pageData = content.pageData
	}: { pageData?: PageDataProps } = $props();

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

	// JSON-LD Structured Data Schema for Breadcrumbs
	const breadcrumbSchema = {
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		'itemListElement': [
			{
				'@type': 'ListItem',
				'position': 1,
				'name': 'Home',
				'item': 'https://www.digitaldsa.com'
			},
			{
				'@type': 'ListItem',
				'position': 2,
				'name': 'Home Loan',
				'item': 'https://www.digitaldsa.com/home-loan'
			},
			{
				'@type': 'ListItem',
				'position': 3,
				'name': 'Conditional Pre-Approval',
				'item': 'https://www.digitaldsa.com/home-loan/conditional-pre-approval'
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
				<TwoColumnWithLeftHeading contents={content.intro} />
			</div>

			<div id="advantages" data-section="advantages" class="section">
				<TwoColumnWithLeftHeading contents={content.advantages.contents} />
			</div>

			<div id="preparation" data-section="preparation" class="section">
				<TwoColumnWithLeftHeading contents={content.preparation.assess} />
				<TwoColumnWithLeftHeading contents={content.preparation.apply} />
				<TwoColumnWithLeftHeading contents={content.preparation.after} />
			</div>

			<div id="guidance" data-section="guidance" class="section">
				<TwoColumnWithLeftHeading contents={content.guidance.whyChoose} />
			</div>
		</div>

		<!-- mobile view -->
		<div class="block lg:hidden">
			{#each content.mobileNavbarTitle as list, index}
				<details
					class="dropdown col-span-3 bg-[var(--landing-bg-card)] text-black dark:text-white {index <
					content.mobileNavbarTitle.length - 1
						? 'border-b border-[var(--form-border)]'
						: ''}"
				>
					<summary
						class="col-span-3 list-none cursor-pointer px-[1rem] py-[1.5rem]"
						onclick={(e) => toggleDropdown(e, index)}
					>
						<div class="mx-auto flex w-full items-center justify-between gap-4">
							<h2 class="text-black dark:text-white typography-label">{list}</h2>
							<div class="icon-container justify-self-end typography-h3">
								<span
									><i
										class="fa-solid fa-angle-down faq-icon text-black transition-transform duration-300 dark:text-white"
									></i></span
								>
							</div>
						</div>
					</summary>

					{#if index === 0}
						<div
							id="intro"
							class="bg-[var(--landing-bg)] px-[0.5rem] pb-4 text-black dark:text-white"
						>
							<TwoColumnWithLeftHeading contents={content.intro} />
						</div>
					{:else if index === 1}
						<div
							id="advantages"
							class="bg-[var(--landing-bg)] px-[0.5rem] pb-4 text-black dark:text-white"
						>
							<TwoColumnWithLeftHeading contents={content.advantages.contents} />
						</div>
					{:else if index === 2}
						<div
							id="preparation"
							class="bg-[var(--landing-bg)] px-[0.5rem] pb-4 text-black dark:text-white"
						>
							<TwoColumnWithLeftHeading contents={content.preparation.assess} />
							<TwoColumnWithLeftHeading contents={content.preparation.apply} />
							<TwoColumnWithLeftHeading contents={content.preparation.after} />
						</div>
					{:else if index === 3}
						<div
							id="guidance"
							class="bg-[var(--landing-bg)] px-[0.5rem] pb-4 text-black dark:text-white"
						>
							<TwoColumnWithLeftHeading contents={content.guidance.whyChoose} />
						</div>
					{/if}
				</details>
			{/each}
		</div>

		<div data-section="calculators" id="calculators">
			<ThreeColumWithLeftHeading contents={content.tools} />
		</div>

		<TwoColumnWithImage contents={content.messageUs.contents}>
			<p>{content.messageUs.para}</p>
			<Button
				link={content.messageUs.button.link}
				btnBorder={content.messageUs.button.btnBorder}
				btnName={content.messageUs.button.btnName}
			/>
		</TwoColumnWithImage>

		<div slot="secondary" class="">
			<HelpList contents={content.common_components.helpList.contents} />

			<ThingsYouKnow contents={{ heading: 'Things you should know' }}>
				<ul class="px-2 pl-4 flex flex-col gap-4 list-decimal">
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
