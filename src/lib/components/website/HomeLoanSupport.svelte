<script>
	let {
		pageData = {
    coverImage: "/images/bridgingFinance-cover.jpg",
    coverAlt: "hero-cover",
    classStyle: "object-cover xl:h-[60svh] 3xl:max-h-[60svh]",
    heading: "Make Your Home Loan Journey Simple",
    para: `Need guidance on your home loan? Our expert team is here to assist with loan approvals, refinancing, balance transfers, and legal queries. Get personalized support and make informed decisions with ease.`,
    actionBtns: [
      {
        btnName: "Book appointment",
        btnLink: "/appointment",
      },
      {
        btnName: "Compare rates",
        btnLink: "/get-started/how-can-we-help",
        btnColor: "#ffcc00",
        animation: true,
        btnClick: () => {
          $applicationData.LoanName = "Home Loan";
        },
      },
    ],
  }
	} = $props();


  import ThingsYouShould from "$lib/components/website/ThingsYouShould.svelte";
  import Button from "$lib/components/website/Button.svelte";
  import StickyNavbar from "$lib/components/website/StickyNavbar.svelte";
  import { onMount } from "svelte";
  import NewPageLayout from "./NewPageLayout.svelte";
  import { applicationData } from "$lib/stores/stores";
  import TwoColumnWithLeftHeading from "./TwoColumnWithLeftHeading.svelte";
  import AboveTitleWithoutIconCard from "./AboveTitleWithoutIconCard.svelte";
  import TwoColumnWithImage from "./TwoColumnWithImage.svelte";
  import ButtonBanner from "./ButtonBanner.svelte";
  import AboveTitleWithBlackCard from "./AboveTitleWithBlackCard.svelte";
  import FeedbackCheck from "./FeedbackCheck.svelte";
  import HelpList from "./HelpList.svelte";
  import Seo from "./Seo.svelte";

  let navBarMedium = [
    "Loan types",
    "Why choose us",
    "Challenges",
    "Essential steps",
    "Tools & calculator",
  ];

  let activeSection = $state("");

  // This function sets the first section as active on initial load
  const initializeActiveSection = () => {
    const firstSection = document.querySelector("[data-section]");
    if (firstSection) {
activeSection = firstSection.id;
    }
  };

  // Handle scroll event to dynamically update the active section
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

;
</script>

<Seo
  type="WebPage"
  title="Simple & Smart Home Loan Solutions | Compare & Apply Today"
  description="Get expert home loan guidance, compare rates, check eligibility & apply easily. Secure the best deal with quick approvals & 100% transparency."
  image={pageData.coverImage}
  keywords="Home loan, Home loan eligibility, Best home loan rates, Home loan approval, Compare home loans, Home loan refinancing, Balance transfer loan, Affordable home loan, Housing loan guide, Home loan process, Loan for home purchase, Home loan EMI calculator, Home renovation loan, Top-up home loan, Down payment assistance"
