<script>
  import TwoColumn from "$lib/components/website/TwoColumn.svelte";
  import Information from "$lib/components/website/Information.svelte";
  import WhyChoose from "$lib/components/website/WhyChoose.svelte";
  import WeAreHereHelp from "$lib/components/website/WeAreHereHelp.svelte";
  import ThingsYouShould from "$lib/components/website/ThingsYouShould.svelte";
  import Button from "$lib/components/website/Button.svelte";
  import Sublist from "$lib/components/website/Sublist.svelte";
  import NewPageLayout from "$lib/components/website/NewPageLayout.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import ThreeColumWithLeftHeading from "$lib/components/website/ThreeColumWithLeftHeading.svelte";
  import ButtonBanner from "$lib/components/website/ButtonBanner.svelte";
  import PaymentTable from "$lib/components/website/PaymentTable.svelte";

  let subList = [
    {
      linkName: "Uses of loan",
      url: `#type`,
      icon: "/icons/personalLoan.svg",
      altName: "icons-personalLoan",
    },

    {
      linkName: "Balance transfer with top-up",
      url: `#balanceTransfer`,
      icon: "/icons/comparison.svg",
      altName: "loan-icon",
    },
    {
      linkName: "Tools and calculators",
      url: `#calculator`,
      icon: "/icons/calc.svg",
      altName: "icons-calc",
    },
    {
      linkName: "Secured vs Unsecured",
      url: `#securedUnsecured`,
      icon: "/icons/lap.svg",
      altName: "icons-lap",
    },
    {
      linkName: "Eligibility",
      url: `#eligibility`,
      icon: "/icons/apply.svg",
      altName: "icons-apply",
    },
  ];
  let help = [
    {
      Heading: "Book an appointment",
      paragraph:
        "Book instantly to speak to a personal loan specialist at a time that suits you",
      icon: "/icons/appointment.svg",
      altTitle: "icons",
      link: "/appointment",
    },
    {
      Heading: "Check loan offer",
      paragraph:
        "In as little as 10 minutes and tailored exactly as per your financial profile.",
      icon: "/icons/manageLoan2.svg",
      altTitle: "icons",
      link: "/get-started/how-can-we-help",
    },
    {
      Heading: "Contact us",
      paragraph:
        "Fast-track your call and connect with a specialist in the DigitalDSA.",
      icon: "/icons/contact.svg",
      altTitle: "icons",
      link: "/contact",
    },
    {
      Heading: "Message us",
      paragraph:
        "Get instant help from our online assistants or chat to a specialist.",
      icon: "/icons/msg.svg",
      altTitle: "icons",
      link: "/contact",
    },
  ];
  let whyChooseUs = {
    heading: "Why choose us",
    items: [
      {
        id: 1,
        title: " Compare Loans from Multiple Banks​",
        desc: `Compare  <span class="font-FourthHead">50+ banks</span>  in one place and find the best interest rates, loan amounts, and eligibility criteria without visiting multiple lenders.`,
        icon: "/icons/balanceTransferTopup.svg",
        altName: "compare-icon",
      },
      {
        id: 2,
        title: "Hassle-Free Online Application​​",
        desc: `Apply online with a <span class="font-FourthHead">100% digital process </span> —no paperwork, no long queues. Just enter details, upload documents, and submit in minutes.`,
        icon: "/icons/apply.svg",
        altName: "apply-icon",
      },

      {
        id: 3,
        title: "No Hidden Costs – Clear Terms & Conditions​",
        desc: `We ensure 100% transparency, displaying interest rates, fees, and terms upfront— <span class="font-FifthHead"> no hidden charges or surprises</span>, just clear loan details.`,
        icon: "/icons/no-fee.svg",
        altName: "fee-icon",
      },
    ],
  };
  let balanceTransferTopup = {
    heading: "Personal Loan Balance Transfer with Top-Up",
    subHeading: `It  allows you to transfer your existing loan to a new lender offering a lower interest rate, while also availing an <span class="font-FourthHead" > additional loan amount</span> . This helps you save on <span class="font-FourthHead" > interest costs</span>  and get extra funds for personal or financial needs.`,
    items: [
      {
        id: 1,
        title: " Lower Interest & EMI​",
        desc: ` Moving your loan to a lender with a  <span class="font-FourthHead" >lower interest rate </span>  reduces your <span class="font-FourthHead" >  monthly EMI</span>, making it easier to manage finances. This also helps in <span class="font-FourthHead" >saving a significant amount on interest </span>  over the loan tenure.`,
        icon: "/icons/interestIcon.svg",
        altName: "interest-icon",
      },
      {
        id: 2,
        title: " Get Additional Funds ​​",
        desc: ` A top-up loan provides <span class="font-FourthHead" >extra funds  </span> without the hassle of a new loan application. You can use this amount for <span class="font-FourthHead" >home renovation, medical bills, education, or personal expenses </span> , ensuring financial flexibility when needed.`,
        icon: "/icons/negotiate.svg",
        altName: "negotiate-icon",
      },

      {
        id: 3,
        title: "Improved Credit Score​",
        desc: `A balance transfer helps in maintaining or improving your  <span class="font-FourthHead" >  credit score by reducing EMI amounts</span>, making timely repayments easier, and keeping your debt under control.`,
        icon: "/icons/emiIcon.svg",
        altName: "emi-icon",
      },
      {
        id: 4,
        title: "Minimal Documentation ​",
        desc: `Since you are already a loan borrower, a balance transfer with a top-up usually requires <span class="font-FourthHead" > less paperwork</span>  compared to applying for a fresh personal loan.`,
        icon: "/icons/apply.svg",
        altName: "contact-icon",
      },
      {
        id: 5,
        title: "Flexible Repayment Options​",
        desc: ` Balance transfer allows you to <span class="font-FourthHead">choose a repayment tenure </span>  that suits your financial goals. Opt for a <span class="font-FourthHead"> shorter tenure to close the loan faster</span>  or a <span class="font-FourthHead">longer tenure to reduce EMI burden </span> .`,
        icon: "/icons/personalLoan.svg",
        altName: "loan-icon",
      },
      {
        id: 5,
        title: "Debt Consolidation ​",
        desc: ` If you have multiple loans, a balance transfer with a top-up can <span class="font-FourthHead" >combine them into a single loan </span> , making repayment more manageable and reducing the stress of handling multiple EMIs.`,
        icon: "/icons/riskFactor.svg",
        altName: "risk-icon",
      },
    ],
  };
  let personalLoanPurpose = {
    heading: "All the ways you can use a Personal Loan",
    items: [
      {
        id: 1,
        title: "Home Renovation",
        desc: `Use a personal loan for remodeling or repairs. It's quick, unsecured, and no collateral is needed.`,
        icon: "/icons/home.svg",
        altName: "offers-icon",
      },
      {
        id: 2,
        title: "Education​​",
        desc: `Invest in your future and cover your education expenses`,
        icon: "/icons/educationLoan.svg",
        altName: "negotiate-icon",
      },
      {
        id: 3,
        title: "Travel",
        desc: "Cover your travel costs when you’re planning your dream getaway",
        icon: "/icons/travelLoan.svg",
        altName: "clock-icon",
      },
      {
        id: 4,
        title: "Wedding",
        desc: "Finance wedding costs with an unsecured personal loan, offering flexibility and easy repayment.​",
        icon: "/icons/weddingLoan.svg",
        altName: "inte-icon",
      },
      {
        id: 5,
        title: "Emergency",
        desc: `Cover urgent expenses like medical bills or repairs. Fast approval with higher interest rates.`,
        icon: "/icons/emergencyLoan.svg",
        altName: "contact-icon",
      },

      {
        id: 6,
        title: " Debt consolidation​",
        desc: `Streamline your finances and better manage your debt`,
        icon: "/icons/riskFactor.svg",
        altName: "risk-icon",
      },
    ],
  };

  let firstTableData = [
    {
      columnName: [
        "<div class='flex flex-row gap-2 items-center'><img class='h-5' src='/icons/features.svg' alt='gear icon'> Feature </div>",
        "<div class='flex flex-row gap-2 items-center'>🔒🔑 Secured Loan</div>",
        "<div class='flex flex-row gap-2 items-center'> 🔓 Unsecured Loan </div>",
      ],
      rowData: [
        {
          "<span class='font-FourthHead flex gap-4 items-center'><img class='h-6' src='/icons/purpose.svg' alt='purpose icon'> Collateral </span>":
            [
              `Requires collateral (property, gold, vehicle, etc.)`,
              `No collateral needed ❌`,
            ],
        },
        {
          "<span class='font-FourthHead flex gap-4 items-center'><img class='h-6' src='/icons/propertyEligibility.svg' alt='home icon'>Risk for Borrower</span>":
            [
              "Risk of losing assets if unpaid ⚠️",
              "No asset risk, but impacts credit score 📉",
            ],
        },
        {
          "<span class='font-FourthHead flex gap-4 items-center'><img class='h-6' src='/icons/problem.svg' alt='home icon'>Loan Amount</span>":
            [
              "Higher amounts due to security 📈",
              "Lower amounts compared to secured loans 📉",
            ],
        },
        {
          "<span class='font-FourthHead flex gap-4 items-center'><img class='h-6' src='/icons/taxBenefits.svg' alt='home icon'>Approval Time</span>":
            [
              "Longer due to collateral verification ⏳",
              "Faster approval and disbursal ⚡",
            ],
        },
        {
          "<span class='font-FourthHead flex gap-4 items-center'><img class='h-6' src='/icons/availability.svg' alt='home icon'>Eligibility</span>":
            [
              "Based on asset value and income 🏠📊",
              "Based on credit score and income 📊💳",
            ],
        },
        {
          "<span class='font-FourthHead flex gap-4 items-center'><img class='h-6' src='/icons/tenure.svg' alt='home icon'>Examples</span>":
            [
              "Home loan 🏠, Car loan 🚗, Gold loan 🏅",
              "Personal loan 👤🪙, Credit card loan 💳, Education loan 🎓",
            ],
        },
      ],
    },
  ];

  let pageData = {
    coverImage: "/images/personal-loan-1.jpg",
    actionBtnsRequired :"",
    coverAlt:
      "photo of a young couple going on vacation with the help of personal loan from DigitalDSA",
    sourceName: "Freepik",
    originalSource:
      "https://www.freepik.com/free-photo/young-couple-preparing-vacation-trip-car-sunny-day-woman-man-stacking-up-sport-equipment-ready-going-sea-riverside-ocean-concept-relationship-summer-weekend_10444920.htm",
    heading: "Personal loans",
    para: `A personal loan is an <a  href="#securedUnsecured" class="cursor-pointer text-black"><span class="font-FourthHead "> unsecured loan <sup class="text-red-700 text-[.9rem]">*</sup> </span> </a> that helps individuals meet financial needs like medical emergencies, wedding expenses, home renovations, or debt consolidation. Since it doesn’t require collateral, lenders evaluate your eligibility based on income, credit score, and repayment capacity.`,
    actionBtn: [
      {
        btnName: "Explore loan offers",
        btnLink: "/get-started/how-can-we-help",
        btnColor: "#ffcc00",
        animation: true,
      },
      {
        btnName: "Book an appointment",
        btnLink: "/appointment",
        btnBorder: "#4F4C4D",
      },
    ],
  };

  let cardImg1 = "/images/repayment-calculation.jpg";
  let cardAlt1 =
    "Photo of a young working girl doing credit card's payment on her laptop";

  let cardImg2 = "/images/message.jpg";
  let cardAlt2 = "CardCover";
  let cardHead2 = "Message us 24/7";

  const loanEligibilityCriteria = {
    heading: "Are You Eligible to Apply for a Personal Loan?",
    subPara: [
      `<span class="font-ThirdHead text-paraFont">  1. Age Requirement</span>`,
      `You must be at least <span class="font-FourthHead">18 years old </span>  (or 21 in some cases, depending on the lender).
        This ensures that you are legally eligible to enter into a financial agreement.
        Some lenders may also have an upper age limit (typically 60–65 years for salaried individuals and up to 70 years for self-employed applicants).`,
      `<span class="font-ThirdHead text-paraFont">  2. Minimum Income Requirement  </span>`,
      `Lenders require borrowers to meet a  <span class="font-FourthHead">  minimum income threshold</span> to ensure their ability to repay the loan.`,
      `<ul class="list-disc pl-5">
           <li>Your employment type (salaried or self-employed) </li>
          <li> The city you reside in (higher thresholds in metro cities)</li>
          <li> The lender's internal criteria</li>
          </ul>`,
      `For example, some banks may require a  <span class="font-FourthHead">minimum monthly income of ₹20,000 </span> , while others may set a higher or lower requirement.`,
      `<span class="font-ThirdHead text-paraFont"> 3. Employment and Regular Income  </span>`,
      `A stable and verifiable  <span class="font-FourthHead"> </span> source of income is essential.`,
      `<ul class="list-disc pl-5"> 
          <li> <span class="font-FourthHead"> Salaried Employees –</span> Must have a stable job in a reputable organization with at least 6 months to 1 year of continuous employment. </li>
          <li> <span class="font-FourthHead">Self-Employed Individuals – </span> Should have a steady income from a business, freelance work, or profession with at least 2–3 years of stable financial records. </li>
          <li> <span class="font-FourthHead">Pensioners –  </span> Some lenders offer loans to pensioners with a fixed monthly pension.</li>
          </ul>`,

      `<span class="font-ThirdHead text-paraFont">  4. Good Credit Rating </span>`,
      `A  <span class="font-FourthHead">good credit score (typically 700 or above) </span>  improves loan approval chances and helps secure lower interest rates.`,
      ` <ul class="list-disc pl-5">
          <li>  <span class="font-FourthHead"> Credit history –</span>  Previous loans, credit card usage, repayment patterns </li>
          <li>  <span class="font-FourthHead"> Debt-to-income ratio –</span>  Your total monthly debt compared to your income</li>
          <li>  <span class="font-FourthHead"> Financial discipline –</span>  Timely payments of past loans and bills</li>
           </ul>`,
      `If your credit score is low, improving it through <span class="font-FourthHead"> timely repayments, reducing outstanding debt, and avoiding unnecessary credit applications</span>  can enhance eligibility.`,
    ],
  };

