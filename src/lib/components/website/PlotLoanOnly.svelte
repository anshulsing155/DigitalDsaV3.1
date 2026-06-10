<script>
  import { onMount } from "svelte";
  import StickyNavbar from "./StickyNavbar.svelte";
  import NewPageLayout from "./NewPageLayout.svelte";
  import ThreeColumWithLeftHeading from "./ThreeColumWithLeftHeading.svelte";
  import TwoColumnWithImage from "./TwoColumnWithImage.svelte";
  import Anchor from "./Anchor.svelte";
  import AboveTitleWithLeftIconCard from "./AboveTitleWithLeftIconCard.svelte";
  import TwoColumnWithLeftHeading from "./TwoColumnWithLeftHeading.svelte";
  import ThingsYouShould from "./ThingsYouShould.svelte";
  import HelpList from "./HelpList.svelte";
  import Button from "./Button.svelte";
  import PaymentTable from "./PaymentTable.svelte";
  import ButtonBanner from "./ButtonBanner.svelte";
  import { applicationData } from "$lib/stores/stores";
  import AboveTitleWithBlackCard from "./AboveTitleWithBlackCard.svelte";
  import AboveTitleWithTopIconCard from "./AboveTitleWithTopIconCard.svelte";
  import Seo from "./Seo.svelte";

  const toggleDropdown = (event, index) => {
    event.preventDefault();
    const summaryElement = event.currentTarget;
    const icon = summaryElement.querySelector(".faq-icon");
    const detailsElement = summaryElement.parentElement;

    // Close all dropdowns except the clicked one
    document.querySelectorAll(".dropdown").forEach((otherDetails, idx) => {
      const otherIcon = otherDetails.querySelector(".faq-icon");

      if (idx !== index) {
        otherDetails.removeAttribute("open");
        if (otherIcon) {
          otherIcon.classList.remove("fa-angle-up");
          otherIcon.classList.add("fa-angle-down");
        }
      }
    });

    // Toggle current dropdown open/close state
    const isOpen = detailsElement.hasAttribute("open");
    if (isOpen) {
      detailsElement.removeAttribute("open");
      icon.classList.remove("fa-angle-up");
      icon.classList.add("fa-angle-down");
    } else {
      detailsElement.setAttribute("open", "true");
      icon.classList.remove("fa-angle-down");
      icon.classList.add("fa-angle-up");
    }
    setTimeout(() => {
      detailsElement.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  let activeSection = "";

  // end-here

  const initializeActiveSection = () => {
    const firstSection = document.querySelector("[data-section]");
    if (firstSection) {
      activeSection = firstSection.id;
    }
  };

  const handleScroll = () => {
    const sections = document.querySelectorAll("[data-section]");
    let currentSection = "";

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
    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  });

  let firstTableData = [
    {
      columnName: [
        "<div class='flex gap-2 items-center justify-center'><img class='h-5' src='/icons/features.svg' alt='gear icon'> Aspect </div>",
        "<div class='flex gap-2 items-center justify-center'><img class='h-5' src='/icons/residential.svg' alt='home icon'> Residential plot loan </div>",
        "<div class='flex gap-2 items-center justify-center'> <img class='h-5' src='/icons/bt-2.svg' alt='commercial icon'> Commercial plot loan </div>",
        "<div class='flex gap-2 items-center justify-center'><img class='h-5' src='/icons/plotOnlyloan.svg' alt='plot icon'> Agricultural land loan </div>",
        "<div class='flex gap-2 items-center justify-center'><img class='h-5' src='/icons/sellingHome.svg' alt='home icon'> Investment plot loan </div>",
      ],
      rowData: [
        {
          "<span class='font-semibold flex gap-4 items-center'><img class='h-6' src='/icons/purpose.svg' alt='purpose icon'> Purpose </span>":
            [
              "Buying a plot for building a home",
              "Purchasing land for commercial development (offices, shops, warehouses, etc.)",
              "Buying farmland for agricultural activities",
              "Buying land purely as an investment without immediate construction",
            ],
        },
        {
          "<span class='font-semibold flex gap-4 items-center'><img class='h-6' src='/icons/propertyEligibility.svg' alt='home icon'>Eligibility</span>":
            [
              "Salaried or self-employed individuals meeting income criteria",
              "Business owners, companies, developers",
              "Farmers or individuals legally allowed to own agricultural land",
              "Any individual or investor, subject to lender policies",
            ],
        },
        {
          "<span class='font-semibold flex gap-4 items-center'><img class='h-6' src='/icons/problem.svg' alt='home icon'>Location Restrictions</span>":
            [
              "Must be in government-approved residential zones",
              "Must be in designated commercial areas",
              "Restricted to agricultural land; ownership may be limited by laws",
              "Location flexibility depends on lender; unapproved plots may not qualify",
            ],
        },
        {
          "<span class='font-semibold flex gap-4 items-center'><img class='h-6' src='/icons/taxBenefits.svg' alt='home icon'>Loan-to-Value (LTV) Ratio</span>":
            [
              "60%–80% of plot value",
              "50%–70% of plot value",
              "Varies (typically lower due to agricultural land laws)",
              "50%–70% (may require a larger down payment due to higher risk)",
            ],
        },
        {
          "<span class='font-semibold flex gap-4 items-center'><img class='h-6' src='/icons/availability.svg' alt='home icon'>Interest Rates</span>":
            [
              "Lower compared to other plot loans (similar to home loans)",
              "Higher than residential loans due to commercial nature",
              "Lower for government-supported agricultural loans",
              "Higher due to speculative nature and lack of immediate development",
            ],
        },
        {
          "<span class='font-semibold flex gap-4 items-center'><img class='h-6' src='/icons/tenure.svg' alt='home icon'>Repayment Tenure</span>":
            [
              "Up to 15 years",
              "Shorter tenure (7–10 years)",
              "Varies (often flexible based on land use)",
              "Typically shorter (5–10 years)",
            ],
        },
        {
          "<span class='font-semibold flex gap-4 items-center'><img class='h-6' src='/icons/constructionTable.svg' alt='home icon'>Construction Requirement</span>":
            [
              "Some lenders require construction within a set timeframe (e.g., 3–5 years)",
              "No requirement to develop immediately",
              "Not required but land use must remain agricultural",
              "No requirement; land can remain undeveloped",
            ],
        },
        {
          "<span class='font-semibold flex gap-4 items-center'><img class='h-6' src='/icons/interestRate.svg' alt='home icon'>Tax Benefits</span>":
            [
              "Eligible for tax deductions on loan interest and principal",
              "No tax benefits on repayment",
              "No tax benefits unless land is used for agribusiness",
              "No tax benefits; gains taxed under capital appreciation rules",
            ],
        },
        {
          "<span class='font-semibold flex gap-4 items-center'><img class='h-6' src='/icons/bestFor.svg' alt='home icon'>Legal Approvals</span>":
            [
              "Land must be in an approved residential layout",
              "Requires commercial land approvals and zoning compliance",
              "Must comply with agricultural land regulations",
              "Must meet local zoning, ownership, and title deed requirements",
            ],
        },
        {
          "<span class='font-semibold flex gap-4 items-center'><img class='h-6' src='/icons/riskFactor.svg' alt='home icon'>Risk Factors</span>":
            [
              "Low risk if in an approved residential area",
              "Higher risk due to dependency on business profitability",
              "Subject to changing land regulations and ownership laws",
              "High risk due to land appreciation uncertainties",
            ],
        },
        {
          "<span class='font-semibold flex gap-4 items-center'><img class='h-6' src='/icons/payment.svg' alt='home icon'>Down Payment</span>":
            [
              "20%–40% of the plot cost",
              "30%–50% of the plot cost",
              "Varies based on government and bank policies",
              "Varies (depends on land records and approvals)",
            ],
        },
        {
          "<span class='font-semibold flex gap-4 items-center'><img class='h-6' src='/icons/processing.svg' alt='home icon'>Processing Time</span>":
            [
              "Moderate (2–4 weeks)",
              "Longer (due to business and commercial verification)",
              "Varies (depends on land records and approvals)",
              "Moderate to long depending on land location and lender requirements",
            ],
        },
      ],
    },
  ];
</script>

<Seo
  type="WebPage"
  title="Plot-Only Loans: Eligibility, Challenges & Best Options"
  image= "/images/plot-only-loan-blog.jpg"
  description="Navigate plot-only loans with expert tips, eligibility, challenges & financing tools. Compare offers & secure the best deal for your land purchase."
  keywords="Plot-only loan, Land purchase loan, Residential plot loan, Commercial plot loan, Agricultural land loan, Investment plot loan, Plot loan eligibility, Plot loan interest rates, Best plot loan offers, Compare plot loan rates, Plot loan calculator, Plot loan balance transfer, Secure plot financing, Land loan approval tips"
/>

<section>
  <NewPageLayout
    pageData={{
      coverImage: "/images/plot-only-loan-blog.jpg",
      coverAlt: "hero-cover",
      classStyle: "object-cover xl:h-[90svh] 3xl:max-h-[60svh]",
      heading: " Understanding Plot-Only Loans",
      para: `Navigate the complexities of securing a plot-only loan with clear insights on eligibility, documentation, and approval factors. Access expert tips, financing alternatives, and tools to streamline your loan application process.`,
      actionBtns: [
            {
              btnName: "Book appointment",
              btnLink: "/appointment",
            },
            {
              btnName: "Compare offers",
              btnLink: "/get-started/how-can-we-help",
              btnColor: "#ffcc00",
              btnClick: () => {
                $applicationData={};
                $applicationData.LoanName = "Plot Loan";
                $applicationData.typeOfROI = "(HL/Construction/Plot+Construction/Plot)";
                 
              },  
            },
          ],
    }}
  >
    <!-- for desktop -->
    <div class="hidden lg:block">
      <StickyNavbar
        navList={{
          items: [
            {
              name: "Getting ready",
              targetId: `ready`,
            },
            {
              name: "Challenges & categories",
              targetId: `challenges`,
            },
            {
              name: "How Digital DSA helps",
              targetId: `help`,
            },
            {
              name: "Tools & calculators",
              targetId: `tools`,
            },
          ],
          actionBtns: [
            {
              btnName: "Book appointment",
              btnLink: "/appointment",
            },
            {
              btnName: "Compare offers",
              btnLink: "/get-started/how-can-we-help",
              btnColor: "#ffcc00",
              btnClick: () => {
                 $applicationData={};
                $applicationData.LoanName = "Plot Loan";
                $applicationData.typeOfROI = "(HL/Construction/Plot+Construction/Plot)";
              },
            },
          ],
        }}
        {activeSection}
      />
      <div id="ready" data-section="ready" class="section">
        <ThreeColumWithLeftHeading
          contents={{
            heading: "Getting ready to buy",
            cardData: [
              {
                id: "1",
                title: "Evaluate your financial situation",
                para: `Assess your finances to ensure you can comfortably manage the loan and repayment. A clear picture of your financial health helps you set a realistic budget.`,
                // linkName: "For detailed advice on financial assessments",
                // url: "",
              },
              {
                id: "2",
                title: "Research loan options",
                para: `Compare different plot-only loan options to find the best interest rates and terms. Understanding your choices will help you make an informed decision.`,
                // linkName: "Explore options",
                // url: "",
              },
              {
                id: "3",
                title: "Prepare Necessary Documentation",
                para: `Ensure you have all the required documents like proof of income and property details ready for the loan application. This will help streamline the process.`,
                // linkName: "Keep reading for the documentation checklist",
                // url: "",
              },
              {
                id: "4",
                title: "Understand the risks involved",
                para: `Recognize the risks such as interest rates and market fluctuations before committing to a plot-only loan. It’s crucial to understand the potential long-term impact`,
                // linkName: "Learn more",
                // url: "",
              },
            ],
          }}
        />
      </div>

      <div id="challenges" data-section="challenges" class="section">
        <!-- challenges for plot loan only -->
        <TwoColumnWithLeftHeading
          contents={{
            heading: `Common Challenges in Securing <span class="underline decoration-4 underline-offset-4 decoration-btnBg">Plot-Only</span> loan`,

            secHeading: `Getting a plot loan in India is tougher than a home loan due to:`,
            list: [
              {
                heading: `Limited Availability & Location Restrictions –`,
                desc: `Plot loans are harder to get and usually approved only for plots within municipal limits.`,
              },
              {
                heading: `Higher Costs & Shorter Tenure –`,
                desc: `Interest rates (8.5%–11%) are higher than home loans, with a shorter repayment period (10-15 years).`,
              },
              {
                heading: `Strict Eligibility & Legal Issues –`,
                desc: `Requires high income, strong credit score, and clear land titles to avoid ownership disputes.`,
              },
              {
                heading: `Mandatory Construction & Fewer Tax Benefits –`,
                desc: `Many banks impose a construction clause, and tax benefits are limited compared to home loans.`,
              },
            ],
            listUrl: {
              url: "/plot-loan/plot-only-loan-challenges",
              linkName: "Learn More About Plot Loan Challenges →",
            },
            listSecPara: `💡 <span class="font-semibold">Tip:</span> Before applying, check if your lender allows <span class="font-semibold">plot purchase without mandatory construction</span> to avoid future complications.`,
          }}
        />

        <AboveTitleWithLeftIconCard
          contents={{
            heading: `Plot-only loan categories`,
            xlGridCol: 4,
            borderBottom: true,
            cards: [
              {
                heading: "Residential Plot Loan",
                para: "A loan designed for individuals looking to purchase a plot for <span class='font-semibold'>building a home</span> in a residential area. Some lenders may require you to start <span class='font-semibold'>construction</span> within a specific <span class='font-semibold'>timeframe</span>.",
                icon: "/icons/residential.svg",
                altName: "residential Icon",
              },
              {
                heading: "Commercial Plot Loan",
                para: "This type of loan is for buying land intended for <span class='font-semibold'>commercial use</span>, such as <span class='font-semibold'>office spaces</span>, <span class='font-semibold'>retail outlets</span>, or <span class='font-semibold'>warehouses</span>. Interest rates and <span class='font-semibold'>eligibility criteria</span> may differ from <span class='font-semibold'>residential plot loans</span>.",
                icon: "/icons/bt-2.svg",
                altName: "commercial Icon",
              },
              {
                heading: "Agricultural Land Loan",
                para: "A loan provided for <span class='font-semibold'>purchasing farmland</span>, often <span class='font-semibold'>restricted</span> to individuals engaged in <span class='font-semibold'>farming</span> or <span class='font-semibold'>agriculture</span>. Some countries have <span class='font-semibold'>regulations</span> on who can buy <span class='font-semibold'>agricultural land</span>.",
                icon: "/icons/agriZone.svg",
                altName: "plot Icon",
              },
              {
                heading: "Investment Plot Loan",
                para: "For those looking to buy land purely for <span class='font-semibold'>investment purposes</span> without immediate plans to develop it. These loans may have <span class='font-semibold'>stricter conditions</span> since they <span class='font-semibold'>don’t involve immediate construction</span>.",
                icon: "/icons/sellingHome.svg",
                altName: "home Icon",
              },
            ],
          }}
        />

        <div
          class="py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-borderColor"
        >
          <div class="">
            <h2
              class="grid mb-[4rem] typography-h2 text-text-main text-center"
            >
              Plot-Only loans : <br />
              <span
                class="underline decoration-4 underline-offset-4 decoration-btnBg italic"
                >Key Differences</span
              >
            </h2>
          </div>
          <div class="">
            {#each firstTableData as tableData}
              <PaymentTable {tableData} />
            {/each}
          </div>
        </div>

        <div id="bt">
          <TwoColumnWithLeftHeading
            contents={{
              heading: `Why balance transfer is not allowed for Plot-Only loan?`,
              list: [
                {
                  heading: `No Balance Transfer for Plot-Only Loans –`,
                  desc: `Plot-only loans are generally not eligible for balance transfer, as lenders prefer financing properties with immediate construction plans. Without a building project, the risk for banks remains high, limiting refinancing options. However, there’s a way to work around this restriction by upgrading your loan type.`,
                },
                {
                  heading: `Balance Transfer Denied? Try Upgrading! –`,
                  desc: `If you have a plot-only loan, transferring it to another lender isn’t usually possible. Lenders prefer loans linked to property development, which ensures a tangible asset backing the loan. The good news? You can still restructure your loan by converting it into a <a href="/plot-loan/plot-and-construction-loan">Plot + Construction Loan</a> for better terms.`,
                },
              ],
              // listUrl: {
              //   url: "/plot-loan/plot-only-loan-challenges",
              //   linkName: "Learn More About Plot Loan Challenges →",
              // },
              // listSecPara: `💡 <span class="font-semibold">Tip:</span> Before applying, check if your lender allows <span class="font-semibold">plot purchase without mandatory construction</span> to avoid future complications.`,
            }}
          />
        </div>

        <ThreeColumWithLeftHeading
          contents={{
            heading: "Own your dream plot with ease",
            cardData: [
              {
                title: "Flexible plot loans & balance transfer",
                para: "Secure your plot loan easily. Explore financing options, get expert support, and apply in just a few clicks.",
                btnName: "Claim your loan",
                btnLink: "/get-started/how-can-we-help",
                btnColor: "#ffcc00",
                btnClick: () => {
                  ($applicationData.LoanName = "Plot Loan"),
                    ($applicationData.LoanType = "Plot Loan Only");
                },
              },
              {
                title: "Get the best plot loan deal",
                para: "Find competitive interest rates and flexible repayment options tailored to your needs. Compare offers and secure the best deal for your plot purchase.",
                btnName: "Book an appointment",
                btnLink: "/appointment",
                btnBorder: "#4F4C4D",
              },
            ],
          }}
        />
      </div>

      <div id="help" data-section="help" class="section">
        <TwoColumnWithImage
          contents={{
            cardImage: "/images/housing.jpg",
            cardAltName: "housing-figure",
            cardHeading: "How we Help",
            reverse: true,
          }}
        >
          <div class="typography-body-sm text-text-light">
            <ul class="list-disc space-y-4">
              <li class="flex items-start gap-1">
                <img src="/icons/circle-check.svg" alt="circle-check-icon" class="h-4 mt-1" />
                <span>
                  <strong>Compare Offers from Multiple Banks/NBFCs:</strong> Help
                  users choose the best interest rate and tenure.
                </span>
              </li>
              <li class="flex items-start gap-1">
                <img src="/icons/circle-check.svg" alt="circle-check-icon" class="h-4 mt-1" />
                <span>
                  <strong>Transparency & Zero Spam Policy:</strong> No contact required
                  upfront; no spam calls.
                </span>
              </li>
              <li class="flex items-start gap-1">
                <img src="/icons/circle-check.svg" alt="circle-check-icon" class="h-4 mt-1" />
                <span>
                  <strong>Easy-to-Use Tools:</strong> Use our calculators to determine
                  your eligibility, affordability, and EMI for plot loan.
                </span>
              </li>
              <li class="flex items-start gap-1">
                <img src="/icons/circle-check.svg" alt="circle-check-icon" class="h-4 mt-1" />
                <span>
                  <strong>Assured Cashback Offers:</strong> Mention any ongoing cashback
                  promotions or benefits for applying via your platform.
                </span>
              </li>
              <li class="flex items-start gap-1">
                <img src="/icons/circle-check.svg" alt="circle-check-icon" class="h-4 mt-1" />
                <span>
                  <strong>Doorstep Services:</strong> Highlight your convenience
                  factor, like document collection and processing from home.
                </span>
              </li>
            </ul>
          </div>
        </TwoColumnWithImage>

        <TwoColumnWithLeftHeading
          contents={{
            heading: "Explore more loan options",

            secPara:
              "Discover various loan alternatives tailored to your financial needs.",
            btnName: "Explore now",
            btnLink: "/plot-loan",
          }}
        />
      </div>

      <div id="tools" data-section="tools" class="section">
         <!-- money map -->
              <AboveTitleWithTopIconCard
                contents={{
                  heading: `Smart savings calculators – Plan your future with confidence`,
                  xlGridCol: 4,
                  borderBottom: true,
                  cards: [
                    {
                      heading: "Know How Long Your Savings Will Last",
                      para: `Determine how many years your savings can support your lifestyle.`,
                      icon: "/icons/clock.svg",
                      altName: "clock-icon",
                      linkName: "Check Your Savings Longevity",
                      url: "/money-map/how-long-will-your-savings-support-you",
                    },
                    {
                      heading: "Track Your Progress Towards Your Goal​",
                      para: `Estimate the time required to reach your financial milestones.`,
                      icon: "/icons/phoneConnection.svg",
                      altName: "phoneConnection-icon",
                      linkName: "Plan Your Savings Journey",
                      url: "/money-map/how-long-will-it-take-to-save",
                    },
                    {
                      heading: "Set a Target for Retirement Savings​​",
                      para: `Calculate the amount needed for a secure and comfortable retirement.`,
                      icon: "/icons/negotiate.svg",
                      altName: "negotiate-icon",
                      linkName: "Plan Your Retirement Fund",
                      url: "/money-map/how-much-to-save-by-retirement",
                    },
                    {
                      heading: "Grow Your Savings with Consistency​",
                      para: `See how regular contributions can maximize your savings over time.`,
                      icon: "/icons/coinHouse.svg",
                      altName: "coinHouse-icon",
                      linkName: "Calculate Your Future Savings",
                      url: "/money-map/how-much-can-i-save-with-regular-contributions",
                    },
                  ],
                }}
              />
        <!-- plot loan calc -->
        <AboveTitleWithBlackCard
          contents={{
            heading: "Plot loan calculator",
            xlGridCol: 4,
            borderBottom: true,
            cards: [
              {
                heading: "How much can I borrow?",
                icon: "/icons/calc.svg",
                iconAltName: "icon-calc",
                url: "/calculators/eligibility-calculator",
              },
              {
                heading: "Plot loan repayments calculator",
                icon: "/icons/lap.svg",
                iconAltName: "loan-icon",
                url: "/planners/part-payment-planner",
              },
              {
                heading: "Stamp duty calculator",
                icon: "/icons/apply.svg",
                iconAltName: "icons-apply",
                url: "/calculators/stamp-duty-calculator",
              },
              {
                heading: "Balance transfer calculator",
                icon: "/icons/calc.svg",
                iconAltName: "icons-calc",
                url: "/calculators/balance-transfer-calculator",
              },
            ],
          }}
        />

        <!-- ways to pay off -->
        <ButtonBanner
          contents={{
            heading: `Ways to pay off your plot loan faster`,
            para: `Small changes now can mean big differences later to how much of your plot loan you end up repaying.`,
            btnName: `Find out how`,
            btnBorder: `#4F4C4D`,
            btnLink: "/planners/both",
          }}
        />
      </div>
    </div>

    <!-- for mobile -->
    <div class="lg:hidden block">
      {#each ["Getting ready", "Challenges & categories", "How Digital DSA helps", "Tools & calculators"] as list, index}
        <details
          class="dropdown col-span-3 bg-darkColor text-white {index < list.length - 1 ? 'border-b' : ''}"
        >
          <summary
            class="col-span-3 list-none px-[1rem] py-[1.5rem]"
            onclick={(e) => toggleDropdown(e, index)}
          >
            <div class="mx-auto flex w-full items-center justify-between gap-4">
              <h2 class="text-navFont">{list}</h2>
              <div class="icon-container justify-self-end typography-h3">
                <span><i class="fa-solid fa-angle-down faq-icon"></i></span>
              </div>
            </div>
          </summary>

          {#if index == 0}
            <div id="ready" class="bg-white text-black">
              <ThreeColumWithLeftHeading
                contents={{
                  heading: "Getting ready to buy",
                  cardData: [
                    {
                      id: "1",
                      title: "Evaluate your financial situation",
                      para: `Assess your finances to ensure you can comfortably manage the loan and repayment. A clear picture of your financial health helps you set a realistic budget.`,
                      // linkName: "For detailed advice on financial assessments",
                      // url: "",
                    },
                    {
                      id: "2",
                      title: "Research loan options",
                      para: `Compare different plot-only loan options to find the best interest rates and terms. Understanding your choices will help you make an informed decision.`,
                      // linkName: "Explore options",
                      // url: "",
                    },
                    {
                      id: "3",
                      title: "Prepare Necessary Documentation",
                      para: `Ensure you have all the required documents like proof of income and property details ready for the loan application. This will help streamline the process.`,
                      // linkName: "Keep reading for the documentation checklist",
                      // url: "",
                    },
                    {
                      id: "4",
                      title: "Understand the risks involved",
                      para: `Recognize the risks such as interest rates and market fluctuations before committing to a plot-only loan. It’s crucial to understand the potential long-term impact`,
                      // linkName: "Learn more",
                      // url: "",
                    },
                  ],
                }}
              />
            </div>
          {:else if index == 1}
            <div id="challenges" class="bg-white text-black">
              <TwoColumnWithLeftHeading
                contents={{
                  heading: `Common Challenges in Securing <span class="underline decoration-4 underline-offset-4 decoration-btnBg">Plot-Only</span> loans`,

                  secHeading: `Getting a plot loan in India is tougher than a home loan due to:`,
                  list: [
                    {
                      heading: `Limited Availability & Location Restrictions –`,
                      desc: `Plot loans are harder to get and usually approved only for plots within municipal limits.`,
                    },
                    {
                      heading: `Higher Costs & Shorter Tenure –`,
                      desc: `Interest rates (8.5%–11%) are higher than home loans, with a shorter repayment period (10-15 years).`,
                    },
                    {
                      heading: `Strict Eligibility & Legal Issues –`,
                      desc: `Requires high income, strong credit score, and clear land titles to avoid ownership disputes.`,
                    },
                    {
                      heading: `Mandatory Construction & Fewer Tax Benefits –`,
                      desc: `Many banks impose a construction clause, and tax benefits are limited compared to home loans.`,
                    },
                  ],
                  listUrl: {
                    url: "/plot-loan/plot-only-loan-challenges",
                    linkName: "Learn More About Plot Loan Challenges →",
                  },
                  listSecPara: `💡 <span class="font-semibold">Tip:</span> Before applying, check if your lender allows <span class="font-semibold">plot purchase without mandatory construction</span> to avoid future complications.`,
                }}
              />

              <AboveTitleWithLeftIconCard
                contents={{
                  heading: `Plot-only loan categories`,
                  xlGridCol: 4,
                  borderBottom: true,
                  cards: [
                    {
                      heading: "Residential Plot Loan",
                      para: "A loan designed for individuals looking to purchase a plot for <span class='font-semibold'>building a home</span> in a residential area. Some lenders may require you to start <span class='font-semibold'>construction</span> within a specific <span class='font-semibold'>timeframe</span>.",
                      icon: "/icons/residential.svg",
                      altName: "Message Icon",
                    },
                    {
                      heading: "Commercial Plot Loan",
                      para: "This type of loan is for buying land intended for <span class='font-semibold'>commercial use</span>, such as <span class='font-semibold'>office spaces</span>, <span class='font-semibold'>retail outlets</span>, or <span class='font-semibold'>warehouses</span>. Interest rates and <span class='font-semibold'>eligibility criteria</span> may differ from <span class='font-semibold'>residential plot loans</span>.",
                      icon: "/icons/bt-2.svg",
                      altName: "commercial Icon",
                    },
                    {
                      heading: "Agricultural Land Loan",
                      para: "A loan provided for <span class='font-semibold'>purchasing farmland</span>, often <span class='font-semibold'>restricted</span> to individuals engaged in <span class='font-semibold'>farming</span> or <span class='font-semibold'>agriculture</span>. Some countries have <span class='font-semibold'>regulations</span> on who can buy <span class='font-semibold'>agricultural land</span>.",
                      icon: "/icons/agriZone.svg",
                      altName: "plot Icon",
                    },
                    {
                      heading: "Investment Plot Loan",
                      para: "For those looking to buy land purely for <span class='font-semibold'>investment purposes</span> without immediate plans to develop it. These loans may have <span class='font-semibold'>stricter conditions</span> since they <span class='font-semibold'>don’t involve immediate construction</span>.",
                      icon: "/icons/sellingHome.svg",
                      altName: "home Icon",
                    },
                  ],
                }}
              />

              <div 
                class="py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-borderColor"
              >
                <div class="">
                  <h2
                    class="grid mb-[4rem] typography-h2 text-text-main text-center"
                  >
                    Plot-Only loans : <br />
                    <span
                      class="underline decoration-4 underline-offset-4 decoration-btnBg italic"
                      >Key Differences</span
                    >
                  </h2>
                </div>
                <div class="">
                  {#each firstTableData as tableData}
                    <PaymentTable {tableData} />
                  {/each}
                </div>
              </div>

              <div id="bt">
                <TwoColumnWithLeftHeading
                  contents={{
                    heading: `Why balance transfer is not allowed for Plot-Only loan?`,
                    list: [
                      {
                        heading: `No Balance Transfer for Plot-Only Loans –`,
                        desc: `Plot-only loans are generally not eligible for balance transfer, as lenders prefer financing properties with immediate construction plans. Without a building project, the risk for banks remains high, limiting refinancing options. However, there’s a way to work around this restriction by upgrading your loan type.`,
                      },
                      {
                        heading: `Balance Transfer Denied? Try Upgrading! –`,
                        desc: `If you have a plot-only loan, transferring it to another lender isn’t usually possible. Lenders prefer loans linked to property development, which ensures a tangible asset backing the loan. The good news? You can still restructure your loan by converting it into a <a href="/plot-loan/plot-and-construction-loan">Plot + Construction Loan</a> for better terms.`,
                      },
                    ],
                    // listUrl: {
                    //   url: "/plot-loan/plot-only-loan-challenges",
                    //   linkName: "Learn More About Plot Loan Challenges →",
                    // },
                    // listSecPara: `💡 <span class="font-semibold">Tip:</span> Before applying, check if your lender allows <span class="font-semibold">plot purchase without mandatory construction</span> to avoid future complications.`,
                  }}
                />
              </div>

              <ThreeColumWithLeftHeading
                contents={{
                  heading: "Own your dream plot with ease",
                  cardData: [
                    {
                      title: "Flexible plot loans & balance transfer",
                      para: "Secure your plot loan easily. Explore financing options, get expert support, and apply in just a few clicks.",
                      btnName: "Claim your loan",
                      btnLink: "/get-started/how-can-we-help",
                      btnColor: "#ffcc00",
                      btnClick: () => {
                        ($applicationData.LoanName = "Plot Loan"),
                          ($applicationData.LoanType = "Plot Loan Only");
                      },
                    },
                    {
                      title: "Get the best plot loan deal",
                      para: "Find competitive interest rates and flexible repayment options tailored to your needs. Compare offers and secure the best deal for your plot purchase.",
                      btnName: "Book an appointment",
                      btnLink: "/appointment",
                      btnBorder: "#4F4C4D",
                    },
                  ],
                }}
              />
            </div>
          {:else if index == 2}
            <div id="help" class="bg-white text-black">
              <TwoColumnWithImage
                contents={{
                  cardImage: "/images/housing.jpg",
                  cardAltName: "housing-figure",
                  cardHeading: "How we Help",
                  reverse: true,
                }}
              >
                <div class="typography-body-sm text-text-light">
                  <ul class="list-disc space-y-4">
                    <li class="flex items-start gap-1">
                      <img
                        src="/icons/circle-check.svg"
                        alt="circle-check-icon"
                        class="h-4 mt-1"
                      />
                      <span>
                        <strong
                          >Compare Offers from Multiple Banks/NBFCs:</strong
                        > Help users choose the best interest rate and tenure.
                      </span>
                    </li>
                    <li class="flex items-start gap-1">
                      <img
                        src="/icons/circle-check.svg"
                        alt="circle-check-icon"
                        class="h-4 mt-1"
                      />
                      <span>
                        <strong>Transparency & Zero Spam Policy:</strong> No contact
                        required upfront; no spam calls.
                      </span>
                    </li>
                    <li class="flex items-start gap-1">
                      <img
                        src="/icons/circle-check.svg"
                        alt="circle-check-icon"
                        class="h-4 mt-1"
                      />
                      <span>
                        <strong>Easy-to-Use Tools:</strong> Use our calculators to
                        determine your eligibility, affordability, and EMI for plot
                        loan.
                      </span>
                    </li>
                    <li class="flex items-start gap-1">
                      <img
                        src="/icons/circle-check.svg"
                        alt="circle-check-icon"
                        class="h-4 mt-1"
                      />
                      <span>
                        <strong>Assured Cashback Offers:</strong> Mention any ongoing
                        cashback promotions or benefits for applying via your platform.
                      </span>
                    </li>
                    <li class="flex items-start gap-1">
                      <img
                        src="/icons/circle-check.svg"
                        alt="circle-check-icon"
                        class="h-4 mt-1"
                      />
                      <span>
                        <strong>Doorstep Services:</strong> Highlight your convenience
                        factor, like document collection and processing from home.
                      </span>
                    </li>
                  </ul>
                </div>
              </TwoColumnWithImage>

              <TwoColumnWithLeftHeading
                contents={{
                  heading: "Explore more loan options",

                  secPara:
                    "Discover various loan alternatives tailored to your financial needs.",
                  btnName: "Explore now",
                  btnLink: "/plot-loan",
                }}
              />
            </div>
          {:else if index == 3}
            <div id="tools" class="bg-white text-black">
               <!-- money map -->
              <AboveTitleWithTopIconCard
                contents={{
                  heading: `Smart savings calculators – Plan your future with confidence`,
                  xlGridCol: 4,
                  borderBottom: true,
                  cards: [
                    {
                      heading: "Know How Long Your Savings Will Last",
                      para: `Determine how many years your savings can support your lifestyle.`,
                      icon: "/icons/clock.svg",
                      altName: "clock-icon",
                      linkName: "Check Your Savings Longevity",
                      url: "/money-map/how-long-will-your-savings-support-you",
                    },
                    {
                      heading: "Track Your Progress Towards Your Goal​",
                      para: `Estimate the time required to reach your financial milestones.`,
                      icon: "/icons/phoneConnection.svg",
                      altName: "phoneConnection-icon",
                      linkName: "Plan Your Savings Journey",
                      url: "/money-map/how-long-will-it-take-to-save",
                    },
                    {
                      heading: "Set a Target for Retirement Savings​​",
                      para: `Calculate the amount needed for a secure and comfortable retirement.`,
                      icon: "/icons/negotiate.svg",
                      altName: "negotiate-icon",
                      linkName: "Plan Your Retirement Fund",
                      url: "/money-map/how-much-to-save-by-retirement",
                    },
                    {
                      heading: "Grow Your Savings with Consistency​",
                      para: `See how regular contributions can maximize your savings over time.`,
                      icon: "/icons/coinHouse.svg",
                      altName: "coinHose-icon",
                      linkName: "Calculate Your Future Savings",
                      url: "/money-map/how-much-can-i-save-with-regular-contributions",
                    },
                  ],
                }}
              />
              <!-- plot loan calc -->
              <AboveTitleWithBlackCard
                contents={{
                  heading: "Plot loan calculator",
                  xlGridCol: 4,
                  borderBottom: true,
                  cards: [
                    {
                      heading: "How much can I borrow?",
                      icon: "/icons/calc.svg",
                      iconAltName: "icon-calc",
                      url: "/calculators/eligibility-calculator",
                    },
                    {
                      heading: "Plot loan repayments calculator",
                      icon: "/icons/lap.svg",
                      iconAltName: "loan-icon",
                      url: "/planners/part-payment-planner",
                    },
                    {
                      heading: "Stamp duty calculator",
                      icon: "/icons/apply.svg",
                      iconAltName: "icons-apply",
                      url: "/calculators/stamp-duty-calculator",
                    },
                    {
                      heading: "Balance transfer calculator",
                      icon: "/icons/calc.svg",
                      iconAltName: "icons-calc",
                      url: "/calculators/balance-transfer-calculator",
                    },
                  ],
                }}
              />

              <!-- ways to pay off -->
              <ButtonBanner
                contents={{
                  heading: `Ways to pay off your plot loan faster`,
                  para: `Small changes now can mean big differences later to how much of your plot loan you end up repaying.`,
                  btnName: `Find out how`,
                  btnBorder: `#4F4C4D`,
                  btnLink: "/planners/both",
                }}
              />
            </div>
          {/if}
        </details>
      {/each}
    </div>
    <!-- message us  -->
   <TwoColumnWithImage
      contents={{
        cardImage: `/images/message.jpg`,
        cardAltName: `CardCover`,
        cardHeading: `Message us 24/7`,
        sourceName: "DigitalDSA",
        originalSource: "www.digitaldsa.com",
      }}
    >
      <p>
        Feel free to message us anytime for expert assistance with your loan
        needs. Our team is here to provide professional advice, guide you
        through the loan process, and help you find the best options. No matter
        the time, we’ve got you covered! Message us anytime, and we’ll respond
        promptly.
      </p>
      <div class="w-auto">
        <Button link="/contact" btnBorder="#4F4C4D" btnName="Message us" />
      </div>
    </TwoColumnWithImage>
    <div slot="secondary">
      <HelpList
        contents={{
          heading: `We're here to help`,
          xlGridCol: 4,
          borderBottom: true,
          cards: [
            {
              heading: "Book an </br> appointment",
              para: "Book instantly to speak to a plot loan specialist at a time that suits you",
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
              para: "Fast-track your call and connect with a specialist in the DigitalDSA.",
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

<style>
  .section {
    scroll-margin-top: 4rem; /* Adjust this value to match your navbar height */
  }
</style>
