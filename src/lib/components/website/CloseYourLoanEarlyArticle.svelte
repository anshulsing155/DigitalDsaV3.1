<script>
	let {
		pageData = {
    coverImage: "/images/SmartWaystoCloseYourHOmeLOanEarly.jpg",
    coverAlt: "hero-cover",
    heading: "Smart Ways to Close Your Loan Early",
    para: `<p class="p-[1rem] bg-gray-100">Take control of your finances and save money by closing your loan ahead of schedule. By making strategic financial decisions and leveraging available resources, you can significantly reduce your loan tenure and interest payments.</p>`,
  }
	} = $props();


  import NewPageLayout from "./NewPageLayout.svelte";
  import TwoColumnWithImage from "./TwoColumnWithImage.svelte";
  import TwoColumnWithLeftHeading from "./TwoColumnWithLeftHeading.svelte";
  import ButtonBanner from "./ButtonBanner.svelte";
  import Seo from "./Seo.svelte";
  import ThingsYouKnow from "./ThingsYouKnow.svelte";
  import HelpList from "./HelpList.svelte";

;
</script>

<Seo
  type="WebPage"
  title="Smart Ways to Close Your Loan Early & Save on Interest"
  image={pageData.coverImage}
  description="Close your loan early & save big on interest! Discover expert tips, tools & strategies to reduce your loan tenure. Start your journey today!"
  keywords="Close Loan Early, Loan Prepayment Tips, Save on Loan Interest, Reduce Loan Tenure, Smart Loan Repayment, Early Loan Closure, Increase EMI for Loan, Loan Part Payment Strategy, Balance Transfer Savings, Financial Freedom from Loans"
/>

