<script lang="ts">
	import ThingsYouShould from '$lib/components/website/ThingsYouShould.svelte';
	import Button from '$lib/components/website/Button.svelte';
	import StickyNavbar from '$lib/components/website/StickyNavbar.svelte';
	import { onMount } from 'svelte';
	import NewPageLayout from './NewPageLayout.svelte';
	import { applicationData } from '$lib/stores/stores';
	import TwoColumnWithLeftHeading from './TwoColumnWithLeftHeading.svelte';
	import AboveTitleWithoutIconCard from './AboveTitleWithoutIconCard.svelte';
	import TwoColumnWithImage from './TwoColumnWithImage.svelte';
	import ButtonBanner from './ButtonBanner.svelte';
	import AboveTitleWithBlackCard from './AboveTitleWithBlackCard.svelte';
	import FeedbackCheck from './FeedbackCheck.svelte';
	import HelpList from './HelpList.svelte';
	import Seo from './Seo.svelte';
	import content from '$lib/data/website/homeLoanSupport.json';

	interface ButtonProps {
		btnName: string;
		btnLink: string;
		btnClass?: string;
		animation?: boolean;
	}

	interface PageDataProps {
		coverImage: string;
		coverAlt: string;
		classStyle?: string;
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
		actionBtns: pageData.actionBtns.map((btn) => {
			if (btn.btnLink === '/get-started/how-can-we-help' || btn.btnName === 'Check lowest rates' || btn.btnName === 'Compare rates') {
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
			if (btn.btnLink === '/get-started/how-can-we-help' || btn.btnName === 'Check lowest rates' || btn.btnName === 'Compare rates') {
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

	// For financial assistance cards, handle click/navigation dynamically
	const assistanceWithClicks = $derived({
		...content.steps.assistance,
		cards: content.steps.assistance.cards.map((card) => {
			if (card.url === '/get-started/how-can-we-help') {
				return {
					...card,
					onClick: () => {
						applicationData.update((data) => {
							data.LoanName = 'Home Loan';
							return data;
						});
					}
				};
			}
			return card;
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
				'name': 'Home Loan Support',
				'item': 'https://www.digitaldsa.com/home-loan/home-loan-support'
			}
		]
	};
</script>

<svelte:head>
	{@html `<script type="application/ld+json">${JSON.stringify(breadcrumbSchema)}</script>`}
</svelte:head>

<Seo
	type="WebPage"
	title="Simple & Smart Home Loan Solutions | Compare & Apply Today"
	description="Get expert home loan guidance, compare rates, check eligibility & apply easily. Secure the best deal with quick approvals & 100% transparency."
	image={pageData.coverImage}
	keywords="Home loan, Home loan eligibility, Best home loan rates, Home loan approval, Compare home loans, Home loan refinancing, Balance transfer loan, Affordable home loan, Housing loan guide, Home loan process, Loan for home purchase, Home loan EMI calculator, Home renovation loan, Top-up home loan, Down payment assistance"
/>

<section class="mx-auto w-full bg-mainBg xl:container">
	<NewPageLayout pageData={pageDataWithClicks}>
		<!-- desktop view -->
		<div class="hidden lg:block">
			<StickyNavbar navList={navListWithClicks} {activeSection} />

			<div id="types" data-section="types">
				<TwoColumnWithLeftHeading contents={content.types.contents} />
			</div>

			<div id="why" data-section="why">
				<AboveTitleWithoutIconCard contents={content.why.contents} />
			</div>

			<div id="challenges" data-section="challenges">
				<TwoColumnWithLeftHeading contents={content.challenges.contents} />
			</div>

			<div id="steps" data-section="steps">
				<TwoColumnWithImage contents={content.steps.contents}>
					<div class="typography-body-sm text-text-light">
						<ul class="list-disc space-y-4">
							{#each content.steps.list as item}
								<li class="flex items-start gap-1">
									<img src="/icons/circle-check.svg" alt="circle-check" class="mt-1 h-4" />
									<span>
										<strong>{item.bold}</strong>
										{item.text}
									</span>
								</li>
							{/each}
						</ul>
					</div>
				</TwoColumnWithImage>

				<ButtonBanner contents={content.steps.buttonBanner} />
				<AboveTitleWithoutIconCard contents={assistanceWithClicks} />
			</div>

			<div id="tools" data-section="tools">
				<AboveTitleWithBlackCard contents={content.tools.contents} />
			</div>
		</div>

		<!-- mobile view -->
		<div class="block lg:hidden">
			{#each content.mobileNavbarTitle as list, index (list)}
				<details
					class="dropdown border-bgBtn col-span-3 bg-[var(--landing-bg-card)] text-black dark:text-white {index <
					content.mobileNavbarTitle.length - 1
						? 'border-b border-[var(--form-border)]'
						: ''}"
				>
					<summary
						class="list-none cursor-pointer px-[1rem] py-[1.5rem]"
						onclick={(e) => toggleDropdown(e, index)}
					>
						<div class="flex items-center justify-between font-semibold typography-body-md">
							<h2 class="text-black dark:text-white">{list}</h2>
							<span
								><i
									class="fa-solid fa-angle-down faq-icon text-black transition-transform duration-300 dark:text-white"
								></i></span
							>
						</div>
					</summary>

					{#if index == 0}
						<div
							id="types"
							class="bg-[var(--landing-bg)] px-[0.5rem] pb-4 text-black dark:text-white"
						>
							<TwoColumnWithLeftHeading contents={content.types.contents} />
						</div>
					{:else if index == 1}
						<div id="why" class="bg-[var(--landing-bg)] px-[0.5rem] pb-4 text-black dark:text-white">
							<AboveTitleWithoutIconCard contents={content.why.contents} />
						</div>
					{:else if index == 2}
						<div
							id="challenges"
							class="bg-[var(--landing-bg)] px-[0.5rem] pb-4 text-black dark:text-white"
						>
							<TwoColumnWithLeftHeading contents={content.challenges.contents} />
						</div>
					{:else if index == 3}
						<div
							id="steps"
							class="bg-[var(--landing-bg)] px-[0.5rem] pb-4 text-black dark:text-white"
						>
							<TwoColumnWithImage contents={content.steps.contents}>
								<div class="typography-body-sm text-text-light">
									<ul class="list-disc space-y-4">
										{#each content.steps.list as item}
											<li class="flex items-start gap-1">
												<img src="/icons/circle-check.svg" alt="circle-check" class="mt-1 h-4" />
												<span>
													<strong>{item.bold}</strong>
													{item.text}
												</span>
											</li>
										{/each}
									</ul>
								</div>
							</TwoColumnWithImage>

							<div class="w-full">
								<ButtonBanner contents={content.steps.buttonBanner} />
							</div>

							<AboveTitleWithoutIconCard contents={assistanceWithClicks} />
						</div>
					{:else if index == 4}
						<div
							id="tools"
							class="bg-[var(--landing-bg)] px-[0.5rem] pb-4 text-black dark:text-white"
						>
							<AboveTitleWithBlackCard contents={content.tools.contents} />
						</div>
					{/if}
				</details>
			{/each}
		</div>

		<!-- message us -->
		<TwoColumnWithImage contents={content.messageUs.contents}>
			<p>{content.messageUs.para}</p>
			<div class="w-auto">
				<Button
					link={content.messageUs.button.link}
					btnBorder={content.messageUs.button.btnBorder}
					btnName={content.messageUs.button.btnName}
				/>
			</div>
		</TwoColumnWithImage>

		<FeedbackCheck />

		<div slot="secondary">
			<HelpList contents={content.common_components.helpList.contents} />
			<ThingsYouShould
				thinkKnow={content.common_components.thinkYouShouldKnow.thinkKnow}
				disc={content.common_components.thinkYouShouldKnow.disc}
			/>
		</div>
	</NewPageLayout>
</section>
