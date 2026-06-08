<script>
	let {
		data,
		pageData = {
    coverImage: "/images/couple-looking-at-dream-home.jpg",
    altName: "couple looking at dream home",
    heading: "Should You Get Home Loan Conditional Pre-Approval?",
    para: `Conditional pre-approval can be your secret weapon to secure your dream home before someone else does. Here's why it matters and how it can help you in your home-buying journey.`,
    actionBtns: [
      {
        btnName: "Book appointment",
        btnLink: "/appointment",
      },
      {
        btnName: "Compare rates",
        btnLink: "/get-started/how-can-we-help",
        btnColor: "#ffcc00",
        animation: true,
      },
    ],
  }
	} = $props();


  import NewPageLayout from "$lib/components/website/NewPageLayout.svelte";
  import TwoColumnWithLeftHeading from "$lib/components/website/TwoColumnWithLeftHeading.svelte";
  
  import StickyNavbar from "$lib/components/website/StickyNavbar.svelte";
  import { onMount } from "svelte";
  import ThreeColumWithLeftHeading from "$lib/components/website/ThreeColumWithLeftHeading.svelte";
  import TwoColumnWithImage from "$lib/components/website/TwoColumnWithImage.svelte";
  import Button from "$lib/components/website/Button.svelte";
  import HelpList from "$lib/components/website/HelpList.svelte";
  import ThingsYouKnow from "$lib/components/website/ThingsYouKnow.svelte";
  import Seo from "./Seo.svelte";

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
  title="Should You Get Home Loan Conditional Pre-Approval?"
  image={pageData.coverImage}
  description="Discover the benefits of home loan conditional pre-approval. Get a clear budget, fast-track approval & secure your dream home with Digital DSA."
  keywords="Home loan pre-approval, Conditional pre-approval, Mortgage pre-approval, Home buying loan approval, Pre-approved home loan, Mortgage approval process, Digital home loan application, Home loan eligibility check, First-time home buyer loan, Get pre-approved for a mortgage, Fast home loan pre-approval, Secure home financing, Mortgage application process, Online home loan approval, Digital DSA home loans"
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
                name: "Introduction",
                targetId: "intro",
              },
              {
                name: "Advantages",
                targetId: "advantages",
              },
              {
                name: "Prepration",
                targetId: "preperation",
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
                btnName: "Compare rates",
                btnLink: "/get-started/how-can-we-help",
                btnColor: "#ffcc00",
              },
            ],
          }}
          {activeSection}
        ></StickyNavbar>
      </div>

      <div id="intro" data-section="intro" class="section">
        <TwoColumnWithLeftHeading
          contents={{
            heading: "What is Conditional Pre-Approval?",
            secPara: `<p class="mb-4">Conditional pre-approval is an indication from a lender that, based on an initial assessment of your finances, you’re eligible to apply for a home loan up to a specific amount. While it’s not a guarantee, it shows sellers and agents that you’re serious about buying and provides confidence that you can afford a property within a specific price range.</p>
                        <p>At Digital DSA, we help you understand the process of pre-approval and ensure your financial details are accurately presented to maximize your chances.</p>`,
          }}
        />
      </div>
      <div id="advantages" data-section="advantages" class="section">
        <TwoColumnWithLeftHeading
          contents={{
            heading: "Advantages of Conditional Pre-Approval",
            listTopPara:
              "Here are some key benefits of obtaining conditional pre-approval:",
            list: [
              {
                heading: `<span>Gives You a Clear Budget :</span>`,
                desc: `<span>Pre-approval helps you understand how much you can borrow, letting you focus on properties within your price range. This saves you time and energy by narrowing down your search.</span>`,
              },
              {
                heading: `<span>Makes You a Serious Buyer :</span>`,
                desc: `<span>Conditional pre-approval demonstrates to sellers that you’re prepared and capable of securing finance, giving you a competitive edge in negotiations.</span>`,
              },
              {
                heading: `<span>Saves Time When It Matters Most :</span>`,
                desc: `<span>If you find your dream home, being pre-approved can expedite the loan approval process. Sellers are more likely to favor buyers who are ready to move forward quickly.</span>`,
              },
              {
                heading: `<span>Adapts to Changing Situations :</span>`,
                desc: `<span>If your financial circumstances or property preferences change, you can renew your pre-approval to reflect your updated position.</span>`,
              },
            ],
          }}
        />
      </div>

      <div id="preperation" data-section="preperation" class="section">
        <TwoColumnWithLeftHeading
          contents={{
            heading: "What Should You Know Before Applying?",
            listTopPara:
              "When applying for conditional pre-approval, lenders typically assess:",
            list: [
              {
                heading: `The price range of properties you’re considering.`,
              },
              {
                heading: `Your current savings for a down payment.`,
              },
              {
                heading: `Your income and employment stability.`,
              },
              {
                heading: `Your monthly living expenses.`,
              },
            ],
            listSecPara: `✅ Keep in mind that pre-approval is usually valid for 3-6 months. If you don’t find a property within that timeframe, you may need to reapply.`,
          }}
        />

        <TwoColumnWithLeftHeading
          contents={{
            heading:
              "How to Apply for Conditional Pre-Approval with Digital DSA",
            listTopPara:
              "Unlike traditional lenders or banks, Digital DSA simplifies the process with:",
            list: [
              {
                heading: `Online Eligibility Checks: `,
                desc: `Our platform helps you quickly calculate how much you can borrow based on your financial details.`,
              },
              {
                heading: `Expert Guidance: `,
                desc: `We provide start-to-finish support, ensuring you understand the process and submit all required documents correctly.`,
              },
              {
                heading: `No Spam Calls: `,
                desc: `We respect your privacy while offering you personalized solutions.`,
              },
            ],
            listSecPara: `<p class="font-FourthHead text-miniSubHead">Here’s how to get started :</p>
        
        <ul class="space-y-4 list-disc mt-4 ">
        <p>✅ Use our Home Loan Eligibility Calculator to get an estimate.</p>
        <p>✅ Provide basic financial information like your income, expenses, and down payment savings.</p>
        <p>✅ Let our advisors guide you through the pre-approval process, ensuring everything is in place for when you find the perfect property.</p>
        </ul>
        `,
          }}
        />
        <TwoColumnWithLeftHeading
          contents={{
            heading: "What Happens After Pre-Approval?",
            listTopPara: "Once you’re conditionally pre-approved :",
            list: [
              {
                heading: `Continue Your Property Search: `,
                desc: `With a clearer budget, you can confidently explore properties within your range.`,
              },
              {
                heading: `Formal Loan Approval : `,
                desc: `After you find your ideal home, the lender will verify your financial position and property details before providing formal approval.`,
              },
              {
                heading: `Make an Offer with Confidence : `,
                desc: `Knowing your finances are in place gives you the upper hand during negotiations.`,
              },
            ],
          }}
        />
      </div>

      <div id="guidance" data-section="guidance" class="section">
        <TwoColumnWithLeftHeading
          contents={{
            heading: "Why Choose Digital DSA for Pre-Approval?",
            listTopPara:
              "At Digital DSA, we focus on empowering first-time buyers by offering :",
            list: [
              {
                heading: `Transparent advice with no hidden charges. `,
              },
              {
                heading: `Tools like our <a href="/calculators/affordability-calculator" class="underline"> Affordability Calculator</a> to refine your search.`,
              },
              {
                heading: `A no-pressure approach with zero processing fees and no spam calls. `,
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
                  heading: "What is Conditional Pre-Approval?",
                  secPara: `<p class="mb-4">Conditional pre-approval is an indication from a lender that, based on an initial assessment of your finances, you’re eligible to apply for a home loan up to a specific amount. While it’s not a guarantee, it shows sellers and agents that you’re serious about buying and provides confidence that you can afford a property within a specific price range.</p>
                        <p>At Digital DSA, we help you understand the process of pre-approval and ensure your financial details are accurately presented to maximize your chances.</p>`,
                }}
              />
            </div>
          {:else if index === 1}
            <div id="advantages" class="bg-white text-black">
              <TwoColumnWithLeftHeading
                contents={{
                  heading: "Advantages of Conditional Pre-Approval",
                  listTopPara:
                    "Here are some key benefits of obtaining conditional pre-approval:",
                  list: [
                    {
                      heading: `<span>Gives You a Clear Budget :</span>`,
                      desc: `<span>Pre-approval helps you understand how much you can borrow, letting you focus on properties within your price range. This saves you time and energy by narrowing down your search.</span>`,
                    },
                    {
                      heading: `<span>Makes You a Serious Buyer :</span>`,
                      desc: `<span>Conditional pre-approval demonstrates to sellers that you’re prepared and capable of securing finance, giving you a competitive edge in negotiations.</span>`,
                    },
                    {
                      heading: `<span>Saves Time When It Matters Most :</span>`,
                      desc: `<span>If you find your dream home, being pre-approved can expedite the loan approval process. Sellers are more likely to favor buyers who are ready to move forward quickly.</span>`,
                    },
                    {
                      heading: `<span>Adapts to Changing Situations :</span>`,
                      desc: `<span>If your financial circumstances or property preferences change, you can renew your pre-approval to reflect your updated position.</span>`,
                    },
                  ],
                }}
              />
            </div>
          {:else if index === 2}
            <div id="preperation" class="text-black bg-white">
              <TwoColumnWithLeftHeading
                contents={{
                  heading: "What Should You Know Before Applying?",
                  listTopPara:
                    "When applying for conditional pre-approval, lenders typically assess:",
                  list: [
                    {
                      heading: `The price range of properties you’re considering.`,
                    },
                    {
                      heading: `Your current savings for a down payment.`,
                    },
                    {
                      heading: `Your income and employment stability.`,
                    },
                    {
                      heading: `Your monthly living expenses.`,
                    },
                  ],
                  listSecPara: `✅ Keep in mind that pre-approval is usually valid for 3-6 months. If you don’t find a property within that timeframe, you may need to reapply.`,
                }}
              />

              <TwoColumnWithLeftHeading
                contents={{
                  heading:
                    "How to Apply for Conditional Pre-Approval with Digital DSA",
                  listTopPara:
                    "Unlike traditional lenders or banks, Digital DSA simplifies the process with:",
                  list: [
                    {
                      heading: `Online Eligibility Checks: `,
                      desc: `Our platform helps you quickly calculate how much you can borrow based on your financial details.`,
                    },
                    {
                      heading: `Expert Guidance: `,
                      desc: `We provide start-to-finish support, ensuring you understand the process and submit all required documents correctly.`,
                    },
                    {
                      heading: `No Spam Calls: `,
                      desc: `We respect your privacy while offering you personalized solutions.`,
                    },
                  ],
                  listSecPara: `<p class="font-FourthHead text-miniSubHead">Here’s how to get started :</p>
        
        <ul class="space-y-4 list-disc mt-4 ">
        <p>✅ Use our Home Loan Eligibility Calculator to get an estimate.</p>
        <p>✅ Provide basic financial information like your income, expenses, and down payment savings.</p>
        <p>✅ Let our advisors guide you through the pre-approval process, ensuring everything is in place for when you find the perfect property.</p>
        </ul>
        `,
                }}
              />
              <TwoColumnWithLeftHeading
                contents={{
                  heading: "What Happens After Pre-Approval?",
                  listTopPara: "Once you’re conditionally pre-approved :",
                  list: [
                    {
                      heading: `Continue Your Property Search: `,
                      desc: `With a clearer budget, you can confidently explore properties within your range.`,
                    },
                    {
                      heading: `Formal Loan Approval : `,
                      desc: `After you find your ideal home, the lender will verify your financial position and property details before providing formal approval.`,
                    },
                    {
                      heading: `Make an Offer with Confidence : `,
                      desc: `Knowing your finances are in place gives you the upper hand during negotiations.`,
                    },
                  ],
                }}
              />
            </div>
          {:else if index === 3}
            <div id="guidance" class="text-black bg-white">
              <TwoColumnWithLeftHeading
                contents={{
                  heading: "Why Choose Digital DSA for Pre-Approval?",
                  listTopPara:
                    "At Digital DSA, we focus on empowering first-time buyers by offering :",
                  list: [
                    {
                      heading: `Transparent advice with no hidden charges. `,
                    },
                    {
                      heading: `Tools like our <a href="/calculators/affordability-calculator" class="underline"> Affordability Calculator</a> to refine your search.`,
                    },
                    {
                      heading: `A no-pressure approach with zero processing fees and no spam calls. `,
                    },
                  ],
                }}
              />
            </div>
          {/if}
        </details>
      {/each}
    </div>

    <div data-section="calculators" id="calculators">
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
                  secUrl: "/calculators/emi-calculator",
                },
                {
                  id: 2,
                  secLinkName: "What would my repayments be?",
                  secUrl: "/calculators/eligibility-calculator",
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
                // {
                //   id: 3,
                //   secLinkName: "Search for a property",
                //   secUrl: "",
                // },
              ],
            },
          ],
        }}
      />
    </div>
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
            Conditional pre-approval helps you understand your borrowing
            capacity, allowing you to focus on properties within your budget.
          </li>
          <li>
            It demonstrates to sellers that you are a serious buyer, giving you
            a competitive edge in negotiations.
          </li>
          <li>
            Pre-approval can expedite the loan approval process when you find
            your dream home, making you a more attractive buyer.
          </li>
          <li>
            It is usually valid for 3-6 months, so you may need to reapply if
            you don't find a property within that timeframe.
          </li>
          <li>
            Digital DSA offers online eligibility checks and expert guidance to
            simplify the pre-approval process.
          </li>
          <li>
            Our platform respects your privacy and provides personalized
            solutions without spam calls.
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
