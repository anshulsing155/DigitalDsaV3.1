<script>
	import Button from '$lib/components/ui/Button.svelte';
	import StickyNavbar from '$lib/components/layout/StickyNavbar.svelte';
	import { onMount } from 'svelte';
	import TwoColumnWithImage from './TwoColumnWithImage.svelte';
	import HelpList from './HelpList.svelte';
	import Seo from '../Seo.svelte';
	import SecondPageLayout from '../layout/SecondPageLayout.svelte';
	import ThreeColumWithLeftHeading from './ThreeColumWithLeftHeading.svelte';
	import TwoColumnWithLeftHeading from './TwoColumnWithLeftHeading.svelte';
	import ThingsYouShould from './ThingsYouShould.svelte';
	import content from '$lib/data/website/financialCover.json';
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
	type={content.seo.type}
	title={content.seo.title}
	image={content.seo.image}
	description={content.seo.description}
	keywords={content.seo.keywords}
/>

<section class="mx-auto w-full">
	<SecondPageLayout pageData={content.pageData}>
		<div class="hidden lg:block">
			<StickyNavbar navList={content.stickyNavBar} {activeSection} />

			<div data-section="hardship" id="hardship" class="">
				<TwoColumnWithLeftHeading contents={content.hardship} isBorder />
				<TwoColumnWithImage contents={content.hardshipImageCard} isBorder>
					<ul class="typography-body-md flex flex-col gap-4">
						<li>
							{@html content.hardshipImageCard.para}
						</li>

						<div class="w-full md:w-auto">
							<Button
								btnName="Financial Support"
								btnClass="btn-secondary"
								link="/finance-support/financial-hardship"
							/>
						</div>
					</ul>
				</TwoColumnWithImage>
			</div>

			<div data-section="changes" id="changes" class="">
				<ThreeColumWithLeftHeading contents={content.changes} isBorder />
			</div>

			<div data-section="planFuture" id="planFuture" class="">
				<TwoColumnWithImage contents={content.planFuture} isBorder>
					<p>
						{content.planFuture.para}
					</p>
				</TwoColumnWithImage>
			</div>

			<div data-section="banking" id="banking" class="">
				<TwoColumnWithImage contents={content.banking} isBorder>
					<ul class="typography-body-md space-y-4 text-[var(--form-text-secondary)]">
						{#each content.banking.bullets as bullet}
							<li class="flex flex-col gap-2">
								<span class="typography-body-lg !font-semibold">{@html bullet.title}</span>
								<p>
									{@html bullet.desc}
								</p>
							</li>
						{/each}
					</ul>
				</TwoColumnWithImage>
			</div>

			<div data-section="support" id="support" class="">
				<TwoColumnWithImage contents={content.support}>
					<p>
						{content.support.para}
					</p>
					<div class="w-full lg:w-auto">
						<Button link="/contact" btnClass="btn-secondary" btnName="Contact us" />
					</div>
				</TwoColumnWithImage>
			</div>
		</div>

		<!-- accordion for mobile  -->
		<div class="lg:mt-0 lg:hidden">
			{#each content.navBarMedium as list, index}
				<details
					class="dropdown col-span-3 bg-[var(--landing-bg-card)] text-[var(--form-text)] {index <
					content.navBarMedium.length - 1
						? 'border-b border-[var(--form-border)]'
						: ''}"
				>
					<summary
						class="bg-ddsa-gradient-primary col-span-3 cursor-pointer list-none px-[1rem] py-[1.5rem] text-white"
						onclick={(e) => {
							e.preventDefault();
							toggleDropdown(e, index);
						}}
					>
						<div class="mx-auto flex w-full items-center justify-between gap-4">
							<h2 class="typography-label">{list}</h2>
							<div class="justify-self-end">
								<ChevronDown class="faq-icon transition-transform duration-300" />
							</div>
						</div>
					</summary>
					{#if index == 0}
						<div id="hardship" class="bg-[var(--landing-bg)] pb-4 text-[var(--form-text)]">
							<TwoColumnWithLeftHeading contents={content.hardship} isBorder />
							<TwoColumnWithImage contents={content.hardshipImageCard}>
								<ul class="typography-body-md flex flex-col gap-4">
									<li>
										{@html content.hardshipImageCard.para}
									</li>

									<div class="w-full md:w-auto">
										<Button
											btnName="Financial Support"
											btnClass="btn-secondary"
											link="/finance-support/financial-hardship"
										/>
									</div>
								</ul>
							</TwoColumnWithImage>
						</div>
					{:else if index == 1}
						<div id="changes" class="bg-[var(--landing-bg)] pb-4 text-[var(--form-text)]">
							<ThreeColumWithLeftHeading
								contents={{
									heading: content.changes.heading,
									cardData: content.changes.cardDataMobile
								}}
							/>
						</div>
					{:else if index == 2}
						<div id="planFuture" class="bg-[var(--landing-bg)] pb-4 text-[var(--form-text)]">
							<TwoColumnWithImage contents={content.planFuture}>
								<p>
									{content.planFuture.para}
								</p>
							</TwoColumnWithImage>
						</div>
					{:else if index == 3}
						<div id="banking" class="bg-[var(--landing-bg)] pb-4 text-[var(--form-text)]">
							<TwoColumnWithImage contents={content.banking}>
								<ul class="typography-body-md space-y-4 text-[var(--form-text-secondary)]">
									{#each content.banking.bulletsMobile as bullet}
										<li class="flex flex-col gap-2">
											<span class="typography-body-lg !font-semibold"
												>{@html bullet.title}</span
											>
											<p>
												{@html bullet.desc}
											</p>
										</li>
									{/each}
								</ul>
							</TwoColumnWithImage>
						</div>
					{:else if index == 4}
						<div id="support" class="bg-[var(--landing-bg)] pb-4 text-[var(--form-text)]">
							<TwoColumnWithImage contents={content.support}>
								<p>
									{content.support.para}
								</p>
								<div class="w-full lg:w-auto">
									<Button
										link="mailto:support@digitaldsa.com"
										btnClass="btn-secondary w-full"
										btnName="Contact us"
									/>
								</div>
							</TwoColumnWithImage>
						</div>
					{/if}
				</details>
			{/each}
		</div>

		<!-- help  -->
		{#snippet secondary()}
			<HelpList contents={content.help} isBorder />
			<ThingsYouShould
				thinkKnow={content.thingsYouShould}
				disc="list-decimal"
				containerClass="lg:px-0"
			></ThingsYouShould>
		{/snippet}
	</SecondPageLayout>
</section>
