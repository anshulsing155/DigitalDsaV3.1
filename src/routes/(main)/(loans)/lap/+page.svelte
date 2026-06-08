<script>
  import NewPageLayout from "$lib/components/website/NewPageLayout.svelte";
  import TwoColumn from "$lib/components/website/TwoColumn.svelte";
  import Information from "$lib/components/website/Information.svelte";
  import NewHome from "$lib/components/website/NewHome.svelte";
  import Ways from "$lib/components/website/Ways.svelte";
  import WhyChoose from "$lib/components/website/WhyChoose.svelte";
  import ThingsYouShould from "$lib/components/website/ThingsYouShould.svelte";
  import Button from "$lib/components/website/Button.svelte";
  import BlogCard from "$lib/components/website/BlogCard.svelte";
  import Sublist from "$lib/components/website/Sublist.svelte";
  import ButtonBanner from "$lib/components/website/ButtonBanner.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import HelpList from "$lib/components/website/HelpList.svelte";

  let subList = [
    {
      linkName: "New loan",
      url: `/lap/new-loan`,
      icon: "/icons/home.svg",
      altName: "loan-icon",
    },
    {
      linkName: "Balance transfer",
      url: `/lap/balance-transfer`,
      icon: "/icons/bt-2.svg",
      altName: "icons-bt-2",
    },
    {
      linkName: "Top-up only",
      url: `/lap/top-up`,
      icon: "/icons/businessInsights.svg",
      altName: "icons-businessInsights",
    },
    {
      linkName: "Balance transfer with top-up",
      url: `/lap/balance-transfer-with-top-up`,
      icon: "/icons/balanceTransferTopup.svg",
      altName: "loan-icon",
    },
    {
      linkName: "Repayment planners",
      url: `/planners/flexible-emi-planner`,
      icon: "/icons/lap.svg",
      altName: "icons-lap",
    },
    {
      linkName: "Calculators",
      url: `/calculators/emi-calculator`,
      icon: "/icons/calc.svg",
      altName: "icons-calc",
    },
  ];

  const ways = {
    heading: "Smart Ways to Repay Your Loan Faster",
    para: "Making small financial changes today can lead to significant savings on your loan in the long run. Learn how to reduce interest payments and close your loan sooner.",
    btnName: "Find Out How",
    btnLink: "/planners/part-payment-planner",
  };

  const facilities = {
    heading: "Why Choose Digital DSA?",

    items: [
      {
        id: 1,
        title: "Better Privacy",
        desc: "We collect your phone number only to show you the best lender deals—never to share it without your consent. No spam, no unsolicited calls.",
        icon: "/icons/clock.svg",
        altName: "clock-icon",
      },
      {
        id: 2,
        title: "Negotiate Your Rate",
        desc: "We negotiate with lenders on your behalf, considering your profile, property type, and CIBIL score, to secure the best deal possible.",
        icon: "/icons/negotiate.svg",
        altName: "negotiate-icon",
      },
      {
        id: 3,
        title: "Hyper Secure",
        desc: "Your private information stays protected with our custom-built loan platform. Apply with confidence, knowing your data is safe.",
        icon: "/icons/breakLock.svg",
        altName: "clock-icon",
      },
      {
        id: 4,
        title: "Pay Less Interest",
        desc: "Make your money work harder by reducing interest costs and paying off your loan sooner. Compare offers before applying!",
        icon: "/icons/inte.svg",
        altName: "inte-icon",
      },
      {
        id: 5,
        title: "Track Your Application",
        desc: "Stay informed at every step, from submission to approval, with real-time status updates. No more guesswork!",
        icon: "/icons/contact.svg",
        altName: "contact-icon",
      },
      {
        id: 6,
        title: "Exclusive Offers & Discounts",
        desc: "Unlock special loan offers, enjoy exclusive discounts, and earn up to ₹3,000 for every successful referral.",
        icon: "/icons/offers.svg",
        altName: "offers-icon",
      },
    ],
  };

  let pageData = {
    coverImage: "/images/lap-blog.png",
    
    coverAlt: "hero-cover",
    classStyle: "object-cover xl:h-[90svh] 3xl:max-h-[70svh]",
    heading: "Loan Against property",
    para: `Looking to unlock the value of your property? A Loan Against Property (LAP) can be the key! Whether you're planning a balance transfer, upgrading your space, or using your property to fund your dreams, we've got the tools to help you make the best decision.`,
    actionBtn: [
      {
        btnName: "Compare LAP offers online",
        btnLink: "/get-started/how-can-we-help",
        btnColor: "#ffcc00",
        animation: true,
      },
      {
        btnName: "Book an appointment",
        btnLink: "/appointment",
      },
    ],
  };

  const blogs = [
    {
      icon: "/images/business-growth-blog.jpg",
      altName: "icon-name",
      title:
        "Unlocking the Power of Collateral – How to Use Your Property to Maximize Business Financing",
      paragraph:
        "Discover how leveraging your property as collateral can help you secure better financing options for your business. Learn the benefits, risks, and strategies to maximize your funding potential while ensuring financial stability.",
      link: "lap/unlocking-power-of-collateral",
      linkName: "Want to know more",
    },
    {
      icon: "/images/BuyPropertyResaleorDirect.jpg",
      altName: "icon-name",
      title:
        "Dropline Overdraft (DOD): Smart, Flexible Financing for Your Business",
      paragraph:
        "Understand how Dropline Overdraft (DOD) provides businesses with a flexible credit limit that decreases over time. Get insights into how DOD works, its benefits, and why it’s ideal for short-term financial needs.",
      link: "/lap/dropline-overdraft",
      linkName: "Learn more",
    },
    {
      icon: "/images/lap-vs-dod-blog.jpg",
      altName: "icon-name",
      title: "LAP vs. DOD: Which Funding Option Works Best for Your Business?",
      paragraph:
        "Confused between LAP and DOD? This guide compares both financial tools, breaking down their benefits, repayment structures, and suitability based on your business needs.",
      link: "/lap/LAPvsDOD",
      linkName: "Find out",
    },
  ];

  const steps = {
    heading: "Find the Right Loan Option for You",
    data: [
      {
        id: 1,
        title: "Get a New LAP or DOD",
        desc: "Not sure where to start? Whether you're looking for a Loan Against Property (LAP) or a Dropline Overdraft (DOD), we provide the right tools and support to help you move forward with confidence.",
        btnText: "Compare LAP Offers Online",
        btnColor: "#ffcc00",
        btnLink: "/get-started/how-can-we-help",
        btnBorder: "",
      },
      {
        id: 2,
        title: "Transfer Your Existing LAP",
        desc: "Thinking about transferring your current Loan Against Property (LAP) to get better terms? We make the process smooth with expert guidance and support.",
        btnText: "Talk to Us",
        btnLink: "/appointment",
        btnBorder: "#4F4C4D",
      },
    ],
  };
  let cardImg1 = "/images/cardImage.jpg";
  let cardAlt1 = "CardCover";
  let cardHead1 = "Assessing Your Business's Financial Health: Key Insights";

  let cardImg2 = "/images/message.jpg";
  let cardAlt2 = "CardCover";
  let cardHead2 = "Message us 24/7";


