<script>
  import Button from "$lib/components/website/Button.svelte";
  import StickyNavbar from "$lib/components/website/StickyNavbar.svelte";
  import { onMount } from "svelte";

  import HelpList from "./HelpList.svelte";
  import ThreeColumWithLeftHeading from "./ThreeColumWithLeftHeading.svelte";
  import TwoColumnWithImage from "./TwoColumnWithImage.svelte";
  import Anchor from "./Anchor.svelte";
  import NewPageLayout from "./NewPageLayout.svelte";
  import AboveTitleWithoutIconCard from "./AboveTitleWithoutIconCard.svelte";
  import ThingsYouKnow from "./ThingsYouKnow.svelte";
  import Seo from "./Seo.svelte";

  // Contact us online
  let youKnowlists = [
    {
      heading: `Information Accuracy & Subject to Change`,
      para: `While we strive to provide accurate and up-to-date details, financial hardship solutions, eligibility criteria, and lender policies may change over time. The information provided should not be considered final or absolute, and we encourage you to verify details with our support team or financial institutions.`,
    },
    {
      heading: `Impact on Credit Score & Financial History`,
      para: `Engaging in a <span class="font-semibold">financial hardship arrangement</span> (such as loan restructuring or EMI deferrals) may impact your <span class="font-semibold">CIBIL score</span> or overall credit profile. While such arrangements may help in the short term, they could also affect your future loan eligibility and borrowing capacity. We recommend consulting a <span class="font-semibold">financial advisor</span> or <span class="font-semibold">credit bureau</span> before making a decision.`,
    },
    {
      heading: `No Guarantee of Approval`,
      para: `Digital DSA provides assistance and guidance, but we <span class="font-semibold">do not guarantee</span> approval for hardship relief, loan restructuring, or any other financial modifications. Approval is subject to lender discretion, financial assessment, and relevant eligibility criteria.`,
    },
    {
      heading: `Personal Responsibility & Decision-Making`,
      para: `Financial decisions should be made after <span class="font-semibold">careful evaluation</span> of your situation. The information provided here is for <span class="font-semibold">general informational purposes only</span> and should <span class="font-semibold">not</span> replace professional financial, legal, or tax advice. Always consider seeking independent advice before proceeding with any financial commitments.`,
    },
    {
      heading: `Liability Limitation & Risk Acknowledgment`,
      para: `Digital DSA is <span class="font-semibold">not responsible</span> for any <span class="font-semibold">direct, indirect, incidental, or consequential</span> losses, damages, or financial impacts resulting from the use of this information or any decisions made based on it. The responsibility for financial actions lies solely with the user.`,
    },
    {
      heading: `Alternative Financial Support May Be Available`,
      para: `In some cases, additional financial aid options such as <span class="font-semibold">government assistance programs, debt consolidation, or refinancing solutions</span> may be more suitable. It is advisable to explore all available options before committing to a hardship arrangement.`,
    },
    {
      heading: `Third-Party Involvement & Lender Policies`,
      para: `Digital DSA acts as a facilitator for financial solutions but does <span class="font-semibold">not</span> control lender policies, approval decisions, or repayment terms. Each lender may have different criteria and procedures for handling financial hardship cases.`,
    },
    {
      heading: `Confidentiality & Data Usage`,
      para: `Any personal or financial information shared with Digital DSA is handled with <span class="font-semibold">strict confidentiality</span> and used only for the purpose of assessing and assisting with financial hardship requests. However, we recommend reviewing our <span class="font-semibold">privacy policy</span> for details on data handling and third-party interactions.`,
    },
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
  let showVideo = false;

  function playVideo() {
    showVideo = true;
  }
</script>

<Seo
  type="WebPage"
  title="Financial Hardship Support | Flexible Loan Solutions"
  image="/images/financial-stress.jpg"
  description="Struggling with loan repayments? Get financial hardship support, flexible EMI plans & tailored solutions at Digital DSA. Contact us today!"
  keywords="Financial hardship support, Loan repayment assistance, Flexible EMI plans, Hardship loan arrangements, Debt relief options, Loan restructuring solutions, Business financial support, EMI planning tools, Missed EMI help, CIBIL score protection, Loan deferral assistance, Digital DSA financial aid"
/>

<section>
  <NewPageLayout
    pageData={{
      coverImage: "/images/financial-stress.jpg",
      coverAlt: "photo of a man in financial stress",
      heading: "Financial hardship",
      actionBtns: [
        {
          btnName: "Contact us online",
          btnLink: "/appointment",
          btnColor: "#ffcc00",
        },
      ],
      para: `At Digital DSA, we understand that unexpected circumstances can create challenges in managing your finances. We're here to help you explore alternative options to ease your financial burden.`,
    }}
  >
    <div class="hidden lg:block">
      <StickyNavbar
        navList={{
          items: [
            { name: "When to Get Help", targetId: "getHelp" },
            {
              name: "Financial Hardship Arrangements",
              targetId: "arrangement",
            },
            { name: "Ways to Contact Us", targetId: "callUs" },
            { name: "How We Can Help", targetId: "canHelp" },
            { name: "Support for Businesses", targetId: "businessSupport" },
          ],
          actionBtns: [
            {
              btnName: "Contact us online",
              btnLink: "/appointment",
              btnColor: "#ffcc00",
            },
          ],
        }}
        {activeSection}
      ></StickyNavbar>

      <div id="getHelp" data-section="getHelp" class="section">
        <AboveTitleWithoutIconCard
          contents={{
            heading: `When to Get Help`,
            para: `If you're worried about missing a payment or struggling to manage your ongoing repayments, <a href="/contact" class="underline underline-offset-4 hover:no-underline"> reach out to us</a> as soon as possible. Early communication can help reduce stress, and we can work together to find the right solutions for your situation.`,
            xlGridCol: 3,
            cards: [
              {
                heading: "Reach out for support early",
                para: `Unexpected increases in daily expenses, such as <a href="/finance-support/cost-of-living" class="underline underline-offset-4 hover:no-underline">cost-of-living pressures</a>, may require you to adjust your budget. </br> </br>
       If you're struggling with <span class="font-semibold">EMI payments</span> or concerned about <span class="font-semibold"> managing running loan,</span> don’t wait—reach out to us as soon as possible. </br> </br> 
        `,
              },
              {
                heading: "Why you may need financial support",
                para: `There are many situations where you might find it difficult to keep up with your loan repayments, such as: </br> </br>
          
          <ul class="list-disc flex flex-col gap-2 list-inside">
            <li>Cost of living pressures</li>
            <li>Unemployment or changes in income</li>
             <li>Death of an earning member</li>
              <li>   (e.g. flood, fire, earthquake)</li>
               <li>(e.g. divorce, domestic violence)  </li>
                <li>Unexpected expenses or loss in business   </li>
            </ul>`,
              },
              {
                heading: "Missed or late payments?",
                para: `<div class="flex flex-col gap-4">
          
    <p>
       
        If you’re worried that you’ll miss an EMI or will be unable to meet your ongoing EMIs, please contact us.
    </p>
   <div>
     <p>
      Even if the issue is short-term, contacting us early allows us to explore solutions together and help you:

      </p>
    
    
    <ul class="list-disc list-inside">
        <li>Avoid <span class="font-semibold">late payments</span> fees or penalties.</li>
        <li>Protect your <span class="font-semibold">credit score</span> in CIBIL.</li>
    </ul></div>
          </div>`,
              },
            ],
          }}
        />
      </div>

      <div
        id="arrangement"
        data-section="arrangement"
        class="flex flex-col gap-[3rem] section"
      >
        <ThreeColumWithLeftHeading
          contents={{
            heading: `What is a financial hardship arrangement?`,
            cardData: [
              {
                title: `What is a financial hardship arrangement?`,
                para: `<div class="flex flex-col gap-4">
              <p>If you’re finding it difficult to keep up with repayments (loan EMIs, credit card bills), a "financial hardship arrangement" can offer support during challenging times</p>
              <div>
                <p> We can work with you to create an alternative payment plan, such as:</p>

                <ul class="list-disc list-inside"><li>Temporarily deferring your repayments.</li>
                  <li>Allowing reduced payments for a set period.</li></ul>
                </div>
                <p>This arrangement can help prevent you from falling too far behind on your credit card or loan repayments.</p>
              <p>You can also checkout our <a href="/planners/flexible-emi-planner" target="_blank" rel="noopener noreferrer" class="underline underline-offset-4 hover:no-underline text-linkColor">Flexible EMI Planner</a> for better understanding and planning.</p>
            </div>`,
              },
              {
                title: `Can a hardship arrangement impact your credit score?`,
                para: `<div class="flex flex-col gap-4">
              <p>When a borrower enters into a <span class="font-semibold">financial hardship arrangement</span> or avails of <span class="font-semibold">loan restructuring</span>, it can have an impact on their <span class="font-semibold">CIBIL score</span> (or <span class="font-semibold">credit score</span> in general), although the extent of the impact depends on the nature of the arrangement and how it's reported.</p>
             
                <p>Entering into an arrangement is <span class="font-semibold">recommended</span> as it demonstrates your commitment to getting back on track. If you cannot make your repayments and do not enter an arrangement, it may negatively impact your credit score.</p>
                <p>
                   Here's how different types of financial support arrangements may affect your CIBIL score </p>
            </div>`,
              },
            ],
          }}
        />

        <!-- youtube video -->
        <!-- <div
          class="flex flex-col gap-[2rem] border-b border-divideColor pt-[4rem] pb-[8rem] lg:px-[4rem]"
        >
          <h2
            class="md:col-span-1 typography-h2 text-text-main"
          >
            Watch to learn more
          </h2>
          <div class="grid lg:grid-cols-2">
            <div>Test</div>
            <div class="relative w-full h-[40svh] overflow-hidden">
              <iframe
                class="w-full h-full"
                src="https://www.youtube.com/embed/RyLKvNWO6oQ"
                title="YouTube video player"
                frameborder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowfullscreen
              ></iframe>
            </div>
          </div>
        </div> -->
      </div>

      <div id="callUs" data-section="callUs" class="section">
        <TwoColumnWithImage
          contents={{
            cardImage: "/images/contact-us-DigitalDSA.jpg",
            cardAltName: "Photo of a young female executive from DigitalDSA",
            cardHeading: "Ways to contact us",
            sourceName: "Freepik",
            originalSource:
              "https://www.freepik.com/free-photo/young-entrepreneur-talking-phone-quietly_962020.htm",
            reverse: true,
          }}
        >
          <p class="typography-body-sm text-[var(--form-text-secondary)]">
            You can easily request help at Digital DSA by visiting our website
            to raise an online request. We’ll ask a few questions to understand
            your situation and connect you with the right support.
            Alternatively, you can call us directly for personalized assistance.
            Our team is here to help you find the best solution for your needs,
            so don’t hesitate to reach out whenever you need support.
          </p>
          <div class="flex gap-2 items-center">
            <p class="font-semibold typography-body-md">Email:</p>
            <Anchor
              link="mailto:support@digitaldsa.com"
              linkName="support@digitaldsa.com"
            />
          </div>
          <div class="flex gap-2 items-center">
            <p class="font-semibold typography-body-md">Call us:</p>
            <Anchor link="tel:+918587033787" linkName="+91 8587033787" />
          </div>
        </TwoColumnWithImage>
      </div>

      <div id="canHelp" data-section="canHelp" class="section">
        <ThreeColumWithLeftHeading
          contents={{
            heading: `We have a range of options`,
            cardData: [
              {
                title: `Tailored Loan Solutions`,
                para: `<ul class="list-disc pl-4 flex flex-col gap-2">
         <li>Flexible Repayment Plans (Reduced payments, deferrals)</li>
         <li> Fee & Penalty Waivers (For eligible cases)</li>
        <li>Loan Refinancing Options (Better terms, lower EMIs)</li>
        <li>Partial Prepayment Choices (Reduce future EMIs)</li>
        <li>EMI Planning Tools (Visualize repayment adjustments)</li>
        </ul>`,
              },
              {
                title: `Assistance Requirements`,
                para: `<ul class="list-disc pl-4 flex flex-col gap-2">
         <li>Financial Overview (Income & expenses details)</li>
         <li>Hardship Documents (Medical/employment proof)</li>

        </ul>`,
              },
            ],
          }}
        />
      </div>

      <div id="businessSupport" data-section="businessSupport" class="section">
        <TwoColumnWithImage
          contents={{
            cardImage: "/images/support-for-business-pexel.jpg",
            cardAltName: `photo of an young businessman infront of his shop`,
            cardHeading: "Support for Businesses",
            reverse: false,
            sourceName: "pexel",
            originalSource: "",
          }}
        >
          <div class="grid gap-[2rem]">
            <ul class="flex flex-col gap-2 list-disc list-inside">
              <p>
                If you're a business owner facing financial difficulties, we can
                assist with:
              </p>
              <li>Loan restructuring or refinancing (balance transfer)</li>

              <li>Debt consolidation options</li>
            </ul>
            <p>
              <Anchor link="/appointment" linkName="Book an appointment" /> with
              our business support team for tailored solutions to support your operations
              during tough times.
            </p>

            <!-- <div>
              <Button link="/appointment" btnName="Book an appointment" btnColor="#ffcc00" />
            </div> -->
          </div>
        </TwoColumnWithImage>
      </div>
    </div>
    <div class="lg:hidden block">
      {#each ["When to Get Help", "Financial Hardship Arrangements", "Ways to Contact Us", "How We Can Help", "Support for Businesses"] as list, index}
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
            <div id="getHelp" class="bg-white text-black">
              <AboveTitleWithoutIconCard
                contents={{
                  heading: `When to Get Help`,
                  para: `If you're worried about missing a payment or struggling to manage your ongoing repayments, <a href="/contact" class="underline underline-offset-4 hover:no-underline"> reach out to us</a> as soon as possible. Early communication can help reduce stress, and we can work together to find the right solutions for your situation.`,
                  xlGridCol: 3,
                  cards: [
                    {
                      heading: "Reach out for support early",
                      para: `Unexpected increases in daily expenses, such as <a href="/finance-support/cost-of-living" class="underline underline-offset-4 hover:no-underline">cost-of-living pressures</a>, may require you to adjust your budget. </br> </br>
       If you're struggling with <span class="font-semibold">EMI payments</span> or concerned about <span class="font-semibold"> managing running loan,</span> don’t wait—reach out to us as soon as possible. </br> </br> 
        `,
                    },
                    {
                      heading: "Why you may need financial support",
                      para: `There are many situations where you might find it difficult to keep up with your loan repayments, such as: </br> </br>
          
          <ul class="list-disc flex flex-col gap-2 list-inside">
            <li>Cost of living pressures</li>
            <li>Unemployment or changes in income</li>
             <li>Death of an earning member</li>
              <li>   (e.g. flood, fire, earthquake)</li>
               <li>(e.g. divorce, domestic violence)  </li>
                <li>Unexpected expenses or loss in business   </li>
            </ul>`,
                    },
                    {
                      heading: "Missed or late payments?",
                      para: `<div class="flex flex-col gap-4">
          
    <p>
       
        If you’re worried that you’ll miss an EMI or will be unable to meet your ongoing EMIs, please contact us.
    </p>
   <div>
     <p>
      Even if the issue is short-term, contacting us early allows us to explore solutions together and help you:

      </p>
    
    
    <ul class="list-disc list-inside">
        <li>Avoid <span class="font-semibold">late payments</span> fees or penalties.</li>
        <li>Protect your <span class="font-semibold">credit score</span> in CIBIL.</li>
    </ul></div>
          </div>`,
                    },
                  ],
                }}
              />
            </div>
          {:else if index == 1}
            <div id="arrangement" class="bg-white text-black">
              <ThreeColumWithLeftHeading
                contents={{
                  heading: `What is a financial hardship arrangement?`,
                  cardData: [
                    {
                      title: `What is a financial hardship arrangement?`,
                      para: `<div class="flex flex-col gap-4">
              <p>If you’re finding it difficult to keep up with repayments (loan EMIs, credit card bills), a "financial hardship arrangement" can offer support during challenging times</p>
              <div>
                <p> We can work with you to create an alternative payment plan, such as:</p>

                <ul class="list-disc list-inside"><li>Temporarily deferring your repayments.</li>
                  <li>Allowing reduced payments for a set period.</li></ul>
                </div>
                <p>This arrangement can help prevent you from falling too far behind on your credit card or loan repayments.</p>
              <p>You can also checkout our <a href="/planners/flexible-emi-planner" target="_blank" rel="noopener noreferrer" class="underline underline-offset-4 hover:no-underline text-linkColor">Flexible EMI Planner</a> for better understanding and planning.</p>
            </div>`,
                    },
                    {
                      title: `Can a hardship arrangement impact your credit score?`,
                      para: `<div class="flex flex-col gap-4">
              <p>When a borrower enters into a <span class="font-semibold">financial hardship arrangement</span> or avails of <span class="font-semibold">loan restructuring</span>, it can have an impact on their <span class="font-semibold">CIBIL score</span> (or <span class="font-semibold">credit score</span> in general), although the extent of the impact depends on the nature of the arrangement and how it's reported.</p>
             
                <p>Entering into an arrangement is <span class="font-semibold">recommended</span> as it demonstrates your commitment to getting back on track. If you cannot make your repayments and do not enter an arrangement, it may negatively impact your credit score.</p>
                <p>
                   Here's how different types of financial support arrangements may affect your CIBIL score </p>
            </div>`,
                    },
                  ],
                }}
              />
                <!-- Youtube video -->
              <!-- <div
                class="flex flex-col gap-[2rem] border-b border-divideColor pt-[4rem] pb-[8rem] lg:px-[4rem]"
              >
                <h2
                  class="md:col-span-1 typography-h2 text-text-main"
                >
                  Watch to learn more
                </h2>
                <div class="grid lg:grid-cols-2">
                  <div>Test</div>
                  <div class="relative w-full h-[40svh] overflow-hidden">
                    <iframe
                      class="w-full h-full"
                      src="https://www.youtube.com/embed/RyLKvNWO6oQ"
                      title="YouTube video player"
                      frameborder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowfullscreen
                    ></iframe>
                  </div>
                </div>
              </div> -->
            </div>
          {:else if index == 2}
            <div id="callUs" class="bg-white text-black">
              <TwoColumnWithImage
                contents={{
                  cardImage: "/images/contact-us-DigitalDSA.jpg",
                  cardAltName:
                    "Photo of a young female executive from DigitalDSA",
                  cardHeading: "Ways to contact us",
                  sourceName: "Freepik",
                  originalSource:
                    "https://www.freepik.com/free-photo/young-entrepreneur-talking-phone-quietly_962020.htm",
                  reverse: true,
                }}
              >
                <p class="typography-body-sm text-[var(--form-text-secondary)]">
                  You can easily request help at Digital DSA by visiting our
                  website to raise an online request. We’ll ask a few questions
                  to understand your situation and connect you with the right
                  support. Alternatively, you can call us directly for
                  personalized assistance. Our team is here to help you find the
                  best solution for your needs, so don’t hesitate to reach out
                  whenever you need support.
                </p>
                <div class="flex gap-2 items-center">
                  <p class="font-semibold typography-body-md">Email:</p>
                  <Anchor
                    link="mailto:support@digitaldsa.com"
                    linkName="support@digitaldsa.com"
                  />
                </div>
                <div class="flex gap-2 items-center">
                  <p class="font-semibold typography-body-md">Call us:</p>
                  <Anchor link="tel:+918587033787" linkName="+91 8587033787" />
                </div>
              </TwoColumnWithImage>
            </div>
          {:else if index == 3}
            <div id="canHelp" class="bg-white text-black">
              <ThreeColumWithLeftHeading
                contents={{
                  heading: `We have a range of options`,
                  cardData: [
                    {
                      title: `Tailored Loan Solutions`,
                      para: `<ul class="list-disc pl-4 flex flex-col gap-2">
         <li>Flexible Repayment Plans (Reduced payments, deferrals)</li>
         <li> Fee & Penalty Waivers (For eligible cases)</li>
        <li>Loan Refinancing Options (Better terms, lower EMIs)</li>
        <li>Partial Prepayment Choices (Reduce future EMIs)</li>
        <li>EMI Planning Tools (Visualize repayment adjustments)</li>
        </ul>`,
                    },
                    {
                      title: `Assistance Requirements`,
                      para: `<ul class="list-disc pl-4 flex flex-col gap-2">
         <li>Financial Overview (Income & expenses details)</li>
         <li>Hardship Documents (Medical/employment proof)</li>

        </ul>`,
                    },
                  ],
                }}
              />
            </div>
          {:else if index == 4}
            <div id="businessSupport" class="bg-white text-black">
              <TwoColumnWithImage
                contents={{
                  cardImage: "/images/support-for-business-pexel.jpg",
                  cardAltName: `photo of an young businessman infront of his shop`,
                  cardHeading: "Support for Businesses",
                  reverse: false,
                  sourceName: "pexel",
                  originalSource: "",
                }}
              >
                <div class="grid gap-[2rem]">
                  <ul class="flex flex-col gap-2 list-disc list-inside">
                    <p>
                      If you're a business owner facing financial difficulties,
                      we can assist with:
                    </p>
                    <li>
                      Loan restructuring or refinancing (balance transfer)
                    </li>

                    <li>Debt consolidation options</li>
                  </ul>
                  <p>
                    <Anchor
                      link="/appointment"
                      linkName="Book an appointment"
                    /> with our business support team for tailored solutions to support
                    your operations during tough times.
                  </p>

                  <!-- <div>
              <Button link="/appointment" btnName="Book an appointment" btnColor="#ffcc00" />
            </div> -->
                </div>
              </TwoColumnWithImage>
            </div>
          {/if}
        </details>
      {/each}
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
              para: "Book instantly to speak to a loan specialist at a time that suits you",
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

      <!-- <ThingsYouShould
        thinkKnow={{
          heading: "Things you should know",
          listClass: "decimal",

          ,
        }}
      /> -->
      <ThingsYouKnow contents={{ heading: `Things you should know` }}>
        <ul class="list-decimal flex flex-col gap-4">
          {#each youKnowlists as youKnow}
            <li>
              <h3 class="font-semibold typography-body-md">
                {@html youKnow.heading}
              </h3>
              <p class="typography-body-sm text-[var(--form-text-secondary)]">
                {@html youKnow.para}
              </p>
            </li>
          {/each}
        </ul>
      </ThingsYouKnow>
    </div>
  </NewPageLayout>
</section>

<style>
  .section {
    scroll-margin-top: 4rem; /* Adjust this value to match your navbar height */
  }
</style>