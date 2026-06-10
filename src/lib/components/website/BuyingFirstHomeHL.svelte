<script>
	import Button from './Button.svelte';
	import ThingsYouShould from '$lib/components/website/ThingsYouShould.svelte';
	import { onMount } from 'svelte';
	import StickyNavbar from './StickyNavbar.svelte';
	import NewPageLayout from './NewPageLayout.svelte';
	import ThreeColumWithLeftHeading from './ThreeColumWithLeftHeading.svelte';
	import AboveTitleWithLeftIconCard from './AboveTitleWithLeftIconCard.svelte';
	import TwoColumnWithImage from './TwoColumnWithImage.svelte';
	import ButtonBanner from './ButtonBanner.svelte';
	import HelpList from './HelpList.svelte';
	import AboveTitleWithBlackCard from './AboveTitleWithBlackCard.svelte';
	import Seo from './Seo.svelte';
	import { content } from '$lib/data/buyingFirstHomeHL.js';

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
			if (icon) {
				icon.classList.remove('fa-angle-up');
				icon.classList.add('fa-angle-down');
			}
		} else {
			detailsElement.setAttribute('open', 'true');
			if (icon) {
				icon.classList.remove('fa-angle-down');
				icon.classList.add('fa-angle-up');
			}
		}
		setTimeout(() => {
			if (detailsElement) {
				detailsElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
			}
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

	onMount(() => {
		initializeActiveSection();
		window.addEventListener('scroll', handleScroll);

		return () => {
			window.removeEventListener('scroll', handleScroll);
		};
	});

	let {
		pageData = {
			coverImage: '/images/first-home-buyer.jpg',
			coverAlt:
				'photo of a happy indian couple who has bought their first home and took home loan through DigitalDSA.com',
			sourceName: 'Freepik',
			originalSource:
				'https://www.freepik.com/free-photo/people-recording-their-house-tour_129835217.htm',
			heading: 'First home buyers - Guide to buying your first home',
			para: 'Knowing where to start can be the biggest hurdle. The right tools and support will get you moving with confidence.',
			actionBtns: [
				{
					btnName: 'Book appointment',
					btnLink: '/appointment',
					btnClass: 'btn-secondary'
				},
				{
					btnName: 'Compare rates',
					btnLink: '/get-started/how-can-we-help',
					btnClass: 'btn-primary text-black',
					animation: true
				}
			]
		}
	} = $props();
</script>

<Seo
	type="WebPage"
	title="First Home Buyer Guide | Steps, Costs & Loan Options"
	image={pageData.coverImage}
	description="Get step-by-step guidance on buying your first home. Learn about deposits, costs & loans. Use tools & calculators to plan your purchase."
	keywords="First home buyer guide, Buying your first home, Home loan process, Home buying costs, Home loan calculator, Mortgage pre-approval, Home loan offers, Saving for a deposit, Stamp duty calculator, Borrowing power calculator"
/>

<section class="content">
	<NewPageLayout {pageData}>
		<!-- for desktop -->

		<div class="hidden lg:block">
			<StickyNavbar navList={content.navList} {activeSection} />

			<div id="ready" data-section="ready" class="section">
				<ThreeColumWithLeftHeading contents={content.ready.contents} />
			</div>

			<div id="start" data-section="start" class="section">
				<AboveTitleWithLeftIconCard contents={content.start.contents} />
			</div>

			<div id="next" data-section="next" class="section">
				<ThreeColumWithLeftHeading contents={content.next.contents} />

				<ButtonBanner contents={content.next.buttonBanner} />
			</div>

			<div id="calculators" data-section="calculators" class="section">
				<AboveTitleWithBlackCard contents={content.calculators.contents} />
			</div>
		</div>
		
		<!-- for mobile -->
		<div class="block lg:hidden">
			{#each content.mobileNavbarTitle as list, index (list)}
				<details
					class="dropdown bg-darkColor col-span-3 text-black dark:text-white {index < list.length - 1 ? 'border-b border-[var(--form-border)]' : ''}"
				>
					<summary
						class="col-span-3 list-none px-[1rem] py-[1.5rem]"
						onclick={(e) => toggleDropdown(e, index)}
					>
						<div class="typography-label mx-auto flex w-full items-center justify-between gap-4">
							<h2 class="">{list}</h2>
							<div class="icon-container justify-self-end typography-h3">
								<span><i class="fa-solid fa-angle-down faq-icon text-darkColor-contrast transition-transform duration-300"></i></span>
							</div>
						</div>
					</summary>

					{#if index == 0}
						<div id="ready" class="bg-white text-black">
							<ThreeColumWithLeftHeading
							contents={content.ready.contents}
							/>
						</div>
					{:else if index == 1}
						<div id="start" class="bg-white text-black">
							<AboveTitleWithLeftIconCard
								contents={content.start.contents}
							/>
						</div>
					{:else if index == 2}
						<div id="next" class="bg-white text-black">
							<ThreeColumWithLeftHeading
								contents={content.next.contents}
							/>
							<ButtonBanner
								contents={content.next.buttonBanner}
							/>
						</div>
					{:else if index == 3}
						<div id="calculators" class="bg-white text-black">
							<AboveTitleWithBlackCard
								contents={content.calculators.contents}
							/>
						</div>
					{/if}
				</details>
			{/each}
		</div>

		<TwoColumnWithImage
			contents={{
				cardImage: '/images/message.jpg',
				cardAltName: 'photo of a laptop screen showing contact page of DigitalDSA',
				cardHeading: 'Message us 24/7',
				sourceName: 'DigitalDSA.com',
				originalSource: 'www.digitaldsa.com',
				reverse: true
			}}
		>
			<p class="typography-body-md text-[var(--form-text-secondary)]">
				Feel free to message us anytime for expert assistance with your loan needs. Our team is here
				to provide professional advice, guide you through the loan process, and help you find the
				best options. No matter the time, we’ve got you covered! Message us anytime, and we’ll
				respond promptly.
			</p>
			<Button
				link="/contact"
				btnName="Message us"
				btnClass="btn-primary text-white dark:text-black"
			/>
		</TwoColumnWithImage>

		<div slot="secondary">
			<HelpList
				contents={content.common_components.helpList.contents}
			/>
			<ThingsYouShould
				thinkKnow={content.common_components.thinkYouShouldKnow.contents}
				disc={content.common_components.thinkYouShouldKnow.disc}
			></ThingsYouShould>
		</div>
	</NewPageLayout>
</section>
