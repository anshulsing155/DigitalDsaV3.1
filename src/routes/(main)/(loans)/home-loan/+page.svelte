<script>
	import NewPageLayout from '$lib/components/website/NewPageLayout.svelte';
	import ThingsYouShould from '$lib/components/website/ThingsYouShould.svelte';
	import Button from '$lib/components/website/Button.svelte';
	import Loader from '$lib/components/website/Loader.svelte';
	import Sublist from '$lib/components/website/Sublist.svelte';
	import AboveTitleWithTopIconCard from '$lib/components/website/AboveTitleWithTopIconCard.svelte';
	import AboveTitleWithBlackCard from '$lib/components/website/AboveTitleWithBlackCard.svelte';
	import NewBlogCard from '$lib/components/website/NewBlogCard.svelte';
	import ButtonBanner from '$lib/components/website/ButtonBanner.svelte';
	import AboveTitleWithoutIconCard from '$lib/components/website/AboveTitleWithoutIconCard.svelte';
	import ThreeColumWithLeftHeading from '$lib/components/website/ThreeColumWithLeftHeading.svelte';
	import VerticalBlog from '$lib/components/website/VerticalBlog.svelte';
	import TwoColumnWithImage from '$lib/components/website/TwoColumnWithImage.svelte';
	import TwoColumnWithLeftHeading from '$lib/components/website/TwoColumnWithLeftHeading.svelte';
	import FeedbackCheck from '$lib/components/website/FeedbackCheck.svelte';
	import HelpList from '$lib/components/website/HelpList.svelte';
	import Seo from '$lib/components/Seo.svelte';
	import DownloadGuideModal from '$lib/components/website/DownloadGuideModal.svelte';

	let loaderValue = false;
	let showDownloadModal = false;

	function openDownloadModal() {
		showDownloadModal = true;
	}
</script>

<Seo
	type="WebPage"
	title="Digital DSA Home Loans – Easy, Fast & Affordable Options"
	image="/images/home-cover.jpg"
	description="Find the best home loan deals with Digital DSA. Compare rates, apply online, and get expert guidance for hassle-free home financing today!"
	keywords="Home loans India, Best home loan rates, Home loan balance transfer, First-time homebuyer loans, Affordable home loans, Digital home loan application, Compare home loan offers, Home loan pre-approval, Low-interest home loans, Home loan EMI calculator"
/>

