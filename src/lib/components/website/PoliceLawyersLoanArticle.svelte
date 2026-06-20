<script>
	let { data } = $props();

	import NewPageLayout from './NewPageLayout.svelte';
	import TwoColumnWithLeftHeading from './TwoColumnWithLeftHeading.svelte';
	import PaymentTable from './PaymentTable.svelte';
	import TwoColumnWithImage from './TwoColumnWithImage.svelte';
	import StickyNavbar from './StickyNavbar.svelte';
	import { onMount } from 'svelte';
	import AboveTitleWithBlackCard from './AboveTitleWithBlackCard.svelte';
	import Button from './Button.svelte';
	import HelpList from './HelpList.svelte';
	import ThingsYouKnow from './ThingsYouKnow.svelte';
	import Seo from './Seo.svelte';
	import content from '$lib/data/website/policeLawyersLoan.json';

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

	const toggleDropdown = (event, index) => {
		event.preventDefault();
		const summaryElement = event.currentTarget;
		const icon = summaryElement.querySelector('.faq-icon');
		const detailsElement = summaryElement.parentElement;

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
			icon.classList.remove('fa-angle-up');
			icon.classList.add('fa-angle-down');
		} else {
			detailsElement.setAttribute('open', 'true');
			icon.classList.remove('fa-angle-down');
			icon.classList.add('fa-angle-up');
		}
		setTimeout(() => {
			detailsElement.scrollIntoView({
				behavior: 'smooth',
				block: 'start'
			});
		}, 100);
	};

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
				<StickyNavbar
					navList={stickyNavBar}
					{activeSection}
				></StickyNavbar>
			</div>

			<div id="issue" data-section="issue" class="section">
				<TwoColumnWithLeftHeading contents={whySayNo} />
			</div>

			<div id="compare" data-section="compare" class="section">
				<div
					class="w-full border-b border-[var(--form-border)] px-[0.5rem] py-[4rem] lg:px-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem]"
				>
					<div class="">
						<h2 class="typography-h2 mb-[4rem] grid text-center text-text-main">
							<p>Lending Risks</p>
							<span class="underline decoration-primary decoration-4 underline-offset-4"
								>The Breakdown</span
							>
						</h2>
					</div>
					<div class="">
						{#each firstTableData as tableData}
							<PaymentTable {tableData} />
						{/each}
					</div>
					<p class="typography-body-md mt-14 text-center text-[var(--form-text-secondary)]">
						{@html lendingRisksFunFact}
					</p>
				</div>

				<div class="mt-[4rem]">
					<p class="typography-h2 mb-[2rem] text-center text-text-main">
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
					>
						<div class="mt-4 text-center">
							<blockquote class="relative text-gray-800 italic">
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
					>
						<div class="mt-4 text-center">
							<blockquote class="relative text-gray-800 italic">
								<span class="absolute -top-3 -left-8 font-serif text-4xl">“</span>
								{realLifeScenarios.lawyerStory.quote}
								<span class="absolute -right-2 -bottom-6 font-serif text-4xl">”</span>
							</blockquote>
							<p class="mt-10">
								<a
									class="underline underline-offset-4 hover:no-underline"
									href={realLifeScenarios.lawyerStory.linkUrl}
									>{realLifeScenarios.lawyerStory.linkText}</a
								>
							</p>
						</div>
					</TwoColumnWithImage>
				</div>
			</div>

			<div id="solutions" class="section" data-section="solutions">
				<TwoColumnWithLeftHeading contents={improveChances} />
			</div>

			<div data-section="resources" id="resources" class="section">
				<AboveTitleWithBlackCard contents={toolsAndCalculators} />
			</div>
		</div>

		<!-- mobile view -->
		<div class="block lg:hidden">
			{#each navBarMedium as list, index}
				<details
					class="dropdown bg-darkColor col-span-3 text-white {index < navBarMedium.length - 1
						? 'border-b'
						: ''}"
				>
					<summary
						class="col-span-3 list-none px-[1rem] py-[1.5rem]"
						onclick={(e) => toggleDropdown(e, index)}
					>
						<div class="mx-auto flex w-full items-center justify-between gap-4">
							<h2 class="text-navFont">{list}</h2>
							<div class="icon-container typography-h3 justify-self-end">
								<span><i class="fa-solid fa-angle-down faq-icon"></i></span>
							</div>
						</div>
					</summary>

					{#if index === 0}
						<div id="issue" data-section="issue" class="section bg-[var(--landing-bg)] text-[var(--landing-text)]">
							<TwoColumnWithLeftHeading contents={whySayNo} />
						</div>
					{:else if index === 1}
						<div id="compare" data-section="compare" class="section bg-[var(--landing-bg)] text-[var(--landing-text)]">
							<div
								class="w-full border-b border-[var(--form-border)] px-[0.5rem] py-[4rem] lg:px-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem]"
							>
								<div class="">
									<h2 class="typography-h2 mb-[4rem] grid text-center text-text-main">
										<p>Lending Risks</p>
										<span class="underline decoration-primary decoration-4 underline-offset-4"
											>The Breakdown</span
										>
									</h2>
								</div>
								<div class="">
									{#each firstTableData as tableData}
										<PaymentTable {tableData} />
									{/each}
								</div>
								<p class="typography-body-md mt-14 text-center text-[var(--form-text-secondary)]">
									{@html lendingRisksFunFact}
								</p>
							</div>

							<div class="mt-[4rem]">
								<p class="typography-h2 mb-[2rem] text-center text-text-main">
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
								>
									<div class="mt-4 md:text-center">
										<blockquote class="relative text-gray-800 italic">
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
									<div class="mt-4 md:text-center">
										<blockquote class="relative text-gray-800 italic">
											{realLifeScenarios.lawyerStory.quote}
										</blockquote>
										<p class="mt-10">
											<a
												href={realLifeScenarios.lawyerStory.linkUrl}
												class="underline underline-offset-4"
												>{realLifeScenarios.lawyerStory.linkText}</a
											>
										</p>
									</div>
								</TwoColumnWithImage>
							</div>
						</div>
					{:else if index === 2}
						<div id="solutions" class="section bg-[var(--landing-bg)] text-[var(--landing-text)]" data-section="solutions">
							<TwoColumnWithLeftHeading contents={improveChances} />
						</div>
					{:else if index === 3}
						<div data-section="resources" id="resources" class="section bg-[var(--landing-bg)] text-[var(--landing-text)]">
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
		<div slot="secondary" class="px-2">
			<HelpList contents={helpList} />

			<ThingsYouKnow contents={{ heading: `Things you should know` }}>
				<ul class="flex list-decimal flex-col gap-4 px-2 pl-4">
					{#each thingsYouShouldKnow.points as point}
						<li>{point}</li>
					{"\n"}
					{/each}
				</ul>
			</ThingsYouKnow>
		</div>
	</NewPageLayout>
</section>

<style>
	.section {
		scroll-margin-top: 5rem; /* Adjust this value to match your navbar height */
	}
</style>
