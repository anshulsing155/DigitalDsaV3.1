<script lang="ts">
	import ThingsYouShould from '$lib/components/sections/ThingsYouShould.svelte';
	import { onMount } from 'svelte';
	import HelpList from '$lib/components/sections/HelpList.svelte';
	import Seo from '../layout/Seo.svelte';
	import SecondPageLayout from '$lib/components/layout/SecondPageLayout.svelte';
	import StickyNavbar from '$lib/components/layout/StickyNavbar.svelte';
	import content from '$lib/data/website/integralBusiness.json';
	import { ChevronDown } from '$lib/utils/iconRegistry';
	import { toggleDropdown } from '$lib/utils/toggleDropdown';
	import SectionIntro from './SectionIntro.svelte';

	const {
		seo,
		pageData,
		stickyNavBar,
		navBarMedium,
		onlineBusiness,
		reality,
		realLife,
		threats,
		sme,
		essential,
		example,
		conclusion,
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
			<!-- online business -->
			<div data-section="sme" id="sme" class="">
				<SectionIntro heading={onlineBusiness.heading} para={onlineBusiness.para} isBorder />
				<SectionIntro heading={reality.heading} isBorder>
					<ul class="space-y-6">
						{#each reality.listItems as list}
							<li class="space-y-2">
								<h3 class="typography-h3 !font-semibold text-[var(--form-text)]">{list.heading}</h3>
								<p class="typography-body-md text-[var(--form-text-secondary)]">
									{@html list.desc}
								</p>
							</li>
						{/each}
					</ul>
				</SectionIntro>
			</div>

			<!-- common threats -->
			<div data-section="threats" id="threats" class="">
				<SectionIntro heading={realLife.heading} para={realLife.para} isBorder />
				<SectionIntro heading={threats.heading} isBorder>
					<ul class="space-y-6">
						{#each threats.listItems as list}
							<li class="space-y-2">
								<h3 class="typography-h3 !font-semibold text-[var(--form-text)]">{list.heading}</h3>
								<p class="typography-body-md text-[var(--form-text-secondary)]">
									{@html list.desc}
								</p>
							</li>
						{/each}
					</ul>
				</SectionIntro>
			</div>

			<!-- essential practices -->
			<div data-section="prac" id="prac" class="">
				<SectionIntro heading={sme.heading} para={sme.para} isBorder />
				<SectionIntro heading={essential.heading} isBorder>
					<ul class="space-y-6">
						{#each essential.listItems as list}
							<li class="space-y-2">
								<h3 class="typography-h3 !font-semibold text-[var(--form-text)]">{list.heading}</h3>
								<p class="typography-body-md text-[var(--form-text-secondary)]">
									{@html list.desc}
								</p>
							</li>
						{/each}
					</ul>
				</SectionIntro>
				<SectionIntro heading={example.heading} para={example.para} isBorder />
			</div>

			<!-- conclusion -->
			<div data-section="conclusion" id="conclusion" class="">
				<SectionIntro heading={conclusion.heading} para={conclusion.para} />
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
						<div id="sme" class="bg-[var(--landing-bg)]">
							<SectionIntro heading={onlineBusiness.heading} para={onlineBusiness.para} isBorder />
							<SectionIntro heading={reality.heading}>
								<ul class="space-y-6">
									{#each reality.listItems as list}
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
							</SectionIntro>
						</div>
					{:else if index == 1}
						<div id="threats" class="bg-[var(--landing-bg)]">
							<SectionIntro heading={realLife.heading} para={realLife.para} isBorder />
							<SectionIntro heading={threats.heading}>
								<ul class="space-y-6">
									{#each threats.listItems as list}
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
							</SectionIntro>
						</div>
					{:else if index == 2}
						<div id="prac" class="bg-[var(--landing-bg)]">
							<SectionIntro heading={sme.heading} para={sme.para} isBorder />
							<SectionIntro heading={essential.heading} isBorder>
								<ul class="space-y-6">
									{#each essential.listItems as list}
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
							</SectionIntro>
							<SectionIntro heading={example.heading} para={example.para} />
						</div>
					{:else if index == 3}
						<div id="conclusion" class="bg-[var(--landing-bg)]">
							<SectionIntro heading={conclusion.heading} para={conclusion.para} />
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
