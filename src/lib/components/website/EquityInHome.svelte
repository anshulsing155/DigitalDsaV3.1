<script>
	let {
		data
	} = $props();



  import PageDesign from "$lib/components/website/PageDesign.svelte";
  import Button from "$lib/components/website/Button.svelte";
  import HomeIntrest from "$lib/components/website/HomeIntrest.svelte";
  import TwoColumn from "$lib/components/website/TwoColumn.svelte";
 
  import WeAreHereHelp from "$lib/components/website/WeAreHereHelp.svelte";
  import ThingsYouShould from "$lib/components/website/ThingsYouShould.svelte";
  
  import { onMount } from "svelte";
  import StickyNavbar from "./StickyNavbar.svelte";
  

  let pageData = {
    coverImage: "/images/equityHome-cover.jpg",
    altName: "hero-cover",
    classStyle: "object-cover xl:h-[70svh] 3xl:max-h-[70svh]",
    heroHeading: "Calculate equity in your home",
    heroParagraph: `Unlocking your home’s equity could help open up new opportunities for you and your family.`,
  };

  let subList = [
    {
name: "What is equity?",
targetId: `equity`,
    },
    {
name: "How equity works",
targetId: `works`,
    },
    {
name: "How to build equity",
targetId: `build`,
    },
    {
name: "How to calculate equity",
targetId: `calculate`,
    },
    {
name: "Top up your home loan",
targetId: `top-up`,
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

  let navBarMedium = [
    "What is equity?",
    "How equity works",
    "How to build equity",
    "How to calculate equity",
    "Top up your home loan",
  ];

  let works = {
    heading: `How equity works`,
    subPara: [
`To find out how much equity you have in your home, you may need to get a <a href="" class="underline underline-offset-4 hover:no-underline text-linkColor"> property valuation</a>. You can also make an appointment with one of our Home Lending Specialists to discuss your equity options.`,
`Whether you can borrow additional funds to access the equity in your home will depend on a number of factors, such as your income, living expenses and how much you owe. <a href="/home-loan/lenders-mortgage-insurance" class="underline underline-offset-4 hover:no-underline text-linkColor"> Lenders’ Mortgage Insurance</a> or a <a href="" class="underline underline-offset-4 hover:no-underline text-deActiveLinkColor"> Low Deposit Premium </a> may apply depending on the amount you want to borrow and the property valuation. The circumstances of your loan will also determine whether this may apply.`,
    ],
  };

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
link: "/home-loan/manage-home-loan",
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

  let equity = {
    heading: `What is redraw?`,
    subPara: [
`Equity is the difference between the value of your property and the amount you still owe on your home loan. You can often access and use this equity to improve your lifestyle.`,
`If you’ve paid down some or all of your loan, and/or your home has increased in value, you may be able to use your equity for:`,
    ],
    bottomList: [
`The maintenance of your home`,
`As a deposit for <a href="/home-loan/buying-next-home" class="underline underline-offset-4 hover:no-underline text-linkColor">your next home</a> or an <a href="/home-loan/invest-in-property" class="underline underline-offset-4 hover:no-underline text-linkColor">investment property</a>`,
`To invest in shares or managed funds`,
`To buy a new car or <a href="" class="underline underline-offset-4 hover:no-underline text-deActiveLinkColor">travel</a>.`,
    ],
  };

  let build = {
    heading: `How to build equity in your home`,
    subPara: [`There are a number of ways you can build equity in your home:`],
    bottomList: [
`Increase the value of your property by <a href="/home-loan/renovating-property" class="underline underline-offset-4 hover:no-underline text-linkColor">renovating your home</a>.`,
`Reduce your loan balance by making more regular or larger repayments`,
`Open an <a href="/home-loan/interest-offset" class="underline underline-offset-4 hover:no-underline text-linkColor">Everyday Offset</a>. Any money you put into this account is deducted from your loan balance, meaning you’re only charged interest on the difference. For example, if you have $100,000 in your offset account, and your home loan balance is $300,000, you’ll only pay interest on $200,000 of your loan balance.`,
    ],
  };

  let calcList = [
    {
num: "1",
text: `You have your home valued by your bank at $750,000.`,
    },
    {
num: "2",
text: `Calculate your home equity by subtracting your current loan balance from the total value. For example: If your loan is $400,000, then you have equity of $350,000, as equity is the difference between the market value of your home and the amount you owe.`,
    },
    {
num: "3",
text: `Next, calculate your useable equity. Banks are generally comfortable lending up to 80% of the value of your home, minus the amount you owe to the bank. In our example, 80% of $750,000 is $600,000, so the useable equity is $200,000.`,
    },
    {
num: "4",
text: `You may be able to leverage this equity in your home as a deposit on an investment property.`,
    },
  ];

  let know = {
    heading: "Other important things to know about redraw",
    paraGraph: [
`Uncleared Direct Debit payments, which can take up to 5 days to clear, may be included in your available redraw.`,
`Please note that withdrawing from your available redraw, including transfers to an offset account, may cause your repayment amounts to increase.`,
`If you chose to make Interest Only payments, amortisation of redraw will not occur for the length of the Interest Only term.`,
`If you’re switching your loan, you should consider if the new loan type has a redraw facility. For instance, if you switch from a Standard Variable Rate to a Fixed Rate home loan you will no longer have access to a redraw facility during the fixed-rate period. However, if you make additional repayments during a fixed rate period, or had available redraw when you entered your fixed rate period, the amount available for redraw at the end of the fixed rate period may be lower.`,
`Sometimes your financial circumstances can change in ways you haven’t anticipated or prepared for. If you’re finding it hard to meet home loan repayments, <a href="/contact" class="underline underline-offset-4 hover:no-underline text-linkColor">we can help</a>.`,
    ],
  };

  let thinkKnow = {
    heading: "Things you should know",
    paraGraph: [
`Applications are subject to credit approval. Full terms and conditions will be included in our loan offer. Fees and charges are payable. As this advice has been prepared without considering your objectives, financial situation or needs, you should consider its appropriateness to your circumstances before acting on the advice. `,
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
  <!-- <p>This is new loan page</p>
                <Breadcrumb /> -->
  <!-- {page.url.pathname} -->
  <!-- Create a breadcrumb-style navigation with clickable links -->

  <PageDesign {pageData}>
    <div>
      <div class="hidden lg:block">
        <StickyNavbar navList={subList} {activeSection}>
          <div class="  flex gap-4 pr-4">
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
          <div id="equity" data-section="equity" class="section">
            <div class="border-b border-dividerColor">
              <ThingsYouShould thinkKnow={equity} />
            </div>
          </div>

          <div id="works" data-section="works" class="section">
            <div class="border-b border-dividerColor">
              <ThingsYouShould thinkKnow={works} />
            </div>
            <HomeIntrest
              homeInterest="Book a time with a Home Lending Specialist, instantly"
              btnName="Book now"
              btnColor="#ffcc00"
              btnLink="/appointment"
            />
          </div>

          <div id="build" data-section="build" class="section">
            <div class="border-b border-dividerColor">
              <ThingsYouShould thinkKnow={build} />
            </div>
          </div>

          <div id="calculate" data-section="calculate" class="section">
            <div
              class="flex flex-col gap-[2rem] lg:gap-[1rem] lg:grid lg:grid-cols-5 py-[2rem] border-b border-borderColor"
            >
              <h2
                class="font-ThirdHead text-mobSubHead col-span-2 md:text-miniHeadFont lg:text-minHeadFont"
              >
              How to calculate equity
              </h2>

              <div class="col-span-3">
                <p class="font-Paragraph text-subParaFont pb-[1rem]">
                    Equity calculation example:
                </p>
                {#each calcList as list}
                  <div class="flex flex-col pb-[1rem] gap-4">
                    <div class="grid grid-cols-10 gap-2">
                      <span
                        class=" col-span-1 flex items-center justify-center text-white bg-darkColor rounded-full w-[2rem] h-[2rem]"
                        >{list.num}</span
                      >
                      <p class="col-span-9 font-Paragraph text-subParaFont">
                        {list.text}
                      </p>
                    </div>
                  </div>
                {/each}
              </div>
            </div>
          </div>

          <div id="know" data-section="know" class="section">
           
          </div>
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
              class="col-span-3 list-none px-[2.5rem] py-[1.5rem]"
              onclick={(e) => toggleDropdown(e, index)}
            >
              <div
                class="mx-auto flex w-full items-center justify-between gap-4"
              >
                <h2 class="text-navFont leading-6">{list}</h2>
                <div class="icon-container justify-self-end text-mobSubHead">
                  <span><i class="fa-solid fa-angle-down faq-icon"></i></span>
                </div>
              </div>
            </summary>

            {#if index == 0}
              <div id="equity" class="bg-white text-black px-[2rem]">
                <ThingsYouShould thinkKnow={equity} />
              </div>
            {:else if index == 1}
              <div id="works" class="bg-white text-black px-[2rem]">
                <ThingsYouShould thinkKnow={works} />
                <HomeIntrest
                  homeInterest="Book a time with a Home Lending Specialist, instantly"
                  btnName="Book now"
                  btnColor="#ffcc00"
                  btnLink="/appointment"
                />
              </div>
            {:else if index == 2}
              <div id="build" class="bg-white text-black px-[2rem]">
                <ThingsYouShould thinkKnow={build} />
              </div>
            {:else if index == 3}
              <div id="calculate" class="bg-white text-black px-[2rem]">
                <div
              class="flex flex-col gap-[2rem] py-[2rem] border-b border-borderColor"
            >
              <h2
                class="font-ThirdHead text-mobSubHead col-span-2 md:text-miniHeadFont lg:text-minHeadFont"
              >
              How to calculate equity
              </h2>

              <div class="col-span-3">
                <p class="font-Paragraph text-subParaFont pb-[1rem]">
                    Equity calculation example:
                </p>
                {#each calcList as list}
                  <div class="flex flex-col pb-[1rem] gap-4">
                    <div class="grid grid-cols-8 xs:grid-cols-10 gap-6 xs:gap-4">
                      <span
                        class="col-span-1 xs:col-span-1 flex items-center justify-center text-white bg-darkColor rounded-full w-[2rem] h-[2rem]"
                        >{list.num}</span
                      >
                      <p class="col-span-7 xs:col-span-9 font-Paragraph text-subParaFont">
                        {list.text}
                      </p>
                    </div>
                  </div>
                {/each}
              </div>
            </div>
              </div>
            {:else if index == 4}
              <div id="know" class="bg-white text-black px-[2rem]">
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
      <WeAreHereHelp {help} heading="We're here to help" />
      <ThingsYouShould {thinkKnow} />
    </div>
  </PageDesign>
</section>
