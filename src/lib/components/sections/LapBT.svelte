<script lang="ts">
	import { onMount } from 'svelte';
	import StickyNavbar from '../layout/StickyNavbar.svelte';
	import NewPageLayout from '../layout/NewPageLayout.svelte';
	import ThreeColumWithLeftHeading from './ThreeColumWithLeftHeading.svelte';
	import TwoColumnWithImage from './TwoColumnWithImage.svelte';
	import ThingsYouShould from '$lib/components/sections/ThingsYouShould.svelte';
	import HelpList from '$lib/components/sections/HelpList.svelte';
	import ButtonBanner from './ButtonBanner.svelte';
	import FeedbackCheck from '../ui/FeedbackCheck.svelte';
	import { applicationData } from '$lib/stores/stores';
	import Seo from '../layout/Seo.svelte';
	import content from '$lib/data/website/lapBT.json';
	import { ChevronDown } from '$lib/utils/iconRegistry';
	import { toggleDropdown } from '$lib/utils/toggleDropdown';

	let { pageData = content.pageData }: { pageData?: any } = $props();

	const pageDataWithClicks = $derived({
		...pageData,
		actionBtns: pageData.actionBtns.map((btn: any) => {
			if (btn.btnLink === '/get-started/how-can-we-help' || btn.btnName === 'Compare LAP Offers') {
				return {
					...btn,
					btnClick: () => {
						applicationData.update((data) => {
							data.LoanName = 'LAP Balance Transfer';
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
		actionBtns: content.navList.actionBtns.map((btn: any) => {
			if (btn.btnLink === '/get-started/how-can-we-help' || btn.btnName === 'Compare LAP Offers') {
				return {
					...btn,
					btnClick: () => {
						applicationData.update((data) => {
							data.LoanName = 'LAP Balance Transfer';
							return data;
						});
					}
				};
			}
			return btn;
		})
	});

	const buttonBannerWithClicks = $derived({
		...content.buttonBanner,
		btnClick: () => {
			applicationData.update((data) => {
				data.LoanName = 'Loan Against Property';
				return data;
			});
		}
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
</script>

<Seo
	type={content.seo.type}
	title={content.seo.title}
	image={content.seo.image}
	description={content.seo.description}
	keywords={content.seo.keywords}
/>

<section>
	<NewPageLayout pageData={pageDataWithClicks}>
		<!-- desktop view -->
		<div class="hidden lg:block">
			<StickyNavbar navList={navListWithClicks} {activeSection} />

			<div id="whyBalanceTransfer" data-section="whyBalanceTransfer">
				<ThreeColumWithLeftHeading contents={content.whyBT} isBorder />
				<ButtonBanner contents={buttonBannerWithClicks} isBorder />
			</div>

			<div id="howDSAHelp" data-section="howDSAHelp">
				<TwoColumnWithImage contents={content.howWeHelp.contents} isBorder>
					<div class="typography-body-md text-[var(--form-text-secondary)]">
						<ul class="typography-body-md list-disc space-y-4">
							{#each content.howWeHelp.list as item}
								<li class="flex items-start gap-2">
									<img src="/icons/circle-check.svg" alt="Check icon" class="mt-1 h-5" />
									<p>
										<span class="font-semibold">{item.bold}</span>
										{@html item.text}
									</p>
								</li>
							{/each}
						</ul>
					</div>
				</TwoColumnWithImage>
				<div class="border-b border-[var(--form-border)]">
					<ThingsYouShould thinkKnow={content.documents} disc="list-disc" />
				</div>
				<ButtonBanner contents={content.buttonBannerITR} isBorder />
			</div>

			<div id="thingConsider" data-section="thingConsider">
				<ThreeColumWithLeftHeading contents={content.things} isBorder />
			</div>

			<div id="calculators" data-section="calculators">
				<ThreeColumWithLeftHeading contents={content.tools} isBorder />
			</div>
		</div>

		<!-- mobile view -->
		<div class="lg:hidden">
			{#each content.mobileNavbarTitle as list, index (list)}
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
						<div class="bg-[var(--landing-bg)] pb-4 text-[var(--form-text)]">
							<ThreeColumWithLeftHeading contents={content.whyBT} />
							<div class="border-t border-[var(--form-border)]">
								<ButtonBanner contents={buttonBannerWithClicks} />
							</div>
						</div>
					{:else if index == 1}
						<div class="bg-[var(--landing-bg)] pb-4 text-[var(--form-text)]">
							<TwoColumnWithImage contents={content.howWeHelp.contents}>
								<div class="typography-body-md text-[var(--form-text-secondary)]">
									<ul
										class="typography-body-md list-disc space-y-4 text-[var(--form-text-secondary)]"
									>
										{#each content.howWeHelp.list as item}
											<li class="flex items-start gap-2">
												<img src="/icons/circle-check.svg" alt="Check icon" class="mt-1 h-5" />
												<p>
													<span class="font-semibold">{item.bold}</span>
													{@html item.text}
												</p>
											</li>
										{/each}
									</ul>
								</div>
							</TwoColumnWithImage>
							<div class="border-t border-[var(--form-border)]">
								<ThingsYouShould thinkKnow={content.documents} disc="list-disc" />
							</div>
							<div class="border-t border-[var(--form-border)]">
								<ButtonBanner contents={content.buttonBannerITR} />
							</div>
						</div>
					{:else if index == 2}
						<div class="bg-[var(--landing-bg)] pb-4 text-[var(--form-text)]">
							<ThreeColumWithLeftHeading contents={content.things} />
						</div>
					{:else if index == 3}
						<div class="bg-[var(--landing-bg)] pb-4 text-[var(--form-text)]">
							<ThreeColumWithLeftHeading contents={content.tools} isBorder/>
						</div>
					{/if}
				</details>
			{/each}
		</div>

		<FeedbackCheck />

		{#snippet secondary()}
			<HelpList contents={content.common_components.helpList.contents} isBorder/>
			<ThingsYouShould
				thinkKnow={content.common_components.thinkYouShouldKnow}
				disc="list-decimal"
				containerClass="px-0"
			/>
		{/snippet}
	</NewPageLayout>
</section>
