<script lang="ts">
	import { onMount } from 'svelte';
	import Button from './Button.svelte';
	import TwoColumn from './TwoColumn.svelte';
	import WeAreHereHelp from '$lib/components/website/WeAreHereHelp.svelte';
	import ThingsYouShould from '$lib/components/website/ThingsYouShould.svelte';
	import { applicationData } from '$lib/stores/stores';
	import StickyNavbar from './StickyNavbar.svelte';
	import ThreeColumWithLeftHeading from './ThreeColumWithLeftHeading.svelte';
	import NewPageLayout from './NewPageLayout.svelte';
	import AboveTitleWithBlackCard from './AboveTitleWithBlackCard.svelte';
	import Seo from './Seo.svelte';
	import TwoColumnWithImage from './TwoColumnWithImage.svelte';
	import content from '$lib/data/website/topUpPlot.json';
	import { ChevronDown } from '$lib/utils/iconRegistry';
	import { toggleDropdown } from '$lib/utils/toggleDropdown';
	import HelpList from './HelpList.svelte';

	let { pageData = content.pageData }: { pageData?: any } = $props();

	const pageDataWithClicks = $derived({
		...pageData,
		actionBtns: pageData.actionBtns.map((btn: any) => {
			if (btn.btnLink === '/get-started/how-can-we-help' || btn.btnName === 'Compare Bank offers') {
				return {
					...btn,
					btnClick: () => {
						applicationData.update((data) => {
							data.LoanName = 'Loan Against Property';
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
			if (btn.btnLink === '/get-started/how-can-we-help' || btn.btnName === 'Compare Bank offers') {
				return {
					...btn,
					btnClick: () => {
						applicationData.update((data) => {
							data.LoanName = 'Loan Against Property';
							return data;
						});
					}
				};
			}
			return btn;
		})
	});

	const exploreWithClicks = $derived({
		...content.consider.explore,
		cardData: content.consider.explore.cardData.map((card: any) => {
			if (card.btnLink === '/get-started/how-can-we-help' || card.btnName === 'View loan offers') {
				return {
					...card,
					btnClick: () => {
						applicationData.update((data) => {
							data.LoanName = 'Loan Against Property';
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
		<div class="hidden lg:block">
			<StickyNavbar navList={navListWithClicks} {activeSection} />

			<div id="requirement" data-section="requirement">
				<ThreeColumWithLeftHeading contents={content.requirement} isBorder />
			</div>
			<div class="border-b border-[var(--form-border)]" id="benefits" data-section="benefits">
				<ThingsYouShould thinkKnow={content.benefits} disc="list-disc" />
			</div>

			<AboveTitleWithBlackCard contents={content.calculators} />

			<div id="eligibility" data-section="eligibility">
				<ThreeColumWithLeftHeading contents={content.eligibility} isBorder />
			</div>

			<div id="process" data-section="process">
				<TwoColumnWithImage contents={content.process.contents} isBorder>
					<div class="typography-body-md text-[var(--form-text-secondary)]">
						<ul class="typography-body-md list-disc space-y-4">
							{#each content.process.list as item}
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
			</div>

			<div id="consider" data-section="consider">
				<div class="border-b border-[var(--form-border)]">
					<ThingsYouShould thinkKnow={content.consider.things} disc="list-disc" />
				</div>

				<ThreeColumWithLeftHeading contents={exploreWithClicks} isBorder />
			</div>
		</div>

		<div class="block lg:hidden">
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
							<ThreeColumWithLeftHeading contents={content.requirement} />
						</div>
					{:else if index == 1}
						<div class="bg-[var(--landing-bg)] pb-4 text-[var(--form-text)]">
							<div class="border-b border-[var(--form-border)]">
								<ThingsYouShould thinkKnow={content.benefits} disc="list-disc" />
							</div>
							<AboveTitleWithBlackCard contents={content.calculators} />
						</div>
					{:else if index == 2}
						<div class="bg-[var(--landing-bg)] pb-4 text-[var(--form-text)]">
							<ThreeColumWithLeftHeading contents={content.eligibility} />
						</div>
					{:else if index == 3}
						<div class="bg-[var(--landing-bg)] pb-4 text-[var(--form-text)]">
							<TwoColumnWithImage contents={content.process.contents}>
								<div class="typography-body-md text-[var(--form-text-secondary)]">
									<ul class="typography-body-md list-disc space-y-4">
										{#each content.process.list as item}
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
						</div>
					{:else if index == 4}
						<div class="bg-[var(--landing-bg)] pb-4 text-[var(--form-text)]">
							<div class="border-b border-[var(--form-border)]">
								<ThingsYouShould thinkKnow={content.consider.things} disc="list-disc" />
							</div>
							<ThreeColumWithLeftHeading contents={exploreWithClicks} isBorder/>
						</div>
					{/if}
				</details>
			{/each}
		</div>

		<div class="">
			<TwoColumnWithImage contents={content.messageUs.contents}>
				<ul class="typography-body-md grid gap-[2rem] text-[var(--form-text-secondary)]">
					<li>{content.messageUs.contents.text}</li>
					<div class="w-auto">
						<Button
							link={content.messageUs.button.link}
							btnClass={content.messageUs.button.btnClass}
							btnName={content.messageUs.button.btnName}
						/>
					</div>
				</ul>
			</TwoColumnWithImage>
		</div>

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
