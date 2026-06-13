<script lang="ts">
	import PageDesign from '$lib/components/website/PageDesign.svelte';
	import Button from '$lib/components/website/Button.svelte';
	import TwoColumn from '$lib/components/website/TwoColumn.svelte';
	import ThingsYouShould from '$lib/components/website/ThingsYouShould.svelte';
	import Journey from '$lib/components/website/Journey.svelte';
	import { onMount } from 'svelte';
	import StickyNavbar from './StickyNavbar.svelte';
	import WhyChoose from '$lib/components/website/WhyChoose.svelte';
	import PremiumButton from './PremiumButton.svelte';
	import Guides from './Guides.svelte';
	import AccordionWithLeftHeading from './AccordionWithLeftHeading.svelte';
	import Seo from './Seo.svelte';
	import HelpList from './HelpList.svelte';
	import { banks } from '$lib/data/bankEligibilityData';
	import content from '$lib/data/website/homeLoanForBusiness.json';
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
		classStyle?: string;
		heroHeading: string;
		heroParagraph: string;
	}

	function findLowestROIWithBank(data: any[], key: string) {
		return data.reduce(
			(minObj, obj) => {
				const value = parseFloat(obj[key]); // Convert to number
				if (!isNaN(value) && value < minObj.roi) {
					return { bank: obj.BankName, roi: value.toFixed(2) };
				}
				return minObj;
			},
			{ bank: null, roi: Infinity }
		);
	}
	const roiKey = '(HL/Construction/Plot+Construction/Plot) ROI as per CIBIL / 800+';
	const roiResult = findLowestROIWithBank(banks, roiKey);

	let { pageData = content.pageData }: { pageData?: PageDataProps } = $props();

	let cardImg1 = '/images/beautiful-drawing-room.jpg';
	let cardAlt1 = 'images-HLGreenDigital';
	let cardHead1 = 'What Documents Do You Need?';

	// Toggle dropdown with animation
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

	// This function sets the first section as active on initial load
	const initializeActiveSection = () => {
		const firstSection = document.querySelector('[data-section]');
		if (firstSection) {
			activeSection = firstSection.id;
		}
	};

	// Handle scroll event to dynamically update the active section
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
			activeSection = currentSection; // Update the active section dynamically
		}
	};

	// Initialize the first active section when the component loads
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
				name: 'Business Owner Home Loan Guide',
				item: 'https://www.digitaldsa.com/home-loan/home-loan-for-business'
			}
		]
	};

	const faqSchema = {
		'@context': 'https://schema.org',
		'@type': 'FAQPage',
		mainEntity: content.frequentlyAskedQuestions.accordions.map((acc) => ({
			'@type': 'Question',
			name: acc.question,
			acceptedAnswer: {
				'@type': 'Answer',
				text: acc.answer
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
	title="Home Loans for Business Owners | Easy Approval | Digital DSA"
	image="/images/business-owners.jpg"
	description="Get a home loan as a business owner, even with minimal documents. Flexible options, low rates, & fast approval. Apply now with Digital DSA!"
	keywords="Home loans for business owners, Self-employed home loans, Small business home loans, No ITR home loan, Home loan for shopkeepers, Home loan for self-employed, Home loan for unorganized businesses, Home loan without financial records, Low document home loans, Digital DSA home loan"
/>

<section>
	<PageDesign {pageData}>
		<!-- desktop view -->
		<div class="hidden lg:block">
			<StickyNavbar navList={content.navList} {activeSection} />
			<div class="px-[2rem] lg:px-[4rem]">
				<section id="started" data-section="started" class="section">
					<Journey journey={content.journey} />
				</section>

				<section
					id="choose"
					data-section="choose"
					class="section border-b border-[var(--form-border)]"
				>
					<WhyChoose facilities={content.facilities} gridCol={3} />
				</section>

				<section
					id="loanOptions"
					data-section="loanOptions"
					class="section border-b border-[var(--form-border)]"
				>
					<WhyChoose facilities={content.homeLoanOptions} gridCol={3} />
				</section>

				<section
					id="whatDocs"
					data-section="whatDocs"
					class="section border-b border-[var(--form-border)]"
				>
					<TwoColumn
						cardImage={cardImg1}
						cardAltName={cardAlt1}
						cardHeading={cardHead1}
						reverse={true}
					>
						<div class="flex flex-col gap-4">
							{#each content.documentsGuide as guide}
								<div class="flex flex-col gap-2">
									<p class="typography-body-md text-[var(--form-text-secondary)]">
										{guide.para}
									</p>

									{#each guide.lists as list, index}
										<li
											class="typography-body-md list-none !font-semibold text-[var(--form-text-secondary)]"
										>
											{index + 1}. {list.heading}
										</li>
										<ul class="pl-4">
											{#each list.subList as subList}
												<li class="typography-body-md list-disc text-[var(--form-text-secondary)]">
													{subList.list}
												</li>
											{/each}
										</ul>
									{/each}
								</div>
							{/each}
						</div>
					</TwoColumn>

					<Guides guide={content.guide} />
				</section>

				<section
					id="process"
					data-section="process"
					class="section border-b border-[var(--form-border)] py-[4rem]"
				>
					{#each [content.journey] as _}
						<div class="grid grid-cols-3 gap-[2rem]">
							<div>
								<h3
									class="typography-body-lg mb-[1.5rem] !font-semibold text-black md:text-start dark:text-white"
								>
									Our simplified verification process
								</h3>
								<ul class="mb-4 space-y-2">
									<li class="typography-body-md text-[var(--form-text-secondary)]">
										A simple application process for business owners with less documents to prove
										your income.
									</li>
									<li class="typography-body-md text-[var(--form-text-secondary)]">
										Get in touch with our Home Lending Specialists to discuss your options.
									</li>
								</ul>
								<div class="mb-[1.5rem]">
									<PremiumButton
										premiumBtnName="Book appointment"
										premiumBtnLink="/appointment"
										premiumBtnClass="btn-primary text-white dark:text-black"
									/>
								</div>
							</div>
							<div>
								<h3
									class="typography-body-lg mb-[1.5rem] !font-semibold text-black md:text-start dark:text-white"
								>
									You may be eligible if:
								</h3>
								<ul class="mt-[1.5rem] mb-4 list-disc space-y-2 pl-4">
									<li class="typography-body-md text-[var(--form-text-secondary)]">
										You’re self-employed
									</li>
									<li class="typography-body-md text-[var(--form-text-secondary)]">
										You pay yourself a regular salary from your business
									</li>
								</ul>
							</div>
							<div>
								<h3
									class="typography-body-lg mb-[1.5rem] !font-semibold text-black md:text-start dark:text-white"
								>
									If eligible, you'll need:
								</h3>
								<ul class="mb-4 list-disc space-y-2 pl-4">
									<li class="typography-body-md text-[var(--form-text-secondary)]">
										Six months of salary credits in an account
									</li>
									<li class="typography-body-md text-[var(--form-text-secondary)]">
										Financial records showing profit and loss for the last two years, with a profit
										each year
									</li>
								</ul>
								<p class="typography-body-md mb-[1.5rem] text-[var(--form-text-secondary)]">
									In some instances, we may need more information. Our Home Lending Specialists will
									let you know.
								</p>
							</div>
						</div>
					{/each}
				</section>

				<section id="fees" data-section="fees" class="section py-[4rem]">
					<div class="grid grid-cols-3 gap-[2rem]">
						<h2 class="typography-h2-md col-span-3 mt-4 text-black lg:col-span-1 dark:text-white">
							{content.rates.heading}
						</h2>

						<div class="col-span-3 lg:col-span-2">
							<div class="grid grid-cols-2 gap-[2rem] pt-4">
								<div class="space-y-4">
									<h3 class="typography-body-lg !font-semibold text-[var(--form-text)]">
										Interest Rates ({roiResult.roi || '8.10'}% PA)
									</h3>
									<ul class="marker:black list-disc space-y-2 pl-4">
										{#each content.rates.left[0].lists as list}
											<li class="typography-body-md text-[var(--form-text-secondary)]">
												{list}
											</li>
										{/each}
									</ul>
								</div>
								<div class="space-y-4">
									<h3 class="typography-body-lg !font-semibold text-[var(--form-text)]">
										{content.rates.right[0].heading}
									</h3>
									<ul class="marker:black list-disc space-y-2 pl-4">
										{#each content.rates.right[0].lists as list}
											<li class="typography-body-md text-[var(--form-text-secondary)]">
												{list}
											</li>
										{/each}
									</ul>
								</div>
							</div>
						</div>
					</div>
				</section>

				<section id="support" data-section="support" class="section">
					<AccordionWithLeftHeading contents={content.frequentlyAskedQuestions} />
					<Guides guide={content.getStart} />
					<!-- <HelpList contents={content.}></HelpList> -->

					<ThingsYouShould thinkKnow={content.thinkKnow} disc="list-decimal"></ThingsYouShould>
				</section>
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
						<div class="typography-label mx-auto flex w-full items-center justify-between gap-4">
							<h2 class="text-[var(--form-text)]">{list}</h2>
							<div class="icon-container">
								<ChevronDown
									class="h-5 w-5 text-black transition-transform duration-300 dark:text-white"
								/>
							</div>
						</div>
					</summary>

					{#if index == 0}
						<div
							id="started"
							class="bg-[var(--landing-bg)] px-[0.5rem] pb-4 text-[var(--form-text)]"
						>
							<Journey journey={content.journey} />
						</div>
					{:else if index == 1}
						<div
							id="choose"
							class="bg-[var(--landing-bg)] px-[0.5rem] pb-4 text-[var(--form-text)]"
						>
							<WhyChoose facilities={content.facilities} gridCol={4} />
						</div>
					{:else if index == 2}
						<div
							id="loanOptions"
							class="bg-[var(--landing-bg)] px-[0.5rem] pb-4 text-[var(--form-text)]"
						>
							<WhyChoose facilities={content.homeLoanOptions} gridCol={3} />
						</div>
					{:else if index == 3}
						<div
							class="bg-[var(--landing-bg)] px-[0.5rem] pb-4 text-[var(--form-text)]"
							id="whatDocs"
						>
							<TwoColumn
								cardImage={cardImg1}
								cardAltName={cardAlt1}
								cardHeading={cardHead1}
								reverse={true}
							>
								<div class="flex flex-col gap-4">
									{#each content.documentsGuide as guide}
										<div class="flex flex-col gap-2">
											<p class="typography-body-md text-[var(--form-text-secondary)]">
												{guide.para}
											</p>

											{#each guide.lists as list, index}
												<li
													class="typography-body-md list-none !font-semibold text-[var(--form-text-secondary)]"
												>
													{index + 1}. {list.heading}
												</li>
												<ul class="pl-4">
													{#each list.subList as subList}
														<li
															class="typography-body-md list-disc text-[var(--form-text-secondary)]"
														>
															{subList.list}
														</li>
													{/each}
												</ul>
											{/each}
										</div>
									{/each}
								</div>
							</TwoColumn>

							<Guides guide={content.guide} />
						</div>
					{:else if index == 4}
						<div
							id="process"
							class="bg-[var(--landing-bg)] px-[0.5rem] py-[4rem] text-[var(--form-text)]"
						>
							<div class="grid gap-[2rem] md:grid-cols-2 lg:grid-cols-3">
								<div>
									<h3 class="typography-h2 mb-[1.5rem] text-text-main md:text-start">
										Our simplified verification process
									</h3>
									<ul class="mb-4 space-y-2">
										<li class="typography-body-sm text-text-light">
											A simple application process for business owners with less documents to prove
											your income.
										</li>
										<li class="typography-body-sm text-text-light">
											Get in touch with our Home Lending Specialists to discuss your options.
										</li>
									</ul>
									<div class="mb-[1.5rem]">
										<PremiumButton
											premiumBtnName="Book appointment"
											premiumBtnLink="/appointment"
											premiumBtnClass="btn-primary text-white dark:text-black"
										/>
									</div>
								</div>
								<div>
									<h3 class="typography-h3 mb-[1.5rem] font-semibold text-text-main">
										You may be eligible if:
									</h3>
									<ul class="mt-[1.5rem] list-disc space-y-2 pl-4 md:mb-4">
										<li class="typography-body-sm text-text-light">You're self-employed</li>
										<li class="typography-body-sm text-text-light">
											You pay yourself a regular salary from your business
										</li>
									</ul>
								</div>
								<div>
									<h3 class="typography-h3 mb-[1.5rem] font-semibold text-text-main">
										If eligible, you'll need:
									</h3>
									<ul class="mb-4 list-disc space-y-2 pl-4">
										<li class="typography-body-sm text-text-light">
											Six months of salary credits in an account
										</li>
										<li class="typography-body-sm text-text-light">
											Financial records showing profit and loss for the last two years, with a
											profit each year
										</li>
									</ul>
									<p class="typography-body-md mb-[1.5rem] text-text-light">
										In some instances, we may need more information. Our Home Lending Specialists
										will let you know.
									</p>
								</div>
							</div>
						</div>
					{:else if index == 5}
						<div
							id="fees"
							class="bg-[var(--landing-bg)] px-[0.5rem] py-[4rem] text-[var(--form-text)]"
						>
							<div class="grid grid-cols-1 gap-[2rem]">
								<h2 class="typography-h2 text-text-main">
									{content.rates.heading}
								</h2>

								<div class="grid gap-[2rem] md:grid-cols-2">
									<div class="space-y-4">
										<h3 class="typography-h3 font-semibold text-text-main">
											Interest Rates ({roiResult.roi || '8.10'}% PA)
										</h3>
										<ul class="marker:black list-disc space-y-2 pl-4">
											{#each content.rates.left[0].lists as list}
												<li class="typography-body-sm text-text-light">
													{list}
												</li>
											{/each}
										</ul>
									</div>
									<div class="space-y-4">
										<h3 class="typography-h3 font-semibold text-text-main">
											{content.rates.right[0].heading}
										</h3>
										<ul class="marker:black list-disc space-y-2 pl-4">
											{#each content.rates.right[0].lists as list}
												<li class="typography-body-sm text-text-light">
													{list}
												</li>
											{/each}
										</ul>
									</div>
								</div>
							</div>
						</div>
					{:else if index == 6}
						<div
							id="support"
							class="bg-[var(--landing-bg)] px-[0.5rem] pb-4 text-[var(--form-text)]"
						>
							<AccordionWithLeftHeading contents={content.frequentlyAskedQuestions} />
							<Guides guide={content.getStart} />
						</div>
					{/if}
				</details>
			{/each}
		</div>
	</PageDesign>
</section>
