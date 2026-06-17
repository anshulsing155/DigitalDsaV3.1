<script lang="ts">
	import { onMount } from 'svelte';
	import StickyNavbar from './StickyNavbar.svelte';
	import NewPageLayout from './NewPageLayout.svelte';
	import ThreeColumWithLeftHeading from './ThreeColumWithLeftHeading.svelte';
	import TwoColumnWithImage from './TwoColumnWithImage.svelte';
	import ThingsYouShould from './ThingsYouShould.svelte';
	import AboveTitleWithTopIconCard from './AboveTitleWithTopIconCard.svelte';
	import Button from './Button.svelte';
	import HelpList from './HelpList.svelte';
	import Seo from './Seo.svelte';
	import { applicationData } from '$lib/stores/stores';
	import content from '$lib/data/website/businessFinancialHealth.json';
	import { ChevronDown } from '$lib/utils/iconRegistry';
	import { toggleDropdown } from '$lib/utils/toggleDropdown';

	let { pageData = content.pageData }: { pageData?: any } = $props();

	const pageDataWithClicks = $derived({
		...pageData,
		actionBtns: pageData.actionBtns.map((btn: any) => {
			if (btn.btnLink === '/get-started/how-can-we-help' || btn.btnName === 'Compare offers') {
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
			if (btn.btnLink === '/get-started/how-can-we-help' || btn.btnName === 'Compare offers') {
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

			<div id="metrics" data-section="metrics">
				<ThreeColumWithLeftHeading contents={content.metrics} />
			</div>

			<div class="border-b border-[var(--form-border)]" id="evaluation" data-section="evaluation">
				<ThingsYouShould thinkKnow={content.evaluation} disc="list-disc" />
			</div>

			<div id="action" data-section="action">
				<AboveTitleWithTopIconCard contents={content.action} />
			</div>
		</div>

		<!-- mobile view -->
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
						<div id="ready" class="bg-[var(--landing-bg)] px-[0.5rem] pb-4 text-[var(--form-text)]">
							<ThreeColumWithLeftHeading contents={content.metrics} />
						</div>
					{:else if index == 1}
						<div
							id="challenges"
							class="bg-[var(--landing-bg)] px-[0.5rem] pb-4 text-[var(--form-text)]"
						>
							<ThingsYouShould thinkKnow={content.evaluation} disc="list-disc" />
						</div>
					{:else if index == 2}
						<div id="help" class="bg-[var(--landing-bg)] px-[0.5rem] pb-4 text-[var(--form-text)]">
							<AboveTitleWithTopIconCard contents={content.action} />
						</div>
					{/if}
				</details>
			{/each}
		</div>

		<TwoColumnWithImage contents={content.messageUs}>
			<p>{content.messageUs.text}</p>
			<div class="w-auto">
				<Button link="/contact" btnClass="btn-secondary" btnName="Message us" />
			</div>
		</TwoColumnWithImage>

		<div
			class="flex flex-col gap-[1rem] px-[0.5rem] py-[4rem] lg:px-16 lg:py-0 lg:pt-[4rem] lg:pb-[8rem]"
		>
			<h2 class="typography-body-lg !font-semibold text-[var(--form-text)]">
				{content.conclusion.heading}
			</h2>
			<p class="typography-body-sm text-[var(--form-text-secondary)]">{content.conclusion.text}</p>
		</div>

		<div slot="secondary">
			<HelpList contents={content.common_components.helpList.contents} />
			<ThingsYouShould
				thinkKnow={content.common_components.thinkYouShouldKnow}
				disc="list-decimal"
				containerClass="px-0"
			/>
		</div>
	</NewPageLayout>
</section>
