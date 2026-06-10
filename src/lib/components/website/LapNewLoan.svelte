<script>
	let {
		data
	} = $props();



  import ThreeColumWithLeftHeading from "./ThreeColumWithLeftHeading.svelte";
  import { applicationData } from "$lib/stores/stores";
  
  import ThingsYouShould from "$lib/components/website/ThingsYouShould.svelte";
  import { onMount } from "svelte";
  import StickyNavbar from "./StickyNavbar.svelte";
  import NewPageLayout from "./NewPageLayout.svelte";
  import TwoColumnWithImage from "./TwoColumnWithImage.svelte";
  import ButtonBanner from "./ButtonBanner.svelte";
  import FeedbackCheck from "./FeedbackCheck.svelte";
  import AccordionWithLeftHeading from "./AccordionWithLeftHeading.svelte";
  import TwoColumnWithLeftHeading from "./TwoColumnWithLeftHeading.svelte";
  import HelpList from "./HelpList.svelte";
  
  import Seo from "./Seo.svelte";

  let activeSection = $state("");

  let help = [
    {
Heading: "Book an Appointment",
paragraph:
"Schedule a session with a loan specialist at your convenience.",
icon: "/icons/appointment.svg",
altTitle: "Appointment Icon",
link: "/appointment",
    },
    {
Heading: "Check Loan Offers",
paragraph:
"Get personalized loan offers in as little as 10 minutes, tailored to your financial profile.",
icon: "/icons/manageLoan2.svg",
altTitle: "Loan Offers Icon",
link: "/get-started/how-can-we-help",
    },
    {
Heading: "Contact Us",
paragraph:
"Fast-track your call and connect with a Digital DSA specialist.",
icon: "/icons/contact.svg",
altTitle: "Contact Icon",
link: "/contact",
    },
    {
Heading: "Message Us",
paragraph:
"Get instant assistance from our online support team or chat with a specialist.",
icon: "/icons/msg.svg",
altTitle: "Message Icon",
link: "/contact",
    },
  ];

  let navBarMedium = [
    "What is LAP",
    "Benefits",
    "Who Can Apply",
    "Things to Consider",
    "Tools & Calculators",
  ];

  let thinkKnow = {
    heading: "Things You Should Know",
    paraGraph: [
`<span class="font-semibold">Independent Facilitator:</span> Digital DSA acts as an independent loan facilitator and aggregator, connecting borrowers with licensed banks and NBFCs. We are not a financial institution and do not directly provide loans.`,
`<span class="font-semibold">Loan Approval:</span> Loan approval or rejection is solely at the discretion of the respective bank or NBFC. Digital DSA does not guarantee approval or offer assurances from any specific lender. All loans are subject to credit evaluation and applicable terms, conditions, fees, and charges.`,
`<span class="font-semibold">Liability:</span> Digital DSA is not liable for any loss, damage, or disruptions encountered by users during loan processing. The final decision made by the bank or NBFC is binding for both the user and Digital DSA.`,
`<span class="font-semibold">Important Information:</span> The provided details do not consider individual financial objectives, situations, or needs. Users should assess the suitability of the information before making any decisions. Exclusive offers apply only when loans are availed through Digital DSA under specified conditions.`,
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
  title="Loan Against Property – High Loan Amount & Low Interest"
  image="/images/lap-new-loan-blog.jpg"
  description="Get a Loan Against Property at low interest rates. Unlock up to 70% of property value with flexible terms & easy approval. Apply online now!"
  keywords="Loan Against Property, LAP Loan, Mortgage Loan, Property Loan, Home Equity Loan, Secured Loan, Loan Against Property Interest Rates, LAP Eligibility, Best LAP Offers, Loan Against Property Online, LAP Loan EMI Calculator, Mortgage Loan for Business, Loan Against Property for Self-Employed, Property Loan Process, Compare LAP Loan Offers"
/>

<section>
  <NewPageLayout
    pageData={{
      coverImage: "/images/lap-new-loan-blog.jpg",
      coverAlt: "hero-cover",
      heading: "Loan Against Property",
      para: `<span class="font-semibold">Unlock the Power of Your Property!<br>Get a Loan Against Property at Competitive Rates with Zero Hassles!</span>`,
    }}
    actionBtns={[
      {
        btnName: "Book Appointment",
        btnLink: "/appointment",
        btnColor: "",
      },
      {
        btnName: "Compare loan offers",
        btnLink: "/get-started/how-can-we-help",
        btnColor: "#ffcc00",
        btnClick: () => {
          $applicationData.LoanName = "Loan Against Property";
        },
      },
    ]}
  >
    <div class="hidden lg:block">
      <StickyNavbar
        navList={{
          items: [
            { name: "What is LAP", targetId: "what" },
            { name: "Benefits", targetId: "benefits" },
            { name: "Who can apply", targetId: "whoCanApply" },
            { name: "Things to consider", targetId: "things" },
            { name: "Tools & calculators", targetId: "calculators" },
          ],
          actionBtns: [
            {
              btnName: "Book Appointment",
              btnLink: "/appointment",
              btnColor: "",
            },
            {
              btnName: "Compare loan offers",
              btnLink: "/get-started/how-can-we-help",
              btnColor: "#ffcc00",
              btnClick: () => {
                $applicationData.LoanName = "Loan Against Property";
              },
            },
          ],
        }}
        {activeSection}
      />

      <div id="what" data-section="what">
        <ThreeColumWithLeftHeading
          contents={{
            heading: "What is LAP",
            cardData: [
              {
                id: "1",
                title: "Secured Loan",
                para: `A loan where you pledge your property as collateral to borrow funds. 
        It allows individuals or businesses to unlock the value of their owned property without selling it.`,
              },
              {
                id: "2",
                title: "High Loan Amount",
                para: "Get a loan of up to 60-70% of the market value of the property, depending on the lender's policies.",
              },
              {
                id: "3",
                title: "Usage Flexibility",
                para: `
          The borrowed amount can be used for various purposes, such as:</br></br>
          <ul class="list-disc flex flex-col gap-1 pl-4">
            <li>Expanding a business</li>
            <li>Paying for higher education</li>
            <li>Medical emergencies</li>
          
            <li><a href="/lap/what-is-debt-consolidation" class="underline underline-offset-4 text-{linkColor} hover:no-underline typography-body-md text-text-light cursor-pointer">Debt consolidation</a></li>
            <li>Funding big events like weddings or travel</li>
            <li>Unexpected expenses or business losses</li>
          </ul>
        `,
              },
              {
                id: "4",
                title: "Competitive Interest Rates",
                para: "Generally lower than personal loans or credit card debts, making it a cost-effective borrowing option.",
                btnName: "Compare LAP Offers",
                btnLink: "/get-started/how-can-we-help",
                btnColor: "#ffcc00",
                btnClick: () => {
                  $applicationData.LoanName = "Loan Against Property";
                },
              },
            ],
          }}
        />
      </div>

      <div id="benefits" data-section="benefits">
        <TwoColumnWithLeftHeading
          contents={{
            heading: "Benefits",
            secPara: `
      <ul class="list-disc flex flex-col gap-2 pl-2">
        <li>Lower Interest Rates: <span class="font-semibold">9% to 12% p.a.</span></li>
        <li>No Restrictions on Usage</li>
        <li>Higher Loan Amounts: <span class="font-semibold">Up to 60-70% of the property's market value.</span></li>
        <li>Flexible Repayment Options: <span class="font-semibold">Loan repayment terms from 5 to 15 years.</span></li>
      </ul>
    `,
            btnName: "Explore loan options",
            btnColor: "#ffcc00",
            btnBorder: "#4F4C4D",
            btnLink: "/get-started/how-can-we-help",
          }}
        />
      </div>
      <div id="whoCanApply" data-section="whoCanApply">
        <ThreeColumWithLeftHeading
          contents={{
            heading: "Eligibility & Documents Required",
            cardData: [
              {
                id: "1",
                title: "Eligibility Criteria",
                para: `
                <ul class="list-disc flex flex-col gap-2 pl-4">
                  <li><span class="font-semibold">Who can apply:</span> Salaried individuals, Self-employed professionals & Business owners.</li>
                  <li><span class="font-semibold">Property ownership:</span> The property must be legally owned by the borrower.</li>
                  <li><span class="font-semibold">Income proof:</span> Lenders evaluate the borrower's income stability to assess repayment capacity.</li>
                  <li><span class="font-semibold">CIBIL score:</span> A good credit score (typically above 750) increases the chances of approval and better interest rates.</li>
                </ul>
              `,
              },
              {
                id: "2",
                title: "Documents Required",
                para: `
                <ul class="list-disc flex flex-col gap-2 pl-4">
                  <li><span class="font-semibold">Identity proof:</span> Aadhaar, PAN, Passport.</li>
                  <li><span class="font-semibold">Address proof:</span> Aadhaar, Passport, Utility Bills.</li>
                  <li><span class="font-semibold">Income proof:</span> Salary Slips, Bank Statement, ITR, Audited financials.</li>
                  <li><span class="font-semibold">Property documents:</span> Title Deeds, Property Chain documents.</li>
                </ul>
                
              `,
              },
            ],
          }}
        />

        <TwoColumnWithImage
          contents={{
            cardImage: "/images/housing.jpg",
            cardAltName: "housing-figure",
            cardHeading: "What we provide",
            reverse: true,
          }}
        >
          <div class="typography-body-sm text-text-light">
            <ul class="list-disc pl-2 space-y-4">
              <li class="flex items-start gap-1">
                <img
                  src="/icons/circle-check.svg"
                  alt="circle-check-icon"
                  class="h-4 mt-1"
                />
                <span>
                  <strong>Compare offers from multiple banks/NBFCs:</strong> Help
                  users choose the best interest rate and tenure.
                </span>
              </li>
              <li class="flex items-start gap-1">
                <img
                  src="/icons/circle-check.svg"
                  alt="circle-check-icon"
                  class="h-4 mt-1"
                />
                <span>
                  <strong>Transparency & zero spam policy:</strong> No contact required
                  upfront; no spam calls.
                </span>
              </li>
              <li class="flex items-start gap-1">
                <img
                  src="/icons/circle-check.svg"
                  alt="circle-check-icon"
                  class="h-4 mt-1"
                />
                <span>
                  <strong>Easy-to-Use tools:</strong> Use our calculators to determine
                  your eligibility, affordability, and EMI for LAP.
                </span>
              </li>
              <li class="flex items-start gap-1">
                <img
                  src="/icons/circle-check.svg"
                  alt="circle-check-icon"
                  class="h-4 mt-1"
                />
                <span>
                  <strong>Assured cashback offers:</strong> Mention any ongoing cashback
                  promotions or benefits for applying via your platform.
                </span>
              </li>
              <li class="flex items-start gap-1">
                <img
                  src="/icons/circle-check.svg"
                  alt="circle-check-icon"
                  class="h-4 mt-1"
                />
                <span>
                  <strong>Doorstep services:</strong> Highlight your convenience
                  factor, like document collection and processing from home.
                </span>
              </li>
            </ul>
          </div>
        </TwoColumnWithImage>

        <ButtonBanner
          contents={{
            heading: "Unlock the Value of Your Property!",
            btnName: "Compare & Apply Now",
            btnLink: "/get-started/how-can-we-help",
            btnColor: "#ffcc00",
            btnBorder: "#4F4C4D",
            btnClick: () => {
              $applicationData.LoanName = "Loan Against Property";
            },
          }}
        />
      </div>

      <div id="things" data-section="things">
        <ThreeColumWithLeftHeading
          contents={{
            heading: "Important Considerations Before Applying",

            cardData: [
              {
                id: "1",
                title: "Points to Consider",
                para: `
        <ul class="list-disc flex flex-col gap-2 pl-4">
          <li>Failure to repay a Loan Against Property can put your property at risk. Use our expert tools to ensure a well-planned and manageable repayment strategy.</li>
          <li>The approval process may take longer than unsecured loans due to property verification and appraisal.</li>
          <li>EMIs can impact monthly finances, especially during financial stress. If you're unsure about immediate fund usage, consider an <span class="font-semibold">Overdraft Facility</span> for flexible withdrawals.</li>
        </ul>
        `,
              },
              {
                id: "2",
                title: "What to Expect",
                para: `
        When you seek our support, we assess your situation to provide the best possible assistance. To do this, we may require:
        <ul class="list-disc flex flex-col gap-2 pl-4">
          <li><span class="font-semibold">Details</span> about your profession, income, and expenses.</li>
          <li><span class="font-semibold">Documents</span> to verify your income and property ownership.</li>
        </ul>
        <br>
      
        `,
              },
            ],
          }}
        />
      </div>

      <div id="calculators" data-section="calculators">
        <ThreeColumWithLeftHeading
          contents={{
            heading: "Tools & Calculators",
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

        <div class="px-[0.5rem] lg:px-[4rem]">
          <AccordionWithLeftHeading
            contents={{
              heading: "Frequently Asked Questions",
              accordions: [
                {
                  question:
                    "What is the maximum loan amount I can get against my property?",
                  answer:
                    "You can get up to 60-70% of your property’s market value, depending on the lender.",
                },
                {
                  question: "How is my property valued?",
                  answer:
                    "Lenders conduct a thorough valuation based on current market trends and location.",
                },
                {
                  question:
                    "Can I apply for LAP if my property is under a loan?",
                  answer:
                    "Yes, lenders may offer LAP with a balance transfer of the existing loan.",
                },
                {
                  question: "What is the difference between LAP and DOD?",
                  answer: `
          <span class="font-semibold">LAP (Loan Against Property)</span> is a term loan where you get a lump sum amount and repay in fixed EMIs, ideal for long-term needs. 
          <span class="font-semibold">DOD (Drop-Line Overdraft)</span> is a flexible credit line where you withdraw as needed, pay interest only on the used amount, and the limit reduces over time.
          <a href="#" class="text-blue-600 hover:underline">Read more about LAP vs. DOD.</a>
        `,
                },
              ],
            }}
          />
        </div>
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
            <div id="ready" class="bg-white text-black">
              <ThreeColumWithLeftHeading
                contents={{
                  heading: "What is LAP",
                  cardData: [
                    {
                      id: "1",
                      title: "Secured Loan",
                      para: `A loan where you pledge your property as collateral to borrow funds. 
        It allows individuals or businesses to unlock the value of their owned property without selling it.`,
                    },
                    {
                      id: "2",
                      title: "High Loan Amount",
                      para: "Get a loan of up to 60-70% of the market value of the property, depending on the lender's policies.",
                    },
                    {
                      id: "3",
                      title: "Usage Flexibility",
                      para: `
          The borrowed amount can be used for various purposes, such as:</br></br>
          <ul class="list-disc flex flex-col gap-1 pl-4">
            <li>Expanding a business</li>
            <li>Paying for higher education</li>
            <li>Medical emergencies</li>
          
            <li><a href="/lap/what-is-debt-consolidation" class="underline underline-offset-4 text-{linkColor} hover:no-underline typography-body-md text-text-light cursor-pointer">Debt consolidation</a></li>
            <li>Funding big events like weddings or travel</li>
            <li>Unexpected expenses or business losses</li>
          </ul>
        `,
                    },
                    {
                      id: "4",
                      title: "Competitive Interest Rates",
                      para: "Generally lower than personal loans or credit card debts, making it a cost-effective borrowing option.",
                      btnName: "Compare LAP Offers",
                      btnLink: "/get-started/how-can-we-help",
                      btnColor: "#ffcc00",
                      btnClick: () => {
                        $applicationData.LoanName = "Loan Against Property";
                      },
                    },
                  ],
                }}
              />
            </div>
          {:else if index == 1}
            <div id="find" class="bg-white text-black">
              <TwoColumnWithLeftHeading
                contents={{
                  heading: `Benefits`,
                  secPara: `<ul class="list-disc flex flex-col gap-2 pl-2">
                 <li>Lower Interest Rates : <span class="font-semibold">9% to 12% p.a..</span>
                 <li>No Restrictions on Usage 
                 
                 <li>Higher Loan Amounts : <span class="font-semibold">Up to 60-70% of the property's market value.</span>
                 <li>Flexible Repayment Options : <span class="font-semibold">Loan repayment terms from 5 to 15 years.</span></li>`,
                  btnName: "Explore loan options",
                  btnColor: "#ffcc00",
                  btnBorder: "#4F4C4D",
                  btnLink: "/get-started/how-can-we-help",
                }}
              />
            </div>
          {:else if index == 2}
            <div id="next" class="bg-white text-black">
              <ThreeColumWithLeftHeading
                contents={{
                  heading: "Eligibility & documents Required",

                  cardData: [
                    {
                      id: "1",
                      title: "Eligibility Criteria",
                      para: `
  
             <ul class="list-disc flex flex-col gap-2 pl-4">
             <li><span class="font-semibold">Who can apply:</span> Salaried individuals, Self-employed professionals & Business owners
  .
             <li><span class="font-semibold">Property ownership:</span> The property must be legally owned by the borrower.
             <li><span class="font-semibold">Income proof:</span> Lenders evaluate the borrower's income stability to assess repayment capacity.
             <li><span class="font-semibold">CIBIL score:</span> A good credit score (typically above 750) increases the chances of approval and better interest rates.</li>`,
                    },
                    {
                      id: "2",
                      title: "Documents Required",
                      para: `
            <ul class="list-disc flex flex-col gap-2 pl-4">
            <li> <span class="font-semibold">Identity proof:</span> Aadhaar, PAN, Passport.
            <li> <span class="font-semibold">Address proof:</span> Aadhaar, Passport, Utility Bills.
            <li> <span class="font-semibold">Income proof:</span> Salary Slips, Bank Statement, ITR, Audited financials.
            `,
                      // linkName:
                      //       "Tell me more about documents required",

                      //     url: "",
                    },
                  ],
                }}
              />

              <TwoColumnWithImage
                contents={{
                  cardImage: "/images/housing.jpg",
                  cardAltName: "housing-figure",
                  cardHeading: "What we provide",
                  reverse: true,
                }}
              >
                <div class="typography-body-sm text-text-light">
                  <ul class="list-disc pl-2 space-y-4">
                    <li class="flex items-start gap-1">
                      <img
                        src="/icons/circle-check.svg"
                        alt="circle-check-icon"
                        class="h-4 mt-1"
                      />
                      <span>
                        <strong
                          >Compare offers from multiple banks/NBFCs:</strong
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
                        <strong>Transparency & zero spam policy:</strong> No contact
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
                        <strong>Easy-to-Use tools:</strong> Use our calculators to
                        determine your eligibility, affordability, and EMI for LAP.
                      </span>
                    </li>
                    <li class="flex items-start gap-1">
                      <img
                        src="/icons/circle-check.svg"
                        alt="circle-check-icon"
                        class="h-4 mt-1"
                      />
                      <span>
                        <strong>Assured cashback offers:</strong> Mention any ongoing
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
                        <strong>Doorstep services:</strong> Highlight your convenience
                        factor, like document collection and processing from home.
                      </span>
                    </li>
                  </ul>
                </div>
              </TwoColumnWithImage>
              <ButtonBanner
                contents={{
                  heading: "Unlock the Value of Your Property!",
                  btnName: "Compare & Apply Now",
                  btnLink: "/get-started/how-can-we-help",
                  btnColor: "#ffcc00",
                  btnBorder: "#4F4C4D",
                  btnClick: () => {
                    $applicationData.LoanName = "Loan Against Property";
                  },
                }}
              />
            </div>
          {:else if index == 3}
            <div id="things" class="bg-white text-black">
              <ThreeColumWithLeftHeading
                contents={{
                  heading: "Important Considerations Before Applying",

                  cardData: [
                    {
                      id: "1",
                      title: "Points to Consider",
                      para: `
        <ul class="list-disc flex flex-col gap-2 pl-4">
          <li>Failure to repay a Loan Against Property can put your property at risk. Use our expert tools to ensure a well-planned and manageable repayment strategy.</li>
          <li>The approval process may take longer than unsecured loans due to property verification and appraisal.</li>
          <li>EMIs can impact monthly finances, especially during financial stress. If you're unsure about immediate fund usage, consider an <span class="font-semibold">Overdraft Facility</span> for flexible withdrawals.</li>
        </ul>
        `,
                    },
                    {
                      id: "2",
                      title: "What to Expect",
                      para: `
        When you seek our support, we assess your situation to provide the best possible assistance. To do this, we may require:
        <ul class="list-disc flex flex-col gap-2 pl-4">
          <li><span class="font-semibold">Details</span> about your profession, income, and expenses.</li>
          <li><span class="font-semibold">Documents</span> to verify your income and property ownership.</li>
        </ul>
        <br>
      
        `,
                    },
                  ],
                }}
              />
            </div>
          {:else if index == 4}
            <div id="calculators" class="bg-white text-black">
              <ThreeColumWithLeftHeading
                contents={{
                  heading: "Tools & Calculators",
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
              <div class="px-[0.5rem] lg:px-[4rem]">
                <AccordionWithLeftHeading
                  contents={{
                    heading: "Frequently Asked Questions",
                    accordions: [
                      {
                        question:
                          "What is the maximum loan amount I can get against my property?",
                        answer:
                          "You can get up to 60-70% of your property’s market value, depending on the lender.",
                      },
                      {
                        question: "How is my property valued?",
                        answer:
                          "Lenders conduct a thorough valuation based on current market trends and location.",
                      },
                      {
                        question:
                          "Can I apply for LAP if my property is under a loan?",
                        answer:
                          "Yes, lenders may offer LAP with a balance transfer of the existing loan.",
                      },
                      {
                        question: "What is the difference between LAP and DOD?",
                        answer: `
          <span class="font-semibold">LAP (Loan Against Property)</span> is a term loan where you get a lump sum amount and repay in fixed EMIs, ideal for long-term needs. 
          <span class="font-semibold">DOD (Drop-Line Overdraft)</span> is a flexible credit line where you withdraw as needed, pay interest only on the used amount, and the limit reduces over time.
          <a href="#" class="text-blue-600 hover:underline">Read more about LAP vs. DOD.</a>
        `,
                      },
                    ],
                  }}
                />
              </div>
            </div>
          {/if}
        </details>
      {/each}
    </div>

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
              para: "Book instantly to speak to a LAP specialist at a time that suits you",
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
          heading: "Things you should know",
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
