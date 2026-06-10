<script>
	let {
		data
	} = $props();




  import PageDesign from "./PageDesign.svelte";
  import Button from "./Button.svelte";
  import NewHome from "./NewHome.svelte";
  import TwoColumn from "./TwoColumn.svelte";
  import WeAreHereHelp from "$lib/components/website/WeAreHereHelp.svelte";
  import gsap from "gsap";

  let pageData = {
    coverImage: "/images/home-cover.jpg",
    altName: "hero-cover",
    classStyle: "object-cover xl:h-[90svh] 3xl:max-h-[70svh]",
    heroHeading: "Manage your home loan",
    heroParagraph: `Already have a home loan with Digital DSA? It’s never been easier to manage your home loan in a way that suits you.`,
  };

  let navList = [
    {
listName: "Repayment & redraw",
url: `#repayment`,
    },
    {
listName: "Everyday Offset",
url: `#offset`,
    },
    {
listName: "Flexible options & tools",
url: `#tools`,
    },
    {
listName: "Features & benefits",
url: `#benefits`,
    },
    {
listName: "Equity & selling",
url: `#equity`,
    },
    {
listName: "Tools & support",
url: `#support`,
    },
    {
actionBtn: [
{
firstBtn: "Manage in Digital DSA",
link: "",
btnColor: "#ffcc00",
},
],
    },
  ];

  let navBarMedium = [
    "Repayment & redraw",
    "Everyday Offset",
    "Flexible options & tools",
    "Features & benefits",
    "Equity & selling",
    "Tools & support",
  ];

  let help = [
    {
Heading: "Book an appointment",
paragraph: `Book instantly to speak to a home loan specialist at a time that suits you`,
icon: "/icons/appointment.svg",
altTitle: "icons",
    },
    {
Heading: "Manage your loan online",
paragraph: `Book instantly to speak to a home loan specialist at a time that suits you`,
icon: "/icons/manageLoan2.svg",
altTitle: "icons",
    },
    {
Heading: "Contact us",
paragraph: `Book instantly to speak to a home loan specialist at a time that suits you`,
icon: "/icons/contact.svg",
altTitle: "icons",
    },
    {
Heading: "Message us",
paragraph: `Book instantly to speak to a home loan specialist at a time that suits you`,
icon: "/icons/msg.svg",
altTitle: "icons",
    },
  ];

  let repayment = [
    {
data1: [
{
heading: `Changing your repayment`,
para: `Stay in control of your home loan repayment.`,
listHeading: `In NetBank you can:`,
listText: [
`Change your repayment amount, frequency and date`,
`Change the account you make repayments from`,
`Cancel your direct debit arrangement`,
],
link: `Tell me more`,
url: "",
},
],
data2: [
{
heading: `Redrawing extra repayments`,
para: `We’ll guide you through the application process so you can choose an investment home loan that’s right for you, know how much you can afford to borrow and set a budget.`,
link: `Tell me more`,
url: "",
},
],
data3: [
{
heading: `Understanding your statements`,
para: `Get a step-by-step guide to understanding your home loan statement and learn how to get your statement online.`,
link: `Show me more about statements`,
url: "",
},
],
    },
  ];

  let offset = {
    data: [
{
id: 1,
desc: `Offset the money in your linked Everyday Offset accounts against the balance of your eligible home loan, to reduce the balance on which we charge interest and pay off your loan sooner.`,
linkName: "Tell me about interest offset accounts",
url: "/",
btnName: "Manage my offset",
btnLink: "/",
},
    ],
  };

  let tools = [
    {
heading: "Flexible options & tools",
data: [
{
id: 1,
title: "Increase your home loan (top up)",
desc: `If you’re planning renovations, want to consolidate your debts or simply need extra cash, borrowing additional funds with your existing home loan could be the solution.`,
link: "Tell me more about topping up my home loan",
},
{
id: 2,
title: "Switch, refix or split your home loan",
desc: `If you need to change your home loan or repayment type to better meet your needs, we’re here to help.`,
link: "Tell me more about switching, refixing or splitting",
},
{
id: 3,
title: "Track your equity with Home Hub in the Digital DSA app",
desc: `View track and manage your properties all in one place in the Home Hub within the Digital DSA app.`,
link: "Discover Home Hub",
},
{
id: 4,
title:
"Get personalised property insights with Digital DSA My Property",
desc: `The Digital DSA My Property experience in NetBank and the Digital DSA app provides personalised property insights that change dynamically over time, allowing you to track and manage your property portfolio, explore your options and plan for the future.`,
link: "Discover Digital DSA My Property",
},
],
    },
  ];

  let benefits = [
    {
heading: `Digital DSA Yello`,
para: `undefined Yello is our customer recognition program, designed to shine the spotlight on you. Get access to bright and shiny benefits like cashbacks, discounts and prize draws.`,
link: `Tell me more about Digital DSA Yello`,
url: "",
    },
    {
heading: `Exclusive offers`,
para: `As a undefined customer, you can benefit from exclusive offers including fast contract reviews with Home-in and additional nbn® and mobile savings with More.`,
link: `Discover more Exclusive offers`,
url: "",
    },
    {
heading: `Wealth Package`,
para: `Enjoy discounts on eligible loans and credit cards.`,
link: `See your Wealth Package benefits`,
url: "",
    },
    {
heading: `undefined Green Loan`,
para: `The undefined Green Loan is a 10-year secured fixed rate loan designed for existing, eligible home loan customers to buy and install clean energy products such as solar panels, battery packs and solar hot water systems.`,
link: `Read more about undefined Green Loan`,
url: "",
    },
  ];

  let equity = [
    {
heading: "Equity & selling",
data: [
{
id: 1,
title: "Building & using equity",
desc: `To build the equity in your home sooner or increase the value of your property, make extra repayments or open an interest-offset account. You may already have the flexibility to use the existing equity in your home to renovate, invest or purchase your next property?`,
link: "Show me how to use equity",
},
{
id: 2,
title: "Selling a property",
desc: `Take control of your home selling journey with our expert advice and helpful resources. We're here to support you every step of the way. `,
link: "Tell me more about selling a property",
},
],
    },
  ];

  let sideBarMore = [
    {
icon: "/images/guide1.jpg",
altName: "icon-name",
title: "Invest in property",
    },

    {
icon: "/images/guide2.jpg",
altName: "icon-name",
title: "Goig on parental leave?",
    },
    {
icon: "/images/guide3.jpg",
altName: "icon-name",
title: "Buying your next property",
    },
  ];

  let support = {
    heading: "Calculators & tools",
    btnName: `Show me more`,
    url: "/",
    items: [
{
id: 1,
title: "Choose a loan that’s right for you",
link: "https://example.com",
},
{
id: 2,
title: "Home loan repayments calculator",
link: "https://example.com",
},
    ],
  };

  let loanSupport = {
    data: [
{
id: 1,
desc: `See what options are available to home loan customers needing financial assistance.`,
linkName: "More on home loan support",
url: "/",
},
{
id: 2,
heading: `Making your home loan work for you`,
desc: `Our home buying guide contains handy information on how to manage your home loan, even when your circumstances changes.`,
linkName: "Read buying guide (PDF)",
url: "/",
},
    ],
  };

  // Function to handle opening and closing of details
  // Toggle dropdown with animation
  const toggleDropdown = (event, index) => {
    const summaryElement = event.currentTarget;
    const icon = summaryElement.querySelector(".faq-icon");
    const detailsElement = summaryElement.parentElement;

    // Close all other dropdowns
    const allDetails = document.querySelectorAll(".dropdown");
    allDetails.forEach((otherDetails, idx) => {
if (idx !== index && otherDetails.open) {
otherDetails.open = false; // Close it
const otherIcon = otherDetails.querySelector(".faq-icon");
if (otherIcon) {
gsap.to(otherIcon, {
rotation: 0, // Reset rotation for the closed item
duration: 0.1,
ease: "power2.out",
});
otherIcon.classList.remove("fa-angle-down");
otherIcon.classList.add("fa-angle-top");
}
}
    });
    // <i class="fa-solid fa-angle-down"></i>

    // Handle the clicked dropdown
    const isOpen = detailsElement.open;
    gsap.to(icon, {
rotation: isOpen ? 0 : 180,
duration: 0.1,
ease: "power2.out",
    });

    // Toggle icon classes
    if (isOpen) {
icon.classList.remove("fa-angle-down");
icon.classList.add("fa-angle-down");
    } else {
icon.classList.remove("fa-angle-top");
icon.classList.add("fa-angle-down");
    }
  };
