<script lang="ts">
  import HelpList from "$lib/components/website/HelpList.svelte";
  import NewPageLayout from "$lib/components/website/NewPageLayout.svelte";
  import Seo from "$lib/components/Seo.svelte";

  import StickyNavbar from "$lib/components/website/StickyNavbar.svelte";
  import ThingsYouShould from "$lib/components/website/ThingsYouShould.svelte";
  import TwoColumn from "$lib/components/website/TwoColumn.svelte";
  
  import WhyChoose from "$lib/components/website/WhyChoose.svelte";

  import { onMount } from "svelte";

  let pageData = {
    coverImage: "/images/financial-wellbeing.jpg",
    coverAlt:
      "photo of a happy couple, financially doing well with the help of DigitalDSA, enjoying time with each other in their newly purchased home's living room",
    sourceName: "Freepik",
    originalSource:
      "https://www.freepik.com/free-photo/people-tickling-each-other_38625493.htm",
    actionBtns: [
      {
        btnName: "Take assessment",
        btnLink: "/financial-wellbeing/form",
        btnColor: "#ffcc00",
      },
    ],
    heading: " Learn more about your financial wellbeing",
    para: ` Understand your financial well-being better and take steps to
            improve it—whether it’s managing your finances, dealing with
            unexpected expenses, or working towards your future goals.`,
  };

  let navBarMedium = [
    "What is financial wellbeing?",
    "How it is measured?",
    "Why take this assessment?",
    "Additional resources",
  ];

  let wellBeing = {
    heading: "What is financial wellbeing?",
    subPara: [
      `It’s about managing your money today and in the future, giving you
            control over your financial goals and ensuring you're prepared for
            the unexpected.<br> <br> We break it down into three key categories:`,
    ],
    paraGraph: [`Every Day`, `Rainy day`, `One fine day`],
  };

  let measured = {
    heading: "How it is measured?",
    subPara: [
      ` Take a short 2-minute survey, and we'll use your responses to
            calculate a score that serves as a guide to help you better
            understand your financial well-being.`,
      `<p class="flex items-center gap-2"> <span><img src="/icons/circle-check.svg" alt="circle-check-icon" class="h-4" /></span> Understand your current financial health</p> `,
      `<p class="flex items-center gap-2"> <span><img src="/icons/circle-check.svg" alt="circle-check-icon" class="h-4" /></span> Identify strengths and areas for improvement </p>`,
      `<p class="flex items-center gap-2"> <span><img src="/icons/circle-check.svg" alt="circle-check-icon" class="h-4" /></span> Receive personalized tips to enhance financial security </p>`,
    ],

    btnName: "Measure your score",
    btnColor: "#ffcc00",
    btnLink: "/financial-wellbeing/form",
  };

  let help = [
    {
      Heading: "Book an Appointment",
      paragraph:
        "Schedule a meeting with a loan specialist to discuss your financial needs and options.",
      icon: "/icons/appointment.svg",
      altTitle: "Book Appointment Icon",
    },
    {
      Heading: "Manage Your Loan Online",
      paragraph:
        "Easily monitor and manage your loan details through our online platform.",
      icon: "/icons/manageLoan2.svg",
      altTitle: "Manage Loan Icon",
    },
    {
      Heading: "Contact Us",
      paragraph:
        "Our team is ready to help you with any loan-related queries or concerns.",
      icon: "/icons/contact.svg",
      altTitle: "Contact Icon",
    },
    {
      Heading: "Message Us",
      paragraph:
        "Chat with our support team to get answers to your questions instantly.",
      icon: "/icons/msg.svg",
      altTitle: "Message Icon",
    },
  ];

  let thinkKnow = {
    heading: "Important Things to Know",
    paraGraph: [
      `This survey is designed to understand your financial habits and interactions with financial institutions. Your responses are not stored or saved—data is processed only during your session to provide you with better insights and viable financial options for informed decision-making.`,
      `We value your privacy and ensure that no personal information is shared, stored, or disclosed to any third party. The information you provide is used solely within the session to generate personalized advice, and once the session ends, all data is automatically discarded.`,
      `By proceeding with the survey, you acknowledge and agree to our Terms & Conditions and Privacy Policy, which outline our commitment to data protection and confidentiality.`,
      `Participants must be 18 years or older to complete the survey.`,
    ],
  };
  let resources = {
    heading: "Additional Resources",
    items: [
      {
        id: 1,
        title: "Smart Budgeting Tips​​",
        desc: `Managing your daily expenses effectively starts with a solid budget. By tracking your spending, prioritizing needs over wants, and using budgeting tools, you can stay on top of your finances with ease. <a href="/finance-support/budgeting-tips" class="underline text-linkColor"> Explore budgeting strategies </a>`,
        icon: "/icons/clock.svg",
        altName: "clock-icon",
      },
      {
        id: 2,
        title: "Debt Management Guide​",
        desc: `Struggling with debt? Learn how to pay off high-interest loans first, consolidate debt for better repayment terms, and avoid late payments to maintain a healthy credit score. <a href="/lap/what-is-debt-consolidation" class="underline text-linkColor"> Get expert debt management advice </a>`,
        icon: "/icons/negotiate.svg",
        altName: "negotiate-icon",
      },
      {
        id: 3,
        title: "Savings & Investment Strategies​​",
        desc: `Building long-term financial security requires smart saving and investing. Whether you’re growing an emergency fund, diversifying investments, or automating savings, strategic planning is key. <a href="/money-map/how-long-will-your-savings-support-you" class="underline text-linkColor"> Discover smart saving tips </a>`,
        icon: "/icons/phoneConnection.svg",
        altName: "phoneConnection-icon",
      },
      {
        id: 4,
        title: "Loan Readiness Checklist",
        desc: `Before applying for a loan, ensure you're financially prepared. From checking your credit score to comparing interest rates, taking the right steps can improve your approval chances.<a href="/loan-readiness-test/quiz" class="underline text-linkColor">  Check if you're loan-ready </a>​`,
        icon: "/icons/inte.svg",
        altName: "inte-icon",
      },
      {
        id: 5,
        title: "Common Financial Pitfalls to Avoid​",
        desc: `Avoiding overspending, excessive credit card reliance, and neglecting savings can make a significant difference in your financial health.`,
        icon: "/icons/contact.svg",
        altName: "contact-icon",
      },
    ],
  };

  let cardImg1 =
    "/images/financial-wellbeing-exploration-onDigitalDSA-website.png";
  let cardAlt1 =
    "Photo of a person who is taking survey of the financial wellbeing on DigitalDSA.com";
  let activeSection = $state(''); // Initially no section is active

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

  // Initialize the first active section when the component loads
  onMount(() => {
    initializeActiveSection();
    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  });
  //ends here...

  const toggleDropdown = (event: any, index: any) => {
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

      // Scroll the opened accordion into view
      setTimeout(() => {
        detailsElement.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  };
</script>

<Seo
  type="WebPage"
  title="Improve Your Financial Well-Being – Assess & Plan Today"
  image="/images/financial-wellbeing.jpg"
  description="Take a quick survey to measure your financial well-being, get personalized insights, and learn how to save, invest, and plan for a secure future."
  keywords="financial well-being, financial health assessment, money management, budgeting tips, emergency fund, savings plan, debt management, investment strategies, financial planning, personal finance, financial security, financial literacy, money tips, financial stability"
/>

<section>
  <NewPageLayout
    {pageData}
    actionBtns={[
      {
        btnName: "Take assessment",
        btnLink: "/financial-wellbeing/form",
        btnColor: "#ffcc00",
      },
    ]}
  >
    <div class="hidden lg:block">
      <StickyNavbar
        navList={{
          items: [
            {
              name: "What is financial wellbeing?",
              targetId: "wellbeing",
            },
            {
              name: "How it is measured?",
              targetId: "measured",
            },
            {
              name: "Why take this assessment?",
              targetId: "assessment",
            },

            {
              name: "Additional resources",
              targetId: "resources",
            },
          ],
          actionBtns: [
            {
              btnName: "Take assessment",
              btnLink: "/financial-wellbeing/form",
              btnColor: "#ffcc00",
            },
          ],
        }}
        {activeSection}
      ></StickyNavbar>
    </div>

    <div class=" hidden px-[2rem] lg:block lg:px-[4rem]">
      <div class=" relative pb-[14rem]" data-section="wellbeing" id="wellbeing">
        <ThingsYouShould thinkKnow={wellBeing} disc="list-decimal" />
        <div class="grid grid-cols-3 gap-[2rem] absolute top-[50%]">
          <div
            class="flex flex-col items-start gap-3 font-Paragraph text-subParaFont"
          >
            <img src="/icons/everyDay.svg" alt="" class="h-10" />
            <h2 class=" font-FifthHead text-paraFont">
              Every Day – Managing Regular Finances
            </h2>
            <p>
              Managing expenses like rent, transportation, groceries and utility
              bills ensures financial stability. Smart budgeting, responsible
              spending, and expense tracking are essential.
            </p>
            <p>
              <strong>Suggested:</strong> Budget planner
            </p>
          </div>
          <div
            class="flex flex-col items-start gap-3 font-Paragraph text-subParaFont"
          >
            <img src="/icons/rainyDay.svg" alt="" class="h-10" />
            <h2 class=" font-FifthHead text-paraFont">
              Rainy Day – Preparing for Emergencies
            </h2>
            <p>
              Unexpected expenses like medical bills or job loss can arise
              anytime. An emergency fund provides a financial cushion for
              handling challenges stress-free.
            </p>
            <p>
              <strong>Suggested:</strong> Insurance, FD , RD
            </p>
          </div>
          <div
            class="flex flex-col gap-3 items-start font-Paragraph text-subParaFont"
          >
            <img src="/icons/oneFineDay.svg" alt="" class="h-10" />
            <h2 class=" font-FifthHead text-paraFont">
              One fine Day – Building Long-Term Security
            </h2>
            <p>
              Financial well-being extends beyond immediate needs. By saving,
              investing, and planning strategically, you can secure long-term
              stability and independence.
            </p>
            <p>
              <strong>Suggested:</strong> SIP, Mutual funds
            </p>
          </div>
        </div>
      </div>
      <div
        data-section="measured"
        id="measured"
        class="border-y border-[var(--form-border)]"
      >
        <ThingsYouShould thinkKnow={measured} disc="list-disc">
          <p slot="list" class="font-minParaFont text-[.8rem]">
            97% of our first time visitor have taken this survey.
          </p>
        </ThingsYouShould>
      </div>
      <div
        id="assessment"
        data-section="assessment"
        class="flex flex-col border-b border-[var(--form-border)] pt-[4rem] pb-[8rem]"
      >
        <TwoColumn
          cardImage={cardImg1}
          cardAltName={cardAlt1}
          cardHeading="Why take this assessment?"
        >
          <div
            class="grid gap-[2rem] font-Paragraph text-subParaFont"
            slot="list"
          >
            <p>
              <span class="font-FifthHead text-paraFont"
                >1. Personalized Insights – Know Where You Stand</span
              > <br />
              Understanding your financial well-being is key to security. This assessment
              analyzes your spending, savings, debt, and confidence, providing a
              personalized score to highlight strengths and areas for improvement.
            </p>
            <p>
              <span class="font-FifthHead text-paraFont"
                >2. Actionable Steps – Improve Your Financial Health</span
              > <br />
              A score is just the start—you need a plan. Get step-by-step advice
              on saving, debt management, and long-term planning to boost your financial
              stability.
            </p>
            <p>
              <span class="font-FifthHead text-paraFont"
                >3. Better Decision-Making – Plan with Confidence</span
              > <br />
              Smart financial decisions require planning. This assessment helps you
              understand your strengths and risks, empowering you to make informed
              choices with confidence.
            </p>
          </div>
        </TwoColumn>
      </div>

      <div data-section="resources" id="resources">
        <WhyChoose facilities={resources} />
      </div>
    </div>

    <div class=" lg:hidden">
      {#each navBarMedium as list, index}
        <details
          class="border-spanColor dropdown col-span-3 bg-darkColor text-white {index <
          list.length - 1
            ? 'border-b'
            : ''} "
        >
          <summary
            class="list-none px-6 py-4"
            onclick={(e) => toggleDropdown(e, index)}
          >
            <div class="flex justify-between items-center">
              <h2>{list}</h2>
              <span><i class="fa-solid fa-angle-down faq-icon"></i></span>
            </div>
          </summary>

          {#if index == 0}
            <div id="Financial Services Guides" class="bg-[var(--landing-bg)] text-black dark:text-white">
              <ThingsYouShould thinkKnow={wellBeing} disc="list-decimal" />
              <div class="grid md:grid-cols-2 gap-[2rem] px-[0.5rem] pb-[3rem]">
                <div
                  class="flex flex-col items-start gap-3 font-Paragraph text-subParaFont"
                >
                  <img src="/icons/everyDay.svg" alt="" class="h-10" />
                  <h2 class=" font-FifthHead text-paraFont">
                    Every Day – Managing Regular Finances
                  </h2>
                  <p>
                    Managing expenses like rent, transportation, groceries and
                    utility bills ensures financial stability. Smart budgeting,
                    responsible spending, and expense tracking are essential.
                  </p>
                  <p>
                    <strong>Suggested:</strong> Budget planner
                  </p>
                </div>
                <div
                  class="flex flex-col items-start gap-3 font-Paragraph text-subParaFont"
                >
                  <img src="/icons/rainyDay.svg" alt="" class="h-10" />
                  <h2 class=" font-FifthHead text-paraFont">
                    Rainy Day – Preparing for Emergencies
                  </h2>
                  <p>
                    Unexpected expenses like medical bills or job loss can arise
                    anytime. An emergency fund provides a financial cushion for
                    handling challenges stress-free.
                  </p>
                  <p>
                    <strong>Suggested:</strong> Insurance, FD , RD
                  </p>
                </div>
                <div
                  class="flex flex-col gap-3 items-start font-Paragraph text-subParaFont"
                >
                  <img src="/icons/oneFineDay.svg" alt="" class="h-10" />
                  <h2 class=" font-FifthHead text-paraFont">
                    One fine Day – Building Long-Term Security
                  </h2>
                  <p>
                    Financial well-being extends beyond immediate needs. By
                    saving, investing, and planning strategically, you can
                    secure long-term stability and independence.
                  </p>
                  <p>
                    <strong>Suggested:</strong> SIP, Mutual funds
                  </p>
                </div>
              </div>
            </div>
          {:else if index == 1}
            <div id="measured" class="bg-[var(--landing-bg)] text-black dark:text-white">
              <ThingsYouShould thinkKnow={measured} disc="list-disc" />
            </div>
          {:else if index == 2}
            <div id="assessment" class="px-[0.5rem] bg-[var(--landing-bg)] text-black dark:text-white">
              <TwoColumn
                cardImage={cardImg1}
                cardAltName={cardAlt1}
                cardHeading="Why take this assessment?"
              >
                <div
                  class="grid gap-[2rem] font-Paragraph text-subParaFont"
                  slot="list"
                >
                  <p>
                    <span class="font-FifthHead text-paraFont"
                      >1. Personalized Insights – Know Where You Stand</span
                    > <br />
                    Understanding your financial well-being is key to security. This
                    assessment analyzes your spending, savings, debt, and confidence,
                    providing a personalized score to highlight strengths and areas
                    for improvement.
                  </p>
                  <p>
                    <span class="font-FifthHead text-paraFont"
                      >2. Actionable Steps – Improve Your Financial Health</span
                    > <br />
                    A score is just the start—you need a plan. Get step-by-step advice
                    on saving, debt management, and long-term planning to boost your
                    financial stability.
                  </p>
                  <p>
                    <span class="font-FifthHead text-paraFont"
                      >3. Better Decision-Making – Plan with Confidence</span
                    > <br />
                    Smart financial decisions require planning. This assessment helps
                    you understand your strengths and risks, empowering you to make
                    informed choices with confidence.
                  </p>
                </div>
              </TwoColumn>
            </div>
          {:else if index == 3}
            <div id="resources" class="px-[0.5rem] bg-[var(--landing-bg)] text-black dark:text-white">
              <WhyChoose facilities={resources} />
            </div>
          {/if}
        </details>
      {/each}
    </div>

    <div slot="secondary" class="">
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
      <ThingsYouShould {thinkKnow} disc="list-disc" />
    </div>
  </NewPageLayout>
</section>

<style>
  details summary .icon-container .faq-icon {
    transition: transform 0.3s ease;
  }

  details[open] summary .icon-container .faq-icon {
    transform: rotate(180deg);
  }
</style>
