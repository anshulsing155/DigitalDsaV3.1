<script>
  import NewPageLayout from "./NewPageLayout.svelte";
  import ThingsYouShould from "./ThingsYouShould.svelte";
  import ThreeColumWithLeftHeading from "./ThreeColumWithLeftHeading.svelte";
  import AboveTitleWithTopIconCard from "./AboveTitleWithTopIconCard.svelte";
  import StickyNavbar from "./StickyNavbar.svelte";
  import { onMount } from "svelte";
  import TwoColumnWithImage from "./TwoColumnWithImage.svelte";
  import Button from "./Button.svelte";
  import HelpList from "./HelpList.svelte";
  import Seo from "./Seo.svelte";

  // end-here

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
  title="Assess Your Business's Financial Health Before a Loan"
  image="/images/financial-health-blog.jpg"
  description="Evaluate key financial metrics before applying for a Loan Against Property or Dropline Overdraft. Improve approval chances with expert insights."
  keywords="Loan Against Property, Drop-Line Overdraft, LAP vs DOD, Property Loan, Overdraft Facility, Term Loan, Business Loan, Working Capital Loan, Secured Loan, Loan Comparison, Flexible Loan, Loan Interest Calculation, EMI vs Overdraft, Financial Planning"
/>

<section class="py-12">
  <NewPageLayout
    pageData={{
      coverImage: "/images/financial-health-blog.jpg",
      coverAlt: "hero-cover",
      heading: "How to assess your business’s financial health",
      para: `Business financial health, Loan Against Property (LAP), Dropline Overdraft (DoD), Cash flow analysis, Profitability trends, Debt-to-income ratio, Credit score for loans, Business loan approval, Asset valuation for loans, Business financial metrics`,
      actionBtns: [
        {
          btnName: "Book appointment",
          btnLink: "/appointment",
        },
        {
          btnName: "Compare offers",
          btnLink: "/get-started/how-can-we-help",
          btnColor: "#ffcc00",
        },
      ],
    }}
  >
    <div class="hidden lg:block">
      <StickyNavbar
        navList={{
          items: [
            {
              name: "Key financial metrics ",
              targetId: `metrics`,
            },
            {
              name: "Evaluation by bank",
              targetId: `evaluation`,
            },
            {
              name: "Actionable ",
              targetId: `action`,
            },
          ],
          actionBtns: [
            {
              btnName: "Book appointment",
              btnLink: "/appointment",
            },
            {
              btnName: "Compare offers",
              btnLink: "/get-started/how-can-we-help",
              btnColor: "#ffcc00",
            },
          ],
        }}
        {activeSection}
      />
      <div id="metrics" data-section="metrics">
        <ThreeColumWithLeftHeading
          contents={{
            heading: "Key financial metrics to evaluate before applying",
            cardData: [
              {
                id: "1",
                title: "Cash flow: the lifeblood of your business",
                para: `<ul class="list-disc space-y-3 pl-5"> 
              <li>	Lenders assess whether your business generates  <span class="font-FourthHead" > consistent cash flow  </span> to repay a loan. </li>
               <li>	A healthy  <span class="font-FourthHead" > operating cash flow (OCF)  </span> ensures that you won’t struggle with EMI payments. </li>
                <li>	Before applying, track cash inflows and outflows for at least  <span class="font-FourthHead" > 12–24 months  </span> to detect any inconsistencies. </li>
              </ul>`,
              },
              {
                id: "2",
                title: "Profitability and revenue trends",
                para: `<ul class="list-disc space-y-3 pl-5">
              <li> 	Look at your  <span class="font-FourthHead" > profit margins (gross and net)  </span> over the past few years.</li>
              <li>Stable or increasing   <span class="font-FourthHead" > revenues  </span> strengthen your case for loan approval. </li>
              <li> 	If your profits are inconsistent, opting for  <span class="font-FourthHead" > DoD over LAP  </span> might be better, as DoD provides flexible withdrawal options.</li>
              </ul>`,
              },
              {
                id: "3",
                title: "Debt-to-income ratio (DTI) & existing liabilities",
                para: `<ul class="list-disc space-y-3 pl-5">
              <li>	Banks calculate your  <span class="font-FourthHead" >  DTI ratio  </span> to determine how much of your income is already committed to existing debt. </li>
              <li>	A lower DTI (<40%) indicates better financial health and higher loan approval chances. </li>
              <li>	Before applying, check if you have outstanding loans that might impact your repayment capacity. </li>
              </ul>`,
              },
              {
                id: "4",
                title:
                  "Asset valuation & property ownership (for LAP applicants)",
                para: `<ul class="list-disc space-y-3 pl-5">
              <li>	If applying for a LAP, ensure your property  <span class="font-FourthHead" > meets bank eligibility criteria  </span> (clear title, no legal disputes). </li>
              <li>Get an updated  <span class="font-FourthHead" > property valuation  </span> to understand the maximum loan amount you can receive. </li>
             
              </ul>`,
              },
            ],
          }}
        />
      </div>

      <div
        class="px-[4rem] border-b border-borderColor"
        id="evaluation"
        data-section="evaluation"
      >
        <ThingsYouShould
          thinkKnow={{
            heading: "How banks evaluate your business’s financial strength",
            subPara: [
              `Banks and NBFCs use the following methods to assess financial health:`,
            ],
            paraGraph: [
              ` <span class="font-FourthHead" > CIBIL & Credit scores –  </span> A score above   <span class="font-FourthHead underline underline-offset-2" > 700</span> increases approval chances.`,
              ` <span class="font-FourthHead" > Past 3–5 years’ financial statements –  </span>Helps determine income stability.`,
              ` <span class="font-FourthHead" > ITR filings –  </span> Consistent tax filings show financial discipline.`,
              `  <span class="font-FourthHead" > Bank statements – </span> lenders check for irregular withdrawals and NSF (non-sufficient funds) cases.`,
            ],
          }}
          disc="list-disc"
        />
      </div>
      <div id="action" data-section="action">
        <AboveTitleWithTopIconCard
          contents={{
            heading: `Preparing for a loan application: actionable steps`,
            xlGridCol: 3,
            borderBottom: true,
            cards: [
              {
                heading: "Conduct a financial audit",
                para: `<ul class="list-disc pl-5"> 
            <li> 	Review your P&L statement, balance sheet, and cash flow reports.</li>
            <li> 	Identify any discrepancies or liabilities that could raise red flags.</li> </ul>`,
                icon: "/icons/apply.svg",
                altName: "icons-apply",
              },
              {
                heading: "Optimize Your Credit Profile",
                para: `<ul class="list-disc pl-5"> 
            <li> Pay off high-interest debts before applying.</li>
            <li>	Ensure you don’t have frequent overdraft usage (for DoD applicants). </li> </ul>`,
                icon: "/icons/businessInsights.svg",
                altName: "icons-businessInsights",
              },
              {
                heading:
                  "Choose Between LAP & DoD Based on Financial Stability",
                para: `<ul class="list-disc pl-5"> 
            <li> 	LAP suits businesses with stable revenues who need large funds for expansion.</li>
            <li> 	DoD is ideal for businesses with fluctuating cash flow that need flexibility</li> </ul>`,
                icon: "/icons/balanceTransferTopup.svg",
                altName: "loan-icon",
              },
            ],
          }}
        />
      </div>
    </div>
    <div class="lg:hidden block">
      {#each ["Key financial metrics", "Evaluation by bank", "Actionable"] as list, index}
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
            <div id="ready" class="bg-white text-black">
              <ThreeColumWithLeftHeading
                contents={{
                  heading: "Key financial metrics to evaluate before applying",
                  cardData: [
                    {
                      id: "1",
                      title: "Cash flow: the lifeblood of your business",
                      para: `<ul class="list-disc space-y-3 pl-5"> 
              <li>	Lenders assess whether your business generates  <span class="font-FourthHead" > consistent cash flow  </span> to repay a loan. </li>
               <li>	A healthy  <span class="font-FourthHead" > operating cash flow (OCF)  </span> ensures that you won’t struggle with EMI payments. </li>
                <li>	Before applying, track cash inflows and outflows for at least  <span class="font-FourthHead" > 12–24 months  </span> to detect any inconsistencies. </li>
              </ul>`,
                    },
                    {
                      id: "2",
                      title: "Profitability and revenue trends",
                      para: `<ul class="list-disc space-y-3 pl-5">
              <li> 	Look at your  <span class="font-FourthHead" > profit margins (gross and net)  </span> over the past few years.</li>
              <li>Stable or increasing   <span class="font-FourthHead" > revenues  </span> strengthen your case for loan approval. </li>
              <li> 	If your profits are inconsistent, opting for  <span class="font-FourthHead" > DoD over LAP  </span> might be better, as DoD provides flexible withdrawal options.</li>
              </ul>`,
                    },
                    {
                      id: "3",
                      title:
                        "Debt-to-income ratio (DTI) & existing liabilities",
                      para: `<ul class="list-disc space-y-3 pl-5">
              <li>	Banks calculate your  <span class="font-FourthHead" >  DTI ratio  </span> to determine how much of your income is already committed to existing debt. </li>
              <li>	A lower DTI (<40%) indicates better financial health and higher loan approval chances. </li>
              <li>	Before applying, check if you have outstanding loans that might impact your repayment capacity. </li>
              </ul>`,
                    },
                    {
                      id: "4",
                      title:
                        "Asset valuation & property ownership (for LAP applicants)",
                      para: `<ul class="list-disc space-y-3 pl-5">
              <li>	If applying for a LAP, ensure your property  <span class="font-FourthHead" > meets bank eligibility criteria  </span> (clear title, no legal disputes). </li>
              <li>Get an updated  <span class="font-FourthHead" > property valuation  </span> to understand the maximum loan amount you can receive. </li>
             
              </ul>`,
                    },
                  ],
                }}
              />
            </div>
          {:else if index == 1}
            <div id="challenges" class="bg-white text-black">
              <ThingsYouShould
                thinkKnow={{
                  heading:
                    "How banks evaluate your business’s financial strength",
                  subPara: [
                    `Banks and NBFCs use the following methods to assess financial health:`,
                  ],
                  paraGraph: [
                    ` <span class="font-FourthHead" > CIBIL & Credit scores –  </span> A score above   <span class="font-FourthHead underline underline-offset-2" > 700</span> increases approval chances.`,
                    ` <span class="font-FourthHead" > Past 3–5 years’ financial statements –  </span>Helps determine income stability.`,
                    ` <span class="font-FourthHead" > ITR filings –  </span> Consistent tax filings show financial discipline.`,
                    `  <span class="font-FourthHead" > Bank statements – </span> lenders check for irregular withdrawals and NSF (non-sufficient funds) cases.`,
                  ],
                }}
                disc="list-disc"
              />
            </div>
          {:else if index == 2}
            <div id="help" class="bg-white text-black">
              <AboveTitleWithTopIconCard
                contents={{
                  heading: `Preparing for a loan application: actionable steps`,
                  xlGridCol: 3,
                  borderBottom: true,
                  cards: [
                    {
                      heading: "Conduct a financial audit",
                      para: `<ul class="list-disc pl-5"> 
                  <li> 	Review your P&L statement, balance sheet, and cash flow reports.</li>
                  <li> 	Identify any discrepancies or liabilities that could raise red flags.</li> </ul>`,
                      icon: "/icons/apply.svg",
                      altName: "icons-apply",
                    },
                    {
                      heading: "Optimize Your Credit Profile",
                      para: `<ul class="list-disc pl-5"> 
                  <li> Pay off high-interest debts before applying.</li>
                  <li>	Ensure you don’t have frequent overdraft usage (for DoD applicants). </li> </ul>`,
                      icon: "/icons/businessInsights.svg",
                      altName: "icons-businessInsights",
                    },
                    {
                      heading:
                        "Choose Between LAP & DoD Based on Financial Stability",
                      para: `<ul class="list-disc pl-5"> 
                  <li> 	LAP suits businesses with stable revenues who need large funds for expansion.</li>
                  <li> 	DoD is ideal for businesses with fluctuating cash flow that need flexibility</li> </ul>`,
                      icon: "/icons/balanceTransferTopup.svg",
                      altName: "loan-icon",
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
    <div
      class="flex flex-col py-[2rem] lg:py-[4rem] px-[1rem] lg:px-[4rem] gap-[1rem]"
    >
      <h2
        class="font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont"
      >
        Conclusion: Making the Right Financial Decision
      </h2>

      <p class="font-Paragraph text-minParaFont">
        By assessing your business’s financial health beforehand, you improve
        your chances of securing a loan with favorable terms. Whether you choose
        LAP for long-term growth or DoD for short-term liquidity, understanding
        your financial position is the first step to smart borrowing.
      </p>
    </div>

    <div slot="secondary">
      <HelpList
        contents={{
          heading: `We're here to help`,
          xlGridCol: 4,
          borderBottom: true,
          cards: [
            {
              heading: "Book an </br> appointment",
              para: "Book instantly to speak to a LAP loan specialist at a time that suits you",
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
