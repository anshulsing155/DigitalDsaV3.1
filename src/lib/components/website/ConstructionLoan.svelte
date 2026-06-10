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

  let activeSection = $state('');

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
  title="Low-Interest Construction Loan – Build Your Dream Home"
  image= "/images/construction-loan-blog.jpg"
  description="Get a low-interest construction loan with phased disbursement, tax benefits & flexible repayment. Compare offers & secure the best deal today!"
  keywords="Construction loan, Home construction loan, Low-interest construction loan, Build your dream home, Construction loan eligibility, Construction loan process, Construction loan calculator, Balance transfer for construction loan, Top-up loan on construction loan, Best construction loan offers, Home loan for construction, Loan for house construction, Construction loan interest rates"
/>
<section>
  <NewPageLayout
    pageData={{
      coverImage: "/images/construction-loan-blog.jpg",
      coverAlt: "hero-cover",
      classStyle: "object-cover xl:h-[90svh] 3xl:max-h-[60svh]",
      heading: "Construction loan: Build your dream property",
      actionBtns: [
            {
              btnName: "Book appointment",
              btnLink: "/appointment",
            },
            {
              btnName: "get best offers",
              btnLink: "/get-started/how-can-we-help",
              btnColor: "#ffcc00",
              btnClick: () => {
                ($applicationData.LoanName = "Plot Loan"),
                  ($applicationData.LoanType = "Plot Loan Only");
              },
            },
          ],
      para: `Build your dream home with a low-interest construction loan. Get funds in stages, pay interest only on what’s used, and enjoy flexible repayment options.`,
    }}
  >
    <!-- for desktop -->
    <div class="hidden lg:block">
      <StickyNavbar
        navList={{
          items: [
            {
              name: "Loan features",
              targetId: `features`,
            },
            {
              name: "Key benefits",
              targetId: `benefits`,
            },
            {
              name: "Know your eligibility",
              targetId: `eligibility`,
            },
            {
              name: "Step-by-step guide",
              targetId: `steps`,
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
              btnName: "get best offers",
              btnLink: "/get-started/how-can-we-help",
              btnColor: "#ffcc00",
              btnClick: () => {
                ($applicationData.LoanName = "Plot Loan"),
                  ($applicationData.LoanType = "Plot Loan Only");
              },
            },
          ],
        }}
        {activeSection}
      />

      <div id="features" data-section="features" class="section">
        <TwoColumnWithLeftHeading
          contents={{
            heading: `Loan features`,
            list: [
              {
                heading: `<span class="font-semibold">Loan Disbursement in Phases–</span>`,
                desc: `The bank releases funds after verifying the completion of specific construction. `,
              },

              {
                heading: `<span class="font-semibold">Loan Tenure–</span>`,
                desc: `Typically, 10 to 30 years, depending on the bank and your profile.`,
              },
              {
                heading: `<span class="font-semibold">Loan-to-Value (LTV) Ratio–</span>`,
                desc: `Banks finance 75% to 90% of construction costs while borrowers fund the rest. LTV is based on construction cost not land value.`,
              },
              {
                heading: `<span class="font-semibold">Property as Collateral–</span>`,
                desc: `The land and the under-construction property are typically mortgaged until repayment.`,
              },
              {
                heading: `<span class="font-semibold">Monitoring & Inspections–</span>`,
                desc: `Banks conduct regular site inspections to verify construction progress before disbursing the next installment.`,
              },
              {
                heading: `<span class="font-semibold">Tax Benefits–</span>`,
                desc: `Similar to home loans, tax benefits are available under Section 80C (principal repayment) and Section 24(b) (interest paid), but only after construction is complete.`,
              },
            ],
          }}
        />
      </div>

      <div id="benefits" data-section="benefits" class="section">
        <TwoColumnWithLeftHeading
          contents={{
            heading: `Key benefits`,
            list: [
              {
                heading: `<span class="font-semibold">Custom-Built Home–</span>`,
                desc: `Enables you to build your <span class="underline decoration-[1.5px] underline-offset-4 decoration-btnBg">dream home</span> according to your preferences rather than buying a pre-built property.`,
              },
              {
                heading: `<span class="font-semibold">Preserve Your Savings–</span>`,
                desc: `You don’t have to exhaust your savings instead, you can use loan funds for smooth cash flow management.`,
              },
              {
                heading: `<span class="font-semibold">Higher Loan Amount–</span>`,
                desc: `Compared to personal loans, construction loans offer higher funding based on project cost and your eligibility.`,
              },
              {
                heading: `<span class="font-semibold">Flexible Repayment Options–</span>`,
                desc: `During construction, banks may require only Pre-EMI (interest). Full EMI starts after full disbursement or project completion.`,
              },
              {
                heading: `<span class="font-semibold">Unlock the value–</span>`,
                desc: `Once the house is complete, you will be eligible for a top-up loan for further expenses (like expansion of business, medical emergencies, higher education, weddings, foreign travel etc).`,
              },
            ],
          }}
        />
      </div>

      <div id="eligibility" data-section="eligibility" class="section">
        <ButtonBanner
          contents={{
            heading: `Will your loan get approved?`,
            para: `Understanding your eligibility today can help you secure better loan terms and reduce repayment burdens in the future.`,
            btnName: `Check eligibility`,
            btnBorder: `#4F4C4D`,
            btnLink: "/calculators/eligibility-calculator",
          }}
        />

        <AboveTitleWithTopIconCard
          contents={{
            heading: `Eligibility criteria`,
            xlGridCol: 3,
            borderBottom: true,
            list: [
              {
                icon: "/icons/financialProfile.svg",
                altName: "profile-icon",
                heading: "Applicant's Financial Profile",
                desc: [
                  `<span class="font-semibold">Income Stability –</span> Banks assess salary slips or business financials.`,
                  `<span class="font-semibold">Credit Score –</span> A 700+ CIBIL score boosts approval chances.`,
                  `<span class="font-semibold">Debt-to-Income Ratio –</span> Lower existing loans for better eligibility.`,
                ],
                para: `<span class="font-semibold">Tip:</span> <span class="underline decoration-[1.5px] underline-offset-4 decoration-btnBg">Maintain good credit history & reduce debts before applying.</span>`,
              },
              {
                icon: "/icons/personalLoan.svg",
                altName: "money-pouch-icon",
                heading: "Property & Loan-to-Value (LTV) Ratio",
                desc: [
                  `<span class="font-semibold">Land Ownership –</span> Must own the plot or have a valid sale agreement.`,
                  `<span class="font-semibold">LTV Ratio –</span> Banks fund up to 80%, requiring a 20% down payment.`,
                  `<span class="font-semibold">Location & Approval –</span> Plot must be in a lender-approved area with all permits.`,
                ],
                para: `<span class="font-semibold">Tip:</span> <span class="underline decoration-[1.5px] underline-offset-4 decoration-btnBg">Ensure clear land titles & approvals to avoid loan rejection.</span>`,
              },
              {
                icon: "/icons/apply-pen.svg",
                altName: "document-icon",
                heading: "Documentation & Legal Compliance",
                desc: [
                  `<span class="font-semibold">KYC Documents –</span> PAN, Aadhaar, and address proof.`,
                  `<span class="font-semibold">Income Proof –</span> Salary slips & ITRs (salaried) / Business financials (self-employed).`,
                  `<span class="font-semibold">Construction Plan & Cost Estimate –</span> Architect-certified plan & cost estimate.`,
                ],
                para: `<span class="font-semibold">Tip:</span> <span class="underline decoration-[1.5px] underline-offset-4 decoration-btnBg">Keep all documents updated for faster approval.</span>`,
              },
            ],
          }}
        />

        <div id="bt">
          <TwoColumnWithLeftHeading
            contents={{
              heading: `Balance Transfer of Construction-Only Loan`,
              list: [
                {
                  heading: `<span class="font-semibold">Eligibility for Balance Transfer–</span>`,
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
                  heading: `<span class="font-semibold">Benefits of Balance Transfer–</span>`,
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
                  heading: `<span class="font-semibold">Steps to Transfer a Construction Loan–</span>`,
                  desc: `<span class="font-semibold">Compare Lenders –</span> Check interest rates, fees, and repayment terms.
                      <br>
                      <span class="font-semibold">Apply for Balance Transfer –</span> Submit required documents (loan statement, income proof, property papers).
                      <br>
                      <span class="font-semibold">Loan Approval & Processing –</span> The new lender will assess eligibility and approve the transfer.
                      <br>
                      <span class="font-semibold">Foreclosure of Existing Loan –</span> Your current lender will close the loan, and the new lender will take over.
                      <br>
                      <span class="font-semibold">New Loan Agreement –</span> You start repayment with the new lender under better terms.
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
                class="typography-h2 text-text-main text-center"
              >
                Top-Up Loan in Construction
              </h2>
              <p
                class="typography-body-md text-text-light text-center lg:w-8/12 lg:justify-self-end"
              >
                A top-up loan is extra money you can borrow on top of your
                existing construction loan. It helps cover additional costs like
                construction extras, interior work, or unexpected expenses.
                These loans usually come with low interest rates but require a
                good repayment history.
              </p>
            </div>
          </div>
        </div>
        <ThreeColumWithLeftHeading
          contents={{
            heading: "Turn Your vision into reality",
            cardData: [
              {
                title: "Fund Your Construction or Refinance Smartly",
                para: "Compare interest rates and explore the latest construction loan and balance transfer offers. Get the best deal with flexible terms and expert guidance.",
                btnName: "Secure best offer",
                btnLink: "/get-started/how-can-we-help",
                btnColor: "#ffcc00",
                btnClick: () => {
                  ($applicationData.LoanName = "Plot Loan"),
                    ($applicationData.LoanType = "Construction Loan Only");
                },
              },
              {
                title: "Still confused?",
                para: "If you need expert guidance, you can book an appointment for personalized advice. Get the right solutions tailored to your financial needs with a quick consultation.",
                btnName: "Book an appointment",
                btnLink: "/appointment",
                btnBorder: "#4F4C4D",
              },
            ],
          }}
        />
      </div>

      <div id="steps" data-section="steps" class="section">
        <TwoColumnWithImage
          contents={{
            cardImage: "/images/buildingHome-cover.jpg",
            cardAltName: "housing-figure",
            cardHeading: "Step-by-step guide",
          }}
        >
          <div class="typography-body-sm text-text-light">
            <ul class="list-disc space-y-4">
              <li class="flex items-start gap-1">
                <img src="/icons/circle-check.svg" alt="circle-check-icon" class="h-4 mt-1" />
                <span>
                  <strong>Application Submission –</strong> Submit your loan application
                  online or visit the bank with necessary details like income proof,
                  property documents, and personal information.
                </span>
              </li>
              <li class="flex items-start gap-1">
                <img src="/icons/circle-check.svg" alt="circle-check-icon" class="h-4 mt-1" />
                <span>
                  <strong>Loan Approval & Sanction –</strong>The bank reviews
                  your financial profile, credit score, and property documents
                  before approving the loan amount and issuing a sanction
                  letter.
                </span>
              </li>
              <li class="flex items-start gap-1">
                <img src="/icons/circle-check.svg" alt="circle-check-icon" class="h-4 mt-1" />
                <span>
                  <strong>Disbursement in Phases – </strong> Funds are released in
                  stages based on construction milestones (e.g., foundation, walls,
                  roof) to ensure proper utilization of the loan amount.
                </span>
              </li>
              <li class="flex items-start gap-1">
                <img src="/icons/circle-check.svg" alt="circle-check-icon" class="h-4 mt-1" />
                <span>
                  <strong>Final Disbursement & Full EMI Start –</strong> Once construction
                  is completed and verified, the remaining loan amount is disbursed,
                  and full EMI payments begin.
                </span>
              </li>
            </ul>
          </div>
        </TwoColumnWithImage>
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
        <ButtonBanner
          contents={{
            heading: `Ways to pay off your construction loan faster`,
            para: `Small changes now can mean big differences later to how much of your construction loan you end up repaying.`,
            btnName: `Find out how`,
            btnBorder: `#4F4C4D`,
            btnLink: "/planners/both",
          }}
        />
      </div>
    </div>

    <!-- for mobile -->
    <div class="lg:hidden block">
      {#each ["Loan features", "Key benefits", "Know your eligibility", "Step-by-step guide", "Tools & calculators"] as list, index}
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
            <div id="features" class="bg-white text-black">
              <TwoColumnWithLeftHeading
                contents={{
                  heading: `Loan features`,
                  list: [
                    {
                      heading: `<span class="font-semibold">Loan Disbursement in Phases–</span>`,
                      desc: `The bank releases funds after verifying the completion of specific construction. `,
                    },

                    {
                      heading: `<span class="font-semibold">Loan Tenure–</span>`,
                      desc: `Typically, 10 to 30 years, depending on the bank and your profile.`,
                    },
                    {
                      heading: `<span class="font-semibold">Loan-to-Value (LTV) Ratio–</span>`,
                      desc: `Banks finance 75% to 90% of construction costs while borrowers fund the rest. LTV is based on construction cost not land value.`,
                    },
                    {
                      heading: `<span class="font-semibold">Property as Collateral–</span>`,
                      desc: `The land and the under-construction property are typically mortgaged until repayment.`,
                    },
                    {
                      heading: `<span class="font-semibold">Monitoring & Inspections–</span>`,
                      desc: `Banks conduct regular site inspections to verify construction progress before disbursing the next installment.`,
                    },
                    {
                      heading: `<span class="font-semibold">Tax Benefits–</span>`,
                      desc: `Similar to home loans, tax benefits are available under Section 80C (principal repayment) and Section 24(b) (interest paid), but only after construction is complete.`,
                    },
                  ],
                }}
              />
            </div>
          {:else if index == 1}
            <div id="benefits" class="bg-white text-black">
              <TwoColumnWithLeftHeading
                contents={{
                  heading: `Key benefits`,
                  list: [
                    {
                      heading: `<span class="font-semibold">Custom-Built Home–</span>`,
                      desc: `Enables you to build your <span class="underline decoration-[1.5px] underline-offset-4 decoration-btnBg">dream home</span> according to your preferences rather than buying a pre-built property.`,
                    },
                    {
                      heading: `<span class="font-semibold">Preserve Your Savings–</span>`,
                      desc: `You don’t have to exhaust your savings instead, you can use loan funds for smooth cash flow management.`,
                    },
                    {
                      heading: `<span class="font-semibold">Higher Loan Amount–</span>`,
                      desc: `Compared to personal loans, construction loans offer higher funding based on project cost and your eligibility.`,
                    },
                    {
                      heading: `<span class="font-semibold">Flexible Repayment Options–</span>`,
                      desc: `During construction, banks may require only Pre-EMI (interest). Full EMI starts after full disbursement or project completion.`,
                    },
                    {
                      heading: `<span class="font-semibold">Unlock the value–</span>`,
                      desc: `Once the house is complete, you will be eligible for a top-up loan for further expenses (like expansion of business, medical emergencies, higher education, weddings, foreign travel etc).`,
                    },
                  ],
                }}
              />
            </div>
          {:else if index == 2}
            <div id="eligibility" class="bg-white text-black">
              <ButtonBanner
                contents={{
                  heading: `Will your loan get approved?`,
                  para: `Understanding your eligibility today can help you secure better loan terms and reduce repayment burdens in the future.`,
                  btnName: `Check eligibility`,
                  btnBorder: `#4F4C4D`,
                  btnLink: "/calculators/eligibility-calculator",
                }}
              />

              <AboveTitleWithTopIconCard
                contents={{
                  heading: `Eligibility criteria`,
                  xlGridCol: 3,
                  borderBottom: true,
                  list: [
                    {
                      icon: "/icons/financialProfile.svg",
                      altName: "profile-icon",
                      heading: "Applicant's Financial Profile",
                      desc: [
                        `<span class="font-semibold">Income Stability –</span> Banks assess salary slips or business financials.`,
                        `<span class="font-semibold">Credit Score –</span> A 700+ CIBIL score boosts approval chances.`,
                        `<span class="font-semibold">Debt-to-Income Ratio –</span> Lower existing loans for better eligibility.`,
                      ],
                      para: `<span class="font-semibold">Tip:</span> <span class="underline decoration-[1.5px] underline-offset-4 decoration-btnBg">Maintain good credit history & reduce debts before applying.</span>`,
                    },
                    {
                      icon: "/icons/personalLoan.svg",
                      altName: "money-pouch-icon",
                      heading: "Property & Loan-to-Value (LTV) Ratio",
                      desc: [
                        `<span class="font-semibold">Land Ownership –</span> Must own the plot or have a valid sale agreement.`,
                        `<span class="font-semibold">LTV Ratio –</span> Banks fund up to 80%, requiring a 20% down payment.`,
                        `<span class="font-semibold">Location & Approval –</span> Plot must be in a lender-approved area with all permits.`,
                      ],
                      para: `<span class="font-semibold">Tip:</span> <span class="underline decoration-[1.5px] underline-offset-4 decoration-btnBg">Ensure clear land titles & approvals to avoid loan rejection.</span>`,
                    },
                    {
                      icon: "/icons/apply-pen.svg",
                      altName: "document-icon",
                      heading: "Documentation & Legal Compliance",
                      desc: [
                        `<span class="font-semibold">KYC Documents –</span> PAN, Aadhaar, and address proof.`,
                        `<span class="font-semibold">Income Proof –</span> Salary slips & ITRs (salaried) / Business financials (self-employed).`,
                        `<span class="font-semibold">Construction Plan & Cost Estimate –</span> Architect-certified plan & cost estimate.`,
                      ],
                      para: `<span class="font-semibold">Tip:</span> <span class="underline decoration-[1.5px] underline-offset-4 decoration-btnBg">Keep all documents updated for faster approval.</span>`,
                    },
                  ],
                }}
              />

              <div id="bt">
                <TwoColumnWithLeftHeading
                  contents={{
                    heading: `Balance Transfer of Construction-Only Loan`,
                    list: [
                      {
                        heading: `<span class="font-semibold">Eligibility for Balance Transfer–</span>`,
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
                        heading: `<span class="font-semibold">Benefits of Balance Transfer–</span>`,
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
                        heading: `<span class="font-semibold">Steps to Transfer a Construction Loan–</span>`,
                        desc: `<span class="font-semibold">Compare Lenders –</span> Check interest rates, fees, and repayment terms.
                      <br>
                      <span class="font-semibold">Apply for Balance Transfer –</span> Submit required documents (loan statement, income proof, property papers).
                      <br>
                      <span class="font-semibold">Loan Approval & Processing –</span> The new lender will assess eligibility and approve the transfer.
                      <br>
                      <span class="font-semibold">Foreclosure of Existing Loan –</span> Your current lender will close the loan, and the new lender will take over.
                      <br>
                      <span class="font-semibold">New Loan Agreement –</span> You start repayment with the new lender under better terms.
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
                      class="typography-h2 text-text-main text-center"
                    >
                      Top-Up Loan in Construction
                    </h2>
                    <p
                      class="typography-body-md text-text-light text-center lg:w-8/12 lg:justify-self-end"
                    >
                      A top-up loan is extra money you can borrow on top of your
                      existing construction loan. It helps cover additional
                      costs like construction extras, interior work, or
                      unexpected expenses. These loans usually come with low
                      interest rates but require a good repayment history.
                    </p>
                  </div>
                </div>
              </div>
              <ThreeColumWithLeftHeading
                contents={{
                  heading: "Turn Your vision into reality",
                  cardData: [
                    {
                      title: "Fund Your Construction or Refinance Smartly",
                      para: "Compare interest rates and explore the latest construction loan and balance transfer offers. Get the best deal with flexible terms and expert guidance.",
                      btnName: "Secure best offer",
                      btnLink: "/get-started/how-can-we-help",
                      btnColor: "#ffcc00",
                      btnClick: () => {
                        ($applicationData.LoanName = "Plot Loan"),
                          ($applicationData.LoanType =
                            "Construction Loan Only");
                      },
                    },
                    {
                      title: "Still confused?",
                      para: "If you need expert guidance, you can book an appointment for personalized advice. Get the right solutions tailored to your financial needs with a quick consultation.",
                      btnName: "Book an appointment",
                      btnLink: "/appointment",
                      btnBorder: "#4F4C4D",
                    },
                  ],
                }}
              />
            </div>
          {:else if index == 3}
            <div id="steps" class="bg-white text-black">
              <TwoColumnWithImage
                contents={{
                  cardImage: "/images/buildingHome-cover.jpg",
                  cardAltName: "housing-figure",
                  cardHeading: "Step-by-step guide",
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
                        <strong>Application Submission –</strong> Submit your loan
                        application online or visit the bank with necessary details
                        like income proof, property documents, and personal information.
                      </span>
                    </li>
                    <li class="flex items-start gap-1">
                      <img
                        src="/icons/circle-check.svg"
                        alt="circle-check-icon"
                        class="h-4 mt-1"
                      />
                      <span>
                        <strong>Loan Approval & Sanction –</strong>The bank
                        reviews your financial profile, credit score, and
                        property documents before approving the loan amount and
                        issuing a sanction letter.
                      </span>
                    </li>
                    <li class="flex items-start gap-1">
                      <img
                        src="/icons/circle-check.svg"
                        alt="circle-check-icon"
                        class="h-4 mt-1"
                      />
                      <span>
                        <strong>Disbursement in Phases – </strong> Funds are released
                        in stages based on construction milestones (e.g., foundation,
                        walls, roof) to ensure proper utilization of the loan amount.
                      </span>
                    </li>
                    <li class="flex items-start gap-1">
                      <img
                        src="/icons/circle-check.svg"
                        alt="circle-check-icon"
                        class="h-4 mt-1"
                      />
                      <span>
                        <strong>Final Disbursement & Full EMI Start –</strong> Once
                        construction is completed and verified, the remaining loan
                        amount is disbursed, and full EMI payments begin.
                      </span>
                    </li>
                  </ul>
                </div>
              </TwoColumnWithImage>
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
              <ButtonBanner
                contents={{
                  heading: `Ways to pay off your construction loan faster`,
                  para: `Small changes now can mean big differences later to how much of your construction loan you end up repaying.`,
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
