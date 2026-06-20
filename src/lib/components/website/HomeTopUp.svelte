<script lang="ts">
	import Button from './Button.svelte';
	import ThingsYouShould from '$lib/components/website/ThingsYouShould.svelte';
	import { onMount } from 'svelte';
	import StickyNavbar from './StickyNavbar.svelte';
	import NewPageLayout from './NewPageLayout.svelte';
	import ThreeColumWithLeftHeading from './ThreeColumWithLeftHeading.svelte';
	import TwoColumnWithImage from './TwoColumnWithImage.svelte';
	import ButtonBanner from './ButtonBanner.svelte';
	import HelpList from './HelpList.svelte';
	import { applicationData } from '$lib/stores/stores';
	import AboveTitleWithBlackCard from './AboveTitleWithBlackCard.svelte';
	import Seo from './Seo.svelte';
	import TwoColumnWithLeftHeading from './TwoColumnWithLeftHeading.svelte';
	import AboveTitleWithTopIconCard from './AboveTitleWithTopIconCard.svelte';
	import FeedbackCheck from './FeedbackCheck.svelte';
	import content from '$lib/data/website/homeTopUp.json';
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

	let { pageData = content.pageData }: { pageData?: PageDataProps } = $props();

	// Inject store update callbacks dynamically for get-started actions
	const pageDataWithClicks = $derived({
		...pageData,
		actionBtns: pageData.actionBtns.map((btn) => {
			if (
				btn.btnLink === '/get-started/how-can-we-help' ||
				btn.btnName === 'Check lowest rates' ||
				btn.btnName === 'Compare rates'
			) {
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
			if (
				btn.btnLink === '/get-started/how-can-we-help' ||
				btn.btnName === 'Check lowest rates' ||
				btn.btnName === 'Compare rates'
			) {
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
				name: 'Home Loan Top-Up',
				item: 'https://www.digitaldsa.com/home-loan/top-up-only'
			}
		]
	};

	const faqSchema = {
		'@context': 'https://schema.org',
		'@type': 'FAQPage',
		mainEntity: [
			{
				'@type': 'Question',
				name: content.started.intro.heading,
				acceptedAnswer: {
					'@type': 'Answer',
					text: content.started.intro.secPara
				}
			},
			...content.started.eligibility.list.map((c) => ({
				'@type': 'Question',
				name: c.heading,
				acceptedAnswer: {
					'@type': 'Answer',
					text: c.desc.join(' ')
				}
			})),
			{
				'@type': 'Question',
				name: content.fee.tenure.heading,
				acceptedAnswer: {
					'@type': 'Answer',
					text: content.fee.tenure.list.map((l) => l.desc).join(' ')
				}
			},
			{
				'@type': 'Question',
				name: content.fee.rates.heading,
				acceptedAnswer: {
					'@type': 'Answer',
					text: content.fee.rates.list.map((l) => l.desc).join(' ')
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
	title="Home Loan Top-Up: Low Interest, Quick Approval & No Hassle"
	image={pageData.coverImage}
	description="Get a home loan top-up at low interest rates with quick approval. Use funds for renovation, education, or emergencies. Check eligibility now!"
	keywords="Home loan top-up, Home loan top-up eligibility, Home loan top-up interest rate, Home loan top-up benefits, Home loan top-up process, Home loan balance transfer, Additional loan on home loan, Home loan top-up calculator, Top-up home loan vs personal loan, Home loan top-up EMI calculator"
/>

<section class="content">
	<NewPageLayout pageData={pageDataWithClicks}>
		<!-- for desktop -->
		<div class="hidden lg:block">
			<StickyNavbar navList={navListWithClicks} {activeSection} />

			<div class="">
				<div id="started" data-section="started" class="">
					<TwoColumnWithLeftHeading contents={content.started.intro} />
					<AboveTitleWithTopIconCard contents={content.started.eligibility} />
				</div>

				<div id="fee" data-section="fee" class="section">
					<TwoColumnWithLeftHeading contents={content.fee.tenure} />
					<TwoColumnWithLeftHeading contents={content.fee.rates} />
				</div>

				<div id="step" data-section="step" class="section">
					<TwoColumnWithImage contents={content.step.guide}>
						<div class="typography-body-md text-[var(--form-text-secondary)]">
							<ul class="space-y-6">
								{#each content.step.list as s}
									<li class="">
										<div class="typography-body-md space-y-4 text-[var(--form-text-secondary)]">
											<span class="font-semibold">{s.title}</span>
											<ul class="ml-[2rem] list-disc space-y-2">
												{#each s.bullets as b}
													<li class="font-para typography-body-md">{b}</li>
												{/each}
											</ul>
										</div>
									</li>
								{/each}
								<li class="typography-body-md text-[var(--form-text-secondary)]">
									<span class="font-semibold">📢 Processing Time:</span>
									<p class="typography-body-md text-[var(--form-text-secondary)]">
										{content.step.processingTime}
									</p>
								</li>
							</ul>
						</div>
					</TwoColumnWithImage>

					<ButtonBanner contents={content.step.buttonBanner} />
					<ThreeColumWithLeftHeading contents={content.step.prosCons} />
				</div>

				<div id="help" data-section="help" class="section">
					<TwoColumnWithImage contents={content.help.contents}>
						<div>
							<ul class="space-y-4">
								{#each content.help.list as item}
									<li class="flex items-start gap-1">
										<img src="/icons/circle-check.svg" alt="circle-check-icon" class="mt-1 h-4" />
										<span>
											{#if item.bold}
												<span class="font-semibold">{item.bold}</span>
											{/if}
											{item.text}
										</span>
									</li>
								{/each}
								<li>
									<span>
										{@html content.help.tip}
									</span>
								</li>
							</ul>
						</div>
					</TwoColumnWithImage>
				</div>

				<div id="tool" data-section="tool" class="section">
					<ThreeColumWithLeftHeading contents={content.tool.threeColumn} />
					<AboveTitleWithBlackCard contents={content.tool.blackCard} />
					<AboveTitleWithTopIconCard contents={content.tool.topIconCard} />
				</div>
			</div>
		</div>

		<!-- for mobile -->
		<div class="block lg:hidden">
			{#each content.mobileNavbarTitle as list, index (list)}
				<details
					class="dropdown col-span-3 bg-[var(--landing-bg-card)] text-[var(--form-text)] {index < 4
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
							<TwoColumnWithLeftHeading contents={content.started.intro} />
							<AboveTitleWithTopIconCard contents={content.started.eligibility} />
						</div>
					{:else if index == 1}
						<div id="fee" class="bg-[var(--landing-bg)] px-[0.5rem] pb-4 text-[var(--form-text)]">
							<div class="border-b border-[var(--form-border)]">
								<TwoColumnWithLeftHeading contents={content.fee.tenure} />
							</div>
							<TwoColumnWithLeftHeading contents={content.fee.rates} />
						</div>
					{:else if index == 2}
						<div id="step" class="bg-[var(--landing-bg)] px-[0.5rem] pb-4 text-[var(--form-text)]">
							<TwoColumnWithImage contents={content.step.guide}>
								<div class="typography-body-md text-[var(--form-text-secondary)]">
									<ul class="space-y-6">
										{#each content.step.list as s}
											<li class="">
												<div class="typography-body-md space-y-4 text-[var(--form-text-secondary)]">
													<span class="font-semibold">{s.title}</span>
													<ul class="ml-[2rem] list-disc space-y-2">
														{#each s.bullets as b}
															<li class="font-para typography-body-md">{b}</li>
														{/each}
													</ul>
												</div>
											</li>
										{/each}
										<li class="typography-body-md text-[var(--form-text-secondary)]">
											<span class="font-semibold">📢 Processing Time:</span>
											<p class="typography-body-md text-[var(--form-text-secondary)]">
												{content.step.processingTime}
											</p>
										</li>
									</ul>
								</div>
							</TwoColumnWithImage>

							<ButtonBanner contents={content.step.buttonBanner} />
							<ThreeColumWithLeftHeading contents={content.step.prosCons} />
						</div>
					{:else if index == 3}
						<div id="help" class="bg-[var(--landing-bg)] px-[0.5rem] pb-4 text-[var(--form-text)]">
							<TwoColumnWithImage contents={content.help.contents}>
								<div>
									<ul class="space-y-4">
										{#each content.help.list as item}
											<li class="flex items-start gap-1">
												<img
													src="/icons/circle-check.svg"
													alt="circle-check-icon"
													class="mt-1 h-4"
												/>
												<span>
													{#if item.bold}
														<span class="font-semibold">{item.bold}</span>
													{/if}
													{item.text}
												</span>
											</li>
										{/each}
										<li>
											<span>
												{@html content.help.tip}
											</span>
										</li>
									</ul>
								</div>
							</TwoColumnWithImage>
						</div>
					{:else if index == 4}
						<div id="tool" class="bg-[var(--landing-bg)] px-[0.5rem] pb-4 text-[var(--form-text)]">
							<ThreeColumWithLeftHeading contents={content.tool.threeColumn} />
							<AboveTitleWithBlackCard contents={content.tool.blackCard} />
							<AboveTitleWithTopIconCard contents={content.tool.topIconCard} />
						</div>
					{/if}
				</details>
			{/each}
		</div>

		<!-- message us  -->
		<TwoColumnWithImage contents={content.messageUs.contents}>
			<p>{content.messageUs.para}</p>
			<div class="w-auto">
				<Button
					link={content.messageUs.button.link}
					btnClass={content.messageUs.button.btnClass}
					btnName={content.messageUs.button.btnName}
				/>
			</div>
		</TwoColumnWithImage>

		<!-- feedback -->
		<FeedbackCheck />

		<div slot="secondary">
			<HelpList contents={content.common_components.helpList.contents} />
			<ThingsYouShould
				thinkKnow={content.common_components.thinkYouShouldKnow.thinkKnow}
				disc={content.common_components.thinkYouShouldKnow.disc}
				containerClass="lg:px-0"
			/>
		</div>
	</NewPageLayout>
</section>
