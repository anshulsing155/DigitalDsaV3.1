<script>
	let { data } = $props();

	import NewPageLayout from '../layout/NewPageLayout.svelte';
	import TwoColumnWithLeftHeading from './TwoColumnWithLeftHeading.svelte';
	import PaymentTable from '../features/calculators/PaymentTable.svelte';
	import TwoColumnWithImage from './TwoColumnWithImage.svelte';
	import StickyNavbar from '../layout/StickyNavbar.svelte';
	import { onMount } from 'svelte';
	import AboveTitleWithBlackCard from './AboveTitleWithBlackCard.svelte';
	import Button from '../ui/Button.svelte';
	import HelpList from './HelpList.svelte';
	import ThingsYouKnow from './ThingsYouKnow.svelte';
	import Seo from '../Seo.svelte';
	import content from '$lib/data/website/policeLawyersLoan.json';
	import { ChevronDown } from '$lib/utils/iconRegistry';
	import { toggleDropdown } from '$lib/utils/toggleDropdown';

	const {
		seo,
		pageData,
		stickyNavBar,
		navBarMedium,
		whySayNo,
		firstTableData,
		lendingRisksFunFact,
		realLifeScenarios,
		improveChances,
		toolsAndCalculators,
		messageUs,
		helpList,
		thingsYouShouldKnow
	} = content;

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
</script>

<Seo
	type={seo.type}
	title={seo.title}
	image={seo.image}
	description={seo.description}
	keywords={seo.keywords}
/>

