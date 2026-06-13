<script>
  import PageDesign from "$lib/components/website/PageDesign.svelte";
  import TwoColumn from "$lib/components/website/TwoColumn.svelte";
  import LoanSupport from "$lib/components/website/LoanSupport.svelte";
  import NewHome from "$lib/components/website/NewHome.svelte";
 
  import ThingsYouShould from "$lib/components/website/ThingsYouShould.svelte";
  import Button from "$lib/components/website/Button.svelte";
  import StickyNavbar from "$lib/components/website/StickyNavbar.svelte";
  import { onMount } from "svelte";
  import WhyChoose from "./WhyChoose.svelte";
  
  import Seo from "./Seo.svelte";
  import HelpList from "./HelpList.svelte";


  let navBarMedium = [
    "What is cost of living",
    "Affecting factors",
    "Financial support",
    // "Managing strategies",
    "Offers and deals",
    "Other resources",
  ];

  let pageData = {
    coverImage: "/images/indian-family-having-dinner-in-a-beautiful-home.jpg",
    coverAlt:
      "photo of an indian family having good time together representing daily life of indian middle class and cost of living",
    sourceName: "Freepik",
    originalSource:
      "https://www.freepik.com/free-photo/medium-shot-smiley-islamic-family-home_33808558.htm",
    classStyle: "object-cover xl:h-[90svh] 3xl:max-h-[70svh]",
    heroHeading: " Cost of Living",
    heroParagraph: `"Explore a variety of tools, tips, and financial support options to ease the everyday cost of living.`,
  };
  let costOfLiving = {
    heading: "What is cost of living?",
    subPara: [
      `The cost of living refers to the total amount of  <span class="font-semibold"> money required to maintain a basic standard of living </span> in a specific location. It includes essential expenses like housing, food, transportation, healthcare, education, utilities, and discretionary spending such as entertainment.`,
      `It varies significantly due to factors like location (metro vs. non-metro), lifestyle choices, family size, and inflation. While urban areas like <span class="font-semibold">  Mumbai, Delhi, and Bangalore </span> have a high cost of living, smaller towns and villages offer a more affordable lifestyle.`,
    ],
  };

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
  let support = {
    title: "Stay alert to scammers who exploit the cost of living crisis.",
    paraGraph:
      "As you explore ways to cut costs or earn extra cash amidst rising living expenses, scammers are finding new ways to exploit the situation.",
    link: "Learn more about scams safety",
    url: "/cyber-security-against-scams",
  };
  let contents = [
    {
      id: 1,
      title: "Budgeting & money management",
      links: [
        {
          id: 1,
          name: "Tips for recovering from a financial setback",
          url: "",
        },
        { id: 2, name: "Where to start with debt", url: "" },
        {
          id: 3,
          name: "How to adjust your budget when you need to",
          url: "",
        },
      ],
    },
    {
      id: 2,
      title: "For businesses",
      links: [
        { id: 1, name: "10 tips for managing your business", url: "" },
        { id: 2, name: "cash flow when rates rise", url: "" },
        {
          id: 3,
          name: "How rising inflation and rates can impact your business",
          url: "",
        },
      ],
    },
  ];

  let thinkKnow = {
    heading: "Things you should know",
    paraGraph: [
      `This is general educational content. Assess its relevance to your needs before making decisions.`,
      `With over 50 lenders partnered, Digital DSA compares a wide range of loan options. Find the best rates, terms, and eligibility across multiple banks, ensuring you get the most suitable loan for your needs.`,
      `Activate offers through the app for cashback. Cashback is typically received within 14 business days after qualifying purchases.`,
      `Digital DSA arranges loans across 80+ cities. Terms and conditions may vary; check the latest details for your location.`,
    ],
  };
  let repayments = {
    heading: "Financial support to manage your loans",
    data: [
      {
        id: 1,
        title: "Are you experiencing financial difficulty?",
        desc: "Take a look at our range of options to help with your repayments.",
        btnText: "Get help",
        icon: "/icons/problem.svg",
        altTitle: "icons",
        btnColor: "#ffcc00",
        btnLink: "/finance-support/financial-hardship",
      },
      {
        id: 2,
        title: "Home loan & personal loan support",
        desc: ` Find the right solution to manage your loans smarter and more efficient with top-ups, balance transfers, flexible EMIs and part payments.`,
        btnText: "Get support",
        icon: "/icons/contact.svg",
        altTitle: "icons",
        btnLink: "/home-loan/home-loan-support",
      },
    ],
  };

  let keyfactors = {
    heading: "Affecting factors",
    items: [
      {
        id: 1,
        title: "Housing (Rent & EMI)​",
        desc: `Housing costs take up a major chunk of your budget. In metro cities, a 1BHK can cost ₹15,000 - ₹50,000, while smaller cities offer lower rents at ₹8,000 - ₹20,000. <br> Home loan EMIs range from ₹30,000 - ₹80,000, making financial planning essential. Use <a  href='/calculators/emi-calculator' class="underline underline-offset-4 text-linkColor">our Home Loan EMI Calculator </a>  to estimate and manage your payments.`,
        icon: "/icons/ownership.svg",
        altName: "home-icon",
      },
      {
        id: 2,
        title: "Food & Groceries​",
        desc: `Food expenses can quickly add up. A family of four spends ₹5,000 - ₹15,000 monthly on groceries, and inflation makes essentials pricier. <br> Frequent dining out further increases costs. Track your food budget with <a href="/planners/budget-planner" class="underline underline-offset-4 hover-no:underline">our Budget Planner </a>   and make informed spending choices.`,
        icon: "/icons/apply-pen.svg",
        altName: "apply-icon",
      },
      {
        id: 3,
        title: "Transportation (Fuel & Commuting)​",
        desc: `Transportation is another key expense. Public transport costs around ₹1,500/month, but car owners face fuel prices of ₹90-₹110 per litre, plus maintenance, tolls, and parking.`,
        icon: "/icons/fuel.svg",
        altName: "fuel-icon",
      },
      {
        id: 4,
        title: "Healthcare & Medical Expenses",
        desc: `Healthcare expenses can be unpredictable. A doctor’s visit costs ₹500 - ₹1,500, while health insurance with ₹5L coverage costs ₹8,000 - ₹12,000 annually. Hospitalization can reach ₹2L - ₹5L.​`,
        icon: "/icons/emergencyLoan.svg",
        altName: "health-icon",
      },
      {
        id: 5,
        title: "Education & Childcare",
        desc: `Education is a major investment. Private school fees range from ₹50,000 - ₹2L per year, and higher education can cost ₹10L - ₹25L. Coaching and tuition add to the burden. <br> Start building a secure financial future with smart savings—explore <a href="/money-map/how-long-will-your-savings-support-you" class="underline underline-offset-4 hover:no-underline">our Investment Plans </a>  to grow your funds steadily.`,
        icon: "/icons/educationLoan.svg",
        altName: "education-icon",
      },
      {
        id: 6,
        title: "Utilities & Discretionary Spending",
        desc: `Utilities and lifestyle expenses—electricity, internet, shopping, and entertainment—add ₹3,000 - ₹8,000 to monthly budgets. Managing these wisely ensures financial stability. `,
        icon: "/icons/checklist.svg",
        altName: "list-icon",
      },
    ],
  };
  let spreadWord = [
    "Invite & earn exclusive bonuses",
    "Each successful referral brings exciting perks.",
    "The best things in life are shared—start referring today!",
  ];

  let cardImg1 = "/images/happy-indian-girl-with-head-phone.jpg";
  let cardAlt1 =
    "happy indian girl listening offeres from DigitalDSA on her headphone";
  let cardHead1 = "Latest offers & deals";
  let sourceName = "Freepik";
  let originalSource =
    "https://www.freepik.com/free-photo/young-woman-wearing-embroidered-shirt_25909555.htm";
  let cardImg2 = "/images/message.jpg";
  let cardAlt2 = "CardCover";
  let cardHead2 = "Message us 24/7";

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
  title="Cost of Living Guide: Expenses, Savings & Financial Support"
  image="/images/indian-family-having-dinner-in-a-beautiful-home.jpg"
  description="Discover key cost of living factors, budgeting tips, loan support, and exclusive deals to manage expenses efficiently. Get started today!"
  keywords="cost of living, living expenses, financial planning, budgeting tips, loan support, home loan EMI, grocery costs, transportation costs, healthcare expenses, education costs, savings tips, balance transfer, personal loan, financial aid, loan offers, inflation impact, money management"
