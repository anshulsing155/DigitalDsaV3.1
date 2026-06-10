<script>
	let {
		pageData = {
    coverImage: "/images/TheSharmaFamilyStory.jpg",
    coverAlt:
      "couple planning to purchase  new home with savings and resale of exisiting house",
    heading: "Buying a Property Through Resale or Direct Purchase",
    para: `When it comes to buying a home most buyers opt for one of two preferred methods:
            <ul class="list-decimal list-inside mb-2 mt-2">
            <li class="mb-2"><span class="font-semibold">Resale Transactions</span> (pre-owned properties)</li>
            <li><span class="font-semibold">Direct Purchase from Builders</span> (new properties)</li>
            </ul>
            These methods cater to the diverse needs of homebuyers and involve different processes and costs. Here’s a quick overview to help you navigate these types of property purchases.`,
  }
	} = $props();


  import NewPageLayout from "./NewPageLayout.svelte";
  import TwoColumnWithLeftHeading from "./TwoColumnWithLeftHeading.svelte";
  import TwoColumnWithImage from "./TwoColumnWithImage.svelte";
  import HelpList from "./HelpList.svelte";
  import ThingsYouKnow from "./ThingsYouKnow.svelte";
  import AboveTitleWithBlackCard from "./AboveTitleWithBlackCard.svelte";
  import Button from "./Button.svelte";
  import Seo from "./Seo.svelte";

;
</script>

<Seo
  type="WebPage"
  title="Resale vs. Direct Purchase: Choose the Best Property Option"
  image={pageData.coverImage}
  description="Compare resale vs. direct property purchases. Learn costs, benefits, and key considerations to make an informed home-buying decision."
  keywords="Resale vs direct purchase, Buying a resale home, New property vs resale, Resale property benefits, Home buying guide, Real estate purchase tips, Property investment advice, Direct purchase from builder, Home loan calculator, Stamp duty charges"
/>

