<script lang="ts">
	import ThingsYouShould from '$lib/components/website/ThingsYouShould.svelte';
	import { onMount } from 'svelte';
	import Anchor from '$lib/components/website/Anchor.svelte';
	import HelpList from '$lib/components/website/HelpList.svelte';
	import AboveTitleWithTopIconCard from '$lib/components/website/AboveTitleWithTopIconCard.svelte';
	import AboveTitleWithoutIconCard from '$lib/components/website/AboveTitleWithoutIconCard.svelte';
	import Seo from '$lib/components/Seo.svelte';
	import SecondPageLayout from '$lib/components/website/SecondPageLayout.svelte';
	import StickyNavbar from '$lib/components/website/StickyNavbar.svelte';
	import content from '$lib/data/website/arrangeDownPayment.json';
	import SectionIntro from '$lib/components/website/SectionIntro.svelte';
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
			<div class="px-[4rem]">
				<div data-section="first" id="first" class="">
					<SectionIntro
						heading={content.yourSavings.heading}
						para={content.yourSavings.para}
						containerClass="px-0"
						isBorder={true}
					/>

					<!-- planning -->
					<SectionIntro
						heading={content.planning.heading}
						para={content.planning.para}
						containerClass="px-0"
						isBorder={true}
					>
						<ul class="space-y-6">
							{#each content.planning.listItems as list}
								<li class="space-y-2">
									<h3 class="typography-body-lg !font-semibold text-[var(--form-text)]">
										{list.heading}
									</h3>
									<p class="typography-body-md text-[var(--form-text-secondary)]">{list.desc}</p>
								</li>
							{/each}
						</ul>
					</SectionIntro>
				</div>

				<!-- money map -->
				<div data-section="smart" id="smart" class="">
					<AboveTitleWithTopIconCard contents={content.smartSavings} 
					isBorder 
					paddingClass="px-0" />
				</div>

				<!-- withdraw and pay -->
				<div data-section="pay" id="pay" class="">
					<AboveTitleWithoutIconCard contents={content.withdrawAndPay}  
					paddingClass="px-0"
					isBorder
					/>
				</div>

				<!-- invest and save -->
				<div data-section="invest" id="invest" class="">
					<AboveTitleWithTopIconCard
						contents={content.smartInvesting}
						listGridAboveLg="2"
						paddingClass="px-0"
						isBorder
					/>
				</div>
				<!-- take loan -->
				<div data-section="loan" id="loan" class="">
					<SectionIntro
						heading={content.loan.heading}
						para={content.loan.para}
						containerClass="px-0"
						isBorder={false}
					>
						<ul class="space-y-6">
							{#each content.loan.listItems as list}
								<li class="space-y-2">
									<h3 class="typography-body-md !font-semibold text-[var(--form-text)]">
										{list.heading}
									</h3>
									<p class="typography-body-md text-[var(--form-text-secondary)]">{@html list.desc}</p>
								</li>
							{/each}
						</ul>
						<Anchor link={content.loan.listUrl.url} linkName={content.loan.listUrl.linkName} />
					</SectionIntro>
				</div>
			</div>
		</div>

		<div class="lg:hidden">
			{#each content.navBarMedium as list, index (index)}
				<details
					class="dropdown border-bgBtn col-span-3 bg-[var(--landing-bg-card)] text-[var(--form-text)] {index <
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
						<div id="first" class="bg-[var(--landing-bg)]  text-[var(--form-text)]">
							<SectionIntro
								heading={content.yourSavings.heading}
								para={content.yourSavings.para}
								containerClass="px-0"
								isBorder={true}
							/>

							<!-- planning -->
							<SectionIntro
								heading={content.planning.heading}
								para={content.planning.para}
								containerClass="px-0"
								isBorder={false}
							>
								<ul class="space-y-6">
									{#each content.planning.listItems as list}
										<li class="space-y-2">
											<h3 class="typography-body-lg !font-semibold text-[var(--form-text)]">
												{list.heading}
											</h3>
											<p class="typography-body-md text-[var(--form-text-secondary)]">
												{list.desc}
											</p>
										</li>
									{/each}
								</ul>
							</SectionIntro>
						</div>
					{:else if index == 1}
						<div
							id="smart"
							class="border-[var(--form-border)] bg-[var(--landing-bg)] text-[var(--form-text)]"
						>
							<AboveTitleWithTopIconCard contents={content.smartSavings} />
						</div>
					{:else if index == 2}
						<div
							id="pay"
							class="border-[var(--form-border)] bg-[var(--landing-bg)] text-[var(--form-text)]"
						>
							<AboveTitleWithoutIconCard contents={content.withdrawAndPay} />
						</div>
					{:else if index == 3}
						<div
							id="invest"
							class="border-[var(--form-border)] bg-[var(--landing-bg)] text-[var(--form-text)]"
						>
							<AboveTitleWithTopIconCard contents={content.smartInvesting} listGridAboveLg="2" />
						</div>
					{:else if index == 4}
						<div data-section="loan" id="loan" class="">
							<SectionIntro
								heading={content.loan.heading}
								para={content.loan.para}
								containerClass="px-0"
								isBorder={false}
							>
								<ul class="space-y-6">
									{#each content.loan.listItems as list}
										<li class="space-y-2">
											<h3 class="typography-body-md !font-semibold text-[var(--form-text)]">
												{list.heading}
											</h3>
											<p class="typography-body-md text-[var(--form-text-secondary)]">
												{@html list.desc}
											</p>
										</li>
									{/each}
								</ul>
								<Anchor link={content.loan.listUrl.url} linkName={content.loan.listUrl.linkName} />
							</SectionIntro>
						</div>
					{/if}
				</details>
			{/each}
		</div>

		{#snippet secondary()}
			<HelpList contents={content.help} />
			<ThingsYouShould
				thinkKnow={content.thingsYouShould}
				disc="list-decimal"
				containerClass="px-0"
			/>
		{/snippet}
	</SecondPageLayout>
</section>