</script>

<section>
  <!-- <p>This is new loan page</p>
    <Breadcrumb /> -->
  <!-- {page.url.pathname} -->
  <!-- Create a breadcrumb-style navigation with clickable links -->

  <PageDesign {pageData}>
    <div>
      <div
        class="border flex justify-between items-center p-[2rem] font-semibold typography-body-md gap-[2rem]"
      >
        <ul class="hidden lg:flex gap-[3rem]">
          {#each navList.slice(0, -1) as list}
            <!-- Exclude the last item -->
            <!-- <div class="flex"> -->

            <li>
              <a href={list.url}>{list.listName}</a>
            </li>

            <!-- </div> -->
          {/each}
        </ul>
        <div class="flex sm:flex-row flex-col sm:w-auto w-full gap-4 pr-4">
          {#each [navList[navList.length - 1]] as lastItem}
            {#if lastItem.actionBtn}
              {#each lastItem.actionBtn as action}
                <div class="">
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
      </div>
      <div class="">
        <div class="hidden lg:block px-[2rem] lg:px-[4rem]">
          <div id="repayment">
            <div class="py-[4rem] border-b border-borderColor">
              <h2
                class="mb-[3rem] md:text-start typography-h2 text-text-main"
              >
                Repayment & redraw
              </h2>
              {#each repayment as steps}
                <div class="grid grid-cols-3 justify-between gap-4">
                  {#each steps.data1 as data1}
                    <div class="flex flex-col gap-[1.5rem]">
                      <h3 class="typography-h3 font-semibold text-text-main">
                        {data1.heading}
                      </h3>
                      <p class="typography-body-sm text-text-light">
                        {data1.para}
                      </p>
                      <div>
                        <p class="mb-2 typography-body-md text-text-light">
                          {data1.listHeading}
                        </p>
                        <ul class="list-disc pl-4 flex flex-col gap-2">
                          {#each data1.listText as list}
                            <li>{list}</li>
                          {/each}
                        </ul>
                      </div>
                      <a
                        href={data1.url}
                        class="typography-body-md text-text-light text-linkColor underline"
                        >{data1.link}</a
                      >
                      <div>
                        <Button
                          link="/"
                          btnName="Change in Dgital DSA"
                          btnBorder="#4F4C4D"
                        />
                      </div>
                    </div>
                  {/each}
                  {#each steps.data2 as data2}
                    <div class="flex flex-col gap-[1.5rem]">
                      <h3 class="typography-h3 font-semibold text-text-main">
                        {data2.heading}
                      </h3>
                      <p class="typography-body-sm text-text-light">
                        {data2.para}
                      </p>
                      <a
                        href={data2.url}
                        class="typography-body-md text-text-light text-linkColor underline"
                        >{data2.link}</a
                      >
                      <div>
                        <Button
                          link="/"
                          btnName="Redraw in Digital DSA"
                          btnBorder="#4F4C4D"
                        />
                      </div>
                    </div>
                  {/each}
                  {#each steps.data3 as data3}
                    <div class="flex flex-col gap-[1.5rem]">
                      <h3 class="typography-h3 font-semibold text-text-main">
                        {data3.heading}
                      </h3>
                      <p class="typography-body-sm text-text-light">
                        {data3.para}
                      </p>
                      <a
                        href={data3.url}
                        class="typography-body-md text-text-light text-linkColor underline"
                        >{data3.link}</a
                      >
                    </div>
                  {/each}
                </div>
              {/each}
            </div>
          </div>

          <div
            id="offset"
            class="border-b border-borderColor py-[4rem] grid grid-cols-3 justify-between gap-[4rem]"
          >
            <h2
              class="typography-h3 font-semibold md:typography-h2-md lg:col-span-1 lg:typography-h2"
            >
              Everyday Offset
            </h2>
            {#each offset.data as data}
              <div class="col-span-2 grid gap-4">
                <p class="typography-body-sm text-text-light">{data.desc}</p>
                <a
                  href={data.url}
                  class="typography-body-md text-text-light text-linkColor underline"
                  >{data.linkName}</a
                >
                <div>
                  <Button
                    btnName={data.btnName}
                    btnBorder="#4F4C4D"
                    link={data.btnLink}
                  />
                </div>
              </div>
            {/each}
          </div>

          <div id="tools">
            {#each tools as steps}
              <div class="">
                <NewHome {steps} />
              </div>
            {/each}
          </div>

          <div id="benefits">
            <div class="py-[4rem] border-b border-borderColor">
              <h2
                class="mb-[3rem] md:text-start typography-h2 text-text-main"
              >
                Features & benefits
              </h2>
              <div class="grid grid-cols-4 justify-between gap-4">
                {#each benefits as data}
                  <div class="flex flex-col gap-[1.5rem]">
                    <h3 class="typography-h3 font-semibold text-text-main">
                      {data.heading}
                    </h3>
                    <p class="typography-body-sm text-text-light">
                      {data.para}
                    </p>
                    <a
                      href={data.url}
                      class="typography-body-md text-text-light text-linkColor underline"
                      >{data.link}</a
                    >
                  </div>
                {/each}
              </div>
            </div>
          </div>

          <div id="equity">
            {#each equity as steps}
              <div class="">
                <NewHome {steps} />
              </div>
            {/each}
          </div>

          <div id="support">
            <div
              class="flex flex-col gap-[3rem] border-b border-borderColor py-[2rem] lg:gap-[3rem] lg:py-[4rem]"
            >
              <h2
                class="md:text-start typography-h2 text-text-main"
              >
                Tools & support
              </h2>
              <div class="grid grid-cols-3 gap-[2rem]">
                <div
                  class="flex flex-col gap-[2rem] p-4 justify-center border border-dividerColor"
                >
                  <h3 class="typography-h3 font-semibold text-text-main">
                    {support.heading}
                  </h3>
                  <ul class="list-disc pl-4 flex flex-col gap-2">
                    {#each support.items as item}
                      <li>
                        <a
                          href={item.link}
                          class="typography-body-md text-text-light underline underline-offset-4 hover:no-underline text-linkColor"
                          >{item.title}</a
                        >
                      </li>
                    {/each}
                  </ul>
                  <a
                    href={support.url}
                    class="typography-body-md text-text-light text-linkColor"
                    >{support.btnName}</a
                  >
                </div>
                <div
                  class="flex flex-col gap-[2rem] p-4 justify-center border border-dividerColor"
                >
                  <h3 class="typography-h3 font-semibold text-text-main">
                    How is interest calculated on my home loan?
                  </h3>
                  <a
                    href="/"
                    class="typography-body-md text-text-light text-linkColor"
                    >Tell me more</a
                  >
                </div>
                <div class="space-y-6">
                  {#each sideBarMore as side, index}
                    <div
                      class="grid grid-cols-[30%_70%] border border-dividerColor hover:shadow-[0px_5px_15px_rgba(30,30,30,.25)] shadow-lg"
                    >
                      <div>
                        <img
                          src={side.icon}
                          alt={side.altName}
                          class="aspect-square h-[6rem] object-cover"
                        />
                      </div>
                      <div class="content-center p-2">
                        <h4 class="typography-body-md typography-h3 font-semibold">
                          {side.title}
                        </h4>
                      </div>
                    </div>
                  {/each}
                </div>
              </div>
            </div>

            <TwoColumn
              cardImage="/images/home-buying-hub.jpg"
              cardAltName="housing-figure"
              cardHeading="Pay off your home loan sooner"
              reverse
            >
              <ul
                class="grid gap-[2rem] typography-body-md text-text-light"
                slot="list"
              >
                <li>Making small changes now can save you time and money.</li>
              </ul>
            </TwoColumn>

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
                  Get instant help from  the Digital DSA app or connect
                  with a specialist who can message you back. You’ll need
                  Digital DSA app notifications turned on so you know when
                  you’ve received a reply.
                </li>

                <div class="w-auto">
                  <Button link="" btnBorder="#4F4C4D" btnName="Message us" />
                </div>
              </ul>
            </TwoColumn>

            <div
              class="grid grid-cols-3 justify-between gap-[4rem] py-[1.5rem] lg:py-[3rem]"
            >
              <h2
                class="typography-h3 font-semibold md:typography-h2-md lg:col-span-1 lg:typography-h2"
              >
                Home loan support
              </h2>
              <div class="col-span-2 grid gap-[4rem]">
                {#each loanSupport.data as data}
                  <div class="grid gap-4">
                    {#if data.heading}
                      <h3 class="typography-h3 font-semibold text-text-main">
                        {data.heading}
                      </h3>
                    {/if}
                    <p class="typography-body-sm text-text-light">{data.desc}</p>
                    <a
                      href={data.url}
                      class="typography-body-md text-text-light text-linkColor underline"
                      >{data.linkName}</a
                    >
                  </div>
                {/each}
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

              {#if index === 0}
                <div
                  id="repayment"
                  class="bg-white text-black p-4 md:px-[2rem] md:py-[1rem]"
                >
                  <div
                    class="py-[4rem] border-0"
                  >
                    <h2
                      class="mb-[3rem] md:text-start typography-h2 text-text-main"
                    >
                      Repayment & redraw
                    </h2>
                    {#each repayment as steps}
                      <div class="grid md:grid-cols-3 justify-between md:gap-4 gap-[4rem]">
                        {#each steps.data1 as data1}
                          <div class="flex flex-col gap-[1.5rem]">
                            <h3 class="typography-h3 font-semibold text-text-main">
                              {data1.heading}
                            </h3>
                            <p class="typography-body-sm text-text-light">
                              {data1.para}
                            </p>
                            <div>
                              <p class="mb-2 typography-body-md text-text-light">
                                {data1.listHeading}
                              </p>
                              <ul class="list-disc pl-4 flex flex-col gap-2">
                                {#each data1.listText as list}
                                  <li>{list}</li>
                                {/each}
                              </ul>
                            </div>
                            <a
                              href={data1.url}
                              class="typography-body-md text-text-light text-linkColor underline"
                              >{data1.link}</a
                            >
                            <div>
                              <Button
                                link="/"
                                btnName="Change in Dgital DSA"
                                btnBorder="#4F4C4D"
                              />
                            </div>
                          </div>
                        {/each}
                        {#each steps.data2 as data2}
                          <div class="flex flex-col gap-[1.5rem]">
                            <h3 class="typography-h3 font-semibold text-text-main">
                              {data2.heading}
                            </h3>
                            <p class="typography-body-sm text-text-light">
                              {data2.para}
                            </p>
                            <a
                              href={data2.url}
                              class="typography-body-md text-text-light text-linkColor underline"
                              >{data2.link}</a
                            >
                            <div>
                              <Button
                                link="/"
                                btnName="Redraw in Digital DSA"
                                btnBorder="#4F4C4D"
                              />
                            </div>
                          </div>
                        {/each}
                        {#each steps.data3 as data3}
                          <div class="flex flex-col gap-[1.5rem]">
                            <h3 class="typography-h3 font-semibold text-text-main">
                              {data3.heading}
                            </h3>
                            <p class="typography-body-sm text-text-light">
                              {data3.para}
                            </p>
                            <a
                              href={data3.url}
                              class="typography-body-md text-text-light text-linkColor underline"
                              >{data3.link}</a
                            >
                          </div>
                        {/each}
                      </div>
                    {/each}
                  </div>
                </div>
              {:else if index == 1}
                <div class="bg-white text-black p-4 md:px-[2rem] md:py-[1rem]">
                  <div
                    id="offset"
                    class="py-[4rem] grid lg:grid-cols-3 justify-between gap-[3rem]"
                  >
                    <h2
                      class="typography-h3 font-semibold md:typography-h2-md lg:col-span-1 lg:typography-h2"
                    >
                      Everyday Offset
                    </h2>
                    {#each offset.data as data}
                      <div class="lg:col-span-2 grid gap-[1.5rem]">
                        <p class="typography-body-sm text-text-light">
                          {data.desc}
                        </p>
                        <a
                          href={data.url}
                          class="typography-body-md text-text-light text-linkColor underline"
                          >{data.linkName}</a
                        >
                        <div>
                          <Button
                            btnName={data.btnName}
                            btnBorder="#4F4C4D"
                            link={data.btnLink}
                          />
                        </div>
                      </div>
                    {/each}
                  </div>
                </div>
              {:else if index == 2}
                <div id="tools" class="bg-white text-black p-4 md:px-[2rem] md:py-[1rem]">
                  {#each tools as steps}
                    <div class="">
                      <NewHome {steps} />
                    </div>
                  {/each}
                </div>
              {:else if index == 3}
                <div
                  id="benefits"
                  class="bg-white text-black md:px-[2rem] p-4 md:py-[1rem]"
                >
                  <div
                    class="py-[4rem]"
                  >
                    <h2
                      class="mb-[3rem] md:text-start typography-h2 text-text-main"
                    >
                      Features & benefits
                    </h2>
                    <div class="grid md:grid-cols-2 justify-between gap-[3rem]">
                      {#each benefits as data}
                        <div class="flex flex-col gap-4">
                          <h3 class="typography-h3 font-semibold text-text-main">
                            {data.heading}
                          </h3>
                          <p class="typography-body-sm text-text-light">
                            {data.para}
                          </p>
                          <a
                            href={data.url}
                            class="typography-body-md text-text-light text-linkColor underline"
                            >{data.link}</a
                          >
                        </div>
                      {/each}
                    </div>
                  </div>
                </div>
              {:else if index == 4}
                <div
                  id="equity"
                  class="bg-white text-black md:px-[2rem] p-4 md:py-[1rem]"
                >
                  {#each equity as steps}
                    <div class="">
                      <NewHome {steps} />
                    </div>
                  {/each}
                </div>
              {:else if index == 5}
                <div
                  id="support"
                  class="bg-white text-black md:px-[2rem] p-4 md:py-[1rem]"
                >
                  <div
                    class="flex flex-col gap-[3rem] py-[2rem] lg:gap-[3rem] lg:py-[4rem]"
                  >
                    <h2
                      class="md:text-start typography-h2 text-text-main"
                    >
                      Tools & support
                    </h2>
                    <div class="grid md:grid-cols-2 gap-[2rem]">
                      <div
                        class="flex flex-col gap-[2rem] p-4 justify-center border border-dividerColor"
                      >
                        <h3 class="typography-h3 font-semibold text-text-main">
                          {support.heading}
                        </h3>
                        <ul class="list-disc pl-4 flex flex-col gap-2">
                          {#each support.items as item}
                            <li>
                              <a
                                href={item.link}
                                class="typography-body-md text-text-light underline underline-offset-4 hover:no-underline text-linkColor"
                                >{item.title}</a
                              >
                            </li>
                          {/each}
                        </ul>
                        <a
                          href={support.url}
                          class="typography-body-md text-text-light text-linkColor"
                          >{support.btnName}</a
                        >
                      </div>
                      <div
                        class="flex flex-col gap-[2rem] p-4 justify-center border border-dividerColor"
                      >
                        <h3 class="typography-h3 font-semibold text-text-main">
                          How is interest calculated on my home loan?
                        </h3>
                        <a
                          href="/"
                          class="typography-body-md text-text-light text-linkColor"
                          >Tell me more</a
                        >
                      </div>
                      <div class="space-y-6">
                        {#each sideBarMore as side, index}
                          <div
                            class="grid md:grid-cols-[15%_85%] grid-cols-[20%_80%] justify-start border border-dividerColor hover:shadow-[0px_5px_15px_rgba(30,30,30,.25)] shadow-lg"
                          >
                            <div>
                              <img
                                src={side.icon}
                                alt={side.altName}
                                class="aspect-square h-[6rem] object-cover"
                              />
                            </div>
                            <div class="content-center p-2">
                              <h4 class="typography-body-md typography-h3 font-semibold">
                                {side.title}
                              </h4>
                            </div>
                          </div>
                        {/each}
                      </div>
                    </div>
                  </div>

                  <TwoColumn
                    cardImage="/images/home-buying-hub.jpg"
                    cardAltName="housing-figure"
                    cardHeading="Pay off your home loan sooner"
                    reverse
                  >
                    <ul
                      class="grid gap-[2rem] typography-body-md text-text-light"
                      slot="list"
                    >
                      <li>
                        Making small changes now can save you time and money.
                      </li>
                    </ul>
                  </TwoColumn>

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
                        Get instant help from  the Digital DSA app or
                        connect with a specialist who can message you back.
                        You’ll need Digital DSA app notifications turned on so
                        you know when you’ve received a reply.
                      </li>

                      <div class="w-auto">
                        <Button
                          link=""
                          btnBorder="#4F4C4D"
                          btnName="Message us"
                        />
                      </div>
                    </ul>
                  </TwoColumn>

                  <div
                    class="grid gap-[3rem] py-[1.5rem] lg:py-[3rem]"
                  >
                    <h2
                      class="typography-h3 font-semibold md:typography-h2-md lg:col-span-1 lg:typography-h2"
                    >
                      Home loan support
                    </h2>
                    <div class="grid gap-[2rem]">
                      {#each loanSupport.data as data}
                        <div class="grid gap-2">
                          {#if data.heading}
                            <h3 class="typography-h3 font-semibold text-text-main">
                              {data.heading}
                            </h3>
                          {/if}
                          <p class="typography-body-sm text-text-light">
                            {data.desc}
                          </p>
                          <a
                            href={data.url}
                            class="typography-body-md text-text-light text-linkColor underline"
                            >{data.linkName}</a
                          >
                        </div>
                      {/each}
                    </div>
                  </div>
                </div>
              {/if}
            </details>
          {/each}
        </div>
      </div>
    </div>
    <div slot="secondary" class="p-4 lg:p-0">
      <WeAreHereHelp {help} heading="We're here to help" />
    </div>
  </PageDesign>
</section>
