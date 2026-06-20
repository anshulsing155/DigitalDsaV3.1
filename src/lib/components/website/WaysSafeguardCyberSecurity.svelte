<script>
	let { data } = $props();

	import Button from './Button.svelte';
	import ThingsYouShould from '$lib/components/website/ThingsYouShould.svelte';
	import { onMount, createEventDispatcher } from 'svelte';
	import StickyNavbar from './StickyNavbar.svelte';
	import NewPageLayout from './NewPageLayout.svelte';
	import ThreeColumWithLeftHeading from './ThreeColumWithLeftHeading.svelte';
	import TwoColumnWithImage from './TwoColumnWithImage.svelte';
	import HelpList from './HelpList.svelte';
	import Seo from './Seo.svelte';
	import content from '$lib/data/website/waysSafeguardCyberSecurity.json';

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

	const toggleDropdown = (event, index) => {
		event.preventDefault();
		const summaryElement = event.currentTarget;
		const icon = summaryElement.querySelector('.faq-icon');
		const detailsElement = summaryElement.parentElement;

		// Close all dropdowns except the clicked one
		document.querySelectorAll('.dropdown').forEach((otherDetails, idx) => {
			const otherIcon = otherDetails.querySelector('.faq-icon');

			if (idx !== index) {
				otherDetails.removeAttribute('open');
				if (otherIcon) {
					otherIcon.classList.remove('fa-angle-up');
					otherIcon.classList.add('fa-angle-down');
				}
			}
		});

		// Toggle current dropdown open/close state
		const isOpen = detailsElement.hasAttribute('open');
		if (isOpen) {
			detailsElement.removeAttribute('open');
			icon.classList.remove('fa-angle-up');
			icon.classList.add('fa-angle-down');
		} else {
			detailsElement.setAttribute('open', 'true');
			icon.classList.remove('fa-angle-down');
			icon.classList.add('fa-angle-up');
		}
		setTimeout(() => {
			detailsElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}, 100);
	};

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
					<div slot="list">
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
					</div>
				</ThingsYouShould>
			</div>

			<div id="password" data-section="password" class="">
				<ThreeColumWithLeftHeading contents={passwordSecuring} />
			</div>
		</div>

		<!-- for mobile -->
		<div class="block lg:hidden">
			{#each navBarMedium as list, index}
				<details
					class="dropdown col-span-3 bg-[var(--landing-bg-card)] text-[var(--form-text)] {index < navBarMedium.length - 1
						? 'border-b border-[var(--form-border)]'
						: ''}"
				>
					<summary
						class="col-span-3 cursor-pointer list-none px-[1rem] py-[1.5rem]"
						onclick={(e) => toggleDropdown(e, index)}
					>
						<div class="mx-auto flex w-full items-center justify-between gap-4">
							<h2 class="typography-label">{list}</h2>
							<div class="icon-container typography-h3 justify-self-end">
								<span
									><i
										class="fa-solid fa-angle-down faq-icon text-[var(--form-text)] transition-transform duration-300"
									></i></span
								>
							</div>
						</div>
					</summary>

					{#if index == 0}
						<div class="bg-[var(--landing-bg)] px-[0.5rem] pb-4 text-[var(--form-text)]" id="MFA">
							<ThingsYouShould thinkKnow={mfa} />
						</div>
					{:else if index == 1}
						<div
							class="bg-[var(--landing-bg)] px-[0.5rem] pb-4 text-[var(--form-text)]"
							id="caller"
						>
							<ThingsYouShould thinkKnow={callerId}></ThingsYouShould>
						</div>
					{:else if index == 2}
						<div
							class="bg-[var(--landing-bg)] px-[0.5rem] pb-4 text-[var(--form-text)]"
							id="telecomCompanies"
						>
							<ThingsYouShould thinkKnow={telecomOptions}>
								<div slot="list">
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
								</div>
							</ThingsYouShould>
						</div>
					{:else if index == 3}
						<div
							class="bg-[var(--landing-bg)] px-[0.5rem] pb-4 text-[var(--form-text)]"
							id="password-securing"
						>
							<ThreeColumWithLeftHeading contents={passwordSecuring} />
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

		<div slot="secondary">
			<HelpList contents={helpList} />
			<ThingsYouShould
				thinkKnow={thingsYouShouldKnow}
				disc="list-decimal"
				containerClass="px-0"
			></ThingsYouShould>
		</div>
	</NewPageLayout>
</section>

<style>
</style>
