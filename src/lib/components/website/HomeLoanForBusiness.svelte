<script lang="ts">
	import PageDesign from '$lib/components/website/PageDesign.svelte';
	import Button from '$lib/components/website/Button.svelte';
	import TwoColumn from '$lib/components/website/TwoColumn.svelte';
	import ThingsYouShould from '$lib/components/website/ThingsYouShould.svelte';
	import TwoColumnWithImage from './TwoColumnWithImage.svelte';
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
	import { toggleDropdown } from '$lib/utils/toggleDropdown';

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
	let cardHead1 = 'Documents Typically Required for Business Owner Cases';

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
			<div class="">
				<section id="started" data-section="started" class="section">
					<Journey journey={content.journey} isBorder />
				</section>

				<section id="choose" data-section="choose" class="section">
					<WhyChoose facilities={content.facilities} gridCol={3} isBorder />
				</section>

				<section id="loanOptions" data-section="loanOptions" class="section">
					<WhyChoose facilities={content.homeLoanOptions} gridCol={3} isBorder />
				</section>

				<section id="whatDocs" data-section="whatDocs" class="section">
					<TwoColumnWithImage
						isBorder
						contents={{
							cardImage: cardImg1,
							cardAltName: cardAlt1,
							cardHeading: cardHead1,
							reverse: true
						}}
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
					</TwoColumnWithImage>

					<Guides guide={content.guide} isBorder />
				</section>

				<section
					id="process"
					data-section="process"
					class="section border-b border-[var(--form-border)] px-[0.5rem] py-[4rem] lg:px-16"
				>
					{#each [content.verificationProcess] as verificationProcess}
						<div class="grid grid-cols-3 gap-[2rem]">
							<div>
								<h3
									class="typography-h2-md !font-semibol mb-[1.5rem] text-[var(--form-text)] md:text-start"
								>
									{verificationProcess.left.title}
								</h3>
								<ul class="mb-4 space-y-2">
									{#each verificationProcess.left.points as point}
										<li class="typography-body-md text-[var(--form-text-secondary)]">
											{point}
										</li>
									{/each}
								</ul>
								<div class="mb-[1.5rem]">
									<PremiumButton
										premiumBtnName={verificationProcess.left.button.name}
										premiumBtnLink={verificationProcess.left.button.link}
										premiumBtnClass={verificationProcess.left.button.class}
									/>
								</div>
							</div>
							<div>
								<h3
									class="typography-body-lg mb-[1.5rem] !font-semibold text-[var(--form-text)] md:text-start"
								>
									{verificationProcess.middle.title}
								</h3>
								<ul class="mt-[1.5rem] mb-4 list-disc space-y-2 pl-4">
									{#each verificationProcess.middle.points as point}
										<li class="typography-body-md text-[var(--form-text-secondary)]">
											{point}
										</li>
									{/each}
								</ul>
							</div>
							<div>
								<h3
									class="typography-body-lg mb-[1.5rem] !font-semibold text-[var(--form-text)] md:text-start"
								>
									{verificationProcess.right.title}
								</h3>
								<ul class="mb-4 list-disc space-y-2 pl-4">
									{#each verificationProcess.right.points as point}
										<li class="typography-body-md text-[var(--form-text-secondary)]">
											{point}
										</li>
									{/each}
								</ul>
								<p class="typography-body-md mb-[1.5rem] text-[var(--form-text-secondary)]">
									{verificationProcess.right.note}
								</p>
							</div>
						</div>
					{/each}
				</section>

				<section
					id="fees"
					data-section="fees"
					class="section border-b border-[var(--form-border)] px-[0.5rem] py-[4rem] lg:px-16"
				>
					<div class="grid grid-cols-3 gap-[2rem]">
						<h2 class="typography-h2-md col-span-3 mt-4 text-[var(--form-text)] lg:col-span-1">
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
					<Guides guide={content.getStart} isBorder />
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
						<div
							id="started"
							class="bg-[var(--landing-bg)] px-[0.5rem] pb-4 text-[var(--form-text)]"
						>
							<Journey journey={content.journey} />
						</div>
					{:else if index == 1}
						<div id="choose" class="bg-[var(--landing-bg)] pb-4 text-[var(--form-text)]">
							<WhyChoose facilities={content.facilities} gridCol={4} />
						</div>
					{:else if index == 2}
						<div id="loanOptions" class="bg-[var(--landing-bg)] pb-4 text-[var(--form-text)]">
							<WhyChoose facilities={content.homeLoanOptions} gridCol={3} />
						</div>
					{:else if index == 3}
						<div
							class="bg-[var(--landing-bg)] px-[0.5rem] pb-4 text-[var(--form-text)]"
							id="whatDocs"
						>
							<TwoColumnWithImage
								isBorder
								contents={{
									cardImage: cardImg1,
									cardAltName: cardAlt1,
									cardHeading: cardHead1,
									reverse: true
								}}
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
							</TwoColumnWithImage>
							<Guides guide={content.guide} />
						</div>
					{:else if index == 4}
						<div
							id="process"
							class="bg-[var(--landing-bg)] px-[0.5rem] py-[4rem] text-[var(--form-text)] lg:px-16"
						>
							{#each [content.verificationProcess] as verificationProcess}
								<div class="grid gap-[2rem] md:grid-cols-2 lg:grid-cols-3">
									<div>
										<h3 class="typography-h2-md mb-[1.5rem] text-[var(--form-text)] md:text-start">
											{verificationProcess.left.title}
										</h3>
										<ul class="mb-4 space-y-2">
											{#each verificationProcess.left.points as point}
												<li class="typography-body-md text-[var(--form-text-secondary)]">
													{point}
												</li>
											{/each}
										</ul>
										<div class="mb-[1.5rem]">
											<PremiumButton
												premiumBtnName={verificationProcess.left.button.name}
												premiumBtnLink={verificationProcess.left.button.link}
												premiumBtnClass={verificationProcess.left.button.class}
											/>
										</div>
									</div>
									<div>
										<h3
											class="typography-body-lg mb-[1.5rem] !font-semibold text-[var(--form-text)]"
										>
											{verificationProcess.middle.title}
										</h3>
										<ul class="mt-[1.5rem] list-disc space-y-2 pl-4 md:mb-4">
											{#each verificationProcess.middle.points as point}
												<li class="typography-body-md text-[var(--form-text-secondary)]">
													{point}
												</li>
											{/each}
										</ul>
									</div>
									<div>
										<h3
											class="typography-body-lg mb-[1.5rem] !font-semibold text-[var(--form-text)] md:text-start"
										>
											{verificationProcess.right.title}
										</h3>
										<ul class="mb-4 list-disc space-y-2 pl-4">
											{#each verificationProcess.right.points as point}
												<li class="typography-body-md text-[var(--form-text-secondary)]">
													{point}
												</li>
											{/each}
										</ul>
										<p class="typography-body-md mb-[1.5rem] text-[var(--form-text-secondary)]">
											{verificationProcess.right.note}
										</p>
									</div>
								</div>
							{/each}
						</div>
					{:else if index == 5}
						<div
							id="fees"
							class="bg-[var(--landing-bg)] px-[0.5rem] py-[4rem] text-[var(--form-text)] lg:px-16"
						>
							<div class="grid grid-cols-1 gap-[2rem]">
								<h2 class="typography-h2-md text-[var(--form-text)]">
									{content.rates.heading}
								</h2>

								<div class="grid gap-[2rem] md:grid-cols-2">
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
					{:else if index == 6}
						<div id="support" class="bg-[var(--landing-bg)] pb-4 text-[var(--form-text)]">
							<AccordionWithLeftHeading contents={content.frequentlyAskedQuestions} />
							<Guides guide={content.getStart} isBorder />
						</div>
					{/if}
				</details>
			{/each}
		</div>

		<!-- message us -->
		<TwoColumnWithImage contents={content.messageUs.contents} isBorder>
			<p class="typography-body-md text-[var(--form-text-secondary)]">{content.messageUs.para}</p>
			<div class="w-auto">
				<Button
					link={content.messageUs.button.link}
					btnName={content.messageUs.button.btnName}
					btnClass={content.messageUs.button.btnClass}
				/>
			</div>
		</TwoColumnWithImage>

		{#snippet secondary()}
			<HelpList contents={content.helpList} isBorder />
			<ThingsYouShould thinkKnow={content.thinkKnow} disc="list-decimal" containerClass="lg:px-0" />
		{/snippet}
	</PageDesign>
</section>