</script>

<Seo
  type="WebPage"
  title="Best Loan Against Property Offers – Compare & Apply Online"
  image="/images/lap-blog.png"
  description="Compare the best Loan Against Property (LAP) offers online. Get low interest rates, balance transfers, & top-ups. Apply now for quick approval!"
  keywords="Loan Against Property LAP Loan, Loan Against Property Online, Compare LAP Offers, Low-Interest LAP, Best LAP Deals, LAP Balance Transfer, Loan Against Property for Business, Dropline Overdraft Loan, Business Loan Against Property, Secured Loan for Business, Property Loan Calculator, Best LAP Interest Rates, Loan Against Property Top-Up, Fast Loan Approval"
/>

<section class="xl:contianer mx-auto w-full bg-mainBg content">
  <NewPageLayout {pageData}  >
    <Sublist {subList} />
    <div class="px-[0.5rem] lg:px-[4rem]">
      <div class="border-b border-[var(--form-border)]">
        <WhyChoose {facilities} />
      </div>

      <div
        class="grid gap-[2rem] py-[2rem] lg:grid-cols-3 lg:gap-[2rem] lg:py-[4rem]"
      >
        {#each blogs as blog (blog.title)}
          <BlogCard
            icon={blog.icon}
            altName={blog.altName}
            title={blog.title}
            paragraph={blog.paragraph}
            btnName={blog.linkName}
            link={blog.link}
            btnBorder="#4F4C4D"
            cardBorder="#E3E3E3"
          />
        {/each}
      </div>

      <Ways {ways} />
      <div class="border-b border-[var(--form-border)]">
        <NewHome {steps} />
      </div>

      <ButtonBanner
        contents={{
          heading: "Discover the Best Loan Against Property Options",
          btnName: "Explore Now",
          btnLink: "/get-started/how-can-we-help",
          btnColor: "#ffcc00",
        }}
      />
      <div class="border-b border-[var(--form-border)]">
        <TwoColumn
          cardImage={cardImg1}
          cardAltName={cardAlt1}
          cardHeading={cardHead1}
          reverse={true}
        >
          <ul class="grid gap-4 font-Paragraph text-subParaFont" slot="list">
            <li>
              Before applying for a Loan Against Property (LAP) or a Dropline
              Overdraft (DOD), assessing your business’s financial health is
              essential. Banks and NBFCs consider multiple financial parameters
              before approving loans, and as a business owner, you should too.
              This guide will help you evaluate key financial indicators,
              enabling you to make a well-informed borrowing decision.
            </li>
            <li>
              <a
                class=" underline underline-offset-4 hover:no-underline"
                href="/lap/business-financial-health"
              >
                Learn more about assessing your business's financial health
              </a>
            </li>
          </ul>
        </TwoColumn>
      </div>

      <div class="border-b border-[var(--form-border)]">
        <TwoColumn
          cardImage={cardImg2}
          cardAltName={cardAlt2}
          cardHeading={cardHead2}
        >
          <ul
            class="grid gap-[2rem] font-Paragraph text-subParaFont"
            slot="list"
          >
            <li>
              Reach out to us anytime for expert guidance on your loan needs.
              Our team is ready to offer professional advice, assist you through
              the loan process, and help you find the best solutions. No matter
              when you need us, we're here to support you! Send us a message,
              and we’ll respond promptly.
            </li>

            <div class="w-auto">
              <Button
                link="/contact"
                btnBorder="#4F4C4D"
                btnName="Message Us"
              />
            </div>
          </ul>
        </TwoColumn>
      </div>
      <Information />
    </div>

    <div slot="secondary">
      <HelpList
        contents={{
          heading: `We're here to help`,
          xlGridCol: 4,
          borderBottom: true,
          cards: [
            {
              heading: "Book an </br> appointment",
              para: "Book instantly to speak to a LAP specialist at a time that suits you",
              icon: "/icons/appointment.svg",
              altName: "appointment Icon",
              url: "/appointment",
            },
            {
              heading: "Check loan offers",
              para: "In as little as 10 minutes and tailored exactly as per your financial profile.",
              icon: "/icons/manageLoan2.svg",
              altName: "Alert Icon",
              url: "/get-started/how-can-we-help",
            },
            {
              heading: "Contact us",
              para: "Fast-track your call and connect with a specialist in the Digital DSA.",
              icon: "/icons/contact.svg",
              altName: "Alert Icon",
              url: "/contact",
            },
            {
              heading: "Message us",
              para: `Get instant help from our online assistants  or chat to a specialist.`,
              icon: "/icons/msg.svg",
              altName: "Alert Icon",
              url: "/contact",
            },
          ],
        }}
      />
      <ThingsYouShould
        thinkKnow={{
          heading: "Things you should know",
          paraGraph: [
            `<span class="font-FourthHead">Independent Facilitator:</span> DigitalDSA operates as an independent loan facilitator and web aggregator, bridging the gap between loan consumers and licensed banks or NBFCs. We are not an authorized financial institution and do not offer loans directly.`,
            `<span class="font-FourthHead">Loan Approval:</span> The sole discretion of approving or rejecting a loan lies with the respective bank or NBFC where the user applies. DigitalDSA does not guarantee loan approval or offer assurance from any specific bank or NBFC. All loans are subject to credit approval, and their terms, conditions, fees, and charges apply.`,
            `<span class="font-FourthHead">Liability:</span> DigitalDSA is not responsible for any loss, damage, or failure at the user’s end during loan processing. The final decision of the bank or NBFC is binding on both the user and DigitalDSA.`,
            `<span class="font-FourthHead">Important Information:</span> This information is provided without considering your personal objectives, financial situation, or needs. Please assess its suitability before acting. Exclusive offers are available only when you avail of a loan through DigitalDSA and meet specific conditions.`,
          ],
        }}
        disc="list-decimal"
      ></ThingsYouShould>
    </div>
  </NewPageLayout>
</section>
