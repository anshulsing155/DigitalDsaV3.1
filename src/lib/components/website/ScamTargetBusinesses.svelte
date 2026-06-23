<script>
	let { data } = $props();

	import Button from './Button.svelte';
	import ThingsYouShould from '$lib/components/website/ThingsYouShould.svelte';
	import { onMount, createEventDispatcher } from 'svelte';
	import StickyNavbar from './StickyNavbar.svelte';
	import NewPageLayout from './NewPageLayout.svelte';

	import AboveTitleWithLeftIconCard from './AboveTitleWithLeftIconCard.svelte';
	import TwoColumnWithImage from './TwoColumnWithImage.svelte';
	import HelpList from './HelpList.svelte';
	import AboveTitleWithoutIconCard from './AboveTitleWithoutIconCard.svelte';
	import TwoColumn from './TwoColumn.svelte';
	import Seo from './Seo.svelte';
	import content from '$lib/data/website/scamTargetBusinesses.json';

	const {
		seo,
		pageData,
		stickyNavBar,
		navBarMedium,
		preventScams,
		emailCompromise,
		remoteAccess,
		warningSignsAndWhatToDo,
		helpline,
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
			<StickyNavbar navList={stickyNavBar} {activeSection}></StickyNavbar>

			<div id="prevent" data-section="prevent">
				<AboveTitleWithLeftIconCard contents={preventScams} />
			</div>

			<div id="email" data-section="email">
				<TwoColumnWithImage contents={emailCompromise}>
					<p class="typography-body-md text-[var(--form-text-secondary)]">
						Business email compromise scams target businesses of all sizes. They involve emails from
						a compromised email address, or emails made to look like they are from someone you know,
						such as:
					</p>
					<ul class="typography-body-md list-disc pl-5 text-[var(--form-text-secondary)]">
						<li>Your boss</li>
						<li>Your supplier</li>
						<li>Your customer</li>
						<li>Your lawyer</li>
					</ul>
					<p class="typography-body-md text-[var(--form-text-secondary)]">
						These scams involve emails sent to you or your business with a request to make payment
						to a new account. This new account may be under the scammer's control, and your money
						could be lost. If you get an email with a request to pay a new account, or an invoice
						with different account details to those usually used - pause, review, reflect. Before
						making a payment, consider calling the sender of the email using a verified phone
						number.
					</p>
				</TwoColumnWithImage>
			</div>

			<div data-section="remote" id="remote" class="section">
				<div class="px-[4rem]">
					<TwoColumn {...remoteAccess}>
						<p class="typography-body-md text-[var(--form-text-secondary)]">
							Remote access scams begin as a phone impersonation scam, then the scammer gains access
							to your all Bank account using your own computer, through the use of remote access
							software.
							<br />
							<br />

							Digital arrest scammers impersonate law enforcement officers, falsely accusing victims
							of crimes and demanding payments to avoid arrest.
						</p>

						<div class="space-y-3">
							<h2 class="font-semibold">How It Works</h2>
							<ul class="typography-body-md space-y-3 text-[var(--form-text-secondary)]">
								<li>
									🚫 Scammers contact victims via <span class="font-semibold">
										video calls, emails, or phone calls
									</span> , claiming to be from the police or government.
								</li>
								<li>
									🚫They use <span class="font-semibold">
										fake ID cards, badges, and office backgrounds
									</span> to appear legitimate.
								</li>
								<li>
									🚫 Victims are falsely accused of <span class="font-semibold">
										money laundering, cybercrimes, or tax fraud
									</span> .
								</li>
								<li>
									🚫Scammers demand <span class="font-semibold"> immediate payment </span> to "clear the
									charges" and avoid arrest.
								</li>
							</ul>
						</div>
					</TwoColumn>
				</div>

				<AboveTitleWithoutIconCard contents={warningSignsAndWhatToDo} />
			</div>
			<div id="helpline" data-section="helpline">
				<TwoColumnWithImage contents={helpline}>
					<p class="typography-body-md text-[var(--form-text-secondary)]">
						The Government of India has set up a dedicated National Cybercrime Helpline at 1930,
						where victims can seek assistance and take action against cybercriminals. Reporting
						fraud promptly increases the chances of recovering lost funds and helps prevent further
						scams
					</p>
					<Button link="tel: 1930" btnName="Call 1930" />
				</TwoColumnWithImage>
			</div>
		</div>

		<!-- for mobile -->
		<div class="block lg:hidden">
			{#each navBarMedium as list, index}
				<details
					class="dropdown bg-darkColor col-span-3 text-white {index < navBarMedium.length - 1
						? 'border-b'
						: ''}"
				>
					<summary
						class="col-span-3 list-none px-[1rem] py-[1.5rem]"
						onclick={(e) => toggleDropdown(e, index)}
					>
						<div class="mx-auto flex w-full items-center justify-between gap-4">
							<h2 class="text-navFont">{list}</h2>
							<div class="icon-container justify-self-end text-[var(--form-text)]">
								<span><i class="fa-solid fa-angle-down faq-icon"></i></span>
							</div>
						</div>
					</summary>

					{#if index == 0}
						<div class="bg-[var(--landing-bg)] text-[var(--landing-text)]">
							<AboveTitleWithLeftIconCard contents={preventScams} />
						</div>
					{:else if index == 1}
						<div class="bg-[var(--landing-bg)] text-[var(--landing-text)]">
							<TwoColumnWithImage contents={emailCompromise}>
								<p class="typography-body-md text-[var(--form-text-secondary)]">
									Business email compromise scams target businesses of all sizes. They involve
									emails from a compromised email address, or emails made to look like they are from
									someone you know, such as:
								</p>
								<ul class="typography-body-md list-disc pl-5 text-[var(--form-text-secondary)]">
									<li>Your boss</li>
									<li>Your supplier</li>
									<li>Your customer</li>
									<li>Your lawyer</li>
								</ul>
								<p class="typography-body-md text-[var(--form-text-secondary)]">
									These scams involve emails sent to you or your business with a request to make
									payment to a new account. This new account may be under the scammer's control, and
									your money could be lost. If you get an email with a request to pay a new account,
									or an invoice with different account details to those usually used - pause,
									review, reflect. Before making a payment, consider calling the sender of the email
									using a verified phone number.
								</p>
							</TwoColumnWithImage>
						</div>
					{:else if index == 2}
						<div class="bg-[var(--landing-bg)] text-[var(--landing-text)]">
							<div>
								<TwoColumn {...remoteAccess}>
									<p class="typography-body-md text-[var(--form-text-secondary)]">
										Remote access scams begin as a phone impersonation scam, then the scammer gains
										access to your all Bank account using your own computer, through the use of
										remote access software.
										<br />
										<br />

										Digital arrest scammers impersonate law enforcement officers, falsely accusing
										victims of crimes and demanding payments to avoid arrest.
									</p>

									<div class="space-y-3">
										<h2 class="font-semibold">How It Works</h2>
										<ul class="typography-body-md space-y-3 text-[var(--form-text-secondary)]">
											<li>
												🚫 Scammers contact victims via <span class="font-semibold">
													video calls, emails, or phone calls
												</span> , claiming to be from the police or government.
											</li>
											<li>
												🚫They use <span class="font-semibold">
													fake ID cards, badges, and office backgrounds
												</span> to appear legitimate.
											</li>
											<li>
												🚫 Victims are falsely accused of <span class="font-semibold">
													money laundering, cybercrimes, or tax fraud
												</span> .
											</li>
											<li>
												🚫Scammers demand <span class="font-semibold"> immediate payment </span> to "clear
												the charges" and avoid arrest.
											</li>
										</ul>
									</div>
								</TwoColumn>
							</div>

							<AboveTitleWithoutIconCard contents={warningSignsAndWhatToDo} />
						</div>
					{:else if index == 3}
						<div class="bg-[var(--landing-bg)] text-[var(--landing-text)]">
							<TwoColumnWithImage contents={helpline}>
								<p class="typography-body-md text-[var(--form-text-secondary)]">
									The Government of India has set up a dedicated National Cybercrime Helpline at
									1930, where victims can seek assistance and take action against cybercriminals.
									Reporting fraud promptly increases the chances of recovering lost funds and helps
									prevent further scams
								</p>
								<Button link="tel: 1930" btnName="Call 1930" />
							</TwoColumnWithImage>
						</div>
					{/if}
				</details>
			{/each}
		</div>

		<div slot="secondary">
			<HelpList contents={helpList} />
			<ThingsYouShould thinkKnow={thingsYouShouldKnow} disc="list-decimal"></ThingsYouShould>
		</div>
	</NewPageLayout>
</section>

<style>
	.section {
		scroll-margin-top: 4rem; /* Adjust this value to match your navbar height */
	}
</style>
