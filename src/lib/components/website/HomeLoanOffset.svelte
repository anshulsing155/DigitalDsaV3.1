<script>
	let {
		data
	} = $props();



  import PageDesign from "$lib/components/website/PageDesign.svelte";
  import Button from "$lib/components/website/Button.svelte";
  import HomeIntrest from "$lib/components/website/HomeIntrest.svelte";
  import TwoColumn from "$lib/components/website/TwoColumn.svelte";
  import ThreeCard from "$lib/components/website/ThreeCard.svelte";
  import WeAreHereHelp from "$lib/components/website/WeAreHereHelp.svelte";
  import ThingsYouShould from "$lib/components/website/ThingsYouShould.svelte";
  import PaymentTable from "$lib/components/website/PaymentTable.svelte";
  import Journey from "$lib/components/website/Journey.svelte";
  import Information from "$lib/components/website/Information.svelte";
  import Support from "$lib/components/website/Support.svelte";
  import gsap from "gsap";
  import { onMount } from "svelte";
  import StickyNavbar from "./StickyNavbar.svelte";
  import WhyChoose from "$lib/components/website/WhyChoose.svelte";
  import Dropdown from "./Dropdown.svelte";

  let pageData = {
    coverImage: "/images/homeLoanOffSet.jpg",
    altName: "hero-cover",
    classStyle: "object-cover xl:h-[70svh] 3xl:max-h-[70svh]",
    heroHeading: "Everyday Offset Account",
    heroParagraph: `Make your money work harder by saving on interest and paying off your home loan sooner with multiple offsets with no set-up fee.`,
  };

  let subList = [
    {
name: "Offset & redraw",
targetId: `redraw`,
    },
    {
name: "How to switch",
targetId: `switch`,
    },
    {
name: "Features & benefits",
targetId: `benefits`,
    },
    {
name: "Home loans with offset",
targetId: `offset`,
    },
    {
name: "Tools & support",
targetId: `support`,
    },
  ];

  let navList = [
    {
actionBtn: [
{
firstBtn: "Manage my offset",
link: "",
btnColor: "#ffcc00",
},
{
firstBtn: "Apply for new loan",
link: "/apply",
},
],
    },
  ];

  let navBarMedium = [
    "Offset & redraw",
    "How to switch",
    "Features & benefits",
    "Home loans with offset",
    "Tools & support",
  ];

  let offset = {
    heading: `Understanding offset`,
    subPara: [
`An Everyday Offset is a transaction account linked to your eligible <a href="/home-loan/variable-rates" class="underline hover:no-underline text-linkColor">Standard Variable Rate</a> home loan. Any money you put into your Everyday Offset reduces the balance on which we charge interest. This means you’ll only be paying interest on the difference.`,
    ],
  };

  let redraw = {
    heading: `Offer details`,
    subHeading: `What's the difference between an offset account and a redraw facility?`,
    linkName: "Tell me more about redraw vs offset",
    url: "",
    subPara: [
`Your Everyday Offset is a separate account linked to your eligible <a href="/home-loan/variable-rates" class="underline hover:no-underline text-linkColor">Standard Variable Rate</a> home loan, while <a href="/home-loan/home-loan-redraw" class="underline hover:no-underline text-linkColor">redraw</a> is a feature available for some eligible variable rate home loans. Both can help:`,
    ],
    paraGraph: [
`reduce the amount of interest you pay on your home loan`,
`pay off your home loan sooner.`,
    ],
    bottomPara: [
`Redraw allows you to withdraw money you've contributed towards your home loan over and above your minimum required repayment. The money in your redraw account may reduce over the life of your loan so that, by the end of your agreed loan term, both your loan balance and the available redraw will be zero.`,
`If you’re currently using a redraw facility to deposit money that you plan on using later, an Everyday Offset may be more suitable if you plan on using the money more regularly.`,
    ],
  };

  let switchList = [
    {
lists: [
{
heading: `If you don’t already have an existing eligible transaction account, you’ll need to open an Everyday Account Smart Access first:`,
listItems: [
{
num: "1",
text: `Log on to <a href="" class="underline hover:no-underline text-linkColor">NetBank</a>`,
},
{
num: "2",
text: `Click on ‘Accounts’ tab and follow instructions to open an ‘Everyday Account Smart Access’`,
},
{
num: "3",
text: `Switch your transaction account to an Everyday Offset using the instructions below`,
},
],
},
],
    },
    {
lists: [
{
heading: `How to switch an eligible transaction account to an Everyday Offset account online:`,
listItems: [
{
num: "1",
text: `Log on to <a href="" class="underline hover:no-underline text-linkColor">NetBank</a>`,
},
{
num: "2",
text: `Select your eligible Standard Variable Rate home loan account for an Everyday Offset account to be linked to`,
},
{
num: "3",
text: `Under the Manage my Loan section, select the ‘Redraw and Offset’ tab`,
},
],
},
],
    },
  ];

  let benefits = [
    {
heading: "100% offset",
para: `100% of the money in your Everyday Offset will be deducted from your home loan balance before interest is charged. `,
    },
    {
heading: "Save on interest charges",
para: `The more money you have in your Everyday Offset, the less interest you’ll pay on your home loan.`,
    },
    {
heading: "Pay your loan off sooner",
para: `Paying less interest over time could also reduce the time it takes to pay off your loan, as a larger portion of your repayments will go towards paying off the principal.`,
    },
    {
heading: "Link multiple offset accounts",
para: `Maximise the benefits by linking multiple offsets to an eligible Digital DSA home loan. Link up to 99 offset accounts.`,
    },
    {
heading: "Access your money anytime",
para: `You can access your money using your Digital DSA keycard or Debit Mastercard®, in branch or online in <a href="" class="underline hover:no-underline text-linkColor">NetBank</a> and the <a href="" class="underline hover:no-underline text-linkColor">Digital DSA app</a>.`,
    },
    {
heading: "No minimum balance ",
para: `There’s no minimum balance needed for the offset to be applied to your home loan.`,
    },
  ];

  let offsetAccount = [
    {
btnName: "Explore more loan features",
btnBorder: "#706d6e",
btnLink: "/home-loan",
heading: "Standard Variable Rate",
para: `A variable rate with discounts tailored to you, plus access to offset and an extensive range of features.`,
    },
    {
btnName: "Book now",
btnColor: "#ffcc00",
btnLink: "/appointment",
heading: "Book time with a lender instantly",
para: `Get the most from your home loan application process and book time with a <a href="" class="underline hover:no-underline text-linkColor">Home Lending Specialist</a> at a time and place that suits you.`,
    },
    {
btnName: "Apply online",
btnColor: "#ffcc00",
btnLink: "/get-started/how-can-we-help",
heading: "Apply for a home loan, conditional pre-approval or refinance",
para: `Start your home loan or refinance application online and if eligible receive a conditional approval in minutes.`,
    },
  ];

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
name: "Upfront costs calculator",
url: "/calculators/emi-calculator",
},
{
id: 3,
name: "Home loan repayments calculator",
url: "/calculators/emi-calculator",
},
{
id: 4,
name: "Refinance calculator",
url: "/calculators/emi-calculator",
},
{
name: "Show me more",
url: `/calculators/emi-calculator`,
},
],
    },
    {
id: 2,
title: "Manage your home loan",
links: [
{
id: 1,
name: "Manage home loan",
url: "/",
},
],
    },
    {
id: 3,
title: "Guides",
links: [
{
id: 1,
name: "What is an offset account?",
url: "/home-loan/new-loan",
},
{
id: 2,
name: "3 ways to pay off your home loan faster",
url: "/home-loan/new-loan",
},
{
id: 3,
name: "Show me more",
url: "/home-loan/new-loan",
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

  let thinkKnow = {
    heading: "Things you should know",
    paraGraph: [ `<span class="font-semibold">Independent Facilitator:</span> Digital DSA operates as an independent loan facilitator and web aggregator, bridging the gap between loan consumers and licensed banks or NBFCs. We are not an authorized financial institution and do not offer loans directly.`,
  `<span class="font-semibold">Loan Approval:</span> The sole discretion of approving or rejecting a loan lies with the respective bank or NBFC where the user applies. Digital DSA does not guarantee loan approval or offer assurance from any specific bank or NBFC. All loans are subject to credit approval, and their terms, conditions, fees, and charges apply.`,
  `<span class="font-semibold">Liability:</span> Digital DSA is not responsible for any loss, damage, or failure at the user’s end during loan processing. The final decision of the bank or NBFC is binding on both the user and Digital DSA.`,
  `<span class="font-semibold">Important Information:</span> This information is provided without considering your personal objectives, financial situation, or needs. Please assess its suitability before acting. Exclusive offers are available only when you avail of a loan through Digital DSA and meet specific conditions.`]
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

<section>
 
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
            <div id="redraw" data-section="redraw" class="section">
              <div class="border-b border-dividerColor py-[1rem] lg:py-[2rem]">
                <ThingsYouShould thinkKnow={offset} />
              </div>
            </div>

            <div class="border-b border-dividerColor py-[1rem] lg:py-[2rem]">
              <ThingsYouShould thinkKnow={redraw} disc="list-disc" />
            </div>

            <HomeIntrest
              homeInterest="Compare home loans"
              btnName="Compare now"
              btnBorder="#4F4C4D"
              btnLink="/home-loan"
            />
          </div>

          <div id="switch" data-section="switch" class="section">
            <div
              class="border-b border-dividerColor grid gap-4 py-[4rem] lg:grid-cols-5"
            >
              <h2
                class="typography-h3 font-semibold md:col-span-2 md:typography-h2-md lg:typography-h2"
              >
                How to switch an account to Everyday Offset
              </h2>
              <div
                class="grid gap-5 overflow-hidden typography-body-md text-text-light md:col-span-3"
              >
                <p class="typography-body-sm text-text-light">
                  You can switch an eligible transaction account to an Everyday
                  Offset online with your eligible Digital DSA Standard Variable
                  Rate home loan
                </p>
                {#each switchList as switchItems}
                  {#each switchItems.lists as list}
                    <ul class="flex flex-col gap-4">
                      <h3 class="mb-4 typography-h3 font-semibold text-text-main">
                        {list.heading}
                      </h3>
                      {#each list.listItems as item}
                        <li>
                          <div
                            class="grid md:grid-cols-8 grid-cols-6 gap-2 lg:gap-0"
                          >
                            <span
                              class="col-span-1 flex items-center justify-center text-white bg-darkColor rounded-full w-[2rem] h-[2rem]"
                              >{item.num}</span
                            >
                            <p
                              class="md:col-span-7 col-span-5 typography-body-md text-text-light"
                            >
                              {@html item.text}
                            </p>
                          </div>
                        </li>
                      {/each}
                    </ul>
                  {/each}
                {/each}
                <a
                  href="/"
                  class="text-linkColor hover:no-underline underline typography-body-md text-text-light"
                  >Download the Everyday Offset fact sheet (PDF)</a
                >
              </div>
            </div>
          </div>

          <div id="benefits" data-section="benefits" class="section">
            <div class="pt-[2rem] lg:pt-[4rem] border-b border-borderColor">
              <h2
                class="md:text-start typography-h2 text-text-main"
              >
                Looking for a home
              </h2>
              <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-[2rem]">
                {#each benefits as cardData (cardData.heading)}
                  <ThreeCard {cardData} />
                {/each}
              </div>
            </div>
          </div>

          <div id="offset" data-section="offset" class="section">
            <div class="pt-[2rem] lg:pt-[4rem] border-b border-borderColor">
              <h2
                class="md:text-start typography-h2 text-text-main"
              >
                Home loans with an offset account
              </h2>
              <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-[2rem]">
                {#each offsetAccount as cardData (cardData.heading)}
                  <ThreeCard {cardData} />
                {/each}
              </div>
            </div>
          </div>

          <div id="support" data-section="support" class="section">
            <div class="border-b border-borderColor">
              <div class="grid grid-cols-3 gap-4 py-[4rem]">
                {#each contents as content, index}
                  {#if index == 0 || index == 2}
                    <div
                      class="border-2 border-borderColor min-h-[25svh] p-[2rem] flex flex-col gap-[3rem]"
                    >
                      <div class="flex flex-col gap-4">
                        <h3 class="typography-h3 font-semibold text-text-main">
                          {content.title}
                        </h3>

                        <div class="flex flex-col gap-2">
                          {#each content.links as link, index}
                            <ul class="list-disc marker:text-black pl-4">
                              {#if index < content.links.length - 1}
                                <li
                                  class="underline text-linkColor hover:no-underline"
                                >
                                  <a href={link.url}>{link.name}</a>
                                </li>
                              {/if}
                            </ul>
                          {/each}
                        </div>
                      </div>

                      <ul class="pl-4">
                        {#each content.links as link, index}
                          {#if index >= content.links.length - 1}
                            <li class="text-linkColor hover:underline">
                              <a href={link.url}>{link.name}</a>
                            </li>
                          {/if}
                        {/each}
                      </ul>
                    </div>
                  {:else}
                    {#each content.links as link, index}
                      {#if index >= content.links.length - 1}
                        <a
                          href={link.url}
                          class="border-2 border-borderColor min-h-[25svh] p-[2rem] flex flex-col gap-[3rem] bg-darkColor text-white justify-center items-center h-full"
                        >
                          <div class="flex flex-col items-center">
                            <img src="/icons/comparison2.svg" alt="icon" />
                            <p>{link.name}</p>
                          </div>
                        </a>
                      {/if}
                    {/each}
                  {/if}
                {/each}
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
              <div id="redraw" class="bg-white text-black px-[2rem]">
                <div
                  class="border-b border-dividerColor py-[1rem] lg:py-[2rem]"
                >
                  <ThingsYouShould thinkKnow={offset} />
                </div>

                <div
                  class="border-b border-dividerColor py-[1rem] lg:py-[2rem]"
                >
                  <ThingsYouShould thinkKnow={redraw} disc="list-disc" />
                </div>

                <HomeIntrest
                  homeInterest="Compare home loans"
                  btnName="Compare now"
                  btnBorder="#4F4C4D"
                  btnLink="/home-loan"
                />
              </div>
            {:else if index == 1}
              <div id="switch" class="bg-white text-black px-[2rem]">
                <div class="grid gap-4 py-[4rem] lg:grid-cols-5">
                  <h2
                    class="typography-h3 font-semibold md:col-span-2 md:typography-h2-md lg:typography-h2"
                  >
                    How to switch an account to Everyday Offset
                  </h2>
                  <div
                    class="grid gap-5 overflow-hidden typography-body-md text-text-light md:col-span-3"
                  >
                    <p class="typography-body-sm text-text-light">
                      You can switch an eligible transaction account to an
                      Everyday Offset online with your eligible Digital DSA
                      Standard Variable Rate home loan
                    </p>
                    {#each switchList as switchItems}
                      {#each switchItems.lists as list}
                        <ul class="flex flex-col gap-4">
                          <h3 class="mb-4 typography-h3 font-semibold text-text-main">
                            {list.heading}
                          </h3>
                          {#each list.listItems as item}
                            <li>
                              <div
                                class="grid md:grid-cols-8 grid-cols-6 gap-2 lg:gap-0"
                              >
                                <span
                                  class="col-span-1 flex items-center justify-center text-white bg-darkColor rounded-full w-[2rem] h-[2rem]"
                                  >{item.num}</span
                                >
                                <p
                                  class="md:col-span-7 col-span-5 typography-body-md text-text-light"
                                >
                                  {@html item.text}
                                </p>
                              </div>
                            </li>
                          {/each}
                        </ul>
                      {/each}
                    {/each}
                    <a
                      href="/"
                      class="text-linkColor hover:no-underline underline typography-body-md text-text-light"
                      >Download the Everyday Offset fact sheet (PDF)</a
                    >
                  </div>
                </div>
              </div>
            {:else if index == 2}
              <div id="benefits" class="bg-white text-black px-[2rem]">
                <div class="pt-[2rem] lg:pt-[4rem]">
                  <h2
                    class="md:text-start typography-h2 text-text-main"
                  >
                    Looking for a home
                  </h2>
                  <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-[2rem]">
                    {#each benefits as cardData (cardData.heading)}
                      <ThreeCard {cardData} />
                    {/each}
                  </div>
                </div>
              </div>
            {:else if index == 3}
              <div id="offset" class="bg-white text-black px-[2rem]">
                <div class="pt-[2rem] lg:pt-[4rem]">
                  <h2
                    class="md:text-start typography-h2 text-text-main"
                  >
                    Home loans with an offset account
                  </h2>
                  <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-[2rem]">
                    {#each offsetAccount as cardData (cardData.heading)}
                      <ThreeCard {cardData} />
                    {/each}
                  </div>
                </div>
              </div>
            {:else if index == 4}
              <div id="support" class="bg-white text-black px-[2rem]">
                <div class="grid md:grid-cols-2 gap-4 py-[4rem]">
                  {#each contents as content, index}
                    {#if index == 0 || index == 2}
                      <div
                        class="border-2 border-borderColor min-h-[25svh] p-[2rem] flex flex-col gap-[3rem]"
                      >
                        <div class="flex flex-col gap-4">
                          <h3 class="typography-h3 font-semibold text-text-main">
                            {content.title}
                          </h3>

                          <div class="flex flex-col gap-2">
                            {#each content.links as link, index}
                              <ul class="list-disc marker:text-black pl-4">
                                {#if index < content.links.length - 1}
                                  <li
                                    class="underline text-linkColor hover:no-underline"
                                  >
                                    <a href={link.url}>{link.name}</a>
                                  </li>
                                {/if}
                              </ul>
                            {/each}
                          </div>
                        </div>

                        <ul class="pl-4">
                          {#each content.links as link, index}
                            {#if index >= content.links.length - 1}
                              <li class="text-linkColor hover:underline">
                                <a href={link.url}>{link.name}</a>
                              </li>
                            {/if}
                          {/each}
                        </ul>
                      </div>
                    {:else}
                      {#each content.links as link, index}
                        {#if index >= content.links.length - 1}
                          <a
                            href={link.url}
                            class="border-2 border-borderColor min-h-[50svh] h-full p-[2rem] flex flex-col gap-[3rem] bg-darkColor text-white justify-center items-center"
                          >
                            <div class="flex flex-col items-center">
                              <img src="/icons/comparison2.svg" alt="icon" />
                              <p>{link.name}</p>
                            </div>
                          </a>
                        {/if}
                      {/each}
                    {/if}
                  {/each}
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
