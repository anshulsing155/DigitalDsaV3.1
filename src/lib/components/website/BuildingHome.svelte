<script>
	let {
		data
	} = $props();


   

  import PageDesign from "./PageDesign.svelte";
  import Button from "./Button.svelte";
  import NewHome from "./NewHome.svelte";
 
  import TwoColumn from "./TwoColumn.svelte";
 
  import Support from "./Support.svelte";
  import HomeIntrest from "$lib/components/website/HomeIntrest.svelte";
  import WeAreHereHelp from "$lib/components/website/WeAreHereHelp.svelte";
 
  import { onMount } from "svelte";
 
  import StickyNavbar from "./StickyNavbar.svelte";


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

    // //console.log(activeSection, 'active');
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
  <PageDesign pageData={{
    coverImage: "/images/buildingHome-cover.jpg",
    altName: "hero-cover",
    classStyle: "object-cover xl:h-[90svh] 3xl:max-h-[70svh]",
    heroHeading: "Building a home",
    heroParagraph: `There’s a lot to consider before you decide to build your own home. Our tools and support can help you plan ahead.`,
  }}>
    <div>
      <div class="hidden lg:block">
        <StickyNavbar navList={[
          {
            name: "Get started",
            targetId: `started`,
          },
          {
            name: "Plan your build",
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
        ]} {activeSection}>
          <div class="  flex gap-4 pr-4">
            {#each [
              {
                actionBtn: [
                  {
                    firstBtn: "Book appointment",
                    link: "/appointment",
                    btnColor: "#ffcc00",
                  },
                ],
              },
            ] as lastItem}
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

        <div class=" px-[2rem] lg:px-[4rem]">
          <div>
            <div
              id="started"
              data-section="started"
              class="border-b border-borderColor section"
            >
              {#each [
                {
                  heading: "Getting started ",
                  data: [
                    {
                      id: "1",
                      title: "Reasons you should build",
                      desc: `There are a number of benefits to building your own home. `,
                      link: "Keep reading",
                      url: "",
                    },
                    {
                      id: "2",
                      title: "Steps to building a home",
                      desc: `These steps will help you understand the process of building a new home. `,
                      link: "Tell me more",
                      url: "",
                    },
                  ],
                },
              ] as steps}
                <div class="col-span-2">
                  <NewHome {steps} />
                </div>
              {/each}
            </div>
            <HomeIntrest
              homeInterest="A comprehensive guide to help you understand the process of building a new home, so you can be in control"
              btnName="Download our Construction Loan Guide (PDF)"
              btnBorder="#706d6e"
              btnLink="/"
            />
            <TwoColumn
              cardImage="/images/motherDaughter.jpg"
              cardAltName="mother-image"
              cardHeading="Work out your upfront costs"
            >
              <ul
                class="grid gap-[2rem] font-Paragraph text-subParaFont"
                slot="list"
              >
                <li>
                  In addition to your deposit, there are some other costs like
                  stamp duty to budget for.
                </li>

                <a
                  href="/calculators/emi-calculator"
                  class="underline underline-offset-4 hover:no-underline text-linkColor"
                  >Calculate costs</a
                >
              </ul>
            </TwoColumn>
            <div class="border-t border-borderColor">
              <HomeIntrest
                homeInterest="Book a time with a Home Lending Specialist"
                btnName="Book now"
                btnColor="#ffcc00"
                btnLink="/appointment"
              />
            </div>
          </div>

          <div data-section="plan" id="plan" class=" section">
            {#each [
              {
                heading: "Plan your build",
                data: [
                  {
                    id: "1",
                    title: "Choosing a block of land",
                    desc: `Buying land to build your new home is the first and most important step in the home building process.`,
                    link: "Keep reading",
                    url: "",
                  },
                  {
                    id: "2",
                    title: "Buying off the plan",
                    desc: `There are a few things you need to keep in mind when you're buying off the plan. `,
                    link: "Tell me more",
                    url: "",
                  },
                  {
                    id: "3",
                    title: "Costs of building",
                    desc: `Understanding what costs are involved will help you plan and stick to your budget.`,
                    link: "Tell me more",
                    url: "",
                  },
                  {
                    id: "4",
                    title: "Avoid building mistakes",
                    desc: `Avoid the most common building mistakes and turn your dream home into reality. `,
                    link: "Keep reading",
                    url: "",
                  },
                ],
              },
            ] as steps}
              <div class="col-span-2 border-b border-borderColor">
                <NewHome {steps} />
              </div>
            {/each}
          </div>

          <div data-section="next" id="next" class="section">
            {#each [
              {
                heading: "What's next? ",
                data: [
                  {
                    id: "1",
                    title: "Construction loans",
                    desc: `Everything you need to know about our construction loan.`,
                    link: "Discover our construction loans",
                    url: "",
                  },
                  {
                    id: "1",
                    title: "Budget planner",
                    desc: `Work out how much you want to spend and make a budget.`,
                    link: "Make a budget",
                    url: "/planners/both",
                  },
                ],
              },
            ] as steps}
              <div class="col-span-2 border-b border-borderColor">
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
            <div class="border-b grid grid-cols-3 gap-4">
              <h2
                class="col-span-1 pt-[3rem] font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont"
              >
                Tools & calculators
              </h2>
              <div class="col-span-2">
                <Support contents={[
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
                ]} gridCol={2} />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="lg:hidden block">
        {#each [
          "Get started",
          "Plan your build",
          "What's next?",
          "Tools & calculators",
        ] as list, index}
          <details
            class="dropdown col-span-3 bg-darkColor text-white {index <
            list.length - 1
              ? 'border-b'
              : ''} "
          >
            <summary
              class="col-span-3 list-none px-[2.5rem] py-[1.5rem]"
              onclick={(e) => toggleDropdown(e, index)}
            >
              <div
                class="mx-auto flex w-full items-center justify-between gap-4"
              >
                <h2 class="text-navFont">{list}</h2>
                <div class="icon-container justify-self-end text-mobSubHead">
                  <span><i class="fa-solid fa-angle-down faq-icon"></i></span>
                </div>
              </div>
            </summary>

            {#if index == 0}
              <div id="started" class="bg-white text-black px-[2rem] py-[1rem]">
                {#each [
                  {
                    heading: "Getting started ",
                    data: [
                      {
                        id: "1",
                        title: "Reasons you should build",
                        desc: `There are a number of benefits to building your own home. `,
                        link: "Keep reading",
                        url: "",
                      },
                      {
                        id: "2",
                        title: "Steps to building a home",
                        desc: `These steps will help you understand the process of building a new home. `,
                        link: "Tell me more",
                        url: "",
                      },
                    ],
                  },
                ] as steps}
                  <div class="col-span-2">
                    <NewHome {steps} />
                  </div>
                {/each}
                <HomeIntrest
                  homeInterest="A comprehensive guide to help you understand the process of building a new home, so you can be in control"
                  btnName="Download our Construction Loan Guide (PDF)"
                  btnBorder="#706d6e"
                  btnLink="/"
                />
                <TwoColumn
                  cardImage="/images/motherDaughter.jpg"
                  cardAltName="mother-image"
                  cardHeading="Work out your upfront costs"
                >
                  <ul
                    class="grid gap-[2rem] font-Paragraph text-subParaFont"
                    slot="list"
                  >
                    <li>
                      In addition to your deposit, there are some other costs
                      like stamp duty to budget for.
                    </li>

                    <a
                      href="/calculators/emi-calculator"
                      class="underline underline-offset-4 hover:no-underline text-linkColor"
                      >Calculate costs</a
                    >
                  </ul>
                </TwoColumn>
                <HomeIntrest
                  homeInterest="Book a time with a Home Lending Specialist"
                  btnName="Book now"
                  btnColor="#ffcc00"
                  btnLink="/appointment"
                />
              </div>
            {:else if index == 1}
              <div
                id="plan"
                class="py-[2rem] lg:py-[4rem] flex flex-col bg-white text-black px-[2rem]"
              >
                {#each [
                  {
                    heading: "Plan your build",
                    data: [
                      {
                        id: "1",
                        title: "Choosing a block of land",
                        desc: `Buying land to build your new home is the first and most important step in the home building process.`,
                        link: "Keep reading",
                        url: "",
                      },
                      {
                        id: "2",
                        title: "Buying off the plan",
                        desc: `There are a few things you need to keep in mind when you're buying off the plan. `,
                        link: "Tell me more",
                        url: "",
                      },
                      {
                        id: "3",
                        title: "Costs of building",
                        desc: `Understanding what costs are involved will help you plan and stick to your budget.`,
                        link: "Tell me more",
                        url: "",
                      },
                      {
                        id: "4",
                        title: "Avoid building mistakes",
                        desc: `Avoid the most common building mistakes and turn your dream home into reality. `,
                        link: "Keep reading",
                        url: "",
                      },
                    ],
                  },
                ] as steps}
                  <div class="col-span-2">
                    <NewHome {steps} />
                  </div>
                {/each}
              </div>
            {:else if index == 2}
              <div id="next" class="bg-white text-black px-[2rem] py-[1rem]">
                {#each [
                  {
                    heading: "What's next? ",
                    data: [
                      {
                        id: "1",
                        title: "Construction loans",
                        desc: `Everything you need to know about our construction loan.`,
                        link: "Discover our construction loans",
                        url: "",
                      },
                      {
                        id: "1",
                        title: "Budget planner",
                        desc: `Work out how much you want to spend and make a budget.`,
                        link: "Make a budget",
                        url: "/planners/both",
                      },
                    ],
                  },
                ] as steps}
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
                <div class="">
                  <h2
                    class="pt-[3rem] font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont"
                  >
                    Tools & calculators
                  </h2>
                  <div class="">
                    <Support contents={[
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
                    ]} gridCol={2} />
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
            class="grid gap-[2rem] font-Paragraph text-subParaFont"
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
      <WeAreHereHelp help={[
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
      ]} heading="We're here to help" />
    </div>
  </PageDesign>
</section>

<style>
  .section {
    scroll-margin-top: 4rem; /* Adjust this value to match your navbar height */
  }
</style>
