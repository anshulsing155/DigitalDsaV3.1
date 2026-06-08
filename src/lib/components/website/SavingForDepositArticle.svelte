<script>
	let {
		pageData = {
    coverImage: "/images/investInProperty-cover.jpg",
    altName: "photo of a couple investing for downpayment of home loan",
    heading: "Saving for a Down Payment",
    para: `<p>Saving for a down payment may seem challenging, but with the right plan, it’s completely doable. Small changes in your spending, a smart budget, and consistent savings can bring you closer to your dream home. Plus, with the right guidance and support, the journey becomes much easier. <span class="mt-4"> Start today, and step by step, you’ll get there!</span> </p>`,

    actionBtns: [
      {
        btnName: "Book appointment",
        btnLink: "/appointment",
      },
      {
        btnName: "Compare offers",
        btnLink: "/get-started/how-can-we-help",
        btnColor: "#ffcc00",
        animation: true,
      },
    ],
  }
	} = $props();


  import NewPageLayout from "$lib/components/website/NewPageLayout.svelte";
  import TwoColumnWithLeftHeading from "$lib/components/website/TwoColumnWithLeftHeading.svelte";
  import VerticalBlog from "./VerticalBlog.svelte";
  import HelpList from "./HelpList.svelte";
  import ThingsYouKnow from "./ThingsYouKnow.svelte";
  import TwoColumnWithImage from "./TwoColumnWithImage.svelte";
  import Button from "./Button.svelte";
  import StickyNavbar from "./StickyNavbar.svelte";
  import { onMount } from "svelte";
  import ThreeColumWithLeftHeading from "./ThreeColumWithLeftHeading.svelte";
  import Seo from "$lib/components/Seo.svelte";
  let activeSection = "";

  // mobile-accordion
  let navBarMedium = [
    "Introduction",
    "Understand spending",
    "Start saving",
    "Guidance",
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

;
</script>

<Seo
  type="WebPage"
  title="Smart Ways to Save for a Down Payment | Digital DSA Guide"
  image={pageData.coverImage}
  description="Learn smart strategies to save for a down payment, reduce debt & secure a home loan. Get expert guidance & tools at Digital DSA."
  keywords="Save for a down payment, Home loan savings tips, First-time home buyer savings, Down payment assistance, Smart budgeting for a home, Home buying financial planning, Reduce debt for home loan, Best ways to save for a house, Mortgage down payment tips, Digital DSA home loan guide"
/>

<section class="content">
  <NewPageLayout {pageData}>
    <!-- desktop view -->
    <div class="hidden lg:block">
      <div class="sticky-section">
        <StickyNavbar
          navList={{
            items: [
              {
                name: "Introduction",
                targetId: "intro",
              },
              {
                name: "Understand spending",
                targetId: "understand-spending",
              },
              {
                name: "Start saving",
                targetId: "start-saving",
              },
              {
                name: "Guidance",
                targetId: `guidance`,
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
        ></StickyNavbar>
      </div>

      <div id="intro" data-section="intro" class="section-1">
        <TwoColumnWithLeftHeading
          contents={{
            heading: "Ways to Save for a Down Payment",

            secPara: `<p class="font-Paragraph text-miniSubHead mb-8">Turning your dream of owning your first home into reality starts here.✨</p>
                        
                        <p class="mb-4">Owning your first home is a major milestone—but we know it can also feel overwhelming, especially when you’re navigating the world of <a href="/finance-support/financial-hardship" class="underline">financial planning</a> and <a href="/home-loan" class="underline">home loans</a> for the first time. That’s where we come in. At Digital DSA, we’re not just advisors; we’re partners in your journey, here to ensure you feel informed, confident, and supported every step of the way.</p>
                        <p>🚀 Let’s start with some practical steps to help you save for your down payment.</p>
                        `,
          }}
        />
      </div>
      <div
        id="understand-spending"
        data-section="understand-spending"
        class="section"
      >
        <TwoColumnWithLeftHeading
          contents={{
            listTopPara: `<p>Before creating a savings plan, it’s essential to have a clear picture of your finances.</p>`,
            heading: "Understand Your Current Spending Habits ",
            list: [
              {
                heading: `<span>Track your spending :</span>`,
                desc: `<span>List your monthly income and expenses to identify areas where your money is going.</span>`,
              },
              {
                heading: `<span>Analyze habits :</span>`,
                desc: `<span>Are there subscriptions you’re not using? Could you reduce discretionary spending on eating out or entertainment?</span>`,
              },
            ],
            listSecPara: `<p>✅ By understanding your spending patterns, you can pinpoint where to make changes.</p>`,
          }}
        />

        <TwoColumnWithLeftHeading
          contents={{
            listTopPara: `<p>Saving for a down payment isn’t about drastic sacrifices—it’s about consistency.</p>`,
            heading: "Create a Realistic Budget",
            list: [
              {
                heading: `<span>Start with small changes :</span>`,
                desc: `<span>Cutting out daily coffees might save ₹2,000 a month, but bigger changes like reducing rent costs or sharing a living space temporarily could save significantly more.</span>`,
              },
              {
                heading: `<span>Simulate your future home loan :</span>`,
                desc: `<span>Start saving an amount similar to your expected loan EMI. This will not only help you build a down payment but also prepare you for managing repayments later.</span>`,
              },
            ],
            listSecPara: `<p><span class="font-FourthHead">💡Remember :</span> Slow and steady wins the race. Aim for a sustainable budget you can stick to over the long term.</p>`,
          }}
        />
        <TwoColumnWithLeftHeading
          contents={{
            listTopPara: `<p>Banks favor borrowers with minimal or manageable debts. If you’re juggling multiple loans or credit cards:</p>`,
            heading: "Tackle Your Debts",
            list: [
              {
                heading: `<span>Consolidate your debts :</span>`,
                desc: `<span>Consider combining debts into one with a lower interest rate to reduce payments.</span>`,
              },
              {
                heading: `<span>Clear smaller debts first :</span>`,
                desc: `<span>The fewer liabilities you have, the better your financial profile will look to lenders.</span>`,
              },
            ],
          }}
        />
      </div>
      <div id="start-saving" data-section="start-saving" class="section">
        <TwoColumnWithLeftHeading
          contents={{
            listTopPara: `<p>The more you save, the less you’ll need to borrow—and that means lower interest payments over time.</p>`,
            heading: "Start Saving Strategically",
            list: [
              {
                heading: `<span>Automate savings :</span>`,
                desc: `<span>Set up an auto-transfer to a dedicated savings account each payday.</span>`,
              },
              {
                heading: `<span>Explore savings tools :</span>`,
                desc: `<span>Look for high-yield savings accounts or term deposits to grow your down payment faster.</span>`,
              },
              {
                heading: `<span>Plan for additional costs :</span>`,
                desc: `<span>Beyond the down payment, remember to budget for upfront costs like <span class="font-FourthHead">stamp duty</span>, <span class="font-FourthHead">registration charges</span>, or <span class="font-FourthHead">legal fees.</span></span>`,
              },
            ],
          }}
        />

        <TwoColumnWithLeftHeading
          contents={{
            listTopPara: `<p>As a first-time homebuyer, you may be eligible for support programs:</p>`,
            heading: "Leverage Available Assistance",
            list: [
              {
                heading: `<span>Home Guarantee Schemes :</span>`,
                desc: `<span>Many state or national programs allow you to buy with as little as 5% down payment, saving years of effort.</span>`,
              },
              {
                heading: `<span>Family Assistance :</span>`,
                desc: `<span>Explore if a family member could help with a financial gift or offer to co-sign your loan.</span>`,
              },
              {
                heading: `<span>First Home Buyer Grants :</span>`,
                desc: `<span>Check if your state offers incentives or subsidies for first-time buyers.</span>`,
              },
            ],
          }}
        />
        <TwoColumnWithLeftHeading
          contents={{
            listTopPara: `<p>Navigating financial jargon, choosing the right property, and understanding loan options can feel intimidating. Our Home Loan Resources Hub is designed to simplify the process with tools like:</p>`,
            heading: "Educate Yourself on Home Loans",
            list: [
              {
                heading: `<span>Affordability Calculators :</span>`,
                desc: `<span>Find out how much you can comfortably borrow. <a href="/calculators/affordability-calculator">🔍(Check Here)</a></span>`,
              },
              {
                heading: `<span>Step-by-Step Loan Guidance :</span>`,
                desc: `<span>We walk you through everything, from choosing the right loan to understanding repayment options.</span>`,
              },
              {
                heading: `<span>Loan Planners :</span>`,
                desc: `<span>Learn how part payments or rate changes impact your finances. <a href="/planners/part-payment-planner">🔍(Check Here)</a></span>`,
              },
            ],
          }}
        />
      </div>
      <div id="guidance" data-section="guidance" class="section">
        <TwoColumnWithLeftHeading
          contents={{
            listTopPara: `<p>At Digital DSA, we know that first-time buyers often face challenges like dealing with brokers, builders, and complex financial terms. That’s why we offer:</p>`,
            heading: "Secure Guidance from Trusted Advisors",
            list: [
              {
                heading: `<span>Personalized support :</span>`,
                desc: `<span>Our team doesn’t just assist; we educate you on every detail of the process.</span>`,
              },
              {
                heading: `<span>Transparency :</span>`,
                desc: `<span>No hidden fees, no unnecessary calls—just honest advice.</span>`,
              },
              {
                heading: `<span>Tools to empower you :</span>`,
                desc: `<span>Use our <a href="/calculators/emi-calculator" class="font-FourthHead underline">Calculators</a> and <a href="/planners/part-payment-planner" class="font-FourthHead underline">Planners</a> to make informed decisions.</span>`,
              },
            ],
          }}
        />
        <TwoColumnWithLeftHeading
          contents={{
            listTopPara: `<p>Saving for a down payment  is just the beginning of your journey. With proper planning and the right guidance, your dream of homeownership is closer than you think.</p>`,
            heading: "Take Small, Confident Steps Toward Your Goal",
            list: [
              {
                heading: `<span>Set clear goals :</span>`,
                desc: `<span>Define how much you need to save and set a timeline to keep yourself on track.</span>`,
              },
              {
                heading: `<span>Monitor progress :</span>`,
                desc: `<span>Regularly review your savings and adjust your plan as needed to stay on course.</span>`,
              },
              {
                heading: `<span>Stay motivated :</span>`,
                desc: `<span>Celebrate small milestones along the way to keep your spirits high.</span>`,
              },
            ],
          }}
        />
        <div class="px-2 py-8 md:p-16 items-center border-b border-[#E5E5E5]">
          <h2 class="text-minSubHead mb-4 font-ThirdHead">Final Thoughts</h2>
          <p>
            At Digital DSA, we’ll help you navigate every aspect of buying your
            first home, from saving for a down payment to securing the best loan
            offers. Our platform is your one-stop solution to feel secure,
            informed and ready to take on this exciting milestone.
          </p>
        </div>
      </div>
    </div>

    <!-- mobile view -->

    <div class="block lg:hidden">
      {#each navBarMedium as list, index}
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

          {#if index === 0}
            <div id="intro" class="text-black bg-white">
              <TwoColumnWithLeftHeading
                contents={{
                  heading: "Ways to Save for a Down Payment",

                  secPara: `<p class="font-Paragraph text-miniSubHead mb-8">Turning your dream of owning your first home into reality starts here.✨</p>
                        
                        <p class="mb-4">Owning your first home is a major milestone—but we know it can also feel overwhelming, especially when you’re navigating the world of <a href="/finance-support/financial-hardship" class="underline">financial planning</a> and <a href="/home-loan" class="underline">home loans</a> for the first time. That’s where we come in. At Digital DSA, we’re not just advisors; we’re partners in your journey, here to ensure you feel informed, confident, and supported every step of the way.</p>
                        <p>🚀 Let’s start with some practical steps to help you save for your down payment.</p>
                        `,
                }}
              />
            </div>
          {:else if index === 1}
            <div id="understand-spending" class="bg-white text-black">
              <TwoColumnWithLeftHeading
                contents={{
                  listTopPara: `<p>Before creating a savings plan, it’s essential to have a clear picture of your finances.</p>`,
                  heading: "Understand Your Current Spending Habits ",
                  list: [
                    {
                      heading: `<span>Track your spending :</span>`,
                      desc: `<span>List your monthly income and expenses to identify areas where your money is going.</span>`,
                    },
                    {
                      heading: `<span>Analyze habits :</span>`,
                      desc: `<span>Are there subscriptions you’re not using? Could you reduce discretionary spending on eating out or entertainment?</span>`,
                    },
                  ],
                  listSecPara: `<p>✅ By understanding your spending patterns, you can pinpoint where to make changes.</p>`,
                }}
              />

              <TwoColumnWithLeftHeading
                contents={{
                  listTopPara: `<p>Saving for a down payment isn’t about drastic sacrifices—it’s about consistency.</p>`,
                  heading: "Create a Realistic Budget",
                  list: [
                    {
                      heading: `<span>Start with small changes :</span>`,
                      desc: `<span>Cutting out daily coffees might save ₹2,000 a month, but bigger changes like reducing rent costs or sharing a living space temporarily could save significantly more.</span>`,
                    },
                    {
                      heading: `<span>Simulate your future home loan :</span>`,
                      desc: `<span>Start saving an amount similar to your expected loan EMI. This will not only help you build a down payment but also prepare you for managing repayments later.</span>`,
                    },
                  ],
                  listSecPara: `<p><span class="font-FourthHead">💡Remember :</span> Slow and steady wins the race. Aim for a sustainable budget you can stick to over the long term.</p>`,
                }}
              />
              <TwoColumnWithLeftHeading
                contents={{
                  listTopPara: `<p>Banks favor borrowers with minimal or manageable debts. If you’re juggling multiple loans or credit cards:</p>`,
                  heading: "Tackle Your Debts",
                  list: [
                    {
                      heading: `<span>Consolidate your debts :</span>`,
                      desc: `<span>Consider combining debts into one with a lower interest rate to reduce payments.</span>`,
                    },
                    {
                      heading: `<span>Clear smaller debts first :</span>`,
                      desc: `<span>The fewer liabilities you have, the better your financial profile will look to lenders.</span>`,
                    },
                  ],
                }}
              />
            </div>
          {:else if index === 2}
            <div id="start-saving" class="bg-white text-black">
              <TwoColumnWithLeftHeading
                contents={{
                  listTopPara: `<p>The more you save, the less you’ll need to borrow—and that means lower interest payments over time.</p>`,
                  heading: "Start Saving Strategically",
                  list: [
                    {
                      heading: `<span>Automate savings :</span>`,
                      desc: `<span>Set up an auto-transfer to a dedicated savings account each payday.</span>`,
                    },
                    {
                      heading: `<span>Explore savings tools :</span>`,
                      desc: `<span>Look for high-yield savings accounts or term deposits to grow your down payment faster.</span>`,
                    },
                    {
                      heading: `<span>Plan for additional costs :</span>`,
                      desc: `<span>Beyond the down payment, remember to budget for upfront costs like <span class="font-FourthHead">stamp duty</span>, <span class="font-FourthHead">registration charges</span>, or <span class="font-FourthHead">legal fees.</span></span>`,
                    },
                  ],
                }}
              />

              <TwoColumnWithLeftHeading
                contents={{
                  listTopPara: `<p>As a first-time homebuyer, you may be eligible for support programs:</p>`,
                  heading: "Leverage Available Assistance",
                  list: [
                    {
                      heading: `<span>Home Guarantee Schemes :</span>`,
                      desc: `<span>Many state or national programs allow you to buy with as little as 5% down payment, saving years of effort.</span>`,
                    },
                    {
                      heading: `<span>Family Assistance :</span>`,
                      desc: `<span>Explore if a family member could help with a financial gift or offer to co-sign your loan.</span>`,
                    },
                    {
                      heading: `<span>First Home Buyer Grants :</span>`,
                      desc: `<span>Check if your state offers incentives or subsidies for first-time buyers.</span>`,
                    },
                  ],
                }}
              />
              <TwoColumnWithLeftHeading
                contents={{
                  listTopPara: `<p>Navigating financial jargon, choosing the right property, and understanding loan options can feel intimidating. Our Home Loan Resources Hub is designed to simplify the process with tools like:</p>`,
                  heading: "Educate Yourself on Home Loans",
                  list: [
                    {
                      heading: `<span>Affordability Calculators :</span>`,
                      desc: `<span>Find out how much you can comfortably borrow. <a href="/calculators/affordability-calculator">🔍(Check Here)</a></span>`,
                    },
                    {
                      heading: `<span>Step-by-Step Loan Guidance :</span>`,
                      desc: `<span>We walk you through everything, from choosing the right loan to understanding repayment options.</span>`,
                    },
                    {
                      heading: `<span>Loan Planners :</span>`,
                      desc: `<span>Learn how part payments or rate changes impact your finances. <a href="/planners/part-payment-planner">🔍(Check Here)</a></span>`,
                    },
                  ],
                }}
              />
            </div>
          {:else if index === 3}
            <div id="guidance" class="bg-white text-black">
              <TwoColumnWithLeftHeading
                contents={{
                  listTopPara: `<p>At Digital DSA, we know that first-time buyers often face challenges like dealing with brokers, builders, and complex financial terms. That’s why we offer:</p>`,
                  heading: "Secure Guidance from Trusted Advisors",
                  list: [
                    {
                      heading: `<span>Personalized support :</span>`,
                      desc: `<span>Our team doesn’t just assist; we educate you on every detail of the process.</span>`,
                    },
                    {
                      heading: `<span>Transparency :</span>`,
                      desc: `<span>No hidden fees, no unnecessary calls—just honest advice.</span>`,
                    },
                    {
                      heading: `<span>Tools to empower you :</span>`,
                      desc: `<span>Use our <a href="/calculators/emi-calculator" class="font-FourthHead underline">Calculators</a> and <a href="/planners/part-payment-planner" class="font-FourthHead underline">Planners</a> to make informed decisions.</span>`,
                    },
                  ],
                }}
              />
              <TwoColumnWithLeftHeading
                contents={{
                  listTopPara: `<p>Saving for a down payment  is just the beginning of your journey. With proper planning and the right guidance, your dream of homeownership is closer than you think.</p>`,
                  heading: "Take Small, Confident Steps Toward Your Goal",
                  list: [
                    {
                      heading: `<span>Set clear goals :</span>`,
                      desc: `<span>Define how much you need to save and set a timeline to keep yourself on track.</span>`,
                    },
                    {
                      heading: `<span>Monitor progress :</span>`,
                      desc: `<span>Regularly review your savings and adjust your plan as needed to stay on course.</span>`,
                    },
                    {
                      heading: `<span>Stay motivated :</span>`,
                      desc: `<span>Celebrate small milestones along the way to keep your spirits high.</span>`,
                    },
                  ],
                }}
              />
              <div
                class="px-2 py-8 md:p-16 items-center border-b border-[#E5E5E5]"
              >
                <h2 class="text-minSubHead mb-4 font-ThirdHead">
                  Final Thoughts
                </h2>
                <p>
                  At Digital DSA, we’ll help you navigate every aspect of buying
                  your first home, from saving for a down payment to securing
                  the best loan offers. Our platform is your one-stop solution
                  to feel secure, informed and ready to take on this exciting
                  milestone.
                </p>
              </div>
            </div>
          {/if}
        </details>
      {/each}
    </div>

    <div class="px-[0.5rem] lg:px-[4rem] py-[4rem]">
      <h2 class="mb-5 text-minSubHead font-ThirdHead">
        Explore More Resources 📖
      </h2>
      <p class="mb-4 font-FourthHead">Related Articles:</p>
      <div class="flex flex-col md:flex-row gap-4">
        <VerticalBlog
          blogLists={[
            {
              icon: "/images/TheSharmaFamilyStory.jpg",
              altName:
                "photo of a family saving money and selling the existing house for new home purchase",
              heading: "Buying a Property Through Resale or Direct Purchase",
              url: "/home-loan/buy-property-resale",
            },

            {
              icon: "/images/couple-looking-at-dream-home.jpg",
              altName: "couple looking at dream home",
              heading: "Should You Get Home Loan Conditional Pre-Approval?",
              url: "/home-loan/conditional-pre-approval",
            },
            {
              icon: "/images/SmartWaystoCloseYourHOmeLOanEarly.jpg",
              altName:
                "photo of a couple looking for smart ways to close loan early",
              heading: "Smart Ways to Close Your Loan Early",
              url: "/home-loan/close-your-loan-early",
            },
          ]}
        />
      </div>
    </div>
    <ThreeColumWithLeftHeading
      contents={{
        heading: `Tools & calculators`,
        cardData: [
          {
            id: "1",
            title: "Calculators",
            links: [
              {
                id: 1,
                secLinkName: "How much can I borrow?",
                secUrl: "/calculators/eligibility-calculator",
              },
              {
                id: 2,
                secLinkName: "What would my repayments be?",
                secUrl: "/planners/part-payment-planner",
              },
              {
                id: 3,
                secLinkName: "What would my upfront costs be?",
                secUrl: "/calculators/balance-transfer-calculator",
              },
            ],
          },
          {
            id: 2,
            title: "Tools",
            links: [
              {
                id: 1,
                secLinkName: "Compare our home loans",
                secUrl: "/get-started/how-can-we-help",
              },
              {
                id: 2,
                secLinkName: "Budget planner",
                secUrl: "/planners/budget-planner",
              },
            ],
          },
        ],
      }}
    />
    <TwoColumnWithImage
      contents={{
        cardImage: "/images/message.jpg",
        cardAltName: "housing-figure",
        cardHeading: "Message us 24/7",
        reverse: true,
      }}
    >
      <p>
        Feel free to message us anytime for expert assistance with your loan
        needs. Our team is here to provide professional advice, guide you
        through the loan process, and help you find the best options. No matter
        the time, we’ve got you covered! Message us anytime, and we’ll respond
        promptly.
      </p>
      <Button link="/contact" btnBorder="#4F4C4D" btnName="Message us" />
    </TwoColumnWithImage>
    <div slot="secondary" class="">
      <HelpList
        contents={{
          heading: `We're here to help`,
          xlGridCol: 4,
          borderBottom: false,
          cards: [
            {
              heading: "Know your borrowing power",
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

      <ThingsYouKnow contents={{ heading: `Things you should know` }}>
        <ul class="list-decimal pl-4 flex flex-col gap-4 px-2">
          <li>
            Saving for a house down payment requires disciplined financial
            planning, budgeting, and reducing discretionary expenses.
          </li>
          <li>
            Home loan eligibility depends on factors like credit score, income,
            employment history, and existing debts.
          </li>
          <li>
            Interest rates and loan terms vary across lenders, so comparing
            options can help secure better deals.
          </li>
          <li>
            Additional costs like stamp duty, legal fees, insurance, and
            registration should be factored into your budget.
          </li>
          <li>
            Automating monthly savings and using high-yield savings accounts or
            fixed deposits can help grow your down payment faster.
          </li>
          <li>
            Government schemes, first-time buyer grants, and family assistance
            can reduce your upfront financial burden.
          </li>
        </ul>
      </ThingsYouKnow>
    </div>
  </NewPageLayout>
</section>
