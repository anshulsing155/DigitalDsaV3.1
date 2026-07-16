<script lang="ts">
	import { onMount } from 'svelte';
	import StickyNavbar from '../layout/StickyNavbar.svelte';
	import NewPageLayout from '../layout/NewPageLayout.svelte';
	import TwoColumnWithLeftHeading from './TwoColumnWithLeftHeading.svelte';
	import ButtonBanner from './ButtonBanner.svelte';
	import ThreeColumWithLeftHeading from './ThreeColumWithLeftHeading.svelte';
	import Button from '../ui/Button.svelte';
	import WeAreHereHelp from './WeAreHereHelp.svelte';
	import ThingsYouShould from './ThingsYouShould.svelte';
	import TwoColumnWithImage from './TwoColumnWithImage.svelte';
	import Seo from '../Seo.svelte';
	import { applicationData } from '$lib/stores/stores';
	import content from '$lib/data/website/lapBTWithTopUp.json';
	import { ChevronDown } from '$lib/utils/iconRegistry';
	import { toggleDropdown } from '$lib/utils/toggleDropdown';
	import HelpList from './HelpList.svelte';

	let { pageData = content.pageData }: { pageData?: any } = $props();

	const pageDataWithClicks = $derived({
		...pageData,
		actionBtns: pageData.actionBtns.map((btn: any) => {
			if (btn.btnLink === '/get-started/how-can-we-help' || btn.btnName === 'Compare best rates') {
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
			if (btn.btnLink === '/get-started/how-can-we-help' || btn.btnName === 'Compare best rates') {
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

	const whenToOptBannerWithClicks = $derived({
		...content.whenToOpt.buttonBanner,
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

<section class="content">
	<NewPageLayout pageData={pageDataWithClicks}>
		<!-- desktop view -->
		<div class="hidden lg:block">
			<StickyNavbar navList={navListWithClicks} {activeSection} />

			<div id="what-why" data-section="what-why">
				<TwoColumnWithLeftHeading contents={content.what} isBorder />
				<ThreeColumWithLeftHeading contents={content.why} isBorder />
				<ThreeColumWithLeftHeading contents={content.keyBenefits} isBorder />
			</div>

			<div id="eligibility" data-section="eligibility">
				<ThreeColumWithLeftHeading contents={content.eligibility} isBorder />
				<ThreeColumWithLeftHeading contents={content.documents} isBorder />
			</div>

			<div id="process" data-section="process">
				<TwoColumnWithLeftHeading contents={content.process} isBorder />
			</div>

			<div id="when-to-opt" data-section="when-to-opt">
				<ThreeColumWithLeftHeading contents={content.whenToOpt} isBorder />
				<ButtonBanner contents={whenToOptBannerWithClicks} isBorder />
			</div>
		</div>

		<!-- mobile view -->
		<div class="block lg:hidden">
			{#each content.mobileNavbarTitle as list, index (list)}
				<details
					class="dropdown bg-darkColor col-span-3 text-white {index <
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
						<div id="what-why" class="bg-[var(--landing-bg)] pb-4 text-[var(--form-text)]">
							<TwoColumnWithLeftHeading contents={content.what} isBorder />
							<ThreeColumWithLeftHeading contents={content.why} isBorder />
							<ThreeColumWithLeftHeading contents={content.keyBenefits} />
						</div>
					{:else if index == 1}
						<div id="eligibility" class="bg-[var(--landing-bg)] pb-4 text-[var(--form-text)]">
							<div class="border-b border-[var(--form-border)]">
								<ThreeColumWithLeftHeading contents={content.eligibility} isBorder />
							</div>
							<ThreeColumWithLeftHeading contents={content.documents} />
						</div>
					{:else if index == 2}
						<div id="process" class="bg-[var(--landing-bg)] pb-4 text-[var(--form-text)]">
							<TwoColumnWithLeftHeading contents={content.process} />
						</div>
					{:else if index == 3}
						<div id="when-to-opt" class="bg-[var(--landing-bg)] pb-4 text-[var(--form-text)]">
							<ThreeColumWithLeftHeading contents={content.whenToOpt} isBorder />
							<ButtonBanner contents={whenToOptBannerWithClicks} isBorder/>
						</div>
					{/if}
				</details>
			{/each}
		</div>

		<TwoColumnWithImage contents={content.messageUs}>
			<p>{content.messageUs.text}</p>
			<div class="w-full lg:w-auto">
				<Button link="/contact" btnClass="btn-primary" btnName="Message us" />
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
