<script lang="ts">
	import Guides from '$lib/components/website/Guides.svelte';
	import HelpList from '$lib/components/website/HelpList.svelte';
	import PageFullTextDesign from '$lib/components/website/PageFullTextDesign.svelte';
	import Seo from '$lib/components/Seo.svelte';
	import StickyNavbar from '$lib/components/website/StickyNavbar.svelte';
	import Support from '$lib/components/website/Support.svelte';
	import { onMount } from 'svelte';
	import content from '$lib/data/website/importantInfo.json';
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
	description={content.seo.description}
	keywords={content.seo.keywords}
/>

<section>
	<PageFullTextDesign pageData={content.pageData}>
		<div class="hidden lg:block">
			<StickyNavbar navList={{ items: content.navBarLarge }} {activeSection} />
		</div>

		<div class="hidden lg:block lg:px-[4rem]">
			<div data-section="FinancialServicesGuides" id="FinancialServicesGuides">
				<Guides guide={content.serviceGuide} paddingClass="px-0"/>
			</div>
			<div data-section="ProductDisclosureStatements" id="ProductDisclosureStatements">
				<Guides guide={content.disclosure} paddingClass="px-0" />
			</div>
			<div
				data-section="Productcategories"
				id="Productcategories"
				class="grid gap-[2rem] pt-[4rem] pb-[8rem] lg:grid-cols-3"
			>
				<p class="typography-h2-md text-nowrap text-[var(--form-text)]">Product Categories</p>
				<div class="col-span-2">
					<Support contents={content.contents} gridCol={2} />
				</div>
			</div>
		</div>

		<div class="lg:hidden">
			{#each content.navBarMedium as list, index}
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
						<div
							id="Financial Services Guides"
							class="bg-[var(--landing-bg)] text-[var(--form-text)]"
						>
							<Guides guide={content.serviceGuide} />
						</div>
					{:else if index == 1}
						<div
							id="Product Disclosure Statements"
							class="bg-[var(--landing-bg)] text-[var(--form-text)]"
						>
							<Guides guide={content.disclosure} />
						</div>
					{:else if index == 2}
						<div
							id="Product categories"
							class="grid gap-[2rem] bg-[var(--landing-bg)] px-[0.5rem] py-[4rem] text-[var(--form-text)] lg:grid-cols-3 lg:px-0"
						>
							<p class="typography-h2 text-[var(--form-text)]">Product Categories</p>
							<div class="col-span-2">
								<Support contents={content.contents} gridCol={2} />
							</div>
						</div>
					{/if}
				</details>
			{/each}
		</div>

		<div slot="secondary">
			<HelpList contents={content.help} />
		</div>
	</PageFullTextDesign>
</section>
