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
  import ButtonBanner from "./ButtonBanner.svelte";
  import { applicationData } from "$lib/stores/stores";
  import AboveTitleWithBlackCard from "./AboveTitleWithBlackCard.svelte";
  import AboveTitleWithTopIconCard from "./AboveTitleWithTopIconCard.svelte";
  import AboveTitleWithoutIconCard from "./AboveTitleWithoutIconCard.svelte";
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
</script>

<Seo
  type="WebPage"
  title="Plot + Construction Loan: Buy Land & Build Your Home Easily"
  image= "/images/plot-and-construction-blog.jpg"
  description="Get a single loan for land purchase & home construction. Enjoy lower rates, easy approvals & tax benefits. Compare lenders & apply now!"
  keywords="Plot + Construction Loan Buy Land & Build Home Loan, Land Purchase & Home Loan, Home Construction Loan, Plot Loan with Construction, Loan for Buying Land & House, Plot Loan Interest Rates, Land & House Loan Eligibility, Best Loan for Home Construction, Loan for Plot and Home Building"
/>

<section>
  <NewPageLayout
    pageData={{
      coverImage: "/images/plot-and-construction-blog.jpg",
      coverAlt: "hero-cover",
      classStyle: "object-cover xl:h-[90svh] 3xl:max-h-[60svh]",
      heading: "Buy Land, Build Home with one smart loan",
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
                ($applicationData.LoanName = "Plot Loan"),
                  ($applicationData.LoanType = "Plot + Construction Loan");
              },
            },
          ],
      para: `Get financing for both buying a plot and constructing your home in a single loan. Enjoy lower interest rates, and hassle-free approvals to build your dream home with ease!`,
    }}
  >
    <!-- for desktop -->
    <div class="hidden lg:block">
      <StickyNavbar
        navList={{
          items: [
            {
              name: "Guide & benefits",
              targetId: `guide`,
            },
            {
              name: "Eligibility & loan structure",
              targetId: `eligibility`,
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
              btnName: "Compare rates",
              btnLink: "/get-started/how-can-we-help",
              btnColor: "#ffcc00",
              btnClick: () => {
                ($applicationData.LoanName = "Plot Loan"),
                  ($applicationData.LoanType = "Plot + Construction Loan");
              },
            },
          ],
        }}
        {activeSection}
      />
      <div id="guide" data-section="guide" class="section">
        <ThreeColumWithLeftHeading
          contents={{
            heading:
              "Guide to <br> <span class='underline decoration-4 underline-offset-4 decoration-btnBg'>Plot + Construction</span> loan",
            cardData: [
              {
                title: "Loan Sanction & Approval",
                para: `The lender evaluates your income, credit score, and property documents to approve the loan amount, covering both the land purchase and construction costs.`,
              },
              {
                title: "Plot Purchase Disbursement",
                para: `Once approved, the loan amount for buying the plot is disbursed first. The land must meet legal and location criteria set by the lender.`,
              },
              {
                title: "Construction Fund Release",
                para: `The construction loan is disbursed in stages based on project progress, such as foundation, walls, roofing, and final completion, ensuring proper fund utilization.`,
              },
              {
                title: "Repayment & EMI Structure",
                para: `Initially, you may pay interest-only EMIs during construction. Once completed, full EMIs (principal + interest) start, just like a regular home loan.`,
              },
            ],
          }}
        />

        <TwoColumnWithLeftHeading
          contents={{
            heading: `Plot & Construction Loan: <br> <span class="underline decoration-4 underline-offset-4 decoration-btnBg">Key Advantages</span>`,

            list: [
              {
                heading: `Lower Interest Rates –`,
                desc: `Compared to taking separate loans for land and construction, a combined loan usually offers a lower interest rate, making it more affordable.`,
              },
              {
                heading: `Easier Loan Management –`,
                desc: `Since it's a single loan, you don’t have to manage multiple EMIs, paperwork, or lenders. It simplifies the repayment process.`,
              },
              {
                heading: `Stepwise Fund Disbursement –`,
                desc: `The loan is disbursed in phases—first for the plot purchase, then for construction in stages. This ensures efficient fund usage and reduces interest burden initially.`,
              },
              {
                heading: `Tax Benefits –`,
                desc: `You can claim tax deductions on both principal repayment (Section 80C) and interest paid (Section 24B) after the construction is completed.`,
              },
              {
                heading: `Higher Loan Amount Eligibility –`,
                desc: `Lenders may offer a higher loan amount compared to standalone land loans, as the construction aspect makes it a secured asset.`,
              },
              {
                heading: `Longer Repayment Tenure –`,
                desc: `Unlike standalone land loans (which often have shorter tenure), this loan offers repayment terms similar to home loans, going up to 30 years, making EMIs more manageable.`,
              },
              {
                heading: `Better Approval Chances –`,
                desc: `Lenders prefer plot + construction loans over plot-only loans, as they ensure the land is utilized for home construction, reducing risks for the bank.`,
              },
            ],
          }}
        />
      </div>

      <div id="eligibility" data-section="eligibility" class="section">
        <AboveTitleWithTopIconCard
          contents={{
            heading: `Know Your Loan Eligibility`,
            xlGridCol: 3,
            borderBottom: true,
            list: [
              {
                heading: "Eligibility Criteria",
                icon: "/icons/checklist.svg",
                altName: "check Icon",
                desc: [
                  `<span class="font-FourthHead">Age:</span> 21 to 65 years (varies by lender).`,
                  `<span class="font-FourthHead">Employment Type:</span> Salaried, self-employed, or business owners.`,
                  `<span class="font-FourthHead">Income Stability:</span> Regular income with proof of salary slips or ITRs.`,
                  `<span class="font-FourthHead">Credit Score:</span> Minimum 700+ for easy approval.`,
                  `<span class="font-FourthHead">Land Criteria:</span> The plot must be non-agricultural and approved by local authorities.`,
                ],
              },
              {
                heading: "Affordability Criteria",
                icon: "/icons/accessEnergy.svg",
                altName: "thunder Icon",
                desc: [
                  `<span class="font-FourthHead">Loan-to-Value (LTV) Ratio:</span> Up to 80-85% of the plot + construction cost.`,
                  `<span class="font-FourthHead">EMI-to-Income Ratio:</span> Ideally 50-60% of monthly income.`,
                  `<span class="font-FourthHead">Down Payment:</span> Minimum 15-20% of the total cost.`,
                  `<span class="font-FourthHead">Interest Rates:</span> Typically between 8% - 12% (varies by lender and credit profile).`,
                ],
              },
              {
                heading: "Credibility Criteria",
                icon: "/icons/personalLoan.svg",
                altName: "money-bag Icon",
                desc: [
                  `<span class="font-FourthHead">Creditworthiness:</span> Good financial history with no loan defaults.`,
                  `<span class="font-FourthHead">Employment Stability:</span> Salaried individuals should have at least 2 years of job experience(<a href="/appointment">below this contact us</a>), self-employed applicants need 3+ years of business continuity.`,
                  `<span class="font-FourthHead">Property Verification:</span> The lender ensures legal clearance and approval from local development authorities.`,
                ],
              },
            ],
          }}
        />

        <AboveTitleWithoutIconCard
          contents={{
            heading: `Disbursement steps of <br> Plot + Construction Loan`,
            xlGridCol: 3,
            borderBottom: true,
            list: [
              {
                heading: "1. Construction Loan Approval",
                desc: [
                  `<span class="font-FourthHead">Approved building plan</span> from local authorities must submit`,
                  `<span class="font-FourthHead">Construction cost estimate</span> verified by an engineer/architect must submit`,
                  `<span class="font-FourthHead">Builder agreement</span> or self-construction plan must submit`,
                  `Most lenders require construction to <span class="font-FourthHead">start within 1-2 years</span> of plot purchase.`,
                ],
              },
              {
                heading: "2. Plot Purchase Disbursement",
                desc: [
                  `The first installment covers the cost of the <span class="font-FourthHead">land purchase</span>.`,
                  `The lender transfers this amount directly to the <span class="font-FourthHead">seller</span> or <span class="font-FourthHead">landowner</span> after verifying legal approvals.`,
                  `The borrower may need to make a <span class="font-FourthHead">down payment (typically 15-20%)</span>.`,
                ],
              },
              {
                heading: "3. Stage-Wise Construction Fund Release​",
                desc: [
                  `<span class="font-FourthHead">Foundation & Plinth Work –</span> First payout after site preparation`,
                  `<span class="font-FourthHead">Walls & Structure Completion –</span> Second payout after walls are raised`,
                  `<span class="font-FourthHead">Roofing & Flooring –</span> Third payout when structural work is nearing completion`,
                  `<span class="font-FourthHead">Final Completion –</span> Last payout after finishing work is done`,
                  `Each stage is verified by the lender through <span class="font-FourthHead">site inspections</span>.`,
                ],
              },
              {
                heading: "4. EMI & Repayment Process",
                desc: [
                  `<span class="font-FourthHead">Pre-EMI (Interest-Only Payments) –</span> Until construction is completed, the borrower may only need to pay interest on the amount disbursed.`,
                  `<span class="font-FourthHead">Full EMI Starts –</span> Once construction is complete, full <span class="font-FourthHead">principal + interest</span> payments begin, just like a regular home loan.`,
                ],
              },
            ],
          }}
        />

        <div id="bt">
          <TwoColumnWithLeftHeading
            contents={{
              heading: `Balance Transfer for Plot + Construction Loan`,
              list: [
                {
                  heading: `<span class="font-FourthHead">Eligibility for Balance Transfer–</span>`,
                  desc: `Good repayment history on the current loan.
                      <br>
                      Credit score 750+ for better rates.
                      <br>
                      Construction progress proof required.
                      <br>
                      Stable income proof (salaried/self-employed).
                      <br>
                      Legally clear property with no disputes.
                      `,
                },
                {
                  heading: `<span class="font-FourthHead">Benefits of Balance Transfer–</span>`,
                  desc: `Lower Interest Rates
                      <br>
                      Extended Loan Tenure
                      <br>
                      Top-Up Loan Option
                      <br>
                      Flexible Repayment Plans
                      `,
                },
                {
                  heading: `<span class="font-FourthHead">Steps to Transfer a Construction Loan–</span>`,
                  desc: `<span class="font-FourthHead">Compare Lenders –</span> Check interest rates, fees, and repayment terms.
                      <br>
                      <span class="font-FourthHead">Apply for Balance Transfer –</span> Submit required documents (loan statement, income proof, property papers).
                      <br>
                      <span class="font-FourthHead">Loan Approval & Processing –</span> The new lender will assess eligibility and approve the transfer.
                      <br>
                      <span class="font-FourthHead">Foreclosure of Existing Loan –</span> Your current lender will close the loan, and the new lender will take over.
                      <br>
                      <span class="font-FourthHead">New Loan Agreement –</span> You start repayment with the new lender under better terms.
                      `,
                },
              ],
            }}
          />
          <div
            class="py-[4rem] w-full border-b border-borderColor px-[0.5rem] lg:px-[4rem]"
          >
            <div
              class="flex flex-col justify-center items-center gap-[4rem] w-full lg:w-auto"
            >
              <h2
                class="font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont text-center"
              >
                Top-Up Loan in Plot+Construction
              </h2>
              <p
                class="font-Paragraph text-subParaFont text-center lg:w-8/12 lg:justify-self-end"
              >
                A top-up loan in a Plot + Construction Loan is strictly meant
                for construction-related expenses and cannot be used to buy more
                land. Lenders provide this additional funding only to cover
                extra construction costs, interior work, or unforeseen building
                expenses.
              </p>
            </div>
          </div>
        </div>

        <ThreeColumWithLeftHeading
          contents={{
            heading: "Secure the Best Loan, Build Stress-Free",
            cardData: [
              {
                title: "Secure, Build & Transfer with Ease",
                para: "Explore competitive interest rates on Plot + Construction Loans and Balance Transfers. Find the best financing options with flexible terms, lower EMIs, and expert support to make your home-building journey smooth and affordable.",
                btnName: "Get the Best Offer Now",
                btnLink: "/get-started/how-can-we-help",
                btnColor: "#ffcc00",
                btnClick: () => {
                  ($applicationData.LoanName = "Plot Loan"),
                    ($applicationData.LoanType = "Plot + Construction Loan");
                },
              },
              {
                title: "Schedule Your Loan Consultation",
                para: "Get funding for both land purchase and home construction with competitive interest rates and flexible repayment options. Compare lenders, explore customized loan solutions, and build your dream home with ease.",
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
        <!-- plot loan calc -->
        <AboveTitleWithBlackCard
          contents={{
            heading: "Plot + Construction loan calculator",
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
      {#each ["Guide & benefits", "Eligibility & loan structure", "How Digital DSA helps", "Tools & calculators"] as list, index}
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
            <div id="guide" class="bg-white text-black">
              <ThreeColumWithLeftHeading
                contents={{
                  heading:
                    "Guide to <span class='underline decoration-4 underline-offset-4 decoration-btnBg'>Plot + Construction</span> loan",
                  cardData: [
                    {
                      title: "Loan Sanction & Approval",
                      para: `The lender evaluates your income, credit score, and property documents to approve the loan amount, covering both the land purchase and construction costs.`,
                    },
                    {
                      title: "Plot Purchase Disbursement",
                      para: `Once approved, the loan amount for buying the plot is disbursed first. The land must meet legal and location criteria set by the lender.`,
                    },
                    {
                      title: "Construction Fund Release",
                      para: `The construction loan is disbursed in stages based on project progress, such as foundation, walls, roofing, and final completion, ensuring proper fund utilization.`,
                    },
                    {
                      title: "Repayment & EMI Structure",
                      para: `Initially, you may pay interest-only EMIs during construction. Once completed, full EMIs (principal + interest) start, just like a regular home loan.`,
                    },
                  ],
                }}
              />

              <TwoColumnWithLeftHeading
                contents={{
                  heading: `Plot & Construction Loan: <br> <span class="underline decoration-4 underline-offset-4 decoration-btnBg">Key Advantages</span>`,

                  list: [
                    {
                      heading: `Lower Interest Rates –`,
                      desc: `Compared to taking separate loans for land and construction, a combined loan usually offers a lower interest rate, making it more affordable.`,
                    },
                    {
                      heading: `Easier Loan Management –`,
                      desc: `Since it's a single loan, you don’t have to manage multiple EMIs, paperwork, or lenders. It simplifies the repayment process.`,
                    },
                    {
                      heading: `Stepwise Fund Disbursement –`,
                      desc: `The loan is disbursed in phases—first for the plot purchase, then for construction in stages. This ensures efficient fund usage and reduces interest burden initially.`,
                    },
                    {
                      heading: `Tax Benefits –`,
                      desc: `You can claim tax deductions on both principal repayment (Section 80C) and interest paid (Section 24B) after the construction is completed.`,
                    },
                    {
                      heading: `Higher Loan Amount Eligibility –`,
                      desc: `Lenders may offer a higher loan amount compared to standalone land loans, as the construction aspect makes it a secured asset.`,
                    },
                    {
                      heading: `Longer Repayment Tenure –`,
                      desc: `Unlike standalone land loans (which often have shorter tenure), this loan offers repayment terms similar to home loans, going up to 30 years, making EMIs more manageable.`,
                    },
                    {
                      heading: `Better Approval Chances –`,
                      desc: `Lenders prefer plot + construction loans over plot-only loans, as they ensure the land is utilized for home construction, reducing risks for the bank.`,
                    },
                  ],
                }}
              />
            </div>
          {:else if index == 1}
            <div id="eligibility" class="bg-white text-black">
              <AboveTitleWithTopIconCard
                contents={{
                  heading: `Know Your Loan Eligibility`,
                  xlGridCol: 3,
                  borderBottom: true,
                  list: [
                    {
                      heading: "Eligibility Criteria",
                      icon: "/icons/checklist.svg",
                      altName: "check Icon",
                      desc: [
                        `<span class="font-FourthHead">Age:</span> 21 to 65 years (varies by lender).`,
                        `<span class="font-FourthHead">Employment Type:</span> Salaried, self-employed, or business owners.`,
                        `<span class="font-FourthHead">Income Stability:</span> Regular income with proof of salary slips or ITRs.`,
                        `<span class="font-FourthHead">CredCeba init Score:</span> Minimum 700+ for easy approval.`,
                        `<span class="font-FourthHead">Land Criteria:</span> The plot must be non-agricultural and approved by local authorities.`,
                      ],
                    },
                    {
                      heading: "Affordability Criteria",
                      icon: "/icons/accessEnergy.svg",
                      altName: "thunder Icon",
                      desc: [
                        `<span class="font-FourthHead">Loan-to-Value (LTV) Ratio:</span> Up to 80-85% of the plot + construction cost.`,
                        `<span class="font-FourthHead">EMI-to-Income Ratio:</span> Ideally 50-60% of monthly income.`,
                        `<span class="font-FourthHead">Down Payment:</span> Minimum 15-20% of the total cost.`,
                        `<span class="font-FourthHead">Interest Rates:</span> Typically between 8% - 12% (varies by lender and credit profile).`,
                      ],
                    },
                    {
                      heading: "Credibility Criteria",
                      icon: "/icons/personalLoan.svg",
                      altName: "money-bag Icon",
                      desc: [
                        `<span class="font-FourthHead">Creditworthiness:</span> Good financial history with no loan defaults.`,
                        `<span class="font-FourthHead">Employment Stability:</span> Salaried individuals should have at least 2 years of job experience(<a href="/appointment">below this contact us</a>), self-employed applicants need 3+ years of business continuity.`,
                        `<span class="font-FourthHead">Property Verification:</span> The lender ensures legal clearance and approval from local development authorities.`,
                      ],
                    },
                  ],
                }}
              />

              <AboveTitleWithoutIconCard
                contents={{
                  heading: `Disbursement steps of Plot + Construction Loan`,
                  xlGridCol: 3,
                  borderBottom: true,
                  list: [
                    {
                      heading: "1. Construction Loan Approval",
                      desc: [
                        `<span class="font-FourthHead">Approved building plan</span> from local authorities must submit`,
                        `<span class="font-FourthHead">Construction cost estimate</span> verified by an engineer/architect must submit`,
                        `<span class="font-FourthHead">Builder agreement</span> or self-construction plan must submit`,
                        `Most lenders require construction to <span class="font-FourthHead">start within 1-2 years</span> of plot purchase.`,
                      ],
                    },
                    {
                      heading: "2. Plot Purchase Disbursement",
                      desc: [
                        `The first installment covers the cost of the <span class="font-FourthHead">land purchase</span>.`,
                        `The lender transfers this amount directly to the <span class="font-FourthHead">seller</span> or <span class="font-FourthHead">landowner</span> after verifying legal approvals.`,
                        `The borrower may need to make a <span class="font-FourthHead">down payment (typically 15-20%)</span>.`,
                      ],
                    },
                    {
                      heading: "3. Stage-Wise Construction Fund Release​",
                      desc: [
                        `<span class="font-FourthHead">Foundation & Plinth Work –</span> First payout after site preparation`,
                        `<span class="font-FourthHead">Walls & Structure Completion –</span> Second payout after walls are raised`,
                        `<span class="font-FourthHead">Roofing & Flooring –</span> Third payout when structural work is nearing completion`,
                        `<span class="font-FourthHead">Final Completion –</span> Last payout after finishing work is done`,
                        `Each stage is verified by the lender through <span class="font-FourthHead">site inspections</span>.`,
                      ],
                    },
                    {
                      heading: "4. EMI & Repayment Process",
                      desc: [
                        `<span class="font-FourthHead">Pre-EMI (Interest-Only Payments) –</span> Until construction is completed, the borrower may only need to pay interest on the amount disbursed.`,
                        `<span class="font-FourthHead">Full EMI Starts –</span> Once construction is complete, full <span class="font-FourthHead">principal + interest</span> payments begin, just like a regular home loan.`,
                      ],
                    },
                  ],
                }}
              />

              <div id="bt">
                <TwoColumnWithLeftHeading
                  contents={{
                    heading: `Balance Transfer for Plot + Construction Loan`,
                    list: [
                      {
                        heading: `<span class="font-FourthHead">Eligibility for Balance Transfer–</span>`,
                        desc: `Good repayment history on the current loan.
                      <br>
                      Credit score 750+ for better rates.
                      <br>
                      Construction progress proof required.
                      <br>
                      Stable income proof (salaried/self-employed).
                      <br>
                      Legally clear property with no disputes.
                      `,
                      },
                      {
                        heading: `<span class="font-FourthHead">Benefits of Balance Transfer–</span>`,
                        desc: `Lower Interest Rates
                      <br>
                      Extended Loan Tenure
                      <br>
                      Top-Up Loan Option
                      <br>
                      Flexible Repayment Plans
                      `,
                      },
                      {
                        heading: `<span class="font-FourthHead">Steps to Transfer a Construction Loan–</span>`,
                        desc: `<span class="font-FourthHead">Compare Lenders –</span> Check interest rates, fees, and repayment terms.
                      <br>
                      <span class="font-FourthHead">Apply for Balance Transfer –</span> Submit required documents (loan statement, income proof, property papers).
                      <br>
                      <span class="font-FourthHead">Loan Approval & Processing –</span> The new lender will assess eligibility and approve the transfer.
                      <br>
                      <span class="font-FourthHead">Foreclosure of Existing Loan –</span> Your current lender will close the loan, and the new lender will take over.
                      <br>
                      <span class="font-FourthHead">New Loan Agreement –</span> You start repayment with the new lender under better terms.
                      `,
                      },
                    ],
                  }}
                />
                <div
                  class="py-[4rem] w-full border-b border-borderColor px-[0.5rem] lg:px-[4rem]"
                >
                  <div
                    class="flex flex-col justify-center items-center gap-[4rem] w-full lg:w-auto"
                  >
                    <h2
                      class="font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont text-center"
                    >
                      Top-Up Loan in Plot+Construction
                    </h2>
                    <p
                      class="font-Paragraph text-subParaFont text-center lg:w-8/12 lg:justify-self-end"
                    >
                      A top-up loan in a Plot + Construction Loan is strictly
                      meant for construction-related expenses and cannot be used
                      to buy more land. Lenders provide this additional funding
                      only to cover extra construction costs, interior work, or
                      unforeseen building expenses.
                    </p>
                  </div>
                </div>
              </div>

              <ThreeColumWithLeftHeading
                contents={{
                  heading: "Secure the Best Loan, Build Stress-Free",
                  cardData: [
                    {
                      title: "Secure, Build & Transfer with Ease",
                      para: "Explore competitive interest rates on Plot + Construction Loans and Balance Transfers. Find the best financing options with flexible terms, lower EMIs, and expert support to make your home-building journey smooth and affordable.",
                      btnName: "Get the Best Offer Now",
                      btnLink: "/get-started/how-can-we-help",
                      btnColor: "#ffcc00",
                      btnClick: () => {
                        ($applicationData.LoanName = "Plot Loan"),
                          ($applicationData.LoanType =
                            "Plot + Construction Loan");
                      },
                    },
                    {
                      title: "Schedule Your Loan Consultation",
                      para: "Get funding for both land purchase and home construction with competitive interest rates and flexible repayment options. Compare lenders, explore customized loan solutions, and build your dream home with ease.",
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
                  heading: "Plot + Construction loan calculator",
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
                      url: "/calculators/emi-calculator",
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
