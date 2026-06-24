<script lang="ts">
	import ThingsYouShould from '$lib/components/website/ThingsYouShould.svelte';
	import { onMount } from 'svelte';
	import HelpList from '$lib/components/website/HelpList.svelte';
	import Seo from '$lib/components/Seo.svelte';
	import SecondPageLayout from '$lib/components/website/SecondPageLayout.svelte';
	import StickyNavbar from '$lib/components/website/StickyNavbar.svelte';
	import content from '$lib/data/website/protectYourBusiness.json';
	import { ChevronDown } from '$lib/utils/iconRegistry';
	import { toggleDropdown } from '$lib/utils/toggleDropdown';
	import SectionIntro from './SectionIntro.svelte';

	const {
		seo,
		pageData,
		stickyNavBar,
		navBarMedium,
		threatReal,
		common,
		plan,
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
			<div data-section="real" id="real">
				<SectionIntro isBorder>
					<p class="typography-body-md text-[var(--form-text-secondary)]">
						Imagine waking up to find that your business bank account is wiped clean, or that your
						customers' personal data is leaked online. Unfortunately, this is the reality for
						thousands of Indian businesses every year. Cyber-crime is no longer just a technology
						problem—it affects everyone, from small business owners using digital payments to large
						enterprises handling vast amounts of customer data.
					</p>
				</SectionIntro>

				<SectionIntro
					heading={threatReal.heading}
					subHeading={threatReal.subHead}
					para={threatReal.para}
					isBorder
				/>
			</div>
			<!-- common threat -->
			<div data-section="common" id="common">
				<SectionIntro heading={common.heading} isBorder>
					<ul class="space-y-6">
						{#each common.listItems as list}
							<li class="space-y-2">
								<h3 class="typography-body-md !font-semibold text-[var(--form-text)]">
									{list.heading}
								</h3>
								<p class="typography-body-md text-[var(--form-text-secondary)]">
									{@html list.desc}
								</p>
								<p class="typography-body-md text-[var(--form-text-secondary)]">
									{@html list.story}
								</p>
							</li>
						{/each}
					</ul>
				</SectionIntro>
			</div>
			<!-- protect business -->
			<div data-section="protect" id="protect">
				<SectionIntro heading={plan.heading} isBorder>
					{#each plan.listItems as list}
						<h3 class="typography-body-md !font-semibold text-[var(--form-text)]">
							{list.subHead}
						</h3>
						<ul class="space-y-2 pl-5">
							{#each list.lists as item}
								<li
									class="typography-body-md list-disc space-y-2 text-[var(--form-text-secondary)]"
								>
									{item}
								</li>
							{/each}
						</ul>
					{/each}
				</SectionIntro>
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
						<div id="real" class="bg-[var(--landing-bg)]">
							<SectionIntro isBorder containerClass="!gap-0 !py-[4rem]">
								<p class="typography-body-md text-[var(--form-text-secondary)] ">
									Imagine waking up to find that your business bank account is wiped clean, or that
									your customers' personal data is leaked online. Unfortunately, this is the reality
									for thousands of Indian businesses every year. Cyber-crime is no longer just a
									technology problem—it affects everyone, from small business owners using digital
									payments to large enterprises handling vast amounts of customer data.
								</p>
							</SectionIntro>

							<SectionIntro
								heading={threatReal.heading}
								subHeading={threatReal.subHead}
								para={threatReal.para}
							/>
						</div>
					{:else if index == 1}
						<div id="common" class="bg-[var(--landing-bg)]">
							<SectionIntro heading={common.heading}>
								<ul class="space-y-6">
									{#each common.listItems as list}
										<li class="space-y-2">
											<h3 class="typography-body-md !font-semibold text-[var(--form-text)]">
												{list.heading}
											</h3>
											<p class="typography-body-md text-[var(--form-text-secondary)]">
												{@html list.desc}
											</p>
											<p class="typography-body-md text-[var(--form-text-secondary)]">
												{@html list.story}
											</p>
										</li>
									{/each}
								</ul>
							</SectionIntro>
						</div>
					{:else if index == 2}
						<div id="protect" class="bg-[var(--landing-bg)]">
							<SectionIntro heading={plan.heading}>
								{#each plan.listItems as list}
									<h3 class="typography-body-md !font-semibold text-[var(--form-text)]">
										{list.subHead}
									</h3>
									<ul class="space-y-2 pl-5">
										{#each list.lists as item}
											<li
												class="typography-body-md list-disc space-y-2 text-[var(--form-text-secondary)]"
											>
												{item}
											</li>
										{/each}
									</ul>
								{/each}
							</SectionIntro>
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
