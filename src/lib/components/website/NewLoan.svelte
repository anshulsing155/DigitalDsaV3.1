<script>
	let {
		data
	} = $props();


 

  import PageDesign from "./PageDesign.svelte";
  import Button from "./Button.svelte";
  import NewHome from "./NewHome.svelte";
  import IconCard from "./IconCard.svelte";
  import TwoColumn from "./TwoColumn.svelte";
  import ThreeCard from "./ThreeCard.svelte";
  import Support from "./Support.svelte";
  import HomeIntrest from "$lib/components/website/HomeIntrest.svelte";
  import WeAreHereHelp from "$lib/components/website/WeAreHereHelp.svelte";
  import ThingsYouShould from "$lib/components/website/ThingsYouShould.svelte";
  import { onMount, createEventDispatcher } from "svelte";
  import StickyNavbar from "./StickyNavbar.svelte";

  let pageData = {
    coverImage: "/images/home-cover.jpg",
    altName: "hero-cover",
    classStyle: "object-cover xl:h-[90svh] 3xl:max-h-[70svh]",
    heroHeading: "New loan buyers - Guide to buying your New loan",
    heroParagraph: `Knowing where to start can be the biggest hurdle. The right tools and support will get you moving with confidence.`,
  };

  let subList = [
    {
name: "Getting ready",
targetId: `ready`,
    },
    {
name: "Find a home",
targetId: `find`,
    },
    {
name: "What's next?",
targetId: `next`,
    },
    {
name: "Tools & calculators",
targetId: `calculators`,
    },
  ];
  let navList = [
    {
actionBtn: [
{
firstBtn: "Book appointment",
link: "/appointment",
btnColor: "#ffcc00",
},
{
firstBtn: "Apply online",
link: "/get-started/how-can-we-help",
},
],
    },
  ];

  let getStart = [
    {
heading: "Getting ready to buy",
data: [
{
id: "1",
title: "Home buying made easy",
desc: `Your step-by-step guide to buying property, whether it's a home to live in or an investment for your future.`,
link: "Read home buying guide (PDF)",
url: "/",
},
{
id: "2",
title: "Saving for a deposit ",
desc: `Get some tips to help you start saving for your house deposit.`,
link: "Tell me more about saving for a deposit",
url: "",
},
{
id: "3",
title: "Should you get conditional pre-approval?",
desc: `Having conditional pre-approval can help show that you're serious about buying. `,
link: "Keep reading about conditional pre-approval",
url: "",
},
{
id: "4",
title: "Understand the costs",
desc: `There are a number of costs you'll need to factor into your home buying budget.`,
link: "Find out more about home buying costs",
url: "",
},
],
    },
  ];

  let cardDataList = [
    {
heading: "Know your borrowing power",
para: "Get the confidence to act quickly when the right property comes along",
icon: "/icons/checklist.svg",
iconAltName: "Message Icon",
link: "/calculators/emi-calculator",
btnName: "Check condition approval",
    },
    {
heading: "Apply for a loan",
para: "When you've found a property or want to refinance with undefined.",
icon: "/icons/apply-pen.svg",
iconAltName: "Alert Icon",
link: "/get-started/how-can-we-help",
btnName: "Apply for a home loan",
    },
    {
heading: "Ask a Lending expert",
para: "Talk on the phone or in person – whatever works best for you.",
icon: "/icons/contact.svg",
iconAltName: "Alert Icon",
link: "/appointment",
btnName: "Book an appointment",
    },
    {
heading: "Make informed property decisions with Home Hub",
para: "Get access to all the property tools and guidance you need in one place in ",
icon: "/icons/home.svg",
iconAltName: "Alert Icon",
link: "/get-started/how-can-we-help",
btnName: "Check out Home Hub",
    },
  ];

  let forHome = [
    {
heading: "Property report ",
para: `Make informed property decisions and understand the market.`,
link: "/finance-support",
linkName: "Get Property Report",
    },
    {
heading: "Simplify your property purchase with Home-in",
para: `Digital DSA has partnered with Home-in, your personal home buying concierge to help simplify your first home buying journey. Helping you at every step, from pre-approval to shortlisting homes, conveyancing and settling on your new property.`,
link: "/finance-support",
linkName: "Get started with Home-in",
    },
    {
heading: "Watch our webinars for more guidance",
para: `We've created a four-part webinar series to support you as you get started on your property journey, whether you're looking for a place to live in or invest.`,
link: "/finance-support",
linkName: "Watch webinars",
    },
  ];

  let whatNext = [
    {
heading: "Understanding the home loan process",
para: `Our step-by-step guide from applying for your home loan to settlement. `,
link: "/offers",
linkName: "Tell me more",
    },
    {
heading: "Making an offer",
para: `Here's what you need to know about the final steps to owning a home.`,
link: "/offers",
linkName: "Keep reading",
    },
    {
heading: "Offset accounts",
para: `Offsetting your interest could shave thousands off your home loan.`,
link: "/offers",
linkName: "Keep reading",
    },
  ];

  let IconCardHeading = "Start your home buying journey with us today";

  let contents = [
    {
id: 1,
title: "Calculators",
links: [
{
id: 1,
name: "How much can I borrow?",
url: "/calculators/emi-calculator",
},
{
id: 2,
name: "What would my repayments be?",
url: "/calculators/emi-calculator",
},
{
id: 3,
name: "What would my upfront costs be?",
url: "/calculators/emi-calculator",
},
],
    },
    {
id: 2,
title: "Tools",
links: [
{
id: 1,
name: "Compare our home loans",
url: "/calculators/emi-calculator",
},
{ id: 2, name: "Budget planner", url: "/calculators/emi-calculator" },
{
id: 3,
name: "Search for a property",
url: "/calculators/emi-calculator",
},
],
    },
  ];

  let help = [
    {
Heading: "Book an appointment",
paragraph: `Book instantly to speak to a home loan specialist at a time that suits you`,
icon: "/icons/appointment.svg",
altTitle: "icons",
link: "/appointment",
    },
    {
Heading: "Manage your loan online",
paragraph: `Book instantly to speak to a home loan specialist at a time that suits you`,
icon: "/icons/manageLoan2.svg",
altTitle: "icons",
link: "/home-loan/top-up-only",
    },
    {
Heading: "Contact us",
paragraph: `Book instantly to speak to a home loan specialist at a time that suits you`,
icon: "/icons/contact.svg",
altTitle: "icons",
link: "/contact",
    },
    {
Heading: "Message us",
paragraph: `Book instantly to speak to a home loan specialist at a time that suits you`,
icon: "/icons/msg.svg",
altTitle: "icons",
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
`<span class="font-semibold">Independent Facilitator:</span> Digital DSA operates as an independent loan facilitator and web aggregator, bridging the gap between loan consumers and licensed banks or NBFCs. We are not an authorized financial institution and do not offer loans directly.`,
`<span class="font-semibold">Loan Approval:</span> The sole discretion of approving or rejecting a loan lies with the respective bank or NBFC where the user applies. Digital DSA does not guarantee loan approval or offer assurance from any specific bank or NBFC. All loans are subject to credit approval, and their terms, conditions, fees, and charges apply.`,
`<span class="font-semibold">Liability:</span> Digital DSA is not responsible for any loss, damage, or failure at the user’s end during loan processing. The final decision of the bank or NBFC is binding on both the user and Digital DSA.`,
`<span class="font-semibold">Important Information:</span> This information is provided without considering your personal objectives, financial situation, or needs. Please assess its suitability before acting. Exclusive offers are available only when you avail of a loan through Digital DSA and meet specific conditions.`,
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
  let activeSection = $state(""); // Initially no section is active

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

  // SEO keywords
  // const dispatch = createEventDispatcher();
  // $effect(() => { console.log("this is newLoan"); });
  // onMount(() => {
  //   setTimeout(() => {
  //const text = document.querySelector(".content")?.innerText || "";
  //console.log(text, "texttt");
  //dispatch("textExtracted", text);
  //   }, 100); // Small delay to ensure DOM updates
  // });

  const dispatch = createEventDispatcher();

  onMount(() => {
    setTimeout(() => {
const text = document.querySelector(".content")?.innerText || "";

dispatch("textExtracted", text);
    }, 100); // Small delay to ensure DOM updates
  });
</script>

<section class="content">
  <PageDesign {pageData}>
    <div>
      <div class="hidden lg:block">
        <StickyNavbar navList={subList} {activeSection}>
          <div class="flex gap-4 pr-4">
            {#each navList as lastItem}
              {#if lastItem.actionBtn}
                {#each lastItem.actionBtn as action}
                  <div>
                    <Button
                      btnName={action.firstBtn}
                      btnColor={action.btnColor}
                      link={action.link}
                    />
                  </div>
                {/each}
              {/if}
            {/each}
          </div>
        </StickyNavbar>

        <div class="px-[2rem] lg:px-[4rem]">
          <div>
            <div id="ready" data-section="ready" class="section">
              {#each getStart as steps}
                <div class="col-span-2">
                  <NewHome {steps} />
                </div>
              {/each}
            </div>

            {#if cardDataList.length > 0}
              <div class="pt-[4rem]">
                <h3
                  class="md:text-start typography-h2 text-text-main"
                >
                  {IconCardHeading}
                </h3>
                <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-2">
                  {#each cardDataList as cardData (cardData.heading)}
                    <IconCard {cardData} />
                  {/each}
                </div>
              </div>
            {/if}

            <TwoColumn
              cardImage="/images/housing.jpg"
              cardAltName="housing-figure"
              cardHeading="How much can I borrow?"
              reverse
            >
              <div slot="list" class="flex flex-col gap-4">
                <p class="typography-body-sm text-text-light">
                  Get an estimate of how much you may be able to borrow.
                </p>
                <a
                  href="/calculators/emi-calculator"
                  class="underline underline-offset-4 hover:no-underline text-linkColor typography-body-md text-text-light"
                  >Use calculator</a
                >
              </div>
            </TwoColumn>
          </div>

          <div
            data-section="find"
            id="find"
            class="py-[4rem] flex flex-col gap-2 section"
          >
            {#if forHome.length > 0}
              <h2
                class="md:text-start typography-h2 text-text-main"
              >
                Looking for a home
              </h2>
              <div
                class="grid md:grid-cols-2 lg:grid-cols-3 gap-4 border-b border-borderColor"
              >
                {#each forHome as cardData (cardData.heading)}
                  <ThreeCard {cardData} />
                {/each}
              </div>
            {/if}
          </div>

          <div>
            <div data-section="next" id="next" class="section">
              <TwoColumn
                cardImage="/images/home-scheme.jpg"
                cardAltName="parent-figure"
                cardHeading="Home Guarantee Scheme"
              >
                <div slot="list" class="flex flex-col gap-4">
                  <p class="typography-body-sm text-text-light">
                    You may be able to buy your first home sooner with a smaller
                    deposit.
                  </p>
                  <a
                    href="/finance-support"
                    class="underline underline-offset-4 hover:no-underline text-linkColor typography-body-md text-text-light"
                    >Discover the Scheme</a
                  >
                </div>
              </TwoColumn>
            </div>

            <div class="pt-[2rem] lg:pt-[4rem] flex flex-col gap-2">
              {#if whatNext.length > 0}
                <h2
                  class="md:text-start typography-h2 text-text-main"
                >
                  What's next?
                </h2>
                <div
                  class="grid md:grid-cols-2 lg:grid-cols-3 gap-4 border-b border-borderColor"
                >
                  {#each whatNext as cardData (cardData.heading)}
                    <ThreeCard {cardData} />
                  {/each}
                </div>
              {/if}
            </div>

            <HomeIntrest
              homeInterest="See our home loan options"
              btnName="Explore now"
              btnBorder="#4F4C4D"
              btnLink="/home-loan"
            />
          </div>

          <div data-section="calculators" id="calculators" class="section">
            <div class="border-b grid gap-4 md:grid-cols-3">
              <h2
                class="col-span-1 py-[3rem] typography-h2 text-text-main"
              >
                Tools & calculators
              </h2>
              <div class="col-span-2">
                <Support {contents} gridCol={2} />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="lg:hidden block">
        {#each navBarMedium as list, index}
          <details
            class="dropdown col-span-3 bg-darkColor text-white {index < list.length - 1 ? 'border-b' : ''}"
          >
            <summary
              class="col-span-3 list-none px-[2.5rem] py-[1.5rem]"
              onclick={(e) => toggleDropdown(e, index)}
            >
              <div
                class="mx-auto flex w-full items-center justify-between gap-4"
              >
                <h2 class="text-navFont">{list}</h2>
                <div class="icon-container justify-self-end typography-h3">
                  <span><i class="fa-solid fa-angle-down faq-icon"></i></span>
                </div>
              </div>
            </summary>

            {#if index == 0}
              <div id="ready" class="bg-white text-black px-[2rem] py-[1rem]">
                {#each getStart as steps}
                  <div class="">
                    <NewHome {steps} />
                  </div>
                {/each}

                {#if cardDataList.length > 0}
                  <div class="pt-[2rem]">
                    <h3
                      class="md:text-start typography-h2 text-text-main"
                    >
                      {IconCardHeading}
                    </h3>
                    <div class="grid md:grid-cols-2 lg:grid-cols-4">
                      {#each cardDataList as cardData (cardData.heading)}
                        <IconCard {cardData} />
                      {/each}
                    </div>
                  </div>
                {/if}
                <TwoColumn
                  cardImage="/images/housing.jpg"
                  cardAltName="housing-figure"
                  cardHeading="How much can I borrow?"
                  reverse
                >
                  <div slot="list" class="flex flex-col gap-4">
                    <p class="typography-body-sm text-text-light">
                      Get an estimate of how much you may be able to borrow.
                    </p>
                    <a
                      href="/calculators/emi-calculator"
                      class="underline underline-offset-4 hover:no-underline text-linkColor typography-body-md text-text-light"
                      >Use calculator</a
                    >
                  </div>
                </TwoColumn>
              </div>
            {:else if index == 1}
              <div
                id="find"
                class="py-[4rem] flex flex-col bg-white text-black px-[2rem]"
              >
                {#if forHome.length > 0}
                  <h2
                    class="md:text-start typography-h2 text-text-main"
                  >
                    Looking for a home
                  </h2>
                  <div
                    class="grid md:grid-cols-2 lg:grid-cols-3 gap-4 border-b border-borderColor"
                  >
                    {#each forHome as cardData (cardData.heading)}
                      <ThreeCard {cardData} />
                    {/each}
                  </div>
                {/if}
              </div>
            {:else if index == 2}
              <div id="next" class="bg-white text-black px-[2rem] py-[1rem]">
                <TwoColumn
                  cardImage="/images/home-scheme.jpg"
                  cardAltName="parent-figure"
                  cardHeading="Home Guarantee Scheme"
                >
                  <div slot="list" class="flex flex-col gap-4">
                    <p class="typography-body-sm text-text-light">
                      You may be able to buy your first home sooner with a
                      smaller deposit.
                    </p>
                    <a
                      href="/finance-support"
                      class="underline underline-offset-4 hover:no-underline text-linkColor typography-body-md text-text-light"
                      >Discover the Scheme</a
                    >
                  </div>
                </TwoColumn>

                <div class="pt-[2rem] lg:pt-[4rem] flex flex-col gap-2">
                  {#if whatNext.length > 0}
                    <h2
                      class="md:text-start typography-h2 text-text-main"
                    >
                      What's next?
                    </h2>
                    <div
                      class="grid md:grid-cols-2 lg:grid-cols-3 gap-4 border-b border-borderColor"
                    >
                      {#each whatNext as cardData (cardData.heading)}
                        <ThreeCard {cardData} />
                      {/each}
                    </div>
                  {/if}
                </div>

                <HomeIntrest
                  homeInterest="See our home loan options"
                  btnName="Explore now"
                  btnBorder="#4F4C4D"
                />
              </div>
            {:else if index == 3}
              <div
                id="calculators"
                class="bg-white text-black px-[2rem] py-[1rem]"
              >
                <div class="grid lg:grid-cols-3">
                  <h2
                    class="lg:col-span-1 pt-[3rem] lg:pb-[3rem] pb-0 typography-h2 text-text-main"
                  >
                    Tools & calculators
                  </h2>
                  <div class="col-span-2">
                    <Support {contents} gridCol={2} />
                  </div>
                </div>
              </div>
            {/if}
          </details>
        {/each}
      </div>

      <div class="px-[2rem] lg:px-[4rem]">
        <TwoColumn
          cardImage="/images/message.jpg"
          cardAltName="housing-figure"
          cardHeading="Message us 24/7"
        >
          <ul
            class="grid gap-[2rem] typography-body-md text-text-light"
            slot="list"
          >
            <li>
              Get instant help from  the Digital DSA app or connect with
              a specialist who can message you back. You’ll need Digital DSA app
              notifications turned on so you know when you’ve received a reply.
            </li>

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
    </div>
    <div slot="secondary" class="p-4 lg:p-0">
      <WeAreHereHelp {help} heading="We're here to help" />
      <ThingsYouShould {thinkKnow} disc="list-decimal" />
    </div>
  </PageDesign>
</section>

<style>
  .section {
    scroll-margin-top: 4rem; /* Adjust this value to match your navbar height */
  }
</style>