{#if !loaderValue}
	<section class="content">
		<NewPageLayout
			pageData={{
				actionBtnsRequired: 'Yes',
				coverImage: '/images/home-cover.jpg',
				classStyle: 'object-cover xl:h-[90svh] 3xl:max-h-[60svh]',
				heading: 'Find the Right Home Loan for You',
				sourceName: 'Digital DSA',
				originalSource:
					'https://assets.undefined.com.au/is/image/undefined/family-new-home?$Responsive_Align_Center_Top$&fit=constrain&wid=978&dpr=off',
				para: `Looking to buy, refinance, or invest in a property? Our tools, guides, and expert insights help you navigate every step of the journey with confidence. Let’s make home ownership simple and stress-free.`,
				actionBtn: [
					{
						btnName: `Download Guide`,
						btnLink: '#',
						btnClass: 'btn-primary',
						animation: true,
						onClick: openDownloadModal
					},
					{
						btnName: 'Get Expert Advice',
						btnLink: '/appointment',
						btnClass: 'btn-secondary',
						animation: true
					}
				]
			}}
		>
			<Sublist
				subList={[
					{
						linkName: 'Buying your first home',
						linkNameClass: 'text-linkColor',
						url: `/home-loan/buying-first-home`,
						icon: '/icons/home.svg',
						altName: 'loan-icon'
					},
					{
						linkName: 'Buying your next home',
						linkNameClass: 'text-linkColor',
						url: `/home-loan/buying-next-home`,
						icon: '/icons/house.svg',
						altName: 'loan-twohouse'
					},
					{
						linkName: 'Balance transfer',
						linkNameClass: 'text-linkColor',
						url: `/home-loan/balance-transfer`,
						icon: '/icons/bt-2.svg',
						altName: 'balancetransfer-icon'
					},
					{
						linkName: 'Top-Up Only',
						linkNameClass: 'text-linkColor',
						url: `/home-loan/top-up-only`,
						icon: '/icons/mutualFund.svg',
						altName: 'loan-icon'
					},
					{
						linkName: 'Our tools',
						linkNameClass: 'text-linkColor',
						url: `/home-loan/home-loan-tools-calculator`,
						icon: '/icons/calc.svg',
						altName: 'calc-icon'
					}
				]}
			/>

			<AboveTitleWithTopIconCard
				contents={{
					heading: 'Why Choose Digital DSA?',
					xlGridCol: 3,
					borderBottom: true,
					cards: [
						{
							heading: 'Find the Best Offers in Just 10 Minutes',
							para: `Get access to the <a href="/get-started/how-can-we-help" class="underline hover:no-underline underline-offset-4">best home loan options</a> tailored to your financial profile—quick, easy, and hassle-free.`,
							icon: '/icons/clock.svg',
							altName: 'clock-icon'
						},
						{
							heading: 'We Negotiate the Best Rates for You',
							para: `Digital DSA works directly with lenders, factoring in your profile, property type, and CIBIL score to secure the lowest possible interest rate.`,
							icon: '/icons/negotiate.svg',
							altName: 'negotiate-icon'
						},
						{
							heading: 'Your Data Stays Secure',
							para: `Our custom-built loan platform ensures that your personal and financial information remains protected at all times.`,
							icon: '/icons/phoneConnection.svg',
							altName: 'phoneConnection-icon'
						},
						{
							heading: 'Save More on Interest',
							para: `Reduce your loan burden by paying less interest and closing your loan faster. Always compare before applying!`,
							icon: '/icons/inte.svg',
							altName: 'inte-icon'
						},
						{
							heading: 'Real-Time Application Tracking',
							para: `Stay updated at every stage, from submission to approval, with real-time tracking of your loan application.`,
							icon: '/icons/contact.svg',
							altName: 'contact-icon'
						},
						{
							heading: 'Unlock Exclusive Rewards & Discounts',
							para: `Enjoy special offers, discounts, and earn up to ₹5000 for every successful referral—only with Digital DSA!`,
							icon: '/icons/offers.svg',
							altName: 'offers-icon'
						}
					]
				}}
			/>
			<div id="calc">
				<AboveTitleWithBlackCard
					contents={{
						heading: 'Home Loan Calculators',
						xlGridCol: 4,
						borderBottom: true,
						cards: [
							{
								heading: 'How Much Can I Borrow?',
								icon: '/icons/calc.svg',
								iconAltName: 'icon-calc',
								url: '/calculators/eligibility-calculator'
							},
							{
								heading: 'Home Loan Repayment Calculator',
								icon: '/icons/lap.svg',
								iconAltName: 'loan-icon',
								url: '/planners/part-payment-planner'
							},
							{
								heading: 'Stamp Duty Calculator',
								icon: '/icons/apply.svg',
								iconAltName: 'icons-apply',
								url: '/calculators/stamp-duty-calculator'
							},
							{
								heading: 'More Calculators & Tools',
								icon: '/icons/calc.svg',
								iconAltName: 'icons-calc',
								url: '/home-loan/home-loan-tools-calculator'
							}
						]
					}}
				/>
			</div>
			<div
				class="grid w-full gap-8 border-b border-[var(--form-border)] px-4 py-8 md:grid-cols-2 lg:grid-cols-3 lg:px-16 lg:py-0 lg:pt-16 lg:pb-32"
			>
				<NewBlogCard
					blogLists={[
						{
							icon: '/images/investInProperty-cover.jpg',
							altName: 'Couple saving for a home loan down payment',
							heading: 'Smart Ways to Save for Your Down Payment',
							para: 'Set clear savings goals, automate contributions, cut unnecessary expenses, and invest wisely to build your dream home fund!',
							btnLink: '/home-loan/saving-for-deposit',
							btnName: 'Tell me more',
							btnClass: 'btn-secondary',
							sourceName: '',
							originalSource: ''
						},
						{
							icon: '/images/business-owners.jpg',
							altName: 'Two business owners discussing loan options with Digital DSA',
							heading: 'Home Loan Solutions for Business Owners',
							para: 'Are you self-employed? Our lending specialists can help you secure the right home loan for your property goals.',
							btnLink: '/home-loan/home-loan-for-business',
							btnName: 'Learn more',
							btnClass: 'btn-secondary',
							sourceName: '',
							originalSource: ''
						},
						{
							icon: '/images/happy-indian-family-in-kitchen.jpg',
							altName: 'Indian family enjoying quality time in their kitchen',
							heading: 'Should You Buy or Rent Your Home?',
							para: 'Buying offers equity and long-term stability, while renting provides flexibility and lower upfront costs. Choose what fits your lifestyle and finances.',
							btnLink: '/home-loan/buy-or-rent',
							btnName: 'Let me decide',
							btnClass: 'btn-secondary',
							sourceName: '',
							originalSource: ''
						}
					]}
				/>
			</div>

			<ButtonBanner
				contents={{
					heading: 'Smart Ways to Pay Off Your Home Loan Faster',
					para: 'Simple financial tweaks today can lead to significant savings on your home loan in the long run.',
					btnName: 'Find out how',
					btnClass: 'btn-secondary',
					btnLink: '/planners/part-payment-planner'
				}}
			/>

			<AboveTitleWithoutIconCard
				contents={{
					heading: 'Buying a New Home',
					xlGridCol: 3,
					cards: [
						{
							heading: 'Buying Your First Home',
							para: 'Getting started can feel overwhelming, but with the right tools and support, you’ll be on your way with confidence.',
							btnName: 'Tell me more',
							btnClass: 'btn-secondary',
							btnLink: '/home-loan/buying-first-home'
						},
						{
							heading: 'Buying Your Next Home',
							para: 'Thinking about upsizing or a lifestyle change? The process may be different the second time around, but we have the resources to help you sell and move with ease.',
							btnName: 'Know more',
							btnClass: 'btn-secondary',
							btnLink: '/home-loan/buying-next-home'
						},
						{
							heading: 'Need Help with Home & Business Banking?',
							para: 'Our specialists can assist you in managing both your home loan and business banking needs in one place.',
							btnName: 'Talk to us',
							btnClass: 'btn-secondary',
							btnLink: '/appointment'
						}
					]
				}}
			/>
			<ButtonBanner
				contents={{
					heading: `Need a Home Loan but Your ITR Shows <span class="underline decoration-btnBg underline-offset-4">Low Profit</span>?`,
					btnName: 'Get Help',
					btnClass: 'btn-primary',
					btnLink: '/appointment'
				}}
			/>
			<ThreeColumWithLeftHeading
				contents={{
					heading: 'Start Your Home Buying Journey with Us Today',
					cardData: [
						{
							title: 'Apply for a Home Loan, Conditional Pre-Approval, or Balance Transfer',
							para: 'Begin your home loan or balance transfer application online and, if eligible, receive a conditional approval.',
							btnName: 'Compare Bank Offers',
							btnLink: '/get-started/how-can-we-help',
							btnClass: 'btn-primary '
						},
						{
							title: 'Secure the Best Home Loan Deal',
							para: 'Maximize your home loan benefits by booking a session with our Home Lending Specialist at your convenience.',
							btnName: 'Book an Appointment',
							btnLink: '/appointment',
							btnClass: 'btn-primary ',
							btnClass: 'btn-secondary'
						}
					]
				}}
			/>

			<div
				class="grid w-full gap-8 border-b border-[var(--form-border)] px-4 py-8 md:grid-cols-2 lg:grid-cols-3 lg:px-16 lg:py-0 lg:pt-16 lg:pb-32"
			>
				<NewBlogCard
					blogLists={[
						{
							icon: '/images/TheSharmaFamilyStory.jpg',
							altName: 'Images-HLFamilyBlog',
							heading: 'Buying a Property: Resale vs Direct Purchase',
							para: 'Explore the pros and cons of buying a property through resale or direct purchase to make an informed decision that fits your needs and budget.',
							btnName: 'Learn More',
							btnLink: '/home-loan/buy-property-resale',
							btnClass: 'btn-secondary',
							sourceName: '',
							originalSource: ''
						},
						{
							icon: '/images/SmartWaystoCloseYourHOmeLOanEarly.jpg',
							altName:
								"Photo of a person happily verifying loan calculations with DigitalDSA's loan planners",
							heading: 'Smart Ways to Close Your Home Loan Early',
							para: 'Discover effective strategies to pay off your home loan faster, reduce interest payments, and achieve financial freedom sooner.',
							btnName: 'Learn More',
							btnLink: '/home-loan/close-your-loan-early',
							btnClass: 'btn-secondary',
							sourceName: '',
							originalSource: ''
						}
					]}
				/>

				<div class="flex flex-col gap-4">
					<VerticalBlog
						blogLists={[
							{
								icon: '/images/woman-offering-food-neighbor.jpg',
								altName: 'Photo of a young Indian woman offering food to her elderly neighbor',
								heading: 'How to Choose the Perfect Neighborhood',
								url: '/home-loan/choose-perfect-neighbourhood',
								sourceName: '',
								originalSource: ''
							},
							{
								icon: '/images/couple-looking-at-dream-home.jpg',
								altName:
									'A newlywed couple looking at their dream home and planning to purchase it through DigitalDSA',
								heading: 'Should You Get Home Loan Conditional Pre-Approval?',
								url: '/home-loan/conditional-pre-approval',
								sourceName: '',
								originalSource: ''
							},
							{
								icon: '/images/understanding-the-cost-of-buying-a-new-home.jpg',
								altName:
									'An Indian couple exploring the cost factors of buying a new home through the DigitalDSA portal',
								heading: 'Understand the Cost of Buying a Home',
								url: '/home-loan/understand-cost-of-buying-home',
								sourceName: '',
								originalSource: ''
							}
						]}
					/>
				</div>
			</div>

			<ButtonBanner
				contents={{
					heading: 'Compare all home loan interest rates',
					btnName: 'Compare rates',
					btnClass: 'btn-primary',
					btnLink: '/get-started/how-can-we-help'
				}}
			/>

			<TwoColumnWithLeftHeading
				contents={{
					heading: 'Home loan support',
					secPara:
						'See what options are available to home loan customers needing financial assistance.',
					linkName: 'More on home loan support',
					url: '/home-loan/home-loan-support'
				}}
			/>

			<TwoColumnWithImage
				contents={{
					cardImage: `/images/message.jpg`,
					cardAltName: `CardCover`,
					cardHeading: `Message us 24/7`,
					sourceName: 'DigitalDSA',
					originalSource: 'www.digitaldsa.com',
					reverse: false
				}}
			>
				<p class="typography-body-md text-[var(--form-text-secondary)]">
					Feel free to message us anytime for expert assistance with your loan needs. Our team is
					here to provide professional advice, guide you through the loan process, and help you find
					the best options. No matter the time, we’ve got you covered! Message us anytime, and we’ll
					respond promptly.
				</p>
				<div class="w-full lg:w-auto">
					<Button link="/contact" btnClass="btn-secondary" btnName="Message us" />
				</div>
			</TwoColumnWithImage>

			<ButtonBanner
				contents={{
					heading: `Get the home loans Key Facts Sheet`,
					para: `To generate a Key Facts Sheet for our home loans, please visit our Repayments Calculator.`,
					btnName: 'Get Key Fact Sheet',
					btnClass: 'btn-secondary',
					btnLink: '/planners/flexible-emi-planner'
				}}
			/>
      
			<div id="propertyguide">
				<AboveTitleWithTopIconCard
					contents={{
						heading: `Property guides`,
						xlGridCol: 3,
						borderBottom: true,
						cards: [
							{
								heading: 'Home Renovation',
								para: `Home renovations can be costly, without proper planning and financial support. We're here to help you every step of the way with the <a href="/home-loan/home-renovation" class="underline text-linkColor underline-offset-4"> right resources and expert advice</a>. `,
								icon: '/icons/renovateHome.svg',
								iconAltName: 'home-icon'
							},
							{
								heading: 'Transferring your home loan',
								para: `DigitalDSA helps you <a href="/home-loan/balance-transfer" class="underline text-linkColor underline-offset-4"> transfer your existing loan </a> seamlessly, ensuring lower interest rates, better part payment options, and zero (or minimal) processing fees—so you save more while managing your loan efficiently.`,
								icon: '/icons/bt-2.svg',
								iconAltName: 'negotiate-icon'
							},
							{
								heading: 'Investing in property',
								para: `Plan your next steps with the right tools and resources. Make an informed decision when it comes to <a href="/home-loan/investing-in-property" class="underline text-linkColor underline-offset-4"> buying an investment property </a>.`,
								icon: '/icons/loanValue.svg',
								iconAltName: 'phoneConnection-icon'
							},
							{
								heading: 'Buying your first home',
								para: `As a first-time homebuyer, knowing where to begin can be challenging.  The right resources and expert advice will help you start strong and <a href="/home-loan/buying-first-home" class="underline text-linkColor underline-offset-4"> make informed decisions </a>.​`,
								icon: '/icons/firstHome.svg',
								iconAltName: 'inte-icon'
							},
							{
								heading: 'Selling Your Property',
								para: `From pricing to paperwork and negotiations, we provide everything you need for a seamless experience. <a href="/home-loan/selling-your-property" class="underline text-linkColor underline-offset-4"> Start your property sale journey now </a>.`,
								icon: '/icons/sellingHome.svg',
								iconAltName: 'contact-icon'
							},
							{
								heading: 'Construction of your dream home',
								para: `Building a home is a big decision that involves careful planning and research. We can equip you to manage every aspect of the process. <a href="/plot-loan/construction-loan" class="underline text-linkColor underline-offset-4"> Discover how to plan your home build </a>.`,
								icon: '/icons/constructionTable.svg',
								iconAltName: 'offers-icon'
							}
						]
					}}
				/>
			</div>
			<FeedbackCheck />

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
								iconAltName: 'appointment Icon',
								url: '/appointment'
							},
							{
								heading: 'Check loan offers',
								para: 'In as little as 10 minutes and tailored exactly as per your financial profile.',
								icon: '/icons/manageLoan2.svg',
								iconAltName: 'manage Icon',
								url: '/get-started/how-can-we-help'
							},
							{
								heading: 'Contact us',
								para: 'Fast-track your call and connect with a specialist in the Digital DSA.',
								icon: '/icons/contact.svg',
								iconAltName: 'contact Icon',
								url: '/contact'
							},
							{
								heading: 'Message us',
								para: `Get instant help from our online assistants  or chat to a specialist.`,
								icon: '/icons/msg.svg',
								iconAltName: 'message Icon',
								url: '/contact'
							}
						]
					}}
				/>

				<ThingsYouShould
					thinkKnow={{
						heading: `Things you should know`,
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
{:else}
	<div class="flex h-screen flex-col items-center justify-center">
		<Loader />
	</div>
{/if}

<!-- Download Guide Modal -->
<DownloadGuideModal bind:showModal={showDownloadModal} />
