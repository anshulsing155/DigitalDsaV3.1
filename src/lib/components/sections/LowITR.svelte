<script>
	let {
		data
	} = $props();



  import ThreeColumWithLeftHeading from './ThreeColumWithLeftHeading.svelte';
  import { applicationData } from "$lib/stores/stores";
  import WeAreHereHelp from '$lib/components/sections/WeAreHereHelp.svelte';
  import ThingsYouShould from '$lib/components/sections/ThingsYouShould.svelte';
  import { onMount } from "svelte";
  import StickyNavbar from '../layout/StickyNavbar.svelte';
  import NewPageLayout from '../layout/NewPageLayout.svelte';
  import TwoColumnWithImage from './TwoColumnWithImage.svelte';
  import ButtonBanner from './ButtonBanner.svelte';
  import FeedbackCheck from '../ui/FeedbackCheck.svelte';

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
    "Getting ready",
    "Find a home",
    "What's next?",
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

<section>
  <NewPageLayout
    pageData={{
      coverImage: "/images/familyWorkWithSmile.jpg",
      altName: "hero-cover",
      heading: "Low ITR",
      para: `<span class="font-semibold">Switch, Save & Gain!</span>`,

      actionBtn: [
        {
          btnName: "Compare LAP offers",
          btnLink: "/get-started/how-can-we-help",
          btnColor: "#ffcc00",
          onClick: () => {
            $applicationData.LoanName = "Loan Against Property";
          },
        },
        {
          btnName: `How much I can save`,
          btnLink: `/calculators/balance-transfer-calculator`,
        },
      ],
    }}
  >
    <div class="hidden lg:block">
      <StickyNavbar
        navList={{
          items: [
            {
              name: "Why Balance Transfer",
              targetId: "why",
            },

            {
              name: "How Digital DSA Helps",
              targetId: "how",
            },
            {
              name: "Documents Needed",
              targetId: "documents",
            },
            {
              name: "Things to consider",
              targetId: `things`,
            },
            {
              name: "Tools & calculators",
              targetId: `calculators`,
            },
          ],
          actionBtns: [
            {
              btnName: "Book appointment",
              btnLink: "/get-started/how-can-we-help",
              btnColor: "#ffcc00",
              btnClick: () => {
                $applicationData.LoanName = "Loan Against Property";
              },
            },
          ],
        }}
        {activeSection}
      ></StickyNavbar>
    </div>

    <div id="why" data-section="why">
      <ThreeColumWithLeftHeading
        contents={{
          heading: "Why Balance Transfer",

          cardData: [
            {
              id: "1",
              title:
                "Advantages: <br>Why Consider a Balance Transfer for Your LAP",
              para: `<ul class="list-disc flex flex-col gap-2 pl-4">
                <li>Lower interest rates <span class="font-semibold">(9% to 12% p.a.)</span> leading to reduced EMIs.</li>
                <li>Top-up loan option to meet personal or business expenses.</li>
                <li>Save on overall interest cost.</li>
                <li>Flexible repayment options to reduce tenure.</li>
                <li>Unlock better features like prepayment flexibility and zero hidden fees.</li>
                </ul>
                `,
            },

            {
              id: "2",
              title: "Be Informed:<br> Risks You Should Be Aware Of",
              para: `<ul class="list-disc flex flex-col gap-2 pl-4">
                
                <li>Balance transfer involves processing fees and charges by the new lender.</li>
  <li>Any delay in the process can lead to penalties from the current lender. </li>
  <li>Incorrect documentation may result in rejection. </li>
  <li>Prepayment charges might apply from your existing lender. </li>
  <li>Potential EMI fluctuation if the new lender has floating rates.</li>
  </ul>
  
                `,
            },
          ],
        }}
      />

      <ButtonBanner
        contents={{
          heading: `Want to Balance Transfer your LAP`,
          btnName: "Show me offers",
          btnLink: "/get-started/how-can-we-help",
          btnColor: "#ffcc00",
          btnClick: () => {
            $applicationData.LoanName = "Loan Against Property";
          },
        }}
      />
    </div>

    <div id="how" data-section="how">
      <TwoColumnWithImage
        contents={{
          cardImage: "/images/housing.jpg",
          cardAltName: "housing-figure",
          cardHeading: "How we Help",
          reverse: true,
        }}
      >
        <div class="typography-body-md text-[var(--form-text-secondary)]">
          <ul class="list-disc text-gray-700 space-y-4">
            <li class="flex items-start gap-1">
              <img src="/icons/circle-check.svg" alt="circle-check-icon" class="h-4 mt-1" />
              <span>
                <strong>Compare Offers from Multiple Banks/NBFCs:</strong> Help users
                choose the best interest rate and tenure.
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
                your eligibility, affordability, and EMI for LAP.
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
                <strong>Doorstep Services:</strong> Highlight your convenience factor,
                like document collection and processing from home.
              </span>
            </li>
          </ul>
        </div>
      </TwoColumnWithImage>
    </div>

    <div
      id="documents"
      data-section="documents"
      class="px-[1rem] lg:px-[4rem] border-b border-[var(--form-border)]"
    >
      <ThingsYouShould
        thinkKnow={{
          heading: "What documents you need to arrange:",
          paraGraph: [
            `<span class="font-semibold">Identity Proof:</span> <br>Aadhaar, PAN, Passport.`,
            `<span class="font-semibold">Address Proof:</span><br> Aadhaar, Passport, Utility Bills.`,
            `<span class="font-semibold">Income Proof:</span> <br> Salary Slips, Bank Statement, ITR, Audited financials.`,
            `<span class="font-semibold">Property Documents:</span> <br> Title Deeds, Property Chain documents.`,
            `<span class="font-semibold">Foreclosure Letter:</span> <br> List of original document (LOD) and Foreclosure Letter from Current Lender.`,
          ],
        }}
        disc="list-disc"
      />
    </div>
    <ButtonBanner
      contents={{
        heading: `Struggling with loan approval due to <span class="underline decoration-primary underline-offset-4"> low ITR</span> ? `,
        btnName: "Get help",
        BtnBorder: `#4F4C4D`,
        btnColor: "#ffcc00",
        btnLink: "/appointment",
      }}
    />

    <div id="things" data-section="things">
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
             <li>If not planned carefully, EMIs can affect monthly finances, especially during financial stress. In such case you opt for <span class="font-semibold">Overdraft facility</span> if you are not sure about immediate usage of entire funds
      
    </ul>
  
             `,
            },
            {
              id: "2",
              title: "What to expect",
              para: `When you reach out for support, we’ll work with you to understand your situation and determine the best way to assist you. To help us do that, we may ask for:
            <ul class="list-disc flex flex-col gap-2 pl-4">
            <li> <span class="font-semibold">Information</span> about your profession, income and expenses.</li>
            <li> <span class="font-semibold">Documents</span> to support your income and property ownership.</li>
            </ul>
             `,
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
            <li><a class="underline underline-offset-4 text-linkColor hover:no-underline typography-body-md text-[var(--form-text-secondary)] cursor-pointer" href="/get-started/how-can-we-help"</a>Check bank offers
            </li>
            
            <li><a class="underline underline-offset-4 text-linkColor hover:no-underline typography-body-md text-[var(--form-text-secondary)] cursor-pointer" href="/planners/budget-planner"</a>Budget Planner</li>
            <li><a class="underline underline-offset-4 text-linkColor hover:no-underline typography-body-md text-[var(--form-text-secondary)] cursor-pointer" href="/calculators/eligibility-calculator"</a>How much I can borrow</li> </ul>`,
            },
            {
              id: "2",
              title: "Calculators",
              para: `<ul class="list-disc flex flex-col gap-1 pl-4">
          <li><a class="underline underline-offset-4 text-linkColor hover:no-underline typography-body-md text-[var(--form-text-secondary)] cursor-pointer" href="/planners/part-payment-planner"</a>Part-payment Calculator</li>
          <li><a class="underline underline-offset-4 text-linkColor hover:no-underline typography-body-md text-[var(--form-text-secondary)] cursor-pointer" href="/calculators/emi-calculator"</a>How much EMI I can pay</li>
          <li><a class="underline underline-offset-4 text-linkColor hover:no-underline typography-body-md text-[var(--form-text-secondary)] cursor-pointer" href="/planners/flexible-emi-planner"</a>Optimize my loan tenure</li>`,
            },
          ],
        }}
      />
    </div>
    <FeedbackCheck />

    <div slot="secondary">
      <WeAreHereHelp {help} heading="We're here to help" />
      <ThingsYouShould {thinkKnow} disc="list-decimal" />
    </div>
  </NewPageLayout>
</section>