/>

<section class="mx-auto w-full">
  <PageDesign {pageData}>
    <div class="relative w-full hidden lg:block">
      <StickyNavbar
        navList={{
          items: [
            { name: "What is cost of living", targetId: "costOfLiving" },
            { name: "Affecting factors", targetId: "affectingFactors" },
            { name: "Financial support", targetId: "financialSupport" },
            { name: "Offers and deals", targetId: "offerDeals" },
            { name: "Other resources", targetId: "otherResource" },
          ],
        }}
        {activeSection}
      ></StickyNavbar>

      <div class="px-[2rem] lg:px-[4rem]">
        <div
          class="border-b border-[var(--form-border)] section"
          id="costOfLiving"
          data-section="costOfLiving"
        >
          <ThingsYouShould thinkKnow={costOfLiving} />
        </div>
        <div
          class="border-b border-[var(--form-border)] section"
          id="affectingFactors"
          data-section="affectingFactors"
        >
          <WhyChoose facilities={keyfactors} gridCol="3" />
        </div>
        <div
          id="financialSupport"
          data-section="financialSupport"
          class="border-b border-[var(--form-border)] sections"
        >
          <NewHome steps={repayments} />
        </div>

        <div
          class="pb-[2rem] border-b border-[var(--form-border)] section"
          id="offerDeals"
          data-section="offerDeals"
        >
          <TwoColumn
            cardImage={cardImg1}
            cardAltName={cardAlt1}
            cardHeading={cardHead1}
            {sourceName}
            {originalSource}
            imageHeight={5}
          >
            <div slot="list">
              <div class="flex flex-col gap-5 pb-[2rem]">
                <h2
                  class="font-semibold typography-h3 flex items-end gap-2 border-b border-[var(--form-border)] pb-[.3rem]"
                >
                  <img src="/icons/no-fee.svg" alt="no-fee-icon" class="h-16" />
                  With Maximum Benefits!
                </h2>

                <ul class="typography-body-md text-text-light">
                  <li class="flex items-center gap-2">
                    <span
                      ><img
                        src="/icons/circle-check.svg"
                        alt=""
                        class="h-4"
                      /></span
                    >
                    Compare loans, find the best deals, and secure them – all for
                    FREE.
                  </li>
                  <li class="flex items-center gap-2">
                    <span
                      ><img
                        src="/icons/circle-check.svg"
                        alt=""
                        class="h-4"
                      /></span
                    >
                    Check loan offers anytime, anywhere – no need to visit banks.
                  </li>
                  <li class="flex items-center gap-2">
                    <span
                      ><img
                        src="/icons/circle-check.svg"
                        alt=""
                        class="h-4"
                      /></span
                    >
                    Find the best deals in minutes – your data stays secure, no hidden
                    surprises.
                  </li>
                  <li class="flex items-center gap-2">
                    <span
                      ><img
                        src="/icons/circle-check.svg"
                        alt=""
                        class="h-4"
                      /></span
                    >
                    With Digital DSA, effortlessly check loan offers and secure the
                    best deals.
                  </li>
                </ul>
                <p class="flex gap-2 items-end">
                  👉
                  <a
                    href="/get-started/how-can-we-help"
                    class="typography-body-md text-text-light text-linkColor underline"
                  >
                    Get Started</a
                  >
                </p>
              </div>

              <div class="flex flex-col gap-5 pt-[2rem]">
                <h2
                  class="font-semibold typography-h3 flex gap-6 items-end border-b border-[var(--form-border)] pb-[.3rem]"
                >
                  <img src="/icons/referral.svg" alt="" class="h-16" /> Spread the
                  Word
                </h2>
                <p class="typography-body-sm text-text-light">
                  Earn Rewards by Referring! Your friends win, and so do you!
                </p>
                <ul class="typography-body-sm text-text-light">
                  {#each spreadWord as item}
                    <li class="flex items-center gap-2">
                      <span
                        ><img
                          src="/icons/circle-check.svg"
                          alt=""
                          class="h-4"
                        /></span
                      >
                      {item}
                    </li>
                  {/each}
                </ul>
                <p class="flex gap-2 items-end">
                  👉
                  <a
                    href="/refer-&-earn"
                    class="typography-body-md text-text-light text-linkColor underline"
                  >
                    Refer Now & Start Earning</a
                  >
                </p>
              </div>
            </div>
          </TwoColumn>
        </div>

        <div class="pb-[2rem]" id="otherResource" data-section="otherResource">
          <!-- <FactSheet keyFact={resources} /> -->
          <!-- <div
            class="grid md:grid-cols-3 border-b border-divideColor gap-[1.5rem]"
          >
            <h2
              class="md:col-span-1 pt-[4rem] typography-h2 text-text-main"
            >
              Latest articles & insights
            </h2>
            <div class="col-span-2">
              <Support {contents} gridCol={2} />
            </div>
          </div> -->

          <div class="pb-[2rem] border-b border-[var(--form-border)]">
            <TwoColumn
              cardImage={cardImg2}
              cardAltName={cardAlt2}
              cardHeading={cardHead2}
              reverse
            >
              <ul
                class="grid gap-[2rem] typography-body-md text-text-light"
                slot="list"
              >
                <p class="typography-body-sm text-text-light">
                  Feel free to message us anytime for expert assistance with
                  your loan needs. Our team is here to provide professional
                  advice, guide you through the loan process, and help you find
                  the best options. No matter the time, we’ve got you covered!
                  Message us anytime, and we’ll respond promptly.
                </p>

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
          <LoanSupport {support} />
        </div>
      </div>
    </div>
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

          {#if index == 0}
            <div id="costOfLiving" class="text-black bg-white">
              <ThingsYouShould thinkKnow={costOfLiving} />
            </div>
          {:else if index == 1}
            <div id="affectingFactors" class="px-[0.5rem] text-black bg-white">
              <WhyChoose facilities={keyfactors} />
            </div>
          {:else if index == 2}
            <div id="financialSupport" class="px-[0.5rem] text-black bg-white">
              <NewHome steps={repayments} />
            </div>
            <!-- {:else if index == 3}
            <div
              class="pb-[2rem] border-b border-dividerColor px-[2rem] text-black bg-white"
             
            >
            <HomeLoanCalculator
            homeLoanCalculator={moneyManagementTools}
            gridCol="3"
          />
            </div> -->
          {:else if index == 3}
            <div id="offerDeals" class="px-[0.5rem] text-black bg-white">
              <TwoColumn
                cardImage={cardImg1}
                cardAltName={cardAlt1}
                cardHeading={cardHead1}
                imageHeight={5}
              >
                <div slot="list">
                  <div class="flex flex-col gap-5 pb-[2rem]">
                    <!-- <h2 class="font-semibold typography-h3">
                  Exclusive Cashback Offers
                </h2> -->
                    <h2
                      class="font-semibold typography-h3 flex items-end gap-2 border-b border-[var(--form-border)] pb-[.3rem]"
                    >
                      <img src="/icons/no-fee.svg" alt="" class="h-10" /> With Maximum
                      Benefits!
                    </h2>
                    <!-- <a
                    href=""
                    class="typography-body-md text-text-light text-linkColor underline"
                    >Get more</a
                  > -->
                    <ul class="typography-body-md text-text-light">
                      <li class="flex items-center gap-2">
                        <span
                          ><img
                            src="/icons/circle-check.svg"
                            alt=""
                            class="h-4"
                          /></span
                        >
                        Compare loans, find the best deals, and secure them – all
                        for FREE.
                      </li>
                      <li class="flex items-center gap-2">
                        <span
                          ><img
                            src="/icons/circle-check.svg"
                            alt=""
                            class="h-4"
                          /></span
                        >
                        Check loan offers anytime, anywhere – no need to visit banks.
                      </li>
                      <li class="flex items-center gap-2">
                        <span
                          ><img
                            src="/icons/circle-check.svg"
                            alt=""
                            class="h-4"
                          /></span
                        >
                        Find the best deals in minutes – your data stays secure,
                        no hidden surprises.
                      </li>
                      <li class="flex items-center gap-2">
                        <span
                          ><img
                            src="/icons/circle-check.svg"
                            alt=""
                            class="h-4"
                          /></span
                        >
                        With Digital DSA, effortlessly check loan offers and secure
                        the best deals.
                      </li>
                    </ul>
                    <p class="flex gap-2 items-end">
                      👉
                      <a
                        href="/get-started/how-can-we-help"
                        class="typography-body-md text-text-light text-linkColor underline"
                      >
                        Get Started</a
                      >
                    </p>
                  </div>

                  <div class="flex flex-col gap-5 pt-[2rem]">
                    <h2
                      class="font-semibold typography-h3 flex gap-6 items-end border-b border-[var(--form-border)] pb-[.3rem]"
                    >
                      <img src="/icons/referral.svg" alt="" class="h-10" /> Spread
                      the Word
                    </h2>
                    <p class="typography-body-sm text-text-light">
                      Earn Rewards by Referring! Your friends win, and so do
                      you!
                    </p>
                    <ul class="typography-body-sm text-text-light">
                      {#each spreadWord as item}
                        <li class="flex items-center gap-2">
                          <span
                            ><img
                              src="/icons/circle-check.svg"
                              alt=""
                              class="h-4"
                            /></span
                          >
                          {item}
                        </li>
                      {/each}
                    </ul>
                    <p class="flex gap-2 items-end">
                      👉
                      <a
                        href="/refer-&-earn"
                        class="typography-body-md text-text-light text-linkColor underline"
                      >
                        Refer Now & Start Earning</a
                      >
                    </p>
                  </div>
                </div>
              </TwoColumn>
            </div>
          {:else if index == 4}
            <div id="otherResources" class="px-[0.5rem] text-black bg-white">
              <!-- <FactSheet keyFact={resources} /> -->
              <!-- <div class="grid md:grid-cols-3 md:border-b border-dividerColor">
                <h2
                  class="col-span-1 py-[1rem] sm:py-[4rem] typography-h3 font-semibold text-text-main md:typography-h2-md lg:typography-h2"
                >
                  Latest articles & insights
                </h2>
                <div class="col-span-2">
                  <Support {contents} gridCol={2} />
                </div>
              </div> -->

              <div class="pb-[2rem]">
                <TwoColumn
                  cardImage={cardImg2}
                  cardAltName={cardAlt2}
                  cardHeading={cardHead2}
                >
                  <ul
                    class="grid gap-[2rem] typography-body-md text-text-light"
                    slot="list"
                  >
                    <p class="typography-body-sm text-text-light">
                      Feel free to message us anytime for expert assistance with
                      your loan needs. Our team is here to provide professional
                      advice, guide you through the loan process, and help you
                      find the best options. No matter the time, we’ve got you
                      covered! Message us anytime, and we’ll respond promptly.
                    </p>

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

              <LoanSupport {support} />
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
      <ThingsYouShould {thinkKnow} disc="list-decimal" />
    </div>
  </PageDesign>
</section>

<style>
  .section {
    scroll-margin-top: 4rem; /* Adjust this value to match your navbar height */
  }
</style>