<section>
  <NewPageLayout {pageData}>
    <div
      class="mt-[4rem] border-b border-borderColor pb-[7rem] lg:px-0 px-[0.5rem]"
    >
      <h1
        class="text-center font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont mb-[5rem]"
      >
        Why Close Your Loan Early?
      </h1>
      <div class="flex justify-center items-center">
        <div class="flex gap-10">
          <div class="bg-white p-8 shadow-lg text-center max-w-xs">
            <h2 class="text-darkColor text-minSubHead font-ThirdHead pb-5">
              Save on Interest
            </h2>
            <p class="text-iconColor text-paraFont">
              The sooner you close your loan, the less you’ll pay in interest
              over time.
            </p>
          </div>
          <div class="bg-white p-8 shadow-lg text-center max-w-xs">
            <h2 class="text-darkColor text-minSubHead font-ThirdHead pb-5">
              Financial Freedom
            </h2>
            <p class="text-iconColor text-paraFont">
              Free yourself from EMIs and enjoy a stress-free life.
            </p>
          </div>
          <div class="bg-white p-8 shadow-lg text-center max-w-xs">
            <h2 class="text-darkColor text-minSubHead font-ThirdHead pb-5">
              Increase Equity
            </h2>
            <p class="text-iconColor text-paraFont">
              Own your home outright and use it as an asset for future financial
              goals.
            </p>
          </div>
        </div>
      </div>
    </div>

    <TwoColumnWithLeftHeading
      contents={{
        heading: "Make Extra Payments",
        listTopPara: `Small extra payments can make a big difference.`,
        list: [
          {
            heading: `Add one or two EMIs as part-payments every year.`,
          },
          {
            heading: `Use bonuses, tax refunds, or other unexpected income to reduce your principal.`,
          },
        ],
        listSecPara: `<p class="p-4 bg-gray-100 border-l-4 border-btnBg"><span class="mr-2 font-FourthHead">Pro Tip :</span> Use our <a href="/planners/part-payment-planner" class="underline cursor-pointer hover:no-underline">Part Payment Planner</a> to see how even small contributions can help.</p>`,
      }}
    />

    <TwoColumnWithLeftHeading
      contents={{
        heading: "Opt for Higher EMIs",
        listTopPara: `Boost your EMI to pay off your loan faster.`,
        list: [
          {
            heading: `Increase your EMI by 5-10% annually, if your income allows.`,
          },
          {
            heading: `Higher EMIs chip away at the principal amount faster, reducing tenure.`,
          },
        ],
        listSecPara: `<p class="p-4 bg-gray-100 border-l-4 border-btnBg"><span class="mr-2 font-FourthHead"> Quick Tool:</span> Try our <a href="/planners/flexible-emi-planner" class="underline cursor-pointer hover:no-underline">Flexible EMI Planner</a> to calculate how higher EMIs impact your loan.</p>`,
      }}
    />

    <TwoColumnWithLeftHeading
      contents={{
        heading: "Use Lump Sums Wisely",
        listTopPara: `Channel large sums toward your loan.`,
        list: [
          {
            heading: `Use your savings, FDs, or returns from investments.`,
          },
          {
            heading: `Consider this especially when interest rates on your savings are lower than loan rates.`,
          },
        ],
      }}
    />

    <TwoColumnWithLeftHeading
      contents={{
        heading: "Reduce Expenses to Increase Savings",
        listTopPara: `Prioritize debt repayment by cutting unnecessary costs.`,
        list: [
          {
            heading: `Track your spending and create a budget.`,
          },
          {
            heading: `Allocate these savings toward your loan.`,
          },
        ],
        listSecPara: `<p class="p-4 bg-gray-100 border-l-4 border-btnBg"><span class="mr-2 font-FourthHead">Tip:</span> Use budgeting apps to identify areas for savings.</p>`,
      }}
    />

    <TwoColumnWithLeftHeading
      contents={{
        heading: "Balance Transfers Can Save You Lakhs",
        listTopPara: `Switch to a lender offering lower interest rates.`,
        list: [
          {
            heading: `Transfer your remaining balance to a bank with a better deal.`,
          },
          {
            heading: `Reassess tenure options to maximize savings.`,
          },
        ],
        listSecPara: `<p class="p-4 bg-gray-100 border-l-4 border-btnBg"><span class="mr-2 font-FourthHead"> Check out:</span> Our <a href="/calculators/balance-transfer-calculator" class="underline cursor-pointer hover:no-underline">Balance Transfer Calculator</a> to compare and save.</p>`,
      }}
    />

    <TwoColumnWithLeftHeading
      contents={{
        heading: "Plan Strategically",
        listTopPara: `Take advantage of financial tools to achieve your goal.`,
        list: [
          {
            heading: `Use a combination of part-payments and increased EMIs.`,
          },
          {
            heading: `Set a clear target for closing the loan.`,
          },
        ],
      }}
    />

    <div class="mt-[4rem]">
      <p
        class="font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont text-center mb-[2rem]"
      >
        <span class="decoration-btnBg underline underline-offset-4">
          Inspiration:</span
        > Real Stories of Success
      </p>
      <TwoColumnWithImage
        contents={{
          cardImage: "/images/buildingHome-cover.jpg",
          cardAltName: "housing-figure",
          cardHeading: "Neha’s Journey:",
        }}
      >
        <div class=" mt-4">
          <p class="relative text-gray-800">
            Neha closed her 20-year loan in 12 years by increasing her EMI by
            10% every year and using bonuses for part-payments. She also made
            use of tax refunds and other unexpected income to make additional
            payments, significantly reducing her loan tenure.
          </p>
        </div>
      </TwoColumnWithImage>

      <TwoColumnWithImage
        contents={{
          cardImage: "/images/TheSharmaFamilyStory.jpg",
          cardAltName: "housing-figure",
          cardHeading: "The Sharma Family:",
          reverse: true,
        }}
      >
        <div class="mt-4">
          <p class="relative text-gray-800">
            They reduced their tenure from 15 years to 10 by using a balance
            transfer and making yearly lump sum payments. By carefully planning
            their finances and prioritizing loan repayment, they managed to save
            a significant amount on interest. The Sharma family also utilized
            tax refunds and bonuses to make additional payments, further
            accelerating their loan closure.
          </p>
        </div>
      </TwoColumnWithImage>
    </div>

    <ButtonBanner
      contents={{
        heading: `Ready to Close Your Loan Early?`,
        btnName: `Speak to an Expert`,
        btnBorder: `#4F4C4D`,
        btnLink: "/appointment",
      }}
    />
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
        <ul class="list-disc pl-4 flex flex-col gap-4 px-2">
          <li>
            <span class="font-FourthHead">Save on Interest: </span>
            Closing your loan early reduces total interest costs significantly.
          </li>
          <li>
            <span class="font-FourthHead">Strategic Payments: </span>
            Small part-payments, higher EMIs, and lump sums from bonuses or tax refunds
            can shorten your loan tenure.
          </li>
          <li>
            <span class="font-FourthHead">Balance Transfers: </span>
            Switching to a lender with lower interest rates can save you a substantial
            amount.
          </li>
          <li>
            <span class="font-FourthHead">Smart Budgeting: </span>
            Cutting unnecessary expenses and reallocating savings can boost loan
            repayment.
          </li>
          <li>
            <span class="font-FourthHead">Financial Tools & Guidance: </span>
            Using calculators and expert advice can help you plan and close your
            loan faster.
          </li>
        </ul>
      </ThingsYouKnow>
    </div>
  </NewPageLayout>
</section>
