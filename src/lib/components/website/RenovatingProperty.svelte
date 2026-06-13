<script>
	let {
		data
	} = $props();




  import PageDesign from "./PageDesign.svelte";
  import Button from "./Button.svelte";
  import NewHome from "./NewHome.svelte";
 
  import TwoColumn from "./TwoColumn.svelte";
  import ThreeCard from "./ThreeCard.svelte";
  import Support from "./Support.svelte";
  import HomeIntrest from "$lib/components/website/HomeIntrest.svelte";
  import WeAreHereHelp from "$lib/components/website/WeAreHereHelp.svelte";
  import ThingsYouShould from "$lib/components/website/ThingsYouShould.svelte";
  
  import { onMount } from "svelte";
  
  import StickyNavbar from "./StickyNavbar.svelte";

  let pageData = {
    coverImage: "/images/renovatingProperty-cover.jpg",
    altName: "hero-cover",
    classStyle: "object-cover xl:h-[70svh] 3xl:max-h-[70svh]",
    heroHeading: "Renovating a property",
    heroParagraph: `A renovation can easily turn costly. We can help you get prepared and plan ahead.`,
  };

  let subList = [
    {
name: "Get started",
targetId: `started`,
    },
    {
name: "Plan your project",
targetId: `plan`,
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
],
    },
  ];

  let started = [
    {
heading: "Getting started",
data: [
{
id: "1",
title: "Renovate or move? ",
desc: `Weigh up your options and decide if renovating is the best option for you.`,
link: "Keep reading",
url: "",
},
{
id: "2",
title: "How to finance your renovation",
desc: `There are a few different options available – find out which might work best for you.`,
link: "Tell me about financing my renovation",
url: "",
},
],
    },
  ];

  let sustainability = [
    {
heading: "Sustainability hub",
para: `We have a range of resources to help you on your journey towards a more sustainable life.`,
link: "/home-loan/new-loan",
linkName: "Discover the hub",
    },
  ];

  let next = [
    {
heading: "What's next? ",
data: [
{
id: "1",
title: "Topping up your loan",
desc: `If you've already got a home loan, you may be able to top it up.`,
link: "Keep reading",
url: "",
},
],
    },
  ];

  let planProject = [
    {
heading: "Renovating an apartment",
para: `Make sure your time, effort and money is invested for the right reasons.`,
link: "/home-loan/new-loan",
linkName: "Tell me more",
    },
    {
heading: "Avoid renovating setbacks",
para: `It’s important to do your homework, so you know what to expect at every stage of the project.`,
link: "/home-loan/new-loan",
linkName: "Show me",
    },
    {
heading: "Tips for giving your home a facelift ",
para: `You don’t have to spend a lot to make a big difference to your home.`,
link: "/home-loan/new-loan",
linkName: "Keep reading",
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
    "Get started",
    "Plan your project",
    "What's next?",
    "Tools & calculators",
  ];

  let thinkKnow = {
    heading: "Things you should know",
    paraGraph: [
`Subject to credit approval. Fees, charges, terms and conditions apply. As this advice has been prepared without considering your objectives, financial situation or needs, you should consider its appropriateness to your circumstances before acting on the advice.`,
    ],
  };

  // Function to handle opening and closing of details
  // Toggle dropdown with animation
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
  //ends here...
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
            <div id="started" data-section="started" class="section">
              {#each started as steps}
                <div class="col-span-2">
                  <NewHome {steps} />
                </div>
              {/each}
            </div>
            <HomeIntrest
              homeInterest="Book a time with a Home Lending Specialist"
              btnName="Book now"
              btnColor="#ffcc00"
              btnLink="/appointment"
            />
            <TwoColumn
              cardImage="/images/computerNotepad.jpg"
              cardAltName="housing-figure"
              cardHeading="What’s your budget?"
            >
              <ul
                class="grid gap-[2rem] typography-body-md text-[var(--form-text-secondary)]"
                slot="list"
              >
                <li>
                  Work out what you want to spend, make a budget and stick to
                  it.
                </li>

                <a
                  href="/offers"
                  class="underline underline-offset-4 hover:no-underline text-linkColor"
                  >Tell me more</a
                >
              </ul>
            </TwoColumn>
          </div>

          <div data-section="plan" id="plan" class="section">
            <div class="pt-[2rem] lg:pt-[4rem] flex flex-col gap-2">
              {#if planProject.length > 0}
                <h2
                  class="md:text-start typography-h2 text-[var(--form-text)]"
                >
                  Plan your project
                </h2>
                <div
                  class="grid md:grid-cols-2 lg:grid-cols-3 gap-4 border-b border-[var(--form-border)]"
                >
                  {#each planProject as cardData (cardData.heading)}
                    <ThreeCard {cardData} />
                  {/each}
                </div>
              {/if}
            </div>
          </div>

          <div data-section="next" id="next" class="section">
            {#each next as steps}
              <div class="col-span-2">
                <NewHome {steps} />
              </div>
            {/each}
            <HomeIntrest
              homeInterest="See our home loan options"
              btnName="Explore now"
              btnBorder="#706d6e"
              btnLink="/home-loan"
            />
          </div>

          <div data-section="calculators" id="calculators" class="section">
            <div class="border-b pt-[3rem]">
              <h2
                class="typography-h2 text-[var(--form-text)]"
              >
                Tools & calculators
              </h2>
              <div class="grid grid-cols-3 gap-4">
                <div class="col-span-2">
                  <Support {contents} gridCol={2} />
                </div>
                <div class="col-span-1 py-[1rem]">
                  {#each sustainability as cardData (cardData.heading)}
                    <ThreeCard {cardData} />
                  {/each}
                </div>
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
                <div class="icon-container justify-self-end text-[var(--form-text)]">
                  <span><i class="fa-solid fa-angle-down faq-icon"></i></span>
                </div>
              </div>
            </summary>

            {#if index == 0}
              <div id="started" class="bg-white text-black px-[2rem] py-[1rem]">
                {#each started as steps}
                  <div class="col-span-2">
                    <NewHome {steps} />
                  </div>
                {/each}
                <HomeIntrest
                  homeInterest="Book a time with a Home Lending Specialist"
                  btnName="Book now"
                  btnColor="#ffcc00"
                  btnLink="/appointment"
                />
                <TwoColumn
                  cardImage="/images/computerNotepad.jpg"
                  cardAltName="housing-figure"
                  cardHeading="What’s your budget?"
                >
                  <ul
                    class="grid gap-[2rem] typography-body-md text-[var(--form-text-secondary)]"
                    slot="list"
                  >
                    <li>
                      Work out what you want to spend, make a budget and stick
                      to it.
                    </li>

                    <a
                      href="/offers"
                      class="underline underline-offset-4 hover:no-underline text-linkColor"
                      >Tell me more</a
                    >
                  </ul>
                </TwoColumn>
              </div>
            {:else if index == 1}
              <div
                id="plan"
                class="py-[2rem] lg:py-[4rem] flex flex-col bg-white text-black px-[2rem]"
              >
                <div class="pt-[2rem] lg:pt-[4rem] flex flex-col gap-2">
                  {#if planProject.length > 0}
                    <h2
                      class="md:text-start typography-h2 text-[var(--form-text)]"
                    >
                      Plan your project
                    </h2>
                    <div
                      class="grid md:grid-cols-2 lg:grid-cols-3 gap-4 border-b border-[var(--form-border)]"
                    >
                      {#each planProject as cardData (cardData.heading)}
                        <ThreeCard {cardData} />
                      {/each}
                    </div>
                  {/if}
                </div>
              </div>
            {:else if index == 2}
              <div id="next" class="bg-white text-black px-[2rem] py-[1rem]">
                {#each next as steps}
                  <div class="col-span-2">
                    <NewHome {steps} />
                  </div>
                {/each}
                <HomeIntrest
                  homeInterest="See our home loan options"
                  btnName="Explore now"
                  btnBorder="#706d6e"
                  btnLink="/home-loan"
                />
              </div>
            {:else if index == 3}
              <div
                id="calculators"
                class="bg-white text-black px-[2rem] py-[1rem]"
              >
              <div class="pt-[3rem]">
                <h2
                  class="typography-h2 text-[var(--form-text)]"
                >
                  Tools & calculators
                </h2>
                <div class="">
                  <div class="">
                    <Support {contents} gridCol={2} />
                  </div>
                  <div class="">
                    {#each sustainability as cardData (cardData.heading)}
                      <ThreeCard {cardData} />
                    {/each}
                  </div>
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
            class="grid gap-[2rem] typography-body-md text-[var(--form-text-secondary)]"
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
