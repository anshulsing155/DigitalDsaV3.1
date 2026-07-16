<script lang="ts">
	import { onMount } from 'svelte';
	import StickyNavbar from '../layout/StickyNavbar.svelte';
	import NewPageLayout from '../layout/NewPageLayout.svelte';
	import ThreeColumWithLeftHeading from './ThreeColumWithLeftHeading.svelte';
	import TwoColumnWithImage from './TwoColumnWithImage.svelte';
	import TwoColumnWithLeftHeading from './TwoColumnWithLeftHeading.svelte';
	import ThingsYouShould from './ThingsYouShould.svelte';
	import HelpList from './HelpList.svelte';
	import Button from '../ui/Button.svelte';
	import PaymentTable from '../features/calculators/PaymentTable.svelte';
	import ButtonBanner from './ButtonBanner.svelte';
	import { applicationData } from '$lib/stores/stores';
	import AboveTitleWithBlackCard from './AboveTitleWithBlackCard.svelte';
	import AboveTitleWithoutIconCard from './AboveTitleWithoutIconCard.svelte';
	import AboveTitleWithTopIconCard from './AboveTitleWithTopIconCard.svelte';
	import Seo from '../layout/Seo.svelte';
	import content from '$lib/data/website/agriculturalToResidential.json';
	import { ChevronDown } from '$lib/utils/iconRegistry';
	import { toggleDropdown } from '$lib/utils/toggleDropdown';

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
			if (
				btn.btnLink === '/get-started/how-can-we-help' ||
				btn.btnName === 'Compare rates' ||
				btn.btnName === 'Check lowest rates'
			) {
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
			if (
				btn.btnLink === '/get-started/how-can-we-help' ||
				btn.btnName === 'Compare rates' ||
				btn.btnName === 'Check lowest rates'
			) {
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
		...content.visionBanner,
		btnClick: () => {
			applicationData.update((data) => {
				data.LoanName = 'Plot Loan';
				data.LoanType = 'Construction Loan Only';
				return data;
			});
		}
	});

	let activeSection = $state('');
	let zoneTable = content.zoneTable;

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

	
</script>

<Seo
	type={content.seo.type}
	title={content.seo.title}
	image={content.seo.image}
	description={content.seo.description}
	keywords={content.seo.keywords}
/>

