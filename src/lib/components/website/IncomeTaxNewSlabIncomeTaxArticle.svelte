<script lang="ts">
	import ThingsYouShould from '$lib/components/website/ThingsYouShould.svelte';
	import { onMount } from 'svelte';
	import HelpList from '$lib/components/website/HelpList.svelte';
	import Seo from '$lib/components/Seo.svelte';
	import SecondPageLayout from '$lib/components/website/SecondPageLayout.svelte';
	import StickyNavbar from '$lib/components/website/StickyNavbar.svelte';
	import PaymentTable from './PaymentTable.svelte';
	import content from '$lib/data/website/incomeTax.json';
	import { ChevronDown } from '$lib/utils/iconRegistry';
	import { toggleDropdown } from '$lib/utils/toggleDropdown';
	import SectionIntro from './SectionIntro.svelte';

	const {
		seo,
		pageData,
		stickyNavBar,
		navBarMedium,
		taxPayers,
		income,
		tableData,
		deduction,
		itr,
		deadline,
		penalties,
		conclusion,
		helpList,
		thingsYouShouldKnow
	} = content;

	let currentDate = $state('');

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

		const today = new Date();
		currentDate = today.toLocaleDateString('en-IN', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});

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
			<!-- overview -->
			<div data-section="incomeTax" id="incomeTax" >
				<SectionIntro isBorder>
					<span class="typography-body-sm text-[var(--form-text-secondary)] text-gray-600">
						Posted on: {currentDate}
					</span>
					<p class="typography-body-md text-[var(--form-text-secondary)]">
						Income tax is a crucial financial obligation for every individual and business in India.
						With the Union Budget 2025 introducing new
						<strong>income tax slabs in India 2025</strong> and enhanced deductions, understanding
						the latest regulations can help you save taxes and stay compliant. This comprehensive
						guide covers income tax slabs, deductions, exemptions, and the online filing process for
						the financial year
						<strong>2025-26 (AY 2026-27)</strong>.
						<br /> <br />
						👉<a
							href="https://www.incometaxindia.gov.in"
							target="_blank"
							rel="noopener noreferrer"
							class="text-[var(--ddsa-info-text)] underline underline-offset-4 hover:no-underline"
							>Income Tax Department of India</a
						>
					</p>
				</SectionIntro>

				<SectionIntro  heading="What is Income Tax?" isBorder>
					<p class="typography-body-mdtext-[var(--form-text-secondary)]">
						Income tax is a direct tax levied on an individual’s or entity’s earnings during a
						financial year. It is governed by the <strong>Income Tax Act, 1961</strong>, and applies
						to income from salary, business, investments, and other sources. The financial year in
						India runs from
						<strong>April 1 to March 31</strong>, with the tax return due by
						<strong>July 31</strong> of the following year.
					</p>
				</SectionIntro>

				<SectionIntro  heading={taxPayers.heading} isBorder>
					<ul class="space-y-6">
						{#each taxPayers.listItems as list}
							<li class="space-y-2">
								<h3 class="typography-body-md !font-semibold">
									{list.heading}
								</h3>
								<p class="typography-body-md text-[var(--form-text-secondary)]">
									{list.desc}
								</p>
							</li>
						{/each}
					</ul>
				</SectionIntro>

				<SectionIntro  heading={income.heading} isBorder>
					<ul class="space-y-6">
						{#each income.listItems as list}
							<li class="space-y-2">
								<h3 class="typography-body-md !font-semibold">{list.heading}</h3>
								<p class="typography-body-md text-[var(--form-text-secondary)]">
									{list.desc}
								</p>
							</li>
						{/each}
					</ul>
				</SectionIntro>
			</div>

			<!-- income tax slab table -->
			<div data-section="slab" id="slab" >
				<div
					class="flex w-full flex-col gap-[2rem] border-b border-[var(--form-border)] px-[0.5rem] py-[4rem] lg:px-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem]"
				>
					<h2 class="typography-h2-md text-[var(--form-text)]">
						📊 Income Tax Slabs in India 2025 (New Regime)
					</h2>
					<div >
						{#each tableData as tbl}
							<PaymentTable tableData={tbl} />
						{/each}
					</div>
				</div>
			</div>

			<!-- income tax deductions -->
			<div data-section="deduction" id="deduction" >
				<SectionIntro heading={deduction.heading} isBorder>
					<ul class="space-y-6">
						{#each deduction.listItems as list}
							<li class="space-y-2">
								<h3 class="typography-body-md !font-semibold">
									{list.heading}
								</h3>
								<p class="typography-body-md text-[var(--form-text-secondary)]">
									{list.desc}
								</p>
							</li>
						{/each}
					</ul>
				</SectionIntro>

				<SectionIntro heading={itr.heading} isBorder>
					<ul class="space-y-6">
						{#each itr.listItems as list}
							<li class="typography-body-md space-y-2 text-[var(--form-text-secondary)]">
								<span class="font-semibold">{list.num}</span>
								{@html list.desc}
							</li>
						{/each}
					</ul>
				</SectionIntro>
			</div>

			<!-- deadlines -->
			<div data-section="deadline" id="deadline" >
				<SectionIntro heading={deadline.heading} isBorder>
					<ul class="space-y-6">
						{#each deadline.listItems as list}
							<li class="typography-body-md space-y-2 text-[var(--form-text-secondary)]">
								<span class="font-semibold">{list.date}</span>
								{@html list.desc}
							</li>
						{/each}
					</ul>
				</SectionIntro>

				<SectionIntro heading={penalties.heading} isBorder>
					<ul class="space-y-6 pl-4">
						{#each penalties.listItems as list}
							<li class="typography-body-md list-disc space-y-2 text-[var(--form-text-secondary)]">
								{@html list.desc}
							</li>
						{/each}
					</ul>
				</SectionIntro>
			</div>

			<!-- conclusion -->
			<div data-section="conclusion" id="conclusion" >
				<SectionIntro heading={conclusion.heading} para={conclusion.para} />
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
						<div id="incomeTax" class="bg-[var(--landing-bg)]">
							<SectionIntro containerClass="!gap-0" isBorder>
								<span class="typography-body-sm text-[var(--form-text-secondary)] text-gray-600">
									Posted on: {currentDate}
								</span>
								<p class="typography-body-md text-[var(--form-text-secondary)]">
									Income tax is a crucial financial obligation for every individual and business in
									India. With the Union Budget 2025 introducing new
									<strong>income tax slabs in India 2025</strong> and enhanced deductions,
									understanding the latest regulations can help you save taxes and stay compliant.
									This comprehensive guide covers income tax slabs, deductions, exemptions, and the
									online filing process for the financial year
									<strong>2025-26 (AY 2026-27)</strong>.
									<br /> <br />
									👉<a
										href="https://www.incometaxindia.gov.in"
										target="_blank"
										rel="noopener noreferrer"
										class="text-[var(--ddsa-info-text)] underline underline-offset-4 hover:no-underline"
										>Income Tax Department of India</a
									>
								</p>
							</SectionIntro>

							<SectionIntro containerClass="!gap-4" heading="What is Income Tax?" isBorder>
								<p class="typography-body-mdtext-[var(--form-text-secondary)]">
									Income tax is a direct tax levied on an individual’s or entity’s earnings during a
									financial year. It is governed by the <strong>Income Tax Act, 1961</strong>, and
									applies to income from salary, business, investments, and other sources. The
									financial year in India runs from
									<strong>April 1 to March 31</strong>, with the tax return due by
									<strong>July 31</strong> of the following year.
								</p>
							</SectionIntro>

							<SectionIntro containerClass="!gap-4" heading={taxPayers.heading} isBorder>
								<ul class="space-y-6">
									{#each taxPayers.listItems as list}
										<li class="space-y-2">
											<h3 class="typography-body-md !font-semibold">
												{list.heading}
											</h3>
											<p class="typography-body-md text-[var(--form-text-secondary)]">
												{list.desc}
											</p>
										</li>
									{/each}
								</ul>
							</SectionIntro>

							<SectionIntro containerClass="!gap-4" heading={income.heading}>
								<ul class="space-y-6">
									{#each income.listItems as list}
										<li class="space-y-2">
											<h3 class="typography-body-md !font-semibold">{list.heading}</h3>
											<p class="typography-body-md text-[var(--form-text-secondary)]">
												{list.desc}
											</p>
										</li>
									{/each}
								</ul>
							</SectionIntro>
						</div>
					{:else if index == 1}
						<div id="slab" class="bg-[var(--landing-bg)]">
							<div
								class="flex w-full flex-col gap-[2rem] border-b border-[var(--form-border)] px-[0.5rem] py-[4rem] lg:px-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem]"
							>
								<h2 class="typography-h2-md text-[var(--form-text)]">
									📊 Income Tax Slabs in India 2025 (New Regime)
								</h2>
								<div >
									{#each tableData as tbl}
										<PaymentTable tableData={tbl} />
									{/each}
								</div>
							</div>
						</div>
					{:else if index == 2}
						<div id="deduction" class="bg-[var(--landing-bg)]">
							<SectionIntro heading={deduction.heading} isBorder>
								<ul class="space-y-6">
									{#each deduction.listItems as list}
										<li class="space-y-2">
											<h3 class="typography-body-md !font-semibold">
												{list.heading}
											</h3>
											<p class="typography-body-md text-[var(--form-text-secondary)]">
												{list.desc}
											</p>
										</li>
									{/each}
								</ul>
							</SectionIntro>

							<SectionIntro heading={itr.heading}>
								<ul class="space-y-6">
									{#each itr.listItems as list}
										<li class="typography-body-md space-y-2 text-[var(--form-text-secondary)]">
											<span class="font-semibold">{list.num}</span>
											{@html list.desc}
										</li>
									{/each}
								</ul>
							</SectionIntro>
						</div>
					{:else if index == 3}
						<div id="deadline" class="bg-[var(--landing-bg)]">
							<SectionIntro heading={deadline.heading} isBorder>
								<ul class="space-y-6">
									{#each deadline.listItems as list}
										<li class="typography-body-md space-y-2 text-[var(--form-text-secondary)]">
											<span class="font-semibold">{list.date}</span>
											{@html list.desc}
										</li>
									{/each}
								</ul>
							</SectionIntro>

							<SectionIntro heading={penalties.heading}>
								<ul class="space-y-6 pl-4">
									{#each penalties.listItems as list}
										<li
											class="typography-body-md list-disc space-y-2 text-[var(--form-text-secondary)]"
										>
											{@html list.desc}
										</li>
									{/each}
								</ul>
							</SectionIntro>
						</div>
					{:else if index == 4}
						<div id="conclusion" class="bg-[var(--landing-bg)]">
							<SectionIntro heading={conclusion.heading} para={conclusion.para} />
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
