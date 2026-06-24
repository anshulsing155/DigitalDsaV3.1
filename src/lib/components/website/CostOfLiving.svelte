<script>
	let { data } = $props();

	import PageDesign from '$lib/components/website/PageDesign.svelte';
	import TwoColumn from '$lib/components/website/TwoColumn.svelte';
	import LoanSupport from '$lib/components/website/LoanSupport.svelte';
	import NewHome from '$lib/components/website/NewHome.svelte';

	import ThingsYouShould from '$lib/components/website/ThingsYouShould.svelte';
	import Button from '$lib/components/website/Button.svelte';
	import StickyNavbar from '$lib/components/website/StickyNavbar.svelte';
	import { onMount } from 'svelte';
	import WhyChoose from './WhyChoose.svelte';

	import Seo from './Seo.svelte';
	import HelpList from './HelpList.svelte';
	import content from '$lib/data/website/costOfLiving.json';
	import TwoColumnWithLeftHeading from './TwoColumnWithLeftHeading.svelte';
	import { ChevronDown } from '$lib/utils/iconRegistry';
	import { toggleDropdown } from '$lib/utils/toggleDropdown';

	const {
		seo,
		pageData,
		stickyNavBar,
		navBarMedium,
		costOfLiving,
		keyfactors,
		repayments,
		offersAndDeals,
		messageUs,
		support,
		helpList,
		thinkKnow
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

<section class="mx-auto w-full">
	<PageDesign {pageData}>
		<div class="relative hidden w-full lg:block">
			<StickyNavbar navList={stickyNavBar} {activeSection}></StickyNavbar>

			<div class="">
				<div class="section" id="costOfLiving" data-section="costOfLiving">
					<ThingsYouShould thinkKnow={costOfLiving} sectionBorder />
				</div>
				<div class="section" id="affectingFactors" data-section="affectingFactors">
					<WhyChoose facilities={keyfactors} gridCol="3" isBorder />
				</div>
				<div id="financialSupport" data-section="financialSupport" class="sections">
					<NewHome steps={repayments} isBorder />
				</div>

				<div class="section" id="offerDeals" data-section="offerDeals">
					<TwoColumn
						cardImage={offersAndDeals.cardImg1}
						cardAltName={offersAndDeals.cardAlt1}
						cardHeading={offersAndDeals.cardHead1}
						sourceName={offersAndDeals.sourceName}
						originalSource={offersAndDeals.originalSource}
						imageHeight={5}
						isBorder
					>
						<div slot="list">
							<div class="flex flex-col gap-5 pb-[2rem]">
								<div
									class="typography-body-lg flex items-end gap-2 border-b border-[var(--form-border)] pb-[.3rem] !font-semibold
                  text-[var(--form-text)]"
								>
									<img src="/icons/no-fee.svg" alt="no-fee-icon" />
									<h3>With Maximum Benefits!</h3>
								</div>

								<ul class="typography-body-md space-y-2 text-[var(--form-text-secondary)]">
									<li class="flex items-center gap-2">
										<span><img src="/icons/circle-check.svg" alt="" class="h-4" /></span>
										Compare loans, find the best deals, and secure them – all for FREE.
									</li>
									<li class="flex items-center gap-2">
										<span><img src="/icons/circle-check.svg" alt="" class="h-4" /></span>
										Check loan offers anytime, anywhere – no need to visit banks.
									</li>
									<li class="flex items-center gap-2">
										<span><img src="/icons/circle-check.svg" alt="" class="h-4" /></span>
										Find the best deals in minutes – your data stays secure, no hidden surprises.
									</li>
									<li class="flex items-center gap-2">
										<span><img src="/icons/circle-check.svg" alt="" class="h-4" /></span>
										With Digital DSA, effortlessly check loan offers and secure the best deals.
									</li>
								</ul>
								<p class="flex items-end gap-2">
									👉
									<a
										href="/get-started/how-can-we-help"
										class="typography-body-md text-[var(--ddsa-info-text)] underline"
									>
										Get Started</a
									>
								</p>
							</div>

							<div class="flex flex-col gap-5 pt-[2rem]">
								<div
									class="typography-body-lg flex items-end gap-2 border-b border-[var(--form-border)] pb-[.3rem] !font-semibold
                  text-[var(--form-text)]"
								>
									<img src="/icons/referral.svg" alt="" />
									<h3>Spread the Word</h3>
								</div>
								<p class="typography-body-md text-[var(--form-text-secondary)]">
									Earn Rewards by Referring! Your friends win, and so do you!
								</p>
								<ul class="typography-body-md space-y-2 text-[var(--form-text-secondary)]">
									{#each offersAndDeals.spreadWord as item}
										<li class="flex items-center gap-2">
											<span><img src="/icons/circle-check.svg" alt="" class="h-4" /></span>
											{item}
										</li>
									{/each}
								</ul>
								<p class="flex items-end gap-2">
									👉
									<a
										href="/refer-&-earn"
										class="typography-body-md text-[var(--ddsa-info-text)] underline"
									>
										Refer Now & Start Earning</a
									>
								</p>
							</div>
						</div>
					</TwoColumn>
				</div>

				<div class="" id="otherResource" data-section="otherResource">
					<TwoColumn
						cardImage={messageUs.cardImg2}
						cardAltName={messageUs.cardAlt2}
						cardHeading={messageUs.cardHead2}
						reverse
						isBorder
					>
						<div slot="list" class="typography-body-md space-y-6 text-[var(--form-text-secondary)]">
							<p class="typography-body-md text-[var(--form-text-secondary)]">
								Feel free to message us anytime for expert assistance with your loan needs. Our team
								is here to provide professional advice, guide you through the loan process, and help
								you find the best options. No matter the time, we’ve got you covered! Message us
								anytime, and we’ll respond promptly.
							</p>

							<div class="w-auto">
								<Button link="/contact" btnClass="btn-secondary" btnName="Message us" />
							</div>
						</div>
					</TwoColumn>
					<TwoColumnWithLeftHeading contents={support} />
				</div>
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
						<div id="costOfLiving" class="bg-[var(--landing-bg)] text-[var(--landing-text)]">
							<ThingsYouShould thinkKnow={costOfLiving} />
						</div>
					{:else if index == 1}
						<div id="affectingFactors" class="bg-[var(--landing-bg)] text-[var(--landing-text)]">
							<WhyChoose facilities={keyfactors} />
						</div>
					{:else if index == 2}
						<div id="financialSupport" class="bg-[var(--landing-bg)] text-[var(--landing-text)]">
							<NewHome steps={repayments} />
						</div>
					{:else if index == 3}
						<div id="offerDeals" class="bg-[var(--landing-bg)] text-[var(--landing-text)]">
							<TwoColumn
								cardImage={offersAndDeals.cardImg1}
								cardAltName={offersAndDeals.cardAlt1}
								cardHeading={offersAndDeals.cardHead1}
								sourceName={offersAndDeals.sourceName}
								originalSource={offersAndDeals.originalSource}
								imageHeight={5}
							>
								<div slot="list">
									<div class="flex flex-col gap-5 pb-[2rem]">
										<div
											class="typography-body-lg flex items-end gap-2 border-b border-[var(--form-border)] pb-[.3rem] !font-semibold
                  text-[var(--form-text)]"
										>
											<img src="/icons/no-fee.svg" alt="no-fee-icon" />
											<h3>With Maximum Benefits!</h3>
										</div>
										<ul class="typography-body-md space-y-2 text-[var(--form-text-secondary)]">
											<li class="flex items-center gap-2">
												<span><img src="/icons/circle-check.svg" alt="" class="h-4" /></span>
												Compare loans, find the best deals, and secure them – all for FREE.
											</li>
											<li class="flex items-center gap-2">
												<span><img src="/icons/circle-check.svg" alt="" class="h-4" /></span>
												Check loan offers anytime, anywhere – no need to visit banks.
											</li>
											<li class="flex items-center gap-2">
												<span><img src="/icons/circle-check.svg" alt="" class="h-4" /></span>
												Find the best deals in minutes – your data stays secure, no hidden surprises.
											</li>
											<li class="flex items-center gap-2">
												<span><img src="/icons/circle-check.svg" alt="" class="h-4" /></span>
												With Digital DSA, effortlessly check loan offers and secure the best deals.
											</li>
										</ul>
										<p class="flex items-end gap-2">
											👉
											<a
												href="/get-started/how-can-we-help"
												class="typography-body-md text-[var(--ddsa-info-text)] underline"
											>
												Get Started</a
											>
										</p>
									</div>

									<div class="flex flex-col gap-5 pt-[2rem]">
										<div
											class="typography-body-lg flex items-end gap-2 border-b border-[var(--form-border)] pb-[.3rem] !font-semibold
                  text-[var(--form-text)]"
										>
											<img src="/icons/referral.svg" alt="" />
											<h3>Spread the Word</h3>
										</div>
										<p class="typography-body-md text-[var(--form-text-secondary)]">
											Earn Rewards by Referring! Your friends win, and so do you!
										</p>
										<ul class="typography-body-md space-y-2 text-[var(--form-text-secondary)]">
											{#each offersAndDeals.spreadWord as item}
												<li class="flex items-center gap-2">
													<span><img src="/icons/circle-check.svg" alt="" class="h-4" /></span>
													{item}
												</li>
											{/each}
										</ul>
										<p class="flex items-end gap-2">
											👉
											<a
												href="/refer-&-earn"
												class="typography-body-md text-[var(--ddsa-info-text)] underline"
											>
												Refer Now & Start Earning</a
											>
										</p>
									</div>
								</div>
							</TwoColumn>
						</div>
					{:else if index == 4}
						<div id="otherResources" class="bg-[var(--landing-bg)] text-[var(--landing-text)]">
							<TwoColumn
								cardImage={messageUs.cardImg2}
								cardAltName={messageUs.cardAlt2}
								cardHeading={messageUs.cardHead2}
								reverse
								isBorder
							>
								<div
									slot="list"
									class="typography-body-md space-y-6 text-[var(--form-text-secondary)]"
								>
									<p class="typography-body-md text-[var(--form-text-secondary)]">
										Feel free to message us anytime for expert assistance with your loan needs. Our
										team is here to provide professional advice, guide you through the loan process,
										and help you find the best options. No matter the time, we’ve got you covered!
										Message us anytime, and we’ll respond promptly.
									</p>

									<div class="w-auto">
										<Button link="/contact" btnClass="btn-secondary" btnName="Message us" />
									</div>
								</div>
							</TwoColumn>
							<TwoColumnWithLeftHeading contents={support} />
						</div>
					{/if}
				</details>
			{/each}
		</div>
		{#snippet secondary()}
			<HelpList contents={helpList} isBorder/>
			<ThingsYouShould {thinkKnow} disc="list-decimal" containerClass="lg:px-0" />
		{/snippet}
	</PageDesign>
</section>

<style>
	.section {
		scroll-margin-top: 4rem; /* Adjust this value to match your navbar height */
	}
</style>