<section class="">
	<NewPageLayout pageData={pageDataWithClicks}>
		<!-- desktop view -->
		<div class="hidden lg:block">
			<StickyNavbar navList={navListWithClicks} {activeSection} />

			<div id="benefits" data-section="benefits" class="section">
				<ThreeColumWithLeftHeading contents={content.benefits} isBorder/>

				<div
					class="w-full border-b border-[var(--form-border)] px-[0.5rem] py-[4rem] lg:px-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem]"
				>
					<div class="space-y-[3rem]">
						<h2 class="typography-h2-md text-center font-semibold text-[var(--form-text)]">
							Key Factors to Consider Before <br />
							<span class="underline decoration-primary decoration-4 underline-offset-4">
								Building on Agricultural Land
							</span>
						</h2>

						<ul class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
							{#each content.keyFactors.list as factor}
								<li>
									<div class="space-y-3">
										<h3 class="typography-body-lg !font-semibold text-[var(--form-text)]">
											{factor.title}
										</h3>
										<ul class="typography-body-md list-disc pl-4 text-[var(--form-text-secondary)]">
											{#each factor.items as item}
												<li>{item}</li>
											{/each}
										</ul>
									</div>
								</li>
							{/each}
						</ul>

						<div class="">
							{#each zoneTable as tableData}
								<PaymentTable {tableData} />
							{/each}
						</div>
					</div>
				</div>
			</div>

			<div id="process" data-section="process" class="section">
				<TwoColumnWithImage contents={content.process.contents} isBorder>
					<ul class="list-disc space-y-4">
						{#each content.process.list as item}
							<li class="flex items-start gap-1">
								<img src="/icons/circle-check.svg" alt="circle-check" class="mt-1 h-4" />
								<p class="typography-body-md text-[var(--form-text-secondary)]">
									<span class="font-semibold">{item.bold}</span>{@html item.text}
								</p>
							</li>
						{/each}
					</ul>
				</TwoColumnWithImage>

				<TwoColumnWithLeftHeading contents={visionBannerWithClicks} isBorder />
			</div>

			<div id="challenges" data-section="challenges" class="section">
				<TwoColumnWithLeftHeading contents={content.challenges.contents} isBorder />
				<AboveTitleWithoutIconCard contents={content.finances.contents} isBorder/>
				<AboveTitleWithTopIconCard contents={content.deniedOptions.contents}  isBorder/>
			</div>

			<div id="tools" data-section="tools" class="section">
				<AboveTitleWithTopIconCard contents={content.tools.moneyMap} isBorder/>
				<AboveTitleWithBlackCard contents={content.tools.calculators} isBorder />
				<ButtonBanner contents={content.tools.buttonBanner} isBorder/>
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
						class="col-span-3 cursor-pointer list-none px-[1rem] py-[1.5rem] bg-ddsa-gradient-primary text-white"
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
							id="benefits"
							class="bg-[var(--landing-bg)] text-[var(--form-text)]"
						>
							<ThreeColumWithLeftHeading contents={content.benefits} isBorder />

							<div class="w-full px-[0.5rem] py-[4rem]">
								<div class="space-y-[3rem]">
									<h2 class="typography-h2-md text-center font-semibold text-[var(--form-text)]">
										Key Factors to Consider Before <br />
										<span class="underline decoration-primary decoration-4 underline-offset-4">
											Building on Agricultural Land
										</span>
									</h2>

									<ul class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
										{#each content.keyFactors.list as factor}
											<li>
												<div class="space-y-3">
													<h3 class="typography-body-lg !font-semibold text-[var(--form-text)]">{factor.title}</h3>
													<ul class="typography-body-md list-disc pl-4 text-[var(--form-text-secondary)]">
														{#each factor.items as item}
															<li>{item}</li>
														{/each}
													</ul>
												</div>
											</li>
										{/each}
									</ul>

									<div class="">
										{#each zoneTable as tableData}
											<PaymentTable {tableData} />
										{/each}
									</div>
								</div>
							</div>
						</div>
					{:else if index == 1}
						<div
							id="process"
							class="bg-[var(--landing-bg)]text-[var(--form-text)]"
						>
							<TwoColumnWithImage contents={content.process.contents} isBorder>
								<div class="">
									<ul class="list-disc space-y-4">
										{#each content.process.list as item}
											<li class="flex items-start gap-1">
												<img src="/icons/circle-check.svg" alt="circle-check" class="mt-1 h-4" />
												<p class="typography-body-md text-[var(--form-text-secondary)]">
													<span class="font-semibold">{item.bold}</span>{@html item.text}
												</p>
											</li>
										{/each}
									</ul>
								</div>
							</TwoColumnWithImage>

							<TwoColumnWithLeftHeading contents={visionBannerWithClicks} />
						</div>
					{:else if index == 2}
						<div
							id="challenges"
							class="bg-[var(--landing-bg)] text-[var(--form-text)]"
						>
							<TwoColumnWithLeftHeading contents={content.challenges.contents} isBorder />
							<AboveTitleWithoutIconCard contents={content.finances.contents} isBorder />
							<AboveTitleWithTopIconCard contents={content.deniedOptions.contents} />
						</div>
					{:else if index == 3}
						<div id="tools" class="bg-[var(--landing-bg)] text-[var(--form-text)]">
							<AboveTitleWithTopIconCard contents={content.tools.moneyMap} isBorder />
							<AboveTitleWithBlackCard contents={content.tools.calculators} />
							<ButtonBanner contents={content.tools.buttonBanner} isBorder />
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

		{#snippet secondary()}
			<HelpList contents={content.common_components.helpList.contents} isBorder />
			<ThingsYouShould
				thinkKnow={content.common_components.thinkYouShouldKnow}
				disc="list-decimal"
				containerClass="px-0"
			/>
		{/snippet}
	</NewPageLayout>
</section>

<style>
	.section {
		scroll-margin-top: 4rem;
	}
</style>
