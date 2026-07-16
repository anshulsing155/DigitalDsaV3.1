<script lang="ts">
	import ThreeColumWithLeftHeading from './ThreeColumWithLeftHeading.svelte';
	import WeAreHereHelp from '$lib/components/website/WeAreHereHelp.svelte';
	import ThingsYouShould from '$lib/components/website/ThingsYouShould.svelte';
	import { onMount } from 'svelte';
	import NewPageLayout from './NewPageLayout.svelte';
	import TwoColumnWithImage from './TwoColumnWithImage.svelte';
	import FeedbackCheck from './FeedbackCheck.svelte';
	import TwoColumnWithLeftHeading from './TwoColumnWithLeftHeading.svelte';
	import AboveTitleWithoutIconCard from './AboveTitleWithoutIconCard.svelte';
	import StickyNavbar from './StickyNavbar.svelte';
	import AboveTitleWithBlackCard from './AboveTitleWithBlackCard.svelte';
	import Seo from './Seo.svelte';
	import { applicationData } from '$lib/stores/stores';
	import content from '$lib/data/website/makeBudget.json';
	import { ChevronDown } from '$lib/utils/iconRegistry';
	import { toggleDropdown } from '$lib/utils/toggleDropdown';
	import HelpList from './HelpList.svelte';

	let { data }: { data?: any } = $props();

	const pageDataWithClicks = $derived({
		...content.pageData,
		actionBtns: content.pageData.actionBtns.map((btn: any) => {
			if (btn.btnLink === '/get-started/how-can-we-help' || btn.btnName === 'Compare loans') {
				return {
					...btn,
					btnClick: () => {
						applicationData.update((storeData) => {
							storeData.LoanName = 'Loan Against Property';
							return storeData;
						});
					}
				};
			}
			return btn;
		})
	});

	const stickyNavbarWithClicks = $derived({
		items: content.subList.items,
		actionBtns: content.subList.actionBtns.map((btn: any) => {
			if (btn.btnLink === '/get-started/how-can-we-help' || btn.btnName === 'Compare loans') {
				return {
					...btn,
					btnClick: () => {
						applicationData.update((storeData) => {
							storeData.LoanName = 'Loan Against Property';
							return storeData;
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
		<div class="hidden lg:block">
			<StickyNavbar navList={stickyNavbarWithClicks} {activeSection}></StickyNavbar>

			<div id="what" data-section="what">
				<TwoColumnWithLeftHeading contents={content.whatIsBudgeting} isBorder />
			</div>

			<div id="process" data-section="process">
				<TwoColumnWithLeftHeading contents={content.understandingIncomeExpenses} isBorder />
				<TwoColumnWithImage contents={content.trackingIncome} isBorder>
					<p class="typography-body-md text-[var(--form-text-secondary)]">
						{content.trackingIncome.text}
					</p>
					<p class="font-semibold">Tips:</p>
					<ul class="list-disc pl-4">
						<li>List all your income sources.</li>
						<li>Use apps or simple spreadsheets to track it each month.</li>
					</ul>
				</TwoColumnWithImage>

				<TwoColumnWithImage contents={content.categorizingExpenses} isBorder>
					<p class="typography-body-md text-[var(--form-text-secondary)]">
						{@html content.categorizingExpenses.text}
					</p>

					<p class="font-semibold">Tips:</p>
					<ul class="list-disc pl-4">
						<li>Use budgeting apps that automatically categorize your expenses.</li>
						<li>Review your last 2-3 months of spending to identify where you’re spending most.</li>
					</ul>
				</TwoColumnWithImage>
			</div>

			<div id="setGoals" data-section="setGoals">
				<AboveTitleWithoutIconCard contents={content.financialGoals} isBorder />
				<AboveTitleWithoutIconCard contents={content.categorizeSpending} isBorder />
			</div>

			<div id="things" data-section="things">
				<TwoColumnWithImage contents={content.fiftyThirtyTwenty} isBorder>
					<div class="flex flex-col gap-2">
						<p>
							The 50/30/20 rule is a simple way to manage your budget. It helps you divide your
							income into three broad categories that give you a balanced approach to managing your
							finances.
						</p>
						<ul class="list-disc pl-4">
							<li>
								<span class="font-semibold">50%</span> for Essential Expenses (rent, bills, groceries)
							</li>
							<li>
								<span class="font-semibold">30%</span> for Lifestyle Costs (entertainment, dining out,
								shopping)
							</li>
							<li>
								<span class="font-semibold">20%</span> for Savings (emergency fund, retirement fund, investment)
							</li>
						</ul>
						<p class="typography-body-md mt-4 !font-semibold">Why It Works:</p>
						<ul class="list-disc pl-4">
							<li>
								It’s simple, effective, and easy to follow, ensuring you take care of your
								essentials while also enjoying life and saving for the future.
							</li>
							<li>
								<span class="font-semibold">Tips:</span>
							</li>
							<li>
								If you’re spending more than 50% on essentials, reassess your living situation
								(e.g., rent, utilities).
							</li>
							<li>Try to reduce discretionary expenses under 30% to boost savings.</li>
						</ul>
					</div>
				</TwoColumnWithImage>
			</div>

			<div id="startToday" data-section="startToday">
				<TwoColumnWithLeftHeading contents={content.startBudgeting} isBorder />
			</div>
		</div>

		<div class="block lg:hidden">
			{#each content.navBarMedium as navBar, index}
				<details
					class="dropdown col-span-3 bg-[var(--landing-bg-card)] text-[var(--form-text)] {index <
					content.navBarMedium.length - 1
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
						<div id="what" class="bg-[var(--landing-bg)] text-[var(--form-text)]">
							<TwoColumnWithLeftHeading contents={content.whatIsBudgeting} />
						</div>
					{:else if index == 1}
						<div id="process" class="bg-[var(--landing-bg)] text-[var(--form-text)]">
							<TwoColumnWithLeftHeading contents={content.understandingIncomeExpenses} isBorder />
							<TwoColumnWithImage contents={content.trackingIncome} isBorder>
								<p class="typography-body-md text-[var(--form-text-secondary)]">
									{content.trackingIncome.text}
								</p>
								<p class="font-semibold">Tips:</p>
								<ul class="list-disc pl-4">
									<li>List all your income sources.</li>
									<li>Use apps or simple spreadsheets to track it each month.</li>
								</ul>
							</TwoColumnWithImage>

							<TwoColumnWithImage contents={content.categorizingExpenses}>
								<p class="typography-body-md text-[var(--form-text-secondary)]">
									{@html content.categorizingExpenses.text}
								</p>

								<p class="font-semibold">Tips:</p>
								<ul class="list-disc pl-4">
									<li>Use budgeting apps that automatically categorize your expenses.</li>
									<li>
										Review your last 2-3 months of spending to identify where you’re spending most.
									</li>
								</ul>
							</TwoColumnWithImage>
						</div>
					{:else if index == 2}
						<div id="setGoals" class="bg-[var(--landing-bg)] text-[var(--form-text)]">
							<AboveTitleWithoutIconCard contents={content.financialGoals} isBorder />
							<AboveTitleWithoutIconCard contents={content.categorizeSpending} />
						</div>
					{:else if index == 3}
						<div id="things" class="bg-[var(--landing-bg)] text-[var(--form-text)]">
							<TwoColumnWithImage contents={content.fiftyThirtyTwenty}>
								<div class="flex flex-col gap-2">
									<p>
										The 50/30/20 rule is a simple way to manage your budget. It helps you divide
										your income into three broad categories that give you a balanced approach to
										managing your finances.
									</p>
									<ul class="list-disc pl-4">
										<li>
											<span class="font-semibold">50%</span> for Essential Expenses (rent, bills, groceries)
										</li>
										<li>
											<span class="font-semibold">30%</span> for Lifestyle Costs (entertainment, dining
											out, shopping)
										</li>
										<li>
											<span class="font-semibold">20%</span> for Savings (emergency fund, retirement fund,
											investment)
										</li>
									</ul>
									<p class="typography-body-md mt-4 !font-semibold">Why It Works:</p>
									<ul class="list-disc pl-4">
										<li>
											It’s simple, effective, and easy to follow, ensuring you take care of your
											essentials while also enjoying life and saving for the future.
										</li>
										<li>
											<span class="font-semibold">Tips:</span>
										</li>
										<li>
											If you’re spending more than 50% on essentials, reassess your living situation
											(e.g., rent, utilities).
										</li>
										<li>Try to reduce discretionary expenses under 30% to boost savings.</li>
									</ul>
								</div>
							</TwoColumnWithImage>
						</div>
					{:else if index == 4}
						<div id="startToday" class="bg-[var(--landing-bg)] text-[var(--form-text)]">
							<TwoColumnWithLeftHeading contents={content.startBudgeting} isBorder/>
						</div>
					{/if}
				</details>
			{/each}
		</div>

		<FeedbackCheck />

		{#snippet secondary()}
			<HelpList contents={content.helpList} isBorder />
			<ThingsYouShould thinkKnow={content.thinkKnow} disc="list-decimal" containerClass="lg:px-0" />
		{/snippet}
	</NewPageLayout>
</section>
