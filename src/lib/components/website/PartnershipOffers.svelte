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
  import BlogCard from "./BlogCard.svelte";
  import AnchorCounter from "$lib/components/website/AnchorCounter.svelte";

  let pageData = {
    coverImage: "/images/partnershipOffers-cover.jpg",
    altName: "hero-cover",
    classStyle: "object-cover xl:h-[140svh] 3xl:max-h-[100svh]",
    heroHeading: "Putting our customers first",
    heroParagraph: `At undefined, we’re all about delivering more rewarding experiences, better outcomes and greater value for you, our customers. That’s why we’re working with some of the best businesses to make sure you get a good deal. To access these exclusive deals, you’ll need to be a undefined customer.`,
  };

  let subList = [
    {
name: "Current offers",
targetId: `offers`,
    },
    {
name: "Shop till you drop",
targetId: `shop`,
    },
    {
name: "There's no place like home",
targetId: `likeHome`,
    },
    {
name: "Control what matters to you",
targetId: `control`,
    },
    {
name: "Business partnerships",
targetId: `business`,
    },
  ];

  
  let navBarMedium = [
    "Current offers",
    "Shop till you drop",
    "There's no place like home",
    "Control what matters to you",
    "Business partnerships",
  ];

  let offers = [
    {
icon: "/images/partnershipAmber.png",
altName: "amber icon",
title: "Get access to exclusive discounts on Amber energy plans",
paragraph:
"Switch your energy provider and sign up using your undefined credit card, debit card or bank account as your online bill payment method before 30 June 2025.",

linkName: "Tell me about amber",
linkColor: "#1175BC",
url: "/home-loan/get-rewarded",
    },
    {
icon: "/images/homeLoanMoreBlog.png",
altName: "more icon",
title: "Exclusive discounts on More mobile and nbn® plans",
paragraph:
"Sign up using your undefined credit or debit card as your online bill payment method before 30 June 2025 and get $5 off your monthly More mobile plan for 12 months.",

linkName: "Tell me more about More mobile",
linkColor: "#1175BC",
url: "",
    },
    {
icon: "/images/homeIn2.jpg",
altName: "home icon",
title: "Conveyancing & contract reviews",
paragraph:
"Get a contract reviewed in six business hours and your queries answered quickly with Home-in – built to ensure a less stressful, secure, and simpler home buying experience",

linkName: "Get your contract reviewed",
linkColor: "#1175BC",
url: "",
    },
    {
icon: "/images/truyuStandard.jpg",
altName: "truyu icon",
title: "Truyu",
paragraph:
"Truyu is currently offering a three-month free trial` for all new users. After the free trial ends, you can continue to defend your identity for just $4.99 per month",

linkName: "Learn more about Truyu",
linkColor: "#1175BC",
url: "",
    },
  ];

  let shop = [
    {
icon: "/images/partnershipKlarna.png",
altName: "klarna icon",
title: "Klarna",
lists: [
`Shop now and pay later in four instalments`,
`Get early access to special offers from your favourite brands`,
`Create personalised wish lists, get price drop alerts and manage your orders with the Klarna app `,
],
    },
  ];

  let likeHome = [
    {
icon: "/images/partnershipAmber.png",
altName: "amber icon",
title: "More mobile and nbn",
btnName: "Tell me about More",
link: "",
btnColor: "#ffcc00",
lists: [
`No matter what your internet or mobile plan requirements are, More has an nbn® or mobile plan that’s right for you`,
`More’s team of experts is committed to providing quality connections for you and your household to enjoy – with no lock-in contracts`,
`$5 off your monthly mobile plan for 12 months. Sign up by 30 June 2025`,
`20% off your monthly nbn® plan for 12 months. Sign up by 30 June 2025`,
],
    },
    {
icon: "/images/homeLoanMoreBlog.png",
altName: "more icon",
title: "Amber",
btnName: "Tell me about Amber",
link: "",
btnColor: "#ffcc00",
lists: [
`Unlock the real value of renewable energy with Amber`,
`Their wholesale model and SmartShift™ technology gives solar and battery owners the control they need to get the most value out of their exports, lowering the overall cost of energy usage`,
`Start accessing cheaper energy prices by shifting your usage from peak periods to when there are more renewables in the grid`,
`Get access to a range of exclusive discounts on Amber energy plans when you switch and sign up using your undefined credit card, debit card or bank account as your online bill payment method before 30 June 2025.`,
],
    },
    // {
    //   icon: "/images/partnership-homeIn.png",
    //   altName: "home icon",
    //   title: "Home-in",
    //   btnName: "Get a contract reviewed",
    //   link: "/home-loan/The-Home-in-app",
    //   btnColor: "#ffcc00",
    //   lists: [
    //`Legal advice in six business hours`,
    //`One of the highest on-time settlement rates3 in the industry`,
    //`Bank-grade security and built by undefined`,
    //`Talk to real people who can answer queries quickly`,
    //`$500 off conveyancing when you settle with a undefined home loan and use Home-in.`
    //   ],
    // },
  ];

  let control = [
    {
icon: "/images/partnershipCreditSavvy.png",
altName: "savvy icon",
title: "Credit Savvy",
btnName: "Check my credit score now",
link: "",
btnColor: "#ffcc00",
lists: [
`No matter what your internet or mobile plan requirements are, More has an nbn® or mobile plan that’s right for you`,
`More’s team of experts is committed to providing quality connections for you and your household to enjoy – with no lock-in contracts`,
`$5 off your monthly mobile plan for 12 months. Sign up by 30 June 2025`,
`20% off your monthly nbn® plan for 12 months. Sign up by 30 June 2025`,
],
    },
    {
icon: "/images/partnershipKit.png",
altName: "kit icon",
title: "Kit",
btnName: "Tell me more about Kit",
link: "",
btnColor: "#ffcc00",
lists: [
`No matter what your internet or mobile plan requirements are, More has an nbn® or mobile plan that’s right for you`,
`More’s team of experts is committed to providing quality connections for you and your household to enjoy – with no lock-in contracts`,
`$5 off your monthly mobile plan for 12 months. Sign up by 30 June 2025`,
`20% off your monthly nbn® plan for 12 months. Sign up by 30 June 2025`,
],
    },
  ];

 
  let help = [
    {
Heading: "Book an appointment",
paragraph:
"Book instantly to speak to a home loan specialist at a time that suits you",
icon: "/icons/appointment.svg",
altTitle: "icons",
link: "/appointment",
    },
    {
Heading: "Check loan offers",
paragraph:
"In as little as 10 minutes and tailored exactly as per your financial profile.",
icon: "/icons/manageLoan2.svg",
altTitle: "icons",
link: "/get-started/how-can-we-help",
    },
    {
Heading: "Contact us",
paragraph:
"Fast-track your call and connect with a specialist in the Digital DSA.",
icon: "/icons/contact.svg",
altTitle: "icons",
link: "/contact",
    },
    {
Heading: "Message us",
paragraph:
"Get instant help from our online assistants  or chat to a specialist.",
icon: "/icons/msg.svg",
altTitle: "icons",
link: "/contact",
    },
  ];

  let thinkKnow = {
    heading: "Things you should know",
    paraGraph: [
`undefined has an ownership interest in Amber. Amber and undefined have entered into a strategic relationship agreement. Amber’s Terms and Conditions are available on the <a href="" class="underline hover:no-underline underline-offset-4"> Amber website</a>. For Terms & Conditions in relation to your eligible Amber energy plan offer when you switch and sign up using your undefined credit card, debit card or bank account as your online bill payment method before 30 June 2025, please see the <a href="" class="underline hover:no-underline underline-offset-4">undefined Amber page</a>.`,
` undefined has an ownership interest in More. More and undefined have entered into a strategic alliance agreement. More’s Terms and Conditions are available on the <a href="" class=="underline hover:no-underline">More website</a>. For offer Terms & Conditions, visit the <a href="" class=="underline hover:no-underline"> undefined More Mobile page</a> and the <a href="" class=="underline hover:no-underline"> undefined More nbn® page</a>.`,
` Home-in has one of the highest on-time settlement rates in the industry with 95% of Home-in customers settling on time in 2023`,
`"Home-in” is a trademark of CBA New Digital Businesses Pty Ltd ABN 38 633 072 830 trading as “Home-in Digital”. CBA New Digital Businesses Pty Ltd is a wholly owned but non-guaranteed subsidiary of the Commonwealth Bank of Australia ABN 48 123 123 124. CBA New Digital Businesses Pty Ltd is not an Authorised Deposit-taking Institution for the purposes of the Banking Act 1959 and its obligations do not represent deposits or other liabilities of Commonwealth Bank of Australia.`,
`undefined exclusive offer: You’re eligible for the offer if you 1) settle on a property with a undefined home loan, and 2) use the in-app legal services provided through Home-in. To secure the offer you’ll need to engage the services of Home-in’s partner law firm via the Home-in app. Eligible customers will receive a discount of $500 off the conveyancing fee, and disbursements are additional and charged at cost. Home-in reserves the right to terminate the offer and change the pricing at any time. <a href="" class="underline hover:no-underline underline-offset-4"> Find out more about Home-in's pricing</a>.`,
`Please see the Terms & Conditions on the <a href="" class="underline hover:no-underline underline-offset-4">Home-in website</a> for the $500 off conveyancing offer, exclusive to undefined Home Loan customers.`,
`Truyu is a brand of CBA New Digital Businesses Pty Ltd ABN 38 633 072 830 trading as Truyu.`,
`CBA New Digital Businesses Pty Ltd is a wholly owned but non-guaranteed subsidiary of the Commonwealth Bank of Australia ABN 48 123 123 124. CBA New Digital Businesses Pty Ltd is not an Authorised Deposit-taking Institution for the purposes of the Banking Act 1959 (Cth) and its obligations do not represent deposits or other liabilities of Commonwealth Bank of Australia.`,
``
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
  <!-- <p>This is new loan page</p>
            <Breadcrumb /> -->
  <!-- {page.url.pathname} -->
  <!-- Create a breadcrumb-style navigation with clickable links -->

  <PageDesign {pageData}>
    <div>
      <HomeIntrest
        homeInterest="Not an existing undefined customer?"
        btnName="Open now"
        btnColor="#ffcc00"
        btnLink="/home-loan"
      />

      <div class="hidden lg:block">
        <StickyNavbar navList={subList} {activeSection}>
        </StickyNavbar>

        <AnchorCounter/>

        <div class="px-[2rem] lg:px-[4rem]">
          <div id="offers" data-section="offers" class="section">
            <div
              class="grid lg:grid-cols-5 gap-4 border-b border-borderColor py-[4rem]"
            >
              <h2
                class="typography-h3 font-semibold md:col-span-2 md:typography-h2-md lg:typography-h2"
              >
                Current offers
              </h2>
              <div class="md:col-span-3 grid lg:grid-cols-2 gap-4">
                {#each offers as item}
                  <BlogCard
                    icon={item.icon}
                    altName={item.altName}
                    title={item.title}
                    paragraph={item.paragraph}
                    url={item.url}
                    linkName={item.linkName}
                    cardBorder="#E3E3E3"
                  />
                {/each}
              </div>
            </div>
          </div>

          <div id="shop" data-section="shop" class="section">
            <div
              class="border-b border-dividerColor grid gap-4 py-[4rem] lg:grid-cols-5"
            >
              <div class="md:col-span-2 space-y-4">
                <h2
                  class="typography-h2 text-text-main"
                >
                  Shop till you drop
                </h2>
                <p class="typography-body-sm text-text-light">
                  We want to make sure you get the best deals when you shop.
                  That’s why we’ve partnered with Australia’s biggest brands to
                  give you personalised cashback rewards, helping you save when
                  you spend. Discover shopping offers just for you when you
                  check the undefined app before you start shopping. Make sure
                  you have the latest version of the app installed.
                </p>
              </div>

              <div class="md:col-span-3 grid lg:grid-cols-2 gap-4">
                {#each shop as items}
                  <div class="border border-[#E3E3E3]">
                    <div>
                      <img src={items.icon} alt={items.altName} />
                    </div>
                    <div
                      class="typography-body-md text-text-light flex flex-col gap-3 p-4"
                    >
                      <h3 class="font-semibold text-miniSubHead">
                        {items.title}
                      </h3>
                      <ul class="space-y-4">
                        {#each items.lists as list}
                          <li class="flex items-start gap-2">
                            <svg
                              class="w-5 h-5 text-black flex-shrink-0"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                            <span>{list}</span>
                          </li>
                        {/each}
                      </ul>
                      <div class="mt-[2rem]">
                        <Button
                          btnName="Klarna"
                          link=""
                          btnColor="#ffcc00"
                        />
                      </div>
                    </div>
                  </div>
                {/each}
              </div>
            </div>
          </div>

          <div id="likeHome" data-section="likeHome" class="section">
            <div
              class="border-b border-dividerColor grid gap-4 py-[4rem] lg:grid-cols-5"
            >
              <div class="md:col-span-2 space-y-4">
                <h2
                  class="typography-h2 text-text-main"
                >
                  There’s no place like home
                </h2>
                <p class="typography-body-sm text-text-light">
                  Looking for a new home? Moving into a new home? Or just
                  looking for a better NBN and electricity deal? We’ve got you
                  covered.
                </p>
              </div>

              <div class="md:col-span-3 grid lg:grid-cols-2 gap-4">
                {#each likeHome as items}
                  <div class="border border-[#E3E3E3]">
                    <div>
                      <img src={items.icon} alt={items.altName} />
                    </div>
                    <div
                      class="typography-body-md text-text-light flex flex-col gap-3 p-4"
                    >
                      <h3 class="font-semibold text-miniSubHead">
                        {items.title}
                      </h3>
                      <ul class="space-y-4">
                        {#each items.lists as list}
                          <li class="flex items-start gap-2">
                            <svg
                              class="w-5 h-5 text-black flex-shrink-0"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                            <span>{list}</span>
                          </li>
                        {/each}
                      </ul>
                      <div class="mt-[2rem]">
                        <Button
                          btnName={items.btnName}
                          link={items.link}
                          btnColor={items.btnColor}
                        />
                      </div>
                    </div>
                  </div>
                {/each}
              </div>
            </div>
          </div>

          <div id="control" data-section="control" class="section">
            <div
            class="border-b border-dividerColor grid gap-4 py-[4rem] lg:grid-cols-5"
          >
            <div class="md:col-span-2 space-y-4">
              <h2
                class="typography-h2 text-text-main"
              >
              Control what matters to you
              </h2>
              <p class="typography-body-sm text-text-light">
                We can help you feel in control of your money and more protected when it comes to your credit score. Take a look at our current partners supporting you in the finance space.
              </p>
            </div>

            <div class="md:col-span-3 grid lg:grid-cols-2 gap-4">
              {#each control as items}
                <div class="border border-[#E3E3E3]">
                  <div>
                    <img src={items.icon} alt={items.altName} />
                  </div>
                  <div
                    class="typography-body-md text-text-light flex flex-col gap-3 p-4"
                  >
                    <h3 class="font-semibold text-miniSubHead">
                      {items.title}
                    </h3>
                    <ul class="space-y-4">
                      {#each items.lists as list}
                        <li class="flex items-start gap-2">
                          <svg
                            class="w-5 h-5 text-black flex-shrink-0"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                          <span>{list}</span>
                        </li>
                      {/each}
                    </ul>
                    <div class="mt-[2rem]">
                      <Button
                        btnName={items.btnName}
                        link={items.link}
                        btnColor={items.btnColor}
                      />
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          </div>
          </div>

          <div id="business" data-section="business" class="section">
            <TwoColumn
              cardImage="/images/partnership-business.jpg"
              cardAltName="construction image"
              cardHeading="Business partnerships"
            >
              <ul
                class="grid gap-[2rem] typography-body-md text-text-light"
                slot="list"
              >
                <li>
                  Looking for offers to help run your business? Explore our
                  range of partnerships today.
                </li>

                <div class="w-auto">
                  <Button
                    link=""
                    btnBorder="#4F4C4D"
                    btnName="Visit our Business partnerships page"
                  />
                </div>
              </ul>
            </TwoColumn>
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
              <div id="offers" class="bg-white text-black px-[2rem]">
                <div class="grid gap-4 border-b border-borderColor py-[4rem]">
                  <h2
                    class="typography-h2 text-text-main"
                  >
                    Current offers
                  </h2>
                  <div class="grid md:grid-cols-2 gap-4">
                    {#each offers as item}
                      <BlogCard
                        icon={item.icon}
                        altName={item.altName}
                        title={item.title}
                        paragraph={item.paragraph}
                        url={item.url}
                        linkName={item.linkName}
                        cardBorder="#E3E3E3"
                      />
                    {/each}
                  </div>
                </div>
              </div>
            {:else if index == 1}
              <div id="shop" class="bg-white text-black px-[2rem]">
                <div
                class="border-b border-dividerColor grid gap-4 py-[4rem]"
              >
                <div class="space-y-4">
                  <h2
                    class="typography-h2 text-text-main"
                  >
                    Shop till you drop
                  </h2>
                  <p class="typography-body-sm text-text-light">
                    We want to make sure you get the best deals when you shop.
                    That’s why we’ve partnered with Australia’s biggest brands to
                    give you personalised cashback rewards, helping you save when
                    you spend. Discover shopping offers just for you when you
                    check the undefined app before you start shopping. Make sure
                    you have the latest version of the app installed.
                  </p>
                </div>
  
                <div class="grid md:grid-cols-2 gap-4">
                  {#each shop as items}
                    <div class="border border-[#E3E3E3]">
                      <div>
                        <img src={items.icon} alt={items.altName} />
                      </div>
                      <div
                        class="typography-body-md text-text-light flex flex-col gap-3 p-4"
                      >
                        <h3 class="font-semibold text-miniSubHead">
                          {items.title}
                        </h3>
                        <ul class="space-y-4">
                          {#each items.lists as list}
                            <li class="flex items-start gap-2">
                              <svg
                                class="w-5 h-5 text-black flex-shrink-0"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  stroke-linecap="round"
                                  stroke-linejoin="round"
                                  stroke-width="2"
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                              <span>{list}</span>
                            </li>
                          {/each}
                        </ul>
                        <div class="mt-[2rem]">
                          <Button
                            btnName="Klarna"
                            link=""
                            btnColor="#ffcc00"
                          />
                        </div>
                      </div>
                    </div>
                  {/each}
                </div>
              </div>
              </div>
            {:else if index == 2}
              <div id="likeHome" class="bg-white text-black px-[2rem]">
                <div
                class="border-b border-dividerColor grid gap-4 py-[4rem]"
              >
                <div class="space-y-4">
                  <h2
                    class="typography-h2 text-text-main"
                  >
                    There’s no place like home
                  </h2>
                  <p class="typography-body-sm text-text-light">
                    Looking for a new home? Moving into a new home? Or just
                    looking for a better NBN and electricity deal? We’ve got you
                    covered.
                  </p>
                </div>
  
                <div class="grid md:grid-cols-2 gap-4">
                  {#each likeHome as items}
                    <div class="border border-[#E3E3E3]">
                      <div>
                        <img src={items.icon} alt={items.altName} />
                      </div>
                      <div
                        class="typography-body-md text-text-light flex flex-col gap-3 p-4"
                      >
                        <h3 class="font-semibold text-miniSubHead">
                          {items.title}
                        </h3>
                        <ul class="space-y-4">
                          {#each items.lists as list}
                            <li class="flex items-start gap-2">
                              <svg
                                class="w-5 h-5 text-black flex-shrink-0"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  stroke-linecap="round"
                                  stroke-linejoin="round"
                                  stroke-width="2"
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                              <span>{list}</span>
                            </li>
                          {/each}
                        </ul>
                        <div class="mt-[2rem]">
                          <Button
                            btnName={items.btnName}
                            link={items.link}
                            btnColor={items.btnColor}
                          />
                        </div>
                      </div>
                    </div>
                  {/each}
                </div>
              </div>
              </div>
            {:else if index == 3}
              <div id="control" class="bg-white text-black px-[2rem]">
                <div
                class="border-b border-dividerColor grid gap-4 py-[4rem]"
              >
                <div class="space-y-4">
                  <h2
                    class="typography-h2 text-text-main"
                  >
                  Control what matters to you
                  </h2>
                  <p class="typography-body-sm text-text-light">
                    We can help you feel in control of your money and more protected when it comes to your credit score. Take a look at our current partners supporting you in the finance space.
                  </p>
                </div>
    
                <div class="grid md:grid-cols-2 gap-4">
                  {#each control as items}
                    <div class="border border-[#E3E3E3]">
                      <div>
                        <img src={items.icon} alt={items.altName} />
                      </div>
                      <div
                        class="typography-body-md text-text-light flex flex-col gap-3 p-4"
                      >
                        <h3 class="font-semibold text-miniSubHead">
                          {items.title}
                        </h3>
                        <ul class="space-y-4">
                          {#each items.lists as list}
                            <li class="flex items-start gap-2">
                              <svg
                                class="w-5 h-5 text-black flex-shrink-0"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  stroke-linecap="round"
                                  stroke-linejoin="round"
                                  stroke-width="2"
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                              <span>{list}</span>
                            </li>
                          {/each}
                        </ul>
                        <div class="mt-[2rem]">
                          <Button
                            btnName={items.btnName}
                            link={items.link}
                            btnColor={items.btnColor}
                          />
                        </div>
                      </div>
                    </div>
                  {/each}
                </div>
              </div>
              </div>
            {:else if index == 4}
              <div id="business" class="bg-white text-black px-[2rem]">
                <TwoColumn
                  cardImage="/images/partnership-business.jpg"
                  cardAltName="construction image"
                  cardHeading="Business partnerships"
                >
                  <ul
                    class="grid gap-[2rem] typography-body-md text-text-light"
                    slot="list"
                  >
                    <li>
                      Looking for offers to help run your business? Explore our
                      range of partnerships today.
                    </li>

                    <div class="w-auto">
                      <Button
                        link=""
                        btnBorder="#4F4C4D"
                        btnName="Visit our Business partnerships page"
                      />
                    </div>
                  </ul>
                </TwoColumn>
              </div>
            {/if}
          </details>
        {/each}
      </div>
    </div>
    <div slot="secondary" class="p-4 lg:p-0">
      <WeAreHereHelp {help} heading="We're here to help" />
      <ThingsYouShould {thinkKnow} disc="list-decimal" />
    </div>
  </PageDesign>
</section>
