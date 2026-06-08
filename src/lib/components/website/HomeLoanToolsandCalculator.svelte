<script>
	let {
		data
	} = $props();



  import PageDesign from "./PageDesign.svelte";
  import Button from "./Button.svelte";
  import IconCard from "./IconCard.svelte";
  import TwoColumn from "./TwoColumn.svelte";
  import Support from "./Support.svelte";
  import HomeIntrest from "$lib/components/website/HomeIntrest.svelte";
  import WeAreHereHelp from "$lib/components/website/WeAreHereHelp.svelte";
  import ThingsYouShould from "$lib/components/website/ThingsYouShould.svelte";
  import HomeLoanCalculator from "./HomeLoanCalculator.svelte";
  import { onMount } from "svelte";
  import StickyNavbar from "./StickyNavbar.svelte";
  import NewPageLayout from "./NewPageLayout.svelte";
  import AboveTitleWithoutIconCard from "./AboveTitleWithoutIconCard.svelte";
  import AboveTitleWithLeftIconCard from "./AboveTitleWithLeftIconCard.svelte";
  import TwoColumnWithImage from "./TwoColumnWithImage.svelte";
  import Anchor from "./Anchor.svelte";
  import ButtonBanner from "./ButtonBanner.svelte";
  import HelpList from "./HelpList.svelte";
  import AboveTitleWithBlackCard from "./AboveTitleWithBlackCard.svelte";
  import Seo from "./Seo.svelte";
  import AboveTitleWithTopIconCard from "./AboveTitleWithTopIconCard.svelte";

  let navBarMedium = ["Calculators", "Tools", "Guides"];

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
  let activeSection = ""; // Initially no section is active

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
  title="Home Loan Calculators & Tools – Plan, Borrow & Save"
  image="/images/DigitalDSA-loan-tools.jpg"
  description="Use our home loan calculators to estimate EMIs, eligibility, and savings. Plan smart with flexible EMIs, balance transfer, and repayment tools."
  keywords="home loan calculator, home loan eligibility, EMI calculator, home loan repayment, stamp duty calculator, balance transfer, mortgage tools, home buying, loan planner, part-payment planner, refinance calculator, property investment, loan savings, interest rates, mortgage support, financial planning."
/>

