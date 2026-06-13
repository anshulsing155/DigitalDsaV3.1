<script lang="ts">
	import NewPageLayout from './NewPageLayout.svelte';
	import TwoColumn from './TwoColumn.svelte';
	import ThingsYouShould from './ThingsYouShould.svelte';
	import StickyNavbar from './StickyNavbar.svelte';
	import AboveTitleWithoutIconCard from './AboveTitleWithoutIconCard.svelte';
	import PaymentTable from './PaymentTable.svelte';
	import ThreeColumWithLeftHeading from './ThreeColumWithLeftHeading.svelte';
	import TwoColumnWithImage from './TwoColumnWithImage.svelte';
	import HelpList from './HelpList.svelte';
	import Seo from './Seo.svelte';
	import { onMount } from 'svelte';
	import { applicationData } from '$lib/stores/stores';
	import { ChevronDown } from '$lib/utils/iconRegistry';
	import content from '$lib/data/website/homeLoanProcess.json';

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

	let { pageData = content.pageData }: { pageData?: PageDataProps } = $props();

	// Inject store update callbacks dynamically for get-started actions
	const pageDataWithClicks = $derived({
		...pageData,
		coverAlt: pageData.coverAlt || pageData.altName || '',
		actionBtns: pageData.actionBtns.map((btn) => {
			if (btn.btnLink === '/get-started/how-can-we-help' || btn.btnName === 'Compare offers') {
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
			if (btn.btnLink === '/get-started/how-can-we-help' || btn.btnName === 'Compare offers') {
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
				name: 'Understanding Home Loan Process',
				item: 'https://www.digitaldsa.com/home-loan/understanding-home-loan-process'
			}
		]
	};
</script>

<svelte:head>
	{@html `<script type="application/ld+json">${JSON.stringify(breadcrumbSchema)}</script>`}
</svelte:head>

<Seo
	type="WebPage"
	title="Home Buying Process: Legal, Documentation & Key Pitfalls"
	image={pageData.coverImage}
	description="Understand the home buying legal process, essential documents, property laws, stamp duty & pitfalls to ensure a smooth home purchase."
	keywords="Home buying process, Property legal verification, Home loan documents, Stamp duty and registration, Property title verification, RERA registration, Real estate legal guide, Buying a house checklist, Property legal pitfalls, Home loan approval process"
/>

<section class="content">
	<NewPageLayout pageData={pageDataWithClicks}>
		<!-- desktop view -->
		<div class="hidden lg:block">
			<div>
				<StickyNavbar navList={navListWithClicks} {activeSection} />
			</div>

			<div id="laws" data-section="laws" class="section">
				<div class="border-[var(--form-border)] border-b lg:px-[4rem]">
					<ThingsYouShould
						thinkKnow={{
							heading: content.laws.heading,
							subPara: content.laws.subPara,
							paraGraph: content.laws.paraGraph,
							bottomPara: content.laws.bottomPara
						}}
						disc="list-disc"
					/>
				</div>
			</div>

			<div id="document" data-section="document" class="section">
				<AboveTitleWithoutIconCard contents={content.document.contents}>
					<p class="typography-body-sm text-[var(--form-text-secondary)]">
						{@html content.document.proTip}
					</p>
				</AboveTitleWithoutIconCard>
			</div>

			<div id="charges" data-section="charges" class="section">
				<div class="border-[var(--form-border)] border-b lg:px-[4rem]">
					<TwoColumn
						cardImage={content.charges.cardImage}
						cardAltName={content.charges.cardAltName}
						cardHeading={content.charges.cardHeading}
					>
						<div class="typography-body-md space-y-6 text-[var(--form-text-secondary)]" slot="list">
							<p>{content.charges.para1}</p>
							<ul class="typography-body-md grid gap-[2rem] text-[var(--form-text-secondary)]">
								<div>
									{#each content.charges.firstTableData as tableData}
										<PaymentTable {tableData} />
									{/each}
								</div>
							</ul>
							<p>{@html content.charges.proTip}</p>
						</div>
					</TwoColumn>
				</div>
			</div>

			<div id="possession" data-section="possession" class="section">
				<div class="border-[var(--form-border)] border-b lg:px-[4rem]">
					<ThingsYouShould
						thinkKnow={{
							heading: content.possession.heading,
							subPara: content.possession.subPara,
							paraGraph: content.possession.paraGraph,
							bottomPara: content.possession.bottomPara
						}}
						disc="list-disc"
					/>
				</div>
			</div>

			<div id="pitfalls" data-section="pitfalls" class="section">
				<TwoColumnWithImage contents={content.pitfalls}>
					<div class="typography-body-sm flex flex-col gap-4 text-[var(--form-text-secondary)]">
						<p>{content.pitfalls.para}</p>
						<div class="space-y-4">
							<h3 class="typography-h3 font-semibold text-[var(--form-text)]">
								{content.pitfalls.subHeading}
							</h3>
							<ul class="list-disc space-y-3 pl-5">
								{#each content.pitfalls.bullets as bullet}
									<li>{@html bullet}</li>
								{/each}
							</ul>
						</div>
						<p>{@html content.pitfalls.proTip}</p>
					</div>
				</TwoColumnWithImage>
			</div>

			<div class="section">
				<ThreeColumWithLeftHeading contents={content.checklist} />
			</div>
		</div>

		<!-- mobile view -->
		<div class="block lg:hidden">
			{#each content.mobileNavbarTitle as list, index}
				<details
					class="dropdown col-span-3 bg-[var(--landing-bg-card)] {index <
					content.mobileNavbarTitle.length - 1
						? 'border-b border-[var(--form-border)]'
						: ''}"
				>
					<summary
						class="col-span-3 cursor-pointer list-none px-[1rem] py-[1.5rem]"
						onclick={(e) => toggleDropdown(e, index)}
					>
						<div class="mx-auto flex w-full items-center justify-between gap-4">
							<h2 class="text-[var(--form-text)] typography-label">{list}</h2>
							<div class="text-[var(--form-text)] justify-self-end">
								<ChevronDown />
							</div>
						</div>
					</summary>

					{#if index === 0}
						<div
							id="laws"
							class="bg-[var(--landing-bg)] px-[0.5rem] pb-4 "
						>
							<ThingsYouShould
								thinkKnow={{
									heading: content.laws.heading,
									subPara: content.laws.subPara,
									paraGraph: content.laws.paraGraph,
									bottomPara: content.laws.bottomPara
								}}
								disc="list-disc"
							/>
						</div>
					{:else if index === 1}
						<div id="document" class="bg-[var(--landing-bg)] px-[0.5rem] pb-4">
							<AboveTitleWithoutIconCard contents={content.document.contents}>
								<p class="typography-body-sm text-[var(--form-text-secondary)]">
									{@html content.document.proTip}
								</p>
							</AboveTitleWithoutIconCard>
						</div>
					{:else if index === 2}
						<div
							id="charges"
							class="bg-[var(--landing-bg)] px-[0.5rem] pb-4 "
						>
							<TwoColumn
								cardImage={content.charges.cardImage}
								cardAltName={content.charges.cardAltName}
								cardHeading={content.charges.cardHeading}
							>
								<div class="typography-body-md space-y-6 text-text-light" slot="list">
									<p>{content.charges.para1}</p>
									<ul class="typography-body-md grid gap-[2rem] text-text-light">
										<div>
											{#each content.charges.firstTableData as tableData}
												<PaymentTable {tableData} />
											{/each}
										</div>
									</ul>
									<p>{@html content.charges.proTip}</p>
								</div>
							</TwoColumn>
						</div>
					{:else if index === 3}
						<div
							id="possession"
							class="bg-[var(--landing-bg)] px-[0.5rem] pb-4 "
						>
							<ThingsYouShould
								thinkKnow={{
									heading: content.possession.heading,
									subPara: content.possession.subPara,
									paraGraph: content.possession.paraGraph,
									bottomPara: content.possession.bottomPara
								}}
								disc="list-disc"
							/>
						</div>
					{:else if index === 4}
						<div
							id="pitfalls"
							class="bg-[var(--landing-bg)] px-[0.5rem] pb-4"
						>
							<TwoColumnWithImage contents={content.pitfalls}>
								<div class="typography-body-sm space-y-6 text-[var(--form-text-secondary)]">
									<p>{content.pitfalls.para}</p>
									<div class="space-y-4">
										<h3 class="typography-h3 font-semibold text-text-main dark:text-white">
											{content.pitfalls.subHeading}
										</h3>
										<ul class="list-disc space-y-3 pl-5">
											{#each content.pitfalls.bullets as bullet}
												<li>{@html bullet}</li>
											{/each}
										</ul>
									</div>
									<p>{@html content.pitfalls.proTip}</p>
								</div>
							</TwoColumnWithImage>

							<ThreeColumWithLeftHeading contents={content.checklist} />
						</div>
					{/if}
				</details>
			{/each}
		</div>

		<div slot="secondary" class="px-2">
			<HelpList contents={content.common_components.helpList.contents} />

			<ThingsYouShould
				thinkKnow={{
					heading: 'Things you should know',
					paraGraph: content.common_components.thinkYouShouldKnow.bullets
				}}
				disc="list-decimal"
			/>
		</div>
	</NewPageLayout>
</section>

<style>
	.section {
		scroll-margin-top: 5rem;
	}
</style>