<section class="content">
  <NewPageLayout {pageData}>
    <TwoColumnWithLeftHeading
      contents={{
        heading: "Resale Transactions",
        para: `A resale transaction refers to buying a property from an individual owner rather than directly from the builder.`,
        secPara: `<div>
                                <p class="text-miniSubHead font-semibold text-gray-800 mb-8">Why Choose Resale Transactions?</p>
                                <div class="space-y-4">
                                    <div class="flex items-start space-x-4 p-4 bg-grayColor rounded-lg shadow-sm">
                                    <svg class="text-iconColor w-6 h-6 mt-1" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg>
                                    <div>
                                        <p class="font-semibold text-darkColor">Immediate Possession</p>
                                        <p class="text-darkColor">Especially with registered properties, you can move in or rent them out right away.</p>
                                    </div>
                                    </div>
                                    <div class="flex items-start space-x-4 p-4 bg-grayColor rounded-lg shadow-sm">
                                    <svg class="text-iconColor w-6 h-6 mt-1" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg>
                                    <div>
                                        <p class="font-semibold text-darkColor">Negotiation Opportunities</p>
                                        <p class="text-darkColor">Prices are usually negotiable based on the property's condition and market value.</p>
                                    </div>
                                    </div>
                                    <div class="flex items-start space-x-4 p-4 bg-grayColor rounded-lg shadow-sm">
                                    <svg class="text-iconColor w-6 h-6 mt-1" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg>
                                    <div>
                                        <p class="font-semibold text-darkColor">Well-Developed Infrastructure</p>
                                        <p class="text-darkColor">These properties are often in established neighborhoods with existing amenities.</p>
                                    </div>
                                    </div>
                                </div>
                                <div class="mt-10">
                                    <p class="text-miniSubHead font-semibold text-darkColor mb-4">These properties can be:</p>
                                    <ul class="list-disc list-inside space-y-2 mt-2 text-darkColor">
                                    <li>
                                        <span class="font-semibold text-darkColor">Under construction:</span>
                                        <span class="ml-2">Unregistered but in the resale market, where the original buyer wishes to transfer ownership before possession.</span>
                                    </li>
                                    <li>
                                        <span class="font-semibold text-darkColor">Registered properties:</span>
                                        <span class="ml-2">Pre-owned properties where the sale deed is already executed, and ownership is legally transferred.</span>
                                    </li>
                                    </ul>
                                </div>
                                </div>
                                `,
      }}
    />

    <TwoColumnWithLeftHeading
      contents={{
        heading: "Direct Purchase from Builders",
        para: `A direct purchase involves buying a fresh, newly constructed property directly from a developer or builder. These properties are often in new residential projects or township developments.`,
        listTopPara: "Why Choose Direct Purchase?",
        list: [
          {
            heading: `Customization Options:`,
            desc: `Buyers can select layouts, finishes, or even floors in under-construction properties.`,
          },
          {
            heading: `No Previous Ownership:`,
            desc: `You’ll be the first owner, and everything from fittings to interiors will be brand new.`,
          },
          {
            heading: `Builder Discounts & Offers:`,
            desc: `Builders often provide festival discounts, subvention schemes, or reduced interest rates.`,
          },
        ],
      }}
    />

    <TwoColumnWithLeftHeading
      contents={{
        heading: "Key Considerations for Buyers",
        listTopPara: `Whether you're buying through resale or directly from a builder, keep these factors in mind:`,
        list: [
          {
            heading: `Property Registration Status:`,
            desc: `Ensure the property is either registered or has clear ownership documents.`,
          },
          {
            heading: `Legal Due Diligence:`,
            desc: `Verify the title deed, encumbrance certificate, and applicable approvals.`,
          },
          {
            heading: `Stamp Duty & Registration Charges:`,
            desc: `Factor in these costs for registered properties.`,
          },
          {
            heading: `Builder Reputation:`,
            desc: `When purchasing directly, research the builder's past projects, delivery timelines, and reviews.`,
          },
        ],
      }}
    />

    <TwoColumnWithLeftHeading
      contents={{
        heading: "What Works for You?",

        secPara: `<div class="">
                                    <p class="text-miniSubHead font-semibold text-gray-800 mb-8">Making the Right Choice:</p>
                                    <ul class="space-y-4 mt-2">

                                    <li class="flex items-start space-x-4 p-4 bg-grayColor rounded-lg shadow-sm">
                                        <svg class="text-iconColor w-6 h-6 mt-1" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg>
                                        <p class="text-darkColor">If you want immediate possession or a property in an established locality, a resale transaction may be the better choice.</p>
                                    </li>
                                    <li class="flex items-start space-x-4 p-4 bg-grayColor rounded-lg shadow-sm">
                                        <svg class="text-iconColor w-6 h-6 mt-1" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg>
                                        <p class="text-darkColor">If you’re looking for new construction, customization options, or modern amenities, a direct purchase from a builder is ideal.</p>
                                    </li>
                                    </ul>
                                    <p class="mt-8 text-darkColor">By understanding the nuances of these transaction types, you can make a more informed decision on your journey to becoming a homeowner.</p>
                                </div>`,
      }}
    />

    <div data-section="calculators" id="calculators" class="section">
      <AboveTitleWithBlackCard
        contents={{
          heading: "Home loan calculator",
          xlGridCol: 4,
          borderBottom: true,
          cards: [
            {
              heading: " How much can I borrow?",
              icon: "/icons/calc.svg",
              iconcoverAlt: "icon-calc",
              url: "/calculators/affordability-calculator",
            },
            {
              heading: " Home loan repayments calculator",
              icon: "/icons/lap.svg",
              iconcoverAlt: "loan-icon",
              url: "/planners/part-payment-planner",
            },
            {
              heading: "  Stamp duty calculator",
              icon: "/icons/apply.svg",
              iconcoverAlt: "icons-apply",
              url: "/calculators/stamp-duty-calculator",
            },
            {
              heading: "Calculators & tools?",
              icon: "/icons/calc.svg",
              iconcoverAlt: "icons-calc",
              url: "/home-loan/home-loan-tools-calculator",
            },
          ],
        }}
      />
    </div>

    <TwoColumnWithImage
      contents={{
        cardImage: "/images/message.jpg",
        cardcoverAlt: "housing-figure",
        cardHeading: "Message us 24/7",
        reverse: true,
      }}
    >
      <p class="typography-body-sm text-text-light">
        Feel free to message us anytime for expert assistance with your loan
        needs. Our team is here to provide professional advice, guide you
        through the loan process, and help you find the best options. No matter
        the time, we’ve got you covered! Message us anytime, and we’ll respond
        promptly.
      </p>
      <Button link="/contact" btnBorder="#4F4C4D" btnName="Message us" />
    </TwoColumnWithImage>
    <div slot="secondary" class="">
      <HelpList
        contents={{
          heading: `We're here to help`,
          xlGridCol: 4,
          borderBottom: false,
          cards: [
            {
              heading: "Know your borrowing power",
              para: "Book instantly to speak to a home loan specialist at a time that suits you",
              icon: "/icons/appointment.svg",
              coverAlt: "appointment Icon",
              url: "/appointment",
            },
            {
              heading: "Check loan offers",
              para: "In as little as 10 minutes and tailored exactly as per your financial profile.",
              icon: "/icons/manageLoan2.svg",
              coverAlt: "Alert Icon",
              url: "/get-started/how-can-we-help",
            },
            {
              heading: "Contact us",
              para: "Fast-track your call and connect with a specialist in the DigitalDSA.",
              icon: "/icons/contact.svg",
              coverAlt: "Alert Icon",
              url: "/contact",
            },
            {
              heading: "Message us",
              para: `Get instant help from our online assistants  or chat to a specialist.`,
              icon: "/icons/msg.svg",
              coverAlt: "Alert Icon",
              url: "/contact",
            },
          ],
        }}
      />

      <ThingsYouKnow contents={{ heading: `Things you should know` }}>
        <ul class="list-decimal pl-4 flex flex-col gap-4 px-2">
          <li>
            Resale properties may offer immediate possession and established
            infrastructure.
          </li>
          <li>
            Direct purchases from builders provide customization options and new
            amenities.
          </li>
          <li>
            Consider your financial situation, lifestyle preferences, and
            long-term goals when deciding between resale and direct purchase.
          </li>
          <li>
            Ensure legal due diligence and verify property documents before
            making a decision.
          </li>
          <li>
            Contact our specialists for personalized advice and support in
            making your decision.
          </li>
          <li>
            Explore our guides to understand the pros and cons of each option in
            detail.
          </li>
        </ul>
      </ThingsYouKnow>
    </div>
  </NewPageLayout>
</section>
