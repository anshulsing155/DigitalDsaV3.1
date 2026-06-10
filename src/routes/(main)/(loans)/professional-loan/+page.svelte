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
      linkName: "Types of loan",
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
        desc: `Compare  <span class="font-semibold">50+ banks</span>  in one place and find the best interest rates, loan amounts, and eligibility criteria without visiting multiple lenders.`,
        icon: "/icons/balanceTransferTopup.svg",
        altName: "compare-icon",
      },
      {
        id: 2,
        title: "Hassle-Free Online Application​​",
        desc: `Apply online with a <span class="font-semibold">100% digital process </span> —no paperwork, no long queues. Just enter details, upload documents, and submit in minutes.`,
        icon: "/icons/apply.svg",
        altName: "apply-icon",
      },

      {
        id: 3,
        title: "No Hidden Costs – Clear Terms & Conditions​",
        desc: `We ensure 100% transparency, displaying interest rates, fees, and terms upfront— <span class="font-semibold"> no hidden charges or surprises</span>, just clear loan details.`,
        icon: "/icons/no-fee.svg",
        altName: "fee-icon",
      },
    ],
  };
  let balanceTransferTopup = {
    heading: "Professional loan balance transfer with top-up",
    subHeading: `Self-employed professionals can transfer their loan to a new lender with a lower interest rate while securing extra funds for business growth, equipment, or operations.`,
    items: [
      {
        id: 1,
        title: " Lower Interest & EMI​",
        desc: ` Switching to a lender with a lower interest rate <span class="font-semibold" >reduces monthly EMI </span>,  making loan repayment easier and  <span class="font-semibold" > saving significantly on interest costs </span> over time. `,
        icon: "/icons/interestIcon.svg",
        altName: "interest-icon",
      },
      {
        id: 2,
        title: " Access Additional Funds ​​",
        desc: `A <span class='font-semibold'>top-up loan </span>  provides extra financing without the need for a new loan application. Use it for <span class='font-semibold'>office expansion, new technology, hiring staff, or upgrading equipment </span> .`,
        icon: "/icons/negotiate.svg",
        altName: "negotiate-icon",
      },

      {
        id: 3,
        title: "Boost Credit Score​",
        desc: `A balance transfer helps in maintaining or improving your <span class="font-semibold"> credit score </span> by lowering EMI amounts, ensuring timely repayments, and keeping debt under control.`,
        icon: "/icons/emiIcon.svg",
        altName: "emi-icon",
      },
      {
        id: 4,
        title: "Minimal Documentation​",
        desc: `Since you're already an existing borrower, a <span class="font-semibold"> balance transfer with a top-up requires less paperwork </span> compared to applying for a new professional loan.`,
        icon: "/icons/apply.svg",
        altName: "apply-icon",
      },
      {
        id: 5,
        title: "Flexible Repayment Options​",
        desc: `Choose a <span class="font-semibold">repayment tenure that fits your financial goals</span> opt for a shorter tenure to clear debt quickly or a longer tenure to reduce EMI burden.`,
        icon: "/icons/personalLoan.svg",
        altName: "loan-icon",
      },
      {
        id: 5,
        title: "Debt Consolidation ​",
        desc: ` If you have multiple loans, a balance transfer with a top-up can <span class="font-semibold" >combine them into a single loan </span> ,simplifying repayments and reducing the stress of managing multiple EMIs.`,
        icon: "/icons/riskFactor.svg",
        altName: "risk-icon",
      },
    ],
  };
  let professionalLoanType = {
    heading: "Explore the different types of professional loans",
    items: [
      {
        id: 1,
        title: " Doctor Loan",
        desc: `Designed for   doctors, dentists, and medical practitioners, this loan helps finance <span class="font-semibold"> clinic setup, medical equipment purchases, staff hiring, and technology upgrades </span>. With a <span class="font-semibold"> high loan amount and flexible repayment tenure </span>, healthcare professionals can expand their practice without financial stress.`,
        icon: "/icons/emergencyLoan.svg",
        altName: "icons-emergencyLoan",
      },
      {
        id: 2,
        title: "Chartered Accountant (CA) Loan​​",
        desc: `Exclusively for chartered accountants, auditors, and tax consultants, this loan supports <span class="font-semibold">office expansion, investment in accounting software, working capital management, and business growth </span> . It offers minimal paperwork and quick processing , ensuring seamless financial support.`,
        icon: "/icons/educationLoan.svg",
        altName: "icons-educationLoan",
      },
      {
        id: 3,
        title: "Architect Loan",
        desc: `Designed for architects, this loan helps finance <span class="font-semibold">design software, drafting tools, technology upgrades, and workspace setup </span> . With quick disbursal and competitive rates, it supports seamless project execution and innovation.`,
        icon: "/icons/renovateHome.svg",
        altName: "icons-renovateHome",
      },
    ],
  };

  let pageData = {
    coverImage: "/images/professional-loan-blog.png",
    actionBtnsRequired :"",
    coverAlt: "hero-cover",
    heading: "Professional loans",
    para: `A professional loan is an<a  href="#securedUnsecured" class="cursor-pointer text-black"><span class="font-semibold"> unsecured loan <sup class="text-red-700 text-[.9rem]">*</sup> </span> </a> for self-employed professionals like doctors, CAs and architects. It funds expenses such as clinic setup, equipment purchase, technology upgrades, hiring staff, or business expansion.`,
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

  let firstTableData = [
    {
      columnName: [
        "<div class='flex gap-2 items-center justify-center'><img class='h-5' src='/icons/features.svg' alt='gear icon'> Feature </div>",
        "<div class='flex gap-2 items-center justify-center'>🔒🔑 Secured Loan</div>",
        "<div class='flex gap-2 items-center justify-center'>🔓 Unsecured Loan </div>",
      ],
      rowData: [
        {
          "<span class='font-semibold flex gap-4 items-center'><img class='h-6' src='/icons/purpose.svg' alt='purpose icon'> Collateral </span>":
            [
              `Requires collateral (property, gold, vehicle, etc.)`,
              `No collateral needed ❌`,
            ],
        },
        {
          "<span class='font-semibold flex gap-4 items-center'><img class='h-6' src='/icons/propertyEligibility.svg' alt='home icon'>Risk for Borrower</span>":
            [
              "Risk of losing assets if unpaid ⚠️",
              "No asset risk, but impacts credit score 📉",
            ],
        },
        {
          "<span class='font-semibold flex gap-4 items-center'><img class='h-6' src='/icons/problem.svg' alt='home icon'>Loan Amount</span>":
            [
              "Higher amounts due to security 📈",
              "Lower amounts compared to secured loans 📉",
            ],
        },
        {
          "<span class='font-semibold flex gap-4 items-center'><img class='h-6' src='/icons/taxBenefits.svg' alt='home icon'>Approval Time</span>":
            [
              "Longer due to collateral verification ⏳",
              "Faster approval and disbursal ⚡",
            ],
        },
        {
          "<span class='font-semibold flex gap-4 items-center'><img class='h-6' src='/icons/availability.svg' alt='home icon'>Eligibility</span>":
            [
              "Based on asset value and income 🏠📊",
              "Based on credit score and income 📊💳",
            ],
        },
        {
          "<span class='font-semibold flex gap-4 items-center'><img class='h-6' src='/icons/tenure.svg' alt='home icon'>Examples</span>":
            [
              "Home loan 🏠, Car loan 🚗, Gold loan 🏅",
              "Personal loan 👤🪙, Credit card loan 💳, Education loan 🎓",
            ],
        },
      ],
    },
  ];

  let cardImg1 = "/images/cardImage.jpg";
  let cardAlt1 = "CardCover";

  let cardImg2 = "/images/message.jpg";
  let cardAlt2 = "CardCover";
  let cardHead2 = "Message us 24/7";

</script>

<Seo
  type="WebPage"
  title="Best Professional Loans – Compare & Apply Online Today"
  image="/images/professional-loan-blog.png"
  description="Get the best professional loans for doctors, CAs, architects & more. Compare lenders, check eligibility & apply online hassle-free!"
  keywords="Professional loans, Doctor loan, CA loan, Architect loan, Business expansion loan, Unsecured loan for professionals, Loan balance transfer, Top-up loan, Low interest professional loan, Best professional loan offers, Loan eligibility calculator, EMI calculator for professional loan, Business loan for self-employed, Fast loan approval, Compare professional loans"
/>

<section class="content">
  <NewPageLayout {pageData}>
    <Sublist {subList} />
    <div class="divide-y">
      <div id="type" class="px-4 lg:px-16">
        <WhyChoose facilities={professionalLoanType} />
      </div>
      <div class="px-4 lg:px-16" id="balanceTransfer">
        <WhyChoose facilities={balanceTransferTopup} />
      </div>
      <ButtonBanner
        contents={{
          heading: `Move Your Loan, Minimize Your Costs!`,
          btnName: ` Calculate Now`,
          btnBorder: `#4F4C4D`,
          btnLink:
            "/calculators/balance-transfer-calculator?loanTypeValue=Professional Loan",
        }}
      />

      <div class="" id="calculator">
        <ThreeColumWithLeftHeading
          contents={{
            heading: "Calculators – borrow smart, grow faster!",
            cardData: [
              {
                title: "Estimate Your EMI Before You Borrow!",
                para: `A Professional Loan EMI Calculator helps you determine your <span class="font-semibold">monthly installment (EMI) </span>  based on the loan amount, interest rate, and tenure. Plan your finances efficiently before securing a loan.`,
                linkName: "Check your EMI now",
                url: "/calculators/emi-calculator",
              },
              {
                title: "Know Your Maximum Loan Eligibility Now",
                para: `A Professional Loan Eligibility Calculator helps assess how much loan you qualify for based on your <span class="font-semibold">income, expenses, and existing financial commitments. </span> `,
                linkName: "Find your maximum loan amount",
                url: "/calculators/eligibility-calculator?loanValue=Professional Loan",
              },
            ],
          }}
        />
      </div>

      <div id="repayment" class="px-4 lg:px-16">
        <TwoColumn
          cardImage={cardImg1}
          cardAltName={cardAlt1}
          cardHeading="Calculate your repayments"
          reverse={true}
        >
          <div class="flex flex-col gap-2">
            <p class="typography-body-md text-[var(--form-text-secondary)]">
              Get an estimated repayment amount based on your loan amount,
              tenure, interest rate, and loan type.
            </p>
            <ul class="typography-body-md space-y-2 text-[var(--form-text-secondary)]">
              <li class="flex gap-2 items-start">
                <img src="/icons/circle-check.svg" alt="circle-check-icon" class="h-4 mt-2" />
                Planning a new loan? Use this calculator to estimate your monthly
                payments.
              </li>
              <li class="flex gap-2 items-start">
                <img src="/icons/circle-check.svg" alt="circle-check-icon" class="h-4 mt-2" /> Refinancing
                or consolidating debts? Check if you can reduce your repayment burden.
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
              para: `If you only focus on <span class="font-semibold">paying EMIs and  keeping money in a savings account </span> , your funds lose value over time due to <span class="font-semibold">inflation </span>. Investing ensures your savings grow and retain their <span class="font-semibold"> purchasing power </span> . <br> <br> 💡 <span class="font-semibold">Example: </span> 
      <ul class="list-disc pl-5 space-y-3 mt-2 typography-body-md">
   
      <li>Suppose you want to accumulate <span class="font-semibold">₹10 lakh </span>  and can invest <span class="font-semibold"> ₹5,000 per month </span>. If you invest in a <span class="font-semibold">SIP with 12% returns </span> , you can reach your goal in 10 years. </li>
      </ul>
      `,
              linkName: "Calculate Your Investment Tenure",
              url: "/money-map/how-long-will-it-take-to-save",
            },
            {
              title: "Emergency Fund is Crucial",
              para: `While repaying a loan, unexpected financial emergencies like: <br> 
      <ul class="list-disc pl-5 font-semibold space-y-2 mt-2"> 
      <li>Job loss </li>
      <li>Medical expenses </li>
      <li> Business losses</li>
      <li>Additional expenses (children’s education, home repairs, etc.) </li>
      </ul> <br> <p> can arise at any time. If you <span class="font-semibold">maintain an emergency fund </span> , you can <span class="font-semibold">continue your loan repayments stress-free </span>  while managing urgent expenses. </p> <p class="mt-5">💡 Best Investment Options for Emergency Fund: </p> 
      <ul class="list-disc pl-5 space-y-3 mt-2">
      <li><span class="font-semibold">Recurring Deposit (RD) </span> </li>
        <li><span class="font-semibold">Fixed Deposit (FD) </span>  </li>
        <li><span class="font-semibold">Systematic Investment plan (SIP) </span>  </li>
         
           
      </ul>`,
              linkName: "How Much Can I Save With Regular Contributions?",
              url: "/money-map/how-much-can-i-save-with-regular-contributions",
            },
          ],
        }}
      />
      <div
        id="securedUnsecured"
        class="py-8 lg:py-0 lg:pt-16 lg:pb-32 px-4 lg:px-16 w-full border-b border-[var(--form-border)] text-black dark:text-white"
      >
        <div class="">
          <h2
            class="typography-h2 text-center py-5 text-black dark:text-white"
          >
            <span class="underline"> Secured </span> vs
            <span class="underline"> Unsecured Loans</span>
          </h2>
        </div>
        <div class="">
          {#each firstTableData as tableData}
            <PaymentTable {tableData} />
          {/each}
        </div>
      </div>
<div id="eligibility">
  <ThreeColumWithLeftHeading
  contents={{
    heading: "Eligibility & Documents Required",
    cardData: [
      {
        id: "1",
        title: "Eligibility Criteria",
        para: `
        <ul class="list-disc flex flex-col gap-2 pl-4">
          <li><span class="font-semibold">Who can apply:</span> Self-employed professionals like doctors, CAs,  architects.</li>
          <li><span class="font-semibold">Experience :</span> Minimum 2-3 years of practice or business operations.</li>
          <li><span class="font-semibold">Income & credit score :</span>Stable income with a CIBIL score of 700+ for better approval chances.</li>
          <li><span class="font-semibold"> Loan purpose :</span> Business expansion, equipment purchase, or working capital.</li>
        </ul>
      `,
      },
      {
        id: "2",
        title: "Documents Required",
        para: ` 
        <ul class="list-disc flex flex-col gap-2 pl-4">
          <li><span class="font-semibold"> Identity & address proof </span> Aadhaar, PAN, Passport ,  Utility Bills.</li>
          <li><span class="font-semibold">Professional proof :</span>  Degree certificate, practice license, or registration.</li>
          <li><span class="font-semibold">Income proof : </span>Bank statements (6-12 months), ITR, or Form 16 (if no audited financial).</li>
          <li><span class="font-semibold">Business proof :</span> GST registration, business certificate, or continuity proof.</li>
        </ul>
        
      `,
      },
    ],
  }}
/>
</div>
      
      
      <div class="px-4 lg:px-16">
        <WhyChoose facilities={whyChooseUs} />
      </div>

      <ThreeColumWithLeftHeading
        contents={{
          heading: "Explore & Secure Your Loan!",
          cardData: [
            {
              title: "Find the Best Loan Offers",
              para: ` Compare customized loan options from multiple lenders and choose the one that fits your professional needs.`,
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

      <div class="px-4 lg:px-16">
        <TwoColumn
          cardImage={cardImg2}
          cardAltName={cardAlt2}
          cardHeading={cardHead2}
        >
          <ul
            class="grid gap-8 typography-body-md text-[var(--form-text-secondary)]"
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

      <div class="px-4 lg:px-16">
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
            `<span class="font-semibold">Independent Facilitator:</span> DigitalDSA operates as an independent loan facilitator and web aggregator, bridging the gap between loan consumers and licensed banks or NBFCs. We are not an authorized financial institution and do not offer loans directly.`,
            `<span class="font-semibold">Loan Approval:</span> The sole discretion of approving or rejecting a loan lies with the respective bank or NBFC where the user applies. DigitalDSA does not guarantee loan approval or offer assurance from any specific bank or NBFC. All loans are subject to credit approval, and their terms, conditions, fees, and charges apply.`,
            `<span class="font-semibold">Liability:</span> DigitalDSA is not responsible for any loss, damage, or failure at the user’s end during loan processing. The final decision of the bank or NBFC is binding on both the user and DigitalDSA.`,
            `<span class="font-semibold">Important Information:</span> This information is provided without considering your personal objectives, financial situation, or needs. Please assess its suitability before acting. Exclusive offers are available only when you avail of a loan through DigitalDSA and meet specific conditions.`,
          ],
        }}
        disc="list-decimal"
      ></ThingsYouShould>
    </div>
  </NewPageLayout>
</section>
