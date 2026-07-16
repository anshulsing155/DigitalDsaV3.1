<script lang="ts">
	import ThingsYouShould from '$lib/components/website/ThingsYouShould.svelte';
	import { onMount } from 'svelte';
	import HelpList from '$lib/components/website/HelpList.svelte';
	import Seo from './Seo.svelte';
	import SecondPageLayout from '$lib/components/website/SecondPageLayout.svelte';
	import StickyNavbar from '$lib/components/website/StickyNavbar.svelte';
	import content from '$lib/data/website/companyCulture.json';
	import { ChevronDown } from '$lib/utils/iconRegistry';
	import { toggleDropdown } from '$lib/utils/toggleDropdown';
	import SectionIntro from './SectionIntro.svelte';

	const {
		seo,
		pageData,
		stickyNavBar,
		navBarMedium,
		storyData,
		everyone,
		example,
		fun,
		empowerment,
		investing,
		team,
		final,
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

			<div data-section="first" id="first">
				<SectionIntro heading={storyData.heading} para={storyData.para} isBorder />

				<SectionIntro heading={everyone.heading} para={everyone.para} isBorder />

				<SectionIntro heading={example.heading} para={example.para} isBorder />
			</div>

			<!-- smart defense -->
			<div data-section="smart" id="smart">
				<SectionIntro heading={fun.heading} para={fun.firstPara} isBorder>
					<ul class="space-y-6">
						{#each fun.listItems as list}
							<li class="space-y-2">
								<h3 class="typography-h3 !font-semibold text-[var(--form-text)]">{list.heading}</h3>
								<p class="typography-body-md text-[var(--form-text-secondary)]">
									{@html list.desc}
								</p>
							</li>
						{/each}
					</ul>
					<p class="typography-body-sm text-[var(--form-text-secondary)]">
						{fun.secPara}
					</p>
				</SectionIntro>

				<SectionIntro heading={empowerment.heading} para={empowerment.para} isBorder />
			</div>

			<!-- cyber awareness -->
			<div data-section="awareness" id="awareness">
				<SectionIntro heading={investing.heading} para={investing.para} isBorder />

				<SectionIntro heading={team.heading} para={team.para} isBorder />
			</div>

			<!-- final thoughts -->
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
						<div id="first" class="bg-[var(--landing-bg)]">
							<SectionIntro heading={storyData.heading} para={storyData.para} isBorder />

							<SectionIntro heading={everyone.heading} para={everyone.para} isBorder />

							<SectionIntro heading={example.heading} para={example.para} />
						</div>
					{:else if index == 1}
						<div id="smart" class="bg-[var(--landing-bg)]">
							<SectionIntro heading={fun.heading} para={fun.firstPara} isBorder>
								<ul class="space-y-6">
									{#each fun.listItems as list}
										<li class="space-y-2">
											<h3 class="typography-h3 !font-semibold text-[var(--form-text)]">
												{list.heading}
											</h3>
											<p class="typography-body-md text-[var(--form-text-secondary)]">
												{@html list.desc}
											</p>
										</li>
									{/each}
								</ul>
								<p class="typography-body-sm text-[var(--form-text-secondary)]">
									{fun.secPara}
								</p>
							</SectionIntro>

							<SectionIntro heading={empowerment.heading} para={empowerment.para} />
						</div>
					{:else if index == 2}
						<div id="awareness" class="bg-[var(--landing-bg)]">
							<SectionIntro heading={investing.heading} para={investing.para} isBorder />

							<SectionIntro heading={team.heading} para={team.para} />
						</div>
					{:else if index == 3}
						<div id="final" class="bg-[var(--landing-bg)]">
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
</section>
