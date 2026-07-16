<script lang="ts">
	import ThingsYouShould from '$lib/components/sections/ThingsYouShould.svelte';
	import { onMount } from 'svelte';
	import HelpList from '$lib/components/sections/HelpList.svelte';
	import Seo from '../layout/Seo.svelte';
	import SecondPageLayout from '$lib/components/layout/SecondPageLayout.svelte';
	import StickyNavbar from '$lib/components/layout/StickyNavbar.svelte';
	import content from '$lib/data/website/businessCantAfford.json';
	import { ChevronDown } from '$lib/utils/iconRegistry';
	import { toggleDropdown } from '$lib/utils/toggleDropdown';
	import SectionIntro from './SectionIntro.svelte';

	const {
		seo,
		pageData,
		stickyNavBar,
		navBarMedium,
		cyberThreats,
		trueCost,
		realLife,
		howToMake,
		digital,
		finalThoughts,
		helpList,
		thingsYouShouldKnow
	} = content;

	let activeSection = $state(''); // Svelte 5 state rune

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
			activeSection = currentSection; // Update the active section dynamically
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
	type={seo.type}
	title={seo.title}
	image={seo.image}
	description={seo.description}
	keywords={seo.keywords}
/>

<section class="mx-auto w-full">
	<SecondPageLayout {pageData}>
		<div class="hidden lg:block">
			<StickyNavbar navList={stickyNavBar} {activeSection} />
			<!-- cyber threat -->
			<div data-section="cyberThreat" id="cyberThreat">
				<SectionIntro heading={cyberThreats.heading} para={cyberThreats.para} isBorder />
				<SectionIntro heading={trueCost.heading} para={trueCost.para} isBorder>
					<ul class="space-y-6">
						{#each trueCost.listItems as list}
							<li class="space-y-2">
								<h3 class="typography-h3 font-semibold text-[var(--form-text)]">{list.heading}</h3>
								<p class="typography-body-md text-[var(--form-text-secondary)]">
									{@html list.desc}
								</p>
							</li>
						{/each}
					</ul>
				</SectionIntro>
			</div>
			<!-- real life -->
			<div data-section="realLife" id="realLife" class="">
				<SectionIntro heading={realLife.heading} isBorder>
					<ul class="space-y-6">
						{#each realLife.listItems as list}
							<li class="space-y-2">
								<h3 class="typography-h3 font-semibold text-[var(--form-text)]">{list.heading}</h3>
								<p class="typography-body-md text-[var(--form-text-secondary)]">
									{@html list.desc}
								</p>
							</li>
						{/each}
					</ul>
				</SectionIntro>
			</div>
			<!-- how to make -->
			<div data-section="safe" id="safe" class="">
				<SectionIntro heading={howToMake.heading} para={howToMake.para} isBorder>
					<ul class="space-y-6">
						{#each howToMake.listItems as list}
							<li class="space-y-2">
								<h3 class="typography-h3 font-semibold text-[var(--form-text)]">{list.heading}</h3>
								<p class="typography-body-md text-[var(--form-text-secondary)]">
									{@html list.desc}
								</p>
							</li>
						{/each}
					</ul>
				</SectionIntro>
			</div>
			<!-- digital dsa -->
			<div data-section="commitment" id="commitment" class="">
				<SectionIntro heading={digital.heading} para={digital.para} isBorder>
					<ul class="space-y-6">
						{#each digital.listItems as list}
							<li class="space-y-2">
								<h3 class="typography-h3 font-semibold text-[var(--form-text)]">{list.heading}</h3>
								<p class="typography-body-md text-[var(--form-text-secondary)]">
									{@html list.desc}
								</p>
							</li>
						{/each}
					</ul>
				</SectionIntro>
			</div>
			<!-- final thoughts -->
			<div data-section="final" id="final" class="">
				<SectionIntro heading={finalThoughts.heading} para={finalThoughts.para} />
			</div>
		</div>

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
					{#if index == 0}
						<div id="cyberThreat" class="bg-[var(--landing-bg)]">
							<SectionIntro heading={cyberThreats.heading} para={cyberThreats.para} isBorder />
							<SectionIntro heading={trueCost.heading} para={trueCost.para} isBorder>
								<ul class="space-y-6">
									{#each trueCost.listItems as list}
										<li class="space-y-2">
											<h3 class="typography-h3 font-semibold text-[var(--form-text)]">
												{list.heading}
											</h3>
											<p class="typography-body-md text-[var(--form-text-secondary)]">
												{@html list.desc}
											</p>
										</li>
									{/each}
								</ul>
							</SectionIntro>
						</div>
					{:else if index == 1}
						<div id="realLife" class="bg-[var(--landing-bg)]">
							<SectionIntro heading={realLife.heading} isBorder>
								<ul class="space-y-6">
									{#each realLife.listItems as list}
										<li class="space-y-2">
											<h3 class="typography-h3 font-semibold text-[var(--form-text)]">
												{list.heading}
											</h3>
											<p class="typography-body-md text-[var(--form-text-secondary)]">
												{@html list.desc}
											</p>
										</li>
									{/each}
								</ul>
							</SectionIntro>
						</div>
					{:else if index == 2}
						<div id="safe" class="bg-[var(--landing-bg)]">
							<SectionIntro heading={howToMake.heading} para={howToMake.para} isBorder>
								<ul class="space-y-6">
									{#each howToMake.listItems as list}
										<li class="space-y-2">
											<h3 class="typography-h3 font-semibold text-[var(--form-text)]">
												{list.heading}
											</h3>
											<p class="typography-body-md text-[var(--form-text-secondary)]">
												{@html list.desc}
											</p>
										</li>
									{/each}
								</ul>
							</SectionIntro>
						</div>
					{:else if index == 3}
						<div id="commitment" class="bg-[var(--landing-bg)]">
							<SectionIntro heading={digital.heading} para={digital.para} isBorder>
								<ul class="space-y-6">
									{#each digital.listItems as list}
										<li class="space-y-2">
											<h3 class="typography-h3 font-semibold text-[var(--form-text)]">
												{list.heading}
											</h3>
											<p class="typography-body-md text-[var(--form-text-secondary)]">
												{@html list.desc}
											</p>
										</li>
									{/each}
								</ul>
							</SectionIntro>
						</div>
					{:else if index == 4}
						<div id="final" class="bg-[var(--landing-bg)]">
							<SectionIntro heading={finalThoughts.heading} para={finalThoughts.para} />
						</div>
					{/if}
				</details>
			{/each}
		</div>

		{#snippet secondary()}
			<HelpList contents={helpList} isBorder />
			<ThingsYouShould thinkKnow={thingsYouShouldKnow} disc="list-decimal" containerClass="px-0" />
		{/snippet}
	</SecondPageLayout>
</section>
