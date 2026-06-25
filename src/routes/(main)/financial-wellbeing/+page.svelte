<script lang="ts">
	import HelpList from '$lib/components/website/HelpList.svelte';
	import NewPageLayout from '$lib/components/website/NewPageLayout.svelte';
	import Seo from '$lib/components/Seo.svelte';
	import StickyNavbar from '$lib/components/website/StickyNavbar.svelte';
	import ThingsYouShould from '$lib/components/website/ThingsYouShould.svelte';
	import TwoColumn from '$lib/components/website/TwoColumn.svelte';
	import WhyChoose from '$lib/components/website/WhyChoose.svelte';
	import { onMount } from 'svelte';
	import content from '$lib/data/website/financialWellbeing.json';
	import { ChevronDown } from '$lib/utils/iconRegistry';
	import { toggleDropdown } from '$lib/utils/toggleDropdown';

	let activeSection = $state(''); // Initially no section is active

	// This function sets the first section as active on initial load
	const initializeActiveSection = () => {
		const firstSection = document.querySelector('[data-section]');
		if (firstSection) {
			activeSection = firstSection.id;
		}
	};

	// Handle scroll event to dynamically update the active section
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

	// Initialize the first active section when the component loads
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
	<NewPageLayout pageData={content.pageData} actionBtns={content.pageData.actionBtns}>
		<div class="hidden lg:block">
			<StickyNavbar navList={content.stickyNavBar} {activeSection}></StickyNavbar>
		</div>

		<div class="hidden px-[0.5rem] lg:block lg:px-[4rem]">
			<div
				class="relative border-b border-[var(--form-border)] pb-[14rem]"
				data-section="wellbeing"
				id="wellbeing"
			>
				<ThingsYouShould thinkKnow={content.wellBeing} disc="list-decimal" containerClass="px-0" />
				<div class="absolute top-[50%] grid grid-cols-3 gap-[2rem]">
					{#each content.wellBeingCards as card}
						<div
							class="typography-body-md flex flex-col items-start gap-3 text-[var(--form-text-secondary)]"
						>
							<img src={card.icon} alt="" class="h-10" />
							<h2 class="typography-body-lg !font-semibold text-[var(--form-text)]">
								{card.heading}
							</h2>
							<p>
								{card.para}
							</p>
							<p>
								<strong>Suggested:</strong>
								{card.suggested}
							</p>
						</div>
					{/each}
				</div>
			</div>

			<div data-section="measured" id="measured">
				<ThingsYouShould
					thinkKnow={content.measured}
					disc="list-disc"
					containerClass="px-0"
					sectionBorder={true}
				>
					{#snippet list()}
						<p class="font-minParaFont text-[.8rem] text-[var(--form-text)]">
							97% of our first time visitor have taken this survey.
						</p>
					{/snippet}
				</ThingsYouShould>
			</div>

			<div id="assessment" data-section="assessment">
				<TwoColumn
					cardImage={content.assessment.cardImage}
					cardAltName={content.assessment.cardAltName}
					cardHeading={content.assessment.cardHeading}
					isBorder={true}
				>
					<div
						class="typography-body-md grid gap-[2rem] text-[var(--form-text-secondary)]"
						slot="list"
					>
						{#each content.assessment.bullets as bullet}
							<p class='typography-body-md text-[var(--form-text)]'>
								<span class=" !font-semibold "
									>{bullet.title}</span
								> <br />
								{bullet.desc}
							</p>
						{/each}
					</div>
				</TwoColumn>
			</div>

			<div data-section="resources" id="resources">
				<WhyChoose facilities={content.resources} paddingClass="px-0" />
			</div>
		</div>

		<div class="lg:hidden">
			{#each content.navBarMedium as list, index}
				<details
					class="dropdown border-bgBtn col-span-3 bg-[var(--landing-bg-card)] text-[var(--form-text)] {index <
					content.navBarMedium.length - 1
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
						<div
							id="Financial Services Guides"
							class="bg-[var(--landing-bg)] text-[var(--form-text)]"
						>
							<ThingsYouShould thinkKnow={content.wellBeing} disc="list-decimal" />
							<div class="grid gap-[2rem] px-[0.5rem] pb-[3rem] md:grid-cols-2">
								{#each content.wellBeingCards as card}
									<div
										class="typography-body-md flex flex-col items-start gap-3 text-[var(--form-text-secondary)]"
									>
										<img src={card.icon} alt="" class="h-10" />
										<h2 class="typography-body-lg !font-semibold text-[var(--form-text)]">
											{card.heading}
										</h2>
										<p>
											{card.para}
										</p>
										<p>
											<strong>Suggested:</strong>
											{card.suggested}
										</p>
									</div>
								{/each}
							</div>
						</div>
					{:else if index == 1}
						<div id="measured" class="bg-[var(--landing-bg)] text-[var(--form-text)]">
							<ThingsYouShould thinkKnow={content.measured} disc="list-disc" />
						</div>
					{:else if index == 2}
						<div id="assessment" class="bg-[var(--landing-bg)]  text-[var(--form-text)]">
							<TwoColumn
								cardImage={content.assessment.cardImage}
								cardAltName={content.assessment.cardAltName}
								cardHeading={content.assessment.cardHeading}
							>
								<div
									class="typography-body-md grid gap-[2rem] text-[var(--form-text-secondary)]"
									slot="list"
								>
									{#each content.assessment.bullets as bullet}
										<p>
											<span class="typography-body-lg !font-semibold text-[var(--form-text)]"
												>{bullet.title}</span
											> <br />
											{bullet.desc}
										</p>
									{/each}
								</div>
							</TwoColumn>
						</div>
					{:else if index == 3}
						<div id="resources" class="bg-[var(--landing-bg)] text-[var(--form-text)]">
							<WhyChoose facilities={content.resources} />
						</div>
					{/if}
				</details>
			{/each}
		</div>

		{#snippet secondary()}
			<HelpList contents={content.help} isBorder />
			<ThingsYouShould thinkKnow={content.thinkKnow} disc="list-disc" containerClass="px-0" />
		{/snippet}
	</NewPageLayout>
</section>
