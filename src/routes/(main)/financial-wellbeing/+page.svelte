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

	const toggleDropdown = (event: any, index: any) => {
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

			// Scroll the opened accordion into view
			setTimeout(() => {
				detailsElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
			}, 100);
		}
	};
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

		<div class="hidden px-[2rem] lg:block lg:px-[4rem]">
			<div class="relative pb-[14rem]" data-section="wellbeing" id="wellbeing">
				<ThingsYouShould thinkKnow={content.wellBeing} disc="list-decimal" />
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
			<div data-section="measured" id="measured" class="border-y border-[var(--form-border)]">
				<ThingsYouShould thinkKnow={content.measured} disc="list-disc">
					<p slot="list" class="font-minParaFont text-[.8rem]">
						97% of our first time visitor have taken this survey.
					</p>
				</ThingsYouShould>
			</div>
			<div
				id="assessment"
				data-section="assessment"
				class="flex flex-col border-b border-[var(--form-border)] pt-[4rem] pb-[8rem]"
			>
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

			<div data-section="resources" id="resources">
				<WhyChoose facilities={content.resources} />
			</div>
		</div>

		<div class="lg:hidden">
			{#each content.navBarMedium as list, index}
				<details
					class="border-spanColor dropdown bg-darkColor col-span-3 text-white {index <
					content.navBarMedium.length - 1
						? 'border-b'
						: ''}"
				>
					<summary class="list-none px-6 py-4" onclick={(e) => toggleDropdown(e, index)}>
						<div class="flex items-center justify-between">
							<h2>{list}</h2>
							<span><i class="fa-solid fa-angle-down faq-icon"></i></span>
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
						<div id="assessment" class="bg-[var(--landing-bg)] px-[0.5rem] text-[var(--form-text)]">
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
						<div id="resources" class="bg-[var(--landing-bg)] px-[0.5rem] text-[var(--form-text)]">
							<WhyChoose facilities={content.resources} />
						</div>
					{/if}
				</details>
			{/each}
		</div>

		<div slot="secondary" class="">
			<HelpList contents={content.help} />
			<ThingsYouShould thinkKnow={content.thinkKnow} disc="list-disc" />
		</div>
	</NewPageLayout>
</section>
