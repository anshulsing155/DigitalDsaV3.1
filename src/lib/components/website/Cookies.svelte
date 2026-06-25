<script>
	import ThingsYouShould from './ThingsYouShould.svelte';
	import WeAreHereHelp from './WeAreHereHelp.svelte';
	import StickyNavbar from './StickyNavbar.svelte';
	import PageFullTextDesign from './PageFullTextDesign.svelte';
	import Payments from './Payments.svelte';
	import { onMount } from 'svelte';
	import Seo from './Seo.svelte';
	import content from '$lib/data/website/cookies.json';
	import { ChevronDown } from '$lib/utils/iconRegistry';
	import { toggleDropdown } from '$lib/utils/toggleDropdown';

	let pageData = content.pageData;
	let subList = content.subList;
	let navBarMedium = content.navBarMedium;
	let cookies = content.cookies;
	let firstPartyCookies = content.firstPartyCookies;
	let thirdPartyCookies = content.thirdPartyCookies;
	let deleteCookies = content.deleteCookies;
	let help = content.help;

	// logic for second nav bar which is not working yet
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
				<div id="cookies" data-section="cookies">
					<ThingsYouShould
						thinkKnow={cookies}
						sectionBorder={cookies.sectionBorder}
						containerClass="px-0"
					/>
				</div>

				<div data-section="firstPartyCookies" id="firstPartyCookies">
					<Payments supportHeading="Different types of cookies" isBorder={true}>
						<div class="grid grid-cols-2 gap-[2rem]">
							{#each firstPartyCookies.types as type}
								<div class="col-span-1 flex flex-col gap-[2rem]">
									<h2 class="typography-body-lg !font-semibold text-[var(--form-text)]">
										{type.title}
									</h2>
									<p class="typography-body-md text-[var(--form-text-secondary)]">
										{type.desc}
									</p>
								</div>
							{/each}
						</div>
					</Payments>
				</div>

				<div data-section="thirdPartyCookies" id="thirdPartyCookies">
					<ThingsYouShould
						thinkKnow={thirdPartyCookies}
						disc="list-disc"
						sectionBorder={true}
						containerClass="px-0"
					>
						<ul slot="list" class="ml-5 list-disc">
							{#each thirdPartyCookies.links as link}
								<a
									class="text-[var(--ddsa-info-text)] underline underline-offset-4 hover:no-underline"
									href={link.url}><li>{link.name}</li></a
								>
							{/each}
						</ul>
					</ThingsYouShould>
				</div>

				<div id="deleteCookies" data-section="deleteCookies" class="py-[2rem]">
					<Payments supportHeading={deleteCookies.heading}>
						<div class="flex flex-col gap-[2rem] text-[var(--form-text-secondary)]">
							{#each deleteCookies.subPara.slice(0, 3) as paragraph}
								<p class="typography-body-md text-[var(--form-text-secondary)]">{paragraph}</p>
							{/each}
							<p class="typography-body-md text-[var(--form-text-secondary)]">{deleteCookies.subPara[3]}</p>
							{#each deleteCookies.browserInstructions as browser}
								<div class="flex flex-col gap-4">
									<h2 class="typography-body-lg !font-semibold text-[var(--form-text)]">
										{browser.heading}
									</h2>
									<div class="flex flex-col gap-4">
										<p class="typography-body-md text-[var(--form-text-secondary)]">{@html browser.para}</p>
										<p class="typography-body-md text-[var(--form-text-secondary)]">
											For more instructions visit <span
												class="text-[var(--ddsa-info-text)] underline underline-offset-4 hover:no-underline"
												><a href={browser.link.url}>{browser.link.text}</a></span
											>.
										</p>
									</div>
								</div>
							{/each}
						</div>
					</Payments>
				</div>
			</div>
		</div>
		<div class="lg:hidden">
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
						<div id="cookies" class="bg-[var(--landing-bg)] text-[var(--form-text)]">
							<ThingsYouShould thinkKnow={cookies} />
						</div>
					{:else if index == 1}
						<div
							id="firstPartyCookies"
							class="bg-[var(--landing-bg)] px-[0.5rem] pb-[4rem] text-[var(--form-text)]"
						>
							<Payments supportHeading="Different types of cookies">
								<div class="grid gap-[2rem] md:grid-cols-2">
									{#each firstPartyCookies.types as type}
										<div class="col-span-1 flex flex-col gap-[2rem]">
											<h2 class="typography-body-lg !font-semibold text-[var(--form-text)]">
												{type.title}
											</h2>
											<p class="typography-body-md text-[var(--form-text-secondary)]">
												{type.desc}
											</p>
										</div>
									{/each}
								</div>
							</Payments>
						</div>
					{:else if index == 2}
						<div id="thirdPartyCookies" class="bg-[var(--landing-bg)] pb-4 text-[var(--form-text)]">
							<ThingsYouShould thinkKnow={thirdPartyCookies} disc="list-disc">
								<ul slot="list" class="ml-5 list-disc">
									{#each thirdPartyCookies.links as link}
										<a
											class="text-[var(--ddsa-info-text)] underline underline-offset-4 hover:no-underline"
											href={link.url}><li>{link.name}</li></a
										>
									{/each}
								</ul>
							</ThingsYouShould>
						</div>
					{:else if index == 3}
						<div
							id="deleteCookies"
							class="bg-[var(--landing-bg)] px-[0.5rem] pb-4 text-[var(--form-text)]"
						>
							<Payments supportHeading={deleteCookies.heading}>
								<div class="flex flex-col gap-[2rem]">
									{#each deleteCookies.subPara.slice(0, 3) as paragraph}
										<p class="typography-body-md text-[var(--form-text-secondary)]">{paragraph}</p>
									{/each}
									<p class="typography-body-md text-[var(--form-text-secondary)]">{deleteCookies.subPara[3]}</p>
									{#each deleteCookies.browserInstructions as browser}
										<div class="flex flex-col gap-2">
											<h2 class="typography-body-lg !font-semibold text-[var(--form-text)]">
												{browser.heading}
											</h2>
											<div class="flex flex-col gap-4 py-[1rem]">
												<p class="typography-body-md text-[var(--form-text-secondary)]">{@html browser.para}</p>
												<p class="typography-body-md text-[var(--form-text-secondary)]">
													For more instructions visit <span
														class="text-[var(--ddsa-info-text)] underline underline-offset-4 hover:no-underline"
														><a href={browser.link.url}>{browser.link.text}</a></span
													>.
												</p>
											</div>
										</div>
									{/each}
								</div>
							</Payments>
						</div>
					{/if}
				</details>
			{/each}
		</div>
	</PageFullTextDesign>
</section>
