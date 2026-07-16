<script>
  import PageDesign from '$lib/components/layout/PageDesign.svelte';
  import WhyChoose from './WhyChoose.svelte';
  import ThingsYouShould from '$lib/components/sections/ThingsYouShould.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import StickyNavbar from '$lib/components/layout/StickyNavbar.svelte';
  import BlogCard from './BlogCard.svelte';
  import Ways from './Ways.svelte';
  import TwoColumn from './TwoColumn.svelte';
  import { onMount } from "svelte";

  let pageData = {
    coverImage: "/images/exploreCover.png",
    altName: "hero-cover",
    classStyle: "object-cover xl:h-[90svh] 3xl:max-h-[70svh]",
    heroHeading: "Pocket ETFs",
    heroParagraph: `Choose from ten themed ETFs and invest in something that matters to you.`,
  };
  let subList = [
    { name: "Benefits & features ", targetId: "benefitFeature" },
    { name: "What are ETF", targetId: "whatETF" },
    { name: "Investment option", targetId: "investment" },
    { name: "Learn ", targetId: "learn" },
  ];
  let navBarMedium = [
    "Benefits & features",
    "What are ETF",
    "Investment option",
    "Learn",
  ];
  let navList = [
    {
      actionBtn: {
        firstBtn: "Get started",
        link: "/get-started",
        btnColor: "#ffcc00",
      },
    },
  ];

  let benefitFeature = {
    heading: "Simplified investing. Anytime, anywhere.",
    items: [
      {
        id: 1,
        title: "Simple choices",
        desc: `Choose from 10 curated Exchange Traded Funds (ETFs) to match your interests and goals.`,
        icon: "/icons/clock.svg",
        altName: "clock-icon",
      },
      {
        id: 2,
        title: "Affordable start​",
        desc: "You can start investing with as little as $50. Each investment up to $1000, costs just $2, with no ongoing account fees.",
        icon: "/icons/negotiate.svg",
        altName: "negotiate-icon",
      },
      {
        id: 3,
        title: "Regularly invest",
        desc: "Set up automatic fortnightly or monthly investments to grow your portfolio gradually and consistently.",
        icon: "/icons/offers.svg",
        altName: "offers-icon",
      },
      {
        id: 4,
        title: "Quick and easy set up",
        desc: "You can open an account in about 5 minutes in the undefined app. Simply log in, tap the ‘Investing’ tile from your app dashboard or Library and select ‘Pocket ETFs’.​",
        icon: "/icons/contact.svg",
        altName: "contact-icon",
      },
    ],
  };
  let investing = {
    items: [
      {
        id: 1,
        title: "Aussie Sustainability",
        desc: `Invest in Aussie companies that encompass both values-based and environmental, social and governance (ESG) investing screened by the provider.`,
        icon: "/icons/clock.svg",
        altName: "clock-icon",
      },
      {
        id: 2,
        title: "Aussie Corporate Bonds​",
        desc: `Balance your portfolio with a defensive selection of around 50 different Aussie corporate bonds.`,
        icon: "/icons/negotiate.svg",
        altName: "negotiate-icon",
      },
      {
        id: 3,
        title: "Aussie Top 200",
        desc: `Invest in the 200 largest companies on the ASX.`,
        icon: "/icons/offers.svg",
        altName: "offers-icon",
      },
      {
        id: 4,
        title: "Aussie Dividends",
        desc: `Gain access to around 30 Aussie companies known for paying strong dividends.`,
        icon: "/icons/contact.svg",
        altName: "contact-icon",
      },
      {
        id: 5,
        title: "Health Wise",
        desc : `Invest in medical innovation with around 100 companies in the Global Healthcare sector.`,
        icon: "/icons/contact.svg",
        altName: "contact-icon",
      },
      {
        id: 6,
        title: "Emerging Markets",
        icon: "/icons/contact.svg",
        desc : `Access over 800 companies in the world’s fastest growing economies.`,
        altName: "contact-icon",
      },
      {
        id: 7,
        title: "Global 100",
        desc : `Invest in 100 of the largest companies globally.`,
        icon: "/icons/contact.svg",
        altName: "contact-icon",
      },
      {
        id: 8,
        title: "Diversified Equities",
        desc:`Get exposure to around 8,000 companies listed on over 60 global exchanges to obtain a globally diversified equities exposure.`,
        icon: "/icons/contact.svg",
        altName: "contact-icon",
      },
    ],
  };
  let blogs = [
    {
      icon: "/images/startExploreBlog.jpg",
      altName: "icon-name",
      title: "Investing could make your money go further",
      paragraph:
        "An investment portfolio can be a great way to make your money work for you. Quality investments have the potential to outperform inflation and provide regular income through dividends. Investing in the undefined app has been awarded the Canstar Innovation Excellence Award in 2024.",
    },
    {
      icon: "/images/startExploreBlog1.jpg",
      altName: "icon-name",
      title: "Access everything you need in one place",
      paragraph:
        "It can be daunting to start investing. That’s why our Investing hub helps make it easy. You can monitor, trade and manage investments in one place, as well as access education and tools to help build your knowledge.",
    },
    {
      icon: "/images/startExploreBlog2.jpg",
      altName: "icon-name",
      title: "Learn and grow through a trusted resource",
      paragraph:
        "Whether you're just starting your investment journey or looking to brush up on your skills, you can also access educational content straight from the app.",
    },
  ];

  let thinkKnow = {
    heading: "Things you should know",
    subPara: [
      `There may be times when we reach out to confirm information about your loan application or your identity.`,
      `Having accurate and up-to-date details is essential to meet compliance requirements and helps us protect you from fraud. This allows us to act quickly if we detect any suspicious activity.`,
      `If you’re ever unsure whether the person contacting you is legitimately from Digital DSA or a partner bank, always verify their identity through official channels.`,
      `Regardless of the situation, we will never ask you to transfer funds, share your screen, or reveal your passwords.`,
    ],
  };

  let investmentLearning = [
    {
      icon: "/images/home-cover.jpg",
      altName: "icon-name",
      title: "How Often should you invest?",
    },

    {
      icon: "/images/home-cover.jpg",
      altName: "icon-name",
      title: "Unlocking your financial ",
    },
    {
      icon: "/images/home-cover.jpg",
      altName: "icon-name",
      title: "Meet simran for girl",
    },
    {
      icon: "/images/home-cover.jpg",
      altName: "icon-name",
      title: "Share investing for absolute beginner",
    },
    {
      icon: "/images/home-cover.jpg",
      altName: "icon-name",
      title: "What even is investing",
    },
    {
      icon: "/images/home-cover.jpg",
      altName: "icon-name",
      title: "Why tilly is more than super",
    },
  ];

  let learnMore = {
    heading: `New to investing or looking to learn more?`,
    btnName: `Learn in the undefined app`,
    btnBorder: "#F4F4F4",
  };

  let cardImg2 = "/images/ETF.png";
  let cardAlt2 = "ETF";
  let cardHead2 = "What are ETFs?";

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
      detailsElement.scrollIntoView({ top: 60, behavior: "smooth" });
    }, 100);
  };
  // logic for second nav bar which is not working yet
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
  //ends here...
