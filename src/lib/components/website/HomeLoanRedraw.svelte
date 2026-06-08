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
  import gsap from "gsap";
  import { onMount } from "svelte";
  import StickyNavbar from "./StickyNavbar.svelte";
  import WhyChoose from "$lib/components/website/WhyChoose.svelte";
  import NewHome from "./NewHome.svelte";
  import Support from "./Support.svelte";

  let pageData = {
    coverImage: "/images/homeLoanRedraw-cover.jpg",
    altName: "hero-cover",
    classStyle: "object-cover xl:h-[120svh] 3xl:max-h-[100svh]",
    heroHeading: "Home loan redraw",
    heroParagraph: `Ahead on your home loan repayments? You may be able to access those additional funds for other events or opportunities.`,
  };

  let subList = [
    {
name: "What is redraw?",
targetId: `redraw`,
    },
    {
name: "Benefits of redraw",
targetId: `benefits`,
    },
    {
name: "Accessing redraw",
targetId: `accessing`,
    },
    {
name: "How redraw works",
targetId: `how`,
    },
    {
name: "Redraw vs offset",
targetId: `offset`,
    },
    {
name: "Other important things to know",
targetId: `know`,
    },
  ];

  let navList = [
    {
actionBtn: [
{
firstBtn: "Log on to NetBank",
link: "",
btnColor: "#ffcc00",
},
],
    },
  ];

  let navBarMedium = [
    "What is redraw?",
    "Benefits of redraw",
    "Accessing redraw",
    "How redraw works",
    "Redraw vs offset",
    "Other important things to know",
  ];

  let benefits = [
    {
heading: "Less interest",
para: `Any money available in your redraw – whether its $10 or $10,000 – reduces the balance owing on your home loan. This means you’ll be paying less interest on your home loan. `,
    },
    {
heading: "Flexibility in managing your available redraw",
para: `You can make additional one-off lump sum repayments or regularly pay more than your minimum required repayment. This may reduce the time it takes you to pay off your home loan and build up the redraw balance you have available to withdraw later.`,
subPara: [
`Remember, if you choose to withdraw money from your available redraw, your home loan balance, repayments and the time it takes to pay off your loan will increase. `,
],
    },
    {
heading: "Repayment holiday",
para: `Having redraw may also give you the opportunity to take a break (repayment holiday) from upcoming scheduled repayments. You may be able to use the additional repayments you’ve made to put future repayments on hold for a period of time (from three to up to 12 months), giving you the control to use your money when it’s needed the most.`,
subPara: [
`To apply for a repayment holiday from your existing Digital DSA home loan, you can <a href="/contact" class="underline underline-offset-4 hover:no-underline text-linkColor">contact us</a> or visit your nearest branch.`,
],
    },
  ];

  let works = [
    {
heading: "How does redraw become available?",
para: `When you take out a home loan, you agree to make your minimum required repayment every week, fortnight or month over the life of your loan. Should you choose to make additional payments over and above what is required, this becomes ‘Available Redraw’. For weekly and fortnightly direct debit payers, only funds over and above the minimum required repayments will be available. You can check your available redraw balance for your eligible Digital DSA home loan in NetBank or the Digital DSA app.`,
    },
    {
linkName: "Tell me more about repayments",
link: "",
heading:
"Why is there a difference between my total redraw account balance and the available redraw balance?",
para: `The total redraw balance shows the amount you’re ahead on your loan, which increases as you make additional repayments. This will include any repayments made towards your next monthly minimum repayment, uncleared cheques and pending redraw adjustments. `,
subPara: [
`For weekly and fortnightly direct debit payers, the available redraw balance will not include payments made towards your next monthly minimum repayment. The available redraw balance will not include uncleared cheques and may have been adjusted on your monthly repayment date.`,
],
    },
    {
heading: "How redraw works over the life of a loan",
para: `The available redraw on your home loan may reduce so that by the end of your agreed loan term, both your loan balance and the available redraw will be zero. Adjustments to your available redraw will occur on your monthly repayment date to help manage this. `,
subPara: [
`The rate at which your redraw balance will reduce depends on a number of factors and is different for every customer.`,
`To see an example of what this looks like, and for more information on how redraw works please refer to our <a href="/contact" class="underline underline-offset-4 hover:no-underline text-linkColor">Redraw guide</a>.`,
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

  let redraw = {
    heading: `What is redraw?`,
    subPara: [
`A redraw facility allows you to access additional payments that you've made on your home loan. For weekly and fortnightly direct debit payers, only funds over and above the minimum required repayments will be available.`,
`Redraw is available on most <a href="/home-loan/variable-rates" class="underline underline-offset-4 hover:no-underline text-linkColor">Digital DSA variable rate home loans</a>, and there are no fees to redraw.`,
    ],
  };

  let access = {
    heading: `Do I have access to redraw?`,
    btnName: "See redraw in NetBank",
    btnBorder: "#706d6e",
    btnLink: "",
    subPara: [
`Redraw is available on most Digital DSA variable rate home loans, and there are no fees to redraw. You should have access to redraw unless your home loan is one of the following products:`,
    ],

    bottomList: [
`Fixed Rate home loans`,
`Economiser Interest Only home loans`,
`3 Year Economiser Interest Only home loans`,
`Where there is a second or subsequent mortgage to another financial institution.`,
    ],

    bottomPara: [
`If you're switching your home loan, you should consider if the new loan type has a redraw facility. For example, if you switch from a Standard Variable Rate home loan to a Fixed Rate home loan you'll lose access to a redraw facility during the fixed rate period.`,
`You can find out how much you have available for redraw at any time in NetBank under your home loan account’s ‘Available funds’ and in the Digital DSA app.`,
    ],
  };

  let offset = {
    heading: `Redraw vs offset`,
    subHeading:
"What's the difference between a redraw facility and an offset account?",
    linkName: "Tell me more about redraw vs offset",
    linkrl: "",
    subPara: [
`Redraw allows you to access additional payments that you've made on your home loan. For weekly and fortnightly direct debit payers, only funds over and above the minimum required repayments will be available. The money in your redraw account may reduce over the life of your loan so that, by the end of your agreed loan term, both your loan balance and the available redraw will be zero.`,
`A Digital DSA <a href="/home-loan/interest-offset" class="underline underline-offset-4 hover:no-underline text-linkColor">Everyday Offset</a> is a separate account linked to your eligible <a href="/contact" class="underline underline-offset-4 hover:no-underline text-linkColor">Standard Variable Rate home loan</a> or <a href="/contact" class="underline underline-offset-4 hover:no-underline text-linkColor">Investment home loan</a>, while redraw is a feature available on some eligible variable rate home loans. Both can help:`,
    ],

    bottomList: [
`reduce the amount of interest you pay on your home loan`,
`pay off your home loan sooner`,
    ],

    bottomPara: [
`If you’re currently using a redraw facility to deposit money that you plan on using later, an Everyday Offset may be more suitable if you plan on using the money more regularly.`,
    ],
  };

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
          <div id="redraw" data-section="redraw" class="section">
            <div class="border-b border-dividerColor">
              <ThingsYouShould thinkKnow={redraw} />
            </div>
          </div>

          <div
            id="benefits"
            data-section="benefits"
            class="pt-[2rem] lg:pt-[4rem] flex flex-col gap-2 section"
          >
            <h2
              class="md:text-start font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont"
            >
              Benefits of redraw
            </h2>
            <div
              class="grid md:grid-cols-2 lg:grid-cols-3 gap-4 border-b border-borderColor"
            >
              {#each benefits as cardData (cardData.heading)}
                <ThreeCard {cardData} />
              {/each}
            </div>
          </div>

          <div id="access" data-section="access" class="section">
            <div class="border-b border-dividerColor">
              <ThingsYouShould thinkKnow={access} />
            </div>
          </div>

          <div
            id="works"
            data-section="works"
            class="pt-[2rem] lg:pt-[4rem] flex flex-col gap-2 section"
          >
            <h2
              class="md:text-start font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont"
            >
              How redraw works
            </h2>
            <div
              class="grid md:grid-cols-2 lg:grid-cols-3 gap-4 border-b border-borderColor"
            >
              {#each works as cardData (cardData.heading)}
                <ThreeCard {cardData} />
              {/each}
            </div>
          </div>

          <div id="offset" data-section="offset" class="section">
            <div class="border-b border-dividerColor">
              <ThingsYouShould thinkKnow={offset} />
            </div>
          </div>

          <div id="know" data-section="know" class="section">
            <div class="border-b border-dividerColor">
              <ThingsYouShould thinkKnow={know} disc="list-disc" />
            </div>
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
              <div id="redraw" class="bg-white text-black px-[2rem]">
                <ThingsYouShould thinkKnow={redraw} />
              </div>
            {:else if index == 1}
              <div id="benefits" class="bg-white text-black px-[2rem]">
                <div class="pt-[2rem] lg:pt-[4rem] flex flex-col gap-2">
                  <h2
                    class="md:text-start font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont"
                  >
                    Benefits of redraw
                  </h2>
                  <div
                    class="grid md:grid-cols-2 lg:grid-cols-3 gap-4 border-b border-borderColor"
                  >
                    {#each benefits as cardData (cardData.heading)}
                      <ThreeCard {cardData} />
                    {/each}
                  </div>
                </div>
              </div>
            {:else if index == 2}
              <div id="access" class="bg-white text-black px-[2rem]">
                <ThingsYouShould thinkKnow={access} />
              </div>
            {:else if index == 3}
              <div id="works" class="bg-white text-black px-[2rem]">
                <div class="pt-[2rem] lg:pt-[4rem] flex flex-col gap-2">
                  <h2
                    class="md:text-start font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont"
                  >
                    How redraw works
                  </h2>
                  <div
                    class="grid md:grid-cols-2 lg:grid-cols-3 gap-4 border-b border-borderColor"
                  >
                    {#each works as cardData (cardData.heading)}
                      <ThreeCard {cardData} />
                    {/each}
                  </div>
                </div>
              </div>
            {:else if index == 4}
              <div id="offset" class="bg-white text-black px-[2rem]">
                <ThingsYouShould thinkKnow={offset} />
              </div>
            {:else if index == 5}
              <div id="know" class="bg-white text-black px-[2rem]">
                <ThingsYouShould thinkKnow={know} disc="list-disc" />
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
