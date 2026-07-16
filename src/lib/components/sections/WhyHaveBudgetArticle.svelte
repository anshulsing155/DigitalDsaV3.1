<script lang="ts">
	import Seo from '../Seo.svelte';
	import Tooltip from '$lib/components/ui/Tooltip.svelte';
	import content from '$lib/data/website/whyHaveBudget.json';
	import SecondPageLayout from '../layout/SecondPageLayout.svelte';
	import { ChevronDown } from '$lib/utils/iconRegistry';
	import { toggleDropdown } from '$lib/utils/toggleDropdown';
	import ThingsYouShould from '$lib/components/sections/ThingsYouShould.svelte';
	import StickyNavbar from '../layout/StickyNavbar.svelte';
	import { onMount } from 'svelte';
	import SectionIntro from './SectionIntro.svelte';
	import HelpList from '$lib/components/sections/HelpList.svelte';

	// const { seo, pageData, extraIntro, sections, helpList, thingsYouShouldKnow } = content;
	const {
		seo,
		pageData,
		intro,
		myths,
		gettingStarted,
		importance,
		final,
		helpList,
		thingsYouShouldKnow,
		stickyNavBar,
		navBarMedium
	} = content;
	let originalSource = '';
	let sourceName = 'undefined';

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

<SecondPageLayout {pageData}>
	<div class="hidden lg:block">
		<StickyNavbar navList={stickyNavBar} {activeSection} />

		<div data-section="myths" id="myths">
			<SectionIntro heading={intro.heading} para={intro.para} isBorder>
				<p>{@html intro.extraIntro}</p>
			</SectionIntro>

			<SectionIntro heading={myths.heading} para={myths.para} isBorder>
				<p>{@html myths.extraPara}</p>
				<p>{@html myths.source}</p>
			</SectionIntro>
		</div>

		<div data-section="gettingStarted" id="gettingStarted">
			<SectionIntro heading={gettingStarted.heading} para={gettingStarted.para} isBorder>
				<p>{@html gettingStarted.extraPara}</p>
			</SectionIntro>
		</div>

		<div data-section="importance" id="importance">
			<SectionIntro heading={importance.heading} para={importance.para} isBorder>
				<p>{@html importance.extraPara}</p>
			</SectionIntro>
		</div>
		<div data-section="final" id="final">
			<SectionIntro heading={final.heading} para={final.para} />
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
					<div data-section="myths" id="myths" class="bg-[var(--landing-bg)]">
						<SectionIntro heading={intro.heading} para={intro.para} isBorder>
							<p>{@html intro.extraIntro}</p>
						</SectionIntro>

						<SectionIntro heading={myths.heading} para={myths.para} isBorder>
							<p>{@html myths.extraPara}</p>
							<p>{@html myths.source}</p>
						</SectionIntro>
					</div>
				{:else if index == 1}
					<div data-section="gettingStarted" id="gettingStarted" class="bg-[var(--landing-bg)]">
						<SectionIntro heading={gettingStarted.heading} para={gettingStarted.para} isBorder>
							<p>{@html gettingStarted.extraPara}</p>
						</SectionIntro>
					</div>
				{:else if index == 2}
					<div data-section="importance" id="importance" class="bg-[var(--landing-bg)]">
						<SectionIntro heading={importance.heading} para={importance.para} isBorder>
							<p>{@html importance.extraPara}</p>
						</SectionIntro>
					</div>
				{:else if index == 3}
					<div data-section="final" id="final" class="bg-[var(--landing-bg)]">
						<SectionIntro heading={final.heading} para={final.para} />
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