</script>

<section class="mx-auto w-full">
  <PageDesign {pageData}>
    <div class="lg:hidden py-[1rem]">
      <StickyNavbar>
        <div class="flex gap-4 py-[.25rem]">
          <Button
            btnName="Get started"
            btnBorder="#E3E3E3"
            link=""
            btnColor={"#ffcc00"}
          />
        </div>
      </StickyNavbar>
    </div>
    <div class="hidden lg:block">
      <StickyNavbar navList={subList} {activeSection}>
        <div class="flex gap-4 pr-4">
          <div>
            <Button
              btnName={navList[0].actionBtn.firstBtn}
              btnColor={navList[0].actionBtn.btnColor}
              link={navList[0].actionBtn.link}
            />
          </div>
        </div>
      </StickyNavbar>

      <div class="px-[2rem] pt-5 lg:px-[4rem]">
        <div id="benefitFeature" data-section="benefitFeature">
            <WhyChoose facilities={benefitFeature} gridCol={4}/>

        </div>
        <div id="whatETF" data-section="whatETF">
            <TwoColumn
            cardImage={cardImg2}
            cardAltName={cardAlt2}
            cardHeading={cardHead2}
          >
            <div
              class="grid gap-[1rem] typography-body-sm typography-body-md"
              slot="list"
            >
              <p>
                Exchange Traded Funds (ETFs) offer a cost-effective way to invest
                in a group of companies within a specific theme, industry or
                index. Like shares, ETFs are traded on the stock market making
                them accessible and flexible. They can also help spread risk by
                diversifying your portfolio.
              </p>
              <p>However, it’s important to understand the associated risks
  
              </p>
              <ul class="list-disc ml-5 space-y-5">
                <li > <strong>Market risk:</strong>  ETF values can fluctuate</li>
                <li>
                  <strong>Liquidity risk:</strong>
                   Buying and selling can be hard during volatile
                  periods
                </li>
                <li>
                  <strong>Performance risk:</strong>
                   Returns may differ from the underlying index
                </li>
              </ul>
            </div>
          </TwoColumn>
        </div>
        <div id="investment" data-section="investment" class="py-[2rem]">
            <div class="space-y-5">
                <h2 class="md:text-start typography-h2 text-[var(--form-text)]">More on those investment options
                </h2>
                <h4 class="typography-h3 font-semibold text-[var(--form-text)]">Invest in a broad range of ETFs to suit your preferences
                </h4>
                <p class="font-subPara typography-body-md">Ten themed <span class="underline underline-offset-4 hover:no-underline text-linkColor cursor-pointer"> ETF options</span> to choose from.
    
                </p>
            </div>
           
            <WhyChoose facilities={investing} gridCol={4}/>

        </div>

        <div class="" id="learn" data-section="learn">
          <Ways ways={learnMore} />
          <div
            class="flex flex-col gap-[1rem] border-b border-[var(--form-border)] py-[2rem]"
          >
            <h2
              class="typography-h2 text-[var(--form-text)]"
            >
              Investing learning hub
            </h2>
            <div
              class="grid gap-[2rem] md:grid-cols-2 lg:gap-[3rem] lg:py-[2rem] xl:grid-cols-3"
            >
              {#each investmentLearning as side, index}
                <div
                  class="flex border border-dividerColor shadow-sm gap-2 hover:shadow-xl"
                >
                  <div>
                    <img
                      src={side.icon}
                      alt={side.altName}
                      class="aspect-square h-[6rem] object-cover"
                    />
                  </div>
                  <div class="text-center content-center font-semibold">
                    <h2>{side.title}</h2>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="lg:hidden">
      {#each navBarMedium as list, index}
        <details
          class="border-bgBtn dropdown col-span-3 bg-darkColor text-white {index < list.length - 1 ? 'border-b' : ''}"
        >
          <summary
            class="list-none px-6 py-4"
            onclick={(e) => { e.preventDefault(); ((e) => toggleDropdown(e, index))(e); }}
          >
            <div class="flex justify-between items-center">
              <h2>{list}</h2>
              <span><i class="fa-solid fa-angle-down faq-icon"></i></span>
            </div>
          </summary>

          {#if index == 0}
          <div id="benefitFeature" data-section="benefitFeature" class="bg-white px-[2rem] py-[2rem] text-black">
            <WhyChoose facilities={benefitFeature} gridCol={4}/>

        </div>
          {:else if index == 1}
          <div id="whatETF" data-section="whatETF" class="bg-white px-[2rem] py-[2rem] text-black">
            <TwoColumn
            cardImage={cardImg2}
            cardAltName={cardAlt2}
            cardHeading={cardHead2}
          >
            <div
              class="grid gap-[1rem] typography-body-sm typography-body-md"
              slot="list"
            >
              <p>
                Exchange Traded Funds (ETFs) offer a cost-effective way to invest
                in a group of companies within a specific theme, industry or
                index. Like shares, ETFs are traded on the stock market making
                them accessible and flexible. They can also help spread risk by
                diversifying your portfolio.
              </p>
              <p>However, it’s important to understand the associated risks
  
              </p>
              <ul class="list-disc ml-5 space-y-5">
                <li > <strong>Market risk:</strong>  ETF values can fluctuate</li>
                <li>
                  <strong>Liquidity risk:</strong>
                   Buying and selling can be hard during volatile
                  periods
                </li>
                <li>
                  <strong>Performance risk:</strong>
                   Returns may differ from the underlying index
                </li>
              </ul>
            </div>
          </TwoColumn>
        </div>
          {:else if index == 2}
          <div id="investment" data-section="investment" class="bg-white px-[2rem] py-[2rem] text-black">
            <div class="space-y-5">
                <h2 class="md:text-start typography-h2 text-[var(--form-text)]">More on those investment options
                </h2>
                <h4 class="typography-h3 font-semibold text-[var(--form-text)]">Invest in a broad range of ETFs to suit your preferences
                </h4>
                <p class="font-subPara typography-body-md">Ten themed <span class="underline underline-offset-4 hover:no-underline text-linkColor cursor-pointer"> ETF options</span> to choose from.
    
                </p>
            </div>
           
            <WhyChoose facilities={investing} gridCol={4}/>

        </div>
          {:else if index == 3}
          <div  id="learn" data-section="learn" class="bg-white px-[2rem] py-[2rem] text-black">
            <Ways ways={learnMore} />
            <div
              class="flex flex-col gap-[1rem] border-b border-[var(--form-border)] py-[2rem]"
            >
              <h2
                class="typography-h2 text-[var(--form-text)]"
              >
                Investing learning hub
              </h2>
              <div
                class="grid gap-[2rem] md:grid-cols-2 lg:gap-[3rem] lg:py-[2rem] xl:grid-cols-3"
              >
                {#each investmentLearning as side, index}
                  <div
                    class="flex border border-dividerColor shadow-sm gap-2 hover:shadow-xl"
                  >
                    <div>
                      <img
                        src={side.icon}
                        alt={side.altName}
                        class="aspect-square h-[6rem] object-cover"
                      />
                    </div>
                    <div class="text-center content-center font-semibold">
                      <h2>{side.title}</h2>
                    </div>
                  </div>
                {/each}
              </div>
            </div>
          </div>
          
          {/if}
        </details>
      {/each}
    </div>
    <div class="px-[2rem] pt-5 lg:px-[4rem]">
        <div
        class="flex flex-col lg:flex-row py-[2rem] gap-[1rem]"
        id="getStarted"
        data-section="getStarted"
      >
        <div
          class="typography-body-md text-[var(--form-text-secondary)] flex flex-col gap-2 justify-center w-full order-2 lg:order-first"
        >
          <h2
            class="md:text-start typography-h2 text-[var(--form-text)]"
          >
            Get started
          </h2>

          <h4 class="font-semibold">
            Experience a streamlined new sign-up process, all in the undefined
            app.
          </h4>
          <p>
            Simply log in, tap the ‘Investing’ tile from your app dashboard or
            Library and select the type of investing account you’d like to
            open.
          </p>
        </div>
        <img
          src='/images/mobile.png'
          alt="Get started"
          class="w-full lg:w-1/2 order-1 lg:order-last"
        />
      </div>
      <div
        class="grid lg:grid-cols-3 py-[2rem] border-y border-[var(--form-border)] gap-[1rem]"
      >
        <h2
          class="typography-h2 text-[var(--form-text)]"
        >
          FAQs
        </h2>
        <div class="col-span-2">
          <details class="border-y border-[var(--form-border)] py-4 cursor-pointer">
            <summary class="list-none">
              <div class="flex items-center justify-between gap-4">
                <h2 class="typography-body-md typography-h3 font-semibold">
                  What CommSec accounts can I access in the undefined app
                  investing experience?
                </h2>
                <div class="icon-container typography-h3">
                  <span><i class="fa-solid fa-angle-down faq-icon"></i></span>
                </div>
              </div>
            </summary>
            <div class="grid gap-4 pt-[2rem] typography-body-md text-[var(--form-text-secondary)]">
              <p>
                The investing experience features and functionality in the
                undefined app is only available for CommSec Pocket and individual <span
                  class="underline underline-offset-4 hover:no-underline text-linkColor cursor-pointer">CommSec</span> Australian Shares accounts. You can view other CommSec account
                types, like Margin Loans and Exchange Traded Options, via the Accounts
                list. You can access more share trading services, features and functionality
                on CommSec's apps and platforms
              </p>
            </div>
          </details>
          <details class="border-y border-[var(--form-border)] py-4 cursor-pointer">
            <summary class="list-none">
              <div class="flex items-center justify-between gap-4">
                <h2 class="typography-body-md typography-h3 font-semibold">
                  Are there eligibility criteria to open a CommSec Pocket or
                  CommSec Australian Shares account?
                </h2>
                <div class="icon-container typography-h3">
                  <span><i class="fa-solid fa-angle-down faq-icon"></i></span>
                </div>
              </div>
            </summary>
            <div class="grid gap-4 pt-[2rem] typography-body-md text-[var(--form-text-secondary)]">
              <p>
                Yes, the same eligibility criteria that currently exists for
                CommSec Pocket and CommSec Australian Shares will exist for the
                investing experience in the undefined app, including:
              </p>
              <ul class="list-disc ml-5">
                <li>
                  Certain age limits apply. You need to be over 18 years old to
                  create a CommSec account and trade. All customers over 14
                  years old will be able to view the investing experience in the
                  undefined app, access articles and use the search functionality
                  to browse Australian Shares and ETFs
                </li>
                <li>
                  You can only open an Individual CommSec Australian Shares and
                  CommSec Pocket account via the undefined app
                </li>
                <li>
                  You need to have an Australian residential and postal address
                  applied to your CommSec account
                </li>
                <li>
                  You must have completed tax residency information and have no
                  outstanding KYC requirements
                </li>
              </ul>
            </div>
          </details>
          <details class="border-y border-[var(--form-border)] py-4 cursor-pointer">
            <summary class="list-none">
              <div class="flex items-center justify-between gap-4">
                <h2 class="typography-body-md typography-h3 font-semibold">
                  Can I still use the CommSec app?
                </h2>
                <div class="icon-container typography-h3">
                  <span><i class="fa-solid fa-angle-down faq-icon"></i></span>
                </div>
              </div>
            </summary>
            <div class="grid gap-4 pt-[2rem] typography-body-md text-[var(--form-text-secondary)]">
              <p>
                Yes, you can use both the CommSec app and the undefined app to
                manage your CommSec Pocket and/or Australian Shares account.
              </p>
            </div>
          </details>
        </div>
      </div>
    </div>

    <div slot="secondary" class="p-4 lg:p-0">
      <ThingsYouShould {thinkKnow} />
    </div>
  </PageDesign>
</section>


