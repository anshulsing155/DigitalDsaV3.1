<script>
  import { onMount } from "svelte";
  import StickyNavbar from "./StickyNavbar.svelte";
  import NewPageLayout from "./NewPageLayout.svelte";
  import ThreeColumWithLeftHeading from "./ThreeColumWithLeftHeading.svelte";
  import TwoColumnWithImage from "./TwoColumnWithImage.svelte";
  import TwoColumnWithLeftHeading from "./TwoColumnWithLeftHeading.svelte";
  import ThingsYouShould from "./ThingsYouShould.svelte";
  import HelpList from "./HelpList.svelte";
  import Button from "./Button.svelte";
  import PaymentTable from "./PaymentTable.svelte";
  import ButtonBanner from "./ButtonBanner.svelte";
  import { applicationData } from "$lib/stores/stores";
  import AboveTitleWithBlackCard from "./AboveTitleWithBlackCard.svelte";
  import AboveTitleWithoutIconCard from "./AboveTitleWithoutIconCard.svelte";
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

  let loanTable = [
    {
      columnName: [
        "<div class='flex gap-2 items-center'><img class='h-5' src='/icons/features.svg' alt='gear icon'> Loan Type </div>",
        "<div class='flex gap-2 items-center text-left'><img class='h-5' src='/icons/plotLoans.svg' alt='plot icon'> Purpose </div>",
        "<div class='flex gap-2 items-center'> <img class='h-5' src='/icons/accessEnergy.svg' alt='energy icon'> Tenure </div>",
        "<div class='flex gap-2 items-center'> <img class='h-5' src='/icons/offers.svg' alt='gift icon'> Max LTV </div>",
        "<div class='flex gap-2 items-center'> <img class='h-5' src='/icons/manageLoan2.svg' alt='home icon'> Disbursement Mode </div>",
        "<div class='flex gap-2 items-center'> <img class='h-5' src='/icons/inte.svg' alt='home icon'> Interest Rate </div>",
      ],
      rowData: [
        {
          "<span class='font-FourthHead flex gap-4 items-center'><img class='h-6' src='/icons/plotOnlyloan.svg' alt='plot icon'> Only Plot Purchase Loan </span>":
            [
              "To buy a plot",
              `Up to 20 years`,
              `70% of market value`,
              "Paid to seller",
              "Standard Plot Loan ROI",
            ],
        },
        {
          "<span class='font-FourthHead flex gap-4 items-center'><img class='h-6' src='/icons/constructionTable.svg' alt='purpose icon'> Plot + Construction Loan </span>":
            [
              "To buy a plot and construct a house",
              `Up to 30 years`,
              `70% of market value`,
              "Disbursed in phases (construction-based)",
              "Same as Home Loan ROI",
            ],
        },
        {
          "<span class='font-FourthHead flex gap-4 items-center'><img class='h-6' src='/icons/lap.svg' alt='home icon'> Plot + Equity Loan </span>":
            [
              "To buy a plot & get additional cash",
              `Up to 15 years`,
              `70% of market value`,
              `80% of registry value to seller, balance to buyer`,
              "Up to 1% higher than Plot Loan ROI",
            ],
        },
        {
          "<span class='font-FourthHead flex gap-4 items-center'><img class='h-6' src='/icons/ownership.svg' alt='owner icon'> Only Plot Equity Loan (for an already purchased plot) </span>":
            [
              "Loan against an already purchased plot",
              `Up to 15 years`,
              `50% of market value`,
              `Disbursed to borrower`,
              "LAP Interest Rate",
            ],
        },
        {
          "<span class='font-FourthHead flex gap-4 items-center'><img class='h-6' src='/icons/renovateHome.svg' alt='home icon'> Only Construction Loan (for an already purchased plot) </span>":
            [
              "To construct a house on an existing plot",
              "Up to 30 years",
              `100% of construction cost`,
              `Disbursed in phases`,
              "Home Loan ROI",
            ],
        },
      ],
    },
  ];
  let consTable = [
    {
      columnName: [
        "<div class='flex gap-2 items-center'><img class='h-5' src='/icons/features.svg' alt='gear icon'> Feature </div>",
        "<div class='flex gap-2 items-center text-left'><img class='h-5' src='/icons/plotLoans.svg' alt='plot icon'> Plot + Equity Loan </div>",
        "<div class='flex gap-2 items-center'> <img class='h-5' src='/icons/accessEnergy.svg' alt='energy icon'> Only Plot Equity Loan </div>",
      ],
      rowData: [
        {
          "<span class='font-FourthHead flex gap-4 items-center'><img class='h-6' src='/icons/financialProfile.svg' alt='profile icon'> Who Can Apply? </span>":
            ["Buyers purchasing a new plot", `Owners of an already purchased`],
        },
        {
          "<span class='font-FourthHead flex gap-4 items-center'><img class='h-6' src='/icons/interestIcon.svg' alt='interest icon'> Loan Amount </span>":
            [
              "Higher (Up to 70% of market value)",
              `Lower (Up to 50% of market value)`,
            ],
        },
        {
          "<span class='font-FourthHead flex gap-4 items-center'><img class='h-6' src='/icons/renovateHome.svg' alt='purpose icon'> Usage of Funds </span>":
            [
              "Part goes to seller, part to buyer",
              `Entire amount goes to borrower`,
            ],
        },
        {
          "<span class='font-FourthHead flex gap-4 items-center'><img class='h-6' src='/icons/inte.svg' alt='inte icon'> Interest Rate </span>":
            ["Up to 1% higher than normal plot loan", `LAP Interest Rate`],
        },
        {
          "<span class='font-FourthHead flex gap-4 items-center'><img class='h-6' src='/icons/firstHome.svg' alt='tenure icon'> Loan Tenure </span>":
            ["15 years", "15 years"],
        },
        {
          "<span class='font-FourthHead flex gap-4 items-center'><img class='h-6' src='/icons/purpose.svg' alt='purpose icon'> Best For </span>":
            [
              "Buyers who need extra funds to cover deal costs",
              "Existing plot owners needing funds",
            ],
        },
      ],
    },
  ];