<section class="content">
	<NewPageLayout {pageData}>
		<!-- desktop view -->
		<div class="hidden lg:block">
			<div>
				<StickyNavbar navList={stickyNavBar} {activeSection}></StickyNavbar>
			</div>

			<div id="issue" data-section="issue" class="section">
				<TwoColumnWithLeftHeading contents={whySayNo} isBorder />
			</div>

			<div id="compare" data-section="compare" class="section">
				<div
					class="border-b border-[var(--form-border)] px-[0.5rem] py-[4rem] lg:px-16 lg:py-0 lg:pt-[4rem] lg:pb-[8rem]"
				>
					<h2 class="typography-h2-md mb-6 text-center !font-semibold text-[var(--form-text)]">
						<p>Lending Risks</p>
						<span class="underline decoration-primary underline-offset-4">The Breakdown</span>
					</h2>
					{#each firstTableData as tableData}
						<PaymentTable {tableData} />
					{/each}
					<p class="typography-body-md mt-4 text-center text-[var(--form-text-secondary)]">
						{@html lendingRisksFunFact}
					</p>
				</div>

				<div class="mt-[4rem]">
					<p class="typography-h2-md mb-[2rem] text-center text-[var(--form-text)]">
						{realLifeScenarios.heading}
						<br /><span
							class="typography-body-md mt-14 text-center text-[var(--form-text-secondary)]"
							>{realLifeScenarios.subHeading}</span
						>
					</p>
					<TwoColumnWithImage
						contents={{
							cardImage: realLifeScenarios.policeOfficerStory.cardImage,
							cardAltName: realLifeScenarios.policeOfficerStory.cardAltName,
							cardHeading: realLifeScenarios.policeOfficerStory.cardHeading
						}}
						isBorder
					>
						<div class="mt-4 text-center">
							<blockquote
								class="typography-body-md relative text-[var(--form-text-secondary)] italic"
							>
								<span class="absolute -top-3 -left-12 font-serif text-4xl">“</span>
								{realLifeScenarios.policeOfficerStory.quote}
								<span class="absolute -right-4 -bottom-6 font-serif text-4xl">”</span>
							</blockquote>
						</div>
					</TwoColumnWithImage>

					<TwoColumnWithImage
						contents={{
							cardImage: realLifeScenarios.lawyerStory.cardImage,
							cardAltName: realLifeScenarios.lawyerStory.cardAltName,
							cardHeading: realLifeScenarios.lawyerStory.cardHeading,
							reverse: realLifeScenarios.lawyerStory.reverse
						}}
						isBorder
					>
						<div class="text-center">
							<blockquote
								class="typography-body-md relative text-[var(--form-text-secondary)] italic"
							>
								<span class="absolute -top-3 -left-8 font-serif text-4xl">“</span>
								{realLifeScenarios.lawyerStory.quote}
								<span class="absolute -right-2 -bottom-6 font-serif text-4xl">”</span>
							</blockquote>
							<p class="mt-10">
								<a
									class="text-[var(--ddsa-info-text)] underline underline-offset-4 hover:no-underline"
									href={realLifeScenarios.lawyerStory.linkUrl}
									>{realLifeScenarios.lawyerStory.linkText}</a
								>
							</p>
						</div>
					</TwoColumnWithImage>
				</div>
			</div>

			<div id="solutions" class="section" data-section="solutions">
				<TwoColumnWithLeftHeading contents={improveChances} isBorder />
			</div>

			<div data-section="resources" id="resources" class="section">
				<AboveTitleWithBlackCard contents={toolsAndCalculators} />
			</div>
		</div>

		<!-- mobile view -->
		<div class="block lg:hidden">
			{#each navBarMedium as list, index}
				<details
					class="dropdown col-span-3 bg-[var(--landing-bg-card)] text-[var(--form-text)] {index <
					navBarMedium.length - 1
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

					{#if index === 0}
						<div
							id="issue"
							data-section="issue"
							class="section bg-[var(--landing-bg)] text-[var(--form-text)]"
						>
							<TwoColumnWithLeftHeading contents={whySayNo} />
						</div>
					{:else if index === 1}
						<div
							id="compare"
							data-section="compare"
							class="section bg-[var(--landing-bg)] text-[var(--form-text)]"
						>
							<div
								class="w-full border-b border-[var(--form-border)] px-[0.5rem] py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem]"
							>
								<h2
									class="typography-h2-md mb-6 text-center !font-semibold text-[var(--form-text)]"
								>
									<p>Lending Risks</p>
									<span class="underline decoration-primary underline-offset-4">The Breakdown</span>
								</h2>
								{#each firstTableData as tableData}
									<PaymentTable {tableData} />
								{/each}
								<p class="typography-body-md mt-14 text-center text-[var(--form-text-secondary)]">
									{@html lendingRisksFunFact}
								</p>
							</div>

							<div class="mt-[4rem]">
								<p class="typography-h2-md mb-[2rem] text-center text-[var(--form-text)]">
									{realLifeScenarios.heading}
									<br /><span
										class="typography-body-md mt-14 text-center text-[var(--form-text-secondary)]"
										>{realLifeScenarios.subHeading}</span
									>
								</p>
								<TwoColumnWithImage
									contents={{
										cardImage: realLifeScenarios.policeOfficerStory.cardImage,
										cardAltName: realLifeScenarios.policeOfficerStory.cardAltName,
										cardHeading: realLifeScenarios.policeOfficerStory.cardHeading
									}}
									isBorder
								>
									<div class="text-center">
										<blockquote class="relative italic">
											{realLifeScenarios.policeOfficerStory.quote}
										</blockquote>
									</div>
								</TwoColumnWithImage>

								<TwoColumnWithImage
									contents={{
										cardImage: realLifeScenarios.lawyerStory.cardImage,
										cardAltName: realLifeScenarios.lawyerStory.cardAltName,
										cardHeading: realLifeScenarios.lawyerStory.cardHeading,
										reverse: realLifeScenarios.lawyerStory.reverse
									}}
								>
									<div class="text-center">
										<blockquote class="relative italic">
											{realLifeScenarios.lawyerStory.quote}
										</blockquote>
										<p class="mt-10">
											<a
												href={realLifeScenarios.lawyerStory.linkUrl}
												class="text-[var(--ddsa-info-text)] underline underline-offset-4 hover:no-underline"
												>{realLifeScenarios.lawyerStory.linkText}</a
											>
										</p>
									</div>
								</TwoColumnWithImage>
							</div>
						</div>
					{:else if index === 2}
						<div
							id="solutions"
							class="section bg-[var(--landing-bg)] text-[var(--landing-text)]"
							data-section="solutions"
						>
							<TwoColumnWithLeftHeading contents={improveChances} />
						</div>
					{:else if index === 3}
						<div
							data-section="resources"
							id="resources"
							class="section bg-[var(--landing-bg)] text-[var(--landing-text)]"
						>
							<AboveTitleWithBlackCard contents={toolsAndCalculators} />
						</div>
					{/if}
				</details>
			{/each}
		</div>

		<TwoColumnWithImage contents={messageUs}>
			<p>
				{messageUs.para}
			</p>
			<Button link="/contact" btnClass="btn-secondary w-full" btnName="Message us" />
		</TwoColumnWithImage>
		{#snippet secondary()}
			<HelpList contents={helpList} isBorder />

			<ThingsYouKnow contents={{ heading: `Things you should know` }}>
				<ul class="flex list-decimal flex-col gap-4 px-2 pl-4">
					{#each thingsYouShouldKnow.points as point}
						<li>{point}</li>
						{'\n'}
					{/each}
				</ul>
			</ThingsYouKnow>
		{/snippet}
	</NewPageLayout>
</section>

<style>
	.section {
		scroll-margin-top: 5rem; /* Adjust this value to match your navbar height */
	}
</style>
