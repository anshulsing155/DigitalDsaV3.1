<script>
	let { data } = $props();

	import Button from '../ui/Button.svelte';
	import ThingsYouShould from '$lib/components/sections/ThingsYouShould.svelte';
	import { onMount, createEventDispatcher } from 'svelte';
	import StickyNavbar from '../layout/StickyNavbar.svelte';
	import NewPageLayout from '../layout/NewPageLayout.svelte';
	import ThreeColumWithLeftHeading from './ThreeColumWithLeftHeading.svelte';
	import TwoColumnWithImage from './TwoColumnWithImage.svelte';
	import HelpList from './HelpList.svelte';
	import Seo from '../layout/Seo.svelte';
	import content from '$lib/data/website/waysSafeguardCyberSecurity.json';
 	import { toggleDropdown } from '$lib/utils/toggleDropdown';
	import { ChevronDown } from '$lib/utils/iconRegistry';

	const {
		seo,
		pageData,
		stickyNavBar,
		navBarMedium,
		mfa,
		callerId,
		telecomOptions,
		callerIdServices,
		passwordSecuring,
		messageUs,
		helpList,
		thingsYouShouldKnow
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

	const dispatch = createEventDispatcher();

	onMount(() => {
		initializeActiveSection();
		window.addEventListener('scroll', handleScroll);

		setTimeout(() => {
			const text = document.querySelector('.content')?.innerText || '';
			dispatch('textExtracted', text);
			dispatch('pageData', pageData);
		}, 100);

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

<section class="content">
	<NewPageLayout {pageData}>
		<!-- for desktop -->
		<div class="hidden lg:block">
			<StickyNavbar
				navList={stickyNavBar}
				{activeSection}
			></StickyNavbar>

			<div id="MFA" data-section="MFA" class="">
				<ThingsYouShould
					thinkKnow={mfa}
					sectionBorder="true"
				/>
			</div>
			<div id="caller" data-section="caller" class="">
				<ThingsYouShould
					thinkKnow={callerId}
					sectionBorder="true"
				></ThingsYouShould>
			</div>

			<div id="telecomCompanies" data-section="telecomCompanies">
				<ThingsYouShould
					thinkKnow={telecomOptions}
					sectionBorder="true"
				>
					{#snippet list()}
						<ul class="list-decimal space-y-5 pl-5">
		{#each callerIdServices as item}
			<li class="text-miniSubHead space-y-2 font-semibold">
				<h3>{item.heading}</h3>

				<ul
					class="typography-body-md list-disc space-y-3 pl-4 text-[var(--form-text-secondary)]"
				>
					{#each Object.entries(item) as [key, value]}
						{#if key !== 'heading'}
							<li>
								<span class="font-semibold">
									{key}:
								</span>
								{value}
							</li>
						{/if}
					{/each}
				</ul>
			</li>
		{/each}
	</ul>
					{/snippet}
				</ThingsYouShould>
			</div>

			<div id="password" data-section="password" class="">
				<ThreeColumWithLeftHeading contents={passwordSecuring} isBorder />
			</div>
		</div>

		<!-- for mobile -->
		<div class="block lg:hidden">
			{#each navBarMedium as list, index}
				<details
					class="dropdown border-bgBtn col-span-3 bg-[var(--landing-bg-card)] text-[var(--form-text)]  {index < navBarMedium.length - 1
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
						<div class="bg-[var(--landing-bg)]  pb-4 text-[var(--form-text)]" id="MFA">
							<ThingsYouShould thinkKnow={mfa} />
						</div>
					{:else if index == 1}
						<div
							class="bg-[var(--landing-bg)]  pb-4 text-[var(--form-text)]"
							id="caller"
						>
							<ThingsYouShould thinkKnow={callerId}></ThingsYouShould>
						</div>
					{:else if index == 2}
						<div
							class="bg-[var(--landing-bg)]  pb-4 text-[var(--form-text)]"
							id="telecomCompanies"
						>
							<ThingsYouShould thinkKnow={telecomOptions}>
								
								{#snippet list()}
									<ul class="list-decimal space-y-5 pl-5">
										{#each callerIdServices as item}
											<li class="text-miniSubHead space-y-2 font-semibold">
												<h3>{item.heading}</h3>
												{#each Object.entries(item) as [key, value], i}
													{#if key != 'heading'}
														<ul
															class="typography-body-md list-disc space-y-3 pl-4 text-[var(--form-text-secondary)]"
														>
															<li>
																<span class="font-semibold">
																	{key} :
																</span>{value}
															</li>
														</ul>
													{/if}
												{/each}
											</li>
										{/each}
									</ul>
									{/snippet}
								
							</ThingsYouShould>
						</div>
					{:else if index == 3}
						<div
							class="bg-[var(--landing-bg)]  pb-4 text-[var(--form-text)]"
							id="password-securing"
						>
							<ThreeColumWithLeftHeading contents={passwordSecuring} isBorder />
						</div>
					{/if}
				</details>
			{/each}
		</div>

		<TwoColumnWithImage contents={messageUs}>
			<p>
				Feel free to message us anytime for expert assistance with your loan needs. Our team is here
				to provide professional advice, guide you through the loan process, and help you find the
				best options. No matter the time, we’ve got you covered! Message us anytime, and we’ll
				respond promptly.
			</p>
			<div class="w-full lg:w-auto">
				<Button link="/contact" btnClass="btn-secondary w-full" btnName="Message us" />
			</div>
		</TwoColumnWithImage>

		{#snippet secondary()}
			<HelpList contents={helpList} isBorder />
			<ThingsYouShould
				thinkKnow={thingsYouShouldKnow}
				disc="list-decimal"
				containerClass="px-0"
			></ThingsYouShould>
		{/snippet}
	</NewPageLayout>
</section>

<style>
</style>
