<script>
	import PageFullTextDesign from '../layout/PageFullTextDesign.svelte';
	import StickyNavbar from '../layout/StickyNavbar.svelte';
	import ThingsYouShould from './ThingsYouShould.svelte';
	import { onMount } from 'svelte';
	import Seo from '../layout/Seo.svelte';
	import content from '$lib/data/website/termsConditions.json';
	import { ChevronDown } from '$lib/utils/iconRegistry';
	import { toggleDropdown } from '$lib/utils/toggleDropdown';

	let pageData = content.pageData;
	let subList = content.subList;
	let navBarMedium = content.navBarMedium;
	let explore = content.explore;
	let responsibilities = content.responsibilities;
	let eligibility = content.eligibility;
	let dataResponsibilities = content.dataResponsibilities;
	let submission = content.submission;
	let limitation = content.limitation;
	let online = content.online;
	let compliance = content.compliance;
	let communication = content.communication;
	let posting = content.posting;
	let externalLink = content.externalLink;
	let changes = content.changes;
	let intellectual = content.intellectual;
	let continued = content.continued;
	let standard = content.standard;
	let indemnification = content.indemnification;

	// logic for second nav bar which is working in Svelte 5
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

<section class="content">
	<PageFullTextDesign {pageData}>
		<div class="hidden lg:block">
			<StickyNavbar navList={subList} {activeSection} />
			<div class="lg:px-16">
				<div id="explore" data-section="explore">
					<div>
						<ThingsYouShould thinkKnow={explore} disc="list-disc" sectionBorder={true} containerClass="px-0" />
					</div>
					<div>
						<ThingsYouShould thinkKnow={responsibilities} disc="list-disc" sectionBorder={true} containerClass="px-0" />
					</div>
				</div>
				<div id="restriction" data-section="restriction">
					<div>
						<ThingsYouShould thinkKnow={eligibility} disc="list-disc" sectionBorder={true} containerClass="px-0" />
					</div>
					<div>
						<ThingsYouShould thinkKnow={dataResponsibilities} disc="list-disc" sectionBorder={true} containerClass="px-0" />
					</div>
				</div>
				<div id="submission" data-section="submission">
					<div>
						<ThingsYouShould thinkKnow={submission} disc="list-disc" sectionBorder={true} containerClass="px-0" />
					</div>
					<div>
						<ThingsYouShould thinkKnow={limitation} disc="list-disc" sectionBorder={true} containerClass="px-0" />
					</div>
				</div>
				<div id="online" data-section="online">
					<div>
						<ThingsYouShould thinkKnow={online} disc="list-disc" sectionBorder={true} containerClass="px-0" />
					</div>
					<div>
						<ThingsYouShould thinkKnow={compliance} disc="list-disc" sectionBorder={true} containerClass="px-0" />
					</div>
				</div>
				<div id="communication" data-section="communication">
					<div>
						<ThingsYouShould thinkKnow={communication} disc="list-disc" sectionBorder={true} containerClass="px-0" />
					</div>
					<div>
						<ThingsYouShould thinkKnow={posting} disc="list-disc" sectionBorder={true} containerClass="px-0" />
					</div>
				</div>
				<div id="externalLink" data-section="externalLink">
					<div>
						<ThingsYouShould thinkKnow={externalLink} disc="list-disc" sectionBorder={true} containerClass="px-0" />
					</div>
					<div>
						<ThingsYouShould thinkKnow={changes} disc="list-disc" sectionBorder={true} containerClass="px-0" />
					</div>
				</div>
				<div id="intellectual" data-section="intellectual">
					<div>
						<ThingsYouShould thinkKnow={intellectual} disc="list-disc" sectionBorder={true} containerClass="px-0" />
					</div>
					<div>
						<ThingsYouShould thinkKnow={continued} disc="list-disc" sectionBorder={true} containerClass="px-0" />
					</div>
				</div>
				<div id="standard" data-section="standard">
					<div>
						<ThingsYouShould thinkKnow={standard} disc="list-disc" sectionBorder={true} containerClass="px-0" />
					</div>
					<div>
						<ThingsYouShould thinkKnow={indemnification} disc="list-disc" containerClass="px-0" />
					</div>
				</div>
			</div>
		</div>
		<div class="block lg:hidden">
			{#each navBarMedium as list, index}
				<details
					class="dropdown col-span-3 bg-[var(--landing-bg-card)] text-[var(--form-text)] {index <
					content.navBarMedium.length - 1
						? 'border-b border-[var(--form-border)]'
						: ''}"
				>
					<summary
						class="bg-ddsa-gradient-primary col-span-3 list-none px-[1rem] py-[1.5rem] cursor-pointer text-white"
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
						<div id="explore" data-section="explore" class="bg-[var(--landing-bg)] text-[var(--form-text)]">
							<div>
								<ThingsYouShould thinkKnow={explore} disc="list-disc" sectionBorder={true} />
							</div>
							<div>
								<ThingsYouShould thinkKnow={responsibilities} disc="list-disc" />
							</div>
						</div>
					{:else if index == 1}
						<div id="restriction" data-section="restriction" class="bg-[var(--landing-bg)] text-[var(--form-text)]">
							<div>
								<ThingsYouShould thinkKnow={eligibility} disc="list-disc" sectionBorder={true} />
							</div>
							<div>
								<ThingsYouShould thinkKnow={dataResponsibilities} disc="list-disc" />
							</div>
						</div>
					{:else if index == 2}
						<div id="submission" data-section="submission" class="bg-[var(--landing-bg)] text-[var(--form-text)]">
							<div>
								<ThingsYouShould thinkKnow={submission} disc="list-disc"  sectionBorder={true} />
							</div>
							<div>
								<ThingsYouShould thinkKnow={limitation} disc="list-disc" />
							</div>
						</div>
					{:else if index == 3}
						<div id="online" data-section="online" class="bg-[var(--landing-bg)] text-[var(--form-text)]">
							<div>
								<ThingsYouShould thinkKnow={online} disc="list-disc"  sectionBorder={true} />
							</div>
							<div>
								<ThingsYouShould thinkKnow={compliance} disc="list-disc" />
							</div>
						</div>
					{:else if index == 4}
						<div id="communication" data-section="communication" class="bg-[var(--landing-bg)] text-[var(--form-text)]">
							<div>
								<ThingsYouShould thinkKnow={communication} disc="list-disc"  sectionBorder={true} />
							</div>
							<div>
								<ThingsYouShould thinkKnow={posting} disc="list-disc" />
							</div>
						</div>
					{:else if index == 5}
						<div id="externalLink" data-section="externalLink" class="bg-[var(--landing-bg)] text-[var(--form-text)]">
							<div>
								<ThingsYouShould thinkKnow={externalLink} disc="list-disc"  sectionBorder={true} />
							</div>
							<div>
								<ThingsYouShould thinkKnow={changes} disc="list-disc" />
							</div>
						</div>
					{:else if index == 6}
						<div id="intellectual" data-section="intellectual" class="bg-[var(--landing-bg)] text-[var(--form-text)]">
							<div>
								<ThingsYouShould thinkKnow={intellectual} disc="list-disc"  sectionBorder={true} />
							</div>
							<div>
								<ThingsYouShould thinkKnow={continued} disc="list-disc" />
							</div>
						</div>
					{:else if index == 7}
						<div id="standard" data-section="standard" class="bg-[var(--landing-bg)] text-[var(--form-text)]">
							<div>
								<ThingsYouShould thinkKnow={standard} disc="list-disc" sectionBorder={true} />
							</div>
							<div>
								<ThingsYouShould thinkKnow={indemnification} disc="list-disc" />
							</div>
						</div>
					{/if}
				</details>
			{/each}
		</div>
	</PageFullTextDesign>
</section>
