<script>
	let {
		data
	} = $props();




  import ThreeColumWithLeftHeading from "./ThreeColumWithLeftHeading.svelte";
  import { applicationData } from "$lib/stores/stores";

  import HelpList from "$lib/components/website/HelpList.svelte";
  import ThingsYouShould from "$lib/components/website/ThingsYouShould.svelte";

  import { onMount } from "svelte";
  import StickyNavbar from "./StickyNavbar.svelte";
  import NewPageLayout from "./NewPageLayout.svelte";
  import TwoColumnWithImage from "./TwoColumnWithImage.svelte";
  import ButtonBanner from "./ButtonBanner.svelte";
  import FeedbackCheck from "./FeedbackCheck.svelte";
  import Seo from "./Seo.svelte";

  let activeSection = $state("");
  let help = [
    {
Heading: "Book an  appointment",
paragraph:
"Book instantly to speak to a loan specialist at a time that suits you",
icon: "/icons/appointment.svg",
altTitle: "appointment Icon",
link: "/appointment",
    },
    {
Heading: "Check loan offers",
paragraph:
"In as little as 10 minutes and tailored exactly as per your financial profile.",
icon: "/icons/manageLoan2.svg",
altTitle: "Alert Icon",
link: "/get-started/how-can-we-help",
    },
    {
Heading: "Contact us",
paragraph:
"Fast-track your call and connect with a specialist in the Digital DSA.",
icon: "/icons/contact.svg",
altTitle: "Alert Icon",
link: "/contact",
    },
    {
Heading: "Message us",
paragraph: `Get instant help from our online assistants  or chat to a specialist.`,
icon: "/icons/msg.svg",
altTitle: "Alert Icon",
link: "/contact",
    },
  ];

  let navBarMedium = [
    "Why Balance Transfer",
    "How Digital DSA Helps",

    "Things to consider",
    "Tools & calculators",
  ];

  let thinkKnow = {
    heading: "Things you should know",
    paraGraph: [
`<span class="font-semibold"> Independent Facilitator:</span> Digital DSA operates as an independent loan facilitator and web aggregator, bridging the gap between loan consumers and licensed banks or NBFCs. We are not an authorized financial institution and do not offer loans directly.`,
`<span class="font-semibold">Loan Approval:</span> The sole discretion of approving or rejecting a loan lies with the respective bank or NBFC where the user applies. Digital DSA does not guarantee loan approval or offer assurance from any specific bank or NBFC. All loans are subject to credit approval, and their terms, conditions, fees, and charges apply.`,
`<span class="font-semibold">Liability:</span> Digital DSA is not responsible for any loss, damage, or failure at the user’s end during loan processing. The final decision of the bank or NBFC is binding on both the user and Digital DSA.`,
`<span class="font-semibold">Important Information:</span> This information is provided without considering your personal objectives, financial situation, or needs. Please assess its suitability before acting. Exclusive offers are available only when you avail of a loan through Digital DSA and meet specific conditions.`,
,
    ],
  };
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
  //let activeSection = $state(""); // Initially no section is active

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
activeSection = currentSection; // Update the active section dynamically
    }

    // console.log(activeSection, 'active');
  };

  // Initialize the first active section when the component loads
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
  title="LAP Balance Transfer – Lower Rates & Better Loan Terms"
  image="/images/lap-bt-blog.jpg"
  description="Switch your LAP for lower EMIs, top-up loans & better terms. Compare offers, check savings & transfer hassle-free with Digital DSA."
  keywords="LAP Balance Transfer, Loan Against Property Transfer, Lower LAP Interest Rates, LAP Top-Up Loan, Balance Transfer Benefits, Compare LAP Offers, Best LAP Transfer Deals, LAP EMI Calculator, LAP Balance Transfer Eligibility, LAP Transfer Process"
/>

