<script>
	let {
		pageData = {
    coverImage: "/images/bank-loan-rejection.png",
    altName: "bank loan rejection scene",
    heading: "Why Banks Hesitate to Lend to Police & Lawyers",
    para: `<div class="text-center mt-4">
                        <blockquote class="relative text-gray-800 italic">
                            <span
                                class="text-3xl font-serif absolute left-0 -top-3"
                                >“</span
                            >
                            It’s not about your profession—it’s about risk. Let’s uncover why banks say no and how you can change that!
                            <span
                                class="text-3xl font-serif absolute right-0 -bottom-6"
                                >”</span
                            >
                        </blockquote>
                    </div>`,
    actionBtns: [
      {
        btnName: "Book appointment",
        btnLink: "/appointment",
      },
      {
        btnName: "Get loan advice",
        btnLink: "/get-started/loan-options",
        btnColor: "#ffcc00",
        animation: true,
      },
    ],
  }
	} = $props();


  import NewPageLayout from "./NewPageLayout.svelte";
  import TwoColumnWithLeftHeading from "./TwoColumnWithLeftHeading.svelte";
  import PaymentTable from "./PaymentTable.svelte";
  import TwoColumnWithImage from "./TwoColumnWithImage.svelte";
  import StickyNavbar from "./StickyNavbar.svelte";
  import { onMount } from "svelte";
  import AboveTitleWithBlackCard from "./AboveTitleWithBlackCard.svelte";
  import Button from "./Button.svelte";
  import HelpList from "./HelpList.svelte";
  import ThingsYouKnow from "./ThingsYouKnow.svelte";
  import Seo from "./Seo.svelte";
  let activeSection = $state("");

  let firstTableData = [
    {
columnName: [
"<div class='flex gap-2 items-center'><img class='h-5' src='/icons/features.svg' alt='gear icon'> Factor </div>",
"<div class='flex gap-2 items-center'><img class='h-5' src='/icons/police.svg' alt='police icon'> Police </div>",
"<div class='flex gap-2 items-center'> <img class='h-5 w-8' src='/icons/lawyer.svg' alt='lawyer icon'> Lawyers </div>",
"<div class='flex gap-2 items-center'> <img class='h-5' src='/icons/otherProf.svg' alt='other icon'> Other Professions </div>",
],
rowData: [
{
"<span class='font-semibold flex gap-4 items-center'><img class='h-6' src='/icons/riskFactor.svg' alt='risk icon'> Perceived Risk </span>":
[
"High due to recovery concerns",
"High due to legal expertise",
"Varies by income stability",
],
},
{
"<span class='font-semibold flex gap-4 items-center'><img class='h-6' src='/icons/coin.svg' alt='income icon'> Income Documentation </span>":
[
"Multiple deductions, low visibility",
"Cash-based, poor documentation",
"Typically salaried, well-documented",
],
},
{
"<span class='font-semibold flex gap-4 items-center'><img class='h-6' src='/icons/propertyEligibility.svg' alt='recovery icon'> Recovery Ease </span>":
[
"Sensitive, harassment risks",
"Legal threats complicate recovery",
"Generally straightforward",
],
},
{
"<span class='font-semibold flex gap-4 items-center'><img class='h-6' src='/icons/payment.svg' alt='credit icon'> Credit Awareness </span>":
[
"Often low, frequent transfers",
"Varies, but documentation issues",
"Usually higher, stable profiles",
],
},
],
    },
  ];

  // mobile-accordion
  let navBarMedium = [
    "Why the issue",
    "Compare risks",
    "Solutions",
    "Tools & resources",
  ];
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
detailsElement.scrollIntoView({
behavior: "smooth",
block: "start",
});
    }, 100);
  };

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
if (rect.top <= 100 && rect.bottom >= 200) {
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

;
</script>

<Seo
  type="WebPage"
  title="Why Banks Avoid Lending to Police & Lawyers: Risks & Solutions"
  image={pageData.coverImage}
  description="Discover why banks hesitate to lend to police and lawyers due to recovery risks and documentation issues. Learn how to improve your loan eligibility with DigitalDSA.com!"
  keywords="Police Loan Rejection, Lawyer Loan Issues, Bank Loan Risks, Personal Loan for Police, Business Loan for Lawyers, Loan Recovery Challenges, Improve Loan Eligibility, CIBIL Score Tips, ITR Filing for Loans, DigitalDSA Loan Advice"
/>

<section class="content">
  <NewPageLayout {pageData}>
    <!-- desktop view -->

    <div class="hidden lg:block">
      <div>
        <StickyNavbar
          navList={{
            items: [
              {
                name: "Why the issue",
                targetId: "issue",
              },
              {
                name: "Compare risks",
                targetId: "compare",
              },
              {
                name: "Solutions",
                targetId: "solutions",
              },
              {
                name: "Tools & resources",
                targetId: "resources",
              },
            ],
            actionBtns: [
              {
                btnName: "Book appointment",
                btnLink: "/appointment",
              },
              {
                btnName: "Get loan advice",
                btnColor: "#ffcc00",
                btnLink: "/get-started/loan-options",
              },
            ],
          }}
          {activeSection}
        ></StickyNavbar>
      </div>

      <div id="issue" data-section="issue" class="section">
        <TwoColumnWithLeftHeading
          contents={{
            heading: "Why Banks Say No?",
            listTopPara: `Let’s break down the real reasons banks hesitate:`,
            list: [
              {
                heading: `Recovery Concerns`,
                desc: `<ul class="list-disc list-inside mb-2 mt-2">
                                        <li><b>Police:</b> Recovery agents fear harassment or misuse of power accusations.</li>
                                        <li><b>Lawyers:</b> Legal expertise makes recovery tricky, with threats of lawsuits.</li>
                                        </ul>`,
              },
              {
                heading: `Practical Challenges`,
                desc: `<ul class="list-disc list-inside mb-2 mt-2">
                                        <li><b>Police:</b> Salary deductions, frequent transfers, low credit awareness.</li>
                                        <li><b>Lawyers:</b> Cash-based income, poor documentation, no fixed salary.</li>
                                        </ul>`,
              },
              {
                heading: `Risk Perception`,
                desc: `<ul class="list-disc list-inside mb-2 mt-2">
                                        <li>Banks don’t blacklist, but they flag these professions as high-risk.</li>
                                        <li>Unsecured loans are especially tough without strong financials.</li>
                                        </ul>`,
              },
            ],
          }}
        />
      </div>

      <div id="compare" data-section="compare" class="section">
        <div
          class="py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-[var(--form-border)]"
        >
          <div class="">
            <h2
              class="grid mb-[4rem] typography-h2 text-text-main text-center"
            >
              <p>Lending Risks</p>
              <span
                class="underline decoration-4 underline-offset-4 decoration-btnBg"
                >The Breakdown</span
              >
            </h2>
          </div>
          <div class="">
            {#each firstTableData as tableData}
              <PaymentTable {tableData} />
            {/each}
          </div>
          <p class="typography-body-md text-text-light mt-14 text-center">
            💡 <span class="font-semibold mr-2">Fun Fact :</span> Banks approve over 80% of loans for salaried professionals with stable income, but police and lawyers face higher scrutiny due to recovery risks.
          </p>
        </div>

        <div class="mt-[4rem]">
          <p
            class="typography-h2 text-text-main text-center mb-[2rem]"
          >
            Real-Life Scenarios: What Happened to Others
            <br /><span
              class="typography-body-md text-text-light mt-14 text-center"
              >Here’s how others navigated loan challenges</span
            >
          </p>
          <TwoColumnWithImage
            contents={{
              cardImage: "/images/police-officer-loan.png",
              cardAltName: "police officer discussing loan",
              cardHeading: "The Police Officer’s Story",
            }}
          >
            <div class="text-center mt-4">
              <blockquote class="relative text-gray-800 italic">
                <span class="text-4xl font-serif absolute -left-12 -top-3"
                  >“</span
                >
                I applied for a ₹5 lakh personal loan but got rejected twice. My salary had deductions, and my CIBIL score was average. With DigitalDSA’s help, I filed clean ITRs for two years and improved my score to 750. My third application was approved, and now I’m repaying comfortably!
                <span class="text-4xl font-serif absolute -right-4 -bottom-6"
                  >”</span
                >
              </blockquote>
            </div>
          </TwoColumnWithImage>

          <TwoColumnWithImage
            contents={{
              cardImage: "/images/lawyer-loan-consultation.png",
              cardAltName: "lawyer in loan consultation",
              cardHeading: "The Lawyer’s Story",
              reverse: true,
            }}
          >
            <div class="text-center mt-4">
              <blockquote class="relative text-gray-800 italic">
                <span
                  class="text-4xl font-serif absolute -left-8 -top-3"
                  >“</span
                >
                As a lawyer, my income was mostly cash-based, and banks kept rejecting my loan applications. DigitalDSA guided me to document my income properly and maintain bank statements. I offered collateral for a business loan, and it was approved within weeks!
                <span
                  class="text-4xl font-serif absolute -right-2 -bottom-6"
                  >”</span
                >
              </blockquote>
              <p class="mt-10">
                <a
                  class="underline hover:no-underline underline-offset-4"
                  href="/calculators/loan-eligibility-calculator"
                  >Check Our Loan Eligibility Calculator</a
                >
              </p>
            </div>
          </TwoColumnWithImage>
        </div>
      </div>

      <div id="solutions" class="section" data-section="solutions">
        <TwoColumnWithLeftHeading
          contents={{
            heading: "How to Improve Your Loan Chances",
            listTopPara: `Follow these steps to boost your eligibility:`,
            list: [
              {
                heading: `File Proper ITRs`,
                desc: `Submit Income Tax Returns for 2–3 years to show consistent income. Ensure all income is reported, even cash-based earnings.`,
              },
              {
                heading: `Maintain a Healthy CIBIL Score`,
                desc: `Aim for a score above 700. Pay credit card bills and EMIs on time to avoid negative marks.`,
              },
              {
                heading: `Document Income Clearly`,
                desc: `Keep income visible in bank statements. Avoid large cash transactions that can’t be traced.`,
              },
              {
                heading: `Offer Collateral`,
                desc: `For large loans, provide assets like property or fixed deposits to reduce bank risk.`,
              },
            ],
            listSecPara: `💡<span class="font-semibold mr-2">Pro Tip : </span>Work with a loan advisor like DigitalDSA to streamline documentation and improve approval odds.`,
          }}
        />
      </div>

      <div data-section="resources" id="resources" class="section">
        <AboveTitleWithBlackCard
          contents={{
            heading: "Loan Tools & Calculators",
            xlGridCol: 4,
            borderBottom: true,
            cards: [
              {
                heading: "Loan Eligibility Calculator",
                icon: "/icons/calc.svg",
                iconAltName: "icon-calc",
                url: "/calculators/loan-eligibility-calculator",
              },
              {
                heading: "EMI Calculator",
                icon: "/icons/lap.svg",
                iconAltName: "loan-icon",
                url: "/calculators/emi-calculator",
              },
              {
                heading: "CIBIL Score Checker",
                icon: "/icons/apply.svg",
                iconAltName: "icons-apply",
                url: "/tools/cibil-score-checker",
              },
              {
                heading: "Loan Comparison Tool",
                icon: "/icons/calc.svg",
                iconAltName: "icons-calc",
                url: "/tools/loan-comparison",
              },
            ],
          }}
        />
      </div>
    </div>

    <!-- mobile view -->
    <div class="block lg:hidden">
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

          {#if index === 0}
            <div
              id="issue"
              data-section="issue"
              class="section bg-white text-black"
            >
              <TwoColumnWithLeftHeading
                contents={{
                  heading: "Why Banks Say No?",
                  listTopPara: `Let’s break down the real reasons banks hesitate:`,
                  list: [
                    {
                      heading: `Recovery Concerns`,
                      desc: `<ul class="list-disc list-inside mb-2 mt-2">
                                                <li><b>Police:</b> Recovery agents fear harassment or misuse of power accusations.</li>
                                                <li><b>Lawyers:</b> Legal expertise makes recovery tricky, with threats of lawsuits.</li>
                                                </ul>`,
                    },
                    {
                      heading: `Practical Challenges`,
                      desc: `<ul class="list-disc list-inside mb-2 mt-2">
                                                <li><b>Police:</b> Salary deductions, frequent transfers, low credit awareness.</li>
                                                <li><b>Lawyers:</b> Cash-based income, poor documentation, no fixed salary.</li>
                                                </ul>`,
                    },
                    {
                      heading: `Risk Perception`,
                      desc: `<ul class="list-disc list-inside mb-2 mt-2">
                                                <li>Banks don’t blacklist, but they flag these professions as high-risk.</li>
                                                <li>Unsecured loans are especially tough without strong financials.</li>
                                                </ul>`,
                    },
                  ],
                }}
              />
            </div>
          {:else if index === 1}
            <div
              id="compare"
              data-section="compare"
              class="section bg-white text-black"
            >
              <div
                class="py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full border-b border-[var(--form-border)]"
              >
                <div class="">
                  <h2
                    class="grid mb-[4rem] typography-h2 text-text-main text-center"
                  >
                    <p>Lending Risks</p>
                    <span
                      class="underline decoration-4 underline-offset-4 decoration-btnBg"
                      >The Breakdown</span
                    >
                  </h2>
                </div>
                <div class="">
                  {#each firstTableData as tableData}
                    <PaymentTable {tableData} />
                  {/each}
                </div>
                <p class="typography-body-md text-text-light mt-14 text-center">
                  💡 <span class="font-semibold mr-2">Fun Fact :</span> Banks approve over 80% of loans for salaried professionals with stable income, but police and lawyers face higher scrutiny due to recovery risks.
                </p>
              </div>

              <div class="mt-[4rem]">
                <p
                  class="typography-h2 text-text-main text-center mb-[2rem]"
                >
                  Real-Life Scenarios: What Happened to Others
                  <br /><span
                    class="typography-body-md text-text-light mt-14 text-center"
                    >Here’s how others navigated loan challenges</span
                  >
                </p>
                <TwoColumnWithImage
                  contents={{
                    cardImage: "/images/police-officer-loan.png",
                    cardAltName: "police officer discussing loan",
                    cardHeading: "The Police Officer’s Story",
                  }}
                >
                  <div class="md:text-center mt-4">
                    <blockquote class="relative text-gray-800 italic">
                      I applied for a ₹5 lakh personal loan but got rejected twice. My salary had deductions, and my CIBIL score was average. With DigitalDSA’s help, I filed clean ITRs for two years and improved my score to 750. My third application was approved, and now I’m repaying comfortably!
                    </blockquote>
                  </div>
                </TwoColumnWithImage>

                <TwoColumnWithImage
                  contents={{
                    cardImage: "/images/lawyer-loan-consultation.png",
                    cardAltName: "lawyer in loan consultation",
                    cardHeading: "The Lawyer’s Story",
                    reverse: true,
                  }}
                >
                  <div class="md:text-center mt-4">
                    <blockquote class="relative text-gray-800 italic">
                      As a lawyer, my income was mostly cash-based, and banks kept rejecting my loan applications. DigitalDSA guided me to document my income properly and maintain bank statements. I offered collateral for a business loan, and it was approved within weeks!
                    </blockquote>
                    <p class="mt-10">
                      <a
                        href="/calculators/loan-eligibility-calculator"
                        class="underline"
                        >Check Our Loan Eligibility Calculator</a
                      >
                    </p>
                  </div>
                </TwoColumnWithImage>
              </div>
            </div>
          {:else if index === 2}
            <div
              id="solutions"
              class="section bg-white text-black"
              data-section="solutions"
            >
              <TwoColumnWithLeftHeading
                contents={{
                  heading: "How to Improve Your Loan Chances",
                  listTopPara: `Follow these steps to boost your eligibility:`,
                  list: [
                    {
                      heading: `File Proper ITRs`,
                      desc: `Submit Income Tax Returns for 2–3 years to show consistent income. Ensure all income is reported, even cash-based earnings.`,
                    },
                    {
                      heading: `Maintain a Healthy CIBIL Score`,
                      desc: `Aim for a score above 700. Pay credit card bills and EMIs on time to avoid negative marks.`,
                    },
                    {
                      heading: `Document Income Clearly`,
                      desc: `Keep income visible in bank statements. Avoid large cash transactions that can’t be traced.`,
                    },
                    {
                      heading: `Offer Collateral`,
                      desc: `For large loans, provide assets like property or fixed deposits to reduce bank risk.`,
                    },
                  ],
                  listSecPara: `💡<span class="font-semibold mr-2">Pro Tip : </span>Work with a loan advisor like DigitalDSA to streamline documentation and improve approval odds.`,
                }}
              />
            </div>
          {:else if index === 3}
            <div
              data-section="resources"
              id="resources"
              class="section bg-white text-black"
            >
              <AboveTitleWithBlackCard
                contents={{
                  heading: "Loan Tools & Calculators",
                  xlGridCol: 4,
                  borderBottom: true,
                  cards: [
                    {
                      heading: "Loan Eligibility Calculator",
                      icon: "/icons/calc.svg",
                      iconAltName: "icon-calc",
                      url: "/calculators/loan-eligibility-calculator",
                    },
                    {
                      heading: "EMI Calculator",
                      icon: "/icons/lap.svg",
                      iconAltName: "loan-icon",
                      url: "/calculators/emi-calculator",
                    },
                    {
                      heading: "CIBIL Score Checker",
                      icon: "/icons/apply.svg",
                      iconAltName: "icons-apply",
                      url: "/tools/cibil-score-checker",
                    },
                    {
                      heading: "Loan Comparison Tool",
                      icon: "/icons/calc.svg",
                      iconAltName: "icons-calc",
                      url: "/tools/loan-comparison",
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
        cardImage: "/images/message.jpg",
        cardAltName: "loan-assistance-figure",
        cardHeading: "Message us 24/7",
        reverse: true,
      }}
    >
      <p>
        Need help with your loan application? Message us anytime for expert guidance. Our team at DigitalDSA.com is ready to assist with documentation, eligibility, and finding the best loan options tailored to your needs. We’re here 24/7 to support you!
      </p>
      <Button link="/contact" btnBorder="#4F4C4D" btnName="Message us" />
    </TwoColumnWithImage>
    <div slot="secondary" class="px-2">
      <HelpList
        contents={{
          heading: `We're here to help`,
          xlGridCol: 4,
          borderBottom: false,
          cards: [
            {
              heading: "Know your loan eligibility",
              para: "Book a session with a loan specialist to understand your borrowing power.",
              icon: "/icons/appointment.svg",
              altName: "appointment Icon",
              url: "/appointment",
            },
            {
              heading: "Explore loan options",
              para: "Get personalized loan offers in minutes based on your financial profile.",
              icon: "/icons/manageLoan2.svg",
              altName: "Alert Icon",
              url: "/get-started/loan-options",
            },
            {
              heading: "Contact us",
              para: "Connect with a DigitalDSA specialist for fast, reliable support.",
              icon: "/icons/contact.svg",
              altName: "Alert Icon",
              url: "/contact",
            },
            {
              heading: "Message us",
              para: `Chat with our online assistants or a specialist for instant help.`,
              icon: "/icons/msg.svg",
              altName: "Alert Icon",
              url: "/contact",
            },
          ],
        }}
      />

      <ThingsYouKnow contents={{ heading: `Things you should know` }}>
        <ul class="list-decimal pl-4 flex flex-col gap-4 px-2">
          <li>
            Banks view police and lawyers as high-risk due to recovery challenges, not because of their profession.
          </li>
          <li>
            Proper ITR filing and a strong CIBIL score can significantly improve loan approval chances.
          </li>
          <li>
            Cash-based income or salary deductions can complicate loan applications—document income clearly.
          </li>
          <li>
            Offering collateral can make banks more comfortable approving larger loans.
          </li>
          <li>
            Use DigitalDSA’s tools to assess eligibility and compare loan options before applying.
          </li>
          <li>
            Contact our specialists for personalized guidance to navigate loan challenges effectively.
          </li>
        </ul>
      </ThingsYouKnow>
    </div>
  </NewPageLayout>
</section>

<style>
  .section {
    scroll-margin-top: 5rem; /* Adjust this value to match your navbar height */
  }
</style>