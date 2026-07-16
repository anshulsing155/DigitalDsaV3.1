<script lang="ts">
	import SecondPageLayout from '$lib/components/website/SecondPageLayout.svelte';
	import StickyNavbar from '$lib/components/website/StickyNavbar.svelte';
	import TwoColumn from '$lib/components/website/TwoColumn.svelte';
	import TwoColumnWithLeftHeading from '$lib/components/website/TwoColumnWithLeftHeading.svelte';
	import TwoColumnWithImage from '$lib/components/website/TwoColumnWithImage.svelte';
	import Button from '$lib/components/website/Button.svelte';
	import HelpList from '$lib/components/website/HelpList.svelte';
	import { onMount } from 'svelte';
	import { slide } from 'svelte/transition';
	import Seo from '$lib/components/website/Seo.svelte';
	import content from '$lib/data/website/creditsAttributions.json';
	import { ChevronDown } from '$lib/utils/iconRegistry';
	import { toggleDropdown } from '$lib/utils/toggleDropdown';
	import SectionIntro from '$lib/components/website/SectionIntro.svelte';

	let activeSection = $state('');
	let activeIndex = $state<number | null>(null);
	const slideDuration = 400;

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

<section class="content">
	<SecondPageLayout pageData={content.pageData}>
		<!-- desktop view  -->

		<div class="hidden lg:block">
			<StickyNavbar navList={content.stickyNavBar} {activeSection} />
			<div class="lg:px-16">
				<div data-section="attribution" id="attribution">
					<SectionIntro
						heading={content.attributionText.heading}
						para={content.attributionText.para}
						containerClass="px-0"
					/>
				</div>

				<div data-section="resources" id="resources" class="">
					<TwoColumn
						cardImage={content.resources.cardImage}
						cardAltName={content.resources.cardAltName}
						cardHeading={content.resources.cardHeading}
						sourceName={content.resources.sourceName}
						originalSource={content.resources.originalSource}
						reverse={true}
						isBorder={true}
						paddingClass="lg:px-0"
					>
						<ul class="typography-body-md grid gap-8 text-[var(--form-text-secondary)]" slot="list">
							<div class="grid gap-5">
								<li>
									{content.resources.para}
								</li>
								<li
									class="typography-body-sm my-7 border-l-4 border-primary bg-[var(--color-bg-alt)] p-4"
								>
									<p>
										<span class=" !font-semibold">Attribution : </span>
										<span class="pt-2">
											{@html content.resources.attributionAlert}
										</span>
									</p>
								</li>
								<li>
									<ul class="list-inside list-disc">
										<p class="pb-4">
											{content.resources.intro}
										</p>
										{#each content.resources.platforms as platform}
											<li class="pb-2">
												{platform.name}
												{#each platform.links as link, i}
													<a
														class="text-[var(--ddsa-info-text)] underline underline-offset-4 hover:no-underline"
														href={link.url}
													>
														{link.text}
													</a>{#if i < platform.links.length - 1}
														<span class="px-2"> &</span>
													{/if}
												{/each}
												details
											</li>
										{/each}
										<p class="pt-8">
											{@html content.resources.footer}
										</p>
									</ul>
								</li>
							</div>
						</ul>
					</TwoColumn>
				</div>

				<div data-section="logo" id="logo">
					<TwoColumnWithLeftHeading contents={content.logo} paddingClass="px-0" isBorder={true} />
				</div>

				<div data-section="compliance" id="compliance">
					<TwoColumnWithLeftHeading
						contents={content.compliance}
						paddingClass="px-0"
						isBorder={true}
					/>
				</div>
			</div>
		</div>

		<!-- mobile view  -->
		<div class="block lg:hidden">
			{#each content.navBarMedium as list, index}
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
						<div
							data-section="attribution"
							id="attribution"
							class="bg-[var(--landing-bg)] px-[0.5rem] text-[var(--form-text)]"
						>
							<SectionIntro
								heading={content.attributionText.heading}
								para={content.attributionText.para}
								containerClass="px-0"
							/>
						</div>
					{:else if index == 1}
						<div id="resources" class="bg-[var(--landing-bg)] px-[0.5rem] text-[var(--form-text)]">
							<TwoColumn
								cardImage={content.resources.cardImage}
								cardAltName={content.resources.cardAltName}
								cardHeading={content.resources.cardHeading}
								sourceName=""
								originalSource="www.digitaldsa.com"
								reverse={true}
							>
								<ul
									class="typography-body-md grid gap-8 text-[var(--form-text-secondary)]"
									slot="list"
								>
									<div class="grid gap-5">
										<li>
											{content.resources.para}
										</li>
										<li
											class="my-7 border-l-4 border-[var(--form-border)] bg-[var(--color-bg-alt)] p-4"
										>
											<p>
												<span class="typography-body-lg !font-semibold text-[var(--form-text)]"
													>Attribution :
												</span>
												<span class="">
													{@html content.resources.attributionAlert}
												</span>
											</p>
										</li>
										<li>
											<div>
												<p class="pb-4">
													{content.resources.intro}
												</p>
												<ul class="list-disc pl-4">
													{#each content.resources.platforms as platform}
														<li class="pb-2">
															{platform.name}
															{#each platform.links as link, i}
																<a
																	class="text-[var(--ddsa-info-text)] underline underline-offset-4 hover:no-underline"
																	href={link.url}
																>
																	{link.text}</a
																>{#if i < platform.links.length - 1}
																	<span class="px-2">&</span>
																{/if}
															{/each}
															details
														</li>
													{/each}
												</ul>
												<p class="pt-8">
													{@html content.resources.footer}
												</p>
											</div>
										</li>
									</div>
								</ul>
							</TwoColumn>
						</div>
					{:else if index == 2}
						<div id="logo" class="bg-[var(--landing-bg)] px-[0.5rem] text-[var(--form-text)]">
							<TwoColumnWithLeftHeading contents={content.logo} />
						</div>
					{:else if index == 3}
						<div id="compliance" class="bg-[var(--landing-bg)] text-[var(--form-text)]">
							<TwoColumnWithLeftHeading contents={content.compliance} />
						</div>
					{/if}
				</details>
			{/each}
		</div>

		<TwoColumnWithImage contents={content.messageUs}>
			<p>
				{content.messageUs.para}
			</p>
			<div class="w-auto">
				<Button link="/contact" btnClass="btn-secondary w-full" btnName="Message us" />
			</div>
		</TwoColumnWithImage>

		{#snippet secondary()}
			<HelpList contents={content.help} />
		{/snippet}
	</SecondPageLayout>
</section>