<section>
  <NewPageLayout
    pageData={{
      coverImage: "/images/lap-bt-blog.jpg",
      coverAlt: "hero-cover",
      heading: "LAP Balance Transfer Made Easy",
      para: `<span class="font-semibold">Switch, Save & Gain!</span> Get lower interest rates, better repayment options, and increased loan eligibility with our hassle-free LAP balance transfer services.`,

      actionBtns: [
        {
          btnName: "Compare LAP Offers",
          btnLink: "/get-started/how-can-we-help",
          btnColor: "#ffcc00",
          onClick: () => {
            $applicationData.LoanName = "LAP Balance Transfer";
          },
        },
        {
          btnName: "Check Your Savings",
          btnLink: "/calculators/balance-transfer-calculator",
        },
      ],
    }}
  >
    <div class="hidden lg:block">
      <StickyNavbar
        navList={{
          items: [
            {
              name: "Why Balance Transfer?",
              targetId: "whyBalanceTransfer",
            },
            {
              name: "How Digital DSA Helps",
              targetId: "howDSAHelp",
            },
            {
              name: "Things to Consider",
              targetId: "thingConsider",
            },
            {
              name: "Tools & Calculators",
              targetId: "calculators",
            },
          ],
          actionBtns: [
            {
              btnName: "Compare LAP Offers",
              btnLink: "/get-started/how-can-we-help",
              btnColor: "#ffcc00",
              onClick: () => {
                $applicationData.LoanName = "LAP Balance Transfer";
              },
            },
            {
              btnName: "Check Your Savings",
              btnLink: "/calculators/balance-transfer-calculator",
            },
          ],
        }}
        {activeSection}
      />

      <div id="whyBalanceTransfer" data-section="whyBalanceTransfer">
        <ThreeColumWithLeftHeading
          contents={{
            heading: "Why Balance Transfer?",

            cardData: [
              {
                id: "1",
                title: "Key Benefits:<br>",
                para: `<ul class="list-disc flex flex-col gap-2 pl-4">
          <li>Lower interest rates <span class="font-semibold">(9% to 12% p.a.)</span>, reducing your EMIs.</li>
          <li>Access a <span class="font-semibold">Top-Up Loan</span> for personal or business needs.</li>
          <li>Save significantly on total interest costs.</li>
          <li>Flexible repayment options to shorten loan tenure.</li>
          <li>Enjoy better terms: <span class="font-semibold">prepayment flexibility</span> & zero hidden fees.</li>
        </ul>`,
              },

              {
                id: "2",
                title: "Important Considerations:<br>",
                para: `<ul class="list-disc flex flex-col gap-2 pl-4">
          <li>Balance transfer includes a <span class="font-semibold">processing fee</span> charged by the new lender.</li>
          <li>Delays in the process may lead to <span class="font-semibold">penalties</span> from the existing lender.</li>
          <li>Incorrect or incomplete documents can result in <span class="font-semibold">application rejection</span>.</li>
          <li>Prepayment charges may apply if closing the current loan early.</li>
          <li>New lenders with floating rates may cause <span class="font-semibold">EMI fluctuations</span>.</li>
        </ul>`,
              },
            ],
          }}
        />

        <ButtonBanner
          contents={{
            heading: `Looking to Transfer Your LAP for Better Rates?`,
            btnName: "Compare Best Offers",
            btnLink: "/get-started/how-can-we-help",
            btnColor: "#ffcc00",
            btnClick: () => {
              $applicationData.LoanName = "Loan Against Property";
            },
          }}
        />
      </div>

      <div id="howDSAHelp" data-section="howDSAHelp">
        <TwoColumnWithImage
          contents={{
            cardImage: "/images/housing.jpg",
            cardAltName: "housing-figure",
            cardHeading: "How We Help You Get the Best LAP Transfer",
            reverse: true,
          }}
        >
          <div class="typography-body-sm text-text-light">
            <ul
              class="list-disc space-y-4 typography-body-md text-text-light"
            >
              <li class="flex items-start gap-2">
                <img
                  src="/icons/circle-check.svg"
                  alt="Check icon"
                  class="h-5 mt-1"
                />
                <p>
                  <span class="font-semibold"
                    >Compare Top Bank/NBFC Offers :
                  </span>
                  Find the
                  <span class="font-semibold"
                    >best interest rates and flexible tenure</span
                  > for your LAP balance transfer.
                </p>
              </li>
              <li class="flex items-start gap-2">
                <img
                  src="/icons/circle-check.svg"
                  alt="Check icon"
                  class="h-5 mt-1"
                />
                <p>
                  <span class="font-semibold"
                    >100% Transparent & Zero Spam :
                  </span>
                  No hidden charges,
                  <span class="font-semibold">no spam calls - </span>your
                  privacy is protected.
                </p>
              </li>
              <li class="flex items-start gap-2">
                <img
                  src="/icons/circle-check.svg"
                  alt="Check icon"
                  class="h-5 mt-1"
                />
                <p>
                  <span class="font-semibold"
                    >Powerful Tools & Calculators :
                  </span>
                  Check
                  <span class="font-semibold"
                    >EMI affordability, eligibility, and savings</span
                  > instantly.
                </p>
              </li>
              <li class="flex items-start gap-2">
                <img
                  src="/icons/circle-check.svg"
                  alt="Check icon"
                  class="h-5 mt-1"
                />
                <p>
                  <span class="font-semibold"
                    >Exclusive Cashback & Discounts :
                  </span>
                  Get special benefits
                  <span class="font-semibold"
                    >when you apply through Digital DSA</span
                  >.
                </p>
              </li>
              <li class="flex items-start gap-2">
                <img
                  src="/icons/circle-check.svg"
                  alt="Check icon"
                  class="h-5 mt-1"
                />
                <p>
                  <span class="font-semibold"
                    >Doorstep Document Pickup :
                  </span>
                  <span class="font-semibold"
                    >Hassle-free processing -
                  </span>we collect and verify documents at your convenience.
                </p>
              </li>
            </ul>
          </div>
        </TwoColumnWithImage>
        <div class="border-b border-borderColor px-[1rem] lg:px-[4rem]">
          <ThingsYouShould
            thinkKnow={{
              heading: "Documents Required",
              paraGraph: [
                `<strong>Identity Proof:</strong> Aadhaar, PAN, Passport.`,
                `<strong>Address Proof:</strong> Aadhaar, Passport, Utility Bills.`,
                `<strong>Income Proof:</strong> Salary Slips, Bank Statement, ITR, Audited Financials.`,
                `<strong>Property Documents:</strong> Title Deeds, Property Chain Documents.`,
                `<strong>Foreclosure Letter:</strong> List of Original Documents (LOD) and Foreclosure Letter from Current Lender.`,
              ],
            }}
            disc="list-disc"
          />
        </div>

        <ButtonBanner
          contents={{
            heading: `Struggling with loan approval due to <span class="underline decoration-btnBg underline-offset-4">low ITR</span>?`,
            btnName: "Get Help",
            BtnBorder: "#4F4C4D",
            btnColor: "#ffcc00",
            btnLink: "/appointment",
          }}
        />
      </div>

      <div id="thingConsider" data-section="thingConsider">
        <ThreeColumWithLeftHeading
          contents={{
            heading: "Things to consider",

            cardData: [
              {
                id: "1",
                title: "Points to consider",
                para: `
          <ul class="list-disc flex flex-col gap-2 pl-4">
            <li>Failure to repay a Loan Against Property can risk property loss, but with smart planning and our expert tools, you can ensure safe and manageable repayments.</li>
            <li>Since the property needs to be appraised and verified, the approval process might take longer compared to unsecured loans.</li>
            <li>If not planned carefully, EMIs can affect monthly finances, especially during financial stress. In such cases, you can opt for an <span class="font-semibold">Overdraft facility</span> if you are unsure about immediate usage of the entire funds.</li>
          </ul>
        `,
              },
              {
                id: "2",
                title: "What to expect",
                para: `
          When you reach out for support, we’ll work with you to understand your situation and determine the best way to assist you. To help us do that, we may ask for:
          <ul class="list-disc flex flex-col gap-2 pl-4">
            <li><span class="font-semibold">Information</span> about your profession, income, and expenses.</li>
            <li><span class="font-semibold">Documents</span> to support your income and property ownership.</li>
          </ul>
          <br />
        
        `,

                // To know the documents required, <a href="" class="text-btnBg underline">Check the list here.</a>
              },
            ],
          }}
        />
      </div>

      <div id="calculators" data-section="calculators">
        <ThreeColumWithLeftHeading
          contents={{
            heading: "Tool & Calculators",
            cardData: [
              {
                id: "1",
                title: "Tools",
                para: `
                <ul class="list-disc flex flex-col gap-1 pl-4">
                  <li><a href="/get-started/how-can-we-help" class="hover:no-underline underline">Check bank offers</a></li>
                  <li><a href="/planners/budget-planner" class="hover:no-underline underline">Budget Planner</a></li>
                  <li><a href="/calculators/eligibility-calculator" class="hover:no-underline underline">How much I can borrow</a></li>
                </ul>
              `,
              },
              {
                id: "2",
                title: "Calculators",
                para: `
                <ul class="list-disc flex flex-col gap-1 pl-4">
                  <li><a href="/planners/part-payment-planner" class="hover:no-underline underline">Part-payment Calculator</a></li>
                  <li><a href="/calculators/emi-calculator" class="hover:no-underline underline">How much EMI I can pay</a></li>
                  <li><a href="/planners/flexible-emi-planner" class="hover:no-underline underline">Optimize my loan tenure</a></li>
                </ul>
              `,
              },
            ],
          }}
        />
      </div>
    </div>

    <div class="lg:hidden">
      {#each navBarMedium as list, index}
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
            <div class="bg-white text-black">
              <ThreeColumWithLeftHeading
                contents={{
                  heading: "Why Balance Transfer?",

                  cardData: [
                    {
                      id: "1",
                      title: "Key Benefits:<br>",
                      para: `<ul class="list-disc flex flex-col gap-2 pl-4">
          <li>Lower interest rates <span class="font-semibold">(9% to 12% p.a.)</span>, reducing your EMIs.</li>
          <li>Access a <span class="font-semibold">Top-Up Loan</span> for personal or business needs.</li>
          <li>Save significantly on total interest costs.</li>
          <li>Flexible repayment options to shorten loan tenure.</li>
          <li>Enjoy better terms: <span class="font-semibold">prepayment flexibility</span> & zero hidden fees.</li>
        </ul>`,
                    },

                    {
                      id: "2",
                      title: "Important Considerations:<br>",
                      para: `<ul class="list-disc flex flex-col gap-2 pl-4">
          <li>Balance transfer includes a <span class="font-semibold">processing fee</span> charged by the new lender.</li>
          <li>Delays in the process may lead to <span class="font-semibold">penalties</span> from the existing lender.</li>
          <li>Incorrect or incomplete documents can result in <span class="font-semibold">application rejection</span>.</li>
          <li>Prepayment charges may apply if closing the current loan early.</li>
          <li>New lenders with floating rates may cause <span class="font-semibold">EMI fluctuations</span>.</li>
        </ul>`,
                    },
                  ],
                }}
              />

              <ButtonBanner
                contents={{
                  heading: `Looking to Transfer Your LAP for Better Rates?`,
                  btnName: "Compare Best Offers",
                  btnLink: "/get-started/how-can-we-help",
                  btnColor: "#ffcc00",
                  btnClick: () => {
                    $applicationData.LoanName = "Loan Against Property";
                  },
                }}
              />
            </div>
          {:else if index == 1}
            <div class="bg-white text-black">
              <TwoColumnWithImage
                contents={{
                  cardImage: "/images/housing.jpg",
                  cardAltName: "housing-figure",
                  cardHeading: "How We Help You Get the Best LAP Transfer",
                  reverse: true,
                }}
              >
                <div class="typography-body-sm text-text-light">
                  <ul
                    class="list-disc typography-body-md text-text-light"
                  >
                    <li class="flex items-start gap-2">
                      <img
                        src="/icons/circle-check.svg"
                        alt="Check icon"
                        class="h-5 mt-1"
                      />
                      <p>
                        <span class="font-semibold"
                          >Compare Top Bank/NBFC Offers :
                        </span>
                        Find the
                        <span class="font-semibold"
                          >best interest rates and flexible tenure</span
                        > for your LAP balance transfer.
                      </p>
                    </li>
                    <li class="flex items-start gap-2">
                      <img
                        src="/icons/circle-check.svg"
                        alt="Check icon"
                        class="h-5 mt-1"
                      />
                      <p>
                        <span class="font-semibold"
                          >100% Transparent & Zero Spam :
                        </span>
                        No hidden charges,
                        <span class="font-semibold"
                          >no spam calls -
                        </span>your privacy is protected.
                      </p>
                    </li>
                    <li class="flex items-start gap-2">
                      <img
                        src="/icons/circle-check.svg"
                        alt="Check icon"
                        class="h-5 mt-1"
                      />
                      <p>
                        <span class="font-semibold"
                          >Powerful Tools & Calculators :
                        </span>
                        Check
                        <span class="font-semibold"
                          >EMI affordability, eligibility, and savings</span
                        > instantly.
                      </p>
                    </li>
                    <li class="flex items-start gap-2">
                      <img
                        src="/icons/circle-check.svg"
                        alt="Check icon"
                        class="h-5 mt-1"
                      />
                      <p>
                        <span class="font-semibold"
                          >Exclusive Cashback & Discounts :
                        </span>
                        Get special benefits
                        <span class="font-semibold"
                          >when you apply through Digital DSA</span
                        >.
                      </p>
                    </li>
                    <li class="flex items-start gap-2">
                      <img
                        src="/icons/circle-check.svg"
                        alt="Check icon"
                        class="h-5 mt-1"
                      />
                      <p>
                        <span class="font-semibold"
                          >Doorstep Document Pickup :
                        </span>
                        <span class="font-semibold"
                          >Hassle-free processing -
                        </span>we collect and verify documents at your
                        convenience.
                      </p>
                    </li>
                  </ul>
                </div>
              </TwoColumnWithImage>

              <ThingsYouShould
                thinkKnow={{
                  heading: "Documents required",
                  paraGraph: [
                    `<span class=font-semibold>Identity Proof:</span> Aadhaar, PAN, Passport.`,
                    `<span class=font-semibold>Address Proof:</span> Aadhaar, Passport, Utility Bills.`,
                    `<span class=font-semibold>Income Proof:</span> Salary Slips, Bank Statement, ITR, Audited financials.`,
                    `<span class=font-semibold>Property Documents:</span> Title Deeds, Property Chain documents.`,
                    `<span class=font-semibold>Foreclosure Letter:</span> List of original document (LOD) and Foreclosure Letter from Current Lender.`,
                  ],
                }}
                disc="list-disc"
              />

              <ButtonBanner
                contents={{
                  heading: `Struggling with loan approval due to <span class="underline decoration-btnBg underline-offset-4"> low ITR</span> ? `,
                  btnName: "Get help",
                  BtnBorder: `#4F4C4D`,
                  btnColor: "#ffcc00",
                  btnLink: "/appointment",
                }}
              />
            </div>
          {:else if index == 2}
            <div class="bg-white text-black">
              <ThreeColumWithLeftHeading
          contents={{
            heading: "Things to consider",

            cardData: [
              {
                id: "1",
                title: "Points to consider",
                para: `
          <ul class="list-disc flex flex-col gap-2 pl-4">
            <li>Failure to repay a Loan Against Property can risk property loss, but with smart planning and our expert tools, you can ensure safe and manageable repayments.</li>
            <li>Since the property needs to be appraised and verified, the approval process might take longer compared to unsecured loans.</li>
            <li>If not planned carefully, EMIs can affect monthly finances, especially during financial stress. In such cases, you can opt for an <span class="font-semibold">Overdraft facility</span> if you are unsure about immediate usage of the entire funds.</li>
          </ul>
        `,
              },
              {
                id: "2",
                title: "What to expect",
                para: `
          When you reach out for support, we’ll work with you to understand your situation and determine the best way to assist you. To help us do that, we may ask for:
          <ul class="list-disc flex flex-col gap-2 pl-4">
            <li><span class="font-semibold">Information</span> about your profession, income, and expenses.</li>
            <li><span class="font-semibold">Documents</span> to support your income and property ownership.</li>
          </ul>
          <br />
        
        `,

                // To know the documents required, <a href="" class="text-btnBg underline">Check the list here.</a>
              },
            ],
          }}
        />
            </div>
          {:else if index == 3}
            <div class="bg-white text-black">
               <ThreeColumWithLeftHeading
          contents={{
            heading: "Tool & Calculators",
            cardData: [
              {
                id: "1",
                title: "Tools",
                para: `
                <ul class="list-disc flex flex-col gap-1 pl-4">
                  <li><a href="/get-started/how-can-we-help" class="hover:no-underline underline">Check bank offers</a></li>
                  <li><a href="/planners/budget-planner" class="hover:no-underline underline">Budget Planner</a></li>
                  <li><a href="/calculators/eligibility-calculator" class="hover:no-underline underline">How much I can borrow</a></li>
                </ul>
              `,
              },
              {
                id: "2",
                title: "Calculators",
                para: `
                <ul class="list-disc flex flex-col gap-1 pl-4">
                  <li><a href="/planners/part-payment-planner" class="hover:no-underline underline">Part-payment Calculator</a></li>
                  <li><a href="/calculators/emi-calculator" class="hover:no-underline underline">How much EMI I can pay</a></li>
                  <li><a href="/planners/flexible-emi-planner" class="hover:no-underline underline">Optimize my loan tenure</a></li>
                </ul>
              `,
              },
            ],
          }}
        />
            </div>
          {/if}
        </details>
      {/each}
    </div>

    <FeedbackCheck />

    <div slot="secondary">
      <HelpList
        contents={{
          heading: `LAP Balance Transfer: We're here to help`,
          xlGridCol: 4,
          borderBottom: true,
          cards: [
            {
              heading: "Book an </br> appointment",
              para: "Schedule a consultation with our loan experts to explore your LAP balance transfer options.",
              icon: "/icons/appointment.svg",
              altName: "Appointment Icon",
              url: "/appointment",
            },
            {
              heading: "Compare loan offers",
              para: "Get personalized LAP balance transfer offers in just 10 minutes, tailored to your financial needs.",
              icon: "/icons/manageLoan2.svg",
              altName: "Loan Offers Icon",
              url: "/get-started/how-can-we-help",
            },
            {
              heading: "Contact us",
              para: "Have questions? Connect directly with our experts for guidance on transferring your LAP.",
              icon: "/icons/contact.svg",
              altName: "Contact Icon",
              url: "/contact",
            },
            {
              heading: "Message us",
              para: "Need quick assistance? Chat with our specialists for instant support on LAP transfers.",
              icon: "/icons/msg.svg",
              altName: "Message Icon",
              url: "/contact",
            },
          ],
        }}
      />

      <ThingsYouShould
        thinkKnow={{
          heading: "Things You Should Know About LAP Balance Transfer",
          paraGraph: [
            `<span class="font-semibold">Independent Service Provider:</span> DigitalDSA is a loan facilitation platform connecting users with banks and NBFCs for LAP balance transfers. We do not provide loans directly or influence approval decisions.`,
            `<span class="font-semibold">Approval & Eligibility:</span> Loan transfer approvals are subject to the policies of the respective banks or NBFCs. DigitalDSA does not guarantee approval or specific interest rates. All applications undergo credit assessment and eligibility checks.`,
            `<span class="font-semibold">Processing & Charges:</span> LAP balance transfers may involve processing fees, foreclosure charges, valuation costs, and other associated expenses. Ensure you review these costs before proceeding.`,
            `<span class="font-semibold">Liability Disclaimer:</span> DigitalDSA is not responsible for any delays, rejections, or additional costs incurred during the LAP transfer process. The final decision rests with the financial institution.`,
            `<span class="font-semibold">Make an Informed Decision:</span> Before transferring your LAP, evaluate the new loan terms, repayment structure, and total cost savings to ensure it benefits your financial situation.`,
          ],
        }}
        disc="list-decimal"
      />
    </div>
  </NewPageLayout>
</section>
