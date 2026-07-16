<script>
	import TwoColumn from '$lib/components/sections/TwoColumn.svelte';
	import ThingsYouShould from '$lib/components/sections/ThingsYouShould.svelte';
	import StickyNavbar from '$lib/components/layout/StickyNavbar.svelte';
	import FeedbackForm from './FeedbackForm.svelte';
	import { onMount } from 'svelte';
	import { feedbackYes } from '$lib/stores/stores';
	import HelpList from './HelpList.svelte';
	import Seo from '../Seo.svelte';
	import NewPageLayout from '../layout/NewPageLayout.svelte';
	import content from '$lib/data/website/complaintCompliments.json';
	import { ChevronDown } from '$lib/utils/iconRegistry';
	import { toggleDropdown } from '$lib/utils/toggleDropdown';

	let activeSection = $state(''); // Initially no section is active
	let showFeedback = false;

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

	function scrollToFeedback(id) {
		setTimeout(() => {
			const section = document.getElementById(id);

			if (section) {
				section.scrollIntoView({ behavior: 'smooth', block: 'start' });
			}
		}, 200); // Give a short delay to ensure rendering
	}

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

<section class="content">
	<NewPageLayout pageData={content.pageData}>
		<div class="hidden w-full lg:block">
			<StickyNavbar navList={content.stickyNavBar} {activeSection} />

			<div class="lg:px-16">
				<div class="pb-8" id="makeComplaint" data-section="makeComplaint">
					<TwoColumn
						cardImage={content.makeComplaint.cardImage}
						cardAltName={content.makeComplaint.cardAltName}
						cardHeading={content.makeComplaint.cardHeading}
						reverse
						paddingClass="lg:px-0"
						isBorder={true}
					>
						<ul
							class="typography-body-md grid gap-[2rem] text-[var(--form-text-secondary)]"
							slot="list"
						>
							<li>
								{content.makeComplaint.para}
							</li>

							<div class="w-auto">
								<button
									type="button"
									onclick={() => {
										$feedbackYes = 2;
										scrollToFeedback('feedForm');
									}}
									class="btn btn-primary typography-button w-full text-[var(--form-text)] md:w-auto"
								>
									{content.makeComplaint.btnText}
								</button>
							</div>
						</ul>
					</TwoColumn>
				</div>

				<div class="pb-8" id="giveComplaint" data-section="giveComplaint">
					<TwoColumn
						cardImage={content.giveComplaint.cardImage}
						cardAltName={content.giveComplaint.cardAltName}
						cardHeading={content.giveComplaint.cardHeading}
						paddingClass="lg:px-0"
						isBorder={true}
					>
						<ul
							class="typography-body-md grid gap-[2rem] text-[var(--form-text-secondary)]"
							slot="list"
						>
							<li>
								{content.giveComplaint.para}
							</li>

							<li class="w-auto">
								<button
									type="button"
									onclick={() => {
										$feedbackYes = 5;
										scrollToFeedback('feedForm');
									}}
									class="btn btn-primary typography-button w-full text-[var(--form-text)] md:w-auto"
								>
									{content.giveComplaint.btnText}
								</button>
							</li>
						</ul>
					</TwoColumn>
				</div>
			</div>
		</div>
		<div class="lg:hidden">
			{#each content.mobileNavbarTitle as list, index (index)}
				<details
					class="dropdown border-bgBtn col-span-3 bg-[var(--landing-bg-card)] text-[var(--form-text)] {index <
					content.mobileNavbarTitle.length - 1
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
						<div class="bg-[var(--landing-bg)]  pb-8 text-[var(--form-text)]" id="makeComplaint">
							<div class="">
								<TwoColumn
									cardImage={content.makeComplaint.cardImage}
									cardAltName={content.makeComplaint.cardAltName}
									cardHeading={content.makeComplaint.cardHeading}
									paddingClass="px-0"
								>
									<ul
										class="typography-body-md grid gap-4 text-[var(--form-text-secondary)] md:gap-[2rem]"
										slot="list"
									>
										<li>
											{content.makeComplaint.para}
										</li>

										<li class="w-auto">
											<button
												type="button"
												onclick={() => {
													$feedbackYes = 2;
													scrollToFeedback('feedback');
												}}
												class="btn btn-primary typography-button w-full text-[var(--form-text)] md:w-auto"
											>
												{content.makeComplaint.btnText}
											</button>
										</li>
									</ul>
								</TwoColumn>
							</div>
						</div>
					{:else}
						<div class="bg-[var(--landing-bg)]  pb-8 text-[var(--form-text)]" id="giveComplaint">
							<div>
								<TwoColumn
									cardImage={content.giveComplaint.cardImage}
									cardAltName={content.giveComplaint.cardAltName}
									cardHeading={content.giveComplaint.cardHeading}
									paddingClass="px-0"
									isBorder={true}
								>
									<ul
										class="typography-body-md grid gap-[2rem] text-[var(--form-text-secondary)]"
										slot="list"
									>
										<li>
											{content.giveComplaint.para}
										</li>

										<div class="w-auto">
											<div class="w-auto">
												<button
													type="button"
													onclick={() => {
														$feedbackYes = 5;
														scrollToFeedback('feedback');
													}}
													class="btn btn-primary typography-button w-full text-[var(--form-text)] md:w-auto"
												>
													{content.giveComplaint.btnText}
												</button>
											</div>
										</div>
									</ul>
								</TwoColumn>
							</div>
						</div>
					{/if}
				</details>
			{/each}
		</div>
		<div id="feedback" data-section="feedback" class="bg-[var(--landing-bg)] px-[0.5rem] text-[var(--form-text)]">
			<div class="flex flex-col gap-[3rem] bg-[var(--landing-bg)] pt-[4rem] pb-[8rem]" id="loans">
				<div id="feedForm" class="feedForm space-y-3 text-center">
					<FeedbackForm />
				</div>
			</div>
		</div>
		{#snippet secondary()}
			<HelpList contents={content.help} isBorder />

			<ThingsYouShould thinkKnow={content.thingsYouShould} disc="list-decimal" containerClass="px-0" />
		{/snippet}
	</NewPageLayout>
</section>
