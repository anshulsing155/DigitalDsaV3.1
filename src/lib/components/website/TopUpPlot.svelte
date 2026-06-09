<script>
	let {
		data
	} = $props();



  import Button from "./Button.svelte";
  import TwoColumn from "./TwoColumn.svelte";
  import WeAreHereHelp from "$lib/components/website/WeAreHereHelp.svelte";
  import ThingsYouShould from "$lib/components/website/ThingsYouShould.svelte";
  import { applicationData } from "$lib/stores/stores";
  import { onMount } from "svelte";
  import StickyNavbar from "./StickyNavbar.svelte";
  import ThreeColumWithLeftHeading from "./ThreeColumWithLeftHeading.svelte";
  import NewPageLayout from "./NewPageLayout.svelte";
  import AboveTitleWithBlackCard from "./AboveTitleWithBlackCard.svelte";
  import Seo from "./Seo.svelte";

  let pageData = {
    coverImage: "/images/extra-funds-blog.jpg",
    coverAlt: "hero-cover",
    classStyle: "object-cover xl:h-[90svh] 3xl:max-h-[70svh]",
    heading: "LAP  Top-up on an Existing Running Loan",
    para: `A <span class="font-FourthHead"> LAP Top-up </span> is an additional loan amount sanctioned over your existing <span class="font-FourthHead"> Loan Against Property </span> without transferring it to another lender. You continue with the same bank, but with extra funds based on your eligibility.`,
    actionBtns: [
{
btnName: "Book appointment",
btnLink: "/appointment",
},
{
btnName: "Compare Bank offers",
btnLink: "/get-started/how-can-we-help",
btnColor: "#ffcc00",
btnClick: () => {
$applicationData.LoanName = "Loan Against Property";
},
},
    ],
  };

  let subList = {
    items: [
{
name: "Requirement",
targetId: `requirement`,
},
{
name: "Benefits",
targetId: `benefits`,
},
{
name: "Eligibility",
targetId: `eligibility`,
},
{
name: "Process",
targetId: `process`,
},
{
name: "Consider",
targetId: `consider`,
},
    ],
    actionBtns: [
{
btnName: "Book appointment",
btnLink: "/appointment",
},
{
btnName: "Compare Bank offers",
btnLink: "/get-started/how-can-we-help",
btnColor: "#ffcc00",
btnClick: () => {
$applicationData.LoanName = "Loan Against Property";
},
},
    ],
  };

  let help = [
    {
Heading: "Book an  appointment",
paragraph:
"Book instantly to speak to a LAP loan specialist at a time that suits you",
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
"Fast-track your call and connect with a specialist in the DigitalDSA.",
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

  let thinkKnow = {
    heading: "Things you should know",
    paraGraph: [
`<span class="font-FourthHead">Independent Facilitator:</span> Digital DSA operates as an independent loan facilitator and web aggregator, bridging the gap between loan consumers and licensed banks or NBFCs. We are not an authorized financial institution and do not offer loans directly.`,
`<span class="font-FourthHead">Loan Approval:</span> The sole discretion of approving or rejecting a loan lies with the respective bank or NBFC where the user applies. Digital DSA does not guarantee loan approval or offer assurance from any specific bank or NBFC. All loans are subject to credit approval, and their terms, conditions, fees, and charges apply.`,
`<span class="font-FourthHead">Liability:</span> Digital DSA is not responsible for any loss, damage, or failure at the user’s end during loan processing. The final decision of the bank or NBFC is binding on both the user and Digital DSA.`,
`<span class="font-FourthHead">Important Information:</span> This information is provided without considering your personal objectives, financial situation, or needs. Please assess its suitability before acting. Exclusive offers are available only when you avail of a loan through Digital DSA and meet specific conditions.`,
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
  let activeSection = $state(""); // Initially no section is active

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
  title="LAP Top-Up Loan – Get Extra Funds on Your Property Loan"
  image="/images/extra-funds-blog.jpg"
  description="Get a LAP Top-Up Loan for quick funds without new paperwork. Lower rates than personal loans. Check eligibility & apply easily today!"
  keywords="LAP Top-Up Loan, Loan Against Property Top-Up, Top-Up Loan on Existing LAP, Additional Loan on Property, Property Loan Top-Up Eligibility, Increase LAP Loan Amount, Quick LAP Top-Up Approval, Best LAP Top-Up Interest Rates, Apply for LAP Top-Up Loan, LAP Top-Up Loan Process"
/>

<section>
  <NewPageLayout {pageData}>
    <div>
      <div class="hidden lg:block">
        <StickyNavbar navList={subList} {activeSection}></StickyNavbar>

        <div id="requirement" data-section="requirement">
          <ThreeColumWithLeftHeading
            contents={{
              heading: "Why it may be required",
              cardData: [
                {
                  id: "1",
                  title: "Quick Access to Funds ",
                  para: `Faster approval since the bank already has your records.`,
                  // link: "Read home buying guide (PDF)",
                },
                {
                  id: "2",
                  title: "No New Loan Processing Hassle",
                  para: `Avoid the paperwork of taking a separate loan.`,
                  // link: "Tell me more about saving for a deposit",
                },
                {
                  id: "3",
                  title: "Lower Interest Rate than Personal Loans ",
                  para: `A top-up on LAP is cheaper than unsecured loans. `,
                  // link: "Keep reading about conditional pre-approval",
                },
                {
                  id: "4",
                  title: "Use for Any Purpose ",
                  para: `Business needs, debt consolidation, home improvement, etc.`,
                  // link: "Find out more about home buying costs",
                },
              ],
            }}
          />
        </div>
        <div
          class="lg:px-[4rem] border-b border-borderColor"
          id="benefits"
          data-section="benefits"
        >
          <ThingsYouShould
            thinkKnow={{
              heading: "Key Benefits",
              paraGraph: [
                `<span class="font-FourthHead"> Higher Loan Amount – </span> Based on property valuation & repayment history.`,
                `<span class="font-FourthHead"> Lower Processing Time – </span> Faster than taking a fresh LAP.`,
                `<span class="font-FourthHead"> Affordable EMIs – </span> Spread repayment over a long tenure.`,
                `<span class="font-FourthHead"> Flexible Repayment – </span> Prepayment & foreclosure options available.`,
              ],
            }}
            disc="list-disc"
          />
        </div>

        <AboveTitleWithBlackCard
          contents={{
            heading: "LAP calculator",
            xlGridCol: 4,
            borderBottom: true,
            cards: [
              {
                heading: "Estimate your EMI",
                icon: "/icons/calc.svg",
                iconAltName: "icon-calc",
                url: "/calculators/emi-calculator",
              },
              {
                heading: "How much can I borrow?",
                icon: "/icons/calc.svg",
                iconAltName: "icon-calc",
                url: "/calculators/eligibility-calculator?loanValue=LAP(Loan Against Property)",
              },
              {
                heading: "LAP repayments calculator",
                icon: "/icons/lap.svg",
                iconAltName: "loan-icon",
                url: "/planners/part-payment-planner",
              },

              {
                heading: "Balance transfer calculator",
                icon: "/icons/calc.svg",
                iconAltName: "icons-calc",
                url: "/calculators/balance-transfer-calculator?loanTypeValue=LAP(Loan Against Property)",
              },
            ],
          }}
        />
        <div id="eligibility" data-section="eligibility">
          <ThreeColumWithLeftHeading
            contents={{
              heading: "Eligibility & Documents Required",
              cardData: [
                {
                  id: "1",
                  title: "Eligibility Criteria",
                  para: `
                <ul class="list-disc flex flex-col gap-2 pl-4">
                  <li> Existing LAP with a good repayment track record</li>
                  <li> Adequate property value to justify additional funding</li>
                  <li> Stable income & financial stability</li>
                  <li> Sufficient repayment capacity based on income assessment</li>
                </ul>
              `,
                },
                {
                  id: "2",
                  title: "Documents Required",
                  para: `
                <ul class="list-disc flex flex-col gap-2 pl-4">
                  <li><span class="font-FourthHead">Loan Statement:</span> Existing loan statement & outstanding balance proof.</li>
                  <li><span class="font-FourthHead">KYC documents :</span> PAN, Aadhaar, passport, voter ID.</li>
                  <li><span class="font-FourthHead">Latest income proof :</span> salary slips, ITR, bank statements.</li>
                  <li><span class="font-FourthHead">Property valuation report :</span> if required by the bank</li>
                </ul>
                `,
                },
              ],
            }}
          />
        </div>

        <div
          class="border-b border-borderColor lg:px-[4rem]"
          id="process"
          data-section="process"
        >
          <TwoColumn
            cardImage="/images/housing.jpg"
            cardAltName="housing-figure"
            cardHeading="Process"
            imageHeight="3"
            reverse
          >
            <div slot="list" class="flex flex-col gap-4">
              <ul class=" space-y-4 font-Paragraph text-subParaFont">
                <li class="flex items-start gap-1">
                  <img
                    src="/icons/circle-check.svg"
                    alt="circle icon"
                    class="h-4 mt-1"
                  />
                  <span class="font-FourthHead">Step 1 :</span> Apply with your existing
                  bank/NBFC.
                </li>
                <li class="flex items-start gap-1">
                  <img
                    src="/icons/circle-check.svg"
                    alt="circle icon"
                    class="h-4 mt-1"
                  />
                  <span class="font-FourthHead">Step 2 :</span> Submit income documents
                  & loan track record.
                </li>
                <li class="flex items-start gap-1">
                  <img
                    src="/icons/circle-check.svg"
                    alt="circle icon"
                    class="h-4 mt-1"
                  />
                  <span class="font-FourthHead">Step 3 :</span> Bank evaluates property
                  & financial standing.
                </li>
                <li class="flex items-start gap-1">
                  <img
                    src="/icons/circle-check.svg"
                    alt="circle icon"
                    class="h-4 mt-1"
                  />
                  <span class="font-FourthHead">Step 4 :</span> Approval & disbursement
                  of top-up amount.
                </li>
              </ul>
            </div>
          </TwoColumn>
        </div>

        <div id="consider" data-section="consider">
          <div class="border-b border-borderColor lg:px-[4rem]">
            <ThingsYouShould
              thinkKnow={{
                heading: "When Should You Consider a top-up",
                paraGraph: [
                  `When you need extra funds but don’t want to go through a new loan application.`,
                  ` When your property value has increased & you qualify for more funds.`,
                  ` When you have a good repayment track record & want quick access to additional capital.`,
                ],
              }}
              disc="list-disc"
            />
          </div>

          <ThreeColumWithLeftHeading
            contents={{
              heading: "Explore & Secure Your Loan!",
              cardData: [
                {
                  title: "Find the Best LAP Top-Up Loan Offers",
                  para: `Explore personalized top-up loan options on your Loan Against Property and choose the best deal for your needs.`,
                  btnName: "View loan offers",
                  btnLink: "/get-started/how-can-we-help",
                  btnColor: "#ffcc00",
                  btnClick: () => {
                    $applicationData.LoanName = "Loan Against Property";
                  },
                },
                {
                  title: `Still confused?  `,
                  para: "Book an Appointment for Expert Guidance!",
                  btnName: "Book appointment",
                  btnLink: "/appointment",
                },
              ],
            }}
          />
        </div>
      </div>
      <div class="lg:hidden block">
        {#each ["Requirement", "Benefits", "Eligibility", "Process", "Consider"] as list, index}
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
              <div
                class="mx-auto flex w-full items-center justify-between gap-4"
              >
                <h2 class="text-navFont">{list}</h2>
                <div class="icon-container justify-self-end text-mobSubHead">
                  <span><i class="fa-solid fa-angle-down faq-icon"></i></span>
                </div>
              </div>
            </summary>

            {#if index == 0}
              <div class="bg-white text-black">
                <ThreeColumWithLeftHeading
                  contents={{
                    heading: "Why it may be required",
                    cardData: [
                      {
                        id: "1",
                        title: "Quick Access to Funds ",
                        para: `Faster approval since the bank already has your records.`,
                        // link: "Read home buying guide (PDF)",
                      },
                      {
                        id: "2",
                        title: "No New Loan Processing Hassle",
                        para: `Avoid the paperwork of taking a separate loan.`,
                        // link: "Tell me more about saving for a deposit",
                      },
                      {
                        id: "3",
                        title: "Lower Interest Rate than Personal Loans ",
                        para: `A top-up on LAP is cheaper than unsecured loans. `,
                        // link: "Keep reading about conditional pre-approval",
                      },
                      {
                        id: "4",
                        title: "Use for Any Purpose ",
                        para: `Business needs, debt consolidation, home improvement, etc.`,
                        // link: "Find out more about home buying costs",
                      },
                    ],
                  }}
                />
              </div>
            {:else if index == 1}
              <div class="bg-white text-black">
                <div class="">
                  <ThingsYouShould
                    thinkKnow={{
                      heading: "Key Benefits",
                      paraGraph: [
                        `<span class="font-FourthHead"> Higher Loan Amount – </span> Based on property valuation & repayment history.`,
                        `<span class="font-FourthHead"> Lower Processing Time – </span> Faster than taking a fresh LAP.`,
                        `<span class="font-FourthHead"> Affordable EMIs – </span> Spread repayment over a long tenure.`,
                        `<span class="font-FourthHead"> Flexible Repayment – </span> Prepayment & foreclosure options available.`,
                      ],
                    }}
                    disc="list-disc"
                  />
                </div>

                <AboveTitleWithBlackCard
                  contents={{
                    heading: "LAP calculator",
                    xlGridCol: 4,
                    borderBottom: true,
                    cards: [
                      {
                        heading: "Estimate your EMI",
                        icon: "/icons/calc.svg",
                        iconAltName: "icon-calc",
                        url: "/calculators/emi-calculator",
                      },
                      {
                        heading: "How much can I borrow?",
                        icon: "/icons/calc.svg",
                        iconAltName: "icon-calc",
                        url: "/calculators/eligibility-calculator?loanValue=LAP(Loan Against Property)",
                      },
                      {
                        heading: "LAP repayments calculator",
                        icon: "/icons/lap.svg",
                        iconAltName: "loan-icon",
                        url: "/planners/part-payment-planner",
                      },

                      {
                        heading: "Balance transfer calculator",
                        icon: "/icons/calc.svg",
                        iconAltName: "icons-calc",
                        url: "/calculators/balance-transfer-calculator?loanTypeValue=LAP(Loan Against Property)",
                      },
                    ],
                  }}
                />
              </div>
            {:else if index == 2}
              <div class="bg-white text-black">
                <ThreeColumWithLeftHeading
                  contents={{
                    heading: "Eligibility & Documents Required",
                    cardData: [
                      {
                        id: "1",
                        title: "Eligibility Criteria",
                        para: `
                <ul class="list-disc flex flex-col gap-2 pl-4">
                  <li> Existing LAP with a good repayment track record</li>
                  <li> Adequate property value to justify additional funding</li>
                  <li> Stable income & financial stability</li>
                  <li> Sufficient repayment capacity based on income assessment</li>
                </ul>
              `,
                      },
                      {
                        id: "2",
                        title: "Documents Required",
                        para: `
                <ul class="list-disc flex flex-col gap-2 pl-4">
                  <li><span class="font-FourthHead">Loan Statement:</span> Existing loan statement & outstanding balance proof.</li>
                  <li><span class="font-FourthHead">KYC documents :</span> PAN, Aadhaar, passport, voter ID.</li>
                  <li><span class="font-FourthHead">Latest income proof :</span> salary slips, ITR, bank statements.</li>
                  <li><span class="font-FourthHead">Property valuation report :</span> if required by the bank</li>
                </ul>
                `,
                      },
                    ],
                  }}
                />
              </div>
            {:else if index == 3}
              <div class="bg-white text-black">
                <TwoColumn
                  cardImage="/images/housing.jpg"
                  cardAltName="housing-figure"
                  cardHeading="Process"
                  reverse
                >
                  <div slot="list" class="flex flex-col gap-4">
                    <ul class=" space-y-4 font-Paragraph text-subParaFont">
                      <li class="flex items-start gap-1">
                        <img
                          src="/icons/circle-check.svg"
                          alt="circle icon"
                          class="h-4 mt-1"
                        />
                        <span class="font-FourthHead">Step 1 :</span> Apply with
                        your existing bank/NBFC.
                      </li>
                      <li class="flex items-start gap-1">
                        <img
                          src="/icons/circle-check.svg"
                          alt="circle icon"
                          class="h-4 mt-1"
                        />
                        <span class="font-FourthHead">Step 2 :</span> Submit income
                        documents & loan track record.
                      </li>
                      <li class="flex items-start gap-1">
                        <img
                          src="/icons/circle-check.svg"
                          alt="circle icon"
                          class="h-4 mt-1"
                        />
                        <span class="font-FourthHead">Step 3 :</span> Bank evaluates
                        property & financial standing.
                      </li>
                      <li class="flex items-start gap-1">
                        <img
                          src="/icons/circle-check.svg"
                          alt="circle icon"
                          class="h-4 mt-1"
                        />
                        <span class="font-FourthHead">Step 4 :</span> Approval &
                        disbursement of top-up amount.
                      </li>
                    </ul>
                  </div>
                </TwoColumn>
              </div>
            {:else if index == 4}
              <div class="bg-white text-black">
                <div class="">
                  <ThingsYouShould
                    thinkKnow={{
                      heading: "When Should You Consider a top-up",
                      paraGraph: [
                        `When you need extra funds but don’t want to go through a new loan application.`,
                        ` When your property value has increased & you qualify for more funds.`,
                        ` When you have a good repayment track record & want quick access to additional capital.`,
                      ],
                    }}
                    disc="list-disc"
                  />
                </div>

                <ThreeColumWithLeftHeading
                  contents={{
                    heading: "Explore & Secure Your Loan!",
                    cardData: [
                      {
                        title: "Find the Best LAP Top-Up Loan Offers",
                        para: `Explore personalized top-up loan options on your Loan Against Property and choose the best deal for your needs.`,
                        btnName: "View loan offers",
                        btnLink: "/get-started/how-can-we-help",
                        btnColor: "#ffcc00",
                        btnClick: () => {
                          $applicationData.LoanName = "Loan Against Property";
                        },
                      },
                      {
                        title: `Still confused?  `,
                        para: "Book an Appointment for Expert Guidance!",
                        btnName: "Book appointment",
                        btnLink: "/appointment",
                      },
                    ],
                  }}
                />
              </div>
            {/if}
          </details>
        {/each}
      </div>

      <div class="px-[0.5rem] lg:px-[4rem]">
        <TwoColumn
          cardImage="/images/message.jpg"
          cardAltName="housing-figure"
          cardHeading="Message us 24/7"
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
    </div>
    <div slot="secondary" class="p-[0.5rem] lg:p-0">
      <WeAreHereHelp {help} heading="We're here to help" />
      <ThingsYouShould {thinkKnow} disc="list-decimal" />
    </div>
  </NewPageLayout>
</section>

<style>
  .section {
    scroll-margin-top: 4rem; /* Adjust this value to match your navbar height */
  }
</style>
