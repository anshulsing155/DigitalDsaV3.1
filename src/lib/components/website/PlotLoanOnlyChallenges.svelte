<script>
  import { onMount } from "svelte";
  import NewPageLayout from "./NewPageLayout.svelte";
  import TwoColumnWithImage from "./TwoColumnWithImage.svelte";
  import TwoColumnWithLeftHeading from "./TwoColumnWithLeftHeading.svelte";
  import AboveTitleWithoutIconCard from "./AboveTitleWithoutIconCard.svelte";
  import ThingsYouShould from "./ThingsYouShould.svelte";
  import HelpList from "./HelpList.svelte";
  import Button from "./Button.svelte";
  import AboveTitleWithTopIconCard from "./AboveTitleWithTopIconCard.svelte";
  import PaymentTable from "./PaymentTable.svelte";
  import AboveTitleWithBlackCard from "./AboveTitleWithBlackCard.svelte";
  import ButtonBanner from "./ButtonBanner.svelte";
  import { applicationData } from "$lib/stores/stores";
  import StickyNavbar from "./StickyNavbar.svelte";
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
        "<div class='flex gap-2 items-center justify-center'><img class='h-5' src='/icons/features.svg' alt='gear icon'> Option </div>",
        "<div class='flex gap-2 items-center justify-center'><img class='h-5' src='/icons/plotLoans.svg' alt='plot icon'> Approval Speed </div>",
        "<div class='flex gap-2 items-center justify-center'> <img class='h-5' src='/icons/inte.svg' alt='home icon'> Interest Rates </div>",
        "<div class='flex gap-2 items-center justify-center'><img class='h-5' src='/icons/personalLoan.svg' alt='gear icon'> Loan Amount </div>",
        "<div class='flex gap-2 items-center justify-center'><img class='h-5' src='/icons/support.svg' alt='plot icon'> Collateral Required? </div>",
        "<div class='flex gap-2 items-center justify-center'> <img class='h-5' src='/icons/accessEnergy.svg' alt='home icon'> Key Pros </div>",
        "<div class='flex gap-2 items-center justify-center'><img class='h-5' src='/icons/lap.svg' alt='gear icon'> Key Cons	 </div>",
        "<div class='flex gap-2 items-center justify-center'><img class='h-5' src='/icons/bulb.svg' alt='plot icon'> Best For </div>",
      ],
      rowData: [
        {
          "<span class='font-FourthHead flex gap-4 items-center'><img class='h-6' src='/icons/purpose.svg' alt='purpose icon'> NBFCs (Non-Banking Financial Companies) </span>":
            [
              "⭐⭐⭐",
              "Moderate to High",
              "Medium to High",
              "Usually Required",
              "Easier approval, flexible terms",
              "Higher interest than banks",
              "Buyers needing structured loans",
            ],
        },
        {
          "<span class='font-FourthHead flex gap-4 items-center'><img class='h-6' src='/icons/constructionTable.svg' alt='home icon'>HFCs (Housing Finance Companies)</span>":
            [
              "⭐⭐",
              "Moderate",
              "Medium to High",
              "Sometimes Required",
              "Specialized in property loans",
              "May require higher down payment",
              "Buyers looking for real estate-focused loans",
            ],
        },
        {
          "<span class='font-FourthHead flex gap-4 items-center'><img class='h-6' src='/icons/propertyEligibility.svg' alt='home icon'>Loan Against Property (LAP)</span>":
            [
              "⭐⭐",
              "Low to Moderate",
              "High (depends on property value)",
              "Yes (existing property)",
              "Large loan amounts, lower rates",
              "Risk of losing property",
              "Those with an existing property",
            ],
        },
        {
          "<span class='font-FourthHead flex gap-4 items-center'><img class='h-6' src='/icons/taxBenefits.svg' alt='home icon'>Gold Loan</span>":
            [
              "⭐⭐⭐⭐",
              "Low to Moderate",
              "Low to Medium",
              "Yes (gold as collateral)",
              "Quick processing, no property required",
              "Limited loan amount, risk of losing gold",
              "Buyers needing a quick short-term loan",
            ],
        },
        {
          "<span class='font-FourthHead flex gap-4 items-center'><img class='h-6' src='/icons/availability.svg' alt='home icon'>Credit Unions & Cooperative Societies</span>":
            [
              "⭐⭐",
              "Low to Moderate",
              "Medium",
              "Sometimes",
              "Lower rates than private lenders",
              "Limited availability",
              "Those eligible for membership",
            ],
        },
        {
          "<span class='font-FourthHead flex gap-4 items-center'><img class='h-6' src='/icons/bestFor.svg' alt='home icon'>Friends & Family Loan</span>":
            [
              "⭐⭐⭐⭐",
              "None to Low",
              "Varies",
              "No",
              "No interest or flexible repayment",
              "Personal relationship risk",
              "Buyers with trusted financial support",
            ],
        },
      ],
    },
  ];

  let challenges = {
    heading: `Common Challenges in <br> securing <span class="underline decoration-4 underline-offset-4 decoration-btnBg">Plot-Only </span> loans`,
    list: [
      {
        heading: "Limited availability",
        topPara: `Plot loans are less common than home loans, limiting options for borrowers.`,
        para: `<span class="font-FourthHead">💡Solution:</span> Plot loans are less common than home loans, limiting options for borrowers.`,
      },
      {
        heading: "Location restrictions",
        topPara: `Lenders favor plots in developed areas, making some locations ineligible for financing.`,
        para: `<span class="font-FourthHead">💡Solution:</span> Choose a well-established area that meets lender criteria. Consult a real estate agent or financial advisor for insights.`,
      },
      {
        heading: "High down payment",
        topPara: `Plot-only loans often require 20-30% down, making them a financial burden.`,
        para: `<span class="font-FourthHead">💡Solution:</span> Save more or seek lenders with flexible terms and lower LTV ratios.`,
      },
      {
        heading: "Higher interest rates",
        topPara: `Plot-only loans have higher interest rates due to increased risk and lack of collateral.`,
        para: `<span class="font-FourthHead">💡Solution:</span> Compare rates, negotiate, or improve your credit score.`,
      },
      {
        heading: "Shorter loan tenure",
        topPara: `Plot loans typically have 5-10 year terms, leading to higher monthly payments.`,
        para: `<span class="font-FourthHead">💡Solution:</span> Assess affordability and explore longer tenure options or alternative financing.`,
      },
      {
        heading: "Mandatory construction clause",
        topPara: `Some plot loans require construction to start within a set timeframe. Failure to comply may lead to penalties or loan cancellation.`,
        para: `<span class="font-FourthHead">💡Solution:</span> Plan ahead, secure approvals, and stay on schedule to avoid issues.`,
      },
      {
        heading: "Strict eligibility criteria",
        topPara: `Lenders require a high credit score, specific income levels, and strong repayment ability.`,
        para: `<span class="font-FourthHead">💡Solution:</span> Improve your credit score or get a co-signer to boost approval chances.`,
      },
      {
        heading: "Legal & title issues",
        topPara: `Unclear titles and legal complications can hinder plot loan approval. Lenders require a dispute-free title.`,
        para: `<span class="font-FourthHead">💡Solution:</span> Conduct a title search and resolve issues beforehand. Consult a legal expert to ensure a clear title.`,
      },
      {
        heading: "Prepayment & foreclosure charges",
        topPara: `Plot loans often have penalties for early repayment or foreclosure, limiting financial flexibility.`,
        para: `<span class="font-FourthHead">💡Solution:</span> Review loan terms for such clauses, negotiate lower penalties, or opt for a lender with flexible terms.`,
      },
    ],
  };