</script>

<Seo
  type="WebPage"
  title="Plot & Equity Loan – Smart Funding for Your Plot Purchase"
  image= "/images/plot-and-equity-loan-blog.jpg"
  description="Get a Plot & Equity Loan to bridge the gap between market & registered value. Compare offers, check eligibility & secure the best deal today!"
  keywords="Plot & Equity Loan, Plot Loan with Equity, Plot Purchase Loan, Land Financing Options, Loan for Buying a Plot, Plot Loan Interest Rates, Loan Against Plot, Equity Loan for Plot, Best Plot Loan Offers, Compare Plot Loan Deals, Plot + Equity Loan Eligibility, Secure a Loan for Land Purchase, High LTV Plot Loan"
/>

<section>
  <NewPageLayout
    pageData={{
      coverImage: "/images/plot-and-equity-loan-blog.jpg",
      coverAlt: "hero-cover",
      classStyle: "object-cover xl:h-[90svh] 3xl:max-h-[60svh]",
      heading: "Plot & Equity Loan: Smart Funding for Your Plot Purchase",
      actionBtns: [
            {
              btnName: "Book appointment",
              btnLink: "/appointment",
            },
            {
              btnName: "Get best offers",
              btnLink: "/get-started/how-can-we-help",
              btnColor: "#ffcc00",
              btnClick: () => {
                ($applicationData.LoanName = "Plot Loan"),
                  ($applicationData.LoanType = "Plot + Equity Loan");
              },
            },
          ],
      para: `Plot & Equity Loan helps buyers bridge the gap between a plot’s market value and registered value. It includes a Plot Purchase Loan (up to 80% of the registered value, paid to the seller) and a Plot Equity Loan (given to the buyer for the remaining cost), reducing the need for large cash payments.`,
    }}
  >
    <!-- for desktop -->
    <div class="hidden lg:block">
      <StickyNavbar
        navList={{
          items: [
            {
              name: "Plot + Equity",
              targetId: `equity`,
            },
            {
              name: "Key benefits",
              targetId: `benefits`,
            },
            {
              name: "Plot+Equity vs Plot Equity",
              targetId: `plotEquity`,
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
              btnName: "Get best offers",
              btnLink: "/get-started/how-can-we-help",
              btnColor: "#ffcc00",
              btnClick: () => {
                ($applicationData.LoanName = "Plot Loan"),
                  ($applicationData.LoanType = "Plot + Equity Loan");
              },
            },
          ],
        }}
        {activeSection}
      />

      <div id="equity" data-section="equity" class="section">
        <TwoColumnWithLeftHeading
          contents={{
            heading: `Plot + Equity`,
            listTopPara: `A Plot & Equity Loan bridges the gap when a plot’s market value exceeds its registered value.  <br> It's a rare offering, available from select banks due to higher risks and the absence of immediate construction plans.`,
            list: [
              {
                heading: `<span class="font-FourthHead">This loan bridges the gap by dividing the loan into two parts:</span>`,
                desc: `
                <span class="font-FourthHead">1. Plot Purchase Loan –</span>This is the amount the bank pays directly to the seller, covering up to 80% of the registered value of the plot.
                <br> <br>
                 <span class="font-FourthHead">2. Plot Equity Loan –</span>This is the amount given to the buyer, which is the difference between the total approved loan and the Plot Purchase Loan. It helps the buyer manage the remaining cost.
                     `,
              },
            ],
            listUrl: {
              url: "/appointment",
              linkName: "Discuss for more details →",
            },
          }}
        />
        <TwoColumnWithLeftHeading
          contents={{
            heading: `How Does It Work?`,
            secHeading: `Example calculation`,
            list: [
              {
                heading: `<span class="font-FourthHead">Key Property & Loan Details:</span>`,
                desc: `<ul class="ml-3 space-y-4">
                <li><span class="font-FourthHead">1. Market Value –</span>₹1 Crore.</li>
                 <li><span class="font-FourthHead">2. Registered Value –</span>₹50 Lakh.</li>
                 <li><span class="font-FourthHead">3. Loan Eligibility –</span>The buyer qualifies for a loan amount exceeding ₹1 Crore</li>
                 <li><span class="font-FourthHead">4. LTV Ratio –</span>Bank offers 70% of ₹1 Crore, approving a ₹70 Lakh loan.</li>
                 <li><span class="font-FourthHead">5. Sanctioned Loan –</span>₹70 Lakh.</li>
                 </ul>`,
              },
              {
                heading: `<span class="font-FourthHead">Loan Breakdown (The ₹70 Lakh loan is split into two parts):</span>`,
                desc: `<ul class="ml-3 space-y-4">
                 <li><span class="font-FourthHead">1. Plot Purchase Loan –</span>₹40 Lakh (80% of ₹50 Lakh) paid to the seller via cheque.</li>
                 <li><span class="font-FourthHead">2. Plot Equity Loan –</span>₹30 Lakh provided to the buyer to cover additional costs beyond the registered value.</li>
                 </ul>`,
              },
              {
                heading: `<span class="font-FourthHead">At the time of registry, both the cheques (one to the seller and one to the buyer) are disbursed. The buyer can use the Plot Equity Loan for additional payments, construction, or any other personal purpose.</span>`,
              },
            ],
          }}
        />
        <ButtonBanner
          contents={{
            heading: `Can You Avail an Equity or LAP Against <br> an Already Purchased Plot?`,
            para: `Yes! If you have already purchased a plot, you can avail a Loan Against Property (LAP) or Plot Equity Loan up to 50% of the current market value, provided you are eligible for that loan amount.`,
            btnName: `Explore how`,
            btnBorder: `#4F4C4D`,
            btnLink: "/lap",
          }}
        />

        <div
          class="py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[1rem] lg:px-[4rem] w-full border-b border-borderColor"
        >
          <div class="">
            <h2
              class="grid mb-[4rem] font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont text-center"
            >
              Comparison of Different Plot Loan Types
            </h2>
          </div>
          <div class="">
            {#each loanTable as tableData}
              <PaymentTable {tableData} />
            {/each}
          </div>
        </div>
      </div>

      <div id="benefits" data-section="benefits" class="section">
        <TwoColumnWithLeftHeading
          contents={{
            heading: `Key benefits`,
            list: [
              {
                heading: `<span class="font-FourthHead">Higher Loan Amount –</span>`,
                desc: `Combines a plot purchase loan with an equity component, increasing overall funding.`,
              },
              {
                heading: `<span class="font-FourthHead">Covers Additional Costs –</span>`,
                desc: `Helps manage extra expenses like seller’s premium, registration charges, or initial construction costs.`,
              },
              {
                heading: `<span class="font-FourthHead">Flexible Usage –</span>`,
                desc: `The equity portion can be used for any financial needs, such as home construction, renovation, or personal expenses.`,
              },
              {
                heading: `<span class="font-FourthHead">Improved Loan Eligibility –</span>`,
                desc: `Combining both components may improve eligibility and approval chances.`,
              },
              {
                heading: `<span class="font-FourthHead">Leverages Property Value –</span>`,
                desc: `Unlocks the potential of the plot’s market value for financial support.`,
              },
            ],
          }}
        />

        <div id="bt">
          <TwoColumnWithLeftHeading
            contents={{
              heading: `Why Balance Transfer is Not Allowed for Plot + Equity Loans?`,
              list: [
                {
                  heading: `No Balance Transfer for Plot + Equity Loans –`,
                  desc: `Plot + Equity Loans are generally not eligible for balance transfer, as lenders prefer refinancing loans backed by constructed properties. Since the equity portion is unsecured or linked to the plot’s value rather than a completed asset, banks perceive a higher risk, limiting transfer options. However, an alternative approach can help improve loan terms.`,
                },
                {
                  heading: `Balance Transfer Denied? Consider Loan Restructuring! –`,
                  desc: `If your Plot + Equity Loan cannot be transferred, restructuring may be a solution. Converting it into a Plot + Construction Loan can increase eligibility for refinancing, as lenders are more willing to transfer loans tied to an ongoing or completed construction project.`,
                },
              ],
            }}
          />
        </div>
        <ThreeColumWithLeftHeading
          contents={{
            heading: "Own your dream plot with ease",
            cardData: [
              {
                title: "Compare Top Plot + Equity Loan Offers",
                para: "Compare the best Plot + Equity Loan options based on interest rates, loan amounts, and terms. Find the most suitable lender to maximize benefits.",
                btnName: "Compare offers",
                btnLink: "/get-started/how-can-we-help",
                btnColor: "#ffcc00",
                btnClick: () => {
                  ($applicationData.LoanName = "Plot Loan"),
                    ($applicationData.LoanType = "Plot + Equity Loan");
                },
              },
              {
                title: "Still confused in plot + equity",
                para: "If you're unsure about how a Plot + Equity Loan works and whether it suits your needs, schedule an appointment with our experts.",
                btnName: "Book an appointment",
                btnLink: "/appointment",
                btnBorder: "#4F4C4D",
              },
            ],
          }}
        />
      </div>

      <div id="plotEquity" data-section="plotEquity" class="section">
        <div
          class="py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-borderColor"
        >
          <div class="">
            <h2
              class="grid mb-[4rem] font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont text-center"
            >
              Plot + Equity Loan vs. Only Plot Equity Loan
            </h2>
          </div>
          <div class="">
            {#each consTable as tableData}
              <PaymentTable {tableData} />
            {/each}
          </div>
        </div>
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
          <div class="font-Paragraph text-minParaFont">
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
      {#each ["Plot + Equity", "Key benefits", "Plot+Equity vs Plot Equity", "How Digital DSA helps", "Tools & calculators"] as list, index}
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
            <div id="equity" class="bg-white text-black">
              <TwoColumnWithLeftHeading
                contents={{
                  heading: `Plot + Equity`,
                  listTopPara: `A Plot & Equity Loan bridges the gap when a plot’s market value exceeds its registered value.  <br> It's a rare offering, available from select banks due to higher risks and the absence of immediate construction plans.`,
                  list: [
                    {
                      heading: `<span class="font-FourthHead">This loan bridges the gap by dividing the loan into two parts:</span>`,
                      desc: `
                <span class="font-FourthHead">1. Plot Purchase Loan –</span>This is the amount the bank pays directly to the seller, covering up to 80% of the registered value of the plot.
                <br> <br>
                 <span class="font-FourthHead">2. Plot Equity Loan –</span>This is the amount given to the buyer, which is the difference between the total approved loan and the Plot Purchase Loan. It helps the buyer manage the remaining cost.
                     `,
                    },
                  ],
                  listUrl: {
                    url: "/appointment",
                    linkName: "Discuss for more details →",
                  },
                }}
              />
              <TwoColumnWithLeftHeading
                contents={{
                  heading: `How Does It Work?`,
                  secHeading: `Example calculation`,
                  list: [
                    {
                      heading: `<span class="font-FourthHead">Key Property & Loan Details:</span>`,
                      desc: `<ul class="ml-3 space-y-4">
                <li><span class="font-FourthHead">1. Market Value –</span>₹1 Crore.</li>
                 <li><span class="font-FourthHead">2. Registered Value –</span>₹50 Lakh.</li>
                 <li><span class="font-FourthHead">3. Loan Eligibility –</span>The buyer qualifies for a loan amount exceeding ₹1 Crore</li>
                 <li><span class="font-FourthHead">4. LTV Ratio –</span>Bank offers 70% of ₹1 Crore, approving a ₹70 Lakh loan.</li>
                 <li><span class="font-FourthHead">5. Sanctioned Loan –</span>₹70 Lakh.</li>
                 </ul>`,
                    },
                    {
                      heading: `<span class="font-FourthHead">Loan Breakdown (The ₹70 Lakh loan is split into two parts):</span>`,
                      desc: `<ul class="ml-3 space-y-4">
                 <li><span class="font-FourthHead">1. Plot Purchase Loan –</span>₹40 Lakh (80% of ₹50 Lakh) paid to the seller via cheque.</li>
                 <li><span class="font-FourthHead">2. Plot Equity Loan –</span>₹30 Lakh provided to the buyer to cover additional costs beyond the registered value.</li>
                 </ul>`,
                    },
                    {
                      heading: `<span class="font-FourthHead">At the time of registry, both the cheques (one to the seller and one to the buyer) are disbursed. The buyer can use the Plot Equity Loan for additional payments, construction, or any other personal purpose.</span>`,
                    },
                  ],
                }}
              />
              <ButtonBanner
                contents={{
                  heading: `Can You Avail an Equity or LAP Against <br> an Already Purchased Plot?`,
                  para: `Yes! If you have already purchased a plot, you can avail a Loan Against Property (LAP) or Plot Equity Loan up to 50% of the current market value, provided you are eligible for that loan amount.`,
                  btnName: `Explore how`,
                  btnBorder: `#4F4C4D`,
                  btnLink: "/lap",
                }}
              />

              <div
                class="py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[1rem] lg:px-[4rem] w-full border-b border-borderColor"
              >
                <div class="">
                  <h2
                    class="grid mb-[4rem] font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont text-center"
                  >
                    Comparison of Different Plot Loan Types
                  </h2>
                </div>
                <div class="">
                  {#each loanTable as tableData}
                    <PaymentTable {tableData} />
                  {/each}
                </div>
              </div>
            </div>
          {:else if index == 1}
            <div id="benefits" class="bg-white text-black">
              <TwoColumnWithLeftHeading
                contents={{
                  heading: `Key benefits`,
                  list: [
                    {
                      heading: `<span class="font-FourthHead">Higher Loan Amount –</span>`,
                      desc: `Combines a plot purchase loan with an equity component, increasing overall funding.`,
                    },
                    {
                      heading: `<span class="font-FourthHead">Covers Additional Costs –</span>`,
                      desc: `Helps manage extra expenses like seller’s premium, registration charges, or initial construction costs.`,
                    },
                    {
                      heading: `<span class="font-FourthHead">Flexible Usage –</span>`,
                      desc: `The equity portion can be used for any financial needs, such as home construction, renovation, or personal expenses.`,
                    },
                    {
                      heading: `<span class="font-FourthHead">Improved Loan Eligibility –</span>`,
                      desc: `Combining both components may improve eligibility and approval chances.`,
                    },
                    {
                      heading: `<span class="font-FourthHead">Leverages Property Value –</span>`,
                      desc: `Unlocks the potential of the plot’s market value for financial support.`,
                    },
                  ],
                }}
              />

              <div id="bt">
                <TwoColumnWithLeftHeading
                  contents={{
                    heading: `Why Balance Transfer is Not Allowed for Plot + Equity Loans?`,
                    list: [
                      {
                        heading: `No Balance Transfer for Plot + Equity Loans –`,
                        desc: `Plot + Equity Loans are generally not eligible for balance transfer, as lenders prefer refinancing loans backed by constructed properties. Since the equity portion is unsecured or linked to the plot’s value rather than a completed asset, banks perceive a higher risk, limiting transfer options. However, an alternative approach can help improve loan terms.`,
                      },
                      {
                        heading: `Balance Transfer Denied? Consider Loan Restructuring! –`,
                        desc: `If your Plot + Equity Loan cannot be transferred, restructuring may be a solution. Converting it into a Plot + Construction Loan can increase eligibility for refinancing, as lenders are more willing to transfer loans tied to an ongoing or completed construction project.`,
                      },
                    ],
                  }}
                />
              </div>
              <ThreeColumWithLeftHeading
                contents={{
                  heading: "Own your dream plot with ease",
                  cardData: [
                    {
                      title: "Compare Top Plot + Equity Loan Offers",
                      para: "Compare the best Plot + Equity Loan options based on interest rates, loan amounts, and terms. Find the most suitable lender to maximize benefits.",
                      btnName: "Compare offers",
                      btnLink: "/get-started/how-can-we-help",
                      btnColor: "#ffcc00",
                      btnClick: () => {
                        ($applicationData.LoanName = "Plot Loan"),
                          ($applicationData.LoanType = "Plot + Equity Loan");
                      },
                    },
                    {
                      title: "Still confused in plot + equity",
                      para: "If you're unsure about how a Plot + Equity Loan works and whether it suits your needs, schedule an appointment with our experts.",
                      btnName: "Book an appointment",
                      btnLink: "/appointment",
                      btnBorder: "#4F4C4D",
                    },
                  ],
                }}
              />
            </div>
          {:else if index == 2}
            <div id="plotEquity" class="bg-white text-black">
              <div
                class="py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-borderColor"
              >
                <div class="">
                  <h2
                    class="grid mb-[4rem] font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont text-center"
                  >
                    Plot + Equity Loan vs. Only Plot Equity Loan
                  </h2>
                </div>
                <div class="">
                  {#each consTable as tableData}
                    <PaymentTable {tableData} />
                  {/each}
                </div>
              </div>
            </div>
          {:else if index == 3}
            <div id="help" class="bg-white text-black">
              <TwoColumnWithImage
                contents={{
                  cardImage: "/images/housing.jpg",
                  cardAltName: "housing-figure",
                  cardHeading: "How we Help",
                  reverse: true,
                }}
              >
                <div class="font-Paragraph text-minParaFont">
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