</script>

<Seo
  type="WebPage"
  title="Instant Personal Loans – Low Interest & Easy Approval"
  image={pageData.coverImage}
  description="Get a personal loan with low interest rates, flexible EMI, and quick approval. Compare offers, check eligibility, and apply online hassle-free!"
  keywords="Personal Loan, Instant Personal Loan, Low-Interest Personal Loan, Personal Loan Eligibility, Personal Loan Balance Transfer, Personal Loan EMI Calculator, Unsecured Loan, Compare Personal Loans, Best Personal Loan Offers, Apply for Personal Loan Online"
/>

<section class="content">
  <NewPageLayout {pageData} >
    <Sublist {subList} />
    <div class=" divide-y">
      <div id="type" class="px-[0.5rem] lg:px-[4rem]">
        <WhyChoose facilities={personalLoanPurpose} />
      </div>
      <div class="px-[0.5rem] lg:px-[4rem]" id="balanceTransfer">
        <WhyChoose facilities={balanceTransferTopup} />
      </div>
      <ButtonBanner
        contents={{
          heading: `Optimize Your Loan with Balance Transfer`,
          btnName: ` Calculate Now`,
          btnBorder: `#4F4C4D`,
          btnLink:
            "/calculators/balance-transfer-calculator?loanTypeValue=Personal Loan",
        }}
      />

      <div class="" id="calculator">
        <ThreeColumWithLeftHeading
          contents={{
            heading: "Personal loan calculator",
            cardData: [
              {
                title: "Estimate Your EMI Before You Borrow!",
                para: `A Personal Loan EMI Calculator helps you estimate your monthly installment (EMI) based on the loan amount, interest rate, and tenure. This allows you to plan your finances effectively before taking a loan.
      `,
                linkName: "Check your EMI",
                url: "calculators/emi-calculator",
              },
              {
                title: "Know Your Maximum Loan Eligibility Now",
                para: `A Loan Eligibility Calculator helps you check how much loan amount you qualify for based on your income, expenses, and existing liabilities.`,
                linkName: "Find Your Maximum Loan Amount",
                url: "/calculators/eligibility-calculator?loanValue=Personal Loan",
              },
            ],
          }}
        />
      </div>

      <div id="repayment" class="px-[0.5rem] lg:px-[4rem]">
        <TwoColumn
          cardImage={cardImg1}
          cardAltName={cardAlt1}
          cardHeading="Calculate your repayments"
          reverse={true}
          sourceName="pexel"
          originalSource="www.pexel.com"
        >
          <div class="flex flex-col gap-2">
            <p class="font-FifthHead text-subParaFont">
              We’ll provide an estimate based on the bank’s representative rate
              and your selected loan amount, loan term and loan type
            </p>
            <ul class="font-Paragraph space-y-2 text-subParaFont">
              <li class="flex gap-2 items-center">
                <img
                  src="/icons/circle-check.svg"
                  alt="circle-check-icon"
                  class="h-4 mt-1"
                />
                Use this to calculate repayments on a new personal loan
              </li>
              <li class="flex gap-2 items-center">
                <img
                  src="/icons/circle-check.svg"
                  alt="circle-check-icon"
                  class="h-4 mt-1"
                /> Consolidating any existing debts? Use this handy calculator to
                find out if you can reduce your repayments
              </li>
            </ul>
          </div>

          <Button
            link="/planners/flexible-emi-planner"
            btnName="Calculate now"
            btnColor="#ffcc00"
          />
        </TwoColumn>
      </div>

      <ThreeColumWithLeftHeading
        contents={{
          heading: "Don’t Just Pay Your Loan—Build Wealth Alongside It!",
          cardData: [
            {
              title: "Investment Helps Beat Inflation",
              para: `If you only focus on <span class="font-FourthHead">paying EMIs and  keeping money in a savings account </span> , your funds lose value over time due to <span class="font-FourthHead">inflation </span>. Investing ensures your savings grow and retain their <span class="font-FourthHead"> purchasing power </span> . <br> <br> 💡 <span class="font-FourthHead">Example: </span> 
      <ul class="list-disc pl-5 space-y-3 mt-2 text-subParaFont">
   
      <li>Suppose you want to accumulate <span class="font-FourthHead">₹10 lakh </span>  and can invest <span class="font-FourthHead"> ₹5,000 per month </span>. If you invest in a <span class="font-FourthHead">SIP with 12% returns </span> , you can reach your goal in 10 years. </li>
      </ul>
      `,
              linkName: "Calculate Your Investment Tenure",
              url: "/money-map/how-long-will-it-take-to-save",
            },
            {
              title: "Emergency Fund is Crucial",
              para: `While repaying a loan, unexpected financial emergencies like: <br> 
      <ul class="list-disc pl-5 font-FifthHead space-y-2 mt-2"> 
      <li>Job loss </li>
      <li>Medical expenses </li>
      <li> Business losses</li>
      <li>Additional expenses (children’s education, home repairs, etc.) </li>
      </ul> <br> <p> can arise at any time. If you <span class="font-FourthHead">maintain an emergency fund </span> , you can <span class="font-FourthHead">continue your loan repayments stress-free </span>  while managing urgent expenses. </p> <p class="mt-5">💡 Best Investment Options for Emergency Fund: </p> 
      <ul class="list-disc pl-5 space-y-3 mt-2">
      <li><span class="font-FourthHead">Recurring Deposit (RD) </span> </li>
        <li><span class="font-FourthHead">Fixed Deposit (FD) </span>  </li>
        <li><span class="font-FourthHead">Systematic Investment plan (SIP) </span>  </li>
         
           
      </ul>`,
              linkName: "How Much Can I Save With Regular Contributions?",
              url: "/money-map/how-much-can-i-save-with-regular-contributions",
            },
          ],
        }}
      />
      <div
        id="securedUnsecured"
        class="py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-[var(--form-border)] text-black dark:text-white"
      >
        <div class=" ">
          <h2
            class=" font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont text-center py-5"
          >
            <p>
              <span class="underline"> Secured </span> vs
              <span class="underline"> Unsecured Loans</span>
            </p>
          </h2>
        </div>
        <div class="">
          {#each firstTableData as tableData}
            <PaymentTable {tableData} />
          {/each}
        </div>
      </div>
      <div class=" lg:px-[4rem]" id="eligibility">
        <ThingsYouShould thinkKnow={loanEligibilityCriteria} disc="list-disc" />
      </div>
      <div class="px-[0.5rem] lg:px-[4rem]">
        <WhyChoose facilities={whyChooseUs} />
      </div>

      <ThreeColumWithLeftHeading
        contents={{
          heading: "Explore & Secure Your Loan!",
          cardData: [
            {
              title: "Find the Best Loan Offers",
              para: ` Check personalized loan offers from multiple lenders and choose the best one for you.`,
              btnName: "View loan offers",
              btnLink: "/get-started/how-can-we-help",
            },
            {
              title: `Still confused?  `,
              para: "Book an Appointment for Expert Guidance!",
              btnName: "Book appointment",
              btnLink: "/appointment",
              btnColor: "#ffcc00",
            },
          ],
        }}
      />

      <div class="px-[0.5rem] lg:px-[4rem]">
        <TwoColumn
          cardImage={cardImg2}
          cardAltName={cardAlt2}
          cardHeading={cardHead2}
          sourceName="DigitalDSA"
        >
          <ul
            class="grid gap-[2rem] font-Paragraph text-subParaFont"
            slot="list"
          >
            <li>
              Feel free to message us anytime for expert assistance with your
              loan needs. Our team is here to provide professional advice, guide
              you through the loan process, and help you find the best options.
              No matter the time, we’ve got you covered! Message us anytime, and
              we’ll respond promptly.
            </li>

            <div class="w-auto">
              <Button
                link="/contact"
                btnBorder="#4F4C4D"
                btnName="Message us"
              />
            </div>
          </ul>
        </TwoColumn>
      </div>

      <div class="px-[0.5rem] lg:px-[4rem]">
        <Information />
      </div>
    </div>

    <div slot="secondary" class="px[1rem] py-[2rem] lg:px-[0rem]">
      <h2
        class="typography-h3 text-black dark:text-white"
      >
        We're here to help
      </h2>
      <WeAreHereHelp {help} />
      <ThingsYouShould
        thinkKnow={{
          heading: `Things you should know`,
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