</script>

<Seo
  type="WebPage"
  title="Common Hurdles & Solutions for Securing a Plot Loan in India"
  image= "/images/plot-only-loan-challenges-blog.jpg"
  description="Struggling to get a plot-only loan? Learn about challenges, eligibility, financing options, and expert tips to boost approval chances."
  keywords="Plot loan challenges, Plot loan eligibility, Plot loan approval tips, Alternative financing for land purchase, Plot loan interest rates, How to get a plot loan, Land loan documentation, Plot loan down payment, Legal issues in land loans, Compare plot loan rates"
/>

<section>
  <NewPageLayout
    pageData={{
      coverImage: "/images/plot-only-loan-challenges-blog.jpg",
      coverAlt: "hero-cover",
      classStyle: "object-cover xl:h-[90svh] 3xl:max-h-[60svh]",
      heading: "Common Hurdles When applying for a plot loan only",
      actionBtns: [
        {
          btnName: "Book appointment",
          btnLink: "/appointment",
        },
        {
          btnName: "Compare rates",
          btnLink: "/get-started/how-can-we-help",
          btnColor: "#ffcc00",
          btnClick: () => {
            $applicationData.LoanName = "Plot Loan";
          },
        },
      ],
      para: `Plot loans are harder to secure due to higher costs, strict eligibility, location limits, and mandatory construction clauses.`,
    }}
  >
    <!-- for desktop -->
    <div class="hidden lg:block">
      <StickyNavbar
        navList={{
          items: [
            {
              name: "Plot search",
              targetId: `search`,
            },
            {
              name: "Key challenges",
              targetId: `challenges`,
            },
            {
              name: "Improve chances",
              targetId: `chances`,
            },
            {
              name: "Alternate financing",
              targetId: `alternate`,
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
              btnName: "Compare rates",
              btnLink: "/get-started/how-can-we-help",
              btnColor: "#ffcc00",
              btnClick: () => {
                $applicationData.LoanName = "Plot Loan";
              },
            },
          ],
        }}
        {activeSection}
      />
      <div id="search" data-section="search" class="section">
        <!-- issue during prop. search -->
        <TwoColumnWithLeftHeading
          contents={{
            heading: `Simplifying Your Plot Search`,
            list: [
              {
                heading: `Title and ownership verification–`,
                desc: `Ensuring that the property has a clear title can be challenging. Issues like forged documents, disputes over ownership, or unclear historical records may arise, requiring thorough verification through government registries and legal consultation.`,
              },
              {
                heading: `Documentation and legal complexities–`,
                desc: `Property documents in India may sometimes be incomplete, outdated, or subject to legal disputes. Navigating the complex layers of documentation—including sale deeds, encumbrance certificates, and land-use approvals—often necessitates expert legal advice.`,
              },
              {
                heading: `Broker and agent reliability–`,
                desc: `The real estate market in India can involve intermediaries whose credentials or honesty might be questionable. Fraudulent brokers may misrepresent property details or hide potential issues, so relying on reputed professionals and verifying their background is crucial.`,
              },
              {
                heading: `Land encroachment and boundary disputes–`,
                desc: `Disputes over property boundaries or encroachments by neighboring structures are not uncommon. Without an accurate survey or physical inspection, you might face conflicts that can lead to prolonged legal battles.`,
              },
              {
                heading: `Zoning and land use issues–`,
                desc: `Properties can be marketed as suitable for one purpose (like residential or commercial use) while legally designated for another (such as agricultural land). Changing the zoning or land use can be a complex, time-consuming process with uncertain outcomes.`,
              },
            ],
          }}
        />
      </div>
      <div id="challenges" data-section="challenges" class="section">
        <div
          class="py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-borderColor"
        >
          <div class="flex flex-col gap-[2rem] lg:gap-[4rem]">
            <h2
              class="font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont"
            >
              {@html challenges.heading}
            </h2>
            <div
              class="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-[4rem]"
            >
              {#each challenges.list as listItem}
                <div
                  class="grid grid-rows-8 gap-4 rounded shadow-[10px_10px_10px_rgba(0,0,0,0.15)]"
                >
                  <!-- shadow-[10px_10px_25px_rgba(0,0,0,0.2)] -->
                  <h2 class="row-span-2 font-ThirdHead text-minSubHead p-4">
                    {@html listItem.heading}
                  </h2>
                  <p class="row-span-3 font-Paragraph text-subParaFont p-4">
                    {@html listItem.topPara}
                  </p>
                  <p
                    class="row-span-3 font-Paragraph text-subParaFont bg-black text-white p-4 rounded-b-lg"
                  >
                    {@html listItem.para}
                  </p>
                </div>
              {/each}
            </div>
          </div>
        </div>
      </div>
      <div id="chances" data-section="chances" class="section">
        <TwoColumnWithLeftHeading
          contents={{
            heading: `Improve your chances of getting a Plot-Only loan approved`,
            list: [
              {
                heading: `Strengthen Your Financial Profile–`,
                desc: `Lenders prefer financially stable borrowers. Maintain a high credit score, reduce outstanding debts, and provide proof of steady income. A low debt-to-income ratio will make you a more attractive candidate.`,
              },
              {
                heading: `Offer a Higher Down Payment–`,
                desc: `Plot-only loans carry more risk, so lenders may require a larger down payment (30%-50%). A higher upfront payment reduces their risk and improves your chances of approval, potentially leading to better loan terms.`,
              },
              {
                heading: `Present a Clear Land Use Plan–`,
                desc: `Lenders are more likely to approve loans for plots with a clear purpose. Show development plans, zoning approvals, or investment potential to assure lenders that the land has value beyond speculation.`,
              },
              {
                heading: `Explore Alternative Financing Options–`,
                desc: `If traditional banks are hesitant, consider private lenders, credit unions, or seller financing. Some government-backed programs may also offer favorable terms for land purchases.`,
              },
            ],
            listBtn: {
              btnName: "Get help with your plot-only loan",
              btnLink: "/appointment",
            },
          }}
        />
      </div>
      <div id="alternate" data-section="alternate" class="section">
        <AboveTitleWithTopIconCard
          contents={{
            heading: `Alternative financing options`,
            xlGridCol: 3,
            borderBottom: true,
            cards: [
              {
                heading: "Non-Banking Financial Companies (NBFCs)",
                para: `Some housing finance companies (HFCs) offer financing for land purchase, even if you don’t plan immediate construction.`,
                icon: "/icons/nbfc.svg",
                altName: "home-icon",
              },
              {
                heading: "Housing Finance Companies (HFCs)",
                para: `Some housing finance companies (HFCs) offer financing for land purchase, even if you don’t plan immediate construction.`,
                icon: "/icons/bt-2.svg",
                altName: "negotiate-icon",
              },
              {
                heading: "Loan Against Property (LAP)",
                para: `If you own a house, commercial property, or land, you can mortgage it to get a loan for buying another plot.`,
                icon: "/icons/lap.svg",
                altName: "phoneConnection-icon",
              },
              {
                heading: "Gold Loan (Quick Short-Term Option)",
                para: `If you have gold jewelry or coins, you can take a gold loan to finance your plot purchase and later you can convert into plot+construction loan.`,
                icon: "/icons/goldLoan.svg",
                altName: "contact-icon",
              },

              {
                heading: "Credit Unions & Cooperative Societies",
                para: `Some local credit unions or cooperative banks may offer land loans, especially for members.​`,
                icon: "/icons/peoples.svg",
                altName: "inte-icon",
              },
              {
                heading: "Borrowing from Friends or Family (If Practical)",
                para: `A private loan agreement with a trusted friend or family member can be an option.`,
                icon: "/icons/plotLoans.svg",
                altName: "offers-icon",
              },
            ],
          }}
        />

        <div
          class="py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-borderColor"
        >
          <div class="">
            <h2
              class="grid mb-[4rem] font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont text-center"
            >
              Comparison of Alternative Financing Options for Buying a Plot
            </h2>
          </div>
          <div class="">
            {#each firstTableData as tableData}
              <PaymentTable {tableData} />
            {/each}
          </div>
        </div>

        <ButtonBanner
          contents={{
            heading: `Ways to pay off your plot loan faster`,
            para: `Small changes now can mean big differences later to how much of your plot loan you end up repaying.`,
            btnName: `Find out how`,
            btnBorder: `#4F4C4D`,
            btnLink: "/planners/both",
          }}
        />

        <AboveTitleWithoutIconCard
          contents={{
            heading: `Legal & Financial Risks of <br> Alternative Financing`,
            xlGridCol: 3,
            borderBottom: true,

            list: [
              {
                heading: "Lack of regulatory oversight",

                topPara: `⚠️<span class="font-FourthHead">Risk:</span> Alternative financing methods may lack regulatory scrutiny, increasing the risk of fraud or unclear terms.`,
                para: `💡<span class="font-FourthHead">How to Avoid:</span> Research the lender’s credentials, ensure they are licensed, and review the loan contract for hidden fees or unfair clauses.`,
              },
              {
                heading: "High-interest rates and hidden fees",
                topPara: `⚠️<span class="font-FourthHead">Risk:</span> Alternative lenders may charge higher interest rates and hidden fees, leading to unmanageable debt.`,
                para: `💡<span class="font-FourthHead">How to Avoid:</span> Compare rates, fees, and terms, and ensure all costs are disclosed upfront. Calculate the total repayment amount to ensure it fits your budget.`,
              },
              {
                heading: "Uncertain or Unfavorable Loan Terms",
                topPara: `⚠️<span class="font-FourthHead">Risk:</span> Alternative financing may have unclear terms, like short repayment periods or variable interest rates, leading to financial strain.`,
                para: `💡<span class="font-FourthHead">How to Avoid:</span> Get professional advice, negotiate clearer terms, and ensure the repayment schedule is realistic and manageable.`,
              },
            ],
          }}
        />

        <!-- journey -->
        <TwoColumnWithLeftHeading
          contents={{
            heading: "Start your plot buying journey with us today",

            secHeading: "Apply for plot loan or balance transfer",
            secPara:
              "Get the most from your plot loan application process and book time with a plot Lending Specialist at a time and place that suits you.",
            btnName: "Compare offers",
            btnLink: "/get-started/how-can-we-help",
            btnColor: "#ffcc00",
            btnClick: () => {
              ($applicationData.LoanName = "Plot Loan"),
                ($applicationData.LoanType = "Plot Loan Only");
            },
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
      </div>
    </div>

    <!-- for mobile -->
    <div class="lg:hidden block">
      {#each ["Plot search", "Key challenges", "Improve chances", "Alternate financing", "Tools & calculators"] as list, index}
        <details
          class="dropdown col-span-3 bg-darkColor text-white {index <
          list.length - 1
            ? 'border-b'
            : ''} "
        >
          <summary
            class="col-span-3 list-none px-[1rem] py-[1.5rem]"
            onclick={(e) => toggleDropdown(e, index)}
          >
            <div class="mx-auto flex w-full items-center justify-between gap-4">
              <h2 class="text-navFont">{list}</h2>
              <div class="icon-container justify-self-end text-mobSubHead">
                <span><i class="fa-solid fa-angle-down faq-icon"></i></span>
              </div>
            </div>
          </summary>

          {#if index == 0}
            <div id="search" class="bg-white text-black">
              <TwoColumnWithLeftHeading
                contents={{
                  heading: `Simplifying Your Plot Search`,
                  list: [
                    {
                      heading: `Title and ownership verification–`,
                      desc: `Ensuring that the property has a clear title can be challenging. Issues like forged documents, disputes over ownership, or unclear historical records may arise, requiring thorough verification through government registries and legal consultation.`,
                    },
                    {
                      heading: `Documentation and legal complexities–`,
                      desc: `Property documents in India may sometimes be incomplete, outdated, or subject to legal disputes. Navigating the complex layers of documentation—including sale deeds, encumbrance certificates, and land-use approvals—often necessitates expert legal advice.`,
                    },
                    {
                      heading: `Broker and agent reliability–`,
                      desc: `The real estate market in India can involve intermediaries whose credentials or honesty might be questionable. Fraudulent brokers may misrepresent property details or hide potential issues, so relying on reputed professionals and verifying their background is crucial.`,
                    },
                    {
                      heading: `Land encroachment and boundary disputes–`,
                      desc: `Disputes over property boundaries or encroachments by neighboring structures are not uncommon. Without an accurate survey or physical inspection, you might face conflicts that can lead to prolonged legal battles.`,
                    },
                    {
                      heading: `Zoning and land use issues–`,
                      desc: `Properties can be marketed as suitable for one purpose (like residential or commercial use) while legally designated for another (such as agricultural land). Changing the zoning or land use can be a complex, time-consuming process with uncertain outcomes.`,
                    },
                  ],
                }}
              />
            </div>
          {:else if index == 1}
            <div id="challenges" class="bg-white text-black">
              <div
                class="py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-borderColor"
              >
                <div class="flex flex-col gap-[2rem] lg:gap-[4rem]">
                  <h2
                    class="font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont"
                  >
                    {@html challenges.heading}
                  </h2>
                  <div
                    class="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-[4rem]"
                  >
                    {#each challenges.list as listItem}
                      <div
                        class="grid grid-rows-8 gap-4 rounded shadow-[10px_10px_10px_rgba(0,0,0,0.15)]"
                      >
                        <!-- shadow-[10px_10px_25px_rgba(0,0,0,0.2)] -->
                        <h2
                          class="row-span-2 font-ThirdHead text-minSubHead p-4"
                        >
                          {@html listItem.heading}
                        </h2>
                        <p
                          class="row-span-3 font-Paragraph text-subParaFont p-4"
                        >
                          {@html listItem.topPara}
                        </p>
                        <p
                          class="row-span-3 font-Paragraph text-subParaFont bg-black text-white p-4 rounded-b-lg"
                        >
                          {@html listItem.para}
                        </p>
                      </div>
                    {/each}
                  </div>
                </div>
              </div>
            </div>
          {:else if index == 2}
            <div id="chances" class="bg-white text-black">
              <TwoColumnWithLeftHeading
                contents={{
                  heading: `Improve your chances of getting a Plot-Only loan approved`,
                  list: [
                    {
                      heading: `Strengthen Your Financial Profile–`,
                      desc: `Lenders prefer financially stable borrowers. Maintain a high credit score, reduce outstanding debts, and provide proof of steady income. A low debt-to-income ratio will make you a more attractive candidate.`,
                    },
                    {
                      heading: `Offer a Higher Down Payment–`,
                      desc: `Plot-only loans carry more risk, so lenders may require a larger down payment (30%-50%). A higher upfront payment reduces their risk and improves your chances of approval, potentially leading to better loan terms.`,
                    },
                    {
                      heading: `Present a Clear Land Use Plan–`,
                      desc: `Lenders are more likely to approve loans for plots with a clear purpose. Show development plans, zoning approvals, or investment potential to assure lenders that the land has value beyond speculation.`,
                    },
                    {
                      heading: `Explore Alternative Financing Options–`,
                      desc: `If traditional banks are hesitant, consider private lenders, credit unions, or seller financing. Some government-backed programs may also offer favorable terms for land purchases.`,
                    },
                  ],
                  listBtn: {
                    btnName: "Get help with your plot-only loan",
                    btnLink: "/appointment",
                  },
                }}
              />
            </div>
          {:else if index == 3}
            <div id="alternate" class="bg-white text-black">
              <AboveTitleWithTopIconCard
                contents={{
                  heading: `Alternative financing options`,
                  xlGridCol: 3,
                  borderBottom: true,
                  cards: [
                    {
                      heading: "Non-Banking Financial Companies (NBFCs)",
                      para: `Some housing finance companies (HFCs) offer financing for land purchase, even if you don’t plan immediate construction.`,
                      icon: "/icons/nbfc.svg",
                      altName: "home-icon",
                    },
                    {
                      heading: "Housing Finance Companies (HFCs)",
                      para: `Some housing finance companies (HFCs) offer financing for land purchase, even if you don’t plan immediate construction.`,
                      icon: "/icons/bt-2.svg",
                      altName: "negotiate-icon",
                    },
                    {
                      heading: "Loan Against Property (LAP)",
                      para: `If you own a house, commercial property, or land, you can mortgage it to get a loan for buying another plot.`,
                      icon: "/icons/lap.svg",
                      altName: "phoneConnection-icon",
                    },
                    {
                      heading: "Gold Loan (Quick Short-Term Option)",
                      para: `If you have gold jewelry or coins, you can take a gold loan to finance your plot purchase and later you can convert into plot+construction loan.`,
                      icon: "/icons/goldLoan.svg",
                      altName: "contact-icon",
                    },

                    {
                      heading: "Credit Unions & Cooperative Societies",
                      para: `Some local credit unions or cooperative banks may offer land loans, especially for members.​`,
                      icon: "/icons/peoples.svg",
                      altName: "inte-icon",
                    },
                    {
                      heading:
                        "Borrowing from Friends or Family (If Practical)",
                      para: `A private loan agreement with a trusted friend or family member can be an option.`,
                      icon: "/icons/plotLoans.svg",
                      altName: "offers-icon",
                    },
                  ],
                }}
              />

              <div
                class="py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-borderColor"
              >
                <div class="">
                  <h2
                    class="grid mb-[4rem] font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont text-center"
                  >
                    Comparison of Alternative Financing Options for Buying a
                    Plot
                  </h2>
                </div>
                <div class="">
                  {#each firstTableData as tableData}
                    <PaymentTable {tableData} />
                  {/each}
                </div>
              </div>

              <ButtonBanner
                contents={{
                  heading: `Ways to pay off your plot loan faster`,
                  para: `Small changes now can mean big differences later to how much of your plot loan you end up repaying.`,
                  btnName: `Find out how`,
                  btnBorder: `#4F4C4D`,
                  btnLink: "/planners/both",
                }}
              />

              <AboveTitleWithoutIconCard
                contents={{
                  heading: `Legal & Financial Risks of <br> Alternative Financing`,
                  xlGridCol: 3,
                  borderBottom: true,

                  list: [
                    {
                      heading: "Lack of regulatory oversight",

                      topPara: `⚠️<span class="font-FourthHead">Risk:</span> Alternative financing methods may lack regulatory scrutiny, increasing the risk of fraud or unclear terms.`,
                      para: `💡<span class="font-FourthHead">How to Avoid:</span> Research the lender’s credentials, ensure they are licensed, and review the loan contract for hidden fees or unfair clauses.`,
                    },
                    {
                      heading: "High-interest rates and hidden fees",
                      topPara: `⚠️<span class="font-FourthHead">Risk:</span> Alternative lenders may charge higher interest rates and hidden fees, leading to unmanageable debt.`,
                      para: `💡<span class="font-FourthHead">How to Avoid:</span> Compare rates, fees, and terms, and ensure all costs are disclosed upfront. Calculate the total repayment amount to ensure it fits your budget.`,
                    },
                    {
                      heading: "Uncertain or Unfavorable Loan Terms",
                      topPara: `⚠️<span class="font-FourthHead">Risk:</span> Alternative financing may have unclear terms, like short repayment periods or variable interest rates, leading to financial strain.`,
                      para: `💡<span class="font-FourthHead">How to Avoid:</span> Get professional advice, negotiate clearer terms, and ensure the repayment schedule is realistic and manageable.`,
                    },
                  ],
                }}
              />

              <!-- journey -->
              <TwoColumnWithLeftHeading
                contents={{
                  heading: "Start your plot buying journey with us today",

                  secHeading: "Apply for plot loan or balance transfer",
                  secPara:
                    "Get the most from your plot loan application process and book time with a plot Lending Specialist at a time and place that suits you.",
                  btnName: "Compare offers",
                  btnLink: "/get-started/how-can-we-help",
                  btnColor: "#ffcc00",
                  btnClick: () => {
                    ($applicationData.LoanName = "Plot Loan"),
                      ($applicationData.LoanType = "Plot Loan Only");
                  },
                }}
              />
            </div>
          {:else if index == 4}
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

<style>
  .section {
    scroll-margin-top: 4rem; /* Adjust this value to match your navbar height */
  }
</style>
