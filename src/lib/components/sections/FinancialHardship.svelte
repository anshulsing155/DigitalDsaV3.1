<script>
	let { data } = $props();

	import Button from '$lib/components/ui/Button.svelte';
	import StickyNavbar from '$lib/components/layout/StickyNavbar.svelte';
	import { onMount } from 'svelte';

	import HelpList from './HelpList.svelte';
	import ThreeColumWithLeftHeading from './ThreeColumWithLeftHeading.svelte';
	import TwoColumnWithImage from './TwoColumnWithImage.svelte';
	import Anchor from '../ui/Anchor.svelte';
	import NewPageLayout from '../layout/NewPageLayout.svelte';
	import AboveTitleWithoutIconCard from './AboveTitleWithoutIconCard.svelte';
	import ThingsYouKnow from './ThingsYouKnow.svelte';
	import Seo from '../Seo.svelte';
	import content from '$lib/data/website/financialHardship.json';
	import { ChevronDown } from '$lib/utils/iconRegistry';
	import { toggleDropdown } from '$lib/utils/toggleDropdown';

	const {
		seo,
		pageData,
		stickyNavBar,
		navBarMedium,
		getHelp,
		hardshipArrangement,
		callUs,
		canHelp,
		businessSupport,
		helpList,
		youKnowlists
	} = content;

	let activeSection = $state('');

	const initializeActiveSection = () => {
		const firstSection = document.querySelector('[data-section]');
		if (firstSection) {
			activeSection = firstSection.id;
		}
	};

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

<section>
	<NewPageLayout {pageData}>
		<div class="hidden lg:block">
			<StickyNavbar navList={stickyNavBar} {activeSection}></StickyNavbar>

			<div id="getHelp" data-section="getHelp" class="section">
				<AboveTitleWithoutIconCard contents={getHelp} isBorder />
			</div>

			<div id="arrangement" data-section="arrangement" class="section">
				<ThreeColumWithLeftHeading contents={hardshipArrangement} isBorder />
			</div>

			<div id="callUs" data-section="callUs" class="section">
				<TwoColumnWithImage contents={callUs} isBorder>
					<p class="typography-body-md text-[var(--form-text-secondary)]">
						You can easily request help at Digital DSA by visiting our website to raise an online
						request. We’ll ask a few questions to understand your situation and connect you with the
						right support. Alternatively, you can call us directly for personalized assistance. Our
						team is here to help you find the best solution for your needs, so don’t hesitate to
						reach out whenever you need support.
					</p>
					<div class="flex items-center gap-2">
						<p class="typography-body-md !font-semibold">Email:</p>
						<Anchor link="mailto:support@digitaldsa.com" linkName="support@digitaldsa.com" />
					</div>
					<div class="flex items-center gap-2">
						<p class="typography-body-md !font-semibold">Call us:</p>
						<Anchor link="tel:+918587033787" linkName="+91 8587033787" />
					</div>
				</TwoColumnWithImage>
			</div>

			<div id="canHelp" data-section="canHelp" class="section">
				<ThreeColumWithLeftHeading contents={canHelp} isBorder />
			</div>

			<div id="businessSupport" data-section="businessSupport" class="section">
				<TwoColumnWithImage contents={businessSupport}>
					<div class="grid gap-[2rem]">
						<ul class="flex list-inside list-disc flex-col gap-2">
							<p>If you're a business owner facing financial difficulties, we can assist with:</p>
							<li>Loan restructuring or refinancing (balance transfer)</li>
							<li>Debt consolidation options</li>
						</ul>
						<p>
							<a href="/appointment" class="text-[var(--ddsa-info-text)] underline"
								>Book an appointment</a
							> with our business support team for tailored solutions to support your operations during
							tough times.
						</p>
					</div>
				</TwoColumnWithImage>
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
						<div id="getHelp" class="bg-[var(--landing-bg)] text-[var(--form-text)]">
							<AboveTitleWithoutIconCard contents={getHelp} />
						</div>
					{:else if index == 1}
						<div id="arrangement" class="bg-[var(--landing-bg)] text-[var(--form-text)]">
							<ThreeColumWithLeftHeading contents={hardshipArrangement} />
						</div>
					{:else if index == 2}
						<div id="callUs" class="bg-[var(--landing-bg)] text-[var(--form-text)]">
							<TwoColumnWithImage contents={callUs} isBorder>
								<p class="typography-body-md text-[var(--form-text-secondary)]">
									You can easily request help at Digital DSA by visiting our website to raise an
									online request. We’ll ask a few questions to understand your situation and connect
									you with the right support. Alternatively, you can call us directly for
									personalized assistance. Our team is here to help you find the best solution for
									your needs, so don’t hesitate to reach out whenever you need support.
								</p>
								<div class="flex items-center gap-2">
									<p class="typography-body-md !font-semibold">Email:</p>
									<Anchor link="mailto:support@digitaldsa.com" linkName="support@digitaldsa.com" />
								</div>
								<div class="flex items-center gap-2">
									<p class="typography-body-md !font-semibold">Call us:</p>
									<Anchor link="tel:+918587033787" linkName="+91 8587033787" />
								</div>
							</TwoColumnWithImage>
						</div>
					{:else if index == 3}
						<div id="canHelp" class="bg-[var(--landing-bg)] text-[var(--form-text)]">
							<ThreeColumWithLeftHeading contents={canHelp} />
						</div>
					{:else if index == 4}
						<div id="businessSupport" class="bg-[var(--landing-bg)] text-[var(--form-text)]">
							<TwoColumnWithImage contents={businessSupport}>
								<div class="grid gap-[2rem]">
									<ul class="flex list-inside list-disc flex-col gap-2">
										<p>
											If you're a business owner facing financial difficulties, we can assist with:
										</p>
										<li>Loan restructuring or refinancing (balance transfer)</li>
										<li>Debt consolidation options</li>
									</ul>
									<p>
										<a href="/appointment" class="text-[var(--ddsa-info-text)] underline"
											>Book an appointment</a
										> with our business support team for tailored solutions to support your operations
										during tough times.
									</p>
								</div>
							</TwoColumnWithImage>
						</div>
					{/if}
				</details>
			{/each}
		</div>

		{#snippet secondary()}
			<HelpList contents={helpList} isBorder />
			<ThingsYouKnow contents={{ heading: `Things you should know` }}>
				<div class="flex list-decimal flex-col gap-4">
					{#each youKnowlists as youKnow, index}
						<p class="typography-body-md text-[var(--form-text-secondary)]">
							<span class="font-semibold">{index + 1}.</span>
							<span class="font-semibold">
								{@html youKnow.heading}
							</span>
							{@html youKnow.para}
						</p>
					{/each}
				</div>
			</ThingsYouKnow>
		{/snippet}
	</NewPageLayout>
</section>

<style>
	.section {
		scroll-margin-top: 4rem; /* Adjust this value to match your navbar height */
	}
</style>