<section>
  <NewPageLayout
    pageData={{
      coverImage: "/images/DigitalDSA-loan-tools.jpg",
      coverAlt:
        "photo of a young indian woman using DigitalDSA calculators to find perfect home loan",
      sourceName: "Freepik",
      originalSource:
        "https://www.freepik.com/free-photo/portrait-smiling-asian-cafe-staff-manager-standing-front-entrance-with-digital-tablet-invit_36031360.htm",
      heading:
        'Home loan tools: <br> <span class="font-SubPara text-miniHeadFont sm:text-mobHeadFont lg:text-headFont"> Guides, Planners & Calculators </span>',
      para: `Let us do the maths for you. Calculate what your home loan repayments could be, estimate how much you could borrow, refinance and more. `,
      actionBtns: [
        {
          btnName: "Book appointment",
          btnLink: "/appointment",
          btnColor: "#ffcc00",
        },
        {
          btnName: "Compare loan offers",
          btnLink: "/get-started/how-can-we-help",
        },
      ],
    }}
  >
    <div class="hidden lg:block">
      <StickyNavbar
        navList={{
          items: [
            {
              name: "Calculators",
              targetId: `Calculators`,
            },
            {
              name: "Tools",
              targetId: `Tools`,
            },

            {
              name: "Property guides",
              targetId: `guides`,
            },
          ],

          actionBtns: [
            {
              btnName: "Book appointment",
              btnLink: "/appointment",
              btnColor: "#ffcc00",
            },
            {
              btnName: "Compare loan offers",
              btnLink: "/get-started/how-can-we-help",
            },
          ],
        }}
        {activeSection}
      ></StickyNavbar>

      <div data-section="Calculators" id="Calculators">
        <AboveTitleWithoutIconCard
          contents={{
            heading: `Home Loan Calculator`,
            xlGridCol: 4,
            cards: [
              {
                heading: "How much can I borrow?",
                para: `Estimate your monthly EMIs with our Home Loan Repayment Calculator.`,
                url: "/calculators/emi-calculator",
                linkName: "Calculate now",
              },
              {
                heading: "Home loan repayments calculator",
                para: `Calculate your loan eligibility instantly based on your income and financial profile with our Eligibility Calculator.`,
                url: "/calculators/eligibility-calculator",
                linkName: "Calculate now",
              },
              {
                heading: "Stamp duty calculator",
                para: `Estimate the other costs of buying a property, including government costs, stamp duty, and fees.`,
                url: "/calculators/stamp-duty-calculator",
                linkName: "Calculate now",
              },
              {
                heading: "Balance transfer calculator",
                para: `Find out what your home loan repayments could be, estimate how much you could borrow, refinance and more.`,
                url: "/calculators/balance-transfer-calculator",
                linkName: "Calculate now",
              },
            ],
          }}
        />
      </div>

      <div data-section="Tools" id="Tools">
        <AboveTitleWithBlackCard
          contents={{
            heading: `Money map:`,
            

            
            xlGridCol: 4,
            borderBottom: true,
            cards: [
              {
                heading: `How long can my <br/> savings support me`,
                icon: "/icons/calc.svg",
                iconAltName: "icon-calc",
                url: "/money-map/how-long-will-your-savings-support-you",
              },
              {
                heading: `How much should I save <br/> for retirement`,
                icon: "/icons/lap.svg",
                iconAltName: "loan-icon",
                url: "/money-map/how-much-to-save-by-retirement",
              },
              {
                heading: `How long will it take <br/> to save for my goal`,
                icon: "/icons/apply.svg",
                iconAltName: "icons-apply",
                url: "/money-map/how-long-will-it-take-to-save",
              },
              {
                heading: `How much can I save with </br>  regular contributions`,
                icon: "/icons/calc.svg",
                iconAltName: "icons-calc",
                url: "/money-map/how-much-can-i-save-with-regular-contributions",
              },
            ],
          }}
        />

        <AboveTitleWithoutIconCard
          contents={{
            heading: `Home Loan Planners`,
            xlGridCol: 3,
            cards: [
              {
                heading: "Part-payment planner",
                para: `Optimize your loan repayments with our Part-payment Planner. Instantly see how extra payments can reduce interest and shorten your loan tenure.`,
                url: "/planners/part-payment-planner",
                linkName: "Smart savings",
              },
              {
                heading: "Flexible EMI planner",
                para: `Easily plan your loan repayments with our Flexible EMI Planner, tailored to fit your budget and cash flow.`,
                url: "/planners/flexible-emi-planner",
                linkName: "Easy EMI",
              },
              {
                heading: "Both (Part-payment + Flexible EMI planner)",
                para: `Repay smarter with Flexible EMI and Part-Payment options. Adjust your EMIs as needed and make extra payments to save on interest and close your loan sooner.`,
                url: "/planners/both",
                linkName: "Pay loan smart",
              },
            ],
          }}
        />

        <AboveTitleWithLeftIconCard
          contents={{
            heading: `Start your home buying journey with us today`,
            xlGridCol: 3,
            borderBottom: true,
            cards: [
              {
                heading: "Know your borrowing power",
                para: "Get the confidence to act quickly when the right property comes along",
                icon: "/icons/checklist.svg",
                altName: "Message Icon",
                url: "/get-started/home-loans/property-identification",
                linkName: "Check conditional approval",
              },
              {
                heading: "Apply for a loan",
                para: "When you've found a property or want to balance transfer, compare offers from the banks.",
                icon: "/icons/apply-pen.svg",
                altName: "Alert Icon",
                url: "/get-started/how-can-we-help",
                linkName: "Compare latest offers",
              },
              {
                heading: "Ask a Lending expert",
                para: "Talk on the phone or in person – whatever works best for you.",
                icon: "/icons/contact.svg",
                altName: "Alert Icon",
                url: "/appointment",
                linkName: "Book an appointment",
              },
            ],
          }}
        />
      </div>

      <div data-section="guides" id="guides">
        <ButtonBanner
          contents={{
            heading: `See all home loan interest rates`,
            btnName: `Explore now`,
            btnLink: "/calculators/eligibility-calculator",
          }}
        />
        <AboveTitleWithTopIconCard
          contents={{
            heading: `Property guides`,
            xlGridCol: 3,
            borderBottom: true,
            cards: [
              {
                heading: "Home Renovation",
                para: `Home renovations can be costly, without proper planning and financial support. We're here to help you every step of the way with the <a href="/home-loan/home-renovation" class="underline text-linkColor underline-offset-4"> right resources and expert advice</a>. `,
                icon: "/icons/renovateHome.svg",
                iconAltName: "home-icon",
              },
              {
                heading: "Transferring your home loan",
                para: `DigitalDSA helps you <a href="/home-loan/balance-transfer" class="underline text-linkColor underline-offset-4"> transfer your existing loan </a> seamlessly, ensuring lower interest rates, better part payment options, and zero (or minimal) processing fees—so you save more while managing your loan efficiently.`,
                icon: "/icons/bt-2.svg",
                iconAltName: "negotiate-icon",
              },
              {
                heading: "Investing in property",
                para: `Plan your next steps with the right tools and resources. Make an informed decision when it comes to <a href="/home-loan/investing-in-property" class="underline text-linkColor underline-offset-4"> buying an investment property </a>.`,
                icon: "/icons/loanValue.svg",
                iconAltName: "phoneConnection-icon",
              },
              {
                heading: "Buying your first home",
                para: `As a first-time homebuyer, knowing where to begin can be challenging.  The right resources and expert advice will help you start strong and <a href="/home-loan/buying-first-home" class="underline text-linkColor underline-offset-4"> make informed decisions </a>.​`,
                icon: "/icons/firstHome.svg",
                iconAltName: "inte-icon",
              },
              {
                heading: "Selling Your Property",
                para: `From pricing to paperwork and negotiations, we provide everything you need for a seamless experience. <a href="/home-loan/selling-your-property" class="underline text-linkColor underline-offset-4"> Start your property sale journey now </a>.`,
                icon: "/icons/sellingHome.svg",
                iconAltName: "contact-icon",
              },
              {
                heading: "Construction of your dream home",
                para: `Building a home is a big decision that involves careful planning and research. We can equip you to manage every aspect of the process. <a href="/plot-loan/construction-loan" class="underline text-linkColor underline-offset-4"> Discover how to plan your home build </a>.`,
                icon: "/icons/constructionTable.svg",
                iconAltName: "offers-icon",
              },
            ],
          }}
        />
      </div>
    </div>

    <div class="lg:hidden block">
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

          {#if index == 0}
            <div id="Calculators" class="bg-white text-black">
              <AboveTitleWithoutIconCard
                contents={{
                  heading: `Home Loan Calculator`,
                  xlGridCol: 4,
                  cards: [
                    {
                      heading: "How much can I borrow?",
                      para: `Estimate your monthly EMIs with our Home Loan Repayment Calculator.`,
                      url: "/calculators/emi-calculator",
                      linkName: "Calculate now",
                    },
                    {
                      heading: "Home loan repayments calculator",
                      para: `Calculate your loan eligibility instantly based on your income and financial profile with our Eligibility Calculator.`,
                      url: "/calculators/eligibility-calculator",
                      linkName: "Calculate now",
                    },
                    {
                      heading: "Stamp duty calculator",
                      para: `Estimate the other costs of buying a property, including government costs, stamp duty, and fees.`,
                      url: "/calculators/stamp-duty-calculator",
                      linkName: "Calculate now",
                    },
                    {
                      heading: "Balance transfer calculator",
                      para: `Find out what your home loan repayments could be, estimate how much you could borrow, refinance and more.`,
                      url: "/calculators/balance-transfer-calculator",
                      linkName: "Calculate now",
                    },
                  ],
                }}
              />
            </div>
          {:else if index == 1}
            <div id="Tools" class="bg-white text-black">
              <AboveTitleWithBlackCard
                contents={{
                  heading: `Money map`,
                  xlGridCol: 4,
                  borderBottom: true,
                  cards: [
                    {
                      heading: `How long can my <br/> savings support me`,
                      icon: "/icons/calc.svg",
                      iconAltName: "icon-calc",
                      url: "/money-map/how-long-will-your-savings-support-you",
                    },
                    {
                      heading: `How much should I save <br/> for retirement`,
                      icon: "/icons/lap.svg",
                      iconAltName: "loan-icon",
                      url: "/money-map/how-much-to-save-by-retirement",
                    },
                    {
                      heading: `How long will it take <br/> to save for my goal`,
                      icon: "/icons/apply.svg",
                      iconAltName: "icons-apply",
                      url: "/money-map/how-long-will-it-take-to-save",
                    },
                    {
                      heading: `How much can I save with </br>  regular contributions`,
                      icon: "/icons/calc.svg",
                      iconAltName: "icons-calc",
                      url: "/money-map/how-much-can-i-save-with-regular-contributions",
                    },
                  ],
                }}
              />

              <AboveTitleWithoutIconCard
                contents={{
                  heading: `Home Loan Planners`,
                  xlGridCol: 3,
                  cards: [
                    {
                      heading: "Part-payment planner",
                      para: `Optimize your loan repayments with our Part-payment Planner. Instantly see how extra payments can reduce interest and shorten your loan tenure.`,
                      url: "/planners/part-payment-planner",
                      linkName: "Smart savings",
                    },
                    {
                      heading: "Flexible EMI planner",
                      para: `Easily plan your loan repayments with our Flexible EMI Planner, tailored to fit your budget and cash flow.`,
                      url: "/planners/flexible-emi-planner",
                      linkName: "Easy EMI",
                    },
                    {
                      heading: "Both (Part-payment + Flexible EMI planner)",
                      para: `Repay smarter with Flexible EMI and Part-Payment options. Adjust your EMIs as needed and make extra payments to save on interest and close your loan sooner.`,
                      url: "/planners/both",
                      linkName: "Pay loan smart",
                    },
                  ],
                }}
              />

              <AboveTitleWithLeftIconCard
                contents={{
                  heading: `Start your home buying journey with us today`,
                  xlGridCol: 3,
                  borderBottom: true,
                  cards: [
                    {
                      heading: "Know your borrowing power",
                      para: "Get the confidence to act quickly when the right property comes along",
                      icon: "/icons/checklist.svg",
                      altName: "Message Icon",
                      url: "/get-started/home-loans/property-identification",
                      linkName: "Check conditional approval",
                    },
                    {
                      heading: "Apply for a loan",
                      para: "When you've found a property or want to balance transfer, compare offers from the banks.",
                      icon: "/icons/apply-pen.svg",
                      altName: "Alert Icon",
                      url: "/get-started/how-can-we-help",
                      linkName: "Compare latest offers",
                    },
                    {
                      heading: "Ask a Lending expert",
                      para: "Talk on the phone or in person – whatever works best for you.",
                      icon: "/icons/contact.svg",
                      altName: "Alert Icon",
                      url: "/appointment",
                      linkName: "Book an appointment",
                    },
                  ],
                }}
              />
            </div>
            <!-- {:else if index == 2}
            <div id="Manage your loan" class="bg-white text-black">
              <TwoColumnWithImage
                contents={{
                  cardImage: "/images/home-scheme.jpg",
                  cardAltName: "housing-figure",
                  cardHeading: "Manage your loan",
                  reverse: true,
                }}
              >
                <Anchor
                  linkName="How redraw works"
                  link="/home-loan/home-loan-redraw"
                />
              </TwoColumnWithImage>
            </div> -->
          {:else if index == 2}
            <div id="guides" class="bg-white text-black">
              <ButtonBanner
                contents={{
                  heading: `See all home loan interest rates`,
                  btnName: `Explore now`,
                  btnLink: "/calculators/eligibility-calculator",
                }}
              />
              <AboveTitleWithTopIconCard
                contents={{
                  heading: `Property guides`,
                  xlGridCol: 3,
                  borderBottom: true,
                  cards: [
                    {
                      heading: "Home Renovation",
                      para: `Home renovations can be costly, without proper planning and financial support. We're here to help you every step of the way with the <a href="/home-loan/home-renovation" class="underline text-linkColor underline-offset-4"> right resources and expert advice</a>. `,
                      icon: "/icons/renovateHome.svg",
                      iconAltName: "home-icon",
                    },
                    {
                      heading: "Transferring your home loan",
                      para: `DigitalDSA helps you <a href="/home-loan/balance-transfer" class="underline text-linkColor underline-offset-4"> transfer your existing loan </a> seamlessly, ensuring lower interest rates, better part payment options, and zero (or minimal) processing fees—so you save more while managing your loan efficiently.`,
                      icon: "/icons/bt-2.svg",
                      iconAltName: "negotiate-icon",
                    },
                    {
                      heading: "Investing in property",
                      para: `Plan your next steps with the right tools and resources. Make an informed decision when it comes to <a href="/home-loan/investing-in-property" class="underline text-linkColor underline-offset-4"> buying an investment property </a>.`,
                      icon: "/icons/loanValue.svg",
                      iconAltName: "phoneConnection-icon",
                    },
                    {
                      heading: "Buying your first home",
                      para: `As a first-time homebuyer, knowing where to begin can be challenging.  The right resources and expert advice will help you start strong and <a href="/home-loan/buying-first-home" class="underline text-linkColor underline-offset-4"> make informed decisions </a>.​`,
                      icon: "/icons/firstHome.svg",
                      iconAltName: "inte-icon",
                    },
                    {
                      heading: "Selling Your Property",
                      para: `From pricing to paperwork and negotiations, we provide everything you need for a seamless experience. <a href="/home-loan/selling-your-property" class="underline text-linkColor underline-offset-4"> Start your property sale journey now </a>.`,
                      icon: "/icons/sellingHome.svg",
                      iconAltName: "contact-icon",
                    },
                    {
                      heading: "Construction of your dream home",
                      para: `Building a home is a big decision that involves careful planning and research. We can equip you to manage every aspect of the process. <a href="/plot-loan/construction-loan" class="underline text-linkColor underline-offset-4"> Discover how to plan your home build </a>.`,
                      icon: "/icons/constructionTable.svg",
                      iconAltName: "offers-icon",
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
      <div class="w-full lg:w-auto">
        <Button link="/contact" btnBorder="#4F4C4D" btnName="Message us" />
      </div>
    </TwoColumnWithImage>

    <div slot="secondary">
      <HelpList
        contents={{
          heading: `We're here to help`,
          xlGridCol: 4,
          borderBottom: true,
          cards: [
            {
              heading: "Book an </br> appointment",
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
