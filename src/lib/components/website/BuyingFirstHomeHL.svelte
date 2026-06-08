<script>
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
					btnClass: 'btn-primary text-white dark:text-black',
					animation: true
				}
			]
		}
	} = $props();

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

	let activeSection = '';
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
			<StickyNavbar
				navList={{
					items: [
						{
							name: 'Getting ready',
							targetId: `ready`
						},
						{
							name: 'Start buying journey',
							targetId: `start`
						},
						{
							name: "What's next?",
							targetId: `next`
						},
						{
							name: 'Tools & calculators',
							targetId: `calculators`
						}
					],
					actionBtns: [
						{
							btnName: 'Book appointment',
							btnLink: '/appointment',
							btnClass: 'btn-secondary dark:text-white text-black'
						},
						{
							btnName: 'Compare rates',
							btnLink: '/get-started/how-can-we-help',
							btnClass: 'btn-primary text-white dark:text-black'
						}
					]
				}}
				{activeSection}
			></StickyNavbar>

			<div id="ready" data-section="ready" class="section">
				<ThreeColumWithLeftHeading
					contents={{
						heading: 'Getting ready to buy',
						cardData: [
							{
								title: 'Home buying made easy',
								para: "Your step-by-step guide to buying property, whether it's a home to live in or an investment for your future.",
								// linkName: "Read home buying guide (PDF)",
								url: ''
							},
							{
								title: 'Saving for a deposit',
								para: 'Get some tips to help you start saving for your house deposit.',
								linkName: 'Tell me more about saving for a deposit',
								url: '/home-loan/saving-for-deposit'
							},
							{
								title: 'Should you get conditional pre-approval?',
								para: "Having conditional pre-approval can help show that you're serious about buying.",
								linkName: 'Keep reading about conditional pre-approval',
								url: '/home-loan/conditional-pre-approval'
							},
							{
								title: 'Understand the costs',
								para: "There are a number of costs you'll need to factor into your home buying budget.",
								linkName: 'Find out more about home buying costs',
								url: '/home-loan/understand-cost-of-buying-home'
							}
						]
					}}
				/>
			</div>

			<div data-section="start" id="start" class="section">
				<AboveTitleWithLeftIconCard
					contents={{
						heading: `Start your home buying journey with us today`,
						xlGridCol: 3,
						borderBottom: true,
						cards: [
							{
								heading: 'Know your borrowing power',
								para: 'Get the confidence to act quickly when the right property comes along',
								icon: '/icons/checklist.svg',
								altName: 'Message Icon',
								url: '/get-started/home-loans/property-identification',
								linkName: 'Check conditional approval'
							},
							{
								heading: 'Apply for a loan',
								para: "When you've found a property or want to balance transfer, compare offers from the banks.",
								icon: '/icons/apply-pen.svg',
								altName: 'Alert Icon',
								url: '/get-started/how-can-we-help',
								linkName: 'Compare latest offers'
							},
							{
								heading: 'Ask a Lending expert',
								para: 'Talk on the phone or in person – whatever works best for you.',
								icon: '/icons/contact.svg',
								altName: 'Alert Icon',
								url: '/appointment',
								linkName: 'Book an appointment'
							}
						]
					}}
				/>
			</div>

			<div data-section="next" id="next" class="section">
				<ThreeColumWithLeftHeading
					contents={{
						heading: "What's next?",
						cardData: [
							{
								title: 'Understanding the home loan process',
								para: `Our step-by-step guide from applying for your home loan to settlement. `,
								url: '/home-loan/understanding-home-loan-process',
								linkName: 'Tell me more'
							},
							{
								title: 'Compare home loan offers',
								para: `Here's what you need to know about the final steps to owning a home.`,
								url: '/get-started/how-can-we-help',
								linkName: 'Check offers'
							}
						]
					}}
				/>
				<ButtonBanner
					contents={{
						heading: `See our home loan options`,
						btnName: 'Explore now',
						btnLink: '/home-loan',
						btnClass: 'btn-primary text-white dark:text-black'
					}}
				/>
			</div>

			<div data-section="calculators" id="calculators" class="section">
				<AboveTitleWithBlackCard
					contents={{
						heading: 'Home loan calculator',
						xlGridCol: 4,
						borderBottom: true,
						cards: [
							{
								heading: 'How much can I borrow?',
								icon: '/icons/calc.svg',
								iconAltName: 'icon-calc',
								url: '/calculators/eligibility-calculator'
							},
							{
								heading: 'Home loan repayments calculator',
								icon: '/icons/lap.svg',
								iconAltName: 'loan-icon',
								url: '/calculators/emi-calculator'
							},
							{
								heading: 'Stamp duty calculator',
								icon: '/icons/apply.svg',
								iconAltName: 'icons-apply',
								url: '/calculators/stamp-duty-calculator'
							},
							{
								heading: 'Calculators & tools?',
								icon: '/icons/calc.svg',
								iconAltName: 'icons-calc',
								url: '/home-loan/home-loan-tools-calculator'
							}
						]
					}}
				/>
			</div>
		</div>

		<!-- for mobile -->
		<div class="block lg:hidden">
			{#each ['Getting ready', 'Start buying journey', "What's next?", 'Tools & calculators'] as list, index}
				<details
					class="dropdown bg-darkColor col-span-3 text-black dark:text-white {index <
					list.length - 1
						? 'border-b border-[var(--form-border)]'
						: ''} "
				>
					<summary
						class="col-span-3 list-none px-[1rem] py-[1.5rem]"
						onclick={(e) => toggleDropdown(e, index)}
					>
						<div class="typography-label mx-auto flex w-full items-center justify-between gap-4">
							<h2 class="">{list}</h2>
							<div class="icon-container">
								<span><i class="fa-solid fa-angle-down faq-icon"></i></span>
							</div>
						</div>
					</summary>

					{#if index == 0}
						<div id="ready" class="bg-white text-black">
							<ThreeColumWithLeftHeading
								contents={{
									heading: 'Getting ready to buy',
									cardData: [
										{
											title: 'Home buying made easy',
											para: "Your step-by-step guide to buying property, whether it's a home to live in or an investment for your future.",
											// linkName: "Read home buying guide (PDF)",
											url: ''
										},
										{
											title: 'Saving for a deposit',
											para: 'Get some tips to help you start saving for your house deposit.',
											linkName: 'Tell me more about saving for a deposit',
											url: '/home-loan/saving-for-deposit'
										},
										{
											title: 'Should you get conditional pre-approval?',
											para: "Having conditional pre-approval can help show that you're serious about buying.",
											linkName: 'Keep reading about conditional pre-approval',
											url: '/home-loan/conditional-pre-approval'
										},
										{
											title: 'Understand the costs',
											para: "There are a number of costs you'll need to factor into your home buying budget.",
											linkName: 'Find out more about home buying costs',
											url: '/home-loan/understand-cost-of-buying-home'
										}
									]
								}}
							/>
						</div>
					{:else if index == 1}
						<div id="start" class=" bg-white text-black">
							<AboveTitleWithLeftIconCard
								contents={{
									heading: `Start your home buying journey with us today`,
									xlGridCol: 3,
									borderBottom: true,
									cards: [
										{
											heading: 'Know your borrowing power',
											para: 'Get the confidence to act quickly when the right property comes along',
											icon: '/icons/checklist.svg',
											altName: 'Message Icon',
											url: '/get-started/home-loans/property-identification',
											linkName: 'Check conditional approval'
										},
										{
											heading: 'Apply for a loan',
											para: "When you've found a property or want to balance transfer, compare offers from the banks.",
											icon: '/icons/apply-pen.svg',
											altName: 'Alert Icon',
											url: '/get-started/how-can-we-help',
											linkName: 'Compare latest offers'
										},
										{
											heading: 'Ask a Lending expert',
											para: 'Talk on the phone or in person – whatever works best for you.',
											icon: '/icons/contact.svg',
											altName: 'Alert Icon',
											url: '/appointment',
											linkName: 'Book an appointment'
										}
									]
								}}
							/>
						</div>
					{:else if index == 2}
						<div id="next" class="bg-white text-black">
							<ThreeColumWithLeftHeading
								contents={{
									heading: "What's next?",
									cardData: [
										{
											title: 'Understanding the home loan process',
											para: `Our step-by-step guide from applying for your home loan to settlement. `,
											url: '/home-loan/understanding-home-loan-process',
											linkName: 'Tell me more'
										},
										{
											title: 'Compare home loan offers',
											para: `Here's what you need to know about the final steps to owning a home.`,
											url: '/get-started/how-can-we-help',
											linkName: 'Check offers'
										}
									]
								}}
							/>
							<ButtonBanner
								contents={{
									heading: `See our home loan options`,
									btnName: 'Explore now',
									btnLink: '/home-loan',
									btnClass: 'btn-primary text-white dark:text-black'
								}}
							/>
						</div>
					{:else if index == 3}
						<div id="calculators" class="bg-white text-black">
							<AboveTitleWithBlackCard
								contents={{
									heading: 'Home loan calculator',
									xlGridCol: 4,
									borderBottom: true,
									cards: [
										{
											heading: 'How much can I borrow?',
											icon: '/icons/calc.svg',
											iconAltName: 'icon-calc',
											url: '/calculators/eligibility-calculator'
										},
										{
											heading: 'Home loan repayments calculator',
											icon: '/icons/lap.svg',
											iconAltName: 'loan-icon',
											url: '/calculators/emi-calculator'
										},
										{
											heading: 'Stamp duty calculator',
											icon: '/icons/apply.svg',
											iconAltName: 'icons-apply',
											url: '/calculators/stamp-duty-calculator'
										},
										{
											heading: 'Calculators & tools?',
											icon: '/icons/calc.svg',
											iconAltName: 'icons-calc',
											url: '/home-loan/home-loan-tools-calculator'
										}
									]
								}}
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
				contents={{
					heading: `We're here to help`,
					xlGridCol: 4,
					borderBottom: true,
					cards: [
						{
							heading: 'Book an </br> appointment',
							para: 'Book instantly to speak to a home loan specialist at a time that suits you',
							icon: '/icons/appointment.svg',
							altName: 'appointment Icon',
							url: '/appointment'
						},
						{
							heading: 'Check loan offers',
							para: 'In as little as 10 minutes and tailored exactly as per your financial profile.',
							icon: '/icons/manageLoan2.svg',
							altName: 'Alert Icon',
							url: '/get-started/how-can-we-help'
						},
						{
							heading: 'Contact us',
							para: 'Fast-track your call and connect with a specialist in the Digital DSA.',
							icon: '/icons/contact.svg',
							altName: 'Alert Icon',
							url: '/contact'
						},
						{
							heading: 'Message us',
							para: `Get instant help from our online assistants  or chat to a specialist.`,
							icon: '/icons/msg.svg',
							altName: 'Alert Icon',
							url: '/contact'
						}
					]
				}}
			/>
			<ThingsYouShould
				thinkKnow={{
					heading: 'Things you should know',
					paraGraph: [
						`<span class="font-semibold">Independent Facilitator:</span> DigitalDSA operates as an independent loan facilitator and web aggregator, bridging the gap between loan consumers and licensed banks or NBFCs. We are not an authorized financial institution and do not offer loans directly.`,
						`<span class="font-semibold">Loan Approval:</span> The sole discretion of approving or rejecting a loan lies with the respective bank or NBFC where the user applies. DigitalDSA does not guarantee loan approval or offer assurance from any specific bank or NBFC. All loans are subject to credit approval, and their terms, conditions, fees, and charges apply.`,
						`<span class="font-semibold">Liability:</span> DigitalDSA is not responsible for any loss, damage, or failure at the user’s end during loan processing. The final decision of the bank or NBFC is binding on both the user and DigitalDSA.`,
						`<span class="font-semibold">Important Information:</span> This information is provided without considering your personal objectives, financial situation, or needs. Please assess its suitability before acting. Exclusive offers are available only when you avail of a loan through DigitalDSA and meet specific conditions.`
					]
				}}
				disc="list-decimal"
			></ThingsYouShould>
		</div>
	</NewPageLayout>
</section>
