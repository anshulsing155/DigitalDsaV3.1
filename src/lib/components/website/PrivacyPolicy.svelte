<script>
	import PageFullTextDesign from './PageFullTextDesign.svelte';
	import Seo from './Seo.svelte';
	import StickyNavbar from './StickyNavbar.svelte';
	import ThingsYouShould from './ThingsYouShould.svelte';
	import { onMount } from 'svelte';
	import content from '$lib/data/website/privacyPolicy.json';
	import { ChevronDown } from '$lib/utils/iconRegistry';
	import { toggleDropdown } from '$lib/utils/toggleDropdown';

	let pageData = content.pageData;
	let subList = content.subList;
	let navBarMedium = content.navBarMedium;
	let aboutPrivacy = content.aboutPrivacy;
	let accumulationInformation = content.accumulationInformation;
	let dataProcessing = content.dataProcessing;
	let usageInformation = content.usageInformation;
	let disclosure = content.disclosure;
	let privacyRight = content.privacyRight;
	let navigatingBeyond = content.navigatingBeyond;
	let amendments = content.amendments;

	// logic for second nav bar which is not working yet
	let activeSection = ''; // Initially no section is active

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
	type="WebPage"
	title={content.seo.title}
	description={content.seo.description}
	keywords={content.seo.keywords}
/>

<section>
	<PageFullTextDesign {pageData}>
		<div class="hidden lg:block">
			<StickyNavbar navList={subList} {activeSection} />
			<div class="lg:px-[4rem]">
				<div class="" id="aboutPrivacy" data-section="aboutPrivacy">
					<ThingsYouShould thinkKnow={aboutPrivacy} sectionBorder={true} containerClass="px-0" />
				</div>
				<div id="dataProcessing" data-section="aboutPrivacy">
					<div>
						<ThingsYouShould
							thinkKnow={dataProcessing}
							disc="list-disc"
							sectionBorder={true}
							containerClass="px-0"
						/>
					</div>
					<div>
						<ThingsYouShould
							thinkKnow={accumulationInformation}
							disc="list-disc"
							sectionBorder={true}
							containerClass="px-0"
						/>
					</div>
				</div>
				<div id="usage" data-section="aboutPrivacy">
					<ThingsYouShould
						thinkKnow={usageInformation}
						disc="list-disc"
						sectionBorder={true}
						containerClass="px-0"
					/>
				</div>
				<div id="disclosure" data-section="aboutPrivacy">
					<ThingsYouShould
						thinkKnow={disclosure}
						disc="list-disc"
						sectionBorder={true}
						containerClass="px-0"
					/>
				</div>
				<div id="right" data-section="aboutPrivacy">
					<ThingsYouShould
						thinkKnow={privacyRight}
						disc="list-disc"
						sectionBorder={true}
						containerClass="px-0"
					/>
				</div>
				<div id="navigation" data-section="aboutPrivacy">
					<div>
						<ThingsYouShould
							thinkKnow={navigatingBeyond}
							disc="list-disc"
							sectionBorder={true}
							containerClass="px-0"
						/>
					</div>
					<div>
						<ThingsYouShould thinkKnow={amendments} disc="list-disc" containerClass="px-0" />
					</div>
				</div>
			</div>
		</div>
		<div class="lg:hidden">
			{#each navBarMedium as list, index}
				<details
					class="dropdown border-bgBtn bg-darkColor col-span-3 text-white {index <
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
						<div class="bg-[var(--landing-bg)] text-[var(--form-text)]" id="aboutPrivacy">
							<ThingsYouShould thinkKnow={aboutPrivacy} />
						</div>
					{:else if index == 1}
						<div id="dataProcessing" class="bg-[var(--landing-bg)] text-[var(--form-text)]">
							<div >
								<ThingsYouShould thinkKnow={dataProcessing} disc="list-disc" sectionBorder={true} />
							</div>
							<div class="">
								<ThingsYouShould thinkKnow={accumulationInformation} disc="list-disc" />
							</div>
						</div>
					{:else if index == 2}
						<div class="bg-[var(--landing-bg)] text-[var(--form-text)]" id="usage">
							<ThingsYouShould thinkKnow={usageInformation} disc="list-disc" />
						</div>
					{:else if index == 3}
						<div class="bg-[var(--landing-bg)] text-[var(--form-text)]" id="disclosure">
							<ThingsYouShould thinkKnow={disclosure} disc="list-disc" />
						</div>
					{:else if index == 4}
						<div class="bg-[var(--landing-bg)] text-[var(--form-text)]" id="right">
							<ThingsYouShould thinkKnow={privacyRight} disc="list-disc" />
						</div>
					{:else if index == 5}
						<div id="navigation" class="bg-[var(--landing-bg)] text-[var(--form-text)]">
							<div >
								<ThingsYouShould thinkKnow={navigatingBeyond} disc="list-disc" sectionBorder={true} />
							</div>
							<div class="">
								<ThingsYouShould thinkKnow={amendments} disc="list-disc" />
							</div>
						</div>
					{/if}
				</details>
			{/each}
		</div>
	</PageFullTextDesign>
</section>