/>
<section class="xl:contianer mx-auto w-full bg-mainBg">
  <NewPageLayout {pageData}>
    <div class="hidden lg:block">
      <StickyNavbar
        navList={{
          items: [
            {
              name: "Loan types",
              targetId: `types`,
            },
            {
              name: "Why choose us",
              targetId: `why`,
            },

            {
              name: "Challenges",
              targetId: `challenges`,
            },
            {
              name: "Essential steps",
              targetId: `steps`,
            },
            {
              name: "Tools & calculator",
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
                $applicationData.LoanName = "Home Loan";
                // console.log($applicationData.LoanName, "ayayy");
              },
            },
          ],
        }}
        {activeSection}
      />

      <div id="types" data-section="types">
        <TwoColumnWithLeftHeading
          contents={{
            heading: `Types of Home Loans`,
            list: [
              {
                heading: `Home Purchase Loan`,
                desc: `Ideal for buying a new or resale property, subject to income verification, credit assessment, and property valuation.`,
              },
              {
                heading: `Home Construction Loan`,
                desc: `Designed for individuals constructing a house on their own land, with disbursement in phases as the construction progresses.`,
              },

              {
                heading: `Home Renovation Loan`,
                desc: `Funds home improvements, repairs, and remodeling projects.`,
              },
              {
                heading: `Home Loan Balance Transfer`,
                desc: `Allows you to switch your existing loan to another lender for lower interest rates and better repayment terms.`,
              },
              {
                heading: `Top-Up Home Loan`,
                desc: `Provides extra funds over your existing home loan for personal needs or property enhancements.`,
              },
            ],
          }}
        />
      </div>

      <div id="why" data-section="why">
        <AboveTitleWithoutIconCard
          contents={{
            heading: `Why Choose Us?`,
            xlGridCol: 3,
            borderBottom: true,
            cards: [
              {
                heading: `Best Loan Deals from Multiple Lenders `,
                para: `Compare interest rates, loan terms, and repayment options from top banks and NBFCs to secure the most affordable home loan.`,
                linkName: "Check your affordability",
                url: "/calculators/affordability-calculator",
              },
              {
                heading: `Seamless & Hassle-Free Process`,
                para: `From application to approval, we simplify the process with minimal paperwork, quick verification, and expert support at every step.`,
              },
              {
                heading: `100% Transparency & Trust`,
                para: `No hidden fees, no spam calls—just honest guidance and clear loan terms to help you make the right financial decision.`,
              },
            ],
          }}
        />
      </div>

      <div id="challenges" data-section="challenges">
        <TwoColumnWithLeftHeading
          contents={{
            heading: `Challenges`,
            list: [
              {
                heading: `Title & Ownership Concerns`,
                desc: `Verify the property's legal
              history and ensure there are no disputes over ownership.`,
              },
              {
                heading: `Outstanding Liabilities`,
                desc: `Conduct an encumbrance check
              to confirm there are no unpaid dues, mortgages, or legal claims on
              the property.`,
              },

              {
                heading: `Hidden Expenses`,
                desc: ` Factor in additional costs like registration
              fees, property taxes, and maintenance charges to avoid budget surprises.`,
              },
              {
                heading: `Project Delays`,
                desc: `Developers may face financial or legal
              setbacks, causing possession delays. Always check RERA registration
              before investing.`,
              },
              {
                heading: `Loan Approval Challenges`,
                desc: `Highlight your convenience
              factor, like document collection and processing from home.`,
              },
            ],
          }}
        />
      </div>

      <div id="steps" data-section="steps">
        <TwoColumnWithImage
          contents={{
            cardImage: "/images/employees.jpg",
            cardAltName: "employees-figure",
            cardHeading: "Essential Steps Before Buying a Home",
          }}
        >
          <div class="font-Paragraph text-minParaFont">
            <ul class="list-disc space-y-4">
              <li class="flex items-start gap-1">
                <img
                  src="/icons/circle-check.svg"
                  alt="circle-check"
                  class="h-4 mt-1"
                />
                <span>
                  <strong>Verify Legal Ownership:</strong> Check government records
                  to confirm the seller’s ownership.
                </span>
              </li>
              <li class="flex items-start gap-1">
                <img
                  src="/icons/circle-check.svg"
                  alt="circle-check"
                  class="h-4 mt-1"
                />
                <span>
                  <strong> Review Important Documents:</strong> Examine sale agreements,
                  approvals, and historical records before proceeding.
                </span>
              </li>
              <li class="flex items-start gap-1">
                <img
                  src="/icons/circle-check.svg"
                  alt="circle-check"
                  class="h-4 mt-1"
                />
                <span>
                  <strong>Check Regulatory Clearances:</strong> Ensure compliance
                  with zoning laws, environmental regulations, and land use approvals.
                </span>
              </li>
              <li class="flex items-start gap-1">
                <img
                  src="/icons/circle-check.svg"
                  alt="circle-check"
                  class="h-4 mt-1"
                />
                <span>
                  <strong>Work with Verified Builders & Brokers:</strong> Choose
                  trusted real estate agents and developers to avoid fraudulent deals.
                </span>
              </li>
              <li class="flex items-start gap-1">
                <img
                  src="/icons/circle-check.svg"
                  alt="circle-check"
                  class="h-4 mt-1"
                />
                <span>
                  <strong>Loan Approval Challenges:</strong> Highlight your convenience
                  factor, like document collection and processing from home.
                </span>
              </li>
            </ul>
          </div>
        </TwoColumnWithImage>

        <ButtonBanner
          contents={{
            heading: `Smart loan planning`,
            btnName: `Get Started`,
            btnBorder: `#4F4C4D`,
            btnLink: "/get-started/how-can-we-help",
          }}
        />

        <AboveTitleWithoutIconCard
          contents={{
            heading: `Financial Assistance for Your Home Loan`,
            xlGridCol: 3,
            borderBottom: true,
            cards: [
              {
                heading: "Need Help with the Down Payment?",
                para: `We connect you with financing options to ease your initial payment burden.​​`,
                linkName: "Get Down Payment Support",
                url: "/arrange-down-payment",
              },
              {
                heading: "Struggling with EMI Payments?",
                para: `Our customized repayment plans help you manage EMIs smoothly.`,
                linkName: "Explore Repayment Plans",
                url: "/planners/flexible-emi-planner",
              },
              {
                heading:
                  "Looking for Additional Funding for Home Improvements?",
                para: `Get access to quick approvals and minimal paperwork for renovation or expansion loans.`,
                linkName: `Apply for Additional Funding `,
                url: "/get-started/how-can-we-help",
                onClick: ($applicationData.LoanName = "Home Loan"),
              },
            ],
          }}
        />
      </div>

      <div id="tools" data-section="tools">
        <AboveTitleWithBlackCard
          contents={{
            heading: "Smart Home Loan & Savings Tools",
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
                heading: "Part payment planner",
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

    <div class="lg:hidden block">
      {#each navBarMedium as navBar, index}
        <details
          class="border-bgBtn dropdown col-span-3 bg-darkColor text-white {index <
          navBar.length - 1
            ? 'border-b'
            : ''} "
        >
          <summary
            class="list-none px-[1rem] py-[1.5rem]"
            onclick={(e) => { e.preventDefault(); ((e) => toggleDropdown(e, index))(e); }}
          >
            <div
              class="flex justify-between items-center font-FourthHead text-subParaFont"
            >
              <h2>{navBar}</h2>
              <span><i class="fa-solid fa-angle-down faq-icon"></i></span>
            </div>
          </summary>

          {#if index == 0}
            <div id="types" class="bg-white text-black">
              <TwoColumnWithLeftHeading
                contents={{
                  heading: `Types of Home Loans`,
                  list: [
                    {
                      heading: `Home Purchase Loan`,
                      desc: `Ideal for buying a new or resale property, subject to income verification, credit assessment, and property valuation.`,
                    },
                    {
                      heading: `Home Construction Loan`,
                      desc: `Designed for individuals constructing a house on their own land, with disbursement in phases as the construction progresses.`,
                    },

                    {
                      heading: `Home Renovation Loan`,
                      desc: `Funds home improvements, repairs, and remodeling projects.`,
                    },
                    {
                      heading: `Home Loan Balance Transfer`,
                      desc: `Allows you to switch your existing loan to another lender for lower interest rates and better repayment terms.`,
                    },
                    {
                      heading: `Top-Up Home Loan`,
                      desc: `Provides extra funds over your existing home loan for personal needs or property enhancements.`,
                    },
                  ],
                }}
              />
            </div>
          {:else if index == 1}
            <div id="why" class="bg-white text-black">
              <AboveTitleWithoutIconCard
                contents={{
                  heading: `Why Choose Us?`,
                  xlGridCol: 3,
                  borderBottom: true,
                  cards: [
                    {
                      heading: `Best Loan Deals from Multiple Lenders `,
                      para: `Compare interest rates, loan terms, and repayment options from top banks and NBFCs to secure the most affordable home loan.`,
                      linkName: "Check your affordability",
                      url: "/calculators/affordability-calculator",
                    },
                    {
                      heading: `Seamless & Hassle-Free Process`,
                      para: `From application to approval, we simplify the process with minimal paperwork, quick verification, and expert support at every step.`,
                    },
                    {
                      heading: `100% Transparency & Trust`,
                      para: `No hidden fees, no spam calls—just honest guidance and clear loan terms to help you make the right financial decision.`,
                    },
                  ],
                }}
              />
            </div>
          {:else if index == 2}
            <div id="challenges" class="bg-white text-black">
              <TwoColumnWithLeftHeading
                contents={{
                  heading: `Challenges`,
                  list: [
                    {
                      heading: `Title & Ownership Concerns`,
                      desc: `Verify the property's legal
                history and ensure there are no disputes over ownership.`,
                    },
                    {
                      heading: `Outstanding Liabilities`,
                      desc: `Conduct an encumbrance check
                to confirm there are no unpaid dues, mortgages, or legal claims on
                the property.`,
                    },

                    {
                      heading: `Hidden Expenses`,
                      desc: ` Factor in additional costs like registration
                fees, property taxes, and maintenance charges to avoid budget surprises.`,
                    },
                    {
                      heading: `Project Delays`,
                      desc: `Developers may face financial or legal
                setbacks, causing possession delays. Always check RERA registration
                before investing.`,
                    },
                    {
                      heading: `Loan Approval Challenges`,
                      desc: `Highlight your convenience
                factor, like document collection and processing from home.`,
                    },
                  ],
                }}
              />
            </div>
          {:else if index == 3}
            <div id="steps" class="bg-white text-black">
              <TwoColumnWithImage
                contents={{
                  cardImage: "/images/employees.jpg",
                  cardAltName: "employees-figure",
                  cardHeading: "Essential Steps Before Buying a Home",
                }}
              >
                <div class="font-Paragraph text-minParaFont">
                  <ul class="list-disc space-y-4">
                    <li class="flex items-start gap-1">
                      <img
                        src="/icons/circle-check.svg"
                        alt="circle-check"
                        class="h-4 mt-1"
                      />
                      <span>
                        <strong>Verify Legal Ownership:</strong> Check government
                        records to confirm the seller’s ownership.
                      </span>
                    </li>
                    <li class="flex items-start gap-1">
                      <img
                        src="/icons/circle-check.svg"
                        alt="circle-check"
                        class="h-4 mt-1"
                      />
                      <span>
                        <strong> Review Important Documents:</strong> Examine sale
                        agreements, approvals, and historical records before proceeding.
                      </span>
                    </li>
                    <li class="flex items-start gap-1">
                      <img
                        src="/icons/circle-check.svg"
                        alt="circle-check"
                        class="h-4 mt-1"
                      />
                      <span>
                        <strong>Check Regulatory Clearances:</strong> Ensure compliance
                        with zoning laws, environmental regulations, and land use
                        approvals.
                      </span>
                    </li>
                    <li class="flex items-start gap-1">
                      <img
                        src="/icons/circle-check.svg"
                        alt="circle-check"
                        class="h-4 mt-1"
                      />
                      <span>
                        <strong>Work with Verified Builders & Brokers:</strong> Choose
                        trusted real estate agents and developers to avoid fraudulent
                        deals.
                      </span>
                    </li>
                    <li class="flex items-start gap-1">
                      <img
                        src="/icons/circle-check.svg"
                        alt="circle-check"
                        class="h-4 mt-1"
                      />
                      <span>
                        <strong>Loan Approval Challenges:</strong> Highlight your
                        convenience factor, like document collection and processing
                        from home.
                      </span>
                    </li>
                  </ul>
                </div>
              </TwoColumnWithImage>

              <div class="w-full">
                <ButtonBanner
                  contents={{
                    heading: `Smart loan planning`,
                    btnName: `Get Started`,
                    btnBorder: `#4F4C4D`,
                    btnLink: "/get-started/how-can-we-help",
                  }}
                />
              </div>

              <AboveTitleWithoutIconCard
                contents={{
                  heading: `Financial Assistance for Your Home Loan`,
                  xlGridCol: 3,
                  borderBottom: true,
                  cards: [
                    {
                      heading: "Need Help with the Down Payment?",
                      para: `We connect you with financing options to ease your initial payment burden.​​`,
                      linkName: "Get Down Payment Support",
                      url: "/arrange-down-payment",
                    },
                    {
                      heading: "Struggling with EMI Payments?",
                      para: `Our customized repayment plans help you manage EMIs smoothly.`,
                      linkName: "Explore Repayment Plans",
                      url: "/planners/flexible-emi-planner",
                    },
                    {
                      heading:
                        "Looking for Additional Funding for Home Improvements?",
                      para: `Get access to quick approvals and minimal paperwork for renovation or expansion loans.`,
                      linkName: `Apply for Additional Funding `,
                      url: "/get-started/how-can-we-help",
                      onClick: ($applicationData.LoanName = "Home Loan"),
                    },
                  ],
                }}
              />
            </div>
          {:else if index == 4}
            <div id="tools" class="bg-white text-black">
              <AboveTitleWithBlackCard
                contents={{
                  heading: "Smart Home Loan & Savings Tools",
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
                      heading: "Part payment planner",
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

    <FeedbackCheck />

    <div slot="secondary">
      <HelpList
        contents={{
          heading: `We're here to help`,
          xlGridCol: 4,
          borderBottom: true,
          cards: [
            {
              heading: "Book an </br> appointment",
              para: "Book instantly to speak to a home loan specialist at a time that suits you",
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
          heading: `Things you should know`,
          paraGraph: [
            `<span class="font-FourthHead">Independent Facilitator:</span> Digital DSA operates as an independent loan facilitator and web aggregator, bridging the gap between loan consumers and licensed banks or NBFCs. We are not an authorized financial institution and do not offer loans directly.`,
            `<span class="font-FourthHead">Loan Approval:</span> The sole discretion of approving or rejecting a loan lies with the respective bank or NBFC where the user applies. Digital DSA does not guarantee loan approval or offer assurance from any specific bank or NBFC. All loans are subject to credit approval, and their terms, conditions, fees, and charges apply.`,
            `<span class="font-FourthHead">Liability:</span> Digital DSA is not responsible for any loss, damage, or failure at the user’s end during loan processing. The final decision of the bank or NBFC is binding on both the user and Digital DSA.`,
            `<span class="font-FourthHead">Important Information:</span> This information is provided without considering your personal objectives, financial situation, or needs. Please assess its suitability before acting. Exclusive offers are available only when you avail of a loan through Digital DSA and meet specific conditions.`,
          ],
        }}
        disc="list-decimal"
      ></ThingsYouShould>
    </div>
  </NewPageLayout>
</section>


