<script lang="ts">
	import { onMount } from 'svelte';
	import StickyNavbar from './StickyNavbar.svelte';
	import NewPageLayout from './NewPageLayout.svelte';
	import ThreeColumWithLeftHeading from './ThreeColumWithLeftHeading.svelte';
	import TwoColumnWithImage from './TwoColumnWithImage.svelte';
	import TwoColumnWithLeftHeading from './TwoColumnWithLeftHeading.svelte';
	import ThingsYouShould from './ThingsYouShould.svelte';
	import HelpList from './HelpList.svelte';
	import Button from './Button.svelte';
	import ButtonBanner from './ButtonBanner.svelte';
	import { applicationData } from '$lib/stores/stores';
	import AboveTitleWithBlackCard from './AboveTitleWithBlackCard.svelte';
	import AboveTitleWithTopIconCard from './AboveTitleWithTopIconCard.svelte';
	import Seo from './Seo.svelte';
	import content from '$lib/data/website/constructionLoan.json';

	interface ButtonProps {
		btnName: string;
		btnLink: string;
		btnColor?: string;
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

	let { pageData = content.pageData }: { pageData?: PageDataProps } = $props();

	const pageDataWithClicks = $derived({
		...pageData,
		actionBtns: pageData.actionBtns.map((btn) => {
			if (btn.btnLink === '/get-started/how-can-we-help' || btn.btnName === 'get best offers') {
				return {
					...btn,
					btnClick: () => {
						applicationData.update((data) => {
							data.LoanName = 'Plot Loan';
							data.LoanType = 'Plot Loan Only';
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
			if (btn.btnLink === '/get-started/how-can-we-help' || btn.btnName === 'get best offers') {
				return {
					...btn,
					btnClick: () => {
						applicationData.update((data) => {
							data.LoanName = 'Plot Loan';
							data.LoanType = 'Plot Loan Only';
							return data;
						});
					}
				};
			}
			return btn;
		})
	});

	const visionBannerWithClicks = $derived({
		...content.visionBanner.contents,
		cardData: content.visionBanner.contents.cardData.map((card) => {
			if (card.btnLink === '/get-started/how-can-we-help') {
				return {
					...card,
					btnClick: () => {
						applicationData.update((data) => {
							data.LoanName = 'Plot Loan';
							data.LoanType = 'Construction Loan Only';
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
</script>

<Seo
	type={content.seo.type}
	title={content.seo.title}
	image={content.seo.image}
	description={content.seo.description}
	keywords={content.seo.keywords}
/>

<section class="bg-mainBg mx-auto w-full xl:container">
	<NewPageLayout pageData={pageDataWithClicks}>
		<!-- desktop view -->
		<div class="hidden lg:block">
			<StickyNavbar navList={navListWithClicks} {activeSection} />

			<div id="features" data-section="features" class="section">
				<TwoColumnWithLeftHeading contents={content.features} />
			</div>

			<div id="benefits" data-section="benefits" class="section">
				<TwoColumnWithLeftHeading contents={content.benefits} />
			</div>

			<div id="eligibility" data-section="eligibility" class="section">
				<ButtonBanner contents={content.willApprove} />
				<AboveTitleWithTopIconCard contents={content.eligibility.contents} />

				<div id="bt">
					<TwoColumnWithLeftHeading contents={content.bt.contents} />
					<div
						class="w-full border-b border-[var(--form-border)] px-[0.5rem] py-[4rem] lg:px-[4rem]"
					>
						<div class="flex w-full flex-col items-center justify-center gap-8 md:gap-16 lg:w-auto">
							<h2 class="typography-h2-md text-center text-[var(--form-text)]">
								{content.topUp.heading}
							</h2>
							<p
								class="typography-body-md text-center text-[var(--form-text-secondary)] lg:w-8/12 lg:justify-self-end"
							>
								{content.topUp.para}
							</p>
						</div>
					</div>
				</div>

				<ThreeColumWithLeftHeading contents={visionBannerWithClicks} />
			</div>

			<div id="steps" data-section="steps" class="section">
				<TwoColumnWithImage contents={content.steps.contents}>
					<div class="typography-body-md text-[var(--form-text-secondary)]">
						<ul class="list-disc space-y-4">
							{#each content.steps.list as item}
								<li class="flex items-start gap-1">
									<img src="/icons/circle-check.svg" alt="circle-check-icon" class="mt-1 h-4" />
									<span>
										<strong>{item.bold}</strong>
										{item.text}
									</span>
								</li>
							{/each}
						</ul>
					</div>
				</TwoColumnWithImage>
			</div>

			<div id="tools" data-section="tools" class="section">
				<AboveTitleWithTopIconCard contents={content.tools.moneyMap} />
				<AboveTitleWithBlackCard contents={content.tools.calculators} />
				<ButtonBanner contents={content.tools.buttonBanner} />
			</div>
		</div>

		<!-- mobile view -->
		<div class="block lg:hidden">
			{#each content.mobileNavbarTitle as list, index (list)}
				<details
					class="dropdown border-bgBtn col-span-3 bg-[var(--landing-bg-card)] text-[var(--form-text)] {index <
					content.mobileNavbarTitle.length - 1
						? 'border-b border-[var(--form-border)]'
						: ''}"
				>
					<summary
						class="cursor-pointer list-none px-[1rem] py-[1.5rem]"
						onclick={(e) => toggleDropdown(e, index)}
					>
						<div class="mx-auto flex w-full items-center justify-between gap-4">
							<h2 class="typography-label text-[var(--form-text)]">{list}</h2>
							<div class="icon-container typography-h3 justify-self-end">
								<span>
									<i
										class="fa-solid fa-angle-down faq-icon text-[var(--form-text)] transition-transform duration-300"
									></i>
								</span>
							</div>
						</div>
					</summary>

					{#if index == 0}
						<div
							id="features"
							class="bg-[var(--landing-bg)] px-[0.5rem] pb-4 text-[var(--form-text)]"
						>
							<TwoColumnWithLeftHeading contents={content.features} />
						</div>
					{:else if index == 1}
						<div
							id="benefits"
							class="bg-[var(--landing-bg)] px-[0.5rem] pb-4 text-[var(--form-text)]"
						>
							<TwoColumnWithLeftHeading contents={content.benefits} />
						</div>
					{:else if index == 2}
						<div
							id="eligibility"
							class="bg-[var(--landing-bg)] px-[0.5rem] pb-4 text-[var(--form-text)]"
						>
							<ButtonBanner contents={content.willApprove} />
							<AboveTitleWithTopIconCard contents={content.eligibility.contents} />

							<div id="bt">
								<TwoColumnWithLeftHeading contents={content.bt.contents} />
								<div
									class="w-full border-b border-[var(--form-border)] px-[0.5rem] py-[4rem] lg:px-[4rem]"
								>
									<div
										class="flex w-full flex-col items-center justify-center gap-8 md:gap-16 lg:w-auto"
									>
										<h2 class="typography-h2-md text-center text-[var(--form-text)]">
											{content.topUp.heading}
										</h2>
										<p
											class="typography-body-md text-center text-[var(--form-text-secondary)] lg:w-8/12 lg:justify-self-end"
										>
											{content.topUp.para}
										</p>
									</div>
								</div>
							</div>

							<ThreeColumWithLeftHeading contents={visionBannerWithClicks} />
						</div>
					{:else if index == 3}
						<div id="steps" class="bg-[var(--landing-bg)] px-[0.5rem] pb-4 text-[var(--form-text)]">
							<TwoColumnWithImage contents={content.steps.contents}>
								<div class="typography-body-md text-[var(--form-text-secondary)]">
									<ul class="list-disc space-y-4">
										{#each content.steps.list as item}
											<li class="flex items-start gap-1">
												<img
													src="/icons/circle-check.svg"
													alt="circle-check-icon"
													class="mt-1 h-4"
												/>
												<span>
													<strong>{item.bold}</strong>
													{item.text}
												</span>
											</li>
										{/each}
									</ul>
								</div>
							</TwoColumnWithImage>
						</div>
					{:else if index == 4}
						<div id="tools" class="bg-[var(--landing-bg)] px-[0.5rem] pb-4 text-[var(--form-text)]">
							<AboveTitleWithTopIconCard contents={content.tools.moneyMap} />
							<AboveTitleWithBlackCard contents={content.tools.calculators} />
							<ButtonBanner contents={content.tools.buttonBanner} />
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
					btnClass={content.messageUs.button.btnClass}
					btnName={content.messageUs.button.btnName}
				/>
			</div>
		</TwoColumnWithImage>

		<div slot="secondary">
			<HelpList contents={content.common_components.helpList.contents} />
			<ThingsYouShould
				thinkKnow={content.common_components.thinkYouShouldKnow}
				disc="list-decimal"
			/>
		</div>
	</NewPageLayout>
</section>

<style>
	.section {
		scroll-margin-top: 4rem;
	}
</style>
