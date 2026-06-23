<script lang="ts">
	import NewPageLayout from './NewPageLayout.svelte';
	import TwoColumnWithLeftHeading from './TwoColumnWithLeftHeading.svelte';
	import TwoColumnWithImage from './TwoColumnWithImage.svelte';
	import HelpList from './HelpList.svelte';
	import Button from './Button.svelte';
	import ThreeColumWithLeftHeading from './ThreeColumWithLeftHeading.svelte';
	import AboveTitleWithoutIconCard from './AboveTitleWithoutIconCard.svelte';
	import Seo from './Seo.svelte';
	import StickyNavbar from './StickyNavbar.svelte';
	import { applicationData } from '$lib/stores/stores';
	import { onMount } from 'svelte';
	import content from '$lib/data/website/dataConsolidation.json';
	import { ChevronDown } from '$lib/utils/iconRegistry';
	import { toggleDropdown } from '$lib/utils/toggleDropdown';

	let { pageData = content.pageData }: { pageData?: any } = $props();

	const pageDataWithClicks = $derived({
		...pageData,
		actionBtns: pageData.actionBtns.map((btn: any) => {
			if (btn.btnLink === '/get-started/how-can-we-help' || btn.btnName === 'Check Offers') {
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
			if (btn.btnLink === '/get-started/how-can-we-help' || btn.btnName === 'Apply Online') {
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

	const getStartedButtonWithClicks = $derived({
		...content.getStarted.button,
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
		<div class="hidden lg:block">
			<StickyNavbar navList={navListWithClicks} {activeSection} />

			<div id="debtConsolidation" data-section="debtConsolidation">
				<TwoColumnWithLeftHeading contents={content.what} isBorder />
				<AboveTitleWithoutIconCard contents={content.popularOptions} isBorder />
			</div>

			<div id="benefitConsolidation" data-section="benefitConsolidation">
				<TwoColumnWithLeftHeading contents={content.benefits} isBorder />
			</div>

			<div id="drawbacks" data-section="drawbacks">
				<TwoColumnWithLeftHeading contents={content.drawbacks} isBorder />
			</div>

			<div id="isRight" data-section="isRight">
				<TwoColumnWithLeftHeading contents={content.isRight} isBorder />

				<TwoColumnWithImage contents={content.getStarted.contents} isBorder>
					<div class="typography-body-md text-[var(--form-text-secondary)]">
						{@html content.getStarted.text}
						<Button
							link={getStartedButtonWithClicks.link}
							btnClass={getStartedButtonWithClicks.btnClass}
							btnName={getStartedButtonWithClicks.btnName}
						/>
					</div>
				</TwoColumnWithImage>

				<TwoColumnWithLeftHeading contents={content.conclusion} isBorder />
			</div>
		</div>

		<div class="lg:hidden">
			{#each content.mobileNavbarTitle as navBar, index (navBar)}
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
							<h2 class="typography-label">{navBar}</h2>
							<div class="justify-self-end">
								<ChevronDown class="faq-icon transition-transform duration-300" />
							</div>
						</div>
					</summary>

					{#if index == 0}
						<div id="debtConsolidation" class="bg-[var(--landing-bg)] pb-4 text-[var(--form-text)]">
							<TwoColumnWithLeftHeading contents={content.what} isBorder />
							<AboveTitleWithoutIconCard contents={content.popularOptions} />
						</div>
					{:else if index == 1}
						<div
							id="benefitConsolidation"
							class="bg-[var(--landing-bg)] pb-4 text-[var(--form-text)]"
						>
							<TwoColumnWithLeftHeading contents={content.benefits} />
						</div>
					{:else if index == 2}
						<div id="drawbacks" class="bg-[var(--landing-bg)] pb-4 text-[var(--form-text)]">
							<TwoColumnWithLeftHeading contents={content.drawbacks} />
						</div>
					{:else if index == 3}
						<div id="isRight" class="bg-[var(--landing-bg)] pb-4 text-[var(--form-text)]">
								<TwoColumnWithLeftHeading contents={content.isRight} isBorder/>
								<TwoColumnWithImage contents={content.getStarted.contents} isBorder>
									<div class="typography-body-md text-[var(--form-text-secondary)]">
										{@html content.getStarted.text}
										<Button
											link={getStartedButtonWithClicks.link}
											btnClass={getStartedButtonWithClicks.btnClass}
											btnName={getStartedButtonWithClicks.btnName}
										/>
									</div>
								</TwoColumnWithImage>
								<TwoColumnWithLeftHeading contents={content.conclusion} isBorder/>
						</div>
					{/if}
				</details>
			{/each}
		</div>

		<TwoColumnWithImage contents={content.messageUs}>
			<p class="typography-body-md text-[var(--form-text-secondary)]">{content.messageUs.text}</p>
			<Button
				link={content.messageUs.button.link}
				btnClass={getStartedButtonWithClicks.btnClass}
				btnName={content.messageUs.button.btnName}
			/>
		</TwoColumnWithImage>

		{#snippet secondary()}
			<HelpList contents={content.common_components.helpList.contents} />
		{/snippet}
	</NewPageLayout>
</section>
